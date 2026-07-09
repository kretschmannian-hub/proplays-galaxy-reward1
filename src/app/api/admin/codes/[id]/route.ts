import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminGuard";
import { updateCodeSchema } from "@/lib/validation";

// Never statically pre-render or cache this route: it talks to the
// database, and DATABASE_URL is a runtime-only secret, not a build-time
// one. Without this, `next build` can try to execute this handler while
// collecting page data and fail because there's no DB connection yet.
export const dynamic = "force-dynamic";


export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;
  const { user } = guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const parsed = updateCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.code.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Code not found." }, { status: 404 });

  const code = await prisma.code.update({
    where: { id: params.id },
    data: {
      label: data.label,
      rewardType: data.rewardType,
      rewardAmount: data.rewardAmount,
      rewardRoleId: data.rewardRoleId,
      rewardBadgeId: data.rewardBadgeId,
      maxRedemptions: data.maxRedemptions,
      perUserLimit: data.perUserLimit,
      startsAt: data.startsAt ? new Date(data.startsAt) : data.startsAt === null ? null : undefined,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : data.expiresAt === null ? null : undefined,
      isActive: data.isActive,
    },
  });

  await logAdminAction(user.username, "code.update", code.code, data);
  return NextResponse.json({ code });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;
  const { user } = guard;

  const existing = await prisma.code.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Code not found." }, { status: 404 });

  await prisma.code.delete({ where: { id: params.id } });
  await logAdminAction(user.username, "code.delete", existing.code);

  return NextResponse.json({ success: true });
}
