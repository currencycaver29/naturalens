const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;
const DISPLAY_NAME_MAX = 80;

export const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cross-origin-opener-policy": "same-origin",
  "content-security-policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

export function applySecurityHeaders(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(key)) headers.set(key, value);
  }
  if (new URL(request.url).protocol === "https:") {
    headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function json(
  data: unknown,
  status = 200,
  extra?: Record<string, string>,
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) headers.set(key, value);
  }
  return new Response(JSON.stringify(data), { status, headers });
}

export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

export function clientIp(request: Request): string | null {
  return request.headers.get("cf-connecting-ip")?.slice(0, 64) || null;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return Boolean(email) && email.length <= EMAIL_MAX && EMAIL_RE.test(email);
}

export function parseEmailField(body: unknown): string {
  if (typeof body !== "object" || body === null || !("email" in body)) return "";
  const value = (body as { email: unknown }).email;
  return typeof value === "string" ? normalizeEmail(value) : "";
}

export function parseDisplayName(value: unknown): { ok: true; name: string | null } | { ok: false } {
  if (value === null || value === undefined) return { ok: true, name: null };
  if (typeof value !== "string") return { ok: false };
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length > DISPLAY_NAME_MAX) return { ok: false };
  return { ok: true, name: name.length ? name : null };
}

export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export function isSameOrigin(request: Request): boolean {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === url.origin;
    } catch {
      return false;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === url.origin;
    } catch {
      return false;
    }
  }
  return false;
}
