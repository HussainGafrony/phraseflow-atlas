/**
 * خيارات الموضوع والمستوى والشيوع: اسم العرض والقيمة والترتيب وحالة التفعيل.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const learningOptionSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["topic", "level", "frequency"],
      required: true,
      index: true,
    },
    label: { type: String, required: true },
    value: { type: String, required: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

learningOptionSchema.index({ type: 1, value: 1 }, { unique: true });

export type LearningOptionDocument = InferSchemaType<
  typeof learningOptionSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const LearningOption: Model<LearningOptionDocument> =
  mongoose.models.LearningOption ??
  mongoose.model<LearningOptionDocument>(
    "LearningOption",
    learningOptionSchema,
  );
