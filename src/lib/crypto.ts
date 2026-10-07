import crypto from "crypto";

const algorithm = "aes-256-gcm";

function getKey() {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error("APP_ENCRYPTION_KEY must be set to at least 32 characters to store provider secrets.");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  if (!value) {
    return "";
  }

  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload?: string) {
  if (!payload) {
    return "";
  }

  const [ivBase64, tagBase64, encryptedBase64] = payload.split(".");
  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    return "";
  }

  const key = getKey();
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function createStableHash(value: string) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}
