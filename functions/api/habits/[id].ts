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
  params: { id?: string };
}

interface HabitRow {
  id: string;
  name: string;
  type: string;
  unit: string | null;
  sort_order: number;
  archived_at: number | null;
  created_at: number;
}

interface PatchHabitBody {
  name?: unknown;
  type?: unknown;
  unit?: unknown;
  sortOrder?: unknown;
  archivedAt?: unknown;
}

type HabitType = "toggle" | "numeric";

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

function isHabitType(value: unknown): value is HabitType {
  return value === "toggle" || value === "numeric";
}

function toHabit(row: HabitRow) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    unit: row.unit,
    sortOrder: Number(row.sort_order),
    archivedAt: row.archived_at === null ? null : Number(row.archived_at),
    createdAt: Number(row.created_at),
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

export async function onRequestPatch(context: RequestContext): Promise<Response> {
  try {
    const user = await requireSessionUser(context);
    const habitId = context.params.id;
    if (!habitId) {
      return json({ error: "Habit id is required" }, { status: 400 });
    }

    let body: PatchHabitBody;
    try {
      body = (await context.request.json()) as PatchHabitBody;
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const existing = await context.env.DB.prepare(
      "SELECT id, name, type, unit, sort_order, archived_at, created_at FROM habits WHERE id = ? AND user_id = ?"
    )
      .bind(habitId, user.id)
      .first<HabitRow>();

    if (!existing) {
      return json({ error: "Habit not found" }, { status: 404 });
    }

    const nextType = body.type === undefined ? existing.type : body.type;
    if (!isHabitType(nextType)) {
      return json({ error: "Invalid type" }, { status: 400 });
    }

    const nextName =
      body.name === undefined
        ? existing.name
        : typeof body.name === "string"
          ? body.name.trim()
          : "";
    if (!nextName) {
      return json({ error: "Invalid name" }, { status: 400 });
    }

    const nextSortOrder =
      body.sortOrder === undefined
        ? Number(existing.sort_order)
        : Number(body.sortOrder);
    if (!Number.isInteger(nextSortOrder) || nextSortOrder <= 0) {
      return json({ error: "Invalid sortOrder" }, { status: 400 });
    }

    let nextArchivedAt: number | null;
    if (body.archivedAt === undefined) {
      nextArchivedAt =
        existing.archived_at === null ? null : Number(existing.archived_at);
    } else if (body.archivedAt === null) {
      nextArchivedAt = null;
    } else {
      const parsedArchivedAt = Number(body.archivedAt);
      if (!Number.isFinite(parsedArchivedAt)) {
        return json({ error: "Invalid archivedAt" }, { status: 400 });
      }
      nextArchivedAt = parsedArchivedAt;
    }

    let nextUnit: string | null;
    if (nextType === "toggle") {
      nextUnit = null;
    } else if (body.unit === undefined) {
      nextUnit = existing.unit;
    } else if (body.unit === null) {
      nextUnit = null;
    } else if (typeof body.unit === "string") {
      nextUnit = body.unit.trim() ? body.unit.trim() : null;
    } else {
      return json({ error: "Invalid unit" }, { status: 400 });
    }

    await context.env.DB.prepare(
      "UPDATE habits SET name = ?, type = ?, unit = ?, sort_order = ?, archived_at = ? WHERE id = ? AND user_id = ?"
    )
      .bind(
        nextName,
        nextType,
        nextUnit,
        nextSortOrder,
        nextArchivedAt,
        habitId,
        user.id
      )
      .run();

    const updated = await context.env.DB.prepare(
      "SELECT id, name, type, unit, sort_order, archived_at, created_at FROM habits WHERE id = ? AND user_id = ?"
    )
      .bind(habitId, user.id)
      .first<HabitRow>();

    if (!updated) {
      return json({ error: "Habit not found" }, { status: 404 });
    }

    return json({ habit: toHabit(updated) }, { status: 200 });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
