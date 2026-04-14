export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(userId: string): Promise<UserRecord | null>;
  createUser(user: UserRecord): Promise<void>;
  createSession(session: SessionRecord): Promise<void>;
  findSessionByToken(token: string): Promise<SessionRecord | null>;
  deleteSession(token: string): Promise<void>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface BindingsWithDb {
  DB: D1Database;
}

function toUserRecord(row: Record<string, unknown> | null): UserRecord | null {
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    createdAt: Number(row.created_at),
  };
}

function toSessionRecord(
  row: Record<string, unknown> | null
): SessionRecord | null {
  if (!row) return null;
  return {
    token: String(row.id),
    userId: String(row.user_id),
    expiresAt: Number(row.expires_at),
  };
}

export function createAuthRepository(bindings: BindingsWithDb): AuthRepository {
  const db = bindings.DB;
  return {
    async findUserByEmail(email: string): Promise<UserRecord | null> {
      const row = await db
        .prepare(
          "SELECT id, email, password_hash, created_at FROM users WHERE email = ?"
        )
        .bind(email)
        .first<Record<string, unknown>>();
      return toUserRecord(row);
    },

    async findUserById(userId: string): Promise<UserRecord | null> {
      const row = await db
        .prepare(
          "SELECT id, email, password_hash, created_at FROM users WHERE id = ?"
        )
        .bind(userId)
        .first<Record<string, unknown>>();
      return toUserRecord(row);
    },

    async createUser(user: UserRecord): Promise<void> {
      await db
        .prepare(
          "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)"
        )
        .bind(user.id, user.email, user.passwordHash, user.createdAt)
        .run();
    },

    async createSession(session: SessionRecord): Promise<void> {
      await db
        .prepare(
          "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)"
        )
        .bind(
          session.token,
          session.userId,
          session.expiresAt,
          Math.floor(Date.now() / 1000)
        )
        .run();
    },

    async findSessionByToken(token: string): Promise<SessionRecord | null> {
      const row = await db
        .prepare("SELECT id, user_id, expires_at FROM sessions WHERE id = ?")
        .bind(token)
        .first<Record<string, unknown>>();
      return toSessionRecord(row);
    },

    async deleteSession(token: string): Promise<void> {
      await db.prepare("DELETE FROM sessions WHERE id = ?").bind(token).run();
    },
  };
}
