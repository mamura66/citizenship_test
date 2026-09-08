# Build plan — US Citizenship Test app (prototype → v1)

Status: working prototype built and smoke-tested (screenshots in this doc's companion
review). Read `docs/LEGAL_REVIEW.md` first — several items below exist specifically to
close gaps identified there.

## What exists right now

```
Citizen_test/
├── content/us/                     ← single source of truth, shared by every future country app
│   ├── civics-2025.json            ← all 128 official questions, verified against USCIS PDF
│   ├── civics-2008.json            ← all 100 official questions, verified against USCIS PDF
│   ├── reading-vocab.json          ← official reading vocabulary list
│   ├── writing-vocab.json          ← official writing vocabulary list
│   └── officials/
│       ├── national-dynamic.json   ← President/VP/Speaker/Chief Justice, verified 2026-09-01
│       ├── governors.json          ← 50-state snapshot, UNVERIFIED single-source (see file)
│       ├── state-capitals.json     ← stable, safe to bundle permanently
│       └── README.md               ← why senators/reps are NOT hardcoded + sourcing plan
├── docs/
│   ├── LEGAL_REVIEW.md
│   └── BUILD_PLAN.md               ← this file
└── apps/us-citizenship/            ← Expo (React Native + TypeScript) app, builds for iOS/Android/web
```

The app runs today (`cd apps/us-citizenship && npm run web` or `npm start` for
Expo Go on a phone) with:
- Home dashboard, Flashcards (real 128Q/100Q content, star/favorite, sequential/random,
  read-aloud via on-device TTS), Practice Test (customizable count + pass threshold,
  multiple-choice scoring, matches real USCIS pass rules by default), Mock Interview
  (V1 self-graded spoken-practice mode — see privacy note below), My State (governor +
  capital lookup, national officials), Settings (2008/2025 toggle, disclaimers).
- Verified via `tsc --noEmit` (clean), `expo export --platform web` (bundles cleanly,
  932 modules), and a headless-browser pass through Home → Study → reveal answer →
  Practice setup → My State → California lookup, with zero console/page errors.

## Design system (v2 - matches current Apple "Liquid Glass" conventions)

The first prototype pass used a generic card-and-pill UI that looked, correctly,
amateurish next to the App Store leaders. It's been rebuilt against Apple's actual
current design language (iOS 26 "Liquid Glass" HIG), not a generic redesign:

- **Real native tab bar** via `expo-router/unstable-native-tabs` (`app/(tabs)/_layout.tsx`)
  — this is Expo's first-party wrapper around the platform's actual native tab
  controller, not a hand-built approximation. On iOS 26 it renders genuine Liquid
  Glass automatically; on Android, native Material 3; degrades gracefully on web.
  SF Symbols are used for icons on iOS, vector drawables on Android.
- **Glass material cards** (`GlassCard` in `src/components/ui.tsx`) built on `expo-blur`'s
  `BlurView` — a real translucent/blurred backdrop, not a flat card with a border.
- **Native system typography** (`src/theme/theme.ts`) — deliberately switched OFF the
  Google Fonts (Inter/Poppins) used in v1 and onto the OS's own font (San Francisco on
  iOS, Roboto on Android). This is a specific, intentional choice: a custom webfont is
  exactly what makes a React Native app read as "not a real native app" next to actual
  Apple apps. Type scale (34pt large title / 22pt title2 / 17pt headline+body / 15pt
  callout / 13pt caption) is taken directly from Apple's own HIG numbers.
- **One vivid accent color** (`#0A84FF`, iOS system blue) on a near-monochrome
  background (`#F2F2F7`, iOS systemGroupedBackground) — the single-accent-on-neutral
  pattern is consistent across Apple's own Health/Fitness/Journal apps.
- **Pill-shaped buttons**, generous corner radii (18-24px, approximating iOS's
  continuous-curvature "squircle" cards — a true superellipse mask was judged
  not worth the added native-module risk for this stage), and a soft accent-tinted
  gradient glow behind the Home screen (`expo-linear-gradient`).
- **Micro-interactions**: buttons spring-scale on press using React Native's built-in
  `Animated` API (no extra animation library added, to keep the dependency footprint
  small per the "easy to build" brief).

### v3 update: real color system, dark mode, real cross-platform icons

- **Pure white / true black backgrounds.** Light mode `systemBackground` is genuinely
  `#FFFFFF`, dark mode is genuinely `#000000` (OLED true black) — these are Apple's
  actual documented values, not approximations. The full system color ramp (red,
  orange, yellow, green, mint, teal, cyan, blue, indigo, purple, pink, brown, gray1-6),
  each with its real light/dark pair, lives in `src/theme/theme.ts`.
- **Dark mode**, System/Light/Dark, toggle in Settings, persisted, backed by
  `src/theme/ThemeProvider.tsx` (`useTheme()` hook) and RN's `useColorScheme` for the
  System option.
- **Real platform-native icons.** All in-content icons switched from Ionicons (a
  generic third-party icon font) to `expo-symbols`' `SymbolView` — genuine SF Symbols
  on iOS, genuine Material Symbols on Android/web, via one semantic registry in
  `src/components/AppIcon.tsx`. Every glyph name was checked against the actual bundled
  symbol data (`tsc` enforces this via typed unions), not guessed.
- **Real official photos** for the four national dynamic officials (President, VP,
  Speaker, Chief Justice) on the My State screen — confirmed public-domain U.S.
  government works from Wikimedia Commons (`content/us/officials/photos/SOURCES.md`
  has the per-image source + license confirmation), not stock/AI images. State
  governors intentionally still use initials, not photos — see legal review §7 on why
  state-government photos aren't safe to bulk-source the same way.
- **Home redesigned as a colored tile grid** (Quick Actions: blue/green/purple/orange)
  instead of stacked full-width cards, closer to the competitor dashboard pattern
  research identified (see project memory).
- Fixed a real cross-platform layout bug in `GlassCard`: passing `flexDirection: 'row'`
  through its `style` prop broke the card's width on react-native-web (it stopped
  stretching to the parent's width, truncating text instead of wrapping). Fix: `style`
  now only reaches the outer sizing wrapper, like a normal component prop; row-layout
  content is composed with a nested `View` inside the card's children instead.

### v4 update: green brand, wide-viewport layout bug fixed

- **Real bug found and fixed:** on a wide desktop browser window, screens had no max
  width, so cards/tiles stretched edge-to-edge leaving huge dead gaps between them —
  this is what read as "vibe coded" in the user's screenshot, not the icons or colors.
  Fixed with `src/components/ScreenContainer.tsx`, a web-only wrapper that centers
  content at a 480px max width (native iOS/Android are already phone-width, so this
  changes nothing there). Every tab screen now wraps its content in it.
- **Brand accent switched from blue to green** (`theme.accent` now resolves to Apple's
  systemGreen light/dark pair) — this cascades automatically to every button, the
  active tab tint, and every `colors.accent` reference throughout the app.
- **Home's Quick Actions grid re-themed to one cohesive green family** (systemGreen /
  a deeper forest green / systemTeal / systemMint) instead of the blue/green/purple/
  orange rainbow, so the dashboard reads as one brand instead of arbitrary per-tile
  colors. The streak (flame) and starred-count (star) stat icons intentionally kept
  their conventional red/gold colors — a green flame or green star would read as
  wrong regardless of brand color, so semantic icons stayed outside the rebrand.

### v5 update: "Civics Pulse" adopted as the final visual identity

After comparing 8 distinct animated prototype directions (Oath, Pulse, Field Drill,
Liberty Torch, Constellation, The Ledger, Interview Room, Precinct Board — each a full
self-contained HTML mockup with real CSS/JS motion, not a static comp), **Civics Pulse
was chosen** and has been ported into the real app, replacing the earlier Liquid-Glass
pass:

- **Palette** ported 1:1 from the approved prototype (not re-derived): white/near-black
  (`#05130D`, a green-tinted true-black) grounds, one vivid "phosphor" green accent
  (`#0FA968` light / `#35E28C` dark) — see `src/theme/theme.ts`.
- **Typography** switched to IBM Plex Sans (UI/body) + IBM Plex Mono (all numeric/data
  readouts — stat values, the gauge's percentage, question counts) for the
  "readiness-monitor" data feel.
- **Cards are flat, not glass** — Civics Pulse's identity has no blur/translucency, so
  `GlassCard` (kept for minimal diff) now renders a plain solid card with a hairline
  border, matching the prototype rather than the earlier frosted-glass treatment.
- **Two real animated components** ported from the prototype's CSS keyframes into
  actual React Native `Animated`-driven components (no new animation library added):
  `src/components/RadialGauge.tsx` (the readiness-percentage arc sweeps in on mount via
  an animated SVG `strokeDashoffset`) and `src/components/EcgSparkline.tsx` (the
  recent-sessions trace draws itself left to right, then a lead dot blips continuously).
  Stat numbers count up on mount via `src/lib/useCountUp.ts`.
- Home screen was restructured to match the prototype's layout: pulsing
  "LIVE READINESS MONITOR" eyebrow → gauge card → ECG card → stat row → quick-action
  grid (with a press-triggered scan-glow sweep, also ported from the prototype's hover
  effect) → green CTA card.
- Every other screen inherits the new palette/type automatically through the existing
  `useTheme()`/`type` token plumbing — verified by screenshot (Study screen shown with
  the new green accent, IBM Plex type, flat cards, no regressions).

### v6 update: first real-device pass (2026-09-04)

First run on a physical iPhone (via an EAS development build) surfaced three
issues the web preview could never show. Recorded here because they encode real
platform rules, not one-off fixes:

- **Placeholder metrics leaked into the real app.** Home showed "74% READY" and a
  decorative heartbeat waveform for a user with zero sessions - values copied from the
  design prototype. Both are now driven purely by `practiceHistory`: the gauge renders an
  honest empty state ("— / START") until the first test is completed, and
  `EcgSparkline` takes real per-session scores (flat muted baseline when empty). Rule
  going forward: **no sample/placeholder numbers on any screen a real user sees.**
- **Safe areas inside native tabs.** With `expo-router/unstable-native-tabs`, only a
  screen whose ROOT element is a ScrollView gets automatic status-bar/tab-bar insets.
  Home was wrapped in a plain View (so its header sat behind the iPhone clock) while
  Interview - a ScrollView root - was fine. Fix: Home's root is now the ScrollView.
  Screens that legitimately need a fixed View root (Study, Practice running/results)
  apply `useSafeAreaInsets()` explicitly (top, and bottom + ~56pt for the floating
  tab bar). `SafeAreaProvider` is mounted in the root layout.
- **Home fits one screen.** The bottom CTA card was redundant with Quick Actions and
  pushed content under the tab bar; removed, spacing tightened, gauge 112→100. Fits
  ~6.1"+ iPhones without scrolling; the ScrollView remains as a fallback for small
  devices.
- Removed the tile "scan beam" press effect - it rendered as a stuck translucent wedge
  on device.
- Note for reviewers of device screenshots: the floating gear/"Tools" button top-right
  is Expo's dev-client menu, not app UI; it does not exist in production builds. Also,
  iOS collapses 6 tabs into 4 + "More" - expected native behavior, revisit if the
  tab count changes.

**Known limitation:** `unstable-native-tabs` is, as the name says, an unstable/evolving
Expo API. Its web fallback doesn't yet auto-inset page content under its fixed top bar
the way the real iOS/Android native tab bars auto-inset content (per Expo's own docs) —
worked around with a web-only padding compensation in `ui.tsx`. This only affects the
`npm run web` preview target, not the real iOS/Android app.

## Tech stack decision

**Expo (React Native + TypeScript), not native Swift/Kotlin.** Rationale: you asked
for both iOS and Android, said tech stack doesn't matter, and want to replicate this
across countries — one React Native/Expo codebase covers both platforms from day one
and gives every future country app the same shell, cutting each subsequent country's
build time drastically. Expo specifically (over bare React Native) buys managed
builds (EAS Build) so you don't need a Mac with Xcode to ship iOS updates, OTA JS
updates without app-store review for non-native changes, and a huge library ecosystem
(fonts, speech, storage all installed today without native code).

**Fonts:** none bundled — v2 deliberately uses the OS's own system font (San Francisco
on iOS, Roboto on Android) instead of a custom webfont; see "Design system" above for
why. (v1 briefly used `@expo-google-fonts/inter` + `poppins`, SIL OFL-licensed; removed
once the native-feel redesign made a custom typeface counterproductive.)

**Icons:** `@expo/vector-icons` (Ionicons, MIT-licensed) for in-content icons; native
SF Symbols (iOS) / vector drawables (Android) for the tab bar via `unstable-native-tabs`.
No external image sourcing needed for UI chrome.

**Images/branding:** deliberately none sourced yet. The app currently uses only
vector icons and a placeholder Expo default app icon/splash — see "Open decisions"
below for why real photos were avoided and what needs your input.

## Feature set implemented vs. deferred

| Feature | Status |
|---|---|
| Official 2008 (100Q) + 2025 (128Q) civics content | ✅ Done, source-verified |
| Reading/writing vocabulary | ✅ Done, source-verified |
| Flashcards (sequential/random/starred, read-aloud) | ✅ Done |
| Practice test (customizable, real scoring) | ✅ Done |
| State capital + governor lookup | ✅ Done (governor data needs 2nd-source verification, see file) |
| National officials (President/VP/Speaker/Chief Justice) | ✅ Done, verified today |
| Mock interview | 🟡 V1 only: on-device TTS asks the question, user self-grades. No speech recognition/scoring yet — see privacy gate below |
| U.S. Senator / House Rep lookup by state/ZIP | ⛔ Not built — needs a small backend (see `content/us/officials/README.md`) |
| Reading/Writing test practice screens (N-400-style sentence dictation) | ⛔ Not built — vocab data exists, UI doesn't yet |
| Gamification (streaks, daily challenges, spaced repetition) | ⛔ Not built — `practiceHistory` is already tracked in local storage as the foundation for this |
| Accessibility (large-font/dark mode) | ⛔ Not built — theme tokens exist in `src/theme/theme.ts`, no toggle UI yet |
| Legal-services resource links | ⛔ Not built |
| Privacy policy / ToS documents | ⛔ Not written |
| App icon / logo / brand identity | ⛔ Placeholder only |

## Immediate next engineering steps (in priority order)

1. **Officials backend** — stand up a small serverless function (Supabase/Firebase/
   Cloudflare Worker, your call) that does ZIP → Census geocoder → congressional
   district → Congress.gov API → senator/rep name, cached with a daily refresh. This
   unblocks the two remaining state-specific questions and is the single highest-risk
   item to leave undone (see legal review §6).
2. **Second-source-verify `governors.json`** against Ballotpedia/NGA row by row.
3. **Reading/Writing practice screens** — data already modeled in
   `reading-vocab.json`/`writing-vocab.json`; needs a sentence-practice UI similar to
   Study/Practice.
4. **Decide the mock-interview speech-scoring approach** (on-device vs. cloud STT) —
   this is a product decision with real privacy-architecture consequences, not just an
   implementation detail. See legal review §4.
5. **Gamification pass** — daily streak calculation from `practiceHistory` (already
   collected), a "weakest questions" spaced-repetition mode using starred + wrong-answer
   tracking.
6. **Accessibility settings** — wire up the existing theme tokens to a font-size
   multiplier and a dark palette; add the toggle UI in Settings.
7. **Legal-services resource list + privacy policy/ToS** — content-writing task, not
   engineering; can happen in parallel with the above.
8. **Real branding** — see open decisions below.

## Content freshness process (recurring, not one-time)

- `content/us/officials/national-dynamic.json` and `governors.json` are marked with
  `lastVerified` dates. Re-verify before every app-store release, and immediately
  after: a presidential inauguration, a Speaker of the House election, a Supreme Court
  confirmation/retirement, or any gubernatorial election/resignation.
- Never let officials data be edited only through an app-store release cycle — that's
  the exact failure mode that cost a competitor its ratings (see LEGAL_REVIEW.md §6
  and the original app-research notes in project memory). Once the officials backend
  (step 1 above) exists, these should move from static JSON to that live-refreshed
  source.

## Per-country replication strategy

The repo is already structured for this: `content/<country>/...` holds each country's
official test content, `apps/<country-app-name>/` holds each country's Expo app. The
UI shell (`src/components`, `src/theme`, navigation structure) is generic enough to
reuse almost as-is for the next country — only `src/content/*` and the officials data
model change. Budget a fresh legal review (LEGAL_REVIEW.md §8) and a fresh content-
sourcing pass for each new country; don't assume the US public-domain/trademark
analysis transfers.

## Open decisions — need your input

These are creative/business calls, not technical ones, so nothing was invented here:

1. **App name and brand identity** — see "App name" section below for the corrected,
   research-backed recommendation. Still need an actual icon/logo before this can ship
   — currently using Expo's default placeholder icon.

## App name (revised 2026-09-03)

First pass of this recommendation prioritized a distinctive brand name ("Civics
Pulse") with the searchable year/keyword pushed into the App Store subtitle field.
That was wrong, and worth recording why: confirmed via current ASO research that a
**keyword in the app title carries roughly 5x the search-ranking weight of the same
keyword in the subtitle** — and Google Play has no separate keyword field at all, so
the title alone is doing nearly all the search-matching work there. Every real
competitor in this category reflects that: "US Citizenship Test 2026 Plus," "Citizen
Now: US Citizenship," "USCIS: Civics Test Study Tools" — none lead with a pure
abstract brand name.

### FINAL: "US Citizenship Test 2026-Pulse"

User confirmed keeping the year in the primary name (matching the competitor
convention directly, not just the suffix) — exactly 30 characters, fits Apple's title
limit exactly (a spaced colon or dash pushes it to 31-32 and gets rejected by App
Store Connect; the tight, unspaced dash is what makes it fit). Set as `expo.name` in
`app.json`.

- Leads with the actual searched phrase, matching how every serious competitor's title
  is structured.
- Keeps "Pulse" as a suffix — the identity already built into the live product (the
  readiness gauge, the ECG sparkline, the green "monitor" visual language) — so the
  store listing describes what's actually inside the app.
- **Known tradeoff, accepted deliberately:** because the year now sits in the primary
  name (not just a suffix), this name needs the same annual rename competitors do —
  the "never needs renaming" advantage only applied to a year-free name. Budget an
  annual App Store Connect / Play Console name update (title only, doesn't affect
  reviews or rankings history) each year, same as every competitor already does.
- No "USCIS" or DHS terms in the *visible* name (legal review §2) — but it's fine, and
  expected, to include "USCIS" in the **hidden keywords field** (Apple only, 100
  chars, invisible to users) since that's indexing for how people actually search, not
  a public claim of affiliation. Suggested subtitle (30 chars, fits exactly):
  *"Civics, N-400 & Interview Prep"* — covers secondary search terms without repeating
  words already credited from the title (Apple doesn't double-count repeats).

Fixed as part of this: the Home screen had "Civics Pulse" hardcoded as an on-screen
heading from the earlier design pass — that was scope creep (turning an internal
design-direction name into user-facing copy without being asked), reverted to a plain
"Welcome back" so on-screen text doesn't drift ahead of the actual naming decision.

## Bundle identifier (2026-09-03)

Set in `app.json`: **`com.uscitizenshippulse.app`** for both `ios.bundleIdentifier`
and `android.package`. User explicitly chose a generic, domain-independent identifier
over one tied to a personal name or an owned domain — portable if this later moves
under a company entity. Deliberately does NOT contain "2026" or anything year-specific,
since the app's display name changes yearly but the bundle identifier must never
change once shipped (it's effectively a permanent primary key Apple/Google use for the
app record, all in-app purchases, and every user's entitlement history).

Apple Developer Program enrollment confirmed by user (2026-09-03) — next step is
registering this same Bundle ID in Certificates, Identifiers & Profiles, then creating
the app record in App Store Connect and the `lifetime_unlock` in-app purchase product
(the exact ID `src/lib/purchase.tsx` already expects).
2. **Mock-interview persona.** Legal review recommends a clearly-fictional avatar
   (illustration or licensed stock photo of an actor), never a real official's photo
   or actual government uniform/insignia. Need to pick/commission the actual art.
3. **Speech-recognition approach for the interview feature** (on-device vs. cloud) —
   affects both privacy-consent flow design and cost.
4. **Monetization model** — see the dedicated section below for the research and a
   concrete recommendation. Still needs your sign-off before any paywall gets built.

## Monetization — research and recommendation (2026-09-03)

### What the competitors actually charge, and when

| App | Model | Trial | Notes |
|---|---|---|---|
| US Citizenship Test 2026 Plus (highest downloads, ~104K ratings) | Free + ads, **$4.99 one-time** "remove ads" | — | Simplest model in the category; correlates with the highest download volume of anything researched |
| Citizen Now (~65K ratings) | Free/ads + **$3.99/mo or $19.99 lifetime** | — | Mid-priced subscription with a lifetime escape hatch |
| Citizenry (~13K ratings, lowest volume of the top 3) | **$9.99/week** up to $14.99/mo, $19.99–$39.99 lifetime | **None found** | No-trial weekly billing is the single most aggressive pattern in the category — and it's also the lowest-volume app of the three, so it isn't obviously working better |
| Category-wide pattern (other citizenship apps) | Often **$0.99 for 1 week → auto-renews to $2.99/mo or $29.99/yr** | Nominal | Classic "cheap teaser price, steep renewal" bait pattern; a common driver of complaints about ad-gating (30-second ads every few questions) and outdated/thin content banks |
| CitizenPass (smaller player) | **$39 one-time, money-back if you fail** the real test | — | The only outcome-based guarantee found — a trust mechanic worth considering given how high-stakes this purchase is for the buyer |

### General paywall mechanics (industry research, not category-specific)

- **Hard paywall** (pay before any use) converts fewer total users but each is worth
  more (~5.5x higher conversion rate among those who see it, ~21% higher LTV).
  **Soft paywall** (use first, pay later) produces 2-3x more total subscribers at a
  lower per-view conversion rate.
- **Timing matters more than paywall design or copy.** The right moment is after the
  user has felt real value, not an arbitrary screen. Apps like this one (education,
  not instant-gratification like dating) consistently perform better with a soft
  paywall shown after a first real session, not on first launch.
- **Trial length:** among apps that use trials at all, 17–32 day trials convert at
  ~45.7% — nearly double 3–7 day trials. But trials aren't universally better — for
  some categories, users who buy outright are worth more than trial converts. Given
  citizenship exams aren't scheduled overnight, a longer trial (or none at all, paired
  with a fair one-time price) fits this use case better than a short countdown timer.

### Recommendation

Given this app's specific position — content itself is public-domain (gating it would
be self-defeating since a competitor already gives it away free), and the highest-
volume competitor already validated the simplest model — recommend:

1. **Free tier:** the full civics question bank, flashcards, and basic practice tests,
   unlocked from install. This mirrors the highest-download app's approach and is
   honest given the content is public domain anyway.
2. **One-time purchase (not a subscription) to remove ads and unlock the deeper
   features** — customizable practice-test length, unlimited mock interviews once that
   feature is real, offline mode. Price in the $4.99–$9.99 range the highest-volume
   competitor validated, not the $9.99/week end of the market that correlates with the
   lowest volume among the apps researched.
3. **No auto-renewing weekly subscription with a teaser price.** It's the pattern most
   associated with both low relative download volume in this category and general
   App Store user distrust/complaints industry-wide — not a model worth copying just
   because some competitors use it.
4. **Show the paywall after the user's first completed practice session** (soft paywall,
   value-first), not on first launch — matches the general research above and this
   category's education (not instant-gratification) shape.
5. **Consider the outcome-based guarantee angle** (a modest "money-back if you don't
   pass" for the one-time unlock) as a differentiator — nobody else in the direct
   competitor set does this, and it directly addresses the anxiety driving the purchase.

### What actually has to happen before any of this can be built

Payment infrastructure is the one area of this project that requires **you** directly,
not more engineering from this session:
- An Apple Developer Program enrollment ($99/yr) and a Google Play Developer account,
  under whichever legal entity will own this app.
- App Store Connect / Play Console product configuration for the in-app purchase
  (or subscription, if you override the recommendation above) — this can only be done
  by someone with account access.
- A payments SDK (RevenueCat is the standard choice for cross-platform IAP — free tier
  covers small apps) wired into the Expo app once the above exists.

Once you've made the account-level decisions, the in-app paywall UI and RevenueCat
wiring is a normal engineering task I can build.

## Decision locked in + built (2026-09-03)

Approved: **$9.99 lifetime unlock, no other charges, first practice test free.** Built
and verified end-to-end (screenshots on file this session):

- `src/lib/purchase.tsx` — the entitlement/purchase abstraction (`isPro`,
  `purchaseLifetime()`, `restorePurchases()`). **Backed by a local mock for now, not
  real payment processing** — see the header comment in that file for exactly why
  (no App Store Connect product exists yet, and `react-native-purchases`/RevenueCat's
  SDK is a native module that doesn't run in Expo Go or the web preview this project
  has used throughout, so wiring it for real means moving to an EAS dev client — a
  deliberate step to take once you're ready, not something to impose mid-prototype).
  Every mock function has the exact commented-out RevenueCat call it gets replaced
  with, so this is a small, well-scoped swap later, not a rewrite.
- `src/components/Paywall.tsx` — the paywall screen, gating: Study/flashcards stay
  free forever (public-domain content, no reason to gate it), the first full practice
  test is free, every practice test after that and the mock interview require the
  unlock. Wired into `practice.tsx`, `interview.tsx`, and `settings.tsx` (which also
  shows Pro status + Restore Purchases).
- **Reinstall/restore is real, not an afterthought:** confirmed against Apple's actual
  App Review process (they explicitly test buy → delete app → reinstall → tap
  Restore → confirm unlock) and RevenueCat's own docs on Transfer-vs-Alias restore
  behavior. `Restore Purchases` is reachable from both the paywall and Settings, per
  Apple's requirement. Once RevenueCat is wired for real, use "Transfer to New App
  User ID" (the default) — correct for a single-user lifetime unlock, not shared/family
  content.

### Motivation & conversion design (the psychology behind the paywall)

Research-backed, not guessed — and deliberately *not* using dark patterns, given who
this app serves:

- **Goal-gradient effect** (Hull; confirmed in modern loyalty-program studies by
  Kivetz/Urminsky/Zheng, 2006): motivation rises as the *perceived* distance to a goal
  shrinks. The paywall leads with the same readiness gauge used on Home, showing the
  user's **real, specific score** — not a generic pitch. "You're closer than you think"
  lands because it's paired with an actual number.
- **Value-first paywall timing** (the documented Duolingo/Headspace pattern): both
  apps let the user complete one real unit of the core experience — one lesson, one
  meditation — *before* any payment ask, because trial-to-paid conversion is highest
  right after a genuine competence win. That's why the paywall triggers only after a
  completed practice test, never on first launch.
- **Outcome framing over feature framing** (Headspace's own documented finding):
  pitching "reduce stress" outconverted a feature list; the paywall here leads with
  "walk into your interview already knowing you're ready," not "unlimited tests."
  Citizenship is already an intrinsically powerful identity goal — the copy leans into
  that real stake rather than manufacturing generic app-store urgency.
- **Honest price anchoring:** "some apps charge $9.99/week, this is $9.99 once" is
  anchored against Citizenry's actual verified price, not a fabricated strikethrough
  "was $49.99."
- **Explicitly avoided:** countdown timers, fake scarcity ("only 3 spots left"),
  fear-based copy ("you might fail without this"), and fabricated testimonials/social
  proof. This app serves people mid-naturalization — a genuinely stressful, high-stakes
  process — and exploiting that anxiety for conversion is both an ethical line and a
  live regulatory risk (the FTC has actively pursued dark-pattern subscription
  practices). It also isn't necessary: the real outcome (citizenship) is motivating
  enough without manufactured pressure.

### Still open

- The "money-back if you don't pass" guarantee (idea #5 above) — not built; needs a
  decision on how you'd actually honor/verify it before it's a real feature.
- Real testimonials/social proof on the paywall — intentionally left out rather than
  fabricated; add once the app has genuine reviews.

## v7 — First-launch experience, personalization, trust (2026-09-04)

Request: "a very promising start … with American flag and motivational quotes …
make this app personal to people so they can trust it."

**Audience framing (important, keep):** users are lawful permanent residents who have
lived in the US for years and are about to *become citizens* — not people dreaming of
coming to America. All copy is written to that person ("The last step of a long
journey. You've been building a life here for years.").

**What was built**
- `src/components/AmericanFlag.tsx` — flag drawn with react-native-svg to the official
  spec, not a stretched image: 10:19, 13 stripes, canton 7/13 × 0.76, 50 stars in 9
  offset rows (6-5-6-5-6-5-6-5-6) at 1/10 and 1/12 canton intervals, star Ø 0.0616;
  Old Glory Red `#B31942`, Old Glory Blue `#0A3161`, White `#FFFFFF`.
- `src/content/quotes.ts` — 8 quotes. Rules baked into the file header: (1) speak TO
  this audience with dignity (the first set — "huddled masses", Oath excerpt,
  Preamble — was rejected as talking down / boilerplate); (2) every quote verified
  word-for-word against a primary source (presidential libraries, National Archives,
  UCSB American Presidency Project) with the URL stored beside it; (3) speakers span
  both parties (Washington, Lincoln, FDR ×2, LBJ ×2, Reagan, Obama). Dropped as
  unverifiable/paraphrased: Obama "not a matter of blood or birth", T. Roosevelt
  "not a matter of birthplace", JFK not used (verified but off-theme).
- `app/onboarding.tsx` — three steps, shown once: Welcome (flag + Reagan 1989
  "anyone, from any corner of the Earth…"), Personal (first name + interview date,
  both optional, explicit "I don't have an interview date yet"), Trust (official
  questions / data stays on device / independent + not legal advice).
- `src/components/InterviewDateField.tsx` — shared native date picker
  (`@react-native-community/datetimepicker` 9.1.0, Expo SDK 57): iOS inline calendar,
  Android system dialog, web MM/DD/YYYY fallback. Range today → +2 years.
  **Native module → requires a new dev build** (queued as EAS build `ffe18b7f`).
- `src/lib/appState.tsx` — `firstName`, `interviewDate` (ISO), `hasOnboarded`,
  `hydrated`; `daysUntil()` helper. All on-device (AsyncStorage), never transmitted.
- `app/(tabs)/_layout.tsx` — gate: `!hydrated → null`, `!hasOnboarded → <Redirect
  href="/onboarding">` (no flash for returning users).
- Home header — "Welcome back, {firstName}" and an honest countdown ("45 days until
  your interview · 128 questions"; "tomorrow"; "today — you've got this"; falls back
  to the default line if the date has passed). Home still fits one screen.
- Settings → new **Personal** card to add/change name and interview date later, plus
  "Remove interview date".
- `src/lib/purchase.tsx` — in `__DEV__`, RevenueCat SDK errors are routed to
  `console.warn` (yellow banner) instead of `console.error` (red full-screen LogBox)
  so the known "products could not be fetched from App Store Connect" state doesn't
  block testing. Release builds unaffected.

**Open**
- RevenueCat "None of the products … could be fetched from App Store Connect": Apple-side
  config, not code. Check (1) Paid Applications Agreement = Active (Tax + Banking
  complete), (2) IAP `lifetime_unlock` status = "Ready to Submit", (3) allow a few
  hours after either changes. Then test with a Sandbox Apple Account.
- Keep or drop the "LIVE READINESS MONITOR" eyebrow on Home — your call.

## v8 — Device feedback round 2 (2026-09-04, evening)

- **Quotes replaced** (all 8) — see v7 rules; first set rejected as talking down to the
  audience.
- **Interview date → native picker** (`InterviewDateField`), explicitly optional with an
  "I don't have a date yet" checkbox; editable later in Settings › Personal.
- **"Unlock Mock Interview" overflowed its pill** — root cause: `PrimaryButton` had no
  horizontal padding and shrank to the text inside a centered card. Buttons now
  `alignSelf: 'stretch'` + `paddingHorizontal`, label `numberOfLines={1}`.
- **State picker couldn't be dismissed** — now a `pageSheet` modal (swipe down) with an
  explicit Done button; `onRequestClose` wired for Android back.
- **Practice test rework** (`app/(tabs)/practice.tsx`):
  - Options numbered 1–4; "Select one answer" vs "Select 2/3 answers" label
    ("Name two…"/"What are three…" questions are genuinely multi-select now).
  - After grading: your correct picks green, wrong picks light red, missed correct
    answers outlined green. A guidance card shows the *official* accepted answers, the
    USCIS topic (section › subsection), a what-to-review tip (per topic, phrased as
    what to study — never as facts that could go stale), "Study this topic" (opens
    Flashcards filtered via `/study?category=<id>`), and Flag for review.
  - Results screen lists missed topics with a count and a one-tap link to the
    flashcards for each.
  - Bug fixed: options were re-shuffled on every re-render (they moved after you
    answered). Now prepared once per test.
  - Distractors come from the same topic first (plausible), never duplicate an
    accepted answer.
  - State-specific questions: governor/capital resolve from My State; senator/rep are
    excluded (no live data) instead of showing "Answers will vary."
- **Question counts hidden** in Home subtitle, Settings pills, Flashcards ("Card 12" +
  progress bar). Rationale from Sandeep: printing "128" reads like a limit of the app.
  For the record: 128 is the *entire* official 2025 USCIS pool (2008 test: 100) — the
  number is USCIS's, not ours. "2025" is USCIS's own name for the current test version;
  which version an applicant takes depends on their N-400 filing date, so the app
  defaults to 2025 and lets users switch in Settings.
- **Flashcards**: real two-sided card — tap rotates 180° (spring, native driver,
  `backfaceVisibility: hidden`). "Read aloud" now reads only the visible face (the
  question before the flip; question + answers after), so it can't leak the answer.
- **Dark mode**: existed in Settings › Appearance (System/Light/Dark); added a one-tap
  sun/moon toggle in the Home header since it wasn't being found.
- **"LIVE READINESS MONITOR" eyebrow removed** (Sandeep: "not required"). Home header is
  now greeting + subtitle + sun/moon toggle.
- **Home subtitle wording**: Sandeep asked for "2026" instead of "Preparing for the 2025
  civics test". "2025 civics test" is USCIS's official name for the current version, so
  writing "2026 civics test" would misname the test users see on their USCIS notice.
  Resolved by dropping the version year from Home entirely ("Preparing for your
  naturalization interview"); the official version name stays only in Settings, where
  choosing it matters. Revisit if Sandeep still wants a literal 2026 on Home.
- **Practice bug fixed**: choosing 10 questions left the pass threshold at 12 (the
  2025 default), so a 10-question test could never pass. The threshold now follows the
  question count at 60% (the real test's ratio) until the user changes it.
- **Dev-only unlock for paid screens**: Settings › Unlock full access › "DEVELOPMENT ONLY"
  → "Unlock all paid features locally". Flips `dev.forceProUnlock` in AsyncStorage;
  `isPro` becomes `entitled || (__DEV__ && devForcePro)`. Read and honored only under
  `__DEV__`, so a release build ignores the stored flag entirely — it is not a bypass.
  Use it to test Mock Interview and unlimited practice tests while the App Store sandbox
  purchase is blocked. "Reset purchase state" clears it. A real sandbox purchase is
  still the only way to exercise the RevenueCat path end to end.
- **Web console error fixed at the source (see also v9)**: `Received false for a non-boolean attribute
  collapsable` was `Animated.createAnimatedComponent` injecting `collapsable={false}`
  into react-native-svg elements, which the web renderer forwards to the DOM.
  `src/components/animatedSvg.tsx` wraps Circle/Path to strip the prop; RadialGauge and
  EcgSparkline import from there. Web previews are now clean (0 console errors).

## v9 — QA pass fixes (2026-09-04, late)

An external QA review found the issues below. All are fixed; each fix names the
root cause so the reasoning survives.

### Ship-blocking

1. **Lifetime unlock was free in production builds.** `purchase.tsx` fell back to the
   local mock whenever no RevenueCat key was present, and the key was only in the
   gitignored `.env.local` while no `eas.json` profile declared an EAS environment — so
   a store build would have granted lifetime access to everyone for free (and Android
   already behaved that way, its key being empty). Two-part fix:
   - `eas.json`: every build profile now declares `"environment"`
     (development/preview/production) so the EAS-stored `EXPO_PUBLIC_REVENUECAT_*` keys
     are actually injected at build time.
   - `purchase.tsx` **fails closed**: the mock path is now gated on
     `__DEV__ || Platform.OS === 'web'`. A release build with no key sets
     `PURCHASES_UNAVAILABLE`, nobody is pro, and Unlock returns "In-app purchases are
     not available in this build" instead of granting access. Defence in depth: even if
     the env binding regresses, the worst case is purchases being unavailable, never free.
   - **Android still needs** its own RevenueCat Play Store key + Play Console products
     before an Android release; until then Android correctly reports purchases
     unavailable.
2. **Mock Interview crashed after a test-version switch.** The random start index was
   picked once from the 128-question pool and never reclamped, so switching to the
   100-question 2008 test left it out of range. Now an effect re-picks the index when
   the pool identity changes, and the lookup is clamped as a belt-and-braces guard.
3. **Dark mode was disabled natively.** `app.json` pinned `userInterfaceStyle: "light"`,
   which restricts the whole app to the light theme: `useColorScheme()` always reported
   light (so Settings' "System" could never resolve to dark) and native chrome (tab-bar
   blur, date picker) stayed light even when the user forced dark. Now `"automatic"`.
   **Requires a new native build** to take effect.

### Functional

4. **Practice kept the previous version's length and pass line.** Both were snapshotted
   into state at mount, so a 2008 user could get a 20-question test needing 12 correct
   while the explanation said 10 and 6. An effect on `civicsVersion` resets both and
   returns to setup.
5. **Multi-select detector misread two question shapes.** Root cause: the pattern only
   looked for "two/three" anywhere after a leading verb. The definite article is the
   real signal in USCIS phrasing — "Name **the** three branches" is ONE composite
   answer, "Name three national holidays" is three picks. New rule: reject on `one of`,
   reject on `the/its/their two|three`, then match `name|list|give|what are` + number at
   any **sentence** start (so "There were 13 original states. Name three." is caught).
   Audited against all 228 questions in both versions: 6 multi-select in 2025, 6 in
   2008, and every retained single-select verified by hand.
   Also: option count is now `expected + 3` distractors, so a three-answer question is
   3-of-6 rather than the old 3-of-4 (which was impossible to fail).
6. **Paywall promised "all 128 flashcards"** — wrong for 2008 users and against the
   no-counts rule. Now "Every flashcard stays free, forever".
7. **Web date field never showed a saved date** — its text state started empty and was
   never seeded from `value`, so Settings looked blank. Seeded from the prop now.
   (Verified: the input's DOM value is populated; it is not visible in `innerText`.)
8. **A font load failure hung the app on the splash screen.** The hooks' error value was
   discarded and the splash was only hidden on success. Now `fontsReady` is
   `(loaded || error)` per family, the failure is logged, and the app starts on system
   fonts. Splash hiding also waits for theme + app-state hydration, which removes the
   light-flash and onboarding-flash glitches at the same time.

### Smaller

9. Speech now stops on unmount in Flashcards **and** Mock Interview, and Mock Interview
   calls `Speech.stop()` before each ask, so repeated taps can't overlap. The avatar
   shows a speaking state driven by the TTS callbacks.
10. `restorePurchases` only ever **upgrades**: a restore that finds nothing (wrong Apple
    ID, offline, transient failure) no longer revokes a paying user's access. Real expiry
    still arrives via RevenueCat's customer-info listener.
11. Storage writes moved out of the `setState` updater callbacks in `appState.tsx`
    (updaters can run twice under StrictMode, double-writing).
12. `ThemeProvider` exposes `hydrated`; the splash waits for it, so a dark-mode user no
    longer sees a light flash.
13. A **past** interview date now says "Your interview date has passed — update it in
    Settings" instead of silently reading as no date.
14. **D.C. and the five inhabited territories are selectable.** New
    `content/us/officials/jurisdictions.json` carries only verified, stable facts:
    territory capitals (San Juan, Hagåtña, Charlotte Amalie, Pago Pago, Saipan) and the
    official answers USCIS's own question notes give D.C. residents ("D.C. does not have
    a governor", "D.C. is not a state and has no capital", "no U.S. senators").
    Territory **governors are deliberately null** — they change with local elections and
    we have no verified feed, so the app says "Not tracked yet" rather than risking a
    wrong name, the same rule already used for senators and representatives. Practice
    can now test the governor/capital/senator questions for these residents.
15. `*.bak` / `*.bak.*` added to `.gitignore` (stray timestamped package-file backups).
16. Settings' civics-version explanation no longer prints "(128 questions)/(100
    questions)" — it identifies the versions by the N-400 filing date instead, which is
    what actually decides it.

Verification: `tsc` clean; browser pass over Home, My State (with D.C.), the state
picker, Mock Interview, Settings and a full practice test including a multi-select
question — zero page errors and zero console errors.
Not verifiable on web and still needing device eyes: the flip animation, the native
date picker, the speaking-ring animation, and native dark mode after a rebuild.

## v10 — Navigation and Settings redesign (2026-09-04, night)

**The "More" screen was iOS, not us.** With six tab triggers, iOS shows four and
collapses the rest into its own plain, unthemed list (it rendered light-on-white while
the app was in dark mode, with two lonely rows and a page of emptiness). Fixed by
getting under the limit rather than trying to style a screen we don't own:

- `app/(tabs)/local.tsx` → `app/local.tsx`. My State is now a **pushed** screen with a
  native header and back button, which suits a reference screen you visit occasionally.
  The route path `/local` is unchanged, so the Home tile still works. Reached from the
  Home tile, the new Settings row, and a "Pick your state" link in Practice setup
  (shown only when no state is set yet).
- Five tab triggers remain: Home, Study, Practice, Interview, Settings. A comment in
  `(tabs)/_layout.tsx` records the five-item limit so nobody adds a sixth.

**Home header**: removed the floating light/dark circle. It crowded the large title and
stacked into a column of circles beside the dev client's floating "Tools" button
(`expo-dev-menu`'s FAB, `DevMenuFABView.swift:94`, dev-only and absent from release
builds). Appearance lives in Settings, which is also the only place that can offer
"System".

**Settings rebuilt as a conventional grouped list.** It was a stack of cards containing
long paragraphs; now it is labelled sections of hairline-separated rows:
- Access card (pro status or the unlock CTA) stays at the top.
- **Personal**: first name, interview date (native picker), My state with its current
  value and a chevron. Footer states the on-device-only guarantee.
- **Appearance** and **Civics test**: real segmented controls instead of button rows.
- **Purchases**: Restore purchases as an action row (Apple requires it be reachable).
- **About**: Privacy and Disclaimers behind disclosure rows, so the required
  non-affiliation and not-legal-advice text is one tap away instead of dominating the
  screen.
- **Development only** section, compiled out by `__DEV__`.

Verified: `tsc` clean; browser pass over Settings in light and dark, disclosure
expansion, and the My State screen, with zero page or console errors.

## v11 — Safe-area handling unified, Home greeting stacked (2026-09-04, night)

**Settings touched the top of the screen.** Root cause was inconsistency, not Settings:
Home and Study padded for the safe area explicitly (Home had already hit this bug and
opted out of automatic insets), while Practice, Interview and Settings relied on
NativeTabs' automatic scroll-view content insets, which do not apply reliably on device.

Fixed once, in one place: `TabScrollView` in `src/components/ui.tsx` sets
`contentInsetAdjustmentBehavior="never"` and pads `insets.top` /
`insets.bottom + TAB_BAR_CLEARANCE`. Every tab screen now uses it (Study keeps its
non-scrolling View root but shares the exported `TAB_BAR_CLEARANCE` constant), so the
magic tab-bar number exists in exactly one file and no screen can forget the inset.

**Home greeting stacked.** "Welcome back, {name}" on one auto-shrinking line meant a
long name shrank the title badly. Now "Welcome back" is a quiet callout line and the
name owns the large title beneath it, with up to two lines before it shrinks. With no
name saved, "Welcome back" is simply the title.

Verified: `tsc` clean; all six screens (Home, Study, Practice, Interview, Settings,
My State) render in the browser with zero page or console errors, and a deliberately
long test name ("Bartholomew Featherstonehaugh") confirmed on its own line. The device
still needs to confirm the top inset, which is the part the browser cannot prove.

## v12 — Dev code removed for release (2026-09-04)

Removed outright rather than left behind a `__DEV__` guard, so there is nothing to
audit and no stored flag that a future refactor could accidentally honour:

- **Deleted** the local pro unlock: `devForcePro`, `__devSetForcePro`, `__devReset`,
  the `dev.forceProUnlock` storage key, and the whole "Development only" section in
  Settings. `isPro` is now exactly `entitled` — the RevenueCat entitlement, nothing else.
- **Mock purchase path narrowed to web only** (`Platform.OS === 'web'`, previously
  `__DEV__ || web`). On iOS and Android there is now no code path that grants an
  entitlement locally, in any build type. Without a key, purchases fail closed.
- One `__DEV__` block remains, in `purchase.tsx`: it only raises RevenueCat's log
  verbosity and routes SDK errors to `console.warn`. Metro strips it from release
  bundles. Kept because it costs nothing and makes sandbox debugging bearable.
- `expo-dev-client` stays in `dependencies`, which is what Expo prescribes; its dev
  menu and floating Tools button are compiled into debug builds only.

Verified: `tsc` clean; all six screens render with zero page/console errors; the
Settings dev section is gone; Mock Interview is correctly locked again with no way to
unlock it except a real purchase.

## v13 — The purchase bug: product was a CONSUMABLE (2026-09-04, night)

Symptom: RevenueCat logged "None of the products registered in the RevenueCat dashboard
could be fetched from App Store Connect" on device, for hours, across several retries.
Dashboards and the phone both looked correctly configured.

**How it was actually found.** Guessing from the phone was going nowhere, so we queried
Apple directly with the App Store Connect API (the `AuthKey_*.p8` was already on the
machine from the RevenueCat setup). Probe script kept at
`scratchpad/asc-check.js` — signs a 10-minute ES256 JWT locally, GETs only, and prints
each in-app purchase's type, state, price schedule, availability, localizations and
review screenshot. It reported in one line what neither dashboard showed:

    lifetime_unlock -> type: CONSUMABLE

**Why that is worse than the fetch error.** A lifetime unlock must be NON-CONSUMABLE:
- Apple never returns consumables from a restore, so reinstall recovery — the very
  first requirement Sandeep set for payments — was impossible by construction.
- A consumable can be purchased repeatedly, so the same person could be charged twice.
- Selling permanent access as a consumable invites a review rejection.
Type mismatch against RevenueCat's non-consumable registration is also the likely
reason StoreKit returned an empty product list (likely, not proven).

**Why it needed a new product ID.** An IAP's type is immutable after creation and Apple
never releases a used product ID, so `lifetime_unlock` is permanently burned.

**Resolution**
- New IAP `lifetime_access`: NON_CONSUMABLE, $9.99, en-US localization, review
  screenshot, all territories. Verified via the same probe: `type: NON_CONSUMABLE`,
  `state: READY_TO_SUBMIT`, price schedule present, screenshot COMPLETE.
- `lifetime_unlock` removed from sale (`availableInNewTerritories=false`).
- RevenueCat: `lifetime_access` attached to the `pro` entitlement and to the
  `$rc_lifetime` package in the `default` offering; old product detached.
- `LIFETIME_PRODUCT_ID` in `src/lib/purchase.tsx` now `lifetime_access`, with a comment
  recording why it must never point back at the old ID.

**Lesson worth keeping:** when a vendor SDK blames "your configuration", verify against
the upstream system's own API rather than its dashboard. Two dashboards agreed the
setup was fine; Apple's API disagreed in one field.

**Also fixed while diagnosing:** the Unlock button spun for the full 61-second StoreKit
stall with no feedback. `getOfferings` now has a 15s timeout and the paywall surfaces
the failure reason in a visible error box instead of failing silently.

## v14 — Real app icon: Liberty Torch (2026-09-04)

Blocker 2 cleared. The app had been carrying stock Expo artwork — `android-icon-foreground.png`
and `favicon.png` were byte-identical to the template, so the Android icon would have
shipped Expo's logo.

**Direction chosen** (from six studies published at
`claude.ai/code/artifact/d80df1cc-d5d1-43a9-ab7f-bd9c26e7f81e`): **Liberty Torch** — the
Statue of Liberty flame reduced to two shapes, white on brand green `#0FA968`.
Deliberately a monument, not an emblem of office, so it carries no implication of
government endorsement. Ruled out before drawing: any government seal (the Great Seal is
restricted by 18 U.S.C. § 713, USCIS/DHS insignia separately), an accurate flag (legal
but reads as a government app), an eagle, and any issued-looking document.

**How the assets were produced.** No image tooling exists on this machine (no
ImageMagick, rsvg, cairosvg, PIL), so the icons are drawn as inline SVG in
`scratchpad/render-icons.html` and rasterised by screenshotting each element with
Playwright at exact pixel sizes (`scratchpad/shoot-icons.js`). Re-running those two files
regenerates the whole set, so the icon is reproducible rather than a one-off binary.

| Asset | Size | Alpha | Why |
|---|---|---|---|
| `icon.png` | 1024² | **no** | Apple rejects any transparency in the iOS icon |
| `android-icon-foreground.png` | 1024² | yes | mark at 60%, inside the adaptive-icon safe zone |
| `android-icon-background.png` | 1024² | no | flat `#0FA968` |
| `android-icon-monochrome.png` | 1024² | yes | flat silhouette for Android 13+ themed icons |
| `splash-icon.png` | 1024² | yes | transparent so it works on both splash grounds |
| `favicon.png` | 64² | no | web |

**Config also fixed:** `android.adaptiveIcon.backgroundColor` was still Expo's template
blue `#E6F4FE`, now `#0FA968`; and `expo-splash-screen` had been registered with no
options at all, so it fell back to a white ground with template art — it now specifies
the real image, `imageWidth: 200`, `contain`, and light/dark grounds
(`#FFFFFF` / `#05130D`).

Previous assets backed up to `assets/_backup_<timestamp>/`. Config resolves clean via
`expo config --type public --json`; `tsc` clean.

**Requires a new native build** — icons and splash are baked at build time, so they will
not appear in the current dev client via hot reload.

## v15 — Purchase verified end to end; practice test made scroll-free (2026-09-04, late)

### Blocker 1 CLOSED

Full chain verified on device, with the log as evidence at each step:
- Apple serves `lifetime_access` (propagation completed; the earlier 61.02s stalls are gone)
- purchase → `POST /v1/receipts (200)` → `Purchased product` → transaction *finished*
- `active entitlements: ["pro"]`
- restore works (`Posting JWS token (source: 'restore')`)
- delete + reinstall + Restore recovers access — the requirement from the very first
  payments conversation, and impossible before the Consumable fix
- fresh purchase now unlocks immediately, with the Unlock button disappearing

**Two faults found after I had already called it "verified end to end" — I was wrong to
say that, and the reason is worth keeping.** `POST /v1/receipts (200)` proves the
transaction was *recorded*, not that an entitlement was *granted*. Those are separate
steps and I checked only the first:

1. `lifetime_access` was never attached to the `pro` entitlement in RevenueCat.
   Recreating the product to fix the Consumable problem silently dropped the mapping
   the old product had. Diagnosis came from a `__DEV__` log of
   `entitlements.active` / `entitlements.all` / `allPurchasedProductIdentifiers`, which
   read `active: [] | all: [] | purchased: ["lifetime_access"]` — owned, granting nothing.
   Product, offering and entitlement are three independent layers in RevenueCat; two
   were right.
2. **`purchaseLifetime` failed silently in exactly that case.** It returned
   `{ success: false }` with no `error`, and the paywall only renders an error when one
   exists — so a charged user saw the button do nothing. Now returns an explicit
   message pointing at Restore. A charge with no feedback is the worst failure a
   payment flow can have; error handling must cover a successful call that grants
   nothing, not just thrown exceptions.

### Practice test: no scrolling during a question

Feedback: the post-answer guidance card pushed "Study this topic" below the fold, and
having to scroll mid-question wrecked the flow.

- **Removed the entire post-answer card** from the running phase. Grading is now
  communicated only by the options themselves: your correct picks fill green, wrong
  picks fill light red, and correct answers you missed keep a green outline and check.
- The star moved onto the question card's label row, so marking a question for review
  costs no extra height.
- **All review detail moved to the results screen**, which now lists every missed
  question with its official accepted answers, the USCIS note where one exists, the
  what-to-study guidance, and a direct link into the flashcards for that topic. The
  earlier "guide them what to study" requirement is preserved, just not mid-question.

Verified: a 10-question run at 428×926 measured **0px overflow past the viewport on
every graded question**, results carries the per-question review, and the flashcard link
resolves to `/study?category=am-gov-principles`. Zero page or console errors.

## v16 — Study by topic (2026-09-04, late)

Gap Sandeep spotted: Study offered only Sequential / Random / Starred, all of which just
reshuffle the same 128 questions. There was no way to study a *subject*. The official
test is organised into sections, and studying one section at a time is how people
actually learn it — the structure existed in the content files and was simply unreachable
from the UI (the only route in was the deep link from practice results).

- **Topic chooser on its own row**, above the three ordering pills, labelled with the
  current topic or "All topics". It is deliberately NOT a pill: as one it looked like a
  fourth toggle and gave no hint that it opened anything. It is now styled as a field —
  book icon, label, down chevron, border — and while no topic is selected it spells the
  affordance out: "All topics · tap to pick a topic". Selecting a topic tints it with
  the accent and drops the hint. Opens a `pageSheet` picker listing every official section
  grouped by its parent (American Government, American History, Symbols and Holidays /
  Geography — or Integrated Civics on the 2008 test), each with a plain-language line
  saying what that section covers, plus a count of anything starred inside it.
  "All topics" resets. Selecting a topic filters the deck.
- **The topic's description stays visible above the deck**, so the user reads what the
  section is about rather than only drilling its questions.
- Version-aware: the 2025 and 2008 tests have different sections, so a topic that
  doesn't exist in the selected version is dropped rather than silently emptying the deck.
- The existing `/study?category=<id>` deep link from practice results still works and now
  lands with the topic selected and described.

**One source of truth for the guidance.** The per-topic text was previously `STUDY_TIPS`
inside `practice.tsx`. It now lives in `src/content/topics.ts` as `TOPIC_GUIDE`, shared by
the topic browser and the results review, along with `titleCaseSection` and
`subsectionLabel` helpers that both screens had been duplicating inline.

**Content rule recorded in that file:** the descriptions say *what to review*, never the
facts themselves. The facts stay in the official question set where they are sourced and
verifiable; a second, hand-written copy of civics content would be unsourced, could drift
from USCIS, and is exactly the kind of thing this project has avoided elsewhere.

Verified: topic picker opens and groups correctly, guidance renders in both the picker
and above the deck, topic filtering works, the flip animation is unaffected, and the
deep link resolves. Zero page or console errors; `tsc` clean.

### Still open before submission
- Officials data still hardcoded (`governors.json` UNVERIFIED single-source,
  `national-dynamic.json` bundled against its own instructions) — the last real blocker.
- Remove the `__DEV__` entitlement diagnostic in `purchase.tsx` before the production build.
- Privacy policy URL, screenshots, description/keywords, age rating, App Privacy answers.
- New native build required for the icon, splash and native dark mode.

## v17 — Flashcard overflow bug (2026-09-05)

**Reported:** a flashcard rendering as unreadable overlapping text. OCR of the screenshot
showed content interleaved from several elements at once ("Card Blackfeet",
"natoChoctals the rag, theeanthem") — the signature of content escaping its container.

**Cause.** The card's two faces are `position: absolute` with fixed bounds
(`study.tsx`, `.face`) so they can be flipped independently. The answer list inside was a
plain `View`, so when a question has more answers than the face is tall, the list laid
out past the face and painted over the header, the topic blurb and the nav row.
"Name one American Indian tribe" has **25 accepted answers**.

**Scope — 15 questions can trigger it:** 9 on the 2025 test (25, 22, 13, 11, 10, 10, 8,
8, 7 answers) and 6 on the 2008 test (22, 16, 13, 13, 11, 10).

**Fix.** Both faces now scroll internally (`ScrollView` with
`contentContainerStyle: { flexGrow: 1, justifyContent: 'center' }`), so any length is
contained regardless of device height. The front face got the same treatment for the
longest question in the set (133 characters).

Because a `ScrollView` swallows taps, whole-face tap-to-flip could no longer be relied
on, so the "Tap to flip" / "Tap to flip back" hint rows are now the explicit flip
targets. They already said "tap", so the affordance was there.

**Verified by hit-testing rather than by eye:** at the nav row, `elementFromPoint` now
returns `Previous` / `Next` and at the tool row `Read question & answer` — previously
answer text sat on top. The card holds one scroll container with 789px of content in a
335px window (428×926).

**Second fault the measurement exposed:** on a 375×667 device the answer window
collapsed to 53px, roughly one line. The back face was repeating the question you had
just flipped away from. It now shows that preview only when there are 6 or fewer
answers, the topic blurb is capped at 3 lines, and `cardArea` has `minHeight: 260`.
Window is now 117px at that size, and the controls hit-test correctly.

**Practice and Interview checked, and they do NOT share the bug** — the only
absolutely-positioned content boxes in the app are these card faces. Both of those
screens flow inside `TabScrollView`, so long answer lists lengthen the page instead of
overlapping it (verified: with a 10-answer question revealed in Interview, the bottom of
the screen shows an answer, not a control painted over).

**Shared improvement applied to all three screens.** A 25-item list reads as 25 things to
memorise when only one is needed, so `acceptsAnyOne(question, answerCount)` now lives in
`loadContent.ts` and Study, Interview and the Practice results review all label the count
("ACCEPTED ANSWERS · 25") and add "Any one of these is accepted." where the question asks
for one. Written once rather than three copies of the same regex.

## v18 — Go-live preparation (2026-09-05)

### Blocker 3 CLOSED — officials data cross-verified

- **All 50 governors** diffed name-by-name against the **National Governors Association**
  (nga.org/governors), the governors' own official association: **zero mismatches**.
  `governors.json` now records `verificationStatus: CROSS_VERIFIED_TWO_SOURCES` with both
  sources and a `nextReviewDue` of 2026-11-04.
- **The four national officials** verified against primary .gov sources:
  whitehouse.gov (President, Vice President), supremecourt.gov (Chief Justice),
  house.gov/leadership (Speaker). All four already correct.
- **Party is no longer displayed anywhere** in the app (the My State screen now renders
  `governorAnswerFor()`, which returns the name only), so the unverified party field
  carries no user-facing risk. Retained for reference and labelled as unverified.
- **Bonus: the five territory governors are now carried.** The NGA publishes territories
  alongside states, so Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and the
  Northern Mariana Islands no longer say "not tracked" — they have verified names from the
  same source. D.C. keeps the official USCIS answer (it has no governor).

**Remote config is NOT done and remains the right follow-up.** The data is correct today,
which is enough to ship, but it is still bundled: a wrong name can only be fixed by an App
Store release. The midterms are 3 November 2026, about two months post-launch, and many
governors change then. Serving these two files from remote config with the bundle as
offline fallback stays on the list.

### Release hygiene
- **Diagnostic removed.** The `__DEV__` entitlement log added while debugging the purchase
  is gone. The single remaining `__DEV__` block only raises RevenueCat log verbosity.
- **`supportsTablet` → false.** Our layout is phone-width by design. Declaring iPad support
  would make Apple require a 13" iPad screenshot set *and* review the app on iPad, where a
  stretched phone layout reads as unfinished. One line to reverse when an iPad layout exists.

### Production build
`eas build --profile production --platform ios` **cannot run non-interactively**: it needs
a Distribution Certificate, and creating one requires an Apple login. Confirmed working
otherwise — the production EAS environment does inject
`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, so the fail-closed purchase path will have its key in
release builds. Must be run interactively by Sandeep.

### Store metadata drafted — `docs/store/`
- `privacy-policy.md` — needs hosting at a public URL, and its placeholder contact address
  replaced. Written to what the app actually does: on-device only, Apple + RevenueCat for
  purchases, no analytics, no tracking, no microphone.
- `listing.md` — name, subtitle (30/30), promotional text (156/170), keywords (98/100),
  description (2318/4000), category, age rating, copyright, screenshot plan, and the
  **App Privacy questionnaire answers**: declare Purchase History only, for App
  Functionality + Analytics, not linked to identity, not used for tracking — which is
  correct *because* we use anonymous RevenueCat app user IDs and never call `logIn`.

### Still required from Sandeep before submission
1. Run the production build interactively (Apple login for the distribution certificate).
2. Host the privacy policy and add a real support URL and contact address.
3. Take 5–6 device screenshots at 1284 × 2778 from the production build.
4. Paste the listing copy, answer the age-rating questions, fill App Privacy.
5. Attach `lifetime_access` to version 1.0 — **not** the retired `lifetime_unlock`.

## v19 — Production build failure: content lived outside the app (2026-09-05)

First real production build failed in Metro on EAS:

    Failed to construct transformer: ENOENT ... stat '/Users/expo/content'
    npx expo export:embed --eager --platform ios --dev false exited with non-zero code: 1

**Cause.** `content/` sat at the repo root so future per-country apps could share it,
with `metro.config.js` reaching it through `watchFolders: ['../../content']` and 12
imports of the form `../../../../content/us/...`. There is no git repo and no root
`package.json`, so EAS has no monorepo to detect and archives **only**
`apps/us-citizenship`. On the builder that app directory *is* the root, so
`../../content` resolved to `/Users/expo/content`, which does not exist — and the shared
files were never uploaded at all.

**Why it took this long to surface.** Development builds do not bundle JavaScript on the
server; Metro runs on the developer's Mac, where those paths resolve. `expo export:embed`
during a production build is the first and only time the config is evaluated on EAS. No
amount of device testing could have caught it.

**Fix.** `content/` moved *inside* the app (`apps/us-citizenship/content/`), all 12 import
paths shortened to `../../content/...`, and `watchFolders` removed since nothing lives
outside the app any more. Single source of truth is preserved — it just sits one level
down. The reasoning is recorded in `metro.config.js` so the folder is not "helpfully"
moved back out: promote it to a real monorepo (root `package.json` + workspaces) only when
a second country app actually exists.

**Verified locally before spending another EAS build** by running the exact step that
failed, `expo export --platform ios`:
- 4.4MB Hermes bundle produced, no resolver errors
- civics content embedded (`Blackfeet`, `Kay Ivey`, `Naturalization`, `lifetime_access`)
- all four official photos exported, byte sizes matching the sources exactly
- territory data embedded — the accented values (`Jenniffer González-Colón`, `Hagåtña`)
  are stored **UTF-16LE** by Hermes, which is why an ASCII grep first reported them
  missing; a dual-encoding search found each one

Pre-move backup: `/tmp/content-before-move-<timestamp>.tar.gz`.

## v20 — Store assets complete (2026-09-05)

**Support site live** on Cloudflare Workers static assets (Pages needs `pages:write`,
which this token lacks; `workers:write` it has):
- https://pulse.pastclimate.com/privacy — Privacy Policy URL
- https://pulse.pastclimate.com/support — Support URL
- Contact: mamura66@gmail.com. Source in `site/`, one DNS record on `pastclimate.com`.

**Screenshots**: 5 of the planned 6, staged in upload order in
`store-assets/screenshots/`. All verified 1284×2778 with **no alpha channel** (alpha is
the silent cause of Apple screenshot upload rejections).

Ordered deliberately: the topic picker leads because it is the strongest frame, and the
readiness gauge sits at position 3 rather than 1 because it still reads **35% — below the
60% pass line**. Flagged twice; Sandeep chose to ship it. If installs underperform, that
lead image is the first thing to retest — a failing score on the app's signature gauge is
the clearest candidate.

Not taken: the **results/review screen**, which is the only illustration of the
"we tell you what to study next" promise in the description. Worth adding in a later
release rather than blocking on now.

Builds finished, both from the content-move fix:
- production `4d751a3a-ba1b-4ec5-90c6-5b427aa82f00` — for submission
- preview `28b9135a-e1a9-4f8a-a149-889fb0dbc49d` — ad-hoc, used for the screenshots

## v21 — Listing filled in via the App Store Connect API (2026-09-05)

Everything that the API can set has been set, using the existing
`AuthKey_P49ALKJGF4` key. Scripts kept in `scratchpad/`: `asc.js` (JWT client),
`asc-state.js` (readiness dump), `asc-metadata.js`, `asc-screenshots.js`.

| Item | State |
|---|---|
| Name | US Citizenship Test 2026-Pulse |
| Subtitle | Civics, N-400 & Interview Prep (30/30) |
| Promotional text | 156/170 |
| Keywords | 99/100, competitor-derived |
| Description | 2318/4000 |
| Privacy Policy URL | workers.dev/privacy |
| Support URL | workers.dev/support |
| Screenshots | 5 × 1284×2778, APP_IPHONE_65, all COMPLETE, order locked |
| Categories | Education (primary), Reference (secondary) |
| Age rating | questionnaire complete, everything NONE/false → 4+ |
| Build | 6 attached (PROCESSING → VALID) |
| Version state | PREPARE_FOR_SUBMISSION |

**Things learned about the API, recorded so they are not rediscovered:**
- `whatsNew` cannot be set on a first version — Apple 409s with
  "Attribute 'whatsNew' cannot be edited at this time". There is no previous release.
- `ageRatingDeclaration` hangs off **`appInfos`**, not `appStoreVersions` (the latter
  returns "The relationship 'ageRatingDeclaration' does not exist").
- The age-rating PATCH must carry **every** field at once; a partial patch fails with
  "You must provide a value for the attribute X". Field types were deduced from Apple's
  own errors: 13 are enums taking `NONE`, 11 are booleans. Recorded in the script.
- `GET /v1/ageRatingDeclarations/{id}` is not a route; read it back through the
  `appInfos` relationship.
- Screenshots need reserve → per-part upload via `uploadOperations` → PATCH with
  `uploaded: true` and the file's **md5** as `sourceFileChecksum`, then a PATCH to
  `.../relationships/appScreenshots` to lock display order.

**`lifetime_unlock` cannot be deleted** — Apple returns
`ENTITY_ERROR.IAP_DELETE_NOT_ALLOWED`; in-app purchases are permanent once created. It is
harmless: `availableInNewTerritories = false`, so it is off sale everywhere.
`lifetime_access` is the live one (`true`). Do not attach the consumable to a submission.

### The one thing the API cannot do
**App Privacy (the privacy "nutrition label") is UI-only** — `appPrivacyDetails`,
`dataUsages` and `appDataUsages` all 404. It must be filled in by hand in App Store
Connect, and a submission is blocked without it. Answers are in `docs/store/listing.md`:
declare **Purchase History** only, for **App Functionality + Analytics**, **not** linked
to identity, **not** used for tracking.

## v22 — Rejected under Guideline 2.1 (Information Needed), 2026-09-05

First submission rejected the morning after it went in. **Not a defect report** — Apple's
standard information request for a developer account with limited review history. Nothing
in the app has to change; they want to understand what it is.

Apple asked for seven things. Items 2–7 are written and delivered:

- **Review Notes field updated via the API** (`tools/asc/set-review-notes.js`, 2751
  chars). Apple explicitly asked for the information to live there for future
  submissions, not only in the Resolution Center reply.
- **Full Resolution Center reply drafted** in `docs/store/review-reply.md`, covering
  purpose and audience, how to set up and reach every feature, the external services
  list, regional behaviour, content rights, and the in-app purchase walkthrough.

Points worth keeping, because they answer questions this app will keep attracting:
- **No account exists**, so registration / login / account-deletion flows and
  content-reporting flows are absent *by design*. The reply says so explicitly rather
  than leaving Apple to infer it from silence.
- **Content rights**: civics questions, answers and vocabulary are U.S. Government works
  published by USCIS, public domain under **17 U.S.C. § 105**, from Form M-1778 (2025)
  and the 2008 100-question test. No permission needed.
- **Not a regulated service**: gives no legal or immigration advice, prepares or submits
  no form, takes no part in any application — stated in onboarding, Settings → About, and
  the store description.
- **External services are short and verifiable**: Apple StoreKit, RevenueCat (anonymous
  IDs only, never `logIn`), and Apple's on-device speech synthesis. No backend, no
  analytics, no ads, no AI service. Content is bundled, so the app makes no content
  network calls.

**Still required from Sandeep: a screen recording on a physical device**, starting at
launch and including the paywall, since Apple specifically asks to see paid content being
accessed. Steps are in `docs/store/review-reply.md`.

Also recorded: the scratchpad is wiped between sessions, so the ASC client now lives in
`tools/asc/` (`asc.js`, `state.js`, `set-review-notes.js`). It holds no secrets — key path
and ids come from the environment.

## v23 — Website, and an external copy review (2026-09-07)

**Marketing site built and deployed** at
`https://uscitizenship-pulse-site.sandeep-sandha.workers.dev` (source in `site/`), on the
same assets-only Cloudflare Worker that already served the privacy and support pages.
White, single accent, structure modelled on diskbuddy.com at Sandeep's request: hero,
alternating feature rows with real device screenshots, a details grid, two pricing tiers,
FAQ, footer. It reuses the app's own palette and IBM Plex faces so the site and product
read as one thing.

**Answered: can we distribute outside the App Store like DiskBuddy?** No, and the reason
matters — **DiskBuddy is a macOS app**, and macOS permits signed, notarized direct
downloads. iOS has no equivalent: TestFlight still requires Beta App Review and expires
builds at 90 days, ad-hoc caps at 100 registered devices, the Enterprise Program is
internal-staff-only and public use gets the certificate revoked, and EU alternative
marketplaces reach EU users only and need a €1M standby letter of credit. Android *can*
sideload an APK, but Play Billing cannot be used outside Play, so payments would move to
Stripe. Recorded so this doesn't get re-litigated.

**Two layout bugs I shipped, both from writing CSS without rendering it:**
1. `.phone { width: 100% }` with no `height` — the browser fell back to the HTML `height`
   attribute and stretched every screenshot vertically. Fixed with `height: auto` plus
   `aspect-ratio: 1284 / 2778` as a guard.
2. The mirrored feature row used `order: 2` to swap sides. Grid auto-placement follows
   `order`, so the **image** landed in the wide `1fr` track and the copy was squeezed into
   the 280px one — one screenshot rendered far larger than the others. Replaced with
   explicit `grid-column` assignments.

**Consequence: a headless browser is now installed** in the scratchpad
(`playwright install chromium`). Both bugs would have been caught in seconds by rendering
the page, and both reached Sandeep instead. Layout claims get verified from now on.
Verified after the fixes at 1440 / 1024 / 390 / 320: zero sideways scroll, zero
overflowing elements, all three feature images identical at 280×606 ratio 0.4622, and
every feature heading at **0px offset** from the top of its phone image.

**External copy review (ChatGPT) — adopted:** US-English fixes; an explicit hero box
explaining that "2026" is the year you take the test rather than a test version (the
review's strongest point, since the name says 2026 and the content says 2025/2008); the
practice claim reworded to be version-specific; a ticked value list above the CTA;
"twenty-five" generalised; a less combative section heading; FAQ 1 rewritten; the
officeholder FAQ reframed as a confident policy; and the line pointing readers at USCIS's
own app removed.

**Declined, with reasons:** the Reagan quote stays — Sandeep chose the app's quotes and
asked for words that address this audience with dignity, so cutting it is his call, not a
reviewer's. And no waitlist: it needs a backend, the app should clear review within days,
and Sandeep had just asked for his email to come **off** the page.

**US English swept across the codebase.** The review caught two instances; a
word-boundary scan found four more, including **twice in the App Store description**
(`PRACTISE THE REAL INTERVIEW`) and `defence` in `purchase.tsx`. All fixed in the repo.
The live description is locked while 1.0 is in review, so **that one ships as-is and is
deferred to the next release** — recorded in `docs/store/NEXT-RELEASE.md` along with the
Home screenshot swap, the officials remote-config work (deadline: 3 November midterms),
the oversized site images, and the open question on the hero quote.

## v24 — Accounts for everyone, and the payment chain (2026-09-07)

Sandeep: *"Everyone will need to create account even for free. Set it up and let me know
what do you need from paddle. We will first test in their sandbox"* and, mid-build,
*"We need to support sign if with google as well. What do you need for it."*

So the website stopped being a static site. `site/` is now a Worker with static assets:
`run_worker_first` sends `/api/*` and the app page to code, and leaves the marketing site
and the content packs on the CDN.

### What was built

- **`src/lib/store.js`** — the whole data model on one KV namespace (`PFC`,
  `7dc1d7e034fe45c99f257b0766dfc0db`). Users by normalised email, id→email and
  Google-subject→email indexes, sessions with a KV TTL doing the expiry, entitlements,
  progress, webhook-event ids for idempotency, rate-limit counters.
- **Two ways in.** Email + password (PBKDF2-SHA256, 210,000 iterations — Workers has no
  bcrypt) and Google OAuth 2.0 authorisation code flow, exchanged server-side so the
  client secret never reaches the browser.
- **`src/lib/access.js`** — `hasPaidAccess()`, the only code allowed to decide whether an
  account has paid.
- **Server-held progress**, which is what makes "one free practice test" mean one rather
  than one per browser.
- **The country lock**, refused server-side once set.
- **Paddle**: overlay checkout, a verified webhook, and a direct API confirmation.
- Real `/login` and `/signup` pages; the country choice moved into signup; `/privacy-web`
  written because the site now collects an email address.

### Four bugs found by testing, not by reading

1. **The app page redirect-looped when signed in.** `ASSETS.fetch('/app.html')` gets the
   asset router's own 307 to the extensionless `/app`, which the browser follows straight
   back into the handler. Fetch the path the router actually serves.
2. **The country allowlist answered before the lock.** An account that already had a
   country was told "that country is not available yet" — true, but not why it was
   refused, and it would have sent people to support about the wrong problem.
3. **A paying customer could still see the paywall for up to a minute.** Cloudflare KV
   caches a *miss*, so the colo that looked for `ent:<id>` while drawing the paywall can
   keep answering "no" after the webhook writes one. Fixed by confirming the transaction
   against Paddle's API directly and minting a **new** session carrying a five-minute
   `proUntil` hint — a new key has nothing cached against it. The hint expires on its own,
   so a refund still bites.
4. **An unverified email address was an account-takeover route.** Nothing verifies
   ownership at registration, so anyone could register `victim@gmail.com`; when the real
   owner later signed in with Google, the link left the squatter's password working. Now
   linking Google to an existing account retires that account's password — the verified
   credential wins over the unverified one. Properly fixing this needs an email sender.

Three of my own test failures were the harness, not the code: `$O="-H Origin:$B"` passed
to curl unsplit by zsh sent a header named `" Origin"`; JSON bodies escaped inside
`"$(...)"` arrived malformed; and `text-transform: uppercase` changed `innerText` again —
the third time that has cost a false failure.

### Status

`57` API checks and `23` browser checks pass against `wrangler dev`, including the chain
that matters: signed webhook → access granted → refund revokes it.

**Not deployed.** It needs six values from Paddle and Google first — see
`docs/WEB-BACKEND-SETUP.md`, which has the exact dashboard steps and the
`wrangler secret put` commands.

Still open: a refund policy and terms page (Paddle requires both before live, Google's
consent screen wants the terms URL), email verification and "forgot password", and
`www.prepareforcitizenship.com` DNS.

## v25 — Deployed, and the bug only production could show (2026-09-07)

Sandeep: *"no one know about our site yet so you can deploy"*. Deployed to
`prepareforcitizenship.com`.

Two things that all 57 local tests had passed:

1. **`www` never redirected on static pages.** The Worker canonicalises `www` to the apex,
   but only on paths in `run_worker_first` — so `www/login` was served straight off the
   CDN. Someone landing there would have signed in against `www`, while the session cookie
   is set for the apex, and their `POST /api/auth/login` would have met a 301 that browsers
   retry as a GET. The sign-in pages are now worker-first so the redirect runs on them too.

2. **Registration 500'd on the first real request.** `NotSupportedError: Pbkdf2 failed:
   iteration counts above 100000 are not supported (requested 210000)`. Miniflare does not
   enforce that cap, so it was invisible locally. The work factor now comes from six
   chained rounds of 100,000 — each round's output is the next round's password, costing an
   attacker the same 600,000 HMAC-SHA256 operations. Both numbers are stored in the hash
   string so either can be raised later.

Found with `wrangler tail`, not by guessing — the exception named the limit and the line.

### Verified live

Register, sign-in with the right and wrong password, the `/app` sign-in wall, `/api/me`,
the unconfigured checkout returning 503 rather than pretending, and `www` → apex. Register
takes 2.3s and sign-in 1.8s, nearly all of it the hash; kept, because password reuse means
our hashes guard other people's accounts too, and it is once per 30-day session.

The test account and all 7 of its KV keys were backed up and deleted afterwards —
production KV is empty.

Live but not yet sellable: `/api/config` reports `paddle.configured: false`, so the paywall
says "Checkout opening soon" and the Google button stays hidden. Six values from Paddle and
Google switch both on — `docs/WEB-BACKEND-SETUP.md`.

## v26 — Paddle sandbox and Google wired up, live (2026-09-07)

Sandeep supplied the sandbox credentials and the Google OAuth client. Two of the four
Paddle values were not what they looked like:

- `pro_01m1xkf5ck788ze3fdcb6b9qc1` is the **product** id, not a price id. The product had
  **no price attached at all**, so a checkout would have had nothing to charge for.
- `ntfset_01m1xkjhtthpjpv4g3wck2k8nf` is the notification destination's **id**, not its
  signing secret. `GET /notification-settings/{id}` does return `endpoint_secret_key`, so
  the real secret was fetched with the API key rather than asking for it again.

Both caught by querying Paddle's API instead of trusting the labels — the same habit that
found the Consumable/entitlement problem on iOS in v13.

A price then appeared twice: Sandeep created one in the dashboard at the same moment one
was created by API. Theirs was kept (it is the id they know) after fixing two defects —
the customer-visible name was `one_time`, and **max quantity was 999999**, which would
have let someone buy a hundred copies of a one-time lifetime unlock. Now capped at 1. The
duplicate was archived. The product name was `one-time` too, which is what a buyer reads
on the checkout; renamed.

### Verified against the deployed Worker, with the real signing secret

- unsigned delivery → 401, grants nothing
- signed `transaction.completed` for our price → 200, `/api/me` flips to `pro: true`
- `transaction.completed` for a different price → 200, accepted and ignored
- `adjustment.created` refund → 200, access revoked
- Google redirect carries the right client id, redirect URI, `openid email profile` and an
  HttpOnly state cookie

`/api/config` now reports `google: true` and `paddle.configured: true`. All 12 test KV
keys were backed up and deleted; production KV is empty.

Note for future sessions: `UID` is a readonly numeric variable in zsh, and assigning to it
breaks the script in a way that reads like a syntax error. Live test scripts live in
`scratchpad/live-paychain.sh` and run under bash.

### Still open before live

Paddle business verification (needs a published refund policy and terms page), password
reset and email verification (no email sender chosen — this is the one part of the payment
experience that is not automatic), and rotating the three credentials that went through
the chat transcript.

## v27 — Terms, refunds, and forgotten passwords (2026-09-07)

Sandeep's three answers: don't rotate the credentials, no refunds, yes to password reset.

**Terms and refunds.** `/terms` and `/refunds`, written and linked from every page footer,
the app rail, both auth pages and the paywall itself. Paddle needs both published before it
will verify the account for live selling.

The refund page says sales are final, as instructed, with one paragraph that had to be
there: Paddle is the seller of record and can refund a customer under its own Buyer Terms
whatever our page says, and UK/EU consumer law gives a cancellation right on digital
purchases. A flat unqualified "no refunds" would likely have been rejected during
verification and would not have been enforceable anyway. The page also lists the three
things we always put right — double charges, paid-but-no-access, and unauthorised payments
— which are not refunds under the policy but mistakes.

**Password reset.** Resend as the sender, one HTTPS call, no SDK.

- The link is a credential, so it is treated as one: 32 random bytes, stored **only as a
  SHA-256 hash**, so a leaked KV dump cannot reset anybody's password. One hour, one use.
- Resetting signs out every other session. There is no index of a user's sessions, so the
  account records `credentialsChangedAt` and `currentUser` rejects any session issued
  before it. That is what makes "reset my password" actually evict whoever had the old one.
- `/reset` checks the token before drawing the form, rather than letting someone choose and
  confirm a password only to be told the link died an hour ago.
- `forgot` answers identically whether or not the address is registered, but returns a real
  error if the send itself failed — claiming to have sent an email that never went would
  leave someone waiting for a message that is not coming.
- With no `RESEND_API_KEY` the route returns 503 and says so, rather than pretending.

`src/lib/email.js` takes its endpoint from `RESEND_API_BASE` when set, which exists only so
a local test can point it at a mock and read the real link out of a captured message — the
same way a user reads it out of an inbox. Never set in production; verified absent from the
deploy.

**105 checks green** across three suites (57 API, 25 reset, 23 browser). Deployed and
verified live: all four new pages serve, `/api/auth/forgot` returns its honest 503, `www`
still canonicalises, and the sign-in page offers the link.

Recorded in CLAUDE.md: the shell-quoting trap that produced false passes for the second
time — `-d "{\"a\":\"$X\"}"` inside `"$(...)"` arrives malformed and the resulting 400
reads like a passing validation test.

### Left to do

Resend account, domain verification (DNS records on the Cloudflare zone), then
`wrangler secret put RESEND_API_KEY` — until then reset is off. Paddle live account and
business verification. Nothing yet proves a new account owns the address it registered
with, though the reset flow now makes that cheap to add.

## v28 — hello@ everywhere, and Cloudflare sends the mail (2026-09-07)

Sandeep: the contact address is `hello@prepareforcitizenship.com`, and *"We use email
service provided by cloudflare"*.

**Contact address.** Replaced `mamura66@gmail.com` across all five pages that carried it.
Checked Cloudflare's API first rather than taking it on trust: the zone already has Email
Routing with `hello@prepareforcitizenship.com → sandeep.sandha@gmail.com`, enabled. So the
address on the site is one that actually receives mail.

**Sender.** My first answer was wrong and I said so: Cloudflare Email *Routing* only
receives. But the account's OAuth token carries an `email_sending (write)` scope, which was
worth checking rather than dismissing — Cloudflare Email Service now exists in public beta
and sends transactional mail to arbitrary recipients on the Workers Paid plan. So Resend
was dropped before it ever shipped: one `send_email` binding, no API key, no DNS records,
no third party holding our users' addresses.

`wrangler dev` emulates the binding and writes each message to `.wrangler/tmp/email/`,
which is better than the mock server it replaced — the test now reads the link out of the
real message body, the way a user reads it out of an inbox.

### The bug that only reading the email could find

The reset link came out as `http://prepareforcitizenship.com/reset?token=…` — built from
`new URL(request.url).origin`, i.e. from the request's own Host header, and not even
https. That is host-header injection on a password reset: influence the Host and the token
in the victim's email points at your server.

Now `src/lib/origin.js` takes the origin from `PUBLIC_ORIGIN` configuration, with the
request origin as a fallback only so localhost dev works. The same fix was applied to the
Google redirect URI, which Google matches against a registered list and which therefore
has to be exactly one value in production.

**105 checks green** (57 API, 25 reset, 23 browser). Deployed, and a real password reset
was sent to Sandeep's own address in production — the only honest way to prove delivery.
The account was created with a random password nobody holds, so the reset link is the only
way in and the test leaves behind a working account rather than something to clean up.

## v29 — Driving a real checkout, and the three bugs it found (2026-09-07)

Everything about the payment chain had been proved with synthetic webhook events. The
overlay itself could not be: it is Paddle's own cross-origin iframe, and the only way to
know a customer can get through it is to get through it. So: Playwright, the live site, and
Paddle's sandbox test card.

It never got as far as the card, and that turned out to be the point.

### 1. A mode clicked on arrival was silently thrown away

`boot()` unhid the shell and *then* awaited `/api/progress` and the content pack. So the
rail was live for the length of two round trips, and when boot finished it re-rendered from
saved progress — discarding whatever had been clicked. Invisible on localhost, where the
window is a few milliseconds. Wide open over a real connection.

The shell now stays hidden behind a "Loading your account…" placeholder until
`renderRail()` and `render()` have actually run. The browser suite now clicks a mode the
instant the shell appears and asserts it sticks.

### 2. `initPaddle` refused to open the overlay, always

It checked `cfg.configured` — a field on the `/api/config` response. It is called with the
`/api/checkout` response, which has no such field. So the guard was always false and the
customer got "The payment window could not load", which was my message about my own bug. It
now checks the fields it actually needs: `token` and `priceId`.

### 3. The question-pool size was on screen

Spotted while reading the study pane during the diagnosis: the rail printed a count against
every section and against "All sections", and the flashcard footer read "1 of 128". CLAUDE.md
has forbidden that since v7 — printed as a number, the pool size reads as a limit of the app
rather than the size of the official test. The iPhone app was fixed; the web app had kept
them. Counts removed; the card footer now reads "Card 5", position without a total. The
practice test's "Question 3 of 20" stays — that 20 is the official test length, not our pool.

### What is actually blocking a purchase

Paddle rejects the checkout with

```
400 {"code":"validation","details":"transaction_default_checkout_url_not_set"}
```

Paddle requires a **default payment link** on the account before any transaction can be
created. Dashboard-only, no API. Paddle's overlay shows only "Something went wrong" and a
button to contact *Paddle's* support, so the reason had to be read out of the network
response.

That surfaced a fourth improvement worth keeping: `checkout.error` and `checkout.warning`
were not handled at all, so Paddle's generic panel was all anyone got. They are now logged
and shown on our own page, saying plainly that nothing was charged.

### Housekeeping

Seven test accounts and their keys were backed up and deleted from production KV. The
`sandeep.sandha@gmail.com` account, its progress and its unclicked reset link were kept
deliberately — that is Sandeep's own account, created to prove email delivery.

**108 checks green** (57 API, 25 reset, 26 browser).

## v30 — A real purchase, tax on top, and the analytics screen (2026-09-07)

Sandeep set the default payment link and the sandbox checkout came alive. Then three
reports at once: the GST was coming out of his $9.99, the home page looked signed out, and
"there is no performance or analytics screen".

### The purchase now works end to end

Paywall → Pay → **interview usable in 8 seconds**, driven in a real browser with Paddle's
sandbox card. Getting there took four fixes, three of them mine:

1. **`transaction_default_checkout_url_not_set`** — Paddle needs a default payment link
   before it will create any transaction. Dashboard only. Its overlay showed a generic
   "Something went wrong" and offered *Paddle's* support, so the reason had to be read out
   of the 400 response body.
2. **`initPaddle` checked `cfg.configured`** — a field on `/api/config`, while it is called
   with `/api/checkout`. Always false, so the overlay never opened and the customer got my
   error message about my own bug.
3. **`successUrl` was destroying the confirmation.** `checkout.completed` fired, our
   confirm call started, and Paddle then navigated the whole page — wiping the JS context
   and returning *without* `_ptxn`. So the page sat on the paywall while the webhook
   granted access behind it: paid, and no sign of it. Fixed by removing `successUrl`
   entirely, plus a `sessionStorage` marker so a reload picks the watch back up.
4. **Two of my own test bugs**, worth recording because both looked like product failures:
   `/pay/i` matched **PayPal** and paid through the wrong button; and taking `.first()`
   match per frame found PayPal then skipped the frame that also held the real Pay button.

### Tax: `external`, everywhere

The price was on Paddle's default `tax_mode: "location"` — inclusive wherever local law
requires it. An Indian sale of $9.99 came out as $8.47 + $1.52 GST, i.e. the tax came out
of Sandeep's revenue. Set to `external`: the buyer now pays **$11.79** on an 18% GST
transaction and the $9.99 is untouched. Verified on a live transaction.

Every page quoting the price now says "plus local tax", because the checkout total is
higher than the headline and a page that hides that is both dishonest and something Paddle
checks. Noted for Sandeep: this is the setting he asked for, and it means an EU/UK consumer
sees tax added rather than included, which is the opposite of what `location` exists to
handle.

### "My login was lost"

It was not — the cookie was intact, `/api/me` returned 200 from the home page, and `/app`
worked. What was wrong is that the marketing pages are static CDN files that said "Sign in"
to everyone, including somebody who had just come from their own account. `nav.js` now asks
`/api/me` and turns that into "Open the app" plus the account name. The complaint was
right; my first diagnosis addressed the wrong half of it.

### The analytics screen

There was one, but its empty state showed a sentence and a button — which is why it read as
absent. Rebuilt as a dashboard that looks deliberate before any data exists:

- an **accuracy dial** with the pass line marked as a tick on the same scale
- **the map of the official test** — one cell per question, grouped by section, green for
  right, red for wrong, grey for not yet asked. Drawn grey from the first visit, so a new
  person sees the territory they are about to fill in. This is the piece worth showing
  somebody.
- **30 days of activity**, answers per day
- the score trend, and sections weakest-first with a way straight into studying each

No numeric pool count anywhere, per the standing rule — the map shows structure, not a
total.

Two more of my own test bugs here: counting `.c` unscoped included the three legend
swatches (128 + 3 = 131), and abandoning a test mid-way then reporting "Tests finished —"
as a bug when it is correct.

**108 checks green** (57 API, 25 reset, 26 browser). All deployed. 56 test keys backed up
and removed from production KV; Sandeep's own account kept.

### Still open

Paddle live account and business verification — the live catalogue needs `external` tax and
its own default payment link, and the domain must be approved. Email verification at signup.

## v31 — Owner-only insights, counted without identifying anybody (2026-09-07)

Sandeep: *"give me analytics ... so I can see from which country people are coming ... it
will only be for me. I should be able to check in that how many converted and how many did
go till checkout page etc."*

Modelled on PastClimate's `/analytics` dashboard, with one deliberate difference that
shapes everything else.

### The privacy constraint came first

`/privacy-web` had been rewritten the same day to describe Google Analytics with a consent
banner for the EEA, the UK and Switzerland. A second mechanism that identified a visitor —
a cookie, a localStorage id, or a hashed IP, which is still personal data under UK/EU law —
would have needed its own lawful basis and probably its own banner. So this counter has no
identifier at all:

- no cookie, nothing in localStorage or sessionStorage, no IP stored or hashed
- country from `request.cf.country`, which is as fine-grained as it gets
- the tables **are** the aggregate: `(day, path, country) -> views` and
  `(day, event, country) -> count`, incremented with an UPSERT. There is no row about a
  person to store, so there is nothing to roll up nightly and nothing to prune

PastClimate stores one raw row per pageview with a daily-rotating visitor hash and a
session id, so it can report unique visitors, bounce rate and a per-person funnel. This
cannot, and the page says so instead of implying otherwise: the top of the funnel is page
views, and the percentages are labelled as ratios between independent counters rather than
a conversion rate. A new section in `/privacy-web` ("Our own visit counter") describes
exactly this; the Google Analytics and cookie sections were left alone.

### What was built

- **D1 `pfc-analytics`** (`b13e5695-89e7-4d5a-8285-a38c0ff66688`), bound as `ANALYTICS_DB`.
  KV cannot group or sum, so counting was the one job it was wrong for.
  `migrations/0001_analytics.sql`.
- **`/insights`** — rendered by the Worker, not a file in `./public`: a static
  `insights.html` would sit on the CDN for anyone who guessed the name. Countries, the
  five-step funnel, page views by day, and pages. Range 7/28/90 days.
- **`/api/analytics`** — the same figures as JSON, from the same `getOverview()`, so the
  page and the API cannot drift.
- **Owner-only, by 404.** `ANALYTICS_OWNER_EMAIL` in `wrangler.jsonc`, never in source.
  Signed out, signed in as somebody else, or the wrong HTTP verb all get the site's own 404
  page — a 403 would confirm the page exists and invite someone to go looking for its API.
  Proved by running the Worker with the var pointing at a different address: the same
  session that sees the dashboard then gets a 404 while `/api/me` still returns 200.
- **`/api/pulse`** — the page-view beacon in `public/analytics.js`, outside the consent
  logic because there is nothing to consent to. Named `pulse` because content blockers
  match "analytics" and "collect" by name even first-party. Screens: same-origin only, a
  bot user-agent list, an in-isolate ceiling of 600 writes a minute. Always 204, so the
  screens cannot be probed.
- **The funnel is counted on the server**, never claimed by a browser: the account write in
  `auth.js` and `google.js` (new accounts only — linking Google to an existing account is
  not a signup), `/api/checkout` answering with a price, and Paddle's signed webhook for a
  payment. Not the API-confirm path as well: both grant access for the same purchase, and
  telling them apart would need the per-transaction row this schema deliberately does not
  keep. The webhook is already exactly-once via the `pevt:` guard.
- Every write goes through `ctx.waitUntil` and swallows its own errors. Verified by
  renaming the tables out from under a running Worker: the home page, the beacon and
  registration all carried on, and `/insights` showed the "apply the migration" card
  naming D1's own error instead of a 500.

### Two things measurement caught

1. **Axis labels inside a scaling SVG are illegible on a phone.** Everything in a viewBox
   scales, so 10px text in a 720-unit chart renders under 4px at 320px wide. The dates and
   the scale are now HTML around the chart, at a real font size, with exact values in the
   table underneath — the same silhouette-plus-caption pattern as the app's own activity
   chart.
2. **`nav.js` never read `/api/me`'s response body when it was a 401**, so on every
   signed-out page load the request stayed open and the page never reached "network idle".
   Harmless to a reader; it hung `scratchpad/pw/newpages.js`, which is how it surfaced.
   Fixed by draining the body either way. Confirmed by blocking each request in turn: with
   `/api/me` blocked the page went idle, with the beacon blocked it did not.

My own contrast harness was also wrong: it dropped the alpha on `rgba()` text and reported
17.2:1 where the true figure is 6.9:1. Both pass, but the number it printed was fiction.

### Verified

**141 checks green** — 58 API, 25 reset, 57 insights (`scratchpad/insights-test.sh`) — plus
the browser suites: 26 auth-flow, 30 pages, 34 ui-fixes, 8 dynamic, and a new
`scratchpad/pw/insights.js` covering the beacon end to end in a real browser, WCAG AA
contrast for all 20 text styles on the page (worst 5.75:1 against a 4.5 requirement), no
sideways scroll at 1280/768/390/360/320px, and the gate from three sides.

**Not deployed.** Before the first deploy the remote schema has to exist:

```
cd site && npx wrangler d1 migrations apply pfc-analytics --remote
```

Until then `/insights` shows the setup card rather than failing.

## v32 — Germany and Spain, and a licence that stops one of them (2026-09-07, overnight)

Sandeep: *"Let us go for Germany and spain and update the home page. after that, go for UK,
canada and Australia later... Do this work in a new branch. Do not deploy in production."*
Then: *"Dont wait for me if you get stuck"*, and website first, app tomorrow.

Branch `feature/multi-country`, off a `main` that was first brought up to date with what is
actually deployed.

### Why these two countries

The product's promise is "the real official questions, not reworded". That promise, not
market size, decides which countries are buildable:

| | Official pool published? | Naturalisations 2024 |
|---|---|---|
| United States | yes, all 128, public domain federal work | — |
| **Germany** | **yes — 300 national + 160 state-specific, free from BAMF** | **288,700, largest in the EU** |
| **Spain** | **yes — 300, free from Instituto Cervantes** | **252,500, second in the EU** |
| United Kingdom | **no** — pool is confidential Crown copyright | — |
| Canada | no — study guide only | — |
| Australia | no — study guide, some official practice material | — |

Germany is the best technical fit of any country: its 10 questions per Bundesland are the
same shape as the US "answers that depend on where you live", which already exists.

The home page had been promising Canada, the UK and Australia — the three hardest markets.

### Spain: extracted, verified, and held back

The pack is complete and correct. Extraction found and fixed a real defect worth recording:
pypdf drops spaces after kerned capitals, turning "Todos" into "T odos" — 118 occurrences,
root-caused in pypdf's source (it takes `abs()` of the TJ kern and so cannot tell a
tightening pair from a space) and proven against the raw content stream rather than guessed.
Validator: 116 checks, 0 failures.

**It is not shippable yet.** The manual carries no reuse clause, but the legal notice for
the site publishing it withholds precisely what a paid product needs:

> no podrán alterarlos, modificarlos, **explotarlos, reproducirlos, distribuirlos, ni
> comunicarlos públicamente**

Verified first-hand at cervantes.org/es/aviso-legal, not taken on report. And Instituto
Cervantes ships its own free official CCSE app, so this would compete with the rights
holder's own product.

So the pack moved to `legal-hold/es-ccse/`, gitignored. That path is outside
`apps/us-citizenship/content/`, which is what `tools/sync-content.sh` publishes — so Spain
cannot reach the website by accident, and the questions cannot reach the public repository
either. Publishing material whose terms forbid redistribution is the same problem whether
it is sold or merely pushed to GitHub.

Next step is an email to Instituto Cervantes asking permission. It costs nothing and is the
obvious move before any legal spend.

Germany's position is expected to be better: German copyright law treats official works
differently from a site's terms of use. Pending that agent's report.

### The English-speaking three, researched properly

Every claim below is from the responsible government body, quoted in the per-country
`SOURCES.md`. The research agent wrote **no question text of its own** — the one pack it
produced was generated from source data and then diffed against the live rendered test.

**United Kingdom — no pack, and none possible without a licence.** No free official
question content exists. The handbook, the *Official Practice Questions and Answers*, the
study guide and the e-learning are all priced TSO products; the practice-questions book
retails at £7.99 against our $9.99 price, so a per-unit royalty could make the country
unviable on its own. The Open Government Licence covers only material "expressly made
available under this licence" and expressly exempts information not published — and the
National Archives' delegations register already lists *"The Official DVSA Revision Theory
Test Question Banks"*, which is a direct precedent for a UK government question bank being
licensed outside the OGL. The Home Office is not in that register.

**Canada — no pack, blocked on one letter.** IRCC publishes *Discover Canada* free and
links 31 study questions (3 worked multiple-choice, 28 open-ended with no printed answers).
Canada.ca's terms permit non-commercial reproduction "without charge or further permission"
but require "prior written permission from the copyright administrator" for commercial
redistribution. We sell the app, so that permission is a precondition rather than a
formality. Cheapest of the three to unblock: a letter, no fee. Second-largest market at
379,530 naturalisations in 2023.

**Australia — buildable, and built.** The department publishes the complete official
practice test free: 20 multiple-choice questions including the five values questions that
must all be answered correctly. Home Affairs material is Creative Commons Attribution 3.0
Australia, and *Our Common Bond* itself is CC BY 4.0 — an explicit commercial-use licence
with attribution. That last point is the interesting one: Australia is the only one of the
three where the **study material** is openly licensed, so a real product can be built on
open content rather than on questions we wrote.

Pack at `apps/us-citizenship/content/au/citizenship-practice.json`, verified by stepping
through all 20 live questions in Chromium: 20/20 exact match on text and options. It
declares `contentType: "official-practice-subset"` and `officialPoolPublished: false`, and
carries a user-facing disclosure — because "20 official practice questions" and "every
question you could be asked" are materially different products and a customer deserves to
know which one they have.

**Not marked ready.** Twenty questions is not yet a product, and one licence point is open:
the practice test is served from a subdomain carrying no copyright footer of its own while
the notice speaks of "this website". Written confirmation from Home Affairs is needed
first. I could not re-verify the quoted copyright pages myself tonight — both URLs 404'd
for me hours later — so those quotes stand on the agent's retrieval, not on mine.

Recommended order: **Australia** (only one where the premise is currently true), then
**Canada** (a permission letter), then the **UK** last and only once the rights enquiry has
a number attached.

### Housekeeping done alongside

- Both US packs gained `language: "en-US"`; the shared validator requires it and the US
  content predates the field.
- `tools/validate-content-pack.py` crashed with an `AttributeError` on the vocabulary
  files. They *do* have a `categories` key, but theirs maps a topic to a list of words, so
  the guard had to test the shape rather than the presence of the key. Now every JSON file
  under `content/` either validates or is skipped with a reason.

## v33 — Germany's picture questions, and the five photographs we cannot ship (2026-09-07, overnight)

Germany's pack arrived complete on text and empty on artwork: 38 of its 460 questions show
a picture, and for 19 of them the four options **are** the pictures — the literal strings
`"Bild 1".."Bild 4"`. Without the files those questions render as four blank tiles and no
answer is reachable, which reads to a learner as a broken test rather than a missing asset.
Thirty-seven now ship their artwork. One is deliberately withheld, and the reason is the
more useful half of this entry.

### The order was the whole risk

For a "which of these four is the Bavarian coat of arms" question, getting the order wrong
marks the wrong answer correct **and the screen still looks completely fine**. There is no
visual symptom. So the order was not taken from the obvious place: the images are stored as
PDF XObjects named `/Im1`../`/Im4`, and on **8 of the 19 pages `/Im1` is not the leftmost
picture**. Naming would have silently corrupted the answer key on nearly half of them.

Instead each page's content stream was interpreted — `q`, `Q`, `cm`, `Do`, maintaining the
transformation matrix — to recover where every image is actually *drawn*, then ordered by
x. That is only valid if the four sit in one row, so that was checked rather than assumed:
all 19 pages place their pictures in a single row with clean column gaps and overlapping
vertical extents.

Verified three ways, because one way is not verification:

1. **By eye.** Contact sheets rendered and read: question 21 → Bild 1 is the Bundesadler;
   209 → Bild 4 is the DDR hammer-and-compass; 226 → Bild 2 is the ring of gold stars;
   1011 → Bild 2 is the Bavarian lozenge; 1041 → Bild 3 is the Bremen key; 1008 → arrow 2
   points at the south-west. Every one matches the `correctIndex` already in the pack.
   Question 130 was read at full size: ballot 1 is the only one with exactly one mark in
   each column, which is precisely what makes it the valid one.
2. **By image identity, needing no eyes.** The same 16 state coats of arms recur as
   distractors across the 16 state questions. Hashing every file gives 24 distinct
   pictures, of which exactly 16 are the correct answer for exactly one Bundesland each,
   and **no picture is marked correct for two states**. A misalignment would almost
   certainly have broken that invariant.
3. **Against the earlier independent check.** The answer key built from the interactive
   catalogue already said Bayern = 2 and Baden-Württemberg = 1 before any image existed.
   The pictures agree.

### Two bugs found by looking that reasoning would have missed

**Almost every image carries an `/SMask`** — a soft transparency mask. Decoding without
applying it gives each coat of arms an opaque block where its background should be. Pillow
applies it; the first extraction pass, which did not, would have shipped 89 images with
boxes around them.

**Transparency itself was the second bug.** With the alpha preserved, question 130's ballot
papers are black line art on nothing, and question 21's second option is a black Chi-Rho.
On a dark theme both disappear entirely — the answer literally cannot be seen. Every file
is therefore composited onto white, which is also exactly how the BAMF page prints it. The
rendering rule is recorded in the pack and passed to the website agent: **white tile in
both themes, no invert, no filter, no blend.** This was found by rendering the image and
looking at it, not by thinking about it.

### The licence boundary, which is sharper than expected

Section 5(2) UrhG frees the official *work* — question and option text — from copyright,
subject to no modification (§62) and source attribution (§63). It does **not** transfer
rights in a photograph BAMF licensed for its own publication. The catalogue has no imprint
and no general rights statement; its only `©` notices sit inline on five pages and name
third parties:

| Question | Credit |
|---|---|
| 55  | © Deutscher Bundestag/Achim Melde |
| 70  | © Bundesregierung/Engelbert Reineke |
| 181 | © Bundesregierung/Engelbert Reineke |
| 216 | © Deutscher Bundestag/Janine Schmitz |
| 235 | © Bundesregierung/Richard Schulze-Vorberg |

None of those five is written to disk. Four of them read perfectly well without their
photograph and stay servable as ordinary text questions. **Question 55 asks "Was zeigt
dieses Bild?"** — it is *about* the photograph, so without it there is no answer. It is
marked `servable: false` and anything loading the pack must filter it out: **459 of 460**.
Withholding one question is a much smaller cost than serving an unanswerable one, or
redistributing somebody's photograph.

Question 187 is the useful counter-example and the reason the test is the credit line
rather than the page: it has `hasImage`, but its page carries no credit because the picture
is the DDR flag — a state emblem drawn as part of the official work. Inspected, and
shipped.

What *is* shipped — coats of arms, flags, the 1945 occupation-zone map, the 16 state
locator maps, the specimen ballots — carries no separate credit anywhere in the catalogue.
The ballots additionally cite `Bundeswahlordnung, Anlage 26`, a statutory annex.

### Guardrails, so none of this can quietly regress

- `tools/extract-de-catalogue-images.py` — the extraction, repeatable, because BAMF revises
  the catalogue. `--write` regenerates; `--verify` re-derives the order from the PDF and
  only reports. It **refuses** to write a picture from a credited page, and it re-runs the
  no-picture-correct-for-two-states check every time. Currently: clean.
- `tools/validate-content-pack.py` gained image checks — every referenced file must exist,
  option-image count must match option count, `correctIndex` must be a valid index whose
  option agrees with `answers`, and a question that ships a file while carrying a `©`
  credit is a hard **error**. So is a `requiresImage` question with no image that is not
  marked `servable: false`: it would go out unanswerable.
- The same validator was **only ever walking `categories`**, so Germany's 160 Bundesland
  questions had been getting no id-uniqueness and no answer-is-an-option checks at all.
  Now both lists are walked, with `stateQuestionsTotal` checked the way `totalQuestions`
  always was.
- `tools/sync-content.sh` copied JSON only, so the artwork would never have reached the
  website however correct it was. It now also copies each country's `img/` directory —
  deliberately not everything non-JSON, since `us/officials/photos` are app assets and
  `SOURCES.md` / `NOTES.md` have no business being served. Its cleanup of a pack-less
  country also became `rm -rf`: `rmdir` silently left a directory whose images had synced
  but whose pack was held back.

### One correction to my own validator

Adding the state questions surfaced 12 "duplicate question text" errors, which looked like
an extraction bug and was not. BAMF's catalogue really does ask "Welches Land ist ein
Nachbarland von Deutschland?" five times, each with a different set of four countries and a
different right answer — five separate official questions sharing one sentence. My rule was
wrong, not the content. A question's identity is its text **and** its options; only both
repeating together means one of the two is dead weight. The shared stems are now reported
as a `note`, which is a third severity added for exactly this: worth saying, not worth
failing.

### Still open for Germany

- **BAMF attribution has to appear on screen** wherever these questions are shown. §63 is
  an obligation, not a courtesy. The string is in `licence.attribution`; the website agent
  has it. Not yet visually confirmed on a rendered page.
- **Do not claim the wording matches the exam.** BAMF's own front page says the wording
  "können leicht von den verwendeten Originalfragen abweichen". "From the official
  catalogue" is the strongest true claim available.
- The 44 negation questions still lose their underlined emphasis.
- Germany has no official topic taxonomy; everything sits in one `allgemeine-fragen`
  category, which is honest but makes study-by-section meaningless for Germany.
- Germany is still **not wired into** `site/public/countries.js` or
  `site/src/lib/countries.js`, so it cannot be chosen yet. Those files belong to the
  website agent, still running.

## v34 — The website speaks German, and readiness stops being a flag (2026-09-07, overnight)

Germany is selectable and fully rendered. The US is untouched and still live.

### Readiness is derived, never declared

`ready: true` was a claim, and a claim can be wrong — a country could be offered with no
questions behind it, which locks an account to a test we cannot serve. So nothing edits a
readiness flag any more. The browser reads `content/packs.json`, the manifest
`sync-content.sh` writes *from the files it actually copied*; the server independently asks
the asset router whether the pack file exists. The two never consult each other, so the
worst a stale manifest can do is offer a country the server then refuses.

Australia is the case that proves the difference between the two failure modes. Its pack
exists and declares `pending-legal-review`, so `sync-content.sh` now **deletes** it from
`site/public/` rather than merely leaving it out of the manifest. Everything under
`public/` is a public URL: omitting a pack from the manifest stops it being *chosen*, not
served. For uncleared material, being published *is* the problem.

That fix was incomplete and I found the gap by testing it rather than reading it. A
synthetic held-back country carrying one image: the pack JSON was removed and **the image
was still served**, because `rmdir` quietly fails on a non-empty `img/`. A picture
question's artwork is the pack's content, so it now goes with it.

### Three languages, and two places where translation was the wrong tool

`site/public/strings.js` — `en`/`de`/`es`, flat dotted keys, chosen from the pack's BCP-47
`language`. `en` is byte-identical to what the app said before, because the US is live.

Two calls that are corrections rather than translations, and both need a native speaker's
eye:

- **"Interview" mode is not an interview outside the US.** The Einbürgerungstest and the
  CCSE are written multiple-choice papers; nobody asks anything aloud. German reads
  "Laut üben", Spanish "Práctica en voz alta". Calling it an interview would be false.
- **Register differs by language on purpose:** German uses "Sie", which is BAMF's own
  register; Spanish uses "tú".

### The hardcoded assumptions were worse than untranslated — they were wrong

Not one of these was a missing string. Each would have shown a German user a fact about
the American test:

1. `askedPerInterview || 10` and `passRequirement || ceil(asked * 0.6)` — a ten-question
   test and a 60% pass mark invented for any pack that did not state its own.
2. `passRequirement || 12` / `askedPerInterview || 20` on the performance screen — the
   US's numbers, which would have drawn a 60% pass line on a German test whose mark is
   52%. Both now return `null` when the pack is silent, and the UI says so instead of
   borrowing.
3. `titleCase()` on every heading turned "TEIL II" into "Teil Ii".
4. `subsection(cat.subsection)` printed the literal word **"undefined"** as a section name
   for any pack without subsections — Germany, Spain and Australia all qualify.
5. Speech synthesis was pinned to `en-US`, so a German question was read aloud by an
   English voice — close to unintelligible, and the mode would have been useless.
6. The English country name was shown to a German account.

Germany's **160 Bundesland questions** were being ignored outright; they are now one
section per Bundesland, studyable, and excluded from anything graded — the same treatment
US "answers will vary" questions have always had.

### Verified in a browser, not from a report

Signed up as a German account in Chromium and walked to Aufgabe 21:

- All four option images **decode** — `naturalWidth > 0`, which is the check that
  distinguishes a working image from an `<img>` that merely exists.
- The BAMF credit is on screen with the question, per §63 UrhG.
- In dark mode the artwork carries no `filter` and no `mix-blend-mode`, and option 2's
  black Chi-Rho is plainly visible on its white tile. That is the precise bug the white
  backing exists to prevent, and it is now shown working rather than argued.

`licence.name` had been reading "(no copyright, subject to §§ 62 and 63 UrhG)" in the
middle of an otherwise German sentence on screen. Now German.

Suites: multicountry 80/80 (new), homecountries 21/21 (new), auth-flow 27/27, ui-fixes
34/34, pages-check 30/30, api 58/58, insights 57/57, notrack 4/4, de-pictures 9/9 (new).
**Nothing deployed.**

### Needs a person, not another agent

- **A native German and Spanish speaker** should read the translated terms of art. The
  specific keys are tabled in the agent's report; `perf.startWith` in Spanish still places
  a pack-supplied section name after a preposition, which was already wrong in German and
  had to be rephrased.
- The app's country picker still badges Canada, UK and Australia "Coming". None has a
  published question pool, so that badge over-promises.
- Spain remains blocked on its licence and is **named nowhere** on the home page.

## v35 — Germany in the iPhone app (2026-09-08)

The app had **no country concept at all** — no picker, no badges, nothing. Onboarding asked
for a name and an interview date, and every screen was the USCIS civics test. So this was
not "wire in a pack": it was building the country dimension. Decision taken with the user:
**one app with a country picker**, not a second app, so there is one listing, one $9.99
purchase covering every country, and the existing reviews and ranking carry over.

### Metro cannot resolve a picture by name, and the failure is silent

Germany's questions reference their artwork by string (`"optionImages": ["img/q21-bild1.jpg", …]`).
React Native cannot use that: Metro bundles an image only where it sees a `require()` with a
**literal** path, and the versioned Expo docs for SDK 57 document only static paths. A
dynamic `require()` throws; worse, an unbundled image renders as an empty tile, so the pack
is valid, the JSON loads, the question renders, and four blank squares appear where the
answer should be.

`tools/gen-app-image-map.py` therefore writes `src/content/images.generated.ts`, one real
`require()` per path, looked up by string. `--check` fails when it is stale. Verified by
exporting an iOS bundle before and after: 57 files → 107.

**Metro deduplicates by content**, which was worth confirming rather than assuming: the 95
files are only **50 distinct images** (the same coat of arms is a distractor in several
questions, and questions 21 and 209 share all four pictures), so 53 jpg in the bundle =
49 distinct German + 4 US official photos. The artwork costs the binary about half what the
directory listing suggests.

`react-native`'s own `Image` is used, not `expo-image`: it takes the result of `require()`,
and adding a native module would force a new build for no benefit.

### Progress had to be namespaced per country before Germany could exist

Progress is keyed by question id, and the ids **collide**: USCIS runs 1..128, Germany runs
1..300 plus 1001.. for the Bundesländer. One shared key would have shown a German user
their US practice history as their own and starred a German question because a US one with
the same number was starred. The website prevents this by locking the country to an
account; the app has no accounts, so the storage is namespaced (`starredIds:de`) and
switching is allowed instead.

An existing user's data is migrated on first launch: the pre-namespacing keys are read
once, copied into `:us`, and **left in place**, so the change is reversible. Verified in a
browser by seeding the old keys and reloading — stars, history, version and home state all
arrive under `:us`, with the originals intact.

`setCountry` clears progress state *before* loading the new country's, because loading is
asynchronous and the gap would otherwise render one country's history under another
country's test.

### What was wrong rather than merely untranslated

- **The practice screen invented a pass mark.** `civicsVersion === '2025' ? 20 : 10` and
  `? 12 : 6` are American numbers; on the German test that is a 20-question paper needing
  12, where the real one asks 33 and needs 17. Now from `packFormat()`, which returns
  **null** when the pack is silent, and the screen says the document does not state it
  rather than borrowing.
- **`prepare()` invented distractors and shuffled the options.** For Germany both are
  wrong: the three wrong answers are themselves official, and `optionImages` is
  index-aligned with `options`, so a shuffle puts every picture against the wrong answer
  with nothing on screen looking amiss. A test that prints its own options is now asked
  exactly as printed.
- **A practice test would have included all sixteen Bundesländer.** A candidate answers
  their own ten and never the other 150. `questionsForRegion()` returns nationwide plus the
  one region that applies, and omits sub-national questions entirely when no region is set.
- **Speech synthesis was pinned to `en-US`** in three places. A German question read by an
  English voice is close to unintelligible, so that mode would have been useless.
- **`topicGuideFor()` fell back to "the official USCIS study materials"** for any section it
  did not know — which is simply untrue of a Bundesland. It returns null now and the line
  is omitted; a confident wrong pointer is worse than none.
- **`subsection` was typed as required**, and making it optional immediately surfaced three
  call sites that would have printed the literal word "undefined" as a section name — the
  same bug the website had.
- The 160 Bundesland questions live in `stateCategories`, **which the app ignored
  completely**. All sixteen are now sections you can study.

`titleCaseSection()` looked like the same class of bug ("TEIL II" → "Teil Ii") but its one
call site immediately `.toUpperCase()`s the result, so it was left alone. Checking beat
fixing.

### Verified in a browser, both languages

Driven through Expo web with Playwright, reading the rendered DOM.

German, 14 checks: Settings names the Einbürgerungstest and hides the 2008/2025 picker;
the card reads "Lernkarten" and "AUFGABE 21"; the pool is **459, not 460**, so the withheld
question is gone; all four pictures **decode** (`naturalWidth > 0`, which is what separates
a working image from an `<img>` that merely exists); the answer face outlines Bild 1, the
Bundesadler, matching `correctIndex`; the BAMF credit is on the screen with the questions
per §63 UrhG; no English chrome and no mention of USCIS anywhere.

US regression plus migration, 12 checks: English throughout, "QUESTION n" labels, no
options list on a free-recall question, no source credit (a federal work needs none), and
the 2008 pack correctly stating 10 questions and 6 to pass — read from the pack, not from a
literal.

Picture questions are laid out as a **2×2 grid** rather than four rows: the text is only
"Bild 1".."Bild 4", and four stacked rows pushed the fourth option off a phone-sized card,
so the one option a learner never scrolls to was as likely as not the right one.

### Known and not fixed

- **The web preview overlays both faces of the flashcard.** `backfaceVisibility: 'hidden'`
  is correctly set on both, and react-native-web does not emit the
  `transform-style: preserve-3d` it needs, so this is very probably preview-only — the same
  card ships in the live US app. **Not verified on a device**: `xcrun simctl` is unavailable
  in this environment, so this needs a simulator or TestFlight check before release.
- **Onboarding is still US-only copy** — a Reagan quote about becoming an American, and no
  country step. The app defaults to the US so nothing is false, but a German user's first
  screen is about the wrong country. This wants a country question first, and it interacts
  with the App Store rename below.
- **`app.json` still says "US Citizenship Test 2026-Pulse"**, which is the home-screen name
  and the store listing. Renaming a live app's identity is the user's call, not a
  side-effect of this work.
- `InterviewDateField` formats dates as `en-US` regardless of country.
- Only the study, practice, settings and tab chrome are translated. Home, the read-aloud
  mode and the paywall are still English.

## v36 — Canada and Australia: our own questions, and why that is the honest route (2026-09-08)

Four countries are now live-ready on the website. Two of them carry questions we wrote.

### The reason there was nothing to license

The user's instinct — "we don't need permission, see how competitors do it" — turned out to
be right, and the reason matters more than the conclusion. **Neither Canada nor the United
Kingdom publishes its question pool.** There is no official set to license, and no product
in either market has the real questions. TSO's *official* Life in the UK app says its
questions are "based on the style and structure of official questions"; Canadian apps ship
hundreds "based on *Discover Canada*" behind an IRCC non-affiliation notice.

So the route is the one the whole market takes, and it is lawful for the same reason it is
lawful for them: questions we write, testing facts from the free official study guide.
Facts are not copyrightable; the guide's expression of them is. What we will not do is copy
a competitor's question bank — that infringes a different owner, and several of them sell
those banks.

Three of the four licence-enquiry emails are therefore superseded. **Spain's still stands**,
and the distinction is exact: Spain *does* publish its 300 CCSE questions and expressly
forbids reproducing them, which is why that pack sits in `legal-hold/`.

### The schema could not say "these are ours"

Which meant such a pack could only be labelled as something it was not. `contentType:
"authored-practice"` now requires `basedOn` (the official material, with its URL) and
`nonAffiliation` (in plain words: not official, not the real questions), and **refuses any
question carrying `officialNumber`** — that field belongs only to a genuine official
question, so its presence means either the label or the content is wrong. Verified by
validating four deliberately broken packs.

### Canada: 76 questions

A useful find in IRCC's own material: it publishes a notice *about third-party study
guides*, saying *Discover Canada* "is the only official study guide", should be a
candidate's "primary resource", and that other material is used "at your own risk". Our
screen says exactly that and links every chapter — a better position than the bare "not
affiliated" the competitors carry.

**The guide is stale wherever anything has moved since 2012**, and inconsistently so: the
Oath chapter has been updated to King Charles the Third, while Symbols still has the 2012
Diamond Jubilee and Elections still says 308 electoral districts, untrue since 2015. The
monarch comes from the updated chapter and every time-sensitive fact is left out — no
question about seat counts, the current Prime Minister, or how many parties sit in the
House. One fewer question beats a confidently wrong one.

**Fact audit: 46 of 46 confirmed verbatim.** Two apparent misses were the checking script,
not the content — Canada.ca uses non-breaking spaces, so "serve until age 75" and
"July 1, 1867" failed a naive search until whitespace was normalised.

### Australia: 75 questions, and the licence verified at last

The CC BY claim recorded earlier was flagged as **unverified** because the pages 404'd on
re-check. It is now verified from the document itself: page 1 of the testable PDF carries
`© Commonwealth of Australia 2020` and CC BY 4.0, excepting the Coat of Arms. That permits
commercial use and adaptation with attribution, making Australia the best-licensed country
here — we would be entitled to reproduce the booklet's wording. We write our own anyway,
and the attribution is on screen, because CC BY is not satisfied by an attribution nobody
can see.

**The values rule is the thing a product must not get wrong.** Home Affairs' own practice
test states it: 20 questions in 45 minutes, at least 15/20 — *and* 5/5 on the Australian
values questions. It is not part of the 75%. Miss one and you have not passed, whatever the
overall mark. Carried as `valuesRule`, twelve questions flagged, and printed on screen.

**Fact audit: 68 of 68 confirmed verbatim.** The one apparent miss was again my search
string: the booklet says "This includes government, community and religious leaders", and
I had searched for "including government".

The 20 genuinely official *sample* questions stay held back — the practice-test subdomain
carries no copyright footer of its own while the department's notice speaks of "this
website", and that ambiguity is unresolved. `sync-content.sh` deletes them from the site on
every sync. They are not wasted: they are the originality reference the authored pack is
checked against.

### The originality gate, which earned its place twice

Our whole position is that the questions are ours and only the facts are theirs. A question
that has drifted into being one of theirs gives that up, and **nobody would notice by
reading the file**. So every build compares our questions against whatever the government
does publish, and refuses to write the pack on a collision. It caught:

- Canada: "What does it mean that Canada is a constitutional monarchy?" — word for word
  IRCC's own study question.
- Australia: "What is Australia's capital city?" — word for word one of Home Affairs'
  twenty; and "What do the colours of the Australian Aboriginal Flag represent?" against
  their "What are the colours of the Australian Aboriginal Flag?", the same question with a
  synonym.

It is **two-tier**, because one threshold cannot tell a collision from a coincidence:
"What is the capital city of Victoria?" scores 0.6 against "What is Australia's capital
city?" and is a perfectly good different question — short factual questions share most of
their significant words by construction. So 0.8+ fails the build; the 0.6–0.8 band is
printed once for a human. The government's own questions are downloaded for the comparison
and **never committed**: they are its expression, not ours to hold.

Two mistakes of mine were caught by machinery rather than by reading: the answer was
authored first in every question and would have shipped as option 1 every time (the apps
deliberately never shuffle a pack's printed options, because Germany's four are official
and reordering them breaks their alignment with the pictures) — so the builder distributes
it with a fixed seed; and Australia's gold-rush question shipped "1788" as two different
options, which the validator caught.

### The home page was making a claim that is no longer true

Four things said "official questions" about all of them:

- the hero subhead, the free-tier heading, the free-tier JSON-LD and the meta/social
  descriptions;
- the generated country sentence — "Each one is a set of official questions";
- the FAQ answer "The official questions are public government material", in both the
  visible copy and the JSON-LD;
- and the Countries section still said we *don't have* Canada or Australia and "won't
  invent questions and call them official".

Saying "official" on the home page and "these are not the official questions" on the study
screen would be the site contradicting itself. The Countries section now explains the two
kinds of pack in plain words, and the FAQ names which countries are which. Canada and
Australia are back on the country strip — removed when they had no pack, restored now that
they do, and still written as "coming" in the static HTML so only the manifest can promote
them.

`app.js` also had to learn two things: it never rendered `nonAffiliation` at all, so the
pack declared it and the screen never showed it; and its licence line produced *"Official
material from Facts drawn from … reproduced under Our own questions; facts drawn from a
Crown-copyright publication"*, because that template assumes official material reproduced
under a licence — precisely what an authored pack is not.

### Tests

New: `ca-verify` 12/12, `au-verify` 17/17. Existing: `multicountry` 81/81,
`homecountries` 25/25, `pages-check` 30/30, `auth-flow` 27/27.

Eight assertions across two suites had hard-coded a two-country world — `['de','us']`,
"Canada must not be selectable", "exactly 2 enabled", "the sentence must not name Canada".
Each was a snapshot of last night rather than the rule it meant, so they now read the
expected set from `content/packs.json`. The multi-country suite then absorbed the fourth
country with no edit at all, which is the test the fix was for.

Two failures in my own new checks were the checks, not the code: `au-verify` asserted
Canada's exact non-affiliation wording, and counted its own deliberate 404 probe of the
held-back sample as a page error.

A run of suites also exhausted the local sign-up rate limit and every later suite came back
429, which reads exactly like a broken test. `scratchpad/rl-clear.sh` between suites.

### Still open

- **The United Kingdom needs the handbook bought** (~£12, TSO). It is the only country
  whose study material is not free, and writing questions without it would mean writing
  them from competitors' questions, which is the one thing ruled out.
- **Canada needs French.** IRCC publishes both the guide and the test in French and
  candidates may sit it in either language, so 76 English questions is not a finished
  Canadian product.
- Australia's 20 official sample questions stay held back pending the subdomain licence
  question.
- Neither Canada nor Australia is wired into the **iPhone app** — that work is on its own
  branch and paused.

## v37 — The two owed things: French done, and a decision not to fake the UK (2026-09-08)

Both items from v36 were taken up. One is finished. The other is a decision, and the
decision is the deliverable.

### Canada in French — done

65 questions, plus the site's fourth language. Detail in
`apps/us-citizenship/content/ca/SOURCES.md`; the point worth repeating here is that they
are **not translations of the English pack**. The French guide is not a translation either:
it is the text a French candidate studies, and its terms of art are what they will meet on
the day — "d'un océan à l'autre" for *A mari usque ad mare* where the English guide says
"from sea to sea", "la sanction royale", "le roi Charles Trois". Translating our English
questions would have produced French sentences carrying English concepts, which in a test
sat in French is a worse error than a missing question.

The originality gate runs against IRCC's **French** sample questions. A French question of
ours drifting into a French question of theirs is the collision that matters, and comparing
against the English list would never have seen it.

175 French UI strings, same key set as German and Spanish, in Canadian French with IRCC's
own vocabulary — "examen" rather than "test", "note de passage", "cartes-éclair".
"Entrevue" is kept for the read-aloud mode, unlike German and Spanish, because Canada does
hold interviews with an official and the word describes something that exists.

**The bug only a bilingual country could expose:** `switchVersion()` replaced the pack but
never re-applied the language. The questions turned French while every button around them
stayed English and `<html lang>` kept saying `en-CA` — which also tells a screen reader to
read French questions with an English voice. `boot()` had always done it correctly; the
switch path never had to, because the United States' two versions are both English.

### The United Kingdom — not shipped, on purpose

The blocker was recorded as "buy the £12 handbook". That was tested properly before being
accepted, and then accepted.

**What was established, all from primary Home Office documents:** 24 multiple-choice
questions, 45 minutes, computer based, result the same day, Welsh available in Wales and
Scottish Gaelic in Scotland, unlimited attempts, and — in the Home Office's own words —
"The test questions are based on the … handbook. People **must** study the handbook to
prepare for the test." The pass mark took three documents to pin down: it is not on the
public GOV.UK pages (a "75%" string there is in the stylesheet, which states nothing), and
comes from *Guide AN*: "You must score 75% or more to pass the test", so 18 of 24.

**Four substitutes were tried and each fails for a different reason:**

1. *No free official copy.* The GOV.UK publication page 404s; TSO sells it.
2. *OGL does not reach it.* OGL v3's exemptions exclude information not published with the
   Information Provider's consent, and a commercially sold Crown-copyright book is not OGL
   material. (OGL separately grants no right to use information "in a way that suggests any
   official status" — a second reason our packs carry a non-affiliation notice.)
3. *Third-party PDFs of the handbook are unauthorised copies.* Using one would be copying a
   Crown-copyright book, which is the exact thing ruled out when we declined to copy
   competitors' question banks. The rule does not bend because the owner is a government.
4. *The Cabinet Manual route was rejected on quality, not licence.* It is genuinely OGL,
   genuinely authoritative, 110 pages, and was downloaded and read — and it is dated
   **2011**. It calls the Welsh legislature the "National Assembly for Wales" (renamed
   Senedd Cymru in 2020), describes EU membership (ended 2020), and predates the repeal of
   the Fixed-term Parliaments Act (2022).

Writing questions from a 2011 constitutional document, for a test based on a 2013 handbook,
in 2026, stacks three vintages of staleness — and coverage could not be checked against the
syllabus at all. Germany showed how much care one stale official document needs; its
Elections chapter still claims 308 electoral districts. Three at once, for an exam people
pay to sit, is not a risk worth running to avoid twelve pounds.

**So the UK ships nothing today, and the groundwork is written down instead.**
`content/gb/SOURCES.md` now carries the verified mechanics, the four rejected substitutes
with the reason each fails, and a five-step build plan. One point in it is worth flagging:
unlike Canada and Australia, the UK publishes no sample questions, so there is nothing for
the originality gate to compare against — it should run against the handbook's own practice
questions if the edition has any, and otherwise be skipped **explicitly**, never silently.

The site already says the right thing: the UK is listed, not selectable, deliberately off
the home-page strip, and the Countries section explains the position in words.

### Tests

`ca-fr-verify` 13/13 (new), `multicountry` 81/81, `ca-verify` 12/12, `au-verify` 17/17,
`homecountries` 25/25, `auth-flow` 27/27. 9/9 packs validate. Nothing deployed.

## v38 — App Store first: the rating prompt, officials that stay current, and the listing (2026-09-08)

1.0 was approved and is on the App Store. The user's next instruction: get the app to the top
of search, and do whatever the long-term plan says the app needs. `docs/store/NEXT-RELEASE.md`
*was* that plan, and it is now the plan for 1.0.1.

### What "top of search" honestly means here

The live listing was read back through the App Store Connect API (`tools/asc/listing.js`,
read-only) rather than assumed. Name, subtitle, keywords and categories already match the
copy researched before launch, so there was nothing to gain by rewriting them — and
**customer reviews: 0.** The competitors have 65,000–104,000. No metadata change closes
that; only ratings do, and they come from asking at the right moment. So the one code
change aimed squarely at rank is an in-app rating prompt, and the copy work is about
converting the people who do find the listing.

### Fixed on the live store today, no release needed

Promotional text said "practise" — the one text field Apple lets you edit on a live
version. One PATCH, read back and confirmed. The description's `PRACTISE` is version-locked
and goes with 1.0.1, as do the support URL (still the old `workers.dev` address) and the
empty marketing URL.

### 1.0.1, built on `feature/app-1.0.1`

**A rating prompt, once, when it is earned.** `expo-store-review` wrapping Apple's own
sheet. After a *passed* full-length practice test, from the results screen; never on a fail,
on launch, or from a button, all of which Apple's guidance rules out. Once per version,
recorded *before* the request so a kill mid-sheet cannot cause a second ask; Apple then caps
it at three showings a year and decides silently. No "Rate us" button, no "do you like the
app?" pre-filter — Apple rejects that pattern and it is a dark pattern besides. Every
failure path is a no-op.

**Officials data that updates without a release** — the NEXT-RELEASE item with a deadline,
the 3 November midterms. The app fetches the two JSON files the website already serves and
falls back to the bundled copy on any doubt. A payload is accepted only if complete,
sourced, exactly fifty governors, and dated **no older than the bundled copy** — so a stale
CDN object or a rolled-back deploy cannot undo a correction that shipped in the binary. A
running practice deck stays pinned; the pool refreshes between tests. My State says "as
shipped" or "updated" so support can tell whether a device ever reached the CDN.

### Verified, not asserted

A node harness (`scratchpad/officials-test/`) compiles the two modules with stubbed native
imports: 15 planted faults all rejected, two valid newer payloads accepted with the new
names coming through, no prompt on a fail or a three-question run, one prompt on a full
pass, exactly one call across repeated passes, and none when storage cannot be read —
**20/20**, plus the unreadable-storage path run deliberately. The live CDN payloads were
checked against the same rules and pass, so the feature is not dead on arrival. Metro
bundles the new modules for iOS; `tsc` is clean.

Worth recording: the harness first reported 19/20 and the failure was the harness. My stubs
wrapped `default` twice, so the compiled code saw `AsyncStorage.getItem` as undefined and
correctly took the "cannot tell whether we asked → do not ask" branch. An accidental test of
the safe path, and a reminder that a failing check is not always the code.

### Needs a person

- **The screenshots.** Slide 3 shows a fake name and the app predicting failure. It can be
  replaced with no release, but not from this machine — no simulator, and the website's John
  Doe shot is a 1206×1900 crop. Two-minute phone recipe in NEXT-RELEASE.
- **The build.** EAS is logged in here, so `eas build` and `eas submit` can run on request.
  Not run without the say-so: it uploads a build and opens a review.
