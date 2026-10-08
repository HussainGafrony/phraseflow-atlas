/**
 * حالة تدوير الأسبوع وقفل التوليد المؤقت؛ weekKey فريد لمنع تعارض الطلبات.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const weeklyLandingRotationSchema = new Schema(
  {
    weekKey: { type: String, required: true, unique: true },
    leaseUntil: { type: Date },
    sourceProvider: { type: String, default: "fallback" },
  },
  { timestamps: true },
);

export type WeeklyLandingRotationDocument = InferSchemaType<
  typeof weeklyLandingRotationSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const WeeklyLandingRotation: Model<WeeklyLandingRotationDocument> =
  mongoose.models.WeeklyLandingRotation ??
  mongoose.model<WeeklyLandingRotationDocument>(
    "WeeklyLandingRotation",
    weeklyLandingRotationSchema,
  );
