import { expect, it } from "vitest";
import { parseCookie, buildSessionCookie, hashPassword, verifyPassword } from "../../../functions/_shared/auth";

it("parses session cookie", () => {
  expect(parseCookie("a=1; session=abc").session).toBe("abc");
});

it("builds httponly cookie", () => {
  const c = buildSessionCookie("token", 3600);
  expect(c).toContain("HttpOnly");
  expect(c).toContain("session=token");
});

it("uses worker-safe pbkdf2 rounds", async () => {
  const password = "very-secure-password";
  const hash = await hashPassword(password);
  expect(hash).toContain("pbkdf2$100000$");
  await expect(verifyPassword(password, hash)).resolves.toBe(true);
});
