/**
 * Verifies a Cloudflare Turnstile token server-side. Returns true if
 * Turnstile isn't configured at all (so local/dev environments without a
 * Cloudflare account still work) — but once TURNSTILE_SECRET_KEY is set,
 * verification becomes mandatory and a missing/invalid token is rejected.
 */
export async function verifyTurnstile(token: string | undefined, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured — skip (see .env.example)
  if (!token) return false;

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error("Turnstile verification failed", err);
    return false;
  }
}
