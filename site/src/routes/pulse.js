/* The page-view beacon.
 *
 * Called by public/analytics.js on every public page. Reaching it already implies a
 * client that ran JavaScript, which is what keeps a per-view D1 write proportional to
 * people rather than to crawl budget - the ~250 static pages and content packs are
 * fetched by crawlers constantly and none of those hits get here.
 *
 * NAMED /api/pulse RATHER THAN /api/analytics/collect. Content blockers match paths
 * containing "analytics", "collect" or "track" by name, even first-party. Being blocked
 * would quietly under-count exactly the privacy-conscious slice of real visitors, which
 * is the last group whose page views should silently disappear. /api/analytics is the
 * owner's read-only route and is gated; this is the write one.
 *
 * ALWAYS 204, whether the hit was counted, screened as a bot, throttled or malformed. The
 * response must not tell a caller which rule it tripped, or the screens become trivial to
 * probe. Nothing is inferred from the silence either: what was not counted is simply not
 * in the numbers.
 */

import { cookie, readJson, sameOrigin } from '../lib/http.js';
import { botReason, recordPageview } from '../lib/analytics.js';
import { getSession, getUserById } from '../lib/store.js';
import { isOwner } from '../lib/owner.js';
import { SESSION_COOKIE } from './auth.js';

/** True when this beacon came from the owner's own browsing.
 *
 *  The session is read to decide *not* to count, and nothing about it is stored. Doing it
 *  server-side rather than with a browser flag means it holds in every browser and on
 *  every device the owner is signed in on, without them having to remember to set
 *  anything. The manual switch still covers signed-out browsing. */
async function isOwnVisit(request, env) {
  try {
    const token = cookie(request, SESSION_COOKIE);
    if (!token) return false;
    const session = await getSession(env, token);
    if (!session) return false;
    const user = await getUserById(env, session.uid);
    return isOwner(env, user);
  } catch {
    // A failure here must not stop a genuine page view being counted.
    return false;
  }
}

/**
 * Per-isolate write ceiling.
 *
 * A cheap bound on the worst case: someone who has read this file POSTing in a loop from
 * a browser tab. It cannot be exact - an isolate is per colo and short-lived - and does
 * not need to be, because it is not a security control. Its job is to stop one client
 * turning a page-view counter into a D1 write bill. Legitimate traffic on this site is
 * orders of magnitude under the ceiling, so a real visitor is never the one throttled.
 *
 * Deliberately not KV-backed: a KV read plus write per beacon would cost more than the
 * page view it is protecting.
 */
const CEILING_PER_MINUTE = 600;
let windowStart = 0;
let windowCount = 0;

function overCeiling() {
  const minute = Math.floor(Date.now() / 60_000);
  if (minute !== windowStart) {
    windowStart = minute;
    windowCount = 0;
  }
  windowCount += 1;
  return windowCount > CEILING_PER_MINUTE;
}

const noContent = () =>
  new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });

export async function pulse(request, env, ctx) {
  // SameSite alone does not stop another site POSTing here, and a page view attributed to
  // a path we never served is worse than a missing one.
  if (!sameOrigin(request)) return noContent();
  if (botReason(request)) return noContent();
  if (overCeiling()) return noContent();

  let body;
  try {
    // Bodies are a few dozen bytes. Anything larger is not our client.
    body = await readJson(request, 1024);
  } catch {
    return noContent();
  }

  if (await isOwnVisit(request, env)) return noContent();
  recordPageview(env, ctx.ctx, request, body.path);
  return noContent();
}
