"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDayLabel } from "@/lib/dates";
import { SentenceCard, type SentenceView } from "./SentenceCard";
import { useI18n } from "./I18nProvider";

type SavedItem = {
  id: string;
  dayKey: string;
  savedAt: string;
  sentence: SentenceView;
};

export function SavedSentencesClient() {
  const { t } = useI18n();
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

    load();
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
        <p className="eyebrow">Review space</p>
        <h1>{t("savedSentences")}</h1>
        <p>Your saved sentences are separated by day so reviews stay clear.</p>
      </div>

      {loading ? <p className="form-message">Loading saved sentences...</p> : null}
      {message ? <p className="form-message error">{message}</p> : null}
      {!loading && !items.length ? (
        <div className="empty-state">
          <h2>No saved sentences yet</h2>
          <p>Save a sentence from today’s list and it will appear here.</p>
        </div>
      ) : null}

      {Object.entries(grouped).map(([dayKey, savedItems]) => (
        <section className="saved-day" key={dayKey}>
          <div className="day-divider">
            <span>{formatDayLabel(dayKey)}</span>
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
