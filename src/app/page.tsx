"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Starfield } from "@/components/Starfield";
import { MagneticButton } from "@/components/MagneticButton";
import { GlowCard } from "@/components/GlowCard";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/i18n/LocaleProvider";

const rewardKeys = ["ticket", "points", "roles", "access"] as const;
const rewardIcons: Record<(typeof rewardKeys)[number], string> = {
  ticket: "🎟️",
  points: "⭐",
  roles: "🛡️",
  access: "🎫",
};

const stepKeys = ["step1", "step2", "step3"] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const rewardTypeKeyMap: Record<string, string> = {
  GIVEAWAY_TICKET: "ticket",
  POINTS: "points",
  XP: "points",
  COINS: "points",
  ROLE: "roles",
  BADGE: "roles",
  EVENT_ACCESS: "access",
};

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

interface ActivityItem {
  displayName: string;
  avatarUrl: string | null;
  rewardType: string;
  rewardAmount: number;
  redeemedAt: string;
}

export default function LandingPage() {
  const { user } = useAuth();
  const { t } = useLocale();
  const [site, setSite] = useState({ maintenanceMode: false, siteBanner: "" });
  const [activity, setActivity] = useState<{
    registeredUsers: number;
    codesRedeemed: number;
    recent: ActivityItem[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => r.json())
      .then(setSite)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    function load() {
      fetch("/api/public/activity")
        .then((r) => r.json())
        .then((d) => !cancelled && setActivity(d))
        .catch(() => {});
    }
    load();
    const interval = setInterval(load, 25_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (site.maintenanceMode && !user?.isAdmin) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void px-6 text-center">
        <Starfield density={120} />
        <div className="relative">
          <p className="mb-4 text-4xl">🛠️</p>
          <h1 className="font-display text-3xl font-semibold">{t("maintenance.title")}</h1>
          <p className="mt-3 max-w-sm text-muted">{t("maintenance.desc")}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void">
      <Navbar />
      {site.siteBanner && (
        <div className="border-b border-white/[0.06] bg-nova-500/10 px-6 py-2.5 text-center text-sm text-cyan-300">
          {site.siteBanner}
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden bg-grid">
        <Starfield density={160} />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-nova-500/20 blur-[140px]" />

        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pb-28 pt-24 text-center sm:pt-32">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-cyan-300"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            {activity ? (
              <>
                <AnimatedCounter value={activity.codesRedeemed} /> {t("hero.badgeSuffix")}
              </>
            ) : (
              t("hero.badgeFallback")
            )}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl"
          >
            {t("hero.title1")}
            <br />
            <span className="text-gradient">{t("hero.title2")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-6 max-w-xl text-lg text-muted"
          >
            {t("hero.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            {user ? (
              <Link href="/dashboard">
                <MagneticButton variant="primary">{t("hero.ctaDashboard")}</MagneticButton>
              </Link>
            ) : (
              <Link href="/register">
                <MagneticButton variant="primary">{t("nav.register")}</MagneticButton>
              </Link>
            )}
            <a href="#how-it-works">
              <MagneticButton variant="ghost">{t("hero.ctaHowItWorks")}</MagneticButton>
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-6 text-xs text-muted"
          >
            {t("hero.secureNote")}
          </motion.p>
        </div>
      </section>

      {/* Live community strip */}
      {activity && activity.registeredUsers > 0 && (
        <section className="border-y border-white/[0.06] bg-surface/30 py-14">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 md:grid-cols-[auto_1fr] md:items-center">
            <div className="flex gap-10 text-center md:text-left">
              <div>
                <p className="font-display font-mono text-3xl font-semibold text-gradient">
                  <AnimatedCounter value={activity.registeredUsers} />
                </p>
                <p className="mt-1 text-xs text-muted">{t("community.playersConnected")}</p>
              </div>
              <div>
                <p className="font-display font-mono text-3xl font-semibold gold-gradient-text">
                  <AnimatedCounter value={activity.codesRedeemed} />
                </p>
                <p className="mt-1 text-xs text-muted">{t("community.codesRedeemed")}</p>
              </div>
            </div>

            {activity.recent.length > 0 && (
              <div className="overflow-hidden">
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                  {t("community.justHappened")}
                </p>
                <div className="flex flex-col gap-2">
                  {activity.recent.slice(0, 3).map((item, i) => {
                    const key = rewardTypeKeyMap[item.rewardType] ?? "points";
                    return (
                      <motion.div
                        key={`${item.displayName}-${item.redeemedAt}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        {item.avatarUrl && (
                          <Image src={item.avatarUrl} alt="" width={22} height={22} className="rounded-full" />
                        )}
                        <span className="font-medium">{item.displayName}</span>
                        <span className="text-muted">
                          {t("community.redeemedFor")} {t(`rewards.${key}.title`).toLowerCase()}
                        </span>
                        <span className="text-xs text-muted/70">· {timeAgo(item.redeemedAt)}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Rewards */}
      <section id="rewards" className="relative mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="mb-14 max-w-2xl"
        >
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t("rewards.heading")}</h2>
          <p className="mt-3 text-muted">{t("rewards.sub")}</p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {rewardKeys.map((key, i) => (
            <motion.div
              key={key}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <GlowCard className="h-full p-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-xl">
                  {rewardIcons[key]}
                </div>
                <h3 className="font-display text-lg font-semibold">{t(`rewards.${key}.title`)}</h3>
                <p className="mt-2 text-sm text-muted">{t(`rewards.${key}.desc`)}</p>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="relative border-t border-white/[0.06] bg-surface/40 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            transition={{ duration: 0.6 }}
            className="mb-14 text-center font-display text-3xl font-semibold sm:text-4xl"
          >
            {t("steps.heading")}
          </motion.h2>

          <div className="relative grid gap-8 md:grid-cols-3">
            <div className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block" />
            {stepKeys.map((key, i) => (
              <motion.div
                key={key}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                variants={fadeUp}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-nova-gradient font-display text-lg font-semibold shadow-glow">
                  {i + 1}
                </div>
                <h3 className="font-display text-lg font-semibold">{t(`steps.${key}.title`)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(`steps.${key}.desc`)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* A note from the team — human touch */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
        >
          <GlowCard className="p-8 sm:p-10">
            <p className="mb-4 text-3xl leading-none text-nova-400">&ldquo;</p>
            <p className="text-lg leading-relaxed text-ink/90">{t("note.quote")}</p>
            <p className="mt-5 text-sm text-muted">{t("note.signature")}</p>
          </GlowCard>
        </motion.div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-28 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-2xl px-6"
        >
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">{t("finalCta.heading")}</h2>
          <p className="mt-3 text-muted">{t("finalCta.sub")}</p>
          <div className="mt-8 flex justify-center">
            {user ? (
              <Link href="/dashboard">
                <MagneticButton variant="gold">{t("finalCta.ctaOpen")}</MagneticButton>
              </Link>
            ) : (
              <Link href="/register">
                <MagneticButton variant="gold">{t("nav.register")}</MagneticButton>
              </Link>
            )}
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/[0.06] py-10 text-center text-xs text-muted">
        {t("footer.disclaimer")}
      </footer>
    </main>
  );
}
