import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const landingSentenceSchema = new Schema(
  {
    language: { type: String, required: true },
    text: { type: String, required: true },
    arabicTranslation: { type: String, required: true },
    activeFromWeek: { type: String, required: true, index: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export type LandingSentenceDocument = InferSchemaType<typeof landingSentenceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const LandingSentence: Model<LandingSentenceDocument> =
  mongoose.models.LandingSentence ??
  mongoose.model<LandingSentenceDocument>("LandingSentence", landingSentenceSchema);
