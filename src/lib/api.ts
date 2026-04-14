type HttpMethod = "GET" | "POST" | "PATCH" | "PUT";

interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type");
  return contentType !== null && contentType.includes("application/json");
}

async function request<T>(
  method: HttpMethod,
  path: string,
  options?: RequestOptions
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(options?.headers ?? {}),
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = isJsonResponse(response)
    ? ((await response.json()) as unknown)
    : null;

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Request failed: ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, { body });
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("PATCH", path, { body });
}

export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("PUT", path, { body });
}
