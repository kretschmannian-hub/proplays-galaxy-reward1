import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Never statically pre-render or cache this route — see the comment in
// src/app/api/public/settings/route.ts for why.
export const dynamic = "force-dynamic";

/**
 * Public snapshot of recent redemptions for the landing page's live
 * activity feed. Deliberately shows only the site username (the account
 * the person actually created and controls) rather than the self-reported
 * Roblox display name — since that Roblox identity isn't verified via
 * login, broadcasting it publicly could amplify an impersonation attempt.
 */
export async function GET() {
  try {
    const [recent, registeredUsers, codesRedeemed] = await Promise.all([
      prisma.redemption.findMany({
        orderBy: { redeemedAt: "desc" },
        take: 8,
        include: {
          user: { select: { username: true, robloxAvatarUrl: true } },
          code: { select: { rewardType: true, rewardAmount: true } },
        },
      }),
      prisma.user.count(),
      prisma.redemption.count(),
    ]);

    return NextResponse.json({
      registeredUsers,
      codesRedeemed,
      recent: recent.map((r: (typeof recent)[number]) => ({
        displayName: r.user.username,
        avatarUrl: r.user.robloxAvatarUrl,
        rewardType: r.code.rewardType,
        rewardAmount: r.code.rewardAmount,
        redeemedAt: r.redeemedAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("Failed to load public activity", err);
    return NextResponse.json({ registeredUsers: 0, codesRedeemed: 0, recent: [] });
  }
}
