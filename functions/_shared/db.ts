interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; changes?: number }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface BindingsWithDb {
  DB: D1Database;
}

export interface DbSession {
  id: string;
  user_id: string;
  expires_at: number;
}

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: number;
}

export function getDb(bindings: BindingsWithDb): D1Database {
  return bindings.DB;
}

export async function queryOne<T extends Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T | null> {
  return db.prepare(sql).bind(...params).first<T>();
}

export async function queryAll<T extends Record<string, unknown>>(
  db: D1Database,
  sql: string,
  ...params: unknown[]
): Promise<T[]> {
  const result = await db.prepare(sql).bind(...params).all<T>();
  return result.results;
}

export async function exec(db: D1Database, sql: string, ...params: unknown[]): Promise<void> {
  const result = await db.prepare(sql).bind(...params).run();
  if (!result.success) {
    throw new Error("D1 statement did not succeed");
  }
}

export function unixNow(): number {
  return Math.floor(Date.now() / 1000);
}

export function newId(): string {
  return crypto.randomUUID();
}

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserById(userId: string): Promise<UserRecord | null>;
  createUser(user: UserRecord): Promise<void>;
  createSession(session: SessionRecord): Promise<void>;
  findSessionByToken(token: string): Promise<SessionRecord | null>;
  deleteSession(token: string): Promise<void>;
}

function asUserRecord(row: Record<string, unknown> | null): UserRecord | null {
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    createdAt: Number(row.created_at),
  };
}

function asSessionRecord(row: Record<string, unknown> | null): SessionRecord | null {
  if (!row) return null;
  return {
    token: String(row.id),
    userId: String(row.user_id),
    expiresAt: Number(row.expires_at),
  };
}

export function createAuthRepository(bindings: BindingsWithDb): AuthRepository {
  const db = getDb(bindings);
  return {
    async findUserByEmail(email: string): Promise<UserRecord | null> {
      const row = await queryOne<Record<string, unknown>>(
        db,
        "SELECT id, email, password_hash, created_at FROM users WHERE email = ?",
        email
      );
      return asUserRecord(row);
    },

    async findUserById(userId: string): Promise<UserRecord | null> {
      const row = await queryOne<Record<string, unknown>>(
        db,
        "SELECT id, email, password_hash, created_at FROM users WHERE id = ?",
        userId
      );
      return asUserRecord(row);
    },

    async createUser(user: UserRecord): Promise<void> {
      await exec(
        db,
        "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
        user.id,
        user.email,
        user.passwordHash,
        user.createdAt
      );
    },

    async createSession(session: SessionRecord): Promise<void> {
      await exec(
        db,
        "INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
        session.token,
        session.userId,
        session.expiresAt,
        unixNow()
      );
    },

    async findSessionByToken(token: string): Promise<SessionRecord | null> {
      const row = await queryOne<Record<string, unknown>>(
        db,
        "SELECT id, user_id, expires_at FROM sessions WHERE id = ?",
        token
      );
      return asSessionRecord(row);
    },

    async deleteSession(token: string): Promise<void> {
      await exec(db, "DELETE FROM sessions WHERE id = ?", token);
    },
  };
}
