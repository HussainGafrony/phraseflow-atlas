/**
 * قراءة عنوان العميل من ترويسات منصة الاستضافة لاستخدامه في حد محاولات الدخول. في أي استضافة بديلة يجب أن تضبط الوكيل الموثوق.
 */
export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}
