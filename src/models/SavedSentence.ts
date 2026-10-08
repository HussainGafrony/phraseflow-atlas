/**
 * محفوظات المستخدم ويوم الحفظ؛ علاقة فريدة بين المستخدم والجملة.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const savedSentenceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sentenceId: {
      type: Schema.Types.ObjectId,
      ref: "Sentence",
      required: true,
      index: true,
    },
    dayKey: { type: String, required: true, index: true },
  },
  { timestamps: true },
);

savedSentenceSchema.index({ userId: 1, sentenceId: 1 }, { unique: true });

export type SavedSentenceDocument = InferSchemaType<
  typeof savedSentenceSchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const SavedSentence: Model<SavedSentenceDocument> =
  mongoose.models.SavedSentence ??
  mongoose.model<SavedSentenceDocument>("SavedSentence", savedSentenceSchema);
