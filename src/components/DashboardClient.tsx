"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FREQUENCIES,
  LEVELS,
  SUPPORTED_LANGUAGES,
  TOPICS,
  DAILY_SENTENCE_LIMIT
} from "@/lib/constants";
import { SentenceCard, type SentenceView } from "./SentenceCard";
import { useI18n } from "./I18nProvider";

type ProgressItem = {
  topic: string;
  delivered: number;
  saved: number;
  percent: number;
};

type LearningOption = {
  label: string;
  value: string;
};

export function DashboardClient({ username }: { username: string }) {
  const { t } = useI18n();
  const [language, setLanguage] = useState<string>("german");
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [frequency, setFrequency] = useState<string>(FREQUENCIES[0].value);
  const [sentences, setSentences] = useState<SentenceView[]>([]);
  const [remaining, setRemaining] = useState(DAILY_SENTENCE_LIMIT);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlockCode, setUnlockCode] = useState("");
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [topics, setTopics] = useState<LearningOption[]>(TOPICS.map((topic) => ({ label: topic, value: topic })));
  const [levels, setLevels] = useState<LearningOption[]>(LEVELS.map((item) => ({ label: item, value: item })));
  const [frequencies, setFrequencies] = useState<LearningOption[]>(
    FREQUENCIES.map((item) => ({ label: item.label, value: item.value }))
  );

  const loadOptions = useCallback(async () => {
    const response = await fetch("/api/options");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setTopics((current) => data.topics ?? current);
    setLevels((current) => data.levels ?? current);
    setFrequencies((current) => data.frequencies ?? current);
  }, []);

  const refreshProgress = useCallback(async () => {
    const response = await fetch("/api/progress");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setProgress(data.topics ?? []);
  }, []);

  useEffect(() => {
    loadOptions();
    refreshProgress();
  }, [loadOptions, refreshProgress]);

  async function getSentences() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/sentences/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, topic, level, frequency })
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Could not load sentences.");
      return;
    }

    setRemaining(data.remaining ?? remaining);
    setNeedsUnlock(data.status === "unlock-required");

    if (data.status === "limit-reached") {
      setMessage("You reached your 20 sentences for today.");
      return;
    }

    if (data.status === "unlock-required") {
      setMessage("Ask the admin for today's unlock code to continue.");
      return;
    }

    setSentences((current) => [...current, ...(data.sentences ?? [])]);
    setMessage(data.sentences?.length ? "" : "No fresh sentences were generated yet.");
    refreshProgress();
  }

  async function unlockToday() {
    setMessage("");
    const response = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: unlockCode })
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Unlock failed.");
      return;
    }

    setNeedsUnlock(false);
    setUnlockCode("");
    setMessage("Unlocked. You can request two more batches today.");
  }

  async function saveSentence(sentenceId: string) {
    setSavingId(sentenceId);
    const response = await fetch("/api/sentences/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentenceId })
    });

    setSavingId("");
    if (!response.ok) {
      setMessage("Could not save this sentence.");
      return;
    }

    setSentences((current) => current.filter((sentence) => sentence.id !== sentenceId));
    refreshProgress();
  }

  return (
    <section className="dashboard-content">
      <div className="page-heading">
        <p className="eyebrow">Welcome, {username}</p>
        <h1>{t("todaySentences")}</h1>
        <p>Pick your learning path and request up to 20 fresh sentences per day.</p>
      </div>

      <div className="control-panel">
        <label>
          {t("language")}
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            {SUPPORTED_LANGUAGES.map((item) => (
              <option value={item.value} key={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("topic")}
          <select value={topic} onChange={(event) => setTopic(event.target.value)}>
            {topics.map((item) => (
              <option value={item.value} key={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("level")}
          <select value={level} onChange={(event) => setLevel(event.target.value)}>
            {levels.map((item) => (
              <option value={item.value} key={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("frequency")}
          <select value={frequency} onChange={(event) => setFrequency(event.target.value)}>
            {frequencies.map((item) => (
              <option value={item.value} key={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="action-row">
        <button className="primary-button" type="button" onClick={getSentences} disabled={loading || remaining <= 0 || needsUnlock}>
          {loading ? "Generating..." : t("giveMeSentences")}
        </button>
        <span>{remaining} sentences left today</span>
      </div>

      {needsUnlock ? (
        <div className="unlock-box">
          <input
            value={unlockCode}
            onChange={(event) => setUnlockCode(event.target.value)}
            placeholder="Admin code"
          />
          <button className="secondary-button" type="button" onClick={unlockToday}>
            Unlock
          </button>
        </div>
      ) : null}

      {message ? <p className="form-message">{message}</p> : null}

      <section className="progress-grid" aria-label="Topic progress">
        {progress.map((item) => (
          <button
            className="progress-pill"
            type="button"
            key={item.topic}
            title={`${item.percent}% saved from delivered sentences`}
          >
            <span>{item.topic}</span>
            <strong>{item.percent}%</strong>
            <small>
              {item.saved}/{item.delivered || 0}
            </small>
          </button>
        ))}
      </section>

      <section className="sentence-grid">
        {sentences.map((sentence) => (
          <SentenceCard
            key={sentence.id}
            sentence={sentence}
            onSave={saveSentence}
            saving={savingId === sentence.id}
          />
        ))}
      </section>
    </section>
  );
}
