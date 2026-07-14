"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { GlowCard } from "@/components/GlowCard";
import { MagneticButton } from "@/components/MagneticButton";
import { SignOutButton } from "@/components/Navbar";
import { celebrate } from "@/components/celebrate";
import { useTurnstile } from "@/components/useTurnstile";
import { useLocale } from "@/i18n/LocaleProvider";
import { postJson } from "@/lib/fetchJson";

interface DashboardUser {
  username: string;
  robloxUsername: string;
  robloxDisplayName: string | null;
  robloxAvatarUrl: string | null;
  robloxVerified: boolean;
  points: number;
  giveawayTickets: number;
}

interface RedemptionRow {
  id: string;
  codeLabel: string;
  rewardType: string;
  rewardAmount: number;
  redeemedAt: string;
}

export function DashboardClient({
  user,
  redemptions: initialRedemptions,
}: {
  user: DashboardUser;
  redemptions: RedemptionRow[];
}) {
  const { t } = useLocale();
  const turnstile = useTurnstile();
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState({ points: user.points, giveawayTickets: user.giveawayTickets });
  const [redemptions, setRedemptions] = useState(initialRedemptions);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    if (turnstile.enabled && !turnstile.token) {
      setStatus("error");
      setMessage("Please complete the verification check.");
      return;
    }
    setStatus("loading");
    setMessage("");

    const result = await postJson<{ reward: string; points: number; giveawayTickets: number }>("/api/redeem", {
      code: code.trim(),
      turnstileToken: turnstile.token ?? undefined,
    });

    if (!result.ok) {
      setStatus("error");
      setMessage(result.error);
      return;
    }

    setStatus("success");
    setMessage(`You received: ${result.data.reward}`);
    setStats({ points: result.data.points, giveawayTickets: result.data.giveawayTickets });
    setRedemptions((prev) => [
      {
        id: crypto.randomUUID(),
        codeLabel: code.trim().toUpperCase(),
        rewardType: "",
        rewardAmount: 0,
        redeemedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    celebrate();
    setCode("");
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      {/* Profile header */}
      <div className="mb-10 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          {user.robloxAvatarUrl && (
            <Image
              src={user.robloxAvatarUrl}
              alt=""
              width={72}
              height={72}
              className="rounded-2xl ring-2 ring-nova-500/50"
            />
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold">{user.username}</h1>
            <p className="text-sm text-muted">Roblox: @{user.robloxUsername}</p>
            <p className={`mt-1 flex items-center gap-1.5 text-xs ${user.robloxVerified ? "text-success" : "text-gold-400"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${user.robloxVerified ? "bg-success" : "bg-gold-400"}`} />
              {user.robloxVerified ? t("dashboard.robloxVerified") : t("dashboard.robloxUnverified")}
            </p>
          </div>
        </div>
        <SignOutButton />
      </div>

      {/* Stat cards */}
      <div className="mb-10 grid gap-5 sm:grid-cols-2">
        <GlowCard className="p-6">
          <p className="text-sm text-muted">{t("dashboard.tickets")}</p>
          <p className="mt-2 font-display font-mono text-4xl font-semibold gold-gradient-text">
            {stats.giveawayTickets.toLocaleString()}
          </p>
        </GlowCard>
        <GlowCard className="p-6">
          <p className="text-sm text-muted">{t("dashboard.points")}</p>
          <p className="mt-2 font-display font-mono text-4xl font-semibold text-gradient">
            {stats.points.toLocaleString()}
          </p>
        </GlowCard>
      </div>

      {/* Redeem form */}
      <GlowCard className="mb-10 p-8">
        <h2 className="mb-1 font-display text-xl font-semibold">{t("dashboard.redeemTitle")}</h2>
        <p className="mb-5 text-sm text-muted">{t("dashboard.redeemSub")}</p>
        <form onSubmit={handleRedeem} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("dashboard.redeemPlaceholder")}
            maxLength={64}
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3.5 font-mono text-sm uppercase tracking-wider placeholder:text-muted/50 focus:border-nova-500/60"
          />
          <MagneticButton type="submit" disabled={status === "loading"} className="shrink-0">
            {status === "loading" ? t("dashboard.redeemLoading") : t("dashboard.redeemButton")}
          </MagneticButton>
        </form>

        {turnstile.enabled && <div ref={turnstile.ref} className="mt-4" />}

        <AnimatePresence mode="wait">
          {message && (
            <motion.p
              key={message}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-4 text-sm ${status === "success" ? "text-success" : "text-danger"}`}
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </GlowCard>

      {/* History */}
      <GlowCard className="p-8">
        <h2 className="mb-5 font-display text-xl font-semibold">{t("dashboard.historyTitle")}</h2>
        {redemptions.length === 0 ? (
          <p className="text-sm text-muted">{t("dashboard.historyEmpty")}</p>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-3.5 text-sm">
                <span className="font-mono text-ink/90">{r.codeLabel}</span>
                <span className="text-muted">{new Date(r.redeemedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </GlowCard>
    </div>
  );
}
