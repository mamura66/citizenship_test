# Do these at the next release

Deferred deliberately, not forgotten. Each line says why it was deferred and what
"done" looks like, because the reasons stop being obvious within a week.

Last updated 2026-09-07, while version 1.0 (build 6) was in review.
Item 3 rewritten the same day after an external QA audit; see BUILD_PLAN for that pass.

---

## 1. Fix "PRACTISE" in the App Store description

**What:** the description contains `PRACTISE THE REAL INTERVIEW`. British spelling, for a
US-only audience.

**Why deferred:** the description is locked while a version is in review. Correcting it
would mean pulling 1.0 out of the queue and losing its place, for one word.

**Already done:** `docs/store/listing.md` is corrected, so the fixed text is ready to
paste. Only App Store Connect still holds the old copy.

**Done when:** the live App Store description reads `PRACTICE THE REAL INTERVIEW`.
Description changes require a new version, so pair this with whatever ships next.

---

## 2. Replace the Home screenshot

**What:** screenshot 3 (`store-assets/screenshots/3-home-readiness.png`) shows **35%
readiness** with "Below the 60% pass line". The storefront currently leads with the app
reporting that the user is likely to fail.

**Why deferred:** flagged twice before submission; Sandeep chose to ship it rather than
delay. Reasonable — but it is the single change most likely to affect install rate.

**Note:** screenshots can be replaced **without a new build or a new version**, so this
does not have to wait for a code release. Do it as soon as 1.0 is approved.

**Done when:** the Home shot shows an average above 60%, the gauge green, "Above the 60%
pass line", trending up, and a non-zero starred count.

---

## 3. Move the officials data to remote config

**The one with a deadline.** This is the highest-value item on the list.

**What:** `content/us/officials/national-dynamic.json` and `governors.json` are bundled
into the binary by `src/content/loadContent.ts`, which imports them statically. Both are
verified correct today — all 50 governors cross-checked against the National Governors
Association, the four national officeholders against whitehouse.gov, supremecourt.gov and
house.gov.

**Why it matters:** the **midterms are 3 November 2026**. Several governors will change.
While the data is bundled, a wrong answer can only be corrected by shipping an app update
and waiting for review. Both files carry comments saying they must never be hardcoded into
a shipped binary, and they currently are.

### The hosting half is already done (verified 2026-09-07)

`tools/sync-content.sh` already copies every content JSON into `site/public/content/`,
which the CDN serves without the Worker seeing it. Both files are live now, and byte
identical to the bundled copies (md5 compared, both matched):

```
https://prepareforcitizenship.com/content/us/officials/national-dynamic.json
https://prepareforcitizenship.com/content/us/officials/governors.json
```

`HTTP/2 200`, `content-type: application/json`, `etag` present,
`cache-control: public, max-age=0, must-revalidate`. So **no `site/` change and no
Worker code is needed** — only the app side, plus running `sync-content.sh` and
redeploying the site whenever the JSON is corrected.

### Why it was not built in the QA-fix pass of 2026-09-07

Not deferred for lack of time: deferred because it is the only item of the nine that
changes an interface every screen imports, and it cannot be exercised on device while
1.0 is in review. Half of it is worse than none of it — a partly-wired remote fetch is
how a wrong officeholder ships silently. Specifically:

- `NATIONAL_DYNAMIC` and `GOVERNORS` are module-level `const`s. Every consumer reads
  them synchronously during render (`local.tsx` reads `NATIONAL_DYNAMIC.president` and
  four more fields; `practice.tsx` reads `GOVERNORS` for distractors and calls
  `resolveAnswers`; `study.tsx` and `interview.tsx` call `resolveAnswers`). Remote data
  arriving after first paint has to re-render all of them, which a `const` cannot do.
- `resolveAnswers`/`resolveDynamicAnswer` are pure sync helpers called inside `useMemo`.
  Their memo dependency arrays would need an officials-version value, or a card would
  keep showing the answer that was current when it was first memoized.

### Shape of the fix, concretely

1. **New `src/content/officialsStore.ts`.** Holds the live snapshot, seeded from the
   bundled import so the very first render is never empty, plus `subscribe()` and a
   monotonically increasing `version` counter.
2. **`loadContent.ts`**: replace the `NATIONAL_DYNAMIC` / `GOVERNORS` consts with
   accessor functions reading the store (`nationalDynamic()`, `governors()`), and update
   the call sites in `local.tsx` and `practice.tsx`.
3. **`useOfficials()` hook** returning `{ officials, version, source }`. Screens that
   memoize resolved answers add `version` to their dependency arrays — except the
   practice deck, which must stay pinned for the duration of a running test (options are
   built once per test on purpose; see BUILD_PLAN v15).
4. **Fetch on launch**, both files, `AbortController` with a ~6s timeout, and cache the
   validated payload in AsyncStorage under `officials.nationalDynamic.v1` /
   `officials.governors.v1` with a `fetchedAt` stamp. Refetch when older than 24h. Send
   `If-None-Match` with the stored ETag; a 304 just refreshes `fetchedAt`.
5. **Validate before trusting, and fall back to bundled on any doubt.** "Never ship a
   name we can't source" applies to a remote payload exactly as it applies to the repo:
   - every expected field present and a non-empty string; `supremeCourtSeats` a number;
     `governors` an object of 50 entries each with a non-empty `name`;
   - `lastVerified` a valid `YYYY-MM-DD`, and **not older than the bundled copy's** — a
     stale CDN object or a rolled-back deploy must not undo a correction that shipped in
     the binary;
   - `verifiedAgainst` present and non-empty. A payload with no sources is unsourced by
     definition and is rejected.
   Any failure — network, non-200, bad JSON, failed validation — keeps the bundled copy
   silently. This is a freshness feature, not an availability dependency, and it must
   work offline.
6. **My State** already prints `verified <lastVerified>`. Extend it to say which copy is
   in use ("updated 2026-11-04" vs "as shipped"), so a support conversation can tell
   whether the device ever reached the CDN.
7. **Test** the validator against: valid payload, missing field, empty name, older
   `lastVerified`, missing `verifiedAgainst`, malformed JSON, HTTP 500, timeout. Then run
   it on device: launch offline (bundled), launch online (updated), and edit the hosted
   JSON and confirm the answer changes with no new build.

Estimate with validation and tests: half a day, not 45 minutes.

**Done when:** editing the hosted JSON changes the answer in the app without a release,
and every rejection path above still shows the bundled names rather than nothing.

**Also set a reminder for 4 November 2026** to re-verify against the NGA regardless.

---

## 4. Halve the website screenshots

**What:** `site/public/shots/*.png` are the full 1284×2778 originals, about 2.1 MB total,
displayed at roughly 280 CSS pixels wide.

**Why they are full size:** they were swapped in while diagnosing a stretched-image
report. The stretching turned out to be a CSS fault (`height: auto` was missing), not a
resolution one, so the originals are not needed.

**Done when:** each is ~642px wide, total under 800 KB, and the pages still look right.
`sips --resampleWidth 642` does it.

---

## 5. Decide on the Reagan quote in the hero

Left in place on purpose: Sandeep chose the app's quotes and asked for words that speak to
this audience with dignity, and this one opens the app's own onboarding. An external
review suggested cutting it as long and politically inflected. **Sandeep's call** — keep,
trim to the closing clause, or remove.

---

## 6. Dependency advisories: what is pinned, and what cannot be fixed yet

Recorded here because `package.json` cannot carry a comment and the next person to run
`npm audit` will otherwise re-litigate it.

**Fixed (2026-09-07):** `nanoid` was resolving to 3.3.8 — the one *high* advisory in the
production tree, reached through `expo-router`. `package.json` now carries
`"overrides": { "nanoid": "^3.3.18" }`. This is **not** a forced pin: expo-router itself
declares `nanoid: ^3.3.8`, so 3.3.18 is inside its own range, and `npx expo install
--check` still reports "Dependencies are up to date" for SDK 57. Production advisories
went 16 → 15, high 1 → 0.

Do **not** run `npm audit fix --force`. npm's suggested remedy is `expo@46.0.21`, eleven
SDK majors backwards.

**Cannot be fixed in place — `decode-uri-component`** (moderate, DoS on malformed
percent-encoded input), reached as `expo-router → query-string@7.1.3 →
decode-uri-component@0.2.2`. The only non-vulnerable release is **0.5.0, which is
ESM-only (`"type": "module"`)**, and the consumer does `require("query-string")` in
`expo-router/build/fork/getPathFromState.js` and three sibling files. Overriding it would
break the Metro bundle, so it stays. npm's alternative remedy is `expo-router@5.1.11`, a
major downgrade. Exposure: the app registers the `uscitizenship://` scheme, so a hostile
link could in principle reach the parser; the effect is our own app burning CPU on the
user's device. No accounts, no server and no data to leak. Acceptable until Expo ships a
newer `query-string`.

**The remaining 14 moderates** are all Expo *build* tooling — `@expo/cli`,
`@expo/config-plugins → xcode → uuid`, `@expo/metro-config`, `@expo/prebuild-config`,
`expo-splash-screen`. They run on the build machine and are not in the shipped bundle.

**The 3 high advisories in the full `npm audit`** (`eas-cli`, `minimatch`, `tar`) are all
under `eas-cli`, a devDependency. They pre-date the change above (verified by auditing the
previous lockfile: 4 high before, 3 after) and ship in nothing.

**Recheck at the next SDK bump**, which is the only thing that can move any of these.

---

## Not deferred, just not started

- **Android.** Needs its own RevenueCat Play Store key, Play Console products, and
  Google's 12-testers-for-14-days rule. Sideloading an APK from the website is a real
  option, but Play Billing cannot be used outside Play, so payments would move to Stripe
  or similar.
- **A branded URL for the site.** `pulse.pastclimate.com` is configured but returns
  `HTTP 403 / cf-mitigated: challenge` because the zone is under DDoS protection. Fix with
  a Configuration Rule scoped to that hostname (Security Level: Essentially Off) once the
  attack subsides — not by weakening the zone. Until then the `workers.dev` URL is live and
  is what Apple has on file.
- **An App Store badge and link** on the website, replacing "Coming to the App Store", on
  the day 1.0 goes live.
