import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireApiSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { TOPICS } from "@/lib/constants";
import { handleRouteError, jsonError } from "@/lib/http";
import { SentenceDelivery } from "@/models/SentenceDelivery";
import { SavedSentence } from "@/models/SavedSentence";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireApiSession("user");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    await dbConnect();

    const userObjectId = new mongoose.Types.ObjectId(session.userId);
    const delivered = await SentenceDelivery.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: "$context.topic", count: { $sum: 1 } } }
    ]);

    const saved = await SavedSentence.find({ userId: session.userId }).populate("sentenceId").lean();
    const savedByTopic = new Map<string, number>();
    for (const item of saved) {
      const sentence = item.sentenceId as unknown as { topic?: string };
      if (sentence.topic) {
        savedByTopic.set(sentence.topic, (savedByTopic.get(sentence.topic) ?? 0) + 1);
      }
    }

    const deliveredByTopic = new Map(delivered.map((item) => [item._id, item.count]));

    return NextResponse.json({
      topics: TOPICS.map((topic) => {
        const total = deliveredByTopic.get(topic) ?? 0;
        const savedCount = savedByTopic.get(topic) ?? 0;
        return {
          topic,
          delivered: total,
          saved: savedCount,
          percent: total ? Math.round((savedCount / total) * 100) : 0
        };
      })
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
