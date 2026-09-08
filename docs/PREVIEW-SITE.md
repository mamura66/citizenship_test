# The preview site

**https://pfc-preview.sandeep-sandha.workers.dev**

Everything on the `feature/multi-country` branch, running on Cloudflare, sharing nothing
with production. Click around it freely: you cannot break the live site from here, you
cannot reach a real customer's account, and no payment can be taken.

```
npx wrangler deploy --config wrangler.preview.jsonc     # from site/
```

Run `tools/sync-content.sh` first if content changed, exactly as for production.

## What is separate, and why each one matters

This is a **separate Worker**, not a preview version of the live one. That distinction is
the whole design: a preview *version* of the same Worker shares its bindings, so every test
signup would be written into the KV namespace holding real accounts, and every test visit
would land in the real analytics.

| | Production | Preview |
|---|---|---|
| Worker | `uscitizenship-pulse-site` | `pfc-preview` |
| Hostnames | prepareforcitizenship.com, www, pulse.pastclimate.com | its own `workers.dev` only — **no routes** |
| Accounts, progress, entitlements (KV) | `7dc1d7e0…` | `20f37381…` |
| Analytics (D1) | `pfc-analytics` | `pfc-analytics-preview` |
| Email | Cloudflare `send_email` | **no binding** |
| Analytics mode | GA4 `G-H00CSNW239` | `off` |
| Paddle | production, sales paused | sandbox, sales paused, no token |

## What that means when you use it

- **Sign up with anything.** `you@example.com` is fine. Preview accounts live in the
  preview KV and are invisible to production. Your real account does not exist here — the
  smoke test proves it by trying to log in as you and getting a 401.
- **No email is sent.** `emailConfigured()` is false without the `send_email` binding, so
  the password-reset flow says so rather than mailing a stranger from the real support
  address. To test reset, use `wrangler dev` locally, where messages are written to
  `.wrangler/tmp/email/`.
- **Nothing can be bought.** Paddle is in sandbox with sales paused and no client token, so
  the paywall shows its honest "not on sale yet" panel and no checkout can open.
- **Google sign-in will not work**, and this is expected: the OAuth redirect URI is
  registered for the production origin only. Use email and password. Adding the preview
  origin to the Google console would work, but it means one more live credential pointing
  at a test site, which is not worth it to save a password field.
- **Insights works** for the owner email, against the preview database — so it will look
  empty, because it is. That is the correct answer, not a bug.

## Keeping it out of search

Two identical sites in one index is how the real one loses its ranking, so this is belt and
braces:

1. Every response from the Worker carries `X-Robots-Tag: noindex, nofollow, noarchive`,
   from a wrapper around the whole handler so no route can forget it.
2. The preview answers `/robots.txt` itself with a blanket `Disallow: /`.

The second exists because the first is not enough on its own: `run_worker_first` deliberately
leaves the marketing pages on the CDN, so the header covers the app and misses precisely the
pages a crawler would index. `/robots.txt` is therefore **the only** addition to the
preview's `run_worker_first` list — the rest is byte-identical to production, because which
paths reach code is exactly the difference that stops a preview predicting production. It
has already cost this project two bugs.

Both are keyed off an explicit `PREVIEW: "true"` var rather than a hostname check. A
hostname check would be one typo away from marking production `noindex`, which is a far
worse failure than a preview being crawled.

Verified: preview `/robots.txt` disallows everything, production's still invites crawlers
and its sitemap still lists production URLs.

## Which countries each one offers

`COUNTRIES_OFFERED` decides. Production sets `"us"`; the preview sets nothing, which means
"every country that has a pack" — so the preview is where Germany, Canada and Australia can
be looked at while production offers the United States only.

The important property is that it can only ever **narrow**. Readiness is still proved by the
pack file being deployed, exactly as before, so no value of this var can make the site offer
a test it has no questions for. That is why readiness stopped being a hand-edited flag, and
it stays true.

It bites in three places, and all three were checked, because one of them failing open is
how a country nobody meant to sell ends up sold:

1. `/content/packs.json` is filtered by the Worker, so a country that is not offered never
   reaches the sign-up picker at all — rather than appearing and then being refused, which
   would look like a broken site.
2. `isReadyCountry()` refuses it server-side, whatever the browser claims.
3. The home page's chips and its one generated sentence follow the manifest, so the copy
   changes itself: "The United States is ready today. Germany, Canada and Australia are
   next."

### Running the tests

This is why there are two ways to run the local server:

```
npx wrangler dev                                    # production config: US only
npx wrangler dev --config wrangler.preview.jsonc    # everything with a pack
```

`gate-check.js`, `homecountries.js`, `pages-check.js`, `auth-flow.js`, `ui-fixes.js` and
`api-test.sh` run against the first. The country suites — `ca-verify.js`, `au-verify.js`,
`ca-fr-verify.js`, `multicountry.js` — need a site that offers those countries, so run them
against the second. They need no edits either way.

## Verifying it

`scratchpad/pw/preview-smoke.js` — 9 checks against the deployed preview: four live country
chips, all four countries selectable, a working signup, a German picture question with all
four images actually decoded, the BAMF credit on screen, the paywall shut, and a production
email failing to log in.

Note the one that bit: the image check first reported three of four images at
`naturalWidth: 0`. That was the test sampling before the bytes arrived on a cold Worker
cache, not a broken asset — the same four images returned HTTP 200 with sensible sizes. The
check now waits for decode. Worth remembering, because "the image is 0 pixels wide" reads
exactly like a missing file.

## When production is next deployed

Nothing needs undoing. The preview behaviour is gated on the `PREVIEW` var, which
production's `wrangler.jsonc` does not set, so the same `src/worker.js` behaves exactly as
before there. Deploy production the normal way, with no `--config`.

## Tearing it down

```
npx wrangler delete --config wrangler.preview.jsonc          # the Worker
npx wrangler kv namespace delete --namespace-id 20f37381...  # the accounts
npx wrangler d1 delete pfc-analytics-preview                 # the analytics
```

Not urgent: an idle Worker with an empty namespace costs nothing.
