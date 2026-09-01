export const OTP_LENGTH = 6;

const encoder = new TextEncoder();

/** Six digits. Rejection sampling so the last digits are not biased. */
export function generateOtp(length = OTP_LENGTH): string {
  const digits: number[] = [];
  const buf = new Uint8Array(1);
  while (digits.length < length) {
    crypto.getRandomValues(buf);
    // 250 is the largest multiple of 10 that fits in a byte.
    if (buf[0] >= 250) continue;
    digits.push(buf[0] % 10);
  }
  return digits.join("");
}

export async function hashOtp(pepper: string, email: string, code: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${email}:${code}`));
  return bytesToHex(new Uint8Array(sig));
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return bytesToHex(new Uint8Array(digest));
}

/** 32 random bytes, base64url — safe in an Authorization header. */
export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export function newUserId(): string {
  return crypto.randomUUID();
}

export function timingSafeEqual(a: string, b: string): boolean {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  const n = Math.max(left.length, right.length, 1);
  let diff = left.length ^ right.length;
  for (let i = 0; i < n; i++) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
