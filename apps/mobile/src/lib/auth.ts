import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { BannerTone } from '../components/Banner';
import { api } from './api';

/**
 * Sign-in — email, then a six-digit code emailed by the naturalens-web Worker.
 *
 * `requestCode` and `verifyCode` are the only network calls. Screens handle latency and
 * typed failures; swapping copy or the Worker path should not require touching a layout.
 */

const TOKEN_KEY = 'naturalens-session-token-v2';
const PROFILE_KEY = 'naturalens-session-v2';
const LEGACY_SESSION_KEY = 'naturalens-session-v1';
const LEGACY_PENDING_KEY = 'naturalens-pending-code-v1';

export const OTP_LENGTH = 6;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
}

export interface Session {
  token: string;
  user: UserProfile;
  /** Convenience — same as `user.email`, kept so screens that read `session.email` still typecheck. */
  email: string;
}

interface AuthErrorOptions {
  field?: boolean;
  retryAfterSec?: number | null;
  expired?: boolean;
}

export class AuthError extends Error {
  tone: BannerTone;
  field: boolean;
  retryAfterSec: number | null;
  expired: boolean;

  constructor(message: string, tone: BannerTone = 'danger', options: AuthErrorOptions = {}) {
    super(message);
    this.name = 'AuthError';
    this.tone = tone;
    this.field = options.field ?? false;
    this.retryAfterSec = options.retryAfterSec ?? null;
    this.expired = options.expired ?? false;
  }
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Email is required.';
  if (email.length > EMAIL_MAX) return 'That address is too long.';
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
  return null;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export async function requestCode(email: string): Promise<void> {
  await api<{ ok: true }>('/api/auth/request-code', {
    method: 'POST',
    body: { email: normalizeEmail(email) },
  });
}

export async function verifyCode(email: string, code: string): Promise<Session> {
  const data = await api<{ token: string; user: UserProfile }>('/api/auth/verify-code', {
    method: 'POST',
    body: { email: normalizeEmail(email), code },
  });

  if (!data?.token || !data.user?.email) {
    throw new AuthError("Couldn't finish signing in. Try again.");
  }

  const session = sessionFrom(data.token, data.user);
  await persistSession(session);
  return session;
}

export async function fetchMe(token: string): Promise<UserProfile> {
  const data = await api<{ user: UserProfile }>('/api/me', { token });
  if (!data?.user?.email) throw new AuthError('Sign in again.', 'warning');
  return data.user;
}

export async function updateDisplayName(token: string, displayName: string): Promise<UserProfile> {
  const data = await api<{ user: UserProfile }>('/api/me', {
    method: 'PATCH',
    token,
    body: { displayName },
  });
  if (!data?.user?.email) throw new AuthError("Couldn't save that name. Try again.");
  return data.user;
}

export async function logoutRemote(token: string): Promise<void> {
  try {
    await api('/api/auth/logout', { method: 'POST', token });
  } catch {
    // Local sign-out still has to succeed if the radio is down.
  }
}

export async function loadSession(): Promise<Session | null> {
  try {
    const [token, raw] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      AsyncStorage.getItem(PROFILE_KEY),
    ]);
    if (!token || !raw) {
      if (token || raw) await clearSession();
      return null;
    }

    const user = parseProfile(raw);
    if (!user) {
      await clearSession();
      return null;
    }

    return sessionFrom(token, user);
  } catch {
    return null;
  }
}

export async function persistSession(session: Session): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, session.token);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(session.user));
  } catch {
    throw new AuthError("Couldn't finish signing in. Try again.");
  }
}

export async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {}),
    AsyncStorage.multiRemove([PROFILE_KEY, LEGACY_SESSION_KEY, LEGACY_PENDING_KEY]),
  ]);
}

function sessionFrom(token: string, user: UserProfile): Session {
  return {
    token,
    user: {
      id: user.id,
      email: normalizeEmail(user.email),
      displayName: user.displayName ?? null,
      createdAt: user.createdAt,
    },
    email: normalizeEmail(user.email),
  };
}

function parseProfile(raw: string): UserProfile | null {
  try {
    const parsed = JSON.parse(raw) as UserProfile;
    if (typeof parsed?.id !== 'string' || typeof parsed?.email !== 'string' || !parsed.email) {
      return null;
    }
    return {
      id: parsed.id,
      email: parsed.email,
      displayName: typeof parsed.displayName === 'string' ? parsed.displayName : null,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
    };
  } catch {
    return null;
  }
}
