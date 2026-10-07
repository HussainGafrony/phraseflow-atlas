import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const aiProviderSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      unique: true,
      enum: ["openai", "gemini", "claude", "deepseek", "grok"]
    },
    enabled: { type: Boolean, default: false },
    priority: { type: Number, default: 10 },
    model: { type: String, default: "" },
    baseUrl: { type: String, default: "" },
    textEndpoint: { type: String, default: "" },
    audioEndpoint: { type: String, default: "" },
    encryptedApiKey: { type: String, default: "" }
  },
  { timestamps: true }
);

export type AIProviderDocument = InferSchemaType<typeof aiProviderSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AIProvider: Model<AIProviderDocument> =
  mongoose.models.AIProvider ?? mongoose.model<AIProviderDocument>("AIProvider", aiProviderSchema);
