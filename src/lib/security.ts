import crypto from "crypto";
import { NextRequest } from "next/server";

const ALGO = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY is missing or too short. Generate one with: openssl rand -hex 32"
    );
  }
  // Accept either a 32-byte hex string or any long passphrase, always
  // normalized to a 32-byte key via SHA-256.
  return crypto.createHash("sha256").update(raw).digest();
}

/** Encrypts a string for storage at rest (e.g. Discord webhook URL). */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Malformed encrypted payload");
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * Same-origin check used as CSRF protection for state-changing API routes.
 * Auth.js's own endpoints already carry CSRF tokens; this covers our
 * custom /api/redeem and /api/admin/* routes. Combined with SameSite=Lax
 * session cookies (set by Auth.js), this blocks cross-site form/fetch
 * submissions.
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}

export function isAdminUsername(username: string | null | undefined): boolean {
  const adminUsername = process.env.ADMIN_ROBLOX_USERNAME;
  if (!adminUsername || !username) return false;
  return username.toLowerCase() === adminUsername.toLowerCase();
}
