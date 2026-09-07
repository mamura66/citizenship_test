/* Paddle: opening a checkout, and the webhook that is the only thing which ever grants
 * paid access.
 *
 * Paddle is merchant of record, so it takes the payment, charges the right tax in the
 * buyer's country and files it. We never see a card number and store no billing details.
 *
 * THE RULE, and it is the whole point of this file: a completed payment is a fact only
 * Paddle can assert. The browser asks for a checkout; Paddle's signed webhook is what
 * writes the entitlement. Nothing on the client side can unlock a paid screen, which is
 * exactly the bug the iPhone app had to be fixed for (BUILD_PLAN v12).
 */

import { fail, json, readJson, sameOrigin, setCookie } from '../lib/http.js';
import { hmacSha256Hex, timingSafeEqual } from '../lib/crypto.js';
import {
  createSession, getUserById, getUserByEmail, putEntitlement, putUser,
  PRO_HINT_MS, SESSION_TTL,
} from '../lib/store.js';
import { SESSION_COOKIE, publicUser } from './auth.js';
import { countryOf, isNonCustomer, recordEvent } from '../lib/analytics.js';

/* ---------------------------------------------------------------- checkout */

/** Hands the browser what Paddle.js needs to open the overlay: the price to charge, and
 *  the user id to stamp on the transaction so the webhook knows whose account to unlock.
 *
 *  The id is passed as custom_data from the client, which means a determined person could
 *  substitute someone else's - i.e. pay for a stranger's access. That is not an attack
 *  worth server-side transaction creation, and the webhook still checks the price and the
 *  completed status before granting anything. */
export async function startCheckout(request, env, ctx) {
  if (!sameOrigin(request)) return fail(403, 'bad_origin', 'Request blocked.');
  if (!env.PADDLE_CLIENT_TOKEN || !env.PADDLE_PRICE_ID) {
    return fail(503, 'not_configured', 'Payment is not switched on yet.');
  }
  // Refused here as well as hidden in the UI. A paused sale has to be enforced on the
  // server, or a stale page keeps opening checkouts Paddle rejects.
  if (env.PADDLE_SALES_PAUSED === 'true') {
    return fail(503, 'sales_paused', 'Full access is not on sale just yet.');
  }
  // Counted here and not in the browser, and counted only on the path that actually
  // returns a price - the 503s above are refusals, not checkouts. What this measures is
  // "the paywall's button was pressed and we handed Paddle.js a price to charge", which
  // is as close to "reached the checkout" as a server can honestly get: whether Paddle's
  // own overlay then rendered happens cross-origin, where we have no view.
  if (!isNonCustomer(env, ctx.user)) recordEvent(env, ctx && ctx.ctx, 'checkout_opened', countryOf(request));
  return json({
    environment: env.PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
    token: env.PADDLE_CLIENT_TOKEN,
    priceId: env.PADDLE_PRICE_ID,
    customer: { email: ctx.user.email },
    customData: { user_id: ctx.user.id },
  });
}

/** The price ids on a transaction, however Paddle chose to shape the item. */
const priceIds = (data) => (data?.items || []).map((i) => i?.price?.id || i?.price_id).filter(Boolean);

/* ---------------------------------------------------------------- confirm */

/** Asks Paddle directly whether a transaction completed, and grants access on the answer.
 *
 * The webhook is still the authority and still the thing that catches a payment completed
 * hours later or reversed next week. This exists because of timing: Paddle sends the
 * webhook and returns the customer's browser at the same moment, with no ordering between
 * them, and Cloudflare KV can keep serving a cached "no entitlement" for up to a minute
 * after the webhook writes one. Reading the transaction straight from Paddle's API skips
 * both problems, so somebody who has just paid sees what they paid for immediately.
 *
 * Everything is checked server-side: the transaction must be completed, it must be for our
 * price, and it must belong to this account - so posting somebody else's transaction id
 * here grants nothing. */
export async function confirmCheckout(request, env, ctx) {
  if (!sameOrigin(request)) return fail(403, 'bad_origin', 'Request blocked.');

  // The request is checked before the configuration, so the route's contract does not
  // change the day the API key is added.
  let body;
  try { body = await readJson(request); } catch { return fail(400, 'bad_body', 'Could not read that request.'); }
  const txnId = String(body.transactionId || '');
  if (!/^txn_[A-Za-z0-9]+$/.test(txnId)) return fail(400, 'invalid', 'That is not a transaction reference.');

  if (!env.PADDLE_API_KEY) {
    // Without the API key this route cannot verify anything, and must not guess. The
    // webhook path still works; the browser just waits for it.
    return fail(503, 'not_configured', 'Cannot confirm the payment yet.');
  }

  const base = env.PADDLE_ENVIRONMENT === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
  const res = await fetch(`${base}/transactions/${txnId}`, {
    headers: { authorization: `Bearer ${env.PADDLE_API_KEY}`, 'content-type': 'application/json' },
  });
  if (!res.ok) return fail(502, 'paddle_unreachable', 'Could not reach Paddle to confirm the payment.');

  const txn = (await res.json()).data || {};
  if (txn.status !== 'completed') {
    // Not an error: a card can still be processing. The caller retries.
    return json({ user: publicUser(ctx.user, false), status: txn.status || 'unknown' });
  }
  if (env.PADDLE_PRICE_ID && !priceIds(txn).includes(env.PADDLE_PRICE_ID)) {
    return fail(409, 'wrong_product', 'That payment was not for full access.');
  }
  // The transaction has to be this account's. Paddle's own copy of custom_data is the
  // check - not the id the browser sent us.
  const stampedId = txn.custom_data && txn.custom_data.user_id;
  const sameEmail = txn.customer && txn.customer.email
    && String(txn.customer.email).toLowerCase() === ctx.user.email;
  if (stampedId !== ctx.user.id && !sameEmail) {
    return fail(403, 'not_yours', 'That payment belongs to a different account.');
  }

  await putEntitlement(env, ctx.user.id, {
    pro: true,
    source: 'paddle',
    confirmedVia: 'api',
    transactionId: txn.id || txnId,
    customerId: txn.customer_id || null,
    at: Date.now(),
  });
  if (txn.customer_id) {
    await putUser(env, { ...ctx.user, paddleCustomerId: txn.customer_id });
    await env.PFC.put(`pcust:${txn.customer_id}`, ctx.user.id);
  }

  // A fresh session carrying the hint, so the next few minutes of requests are answered
  // correctly even from a colo still caching the old "no entitlement".
  const token = await createSession(env, ctx.user, { proUntil: Date.now() + PRO_HINT_MS });
  return json(
    { user: publicUser(ctx.user, true), status: 'completed' },
    { headers: { 'set-cookie': setCookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL }) } }
  );
}

/* ---------------------------------------------------------------- webhook */

/** Paddle-Signature looks like `ts=1671552777;h1=<hex>`. The HMAC covers `ts:rawBody`,
 *  so the body has to be verified as the exact bytes Paddle sent - before any JSON
 *  parsing, and never re-serialised. */
async function verify(request, rawBody, secret) {
  const header = request.headers.get('paddle-signature') || '';
  const parts = Object.fromEntries(
    header.split(';').map((p) => {
      const i = p.indexOf('=');
      return i < 0 ? ['', ''] : [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return { ok: false, why: 'missing signature' };

  // Five seconds, as Paddle recommends: enough for a legitimate delivery, short enough
  // that a captured request cannot be replayed later. Retries carry a fresh signature.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 5) return { ok: false, why: 'stale timestamp' };

  const expected = await hmacSha256Hex(secret, `${ts}:${rawBody}`);
  if (!timingSafeEqual(expected, h1)) return { ok: false, why: 'signature mismatch' };
  return { ok: true };
}

export async function webhook(request, env, ctx) {
  if (!env.PADDLE_WEBHOOK_SECRET) return fail(503, 'not_configured', 'Webhook is not configured.');

  const rawBody = await request.text();
  const check = await verify(request, rawBody, env.PADDLE_WEBHOOK_SECRET);
  if (!check.ok) {
    // 401, not 400: an unverified body is not a malformed request, and Paddle's dashboard
    // should show this as rejected rather than retried forever.
    return fail(401, 'bad_signature', check.why);
  }

  let event;
  try { event = JSON.parse(rawBody); } catch { return fail(400, 'bad_body', 'Unparseable body.'); }

  // Paddle retries until it gets a 2xx, so the same event can arrive more than once.
  const eventId = String(event.event_id || '');
  if (eventId) {
    if (await env.PFC.get(`pevt:${eventId}`)) return json({ ok: true, duplicate: true });
    await env.PFC.put(`pevt:${eventId}`, '1', { expirationTtl: 30 * 86_400 });
  }

  const handled = {
    'transaction.completed': grant,
    'adjustment.created': maybeRevoke,
  }[event.event_type];

  // Anything we have not subscribed to still gets a 2xx: telling Paddle a delivery failed
  // when we simply do not care about it only earns retries.
  if (!handled) return json({ ok: true, ignored: event.event_type });

  let outcome;
  try {
    outcome = await handled(env, event);
  } catch (err) {
    // A 500 makes Paddle retry, which is what we want if KV was briefly unavailable.
    return fail(500, 'handler_failed', err.message);
  }

  /* The paid count comes from here and nowhere else.
   *
   * WHY NOT ALSO FROM confirmCheckout. Both routes grant access for the same purchase -
   * that is deliberate, because Paddle returns the browser and calls the webhook with no
   * ordering between them. But they would then count the same payment twice, and telling
   * the two apart needs a per-transaction record, which is exactly the kind of row this
   * schema does not keep. The webhook is the better of the two to count from anyway: it
   * is already exactly-once (the `pevt:` guard above), it is Paddle's own assertion rather
   * than our reading of an API call, and it is the only one that fires for a payment
   * completed hours later or reversed next week.
   *
   * Country is '' on purpose. The request carrying this fact came from Paddle's servers,
   * so request.cf.country is Paddle's location, not the buyer's - a plausible number that
   * would mean nothing. See migrations/0001_analytics.sql. */
  if (outcome === 'granted') recordEvent(env, ctx && ctx.ctx, 'payment_completed', '');
  if (outcome === 'revoked') recordEvent(env, ctx && ctx.ctx, 'payment_refunded', '');
  return json({ ok: true });
}

/* ---------------------------------------------------------------- handlers */

/** Finds the account a transaction belongs to: the user id we stamped on it, or failing
 *  that the email Paddle billed - which covers a payment made from a Paddle-hosted link
 *  that never went through our checkout. */
async function resolveUser(env, data) {
  const id = data?.custom_data?.user_id;
  if (id) {
    const byId = await getUserById(env, String(id));
    if (byId) return byId;
  }
  const email = data?.customer?.email || data?.billing_details?.email;
  if (email) {
    const byEmail = await getUserByEmail(env, email);
    if (byEmail) return byEmail;
  }
  return null;
}

/** Returns 'granted' when this event actually unlocked an account, so the caller knows
 *  whether there is a payment to count. An ignored event returns nothing. */
async function grant(env, event) {
  const data = event.data || {};
  if (data.status !== 'completed') return; // paid is the only status that unlocks anything

  // Guards against a transaction for some other price - a future subscription, or a
  // tampered checkout - being read as a purchase of full access.
  if (env.PADDLE_PRICE_ID && !priceIds(data).includes(env.PADDLE_PRICE_ID)) return;

  const user = await resolveUser(env, data);
  if (!user) throw new Error(`no account for transaction ${data.id}`);

  await putEntitlement(env, user.id, {
    pro: true,
    source: 'paddle',
    transactionId: data.id || null,
    customerId: data.customer_id || null,
    at: Date.now(),
  });

  // Kept so a refund event, which carries only Paddle's ids, can find the account again.
  if (data.customer_id && user.paddleCustomerId !== data.customer_id) {
    await putUser(env, { ...user, paddleCustomerId: data.customer_id });
    await env.PFC.put(`pcust:${data.customer_id}`, user.id);
  }
  return 'granted';
}

/** A refund or a chargeback takes access away again. Paddle sends adjustments for both.
 *  Returns 'revoked' when access was actually taken away, for the same reason grant()
 *  reports itself. */
async function maybeRevoke(env, event) {
  const data = event.data || {};
  if (!['refund', 'chargeback', 'chargeback_warning'].includes(data.action)) return;
  if (data.status && !['approved', 'pending_approval'].includes(data.status)) return;

  let userId = data?.custom_data?.user_id || null;
  if (!userId && data.customer_id) userId = await env.PFC.get(`pcust:${data.customer_id}`);
  if (!userId) return;

  await putEntitlement(env, userId, {
    pro: false,
    source: 'paddle',
    revokedBecause: data.action,
    adjustmentId: data.id || null,
    at: Date.now(),
  });
  return 'revoked';
}
