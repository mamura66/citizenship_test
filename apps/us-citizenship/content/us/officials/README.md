# State-specific officials data — sourcing design

Four of the civics questions require the CURRENT officeholder for the user's own state:
governor, one U.S. senator, the U.S. representative, and the state capital.

| Data | Volatility | Count | Source strategy |
|---|---|---|---|
| State capital | Effectively never changes | 50 | Bundled in app binary — `state-capitals.json` |
| Governor | Changes on election/resignation (rare, ~10-15/year nationally) | 50 | Small JSON snapshot (`governors.json`), refreshed manually each app release + after any election |
| U.S. Senators | Changes on election (every 2 years, 1/3 of seats) or resignation | 100 | **Not hand-authored** — too large and volatile to safely hardcode. Fetch live from the official [Congress.gov API](https://api.congress.gov/) (free, requires a registered API key, 5,000 req/hour) and cache client-side with a short TTL (e.g., 24h) |
| U.S. House Representative | Changes every 2 years + redistricting + special elections | 435 (by district) | Same Congress.gov API, keyed by ZIP→district lookup |

## Why not hardcode senators/reps for the prototype

This is exactly the failure mode that got a top competitor ("Citizen Now") a wave of
1-2 star reviews: it shipped officials as static app content, and after the next
election cycle the answers were wrong until the next app-store review cycle completed.
Baking 535 names into the app binary reproduces that bug by construction.

## ZIP → congressional district lookup

Congress.gov's API does not do ZIP-to-district resolution by itself. Options evaluated:
- **Google Civic Information API** — the representative-lookup endpoint was **retired
  April 30, 2025** by Google. Do not build on this; it is dead.
- **Census Bureau Geocoder** (`geocoding.geo.census.gov`) — free, official, resolves an
  address/ZIP to a congressional district (116th–119th Congress boundaries). Recommended
  pairing with Congress.gov for the member lookup.
- **Open States API v3** — free with registration, covers state-level officials
  (including governors as a fallback/cross-check) but is state-legislature-focused, not
  a ZIP resolver.

**Recommended pipeline:** ZIP/address → Census Bureau Geocoder → congressional district →
Congress.gov API → current member name + party, cached and refreshed daily server-side
(not on-device) so a single content fix reaches all users instantly without an app
update.

## Action items before shipping (see BUILD_PLAN.md)

1. Register a free Congress.gov API key.
2. Build a small serverless endpoint (or Firebase/Supabase function) that does the
   geocode → district → member lookup and caches results, so the API key never ships
   inside the app bundle and so a bad answer can be corrected centrally within minutes.
3. Cross-check `governors.json` row-by-row against Ballotpedia or NGA before the first
   release — it is currently a single-source, unverified snapshot.
