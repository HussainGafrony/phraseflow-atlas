/**
 * حصة كل مستخدم في اليوم. الفهرس الفريد userId + dayKey يمنع تعدد العدادات.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const dailyUsageSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dayKey: { type: String, required: true, index: true },
    totalDelivered: { type: Number, default: 0 },
    batchesDelivered: { type: Number, default: 0 },
    unlocked: { type: Boolean, default: false },
    unlockedAt: { type: Date },
  },
  { timestamps: true },
);

dailyUsageSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

export type DailyUsageDocument = InferSchemaType<typeof dailyUsageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const DailyUsage: Model<DailyUsageDocument> =
  mongoose.models.DailyUsage ??
  mongoose.model<DailyUsageDocument>("DailyUsage", dailyUsageSchema);
