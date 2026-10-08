/**
 * توليد الصوت وتخزينه في Vercel Blob خاص. بصمة النص والصوت تمنع إعادة التوليد العادية؛ القفل يمنع الطلبات المتزامنة، والرابط يمر عبر API محمي.
 */
import { put, head } from "@vercel/blob";
import { createStableHash, decryptSecret } from "./crypto";
import { AudioSettings } from "@/models/AudioSettings";
import { AudioAsset } from "@/models/AudioAsset";

export async function getAudioCredentials() {
  const settings = await AudioSettings.findById("audio");
  return {
    settings,
    token:
      decryptSecret(settings?.encryptedBlobToken) ||
      process.env.BLOB_READ_WRITE_TOKEN,
  };
}

export async function generateAudioUrlOnce(
  text: string,
  language: string,
  strict = false,
) {
  const { settings, token } = await getAudioCredentials();
  if (!settings?.enabled || !token || !settings.encryptedApiKey) {
    if (strict)
      throw new Error(
        "Configure and enable audio generation and private Blob storage first.",
      );
    return "";
  }
  const key = createStableHash(
    JSON.stringify([
      language,
      text,
      settings.baseUrl,
      settings.model,
      settings.voice,
    ]),
  );
  const audioUrl = `/api/audio/${key}`;
  const existing = await AudioAsset.findOne({ key });
  if (existing?.state === "ready") return audioUrl;
  try {
    await AudioAsset.updateOne(
      { key },
      { $setOnInsert: { key, state: "failed" } },
      { upsert: true },
    );
  } catch (error) {
    if ((error as { code?: number }).code !== 11000) throw error;
  }
  const lease = new Date(Date.now() + 120000);
  const asset = await AudioAsset.findOneAndUpdate(
    {
      key,
      state: { $ne: "ready" },
      $or: [
        { leaseUntil: { $exists: false } },
        { leaseUntil: { $lt: new Date() } },
      ],
    },
    { $set: { state: "pending", leaseUntil: lease } },
    { new: true },
  );
  if (!asset) {
    if (strict)
      throw new Error(
        "Audio is already being generated. Please try again shortly.",
      );
    return "";
  }
  const pathname = `sentences/${key}.mp3`;
  try {
    // Recover a completed upload if an earlier database update failed.
    let blob: { url: string; pathname: string } | null = null;
    try {
      blob = await head(pathname, { token });
    } catch (error) {
      if (!(error instanceof Error) || error.name !== "BlobNotFoundError")
        throw error;
    }
    if (!blob) {
      const url = new URL(
        settings.endpoint.replace(/^\//, ""),
        `${settings.baseUrl.replace(/\/$/, "")}/`,
      );
      const response = await fetch(url, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(30000),
        headers: {
          Authorization: `Bearer ${decryptSecret(settings.encryptedApiKey)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: settings.model,
          input: text,
          voice: settings.voice,
          response_format: "mp3",
        }),
      });
      if (!response.ok)
        throw new Error(`Audio provider returned ${response.status}.`);
      const type = response.headers.get("content-type") ?? "";
      if (
        !type.startsWith("audio/") &&
        !type.startsWith("application/octet-stream")
      )
        throw new Error("Audio provider did not return an audio file.");
      const bytes = await response.arrayBuffer();
      if (!bytes.byteLength || bytes.byteLength > 10 * 1024 * 1024)
        throw new Error("Audio file size is invalid.");
      blob = await put(pathname, bytes, {
        access: "private",
        token,
        contentType: "audio/mpeg",
        addRandomSuffix: false,
        allowOverwrite: false,
      });
    }
    await AudioAsset.updateOne(
      { key, leaseUntil: lease },
      {
        $set: {
          state: "ready",
          blobPath: blob.pathname,
          blobUrl: blob.url,
          contentType: "audio/mpeg",
        },
        $unset: { leaseUntil: 1 },
      },
    );
    return audioUrl;
  } catch (error) {
    await AudioAsset.updateOne(
      { key, leaseUntil: lease },
      { $set: { state: "failed" }, $unset: { leaseUntil: 1 } },
    );
    if (strict) throw error;
    console.error("Audio generation or storage failed.");
    return "";
  }
}
