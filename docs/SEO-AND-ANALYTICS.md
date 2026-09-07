# SEO and analytics

## What is live now

| Thing | Where | Status |
|---|---|---|
| `robots.txt` | `/robots.txt` | live |
| Sitemap | `/sitemap.xml` | live, 6 public pages |
| Canonical URLs | every public page | live |
| Open Graph + Twitter card | every public page | live |
| Share image | `/og.png`, 1200×630 | live |
| Structured data | home page | Organization, WebSite, WebApplication, FAQPage |
| Google verification | `/google<token>.html` | waiting for a token |
| Bing verification | `/BingSiteAuth.xml` | waiting for a token |
| Analytics | — | **off, and needs a decision — see below** |

The app, sign-in, sign-up and password-reset pages are excluded from both `robots.txt` and
the sitemap on purpose: they need a session or are a step inside one, so indexing them
would list URLs that only ever redirect. `/content/` is excluded too — the question packs
are legitimately public, but they are data, and indexing them would put raw JSON in search
results.

Nothing in the structured data is invented. There is no `aggregateRating`, because we have
no reviews. The FAQ markup is generated from the FAQ actually on the page, so the two
cannot drift apart — which is also what Google requires.

## Adding the site to Search Console and Bing

Both consoles will offer several ways to prove you own the domain. Use the **HTML file**
method; the Worker serves it from configuration, so there is no page to edit and nothing
left behind when a token is rotated.

1. **Google Search Console** → Add property → URL prefix →
   `https://prepareforcitizenship.com` → choose **HTML file**. It gives you a filename
   like `google1a2b3c4d5e6f.html`. Tell me the middle part (`1a2b3c4d5e6f`) — or set it
   yourself in `site/wrangler.jsonc` as `GOOGLE_SITE_VERIFICATION` — then deploy and press
   Verify.
2. **Bing Webmaster Tools** → Add site → **Import from Google Search Console** is easiest
   once step 1 is done. If you'd rather do it directly, it offers an XML file; give me the
   token for `BING_SITE_VERIFICATION`.
3. Submit `https://prepareforcitizenship.com/sitemap.xml` in both.

## Analytics: a decision, not a task

You asked for GA4. Before wiring it up, one thing that matters:

**GA4 would contradict our published privacy policy.** `/privacy-web` currently says, in
writing, that we run *"no analytics, advertising or tracking of any kind"* and that the
site has *"no cookie banner because there is no non-essential cookie to ask you about"*.
GA4 sets cookies and is non-essential, so turning it on means:

- rewriting that section of the privacy policy, and
- adding a **consent banner** for visitors in the EU and the UK, where analytics cookies
  need opt-in consent before they are set, and
- naming Google as a processor in the policy.

**The alternative that avoids all of that: Cloudflare Web Analytics.** It is free, it is on
the account the site already runs on, it sets **no cookies** and stores no personal data,
so it needs no consent banner and no change to the privacy promise. It gives you page
views, referrers, countries, and Core Web Vitals — which is what a site at this stage
actually needs. What it does not give you is GA4's funnels, events and audience building.

My recommendation: **Cloudflare Web Analytics now**, and GA4 later if and when you need
conversion funnels — at which point the policy and banner work is worth doing properly
rather than in a hurry.

Both are already wired and switched off. In `site/wrangler.jsonc`:

```jsonc
"ANALYTICS": "off"            // "off" | "cloudflare" | "ga4"
"CF_ANALYTICS_TOKEN": ""      // Cloudflare dashboard → Web Analytics → add a site
"GA4_MEASUREMENT_ID": ""      // G-XXXXXXXXXX
```

Set `ANALYTICS` and the matching token, and it starts. **Do not set `ga4` without doing
the privacy policy and consent-banner work first** — the policy is a promise we published,
and quietly breaking it is worse than having no analytics.

## Things worth doing next, in order

1. Verify both consoles and submit the sitemap (above).
2. Turn on Cloudflare Web Analytics — one token, no policy change.
3. Write a page per country as the packs ship (`/united-states`, `/canada`), each targeting
   how people actually search: "US citizenship test practice", "civics test questions".
   The home page cannot rank for every country at once.
4. Once the iPhone app is public, add its App Store link to the structured data and the
   home page.
