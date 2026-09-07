# Reply to App Review — Guideline 2.1, Information Needed

Submission 1.0, rejected 2026-09-05. Apple asked for background because the developer
account has limited review history. This is an information request, not a defect report:
nothing in the app has to change.

Paste the block below into **Resolution Center**, and the shortened version further down
into **App Review Information → Notes** (Apple asked for both).

---

## 1. Screen recording — Sandeep must record this

Apple requires a recording made on a physical device, starting from app launch, showing
the typical flow *including reaching the paid feature*. Record with iOS Screen Recording
(Control Center) on the iPhone, using the build under review.

Suggested run, about 90 seconds:

1. Launch from the home screen so the icon and splash are visible
2. Onboarding: the three screens, entering a first name and an interview date
3. Home: readiness gauge and the interview countdown
4. Study: open the topic picker, choose a section, flip a card, tap Read aloud
5. Practice: start a test, answer a question right (green) and one wrong (red), reach the results screen and show the missed-question review
6. **Practice again → the paywall appears** — this is the "accessing paid content" part Apple asked for. Show the price and the Restore Purchases link.
7. Settings: show Restore Purchases and the About / non-affiliation text

There is no account, so there is nothing to show for registration, login or account
deletion. There is no user-generated content, so nothing to show for reporting or blocking.
Say so explicitly in the reply — Apple asks for those flows and needs to know they are
absent by design rather than missing.

---

## 2–7. Reply text (paste into Resolution Center)

**2. Purpose and target audience**

US Citizenship Test 2026-Pulse is a study aid for lawful permanent residents (green card
holders) preparing for the naturalization civics test taken during the USCIS Form N-400
interview.

The problem it solves: an applicant must be ready to answer questions drawn from the
official civics pool — up to 128 questions on the 2025 test, 100 on the 2008 test — plus
four questions whose answers depend on the state they live in. The official materials are
PDFs and printed lists, which are hard to study from and give no sense of readiness.

The value it provides: the official questions in a study format, organised by the same
sections USCIS uses; practice tests in the real interview format and pass threshold; a
spoken-question mode so the applicant hears questions aloud before interview day; and a
readiness measure calculated only from their own completed practice tests.

**3. Setting up and accessing the main features**

No account, no registration, no login, and no credentials are required. There is nothing
to sign in to. Every feature is reachable immediately after install.

On first launch there is a three-screen introduction (a welcome screen, an optional first
name and interview date, and a screen describing the app's data handling). Both personal
fields can be skipped.

After that the app has five tabs:
- **Home** — readiness gauge, recent scores, countdown to the interview date if one was entered
- **Study** — flashcards for every official question; tap "All topics" to study one official section at a time; "Read question" uses the device's text-to-speech
- **Practice** — a timed-format practice test; choose the number of questions and the pass threshold, then answer
- **Interview** — spoken practice: the app reads a question aloud, the user answers out loud to themselves and self-grades
- **Settings** — appearance, civics test version (2025 or 2008), the user's state, Restore Purchases, and the privacy and disclaimer text

No sample files are needed. All content ships inside the app.

**4. External services, tools and platforms**

- **Apple StoreKit / the App Store** — processes the in-app purchase. We never see payment details.
- **RevenueCat** (revenuecat.com) — in-app purchase management. It receives an anonymous identifier generated per installation and the purchase record for this app. It does not receive any name, email address, or anything the user typed into the app. We use anonymous app user IDs only and never call its login API.
- **Apple's on-device speech synthesis** (AVSpeechSynthesizer, via expo-speech) — reads questions aloud. It runs entirely on the device and makes no network request. The microphone is never accessed and no audio is recorded, stored or transmitted.
- **Expo / EAS** — build tooling only, not present at runtime.

There is no backend server, no authentication service, no analytics or crash-reporting SDK, no advertising SDK, and no AI or machine-learning service. All civics content is bundled in the binary, so the app makes no network requests to fetch content. The only network traffic is the purchase check to RevenueCat and Apple.

**5. Regional differences**

None. The app behaves identically in every region and is available worldwide in English
only. The content is United States civics by subject matter, but nothing is gated,
altered, or hidden by region. The in-app purchase is the same single product at the same
price tier everywhere.

**6. Regulated industry and third-party material**

The app is a study aid. It does not provide legal advice, immigration advice, or any
immigration service, does not prepare or submit any government form, and takes no part in
any application. It states this in the app (onboarding, and Settings → About) and in the
App Store description.

All civics questions, their official answers, and the reading and writing vocabulary lists
are works of the United States Government published by U.S. Citizenship and Immigration
Services, and are in the public domain under 17 U.S.C. § 105. They are taken from USCIS's
published test materials at uscis.gov — the 2025 civics test (Form M-1778) and the 2008
100-question civics test. No permission is required to reproduce U.S. Government works.

The four photographs of national officeholders are likewise public-domain U.S. Government
works, with per-image sources recorded in the project.

The app is independent. It is not affiliated with, endorsed by, or sponsored by USCIS, the
Department of Homeland Security, or any government agency. It does not use any government
seal, logo, or trademark, and it does not use "USCIS" or any agency name in its app name
or icon. The non-affiliation statement appears in three places in the product: the
onboarding trust screen, Settings → About, and the App Store description.

**7. What users can buy, and how to reach the purchase**

There is one in-app purchase: **Lifetime Access** (product ID `lifetime_access`), a
**non-consumable** at $9.99. It is a single one-time purchase. There is no subscription
and no recurring charge.

Free forever, with no purchase: all flashcards for every official question, study by
topic, read-aloud, the user's state-specific answers, the readiness screen, and one
complete practice test.

The purchase unlocks: unlimited practice tests, and the full mock interview mode.

To reach the purchase during review:
1. Open the **Practice** tab and complete one full practice test through to the results screen. This first test is free.
2. Start a second practice test. The purchase screen appears at that point.

Two other routes to the same screen: **Settings → View lifetime unlock**, or the
**Interview** tab → "Unlock Mock Interview".

Restore Purchases is available both on the purchase screen and in Settings, as the
purchase is a non-consumable tied to the customer's Apple ID.

---

## Shortened version for App Review Information → Notes

Already written into App Store Connect via `tools/asc/set-review-notes.js` (2751 characters). Reproduced here so the two copies stay in step:

```
NO ACCOUNT REQUIRED. There is no registration, login, or credentials of any kind. Every feature is reachable immediately on launch. There is no user-generated content, so no reporting or blocking flows exist.

PURPOSE / AUDIENCE. A study aid for lawful permanent residents preparing for the naturalization civics test taken at the USCIS Form N-400 interview. It presents the official civics questions in a study format, runs practice tests in the real interview format and pass threshold, reads questions aloud so applicants hear them before interview day, and tracks readiness from their own completed tests.

IN-APP PURCHASE. One non-consumable, "Lifetime Access" (lifetime_access), $9.99, one time only. No subscription.
Free forever: all flashcards for every official question, study by topic, read-aloud, state-specific answers, and one complete practice test.
Unlocks: unlimited practice tests and the full mock interview.
TO REACH THE PURCHASE SCREEN: Practice tab -> complete one full practice test to the results screen (free) -> start a second test; the purchase screen appears. Also via Settings -> View lifetime unlock, or Interview tab -> Unlock Mock Interview. Restore Purchases is on the purchase screen and in Settings.

EXTERNAL SERVICES. Apple StoreKit for payment; RevenueCat for purchase management (receives only an anonymous per-install identifier and this app's purchase record - never a name, email, or anything typed into the app; anonymous app user IDs only, we never call its login API); Apple's on-device speech synthesis for reading questions aloud (no network, microphone never accessed, no audio recorded or transmitted). No backend server, no authentication service, no analytics or crash reporting, no advertising SDK, no AI service. All content is bundled in the binary.

REGIONS. Identical everywhere. English only, worldwide, nothing gated or altered by region. Same single purchase at the same price tier in all territories.

CONTENT RIGHTS. All civics questions, official answers, and reading/writing vocabulary are works of the United States Government published by USCIS, public domain under 17 U.S.C. 105, taken from uscis.gov (2025 civics test Form M-1778, and the 2008 100-question test). The four officeholder photographs are likewise public-domain U.S. Government works.

NOT AFFILIATED, NOT LEGAL ADVICE. This is an independent study aid. It is not affiliated with, endorsed by, or sponsored by USCIS, DHS, or any government agency, and uses no government seal, logo, or trademark. It gives no legal or immigration advice, prepares or submits no government form, and takes no part in any application. Stated in-app on the onboarding trust screen and in Settings -> About, and in the App Store description.
```
