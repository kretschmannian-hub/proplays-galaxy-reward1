# Quickstart (Windows)

The full `README.md` covers everything in detail. This file is just the
exact commands, in the exact order, to get from "just downloaded this
folder" to "live on the internet" — nothing else.

Run every command below inside this project folder (the one with
`package.json` in it), in Command Prompt or PowerShell.

## 1. Install dependencies
```
npm install
```
Always run this first in a freshly downloaded copy of the project, before
any other command — skipping it is the #1 cause of confusing errors here.

## 2. Create your local `.env` file
```
npm run setup
```
This creates a `.env` file for you (Windows Explorer makes it annoying to
create a file named exactly `.env` by hand — this sidesteps that entirely).

## 3. Fill in your real values
Open the new `.env` file in Notepad and set at least:
- `DATABASE_URL` — your Neon/Supabase connection string
- `ADMIN_ROBLOX_USERNAME` — the Roblox username that should be admin
- `ADMIN_CLAIM_SECRET` — any long random string you make up (this is what
  lets you register that admin account — see the README, Section 3)

Save the file.

## 4. Push the database schema
```
npx prisma db push
```
If this is the very first time, it may ask to confirm — type `y` and
press Enter.

## 5. Deploy
Push this project to a GitHub repo, connect it to Netlify, and in
**Site settings → Environment variables**, add the exact same variables
you just put in `.env` (Netlify never reads your local `.env` file — it
needs its own copy of each variable). Full details: README Section 5.

## 6. Check it worked
Visit `https://YOUR-SITE.netlify.app/status`. Everything should show a
green checkmark. If something's red, the page tells you exactly what to
fix.

## 7. Register yourself as admin
Go to `/register`, fill in a username/password, enter the Roblox username
you set as `ADMIN_ROBLOX_USERNAME`, click "Have an admin code?", and enter
your `ADMIN_CLAIM_SECRET`.

Done — that account now has the **Admin** link in the navbar.
