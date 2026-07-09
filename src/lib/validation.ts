import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(/^[A-Za-z0-9_]+$/, "Only letters, numbers, and underscores are allowed"),
  password: z
    .string()
    .min(8, "At least 8 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Must contain at least one letter")
    .regex(/[0-9]/, "Must contain at least one number"),
  robloxUsername: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[A-Za-z0-9_]+$/, "That doesn't look like a valid Roblox username"),
  // Only required when robloxUsername matches ADMIN_ROBLOX_USERNAME — see
  // the register route. Never displayed as a normal field; the one person
  // who needs it is told about it directly, out of band.
  adminSecret: z.string().max(200).optional(),
  turnstileToken: z.string().min(1).optional(),
  // Honeypot: a hidden field real users never see or fill in. Simple bots
  // that blindly fill every input often fill it in, giving a free bot
  // signal with zero cost to real users.
  honeypot: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(24),
  password: z.string().min(1).max(200),
  turnstileToken: z.string().min(1).optional(),
  honeypot: z.string().max(200).optional(),
});

export const redeemCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/, "Codes may only contain letters, numbers, and dashes"),
  turnstileToken: z.string().min(1, "Verification required").optional(),
});

export const createCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[A-Za-z0-9-]+$/),
  label: z.string().max(120).optional(),
  rewardType: z.enum(["GIVEAWAY_TICKET", "POINTS", "XP", "COINS", "ROLE", "BADGE", "EVENT_ACCESS"]),
  rewardAmount: z.number().int().min(0).max(1_000_000).default(0),
  rewardRoleId: z.string().max(64).optional(),
  rewardBadgeId: z.string().max(64).optional(),
  maxRedemptions: z.number().int().positive().nullable().optional(),
  perUserLimit: z.number().int().min(1).max(1000).default(1),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const updateCodeSchema = createCodeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const banUserSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().max(300).optional(),
});

export const createEventSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().max(500).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
});

export const drawWinnerSchema = z.object({
  eventId: z.string().min(1),
  winnerCount: z.number().int().min(1).max(50).default(1),
});

export const updateSettingsSchema = z.object({
  discordWebhookUrl: z.string().url().optional().or(z.literal("")),
  maintenanceMode: z.boolean().optional(),
  siteBanner: z.string().max(300).optional(),
});
