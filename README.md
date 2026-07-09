# Proplays Galaxy Rewards

A code-redemption and giveaway platform for a Roblox community, built with
Next.js 14 and deployable to Netlify. Players create their own account on
this site (own username, own password — never their Roblox password) and
also enter their Roblox username so the platform knows who to credit.
Codes redeem for giveaway tickets / points / roles, and a single admin
account manages codes, users, events, and prize draws.

The site is bilingual (German by default, English as a toggle) and
protected by Cloudflare Turnstile, rate limiting, and brute-force lockout
on login.

> **In a hurry / first time setting this up?** Skip straight to
> `QUICKSTART.md` — it's just the exact commands in order, no
> explanations. Come back here for the "why" behind each step, or when
> something needs customizing.

---

## 1. Tech stack, and why

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 14** (App Router) | One project for both the UI and the API routes (Netlify Functions under the hood), via `@netlify/plugin-nextjs`. |
| Styling | **Tailwind CSS** + **Framer Motion** | Utility CSS for a consistent design system; Framer Motion for the reveal/hover/parallax animation work. |
| Auth | **Custom username/password**, hand-rolled (no third-party auth library) | Deliberate choice: registering a Roblox OAuth app requires ID verification, which isn't available to every site owner. Instead, players create a normal account here; their Roblox username is a required, separate field (see Section 4 for what that does and doesn't guarantee). |
| Password hashing | **bcryptjs** (12 rounds) | Battle-tested, pure-JS (no native binary to compile on Netlify's build image). |
| Sessions | Random 256-bit token, **SHA-256 hash stored in Postgres**, raw token only in an httpOnly cookie | Same "instant revocation" property a proper auth library gives you: banning a user deletes their session rows immediately, deleting all their active logins. |
| Database | **PostgreSQL** via **Prisma ORM** | Netlify Functions are stateless/serverless — you need a real network-reachable database, not SQLite. Prisma also parameterizes every query, which is your SQL-injection protection. |
| Rate limiting | **Upstash Redis** (`@upstash/ratelimit`), with an in-memory fallback for local dev | Serverless functions don't share memory across invocations, so a real limiter needs an external store. |
| Bot protection | **Cloudflare Turnstile** | Shows up automatically on login, register, and code redemption once configured. |
| i18n | Small hand-rolled dictionary + React context, cookie-persisted | German by default per the brief, English as a toggle; no heavyweight i18n framework needed for a site this size. |
| Secrets at rest | **AES-256-GCM** (Node `crypto`) | The Discord webhook URL is encrypted before it's stored in the database. |
| Notifications | **Discord webhooks** | Fired server-side after a successful redemption. |

---

## 2. How accounts and identity work here

This is the part that's different from a typical "Sign in with X" site, so
it's worth being explicit about:

- **Site login is completely separate from Roblox.** A player picks their
  own username and password for this site. That password is never their
  Roblox password, and Roblox never sees it — there's no connection to
  Roblox's login system at all anymore.
- **The Roblox username field is self-reported, but its existence is
  verified.** At signup, the site calls Roblox's public (unauthenticated)
  user-lookup API to confirm the username is a real, existing Roblox
  account — registration is rejected outright if it isn't (with a retry,
  since Roblox's API occasionally rate-limits server-to-server calls
  before succeeding on a second try). **This still does not prove the
  person actually owns that Roblox account** — anyone could type in
  someone else's real, existing Roblox username. A `robloxVerified` flag
  is stored per account for this reason.
- **Practical implication for a rewards platform:** since ownership isn't
  proven, treat giveaway winners as "claims" that may be worth a quick
  manual sanity check (e.g. "does this person show up in your Discord/
  stream chat under that name?") before handing out a real-money-adjacent
  prize. If you want stronger guarantees later, a common lightweight
  upgrade (without needing OAuth or ID verification) is a "put this code
  in your Roblox profile description for 24 hours" verification step —
  not built here, but straightforward to add if you want it.

---

## 3. Admin access

Only one Roblox username can ever be admin — set via `ADMIN_ROBLOX_USERNAME`.
Because that field is self-reported (see above), registering an account
**with that exact Roblox username also requires a secret**:

- `ADMIN_CLAIM_SECRET` is an environment variable you set once, and give
  directly to the one person who should be admin (a message, not a public
  page — it's never shown in the UI or stored in the codebase).
- On the register page, there's a small "Have an admin code?" link that
  reveals one extra field. It only matters if the Roblox username you
  entered matches `ADMIN_ROBLOX_USERNAME` — everyone else can ignore it
  entirely.
- Without the correct secret, registering with the reserved Roblox
  username is rejected outright — this is what stops someone else from
  just typing in the admin's Roblox username and getting admin access.

---

## 4. What's implemented vs. what's scaffolded

**Fully implemented and working:**
- Custom registration/login with bcrypt password hashing, database-backed
  sessions, brute-force lockout (5 failed attempts → 10 minute lockout)
  plus IP-based rate limiting on top
- Roblox username existence check (with one retry) at signup — rejected
  outright if Roblox doesn't recognize the username
- Admin-identity protection via `ADMIN_CLAIM_SECRET` (see Section 3)
- Code creation/edit/disable/delete, auto-generated codes, expiry & start
  dates, per-user and total redemption limits
- Atomic redemption logic (a `$transaction` prevents two people racing a
  code past its `maxRedemptions` limit)
- Weighted, cryptographically-random winner drawing
- Admin panel: stats, codes, user search/ban, events & draws, live settings
- Discord embed notifications, encrypted webhook storage
- German/English language toggle (persisted in a cookie), German by default
- A `/status` page for diagnosing a broken deployment without needing to
  log in first
- CSRF (same-origin checks), rate limiting, input validation (Zod),
  security headers, encrypted secrets, banned-user session revocation,
  Cloudflare Turnstile on login/register/redeem once configured
- A hidden honeypot field on login/register — invisible to real users,
  but catches simple bots that blindly fill every field on a form

**You still need to do before going live:**
- Provision a real Postgres database and push the schema to it
- Set `ADMIN_ROBLOX_USERNAME` and `ADMIN_CLAIM_SECRET`, and register the
  admin account yourself using that code
- Decide what "Role" and "Badge" rewards actually do on the Roblox/Discord
  side — wiring them to Roblox Group APIs or a Discord bot to
  auto-assign a role is environment-specific and left as a clearly-marked
  hook in `src/app/api/redeem/route.ts`
- The i18n dictionary (`src/i18n/translations.ts`) covers the landing
  page, auth forms, and dashboard in both languages; the admin panel and
  `/status` page are English-only to keep scope reasonable — extend the
  dictionary if you want full coverage there too

---

## 5. Deploying to Netlify, step by step

### 5.1 Push the code to GitHub
Netlify deploys from a Git repository. Create a new repo and push this
project to it.

### 5.2 Create a Postgres database
Netlify has no built-in persistent database, so use a hosted one:
- **[Neon](https://neon.tech)** or **[Supabase](https://supabase.com)** both
  have a free tier and give you a `postgresql://...` connection string.

### 5.3 Create the Netlify site
1. In Netlify: **Add new site → Import an existing project** → pick your repo.
2. Build command and publish directory are already set in `netlify.toml`
   (`npm run build`, `.next`) — Netlify auto-installs
   `@netlify/plugin-nextjs` because it's declared there.

### 5.4 Set environment variables
In **Site settings → Environment variables**, add everything from
`.env.example`:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Your Neon/Supabase connection string (step 5.2) |
| `ADMIN_ROBLOX_USERNAME` | The Roblox username of whoever should be admin |
| `ADMIN_CLAIM_SECRET` | Generate locally: `openssl rand -hex 24` — give this directly to the admin, don't publish it |
| `SETTINGS_ENCRYPTION_KEY` | Generate locally: `openssl rand -hex 32` |
| `DISCORD_WEBHOOK_URL` | Step 5.6 (optional at launch — can also be set later from the admin panel) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Step 5.5 (optional but recommended) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Step 5.7 (optional but recommended) |

Never commit any of these to source control — `.env` is already git-ignored.

### 5.5 Set up rate limiting (recommended)
Create a free Redis database at <https://upstash.com>, then copy the REST
URL and token into the env vars above.

### 5.6 Set up the Discord webhook
In your Discord server: **Server Settings → Integrations → Webhooks → New
Webhook**, pick a channel, copy the URL. Paste it into
`DISCORD_WEBHOOK_URL`, or set it later from **Admin → Settings**.

### 5.7 Set up bot protection (strongly recommended)
This is what puts the "I'm not a robot" checkbox on login, register, and
code redemption — it's already fully wired into the code, it just needs
two keys from Cloudflare:

1. Go to <https://dash.cloudflare.com> and sign in (free account is fine —
   you do **not** need to move your domain to Cloudflare for this part).
2. In the left sidebar, click **Turnstile**.
3. Click **Add widget**.
4. Give it a name (e.g. "Galaxy Rewards"), and under **Domains**, add your
   Netlify domain (e.g. `your-site.netlify.app`, and your custom domain
   too if you have one).
5. Widget mode: leave it on **Managed** (Cloudflare decides when to show
   an actual challenge — most visitors see nothing at all).
6. Click **Create**. You'll immediately see a **Site Key** and a **Secret
   Key** — copy both now, the secret key is only shown once.
7. In Netlify, set:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` → the Site Key
   - `TURNSTILE_SECRET_KEY` → the Secret Key
8. Redeploy. The verification checkbox now appears automatically on
   login, register, and redeem — and the server rejects any submission
   without a valid token, so it's enforced, not just decorative.

### 5.7b Cloudflare's network-level protection (optional, needs a custom domain)
Turnstile above only protects your forms. For broader protection against
scrapers, DDoS, and malicious traffic at the network level, you can route
your **custom domain** (not the `.netlify.app` one — Cloudflare needs a
domain it can manage DNS for) through Cloudflare itself:

1. Add your domain to Cloudflare (free plan) and follow its instructions
   to point your domain's nameservers at Cloudflare.
2. Add a DNS record pointing your domain at your Netlify site, and make
   sure the little cloud icon next to it is **orange** ("Proxied") — that's
   what turns on Cloudflare's protection, not just DNS.
3. Under **Security**, Cloudflare's free plan already includes DDoS
   mitigation and a basic "Bot Fight Mode" you can toggle on.

This step is independent of Turnstile above and only makes sense once you
have a custom domain — skip it entirely if you're staying on the free
`.netlify.app` subdomain for now.

### 5.8 Run the database schema
Once `DATABASE_URL` is set, run this once (locally, pointed at your
production database). **Run `npm install` first, every time**, even if
you already did it before — if you skip it, `npx prisma` fetches the
newest Prisma version straight from the internet instead of the one this
project is pinned to (5.x), and the newest one (7.x, as of late 2025) has
breaking changes that will fail with an error mentioning
`prisma.config.ts` or `Prisma CLI Version : 7.x.x`.

You also need a **local** `.env` file with your production `DATABASE_URL`
in it for this one command — Netlify's environment variables (Section
5.4) are separate and don't apply to commands you run on your own
computer. If you haven't made one yet:

```bash
npm install
npm run setup
# now open .env and paste your real DATABASE_URL in
npx prisma db push
```

### 5.9 Deploy
Trigger a deploy (push to your connected branch, or **Deploys → Trigger
deploy** in Netlify). The build runs `prisma generate && next build`.

### 5.10 Confirm it's actually configured
Visit `https://YOUR-SITE.netlify.app/status` to confirm the database is
reachable and the admin variables are set.

### 5.11 Register the admin account
Go to `/register`, fill in a username/password, enter the Roblox username
you set as `ADMIN_ROBLOX_USERNAME`, click "Have an admin code?", and enter
`ADMIN_CLAIM_SECRET`. That account now sees the **Admin** link in the navbar.

### 5.12 Custom domain & HTTPS
In **Domain settings**, add your domain and follow Netlify's DNS
instructions. Netlify issues and renews a free HTTPS certificate
automatically.

---

## 6. Security review summary

- **Passwords are hashed with bcrypt (12 rounds)**, never stored or logged
  in plaintext.
- **Database-backed sessions**: only a SHA-256 hash of the session token
  is stored, so a database leak alone can't be turned into working login
  cookies. A ban immediately deletes the user's session rows.
- **Brute-force protection**: 5 failed logins locks the account for 10
  minutes, on top of IP-based rate limiting on the login endpoint itself.
  Login errors are deliberately identical for "no such user" and "wrong
  password" to prevent username enumeration.
- **CSRF**: every state-changing route checks that the request's `Origin`
  matches the `Host` header; cookies are `SameSite=Lax` and `httpOnly`.
- **Rate limiting** on login, registration, redemption, and admin actions,
  with a distributed Redis-backed limiter in production.
- **Input validation** via Zod schemas on every API route; **output** is
  escaped by default since this is React, and there's no
  `dangerouslySetInnerHTML` anywhere in the codebase.
- **SQL injection**: not applicable — Prisma parameterizes all queries.
- **Secrets at rest**: the Discord webhook URL is AES-256-GCM encrypted in
  the database.
- **Bot protection**: Cloudflare Turnstile on login, register, and
  redemption, verified server-side.
- **Security headers**: CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy — set in `next.config.mjs`.
- **Admin isolation**: gated by both a Roblox-username match *and* a
  separate secret required only to register that identity (Section 3),
  re-checked server-side on every request.
- **Audit log**: every admin mutation is recorded with the acting admin's
  username and a timestamp.

The one thing this architecture cannot do that Roblox OAuth would: prove a
player actually owns the Roblox account they typed in. See Section 2 for
what that means in practice and one low-effort way to strengthen it later.

---

## 7. Local development

**On Windows, see `QUICKSTART.md` for the exact commands in order** — the
steps below are the same thing, just without Windows-specific notes.

```bash
npm install
npm run setup   # creates .env from .env.example — cross-platform, avoids
                # Windows Explorer's trouble with filenames starting in "."
# then open .env and fill in at least DATABASE_URL
npx prisma db push
npm run dev
```

---

## 8. Troubleshooting

**`npx prisma db push` fails with `Environment variable not found:
DATABASE_URL`**

There's no local `.env` file with your database connection string in it
yet (or it's named something slightly wrong — Windows Explorer sometimes
saves it as `.env.txt` without telling you, since it hides file
extensions by default). Fix:

```bash
npm run setup
```

Then open the `.env` file it creates and paste in your real
`DATABASE_URL`. Note that Netlify's environment variables (Section 5.4)
are completely separate from this local file — setting one doesn't set
the other, on purpose. This local `.env` is only for commands you run on
your own computer, like `prisma db push` or `npm run dev`.

**Registering or logging in fails with a 500 error / "Network error. Please
try again."**

By far the most common cause: the production database's table structure
doesn't match `prisma/schema.prisma` yet — this happens whenever the
schema changes (which it did, going from the old Roblox-OAuth version to
this custom-auth version) and `npx prisma db push` hasn't been re-run
against the **production** `DATABASE_URL` since. Fix:

```bash
# Locally, with your production DATABASE_URL in .env (or exported):
npm install
npx prisma db push
```

It may ask to confirm a data-loss warning if old columns/tables are being
removed — that's expected when the schema changed this much; confirm it.
Visit `/status` afterward — it now runs a dedicated schema check (separate
from "is the database reachable at all") and will tell you directly if
this is the problem.

**`npx prisma db push` fails with `Error code: P1012` and mentions
`prisma.config.ts`, or shows `Prisma CLI Version : 7.x.x`**

This project is built for Prisma 5, but if you run any `npx prisma ...`
command **before** `npm install` has ever completed in that folder, `npx`
ignores this project's pinned version entirely and downloads whatever is
newest on npm right now — which is Prisma 7 as of late 2025, and it has
major breaking changes (connection URLs moved out of `schema.prisma` into
a new `prisma.config.ts` file). Fix: always run `npm install` first,
every time, in a freshly downloaded/cloned copy of this project, before
any `npx prisma` command:

```bash
npm install
npx prisma db push
```

**Build fails with `PrismaClientInitializationError: Environment variable
not found: DATABASE_URL`, referencing a route under `.next/server/app/api/...`**

Next.js tries to statically pre-render any `GET` route handler that
doesn't call something like `cookies()` or read `searchParams`, which runs
Prisma during the build step where `DATABASE_URL` isn't reachable. Every
route here that touches Prisma or a session sets:

```ts
export const dynamic = "force-dynamic";
```

right after its imports. **If you add a new database-backed route, add
this line to it too.**

**"I can't reach the admin panel / registering as admin fails"**

Check `/status` first — it confirms `ADMIN_ROBLOX_USERNAME` and
`ADMIN_CLAIM_SECRET` are actually set. If both are set and it still fails,
double check the Roblox username you're entering at signup matches
`ADMIN_ROBLOX_USERNAME` exactly (case-insensitive, but no typos), and that
the admin code you're pasting has no extra whitespace.

---

## 9. Ideas for what's next

- A lightweight ownership-verification step for the Roblox username (e.g.
  "add this code to your profile bio for 24 hours") for stronger guarantees
  before paying out large prizes
- Auto-assign Discord roles on `ROLE` redemption via a small Discord bot
- A public, opt-in leaderboard of top ticket-holders
- Scheduled/recurring codes (e.g. "daily login code") instead of one-off
- Full i18n coverage for the admin panel and `/status` page
- Automated tests for the redemption transaction (race conditions around
  `maxRedemptions` are the highest-value thing to cover)

---

*Proplays Galaxy Rewards is an independent, fan-made community platform. It
is not operated by, endorsed by, or affiliated with Roblox Corporation.*
