/* The officials data, kept current without a release.
 *
 * "Who is the President?", "Who is the governor of your state?" - the answers change, and
 * for governors they change in bulk on election night. The midterms are 3 November 2026.
 * While these names are baked into the binary, a wrong one can only be corrected by
 * shipping an update and waiting for review; a competitor in this category collected
 * one-star reviews for exactly that after the last cycle. So the app fetches the same two
 * JSON files the website already serves, and falls back to the bundled copy on any doubt.
 *
 * This is a FRESHNESS feature, not an availability dependency. The bundled copy is the
 * floor: the first render is never empty, offline works, and every rejection path below
 * keeps the names that shipped rather than showing nothing.
 *
 * "Never ship a name we can't source" applies to a remote payload exactly as it applies
 * to the repository. A payload is accepted only if it validates in full:
 *   - every expected field present and a non-empty string; seats a number;
 *   - fifty governors, each with a non-empty name;
 *   - `lastVerified` a real date and NOT older than the bundled copy's - a stale CDN
 *     object or a rolled-back deploy must not undo a correction that shipped in the app;
 *   - a non-empty `verifiedAgainst` / `sources` - a payload with no sources is unsourced
 *     by definition and is rejected.
 * Anything else - network error, non-200, bad JSON, failed validation - is discarded
 * silently and the bundled data stays in force.
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bundledNational from '../../content/us/officials/national-dynamic.json';
import bundledGovernors from '../../content/us/officials/governors.json';
import type { GovernorEntry, NationalDynamicOfficials } from './types';

const ORIGIN = 'https://prepareforcitizenship.com';
const NATIONAL_URL = `${ORIGIN}/content/us/officials/national-dynamic.json`;
const GOVERNORS_URL = `${ORIGIN}/content/us/officials/governors.json`;

const CACHE_NATIONAL = 'officials.nationalDynamic.v1';
const CACHE_GOVERNORS = 'officials.governors.v1';
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6000;

export type OfficialsSource = 'bundled' | 'cached' | 'network';

export interface OfficialsSnapshot {
  national: NationalDynamicOfficials;
  governors: Record<string, GovernorEntry>;
  /** Where the current names came from, for the "verified …" line on My State. */
  source: OfficialsSource;
  /** Bumps on every accepted change, so memoised answers can be invalidated. */
  version: number;
}

const BUNDLED_NATIONAL = bundledNational as unknown as NationalDynamicOfficials & { verifiedAgainst?: unknown };
const BUNDLED_GOVERNORS = (bundledGovernors as { governors: Record<string, GovernorEntry>; lastVerified?: string }).governors;
const BUNDLED_GOVERNORS_VERIFIED = (bundledGovernors as { lastVerified?: string }).lastVerified || '';

let snapshot: OfficialsSnapshot = {
  national: BUNDLED_NATIONAL,
  governors: BUNDLED_GOVERNORS,
  source: 'bundled',
  version: 0,
};
const listeners = new Set<() => void>();

/** The live snapshot. Synchronous, always populated - the bundled copy is the floor. */
export function officials(): OfficialsSnapshot {
  return snapshot;
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function publish(next: Omit<OfficialsSnapshot, 'version'>) {
  snapshot = { ...next, version: snapshot.version + 1 };
  listeners.forEach((fn) => fn());
}

/* ---------------------------------------------------------------------------------------
 * Validation. Strict on purpose: every check here is a way a wrong name could get through.
 * ------------------------------------------------------------------------------------ */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const nonEmpty = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function isValidDate(s: unknown): s is string {
  if (!nonEmpty(s) || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** True when `candidate` is on or after `floor`. Both must be valid dates. */
function notOlderThan(candidate: string, floor: string): boolean {
  if (!isValidDate(candidate)) return false;
  if (!isValidDate(floor)) return true;
  return candidate >= floor;
}

export function validateNational(raw: unknown, bundledVerified: string): NationalDynamicOfficials | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  for (const k of ['president', 'presidentParty', 'vicePresident', 'speakerOfTheHouse', 'chiefJustice']) {
    if (!nonEmpty(o[k])) return null;
  }
  if (typeof o.supremeCourtSeats !== 'number' || !Number.isFinite(o.supremeCourtSeats)) return null;
  if (!notOlderThan(String(o.lastVerified), bundledVerified)) return null;
  const sources = o.verifiedAgainst;
  const hasSources = Array.isArray(sources) ? sources.length > 0 : nonEmpty(sources)
    || (!!sources && typeof sources === 'object' && Object.keys(sources).length > 0);
  if (!hasSources) return null;
  return {
    lastVerified: String(o.lastVerified),
    president: o.president as string,
    presidentParty: o.presidentParty as string,
    vicePresident: o.vicePresident as string,
    speakerOfTheHouse: o.speakerOfTheHouse as string,
    chiefJustice: o.chiefJustice as string,
    supremeCourtSeats: o.supremeCourtSeats,
  };
}

export function validateGovernors(raw: unknown, bundledVerified: string): Record<string, GovernorEntry> | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const g = o.governors;
  if (!g || typeof g !== 'object') return null;
  const entries = Object.entries(g as Record<string, unknown>);
  if (entries.length !== 50) return null;
  const out: Record<string, GovernorEntry> = {};
  for (const [state, v] of entries) {
    if (!nonEmpty(state) || !v || typeof v !== 'object') return null;
    const e = v as Record<string, unknown>;
    if (!nonEmpty(e.name)) return null;
    out[state] = { name: e.name, party: nonEmpty(e.party) ? e.party : '' };
  }
  if (!notOlderThan(String(o.lastVerified), bundledVerified)) return null;
  const sources = o.sources;
  const hasSources = Array.isArray(sources) ? sources.length > 0
    : (!!sources && typeof sources === 'object' && Object.keys(sources).length > 0) || nonEmpty(sources);
  if (!hasSources) return null;
  return out;
}

/* ---------------------------------------------------------------------------------------
 * Fetching and caching
 * ------------------------------------------------------------------------------------ */

interface Cached<T> { payload: T; etag: string | null; fetchedAt: number }

async function readCache<T>(key: string): Promise<Cached<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T>;
    if (!parsed || typeof parsed !== 'object' || !('payload' in parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, value: Cached<T>): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A cache that cannot be written just means a fetch next launch. Not an error.
  }
}

async function fetchJson(url: string, etag: string | null): Promise<{ status: number; json: unknown; etag: string | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: etag ? { 'If-None-Match': etag } : undefined,
      cache: 'no-store',
    });
    if (res.status === 304) return { status: 304, json: null, etag };
    if (!res.ok) return { status: res.status, json: null, etag: null };
    return { status: res.status, json: await res.json(), etag: res.headers.get('etag') };
  } finally {
    clearTimeout(timer);
  }
}

let refreshing: Promise<void> | null = null;

/**
 * Bring the snapshot up to date: cache first (instant), then the network if the cache is
 * older than a day. Runs once per launch; repeated calls share the same promise.
 */
export function refreshOfficials(): Promise<void> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    // 1. Cached copies, validated again - a cache written by an older build is still
    //    checked against THIS build's bundled dates, so an upgrade cannot resurrect a
    //    stale name from a previous install.
    const [cn, cg] = await Promise.all([
      readCache<unknown>(CACHE_NATIONAL),
      readCache<unknown>(CACHE_GOVERNORS),
    ]);
    const cachedNational = cn ? validateNational(cn.payload, BUNDLED_NATIONAL.lastVerified) : null;
    const cachedGovernors = cg ? validateGovernors(cg.payload, BUNDLED_GOVERNORS_VERIFIED) : null;
    if (cachedNational || cachedGovernors) {
      publish({
        national: cachedNational || snapshot.national,
        governors: cachedGovernors || snapshot.governors,
        source: 'cached',
      });
    }

    const now = Date.now();
    const stale = (c: Cached<unknown> | null) => !c || now - c.fetchedAt > REFRESH_AFTER_MS;
    if (!stale(cn) && !stale(cg)) return;

    // 2. The network. Each file independently; one failing must not block the other.
    const results = await Promise.allSettled([
      fetchJson(NATIONAL_URL, cn?.etag ?? null),
      fetchJson(GOVERNORS_URL, cg?.etag ?? null),
    ]);

    let national = snapshot.national;
    let governors = snapshot.governors;
    let changed = false;

    const rn = results[0];
    if (rn.status === 'fulfilled') {
      if (rn.value.status === 304 && cn) {
        await writeCache(CACHE_NATIONAL, { ...cn, fetchedAt: now });
      } else if (rn.value.json) {
        const v = validateNational(rn.value.json, BUNDLED_NATIONAL.lastVerified);
        if (v) {
          national = v; changed = true;
          await writeCache(CACHE_NATIONAL, { payload: rn.value.json, etag: rn.value.etag, fetchedAt: now });
        }
      }
    }
    const rg = results[1];
    if (rg.status === 'fulfilled') {
      if (rg.value.status === 304 && cg) {
        await writeCache(CACHE_GOVERNORS, { ...cg, fetchedAt: now });
      } else if (rg.value.json) {
        const v = validateGovernors(rg.value.json, BUNDLED_GOVERNORS_VERIFIED);
        if (v) {
          governors = v; changed = true;
          await writeCache(CACHE_GOVERNORS, { payload: rg.value.json, etag: rg.value.etag, fetchedAt: now });
        }
      }
    }

    if (changed) publish({ national, governors, source: 'network' });
  })().catch(() => {
    // Every path above already swallows its own failures; this is belt and braces so a
    // programming error here can never surface on a screen. The bundled names stand.
  }).finally(() => { refreshing = null; });
  return refreshing;
}

/**
 * React access to the live snapshot. Re-renders the caller whenever a validated update
 * lands, and kicks off the refresh on first use.
 */
export function useOfficials(): OfficialsSnapshot {
  const [snap, setSnap] = useState(snapshot);
  useEffect(() => {
    const unsub = subscribe(() => setSnap(snapshot));
    refreshOfficials();
    return unsub;
  }, []);
  return snap;
}
