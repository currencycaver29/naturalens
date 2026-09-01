import { clientIp, isSameOrigin, isValidEmail, json, parseEmailField, readJson } from "./http";

const WAITLIST_PER_IP_HOUR = 8;
const JOINED_MESSAGE = "You are on the list. We will write when access opens.";

export async function handleWaitlist(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }
  if (!isSameOrigin(request)) {
    return json({ error: "Invalid origin." }, 403);
  }

  const body = await readJson(request);
  if (body === null) {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const email = parseEmailField(body);
  if (!isValidEmail(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 512) ?? null;
  const ip = clientIp(request);

  try {
    if (ip) {
      const recent = await env.WAITLIST_DB.prepare(
        `SELECT COUNT(*) AS n FROM waitlist WHERE ip = ? AND created_at >= datetime('now', '-1 hour')`,
      )
        .bind(ip)
        .first<{ n: number }>();
      if ((recent?.n ?? 0) >= WAITLIST_PER_IP_HOUR) {
        return json({ error: "Too many tries. Try again later." }, 429);
      }
    }

    const existing = await env.WAITLIST_DB.prepare(
      "SELECT id FROM waitlist WHERE email = ? LIMIT 1",
    )
      .bind(email)
      .first<{ id: number }>();

    if (existing) {
      return json({ ok: true, message: JOINED_MESSAGE });
    }

    await env.WAITLIST_DB.prepare(
      "INSERT INTO waitlist (email, user_agent, ip) VALUES (?, ?, ?)",
    )
      .bind(email, userAgent, ip)
      .run();

    return json({ ok: true, message: JOINED_MESSAGE });
  } catch (error) {
    console.error("waitlist_insert_failed", error);
    return json({ error: "Could not join the waitlist. Try again." }, 500);
  }
}
