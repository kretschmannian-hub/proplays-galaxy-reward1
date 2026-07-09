import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Never statically pre-render or cache this route.
export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated configuration health check. Reports booleans
 * only ("is this set?"), never actual values — safe to expose, and exists
 * so you can diagnose a broken deployment without needing a working login
 * to reach the admin panel first.
 */
export async function GET() {
  let databaseReachable = false;
  let databaseError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseReachable = true;
  } catch (err) {
    databaseError = err instanceof Error ? err.message.split("\n")[0] : "Unknown error";
  }

  // Distinct from the check above: the DB can be perfectly reachable while
  // still running the *old* table structure (e.g. right after a schema
  // change without re-running `npx prisma db push`). This is the single
  // most common cause of "registration/login gives a 500 error."
  let schemaReady = false;
  let schemaError: string | null = null;
  if (databaseReachable) {
    try {
      await prisma.user.count();
      schemaReady = true;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")) {
        schemaError = "Database schema is out of date — run `npx prisma db push`.";
      } else {
        schemaError = err instanceof Error ? err.message.split("\n")[0] : "Unknown error";
      }
    }
  }

  return NextResponse.json({
    database: {
      urlConfigured: !!process.env.DATABASE_URL,
      reachable: databaseReachable,
      error: databaseError,
      schemaReady,
      schemaError,
    },
    admin: {
      robloxUsernameConfigured: !!process.env.ADMIN_ROBLOX_USERNAME,
      claimSecretConfigured: !!process.env.ADMIN_CLAIM_SECRET,
    },
    optional: {
      settingsEncryptionKeyConfigured: !!process.env.SETTINGS_ENCRYPTION_KEY,
      discordWebhookConfigured: !!process.env.DISCORD_WEBHOOK_URL,
      upstashConfigured: !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN,
      turnstileConfigured: !!process.env.TURNSTILE_SECRET_KEY,
    },
  });
}
