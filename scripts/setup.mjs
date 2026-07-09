// Creates a .env file from .env.example if one doesn't exist yet.
//
// Why this exists: creating a file literally named ".env" through Windows
// Explorer is famously annoying (it often refuses to save a filename that
// starts with a dot, or silently saves it as ".env.txt" with hidden
// extensions). Running `npm run setup` does it with Node's filesystem API
// instead, which has no such restriction, so this always works the same
// way on Windows, macOS, and Linux.
import { existsSync, copyFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

console.log("");

if (existsSync(envPath)) {
  console.log("✓ .env already exists — leaving it alone.");
} else {
  copyFileSync(examplePath, envPath);
  console.log("✓ Created .env from .env.example.");
}

console.log(`
Next steps:
  1. Open the .env file in this folder with any text editor (Notepad is fine).
  2. Set DATABASE_URL to your real Neon/Supabase connection string.
  3. Set ADMIN_ROBLOX_USERNAME and ADMIN_CLAIM_SECRET (see the README).
  4. Then run:  npx prisma db push
`);
