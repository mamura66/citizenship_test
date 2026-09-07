/* Sign in with Google - OAuth 2.0 authorization code flow, done server-side.
 *
 * Why the code flow and not the one-tap ID-token button: the code is exchanged from the
 * Worker over TLS using a secret the browser never sees, so a page cannot mint a session
 * by posting a token it found somewhere. The client secret lives in `wrangler secret`.
 *
 * Why the id_token's signature is not verified here: it comes straight back from Google's
 * token endpoint over an authenticated TLS connection, which is the case Google's own
 * documentation exempts from signature checking. The claims are still checked - audience,
 * issuer, expiry and email_verified - because those are about *what* the token says, not
 * about whether it is genuine.
 */

import { fail, json, redirect, setCookie, clearCookie, cookie } from '../lib/http.js';
import { token as randomToken, unb64u } from '../lib/crypto.js';
import { createSession, createUser, getUserByEmail, getUserByGoogleSub, putUser, SESSION_TTL } from '../lib/store.js';
import { SESSION_COOKIE } from './auth.js';
import { publicOrigin } from '../lib/origin.js';

const STATE_COOKIE = 'pfc_oauth';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export const googleConfigured = (env) => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

/** Google checks this against a list of registered URIs and rejects anything else, so it
 *  has to be exactly one value in production - which means configuration, not the
 *  request's Host header. Locally it falls back to the request origin so
 *  http://localhost:8788/api/auth/google/callback works. */
const redirectUri = (request, env) => `${publicOrigin(request, env)}/api/auth/google/callback`;

/* ------------------------------------------------------------------ start */

export function start(request, env) {
  if (!googleConfigured(env)) return fail(503, 'google_off', 'Google sign-in is not configured.');

  const state = randomToken(16);

  const authorize = new URL(AUTH_URL);
  authorize.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(request, env),
    response_type: 'code',
    // The minimum that identifies a person. No Drive, no contacts, nothing to consent to
    // beyond a name and an email address.
    scope: 'openid email profile',
    state,
    // Lets a returning user pick the account rather than being silently reused.
    prompt: 'select_account',
  }).toString();

  return redirect(authorize.toString(), {
    // State lives in a short-lived cookie rather than in KV: it only ever has to be
    // compared with itself, and a cookie makes the CSRF check read-your-own-write safe.
    'set-cookie': setCookie(STATE_COOKIE, state, { maxAge: 600 }),
  });
}

/* ------------------------------------------------------------------ callback */

const bounce = (message) => redirect(`/login?error=${encodeURIComponent(message)}`, {
  'set-cookie': clearCookie(STATE_COOKIE),
});

function decodeIdToken(idToken) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw new Error('malformed id_token');
  return JSON.parse(new TextDecoder().decode(unb64u(parts[1])));
}

export async function callback(request, env) {
  if (!googleConfigured(env)) return fail(503, 'google_off', 'Google sign-in is not configured.');

  const url = new URL(request.url);
  const savedState = cookie(request, STATE_COOKIE) || '';

  if (url.searchParams.get('error')) return bounce('Google sign-in was cancelled.');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state || !savedState || state !== savedState) {
    return bounce('That sign-in link expired. Try again.');
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(request, env),
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) return bounce('Google could not complete the sign-in.');

  let claims;
  try {
    claims = decodeIdToken((await res.json()).id_token);
  } catch {
    return bounce('Google returned something unexpected.');
  }

  const issuerOk = claims.iss === 'https://accounts.google.com' || claims.iss === 'accounts.google.com';
  const audienceOk = claims.aud === env.GOOGLE_CLIENT_ID;
  const fresh = Number(claims.exp) * 1000 > Date.now();
  if (!issuerOk || !audienceOk || !fresh) return bounce('That sign-in could not be verified.');
  // An unverified address would let someone claim an email they do not control, and with
  // it any password account already on that address.
  if (!claims.email || claims.email_verified !== true) {
    return bounce('Your Google account needs a verified email address.');
  }

  const user = await findOrCreate(env, claims);
  const token = await createSession(env, user);

  // A brand-new Google user has no country yet - the app's picker collects it and locks
  // it, which is the same gate signup does with its dropdown.
  const target = user.country ? '/app' : '/app?pick=country';

  // Two Set-Cookie headers, appended rather than joined: comma-joining them is the classic
  // way to end up with one cookie named after the tail of the other.
  const headers = new Headers({ location: target, 'cache-control': 'no-store' });
  headers.append('set-cookie', setCookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL }));
  headers.append('set-cookie', clearCookie(STATE_COOKIE));
  return new Response(null, { status: 302, headers });
}

/** Matched on Google's subject first: it is stable, whereas an email address on a Google
 *  Workspace account can be renamed. Falling back to email links a Google login to an
 *  account that was originally created with a password, so nobody ends up with two. */
async function findOrCreate(env, claims) {
  const bySub = await getUserByGoogleSub(env, claims.sub);
  if (bySub) return bySub;

  const byEmail = await getUserByEmail(env, claims.email);
  if (byEmail) {
    /* Linking a Google login to an account that already exists on this address, and
     * retiring that account's password as we do it.
     *
     * WHY THE PASSWORD GOES. Nothing verifies an email address at registration yet, so
     * anyone can create an account on an address they do not own. If Google then linked
     * into it and left the password working, whoever registered first would keep a way in
     * to the real owner's account - including any access the owner later paid for. Google
     * has verified this address; the password never was, so the verified credential wins.
     *
     * The cost falls on the honest case: someone who signed up with a password and then
     * uses the Google button can no longer use that password. They keep their account and
     * their progress, and the Google button they just pressed is how they get in. Proper
     * email verification would let both live side by side, and needs an email provider we
     * have not chosen yet.
     */
    return putUser(env, {
      ...byEmail,
      googleSub: claims.sub,
      passwordHash: null,
      passwordRetiredAt: byEmail.passwordHash ? Date.now() : (byEmail.passwordRetiredAt || null),
      name: byEmail.name || claims.name || '',
    });
  }
  return createUser(env, { email: claims.email, name: claims.name, googleSub: claims.sub, country: null });
}

/** Used by the sign-in pages to decide whether to draw the Google button at all, rather
 *  than showing a button that returns 503. */
export async function status(request, env) {
  return json({ google: googleConfigured(env) });
}
