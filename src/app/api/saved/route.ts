/**
 * Return only the signed-in user's saved sentences with sentence details for grouping by day.
 */
import { toSentenceView, type StoredSentence } from "@/lib/sentence-view";
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
      .populate<{ sentenceId: StoredSentence }>("sentenceId")
      .lean();

    return NextResponse.json({
      saved: saved.map((item) => {
        return {
          id: item._id.toString(),
          dayKey: item.dayKey,
          savedAt: item.createdAt,
          sentence: toSentenceView(item.sentenceId),
        };
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
