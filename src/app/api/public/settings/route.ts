import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Never statically pre-render or cache this route: it talks to the
// database, and DATABASE_URL is a runtime-only secret, not a build-time
// one. Without this, `next build` can try to execute this handler while
// collecting page data and fail because there's no DB connection yet.
export const dynamic = "force-dynamic";


// Public, unauthenticated, read-only. Never expose secrets here — only the
// two settings the landing page needs to render a banner / maintenance gate.
export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["maintenance_mode", "site_banner"] } },
    });
    const map = Object.fromEntries(settings.map((s: { key: string; value: string }) => [s.key, s.value]));

    return NextResponse.json({
      maintenanceMode: map.maintenance_mode === "true",
      siteBanner: map.site_banner ?? "",
    });
  } catch (err) {
    // This endpoint only feeds a cosmetic banner/maintenance check on the
    // homepage — if the DB is briefly unreachable, fail soft instead of
    // breaking the whole landing page for every visitor.
    console.error("Failed to load public settings", err);
    return NextResponse.json({ maintenanceMode: false, siteBanner: "" });
  }
}
