# Canada — no pack, and why

**There is no question pack in this folder, deliberately.**

Retrieved: **2026-09-07**
Branch: `feature/multi-country`

One sentence: IRCC does publish official study questions free of charge, but Canada.ca's
terms permit reproduction only for **non-commercial** purposes and require "prior written
permission" for commercial redistribution — which is what a paid app is — so the content
cannot be shipped until that permission exists in writing.

This one is a *permission* problem, not an *availability* problem. That makes Canada the
cheapest of the three to unblock.

## 1. Does any government body publish the actual question pool?

No. The pool is not published. What IRCC publishes is the study guide and a set of study
questions, and it states plainly that the test is drawn from the guide:

> "We base all the test questions on information found in the study guide."
> — https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/test/study.html

## 2. What *is* published?

**a) The study guide.** *Discover Canada: The Rights and Responsibilities of Citizenship*,
free, in HTML, PDF, eBook and audio:
https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada.html
Catalogue no. **Ci1-11/2012E**, ISBN **978-1-100-20116-0**, copyright "Her Majesty the
Queen in Right of Canada, represented by the Minister of Citizenship and Immigration
Canada".

IRCC's notice on the guide, quoted:

> "The only official study guide for the citizenship test is Discover Canada: The Rights
> and Responsibilities of Citizenship, which is available from Citizenship and Immigration
> Canada at no cost."
> — https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada/read-online/notice.html
> (the page's title is "Notice: Third-party citizenship study guides, tests and questions")

Read that notice before writing any Canadian marketing copy. IRCC is explicitly warning
newcomers off third-party study products — which is us.

**b) Official study questions.** The "Study for the test" page links to them under the
label *"Go to practice questions"*:
https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada/read-online/study-questions.html

Structure as counted on 2026-09-07:

- **3** fully worked sample questions — question stem, four options each, correct answer
  marked (e.g. responsibilities of citizenship, the meaning of the Remembrance Day poppy,
  how MPs are chosen).
- **28** further open-ended study questions with **no options and no answers printed**;
  the answers are in the guide. Several are personal or provincial rather than fixed
  ("Who is your Member of Parliament?", "What is the capital of your province or
  territory?").

That is 31 items in total, of which only 3 are in multiple-choice form. The
28 was counted in a real browser (Playwright/Chromium, 2026-09-07): the page has one
heading "Study Questions" for the worked examples and one "Other Study Questions:" heading
above a list of exactly 28 question-shaped items. An earlier automated read of the same
page reported 23, so re-count rather than trusting a summary. So even with
permission, Canada is a small official set plus a large free study guide — a
study-guide-led product, not a question-bank-led one.

## 3. The licence, quoted

From the Government of Canada terms and conditions,
https://www.canada.ca/en/transparency/terms.html (retrieved 2026-09-07):

> "**Non-commercial reproduction**
>
> Unless otherwise specified you may reproduce the materials in whole or in part for
> non-commercial purposes, and in any format, without charge or further permission,
> provided you do the following:
>
> - exercise due diligence in ensuring the accuracy of the materials reproduced;
> - indicate both the complete title of the materials reproduced, as well as the author
>   (where available);
> - indicate that the reproduction is a copy of the version available at [URL where
>   original document is available]"

> "**Commercial reproduction**
>
> Unless otherwise specified, you may not reproduce materials on this site, in whole or in
> part, for the purposes of commercial redistribution without prior written permission from
> the copyright administrator."

The same page restricts the official symbols separately:

> Official symbols (the Canada wordmark, the Arms of Canada, the flag) require prior
> written authorization for any reproduction.

## 4. Is commercial reuse permitted?

What the licence says, without interpretation:

- Non-commercial reproduction: **permitted**, with three attribution conditions, no
  permission needed.
- Commercial redistribution: **not permitted without prior written permission from the
  copyright administrator.**
- Official symbols: excluded; separate written authorization.

Our product is sold ($9.99 lifetime, iOS and web). Bundling IRCC questions into it is
commercial redistribution on the face of the terms, so the written permission is a
precondition, not a formality to sort out later.

**Unclear, and for a lawyer:**
- Whether a paid app whose Canadian content is free-to-use falls inside "commercial
  redistribution" — the terms do not define the phrase.
- Who the "copyright administrator" is for IRCC publications, and whether the request goes
  to IRCC or to Public Services and Procurement Canada.
- Whether short factual questions attract copyright at all, and whether Canada's Crown
  copyright analysis differs from the UK's.

**Marked for counsel. We give no conclusion.**

## 5. Test mechanics (verified from Canada.ca)

| | |
| --- | --- |
| Questions asked | 20 |
| Pass mark | "at least 15 of the 20 questions (75%)" |
| Time | "Citizenship tests are 45 minutes long." |
| Format | multiple choice and true/false, computer based |
| Language | "you can take it in either French or English" |
| Delivery | "We'll invite most citizenship applicants to take the online test." — "You can take the online test from anywhere. We'll monitor you using your webcam." In-person written or oral, and Microsoft Teams, are alternatives |
| Attempts | "you'll have 3 chances to pass the test" |
| Window | "You'll have 30 days to take this test." |
| Basis | *Discover Canada* |

Sources: `/services/canadian-citizenship/test/results.html`,
`/services/canadian-citizenship/test/online.html`,
`/services/canadian-citizenship/test/how-it-works.html`,
`/services/canadian-citizenship/test/study.html`.

Note the bilingual requirement: a credible Canadian product needs French. IRCC publishes
*Discover Canada* and the study questions in French at the `/fr/` equivalents of every URL
above.

## What it would take to unblock this folder

1. Written permission request to IRCC's copyright administrator for commercial
   reproduction of the *Discover Canada* study questions (and, if wanted, guide extracts),
   in English and French, in a paid mobile and web app. Cite the exact URLs above.
2. Counsel's read on the two unclear points in §4 before sending, so we ask for the right
   thing once.
3. If permission is granted: build the pack with `contentType:
   "official-practice-subset"`, `officialPoolPublished: false`, three multiple-choice
   questions and the open-ended set kept visibly separate (they have no printed answers —
   presenting them as if graded would be inventing answers), plus `language: "en-CA"` and a
   French pack.
4. If permission is refused or unanswered: Canada gets the same honestly-labelled
   study-guide product as the UK, and no official question content.

Until step 1 comes back in writing, this folder stays as it is.
