/**
 * Read the active topics, levels, and frequency options shown in the learning selectors.
 */
import { requireApiSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getLearningOptions } from "@/lib/options";
import { handleRouteError, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!(await requireApiSession("user")))
      return jsonError("Unauthorized.", 401);
    return NextResponse.json(await getLearningOptions());
  } catch (error) {
    return handleRouteError(error);
  }
}
