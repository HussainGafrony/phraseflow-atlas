/**
 * Validate user and administrator input with Zod on the server before using or storing it.
 */
import { z } from "zod";
import { LEARNING_LANGUAGE } from "./constants";

export const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  expectedRole: z.enum(["user", "admin"]).default("user"),
});

export const createUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  role: z.enum(["user", "admin"]).default("user"),
});

export const sentenceRequestSchema = z.object({
  language: z.literal(LEARNING_LANGUAGE).default(LEARNING_LANGUAGE),
  topic: z.string().trim().min(2).max(80),
  level: z.string().trim().min(2).max(80),
  frequency: z.string().trim().min(2).max(80),
});

export const saveSentenceSchema = z.object({
  sentenceId: z.string().regex(/^[a-f0-9]{24}$/i),
});
