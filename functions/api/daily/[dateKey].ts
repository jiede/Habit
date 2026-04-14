import { parseSessionToken } from "../../_shared/auth";
import { createAuthRepository } from "../../_shared/db";
import { HttpError, requireUser } from "../../_shared/guards";

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface RequestContext {
  request: Request;
  env: { DB: D1Database };
  params: { dateKey?: string };
}

interface DailyEntryRow {
  user_id: string;
  date_key: string;
  habit_values_json: string;
  today_review: string;
  tomorrow_plan: string;
  updated_at: number;
}

interface PutDailyBody {
  habitValues?: unknown;
  todayReview?: unknown;
  tomorrowPlan?: unknown;
}

type DailyEntryResponse = {
  dateKey: string;
  habitValues: Record<string, boolean | number | null>;
  todayReview: string;
  tomorrowPlan: string;
  updatedAt: number;
};

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
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

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseHabitValues(value: unknown): Record<string, boolean | number | null> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const result: Record<string, boolean | number | null> = {};
  for (const [key, entryValue] of Object.entries(value)) {
    if (typeof key !== "string" || key.length === 0) {
      return null;
    }
    if (
      entryValue !== null &&
      typeof entryValue !== "boolean" &&
      typeof entryValue !== "number"
    ) {
      return null;
    }
    result[key] = entryValue;
  }
  return result;
}

function toDailyEntryResponse(row: DailyEntryRow): DailyEntryResponse {
  return {
    dateKey: row.date_key,
    habitValues: JSON.parse(row.habit_values_json) as Record<string, boolean | number | null>,
    todayReview: row.today_review,
    tomorrowPlan: row.tomorrow_plan,
    updatedAt: Number(row.updated_at),
  };
}

function defaultDailyEntry(dateKey: string): DailyEntryResponse {
  return {
    dateKey,
    habitValues: {},
    todayReview: "",
    tomorrowPlan: "",
    updatedAt: Date.now(),
  };
}

export async function onRequestGet(context: RequestContext): Promise<Response> {
  try {
    const user = await requireSessionUser(context);
    const dateKey = context.params.dateKey;
    if (!dateKey || !isDateKey(dateKey)) {
      return json({ error: "Invalid dateKey" }, { status: 400 });
    }

    const row = await context.env.DB.prepare(
      "SELECT user_id, date_key, habit_values_json, today_review, tomorrow_plan, updated_at FROM daily_entries WHERE user_id = ? AND date_key = ?"
    )
      .bind(user.id, dateKey)
      .first<DailyEntryRow>();

    return json({ entry: row ? toDailyEntryResponse(row) : defaultDailyEntry(dateKey) }, { status: 200 });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function onRequestPut(context: RequestContext): Promise<Response> {
  try {
    const user = await requireSessionUser(context);
    const dateKey = context.params.dateKey;
    if (!dateKey || !isDateKey(dateKey)) {
      return json({ error: "Invalid dateKey" }, { status: 400 });
    }

    let body: PutDailyBody;
    try {
      body = (await context.request.json()) as PutDailyBody;
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const habitValues = parseHabitValues(body.habitValues);
    if (
      habitValues === null ||
      typeof body.todayReview !== "string" ||
      typeof body.tomorrowPlan !== "string"
    ) {
      return json({ error: "Invalid daily payload" }, { status: 400 });
    }

    const updatedAt = Date.now();
    await context.env.DB.prepare(
      "INSERT INTO daily_entries (user_id, date_key, habit_values_json, today_review, tomorrow_plan, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, date_key) DO UPDATE SET habit_values_json = excluded.habit_values_json, today_review = excluded.today_review, tomorrow_plan = excluded.tomorrow_plan, updated_at = excluded.updated_at"
    )
      .bind(
        user.id,
        dateKey,
        JSON.stringify(habitValues),
        body.todayReview,
        body.tomorrowPlan,
        updatedAt
      )
      .run();

    return json(
      {
        entry: {
          dateKey,
          habitValues,
          todayReview: body.todayReview,
          tomorrowPlan: body.tomorrowPlan,
          updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
