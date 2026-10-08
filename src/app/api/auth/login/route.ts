/**
 * دخول الحساب: تحديد محاولات عنوان العميل، التحقق من كلمة المرور والدور، ثم وضع cookie الجلسة.
 */
import {
  ENV_ADMIN_ID,
  getAdminUsername,
  isAdminConfigured,
  verifyEnvironmentAdmin,
} from "@/lib/admin-env";
import { NextResponse } from "next/server";
import { credentialsSchema } from "@/lib/validators";
import { findUserForLogin, setSessionCookie, verifyPassword } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { dbConnect } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const ip = getClientIp(request);
    const limit = await checkRateLimit(`login:${ip}`, 12, 15 * 60);
    if (!limit.allowed) {
      return jsonError(
        "Too many login attempts. Please try again later.",
        429,
        {
          retryAfter: limit.retryAfter,
        },
      );
    }

    const body = credentialsSchema.parse(await request.json());
    if (body.expectedRole === "admin") {
      if (!isAdminConfigured())
        return jsonError(
          "Admin credentials are not configured on the server.",
          503,
        );
      if (!verifyEnvironmentAdmin(body.username, body.password))
        return jsonError("Username or password is incorrect.", 401);
      await setSessionCookie({
        userId: ENV_ADMIN_ID,
        username: getAdminUsername(),
        role: "admin",
      });
      return NextResponse.json({ ok: true, redirectTo: "/admin" });
    }
    // بوابة المستخدم لا تقبل حساب الأدمن من البيئة ولا حسابات أدمن قديمة في MongoDB.
    const user = await findUserForLogin(body.username);
    if (!user || !(await verifyPassword(body.password, user.passwordHash)))
      return jsonError("Username or password is incorrect.", 401);
    await setSessionCookie({
      userId: user._id.toString(),
      username: user.username,
      role: "user",
    });
    return NextResponse.json({ ok: true, redirectTo: "/dashboard" });
  } catch (error) {
    return handleRouteError(error);
  }
}
