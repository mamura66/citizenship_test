/* Forgotten password: ask for a link, then use it.
 *
 * The link is the credential, so it is treated like one - 32 random bytes, stored only as
 * a SHA-256 hash so a leaked KV dump cannot be used to reset anybody's password, valid for
 * one hour, and deleted the moment it is used.
 *
 * Resetting also signs every other session out. There is no index of a user's sessions to
 * delete, so instead the account records when its credentials last changed and any session
 * older than that stops being accepted. Whoever reset the password is the only one left
 * signed in - which is the point, if the reason for resetting was that somebody else had
 * the old one.
 */

import { fail, json, readJson, sameOrigin, setCookie } from '../lib/http.js';
import { hashPassword, token as randomToken, b64u } from '../lib/crypto.js';
import { createSession, getUserByEmail, getUserById, normalizeEmail, putUser, rateLimit, SESSION_TTL } from '../lib/store.js';
import { hasPaidAccess } from '../lib/access.js';
import { emailConfigured, passwordResetEmail, sendEmail } from '../lib/email.js';
import { publicOrigin } from '../lib/origin.js';
import { SESSION_COOKIE, publicUser } from './auth.js';

const TTL_SECONDS = 60 * 60;
const MIN_PASSWORD = 10;

/** KV holds the hash, never the token itself - the same reason we do not store passwords. */
async function tokenKey(t) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return `pwreset:${b64u(digest)}`;
}

/* ---------------------------------------------------------------- request a link */

export async function forgot(request, env) {
  if (!sameOrigin(request)) return fail(403, 'bad_origin', 'Request blocked.');
  if (!emailConfigured(env)) {
    return fail(503, 'not_configured', 'Password reset is not available yet. Please contact support.');
  }

  let body;
  try { body = await readJson(request); } catch { return fail(400, 'bad_body', 'Could not read that request.'); }
  const email = normalizeEmail(body.email);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  // Per address as well as per IP: without the first, one address can be mail-bombed from
  // many machines; without the second, one machine can enumerate many addresses.
  for (const bucket of [`pwr:${email}`, `pwrip:${ip}`]) {
    const gate = await rateLimit(env, bucket, { limit: 5, windowSec: 3600 });
    if (!gate.ok) return fail(429, 'rate_limited', 'Too many reset requests. Try again in an hour.');
  }

  const user = email ? await getUserByEmail(env, email) : null;
  if (user) {
    const t = randomToken();
    await env.PFC.put(await tokenKey(t), JSON.stringify({ uid: user.id, at: Date.now() }), {
      expirationTtl: TTL_SECONDS,
    });
    // From configuration, never from the request - see src/lib/origin.js.
    const link = `${publicOrigin(request, env)}/reset?token=${encodeURIComponent(t)}`;
    const { sent, error } = await sendEmail(env, { to: user.email, ...passwordResetEmail({ link, name: user.name }) });
    if (!sent) {
      // Worth a real error: silently claiming to have sent an email that never went would
      // leave someone waiting for a message that is not coming.
      console.error(`password reset email failed for ${user.id}: ${error}`);
      return fail(502, 'send_failed', 'We could not send the email just now. Please try again in a minute.');
    }
  }

  // Same answer whether or not the address is registered. The response must not become a
  // way to ask "does this person have an account here?".
  return json({ ok: true });
}

/* ---------------------------------------------------------------- use the link */

/** Called by the reset page on load, so an expired or already-used link says so before
 *  somebody types a new password into a form that cannot work. */
export async function checkToken(request, env) {
  const t = new URL(request.url).searchParams.get('token') || '';
  if (!t) return json({ valid: false });
  const record = await env.PFC.get(await tokenKey(t), 'json');
  return json({ valid: !!record });
}

export async function reset(request, env) {
  if (!sameOrigin(request)) return fail(403, 'bad_origin', 'Request blocked.');

  let body;
  try { body = await readJson(request); } catch { return fail(400, 'bad_body', 'Could not read that request.'); }
  const t = String(body.token || '');
  const password = typeof body.password === 'string' ? body.password : '';

  if (password.length < MIN_PASSWORD) return fail(400, 'invalid', `Use at least ${MIN_PASSWORD} characters.`);
  if (password.length > 200) return fail(400, 'invalid', 'That password is too long.');

  const key = await tokenKey(t);
  const record = t ? await env.PFC.get(key, 'json') : null;
  if (!record) {
    return fail(400, 'bad_token', 'That reset link has expired or has already been used. Ask for a new one.');
  }

  const user = await getUserById(env, record.uid);
  if (!user) {
    await env.PFC.delete(key);
    return fail(400, 'bad_token', 'That reset link is no longer valid.');
  }
  if (password.trim().toLowerCase() === user.email) {
    return fail(400, 'invalid', 'Your password cannot be your email address.');
  }

  const updated = await putUser(env, {
    ...user,
    passwordHash: await hashPassword(password),
    // Every session older than this stops being accepted - see the note at the top.
    credentialsChangedAt: Date.now(),
  });
  // One use only.
  await env.PFC.delete(key);

  // Signed in immediately: the link already proved they can read the account's email,
  // which is at least as strong as the password they just chose.
  const session = await createSession(env, updated);
  return json(
    { user: publicUser(updated, await hasPaidAccess(env, updated, null)) },
    { headers: { 'set-cookie': setCookie(SESSION_COOKIE, session, { maxAge: SESSION_TTL }) } }
  );
}
