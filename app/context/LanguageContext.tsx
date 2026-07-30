"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Language } from "../types";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Keeps the selected language consistent while visitors move between pages.
 * The preference is device-local and does not require an account or backend.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("mfe");
  const firstPreferenceCheck = useRef(true);

  useEffect(() => {
    if (firstPreferenceCheck.current) {
      firstPreferenceCheck.current = false;
      const savedLanguage = window.localStorage.getItem("rekolt-language");

      // Defer the restored state so the first rendered page stays hydration-safe.
      if (savedLanguage === "mfe" || savedLanguage === "en") {
        queueMicrotask(() => setLanguage(savedLanguage));
      }
      return;
    }

    window.localStorage.setItem("rekolt-language", language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

/** Shared hook used by the homepage and every separate navigation page. */
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
