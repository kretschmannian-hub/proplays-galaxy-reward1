import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminGuard";
import { createEventSchema } from "@/lib/validation";

// Never statically pre-render or cache this route: it talks to the
// database, and DATABASE_URL is a runtime-only secret, not a build-time
// one. Without this, `next build` can try to execute this handler while
// collecting page data and fail because there's no DB connection yet.
export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;

  const events = await prisma.eventModel.findMany({
    orderBy: { startsAt: "desc" },
    include: { _count: { select: { entries: true } } },
    take: 100,
  });
  return NextResponse.json({ events });
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

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  const event = await prisma.eventModel.create({
    data: {
      name: data.name,
      description: data.description,
      startsAt: new Date(data.startsAt),
      endsAt: data.endsAt ? new Date(data.endsAt) : null,
    },
  });

  await logAdminAction(user.username, "event.create", event.name, data);

  return NextResponse.json({ event });
}
