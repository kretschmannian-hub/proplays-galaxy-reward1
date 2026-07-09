import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/lib/session";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimit";
import { isSameOrigin } from "@/lib/security";
import { verifyTurnstile } from "@/lib/turnstile";
import { lookupRobloxUsername } from "@/lib/robloxLookup";

// Never statically pre-render or cache this route.
export const dynamic = "force-dynamic";

/** A friendly message for the (rare, but real) case where the deployed
 * database schema doesn't match what Prisma expects — e.g. right after
 * changing prisma/schema.prisma without re-running `npx prisma db push`
 * against the production database. Without this, the person just sees a
 * generic "network error" with zero clue why. */
function schemaMismatchMessage(err: unknown): string | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2021: table doesn't exist. P2022: column doesn't exist.
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
  const allowed = await checkRateLimit("register", ip);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  // Honeypot: a field real users never see or fill in (hidden via CSS in
  // the form), but many simple bots fill in every field they find. If it's
  // non-empty, treat it exactly like a failed human-verification check —
  // same error, so a bot can't distinguish this from Turnstile rejecting it.
  if (data.honeypot) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
  }

  const humanVerified = await verifyTurnstile(data.turnstileToken, ip);
  if (!humanVerified) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
  }

  // The single admin identity is reserved: registering with this Roblox
  // username requires a secret that's never stored in the codebase or
  // shown in the UI, only ever configured as an env var and shared
  // directly with the site owner. This stops anyone else from typing the
  // admin's Roblox username into the signup form and getting admin access.
  const adminRobloxUsername = process.env.ADMIN_ROBLOX_USERNAME;
  const isClaimingAdminIdentity =
    !!adminRobloxUsername && adminRobloxUsername.toLowerCase() === data.robloxUsername.toLowerCase();
  if (isClaimingAdminIdentity) {
    const expectedSecret = process.env.ADMIN_CLAIM_SECRET;
    if (!expectedSecret || data.adminSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "That Roblox username is reserved and requires an admin code to register." },
        { status: 403 }
      );
    }
  }

  try {
    // Confirm the Roblox username is real before creating an account for
    // it. Roblox's public API occasionally rate-limits server-to-server
    // calls, so this retries once before giving up — a transient failure
    // here would otherwise block every signup.
    let lookup = await lookupRobloxUsername(data.robloxUsername);
    if (!lookup.found) {
      lookup = await lookupRobloxUsername(data.robloxUsername);
    }
    if (!lookup.found) {
      return NextResponse.json(
        {
          error:
            "We couldn't find that Roblox username. Double-check the spelling — it needs to be a real, existing Roblox account.",
        },
        { status: 400 }
      );
    }

    const [existingUsername, existingRoblox] = await Promise.all([
      prisma.user.findUnique({ where: { username: data.username } }),
      prisma.user.findUnique({ where: { robloxUsername: data.robloxUsername } }),
    ]);
    if (existingUsername) {
      return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
    }
    if (existingRoblox) {
      return NextResponse.json(
        { error: "An account already exists for that Roblox username." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash,
        robloxUsername: data.robloxUsername,
        robloxUserId: lookup.userId,
        robloxDisplayName: lookup.displayName ?? data.robloxUsername,
        robloxAvatarUrl: lookup.avatarUrl,
        robloxVerified: true,
      },
    });

    const token = await createSession(user.id, req.headers.get("user-agent"));
    cookies().set(SESSION_COOKIE, token, sessionCookieOptions());

    return NextResponse.json({
      success: true,
      robloxVerified: true,
      user: {
        id: user.id,
        username: user.username,
        robloxUsername: user.robloxUsername,
        robloxDisplayName: user.robloxDisplayName,
        robloxAvatarUrl: user.robloxAvatarUrl,
      },
    });
  } catch (err) {
    console.error("Registration failed", err);
    const schemaMessage = schemaMismatchMessage(err);
    return NextResponse.json(
      { error: schemaMessage ?? "Something went wrong while creating your account. Please try again shortly." },
      { status: 500 }
    );
  }
}
