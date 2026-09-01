import { handleAuth } from "./auth";
import { applySecurityHeaders, json, normalizePath } from "./http";
import { handleWaitlist } from "./waitlist";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    let response: Response;
    if (path === "/api/waitlist") {
      response = await handleWaitlist(request, env);
    } else if (path.startsWith("/api/auth/") || path === "/api/me") {
      response = await handleAuth(request, env, path);
    } else if (path.startsWith("/api/")) {
      response = json({ error: "Not found." }, 404);
    } else {
      response = await env.ASSETS.fetch(request);
    }

    return applySecurityHeaders(request, response);
  },
} satisfies ExportedHandler<Env>;
