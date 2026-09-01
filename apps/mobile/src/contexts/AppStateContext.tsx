import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Detection, FindLocation, HistoryEntry } from '../types';
import {
  addHistoryEntry as persistHistoryEntry,
  deleteHistoryEntry as persistDeleteHistoryEntry,
  setHistoryEntryInfo,
  ensureThumbnail,
  loadHistory,
} from '../lib/history';
import { fetchSpeciesInfo } from '../lib/detector';
import {
  AuthError,
  clearSession,
  fetchMe,
  loadSession,
  logoutRemote,
  normalizeEmail,
  persistSession,
  updateDisplayName,
  type Session,
} from '../lib/auth';
import { useNetworkOnline } from '../lib/network';
import type { BannerTone } from '../components/Banner';

export type TabId = 'camera' | 'finds' | 'map';

export interface StatusBanner {
  id: string;
  tone: BannerTone;
  message: string;
}

/** How long a self-resolving banner ("Back online.") stays up before clearing itself. */
const TRANSIENT_BANNER_MS = 4000;

/** Stable id for the connectivity banner, so a flapping radio replaces rather than stacks. */
const NETWORK_BANNER_ID = 'network';

interface AppStateContextValue {
  activeTab: TabId;
  setActiveTab: (id: TabId) => void;
  /** Status messages stacked under the header. Newest last. */
  banners: StatusBanner[];
  pushBanner: (message: string, tone?: BannerTone, options?: { id?: string; transient?: boolean }) => void;
  dismissBanner: (id: string) => void;
  /** Whether the radio thinks we can reach the network. Advisory — see `lib/network.ts`. */
  networkOnline: boolean;
  history: HistoryEntry[];
  historyLoading: boolean;
  addHistoryEntry: (
    detection: Detection,
    photoUri: string,
    location?: FindLocation,
  ) => Promise<void>;
  deleteHistoryEntry: (id: string) => Promise<void>;
  /** Looks up the species details of a find saved before we fetched them. */
  backfillSpeciesInfo: (id: string, label: string) => Promise<void>;
  /** The find open in the detail view, if any. */
  selectedEntry: HistoryEntry | null;
  setSelectedEntryId: (id: string | null) => void;
  /** The find whose pin is selected on the map, if any. */
  selectedPin: HistoryEntry | null;
  setSelectedPinId: (id: string | null) => void;
  /** Who is signed in, or null. `App.tsx` gates the whole app on this. */
  session: Session | null;
  /**
   * True until the stored session has been read. The native splash has to wait on this,
   * or a signed-in user sees the intro for a frame before the camera.
   */
  sessionLoading: boolean;
  /** Called by the auth flow once a code has verified. */
  completeSignIn: (session: Session) => void;
  signOut: () => Promise<void>;
  /** Saves a display name on the server and updates the cached profile. */
  saveDisplayName: (name: string) => Promise<void>;
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>('camera');
  const [banners, setBanners] = useState<StatusBanner[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  const networkOnline = useNetworkOnline();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismissBanner = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setBanners((prev) => prev.filter((banner) => banner.id !== id));
  }, []);

  /**
   * Adding a banner with an `id` that's already up replaces it. That's what keeps a
   * flapping connection from stacking six copies of the same sentence.
   */
  const pushBanner = useCallback<AppStateContextValue['pushBanner']>(
    (message, tone = 'neutral', options) => {
      const id = options?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const existing = timers.current.get(id);
      if (existing) {
        clearTimeout(existing);
        timers.current.delete(id);
      }

      setBanners((prev) => [...prev.filter((banner) => banner.id !== id), { id, tone, message }]);

      if (options?.transient) {
        timers.current.set(
          id,
          setTimeout(() => {
            timers.current.delete(id);
            setBanners((prev) => prev.filter((banner) => banner.id !== id));
          }, TRANSIENT_BANNER_MS),
        );
      }
    },
    [],
  );

  // Clear pending dismissals on unmount so a timer can't fire into a dead provider.
  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  /**
   * Announce connectivity, but only once we've seen it change.
   *
   * A first render that happens to be offline shouldn't open with an accusation, and
   * "Back online" makes no sense as the first thing the app ever says — so the initial
   * state is recorded silently and only transitions speak.
   */
  const lastOnline = useRef<boolean | null>(null);
  useEffect(() => {
    const previous = lastOnline.current;
    lastOnline.current = networkOnline;

    if (previous === null || previous === networkOnline) return;

    if (networkOnline) {
      pushBanner('Back online.', 'success', { id: NETWORK_BANNER_ID, transient: true });
    } else {
      pushBanner(
        "You're offline. Saved finds are still here — identifying needs a connection.",
        'neutral',
        { id: NETWORK_BANNER_ID },
      );
    }
  }, [networkOnline, pushBanner]);

  // Read once at launch. `loadSession` swallows a corrupt read and returns null, so the
  // worst case is being asked to sign in again — never a crash before the first frame.
  useEffect(() => {
    let cancelled = false;

    loadSession().then((stored) => {
      if (cancelled) return;
      setSession(stored);
      setSessionLoading(false);

      if (!stored) return;

      fetchMe(stored.token)
        .then(async (user) => {
          if (cancelled) return;
          const next: Session = {
            token: stored.token,
            user,
            email: normalizeEmail(user.email),
          };
          await persistSession(next);
          if (!cancelled) setSession(next);
        })
        .catch(async (error) => {
          if (cancelled) return;
          if (error instanceof AuthError && error.expired) {
            await clearSession();
            if (!cancelled) setSession(null);
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const completeSignIn = useCallback((next: Session) => {
    setSession({
      ...next,
      email: normalizeEmail(next.email),
      user: { ...next.user, email: normalizeEmail(next.user.email) },
    });
  }, []);

  /**
   * Drops the session but leaves the finds alone. History is local to the device and was
   * never tied to an identity (§4) — deleting someone's photographs because they signed
   * out would be destroying data they never handed us in the first place.
   */
  const signOut = useCallback(async () => {
    const token = session?.token;
    if (token) await logoutRemote(token);
    await clearSession();
    setSession(null);
    setActiveTab('camera');
    setSelectedEntryId(null);
    setSelectedPinId(null);
  }, [session]);

  const saveDisplayName = useCallback(
    async (name: string) => {
      if (!session) throw new AuthError('Sign in again.', 'warning', { expired: true });
      const user = await updateDisplayName(session.token, name);
      const next: Session = {
        token: session.token,
        user,
        email: normalizeEmail(user.email),
      };
      await persistSession(next);
      setSession(next);
    },
    [session],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const entries = await loadHistory().catch(() => [] as HistoryEntry[]);
      if (cancelled) return;

      setHistory(entries);
      setHistoryLoading(false);

      // Missing thumb files (pre-thumbnail rows, or a stale URI after a TestFlight
      // container change) get regenerated from the full photo, in the background.
      //
      // Sequentially, and deliberately so: this is image decoding, and firing twenty at once
      // is how you run out of memory doing the thing that was supposed to save it.
      for (const entry of entries) {
        if (cancelled) return;

        try {
          const updated = await ensureThumbnail(entry);
          if (updated && !cancelled) {
            setHistory((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          }
        } catch {
          // Leave the row pointing at the full photo. Slow beats blank.
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const addHistoryEntry = useCallback(
    async (detection: Detection, photoUri: string, location?: FindLocation) => {
      const entry = await persistHistoryEntry(detection, photoUri, location);
      setHistory((prev) => [entry, ...prev]);
    },
    [],
  );

  const deleteHistoryEntry = useCallback(async (id: string) => {
    await persistDeleteHistoryEntry(id);
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const backfillSpeciesInfo = useCallback(async (id: string, label: string) => {
    const info = await fetchSpeciesInfo(label);
    const updated = await setHistoryEntryInfo(id, info);

    // Deleted while the lookup was in flight — nothing left to update.
    if (!updated) return;

    setHistory((prev) => prev.map((entry) => (entry.id === id ? updated : entry)));
  }, []);

  // Both selections are derived from an id rather than held as their own entry, so
  // deleting a find closes the detail view and drops its pin selection on its own.
  const selectedEntry = useMemo(
    () => history.find((entry) => entry.id === selectedEntryId) ?? null,
    [history, selectedEntryId],
  );

  const selectedPin = useMemo(
    () => history.find((entry) => entry.id === selectedPinId) ?? null,
    [history, selectedPinId],
  );

  const value: AppStateContextValue = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      banners,
      pushBanner,
      dismissBanner,
      networkOnline,
      history,
      historyLoading,
      addHistoryEntry,
      deleteHistoryEntry,
      backfillSpeciesInfo,
      selectedEntry,
      setSelectedEntryId,
      selectedPin,
      setSelectedPinId,
      session,
      sessionLoading,
      completeSignIn,
      signOut,
      saveDisplayName,
    }),
    [
      activeTab,
      banners,
      pushBanner,
      dismissBanner,
      networkOnline,
      history,
      historyLoading,
      addHistoryEntry,
      deleteHistoryEntry,
      backfillSpeciesInfo,
      selectedEntry,
      selectedPin,
      session,
      sessionLoading,
      completeSignIn,
      signOut,
      saveDisplayName,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
