import type { SentenceView } from "@/types/learning";

// MongoDB uses _id; the browser receives a string id and only the fields it needs.
export type StoredSentence = {
  _id: { toString(): string };
  language: string;
  topic: string;
  level: string;
  frequency: string;
  text: string;
  arabicTranslation: string;
};

export function toSentenceView(sentence: StoredSentence): SentenceView {
  return {
    id: sentence._id.toString(),
    language: sentence.language,
    topic: sentence.topic,
    level: sentence.level,
    frequency: sentence.frequency,
    text: sentence.text,
    arabicTranslation: sentence.arabicTranslation,
  };
}
