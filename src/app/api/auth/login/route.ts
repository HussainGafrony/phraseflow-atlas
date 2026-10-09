/**
 * Rate-limit login attempts by client IP, verify credentials and role, then set the session cookie.
 */
import {
  ENV_ADMIN_ID,
  getAdminUsername,
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
    if (
      body.expectedRole === "admin" &&
      verifyEnvironmentAdmin(body.username, body.password)
    ) {
      await setSessionCookie({
        userId: ENV_ADMIN_ID,
        username: getAdminUsername(),
        role: "admin",
      });
      return NextResponse.json({ ok: true, redirectTo: "/admin" });
    }
    // Stored accounts may also be administrators. Keep the portals separate and never promote a user during login.
    const user = await findUserForLogin(body.username, body.expectedRole);
    if (!user || !(await verifyPassword(body.password, user.passwordHash)))
      return jsonError("Username or password is incorrect.", 401);
    await setSessionCookie({
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
    });
    return NextResponse.json({
      ok: true,
      redirectTo: user.role === "admin" ? "/admin" : "/dashboard",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
