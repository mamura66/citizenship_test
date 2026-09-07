# Do these at the next release

Deferred deliberately, not forgotten. Each line says why it was deferred and what
"done" looks like, because the reasons stop being obvious within a week.

Last updated 2026-09-07, while version 1.0 (build 6) was in review.

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
into the binary. Both are verified correct today — all 50 governors cross-checked against
the National Governors Association, the four national officeholders against
whitehouse.gov, supremecourt.gov and house.gov.

**Why it matters:** the **midterms are 3 November 2026**. Several governors will change.
While the data is bundled, a wrong answer can only be corrected by shipping an app update
and waiting for review. Both files carry comments saying they must never be hardcoded into
a shipped binary, and they currently are.

**Shape of the fix:** serve both files as static JSON (the Cloudflare Worker in `site/`
already exists), fetch on launch with a 24-hour cache, keep the bundled copy as the
offline fallback, and show the verified date in My State. Roughly 45 minutes.

**Done when:** editing the hosted JSON changes the answer in the app without a release.

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
