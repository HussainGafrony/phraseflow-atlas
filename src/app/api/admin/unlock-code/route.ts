/**
 * الأدمن يضبط رمز فتح الدفعتين الإضافيتين؛ الرمز يُحفظ كـ hash ولا يُعاد مكشوفاً من قاعدة البيانات.
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireApiSession } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http";
import { unlockCodeAdminSchema } from "@/lib/validators";
import { UnlockCode } from "@/models/UnlockCode";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireApiSession("admin");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    await dbConnect();
    const active = await UnlockCode.findOne({ isActive: true })
      .sort({ updatedAt: -1 })
      .lean();
    return NextResponse.json({
      hasCode: Boolean(active),
      updatedAt: active?.updatedAt ?? null,
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

    const { code } = unlockCodeAdminSchema.parse(await request.json());
    await dbConnect();
    await UnlockCode.updateMany({}, { $set: { isActive: false } });
    await UnlockCode.create({
      codeHash: await bcrypt.hash(code, 12),
      isActive: true,
      changedBy: session.userId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
