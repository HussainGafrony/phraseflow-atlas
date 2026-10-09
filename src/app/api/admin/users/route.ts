/**
 * إنشاء حساب مستخدم أو أدمن، دون قائمة حسابات أو تعديل أو حذف. لا يُسمح للمستخدم العادي بإنشاء الحسابات.
 */
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { requireApiSession, hashPassword } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http";
import { createUserSchema } from "@/lib/validators";
import { User } from "@/models/User";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireApiSession("admin");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    const body = createUserSchema.parse(await request.json());
    await dbConnect();
    const limit = await checkRateLimit(`create-user:${session.userId}`, 20, 60);
    if (!limit.allowed)
      return jsonError("Please try again later.", 429, {
        retryAfter: limit.retryAfter,
      });

    const existing = await User.findOne({
      username: body.username,
    });
    if (existing) {
      return jsonError("Username already exists.", 409);
    }

    const user = await User.create({
      username: body.username,
      passwordHash: await hashPassword(body.password),
      role: body.role,
    });

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000)
      return jsonError("Username already exists.", 409);
    return handleRouteError(error);
  }
}
