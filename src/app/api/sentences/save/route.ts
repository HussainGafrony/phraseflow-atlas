/**
 * حفظ جملة سبق تسليمها لهذا المستخدم فقط؛ upsert يمنع تكرار المحفوظة ويحتفظ بتاريخ الحفظ الأول.
 */
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getDayKey } from "@/lib/dates";
import { handleRouteError, jsonError } from "@/lib/http";
import { saveSentenceSchema } from "@/lib/validators";
import { SavedSentence } from "@/models/SavedSentence";

import { SentenceDelivery } from "@/models/SentenceDelivery";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession("user");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    const { sentenceId } = saveSentenceSchema.parse(await request.json());
    await dbConnect();

    if (
      !(await SentenceDelivery.exists({ userId: session.userId, sentenceId }))
    ) {
      return jsonError("Sentence not found in your learning history.", 404);
    }

    await SavedSentence.updateOne(
      {
        userId: new mongoose.Types.ObjectId(session.userId),
        sentenceId: new mongoose.Types.ObjectId(sentenceId),
      },
      {
        $setOnInsert: {
          userId: new mongoose.Types.ObjectId(session.userId),
          sentenceId: new mongoose.Types.ObjectId(sentenceId),
          dayKey: getDayKey(),
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
