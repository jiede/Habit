import { expect, it } from "vitest";
import { parseCookie, buildSessionCookie } from "../../../functions/_shared/auth";

it("parseCookie extracts `session`", () => {
  expect(parseCookie("a=1; session=abc").session).toBe("abc");
});

it("buildSessionCookie includes HttpOnly and session token", () => {
  const c = buildSessionCookie("token", 3600);
  expect(c).toContain("HttpOnly");
  expect(c).toContain("session=token");
});
