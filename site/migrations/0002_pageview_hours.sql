-- ===========================================================================
-- 0002_pageview_hours — page views counted per hour, not just per day
-- ===========================================================================
-- Asked for on 2026-09-09: "in day we get date only, can we get date and
-- time". The counter stays a counter - one row per (day, hour, path,
-- country), incremented in place - so nothing here is a row about a person
-- and the privacy position in 0001 is unchanged. An hour with a country is
-- still an aggregate; a full timestamp per view would start to look like a
-- visitor log, which is why the granularity stops at the hour.
--
-- SQLite cannot add a column to a primary key, so the table is rebuilt. Rows
-- counted before this migration keep their totals with hour = -1, meaning
-- "the time was not kept" - they are shown by day only, never given an hour
-- they did not have.
--
-- Apply with: npx wrangler d1 migrations apply pfc-analytics [--remote]

CREATE TABLE analytics_pageviews_v2 (
    day     TEXT NOT NULL,             -- YYYY-MM-DD UTC
    hour    INTEGER NOT NULL DEFAULT -1, -- 0-23 UTC; -1 = counted before hours were kept
    path    TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT '',
    views   INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (day, hour, path, country)
);

INSERT INTO analytics_pageviews_v2 (day, hour, path, country, views)
    SELECT day, -1, path, country, views FROM analytics_pageviews;

DROP TABLE analytics_pageviews;
ALTER TABLE analytics_pageviews_v2 RENAME TO analytics_pageviews;

CREATE INDEX IF NOT EXISTS ix_analytics_pageviews_day ON analytics_pageviews (day);
