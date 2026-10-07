import { NextResponse } from "next/server";
import { defaultLandingSentences } from "@/lib/constants";
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
    const sentences = await LandingSentence.find({ activeFromWeek: weekKey, isActive: true })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      weekKey,
      sentences: sentences.length
        ? sentences.map((sentence) => ({
            language: sentence.language,
            text: sentence.text,
            arabicTranslation: sentence.arabicTranslation
          }))
        : defaultLandingSentences
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

    await LandingSentence.updateMany({ activeFromWeek: weekKey }, { $set: { isActive: false } });
    await LandingSentence.insertMany(
      body.sentences.map((sentence) => ({
        ...sentence,
        activeFromWeek: weekKey,
        isActive: true
      }))
    );

    return NextResponse.json({ ok: true, weekKey });
  } catch (error) {
    return handleRouteError(error);
  }
}
