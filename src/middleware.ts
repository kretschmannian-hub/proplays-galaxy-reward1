import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/sessionCookieName";

/**
 * Lightweight gate: redirects obviously-unauthenticated visitors away from
 * /dashboard and /admin before any page code runs. This is a fast-path
 * optimization only — it checks for the *presence* of a session cookie,
 * not its validity or admin status. The authoritative checks (valid
 * session, banned flag, admin status) are always re-verified server-side
 * in the page itself via getSessionUser(). Never trust this middleware
 * alone for authorization.
 */
export function middleware(req: NextRequest) {
  const sessionCookie = req.cookies.get(SESSION_COOKIE);

  if (!sessionCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
