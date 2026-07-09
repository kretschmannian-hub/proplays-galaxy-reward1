"use client";

import { useEffect, useState } from "react";
import { Starfield } from "@/components/Starfield";

interface StatusData {
  database: { urlConfigured: boolean; reachable: boolean; error: string | null; schemaReady: boolean; schemaError: string | null };
  admin: { robloxUsernameConfigured: boolean; claimSecretConfigured: boolean };
  optional: {
    settingsEncryptionKeyConfigured: boolean;
    discordWebhookConfigured: boolean;
    upstashConfigured: boolean;
    turnstileConfigured: boolean;
  };
}

function Row({ ok, label, hint }: { ok: boolean | null; label: string; hint?: string }) {
  const icon = ok === null ? "•" : ok ? "✓" : "✕";
  const color = ok === null ? "text-muted" : ok ? "text-success" : "text-danger";
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className={`mt-0.5 font-mono text-sm ${color}`}>{icon}</span>
      <div>
        <p className="text-sm">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/system/status")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const requiredOk =
    data &&
    data.database.urlConfigured &&
    data.database.reachable &&
    data.database.schemaReady &&
    data.admin.robloxUsernameConfigured;

  return (
    <main className="relative min-h-screen overflow-hidden bg-void px-6 py-20">
      <Starfield density={90} />
      <div className="relative mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold">Deployment status</h1>
        <p className="mt-2 text-sm text-muted">
          A boolean-only health check for this deployment — never shows secret values, safe to
          share. Useful when something seems to silently do nothing.
        </p>

        {error && <p className="mt-8 text-sm text-danger">Couldn&apos;t reach the status endpoint.</p>}

        {data && (
          <>
            <div className="mt-8 rounded-2xl glass p-5">
              <p className={`font-display text-lg font-semibold ${requiredOk ? "text-success" : "text-danger"}`}>
                {requiredOk ? "All required configuration looks good" : "Some required configuration is missing"}
              </p>
            </div>

            <div className="mt-8 rounded-2xl glass p-6">
              <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-muted">
                Database
              </h2>
              <Row ok={data.database.urlConfigured} label="DATABASE_URL is set" />
              <Row
                ok={data.database.reachable}
                label="Database is reachable"
                hint={data.database.error ?? undefined}
              />
              {data.database.reachable && (
                <Row
                  ok={data.database.schemaReady}
                  label="Database schema is up to date"
                  hint={
                    data.database.schemaReady
                      ? undefined
                      : (data.database.schemaError ??
                        "Run `npx prisma db push` against your production DATABASE_URL, then reload this page.")
                  }
                />
              )}
            </div>

            <div className="mt-6 rounded-2xl glass p-6">
              <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-muted">Admin</h2>
              <Row ok={data.admin.robloxUsernameConfigured} label="ADMIN_ROBLOX_USERNAME is set" />
              <Row
                ok={data.admin.claimSecretConfigured}
                label="ADMIN_CLAIM_SECRET is set"
                hint="Required to register the reserved admin account — see the README."
              />
            </div>

            <div className="mt-6 rounded-2xl glass p-6">
              <h2 className="mb-2 font-display text-sm font-semibold uppercase tracking-wide text-muted">
                Optional
              </h2>
              <Row ok={data.optional.settingsEncryptionKeyConfigured} label="SETTINGS_ENCRYPTION_KEY is set" />
              <Row ok={data.optional.discordWebhookConfigured} label="Discord webhook is set" />
              <Row ok={data.optional.upstashConfigured} label="Upstash Redis rate limiting is set" />
              <Row ok={data.optional.turnstileConfigured} label="Cloudflare Turnstile is set" />
            </div>

            <p className="mt-8 text-xs text-muted">
              See the README&rsquo;s deployment guide for where to get each of these values.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
