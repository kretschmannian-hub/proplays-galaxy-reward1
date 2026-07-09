import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security";

interface RedemptionEmbedData {
  siteUsername: string;
  robloxUsername: string;
  robloxDisplayName: string;
  avatarUrl?: string | null;
  code: string;
  rewardSummary: string;
}

async function getWebhookUrl(): Promise<string | null> {
  // Admin-configured webhook (stored encrypted) takes priority over the
  // env var default, so it can be rotated live without a redeploy.
  const setting = await prisma.setting.findUnique({ where: { key: "discord_webhook_url" } });
  if (setting?.value) {
    try {
      return decryptSecret(setting.value);
    } catch {
      // fall through to env fallback if decryption fails (e.g. key rotated)
    }
  }
  return process.env.DISCORD_WEBHOOK_URL || null;
}

/**
 * Sends a formatted embed to the configured Discord webhook when a code is
 * redeemed. Deliberately never includes the user's IP address.
 */
export async function sendRedemptionWebhook(data: RedemptionEmbedData) {
  const webhookUrl = await getWebhookUrl();
  if (!webhookUrl) return;

  const now = new Date();

  const embed = {
    title: "🌌 Code Redeemed",
    color: 0x6c5ce7,
    thumbnail: data.avatarUrl ? { url: data.avatarUrl } : undefined,
    fields: [
      { name: "Player", value: `${data.robloxDisplayName} (@${data.robloxUsername})`, inline: true },
      { name: "Site account", value: data.siteUsername, inline: true },
      { name: "Code", value: `\`${data.code}\``, inline: true },
      { name: "Reward", value: data.rewardSummary, inline: false },
      { name: "Date", value: now.toLocaleDateString("en-US"), inline: true },
      { name: "Time", value: now.toLocaleTimeString("en-US"), inline: true },
    ],
    footer: { text: "Proplays Galaxy Rewards" },
    timestamp: now.toISOString(),
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (err) {
    console.error("Discord webhook failed to send", err);
  }
}
