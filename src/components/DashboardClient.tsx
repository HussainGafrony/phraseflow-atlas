"use client";

/**
 * Daily Greek learning interface: select criteria, restore server state, request batches, save sentences, and display topic progress.
 */

import { useCallback, useEffect, useState } from "react";
import {
  FREQUENCIES,
  LEVELS,
  LEARNING_LANGUAGE,
  TOPICS,
  DAILY_SENTENCE_LIMIT,
} from "@/lib/constants";
import { SentenceCard } from "./SentenceCard";
import { useI18n, T } from "./I18nProvider";

import type {
  SentenceView,
  LearningOption,
  TopicProgress,
} from "@/types/learning";
import { LearningSelect } from "./LearningSelect";
import { TopicProgressList } from "./TopicProgressList";

// Keep the current choice when it still exists; otherwise use the first available option.
function getAvailableValue(current: string, options?: LearningOption[]) {
  if (!options || options.length === 0) return current;
  if (options.some((option) => option.value === current)) return current;
  return options[0].value;
}

export function DashboardClient({ username }: { username: string }) {
  const { t } = useI18n();
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [level, setLevel] = useState<string>(LEVELS[0]);
  const [frequency, setFrequency] = useState<string>(FREQUENCIES[0].value);
  const [sentences, setSentences] = useState<SentenceView[]>([]);
  const [remaining, setRemaining] = useState(DAILY_SENTENCE_LIMIT);
  const [message, setMessage] = useState("");
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [progress, setProgress] = useState<TopicProgress[]>([]);
  const [topics, setTopics] = useState<LearningOption[]>(
    TOPICS.map((topic) => ({ label: topic, value: topic })),
  );
  const [levels, setLevels] = useState<LearningOption[]>(
    LEVELS.map((item) => ({ label: item, value: item })),
  );
  const [frequencies, setFrequencies] = useState<LearningOption[]>(
    FREQUENCIES.map((item) => ({ label: item.label, value: item.value })),
  );

  // Stable callbacks let the initial effect run once and allow event handlers to reuse them.
  const loadOptions = useCallback(async () => {
    const response = await fetch("/api/options");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    setTopics((current) => data.topics ?? current);
    setTopic((current) => getAvailableValue(current, data.topics));
    setLevel((current) => getAvailableValue(current, data.levels));
    setFrequency((current) => getAvailableValue(current, data.frequencies));
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

  const restoreToday = useCallback(async () => {
    const response = await fetch("/api/sentences/today", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not restore today's sentences.");
    const data = await response.json();
    setSentences(data.sentences ?? []);
    setRemaining(data.remaining);
  }, []);

  useEffect(() => {
    // These reads are independent, so load them at the same time.
    Promise.all([loadOptions(), refreshProgress(), restoreToday()])
      .catch(() =>
        setMessage(
          "Could not load your learning data. Please refresh the page.",
        ),
      )
      .finally(() => setInitializing(false));
  }, [loadOptions, refreshProgress, restoreToday]);

  async function getSentences() {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("/api/sentences/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: LEARNING_LANGUAGE,
          topic,
          level,
          frequency,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Could not load sentences.");
        return;
      }

      if (data.status === "retry") {
        await restoreToday();
        setMessage(
          "Another request updated your daily sentences. Your list has been refreshed.",
        );
        return;
      }
      setRemaining(data.remaining ?? remaining);
      if (data.status === "limit-reached") {
        setMessage("You reached your 20 sentences for today.");
        return;
      }

      setSentences((current) => [...current, ...(data.sentences ?? [])]);
      setMessage(
        data.sentences?.length ? "" : "No fresh sentences were generated yet.",
      );
      await refreshProgress();
    } catch {
      setMessage("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSentence(sentenceId: string) {
    try {
      setSavingId(sentenceId);
      const response = await fetch("/api/sentences/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentenceId }),
      });

      if (!response.ok) {
        setMessage("Could not save this sentence.");
        return;
      }

      setSentences((current) =>
        current.filter((sentence) => sentence.id !== sentenceId),
      );
      await refreshProgress();
    } catch {
      setMessage("Connection failed. Please try again.");
    } finally {
      setSavingId("");
    }
  }

  return (
    <section className="dashboard-content">
      <div className="page-heading">
        <p className="eyebrow">
          {" "}
          <T k="Welcome," /> {username}
        </p>
        <h1>{t("todaySentences")}</h1>
        <p>
          {" "}
          <T k="Pick your learning path and request up to 20 fresh sentences per day." />{" "}
        </p>
      </div>

      <div className="control-panel">
        <LearningSelect
          label="topic"
          value={topic}
          options={topics}
          onChange={setTopic}
        />
        <LearningSelect
          label="level"
          value={level}
          options={levels}
          onChange={setLevel}
        />
        <LearningSelect
          label="frequency"
          value={frequency}
          options={frequencies}
          onChange={setFrequency}
        />
      </div>

      <div className="action-row">
        <button
          className="primary-button"
          type="button"
          onClick={getSentences}
          disabled={initializing || loading || remaining <= 0}
        >
          {loading ? t("Generating...") : t("giveMeSentences")}
        </button>
        <span>
          {remaining} <T k="sentences left today" />{" "}
        </span>
      </div>

      {message ? <p className="form-message">{t(message)}</p> : null}

      <TopicProgressList topics={progress} />

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
