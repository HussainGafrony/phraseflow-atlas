/**
 * فهرس الملف الصوتي وبصمته وحالة توليده ورابطه الخاص؛ القفل يمنع التوليد المتزامن.
 */
import mongoose, { Schema } from "mongoose";
const schema = new Schema(
  {
    key: { type: String, unique: true, required: true },
    state: {
      type: String,
      enum: ["pending", "ready", "failed"],
      default: "pending",
    },
    leaseUntil: Date,
    blobPath: String,
    blobUrl: String,
    contentType: String,
  },
  { timestamps: true },
);
export const AudioAsset =
  mongoose.models.AudioAsset ?? mongoose.model("AudioAsset", schema);
