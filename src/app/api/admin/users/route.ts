/**
 * قائمة المستخدمين وإنشاء حسابات باسم مستخدم وكلمة سر. لا يُسمح للمستخدم العادي بإنشاء الحسابات.
 */
import { NextResponse } from "next/server";
import { requireApiSession, hashPassword } from "@/lib/auth";
import { dbConnect } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http";
import { createUserSchema } from "@/lib/validators";
import { User } from "@/models/User";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireApiSession("admin");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    await dbConnect();
    const users = await User.find({ role: "user" })
      .sort({ createdAt: -1 })
      .select("username createdAt")
      .lean();
    return NextResponse.json({
      users: users.map((user) => ({
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireApiSession("admin");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    const body = createUserSchema.parse(await request.json());
    await dbConnect();

    const existing = await User.findOne({
      username: body.username.toLowerCase(),
    });
    if (existing) {
      return jsonError("Username already exists.", 409);
    }

    const user = await User.create({
      username: body.username.toLowerCase(),
      passwordHash: await hashPassword(body.password),
      role: "user",
    });

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
