// Plain data shared by API responses and React components. No database code belongs here.
export type SentenceView = {
  id: string;
  language: string;
  topic: string;
  level: string;
  frequency: string;
  text: string;
  arabicTranslation: string;
};

export type LearningOption = { label: string; value: string };
export type TopicProgress = {
  topic: string;
  delivered: number;
  saved: number;
  percent: number;
};
