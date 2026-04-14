import { parseSessionToken } from "../../_shared/auth";
import { createAuthRepository } from "../../_shared/db";
import { HttpError, requireUser } from "../../_shared/guards";

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface RequestContext {
  request: Request;
  env: { DB: D1Database };
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

interface CreateHabitBody {
  name?: unknown;
  type?: unknown;
  unit?: unknown;
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

export async function onRequestGet(context: RequestContext): Promise<Response> {
  try {
    const user = await requireSessionUser(context);
    const result = await context.env.DB.prepare(
      "SELECT id, name, type, unit, sort_order, archived_at, created_at FROM habits WHERE user_id = ? ORDER BY sort_order ASC"
    )
      .bind(user.id)
      .all<HabitRow>();

    return json({ habits: (result.results ?? []).map(toHabit) }, { status: 200 });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function onRequestPost(context: RequestContext): Promise<Response> {
  try {
    const user = await requireSessionUser(context);

    let body: CreateHabitBody;
    try {
      body = (await context.request.json()) as CreateHabitBody;
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const type = body.type;
    const unitInput = body.unit;

    if (!name || !isHabitType(type)) {
      return json({ error: "Invalid habit payload" }, { status: 400 });
    }

    const unit =
      type === "numeric" && typeof unitInput === "string" && unitInput.trim()
        ? unitInput.trim()
        : null;

    const maxRow = await context.env.DB.prepare(
      "SELECT MAX(sort_order) AS max_sort_order FROM habits WHERE user_id = ?"
    )
      .bind(user.id)
      .first<{ max_sort_order: number | null }>();
    const maxSortOrder =
      maxRow && maxRow.max_sort_order !== null ? Number(maxRow.max_sort_order) : 0;

    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const sortOrder = maxSortOrder + 1;

    await context.env.DB.prepare(
      "INSERT INTO habits (id, user_id, name, type, unit, sort_order, archived_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
      .bind(id, user.id, name, type, unit, sortOrder, null, createdAt)
      .run();

    return json(
      {
        habit: {
          id,
          name,
          type,
          unit,
          sortOrder,
          archivedAt: null,
          createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
