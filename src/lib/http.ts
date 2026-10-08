/**
 * بناء ردود API والأخطاء وتنسيق أخطاء التحقق؛ يرفق Retry-After عند منع الطلب مؤقتاً بسبب تجاوز حد المحاولات.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(
  message: string,
  status = 400,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json(
    { error: message, ...extra },
    {
      status,
      headers:
        status === 429 && typeof extra?.retryAfter === "number"
          ? { "Retry-After": String(extra.retryAfter) }
          : undefined,
    },
  );
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Invalid request data.", 422, {
      details: error.flatten(),
    });
  }

  if (error instanceof Error) {
    return jsonError(error.message, 500);
  }

  return jsonError("Unexpected server error.", 500);
}
