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

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [civicsVersion, setCivicsVersionState] = useState<CivicsVersion>('2025');
  const [homeState, setHomeStateState] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<Set<number>>(new Set());
  const [practiceHistory, setPracticeHistory] = useState<
    { date: string; scorePct: number; passed: boolean }[]
  >([]);
  const [firstName, setFirstNameState] = useState<string | null>(null);
  const [interviewDate, setInterviewDateState] = useState<string | null>(null);
  const [hasOnboarded, setHasOnboardedState] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [v, s, star, hist, name, date, onboarded] = await Promise.all([
          AsyncStorage.getItem(KEYS.civicsVersion),
          AsyncStorage.getItem(KEYS.homeState),
          AsyncStorage.getItem(KEYS.starredIds),
          AsyncStorage.getItem(KEYS.practiceHistory),
          AsyncStorage.getItem(KEYS.firstName),
          AsyncStorage.getItem(KEYS.interviewDate),
          AsyncStorage.getItem(KEYS.hasOnboarded),
        ]);
        if (v === '2008' || v === '2025') setCivicsVersionState(v);
        if (s) setHomeStateState(s);
        if (star) setStarredIds(new Set(JSON.parse(star)));
        if (hist) setPracticeHistory(JSON.parse(hist));
        if (name) setFirstNameState(name);
        if (date) setInterviewDateState(date);
        if (onboarded === 'true') setHasOnboardedState(true);
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
