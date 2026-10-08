/**
 * تحرير جمل الأسبوع يدوياً؛ تُحفظ المجموعة كاملة وتُعلّم كتعديل أدمن حتى لا تستبدلها مهمة الأسبوع.
 */
import mongoose from "mongoose";
import { WeeklyLandingRotation } from "@/models/WeeklyLandingRotation";
import { weeklyDefaults } from "@/lib/weekly-defaults";
import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { getCurrentWeekKey } from "@/lib/landing";
import { requireApiSession } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { landingSentenceSchema } from "@/lib/validators";
import { LandingSentence } from "@/models/LandingSentence";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireApiSession("admin");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    await dbConnect();
    const weekKey = getCurrentWeekKey();
    const sentences = await LandingSentence.find({
      activeFromWeek: weekKey,
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      weekKey,
      sentences: sentences.length
        ? sentences.map((sentence) => ({
            language: sentence.language,
            text: sentence.text,
            arabicTranslation: sentence.arabicTranslation,
          }))
        : weeklyDefaults(weekKey),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireApiSession("admin");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    const body = landingSentenceSchema.parse(await request.json());
    await dbConnect();
    const weekKey = getCurrentWeekKey();

    const transaction = await mongoose.startSession();
    try {
      await transaction.withTransaction(async () => {
        await WeeklyLandingRotation.updateOne(
          { weekKey },
          { $set: { sourceProvider: "admin" }, $unset: { leaseUntil: 1 } },
          { upsert: true, session: transaction },
        );
        await LandingSentence.updateMany(
          { activeFromWeek: weekKey },
          { $set: { isActive: false } },
          { session: transaction },
        );
        await LandingSentence.insertMany(
          body.sentences.map((sentence) => ({
            ...sentence,
            activeFromWeek: weekKey,
            isActive: true,
          })),
          { session: transaction },
        );
      });
    } finally {
      await transaction.endSession();
    }

    return NextResponse.json({ ok: true, weekKey });
  } catch (error) {
    return handleRouteError(error);
  }
}
