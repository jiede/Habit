const HASH_ITERATIONS = 210_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;
const SESSION_COOKIE_NAME = "session";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;

const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    throw new Error("Invalid hex value");
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const digest = await pbkdf2(password, salt, HASH_ITERATIONS);
  return `pbkdf2$${HASH_ITERATIONS}$${toHex(salt)}$${toHex(digest)}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [algo, iterationText, saltHex, digestHex] = hash.split("$");
  if (algo !== "pbkdf2" || !iterationText || !saltHex || !digestHex) return false;

  const iterations = Number(iterationText);
  if (!Number.isInteger(iterations) || iterations <= 0) return false;

  try {
    const salt = fromHex(saltHex);
    const expected = fromHex(digestHex);
    const actual = await pbkdf2(password, salt, iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function newSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toHex(bytes);
}

export function parseCookie(cookieHeader: string | null | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const parsed: Record<string, string> = {};

  for (const segment of cookieHeader.split(";")) {
    const item = segment.trim();
    if (!item) continue;

    const eqIndex = item.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = decodeURIComponent(item.slice(0, eqIndex).trim());
    const value = decodeURIComponent(item.slice(eqIndex + 1).trim());
    parsed[key] = value;
  }

  return parsed;
}

export function buildSessionCookie(token: string, maxAgeSec: number): string {
  const safeAge = Math.max(0, Math.floor(maxAgeSec));
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${safeAge}; HttpOnly; Path=/; SameSite=Lax; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Path=/; SameSite=Lax; Secure`;
}

export function parseSessionToken(cookieHeader: string | null | undefined): string | null {
  return parseCookie(cookieHeader)[SESSION_COOKIE_NAME] ?? null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(email));
}

export function isValidPassword(password: string): boolean {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}
