import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySessionByToken, SESSION_COOKIE } from "@/lib/session";
import { isSameOrigin } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const token = cookies().get(SESSION_COOKIE)?.value;
  try {
    if (token) await destroySessionByToken(token);
  } catch (err) {
    // Even if the DB delete fails, still clear the cookie below so the
    // browser stops sending a session that might be invalid anyway.
    console.error("Failed to destroy session in DB", err);
  }
  cookies().delete(SESSION_COOKIE);

  return NextResponse.json({ success: true });
}
