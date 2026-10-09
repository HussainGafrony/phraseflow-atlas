/**
 * Shared learning configuration and defaults. The learning language is independent of the two interface languages in i18n.ts.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "PhraseFlow Atlas";

export const LEARNING_LANGUAGE = "greek" as const;
export const SUPPORTED_LANGUAGES = [
  {
    value: LEARNING_LANGUAGE,
    label: "Greek",
    nativeLabel: "Ελληνικά",
    speechCode: "el-GR",
  },
] as const;

export const TOPICS = [
  "Daily life",
  "Travel",
  "Restaurant",
  "Work",
  "Study",
  "Shopping",
  "Health",
  "Family",
] as const;

export const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export const FREQUENCIES = [
  { value: "most-common", label: "Most common" },
  { value: "common", label: "Common" },
  { value: "less-common", label: "Less common" },
] as const;

export const DAILY_SENTENCE_LIMIT = 20;
export const DAILY_BATCH_SIZE = 5;

export const AUTH_COOKIE = "lingua_session";

export const PROVIDER_KEYS = [
  "openai",
  "gemini",
  "claude",
  "deepseek",
  "grok",
] as const;

export type LearningLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];
export type LearningLevel = (typeof LEVELS)[number];
export type FrequencyLevel = (typeof FREQUENCIES)[number]["value"];
export type ProviderKey = (typeof PROVIDER_KEYS)[number];

// Fixed public landing content with no weekly rotation or automatic generation.
export const defaultLandingSentences = [
  {
    language: "greek",
    text: "Καλημέρα! Πώς είσαι;",
    arabicTranslation: "صباح الخير! كيف حالك؟",
  },
  {
    language: "greek",
    text: "Ευχαριστώ πολύ.",
    arabicTranslation: "شكراً جزيلاً.",
  },
  {
    language: "greek",
    text: "Χαίρομαι που σε γνωρίζω.",
    arabicTranslation: "سعيد بلقائك.",
  },
  {
    language: "greek",
    text: "Μπορείς να το πεις ξανά;",
    arabicTranslation: "هل يمكنك قول ذلك مرة أخرى؟",
  },
] as const;
