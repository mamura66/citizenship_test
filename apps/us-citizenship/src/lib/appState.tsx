import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_COUNTRY, getCountry, type CountryCode } from '../content/countries';

/** A version id as the country's own pack declares it: '2025', '2008', '2025-05-07'. */
type CivicsVersion = string;

interface AppState {
  /** True once persisted state has been read from disk - gate any redirects on this. */
  hydrated: boolean;
  /** Which country's test this person is preparing for. */
  country: CountryCode;
  /**
   * Switch country. Everything progress-related is stored per country, so this also
   * swaps starred questions, practice history and the chosen region - it never carries
   * one country's answers into another's report.
   */
  setCountry: (c: CountryCode) => void;
  civicsVersion: CivicsVersion;
  setCivicsVersion: (v: CivicsVersion) => void;
  /** The user's own state, territory or Bundesland - whatever their test asks about. */
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

/* Storage keys.
 *
 * Anything that describes progress is stored per country, because progress is keyed by
 * question id and the ids collide: the USCIS pool runs 1..128 and Germany's runs 1..300
 * plus 1001.. for the Bundesländer. Sharing one key would show a German user their US
 * practice history as though it were theirs, and star a German question because a US one
 * with the same number was starred. That is the same failure the website prevents by
 * locking the country to an account; here there are no accounts, so the data is namespaced
 * instead and switching country is allowed.
 *
 * The four LEGACY_* names are what a build before this shipped wrote. They are read once,
 * copied into the ':us' namespace, and then left alone - an existing user's US progress is
 * theirs, and leaving the old keys in place means this change is reversible.
 */
const GLOBAL_KEYS = {
  country: 'country',
  firstName: 'firstName',
  interviewDate: 'interviewDate',
  hasOnboarded: 'hasOnboarded',
};

const scoped = (base: string, country: string) => `${base}:${country}`;
const SCOPED = {
  civicsVersion: 'civicsVersion',
  homeState: 'homeState',
  starredIds: 'starredIds',
  practiceHistory: 'practiceHistory',
};

const LEGACY = {
  civicsVersion: 'civicsVersion',
  homeState: 'homeState',
  starredIds: 'starredIds',
  practiceHistory: 'practiceHistory',
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
  const [country, setCountryState] = useState<CountryCode>(DEFAULT_COUNTRY);
  const [civicsVersion, setCivicsVersionState] = useState<CivicsVersion>(
    getCountry(DEFAULT_COUNTRY).versions[0].id
  );
  const [homeState, setHomeStateState] = useState<string | null>(null);
  const [starredIds, setStarredIds] = useState<Set<number>>(new Set());
  const [practiceHistory, setPracticeHistory] = useState<PracticeEntry[]>([]);
  const [firstName, setFirstNameState] = useState<string | null>(null);
  const [interviewDate, setInterviewDateState] = useState<string | null>(null);
  const [hasOnboarded, setHasOnboardedState] = useState(false);

  /**
   * Read the progress that belongs to one country and apply it.
   *
   * `migrateFrom` is the pre-namespacing key, used only for the United States and only
   * when the namespaced key is absent. A user who has been studying in this app already
   * has their stars and their score history under the old names, and losing them on
   * upgrade would look exactly like the app wiping their work.
   */
  const loadScopedFor = async (code: CountryCode) => {
    const def = getCountry(code);
    const fallbackVersion = def.versions[0].id;
    const legacyOk = code === 'us';

    // Each key is read on its own so one unusable value cannot cost another its data -
    // see loadKey. A key with no namespaced value falls back to the legacy name, and what
    // it finds there is written into the namespace so the fallback happens once.
    const readScoped = async (
      key: string,
      legacyKey: string,
      apply: (raw: string) => void
    ) => {
      let used = false;
      await loadKey(scoped(key, code), (raw) => { apply(raw); used = true; });
      if (used || !legacyOk) return;
      await loadKey(legacyKey, (raw) => {
        apply(raw);
        AsyncStorage.setItem(scoped(key, code), raw).catch(() => {});
      });
    };

    let version = fallbackVersion;
    let region: string | null = null;
    let stars = new Set<number>();
    let history: PracticeEntry[] = [];

    await Promise.all([
      readScoped(SCOPED.civicsVersion, LEGACY.civicsVersion, (raw) => {
        // A version the pack no longer declares is ignored rather than trusted: studying
        // a pool this build does not have is worse than falling back to the current one.
        if (def.versions.some((v) => v.id === raw)) version = raw;
      }),
      readScoped(SCOPED.homeState, LEGACY.homeState, (raw) => {
        if (raw) region = raw;
      }),
      readScoped(SCOPED.starredIds, LEGACY.starredIds, (raw) => {
        const ids = parseArray(raw).filter(
          (n): n is number => typeof n === 'number' && Number.isFinite(n)
        );
        stars = new Set(ids);
      }),
      readScoped(SCOPED.practiceHistory, LEGACY.practiceHistory, (raw) => {
        // The performance screen must only ever show scores actually recorded, so a
        // malformed row is dropped rather than coerced into a number.
        const entries = parseArray(raw).filter(
          (e): e is PracticeEntry =>
            !!e &&
            typeof e === 'object' &&
            typeof (e as PracticeEntry).date === 'string' &&
            typeof (e as PracticeEntry).scorePct === 'number' &&
            Number.isFinite((e as PracticeEntry).scorePct) &&
            typeof (e as PracticeEntry).passed === 'boolean'
        );
        history = entries;
      }),
    ]);

    setCivicsVersionState(version);
    setHomeStateState(region);
    setStarredIds(stars);
    setPracticeHistory(history);
  };

  useEffect(() => {
    (async () => {
      // loadKey does not throw, so this cannot reject; `hydrated` is still set in
      // `finally` because a loader that somehow failed must not leave the app stuck
      // behind the splash forever.
      try {
        let code: CountryCode = DEFAULT_COUNTRY;
        await loadKey(GLOBAL_KEYS.country, (raw) => {
          // Only a country this build actually ships. A stored code we no longer have a
          // pack for would otherwise offer a test with no questions behind it.
          if (getCountry(raw).code === raw) code = raw as CountryCode;
        });
        setCountryState(code);

        await Promise.all([
          loadKey(GLOBAL_KEYS.firstName, (raw) => {
            if (raw) setFirstNameState(raw);
          }),
          loadKey(GLOBAL_KEYS.interviewDate, (raw) => {
            if (raw) setInterviewDateState(raw);
          }),
          loadKey(GLOBAL_KEYS.hasOnboarded, (raw) => {
            if (raw === 'true') setHasOnboardedState(true);
          }),
          loadScopedFor(code),
        ]);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  /**
   * Change country.
   *
   * The progress state is cleared before the new country's is read, not after. Loading is
   * asynchronous, and leaving the old values in place across that gap would render one
   * country's practice history and starred questions under another country's test - which
   * is precisely the "real data about a test you are not taking" failure this app has to
   * avoid.
   */
  const setCountry = (c: CountryCode) => {
    if (c === country) return;
    const def = getCountry(c);
    setCountryState(c);
    setCivicsVersionState(def.versions[0].id);
    setHomeStateState(null);
    setStarredIds(new Set());
    setPracticeHistory([]);
    AsyncStorage.setItem(GLOBAL_KEYS.country, c).catch(() => {});
    loadScopedFor(c);
  };

  const setCivicsVersion = (v: CivicsVersion) => {
    setCivicsVersionState(v);
    AsyncStorage.setItem(scoped(SCOPED.civicsVersion, country), v).catch(() => {});
  };

  const setHomeState = (s: string | null) => {
    setHomeStateState(s);
    AsyncStorage.setItem(scoped(SCOPED.homeState, country), s ?? '').catch(() => {});
  };

  // Storage writes stay OUTSIDE the state updater callbacks: React may invoke an
  // updater twice (StrictMode, and again on re-render), which would double-write.
  const toggleStar = (id: number) => {
    const next = new Set(starredIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setStarredIds(next);
    AsyncStorage.setItem(scoped(SCOPED.starredIds, country), JSON.stringify([...next])).catch(() => {});
  };

  const recordPracticeResult = (scorePct: number, passed: boolean) => {
    const next = [...practiceHistory, { date: new Date().toISOString(), scorePct, passed }].slice(-50);
    setPracticeHistory(next);
    AsyncStorage.setItem(scoped(SCOPED.practiceHistory, country), JSON.stringify(next)).catch(() => {});
  };

  const setFirstName = (name: string | null) => {
    const trimmed = name?.trim() || null;
    setFirstNameState(trimmed);
    if (trimmed) AsyncStorage.setItem(GLOBAL_KEYS.firstName, trimmed).catch(() => {});
    else AsyncStorage.removeItem(GLOBAL_KEYS.firstName).catch(() => {});
  };

  const setInterviewDate = (iso: string | null) => {
    setInterviewDateState(iso);
    if (iso) AsyncStorage.setItem(GLOBAL_KEYS.interviewDate, iso).catch(() => {});
    else AsyncStorage.removeItem(GLOBAL_KEYS.interviewDate).catch(() => {});
  };

  const setHasOnboarded = (v: boolean) => {
    setHasOnboardedState(v);
    AsyncStorage.setItem(GLOBAL_KEYS.hasOnboarded, v ? 'true' : 'false').catch(() => {});
  };

  const value = useMemo(
    () => ({
      hydrated,
      country,
      setCountry,
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
    [hydrated, country, civicsVersion, homeState, starredIds, practiceHistory, firstName, interviewDate, hasOnboarded]
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
