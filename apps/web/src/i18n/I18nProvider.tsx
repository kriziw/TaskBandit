import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import de from "./locales/de.json";
import en from "./locales/en.json";
import hu from "./locales/hu.json";

export type AppLanguage = "en" | "de" | "hu";

type Messages = Record<string, string>;

const dictionaries: Record<AppLanguage, Messages> = {
  en,
  de,
  hu
};

const fallbackLanguage: AppLanguage = "en";
const storageKey = "taskbandit-language";

type I18nContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function resolveInitialLanguage(): AppLanguage {
  const storedLanguage = window.localStorage.getItem(storageKey);
  if (storedLanguage === "en" || storedLanguage === "de" || storedLanguage === "hu") {
    return storedLanguage;
  }

  const browserLanguage = navigator.language.toLowerCase();
  if (browserLanguage.startsWith("de")) {
    return "de";
  }
  if (browserLanguage.startsWith("hu")) {
    return "hu";
  }

  return fallbackLanguage;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => resolveInitialLanguage());

  useEffect(() => {
    window.localStorage.setItem(storageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  const value: I18nContextValue = {
    language,
    setLanguage,
    t: (key: string) => dictionaries[language][key] ?? dictionaries[fallbackLanguage][key] ?? key
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider.");
  }

  return context;
}
