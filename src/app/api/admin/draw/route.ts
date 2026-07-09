import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminGuard";
import { drawWinnerSchema } from "@/lib/validation";

// Never statically pre-render or cache this route: it talks to the
// database, and DATABASE_URL is a runtime-only secret, not a build-time
// one. Without this, `next build` can try to execute this handler while
// collecting page data and fail because there's no DB connection yet.
export const dynamic = "force-dynamic";


/** Cryptographically-random float in [0, 1) — avoids Math.random() for a
 *  process that determines real prize winners. */
function secureRandom(): number {
  return crypto.randomInt(0, 2 ** 32) / 2 ** 32;
}

interface WeightedEntry {
  entryId: string;
  weight: number;
  user: {
    id: string;
    username: string;
    robloxDisplayName: string | null;
    robloxAvatarUrl: string | null;
    giveawayTickets: number;
  };
}

/** Weighted random sample without replacement, weighted by ticket count. */
function weightedSample<T extends { weight: number }>(items: T[], count: number): T[] {
  const pool = [...items];
  const winners: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) break;
    let r = secureRandom() * totalWeight;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= pool[idx].weight;
      if (r <= 0) break;
    }
    winners.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return winners;
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;
  const { user } = guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = drawWinnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const { eventId, winnerCount } = parsed.data;

  const entries = await prisma.eventEntry.findMany({
    where: { eventId, wonPrize: false },
    include: {
      user: { select: { id: true, username: true, robloxDisplayName: true, robloxAvatarUrl: true, giveawayTickets: true } },
    },
  });

  if (entries.length === 0) {
    return NextResponse.json({ error: "No eligible entries for this event." }, { status: 400 });
  }

  const weighted: WeightedEntry[] = entries.map((e: (typeof entries)[number]) => ({
    entryId: e.id,
    weight: Math.max(1, e.user.giveawayTickets),
    user: e.user,
  }));

  const winners = weightedSample<WeightedEntry>(weighted, winnerCount);

  await prisma.$transaction(
    winners.map((w) => prisma.eventEntry.update({ where: { id: w.entryId }, data: { wonPrize: true } }))
  );

  await logAdminAction(
    user.username,
    "event.draw",
    eventId,
    winners.map((w) => w.user.username)
  );

  return NextResponse.json({
    winners: winners.map((w) => ({
      username: w.user.username,
      displayName: w.user.robloxDisplayName,
      avatarUrl: w.user.robloxAvatarUrl,
    })),
  });
}
