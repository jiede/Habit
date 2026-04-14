interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface BindingsWithDb {
  DB: D1Database;
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
