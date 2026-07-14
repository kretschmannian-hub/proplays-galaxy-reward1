// Runs automatically after `npm install` finishes, purely to point
// whoever just installed this project at the next step. Never fails or
// blocks anything (Netlify also runs `npm install` during its build — this
// just prints a line in the build log there and does nothing else).
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envExists = existsSync(join(__dirname, "..", ".env"));

if (!envExists) {
  console.log(`
────────────────────────────────────────────────────────
  Next step: npm run setup
  (creates your local .env file — see QUICKSTART.md)
────────────────────────────────────────────────────────
`);
}
