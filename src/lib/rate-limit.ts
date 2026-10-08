/**
 * تحديد المحاولات عبر عداد مشترك في MongoDB؛ مفاتيح مستقلة للدخول والجمل والرموز والاختبارات. انتهاء النافذة منفصل عن حذف TTL المتأخر.
 */
import { RateLimit } from "@/models/RateLimit";

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  // العداد مشترك في MongoDB بين جميع نسخ Vercel، وليس في ذاكرة سيرفر واحد.
  // تعيد النافذة المنتهية العدّ إلى 1 دون انتظار حذف مستندها بفهرس TTL.
  const expired = { $lte: [{ $ifNull: ["$expiresAt", new Date(0)] }, now] };
  const pipeline = [
    {
      $set: {
        key: { $literal: key },
        count: {
          $cond: [expired, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }],
        },
        expiresAt: { $cond: [expired, expiresAt, "$expiresAt"] },
      },
    },
  ];
  let record;
  try {
    record = await RateLimit.findOneAndUpdate({ key }, pipeline, {
      upsert: true,
      new: true,
    });
  } catch (error) {
    // عند أول طلبين متزامنين قد ينشئ الآخر المفتاح أولاً؛ نزيد العداد الموجود.
    if ((error as { code?: number }).code !== 11000) throw error;
    record = await RateLimit.findOneAndUpdate({ key }, pipeline, { new: true });
  }
  // عند فشل التخزين لا نسمح بالطلب دون تطبيق حدّه.
  if (!record)
    throw new Error("Rate limit could not be checked. Please try again.");

  const retryAfter = Math.max(
    0,
    Math.ceil((record.expiresAt.getTime() - now.getTime()) / 1000),
  );
  return {
    allowed: record.count <= limit,
    count: record.count,
    limit,
    retryAfter,
  };
}
