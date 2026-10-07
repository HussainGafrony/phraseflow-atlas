import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http";
import { hashPassword } from "@/lib/auth";
import { setupAdminSchema } from "@/lib/validators";
import { User } from "@/models/User";

export const runtime = "nodejs";

export async function GET() {
  try {
    await dbConnect();
    const hasAdmin = Boolean(await User.exists({ role: "admin" }));
    return NextResponse.json({
      setupAvailable: !hasAdmin,
      tokenRequired: Boolean(process.env.ADMIN_SETUP_TOKEN)
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const hasAdmin = Boolean(await User.exists({ role: "admin" }));
    if (hasAdmin) {
      return jsonError("Admin setup is already complete.", 409);
    }

    const body = setupAdminSchema.parse(await request.json());
    const expectedToken = process.env.ADMIN_SETUP_TOKEN;
    if (expectedToken && body.token !== expectedToken) {
      return jsonError("Setup token is incorrect.", 403);
    }

    if (!expectedToken && process.env.NODE_ENV === "production") {
      return jsonError("ADMIN_SETUP_TOKEN must be configured before production setup.", 403);
    }

    const existing = await User.findOne({ username: body.username.toLowerCase() });
    if (existing) {
      return jsonError("Username already exists.", 409);
    }

    await User.create({
      username: body.username.toLowerCase(),
      passwordHash: await hashPassword(body.password),
      role: "admin"
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
