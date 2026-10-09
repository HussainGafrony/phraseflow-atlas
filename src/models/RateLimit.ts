/**
 * Request-window counter with a unique key and a TTL index to remove expired records.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const rateLimitSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true },
);

export type RateLimitDocument = InferSchemaType<typeof rateLimitSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RateLimit: Model<RateLimitDocument> =
  mongoose.models.RateLimit ??
  mongoose.model<RateLimitDocument>("RateLimit", rateLimitSchema);
