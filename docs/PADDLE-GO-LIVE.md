# Taking payments for real

Sandbox is done and proven end to end: a card payment through Paddle's overlay unlocks
paid access in about 8 seconds, and a refund revokes it. Going live is a different Paddle
account with different keys — nothing carries over.

**The long pole is Paddle's verification of you as a seller, not our code.** Start it
first; everything else here takes an afternoon.

---

## Step 1 — Paddle verification (start today, takes days)

Paddle is the merchant of record, so Paddle is legally the seller and has to know who it
is selling on behalf of. Expect them to ask for:

- **Who you are** — identity document, and your address.
- **The business** — as a sole developer in India this is normally your own name and
  address unless you have a registered entity. If you *do* have one, have the registration
  number and the address that matches your bank.
- **Bank details** for payouts, in a name matching the above.
- **Tax details** — for India, your PAN, and your GSTIN if you are registered.
- **The website**, which they will actually read. They check for: clear pricing, what the
  product is, a refund policy, terms, and a way to contact a human.

**Our site already satisfies the website half:**

| What they look for | Where it is |
|---|---|
| Pricing, unambiguous | `/#pricing` — $9.99 once, "plus local tax" stated |
| What the product is | the home page |
| Refund policy | `/refunds` |
| Terms | `/terms` |
| Contact | `hello@prepareforcitizenship.com`, on every page footer, and it reaches your inbox |
| Privacy | `/privacy-web` |

The one thing they may query is our **no-refunds** position. `/refunds` handles that
honestly: sales are final, *and* it states that Paddle may refund under its own Buyer
Terms and that UK/EU cancellation rights take precedence. An unqualified "no refunds" is
what gets rejected.

## Step 2 — rebuild the catalogue in the live account

Live has its own products and prices. Recreate, and get **both** of these right, because
each one has already gone wrong once in sandbox:

- **Product:** `Prepare for Citizenship — Full access`, standard digital goods.
- **Price:** one-time, **$9.99 USD**, quantity **max 1** (otherwise someone can buy a
  hundred copies of a one-time unlock), and **tax mode `external`** so tax is added on top
  of $9.99 instead of coming out of it. Paddle's default is `location`, which is
  inclusive-of-tax wherever local law requires it — that is what took 18% GST out of the
  sandbox sale.
- Set the **account-level** tax setting to exclusive too, so future prices inherit it:
  Paddle → Taxes.

## Step 3 — the settings that block a checkout entirely

- **Checkout → Checkout settings → Default payment link** →
  `https://prepareforcitizenship.com/app`. Without it *every* checkout dies with a generic
  "Something went wrong" and no usable error.
- **Checkout → Website approval** → add `prepareforcitizenship.com`. Sandbox does not
  enforce this; live does.

## Step 4 — credentials and the webhook

- **Client-side token** (`live_…`) — public by design, goes in `wrangler.jsonc`.
- **Price ID** (`pri_…`) — goes in `wrangler.jsonc`.
- **API key** → `cd site && npx wrangler secret put PADDLE_API_KEY`.
- **Notification destination** → URL `https://prepareforcitizenship.com/api/paddle/webhook`,
  events **`transaction.completed`** and **`adjustment.created`** only. Its secret →
  `npx wrangler secret put PADDLE_WEBHOOK_SECRET`.

**Do not reuse the sandbox keys.** They went through a chat transcript, and anyone holding
the webhook secret can sign a fake "payment completed" and grant themselves paid access.
Harmless while the site cannot take money; not harmless afterwards.

## Step 5 — the switch

In `site/wrangler.jsonc`: set `PADDLE_ENVIRONMENT` to `production`, and replace
`PADDLE_CLIENT_TOKEN` and `PADDLE_PRICE_ID` with the live values. Then
`npx wrangler deploy`.

The orange "Paddle sandbox — payments on this page are tests" banner disappears on its
own; it is driven by that variable, so it cannot be left on by accident.

## Step 6 — prove it with real money

Buy it yourself, with a real card, once.

1. Create an account at `/signup`.
2. Interview → Unlock → pay.
3. Confirm access appears within a few seconds and the banner is gone.
4. Paddle dashboard → Notifications → the delivery shows **200**.
5. Paddle dashboard → refund yourself. Confirm access is revoked and the customer keeps
   nothing.

That last step matters more than it sounds: it is the only way to know the refund path
works before a stranger needs it.

---

## Before the first stranger pays

- **A payout method that has cleared verification.** Money sits with Paddle until then.
- **Know your tax position.** Paddle handles sales tax/VAT/GST on the *sale*, worldwide,
  as merchant of record. It does not handle *your* income tax, and its payouts to you are
  income you declare in India. If you are GST-registered, the export-of-services treatment
  of Paddle's payouts is worth ten minutes with an accountant, once.
- **Decide what happens when someone emails about a payment.** Right now that reaches
  `hello@` → your Gmail. There is no other alerting: if the webhook starts failing, the
  first you will know is a customer telling you. A Paddle notification-failure alert to
  your email is worth switching on in their dashboard.

## What is already true and needs no work

- Access is granted only from a payment Paddle confirms — either its signed webhook or our
  own server asking Paddle's API directly. Two independent paths, so one failing does not
  cost a customer their access.
- Refunds and chargebacks revoke access automatically.
- Paddle's retries cannot double-apply anything; event IDs are remembered for 30 days.
- The customer never sees a dead end: if confirmation is slow they get an honest "your
  payment went through, we're still confirming" screen with a retry and a support link.
- Card details never touch our servers.
