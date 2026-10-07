"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { dictionary, UI_LANGUAGES, type TranslationKey, type UiLanguage } from "@/lib/i18n";

type I18nContextValue = {
  language: UiLanguage;
  setLanguage: (language: UiLanguage) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function applyDocumentLanguage(language: UiLanguage) {
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = language;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("phraseflow-ui-language") as UiLanguage | null;
    const nextLanguage = saved && UI_LANGUAGES.some((item) => item.value === saved) ? saved : "en";
    if (nextLanguage !== language) {
      setLanguageState(nextLanguage);
    }
    applyDocumentLanguage(nextLanguage);
  }, [language]);

  function setLanguage(nextLanguage: UiLanguage) {
    setLanguageState(nextLanguage);
    window.localStorage.setItem("phraseflow-ui-language", nextLanguage);
    applyDocumentLanguage(nextLanguage);
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: TranslationKey) => dictionary[language][key] ?? dictionary.en[key]
    }),
    [language]
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

export function T({ k }: { k: TranslationKey }) {
  const { t } = useI18n();
  return <>{t(k)}</>;
}
