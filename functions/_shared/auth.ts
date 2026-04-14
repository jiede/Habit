const HASH_ALGO = "pbkdf2-sha256";
const HASH_ITERATIONS = 210_000;
const HASH_BYTES = 32;
const SALT_BYTES = 16;
const SESSION_COOKIE_NAME = "session";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 256;
const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    throw new Error("Invalid hex input");
  }

  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    out[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

async function derivePasswordDigest(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    baseKey,
    HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const digest = await derivePasswordDigest(password, salt, HASH_ITERATIONS);
  return `${HASH_ALGO}$${HASH_ITERATIONS}$${toHex(salt)}$${toHex(digest)}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [algo, roundsRaw, saltHex, digestHex] = hash.split("$");
  if (algo !== HASH_ALGO || !roundsRaw || !saltHex || !digestHex) return false;

  const rounds = Number.parseInt(roundsRaw, 10);
  if (!Number.isInteger(rounds) || rounds <= 0) return false;

  try {
    const salt = fromHex(saltHex);
    const expected = fromHex(digestHex);
    const actual = await derivePasswordDigest(password, salt, rounds);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function newSessionToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export function parseCookie(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  const cookies: Record<string, string> = {};
  for (const segment of cookieHeader.split(";")) {
    const item = segment.trim();
    if (!item) continue;

    const idx = item.indexOf("=");
    if (idx <= 0) continue;
    const key = decodeURIComponent(item.slice(0, idx).trim());
    const value = decodeURIComponent(item.slice(idx + 1).trim());
    cookies[key] = value;
  }
  return cookies;
}

export function buildSessionCookie(token: string, maxAgeSec: number): string {
  const safeMaxAge = Math.max(0, Math.floor(maxAgeSec));
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Max-Age=${safeMaxAge}; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

export function parseSessionToken(cookieHeader: string | null): string | null {
  return parseCookie(cookieHeader)[SESSION_COOKIE_NAME] ?? null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

export function isValidPassword(password: string): boolean {
  return (
    typeof password === "string" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password.length <= MAX_PASSWORD_LENGTH
  );
}
