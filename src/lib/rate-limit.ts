/**
 * Shared MongoDB request counters with separate keys for each operation. Window expiration is independent of delayed TTL cleanup.
 */
import { RateLimit } from "@/models/RateLimit";

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  // Share the counter in MongoDB across Vercel instances instead of keeping it in server memory.
  // Reset an expired window to one without waiting for the TTL index to delete its document.
  // These are MongoDB expressions, evaluated against the stored record in one update.
  // $ifNull supplies a value for a new record; $cond means "if / then / else".
  const previousCount = { $ifNull: ["$count", 0] };
  const previousExpiry = { $ifNull: ["$expiresAt", new Date(0)] };
  const windowExpired = { $lte: [previousExpiry, now] };
  const nextCount = { $cond: [windowExpired, 1, { $add: [previousCount, 1] }] };
  const nextExpiry = { $cond: [windowExpired, expiresAt, "$expiresAt"] };

  const pipeline = [
    {
      $set: {
        key: { $literal: key }, // Treat keys starting with $ as text, not field references.
        count: nextCount,
        expiresAt: nextExpiry,
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
    // Concurrent first requests may insert the same key; increment the record created by the other request.
    if ((error as { code?: number }).code !== 11000) throw error;
    record = await RateLimit.findOneAndUpdate({ key }, pipeline, { new: true });
  }
  // Fail closed if storage cannot return a counter; never bypass the rate limit.
  if (!record)
    throw new Error("Rate limit could not be checked. Please try again.");

  const millisecondsLeft = record.expiresAt.getTime() - now.getTime();
  const retryAfter = Math.max(0, Math.ceil(millisecondsLeft / 1000));
  return {
    allowed: record.count <= limit,
    count: record.count,
    limit,
    retryAfter,
  };
}
