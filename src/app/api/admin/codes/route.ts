import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminGuard";
import { createCodeSchema } from "@/lib/validation";
import crypto from "crypto";

// Never statically pre-render or cache this route: it talks to the
// database, and DATABASE_URL is a runtime-only secret, not a build-time
// one. Without this, `next build` can try to execute this handler while
// collecting page data and fail because there's no DB connection yet.
export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;

  const codes = await prisma.code.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ codes });
}

function generateCode(): string {
  return crypto.randomBytes(6).toString("hex").toUpperCase().slice(0, 10);
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

  if (body.autoGenerate) {
    body.code = generateCode();
  }

  const parsed = createCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const data = parsed.data;

  const existing = await prisma.code.findUnique({ where: { code: data.code.toUpperCase() } });
  if (existing) {
    return NextResponse.json({ error: "A code with this value already exists." }, { status: 409 });
  }

  const code = await prisma.code.create({
    data: {
      code: data.code.toUpperCase(),
      label: data.label,
      rewardType: data.rewardType,
      rewardAmount: data.rewardAmount,
      rewardRoleId: data.rewardRoleId,
      rewardBadgeId: data.rewardBadgeId,
      maxRedemptions: data.maxRedemptions ?? null,
      perUserLimit: data.perUserLimit,
      startsAt: data.startsAt ? new Date(data.startsAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdBy: user.username,
    },
  });

  await logAdminAction(user.username, "code.create", code.code, data);

  return NextResponse.json({ code });
}
