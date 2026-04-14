import { describe, expect, it } from "vitest";
import { buildSessionCookie, parseCookie } from "../../../functions/_shared/auth";

describe("auth cookie helpers", () => {
  it("parseCookie extracts `session`", () => {
    expect(parseCookie("a=1; session=abc").session).toBe("abc");
  });

  it("buildSessionCookie includes HttpOnly and session token", () => {
    const cookie = buildSessionCookie("token", 3600);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("session=token");
  });
});
