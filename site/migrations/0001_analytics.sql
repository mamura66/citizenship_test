-- ===========================================================================
-- 0001_analytics — first-party, cookieless, identifier-free site analytics
-- ===========================================================================
-- Answers two questions and only two: where in the world are people coming
-- from, and how many of them got as far as an account, a checkout and a
-- payment. Owner-only; see src/routes/insights.js.
--
-- WHY D1 AND NOT KV. This is counting and grouping. KV can hold a number but
-- cannot sum one dimension while grouping by another, so every "top countries"
-- read would mean listing and fetching every key.
--
-- WHY THERE IS NO VISITOR COLUMN, AND NO RAW EVENT TABLE.
-- /privacy-web.html describes Google Analytics with a consent banner for the
-- EEA, the UK and Switzerland. A second mechanism that identified a visitor -
-- a cookie, a localStorage id, or a hashed IP, which is still personal data
-- under UK/EU law - would need its own lawful basis and probably its own
-- banner. So nothing here identifies anybody: there are no rows about people,
-- only counters. Every table below is already the aggregate, incremented in
-- place with an UPSERT. That is the deliberate difference from PastClimate's
-- migrations/0024_analytics.sql, which stores one row per pageview carrying a
-- daily-rotating visitor hash and a session id and rolls them up nightly. It
-- can therefore report unique visitors, bounce rate and a per-person funnel;
-- this cannot, and says so on screen rather than implying otherwise.
--
-- WHAT THAT COSTS. "Visitors" is unanswerable - the top of the funnel is page
-- views, which is a larger number than the number of people. Conversion is a
-- ratio between two independent counters over the same window, not a rate at
-- which individuals progressed. The dashboard labels both.
--
-- NO IP ADDRESS IS STORED, hashed or otherwise. Country comes from
-- request.cf.country, which Cloudflare has already derived, and country is as
-- fine-grained as this gets.
--
-- Apply with: npx wrangler d1 migrations apply pfc-analytics [--local]

-- ---------------------------------------------------------------------------
-- Page views. One row per (day, path, country), counted up.
--
-- Cardinality is bounded on every axis: `day` grows by one a day, `country`
-- by ~250 values that Cloudflare defines, and `path` by an allowlist in
-- src/lib/analytics.js - anything not on it is counted as '/other' rather
-- than becoming a row of its own, so a crawler inventing URLs cannot grow
-- this table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_pageviews (
    day     TEXT NOT NULL,             -- YYYY-MM-DD UTC, the grouping key everywhere
    path    TEXT NOT NULL,             -- allowlisted, query string stripped
    country TEXT NOT NULL DEFAULT '',  -- request.cf.country; '' when Cloudflare has none
    views   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, path, country)
);

-- Every dashboard query filters on a date range first, so day leads.
CREATE INDEX IF NOT EXISTS ix_analytics_pageviews_day ON analytics_pageviews (day);

-- ---------------------------------------------------------------------------
-- The funnel steps, and anything else worth counting that is not a page view.
--
-- One table with an `event` discriminator rather than a column or a table per
-- step: the set of steps will change, and adding one should not need a
-- migration. `event` is a closed set defined in src/lib/analytics.js.
--
-- These are counted on the SERVER, at the moment the thing actually happened -
-- an account written, a checkout handed to Paddle.js, a payment Paddle has
-- confirmed with a signed webhook. None of them can be claimed by a browser.
--
-- COUNTRY IS NOT THE SAME THING IN EVERY ROW, and the dashboard must not mix
-- them:
--   account_created, checkout_opened  -> request.cf.country, the visitor's own
--   payment_completed, payment_refunded -> '' , because the request that
--     carries this fact is Paddle's server calling our webhook, and its
--     country is Paddle's, not the buyer's. Recording it would be a plausible
--     number that means nothing.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS analytics_counters (
    day     TEXT NOT NULL,
    event   TEXT NOT NULL,             -- closed set; see EVENTS in src/lib/analytics.js
    country TEXT NOT NULL DEFAULT '',  -- see the note above; '' means "not knowable here"
    count   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, event, country)
);

CREATE INDEX IF NOT EXISTS ix_analytics_counters_day ON analytics_counters (day, event);
