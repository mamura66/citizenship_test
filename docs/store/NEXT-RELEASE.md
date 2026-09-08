# Release 1.0.1 — submitted to App Review on 2026-09-08

**Status:** build 8 attached to version 1.0.1, description/support/marketing/What's New set,
John Doe Home screenshot in slide 1, review submission `ac410be2` in `WAITING_FOR_REVIEW`.
Apple emails at each stage; `node tools/asc/listing.js` reads the state on demand. Release
is set to go live automatically on approval.

What follows is the plan as it stood when the work started, kept for the reasoning.

Last updated 2026-09-08, the day 1.0 was approved. This file used to be a list of deferred
items; it is now the plan for the next release, because the deferred items *are* the next
release. The earlier reasoning for each is kept where it still matters.

The goal behind all of it is search rank. The competitors have 65,000–104,000 ratings and
this app has none, and **no listing copy closes that gap** — only ratings do, and ratings
come from asking people who have just had a good experience. That is item 1, and it is the
one that needed a code change. Everything else here makes the listing convert better once
people find it.

---

## Done on the live store already (no release needed)

- **Promotional text** said "practise". Fixed via the App Store Connect API on 2026-09-08
  (`tools/asc/fix-promo-text.js`, one PATCH, read back and confirmed). Promotional text is
  the one text field Apple lets you edit without a new version.
- **Name, subtitle, keywords, categories** were checked against `listing.md` with
  `tools/asc/listing.js` and already match — the ASO copy researched before launch is what
  is live. Do not re-litigate it.

## In this release — code (branch `feature/app-1.0.1`)

### 1. Ask for a rating, once, at the moment it is earned — `src/lib/reviewPrompt.ts`

`expo-store-review` (SDK 57, `~57.0.2`), which wraps Apple's own in-app review sheet.

- **When:** after a **passed** practice test of full length, from the results screen. Not on
  a fail, not on launch, not from a button. Apple's guidance is explicit that the prompt
  must not be tied to a tap and must not interrupt something time-sensitive.
- **How often:** once per app version, recorded *before* the sheet is requested so a kill
  mid-prompt cannot cause a second ask. Apple additionally caps the sheet at three showings
  per 365 days and decides silently whether to show it at all.
- **Never:** a "Rate us" button, a "do you like the app?" pre-filter (Apple rejects that
  pattern), a reward, a gate.
- Every failure path is a no-op — unreadable storage, unavailable API, rejected promise.
  A rating prompt must never be able to break the results screen.

Tested in `scratchpad/officials-test/`: no prompt on a fail, none on a three-question run,
a prompt on a full pass, exactly one call across repeated passes, and none at all when
storage cannot be read.

### 2. Officials data updates without a release — `src/content/officialsStore.ts`

**The one with a deadline: the midterms are 3 November 2026.** Several governors will
change. Until now the names were `const`s imported from the bundled JSON, so a wrong one
could only be fixed by shipping an update and waiting for review.

The app now fetches the same two files the website already serves —
`https://prepareforcitizenship.com/content/us/officials/{national-dynamic,governors}.json`
(both live, both `200`, ETags present, verified 2026-09-08) — and **falls back to the
bundled copy on any doubt.** Freshness, not availability: first render is never empty,
offline works, every rejection keeps the shipped names.

A remote payload is accepted only if it passes in full — every field present and non-empty,
seats a number, exactly 50 governors each with a name, `lastVerified` a real date **not
older than the bundled copy's** (so a stale CDN object or rolled-back deploy cannot undo a
correction that shipped in the binary), and a non-empty `verifiedAgainst`/`sources` (an
unsourced payload is unsourced by definition). Cached copies are re-validated against *this*
build's bundled dates on every launch, so an upgrade cannot resurrect a stale name from an
old install. Refresh when the cache is over 24h old; `If-None-Match` with the stored ETag;
6-second timeout; the two files fail independently.

Wired: `loadContent.ts` exposes `nationalDynamic()` / `governors()` accessors instead of
consts; `local.tsx` re-renders on updates and the "verified …" line now also says
**"as shipped"** or **"updated"**, so a support conversation can tell whether the device
ever reached the CDN; `practice.tsx` refreshes its pool between tests but a **running deck
stays pinned** — options are built once per test on purpose; `study.tsx` and
`interview.tsx` subscribe so a landed update re-renders.

Tested against the bundled JSON with 15 planted faults (missing field, blank name, seats as
a string, older date, impossible date, no sources, 49 governors, not an object) — all
rejected; two valid newer payloads accepted with the new names coming through. **The live
CDN payloads were checked against the same rules and pass**, so the feature is not dead on
arrival.

**Operating it:** correct the JSON in `apps/us-citizenship/content/us/officials/`, bump
`lastVerified`, keep the sources, run `tools/sync-content.sh`, deploy the site. Devices pick
it up within a day. **Set a reminder for 4 November 2026** to re-verify every governor
against the National Governors Association regardless.

### 3. Version bump

`app.json` → `1.0.1`. EAS `appVersionSource: remote` with `autoIncrement` handles the build
number.

## In this release — App Store Connect, at submission time

- **Description:** replace `PRACTISE THE REAL INTERVIEW` with `PRACTICE …`. Version-locked,
  which is why it waited. The corrected description is in `listing.md`.
- **Support URL:** currently `https://uscitizenship-pulse-site.sandeep-sandha.workers.dev/support`.
  Set to `https://prepareforcitizenship.com/support`.
- **Marketing URL:** currently blank. Set to `https://prepareforcitizenship.com`.
- **What's New:** in `listing.md`.

## Still needs a person: the screenshots

Screenshot 3 (`store-assets/screenshots/3-home-readiness.png`) shows a fake name —
**"Nature k"** — and **35% readiness, "Below the 60% pass line"**. The storefront's third
slide is the app predicting that the user will fail, under a placeholder name. It is the
single change most likely to move the install rate.

**Correction, 2026-09-08:** an earlier version of this note said screenshots could be
replaced without a release. That is wrong. Apple's API answers
`ENTITY_ERROR.ATTRIBUTE.INVALID.INVALID_STATE` for the screenshot set of a live version -
screenshots can only be changed on a version that is being prepared. So the new slide goes
onto **1.0.1**, after `eas submit` creates it, with
`node tools/asc/replace-screenshot.js store-assets/screenshots/3-home-readiness.png 3 1.0.1`.

**Done, 2026-09-08:** Sandeep took it on the phone - John Doe, 80% ready, green gauge,
above the pass line - and it is staged as `store-assets/screenshots/3-home-readiness.png`
(1284×2778). It also exposed two Home-screen bugs, fixed in 1.0.1: one session read
"trending down" (a trend needs two points; it now says "first session"), and the tile said
"1 TESTS". A shot after four or five tests would show "trending up" and a non-zero starred
count; worth retaking for the version after this one. The recipe, for next time:

1. Settings → Personal → First name: **John Doe**. Interview date: something 6–10 weeks out.
2. Play practice tests until the Home gauge is green and above the pass line (four or five
   tests scoring 15+/20 does it). Star a few flashcards so "Starred" is not 0.
3. Home tab, screenshot. It must be **1284 × 2778** (iPhone 11 Pro Max / XS Max class), the
   same as the other four. Save over `3-home-readiness.png`.
4. Upload in App Store Connect → 1.0 (or 1.0.1) → 6.5" display → replace slide 3. Or run
   `tools/asc/` with an upload script once the file exists.

**Done when:** the Home shot shows John Doe, a green gauge above 60%, "trending up", and a
non-zero starred count.

## Not in this release, recorded so nobody re-litigates it

- **Website screenshots at full size** (`site/public/shots/*.png`, ~2.1 MB for ~280 CSS px).
  `sips --resampleWidth 642`. Cosmetic; site-side.
- **The Reagan quote in the hero.** Sandeep's call.
- **Dependency advisories.** `nanoid` overridden to `^3.3.18` (fixed the one production
  *high*). `decode-uri-component` cannot be fixed in place (only fix is ESM-only and
  expo-router `require`s it); exposure is our own app burning CPU on a hostile deep link,
  with nothing to leak. The rest are build tooling. Do **not** run `npm audit fix --force`.
  Recheck at the next SDK bump.
- **Android.** Needs its own RevenueCat key, Play Console products, and Google's
  12-testers-for-14-days rule. Separate submission.
- **Branded URL `pulse.pastclimate.com`** returns a Cloudflare challenge while that zone is
  under attack. Fix with a hostname-scoped Configuration Rule, not by weakening the zone.
- **The app still offers Germany in its own picker** (from the multi-country work), while
  the website offers the United States only. A build from `main` would ship it. Decide
  before the *following* release whether the app follows the website's `COUNTRIES_OFFERED`.
