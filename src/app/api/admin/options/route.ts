import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { getLearningOptions, replaceLearningOptions } from "@/lib/options";
import { learningOptionsSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await requireApiSession("admin");
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    return NextResponse.json(await getLearningOptions());
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

    const body = learningOptionsSchema.parse(await request.json());
    await replaceLearningOptions(body.options);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
