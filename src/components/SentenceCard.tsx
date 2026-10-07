"use client";

import { SUPPORTED_LANGUAGES } from "@/lib/constants";

export type SentenceView = {
  id: string;
  language: string;
  topic: string;
  level: string;
  frequency: string;
  text: string;
  arabicTranslation: string;
  audioUrl?: string;
};

type SentenceCardProps = {
  sentence: SentenceView;
  onSave?: (id: string) => void;
  saving?: boolean;
};

export function SentenceCard({ sentence, onSave, saving }: SentenceCardProps) {
  const language = SUPPORTED_LANGUAGES.find((item) => item.value === sentence.language);

  function listen() {
    if (sentence.audioUrl) {
      new Audio(sentence.audioUrl).play();
      return;
    }

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(sentence.text);
      utterance.lang = language?.speechCode ?? "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }

  return (
    <article className="sentence-card">
      <div className="sentence-meta">
        <span>{language?.label ?? sentence.language}</span>
        <span>{sentence.topic}</span>
        <span>{sentence.level}</span>
      </div>
      <h3>{sentence.text}</h3>
      <p lang="ar" dir="rtl">
        {sentence.arabicTranslation}
      </p>
      <div className="sentence-actions">
        <button type="button" className="secondary-button" onClick={listen}>
          Listen
        </button>
        {onSave ? (
          <button type="button" className="primary-button small" onClick={() => onSave(sentence.id)} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
