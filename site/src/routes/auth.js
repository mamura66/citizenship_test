/* Registration, sign-in, sign-out.
 *
 * Everyone has an account, including free users (Sandeep's call): progress, the one free
 * practice test and paid access all hang off a user id, so there is no anonymous mode to
 * keep working in parallel.
 */

import { fail, json, readJson, sameOrigin, setCookie, clearCookie, cookie } from '../lib/http.js';
import { hashPassword, verifyPassword } from '../lib/crypto.js';
import {
  createSession, createUser, destroySession, getEntitlement, getUserByEmail, rateLimit,
  normalizeEmail, SESSION_TTL,
} from '../lib/store.js';
import { isReadyCountry } from '../lib/countries.js';
import { countryOf, isNonCustomer, recordEvent } from '../lib/analytics.js';

export const SESSION_COOKIE = 'pfc_session';

/* Deliberately permissive: the address only has to be a plausible mailbox, and any
   stricter pattern rejects real addresses. Length is capped so KV keys stay sane. */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const MIN_PASSWORD = 10;

function validate({ email, password, name, country }, { requireCountry }) {
  const e = normalizeEmail(email);
  if (!e || e.length > 254 || !EMAIL_RE.test(e)) return 'Enter a valid email address.';
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters for your password.`;
  }
  if (password.length > 200) return 'That password is too long.';
  // A password that is just the email address is the one composition rule worth having.
  if (password.trim().toLowerCase() === e) return 'Your password cannot be your email address.';
  if (name != null && String(name).length > 80) return 'That name is too long.';
  if (requireCountry && !isReadyCountry(country)) return 'Choose the country you are applying in.';
  return null;
}

const sessionHeaders = (token) => ({ 'set-cookie': setCookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL }) });

const publicUser = (user, pro) => ({
  email: user.email,
  name: user.name || '',
  country: user.country || null,
  pro: !!pro,
  signInMethod: user.passwordHash ? 'password' : 'google',
});

export async function register(request, env, ctx) {
  if (!sameOrigin(request)) return fail(403, 'bad_origin', 'Request blocked.');
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  // Generous on purpose: a whole household or an office behind one carrier NAT shares an
  // address, and shutting them out is a worse failure than the bulk signup this stops.
  const gate = await rateLimit(env, `reg:${ip}`, { limit: 25, windowSec: 3600 });
  if (!gate.ok) return fail(429, 'rate_limited', 'Too many attempts. Try again later.');

  let body;
  try { body = await readJson(request); } catch { return fail(400, 'bad_body', 'Could not read that request.'); }

  const problem = validate(body, { requireCountry: true });
  if (problem) return fail(400, 'invalid', problem);

  const email = normalizeEmail(body.email);
  const existing = await getUserByEmail(env, email);
  if (existing) {
    // Says the address is taken, which it is - hiding that only sends people in circles
    // when they have simply forgotten they signed up. Sign-in stays non-enumerable.
    return fail(409, 'exists', 'There is already an account with that email. Sign in instead.');
  }

  const user = await createUser(env, {
    email,
    name: body.name,
    passwordHash: await hashPassword(body.password),
    country: String(body.country).toLowerCase(),
  });
  const token = await createSession(env, user);
  // Counted after the account is actually written, and off the response path, so a failing
  // analytics database can neither invent a signup nor slow one down.
  if (!isNonCustomer(env, user)) recordEvent(env, ctx && ctx.ctx, 'account_created', countryOf(request));
  return json({ user: publicUser(user, false) }, { headers: sessionHeaders(token) });
}

export async function login(request, env) {
  if (!sameOrigin(request)) return fail(403, 'bad_origin', 'Request blocked.');
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';

  let body;
  try { body = await readJson(request); } catch { return fail(400, 'bad_body', 'Could not read that request.'); }
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  // Two buckets: per address stops someone grinding one account, per IP stops a spray.
  for (const bucket of [`login:${email}`, `loginip:${ip}`]) {
    const gate = await rateLimit(env, bucket, { limit: 12, windowSec: 900 });
    if (!gate.ok) return fail(429, 'rate_limited', 'Too many sign-in attempts. Wait 15 minutes and try again.');
  }

  const user = await getUserByEmail(env, email);
  const ok = user && user.passwordHash ? await verifyPassword(password, user.passwordHash) : false;
  if (!ok) {
    // One message for "no such user", "wrong password" and "this account signs in with
    // Google", so the endpoint cannot be used to test whether an address is registered.
    // The sign-in page carries the Google button right underneath, which is the hint a
    // Google user needs without us confirming their address is on file.
    return fail(401, 'bad_credentials', 'That email and password do not match an account. If you signed up with Google, use the Google button.');
  }

  const token = await createSession(env, user);
  const ent = await getEntitlement(env, user.id);
  return json({ user: publicUser(user, !!ent) }, { headers: sessionHeaders(token) });
}

export async function logout(request, env) {
  if (!sameOrigin(request)) return fail(403, 'bad_origin', 'Request blocked.');
  await destroySession(env, cookie(request, SESSION_COOKIE));
  return json({ ok: true }, { headers: { 'set-cookie': clearCookie(SESSION_COOKIE) } });
}

export { publicUser, sessionHeaders };
