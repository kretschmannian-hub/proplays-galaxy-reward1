import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LOCALE_COOKIE, DEFAULT_LOCALE, type Locale } from "@/i18n/translations";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Proplays Galaxy Rewards",
  description: "Redeem codes, earn giveaway tickets, and unlock exclusive perks — connected securely with your Roblox account.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  const initialLocale: Locale = cookieLocale === "en" ? "en" : DEFAULT_LOCALE;

  return (
    <html lang={initialLocale} className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body bg-void text-ink antialiased">
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
