import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redeemCodeSchema } from "@/lib/validation";
import { checkRateLimit, getClientIdentifier } from "@/lib/rateLimit";
import { isSameOrigin } from "@/lib/security";
import { sendRedemptionWebhook } from "@/lib/discord";
import { verifyTurnstile } from "@/lib/turnstile";

// Never statically pre-render or cache this route: it talks to the
// database, and DATABASE_URL is a runtime-only secret, not a build-time
// one. Without this, `next build` can try to execute this handler while
// collecting page data and fail because there's no DB connection yet.
export const dynamic = "force-dynamic";


function rewardSummary(type: string, amount: number, roleId?: string | null, badgeId?: string | null) {
  switch (type) {
    case "GIVEAWAY_TICKET":
      return `${amount} Giveaway Ticket${amount === 1 ? "" : "s"}`;
    case "POINTS":
      return `${amount} Points`;
    case "XP":
      return `${amount} XP`;
    case "COINS":
      return `${amount} Coins`;
    case "ROLE":
      return `Role unlocked${roleId ? ` (${roleId})` : ""}`;
    case "BADGE":
      return `Badge unlocked${badgeId ? ` (${badgeId})` : ""}`;
    case "EVENT_ACCESS":
      return "Event access granted";
    default:
      return "Reward granted";
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "You must be signed in to redeem a code." }, { status: 401 });
  }
  if (user.isBanned) {
    return NextResponse.json({ error: "This account has been suspended." }, { status: 403 });
  }

  // Rate limit per-user (not just per-IP) to stop one account hammering codes.
  const allowed = await checkRateLimit("redeem", user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a moment before trying again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = redeemCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please enter a valid code." }, { status: 400 });
  }

  const codeInput = parsed.data.code.toUpperCase();

  const humanVerified = await verifyTurnstile(parsed.data.turnstileToken, getClientIdentifier(req));
  if (!humanVerified) {
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const code = await tx.code.findUnique({ where: { code: codeInput } });

      if (!code || !code.isActive) {
        throw new UserFacingError("This code doesn't exist or is no longer active.");
      }
      const now = new Date();
      if (code.startsAt && now < code.startsAt) {
        throw new UserFacingError("This code isn't active yet.");
      }
      if (code.expiresAt && now > code.expiresAt) {
        throw new UserFacingError("This code has expired.");
      }
      if (code.maxRedemptions !== null && code.timesRedeemed >= code.maxRedemptions) {
        throw new UserFacingError("This code has reached its redemption limit.");
      }

      const priorRedemptions = await tx.redemption.count({
        where: { userId: user.id, codeId: code.id },
      });
      if (priorRedemptions >= code.perUserLimit) {
        throw new UserFacingError("You've already redeemed this code.");
      }

      await tx.redemption.create({ data: { userId: user.id, codeId: code.id } });
      await tx.code.update({ where: { id: code.id }, data: { timesRedeemed: { increment: 1 } } });

      const userUpdateData: Record<string, unknown> = {};
      if (code.rewardType === "GIVEAWAY_TICKET") {
        userUpdateData.giveawayTickets = { increment: code.rewardAmount };
      } else if (code.rewardType === "POINTS" || code.rewardType === "XP" || code.rewardType === "COINS") {
        userUpdateData.points = { increment: code.rewardAmount };
      }
      // ROLE / BADGE / EVENT_ACCESS rewards are tracked via the Redemption
      // record itself; wire up Roblox group/badge APIs here as needed.

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });

      return { code, updatedUser };
    });

    const summary = rewardSummary(
      result.code.rewardType,
      result.code.rewardAmount,
      result.code.rewardRoleId,
      result.code.rewardBadgeId
    );

    // Fire-and-forget: don't block the response on Discord being slow/down.
    sendRedemptionWebhook({
      siteUsername: user.username,
      robloxUsername: user.robloxUsername,
      robloxDisplayName: user.robloxDisplayName ?? user.robloxUsername,
      avatarUrl: user.robloxAvatarUrl,
      code: result.code.code,
      rewardSummary: summary,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      reward: summary,
      giveawayTickets: result.updatedUser.giveawayTickets,
      points: result.updatedUser.points,
    });
  } catch (err) {
    if (err instanceof UserFacingError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Redemption failed", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")) {
      return NextResponse.json(
        { error: "The database schema is out of date. Run `npx prisma db push` against your production DATABASE_URL." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

class UserFacingError extends Error {}
