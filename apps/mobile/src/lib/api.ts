import { AuthError } from './auth';

const DEFAULT_BASE = 'https://naturalens.ca';
const TIMEOUT_MS = 15_000;

export const API_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_BASE).replace(
  /\/$/,
  '',
);

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}

interface ErrorBody {
  error?: string;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.token) headers.authorization = `Bearer ${options.token}`;

    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => ({}))) as ErrorBody & T;
    if (!response.ok) {
      throw authErrorFromResponse(response.status, data, response.headers.get('Retry-After'));
    }
    return data as T;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AuthError('That took too long. Try again.');
    }
    throw new AuthError("Couldn't reach Naturalens. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

function authErrorFromResponse(status: number, data: ErrorBody, retryAfter: string | null): AuthError {
  const message = typeof data.error === 'string' && data.error ? data.error : fallbackMessage(status);
  const seconds = retryAfter ? Number(retryAfter) : null;
  const retryAfterSec = seconds !== null && Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;

  if (status === 400) {
    return new AuthError(message, 'warning', { field: true });
  }
  if (status === 401) {
    return new AuthError(message || 'Sign in again.', 'warning', { expired: true });
  }
  if (status === 429) {
    return new AuthError(message, 'warning', { retryAfterSec });
  }
  return new AuthError(message);
}

function fallbackMessage(status: number): string {
  if (status === 429) return 'Too many tries. Try again later.';
  if (status === 401) return 'Sign in again.';
  if (status >= 500) return 'Try again.';
  return 'Something went wrong. Try again.';
}
