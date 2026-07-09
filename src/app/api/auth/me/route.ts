import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user });
  } catch (err) {
    // This runs on every page load via AuthProvider — fail soft (treat as
    // logged out) rather than breaking the whole app shell.
    console.error("Failed to resolve session", err);
    return NextResponse.json({ user: null });
  }
}
