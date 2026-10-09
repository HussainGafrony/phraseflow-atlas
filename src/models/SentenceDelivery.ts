/**
 * Sentence delivery history for each user. A unique user-sentence index prevents duplicate deliveries.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const sentenceDeliverySchema = new Schema(
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
    context: {
      language: String,
      topic: String,
      level: String,
      frequency: String,
    },
  },
  { timestamps: true },
);

sentenceDeliverySchema.index({ userId: 1, sentenceId: 1 }, { unique: true });
sentenceDeliverySchema.index({ userId: 1, dayKey: 1 });

export type SentenceDeliveryDocument = InferSchemaType<
  typeof sentenceDeliverySchema
> & {
  _id: mongoose.Types.ObjectId;
};

export const SentenceDelivery: Model<SentenceDeliveryDocument> =
  mongoose.models.SentenceDelivery ??
  mongoose.model<SentenceDeliveryDocument>(
    "SentenceDelivery",
    sentenceDeliverySchema,
  );
