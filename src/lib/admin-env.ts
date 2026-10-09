/** Environment administrator credentials remain available alongside MongoDB admin accounts. Compare usernames exactly without length restrictions. */
import { createHash, timingSafeEqual } from "node:crypto";
export const ENV_ADMIN_ID = "environment-admin";
function safeEqual(left: string, right: string) {
  return timingSafeEqual(
    createHash("sha256").update(left).digest(),
    createHash("sha256").update(right).digest(),
  );
}
export function getAdminUsername() {
  return process.env.ADMIN_USERNAME ?? "";
}
export function isAdminConfigured() {
  return Boolean(getAdminUsername() && process.env.ADMIN_PASSWORD);
}
export function verifyEnvironmentAdmin(username: string, password: string) {
  if (!isAdminConfigured()) return false;
  const nameMatches = safeEqual(username, getAdminUsername());
  const passwordMatches = safeEqual(password, process.env.ADMIN_PASSWORD!);
  return nameMatches && passwordMatches;
}
