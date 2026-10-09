"use client";

/**
 * Load saved sentences and group them by the day they were saved. Format day headings in the current interface language.
 */

import { useEffect, useMemo, useState } from "react";
import { formatDayLabel } from "@/lib/dates";
import { SentenceCard, type SentenceView } from "./SentenceCard";
import { useI18n, T } from "./I18nProvider";

type SavedItem = {
  id: string;
  dayKey: string;
  savedAt: string;
  sentence: SentenceView;
};

export function SavedSentencesClient() {
  const { t, language } = useI18n();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/saved");
      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setMessage(data.error ?? "Could not load saved sentences.");
        return;
      }

      setItems(data.saved ?? []);
    }

    load().catch(() => {
      setMessage("Connection failed. Please try again.");
      setLoading(false);
    });
  }, []);

  const grouped = useMemo(() => {
    return items.reduce<Record<string, SavedItem[]>>((groups, item) => {
      groups[item.dayKey] ??= [];
      groups[item.dayKey].push(item);
      return groups;
    }, {});
  }, [items]);

  return (
    <section className="dashboard-content">
      <div className="page-heading">
        <p className="eyebrow">
          {" "}
          <T k="Review space" />{" "}
        </p>
        <h1>{t("savedSentences")}</h1>
        <p>
          {" "}
          <T k="Your saved sentences are separated by day so reviews stay clear." />{" "}
        </p>
      </div>

      {loading ? (
        <p className="form-message">
          {" "}
          <T k="Loading saved sentences..." />{" "}
        </p>
      ) : null}
      {message ? <p className="form-message error">{t(message)}</p> : null}
      {!loading && !items.length ? (
        <div className="empty-state">
          <h2>
            {" "}
            <T k="No saved sentences yet" />{" "}
          </h2>
          <p>
            {" "}
            <T k="Save a sentence from today’s list and it will appear here." />{" "}
          </p>
        </div>
      ) : null}

      {Object.entries(grouped).map(([dayKey, savedItems]) => (
        <section className="saved-day" key={dayKey}>
          <div className="day-divider">
            <span>{formatDayLabel(dayKey, language)}</span>
          </div>
          <div className="sentence-grid">
            {savedItems.map((item) => (
              <SentenceCard key={item.id} sentence={item.sentence} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
