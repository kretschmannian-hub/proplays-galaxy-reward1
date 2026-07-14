import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminGuard";

// Never statically pre-render or cache this route: it talks to the
// database, and DATABASE_URL is a runtime-only secret, not a build-time
// one. Without this, `next build` can try to execute this handler while
// collecting page data and fail because there's no DB connection yet.
export const dynamic = "force-dynamic";


const patchSchema = z.object({
  isBanned: z.boolean().optional(),
  bannedReason: z.string().max(300).optional(),
  grantPoints: z.number().int().min(-1_000_000).max(1_000_000).optional(),
  grantTickets: z.number().int().min(-1_000_000).max(1_000_000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;
  const { user: adminUser } = guard;

  // Prevent the admin from accidentally banning themselves.
  if (params.id === adminUser.id) {
    return NextResponse.json({ error: "You can't modify your own account here." }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const updatedUser = await prisma.user.update({
    where: { id: params.id },
    data: {
      isBanned: data.isBanned,
      bannedReason: data.isBanned === false ? null : data.bannedReason,
      points: data.grantPoints !== undefined ? { increment: data.grantPoints } : undefined,
      giveawayTickets: data.grantTickets !== undefined ? { increment: data.grantTickets } : undefined,
    },
  });

  // If we're banning, kill all of their active sessions immediately.
  if (data.isBanned === true) {
    await prisma.session.deleteMany({ where: { userId: params.id } });
  }

  await logAdminAction(adminUser.username, "user.update", target.username, data);

  return NextResponse.json({ user: updatedUser });
}
