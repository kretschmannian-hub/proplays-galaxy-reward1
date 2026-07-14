"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/i18n/LocaleProvider";
import { MagneticButton } from "./MagneticButton";

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const { locale, setLocale, t } = useLocale();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-void/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-nova-gradient text-sm shadow-glow">
            ✦
          </span>
          Proplays <span className="text-gradient">Galaxy</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted md:flex">
          <Link href="/#rewards" className="transition-colors hover:text-ink">
            {t("nav.rewards")}
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-ink">
            {t("nav.howItWorks")}
          </Link>
          {user?.isAdmin && (
            <Link href="/admin" className="transition-colors hover:text-ink">
              {t("nav.admin")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
            <button
              onClick={() => setLocale("de")}
              className={`px-2.5 py-1.5 transition-colors ${locale === "de" ? "bg-white/10 text-ink" : "text-muted hover:text-ink"}`}
              aria-pressed={locale === "de"}
            >
              DE
            </button>
            <button
              onClick={() => setLocale("en")}
              className={`px-2.5 py-1.5 transition-colors ${locale === "en" ? "bg-white/10 text-ink" : "text-muted hover:text-ink"}`}
              aria-pressed={locale === "en"}
            >
              EN
            </button>
          </div>

          {loading ? (
            <div className="h-11 w-32 animate-pulse rounded-2xl bg-white/5" />
          ) : user ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-2xl glass px-3 py-2 transition-colors hover:bg-white/[0.08]"
            >
              {user.robloxAvatarUrl && (
                <Image
                  src={user.robloxAvatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full ring-2 ring-nova-500/50"
                />
              )}
              <span className="hidden text-sm font-medium sm:inline">{user.username}</span>
            </Link>
          ) : (
            <Link href="/login">
              <MagneticButton className="px-5 py-2.5 text-sm">{t("nav.login")}</MagneticButton>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function SignOutButton() {
  const { logout } = useAuth();
  const { t } = useLocale();
  return (
    <button onClick={logout} className="text-sm text-muted transition-colors hover:text-danger">
      {t("nav.logout")}
    </button>
  );
}
