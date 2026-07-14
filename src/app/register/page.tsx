"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Starfield } from "@/components/Starfield";
import { GlowCard } from "@/components/GlowCard";
import { MagneticButton } from "@/components/MagneticButton";
import { useAuth } from "@/components/AuthProvider";
import { useTurnstile } from "@/components/useTurnstile";
import { useLocale } from "@/i18n/LocaleProvider";
import { postJson } from "@/lib/fetchJson";

export default function RegisterPage() {
  const { t } = useLocale();
  const { refresh } = useAuth();
  const router = useRouter();
  const turnstile = useTurnstile();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [robloxUsername, setRobloxUsername] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real users never see this field
  const [showAdminField, setShowAdminField] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (turnstile.enabled && !turnstile.token) {
      setError("Please complete the verification check.");
      return;
    }

    setLoading(true);
    const result = await postJson("/api/auth/register", {
      username,
      password,
      robloxUsername,
      adminSecret: adminSecret || undefined,
      turnstileToken: turnstile.token ?? undefined,
      honeypot: website || undefined,
    });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await refresh();
    router.push("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void px-6 py-20">
      <Starfield density={100} />
      <div className="relative w-full max-w-sm">
        <GlowCard className="p-8">
          <h1 className="mb-1 font-display text-2xl font-semibold">{t("auth.registerTitle")}</h1>
          <p className="mb-6 text-sm text-muted">{t("auth.registerSub")}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Honeypot field: visually hidden, off-screen, and skipped by
                tab order — invisible to real users, but simple bots that
                blindly fill every input on the page will fill this in. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.username")}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                minLength={3}
                maxLength={24}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
              />
              <p className="mt-1 text-xs text-muted">{t("auth.passwordHint")}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.robloxUsername")}</label>
              <input
                value={robloxUsername}
                onChange={(e) => setRobloxUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
              />
              <p className="mt-1 text-xs text-muted">{t("auth.robloxUsernameHint")}</p>
            </div>

            {turnstile.enabled && <div ref={turnstile.ref} />}

            {error && <p className="text-sm text-danger">{error}</p>}

            <MagneticButton type="submit" disabled={loading} className="mt-1 w-full justify-center py-3 text-sm">
              {loading ? t("auth.loading") : t("auth.submitRegister")}
            </MagneticButton>

            {!showAdminField ? (
              <button
                type="button"
                onClick={() => setShowAdminField(true)}
                className="text-center text-xs text-muted/70 hover:text-muted"
              >
                Have an admin code?
              </button>
            ) : (
              <input
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
                placeholder="Admin code"
                type="password"
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
              />
            )}
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            <Link href="/login" className="text-cyan-300 hover:underline">
              {t("auth.switchToLogin")}
            </Link>
          </p>
        </GlowCard>
      </div>
    </main>
  );
}
