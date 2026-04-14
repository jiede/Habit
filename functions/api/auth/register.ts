import {
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from "../../_shared/auth";
import { createAuthRepository } from "../../_shared/db";

interface RegisterBody {
  email?: unknown;
  password?: unknown;
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

export async function onRequestPost(context: {
  request: Request;
  env: { DB: unknown };
}): Promise<Response> {
  let body: RegisterBody;
  try {
    body = (await context.request.json()) as RegisterBody;
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return json({ error: "Invalid email or password" }, { status: 400 });
  }

  const repo = createAuthRepository(context.env as { DB: { prepare: unknown } });
  const existing = await repo.findUserByEmail(email);
  if (existing) {
    return json({ error: "Email already registered" }, { status: 409 });
  }

  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash: await hashPassword(password),
    createdAt: now,
  };

  await repo.createUser(user);
  return json({ id: user.id, email: user.email }, { status: 201 });
}
