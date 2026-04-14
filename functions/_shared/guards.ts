export interface AuthUser {
  id: string;
  email: string;
}

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function requireUser<TUser extends AuthUser | null | undefined>(
  user: TUser
): AuthUser {
  if (!user) {
    throw new HttpError(401, "Unauthorized");
  }
  return user;
}

export function requireMethod(request: Request, method: string): void {
  if (request.method.toUpperCase() !== method.toUpperCase()) {
    throw new HttpError(405, `Method ${request.method} not allowed`);
  }
}

export function requirePathPart(value: string | undefined, name: string): string {
  if (!value || !value.trim()) {
    throw new HttpError(400, `Invalid ${name}`);
  }
  const trimmed = value.trim();
  if (trimmed.includes("/")) {
    throw new HttpError(400, `Invalid ${name}`);
  }
  return trimmed;
}

export function requirePathParam(value: string | undefined, name: string): string {
  return requirePathPart(value, name);
}

export async function requireJsonBody<T>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(400, "Expected JSON body");
  }

  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

/** Alias for {@link requireJsonBody} — validates `Content-Type: application/json` and parses the body. */
export async function requireJson<T = unknown>(request: Request): Promise<T> {
  return requireJsonBody<T>(request);
}

export function json(data: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}
