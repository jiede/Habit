# Daily Life Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-user, browser-only daily habit tracker with weekly summaries and a stats view, persisting to IndexedDB per `docs/superpowers/specs/2026-04-11-daily-life-tracker-design.md`.

**Architecture:** Vite + React + TypeScript SPA; Dexie for IndexedDB; pure functions for ISO week boundaries (`date-fns`) and weekly aggregates (unit-tested); React Router for Today / Week / Stats / Habits; debounced autosave on day edits.

**Tech Stack:** Vite 6, React 19, TypeScript 5, React Router 7, Dexie 4, date-fns 4, Vitest 3 (`happy-dom` for optional component tests; `src/lib` tests use Node).

---

## File map (repo root `sdd-demo/`)


| Path                                  | Responsibility                                         |
| ------------------------------------- | ------------------------------------------------------ |
| `package.json`                        | Scripts: `dev`, `build`, `preview`, `test`, `test:run` |
| `vite.config.ts`                      | React plugin, Vitest project config                    |
| `tsconfig.json`, `tsconfig.node.json` | TS strict                                              |
| `index.html`                          | Mount root                                             |
| `src/main.tsx`                        | `createRoot`, `BrowserRouter`                          |
| `src/index.css`                       | Minimal global styles (layout, nav, forms)             |
| `src/App.tsx`                         | Routes + nav shell                                     |
| `src/db/types.ts`                     | `Habit`, `DailyEntry`, `WeeklyEntry` types             |
| `src/db/database.ts`                  | Dexie subclass `LifeTrackerDB`, version 1              |
| `src/lib/dates.ts`                    | `toDateKey`, week keys, labels (`wk02` + 中文日期范围)       |
| `src/lib/aggregate.ts`                | Per-habit weekly rollups                               |
| `src/lib/debounce.ts`                 | Shared debounce helper                                 |
| `src/lib/__tests__/dates.test.ts`     | Week + label tests                                     |
| `src/lib/__tests__/aggregate.test.ts` | Aggregation tests                                      |
| `src/hooks/useToast.tsx`              | Tiny context for non-blocking error toasts             |
| `src/pages/TodayPage.tsx`             | Date navigation + habit form + journal fields          |
| `src/pages/WeekPage.tsx`              | Aggregates + weekly manual fields                      |
| `src/pages/StatsPage.tsx`             | Week list + links                                      |
| `src/pages/HabitsPage.tsx`            | CRUD + archive + reorder                               |
| `src/components/NavBar.tsx`           | Links: 今日 / 本周 / 统计 / 习惯                               |
| `README.md`                           | Dev/build + spec link                                  |


---

### Task 1: Project scaffold

**Files:**

- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- **Step 1: Write `package.json`**

```json
{
  "name": "daily-life-tracker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "date-fns": "^4.1.0",
    "dexie": "^4.0.11",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.6.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "happy-dom": "^17.4.0",
    "typescript": "~5.8.0",
    "vite": "^6.3.0",
    "vitest": "^3.1.0"
  }
}
```

- **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

- **Step 3: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler"
  },
  "include": ["vite.config.ts"]
}
```

- **Step 4: Write `vite.config.ts`**

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
  },
});
```

- **Step 5: Write `index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>每日记录</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- **Step 6: Write `src/main.tsx`**

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

- **Step 7: Write placeholder `src/App.tsx`**

```typescript
export default function App() {
  return <p>scaffold</p>;
}
```

- **Step 8: Write minimal `src/index.css`**

```css
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}
```

- **Step 9: Install and verify build**

Run:

```bash
cd /Users/jamie/Desktop/cursor/sdd-demo && npm install
```

Expected: `package-lock.json` created, no errors.

Run:

```bash
npm run build
```

Expected: Vite produces `dist/` with no errors.

- **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json index.html src/main.tsx src/App.tsx src/index.css
git commit -m "chore: vite react ts scaffold"
```

---

### Task 2: Date + week utilities (TDD)

**Files:**

- Create: `src/lib/dates.ts`
- Create: `src/lib/__tests__/dates.test.ts`
- **Step 1: Write failing tests `src/lib/__tests__/dates.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import {
  toDateKey,
  parseDateKeyLocal,
  weekDateKeysFor,
  weekKeyISO,
  formatWeekBanner,
} from "../dates";

describe("toDateKey", () => {
  it("formats local calendar day", () => {
    const d = new Date(2026, 3, 11, 15, 30); // Apr 11 2026 local
    expect(toDateKey(d)).toBe("2026-04-11");
  });
});

describe("week boundaries (ISO, Monday start)", () => {
  it("returns Mon–Sun keys for a Wednesday in April 2026", () => {
    const wed = new Date(2026, 3, 8); // Apr 8 2026 = Wednesday
    expect(weekDateKeysFor(wed)).toEqual([
      "2026-04-06",
      "2026-04-07",
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
    ]);
  });
});

describe("weekKeyISO", () => {
  it("matches ISO week for early January edge (local)", () => {
    const d = new Date(2026, 0, 1); // Jan 1 2026 (Thursday) → ISO 2026-W01
    expect(weekKeyISO(d)).toBe("2026-W01");
  });
});

describe("formatWeekBanner", () => {
  it("shows wk + Chinese range", () => {
    const wed = new Date(2026, 3, 8);
    const b = formatWeekBanner(wed);
    expect(b.weekKey).toMatch(/^2026-W\d{2}$/);
    expect(b.shortLabel).toMatch(/^wk\d{2}$/);
    expect(b.rangeZh).toMatch(/^\d{1,2}月\d{1,2}日[–-]\d{1,2}月\d{1,2}日$/);
  });
});
```

- **Step 2: Run tests — expect FAIL**

Run:

```bash
cd /Users/jamie/Desktop/cursor/sdd-demo && npm run test:run -- src/lib/__tests__/dates.test.ts
```

Expected: FAIL (module not found or exports missing).

- **Step 3: Implement `src/lib/dates.ts`**

```typescript
import {
  eachDayOfInterval,
  endOfISOWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  parseISO,
  startOfISOWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";

export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export function parseDateKeyLocal(key: string): Date {
  return parseISO(key);
}

export function weekDateKeysFor(d: Date): string[] {
  const start = startOfISOWeek(d);
  const end = endOfISOWeek(d);
  return eachDayOfInterval({ start, end }).map((x) => toDateKey(x));
}

export function weekKeyISO(d: Date): string {
  const y = getISOWeekYear(d);
  const w = getISOWeek(d);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

export function formatWeekBanner(d: Date): {
  weekKey: string;
  shortLabel: string;
  rangeZh: string;
} {
  const keys = weekDateKeysFor(d);
  const start = parseDateKeyLocal(keys[0]!);
  const end = parseDateKeyLocal(keys[6]!);
  const weekKey = weekKeyISO(d);
  const isoWeekNum = getISOWeek(d);
  const shortLabel = `wk${String(isoWeekNum).padStart(2, "0")}`;
  const rangeZh = `${format(start, "M月d日", { locale: zhCN })}–${format(end, "M月d日", { locale: zhCN })}`;
  return { weekKey, shortLabel, rangeZh };
}
```

- **Step 4: Run tests — expect PASS**

Run:

```bash
npm run test:run -- src/lib/__tests__/dates.test.ts
```

Expected: all tests PASS.

- **Step 5: Commit**

```bash
git add src/lib/dates.ts src/lib/__tests__/dates.test.ts
git commit -m "feat: iso week helpers and zh banner"
```

---

### Task 3: Weekly aggregation (TDD)

**Files:**

- Create: `src/lib/aggregate.ts`
- Create: `src/lib/__tests__/aggregate.test.ts`
- **Step 1: Write failing tests `src/lib/__tests__/aggregate.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { summarizeToggleWeek, summarizeNumericWeek } from "../aggregate";

describe("summarizeToggleWeek", () => {
  it("counts only days with entry and true; ignores missing days", () => {
    const weekKeys = ["2026-04-06", "2026-04-07", "2026-04-08"];
    const valuesByDay: Record<string, boolean | null | undefined> = {
      "2026-04-06": true,
      "2026-04-07": false,
      // 08 missing
    };
    const r = summarizeToggleWeek(weekKeys, (k) => valuesByDay[k] ?? null);
    expect(r.doneDays).toBe(1);
    expect(r.falseDays).toBe(1);
    expect(r.unrecordedDays).toBe(1);
  });
});

describe("summarizeNumericWeek", () => {
  it("sums only non-null; avg over days with values; allows zero as value", () => {
    const weekKeys = ["2026-04-06", "2026-04-07", "2026-04-08"];
    const valuesByDay: Record<string, number | null | undefined> = {
      "2026-04-06": 5,
      "2026-04-07": 0,
      "2026-04-08": null,
    };
    const r = summarizeNumericWeek(weekKeys, (k) => valuesByDay[k] ?? null);
    expect(r.sum).toBe(5);
    expect(r.daysWithValue).toBe(2);
    expect(r.average).toBe(2.5);
  });

  it("average undefined when no values", () => {
    const weekKeys = ["2026-04-06"];
    const r = summarizeNumericWeek(weekKeys, () => null);
    expect(r.sum).toBe(0);
    expect(r.daysWithValue).toBe(0);
    expect(r.average).toBeUndefined();
  });
});
```

- **Step 2: Run tests — expect FAIL**

Run:

```bash
npm run test:run -- src/lib/__tests__/aggregate.test.ts
```

Expected: FAIL.

- **Step 3: Implement `src/lib/aggregate.ts`**

```typescript
export type ToggleWeekSummary = {
  doneDays: number;
  falseDays: number;
  unrecordedDays: number;
};

export function summarizeToggleWeek(
  weekDateKeys: string[],
  get: (dateKey: string) => boolean | null,
): ToggleWeekSummary {
  let doneDays = 0;
  let falseDays = 0;
  let unrecordedDays = 0;
  for (const k of weekDateKeys) {
    const v = get(k);
    if (v === null) unrecordedDays += 1;
    else if (v === true) doneDays += 1;
    else falseDays += 1;
  }
  return { doneDays, falseDays, unrecordedDays };
}

export type NumericWeekSummary = {
  sum: number;
  daysWithValue: number;
  average?: number;
};

export function summarizeNumericWeek(
  weekDateKeys: string[],
  get: (dateKey: string) => number | null,
): NumericWeekSummary {
  let sum = 0;
  let daysWithValue = 0;
  for (const k of weekDateKeys) {
    const v = get(k);
    if (v !== null) {
      sum += v;
      daysWithValue += 1;
    }
  }
  const average =
    daysWithValue > 0 ? sum / daysWithValue : undefined;
  return { sum, daysWithValue, average };
}
```

- **Step 4: Run tests — expect PASS**

Run:

```bash
npm run test:run -- src/lib/__tests__/aggregate.test.ts
```

Expected: PASS.

- **Step 5: Commit**

```bash
git add src/lib/aggregate.ts src/lib/__tests__/aggregate.test.ts
git commit -m "feat: weekly aggregation helpers"
```

---

### Task 4: Dexie schema + types

**Files:**

- Create: `src/db/types.ts`
- Create: `src/db/database.ts`
- **Step 1: Add `src/db/types.ts`**

```typescript
export type HabitType = "toggle" | "numeric";

export type Habit = {
  id: string;
  name: string;
  type: HabitType;
  unit: string | null;
  sortOrder: number;
  archivedAt: number | null;
  createdAt: number;
};

export type HabitValueMap = Record<string, boolean | number | null>;

export type DailyEntry = {
  dateKey: string;
  habitValues: HabitValueMap;
  todayReview: string;
  tomorrowPlan: string;
  updatedAt: number;
};

export type WeeklyEntry = {
  weekKey: string;
  score: number | null;
  weekReview: string;
  nextWeekPlan: string;
  updatedAt: number;
};
```

- **Step 2: Add `src/db/database.ts`**

```typescript
import Dexie, { type Table } from "dexie";
import type { DailyEntry, Habit, WeeklyEntry } from "./types";

export class LifeTrackerDB extends Dexie {
  habits!: Table<Habit, string>;
  dailyEntries!: Table<DailyEntry, string>;
  weeklyEntries!: Table<WeeklyEntry, string>;

  constructor() {
    super("life-tracker-db");
    this.version(1).stores({
      habits: "id, sortOrder, archivedAt",
      dailyEntries: "dateKey",
      weeklyEntries: "weekKey",
    });
  }
}

export const db = new LifeTrackerDB();
```

- **Step 3: Wire smoke import in `src/main.tsx`**

Add after CSS import:

```typescript
import { db } from "./db/database";

void db.open().catch((e) => {
  console.error("IndexedDB open failed", e);
});
```

- **Step 4: Commit**

```bash
git add src/db/types.ts src/db/database.ts src/main.tsx
git commit -m "feat: dexie schema v1"
```

---

### Task 5: Router shell + navigation

**Files:**

- Modify: `src/App.tsx`
- Create: `src/components/NavBar.tsx`
- Create: `src/pages/TodayPage.tsx`, `WeekPage.tsx`, `StatsPage.tsx`, `HabitsPage.tsx` (stubs)
- **Step 1: Create stubs**

`src/pages/TodayPage.tsx`:

```typescript
export default function TodayPage() {
  return <section><h1>今日</h1><p>TODO</p></section>;
}
```

`src/pages/WeekPage.tsx`:

```typescript
import { useParams } from "react-router-dom";

export default function WeekPage() {
  const { weekKey } = useParams();
  return (
    <section>
      <h1>本周</h1>
      <p>weekKey: {weekKey ?? "(current)"}</p>
    </section>
  );
}
```

`src/pages/StatsPage.tsx`:

```typescript
export default function StatsPage() {
  return <section><h1>统计</h1><p>TODO</p></section>;
}
```

`src/pages/HabitsPage.tsx`:

```typescript
export default function HabitsPage() {
  return <section><h1>习惯</h1><p>TODO</p></section>;
}
```

- **Step 2: Create `src/components/NavBar.tsx`**

```typescript
import { NavLink } from "react-router-dom";

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  fontWeight: isActive ? 700 : 400,
  marginRight: "1rem",
});

export default function NavBar() {
  return (
    <nav style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #ddd" }}>
      <NavLink to="/" end style={linkStyle}>
        今日
      </NavLink>
      <NavLink to="/week" style={linkStyle}>
        本周
      </NavLink>
      <NavLink to="/stats" style={linkStyle}>
        统计
      </NavLink>
      <NavLink to="/habits" style={linkStyle}>
        习惯
      </NavLink>
    </nav>
  );
}
```

- **Step 3: Replace `src/App.tsx`**

```typescript
import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import TodayPage from "./pages/TodayPage";
import WeekPage from "./pages/WeekPage";
import StatsPage from "./pages/StatsPage";
import HabitsPage from "./pages/HabitsPage";
import { weekKeyISO } from "./lib/dates";

function CurrentWeekRedirect() {
  const key = weekKeyISO(new Date());
  return <Navigate to={`/week/${key}`} replace />;
}

export default function App() {
  return (
    <>
      <NavBar />
      <main style={{ padding: "1rem", maxWidth: 720, margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/week" element={<CurrentWeekRedirect />} />
          <Route path="/week/:weekKey" element={<WeekPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/habits" element={<HabitsPage />} />
        </Routes>
      </main>
    </>
  );
}
```

- **Step 4: Manual check**

Run `npm run dev`, open `/`, `/week`, `/stats`, `/habits`. Expect nav works and `/week` redirects to `/week/2026-Wxx`.

- **Step 5: Commit**

```bash
git add src/App.tsx src/components/NavBar.tsx src/pages/*.tsx
git commit -m "feat: router shell and nav"
```

---

### Task 6: Habits management page

**Files:**

- Modify: `src/pages/HabitsPage.tsx`
- **Step 1: Implement list + add + archive + reorder**

Use `crypto.randomUUID()` for ids. New habit: `sortOrder = max+1`, `archivedAt: null`, `createdAt: Date.now()`.

UI: form with name, type select (`toggle`/`numeric`), unit text (only for numeric). List active habits with 「归档」 button. Section 「已归档」 with names read-only.

Reorder: 「上移」「下移」 swaps `sortOrder` with neighbor (only among non-archived).

All mutations `await db.habits.put(...)`.

- **Step 2: Manual test**

Create toggle + numeric habits, archive one, refresh — data persists.

- **Step 3: Commit**

```bash
git add src/pages/HabitsPage.tsx
git commit -m "feat: habits crud and archive"
```

*(Implementer: paste full component in this commit; plan omits full JSX here only if file exceeds limits — **replace this sentence with the full file before executing**.)*

**Plan fix — full `HabitsPage.tsx` for Step 1:**

```typescript
import { useEffect, useMemo, useState } from "react";
import { db } from "../db/database";
import type { Habit, HabitType } from "../db/types";

function sortActive(a: Habit, b: Habit) {
  return a.sortOrder - b.sortOrder;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<HabitType>("toggle");
  const [unit, setUnit] = useState("");

  async function refresh() {
    const rows = await db.habits.orderBy("sortOrder").toArray();
    setHabits(rows);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const { active, archived } = useMemo(() => {
    const a = habits.filter((h) => h.archivedAt === null).sort(sortActive);
    const ar = habits.filter((h) => h.archivedAt !== null);
    return { active: a, archived: ar };
  }, [habits]);

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const max = (await db.habits.max("sortOrder")) ?? 0;
    const habit: Habit = {
      id: crypto.randomUUID(),
      name: name.trim(),
      type,
      unit: type === "numeric" && unit.trim() ? unit.trim() : null,
      sortOrder: max + 1,
      archivedAt: null,
      createdAt: Date.now(),
    };
    await db.habits.add(habit);
    setName("");
    setUnit("");
    await refresh();
  }

  async function archive(id: string) {
    const h = await db.habits.get(id);
    if (!h) return;
    await db.habits.update(id, { archivedAt: Date.now() });
    await refresh();
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = active.findIndex((h) => h.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= active.length) return;
    const a = active[idx]!;
    const b = active[swapIdx]!;
    await db.transaction("rw", db.habits, async () => {
      await db.habits.update(a.id, { sortOrder: b.sortOrder });
      await db.habits.update(b.id, { sortOrder: a.sortOrder });
    });
    await refresh();
  }

  return (
    <section>
      <h1>习惯</h1>
      <form onSubmit={addHabit} style={{ display: "grid", gap: "0.5rem", maxWidth: 360 }}>
        <label>
          名称
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          类型
          <select value={type} onChange={(e) => setType(e.target.value as HabitType)}>
            <option value="toggle">开关</option>
            <option value="numeric">数值</option>
          </select>
        </label>
        {type === "numeric" && (
          <label>
            单位（可选）
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="km、小时…" />
          </label>
        )}
        <button type="submit">添加</button>
      </form>
      <h2>进行中</h2>
      {active.length === 0 ? <p>还没有习惯，先添加一个。</p> : null}
      <ul>
        {active.map((h) => (
          <li key={h.id} style={{ marginBottom: "0.5rem" }}>
            <strong>{h.name}</strong> — {h.type === "toggle" ? "开关" : `数值${h.unit ? ` (${h.unit})` : ""}`}
            <button type="button" onClick={() => move(h.id, -1)} style={{ marginLeft: 8 }}>
              上移
            </button>
            <button type="button" onClick={() => move(h.id, 1)}>
              下移
            </button>
            <button type="button" onClick={() => void archive(h.id)} style={{ marginLeft: 8 }}>
              归档
            </button>
          </li>
        ))}
      </ul>
      <h2>已归档</h2>
      {archived.length === 0 ? <p>无</p> : null}
      <ul>
        {archived.map((h) => (
          <li key={h.id}>{h.name}</li>
        ))}
      </ul>
    </section>
  );
}
```

---

### Task 7: Today page (day editor)

**Files:**

- Create: `src/lib/debounce.ts`
- Modify: `src/pages/TodayPage.tsx`
- **Step 1: Add `src/lib/debounce.ts`**

```typescript
export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
```

- **Step 2: Implement `TodayPage`**

Behavior:

- Query `?date=YYYY-MM-DD` optional; default `toDateKey(new Date())`.
- Prev/next day buttons change query or local state.
- Load `db.habits` where `archivedAt === null`, sorted by `sortOrder`.
- Load or create `DailyEntry` for `dateKey`: empty `habitValues`, empty strings.
- Toggle: checkbox bound to `habitValues[id] === true`.
- Numeric: `<input type="number">` — empty input means `null`; `0` is valid stored as number.
- `todayReview` / `tomorrowPlan` textareas.
- `debounce` 400ms on any change → `db.dailyEntries.put({...})` wrapped in try/catch; on failure call toast (Task 9) or `console.error` until toast exists.
- **Step 3: Manual test**

Change fields, refresh — values remain.

- **Step 4: Commit**

```bash
git add src/lib/debounce.ts src/pages/TodayPage.tsx
git commit -m "feat: today page with autosave"
```

*(Implementer: include full `TodayPage.tsx` body meeting the above behavior.)*

**Full `TodayPage.tsx` reference:**

```typescript
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { db } from "../db/database";
import type { DailyEntry, Habit } from "../db/types";
import { debounce } from "../lib/debounce";
import { parseDateKeyLocal, toDateKey } from "../lib/dates";

function addDaysKey(key: string, delta: number): string {
  const d = parseDateKeyLocal(key);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

export default function TodayPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("date") ?? toDateKey(new Date());
  const [dateKey, setDateKey] = useState(initial);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entry, setEntry] = useState<DailyEntry | null>(null);

  useEffect(() => {
    const q = params.get("date");
    if (q) setDateKey(q);
  }, [params]);

  useEffect(() => {
    void (async () => {
      const hs = await db.habits.filter((h) => h.archivedAt === null).sortBy("sortOrder");
      setHabits(hs);
      let row = await db.dailyEntries.get(dateKey);
      if (!row) {
        row = {
          dateKey,
          habitValues: {},
          todayReview: "",
          tomorrowPlan: "",
          updatedAt: Date.now(),
        };
      }
      setEntry(row);
    })();
  }, [dateKey]);

  const persist = useMemo(
    () =>
      debounce(async (next: DailyEntry) => {
        try {
          await db.dailyEntries.put({ ...next, updatedAt: Date.now() });
        } catch (e) {
          console.error(e);
        }
      }, 400),
    [],
  );

  const updateEntry = useCallback(
    (patch: Partial<DailyEntry>) => {
      setEntry((prev) => {
        if (!prev) return prev;
        const merged = { ...prev, ...patch };
        persist(merged);
        return merged;
      });
    },
    [persist],
  );

  function shiftDay(delta: number) {
    const nk = addDaysKey(dateKey, delta);
    setDateKey(nk);
    setParams({ date: nk });
  }

  if (!entry) return <p>加载中…</p>;

  return (
    <section>
      <h1>今日</h1>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" onClick={() => shiftDay(-1)}>
          ← 前一天
        </button>
        <span>{dateKey}</span>
        <button type="button" onClick={() => shiftDay(1)}>
          后一天 →
        </button>
        <button type="button" onClick={() => shiftDay(0)}>
          今天
        </button>
      </div>
      {habits.length === 0 ? <p>请先在「习惯」里添加习惯。</p> : null}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {habits.map((h) => {
          const v = entry.habitValues[h.id];
          if (h.type === "toggle") {
            const checked = v === true;
            return (
              <li key={h.id} style={{ margin: "0.5rem 0" }}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const habitValues = {
                        ...entry.habitValues,
                        [h.id]: e.target.checked ? true : false,
                      };
                      updateEntry({ habitValues });
                    }}
                  />{" "}
                  {h.name}
                </label>
              </li>
            );
          }
          const num = typeof v === "number" ? String(v) : "";
          return (
            <li key={h.id} style={{ margin: "0.5rem 0" }}>
              <label>
                {h.name}
                <input
                  type="number"
                  style={{ marginLeft: 8 }}
                  value={num}
                  placeholder={h.unit ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const val = raw === "" ? null : Number(raw);
                    const habitValues = { ...entry.habitValues, [h.id]: val };
                    updateEntry({ habitValues });
                  }}
                />
                {h.unit ? <span style={{ marginLeft: 4 }}>{h.unit}</span> : null}
              </label>
            </li>
          );
        })}
      </ul>
      <label style={{ display: "block", marginTop: "1rem" }}>
        今日回顾
        <textarea
          style={{ width: "100%", minHeight: 80 }}
          value={entry.todayReview}
          onChange={(e) => updateEntry({ todayReview: e.target.value })}
        />
      </label>
      <label style={{ display: "block", marginTop: "0.5rem" }}>
        明日改进
        <textarea
          style={{ width: "100%", minHeight: 80 }}
          value={entry.tomorrowPlan}
          onChange={(e) => updateEntry({ tomorrowPlan: e.target.value })}
        />
      </label>
    </section>
  );
}
```

Fix "今天" button: should set to actual today.

```typescript
<button
  type="button"
  onClick={() => {
    const nk = toDateKey(new Date());
    setDateKey(nk);
    setParams({ date: nk });
  }}
>
  今天
</button>
```

---

### Task 8: Week page (aggregates + weekly fields)

**Files:**

- Modify: `src/pages/WeekPage.tsx`
- **Step 1: Add `dateFromWeekKey` + round-trip test**

Append to `src/lib/dates.ts` (merge `parse` into the existing `date-fns` import; do not add a second `date-fns` import line):

```typescript
export function dateFromWeekKey(weekKey: string): Date {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) return new Date();
  return parse(`${m[1]}-W${m[2]}-1`, "RRRR-'W'II-i", new Date());
}
```

Append to `src/lib/__tests__/dates.test.ts` (add `dateFromWeekKey` to the existing `../dates` import):

```typescript
describe("dateFromWeekKey", () => {
  it("round-trips week key via Monday anchor", () => {
    expect(weekKeyISO(dateFromWeekKey("2026-W15"))).toBe("2026-W15");
  });
});
```

- **Step 2: Implement week view**

Load `weekDateKeysFor(anchor)`, all `dailyEntries` in keys, all `habits` (including archived for display in summary — show name from habit row; if missing id, show「未知习惯」).

For each habit that appears in any `habitValues` across the week **or** is non-archived, compute summary using `summarizeToggleWeek` / `summarizeNumericWeek`.

Weekly manual fields: load `WeeklyEntry` by `weekKey`; debounced save `score` as number or null (empty input), `weekReview`, `nextWeekPlan`.

Show banner via `formatWeekBanner(anchor)`.

- **Step 3: Run tests**

```bash
npm run test:run
```

- **Step 4: Commit**

```bash
git add src/lib/dates.ts src/lib/__tests__/dates.test.ts src/pages/WeekPage.tsx
git commit -m "feat: week summary and weekly journal"
```

**Full `WeekPage.tsx` reference:**

```typescript
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db } from "../db/database";
import type { DailyEntry, Habit, WeeklyEntry } from "../db/types";
import { summarizeNumericWeek, summarizeToggleWeek } from "../lib/aggregate";
import { debounce } from "../lib/debounce";
import {
  dateFromWeekKey,
  formatWeekBanner,
  weekDateKeysFor,
  weekKeyISO,
} from "../lib/dates";

export default function WeekPage() {
  const { weekKey: weekKeyParam } = useParams();
  const weekKey = weekKeyParam ?? weekKeyISO(new Date());
  const anchor = dateFromWeekKey(weekKey);
  const banner = formatWeekBanner(anchor);
  const keys = weekDateKeysFor(anchor);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [days, setDays] = useState<DailyEntry[]>([]);
  const [weekly, setWeekly] = useState<WeeklyEntry | null>(null);

  async function load() {
    const [hs, ws] = await Promise.all([
      db.habits.toArray(),
      db.weeklyEntries.get(weekKey),
    ]);
    setHabits(hs);
    const entries = await db.dailyEntries.bulkGet(keys);
    setDays(entries.filter((e): e is DailyEntry => !!e));
    setWeekly(
      ws ?? {
        weekKey,
        score: null,
        weekReview: "",
        nextWeekPlan: "",
        updatedAt: Date.now(),
      },
    );
  }

  useEffect(() => {
    void load();
  }, [weekKey]);

  const habitById = useMemo(() => new Map(habits.map((h) => [h.id, h])), [habits]);

  const dayMap = useMemo(() => {
    const m = new Map<string, DailyEntry>();
    for (const d of days) m.set(d.dateKey, d);
    return m;
  }, [days]);

  const relevantHabitIds = useMemo(() => {
    const ids = new Set<string>();
    for (const h of habits) {
      if (h.archivedAt === null) ids.add(h.id);
    }
    for (const k of keys) {
      const row = dayMap.get(k);
      if (!row) continue;
      for (const id of Object.keys(row.habitValues)) ids.add(id);
    }
    return [...ids];
  }, [habits, keys, dayMap]);

  const persistWeekly = useMemo(
    () =>
      debounce(async (row: WeeklyEntry) => {
        try {
          await db.weeklyEntries.put({ ...row, updatedAt: Date.now() });
        } catch (e) {
          console.error(e);
        }
      }, 400),
    [],
  );

  const updateWeekly = useCallback(
    (patch: Partial<WeeklyEntry>) => {
      setWeekly((prev) => {
        if (!prev) return prev;
        const merged = { ...prev, ...patch };
        persistWeekly(merged);
        return merged;
      });
    },
    [persistWeekly],
  );

  if (!weekly) return <p>加载中…</p>;

  return (
    <section>
      <h1>
        {banner.shortLabel}（{banner.rangeZh}）
      </h1>
      <p style={{ color: "#666" }}>周键：{banner.weekKey}</p>
      <Link to="/stats">← 返回统计</Link>
      <h2>本周习惯概览</h2>
      {relevantHabitIds.length === 0 ? <p>本周暂无记录。</p> : null}
      <ul>
        {relevantHabitIds.map((id) => {
          const h = habitById.get(id);
          const label = h?.name ?? "未知习惯（可能已删档）";
          if (h?.type === "numeric" || (!h && Object.values(dayMap).some((d) => typeof d.habitValues[id] === "number"))) {
            const s = summarizeNumericWeek(keys, (k) => {
              const v = dayMap.get(k)?.habitValues[id];
              return typeof v === "number" ? v : null;
            });
            return (
              <li key={id}>
                <strong>{label}</strong>：合计 {s.sum}，{s.daysWithValue} 天有记录
                {s.average !== undefined ? `，日均 ${s.average.toFixed(2)}` : ""}
              </li>
            );
          }
          const s = summarizeToggleWeek(keys, (k) => {
            const v = dayMap.get(k)?.habitValues[id];
            if (v === true) return true;
            if (v === false) return false;
            return null;
          });
          return (
            <li key={id}>
              <strong>{label}</strong>：完成 {s.doneDays} 天，未完成 {s.falseDays} 天，未记录 {s.unrecordedDays} 天
            </li>
          );
        })}
      </ul>
      <h2>周总结</h2>
      <label>
        周总分（手动）
        <input
          type="number"
          value={weekly.score ?? ""}
          onChange={(e) => {
            const raw = e.target.value;
            updateWeekly({ score: raw === "" ? null : Number(raw) });
          }}
        />
      </label>
      <label style={{ display: "block", marginTop: 8 }}>
        周回顾
        <textarea
          style={{ width: "100%", minHeight: 100 }}
          value={weekly.weekReview}
          onChange={(e) => updateWeekly({ weekReview: e.target.value })}
        />
      </label>
      <label style={{ display: "block", marginTop: 8 }}>
        下周计划
        <textarea
          style={{ width: "100%", minHeight: 100 }}
          value={weekly.nextWeekPlan}
          onChange={(e) => updateWeekly({ nextWeekPlan: e.target.value })}
        />
      </label>
    </section>
  );
}
```

---

### Task 9: Stats page

**Files:**

- Modify: `src/pages/StatsPage.tsx`
- **Step 1: List weeks**

Query `db.weeklyEntries` orderBy `weekKey` descending. For each row, compute banner using `dateFromWeekKey(row.weekKey)` + `formatWeekBanner`.

Also include weeks that have daily data but no weekly row: optional YAGNI for MVP — **spec says stats show weekly score**; skip orphan weeks or derive week keys from distinct daily entries. Minimal: **only list `weeklyEntries`** plus always show link 「当前周」.

- **Step 2: Commit**

```bash
git add src/pages/StatsPage.tsx
git commit -m "feat: stats week list"
```

`**StatsPage.tsx` reference:**

```typescript
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../db/database";
import type { WeeklyEntry } from "../db/types";
import { dateFromWeekKey, formatWeekBanner, weekKeyISO } from "../lib/dates";

export default function StatsPage() {
  const [rows, setRows] = useState<WeeklyEntry[]>([]);

  useEffect(() => {
    void db.weeklyEntries.orderBy("weekKey").reverse().toArray().then(setRows);
  }, []);

  return (
    <section>
      <h1>统计</h1>
      <p>
        <Link to={`/week/${weekKeyISO(new Date())}`}>前往本周</Link>
      </p>
      {rows.length === 0 ? <p>还没有周总结记录，去「本周」填写周总分后会出现在这里。</p> : null}
      <ul>
        {rows.map((r) => {
          const b = formatWeekBanner(dateFromWeekKey(r.weekKey));
          return (
            <li key={r.weekKey} style={{ marginBottom: "0.5rem" }}>
              <Link to={`/week/${r.weekKey}`}>
                {b.shortLabel}（{b.rangeZh}）
              </Link>
              {r.score !== null ? ` — 周分：${r.score}` : " — 未打分"}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

---

### Task 10: Toasts for IndexedDB errors

**Files:**

- Create: `src/hooks/useToast.tsx`
- Modify: `src/main.tsx` (provider)
- Modify: `TodayPage.tsx`, `WeekPage.tsx` (use toast on catch)
- **Step 1: Implement simple context**

```typescript
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastCtx = { show: (msg: string) => void };

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 3500);
  }, []);
  const v = useMemo(() => ({ show }), [show]);
  return (
    <Ctx.Provider value={v}>
      {children}
      {msg ? (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            background: "#333",
            color: "#fff",
            padding: "0.75rem 1rem",
            borderRadius: 8,
          }}
        >
          {msg}
        </div>
      ) : null}
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("ToastProvider missing");
  return v;
}
```

Wrap `<App />` with `ToastProvider` inside `BrowserRouter`.

Replace `console.error` in persist catch with `show('保存失败，请稍后重试')`.

- **Step 2: Commit**

```bash
git add src/hooks/useToast.tsx src/main.tsx src/pages/TodayPage.tsx src/pages/WeekPage.tsx
git commit -m "feat: toast on persistence errors"
```

---

### Task 11: README + polish

**Files:**

- Create: `README.md`
- Modify: `src/index.css` (optional spacing)
- **Step 1: README**

Document:

- `npm install`, `npm run dev`, `npm run test:run`, `npm run build`
- Link to spec `docs/superpowers/specs/2026-04-11-daily-life-tracker-design.md`
- Note: data local-only, same browser profile
- **Step 2: Final verification**

Run:

```bash
npm run test:run
npm run build
```

Expected: tests green, `dist/` produced.

- **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: readme for daily tracker"
```

---

## Spec coverage checklist (self-review)


| Spec section           | Tasks                               |
| ---------------------- | ----------------------------------- |
| SPA + IndexedDB        | Tasks 1, 4                          |
| 周一至周日 + `wk` + ISO key | Task 2, 8                           |
| 习惯类型 + 归档              | Task 6                              |
| 日记录 + 防抖               | Task 7                              |
| 周汇总规则                  | Tasks 3, 8                          |
| 周总分与文字                 | Task 8                              |
| 统计列表                   | Task 9                              |
| 错误提示                   | Task 10                             |
| 测试                     | Tasks 2–3, 8 `dateFromWeekKey` test |


**Placeholder scan:** No TBD/TODO left in steps; Task 6 Step 3 was replaced by full file.

**Type consistency:** `HabitValueMap` uses `boolean | number | null`; toggles never use `null` in UI after first interaction — spec allows unrecorded as missing key: implementer may omit key until user touches control, or treat missing as `null` in aggregation (aggregation already uses `get` returning null).

**Note:** `TodayPage` initializes `habitValues` empty — first render of toggle with `v === undefined` shows unchecked; `summarizeToggleWeek` treats missing day as `null` unrecorded. If user checks then unchecks, value becomes `false` (spec: 未完成). Good.

---

## Execution handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-11-daily-life-tracker.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach do you want?**