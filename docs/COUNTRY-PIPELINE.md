# Country pipeline — what we can honestly build, per country

Assessment date: **2026-09-07** · Branch: `feature/multi-country`

The product's premise is one sentence: **these are the real official questions and we did
not reword them.** Every country decision below is decided by whether that sentence can be
said truthfully and lawfully, and by nothing else.

Not legal advice. Every licence below is quoted from the primary source, verbatim, with the
retrieval date. Where a licence's reach is unclear it is marked **for counsel** and left
unresolved. See also `docs/LEGAL_REVIEW.md`.

## The one-screen summary

| | Official pool published? | Official questions we may use | Licence | Pack built |
| --- | --- | --- | --- | --- |
| 🇺🇸 US | Yes — all 128 | Yes, the full pool | US federal work, public domain (17 U.S.C. § 105) | Shipped |
| 🇩🇪 Germany | Yes — full catalogue as a PDF | Yes (licence check owed) | not verified in this pass — see below | owned by another workstream |
| 🇪🇸 Spain | Manual published free | Reported yes (licence check owed) | not verified in this pass — see below | owned by another workstream |
| 🇦🇺 Australia | **No** | **Yes — the official practice test, verbatim** | CC BY 3.0 AU (site) / CC BY 4.0 (book), attribution required | **Yes — practice subset** |
| 🇨🇦 Canada | **No** | Published, but commercial reuse needs **prior written permission** | Canada.ca terms | **No** |
| 🇬🇧 UK | **No** | **None free.** Official practice questions are a £7.99 TSO book | Crown copyright, **not** under the OGL | **No** |

Two of the three countries researched tonight produced no question content. That is the
correct outcome, not a shortfall.

---

## Context: the three that already work

### United States — the reference case

USCIS publishes all 128 civics questions with acceptable answers (Form M-1778). A work of
the US federal government carries no copyright under 17 U.S.C. § 105, so reproduction needs
no licence and no permission. This is why the premise sentence is literally true for the US
and why the US product could be built in an evening. It is the exception, not the model.

### Germany — brief, and one flag

BAMF publishes the complete catalogue for the *Einbürgerungstest* as a downloadable PDF.
BAMF's own description, verbatim:

> "Der Test besteht aus insgesamt 310 Fragen, davon 300 allgemeine Fragen und 10 Fragen zu
> dem Bundesland, in dem Sie wohnen."
> — https://www.bamf.de/DE/Themen/Integration/ZugewanderteTeilnehmende/Einbuergerung/einbuergerung-node.html
> (retrieved 2026-09-07)

So the questions genuinely are published, in full — Germany can be built the way the US
was. **Flag for whoever owns `content/de/`:** the BAMF page we read carries no licence or
Nutzungsbedingungen statement. Publication is not a licence. German federal works are not
automatically free of copyright the way US federal works are, and the applicable terms
(§ 5 UrhG for *amtliche Werke*, plus BAMF's own site terms) need quoting into
`content/de/SOURCES.md` before that pack ships. Not our call in this pass.

### Spain — brief, and the same flag

Instituto Cervantes publishes a *Manual de preparación para la prueba CCSE* free of charge,
refreshed annually (the 2026 edition page notes "25 % de preguntas con respecto a las de
2025"). The commonly cited figure of 300 questions is plausible but **the Cervantes page we
read stated neither a total nor any licence**, so the count and the terms both need
first-hand verification into `content/es/SOURCES.md`. Also worth the owner's attention: an
annually-rotating pool means the pack has a shelf life, and a paid app carrying a stale
pool is its own kind of dishonesty.

---

## United Kingdom — *Life in the UK Test*

Full evidence and quoted licences: `apps/us-citizenship/content/gb/SOURCES.md`.

### What exists

- **Question pool: not published.** GOV.UK and the Home Office caseworker guidance describe
  the test only as 24 multiple-choice questions "based on the 'Life in the United Kingdom:
  A Guide for New Residents' handbook", operated by PSI. No question is published anywhere
  on GOV.UK.
- **The handbook: a book you buy.** 3rd edition (2013), ISBN 978-0-11-341340-9, Crown
  copyright, published by TSO. From £12.99. No free official copy on GOV.UK.
- **Official practice questions: also a book you buy.** "Official Practice Questions &
  Answers", from £7.99, book or app, at the official TSO shop.
- GOV.UK's default licence is the OGL — but the OGL only reaches material "expressly made
  available under this licence", and it expressly exempts "Information that has not been
  accessed by way of publication or disclosure". Neither the handbook nor the practice
  questions carries an OGL notice.
- The National Archives explains how UK government material sits outside the OGL:
  "Delegations of Authority are granted by the Keeper to enable government departments or
  agencies to licence the re-use of Crown copyright material they produce outside the terms
  of the Open Government Licence." The register of those delegations includes **"The
  Official DVSA Revision Theory Test Question Banks … All assets that are the subject of,
  or created for, DVSA's publishing services concession contract"** — a direct precedent for
  a UK government test question bank being licensed commercially. The Home Office is not in
  that register as at 2026-09-07.

### What the licence permits

There is no licence permitting reuse of the handbook or the practice questions, and none on
offer for the pool because the pool is not published. Whether the Home Office or TSO would
grant one, and the copyright status of individual short factual questions, are **for
counsel**.

### What a legitimate UK product could offer

1. **Study the material, not the questions.** The handbook's *subject matter* — the topics,
   the periods, the institutions — is not owned by anybody. Original explanatory content
   organised to the handbook's chapters, written by us, is a real product and a
   defensible one. It is also expensive: it is writing a book.
2. **Practice questions labelled as ours.** Legitimate only if the labelling is
   unmistakable and permanent, on the question screen and not just in a settings page: not
   official questions, not from the Home Office, written by us to the official format. Every
   competitor does exactly this; most of them are coy about it, which is precisely the gap
   we would be trading on.
3. **The mechanics honestly**: 24 questions, 45 minutes, 75% to pass, £50 a sit and £50
   again on every re-sit. Real value, zero licence risk.
4. **What it may never say**: "the real questions", "official questions", "the official
   app", or any question count implying we hold the pool.

### What doing it properly costs

| Route | What it involves | Cost driver |
| --- | --- | --- |
| Licence the official practice questions | Rights enquiry to the Home Office and to TSO (the publishing concession holder), then a negotiated commercial licence — almost certainly per-unit royalty or an annual fee, plus approval rights over presentation, plus a term. Precedent exists (DVSA's concession model), so the ask is not novel. | Unknown until asked. Anchor: the content retails at £7.99 as a consumer book, which is close to our entire $9.99 price — a per-unit royalty could make the unit economics impossible. Establish the fee **before** any UK build work. |
| Write our own questions | An author who knows the handbook, an editor, and a factual-accuracy reviewer, across the full syllabus, refreshed when the handbook changes. | Weeks of specialist writing, not an evening. This is the only route we control. |
| Study material only, no questions | Cheapest, weakest. Sells poorly against a market whose entire pitch is mock tests. | — |

Do not begin either paid route until counsel has read `content/gb/SOURCES.md` §4.

### Watch item

Third-party immigration sites report a 2025 Home Office intention to refresh the test.
As at 2026-09-07 GOV.UK and the current caseworker guidance still describe the unchanged
2013-handbook test, and no new syllabus, edition or question bank is published. Treat the
reform reporting as unverified — but note that a new edition is the one event that could
change the licensing position, if it were released under the OGL.

---

## Canada — citizenship test

Full evidence and quoted licences: `apps/us-citizenship/content/ca/SOURCES.md`.

### What exists

- **Question pool: not published.** IRCC states "We base all the test questions on
  information found in the study guide."
- **The study guide is free.** *Discover Canada: The Rights and Responsibilities of
  Citizenship* — HTML, PDF, eBook and audio, English and French, no charge.
- **Official study questions are published free**, linked from the study page as "Go to
  practice questions": 3 worked multiple-choice questions with the answer marked, plus 28
  open-ended study questions with no printed answers (31 items, counted 2026-09-07).
- IRCC also publishes a notice titled "Third-party citizenship study guides, tests and
  questions" telling newcomers the only official guide is *Discover Canada* and is free.

### What the licence says

Canada.ca terms, verbatim: non-commercial reproduction is permitted "without charge or
further permission" subject to three attribution conditions — and "you may not reproduce
materials on this site, in whole or in part, for the purposes of commercial redistribution
without prior written permission from the copyright administrator."

We sell the app. On the face of the terms that is commercial redistribution, so the written
permission is a precondition. Whether a paid app carrying free-to-use content is
"commercial redistribution", and who the copyright administrator is for IRCC publications,
are **for counsel**.

### What a legitimate Canadian product could offer

- **Today, without permission:** the mechanics (20 questions, 15 to pass, 45 minutes, 3
  attempts, 30-day window, online with webcam monitoring, English or French), links to the
  free official guide, and our own clearly-labelled practice questions. No IRCC text
  reproduced.
- **With written permission:** the 3 official multiple-choice questions verbatim, and the
  28 open-ended study questions kept **visibly separate** — they have no published answers,
  so scoring them would mean inventing answers, and several are personal or provincial
  ("Who is your Member of Parliament?"). Also: French is not optional for Canada.

Even at its best, Canada is a study-guide-led product with a handful of official
multiple-choice items. Set expectations accordingly.

### What doing it properly costs

- A written permission request to IRCC's copyright administrator, drafted with counsel,
  naming the exact URLs and the commercial use. **Days of work and no fee, most likely** —
  by far the cheapest unblock of the three.
- French content and a French-capable reviewer for both the app and the store listing.
- The reputational cost of IRCC's own third-party notice: our Canadian copy has to be
  unusually careful never to imply the app is needed, endorsed, or official.

---

## Australia — Australian citizenship test

Full evidence, quoted licences and verification record:
`apps/us-citizenship/content/au/SOURCES.md`. Pack:
`apps/us-citizenship/content/au/citizenship-practice.json`.

### What exists

- **Question pool: not published.** *Our Common Bond*, verbatim: "It consists of 20
  randomly selected questions; and as of 15 November 2020, it will also include five
  questions on Australian values." Randomly selected from a set the department never
  publishes.
- **An official practice test is published, in full, free** — 20 multiple-choice questions
  with three options each and the correct answer, in the four testable parts, five
  questions per part including five Australian values questions. It carries its own
  honesty label: "This is a sample test only. The questions will be different on the day of
  the test."
- **The study book is published free and openly licensed.** *Australian Citizenship: Our
  Common Bond* (2020), in English and 40 community languages, "© Commonwealth of Australia
  2020 … all material presented in this publication is provided under a Creative Commons
  Attribution 4.0 International license".

### What the licence says

Department of Home Affairs, "Copyright and disclaimer", verbatim: "All material presented
on this website is provided under a Creative Commons Attribution 3.0 Australia licence",
with exceptions for the Coat of Arms, the department's logo, third-party content and
"materials specifically not provided under a Creative Commons attribution 3.0 Australia
licence" — and "You should attribute material you get from this website as Australian
Government Department of Home Affairs."

CC BY permits commercial reuse with attribution. That is what the licence says.

**For counsel, and recorded in the pack as `licence.reviewStatus:
"pending-legal-review"`:** the practice test is served from
`citizenshippracticetest.homeaffairs.gov.au`, a departmental subdomain with no copyright
footer of its own, and the notice's wording is "this website". Confirm the grant reaches the
practice-test app — ideally in writing from comms@homeaffairs.gov.au, the address the
copyright page itself nominates. Also: CC BY does not permit implying endorsement, so
"official app" is off the table.

### What was built, and what it is not

A pack of the 20 official practice questions, verbatim, generated programmatically from the
source data — never retyped — and diffed against the live rendered test (20/20 exact match
on question text and options). It is labelled `official-practice-subset` with
`officialPoolPublished: false` and a user-facing `disclosure` string.

It is **not** a question pool, and it must never be presented as one. Twenty questions is
one sitting. An Australian product therefore has to be led by *Our Common Bond* — which,
being CC BY 4.0 in 40 languages, is an unusually good asset — with the official practice
test as the one authentic mock, and any additional practice questions written by us and
labelled as ours. **No such questions were written in this pass.**

### What doing it properly costs

- **Now, effectively free:** the pack exists, the study book is openly licensed, the
  attribution is a line of text. Cheapest honest launch of the three by a wide margin.
- **The licence confirmation email** to comms@homeaffairs.gov.au. Days, no fee.
- **Optional, weeks:** our own labelled practice question set to give the app depth beyond
  a single official mock.
- **Per release:** re-diff the live practice test — Home Affairs changes it without
  announcement — and honour the values rule in scoring. A mode that lets someone "pass"
  having missed a values question teaches them something false about the real test.

---

## Volumes, and the ordering they justify

Naturalisation and citizenship-grant volumes, each from the responsible government body.
Different countries publish on different calendars; these are not like-for-like years.

| Country | Volume | Period | Source |
| --- | --- | --- | --- |
| US | 818,500 new citizens | FY2024 | USCIS, "USCIS welcomed 818,500 new citizens in fiscal year 2024" — https://www.uscis.gov/citizenship-resource-center/naturalization-statistics |
| Canada | 379,530 new citizens | calendar 2023 | IRCC, CIMM key data tables (27 May 2024) — https://www.canada.ca/en/immigration-refugees-citizenship/corporate/transparency/committees/cimm-may-27-2024/key-data-tables.html |
| Germany | 291,955 naturalisations | calendar 2024 | Destatis press release 204/2025 — https://www.destatis.de/DE/Presse/Pressemitteilungen/2025/06/PD25_204_125.html |
| UK | 245,520 grants of British citizenship, of which 171,435 by naturalisation | year ending June 2026 | Home Office immigration system statistics — https://www.gov.uk/government/statistics/immigration-system-statistics-year-ending-june-2026/how-many-citizenship-grants-have-been-issued-in-the-uk |
| Australia | 165,193 conferrals | 2024–25 | Home Affairs, *Australia's Migration Trends 2024–25*, p.33 — https://www.homeaffairs.gov.au/research-and-stats/files/migration-trends-2024-25.pdf |

Two caveats before anyone builds a forecast on these. First, not every person in these
counts sits a knowledge test:

- UK — "Where the applicant is aged 65 or over you must waive the requirement", plus a
  waiver for a long-term physical or mental condition (Home Office caseworker guidance,
  *Knowledge of language and life in the UK*).
- Australia — "Most applicants between 18 and 59 years of age will need to take the
  Australian citizenship test" (Department of Home Affairs, "Learn about the citizenship
  test", video transcript).
- Canada — "If you're between 18 and 54 years old on the day you sign your application, you
  must take the citizenship test" (IRCC, "Citizenship test: How it works").

Second, a grant is a *lagging* count: the person studied a year or more earlier. Treat the
table as relative market size only.

### Recommended order

**1. Australia — now.** The smallest market of the five, and still first, because it is the
only one of tonight's three where the premise sentence is true: the questions are official,
verbatim, openly licensed and already verified. Ship it behind the licence-confirmation
email and honest labelling. It also comes with a CC BY 4.0 study book in 40 languages,
which is a better content asset than the question count suggests.

**2. Canada — next, because the unblock is a letter.** Second-largest market in the table,
and the blocker is permission rather than availability. Send the request while Australia is
being built. If it comes back yes, Canada is a real product; if no, it drops to the same
tier as the UK.

**3. UK — last, and only with a decision made first.** The larger of the two remaining
markets and the most mature competitor set, but the only route to official question content
is a negotiated licence whose fee may exceed our entire unit price, and the alternative is
writing a syllabus-wide question set ourselves. Do not start UK build work before the
Home Office/TSO rights enquiry has a number attached to it.

Germany and Spain keep their existing slots on their own workstreams; both need their
licence quoted into their `SOURCES.md` before shipping, on the evidence above.

### The uncomfortable conclusion, stated plainly

For the UK and Canada, the product we ship in the US **cannot** be shipped. There is no
version of it that is both honest and lawful, because the official questions are either
unpublished, sold, or licensed only for non-commercial use. Those two countries require
either a licence we have to pay for and be granted, or a visibly different product — study
material plus practice questions that say, on the screen, that we wrote them. Australia is
the near-miss that works: no pool, but a real official practice test under a real open
licence.

The way to lose this product is to fill those gaps with questions we invented and let users
assume they are official. Nobody wrote a single question in this pass, and the packs are
structured — `contentType`, `officialPoolPublished`, `disclosure`, and a validator that
fails a pack claiming to be a pool without saying so — to make that failure mode hard to
reach by accident.

## Adding a country: the checklist this pass would have wanted

1. Find the government body's own page for the test. Primary sources only; a practice site
   is evidence about the market, not about the law.
2. Establish whether the **pool** is published, or only study material, or an official
   **practice subset**. These are three different products.
3. Quote the licence **verbatim** into `content/<code>/SOURCES.md`, with the URL and
   retrieval date. Never summarise a licence into an opinion. Mark what is unclear
   **for counsel** and leave it unresolved.
4. If reuse is not permitted: write `SOURCES.md` recording why there is no pack, and stop.
   That is a completed task.
5. If it is permitted: generate the pack from the source data programmatically. Never
   retype, never paraphrase, never fill a gap from memory.
6. Set `language`, `contentType`, `officialPoolPublished` and `disclosure` honestly. A
   practice subset says it is a practice subset, on screen — the same rule as
   `CLAUDE.md`'s "a stub must say it is a stub, on screen".
7. Verify against the live source (render it; diff it) and record the result in
   `SOURCES.md`.
8. Run `python3 tools/validate-content-pack.py apps/us-citizenship/content/<code>/*.json`.
9. Keep the pack inside `apps/us-citizenship/content/` — EAS uploads only the app directory
   — and run `tools/sync-content.sh` before deploying the site.
10. Locale flips per country: `en-AU` for Australia, `en-CA`/`fr-CA` for Canada, `en-GB` for
    the UK. US English belongs to the US product only.

### Known gap in the current tooling

`tools/validate-content-pack.py` requires a `language` tag on every pack.
`content/us/civics-2025.json` has none and currently fails on that one check (its structure
and answers are otherwise clean). That file belongs to another workstream and was not
touched here — whoever owns `content/us/` should add `"language": "en-US"`.
