# Putting Gift Vault V3 online (Neon + Render)

V3 has three parts:

| Part | Where it runs | What it does |
| --- | --- | --- |
| `public/` | Render | The pages (HTML, CSS, JS) |
| `server.js` + `server/` | Render | Sign in, and saving/loading data at `/api/...` |
| Database | Neon | Stores accounts, people, ideas and occasions |

GitHub Pages stops being the app. The root `index.html` becomes a **"Gift Vault has moved"** page at your old address, which lets your phone download what it saved before.

---

## 1. Create the database (Neon)

1. Go to **neon.tech** and sign up (signing in with GitHub is easiest).
2. Create a project. Name: `gift-vault`. Region: **AWS US East (Ohio)** or **(N. Virginia)**, close to Hamilton and to Render's Ohio/Virginia regions.
3. On the project dashboard, click **Connect**. Copy the **connection string**. It looks like
   `postgresql://neondb_owner:abc123@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Keep it private. It's the password to your data. Never commit it to GitHub.

You don't need to create any tables. The server creates them the first time it starts (`server/schema.sql`).

## 2. (Optional) Run it on your laptop first

1. Install **Node.js LTS** from nodejs.org (accept the defaults). Close and reopen Command Prompt.
2. In Command Prompt:
   ```
   cd %USERPROFILE%\Documents\Projects\gift-vault
   copy .env.example .env
   notepad .env
   ```
3. In Notepad, replace the `DATABASE_URL=` line with your Neon connection string. Save and close.
4. Then:
   ```
   npm install
   npm run dev
   ```
5. Open **http://localhost:3000** in your browser. Create an account and click around.
6. Press **Ctrl + C** in Command Prompt to stop it.

`.env` is in `.gitignore`, so it won't be uploaded to GitHub.

## 3. Put it on Render

1. Go to **render.com** and sign up with GitHub.
2. Click **New → Web Service** and pick the `gift-vault` repository.
3. Fill in:
   - **Name:** `gift-vault` (this becomes `https://gift-vault.onrender.com`, or that name with some letters added if it's taken)
   - **Branch:** `v3` (switch it to `main` after step 4)
   - **Region:** Ohio or Virginia (same side as your Neon database)
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
4. Under **Environment Variables**, add:
   - `DATABASE_URL` = your Neon connection string
   - `NODE_ENV` = `production`
5. Under **Advanced**, set **Health Check Path** to `/healthz`.
6. Click **Create Web Service**. Wait for **Live** in the log (a few minutes the first time).
7. Open your Render address and create your account.

> **Free plan note:** Render's free web services go to sleep after about 15 minutes with no visitors. The first visit after that takes 30–60 seconds to wake up, then it's fast again. Check Render's pricing page for the current limits.

## 4. Moving day (switch GitHub Pages to the "moved" page)

1. Open `index.html` **in the root of the repo** (not the one in `public/`). Near the bottom, change
   ```js
   const NEW_APP_URL = "https://gift-vault.onrender.com";
   ```
   to your real Render address (no slash at the end). Commit it.
2. Merge V3 into main and push:
   ```
   git checkout main
   git pull
   git merge v3
   git push
   ```
3. In Render: **Settings → Build & Deploy → Branch**, change `v3` to `main`. From now on, every push to `main` redeploys automatically.

## 5. Move your phone's data

1. On your phone, open the **old** Gift Vault (the home-screen icon, or `scottnickolasnoble.github.io/gift-vault`).
   It should show **"Gift Vault has moved"**. If it still shows the old app, close it completely and open it again (the old offline copy is removed on the next visit).
2. Tap **Download my vault**. A file like `gift-vault-backup-2026-10-21.json` is saved.
3. Tap **Open the new Gift Vault**, create your account, then choose that file on the **Bring your gift ideas over** screen.
4. Add the new app to your home screen (Safari: Share → Add to Home Screen; Chrome: ⋮ → Add to Home screen). Delete the old icon.

If you have data on more than one device, import the one with the most in it. Importing **replaces** everything in the account.

## Updating the app later

Change files, commit, push to `main`. Render redeploys by itself. If you add a new page or script, add it to the `FILES` list in `public/sw.js` and bump `CACHE` (e.g. `gift-vault-v3-2`).

## What's where

```
server.js            starts the server, serves public/, routes /api
server/web.js        a tiny web framework on Node's http module
server/auth.js       sign up / sign in / sign out / delete account (scrypt passwords, cookie sessions)
server/routes.js     people, ideas, occasions and import, all limited to the signed-in user
server/schema.sql    the database tables
server/db.js         the connection to Neon
public/js/api.js     what the pages call instead of localStorage (loadData, createPerson, updateIdea…)
public/js/entries.js shared "what's coming up" logic (Home, Occasions, People)
public/js/money.js   spent / budget helpers
```
