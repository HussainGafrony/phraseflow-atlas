"use client";

import { useState } from "react";
import type { TopicProgress } from "@/types/learning";
import { useI18n } from "./I18nProvider";

// This component only displays progress. The dashboard owns fetching the data.
export function TopicProgressList({ topics }: { topics: TopicProgress[] }) {
  const { t } = useI18n();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  function toggleTopic(topic: string) {
    setSelectedTopic((current) => (current === topic ? null : topic));
  }

  return (
    <section className="progress-grid" aria-label="Topic progress">
      {topics.map((item) => (
        <button
          className="progress-pill"
          type="button"
          key={item.topic}
          title={`${item.percent}%`}
          aria-expanded={selectedTopic === item.topic}
          onClick={() => toggleTopic(item.topic)}
        >
          <span>{t(item.topic)}</span>
          <strong>
            {selectedTopic === item.topic ? `${item.percent}%` : "🌱"}
          </strong>
          <small>
            {item.saved}/{item.delivered || 0}
          </small>
        </button>
      ))}
    </section>
  );
}
