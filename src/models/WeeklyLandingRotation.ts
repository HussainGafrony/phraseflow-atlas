import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const weeklyLandingRotationSchema = new Schema(
  {
    weekKey: { type: String, required: true, unique: true },
    sourceProvider: { type: String, default: "fallback" }
  },
  { timestamps: true }
);

export type WeeklyLandingRotationDocument = InferSchemaType<typeof weeklyLandingRotationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const WeeklyLandingRotation: Model<WeeklyLandingRotationDocument> =
  mongoose.models.WeeklyLandingRotation ??
  mongoose.model<WeeklyLandingRotationDocument>("WeeklyLandingRotation", weeklyLandingRotationSchema);
