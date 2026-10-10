"use client";

/**
 * Sentence card with an Arabic translation. Playback uses device speech only, without audio storage or a speech API.
 */

import { useEffect, useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { useI18n } from "./I18nProvider";

import type { SentenceView } from "@/types/learning";

type SentenceCardProps = {
  sentence: SentenceView;
  onSave?: (id: string) => void;
  saving?: boolean;
};

export function SentenceCard({ sentence, onSave, saving }: SentenceCardProps) {
  const { t } = useI18n();
  const language = SUPPORTED_LANGUAGES.find(
    (item) => item.value === sentence.language,
  );

  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState("");
  // Use device speech only; do not request, store, or link to an audio file.
  useEffect(
    () => () => {
      window.speechSynthesis?.cancel();
    },
    [],
  );
  function listen() {
    setNotice("");
    if (!("speechSynthesis" in window)) {
      setNotice("Audio unavailable. Try again later.");
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(sentence.text);
      // Keep pronunciation available for older saved sentences without restoring their languages to the learning selector.
      utterance.lang =
        language?.speechCode ??
        { german: "de-DE", english: "en-US" }[sentence.language] ??
        "el-GR";
      utterance.onend = () => setPlaying(false);
      utterance.onerror = () => {
        setPlaying(false);
        setNotice("Audio unavailable. Try again later.");
      };
      setPlaying(true);
      window.speechSynthesis.speak(utterance);
      setNotice("Using device voice");
    } catch {
      setPlaying(false);
      setNotice("Audio unavailable. Try again later.");
    }
  }

  return (
    <article className="sentence-card">
      <div className="sentence-meta">
        <span>{t(language?.label ?? sentence.language)}</span>
        <span>{t(sentence.topic)}</span>
        <span>{t(sentence.level)}</span>
      </div>
      <h3>{sentence.text}</h3>
      <p lang="ar" dir="rtl">
        {sentence.arabicTranslation}
      </p>
      {notice && <p role="status">{t(notice)}</p>}
      <div className="sentence-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={listen}
          disabled={playing}
        >
          {t("listen")}
        </button>
        {onSave ? (
          <button
            type="button"
            className="primary-button small"
            onClick={() => onSave(sentence.id)}
            disabled={saving}
          >
            {saving ? t("Saving...") : t("save")}
          </button>
        ) : null}
      </div>
    </article>
  );
}
