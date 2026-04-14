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

    return json({ entries }, { status: 200 });
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

function toWeeklyEntry(row: WeeklyEntryRow) {
  return {
    weekKey: row.week_key,
    score: row.score === null ? null : Number(row.score),
    weekReview: row.week_review,
    nextWeekPlan: row.next_week_plan,
    updatedAt: Number(row.updated_at),
  };
}

export async function onRequestGet(context: RequestContext): Promise<Response> {
  try {
    const user = await requireSessionUser(context);
    const result = await context.env.DB.prepare(
      "SELECT week_key, score, week_review, next_week_plan, updated_at FROM weekly_entries WHERE user_id = ? ORDER BY week_key DESC"
    )
      .bind(user.id)
      .all<WeeklyEntryRow>();

    return json({ entries: (result.results ?? []).map(toWeeklyEntry) }, { status: 200 });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
