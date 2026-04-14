# Cloudflare D1 Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the daily tracker from local IndexedDB persistence to Cloudflare Pages + Workers + D1 with email/password authentication and per-user data isolation.

**Architecture:** Keep the existing React SPA UI shell, replace Dexie reads/writes with HTTP calls to Worker APIs, introduce D1 schema + auth/session layer in Worker, and deploy as Pages + Functions. Authentication is cookie-based (HttpOnly), and every query is filtered by `user_id`.

**Tech Stack:** Vite + React + TypeScript, Cloudflare Pages, Cloudflare Workers/Pages Functions, D1 (SQLite), Web Crypto password hashing (scrypt), Vitest.

---

## File structure map

- `functions/_shared/db.ts` - D1 helpers + typed query wrappers
- `functions/_shared/auth.ts` - password hash/verify + session cookie helpers
- `functions/_shared/guards.ts` - auth guard and request validators
- `functions/api/auth/register.ts` - register endpoint
- `functions/api/auth/login.ts` - login endpoint
- `functions/api/auth/logout.ts` - logout endpoint
- `functions/api/auth/me.ts` - current-user endpoint
- `functions/api/habits/index.ts` - list/create habits
- `functions/api/habits/[id].ts` - patch habit (archive/reorder/update)
- `functions/api/daily/[dateKey].ts` - get/put daily entry
- `functions/api/weekly/[weekKey].ts` - get/put weekly entry
- `functions/api/stats/weeks.ts` - weekly list endpoint
- `migrations/0001_init.sql` - D1 schema
- `src/lib/api.ts` - frontend API client
- `src/lib/session.ts` - auth/session helpers on frontend
- `src/pages/LoginPage.tsx` - login/register UI
- `src/App.tsx` - route guard and login route
- `src/pages/*.tsx` - switch DB calls to API calls
- `README.md` - cloudflare setup/deploy instructions
- `.dev.vars.example` - non-secret local dev env template
- `wrangler.toml` - Pages/Functions + D1 binding config

---

### Task 1: Add Cloudflare worker foundation and D1 schema

**Files:**
- Create: `wrangler.toml`
- Create: `migrations/0001_init.sql`
- Create: `.dev.vars.example`

- [ ] **Step 1: Create `wrangler.toml` with D1 binding**

```toml
name = "habit"
compatibility_date = "2026-04-14"
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "habit-db"
database_id = "__SET_IN_CLOUDFLARE__"
```

- [ ] **Step 2: Create initial migration `migrations/0001_init.sql`**

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  unit TEXT,
  sort_order INTEGER NOT NULL,
  archived_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_entries (
  user_id TEXT NOT NULL,
  date_key TEXT NOT NULL,
  habit_values_json TEXT NOT NULL,
  today_review TEXT NOT NULL,
  tomorrow_plan TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, date_key)
);

CREATE TABLE IF NOT EXISTS weekly_entries (
  user_id TEXT NOT NULL,
  week_key TEXT NOT NULL,
  score REAL,
  week_review TEXT NOT NULL,
  next_week_plan TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, week_key)
);
```

- [ ] **Step 3: Add `.dev.vars.example` (no secrets)**

```env
SESSION_SECRET=replace_me
COOKIE_DOMAIN=localhost
```

- [ ] **Step 4: Verify migration syntax**

Run: `npx wrangler d1 migrations apply habit-db --local`
Expected: migration applied locally without SQL errors.

- [ ] **Step 5: Commit**

```bash
git add wrangler.toml migrations/0001_init.sql .dev.vars.example
git commit -m "chore: add cloudflare d1 foundation"
```

---

### Task 2: Implement shared auth and DB helpers (TDD)

**Files:**
- Create: `functions/_shared/auth.ts`
- Create: `functions/_shared/db.ts`
- Create: `functions/_shared/guards.ts`
- Test: `src/lib/__tests__/auth-cookie.test.ts`

- [ ] **Step 1: Write failing tests for cookie parsing and session token format**

```ts
import { describe, expect, it } from "vitest";
import { parseCookie, buildSessionCookie } from "../../../functions/_shared/auth";

it("parses session cookie", () => {
  expect(parseCookie("a=1; session=abc").session).toBe("abc");
});

it("builds httponly cookie", () => {
  const c = buildSessionCookie("token", 3600);
  expect(c).toContain("HttpOnly");
  expect(c).toContain("session=token");
});
```

- [ ] **Step 2: Run test and confirm failure**

Run: `npm run test:run -- src/lib/__tests__/auth-cookie.test.ts`
Expected: module missing / export errors.

- [ ] **Step 3: Implement helpers**

Implement in `functions/_shared/auth.ts`:
- `hashPassword(password: string): Promise<string>`
- `verifyPassword(password: string, hash: string): Promise<boolean>`
- `newSessionToken(): string`
- `parseCookie(cookieHeader: string | null): Record<string,string>`
- `buildSessionCookie(token: string, maxAgeSec: number): string`
- `clearSessionCookie(): string`

- [ ] **Step 4: Run tests and ensure pass**

Run: `npm run test:run -- src/lib/__tests__/auth-cookie.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add functions/_shared/auth.ts functions/_shared/db.ts functions/_shared/guards.ts src/lib/__tests__/auth-cookie.test.ts
git commit -m "feat: add worker auth and db helpers"
```

---

### Task 3: Build auth endpoints

**Files:**
- Create: `functions/api/auth/register.ts`
- Create: `functions/api/auth/login.ts`
- Create: `functions/api/auth/logout.ts`
- Create: `functions/api/auth/me.ts`

- [ ] **Step 1: Implement `POST /api/auth/register`**
- Validate email/password
- Reject duplicate email (409)
- Hash password and insert user row

- [ ] **Step 2: Implement `POST /api/auth/login`**
- Verify email+password
- Create session row with expiry
- Return `Set-Cookie` (HttpOnly, SameSite=Lax, Path=/)

- [ ] **Step 3: Implement `POST /api/auth/logout` and `GET /api/auth/me`**
- Logout removes session and clears cookie
- `/me` returns current user id/email when session valid

- [ ] **Step 4: Manual endpoint check (local)**

Run: `npx wrangler pages dev dist --d1 DB=habit-db`
Expected:
- register returns 201
- login returns 200 + set-cookie
- me returns user payload with cookie

- [ ] **Step 5: Commit**

```bash
git add functions/api/auth/*.ts
git commit -m "feat: add auth endpoints with session cookies"
```

---

### Task 4: Add habits API and migrate Habits page

**Files:**
- Create: `functions/api/habits/index.ts`
- Create: `functions/api/habits/[id].ts`
- Create: `src/lib/api.ts`
- Modify: `src/pages/HabitsPage.tsx`

- [ ] **Step 1: Implement habits endpoints**
- `GET /api/habits`: list for current user ordered by `sort_order`
- `POST /api/habits`: create with `sort_order = max + 1`
- `PATCH /api/habits/:id`: update fields, archive, reorder swaps

- [ ] **Step 2: Create frontend API client**

`src/lib/api.ts`:
- `apiGet<T>(path)`
- `apiPost<T>(path, body)`
- `apiPatch<T>(path, body)`
- `apiPut<T>(path, body)`
- Include `credentials: "include"`

- [ ] **Step 3: Replace Dexie calls in `HabitsPage` with API calls**

- [ ] **Step 4: Verify behavior manually**
- add/archive/reorder works
- refresh retains data from server

- [ ] **Step 5: Commit**

```bash
git add functions/api/habits src/lib/api.ts src/pages/HabitsPage.tsx
git commit -m "feat: migrate habits page to worker api"
```

---

### Task 5: Add daily/weekly/stats APIs and migrate pages

**Files:**
- Create: `functions/api/daily/[dateKey].ts`
- Create: `functions/api/weekly/[weekKey].ts`
- Create: `functions/api/stats/weeks.ts`
- Modify: `src/pages/TodayPage.tsx`
- Modify: `src/pages/WeekPage.tsx`
- Modify: `src/pages/StatsPage.tsx`

- [ ] **Step 1: Implement daily upsert/get endpoint**
- GET returns existing or empty default payload
- PUT upserts by `(user_id, date_key)`

- [ ] **Step 2: Implement weekly upsert/get + stats list endpoint**

- [ ] **Step 3: Replace page persistence calls**
- Today autosave -> `PUT /api/daily/:dateKey`
- Week summary -> `PUT /api/weekly/:weekKey`
- Stats list -> `GET /api/stats/weeks`

- [ ] **Step 4: Keep existing week/date utility tests green**

Run: `npm run test:run`
Expected: existing 8+ tests pass.

- [ ] **Step 5: Commit**

```bash
git add functions/api/daily functions/api/weekly functions/api/stats src/pages/TodayPage.tsx src/pages/WeekPage.tsx src/pages/StatsPage.tsx
git commit -m "feat: migrate daily weekly stats to worker api"
```

---

### Task 6: Add login page and route guard

**Files:**
- Create: `src/pages/LoginPage.tsx`
- Create: `src/lib/session.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/NavBar.tsx`

- [ ] **Step 1: Add session hooks**
- `getMe()` call
- `login(email,password)`
- `register(email,password)`
- `logout()`

- [ ] **Step 2: Implement LoginPage**
- email/password form
- login/register toggle
- error state and loading state

- [ ] **Step 3: Protect app routes**
- unauthenticated -> `/login`
- authenticated -> app routes
- nav includes logout action

- [ ] **Step 4: Manual flow test**
- register -> login -> CRUD habits/daily/weekly -> logout -> blocked from app

- [ ] **Step 5: Commit**

```bash
git add src/pages/LoginPage.tsx src/lib/session.ts src/App.tsx src/components/NavBar.tsx
git commit -m "feat: add auth ui and route protection"
```

---

### Task 7: Error handling and user messaging

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/hooks/useToast.tsx`
- Modify: `src/pages/*.tsx` (only where needed)

- [ ] **Step 1: Normalize API error surface**
- throw typed error with `status` and `message`

- [ ] **Step 2: Map errors to UX**
- 401 -> redirect login + toast
- 400 -> form-level message
- 500/network -> generic retry toast

- [ ] **Step 3: Verify no uncaught promise errors in browser console**

- [ ] **Step 4: Commit**

```bash
git add src/lib/api.ts src/hooks/useToast.tsx src/pages
git commit -m "fix: handle auth and api errors consistently"
```

---

### Task 8: Cloudflare deployment docs and verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add deployment section**
- create D1 database
- set binding in Cloudflare
- run migrations
- set secrets
- deploy pages project

- [ ] **Step 2: Final verification commands**

Run:
- `npm run test:run`
- `npm run build`

Expected: all tests pass, build successful.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add cloudflare pages worker d1 deploy guide"
```

---

## Self-review checklist (spec coverage)

- Cloudflare Pages + Worker + D1: Tasks 1, 8
- Email/password auth with session cookies: Tasks 2, 3, 6
- Per-user isolation: Tasks 3, 4, 5
- Existing product flows preserved: Tasks 4, 5, 6
- Error handling and UX: Task 7
- Sensitive config not in repo: Tasks 1, 8

No placeholders, no TODO-only tasks, each task has executable checkpoints.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-14-cloudflare-d1-migration-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
