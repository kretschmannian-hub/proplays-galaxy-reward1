"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { translations, DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./translations";

type Dict = typeof translations.de;

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  function setLocale(l: Locale) {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }

  function t(path: string): string {
    const value = getPath(translations[locale] as Dict, path);
    if (typeof value === "string") return value;
    const fallback = getPath(translations[DEFAULT_LOCALE] as Dict, path);
    return typeof fallback === "string" ? fallback : path;
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
