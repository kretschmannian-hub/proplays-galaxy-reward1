import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimit";
import { isSameOrigin, isAdminUsername } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";

// Never statically pre-render or cache this route.
export const dynamic = "force-dynamic";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000; // 10 minutes

function schemaMismatchMessage(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2021" || err.code === "P2022") {
      return "The database schema is out of date. Run `npx prisma db push` against your production DATABASE_URL, then try again.";
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const ip = getClientIdentifier(req);
  const allowed = await checkRateLimit("login", ip);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Please wait a moment." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a username and password." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.honeypot) {
    return NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });
  }

  const humanVerified = await verifyTurnstile(data.turnstileToken, ip);
  if (!humanVerified) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { username: data.username } });

    // Deliberately identical error for "no such user" and "wrong password" —
    // distinguishing them lets an attacker enumerate valid usernames.
    const genericError = NextResponse.json({ error: "Incorrect username or password." }, { status: 401 });

    if (!user) return genericError;

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Too many failed attempts. Please try again in ${minutesLeft} minute(s).` },
        { status: 429 }
      );
    }

    if (user.isBanned) {
      return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });
    }

    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) {
      const attempts = user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: attempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : undefined,
        },
      });
      return genericError;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastSeenAt: new Date() },
    });

    const token = await createSession(user.id, req.headers.get("user-agent"));
    cookies().set(SESSION_COOKIE, token, sessionCookieOptions());

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        robloxUsername: user.robloxUsername,
        robloxDisplayName: user.robloxDisplayName,
        robloxAvatarUrl: user.robloxAvatarUrl,
        isAdmin: isAdminUsername(user.robloxUsername),
      },
    });
  } catch (err) {
    console.error("Login failed", err);
    const schemaMessage = schemaMismatchMessage(err);
    return NextResponse.json(
      { error: schemaMessage ?? "Something went wrong while signing you in. Please try again shortly." },
      { status: 500 }
    );
  }
}
