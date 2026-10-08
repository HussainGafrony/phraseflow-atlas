/**
 * حساب اليوم حسب APP_TIME_ZONE كي تشترك الحصة اليومية والفواصل والتبديل الأسبوعي في نفس التوقيت. تاريخ العرض يُترجم حسب لغة الواجهة.
 */
const appTimeZone = process.env.APP_TIME_ZONE ?? "Europe/Athens";

export function getDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatDayLabel(dayKey: string, locale = "ar") {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
