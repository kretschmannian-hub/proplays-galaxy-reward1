import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { DashboardClient } from "./DashboardClient";

// This page reads the signed-in user's session and live DB data on every
// request — it must never be statically pre-rendered at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  // Re-fetch fresh from the DB for anything the lightweight session lookup
  // doesn't already carry (redemption history).
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      redemptions: {
        orderBy: { redeemedAt: "desc" },
        take: 10,
        include: { code: true },
      },
    },
  });

  if (!user) redirect("/login");
  if (user.isBanned) redirect("/?banned=1");

  return (
    <main className="min-h-screen bg-void">
      <Navbar />
      <DashboardClient
        user={{
          username: user.username,
          robloxUsername: user.robloxUsername,
          robloxDisplayName: user.robloxDisplayName,
          robloxAvatarUrl: user.robloxAvatarUrl,
          robloxVerified: user.robloxVerified,
          points: user.points,
          giveawayTickets: user.giveawayTickets,
        }}
        redemptions={user.redemptions.map((r: (typeof user.redemptions)[number]) => ({
          id: r.id,
          codeLabel: r.code.label ?? r.code.code,
          rewardType: r.code.rewardType,
          rewardAmount: r.code.rewardAmount,
          redeemedAt: r.redeemedAt.toISOString(),
        }))}
      />
    </main>
  );
}
