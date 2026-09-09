# Launch marketing — Reddit and X, and what comes after

Written 2026-09-09, the day 1.0.1 went live. Plain English on purpose.

**Links to use everywhere**

- App Store: `https://apps.apple.com/app/id6808512010`
- Website (free in the browser, no download): `https://prepareforcitizenship.com`

**Where to see if it worked**

- App Store Connect → Analytics → *Impressions* and *Downloads*, by source. This is the
  only place that shows whether a post moved installs.
- `https://prepareforcitizenship.com/insights` (signed in as Sandeep) — website visits by
  referrer. GA4 is live with a consent banner, so EU/UK visits are undercounted; US visits
  are not.

---

## 1. What we are NOT going to do (the rules we set for ourselves)

- **No fake reviews, no asking friends to rate it, no rating swaps.** Apple removes apps
  for this and it is the one thing that would undo everything. The in-app prompt in 1.0.1
  asks real users at the right moment; that is the whole rating strategy.
- **No pretending to be a user.** Every post says "I built this." Reddit users spot the
  alternative in seconds and the sub bans the account.
- **No claim we cannot back.** "Every official USCIS question" is true. "Best app" is not a
  claim; "highest rated" is false. Stick to what the app actually does.
- **No copying a competitor's posts or ads.**

## 2. Reddit — the honest picture

The people we want are in r/USCIS (~200k members), r/immigration, r/greencard and
r/citizenship. **Those subs exist to help applicants, not to sell to them, and most of them
ban promotion outright.** A "check out my app" post there is removed within minutes and can
get the account banned from the sub — which also removes the option of being genuinely
useful there later.

I could not read the subreddit rules from here (Reddit blocks automated readers). **Before
posting anything, open each sub in the Reddit app → About → Rules** and look for the words
*self-promotion*, *advertising*, *apps*, *surveys*, *links*. Treat this as unverified until
you have read it: **HYPOTHESIS** — r/USCIS and r/immigration prohibit promotional posts;
r/SideProject, r/iOSapps and r/indiehackers expect and welcome "I built this" posts.

So two different approaches for two kinds of sub:

### 2a. Applicant subs (r/USCIS, r/immigration, r/greencard, r/citizenship) — be useful first

Do **not** post about the app. Instead, a few times a week, find threads where someone asks
"how do I study for the civics test", "what does the interview feel like", "which test
version will I get (2008 or 2025)", "what if my state has no governor" — and answer the
question properly, in your own words, from what you learned building this. No link.

After a few weeks of real answers, if the sub's rules allow it and it fits naturally
("I actually built a free app for exactly this, happy to share if mods are ok with it"),
mention it once, in a reply, with the free/no-signup facts. Never as a new post. Never
twice in the same thread.

The 2008-vs-2025 test-version question is the single most useful thing we know that most
applicants are confused about. That is our natural entry point.

### 2b. Maker subs (r/SideProject, r/iOSapps, r/indiehackers, r/apple's weekly app thread)

These are for exactly this. One post, "I built this", story first, link at the end. Draft:

> **Title:** I built a free US citizenship test app after watching a friend pay $10/week for
> flashcards that are public domain
>
> The US civics questions are published by USCIS and are public domain — anyone can use
> them. Yet the top apps in the category charge weekly subscriptions for them.
>
> So I built one where every official question is free, forever, no account, no ads, no
> tracking. It has both versions of the test (2008 and 2025), study by topic, a practice
> test in the real format with the real pass line, a mock interview that reads the
> questions out loud, and the answers that depend on your state (governor, senators — and
> the official answers if your territory has neither).
>
> Unlimited practice tests and the full mock interview are one purchase of $9.99, once. That
> is what pays for it. Everything else stays free whether or not anyone ever pays.
>
> The part I'm most pleased with technically: the governor/officials names update from our
> server without an app release, because they change in bulk on election night and a stale
> name in a study app is a real problem for someone with an interview the next week.
>
> iPhone: https://apps.apple.com/app/id6808512010
> Browser, no download: https://prepareforcitizenship.com
>
> Not affiliated with USCIS. Happy to answer anything about how it's built or how the test works.

Post it on a weekday morning US time. Reply to every comment that day.

## 3. X (Twitter) — short, repeated, one idea per post

X posts disappear in hours, so the plan is one post a day for two weeks, each on one
fact, rather than one big announcement. Use the John Doe Home screenshot or a short screen
recording on every post — posts with an image get far more reach than text alone.

Hashtags that are actually used by applicants: `#N400` `#USCIS` `#citizenshiptest`
`#naturalization`. Two per post at most.

Drafts (each under 280 characters):

1. **Launch**
   > The US civics test questions are public domain. So we made an app where all of them are
   > free — no account, no ads, no subscription. Both the 2008 and 2025 versions.
   > iPhone: apps.apple.com/app/id6808512010 · Browser: prepareforcitizenship.com #N400 #USCIS

2. **The 2008 vs 2025 question**
   > Applying for US citizenship? Which civics test you get depends on WHEN you filed your
   > N-400 — not when your interview is. Our app has both versions, free, so you study the
   > right one. prepareforcitizenship.com #N400

3. **State answers**
   > "Who is the governor of your state?" is on the civics test. Live in DC? The official
   > answer is "DC doesn't have one" — and it counts. Puerto Rico or Guam? You have a
   > governor but no US senators, and that's the answer too. The app knows where YOU live. #USCIS

4. **Readiness (with the Home screenshot)**
   > Your readiness score comes from tests you actually took — never a guess. Green means
   > you're above the real pass line. Free to check where you stand.
   > apps.apple.com/app/id6808512010

5. **Mock interview**
   > The first time you hear the civics questions spoken out loud shouldn't be at your
   > interview. The mock interview reads them the way the officer will. Microphone never
   > used — nothing leaves your phone. #citizenshiptest

6. **Privacy**
   > No account. No sign-up. No analytics, no ads. Your name, your scores and your interview
   > date stay on your phone. That's the whole privacy policy. apps.apple.com/app/id6808512010

7. **Price**
   > Some citizenship apps charge $9.99 a WEEK for public-domain questions. Ours is $9.99
   > once for unlimited practice tests — and the flashcards are free forever either way.

8. **Founding story** (a thread of 3–4 posts, later in the two weeks)
   > Why build this? Because the last step of a very long journey should not come with a
   > subscription. 🧵

Reply to anyone who replies. Follow the immigration lawyers and USCIS-news accounts that
applicants follow; reply helpfully to their posts (no link) — that is where the visibility
comes from, not from our own timeline.

## 4. The next two things that compound (after the posts are out)

1. **A "which test do I take?" page on the website** (`/which-test`): filed N-400 before
   or after the cut-over date → 2008 or 2025 version, pass mark, number of questions, in
   plain words, with a link into the free study. This is the most-searched confusion in the
   category and nobody answers it well. Also becomes the link we share in Reddit replies —
   a helpful page is allowed where an app link is not.
2. **Google Search Console + Bing.** Still waiting for the verification tokens (see
   `docs/SEO-AND-ANALYTICS.md`). Ten minutes of Sandeep's time; it is how the site gets
   into search at all.

## 5. Approval

Nothing in this file has been posted. Every post above is a draft for Sandeep to read,
change and post from his own accounts. Posting is public and cannot be undone, so it stays
a human step.
