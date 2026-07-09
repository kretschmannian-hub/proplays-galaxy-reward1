import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminGuard";

// Never statically pre-render or cache this route: it talks to the
// database, and DATABASE_URL is a runtime-only secret, not a build-time
// one. Without this, `next build` can try to execute this handler while
// collecting page data and fail because there's no DB connection yet.
export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fifteenMinAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const [registeredUsers, codesRedeemed, activeEvents, newUsersToday, onlineUsers] = await Promise.all([
    prisma.user.count(),
    prisma.redemption.count(),
    prisma.eventModel.count({ where: { isActive: true, endsAt: { gte: now } } }),
    prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.user.count({ where: { lastSeenAt: { gte: fifteenMinAgo } } }),
  ]);

  return NextResponse.json({
    registeredUsers,
    codesRedeemed,
    activeEvents,
    newUsersToday,
    onlineUsers,
  });
}
