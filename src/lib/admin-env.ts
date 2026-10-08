/** حساب الأدمن الوحيد من بيئة السيرفر. لا يُنشأ في MongoDB ولا تُرسل بياناته للمتصفح. */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export const ENV_ADMIN_ID = "environment-admin";

function safeEqual(left: string, right: string) {
  return timingSafeEqual(
    createHash("sha256").update(left).digest(),
    createHash("sha256").update(right).digest(),
  );
}
export function getAdminUsername() {
  return process.env.ADMIN_USERNAME?.trim().toLowerCase() ?? "";
}
export function isAdminConfigured() {
  const username = getAdminUsername();
  return (
    username.length >= 3 &&
    username.length <= 40 &&
    (process.env.ADMIN_PASSWORD?.length ?? 0) >= 8 &&
    (process.env.ADMIN_PASSWORD?.length ?? 0) <= 120
  );
}
export function verifyEnvironmentAdmin(username: string, password: string) {
  if (!isAdminConfigured()) return false;
  // نحسب المقارنتين دون اختصار بناءً على صحة الاسم.
  const nameMatches = safeEqual(
    username.trim().toLowerCase(),
    getAdminUsername(),
  );
  const passwordMatches = safeEqual(password, process.env.ADMIN_PASSWORD!);
  return nameMatches && passwordMatches;
}
export function adminCredentialVersion() {
  if (!isAdminConfigured() || !process.env.SESSION_SECRET) return "";
  // بصمة موقعة: تغيير بيانات الأدمن في البيئة يُبطل جلساته السابقة تلقائياً.
  return createHmac("sha256", process.env.SESSION_SECRET)
    .update(JSON.stringify([getAdminUsername(), process.env.ADMIN_PASSWORD]))
    .digest("hex");
}
export function isCurrentAdminSession(payload: {
  sub?: string;
  username?: unknown;
  adminVersion?: unknown;
}) {
  const version = adminCredentialVersion();
  return Boolean(
    version &&
      payload.sub === ENV_ADMIN_ID &&
      payload.username === getAdminUsername() &&
      typeof payload.adminVersion === "string" &&
      safeEqual(payload.adminVersion, version),
  );
}
