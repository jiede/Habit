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
  params: { weekKey?: string };
}

interface WeeklyEntry {
  weekKey: string;
  score: number | null;
  weekReview: string;
  nextWeekPlan: string;
  updatedAt: number;
}

interface WeeklyEntryRow {
  week_key: string;
  score: number | null;
  week_review: string;
  next_week_plan: string;
  updated_at: number;
}

interface PutWeeklyBody {
  score?: unknown;
  weekReview?: unknown;
  nextWeekPlan?: unknown;
}

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

function defaultWeeklyEntry(weekKey: string): WeeklyEntry {
  return {
    weekKey,
    score: null,
    weekReview: "",
    nextWeekPlan: "",
    updatedAt: Date.now(),
  };
}

function toWeeklyEntry(row: WeeklyEntryRow): WeeklyEntry {
  return {
    weekKey: row.week_key,
    score: row.score === null ? null : Number(row.score),
    weekReview: row.week_review,
    nextWeekPlan: row.next_week_plan,
    updatedAt: Number(row.updated_at),
  };
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
    const weekKey = context.params.weekKey;
    if (!weekKey) {
      return json({ error: "weekKey is required" }, { status: 400 });
    }

    const row = await context.env.DB.prepare(
      "SELECT week_key, score, week_review, next_week_plan, updated_at FROM weekly_entries WHERE user_id = ? AND week_key = ?"
    )
      .bind(user.id, weekKey)
      .first<WeeklyEntryRow>();

    return json({ entry: row ? toWeeklyEntry(row) : defaultWeeklyEntry(weekKey) }, { status: 200 });
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
    const weekKey = context.params.weekKey;
    if (!weekKey) {
      return json({ error: "weekKey is required" }, { status: 400 });
    }

    let body: PutWeeklyBody;
    try {
      body = (await context.request.json()) as PutWeeklyBody;
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (
      !body ||
      typeof body !== "object" ||
      body.score === undefined ||
      body.weekReview === undefined ||
      body.nextWeekPlan === undefined
    ) {
      return json({ error: "Invalid weekly payload" }, { status: 400 });
    }

    const nextScore =
      body.score === null ? null : Number.isFinite(Number(body.score)) ? Number(body.score) : NaN;
    if (
      Number.isNaN(nextScore) ||
      typeof body.weekReview !== "string" ||
      typeof body.nextWeekPlan !== "string"
    ) {
      return json({ error: "Invalid weekly payload" }, { status: 400 });
    }

    const updatedAt = Date.now();
    await context.env.DB.prepare(
      `INSERT INTO weekly_entries (user_id, week_key, score, week_review, next_week_plan, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, week_key) DO UPDATE SET
         score = excluded.score,
         week_review = excluded.week_review,
         next_week_plan = excluded.next_week_plan,
         updated_at = excluded.updated_at`
    )
      .bind(user.id, weekKey, nextScore, body.weekReview, body.nextWeekPlan, updatedAt)
      .run();

    return json(
      {
        entry: {
          weekKey,
          score: nextScore,
          weekReview: body.weekReview,
          nextWeekPlan: body.nextWeekPlan,
          updatedAt,
        } satisfies WeeklyEntry,
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
  params: { weekKey?: string };
}

interface WeeklyEntryRow {
  user_id: string;
  week_key: string;
  score: number | null;
  week_review: string;
  next_week_plan: string;
  updated_at: number;
}

interface PutWeeklyBody {
  score?: unknown;
  weekReview?: unknown;
  nextWeekPlan?: unknown;
}

type WeeklyEntryResponse = {
  weekKey: string;
  score: number | null;
  weekReview: string;
  nextWeekPlan: string;
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

function isWeekKey(value: string): boolean {
  return /^\d{4}-W\d{2}$/.test(value);
}

function toWeeklyEntryResponse(row: WeeklyEntryRow): WeeklyEntryResponse {
  return {
    weekKey: row.week_key,
    score: row.score === null ? null : Number(row.score),
    weekReview: row.week_review,
    nextWeekPlan: row.next_week_plan,
    updatedAt: Number(row.updated_at),
  };
}

function defaultWeeklyEntry(weekKey: string): WeeklyEntryResponse {
  return {
    weekKey,
    score: null,
    weekReview: "",
    nextWeekPlan: "",
    updatedAt: Date.now(),
  };
}

export async function onRequestGet(context: RequestContext): Promise<Response> {
  try {
    const user = await requireSessionUser(context);
    const weekKey = context.params.weekKey;
    if (!weekKey || !isWeekKey(weekKey)) {
      return json({ error: "Invalid weekKey" }, { status: 400 });
    }

    const row = await context.env.DB.prepare(
      "SELECT user_id, week_key, score, week_review, next_week_plan, updated_at FROM weekly_entries WHERE user_id = ? AND week_key = ?"
    )
      .bind(user.id, weekKey)
      .first<WeeklyEntryRow>();

    return json({ entry: row ? toWeeklyEntryResponse(row) : defaultWeeklyEntry(weekKey) }, { status: 200 });
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
    const weekKey = context.params.weekKey;
    if (!weekKey || !isWeekKey(weekKey)) {
      return json({ error: "Invalid weekKey" }, { status: 400 });
    }

    let body: PutWeeklyBody;
    try {
      body = (await context.request.json()) as PutWeeklyBody;
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const score =
      body.score === null
        ? null
        : typeof body.score === "number" && Number.isFinite(body.score)
          ? body.score
          : undefined;
    if (
      score === undefined ||
      typeof body.weekReview !== "string" ||
      typeof body.nextWeekPlan !== "string"
    ) {
      return json({ error: "Invalid weekly payload" }, { status: 400 });
    }

    const updatedAt = Date.now();
    await context.env.DB.prepare(
      "INSERT INTO weekly_entries (user_id, week_key, score, week_review, next_week_plan, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, week_key) DO UPDATE SET score = excluded.score, week_review = excluded.week_review, next_week_plan = excluded.next_week_plan, updated_at = excluded.updated_at"
    )
      .bind(user.id, weekKey, score, body.weekReview, body.nextWeekPlan, updatedAt)
      .run();

    return json(
      {
        entry: {
          weekKey,
          score,
          weekReview: body.weekReview,
          nextWeekPlan: body.nextWeekPlan,
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
