import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/sessionCookieName";

export { SESSION_COOKIE };

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Creates a new session for a user and returns the raw token to set as a
 * cookie. Only the SHA-256 hash of the token is stored in the database —
 * if the database were ever read by someone else, they couldn't reconstruct
 * usable session cookies from it.
 */
export async function createSession(userId: string, userAgent?: string | null): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      userAgent: userAgent?.slice(0, 300),
    },
  });
  return token;
}

export async function destroySessionByToken(token: string): Promise<void> {
  await prisma.session
    .delete({ where: { tokenHash: hashToken(token) } })
    .catch(() => {
      /* already gone — fine */
    });
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

export interface SessionUser {
  id: string;
  username: string;
  robloxUsername: string;
  robloxDisplayName: string | null;
  robloxAvatarUrl: string | null;
  robloxVerified: boolean;
  points: number;
  giveawayTickets: number;
  isBanned: boolean;
  isAdmin: boolean;
}

/** Reads the session cookie (via next/headers, server-side only) and
 * resolves the current user, or null if there's no valid session. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.isBanned) return null;

  const adminRobloxUsername = process.env.ADMIN_ROBLOX_USERNAME;
  const isAdmin =
    !!adminRobloxUsername && adminRobloxUsername.toLowerCase() === session.user.robloxUsername.toLowerCase();

  return {
    id: session.user.id,
    username: session.user.username,
    robloxUsername: session.user.robloxUsername,
    robloxDisplayName: session.user.robloxDisplayName,
    robloxAvatarUrl: session.user.robloxAvatarUrl,
    robloxVerified: session.user.robloxVerified,
    points: session.user.points,
    giveawayTickets: session.user.giveawayTickets,
    isBanned: session.user.isBanned,
    isAdmin,
  };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  };
}
