/* First-party analytics: the write side.
 *
 * Everything here increments a counter in D1 (migrations/0001_analytics.sql). Nothing
 * here writes a row about a person, because there is no identifier for a person to write:
 * no cookie is set, nothing is kept in the browser, and no IP address is stored or
 * hashed. The consequence is deliberate and is the reason the site needs no second
 * consent banner for this - see the header of the migration.
 *
 * TWO RULES THAT ARE NOT NEGOTIABLE HERE.
 *
 * 1. Recording must never block a response, and must never fail one. Every entry point
 *    hands its work to ctx.waitUntil and swallows its own errors. If the database is
 *    missing, unbound or unhappy, the visitor gets their page and nobody hears about it
 *    except the Worker log. Analytics is not worth a 500.
 *
 * 2. A count must be real. Nothing here estimates, samples or back-fills. A figure that
 *    is not known is absent, and the dashboard shows an empty state instead.
 */

/** The closed set of funnel steps. A name not in here is a programming error and is
 *  dropped rather than written, so the counters table cannot accumulate typos. */
export const EVENTS = new Set([
  'account_created',    // an account written to KV, password or Google
  'checkout_opened',    // /api/checkout answered, i.e. Paddle.js was handed a price
  'payment_completed',  // a completed transaction for our price, per Paddle's signed webhook
  'payment_refunded',   // a refund or chargeback adjustment, same source
]);

/** UTC day key. The dashboard groups on this, so it has to be the same string everywhere. */
export const utcDay = (date = new Date()) => date.toISOString().slice(0, 10);

/**
 * The public pages, and the only path values that ever reach the table.
 *
 * An allowlist rather than a sanitized free-for-all, for one reason: `path` is a primary
 * key column, so an unbounded set of values is an unbounded number of rows. A crawler or
 * a bored person inventing /aaa1 ... /aaa9999 would otherwise grow the table by a row per
 * invention per country. Anything unrecognized is still counted, as '/other' - the view
 * happened, we just decline to name a page we do not have.
 *
 * The app itself is absent on purpose. /app is behind the sign-in wall and does not load
 * this beacon; what somebody studies is theirs, and the privacy policy says so.
 */
const PUBLIC_PATHS = new Set([
  '/', '/support', '/terms', '/refunds', '/privacy', '/privacy-web',
  '/login', '/signup', '/forgot', '/reset',
]);

export const OTHER_PATH = '/other';

/** Normalizes a beacon-reported path to an allowlisted value, or null if it is not a
 *  plausible same-site path at all (in which case the beacon is dropped, not bucketed). */
export function normalizePath(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.length > 512) return null;
  // The query string is stripped before it is looked at: /reset carries a one-time
  // password-reset token in ?token=, and that must never reach a table that gets read for
  // fun. Trailing slashes collapse so / and // are one page.
  let path = raw.split(/[?#]/)[0].toLowerCase();
  if (/[\x00-\x1f\\]/.test(path)) return null;
  if (path.length > 1) path = path.replace(/\/+$/, '') || '/';
  if (path.endsWith('.html')) path = path.slice(0, -5) || '/';
  return PUBLIC_PATHS.has(path) ? path : OTHER_PATH;
}

/**
 * Automated clients that execute JavaScript and so can actually reach the beacon.
 *
 * Ordinary crawlers never run the script at all, which is the load-bearing filter and the
 * reason a per-view D1 write is safe here: write volume tracks people, not crawl budget.
 * This list is for the ones that would slip through - headless browsers, Lighthouse runs,
 * uptime monitors - plus the command-line clients that would reach it if pointed at it.
 */
const BOT_UA = new RegExp(
  [
    'bot', 'crawl', 'spider', 'slurp', 'scrap',
    'headless', 'phantomjs', 'puppeteer', 'selenium', 'webdriver',
    'lighthouse', 'pagespeed', 'gtmetrix', 'pingdom', 'ptst', 'webpagetest',
    'uptime', 'monitor', 'prerender', 'archiver', 'wget', 'curl',
    'python-requests', 'axios', 'node-fetch', 'go-http-client', 'java/',
  ].join('|'),
  'i'
);

/** Reason string when this hit should not be counted, or null to count it. */
export function botReason(request) {
  const ua = request.headers.get('user-agent') || '';
  if (ua.length < 16) return 'ua-missing';
  if (BOT_UA.test(ua)) return 'ua-pattern';
  // Cloudflare's own verdict, present on plans that include Bot Management and simply
  // absent otherwise - so it is a bonus check, not the one being relied on.
  if (request.cf && request.cf.verifiedBotCategory) return 'verified-bot';
  return null;
}

/**
 * The visitor's country, as Cloudflare already resolved it. Never derived from a header
 * the client controls, because that would let anyone color in the map.
 *
 * '' rather than a guess when it is unknown - which is the normal case under
 * `wrangler dev --local`, where there is no edge to have resolved anything. T1 is Tor and
 * XX is "Cloudflare could not tell"; both are honestly unknown for this purpose.
 */
export function countryOf(request) {
  const c = request.cf && request.cf.country;
  if (!c || c === 'XX' || c === 'T1' || !/^[A-Z]{2}$/.test(String(c))) return '';
  return String(c);
}

/** Runs a write off the response path. `ctx` may be missing (a call site without it), in
 *  which case the promise is simply left to run and its failure swallowed here. */
function detach(ctx, work) {
  const guarded = work().catch((err) => {
    // Logged, not surfaced. A missing table is the expected state before the migration is
    // applied, and it must not turn into a visible error on somebody's page view.
    console.warn('analytics write failed:', err && err.message ? err.message : err);
  });
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(guarded);
}

/** True when there is a database to write to at all. */
const bound = (env) => !!(env && env.ANALYTICS_DB);

/**
 * Count one page view.
 *
 * The UPSERT is the whole design: two visitors on the same page from the same country on
 * the same day are one row and one write, so the table stays small and there is nothing
 * to roll up later.
 */
export function recordPageview(env, ctx, request, rawPath) {
  if (!bound(env)) return;
  const path = normalizePath(rawPath);
  if (!path) return;
  const day = utcDay();
  const country = countryOf(request);
  detach(ctx, () =>
    env.ANALYTICS_DB.prepare(
      `INSERT INTO analytics_pageviews (day, path, country, views) VALUES (?, ?, ?, 1)
         ON CONFLICT (day, path, country) DO UPDATE SET views = views + 1`
    ).bind(day, path, country).run()
  );
}

/* Whose activity is not a customer's, and must never reach the figures.
 *
 * Two cases:
 *   - the owner, whose own signing up and clicking about would otherwise dominate the
 *     numbers while traffic is low;
 *   - anything on a reserved test domain. example.com, example.net, example.org and .test
 *     are reserved by IANA (RFC 2606 / RFC 6761) and can never receive mail, so no real
 *     customer can hold one. Automated checks use them, which is why they are here - but
 *     this is a statement about the addresses, not a switch for the tests, and it behaves
 *     the same for anybody.
 *
 * Payments are deliberately NOT filtered anywhere: money that moved is a real sale, even
 * if the owner made it while testing, and hiding it would be the more misleading choice.
 */
const RESERVED_DOMAINS = /@(?:example\.(?:com|net|org)|[^@]*\.test|[^@]*\.invalid|[^@]*\.localhost)$/i;

export function isNonCustomer(env, user) {
  const email = user && user.email ? String(user.email).toLowerCase() : '';
  if (!email) return false;
  if (RESERVED_DOMAINS.test(email)) return true;
  const owner = String((env && env.ANALYTICS_OWNER_EMAIL) || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return owner.includes(email);
}

/**
 * Count one funnel step.
 *
 * `country` is passed in rather than read from the request, because the honest value
 * differs per event: a signup knows the visitor's country, a Paddle webhook does not know
 * the buyer's. Pass '' when it is not knowable and the dashboard will keep it out of the
 * per-country table instead of inventing a location.
 */
export function recordEvent(env, ctx, event, country = '') {
  if (!bound(env)) return;
  if (!EVENTS.has(event)) {
    console.error(`analytics: undeclared event "${event}"`);
    return;
  }
  const day = utcDay();
  detach(ctx, () =>
    env.ANALYTICS_DB.prepare(
      `INSERT INTO analytics_counters (day, event, country, count) VALUES (?, ?, ?, 1)
         ON CONFLICT (day, event, country) DO UPDATE SET count = count + 1`
    ).bind(day, event, String(country || '')).run()
  );
}
