"use client";

import type { LearningOption } from "@/types/learning";
import { useI18n } from "./I18nProvider";

type Props = {
  label: string;
  value: string;
  options: LearningOption[];
  onChange: (value: string) => void;
};

// The topic, level, and frequency selectors share the same markup.
export function LearningSelect({ label, value, options, onChange }: Props) {
  const { t } = useI18n();
  return (
    <label>
      {t(label)}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.label)}
          </option>
        ))}
      </select>
    </label>
  );
}
