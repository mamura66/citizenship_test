/* The single question "does this account have paid access?", answered in one place.
 *
 * Two sources, both server-side:
 *   1. the entitlement record, written only by a verified payment
 *   2. the session's short-lived `proUntil` hint, set when a payment was confirmed
 *      directly against Paddle's API - see createSession() for why that is needed
 *
 * Nothing in the browser is consulted, and no route is allowed to answer this question
 * for itself.
 */

import { getEntitlement } from './store.js';

export async function hasPaidAccess(env, user, session) {
  const ent = await getEntitlement(env, user.id);
  if (ent) return true;
  const until = session && Number(session.proUntil);
  return !!(until && until > Date.now());
}
