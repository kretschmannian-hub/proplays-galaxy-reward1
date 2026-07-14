"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/AuthProvider";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import type { Locale } from "@/i18n/translations";

export function Providers({ children, initialLocale }: { children: ReactNode; initialLocale: Locale }) {
  return (
    <LocaleProvider initialLocale={initialLocale}>
      <AuthProvider>{children}</AuthProvider>
    </LocaleProvider>
  );
}
