/**
 * رمز الأدمن المشفر بـ hash وحالة تفعيله لفتح بقية الحصة اليومية.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const unlockCodeSchema = new Schema(
  {
    codeHash: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export type UnlockCodeDocument = InferSchemaType<typeof unlockCodeSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const UnlockCode: Model<UnlockCodeDocument> =
  mongoose.models.UnlockCode ??
  mongoose.model<UnlockCodeDocument>("UnlockCode", unlockCodeSchema);
