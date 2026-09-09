# App Store promotion — what people actually do, and what we do next

Researched 2026-09-09 from Apple's own pages (developer.apple.com/app-store/*, App Store
Connect Help, ads.apple.com) and the live store data for our category (iTunes Search API).
Plain English. Each action says who does it and how long it takes.

## Where we stand today (read from Apple, not guessed)

| | Us | Top competitors (top 12 for "us citizenship test") |
|---|---|---|
| Ratings | **0** | 104,337 · 65,235 · 17,791 · 12,771 · 11,380 … |
| Screenshots | 5 | 8–10 for the leaders |
| App preview video | none | none of them either |
| Listing languages | English only | mostly English; one app has 15+ languages (12,771 ratings); two have English + Spanish |
| Promotional text | **blank on the live 1.0.1 listing** — it was set on 1.0 and did not carry over | set |
| Reviews to answer | 0 | — |

Who our customers are (USCIS, FY2024): 818,500 people naturalized. Top countries of birth:
Mexico 13.1%, India 6.1%, Philippines 5.0%, Dominican Republic 4.9%, Vietnam 4.1%. Median
7.5 years as a green-card holder before applying. Two of the top five are Spanish-speaking.

## What "App Store marketing" consists of

Apple gives developers ten tools. Here is each one, what it is for, and what we do with it.

### 1. Ratings and reviews — the thing that ranks
Search rank is text relevance **plus** downloads, ratings and reviews. Our text is as
good as the leaders'; our rating count is zero. Nothing else on this list matters as much.
- **Done in 1.0.1:** Apple's own rating prompt after a passed full-length test, once per
  version. Apple caps it at 3 prompts per 365 days; we ask less.
- **Do:** answer every review within a day (App Store Connect → Ratings and Reviews;
  Admin or Customer Support role). Apple notifies the reviewer, who can change the star
  rating. Prioritise low stars and anything mentioning a bug; when a fix ships, reply to
  the old review and name the fix in What's New.
- **Never:** buy ratings, ask friends, "rate us" buttons, "do you like the app?" pre-filters,
  or reset the summary rating. All are grounds for removal.

### 2. The product page — screenshots, video, text
Apple: the first 1–3 screenshots show in search results; up to 10 screenshots; up to 3
videos of 30 seconds; description's first sentence is the one people read; promotional text
(170 chars) is the only text editable without a release.
- **Do now (5 min, Sandeep or me with permission):** restore the promotional text on 1.0.1.
  It is blank. `node tools/asc/fix-promo-text.js` writes it.
- **Do for 1.0.2 (an evening):** go from 5 screenshots to 8–10, each with one benefit as a
  caption line ("Every official question, free", "Know if you'd pass today", "Your state's
  governor, kept current"). Add the iPhone 6.9" size, which Apple now uses as the primary.
  Include one dark-mode shot if the app supports it.
- **Do for 1.0.2 (a day):** a 20–30 second app preview video, captured on the device. None
  of the competitors have one; it autoplays in search results.

### 3. Localization — the biggest untapped lever in this category
Apple indexes each localised name, subtitle and keyword field separately, so a Spanish
listing is both a better page for a Spanish speaker and a second set of search terms.
Our two largest customer groups after Mexico/DR are India and the Philippines, who search
in English — so **Spanish first, then stop and measure.**
- **Do for 1.0.2:** Spanish (Mexico) product page — name/subtitle/description/keywords/
  screenshots. The test itself is in English and the app must say so; the study
  *instructions* in Spanish are what helps. The web app already has Spanish strings; the
  iPhone app's UI would need the same before a Spanish page is honest.
- HYPOTHESIS (widely reported by ASO practitioners, not stated by Apple): the US storefront
  also indexes the es-MX keyword field, giving 100 more keyword characters in the US. Treat
  as a bonus, not the reason.

### 4. Promoted in-app purchase — free extra search placement
Apple shows promoted IAPs **in search results and on the product page**, with their own
1024×1024 image; up to 20 per app. Ours would be "Lifetime access — $9.99 once".
- **Do for 1.0.2:** promotional image + display name (≤30) + description (≤45) in App
  Store Connect; the app must handle the "purchase started from the store" callback
  (RevenueCat exposes it). Then it appears as a second result under our name.

### 5. Custom product pages — a different page for a different visitor
Up to 70 alternate pages, each with its own screenshots, promo text and keywords, reached by
their own URL (and by Apple Ads). Reviewed by Apple like any metadata; no new build.
- **Do after 1.0.2:** one page for "I filed after Oct 20, 2025 — the 2025 test", linked
  from `/which-test`; one for Spanish speakers, linked from Spanish posts.

### 6. Product Page Optimization — A/B testing screenshots
Up to 3 variants against the original, traffic split you choose, up to 90 days, results in
App Analytics with a confidence figure. Screenshots and video need no new build; icons do.
- **Do when we have ~1,000 impressions a week** — below that a test never reaches
  confidence. Not yet.

### 7. Apple Ads — paying for the top slot
Search-results ads convert at over 60% for the top placement (Apple's figure). New
advertisers get a **$100 credit**. Basic: cost-per-install, automatic keywords, capped at
$10,000/app/month, no keyword work. Advanced: cost-per-tap, you pick keywords and bids.
- **Do (Sandeep, 20 min):** open Apple Ads Basic with the $100 credit, $5/day cap, let it
  match automatically. It shows whether paid installs convert to ratings and purchases
  before we spend real money. Switch to Advanced only if the $100 shows a return.
- Sources for Basic vs Advanced: [AppTweak](https://www.apptweak.com/en/aso-blog/search-ads-basic-or-search-ads-advanced-which-one-to-choose),
  [Relevance Advisors](https://relevanceadvisors.com/blog/apple-ads-basic-vs-advanced/).

### 8. Featuring nominations — asking Apple's editors
App Store Connect → Featuring → Nominations. Three kinds: new app, app update, new content.
Submit **at least three weeks before** the date. Editors look for a story, not a feature
list. ([Apple's help page](https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring/))
- The form (App Store Connect → Featuring → Nominations → +): type (App Launch / App
  Enhancements / New Content), name (60 chars), description (1,000 chars), "helpful
  details" on what makes it stand out (500 chars), publish start date, countries (USA),
  platform, up to 5 supporting links. Type and dates cannot be edited after submission.
- **Do with 1.0.2:** nominate the update. Our story is real and specific: the civics
  questions are public domain yet the category charges weekly subscriptions for them; the
  test changed on Oct 20, 2025 and most apps still only have the old one; the governor
  answers update themselves after election night. Timing hook: the midterms, 3 Nov 2026.

### 9. In-app events — not for us, mostly
Time-boxed events (up to 31 days, shown in search and on the page). Apple says they are
for premieres, challenges, new seasons — **not** for routine content or price promotions.
- **Do once:** a "Major Update" event only if 1.0.2 is a real update (Spanish + video).
  Otherwise skip; a weak event is rejected.

### 10. Promotion outside the store, with Apple's tools
- **Smart App Banner (15 min, me):** one meta tag on the website; Safari on iPhone shows
  an "Open / Get" strip at the top of every page. Free installs from every web visitor.
- **App Store marketing tools** (toolbox.marketingtools.apple.com): official short link
  and QR code for posts and printed material. Use these, not hand-made ones.
- **Promo codes:** 100 per version, free copies for press, immigration lawyers, ESL
  teachers. Use them for the "please try it and tell me what's wrong" round, never for
  ratings.
- **The App Store badge** is already on the website.

## The order, and who

| # | Action | Who | When |
|---|---|---|---|
| 1 | Restore the blank promotional text on 1.0.1 | Sandeep approves; script ready | today |
| 2 | Smart App Banner on the website | me | today |
| 3 | Apple Ads Basic, $100 credit, $5/day | Sandeep | this week |
| 4 | Answer every review within a day | Sandeep (or me via API, read-only for now) | ongoing |
| 5 | 1.0.2: 8–10 captioned screenshots, 6.9" size, 30-sec video | Sandeep films; me | next 2 weeks |
| 6 | 1.0.2: Spanish listing (+ app UI in Spanish) | me | next 2 weeks |
| 7 | 1.0.2: promoted IAP image + callback | me | with 1.0.2 |
| 8 | Nominate 1.0.2 for featuring, 3+ weeks ahead | me drafts, Sandeep submits | with 1.0.2 |
| 9 | Custom product pages (2025-test filers; Spanish) | me | after 1.0.2 |
| 10 | Product Page Optimization tests | me | when ~1,000 impressions/week |

What this list does **not** contain, on purpose: buying reviews, keyword stuffing, copying
competitors' screenshots, fake "limited time" prices, or resetting ratings.

## Sources
- Apple, [Creating your product page](https://developer.apple.com/app-store/product-page/)
- Apple, [Product Page Optimization](https://developer.apple.com/app-store/product-page-optimization/)
- Apple, [Custom Product Pages](https://developer.apple.com/app-store/custom-product-pages/)
- Apple, [In-App Events](https://developer.apple.com/app-store/in-app-events/)
- Apple, [Search on the App Store](https://developer.apple.com/app-store/search/)
- Apple, [Ratings, reviews and responses](https://developer.apple.com/app-store/ratings-and-reviews/)
- Apple, [Discoverability](https://developer.apple.com/app-store/discoverability/)
- Apple, [Promoting in-app purchases](https://developer.apple.com/app-store/promoting-in-app-purchases/)
- Apple, [Promote your app](https://developer.apple.com/app-store/promote/)
- Apple, [Apple Ads for the App Store](https://ads.apple.com/app-store/)
- Apple, [Nominate your app for featuring](https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring/)
- USCIS, [Naturalization statistics, FY2024](https://www.uscis.gov/citizenship-resource-center/naturalization-statistics)
- iTunes Search API, top results for "us citizenship test", US storefront, 2026-09-09
