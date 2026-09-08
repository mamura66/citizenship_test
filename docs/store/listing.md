# App Store listing — US Citizenship Test 2026-Pulse

Paste-ready copy for App Store Connect. Character limits noted; all fields below are
within them.

---

## Name (30 max)
```
US Citizenship Test 2026-Pulse
```
30 characters exactly. Already set.

## Subtitle (30 max)
```
Civics, N-400 & Interview Prep
```
30 characters exactly.

## Promotional text (170 max, editable without a new build)
```
Every official USCIS civics question, free forever. Track your readiness, study by topic, and practice the real interview. One-time unlock, no subscription.
```
155 characters.

## Keywords (100 max, comma-separated, no spaces after commas)
```
uscis,naturalization,citizen,flashcards,immigration,governor,senator,audio,exam,n400,greencard,quiz
```
99 characters, 12 terms.

### How these were chosen (not guessed)

Pulled the live App Store listings for "us citizenship test" via the iTunes lookup API
and counted how many of the **top 8 apps by rating count** use each term in their name
and description. The leaders are US Citizenship Test 2026 Plus (104k ratings),
Citizen Now (65k), US Citizenship Test 2026 (18k), U.S. Citizenship Test: 2026 (13k) and
U.S. Citizenship Test '26 (11k).

Terms used by the field, with how many of the top 8 use each:

| Term | Top-8 usage | In our keywords? |
|---|---|---|
| citizenship | 8/8 | no — already in the app name |
| interview | 8/8 | no — already in the subtitle |
| civics | 6/8 | no — already in the subtitle |
| uscis | 6/8 | **yes** |
| citizen | 6/8 | **yes** |
| flashcards | 6/8 | **yes** |
| naturalization | 4/8 | **yes** |
| governor / senator | 4/8 | **yes** (our state-specific answers) |
| audio / listen | 5/8 | **yes** (`audio`, for read-aloud) |
| application | 6/8 | **yes** as `n400`, the form people search by name |

**The rule that shaped this:** Apple already indexes every word in the app *name* and
*subtitle*, so repeating them in the keyword field burns characters for nothing. That
excluded the four highest-frequency terms in the category — citizenship, interview,
civics, test — because we already own them. My first draft repeated `civics`, `interview`
and `2026` and wasted roughly a quarter of the field.

Dropped for lack of room, in priority order if a slot frees up: `study`, `100`, `128`.
Deliberately excluded: `app` and `free`, which Apple ignores or disallows.

**Worth knowing:** USCIS publishes its own app, "USCIS: Civics Test Study Tools"
(USCIS Department of Homeland Security, 301 ratings). We still keep `uscis` as a keyword
since applicants search it, but it is one more reason the non-affiliation disclaimer must
stay prominent — we are competing in search alongside the actual agency.

## Description (4000 max)
```
The last step of a long journey.

You have built a life here for years. This is where it becomes official — and this app is
built to get you there ready.

EVERY OFFICIAL QUESTION, FREE

All civics questions come directly from USCIS's published test materials, for both the 2025
and 2008 versions of the test. Flashcards are free forever: no limits, no counting, no
paywall between you and the material.

STUDY BY TOPIC

The real test is organised into sections, and so is this app. Work through the founding
ideas, the three branches, the Civil War, the national symbols, or any other official
section on its own — each one tells you plainly what it covers before you start.

KNOW WHERE YOU STAND

Your readiness comes from your real practice scores, never a guess. Take a full practice
test in the real format — the same number of questions, the same pass line — and see
exactly which topics to revisit, with the official accepted answers for anything you
missed.

PRACTICE THE REAL INTERVIEW

The mock interview asks questions out loud, the way the officer will, so the first time you
hear them spoken is not on interview day.

YOUR STATE'S ANSWERS

Four test questions depend on where you live. Pick your state — or D.C., Puerto Rico, Guam,
the U.S. Virgin Islands, American Samoa or the Northern Mariana Islands — and get the
answers that apply to you, including the official answers for residents who have no
governor or no senators.

COUNT DOWN TO YOUR INTERVIEW

Add your interview date and the app counts down to it. No date yet? Leave it blank.

PRIVATE BY DEFAULT

No account. No sign-up. No analytics, no tracking, no ads. Your name, your scores and your
interview date never leave your phone. The mock interview never touches your microphone.

ONE PRICE, ONCE

Flashcards, topics and your state's answers are free forever. Unlimited practice tests and
the full mock interview are a single one-time purchase. No subscription and no recurring
charge — some apps in this category charge that much every week.

—

This app is an independent study tool. It is not affiliated with, endorsed by, or sponsored
by U.S. Citizenship and Immigration Services (USCIS) or any government agency, and it does
not provide legal advice. Official questions and vocabulary lists are U.S. government works
in the public domain.
```

## What's New (1.0.1)
```
• Your state's governor and the national officials now stay current between updates, so a name never goes stale after an election.
• Small fixes.
```

## What's New (1.0, shipped)
```
First release.
```

## Support URL — REQUIRED
```
https://prepareforcitizenship.com/support
```
1.0 shipped with the old `workers.dev` address. Version-locked, so it changes with 1.0.1.

## Marketing URL — optional
```
https://prepareforcitizenship.com
```
The site is live and carries the App Store badge, so this is no longer unfinished.

## Privacy Policy URL — REQUIRED
Host `docs/store/privacy-policy.md` as a web page and paste the URL. Replace the
placeholder contact address in it first.

## Age rating
Expect **4+**. Answer "None" to every content question: no violence, no profanity, no
gambling, no unrestricted web access, no user-generated content.

## Category
- Primary: **Education**
- Secondary: **Reference**

## Copyright
```
2026 Sandeep Sandha
```

## Screenshots — REQUIRED
6.5" display, 1284 × 2778 portrait. Your device screenshots are already exactly this size.
Between 1 and 10; use 5 or 6. No iPad set is needed now that `supportsTablet` is false.

Suggested order, each showing real content rather than an empty state:
1. Home with a real readiness score and a countdown
2. A flashcard, answer side, showing accepted answers
3. The topic picker, showing study by section
4. A practice question mid-test, one answer graded green
5. Results with the missed-question review
6. Mock interview with the question on screen

Take these on the device after the production build so the icon and native dark mode are
the shipping ones.

---

## App Privacy questionnaire (App Store Connect → App Privacy)

Based on RevenueCat's own guidance
(revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy).
Our app uses **anonymous** RevenueCat app user IDs — we never call `logIn` and never
supply a custom user ID — which is what makes the "not linked to identity" answers below
correct.

**Answer "Yes, we collect data", then declare exactly one category:**

| Field | Answer |
|---|---|
| Data type | **Purchases → Purchase History** |
| Purposes | **App Functionality** and **Analytics** |
| Linked to the user's identity? | **No** |
| Used for tracking? | **No** |

RevenueCat requires both purposes: App Functionality covers receipt validation and
entitlements, Analytics covers their dashboard and charts.

**Declare nothing else.** Specifically:
- **Identifiers → User ID / Device ID: not collected.** These would apply only if purchase
  history were linked to an identity via a custom app user ID or an advertising
  identifier. We use neither.
- No Contact Info, Health, Location, Contacts, User Content, Search History, Browsing
  History, Diagnostics, or Usage Data.
- Name, interview date, state, scores and starred questions are stored **on device only**
  and never transmitted, so they are not "collected" under Apple's definition.
- No microphone access, no audio.

**App Tracking Transparency:** not required. We do not track, so there is no
`NSUserTrackingUsageDescription` and no ATT prompt.

## Export compliance
Already handled in `app.json` via `ITSAppUsesNonExemptEncryption: false`. The app uses only
standard HTTPS, so no export documentation is needed.

## In-app purchase to attach to the version
`lifetime_access` — Non-Consumable, $9.99. Attach it to version 1.0 in the submission.
**Do not attach the retired `lifetime_unlock`**; it is a Consumable and is off sale.
