# 每日记录 / Daily Life Tracker

A lightweight web app for logging daily habits and weekly reviews. The production architecture uses **Cloudflare Pages + Functions + D1** with email/password auth (see design spec below). Local `npm run dev` serves the UI; API routes run when you use `wrangler pages dev` or deploy to Cloudflare.

## 1.Daily Record
<img width="883" height="623" alt="image" src="https://github.com/user-attachments/assets/464a7739-bd4b-45e1-aef3-4903651adb21" />

## 2.Weekly Statistics
<img width="847" height="756" alt="image" src="https://github.com/user-attachments/assets/13c25c02-632e-4113-a1ac-7f04e1d67a11" />

## 3.History
<img width="861" height="453" alt="image" src="https://github.com/user-attachments/assets/bad4a35a-1d5d-417d-b97c-6653a8bc4f3e" />

## 4.Add Habit
<img width="839" height="563" alt="image" src="https://github.com/user-attachments/assets/f06dc1ab-975b-41aa-a3b6-1ecdbb308d76" />


## Commands

```bash
npm install
npm run dev
npm run test:run
npm run build
```

Optional: preview the production build locally:

```bash
npm run preview
```

## Design spec

- [Cloudflare + D1 architecture (current)](docs/superpowers/specs/2026-04-14-cloudflare-d1-daily-tracker-design.md)
- [Original IndexedDB-only design (historical)](docs/superpowers/specs/2026-04-11-daily-life-tracker-design.md)

## Data & privacy

**中文：** 登录后数据保存在 **Cloudflare D1**（由 Worker 访问）；请勿把 `SESSION_SECRET`、数据库凭据等写入仓库，使用 Cloudflare Secrets / `.dev.vars`（本地，且已 gitignore）。

**English:** After sign-in, data is stored in **Cloudflare D1** behind Worker APIs. Do not commit secrets; use Cloudflare Secrets and local `.dev.vars` (gitignored).

## Cloudflare (outline)

1. Create a D1 database in the Cloudflare dashboard and set `database_id` in `wrangler.toml` (replace `__SET_IN_CLOUDFLARE__`).
2. Apply migrations: `npx wrangler d1 migrations apply habit-db --remote` (and `--local` for dev).
3. Set secrets (e.g. `SESSION_SECRET`) via `wrangler secret put SESSION_SECRET`.
4. Build the app: `npm run build`.
5. Deploy Pages project pointing at this repo; configure Functions + D1 binding `DB` to the same database.

Details: [migration plan](docs/superpowers/plans/2026-04-14-cloudflare-d1-migration-plan.md).
