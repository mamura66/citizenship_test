/* The owner's analytics dashboard, and the JSON behind it.
 *
 * Two routes, both gated in src/worker.js by isOwner() and both answering 404 to
 * everybody else - see src/lib/owner.js for why 404 rather than 403.
 *
 * The page is rendered here in the Worker rather than served as a file from ./public.
 * A static /insights.html would sit on the CDN, readable by anyone who guessed the name,
 * and the gate would only be protecting the data inside it. Built here, there is nothing
 * on disk to find: the only way to see the page or its markup is to be signed in as the
 * owner.
 *
 * It renders server-side and needs no JavaScript. That is not purity - it means the
 * numbers are in the HTML, so a contrast or overflow measurement in a headless browser is
 * measuring the real thing rather than a loading state, and there is never a moment where
 * the page shows an empty chart that is about to be filled in.
 */

import { json } from '../lib/http.js';
import { cleanRange, getOverview, RANGES } from '../lib/insights.js';

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nf = new Intl.NumberFormat('en-US');

/** Bar width as a percentage. A count of zero draws nothing, but any count above zero
 *  keeps a visible sliver: eight payments beside five thousand page views is 0.15% of the
 *  width, and an empty track next to the number "8" reads as a rendering bug. */
const barWidth = (n, max) => (n > 0 ? `${Math.max(1, (n / max) * 100).toFixed(1)}%` : '0');

/** English country name from an ISO code. Intl carries the list, so there is no table of
 *  country names to maintain or get wrong. */
const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en-US'], { type: 'region' });
  } catch {
    return null;
  }
})();

function countryName(code) {
  if (!code) return 'Unknown';
  try {
    return (regionNames && regionNames.of(code)) || code;
  } catch {
    return code;
  }
}

/**
 * A share of a total, or null when the denominator is zero - "0%" of nothing is a
 * statement about data that does not exist.
 *
 * Anything under 1% keeps a decimal place. Eight payments against 5,000 page views is
 * 0.2%, and rounding that to "0%" reads as "nobody bought anything" - which is the exact
 * opposite of what happened.
 */
function share(n, of) {
  if (!(of > 0)) return null;
  const pct = (n / of) * 100;
  if (n > 0 && pct < 1) return `${pct.toFixed(pct < 0.1 ? 2 : 1)}%`;
  return `${Math.round(pct)}%`;
}

/* ---------------------------------------------------------------- page */

const HEAD = (range) => `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Insights &middot; Prepare for Citizenship</title>
<meta name="robots" content="noindex,nofollow,noarchive">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/site.css">
<style>
/* Dashboard-only rules. site.css supplies the palette, the type and the wrap; its own
   rules are sized for a marketing page (a 62px h1, 92px section padding), so the few
   that would dominate a dense screen are overridden here rather than edited there. */
:root {
  /* --ink-3 is 2.5:1 on white - fine for a hairline, not for text. Secondary text on this
     page uses this instead, which measures 6.8:1. */
  --ins-mute: rgba(11, 31, 23, 0.72);
}
body { font-size: 16px; }
.ins { padding: 28px 0 72px; max-width: 900px; }
.ins-h1 { font-size: 30px; line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 8px; }
.ins-sub { font-size: 14.5px; color: var(--ins-mute); margin: 0 0 18px; max-width: 46rem; }
.ins-ranges { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 22px; }
.ins-range {
  font-size: 13.5px; text-decoration: none; padding: 6px 12px; border-radius: 999px;
  border: 1px solid var(--line); color: var(--ins-mute);
}
.ins-range:hover { border-color: var(--accent); }
.ins-range[aria-current="page"] { background: var(--accent-ink); border-color: var(--accent-ink); color: #fff; }
.ins-card {
  border: 1px solid var(--line); border-radius: 14px; padding: 20px; margin: 0 0 16px;
  background: var(--ground);
}
.ins-card h2 { font-size: 19px; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 6px; }
.ins-note { font-size: 13px; color: var(--ins-mute); margin: 0 0 14px; }
.ins-note:last-child { margin-bottom: 0; }
.ins-empty { font-size: 14.5px; color: var(--ins-mute); margin: 0; }
.ins-warn { border-color: var(--accent); background: var(--accent-soft); }
.ins-warn code { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; word-break: break-all; }

/* Ranked list: label, proportional bar, count. One grid so the counts line up in a
   column whatever the label length, and minmax(0,...) so a long name wraps instead of
   widening the row - which is what would push the page sideways at 320px. */
.rank { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.rank li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; align-items: baseline; }
.rank-name { font-size: 14.5px; color: var(--ink); overflow-wrap: anywhere; }
.rank-num { font-size: 14.5px; font-weight: 600; font-variant-numeric: tabular-nums; text-align: right; }
.rank-sub { grid-column: 1 / -1; font-size: 12.5px; color: var(--ins-mute); margin: -2px 0 0; }
.rank-track { grid-column: 1 / -1; height: 6px; border-radius: 3px; background: var(--tint); overflow: hidden; }
.rank-bar { display: block; height: 6px; border-radius: 3px; background: var(--accent); }

/* The funnel. Rows, not a tapering shape: a shape implies each step is a subset of the
   one above it, and these are four independent counters. */
.funnel { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
.funnel li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; align-items: baseline; }
.funnel-step { font-size: 14.5px; color: var(--ink); }
.funnel-num { font-size: 21px; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
.funnel-of { grid-column: 1 / -1; font-size: 12.5px; color: var(--ins-mute); }
.funnel-track { grid-column: 1 / -1; height: 8px; border-radius: 4px; background: var(--tint); overflow: hidden; }
.funnel-bar { display: block; height: 8px; border-radius: 4px; background: var(--accent); }

/* A fixed height rather than an aspect ratio: 90 days of bars in a 16:9 box is a strip
   two pixels tall on a phone. preserveAspectRatio="none" then stretches the bars to fill
   the width, which is exactly what is wanted for bars and is why no text is inside. */
.chart-frame { border-bottom: 1px solid var(--line); }
.chart { width: 100%; height: 130px; display: block; }
.chart-bar { fill: var(--accent); }
.chart-dates {
  display: flex; justify-content: space-between; gap: 8px;
  font-size: 12px; color: var(--ins-mute); margin: 6px 0 0;
  font-variant-numeric: tabular-nums;
}

.ins-table { width: 100%; border-collapse: collapse; font-size: 13.5px; margin-top: 12px; }
.ins-table th, .ins-table td { text-align: left; padding: 5px 8px 5px 0; border-bottom: 1px solid var(--line); }
.ins-table td.num, .ins-table th.num { text-align: right; font-variant-numeric: tabular-nums; padding-right: 0; }
.ins-details summary { font-size: 13.5px; color: var(--accent-ink); cursor: pointer; margin-top: 14px; }
.ins-foot { font-size: 12.5px; color: var(--ins-mute); margin: 22px 0 0; }
@media (max-width: 420px) {
  .ins { padding-top: 20px; }
  .ins-card { padding: 16px; }
}
</style>
</head>
<body>
<main class="wrap ins">
<p class="eyebrow">Private &middot; owner only</p>
<h1 class="ins-h1">Insights</h1>
<p class="ins-sub">
  Counted first-party, with no cookie and no identifier of any kind &mdash; so these are
  counts of events, never people, and nobody is followed from one step to the next.
  <a href="/privacy-web#own-counter">What the policy says</a>.
</p>
<nav class="ins-ranges" aria-label="Date range">${RANGES.map((d) =>
  `<a class="ins-range" href="/insights?days=${d}"${d === range ? ' aria-current="page"' : ''}>Last ${d} days</a>`
).join('')}</nav>`;

const FOOT = `
<p class="ins-foot">
  Days are UTC. Page views come from the public pages only: the app is behind the sign-in
  wall and is deliberately not counted. Accounts, checkouts and payments are counted on
  the server at the moment they happen, so nothing here can be claimed by a browser.
</p>
</main>
</body>
</html>`;

/** The state before `wrangler d1 migrations apply` has been run. Expected, so it says what
 *  to do rather than reading as a bug. */
function setupCard(message) {
  return `<section class="ins-card ins-warn">
  <h2>Not set up yet</h2>
  <p class="ins-note">The analytics tables do not exist in D1 yet. Apply the migration, then reload:</p>
  <p class="ins-note"><code>npx wrangler d1 migrations apply pfc-analytics --remote</code></p>
  <p class="ins-note">D1 said: ${esc(message)}</p>
</section>`;
}

function countriesCard(data) {
  const rows = data.countries.filter((c) => c.code);
  const unknown = data.countries.find((c) => !c.code);
  const max = Math.max(1, ...rows.map((r) => r.views));
  const body = rows.length
    ? `<ul class="rank">${rows.map((c) => {
        const extra = [
          c.accounts ? `${nf.format(c.accounts)} account${c.accounts === 1 ? '' : 's'} created` : '',
          c.checkouts ? `${nf.format(c.checkouts)} checkout${c.checkouts === 1 ? '' : 's'} opened` : '',
        ].filter(Boolean).join(' &middot; ');
        return `<li>
    <span class="rank-name">${esc(countryName(c.code))}</span>
    <span class="rank-num">${nf.format(c.views)}</span>
    <span class="rank-track"><span class="rank-bar" style="width:${barWidth(c.views, max)}"></span></span>
    ${extra ? `<span class="rank-sub">${extra}</span>` : ''}
  </li>`;
      }).join('')}</ul>`
    : `<p class="ins-empty">No page views counted in this window yet.</p>`;

  return `<section class="ins-card">
  <h2>Where people are coming from</h2>
  <p class="ins-note">
    Page views by country, as Cloudflare resolved the request &mdash; no IP address is
    stored. Numbers are views, not visitors: one person reading three pages is three.
  </p>
  ${body}
  ${unknown ? `<p class="ins-note" style="margin-top:14px">${nf.format(unknown.views)} view${unknown.views === 1 ? '' : 's'} with no country. Cloudflare could not resolve one &mdash; which is every request under local <code>wrangler dev</code>, and occasionally Tor or a corporate proxy in production.</p>` : ''}
</section>`;
}

function funnelCard(data) {
  const t = data.totals;
  const steps = [
    ['Page views', t.views, 'Every view of a public page.'],
    ['Signup page views', t.signupViews, 'Views of /signup. The closest a count can get to intent.'],
    ['Accounts created', t.accounts, 'Written to the account store &mdash; password or Google.'],
    ['Checkouts opened', t.checkouts, 'The paywall handed a price to Paddle.js.'],
    ['Payments completed', t.payments, "Paddle's signed webhook confirmed a completed transaction for our price."],
  ];
  const max = Math.max(1, ...steps.map(([, n]) => n));
  const anything = steps.some(([, n]) => n > 0);

  return `<section class="ins-card">
  <h2>How far people get</h2>
  <p class="ins-note">
    Five independent counters over the same window. Read the percentages as ratios between
    counts, not as a conversion rate: with no identifier there is no way to know that the
    person who paid is one of the people who viewed a page, and somebody who signed up in
    June and paid today lands in one count and not the other.
  </p>
  ${anything
    ? `<ol class="funnel">${steps.map(([label, n, note]) => {
        const pct = label === 'Page views' ? null : share(n, t.views);
        return `<li>
    <span class="funnel-step">${label}<br><span class="funnel-of">${note}</span></span>
    <span class="funnel-num">${nf.format(n)}</span>
    <span class="funnel-track"><span class="funnel-bar" style="width:${barWidth(n, max)}"></span></span>
    ${pct ? `<span class="funnel-of">${pct} of page views</span>` : ''}
  </li>`;
      }).join('')}</ol>
  ${t.refunds ? `<p class="ins-note" style="margin-top:16px">${nf.format(t.refunds)} refund or chargeback in this window, so paid access was taken back that many times.</p>` : ''}`
    : `<p class="ins-empty">Nothing counted in this window yet. These fill in as the pages are visited and accounts are created &mdash; there is no historical data to back-fill, because none was collected before this was built.</p>`}
</section>`;
}

/**
 * Page views per day.
 *
 * A bar per day, scaled so the tallest bar is the busiest day. Deliberately not a line:
 * with a handful of views a line implies a trend through points that are mostly noise,
 * and a gap at zero is the honest shape of a quiet day.
 *
 * WHY THERE IS NO TEXT INSIDE THE SVG. The chart scales with the page (viewBox plus
 * width:100%), and everything in a viewBox scales - so an axis label set at 10px in a
 * 720-unit-wide chart renders at under 4px on a 320px phone, which is measurable and
 * illegible. Measured, then fixed: the scale and the dates are HTML around the chart, at
 * a real font size, and the exact numbers are in the table underneath. The same reason
 * the app's own activity chart (.spark in public/app.css) is a bare silhouette.
 */
function dailyCard(data) {
  const series = data.series;
  const max = Math.max(...series.map((d) => d.views));
  if (max <= 0) {
    return `<section class="ins-card">
  <h2>Page views by day</h2>
  <p class="ins-empty">No page views counted in this window yet.</p>
</section>`;
  }

  const W = 720;
  const H = 150;
  const slot = W / series.length;
  const barW = Math.max(1.5, Math.min(26, slot - 2));
  const bars = series.map((d, i) => {
    if (d.views <= 0) return '';
    const h = Math.max(2, (d.views / max) * H);
    const x = i * slot + (slot - barW) / 2;
    return `<rect class="chart-bar" x="${x.toFixed(1)}" y="${(H - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2"></rect>`;
  }).join('');

  const nice = (day) =>
    new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const mid = series[Math.floor(series.length / 2)];

  const table = [...series].reverse().filter((d) => d.views > 0)
    .map((d) => `<tr><td>${esc(d.day)}</td><td class="num">${nf.format(d.views)}</td></tr>`).join('');

  return `<section class="ins-card">
  <h2>Page views by day</h2>
  <p class="ins-note">
    ${esc(data.from)} to ${esc(data.to)}, UTC. The tallest bar is the busiest day:
    ${nf.format(max)} views.
  </p>
  <div class="chart-frame">
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img"
         aria-label="Page views per day for the last ${data.days} days. Busiest day ${max} views. The table below has every value.">
      ${bars}
    </svg>
    <p class="chart-dates"><span>${esc(nice(series[0].day))}</span><span>${esc(nice(mid.day))}</span><span>${esc(nice(series[series.length - 1].day))}</span></p>
  </div>
  <details class="ins-details">
    <summary>Show the days with views as a table</summary>
    <table class="ins-table"><thead><tr><th>Day</th><th class="num">Views</th></tr></thead><tbody>${table}</tbody></table>
  </details>
</section>`;
}

function pagesCard(data) {
  if (!data.pages.length) {
    return `<section class="ins-card">
  <h2>Pages</h2>
  <p class="ins-empty">No page views counted in this window yet.</p>
</section>`;
  }
  const max = Math.max(1, ...data.pages.map((p) => p.views));
  return `<section class="ins-card">
  <h2>Pages</h2>
  <p class="ins-note">
    Views per page. <code>/other</code> is any path outside the list of known public pages
    &mdash; the view is real, we just do not create a row for a URL we do not serve.
  </p>
  <ul class="rank">${data.pages.map((p) => `<li>
    <span class="rank-name">${esc(p.path)}</span>
    <span class="rank-num">${nf.format(p.views)}</span>
    <span class="rank-track"><span class="rank-bar" style="width:${barWidth(p.views, max)}"></span></span>
  </li>`).join('')}</ul>
</section>`;
}

/** Page views by hour, newest first. UTC, because this page is rendered on the server and
 *  the app's copy of the same list (public/app.js recentViewsPanel) is where the owner's
 *  own time zone is known. Rows from before migration 0002 have no hour and are counted
 *  in a line underneath instead of being given one. */
function recentCard(data) {
  const rows = data.recent || [];
  const untimed = data.untimedViews || 0;
  const body = rows.length
    ? `<table class="ins-table"><thead><tr><th>Hour (UTC)</th><th>Page</th><th>Country</th><th class="num">Views</th></tr></thead><tbody>${
        rows.slice(0, 60).map((r) => `<tr><td>${esc(r.at.slice(0, 10))} ${esc(r.at.slice(11, 16))}</td><td><code>${esc(r.path)}</code></td><td>${esc(countryName(r.country))}</td><td class="num">${nf.format(r.views)}</td></tr>`).join('')
      }</tbody></table>`
    : `<p class="ins-empty">No views with a time yet. Hours have been kept since 9 September 2026.</p>`;
  return `<section class="ins-card">
  <h2>Recent views, by hour</h2>
  <p class="ins-note">One row per hour, page and country. Still counts, not visitors.</p>
  ${body}
  ${untimed ? `<p class="ins-note" style="margin-top:14px">${nf.format(untimed)} earlier view${untimed === 1 ? '' : 's'} in this window were counted before times were kept and appear by day only.</p>` : ''}
</section>`;
}

/** GET /insights. Reached only when src/worker.js has established this is the owner. */
export async function insightsPage(request, env) {
  const range = cleanRange(new URL(request.url).searchParams.get('days'));

  let html = HEAD(range);
  try {
    const data = await getOverview(env, range);
    html += countriesCard(data) + funnelCard(data) + dailyCard(data) + recentCard(data) + pagesCard(data);
  } catch (err) {
    html += setupCard(err && err.message ? err.message : String(err));
  }
  html += FOOT;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Never cached anywhere, and never indexed even if the URL leaks.
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow, noarchive',
    },
  });
}

/** GET /api/analytics. The same figures as JSON, so they can be read without scraping the
 *  page - and so the numbers on screen and the numbers in the API cannot drift, since both
 *  come from getOverview(). */
export async function insightsData(request, env) {
  const range = cleanRange(new URL(request.url).searchParams.get('days'));
  try {
    return json(await getOverview(env, range));
  } catch (err) {
    // Says which state it is in. "Migration not applied" and "query broken" are different
    // problems and an empty object would hide both.
    return json({ error: 'not_set_up', message: err && err.message ? err.message : String(err) }, { status: 503 });
  }
}
