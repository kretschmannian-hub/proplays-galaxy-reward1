"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GlowCard } from "@/components/GlowCard";
import { MagneticButton } from "@/components/MagneticButton";
import { celebrate } from "@/components/celebrate";

type Tab = "overview" | "codes" | "users" | "events" | "settings";

const tabs: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "codes", label: "Codes" },
  { id: "users", label: "Users" },
  { id: "events", label: "Events & Draws" },
  { id: "settings", label: "Settings" },
];

export function AdminClient({ adminName }: { adminName: string }) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Admin control room</h1>
          <p className="mt-1 text-sm text-muted">Signed in as {adminName}. Everything here is logged.</p>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2 border-b border-white/[0.06] pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-nova-gradient text-white shadow-glow" : "text-muted hover:bg-white/5 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "codes" && <CodesTab />}
      {tab === "users" && <UsersTab />}
      {tab === "events" && <EventsTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

async function api(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

// ─────────────────────────── Overview ───────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState<null | Record<string, number>>(null);

  useEffect(() => {
    api("/api/admin/stats").then(setStats).catch(() => setStats(null));
  }, []);

  const cards = [
    { key: "registeredUsers", label: "Registered users", gradient: "text-gradient" },
    { key: "codesRedeemed", label: "Codes redeemed", gradient: "gold-gradient-text" },
    { key: "activeEvents", label: "Active events", gradient: "text-gradient" },
    { key: "newUsersToday", label: "New users (24h)", gradient: "gold-gradient-text" },
    { key: "onlineUsers", label: "Online now", gradient: "text-gradient" },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c, i) => (
        <motion.div
          key={c.key}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <GlowCard className="p-6">
            <p className="text-sm text-muted">{c.label}</p>
            <p className={`mt-2 font-display font-mono text-3xl font-semibold ${c.gradient}`}>
              {stats ? stats[c.key]?.toLocaleString() : "—"}
            </p>
          </GlowCard>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────── Codes ───────────────────────────
interface CodeRow {
  id: string;
  code: string;
  label: string | null;
  rewardType: string;
  rewardAmount: number;
  maxRedemptions: number | null;
  timesRedeemed: number;
  perUserLimit: number;
  isActive: boolean;
  expiresAt: string | null;
}

function CodesTab() {
  const [codes, setCodes] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    code: "",
    autoGenerate: false,
    label: "",
    rewardType: "GIVEAWAY_TICKET",
    rewardAmount: 1,
    maxRedemptions: "",
    perUserLimit: 1,
    expiresAt: "",
  });
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api("/api/admin/codes")
      .then((d) => setCodes(d.codes))
      .catch(() => setError("Failed to load codes"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/admin/codes", {
        method: "POST",
        body: JSON.stringify({
          code: form.autoGenerate ? "PLACEHOLDER" : form.code,
          autoGenerate: form.autoGenerate,
          label: form.label || undefined,
          rewardType: form.rewardType,
          rewardAmount: Number(form.rewardAmount),
          maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
          perUserLimit: Number(form.perUserLimit),
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        }),
      });
      celebrate();
      setForm({ ...form, code: "", label: "" });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function toggleActive(c: CodeRow) {
    await api(`/api/admin/codes/${c.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !c.isActive }) });
    load();
  }

  async function remove(c: CodeRow) {
    if (!confirm(`Delete code ${c.code}? This can't be undone.`)) return;
    await api(`/api/admin/codes/${c.id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <GlowCard className="h-fit p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Create a code</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={form.autoGenerate}
              onChange={(e) => setForm({ ...form, autoGenerate: e.target.checked })}
            />
            Auto-generate code
          </label>
          {!form.autoGenerate && (
            <input
              placeholder="CODE-VALUE"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-sm uppercase"
            />
          )}
          <input
            placeholder="Label (optional, e.g. 'March giveaway')"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
          />
          <select
            value={form.rewardType}
            onChange={(e) => setForm({ ...form, rewardType: e.target.value })}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
          >
            <option value="GIVEAWAY_TICKET">Giveaway ticket</option>
            <option value="POINTS">Points</option>
            <option value="XP">XP</option>
            <option value="COINS">Coins</option>
            <option value="ROLE">Role</option>
            <option value="BADGE">Badge</option>
            <option value="EVENT_ACCESS">Event access</option>
          </select>
          <input
            type="number"
            placeholder="Reward amount"
            value={form.rewardAmount}
            onChange={(e) => setForm({ ...form, rewardAmount: Number(e.target.value) })}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="Max redemptions"
              value={form.maxRedemptions}
              onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
            />
            <input
              type="number"
              placeholder="Per-user limit"
              value={form.perUserLimit}
              onChange={(e) => setForm({ ...form, perUserLimit: Number(e.target.value) })}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
            />
          </div>
          <label className="text-xs text-muted">Expires at (optional)</label>
          <input
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <MagneticButton type="submit" className="mt-2 w-full justify-center py-3 text-sm">
            Create code
          </MagneticButton>
        </form>
      </GlowCard>

      <GlowCard className="p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">All codes</h2>
        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : codes.length === 0 ? (
          <p className="text-sm text-muted">No codes yet — create your first one.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 pr-4">Reward</th>
                  <th className="pb-3 pr-4">Uses</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {codes.map((c) => (
                  <tr key={c.id}>
                    <td className="py-3 pr-4 font-mono">{c.code}</td>
                    <td className="py-3 pr-4 text-muted">
                      {c.rewardAmount} {c.rewardType.replace("_", " ").toLowerCase()}
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {c.timesRedeemed}/{c.maxRedemptions ?? "∞"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs ${
                          c.isActive ? "bg-success/15 text-success" : "bg-white/5 text-muted"
                        }`}
                      >
                        {c.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="flex gap-2 py-3">
                      <button onClick={() => toggleActive(c)} className="text-xs text-cyan-300 hover:underline">
                        {c.isActive ? "Disable" : "Enable"}
                      </button>
                      <button onClick={() => remove(c)} className="text-xs text-danger hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlowCard>
    </div>
  );
}

// ─────────────────────────── Users ───────────────────────────
interface UserRow {
  id: string;
  username: string;
  robloxUsername: string;
  robloxDisplayName: string | null;
  robloxAvatarUrl: string | null;
  robloxVerified: boolean;
  points: number;
  giveawayTickets: number;
  isBanned: boolean;
}

function UsersTab() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  function load(q = "") {
    setLoading(true);
    api(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((d) => setUsers(d.users))
      .finally(() => setLoading(false));
  }

  useEffect(() => load(), []);

  async function toggleBan(u: UserRow) {
    const reason = u.isBanned ? undefined : prompt("Reason for suspension (optional):") ?? undefined;
    await api(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isBanned: !u.isBanned, bannedReason: reason }),
    });
    load(query);
  }

  return (
    <GlowCard className="p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(query);
        }}
        className="mb-5 flex gap-3"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by site username or Roblox username…"
          className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
        />
        <MagneticButton type="submit" className="px-5 py-2.5 text-sm">
          Search
        </MagneticButton>
      </form>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <div className="divide-y divide-white/[0.06]">
          {users.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div>
                <p className="text-sm font-medium">
                  {u.username}{" "}
                  <span className="text-muted">
                    · Roblox: @{u.robloxUsername} {u.robloxVerified ? "✓" : "(unverified)"}
                  </span>
                </p>
                <p className="font-mono text-xs text-muted">
                  {u.giveawayTickets} tickets · {u.points} pts
                </p>
              </div>
              <div className="flex items-center gap-3">
                {u.isBanned && <span className="rounded-full bg-danger/15 px-2.5 py-1 text-xs text-danger">Suspended</span>}
                <button onClick={() => toggleBan(u)} className="text-xs text-cyan-300 hover:underline">
                  {u.isBanned ? "Unban" : "Suspend"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlowCard>
  );
}

// ─────────────────────────── Events & draws ───────────────────────────
interface EventRow {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  _count: { entries: number };
}

function EventsTab() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [form, setForm] = useState({ name: "", description: "", startsAt: "", endsAt: "" });
  const [drawEventId, setDrawEventId] = useState("");
  const [winnerCount, setWinnerCount] = useState(1);
  const [winners, setWinners] = useState<{ username: string; displayName: string }[] | null>(null);
  const [error, setError] = useState("");

  function load() {
    api("/api/admin/events").then((d) => setEvents(d.events));
  }
  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/admin/events", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        }),
      });
      setForm({ name: "", description: "", startsAt: "", endsAt: "" });
      load();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDraw(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setWinners(null);
    try {
      const data = await api("/api/admin/draw", {
        method: "POST",
        body: JSON.stringify({ eventId: drawEventId, winnerCount }),
      });
      setWinners(data.winners);
      celebrate();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GlowCard className="p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Create an event</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <input
            placeholder="Event name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted">Starts</label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted">Ends (optional)</label>
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <MagneticButton type="submit" className="mt-2 justify-center py-3 text-sm">
            Create event
          </MagneticButton>
        </form>

        <div className="mt-6 divide-y divide-white/[0.06] border-t border-white/[0.06] pt-4">
          {events.map((ev) => (
            <div key={ev.id} className="flex items-center justify-between py-2.5 text-sm">
              <span>{ev.name}</span>
              <span className="text-xs text-muted">{ev._count.entries} entries</span>
            </div>
          ))}
        </div>
      </GlowCard>

      <GlowCard className="p-6">
        <h2 className="mb-4 font-display text-lg font-semibold">Draw winners</h2>
        <p className="mb-4 text-sm text-muted">
          Winners are drawn with a cryptographically secure random weighted by giveaway ticket
          count — more tickets, better odds, never a guarantee.
        </p>
        <form onSubmit={handleDraw} className="flex flex-col gap-3">
          <select
            value={drawEventId}
            onChange={(e) => setDrawEventId(e.target.value)}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
          >
            <option value="">Select an event…</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev._count.entries} entries)
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={winnerCount}
            onChange={(e) => setWinnerCount(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <MagneticButton variant="gold" type="submit" className="justify-center py-3 text-sm" disabled={!drawEventId}>
            Draw winners
          </MagneticButton>
        </form>

        {winners && (
          <div className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
            <p className="text-sm font-medium text-gold-400">🎉 Winners</p>
            {winners.map((w) => (
              <p key={w.username} className="text-sm">
                {w.displayName} <span className="text-muted">@{w.username}</span>
              </p>
            ))}
          </div>
        )}
      </GlowCard>
    </div>
  );
}

// ─────────────────────────── Settings ───────────────────────────
function SettingsTab() {
  const [webhook, setWebhook] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [banner, setBanner] = useState("");
  const [configured, setConfigured] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api("/api/admin/settings").then((d) => {
      setMaintenanceMode(d.maintenanceMode);
      setBanner(d.siteBanner ?? "");
      setConfigured(d.discordWebhookConfigured);
    });
  }, []);

  async function save() {
    setSaved(false);
    await api("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({
        discordWebhookUrl: webhook || undefined,
        maintenanceMode,
        siteBanner: banner,
      }),
    });
    setSaved(true);
    setWebhook("");
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <GlowCard className="max-w-xl p-6">
      <h2 className="mb-1 font-display text-lg font-semibold">Platform settings</h2>
      <p className="mb-5 text-sm text-muted">Changes apply instantly, no redeploy needed.</p>

      <label className="mb-1 block text-sm font-medium">Discord webhook URL</label>
      <p className="mb-2 text-xs text-muted">
        {configured ? "A webhook is currently configured." : "No webhook configured yet."} Stored
        encrypted — leave blank to keep the current one.
      </p>
      <input
        value={webhook}
        onChange={(e) => setWebhook(e.target.value)}
        placeholder="https://discord.com/api/webhooks/…"
        className="mb-5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
      />

      <label className="mb-2 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={maintenanceMode} onChange={(e) => setMaintenanceMode(e.target.checked)} />
        Maintenance mode
      </label>

      <label className="mb-1 mt-4 block text-sm font-medium">Site banner</label>
      <input
        value={banner}
        onChange={(e) => setBanner(e.target.value)}
        placeholder="e.g. Double tickets weekend — this Friday to Sunday!"
        className="mb-5 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 text-sm"
      />

      <MagneticButton onClick={save} className="w-full justify-center py-3 text-sm">
        Save settings
      </MagneticButton>
      {saved && <p className="mt-3 text-sm text-success">Saved.</p>}
    </GlowCard>
  );
}
