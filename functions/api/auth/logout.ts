import { clearSessionCookie, parseSessionToken } from "../../_shared/auth";
import { createAuthRepository } from "../../_shared/db";

export async function onRequestPost(context: {
  request: Request;
  env: { DB: unknown };
}): Promise<Response> {
  const sessionToken = parseSessionToken(context.request.headers.get("Cookie"));
  if (sessionToken) {
    const repo = createAuthRepository(context.env as { DB: { prepare: unknown } });
    await repo.deleteSession(sessionToken);
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": clearSessionCookie(),
    },
  });
}
