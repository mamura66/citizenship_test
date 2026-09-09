# Prepare for Citizenship — project conventions

Two products from one content set:

- `apps/us-citizenship/` — the iPhone app (Expo / React Native). Read the versioned Expo
  docs at https://docs.expo.dev/versions/v57.0.0/ before writing app code.
- `site/` — `prepareforcitizenship.com`: the marketing site, the privacy and support
  pages, and the web app at `/app.html`. Static assets on a Cloudflare Worker.

## Content is the single source of truth

Question packs live at `apps/us-citizenship/content/<country>/`. They must stay **inside**
the app — EAS uploads only the app directory, so a shared folder at the repo root breaks
production builds (this happened; see `docs/BUILD_PLAN.md` v19).

The website reads the same files. Run `tools/sync-content.sh` after any content change and
before deploying the site. Never hand-copy content.

Content rules that have already caused problems once:

- **No question counts and no test-version years in user-facing UI.** The pool size is
  USCIS's, not a feature, and printed as a number it reads as a limit of the app.
- **US English everywhere** for the US product. British spellings reached the live App
  Store description. Scan for them; don't eyeball. The locale flips per country.
- **Officials data must be verifiable.** Cross-check governors against the National
  Governors Association and national officeholders against whitehouse.gov,
  supremecourt.gov and house.gov before every release. Never ship a name we can't source.
- **Never invent progress or metrics.** Real data or an honest empty state.

## Payments

**iOS** uses Apple in-app purchase through RevenueCat. One non-consumable,
`lifetime_access`, $9.99. Never a consumable — Apple never returns consumables from a
restore, which silently breaks reinstall recovery (this happened; see v13).

**Web** uses **Paddle** as Merchant of Record. India is a supported seller location, and
MoR means Paddle is the legal seller and handles VAT/GST/sales tax worldwide.

### Paddle rules

- **Sandbox by default.** Every change is built and tested against sandbox
  (`environment: 'sandbox'` in Paddle.js, `sandbox-api.paddle.com`). Going live is a
  deliberate, separate step.
- **Never inline credentials.** The client-side token (`test_…` / `live_…`) is designed
  to be public and may sit in page source. Everything else — the API key
  (`pdl_sdbx_apikey_…`) and the notification endpoint secret (`pdl_ntfset_…`) — goes in
  `wrangler secret put`, never in `wrangler.jsonc`, never in the repo, never in chat.
- **Entitlement is decided server-side, never in the browser.** A client-side flag is a
  claim, not proof. Checkout completing in Paddle.js is not authorisation to unlock;
  the webhook is.
- **Webhook verification, exactly:** the `Paddle-Signature` header is
  `ts=<unix>;h1=<hex>`. Sign `` `${ts}:${rawBody}` `` with HMAC-SHA256 using the endpoint
  secret. Read the **raw body before any JSON parsing** — re-serialising changes
  whitespace or key order and breaks the match. Compare with a timing-safe comparison.
  Reject timestamps older than five seconds.
- **Confirm before anything destructive** in a Paddle account: cancelling subscriptions,
  issuing refunds, archiving products, changing prices.
- **All tax sits on top of $9.99, in every country.** The price's `tax_mode` is
  `external`. Paddle's default is `location`, which makes the price tax-*inclusive*
  wherever local law requires it — that quietly took 18% GST out of an Indian sale. Any new
  price, and the live account, must be set to `external`, and every page that quotes the
  price says "plus local tax" because the checkout total will be higher than $9.99.
- **A default payment link is required** before Paddle will create any transaction:
  Checkout → Checkout settings → Default payment link → `https://prepareforcitizenship.com/app`.
  Dashboard only. Without it every checkout dies with a generic "Something went wrong".
- **Never set `successUrl` on the overlay checkout.** Paddle navigates the whole page the
  instant payment completes, which kills the confirmation in flight and comes back without
  the transaction reference — leaving a paying customer looking at the paywall. Let the
  overlay show its own success panel and let `checkout.completed` plus the access watcher
  do the work.
- Check current API syntax against `developer.paddle.com` rather than memory.

## Verify before claiming something works

This project has shipped bugs that a single check would have caught — stretched images,
a grid row placing the image in the wrong column, a purchase that took money and granted
nothing. So:

- Layout claims get rendered in a browser, not reasoned about. Playwright with Chromium
  is available; `scratchpad/pw/` has the harness.
- Remember CSS `text-transform: uppercase` changes `innerText` — make DOM probes
  case-insensitive or they report false failures.
- **Build shell test bodies with `printf` into a variable, never `-d "{\"a\":\"$X\"}"`
  inside `"$(...)"`.** The escaped quotes arrive malformed, the server answers 400
  `bad_body`, and that 400 reads as a passing validation test. This has produced false
  results twice. Also: the Bash tool runs **zsh**, which does not word-split unquoted
  variables (so `$CURL_OPTS` becomes one argument) and makes `UID` readonly — put live
  test scripts in a file with `#!/bin/bash`.
- App Store Connect state gets read from Apple's API (`tools/asc/`), not from a dashboard
  screenshot. A transaction being recorded is **not** the same as an entitlement being
  granted.
- A stub must say it is a stub, on screen.
- Automated checks against production are **not counted** in site analytics, by two
  independent guards: `analytics.js` sends no beacon when `navigator.webdriver` is set
  (Playwright), and `/api/pulse` rejects `HeadlessChrome`, `curl` and the like by
  user-agent. Confirmed 2026-09-09 by a Playwright visit that left the total unchanged.
  Do not add a test-only switch for this; the guards already hold.

## The website backend (`site/`)

A Worker with static assets, not a static site. `run_worker_first` in `wrangler.jsonc`
decides what reaches code: `/api/*` and the app page. Everything else — the marketing
site, the content packs — is served by the CDN and never touches the Worker.

- **Everyone has an account, free users included.** There is no anonymous mode. Progress,
  the one free practice test and paid access all hang off a user id.
- **One question, one place.** `hasPaidAccess()` in `src/lib/access.js` is the only code
  that decides whether an account has paid. No route answers it for itself.
- **The country is locked once set.** Every recorded answer belongs to a section of one
  country's test, so a change would leave a performance page that reads as real data
  about a test the person is not taking. The server refuses; support clears it.
- **KV is eventually consistent, and it caches misses.** A key that has never existed can
  keep reading as absent for up to a minute after it is written — which is why a confirmed
  purchase mints a *new* session carrying a short `proUntil` hint rather than relying on
  re-reading the entitlement. New keys have nothing cached against them. Never write
  something and immediately read it back expecting the new value.
- **Passwords:** PBKDF2-SHA256, per-account salt, **six chained rounds of 100,000
  iterations** (600,000 effective). Workers has no bcrypt or argon2, and it rejects any
  single PBKDF2 call above 100,000 iterations — *"iteration counts above 100000 are not
  supported"* — so the work factor is reached by feeding each round's output back in as
  the next round's password. Iterations and rounds both travel with the hash
  (`pbkdf2$sha256$100000x6$salt$hash`) so either can be raised without locking anyone out.
  Costs ~1.7s per sign-in, measured in production.
- **Miniflare does not enforce every runtime limit.** The PBKDF2 cap above passed all 57
  local tests and 500'd on the first production request. Anything touching WebCrypto,
  CPU time or subrequest counts has to be exercised against a deployed Worker
  (`wrangler tail` gives you the real exception).
- **Sign-in must not enumerate accounts.** One message for "no such user", "wrong
  password" and "this account uses Google". Registration *may* say an address is taken —
  hiding that only sends people in circles.
- **Rate limits are generous on purpose.** A household or an office behind one carrier NAT
  shares an IP address; locking them out is a worse failure than the bulk signup it stops.

## Email

**Cloudflare Email Service**, not a third-party sender. The domain is already on the
account, so there is no API key to store, no DNS to add, and no extra vendor holding our
users' addresses. `send_email` binding named `EMAIL` in `wrangler.jsonc`;
`wrangler dev` emulates it and writes each message to `.wrangler/tmp/email/`, which is how
the reset test reads a real link.

Sending to arbitrary recipients needs the Workers Paid plan. Sending to addresses verified
in Email Routing is free on any plan.

`hello@prepareforcitizenship.com` is the public contact address, forwarded to
sandeep.sandha@gmail.com by Email Routing, and it is what outgoing mail is sent *from* —
a password reset somebody did not ask for gets replied to, and that reply has to reach a
person.

- **Never build a link in an email from `request.url`.** Password reset links and the
  Google redirect URI come from `PUBLIC_ORIGIN` via `src/lib/origin.js`. Deriving them
  from the request's Host header is how a reset token ends up delivered to somebody
  else's server. The request origin is the fallback only so localhost dev works.

## The performance screen

The advertised reason to come back, so it gets the design attention. Two rules:

- **Every figure comes from answers actually given.** No estimates, no projections, no
  invented "readiness score".
- **It must look deliberate with no data.** The section map is drawn grey rather than
  hidden, because an empty page reads as a missing feature — which is exactly how the
  first version was reported.

## Two privacy policies, deliberately

`/privacy` is the iPhone app's — Apple has that URL on file, and its "no accounts, nothing
leaves your device" claim is still true of the app. `/privacy-web` is the website's, and
covers accounts, Google and Paddle. Website pages link to `/privacy-web`; the app policy
keeps its URL untouched. Changing what `/privacy` says means telling Apple.
