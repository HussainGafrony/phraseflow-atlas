"use client";

/**
 * Select the interface language independently of the learning language. Allowed values come from i18n.ts.
 */

import { UI_LANGUAGES, type UiLanguage } from "@/lib/i18n";
import { useI18n, T } from "./I18nProvider";

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();

  return (
    <label className="language-switcher">
      <span>
        {" "}
        <T k="UI" />{" "}
      </span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as UiLanguage)}
      >
        {UI_LANGUAGES.map((item) => (
          <option value={item.value} key={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
