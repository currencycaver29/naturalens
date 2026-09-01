interface Env {
  ASSETS: Fetcher;
  WAITLIST_DB: D1Database;
  AUTH_FROM: string;
  RESEND_API_KEY?: string;
  AUTH_PEPPER?: string;
}
