import { parseSessionToken } from "../../_shared/auth";
import { createAuthRepository } from "../../_shared/db";
import { HttpError, requireUser } from "../../_shared/guards";

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface RequestContext {
  request: Request;
  env: { DB: D1Database };
}

interface WeeklyEntryRow {
  week_key: string;
  score: number | null;
  week_review: string;
  next_week_plan: string;
  updated_at: number;
}

interface DailyEntryRow {
  date_key: string;
  habit_values_json: string;
}

type HabitValue = boolean | number | null;
type HabitValueMap = Record<string, HabitValue>;

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

function weekDateKeysFromWeekKey(weekKey: string): string[] {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) return [];

  const year = Number.parseInt(m[1], 10);
  const week = Number.parseInt(m[2], 10);
  if (!Number.isInteger(year) || !Number.isInteger(week) || week < 1 || week > 53) {
    return [];
  }

  // ISO week 1 is the week containing Jan 4.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4IsoDay = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay();
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4IsoDay + 1);

  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);

  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    keys.push(`${y}-${mo}-${day}`);
  }
  return keys;
}

function isRecordedHabitValue(value: unknown): boolean {
  if (value === true) return true;
  return typeof value === "number" && Number.isFinite(value);
}

export function hasAnyHabitRecord(habitValuesJson: string): boolean {
  try {
    const parsed = JSON.parse(habitValuesJson) as HabitValueMap;
    if (!parsed || typeof parsed !== "object") return false;
    return Object.values(parsed).some((value) => isRecordedHabitValue(value));
  } catch {
    return false;
  }
}

function buildDayFlags(dateKeys: string[], rows: DailyEntryRow[]): boolean[] {
  const byDate = new Map<string, string>();
  for (const row of rows) {
    byDate.set(row.date_key, row.habit_values_json);
  }
  return dateKeys.map((dateKey) => hasAnyHabitRecord(byDate.get(dateKey) ?? ""));
}

async function requireSessionUser(context: RequestContext) {
  const sessionToken = parseSessionToken(context.request.headers.get("Cookie"));
  if (!sessionToken) {
    throw new HttpError(401, "Unauthorized");
  }

  const repo = createAuthRepository(context.env as { DB: { prepare: unknown } });
  const session = await repo.findSessionByToken(sessionToken);
  const now = Math.floor(Date.now() / 1000);
  if (!session || session.expiresAt <= now) {
    if (session) {
      await repo.deleteSession(sessionToken);
    }
    throw new HttpError(401, "Unauthorized");
  }

  return requireUser(await repo.findUserById(session.userId));
}

export async function onRequestGet(context: RequestContext): Promise<Response> {
  try {
    const user = await requireSessionUser(context);
    const result = await context.env.DB.prepare(
      "SELECT week_key, score, week_review, next_week_plan, updated_at FROM weekly_entries WHERE user_id = ? ORDER BY week_key DESC"
    )
      .bind(user.id)
      .all<WeeklyEntryRow>();

    const entries = (result.results ?? []).map((row) => ({
      weekKey: row.week_key,
      score: row.score === null ? null : Number(row.score),
      weekReview: row.week_review,
      nextWeekPlan: row.next_week_plan,
      updatedAt: Number(row.updated_at),
    }));

    const activityByWeek = new Map<string, { dayFlags: boolean[]; recordedDays: number }>();
    await Promise.all(
      entries.map(async (entry) => {
        const dateKeys = weekDateKeysFromWeekKey(entry.weekKey);
        if (dateKeys.length !== 7) {
          activityByWeek.set(entry.weekKey, {
            dayFlags: [false, false, false, false, false, false, false],
            recordedDays: 0,
          });
          return;
        }

        const placeholders = dateKeys.map(() => "?").join(", ");
        const dailyResult = await context.env.DB.prepare(
          `SELECT date_key, habit_values_json FROM daily_entries WHERE user_id = ? AND date_key IN (${placeholders})`
        )
          .bind(user.id, ...dateKeys)
          .all<DailyEntryRow>();

        const dayFlags = buildDayFlags(dateKeys, dailyResult.results ?? []);
        activityByWeek.set(entry.weekKey, {
          dayFlags,
          recordedDays: dayFlags.filter(Boolean).length,
        });
      })
    );

    const entriesWithActivity = entries.map((entry) => {
      const activity = activityByWeek.get(entry.weekKey) ?? {
        dayFlags: [false, false, false, false, false, false, false],
        recordedDays: 0,
      };
      return {
        ...entry,
        recordedDays: activity.recordedDays,
        dayFlags: activity.dayFlags,
      };
    });

    return json({ entries: entriesWithActivity }, { status: 200 });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
