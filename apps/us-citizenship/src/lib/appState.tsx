import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type CivicsVersion = '2008' | '2025';

interface AppState {
  /** True once persisted state has been read from disk - gate any redirects on this. */
  hydrated: boolean;
  civicsVersion: CivicsVersion;
  setCivicsVersion: (v: CivicsVersion) => void;
  homeState: string | null;
  setHomeState: (s: string | null) => void;
  starredIds: Set<number>;
  toggleStar: (id: number) => void;
  practiceHistory: { date: string; scorePct: number; passed: boolean }[];
  recordPracticeResult: (scorePct: number, passed: boolean) => void;
  // Personalization - stored on-device only, never transmitted (see Settings > Privacy).
  firstName: string | null;
  setFirstName: (name: string | null) => void;
  /** ISO date (YYYY-MM-DD) of the user's naturalization interview, if they've shared it. */
  interviewDate: string | null;
  setInterviewDate: (iso: string | null) => void;
  hasOnboarded: boolean;
  setHasOnboarded: (v: boolean) => void;
}

const AppStateContext = createContext<AppState | null>(null);

const KEYS = {
  civicsVersion: 'civicsVersion',
  homeState: 'homeState',
  starredIds: 'starredIds',
  practiceHistory: 'practiceHistory',
  firstName: 'firstName',
  interviewDate: 'interviewDate',
  hasOnboarded: 'hasOnboarded',
};

type PracticeEntry = { date: string; scorePct: number; passed: boolean };

/**
 * Read one persisted key and apply it, containing every failure to that key.
 *
 * The loader used to read all seven keys through a single Promise.all and then
 * parse them in one try block. A malformed `starredIds` or `practiceHistory` threw
 * at JSON.parse, so the setters that came after it - first name, interview date,
 * hasOnboarded - never ran, `finally` marked the app hydrated anyway, and the
 * rejection escaped as an unhandled promise rejection. One corrupt value therefore
 * presented as the app having wiped the user's name and interview date and
 * forgotten they had onboarded, which onboarding would then replay from scratch.
 *
 * A value we managed to read but could not use is deleted, so it cannot fail again
 * on every launch. A read that failed outright is left alone: that can be a
 * transient storage error, and deleting on it would turn a glitch into real data
 * loss.
 */
async function loadKey(key: string, apply: (raw: string) => void): Promise<void> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch (e) {
    if (__DEV__) console.warn(`[appState] could not read "${key}"`, e);
    return;
  }
  if (raw === null) return;
  try {
    apply(raw);
  } catch (e) {
    if (__DEV__) console.warn(`[appState] discarding unusable "${key}": ${raw}`, e);
    AsyncStorage.removeItem(key).catch(() => {});
  }
}

/** Throws if the JSON is not an array, so loadKey can discard the key. */
function parseArray(raw: string): unknown[] {
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('expected an array');
  return parsed;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [civicsVersion, setCivicsVersionState] = useState<CivicsVersion>('2025');
  const [homeState, setHomeStateState] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<Set<number>>(new Set());
  const [practiceHistory, setPracticeHistory] = useState<PracticeEntry[]>([]);
  const [firstName, setFirstNameState] = useState<string | null>(null);
  const [interviewDate, setInterviewDateState] = useState<string | null>(null);
  const [hasOnboarded, setHasOnboardedState] = useState(false);

  useEffect(() => {
    (async () => {
      // One key's bad data must never cost another key's good data, so each is
      // read and validated on its own (see loadKey above). loadKey does not
      // throw, so this Promise.all cannot reject; `hydrated` is still set in
      // `finally` because a loader that somehow failed must not leave the app
      // stuck behind the splash forever.
      try {
        await Promise.all([
          loadKey(KEYS.civicsVersion, (raw) => {
            if (raw === '2008' || raw === '2025') setCivicsVersionState(raw);
          }),
          loadKey(KEYS.homeState, (raw) => {
            if (raw) setHomeStateState(raw);
          }),
          loadKey(KEYS.starredIds, (raw) => {
            // Keep the ids that are usable rather than dropping the whole review
            // deck because one entry is not a number.
            const ids = parseArray(raw).filter((n): n is number => typeof n === 'number' && Number.isFinite(n));
            setStarredIds(new Set(ids));
          }),
          loadKey(KEYS.practiceHistory, (raw) => {
            // Same rule, and it matters more here: the performance screen must
            // only ever show scores actually recorded, so a malformed row is
            // dropped instead of being coerced into a number.
            const entries = parseArray(raw).filter(
              (e): e is PracticeEntry =>
                !!e &&
                typeof e === 'object' &&
                typeof (e as PracticeEntry).date === 'string' &&
                typeof (e as PracticeEntry).scorePct === 'number' &&
                Number.isFinite((e as PracticeEntry).scorePct) &&
                typeof (e as PracticeEntry).passed === 'boolean'
            );
            setPracticeHistory(entries);
          }),
          loadKey(KEYS.firstName, (raw) => {
            if (raw) setFirstNameState(raw);
          }),
          loadKey(KEYS.interviewDate, (raw) => {
            if (raw) setInterviewDateState(raw);
          }),
          loadKey(KEYS.hasOnboarded, (raw) => {
            if (raw === 'true') setHasOnboardedState(true);
          }),
        ]);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const setCivicsVersion = (v: CivicsVersion) => {
    setCivicsVersionState(v);
    AsyncStorage.setItem(KEYS.civicsVersion, v).catch(() => {});
  };

  const setHomeState = (s: string | null) => {
    setHomeStateState(s);
    AsyncStorage.setItem(KEYS.homeState, s ?? '').catch(() => {});
  };

  // Storage writes stay OUTSIDE the state updater callbacks: React may invoke an
  // updater twice (StrictMode, and again on re-render), which would double-write.
  const toggleStar = (id: number) => {
    const next = new Set(starredIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStarredIds(next);
    AsyncStorage.setItem(KEYS.starredIds, JSON.stringify([...next])).catch(() => {});
  };

  const recordPracticeResult = (scorePct: number, passed: boolean) => {
    const next = [...practiceHistory, { date: new Date().toISOString(), scorePct, passed }].slice(-50);
    setPracticeHistory(next);
    AsyncStorage.setItem(KEYS.practiceHistory, JSON.stringify(next)).catch(() => {});
  };

  const setFirstName = (name: string | null) => {
    const trimmed = name?.trim() || null;
    setFirstNameState(trimmed);
    if (trimmed) AsyncStorage.setItem(KEYS.firstName, trimmed).catch(() => {});
    else AsyncStorage.removeItem(KEYS.firstName).catch(() => {});
  };

  const setInterviewDate = (iso: string | null) => {
    setInterviewDateState(iso);
    if (iso) AsyncStorage.setItem(KEYS.interviewDate, iso).catch(() => {});
    else AsyncStorage.removeItem(KEYS.interviewDate).catch(() => {});
  };

  const setHasOnboarded = (v: boolean) => {
    setHasOnboardedState(v);
    AsyncStorage.setItem(KEYS.hasOnboarded, v ? 'true' : 'false').catch(() => {});
  };

  const value = useMemo(
    () => ({
      hydrated,
      civicsVersion,
      setCivicsVersion,
      homeState,
      setHomeState,
      starredIds,
      toggleStar,
      practiceHistory,
      recordPracticeResult,
      firstName,
      setFirstName,
      interviewDate,
      setInterviewDate,
      hasOnboarded,
      setHasOnboarded,
    }),
    [hydrated, civicsVersion, homeState, starredIds, practiceHistory, firstName, interviewDate, hasOnboarded]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}

/** Whole days from today until an ISO date (YYYY-MM-DD); negative if past. */
export function daysUntil(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}
