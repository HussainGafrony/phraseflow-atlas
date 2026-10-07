import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http";
import { requireApiSession } from "@/lib/auth";
import { sentenceRequestSchema } from "@/lib/validators";
import { getTodaySentencesForUser, type SentenceCriteria } from "@/lib/sentences";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession("user");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    await dbConnect();
    const limit = await checkRateLimit(`sentences:${session.userId}`, 8, 60);
    if (!limit.allowed) {
      return jsonError("Please wait a moment before requesting more sentences.", 429, {
        retryAfter: limit.retryAfter
      });
    }

    const criteria = sentenceRequestSchema.parse(await request.json()) as SentenceCriteria;
    const result = await getTodaySentencesForUser(session.userId, criteria);

    return NextResponse.json({
      ...result,
      sentences: result.sentences.map((sentence) => ({
        id: sentence._id.toString(),
        language: sentence.language,
        topic: sentence.topic,
        level: sentence.level,
        frequency: sentence.frequency,
        text: sentence.text,
        arabicTranslation: sentence.arabicTranslation,
        audioUrl: sentence.audioUrl
      }))
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
