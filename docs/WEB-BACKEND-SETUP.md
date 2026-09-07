# Website backend: accounts, Google sign-in, Paddle

Everything below is already **built and tested locally**. What is missing is credentials —
six values from Paddle and Google. Nothing here is deployed yet.

Local test status, run against `wrangler dev`:

- `57` API checks pass, including signed webhook → access granted → refund revokes it
- `23` browser checks pass, including register → land in app → sign out → sign back in

---

## Email: done (7 September 2026)

**Cloudflare Email Service**, not Resend — the domain is already on the account, so there
is no API key, no DNS to add and no extra vendor. `send_email` binding `EMAIL` in
`wrangler.jsonc`; `MAIL_FROM` is `hello@prepareforcitizenship.com`.

Receiving is Cloudflare Email Routing, already configured:
`hello@prepareforcitizenship.com` → `sandeep.sandha@gmail.com`, verified live through the
API. That address is now the contact address on every page.

Password reset is switched on and a real message was sent in production.

---

## One thing only you can do: Paddle's default payment link

**Paddle > Checkout > Checkout settings > Default payment link** →
`https://prepareforcitizenship.com/app`

Until this is set, *every* checkout fails. Paddle's overlay shows a generic "Something went
wrong" and offers to contact Paddle support, which is not who can help. The real error is
only visible in the network response:

```
POST https://sandbox-checkout-service.paddle.com/transaction-checkout  ->  400
{"errors":[{"status":400,"code":"validation","details":"transaction_default_checkout_url_not_set"}]}
```

Paddle requires it on every account before a transaction can be created at all. It is a
dashboard-only setting — there is no API for it. See
[Paddle's own page on this error](https://developer.paddle.com/errors/transactions/transaction_default_checkout_url_not_set/).

The live account will need the same thing set again, and there the domain must also be
approved under Website approval.

---

## Sandbox: done and verified (7 September 2026)

Configured and live on `prepareforcitizenship.com`. Nothing outstanding for sandbox.

| Value | Set to | Where it lives |
|---|---|---|
| `PADDLE_ENVIRONMENT` | `sandbox` | `wrangler.jsonc` |
| `PADDLE_CLIENT_TOKEN` | `test_5ad1b7af…` | `wrangler.jsonc` (public by design) |
| `PADDLE_PRICE_ID` | `pri_01m1xkw4z2dpkvhqvgn3zp22mh` | `wrangler.jsonc` |
| `PADDLE_API_KEY` | — | Cloudflare secret |
| `PADDLE_WEBHOOK_SECRET` | — | Cloudflare secret |
| `GOOGLE_CLIENT_ID` / `_SECRET` | — | Cloudflare secrets |

Paddle catalogue: product `pro_01m1xkf5ck788ze3fdcb6b9qc1`
"Prepare for Citizenship — Full access", one active price, one-time $9.99, **max quantity
1** so nobody can buy several copies of a one-time unlock.

Webhook destination `ntfset_01m1xkjhtthpjpv4g3wck2k8nf` → `/api/paddle/webhook`, active,
subscribed to `transaction.completed` and `adjustment.created`.

Verified against the deployed Worker with the real signing secret:

- unsigned delivery → **401**, grants nothing
- signed `transaction.completed` for our price → **200**, `/api/me` flips to `pro: true`
- `transaction.completed` for a different price → **200**, accepted and ignored
- `adjustment.created` refund → **200**, `pro` back to `false`
- Google redirect carries the right client id, redirect URI, `openid email profile`, and
  an HttpOnly `state` cookie

Test accounts were backed up and deleted afterwards; production KV is empty.

> **Rotate three credentials.** The API key, the webhook secret and the Google client
> secret were pasted into a chat transcript. They are sandbox-only except the Google one,
> which is real. Regenerate all three once you are done testing — Paddle: Developer
> tools → Authentication (and the notification destination); Google: Credentials → the
> OAuth client → *Add secret*, then delete the old one. Tell me when and I will re-run the
> four `wrangler secret put` commands.

---

## How a payment turns into access, automatically

No human step anywhere. Two independent paths write the same entitlement record, so one
failing does not cost a customer their access.

**1. The instant path — about two seconds.** Paddle.js fires `checkout.completed` with the
transaction id. The browser posts that id to `/api/checkout/confirm`. The Worker then asks
**Paddle's own API** whether that transaction completed, checks it is for our price, and
checks it belongs to the signed-in account — then writes the entitlement and returns the
unlocked state. If the overlay redirects instead of firing the event, Paddle returns the
customer to `/app?_ptxn=txn_…` and the same confirmation runs on page load.

**2. The backstop — Paddle's webhook.** Paddle posts `transaction.completed` to
`/api/paddle/webhook`, signature-verified, and the entitlement is written. This is what
covers everything the browser cannot: the customer closing the tab the instant they pay, a
delayed or offline payment that settles hours later, a payment made from a Paddle-hosted
link that never went through our checkout, or the confirm call simply failing.

Both paths are idempotent — event ids are remembered for 30 days, so Paddle's retries
cannot double-apply anything.

**Refunds and chargebacks are automatic too.** `adjustment.created` revokes access on the
same terms.

**If both somehow fail,** the customer is not left guessing: the confirm screen retries for
about thirty seconds, then says plainly that the payment went through, that confirmation
has not arrived, and offers *Check again* and a support link. The webhook will still land,
and the next page load picks it up.

**The one thing that is not automatic yet:** a customer who forgets their password has no
way back in — there is no password reset, because there is no email sender. For a paying
customer that means support is the only route. See Open questions.

---

## Going live

Paddle's live account is entirely separate from sandbox — different login, different
catalogue, different keys. Expect to repeat the setup below against it.

1. **Paddle business verification.** The gating item, and it takes days. As a sole
   developer in India this is supported. Paddle will want identity, address and bank
   details, and a website showing pricing, contact details, **a refund policy and terms**
   — which we do not have yet.
2. **Recreate the catalogue in live:** the product, and one **one-time** $9.99 price with
   max quantity 1.
3. **Approve the domain:** Checkout → Website approval → `prepareforcitizenship.com`.
   Sandbox does not enforce this; live does, and an unapproved domain cannot open a
   checkout.
4. **New credentials:** live client-side token (`live_…`), live API key, and a live webhook
   destination pointing at the same `/api/paddle/webhook` URL with the same two events.
5. **Switch over:** replace `PADDLE_CLIENT_TOKEN` and `PADDLE_PRICE_ID` in
   `wrangler.jsonc`, set `PADDLE_ENVIRONMENT` to `production`, re-run
   `wrangler secret put` for the live API key and webhook secret, and deploy. The orange
   sandbox banner disappears on its own.

---

## Paddle, in the sandbox

Sandbox is a **separate account from live**, with its own login, its own products and its
own keys. Nothing you create in the sandbox carries over, so expect to do this twice.

### 1. Sandbox account
Sign in to the sandbox dashboard (`sandbox-vendors.paddle.com`). If you signed up on the
live dashboard, the sandbox is a separate registration — same email is fine.

### 2. The product and its price
**Catalog → Products → New product**

- Name: `Prepare for Citizenship — Full access`
- Tax category: **Standard digital goods**
- Description: unlimited practice tests and interview practice

Then add a price to it:

- Type: **one-time** (not recurring — there is no subscription in this product)
- Amount: **9.99 USD**
- Name: `Full access`

Copy the **price ID** — `pri_…`. That is value **#2**.

> One-time, not recurring, matters. The iPhone app already shipped a bug from getting the
> product type wrong — a Consumable that Apple would never return from a restore — and it
> cost a rebuild to find. The webhook here checks the price ID on every transaction, so a
> price of the wrong type simply grants nothing.

### 3. The two keys
**Developer tools → Authentication**

- **Client-side token** → starts `test_` in sandbox. Value **#1**, safe to paste.
- **API key** → starts `pdl_sdbx_apikey_`. Value **#3**, secret. Give it read access to
  transactions; that is all it is used for.

### 4. The webhook
**Developer tools → Notifications → New destination**

- Notification type: **Webhook**
- URL: `https://prepareforcitizenship.com/api/paddle/webhook`
- Events — tick exactly these two:
  - `transaction.completed` — grants access
  - `adjustment.created` — takes it away again on a refund or chargeback

Copy the destination's **secret key** — `pdl_ntfset_…`. Value **#4**, secret.

The endpoint verifies every delivery: HMAC-SHA256 over `timestamp:rawBody`, compared in
constant time, rejected if the timestamp is more than five seconds old. An unsigned or
wrongly signed request gets a 401 and grants nothing — there is a test for each of those.

### 5. Approved domain (live only)
**Checkout → Website approval** — add `prepareforcitizenship.com`. The sandbox does not
enforce this; live does, and Paddle will not open a checkout on an unapproved domain.

### 6. Before live: business verification
Paddle is merchant of record, so going live means Paddle verifies the seller. As a sole
developer in India this is supported — expect to supply identity, address and bank
details, and to have a website that shows pricing, contact details, a refund policy and
terms. **We do not have a refund policy or terms page yet** (see Open questions).

---

## Google sign-in

### 1. Project and consent screen
`console.cloud.google.com` → create a project → **APIs & Services → OAuth consent screen**

- User type: **External**
- App name: `Prepare for Citizenship`
- Support email: yours
- App logo: optional
- **Authorised domain:** `prepareforcitizenship.com`
- Privacy policy URL: `https://prepareforcitizenship.com/privacy-web`
- Terms of service URL: needed here too — see Open questions
- Scopes: **`openid`, `email`, `profile` only.** These are non-sensitive, so Google does
  not require an app review. Adding anything else would trigger one.

### 2. The client
**Credentials → Create credentials → OAuth client ID → Web application**

- Authorised JavaScript origins: `https://prepareforcitizenship.com`
- Authorised redirect URIs — exactly this, one line:
  - `https://prepareforcitizenship.com/api/auth/google/callback`
  - and for local testing: `http://localhost:8788/api/auth/google/callback`

No `www` entry is needed: `www` is 301'd to the apex before any route runs, so the
redirect URI we send Google is always the apex one.

Copy the **client ID** (#5) and **client secret** (#6).

### 3. Publish it
On the consent screen, set publishing status to **In production**. While it says
*Testing*, only accounts you have explicitly added as test users can sign in — everyone
else gets an error, and it looks like our bug.

---

## Putting the values in

```sh
cd site

# secrets - each command prompts, nothing appears in your shell history
npx wrangler secret put PADDLE_API_KEY
npx wrangler secret put PADDLE_WEBHOOK_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET

# the two public ones go in wrangler.jsonc under "vars" - tell me the values
#   PADDLE_CLIENT_TOKEN, PADDLE_PRICE_ID

npx wrangler deploy
```

`PADDLE_ENVIRONMENT` stays `sandbox` in `wrangler.jsonc` until you say otherwise. While it
is `sandbox`, the app shows an orange banner across the top saying payments are tests —
nobody can mistake a test card for a real purchase.

For local testing, the same names go in `site/.dev.vars` (gitignored — see
`.dev.vars.example`).

---

## How to tell it works

Once the values are in and it is deployed:

1. `https://prepareforcitizenship.com/signup` → create an account, pick United States
2. You land in the app. Study works. Interview shows the paywall.
3. Click **Unlock for $9.99** → Paddle's overlay opens with the orange sandbox banner
   still visible behind it
4. Pay with a Paddle sandbox test card
5. You should land back in the app with the interview unlocked, within a few seconds
6. Paddle's dashboard → Notifications → the delivery should show **200**

If step 5 hangs, step 6 is the first place to look: a non-200 there means the signature
check rejected the delivery, and the response body says which check failed.

---

## What is deliberately not enforced

The question content under `/content/` is a public static file, served by the CDN. Anyone
can read it without an account, and that is the right call — it is public government
information, and pretending otherwise would only make the app slower.

What is enforced on the server is everything a person could otherwise grant themselves:

- **paid access** — written only by a verified Paddle payment, never by the browser
- **the one free practice test** — counted server-side, so clearing the browser does not
  reset it
- **the country lock** — refused server-side once set

---

## Open questions for you

1. **Refund policy and terms pages.** Paddle needs both published before it will verify
   the account for live, and Google's consent screen wants the terms URL. Tell me the
   refund window — 14 days, 30 days, or something else — and I will write both pages.
2. **Email verification at signup.** Nothing yet proves a new account owns the address it
   registered with. The reset flow now makes this cheap to add — same sender, same shape
   of token. Worth doing before live selling.
3. **Rotate the three credentials** that went through chat — Sandeep's call was to leave
   them, on the basis that going live means a fresh Paddle account with fresh keys anyway.
   The one to watch is the Paddle webhook secret: anyone holding it can sign a fake
   "payment completed" and grant themselves access. Harmless while the site is in sandbox
   and cannot take money. **Do not carry these keys over to live.**
