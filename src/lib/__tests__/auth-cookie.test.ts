import { describe, expect, it } from "vitest";
import { parseCookie, buildSessionCookie } from "../../../functions/_shared/auth";

describe("auth cookies", () => {
  it("parses session cookie", () => {
    expect(parseCookie("a=1; session=abc").session).toBe("abc");
  });

  it("builds httponly cookie", () => {
    const c = buildSessionCookie("token", 3600);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("session=token");
  });
});
