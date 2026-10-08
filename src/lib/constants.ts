/**
 * إعدادات التعلم المشتركة والقيم الافتراضية. لغات التعلم مستقلة عن لغتي الواجهة المحددتين في i18n.ts.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "PhraseFlow Atlas";

export const SUPPORTED_LANGUAGES = [
  {
    value: "german",
    label: "German",
    nativeLabel: "Deutsch",
    speechCode: "de-DE",
  },
  {
    value: "english",
    label: "English",
    nativeLabel: "English",
    speechCode: "en-US",
  },
  {
    value: "greek",
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
export const UNLOCK_AFTER_SENTENCES = 10;

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

export const defaultLandingSentences = [
  {
    language: "german",
    text: "Guten Morgen! Wie geht es dir heute?",
    arabicTranslation: "صباح الخير! كيف حالك اليوم؟",
  },
  {
    language: "english",
    text: "Small steps every day make a big difference.",
    arabicTranslation: "خطوات صغيرة كل يوم تصنع فرقا كبيرا.",
  },
  {
    language: "greek",
    text: "Καλησπέρα! Χαίρομαι που σε βλέπω.",
    arabicTranslation: "مساء الخير! سعيد برؤيتك.",
  },
  {
    language: "german",
    text: "Ich lerne jeden Tag etwas Neues.",
    arabicTranslation: "أنا أتعلم شيئا جديدا كل يوم.",
  },
] as const;
