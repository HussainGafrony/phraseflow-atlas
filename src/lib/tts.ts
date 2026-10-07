import { decryptSecret } from "./crypto";
import { AIProvider } from "@/models/AIProvider";

export async function generateAudioUrlOnce(text: string, language: string) {
  const provider = await AIProvider.findOne({
    enabled: true,
    audioEndpoint: { $ne: "" }
  }).sort({ priority: 1 });

  if (!provider?.baseUrl || !provider.audioEndpoint || !provider.encryptedApiKey) {
    return "";
  }

  const apiKey = decryptSecret(provider.encryptedApiKey);
  const url = `${provider.baseUrl.replace(/\/$/, "")}/${provider.audioEndpoint.replace(/^\//, "")}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: provider.model,
        input: text,
        language
      })
    });

    if (!response.ok) {
      return "";
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return typeof data.audioUrl === "string" ? data.audioUrl : "";
    }

    if (contentType.startsWith("audio/")) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return `data:${contentType};base64,${buffer.toString("base64")}`;
    }

    return "";
  } catch (error) {
    console.error("Audio generation failed", error);
    return "";
  }
}
