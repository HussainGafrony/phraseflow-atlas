import { z } from "zod";
import type { LearningLanguage, ProviderKey } from "../constants";
import { SUPPORTED_LANGUAGES } from "../constants";
import { decryptSecret } from "../crypto";
import { AIProvider } from "@/models/AIProvider";

export type GeneratedSentence = {
  text: string;
  arabicTranslation: string;
  sourceProvider: ProviderKey | "fallback";
};

type GenerationInput = {
  language: LearningLanguage;
  topic: string;
  level: string;
  frequency: string;
  count: number;
  avoid: string[];
};

const generatedSchema = z.object({
  sentences: z.array(
    z.object({
      text: z.string().min(2),
      arabicTranslation: z.string().min(2)
    })
  )
});

export async function generateSentences(input: GenerationInput): Promise<GeneratedSentence[]> {
  const providers = await AIProvider.find({ enabled: true }).sort({ priority: 1 }).lean();

  for (const provider of providers) {
    try {
      const result = await callProvider(provider, input);
      if (result.length) {
        return result.map((sentence) => ({
          ...sentence,
          sourceProvider: provider.provider as ProviderKey
        }));
      }
    } catch (error) {
      console.error(`AI provider ${provider.provider} failed`, error);
    }
  }

  return generateFallbackSentences(input);
}

async function callProvider(
  provider: {
    provider: string;
    model?: string;
    baseUrl?: string;
    textEndpoint?: string;
    encryptedApiKey?: string;
  },
  input: GenerationInput
) {
  const apiKey = decryptSecret(provider.encryptedApiKey);
  if (!apiKey || !provider.baseUrl || !provider.textEndpoint) {
    return [];
  }

  const prompt = buildPrompt(input);
  const url = buildEndpoint(provider.baseUrl, provider.textEndpoint, provider.model);

  if (provider.provider === "gemini") {
    return callGemini(url, apiKey, prompt);
  }

  if (provider.provider === "claude") {
    return callClaude(url, apiKey, provider.model || "claude-3-5-sonnet-latest", prompt);
  }

  return callOpenAICompatible(url, apiKey, provider.model || "gpt-4o-mini", prompt);
}

function buildPrompt(input: GenerationInput) {
  const language = SUPPORTED_LANGUAGES.find((item) => item.value === input.language)?.label ?? input.language;

  return [
    "You generate language-learning sentences.",
    `Target language: ${language}.`,
    `Topic: ${input.topic}.`,
    `Level: ${input.level}.`,
    `Frequency band: ${input.frequency}.`,
    `Return exactly ${input.count} fresh sentences that are not in this avoid list: ${input.avoid.join(" | ")}.`,
    "Each sentence must be natural, short, useful, and translated into Arabic.",
    "Return JSON only in this format: {\"sentences\":[{\"text\":\"...\",\"arabicTranslation\":\"...\"}]}."
  ].join("\n");
}

function buildEndpoint(baseUrl: string, endpoint: string, model?: string) {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${normalizedBase}${normalizedEndpoint.replace("{model}", model ?? "")}`;
}

async function callOpenAICompatible(url: string, apiKey: string, model: string, prompt: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return compact valid JSON only." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Provider returned ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  return parseProviderJson(content);
}

async function callGemini(url: string, apiKey: string, prompt: string) {
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini returned ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseProviderJson(content);
}

async function callClaude(url: string, apiKey: string, model: string, prompt: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude returned ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.find((item: { type: string; text?: string }) => item.type === "text")?.text;
  return parseProviderJson(content);
}

function parseProviderJson(content: unknown) {
  if (typeof content !== "string") {
    return [];
  }

  const cleaned = content
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  const parsed = generatedSchema.safeParse(JSON.parse(cleaned));
  if (!parsed.success) {
    return [];
  }

  return parsed.data.sentences;
}

export async function testProviderConnection(providerName: ProviderKey) {
  const provider = await AIProvider.findOne({ provider: providerName }).lean();
  if (!provider?.enabled) {
    return { ok: false, message: "Provider is not enabled." };
  }

  const result = await callProvider(provider, {
    language: "english",
    topic: "Daily life",
    level: "Beginner",
    frequency: "most-common",
    count: 1,
    avoid: []
  });

  return {
    ok: result.length > 0,
    message: result.length ? "Provider generated a test sentence." : "Provider returned no usable sentence."
  };
}

function generateFallbackSentences(input: GenerationInput): GeneratedSentence[] {
  const language = SUPPORTED_LANGUAGES.find((item) => item.value === input.language)?.label ?? input.language;
  const seed = Date.now().toString().slice(-5);

  return Array.from({ length: input.count }, (_, index) => {
    const number = index + 1;
    return {
      text: fallbackText(input.language, input.topic, input.level, number, seed),
      arabicTranslation: `جملة تدريبية عن ${input.topic} للمستوى ${input.level} باللغة ${language}.`,
      sourceProvider: "fallback"
    };
  });
}

function fallbackText(
  language: LearningLanguage,
  topic: string,
  level: string,
  number: number,
  seed: string
) {
  if (language === "german") {
    return `Ich uebe ${topic} jeden Tag, Satz ${number} (${level}-${seed}).`;
  }

  if (language === "greek") {
    return `Μαθαίνω ${topic} κάθε μέρα, πρόταση ${number} (${level}-${seed}).`;
  }

  return `I practice ${topic} every day, sentence ${number} (${level}-${seed}).`;
}
