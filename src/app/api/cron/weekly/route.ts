/**
 * مهمة التبديل الأسبوعي المحمية بـ CRON_SECRET. تعمل دورياً لكن تدوير المحتوى يحدث مرة واحدة لكل أسبوع.
 */
import { NextResponse } from "next/server";
import { rotateWeeklyLanding } from "@/lib/landing";
import { jsonError, handleRouteError } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return jsonError("Unauthorized.", 401);
  try {
    const sentences = await rotateWeeklyLanding(undefined, true);
    return NextResponse.json({ ok: true, count: sentences.length });
  } catch (error) {
    return handleRouteError(error);
  }
}
