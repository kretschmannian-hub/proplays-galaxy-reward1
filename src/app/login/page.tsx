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

export default function LoginPage() {
  const { t } = useLocale();
  const { refresh } = useAuth();
  const router = useRouter();
  const turnstile = useTurnstile();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real users never see this field
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
    const result = await postJson("/api/auth/login", {
      username,
      password,
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
          <h1 className="mb-1 font-display text-2xl font-semibold">{t("auth.loginTitle")}</h1>
          <p className="mb-6 text-sm text-muted">{t("auth.loginSub")}</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t("auth.password")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
              />
            </div>

            {turnstile.enabled && <div ref={turnstile.ref} />}

            {error && <p className="text-sm text-danger">{error}</p>}

            <MagneticButton type="submit" disabled={loading} className="mt-1 w-full justify-center py-3 text-sm">
              {loading ? t("auth.loading") : t("auth.submitLogin")}
            </MagneticButton>
          </form>

          <p className="mt-5 text-center text-sm text-muted">
            <Link href="/register" className="text-cyan-300 hover:underline">
              {t("auth.switchToRegister")}
            </Link>
          </p>
        </GlowCard>
      </div>
    </main>
  );
}
