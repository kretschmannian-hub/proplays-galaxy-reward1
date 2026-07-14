import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/session";
import { isSameOrigin } from "@/lib/security";
import { checkRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";

/**
 * Verifies the request is same-origin, rate-limited, authenticated, and
 * belongs to the single configured admin (by Roblox username, from
 * ADMIN_ROBLOX_USERNAME). Returns either { user } on success or a
 * NextResponse to return immediately on failure.
 */
export async function requireAdmin(
  req: NextRequest
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  if (!isSameOrigin(req)) {
    return { response: NextResponse.json({ error: "Invalid request origin." }, { status: 403 }) };
  }

  const user = await getSessionUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  if (!user.isAdmin) {
    return { response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }

  const allowed = await checkRateLimit("admin", user.id);
  if (!allowed) {
    return { response: NextResponse.json({ error: "Slow down." }, { status: 429 }) };
  }

  return { user };
}

export async function logAdminAction(actorId: string, action: string, target?: string, meta?: unknown) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      target,
      meta: meta ? JSON.stringify(meta) : undefined,
    },
  });
}
