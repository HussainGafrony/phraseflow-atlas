import { z } from "zod";
import { PROVIDER_KEYS, SUPPORTED_LANGUAGES } from "./constants";

const languageValues = SUPPORTED_LANGUAGES.map((language) => language.value) as [string, ...string[]];
const providerValues = PROVIDER_KEYS as unknown as [string, ...string[]];

export const credentialsSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(6).max(120),
  expectedRole: z.enum(["user", "admin"]).optional()
});

export const createUserSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(6).max(120)
});

export const sentenceRequestSchema = z.object({
  language: z.enum(languageValues),
  topic: z.string().trim().min(2).max(80),
  level: z.string().trim().min(2).max(80),
  frequency: z.string().trim().min(2).max(80)
});

export const saveSentenceSchema = z.object({
  sentenceId: z.string().regex(/^[a-f0-9]{24}$/i)
});

export const unlockSchema = z.object({
  code: z.string().trim().min(2).max(32)
});

export const unlockCodeAdminSchema = z.object({
  code: z.string().trim().min(2).max(32)
});

export const providerConfigSchema = z.object({
  providers: z.array(
    z.object({
      provider: z.enum(providerValues),
      enabled: z.boolean(),
      priority: z.number().int().min(1).max(99),
      model: z.string().trim().max(120).optional().default(""),
      baseUrl: z.string().trim().max(240).optional().default(""),
      apiKey: z.string().trim().max(500).optional().default(""),
      textEndpoint: z.string().trim().max(240).optional().default(""),
      audioEndpoint: z.string().trim().max(240).optional().default("")
    })
  )
});

export const landingSentenceSchema = z.object({
  sentences: z.array(
    z.object({
      language: z.enum(languageValues),
      text: z.string().trim().min(2).max(240),
      arabicTranslation: z.string().trim().min(2).max(240)
    })
  ).min(4).max(8)
});

export const setupAdminSchema = z.object({
  token: z.string().trim().max(200).optional().default(""),
  username: z.string().trim().min(3).max(40),
  password: z.string().min(8).max(120)
});

export const learningOptionsSchema = z.object({
  options: z
    .array(
      z.object({
        type: z.enum(["topic", "level", "frequency"]),
        label: z.string().trim().min(2).max(80),
        value: z.string().trim().max(80).optional().default(""),
        description: z.string().trim().max(240).optional().default(""),
        order: z.number().int().min(0).max(999).optional().default(0),
        isActive: z.boolean().optional().default(true)
      })
    )
    .min(3)
    .max(80)
});

export const providerTestSchema = z.object({
  provider: z.enum(providerValues)
});
