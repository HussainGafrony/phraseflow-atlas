import { NextResponse } from "next/server";
import { credentialsSchema } from "@/lib/validators";
import { findUserForLogin, setSessionCookie, verifyPassword } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = credentialsSchema.parse(await request.json());
    const user = await findUserForLogin(body.username);

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return jsonError("Username or password is incorrect.", 401);
    }

    if (body.expectedRole && user.role !== body.expectedRole) {
      return jsonError("This account cannot access this area.", 403);
    }

    await setSessionCookie({
      userId: user._id.toString(),
      username: user.username,
      role: user.role as "user" | "admin"
    });

    return NextResponse.json({
      ok: true,
      redirectTo: user.role === "admin" ? "/admin" : "/dashboard"
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
