/* First-party analytics: the read side.
 *
 * Four grouped reads over two tables of counters, assembled into the shape the dashboard
 * draws (src/routes/insights.js) and the shape /api/analytics returns. There is no rollup
 * step to be behind or ahead of, because the tables are already the rollup.
 *
 * WHAT CANNOT BE ANSWERED FROM HERE, AND MUST NOT BE IMPLIED.
 * There is no visitor identifier anywhere in the schema, so:
 *   - "unique visitors" does not exist. The top of the funnel is page views, which is a
 *     bigger number than the number of people.
 *   - the funnel is four independent counters over one window, not a cohort followed from
 *     one step to the next. Someone who signed up in June and paid today contributes to
 *     one step and not the other, and a 90-day ratio is not the same thing as a
 *     conversion rate. Every ratio this returns is labeled as a ratio of counts on
 *     screen; do not relabel it.
 */

const num = (v) => Number(v ?? 0);

const dayKey = (d) => d.toISOString().slice(0, 10);

/** Inclusive window ending today, in UTC. `days` counts back from and including today. */
function window(days) {
  const to = new Date();
  const from = new Date(to.getTime());
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: dayKey(from), to: dayKey(to) };
}

export const RANGES = [7, 28, 90];
export const DEFAULT_RANGE = 28;

/** Clamps a query-string range to one of the offered windows, so a hand-typed ?days=
 *  cannot ask for a scan of all history. */
export const cleanRange = (raw) => (RANGES.includes(Number(raw)) ? Number(raw) : DEFAULT_RANGE);

/**
 * Everything both the page and the JSON route need, in one call.
 *
 * Throws if the tables do not exist yet - the caller renders the "apply the migration"
 * state, which is the expected condition on a fresh database and reads better than a 500.
 */
export async function getOverview(env, days = DEFAULT_RANGE) {
  const { from, to } = window(days);
  const db = env.ANALYTICS_DB;

  const [byDay, byCountry, byPath, counters] = await Promise.all([
    db.prepare(
      `SELECT day, SUM(views) AS views FROM analytics_pageviews
        WHERE day >= ? AND day <= ? GROUP BY day ORDER BY day ASC`
    ).bind(from, to).all(),
    db.prepare(
      `SELECT country, SUM(views) AS views FROM analytics_pageviews
        WHERE day >= ? AND day <= ? GROUP BY country ORDER BY views DESC`
    ).bind(from, to).all(),
    db.prepare(
      `SELECT path, SUM(views) AS views FROM analytics_pageviews
        WHERE day >= ? AND day <= ? GROUP BY path ORDER BY views DESC LIMIT 25`
    ).bind(from, to).all(),
    db.prepare(
      `SELECT event, country, SUM(count) AS count FROM analytics_counters
        WHERE day >= ? AND day <= ? GROUP BY event, country`
    ).bind(from, to).all(),
  ]);

  const eventTotal = (name) =>
    counters.results.filter((r) => r.event === name).reduce((sum, r) => sum + num(r.count), 0);

  // Per-country counts for the two events whose country really is the visitor's own.
  // payment_* rows carry '' by design (see the migration) and so contribute nothing here.
  const perCountry = new Map();
  for (const row of byCountry.results) {
    perCountry.set(row.country || '', { code: row.country || '', views: num(row.views), accounts: 0, checkouts: 0 });
  }
  for (const row of counters.results) {
    const key = row.country || '';
    const field = { account_created: 'accounts', checkout_opened: 'checkouts' }[row.event];
    if (!field) continue;
    const cur = perCountry.get(key) ?? { code: key, views: 0, accounts: 0, checkouts: 0 };
    cur[field] += num(row.count);
    perCountry.set(key, cur);
  }

  // Zero-fill, so a quiet day is a gap at zero rather than a missing column that makes
  // traffic look steadier than it was.
  const seen = new Map(byDay.results.map((r) => [r.day, num(r.views)]));
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayKey(d);
    series.push({ day: key, views: seen.get(key) ?? 0 });
  }

  const pages = byPath.results.map((r) => ({ path: r.path, views: num(r.views) }));
  const views = byCountry.results.reduce((sum, r) => sum + num(r.views), 0);

  return {
    from,
    to,
    days,
    totals: {
      views,
      // The closest thing to intent that a counter can honestly report: how many views
      // the signup page itself got. Not "people who considered signing up".
      signupViews: pages.find((p) => p.path === '/signup')?.views ?? 0,
      accounts: eventTotal('account_created'),
      checkouts: eventTotal('checkout_opened'),
      payments: eventTotal('payment_completed'),
      refunds: eventTotal('payment_refunded'),
    },
    series,
    pages,
    countries: [...perCountry.values()]
      .filter((c) => c.views || c.accounts || c.checkouts)
      .sort((a, b) => b.views - a.views || b.accounts - a.accounts),
  };
}
