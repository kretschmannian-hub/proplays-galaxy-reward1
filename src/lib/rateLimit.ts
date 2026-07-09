import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// In-memory fallback: fine for local dev, NOT reliable in a multi-instance
// serverless deployment (each instance has its own memory). Set up Upstash
// before going to production — see .env.example.
const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }
  entry.count += 1;
  const success = entry.count <= limit;
  return { success, remaining: Math.max(0, limit - entry.count) };
}

const limiters = {
  redeem: hasUpstash
    ? new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(5, "1 m"), prefix: "rl:redeem" })
    : null,
  login: hasUpstash
    ? new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(8, "1 m"), prefix: "rl:login" })
    : null,
  register: hasUpstash
    ? new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(5, "10 m"), prefix: "rl:register" })
    : null,
  admin: hasUpstash
    ? new Ratelimit({ redis: redis!, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl:admin" })
    : null,
};

type Bucket = keyof typeof limiters;

const fallbackConfig: Record<Bucket, { limit: number; windowMs: number }> = {
  redeem: { limit: 5, windowMs: 60_000 },
  login: { limit: 8, windowMs: 60_000 },
  register: { limit: 5, windowMs: 600_000 },
  admin: { limit: 30, windowMs: 60_000 },
};

/** Returns true if the request is allowed, false if it should be rejected (429). */
export async function checkRateLimit(bucket: Bucket, identifier: string): Promise<boolean> {
  const limiter = limiters[bucket];
  if (limiter) {
    const { success } = await limiter.limit(identifier);
    return success;
  }
  const { limit, windowMs } = fallbackConfig[bucket];
  const { success } = memoryLimit(`${bucket}:${identifier}`, limit, windowMs);
  return success;
}

/** Extracts a best-effort client identifier from the request for rate limiting. */
export function getClientIdentifier(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip") ?? "unknown";
  return ip;
}
