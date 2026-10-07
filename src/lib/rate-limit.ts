import { RateLimit } from "@/models/RateLimit";

export async function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

  const record = await RateLimit.findOneAndUpdate(
    {
      key,
      $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $gt: now } }]
    },
    [
      {
        $set: {
          key,
          count: {
            $cond: [
              { $lte: [{ $ifNull: ["$expiresAt", new Date(0)] }, now] },
              1,
              { $add: ["$count", 1] }
            ]
          },
          expiresAt: {
            $cond: [
              { $lte: [{ $ifNull: ["$expiresAt", new Date(0)] }, now] },
              expiresAt,
              "$expiresAt"
            ]
          }
        }
      }
    ],
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const retryAfter = Math.max(0, Math.ceil((record.expiresAt.getTime() - now.getTime()) / 1000));
  return {
    allowed: record.count <= limit,
    count: record.count,
    limit,
    retryAfter
  };
}
