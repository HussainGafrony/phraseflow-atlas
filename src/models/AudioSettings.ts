/**
 * إعدادات خدمة الصوت المستقلة عن موديل النص؛ مفاتيح الخدمة وBlob مشفرة.
 */
import mongoose, { Schema } from "mongoose";
const schema = new Schema(
  {
    _id: { type: String, default: "audio" },
    enabled: { type: Boolean, default: false },
    baseUrl: { type: String, default: "https://api.openai.com/v1" },
    endpoint: { type: String, default: "/audio/speech" },
    model: { type: String, default: "gpt-4o-mini-tts" },
    voice: { type: String, default: "alloy" },
    encryptedApiKey: { type: String, default: "" },
    encryptedBlobToken: { type: String, default: "" },
  },
  { timestamps: true },
);
export const AudioSettings =
  mongoose.models.AudioSettings ?? mongoose.model("AudioSettings", schema);
