/**
 * قواعد التحقق من مدخلات المستخدم والأدمن باستخدام Zod؛ تُطبّق على السيرفر قبل استخدام البيانات أو حفظها.
 */
import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "./constants";

const languageValues = SUPPORTED_LANGUAGES.map(
  (language) => language.value,
) as [string, ...string[]];

export const credentialsSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(6).max(120),
  expectedRole: z.enum(["user", "admin"]).default("user"),
});

export const createUserSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(6).max(120),
});

export const sentenceRequestSchema = z.object({
  language: z.enum(languageValues),
  topic: z.string().trim().min(2).max(80),
  level: z.string().trim().min(2).max(80),
  frequency: z.string().trim().min(2).max(80),
});

export const saveSentenceSchema = z.object({
  sentenceId: z.string().regex(/^[a-f0-9]{24}$/i),
});

export const unlockSchema = z.object({
  code: z.string().trim().min(2).max(32),
});
