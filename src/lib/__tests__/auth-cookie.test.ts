import { describe, it, expect } from "vitest";
import { parseCookie, buildSessionCookie } from "../../../functions/_shared/auth";

describe("parseCookie", () => {
  it('reads session token from "Cookie" header string', () => {
    expect(parseCookie("a=1; session=abc").session).toBe("abc");
  });
});

describe("buildSessionCookie", () => {
  it("builds session cookie with httpOnly attributes", () => {
    const cookie = buildSessionCookie("token", 3600);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("session=token");
  });
});
