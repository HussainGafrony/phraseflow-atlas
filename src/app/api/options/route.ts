/**
 * قراءة الخيارات النشطة للمواضيع والمستويات والشيوع التي تظهر بقوائم المستخدم.
 */
import { NextResponse } from "next/server";
import { getLearningOptions } from "@/lib/options";
import { handleRouteError } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getLearningOptions());
  } catch (error) {
    return handleRouteError(error);
  }
}
