/* The signed-in user: who they are, what they have paid for, and their progress.
 *
 * /api/me is the one call the app makes before it draws anything. It answers "am I signed
 * in", "which country am I locked to" and "do I have paid access" in a single round trip,
 * and its `pro` field is the only thing that unlocks a paid screen. The browser cannot
 * set it.
 */

import { fail, json, readJson, sameOrigin } from '../lib/http.js';
import { getEntitlement, getProgress, putProgress, putUser } from '../lib/store.js';
import { hasPaidAccess } from '../lib/access.js';
import { publicUser } from './auth.js';
import { googleConfigured } from './google.js';
import { isReadyCountry } from '../lib/countries.js';

export async function me(request, env, ctx) {
  return json({ user: publicUser(ctx.user, await hasPaidAccess(env, ctx.user, ctx.session)) });
}

/** Sets the country once. Chosen at signup for a password account, and on first arrival
 *  for a Google account, because Google's consent screen has nowhere to ask.
 *
 *  It refuses to change an existing choice, by design: every recorded answer belongs to a
 *  section of one country's test, so switching would leave a performance page that reads
 *  as real data about a test the person is not taking. Support can clear it. */
export async function setCountry(request, env, ctx) {
  if (!sameOrigin(request)) return fail(403, 'bad_origin', 'Request blocked.');

  let body;
  try { body = await readJson(request); } catch { return fail(400, 'bad_body', 'Could not read that request.'); }
  const code = String(body.country || '').toLowerCase();

  // The lock is checked first, and deliberately: an account that already has a country is
  // being refused because of the lock, whatever it asked for. Reporting the allowlist here
  // instead would send someone to support about the wrong problem.
  if (ctx.user.country && ctx.user.country !== code) {
    return fail(409, 'locked', 'Your country is fixed to this account. Contact support if it is wrong.');
  }
  if (ctx.user.country === code) {
    return json({ user: publicUser(ctx.user, await hasPaidAccess(env, ctx.user, ctx.session)) });
  }

  if (!isReadyCountry(code)) return fail(400, 'invalid', 'That country is not available yet.');

  const user = await putUser(env, { ...ctx.user, country: code, countryLockedAt: Date.now() });
  return json({ user: publicUser(user, await hasPaidAccess(env, user, ctx.session)) });
}

/* ---------------------------------------------------------------- progress */

/** Progress lives on the server so the free-test allowance and the performance page
 *  survive a cleared browser or a second device - and so "one free test" means one. */
export async function readProgress(request, env, ctx) {
  return json(await getProgress(env, ctx.user.id));
}

export async function writeProgress(request, env, ctx) {
  if (!sameOrigin(request)) return fail(403, 'bad_origin', 'Request blocked.');
  let body;
  try { body = await readJson(request, 512 * 1024); } catch { return fail(400, 'bad_body', 'Could not read that request.'); }
  return json(await putProgress(env, ctx.user.id, body));
}

/* ---------------------------------------------------------------- config */

/** Everything the front end needs that differs between sandbox and live. All of it is
 *  public by nature - a Paddle client token and price id are meant to appear in a page -
 *  but it is served from here rather than baked into the asset so that switching Paddle
 *  environments is an environment-variable change and not a redeploy of the HTML. */
export async function config(request, env) {
  return json({
    google: googleConfigured(env),
    paddle: {
      environment: env.PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
      token: env.PADDLE_CLIENT_TOKEN || null,
      priceId: env.PADDLE_PRICE_ID || null,
      configured: !!(env.PADDLE_CLIENT_TOKEN && env.PADDLE_PRICE_ID),
    },
  });
}
