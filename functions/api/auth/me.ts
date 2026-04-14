import { parseSessionToken } from "../../_shared/auth";
import { createAuthRepository } from "../../_shared/db";
import { HttpError, requireUser } from "../../_shared/guards";

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init?.headers ?? {}),
    },
  });
}

export async function onRequestGet(context: {
  request: Request;
  env: { DB: unknown };
}): Promise<Response> {
  try {
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

    const user = requireUser(await repo.findUserById(session.userId));
    return json({ id: user.id, email: user.email }, { status: 200 });
  } catch (error) {
    if (error instanceof HttpError) {
      return json({ error: error.message }, { status: error.status });
    }
    return json({ error: "Internal Server Error" }, { status: 500 });
  }
}
