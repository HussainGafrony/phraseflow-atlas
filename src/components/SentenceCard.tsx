"use client";

/**
 * بطاقة الجملة وترجمتها العربية. الاستماع يعيد استخدام الصوت المخزن، أو يطلب توليده؛ صوت الجهاز بديل واضح عند غياب خدمة الصوت.
 */

import { useState } from "react";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { useI18n } from "./I18nProvider";

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
  const { t } = useI18n();
  const language = SUPPORTED_LANGUAGES.find(
    (item) => item.value === sentence.language,
  );

  const [playing, setPlaying] = useState(false);
  const [notice, setNotice] = useState("");
  const [savedAudio, setSavedAudio] = useState(sentence.audioUrl);
  async function listen() {
    setPlaying(true);
    setNotice("");
    try {
      let url = savedAudio;
      if (!url) {
        const response = await fetch("/api/sentences/audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentenceId: sentence.id }),
        });
        if (response.ok) {
          url = (await response.json()).audioUrl;
          setSavedAudio(url);
        }
      }
      if (url) {
        const audio = new Audio(url);
        audio.onended = () => setPlaying(false);
        audio.onerror = () => {
          setPlaying(false);
          setNotice("Audio unavailable. Try again later.");
        };
        await audio.play();
        setNotice("AI-generated audio");
        return;
      }
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(sentence.text);
        utterance.lang = language?.speechCode ?? "en-US";
        utterance.onend = () => setPlaying(false);
        utterance.onerror = () => setPlaying(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        setNotice("Using device voice");
        return;
      }
      throw new Error("No audio available");
    } catch {
      setNotice("Audio unavailable. Try again later.");
      setPlaying(false);
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
