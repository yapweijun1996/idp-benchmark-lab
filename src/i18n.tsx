import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAppSettings, saveAppSettings } from "./storage/settings";
import type { LanguageCode } from "./storage/types";
import { lookupTranslation } from "./i18nCatalog";

export const LANGUAGES: readonly { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "zh", label: "Mandarin" },
  { code: "ms", label: "Malay" },
  { code: "ja", label: "Japanese" },
  { code: "vi", label: "Vietnamese" },
];

export type I18nKey = string;

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: I18nKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const FALLBACK_I18N_CONTEXT: I18nContextValue = {
  language: "en",
  setLanguage: () => undefined,
  t: (key) => lookupTranslation("en", key),
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    let active = true;
    void getAppSettings()
      .then((settings) => {
        if (active && settings.language) setLanguageState(settings.language);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    void saveAppSettings({ language: next }).catch(() => undefined);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key) => lookupTranslation(language, key),
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext) ?? FALLBACK_I18N_CONTEXT;
}
