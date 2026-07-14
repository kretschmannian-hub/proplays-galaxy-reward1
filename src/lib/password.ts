import bcrypt from "bcryptjs";

// 12 rounds is a reasonable balance of security vs. serverless cold-start
// cost as of 2026 hardware. Raise this over time as hardware gets faster.
const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
