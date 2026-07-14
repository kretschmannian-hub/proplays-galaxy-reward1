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

  const q = req.nextUrl.searchParams.get("q")?.trim();

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { robloxUsername: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      username: true,
      robloxUsername: true,
      robloxDisplayName: true,
      robloxAvatarUrl: true,
      robloxVerified: true,
      points: true,
      giveawayTickets: true,
      isBanned: true,
      bannedReason: true,
      createdAt: true,
      lastSeenAt: true,
    },
  });

  return NextResponse.json({ users });
}
