/* The whole data model, in one place, on a single KV namespace.
 *
 * KV is eventually consistent, so nothing here may depend on read-after-write across
 * colos. That rules KV out for anything that has to be exactly right the instant it is
 * written - which is why sign-in reads the session by its own key (a fresh key is served
 * from the colo that wrote it) and why entitlement is written once and only ever read.
 *
 * KEYS
 *   user:<email>     the account, looked up by normalised email (the login key)
 *   uid:<id>         id -> email, so a webhook carrying only our user id can find them
 *   gid:<google_sub> Google's stable subject -> email, so a returning Google user is
 *                    matched on the subject and not on a mutable email address
 *   sess:<token>     session -> {uid, email}, with a KV TTL doing the expiry
 *   ent:<id>         entitlement. Written by the payment webhook, never by the browser.
 *   prog:<id>        study progress and test history, so the free-test limit and the
 *                    performance page survive a cleared browser
 *   pevt:<event_id>  processed webhook ids, for idempotency
 *   rl:<bucket>      rate-limit counters
 *
 * PII: email and name only. No addresses, no payment details - Paddle holds those as
 * merchant of record and we never see a card.
 */

import { token as randomToken } from './crypto.js';

const DAY = 86_400;
export const SESSION_TTL = 30 * DAY;

const j = (v) => JSON.stringify(v);

/** Lowercased and trimmed. Deliberately does NOT strip dots or +tags: that is a
 *  Gmail-only rule, and applying it everywhere silently merges distinct addresses. */
export const normalizeEmail = (e) => String(e || '').trim().toLowerCase();

export const newId = () => crypto.randomUUID();

/* ---------------------------------------------------------------- users */

export async function getUserByEmail(env, email) {
  return env.PFC.get(`user:${normalizeEmail(email)}`, 'json');
}

export async function getUserById(env, id) {
  const email = await env.PFC.get(`uid:${id}`);
  return email ? getUserByEmail(env, email) : null;
}

export async function getUserByGoogleSub(env, sub) {
  const email = await env.PFC.get(`gid:${sub}`);
  return email ? getUserByEmail(env, email) : null;
}

export async function putUser(env, user) {
  const email = normalizeEmail(user.email);
  await env.PFC.put(`user:${email}`, j({ ...user, email }));
  await env.PFC.put(`uid:${user.id}`, email);
  if (user.googleSub) await env.PFC.put(`gid:${user.googleSub}`, email);
  return user;
}

export async function createUser(env, { email, name, passwordHash = null, googleSub = null, country = null }) {
  const user = {
    id: newId(),
    email: normalizeEmail(email),
    name: (name || '').trim().slice(0, 80),
    passwordHash,
    googleSub,
    // Locked once set: the country decides the question pool and the pass mark, so
    // changing it mid-preparation would silently invalidate every recorded answer.
    country,
    countryLockedAt: country ? Date.now() : null,
    createdAt: Date.now(),
  };
  return putUser(env, user);
}

/* ---------------------------------------------------------------- sessions */

/** `proUntil` exists to work around Cloudflare KV's negative caching.
 *
 *  A colo that has looked for `ent:<id>` and not found it caches that miss for up to a
 *  minute. So the moment after a payment is confirmed, the entitlement is written but the
 *  colo the customer is talking to can still answer "no" - which would show them the
 *  paywall they just paid to remove.
 *
 *  A session key, by contrast, is brand new and therefore has nothing cached against it.
 *  So on a confirmed purchase we mint a fresh session carrying `proUntil` a few minutes
 *  out, and read paid access as "the entitlement, or this hint while it is still valid".
 *  The hint expires on its own, after which only the entitlement counts - which is what
 *  keeps a refund effective. */
export async function createSession(env, user, { proUntil = null } = {}) {
  const t = randomToken();
  await env.PFC.put(`sess:${t}`, j({ uid: user.id, email: user.email, at: Date.now(), proUntil }), {
    expirationTtl: SESSION_TTL,
  });
  return t;
}

export const PRO_HINT_MS = 5 * 60 * 1000;

export async function getSession(env, t) {
  if (!t) return null;
  return env.PFC.get(`sess:${t}`, 'json');
}

export const destroySession = (env, t) => (t ? env.PFC.delete(`sess:${t}`) : Promise.resolve());

/* ---------------------------------------------------------------- entitlement */

/** The only source of truth for paid access. The browser is told the answer; it never
 *  supplies it. */
export async function getEntitlement(env, uid) {
  const e = await env.PFC.get(`ent:${uid}`, 'json');
  return e && e.pro === true ? e : null;
}

export const putEntitlement = (env, uid, data) => env.PFC.put(`ent:${uid}`, j(data));

/* ---------------------------------------------------------------- progress */

const EMPTY_PROGRESS = { answers: [], history: [], mode: 'study', versionId: null, updatedAt: 0 };

export async function getProgress(env, uid) {
  return (await env.PFC.get(`prog:${uid}`, 'json')) || { ...EMPTY_PROGRESS };
}

/** Caps are enforced here rather than in the browser, because the browser is not the
 *  thing we are protecting the storage limit from. */
export async function putProgress(env, uid, incoming) {
  const answers = Array.isArray(incoming.answers) ? incoming.answers.slice(-4000) : [];
  const history = Array.isArray(incoming.history) ? incoming.history.slice(-50) : [];
  const clean = {
    answers: answers.filter((r) => r && typeof r === 'object').map((r) => ({
      q: String(r.q ?? '').slice(0, 40),
      c: r.c == null ? null : String(r.c).slice(0, 40),
      ok: !!r.ok,
      at: Number(r.at) || Date.now(),
    })),
    history: history.filter((h) => h && typeof h === 'object').map((h) => ({
      at: Number(h.at) || Date.now(),
      pct: Math.max(0, Math.min(100, Number(h.pct) || 0)),
      passed: !!h.passed,
    })),
    mode: ['study', 'practice', 'interview', 'performance'].includes(incoming.mode) ? incoming.mode : 'study',
    versionId: incoming.versionId == null ? null : String(incoming.versionId).slice(0, 16),
    updatedAt: Date.now(),
  };
  await env.PFC.put(`prog:${uid}`, j(clean));
  return clean;
}

/* ---------------------------------------------------------------- rate limiting */

/** Fixed window, one KV key per bucket. Not exact under concurrency, and it does not have
 *  to be: it exists to make online password guessing pointless, not to bill anyone. */
export async function rateLimit(env, bucket, { limit, windowSec }) {
  const slot = Math.floor(Date.now() / 1000 / windowSec);
  const key = `rl:${bucket}:${slot}`;
  const n = Number(await env.PFC.get(key)) || 0;
  if (n >= limit) return { ok: false, retryAfter: windowSec };
  await env.PFC.put(key, String(n + 1), { expirationTtl: windowSec + 60 });
  return { ok: true };
}
