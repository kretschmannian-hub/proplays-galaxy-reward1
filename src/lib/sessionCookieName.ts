// Kept in its own zero-dependency module so middleware.ts (which runs on
// the Edge runtime) can import just the cookie name without pulling in
// session.ts's Prisma import — Prisma Client isn't Edge-compatible, and
// bundling it into middleware would break the build/runtime.
export const SESSION_COOKIE = "galaxy_session";
