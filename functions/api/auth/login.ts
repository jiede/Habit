import {
  buildSessionCookie,
  isValidEmail,
  newSessionToken,
  normalizeEmail,
  verifyPassword,
} from "../../_shared/auth";
import { createAuthRepository } from "../../_shared/db";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

export async function onRequestPost(context: {
  request: Request;
  env: { DB: unknown };
}): Promise<Response> {
  let body: LoginBody;
  try {
    body = (await context.request.json()) as LoginBody;
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidEmail(email) || password.length === 0) {
    return json({ error: "Invalid email or password" }, { status: 400 });
  }

  const repo = createAuthRepository(context.env as { DB: { prepare: unknown } });
  const user = await repo.findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = newSessionToken();
  const now = Math.floor(Date.now() / 1000);
  await repo.createSession({
    token,
    userId: user.id,
    expiresAt: now + SESSION_TTL_SECONDS,
  });

  return json(
    { id: user.id, email: user.email },
    {
      status: 200,
      headers: {
        "Set-Cookie": buildSessionCookie(token, SESSION_TTL_SECONDS),
      },
    }
  );
}
