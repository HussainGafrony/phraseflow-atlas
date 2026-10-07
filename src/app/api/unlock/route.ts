import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireApiSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { getDayKey } from "@/lib/dates";
import { handleRouteError, jsonError } from "@/lib/http";
import { unlockSchema } from "@/lib/validators";
import { DailyUsage } from "@/models/DailyUsage";
import { UnlockCode } from "@/models/UnlockCode";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession("user");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    const { code } = unlockSchema.parse(await request.json());
    await dbConnect();

    const unlockCode = await UnlockCode.findOne({ isActive: true }).sort({ updatedAt: -1 });
    if (!unlockCode || !(await bcrypt.compare(code, unlockCode.codeHash))) {
      return jsonError("Unlock code is incorrect.", 403);
    }

    await DailyUsage.findOneAndUpdate(
      { userId: session.userId, dayKey: getDayKey() },
      { $set: { unlocked: true, unlockedAt: new Date() } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
