import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, logAdminAction } from "@/lib/adminGuard";
import { updateSettingsSchema } from "@/lib/validation";
import { encryptSecret } from "@/lib/security";

// Never statically pre-render or cache this route: it talks to the
// database, and DATABASE_URL is a runtime-only secret, not a build-time
// one. Without this, `next build` can try to execute this handler while
// collecting page data and fail because there's no DB connection yet.
export const dynamic = "force-dynamic";


export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;

  const settings = await prisma.setting.findMany({
    where: { key: { in: ["maintenance_mode", "site_banner"] } },
  });
  const map = Object.fromEntries(settings.map((s: { key: string; value: string }) => [s.key, s.value]));

  // The webhook URL itself is never sent back to the client once set —
  // only whether one is configured — to avoid exposing the secret in
  // network responses/devtools.
  const webhookSetting = await prisma.setting.findUnique({ where: { key: "discord_webhook_url" } });

  return NextResponse.json({
    maintenanceMode: map.maintenance_mode === "true",
    siteBanner: map.site_banner ?? "",
    discordWebhookConfigured: !!webhookSetting,
  });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin(req);
  if ("response" in guard) return guard.response;
  const { user } = guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }
  const data = parsed.data;

  const ops = [];
  if (data.discordWebhookUrl !== undefined) {
    if (data.discordWebhookUrl === "") {
      ops.push(prisma.setting.deleteMany({ where: { key: "discord_webhook_url" } }));
    } else {
      ops.push(
        prisma.setting.upsert({
          where: { key: "discord_webhook_url" },
          create: { key: "discord_webhook_url", value: encryptSecret(data.discordWebhookUrl) },
          update: { value: encryptSecret(data.discordWebhookUrl) },
        })
      );
    }
  }
  if (data.maintenanceMode !== undefined) {
    ops.push(
      prisma.setting.upsert({
        where: { key: "maintenance_mode" },
        create: { key: "maintenance_mode", value: String(data.maintenanceMode) },
        update: { value: String(data.maintenanceMode) },
      })
    );
  }
  if (data.siteBanner !== undefined) {
    ops.push(
      prisma.setting.upsert({
        where: { key: "site_banner" },
        create: { key: "site_banner", value: data.siteBanner },
        update: { value: data.siteBanner },
      })
    );
  }

  await prisma.$transaction(ops);
  await logAdminAction(user.username, "settings.update", undefined, {
    ...data,
    discordWebhookUrl: data.discordWebhookUrl ? "[redacted]" : data.discordWebhookUrl,
  });

  return NextResponse.json({ success: true });
}
