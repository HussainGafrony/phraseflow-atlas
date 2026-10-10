"use client";

/**
 * Shared interface language state. Arabic is the default, Greek is optional, and the local preference controls RTL/LTR direction.
 */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { uiPhrases } from "@/lib/ui-phrases";
import {
  dictionary,
  UI_LANGUAGES,
  DEFAULT_UI_LANGUAGE,
  sourceKeys,
  type TranslationKey,
  type UiLanguage,
} from "@/lib/i18n";

type I18nContextValue = {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function applyDocumentLanguage(language: UiLanguage) {
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = language;
}

// Look up a label in order: named key, legacy English label, provider error, phrase text.
function translateText(key: string, language: UiLanguage): string {
  if (key in dictionary.ar) return dictionary[language][key as TranslationKey];
  const translationKey = sourceKeys[key];
  if (translationKey) return dictionary[language][translationKey];

  const providerError = key.match(
    /^(?:Provider|Gemini|Claude|Audio provider) returned (\d+)\.?$/,
  );
  if (providerError) {
    const message = uiPhrases["Provider request failed."][language];
    return `${message} (${providerError[1]})`;
  }
  return uiPhrases[key]?.[language] ?? key;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] =
    useState<UiLanguage>(DEFAULT_UI_LANGUAGE);

  useEffect(() => {
    let saved: UiLanguage | null = null;
    try {
      saved = window.localStorage.getItem(
        "phraseflow-ui-language",
      ) as UiLanguage | null;
    } catch {
      /* Storage can be unavailable in private browsers. */
    }
    const nextLanguage =
      saved && UI_LANGUAGES.some((item) => item.value === saved)
        ? saved
        : DEFAULT_UI_LANGUAGE;
    setLanguageState(nextLanguage);
    applyDocumentLanguage(nextLanguage);
  }, []);

  function setLanguage(nextLanguage: UiLanguage) {
    setLanguageState(nextLanguage);
    try {
      window.localStorage.setItem("phraseflow-ui-language", nextLanguage);
    } catch {
      /* Keep the current session language. */
    }
    applyDocumentLanguage(nextLanguage);
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string) => translateText(key, language),
    }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return context;
}

export function T({ k }: { k: string }) {
  const { t } = useI18n();
  return <>{t(k)}</>;
}
