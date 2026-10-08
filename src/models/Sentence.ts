/**
 * نص الجملة وترجمتها ومعاييرها ورابط الصوت؛ بصمة فريدة لمنع تكرار النص المخزن.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const sentenceSchema = new Schema(
  {
    language: { type: String, required: true, index: true },
    topic: { type: String, required: true, index: true },
    level: { type: String, required: true, index: true },
    frequency: { type: String, required: true, index: true },
    text: { type: String, required: true },
    arabicTranslation: { type: String, required: true },
    audioUrl: { type: String, default: "" },
    sourceProvider: { type: String, default: "fallback" },
    hash: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export type SentenceDocument = InferSchemaType<typeof sentenceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Sentence: Model<SentenceDocument> =
  mongoose.models.Sentence ??
  mongoose.model<SentenceDocument>("Sentence", sentenceSchema);
