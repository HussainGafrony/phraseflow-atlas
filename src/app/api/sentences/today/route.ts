/**
 * POST requests a batch within the rate and allowance limits. GET restores today's counter and unsaved sentences without generating more.
 */
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http";
import { requireApiSession } from "@/lib/auth";
import { sentenceRequestSchema } from "@/lib/validators";
import {
  getTodaySentencesForUser,
  type SentenceCriteria,
} from "@/lib/sentences";
import { checkRateLimit } from "@/lib/rate-limit";

import { DailyUsage } from "@/models/DailyUsage";
import { SentenceDelivery } from "@/models/SentenceDelivery";
import { SavedSentence } from "@/models/SavedSentence";
import { Sentence } from "@/models/Sentence";
import { getDayKey } from "@/lib/dates";
import { DAILY_SENTENCE_LIMIT } from "@/lib/constants";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const session = await requireApiSession("user");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    await dbConnect();
    const limit = await checkRateLimit(`sentences:${session.userId}`, 8, 60);
    if (!limit.allowed) {
      return jsonError(
        "Please wait a moment before requesting more sentences.",
        429,
        {
          retryAfter: limit.retryAfter,
        },
      );
    }

    const criteria = sentenceRequestSchema.parse(
      await request.json(),
    ) as SentenceCriteria;
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
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET() {
  try {
    const session = await requireApiSession("user");
    if (!session) return jsonError("Unauthorized.", 401);
    await dbConnect();
    const dayKey = getDayKey();
    const usage = await DailyUsage.findOne({
      userId: session.userId,
      dayKey,
    }).lean();
    const delivered = await SentenceDelivery.find({
      userId: session.userId,
      dayKey,
    })
      .sort({ createdAt: 1 })
      .lean();
    const saved = await SavedSentence.find({ userId: session.userId })
      .select("sentenceId")
      .lean();
    const savedIds = new Set(saved.map((item) => String(item.sentenceId)));
    const ids = delivered
      .map((item) => item.sentenceId)
      .filter((id) => !savedIds.has(String(id)));
    const records = await Sentence.find({ _id: { $in: ids } }).lean();
    const byId = new Map(
      records.map((sentence) => [String(sentence._id), sentence]),
    );
    const total = usage?.totalDelivered ?? 0;
    return NextResponse.json(
      {
        dayKey,
        remaining: Math.max(0, DAILY_SENTENCE_LIMIT - total),
        sentences: ids.flatMap((id) => {
          const sentence = byId.get(String(id));
          return sentence
            ? [
                {
                  id: String(sentence._id),
                  language: sentence.language,
                  topic: sentence.topic,
                  level: sentence.level,
                  frequency: sentence.frequency,
                  text: sentence.text,
                  arabicTranslation: sentence.arabicTranslation,
                },
              ]
            : [];
        }),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
