import {
  generateOtp,
  hashOtp,
  hashToken,
  newUserId,
  OTP_LENGTH,
  randomToken,
  timingSafeEqual,
} from "./crypto";
import { sendOtpEmail } from "./email";
import {
  bearerToken,
  clientIp,
  isValidEmail,
  json,
  parseDisplayName,
  parseEmailField,
  readJson,
} from "./http";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const REQUESTS_PER_EMAIL_HOUR = 5;
const REQUESTS_PER_IP_HOUR = 10;
const VERIFY_MAX_ATTEMPTS = 5;
const SESSION_DAYS = 90;
const HOUR_MS = 60 * 60 * 1000;
const OTP_RE = new RegExp(`^\\d{${OTP_LENGTH}}$`);

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

interface ChallengeRow {
  email: string;
  code_hash: string;
  expires_at: number;
  attempts: number;
  last_sent_at: number;
}

interface SessionRow {
  token_hash: string;
  user_id: string;
  expires_at: string;
}

export async function handleAuth(request: Request, env: Env, path: string): Promise<Response> {
  if (path === "/api/auth/request-code") return requestCode(request, env);
  if (path === "/api/auth/verify-code") return verifyCode(request, env);
  if (path === "/api/auth/logout") return logout(request, env);
  if (path === "/api/me") {
    if (request.method === "GET") return getMe(request, env);
    if (request.method === "PATCH") return patchMe(request, env);
    return json({ error: "Method not allowed." }, 405);
  }
  return json({ error: "Not found." }, 404);
}

async function requestCode(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const pepper = env.AUTH_PEPPER;
  const apiKey = env.RESEND_API_KEY;
  const from = env.AUTH_FROM;
  if (!pepper || !apiKey || !from) {
    console.error("auth_not_configured");
    return json({ error: "Couldn't send a code. Try again." }, 500);
  }

  const body = await readJson(request);
  if (body === null) return json({ error: "Invalid JSON body." }, 400);

  const email = parseEmailField(body);
  if (!isValidEmail(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const ip = clientIp(request);
  const now = Date.now();
  const hourAgo = now - HOUR_MS;

  try {
    const emailCount = await env.WAITLIST_DB.prepare(
      `SELECT COUNT(*) AS n FROM otp_sends WHERE email = ? AND sent_at >= ?`,
    )
      .bind(email, hourAgo)
      .first<{ n: number }>();
    if ((emailCount?.n ?? 0) >= REQUESTS_PER_EMAIL_HOUR) {
      return json({ error: "Too many tries. Try again later." }, 429, { "Retry-After": "3600" });
    }

    if (ip) {
      const ipCount = await env.WAITLIST_DB.prepare(
        `SELECT COUNT(*) AS n FROM otp_sends WHERE ip = ? AND sent_at >= ?`,
      )
        .bind(ip, hourAgo)
        .first<{ n: number }>();
      if ((ipCount?.n ?? 0) >= REQUESTS_PER_IP_HOUR) {
        return json({ error: "Too many tries. Try again later." }, 429, { "Retry-After": "3600" });
      }
    }

    const existing = await env.WAITLIST_DB.prepare(
      `SELECT last_sent_at FROM otp_challenges WHERE email = ? LIMIT 1`,
    )
      .bind(email)
      .first<{ last_sent_at: number }>();

    if (existing && now - existing.last_sent_at < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.last_sent_at)) / 1000);
      return json(
        { error: "Wait a moment, then try again." },
        429,
        { "Retry-After": String(Math.max(wait, 1)) },
      );
    }

    const code = generateOtp();
    const codeHash = await hashOtp(pepper, email, code);
    const expiresAt = now + CODE_TTL_MS;

    await env.WAITLIST_DB.prepare(
      `INSERT INTO otp_challenges (email, code_hash, expires_at, attempts, last_sent_at)
       VALUES (?, ?, ?, 0, ?)
       ON CONFLICT(email) DO UPDATE SET
         code_hash = excluded.code_hash,
         expires_at = excluded.expires_at,
         attempts = 0,
         last_sent_at = excluded.last_sent_at`,
    )
      .bind(email, codeHash, expiresAt, now)
      .run();

    const sent = await sendOtpEmail({ to: email, code, from, apiKey });
    if (!sent.ok) {
      await env.WAITLIST_DB.prepare(`DELETE FROM otp_challenges WHERE email = ?`).bind(email).run();
      return json({ error: "Couldn't send a code. Try again." }, 500);
    }

    await env.WAITLIST_DB.prepare(
      `INSERT INTO otp_sends (email, ip, sent_at) VALUES (?, ?, ?)`,
    )
      .bind(email, ip, now)
      .run();

    return json({ ok: true });
  } catch (error) {
    console.error("otp_request_failed", error);
    return json({ error: "Couldn't send a code. Try again." }, 500);
  }
}

async function verifyCode(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const pepper = env.AUTH_PEPPER;
  if (!pepper) {
    console.error("auth_not_configured");
    return json({ error: "Couldn't check that code. Try again." }, 500);
  }

  const body = await readJson(request);
  if (body === null) return json({ error: "Invalid JSON body." }, 400);

  const email = parseEmailField(body);
  const code =
    typeof body === "object" &&
    body !== null &&
    "code" in body &&
    typeof (body as { code: unknown }).code === "string"
      ? (body as { code: string }).code.trim()
      : "";

  if (!isValidEmail(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }
  if (!OTP_RE.test(code)) {
    return json({ error: "That code didn't match. Check it and try again." }, 400);
  }

  const now = Date.now();

  try {
    const challenge = await env.WAITLIST_DB.prepare(
      `SELECT email, code_hash, expires_at, attempts, last_sent_at FROM otp_challenges WHERE email = ? LIMIT 1`,
    )
      .bind(email)
      .first<ChallengeRow>();

    if (!challenge) {
      return json({ error: "That code has expired. Send a new one." }, 400);
    }

    if (now > challenge.expires_at) {
      await env.WAITLIST_DB.prepare(`DELETE FROM otp_challenges WHERE email = ?`).bind(email).run();
      return json({ error: "That code has expired. Send a new one." }, 400);
    }

    if (challenge.attempts >= VERIFY_MAX_ATTEMPTS) {
      await env.WAITLIST_DB.prepare(`DELETE FROM otp_challenges WHERE email = ?`).bind(email).run();
      return json({ error: "That code has expired. Send a new one." }, 400);
    }

    const expected = await hashOtp(pepper, email, code);
    if (!timingSafeEqual(expected, challenge.code_hash)) {
      const attempts = challenge.attempts + 1;
      if (attempts >= VERIFY_MAX_ATTEMPTS) {
        await env.WAITLIST_DB.prepare(`DELETE FROM otp_challenges WHERE email = ?`).bind(email).run();
        return json({ error: "That code has expired. Send a new one." }, 400);
      }
      await env.WAITLIST_DB.prepare(
        `UPDATE otp_challenges SET attempts = ? WHERE email = ?`,
      )
        .bind(attempts, email)
        .run();
      return json({ error: "That code didn't match. Check it and try again." }, 400);
    }

    await env.WAITLIST_DB.prepare(`DELETE FROM otp_challenges WHERE email = ?`).bind(email).run();

    const existing = await env.WAITLIST_DB.prepare(
      `SELECT id, email, display_name, created_at FROM users WHERE email = ? LIMIT 1`,
    )
      .bind(email)
      .first<UserRow>();

    const user = existing ?? (await insertUser(env, email));
    const token = randomToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(now + SESSION_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .slice(0, 19);

    await env.WAITLIST_DB.prepare(
      `INSERT INTO sessions (token_hash, user_id, expires_at, last_seen_at) VALUES (?, ?, ?, datetime('now'))`,
    )
      .bind(tokenHash, user.id, expiresAt)
      .run();

    return json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("otp_verify_failed", error);
    return json({ error: "Couldn't check that code. Try again." }, 500);
  }
}

async function insertUser(env: Env, email: string): Promise<UserRow> {
  const id = newUserId();
  await env.WAITLIST_DB.prepare(`INSERT INTO users (id, email) VALUES (?, ?)`).bind(id, email).run();
  const row = await env.WAITLIST_DB.prepare(
    `SELECT id, email, display_name, created_at FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(id)
    .first<UserRow>();
  if (!row) throw new Error("user_insert_missing");
  return row;
}

async function logout(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const session = await readSession(request, env);
  if (!session) return json({ error: "Sign in again." }, 401);

  await env.WAITLIST_DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`)
    .bind(session.token_hash)
    .run();
  return json({ ok: true });
}

async function getMe(request: Request, env: Env): Promise<Response> {
  const session = await readSession(request, env);
  if (!session) return json({ error: "Sign in again." }, 401);

  const user = await env.WAITLIST_DB.prepare(
    `SELECT id, email, display_name, created_at FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(session.user_id)
    .first<UserRow>();
  if (!user) {
    await env.WAITLIST_DB.prepare(`DELETE FROM sessions WHERE token_hash = ?`)
      .bind(session.token_hash)
      .run();
    return json({ error: "Sign in again." }, 401);
  }

  await touchSession(env, session.token_hash);
  return json({ user: publicUser(user) });
}

async function patchMe(request: Request, env: Env): Promise<Response> {
  const session = await readSession(request, env);
  if (!session) return json({ error: "Sign in again." }, 401);

  const body = await readJson(request);
  if (body === null || typeof body !== "object") {
    return json({ error: "Invalid JSON body." }, 400);
  }

  if (!("displayName" in body) || Object.keys(body as object).some((key) => key !== "displayName")) {
    return json({ error: "Only displayName can be updated." }, 400);
  }

  const parsed = parseDisplayName((body as { displayName: unknown }).displayName);
  if (!parsed.ok) {
    return json({ error: "Enter a shorter name." }, 400);
  }

  await env.WAITLIST_DB.prepare(
    `UPDATE users SET display_name = ?, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(parsed.name, session.user_id)
    .run();

  const user = await env.WAITLIST_DB.prepare(
    `SELECT id, email, display_name, created_at FROM users WHERE id = ? LIMIT 1`,
  )
    .bind(session.user_id)
    .first<UserRow>();
  if (!user) return json({ error: "Sign in again." }, 401);

  await touchSession(env, session.token_hash);
  return json({ user: publicUser(user) });
}

async function readSession(request: Request, env: Env): Promise<SessionRow | null> {
  const token = bearerToken(request);
  if (!token) return null;
  const tokenHash = await hashToken(token);
  const row = await env.WAITLIST_DB.prepare(
    `SELECT token_hash, user_id, expires_at FROM sessions
     WHERE token_hash = ? AND datetime(expires_at) > datetime('now') LIMIT 1`,
  )
    .bind(tokenHash)
    .first<SessionRow>();
  return row ?? null;
}

async function touchSession(env: Env, tokenHash: string): Promise<void> {
  await env.WAITLIST_DB.prepare(
    `UPDATE sessions SET last_seen_at = datetime('now') WHERE token_hash = ?`,
  )
    .bind(tokenHash)
    .run();
}

function publicUser(user: UserRow) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    createdAt: user.created_at,
  };
}
