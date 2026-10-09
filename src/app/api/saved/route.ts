/**
 * جلب محفوظات المستخدم المسجل فقط مع بيانات الجمل لعرضها مجمعة بالأيام.
 */
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http";
import { SavedSentence } from "@/models/SavedSentence";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireApiSession("user");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    await dbConnect();
    const saved = await SavedSentence.find({ userId: session.userId })
      .sort({ createdAt: -1 })
      .populate("sentenceId")
      .lean();

    return NextResponse.json({
      saved: saved.map((item) => {
        const sentence = item.sentenceId as unknown as {
          _id: { toString(): string };
          language: string;
          topic: string;
          level: string;
          frequency: string;
          text: string;
          arabicTranslation: string;
        };

        return {
          id: item._id.toString(),
          dayKey: item.dayKey,
          savedAt: item.createdAt,
          sentence: {
            id: sentence._id.toString(),
            language: sentence.language,
            topic: sentence.topic,
            level: sentence.level,
            frequency: sentence.frequency,
            text: sentence.text,
            arabicTranslation: sentence.arabicTranslation,
          },
        };
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
