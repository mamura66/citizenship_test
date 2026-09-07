# United Kingdom — no pack, and why

**There is no question pack in this folder, deliberately.**

Retrieved: **2026-09-07**
Branch: `feature/multi-country`

One sentence: the *Life in the UK Test* question pool is not published anywhere by the
UK government, the official handbook is a Crown-copyright book sold commercially by TSO
rather than released under the Open Government Licence, and the only official practice
questions are a £7.99 TSO product — so there is nothing we can lawfully copy, and writing
our own questions would break the promise the product rests on.

## 1. Does any government body publish the actual question pool?

No source we could find. GOV.UK describes the test only by reference to the handbook:

> "You'll be tested on information from the official Guide for New Residents. You'll have
> 45 minutes to answer 24 questions about British traditions and customs."
> — https://www.gov.uk/life-in-the-uk-test

The Home Office's own caseworker guidance says the same and names the operator:

> "The test lasts 45 minutes and is computer based. There are 24 multiple choice questions."
>
> "The test questions are based on the 'Life in the United Kingdom: A Guide for New
> Residents' handbook."
>
> "To meet the life in the UK requirement, an applicant must have successfully completed
> the test operated by a provider approved for this purpose. The current test is
> administered by PSI."
> — *Knowledge of language and life in the UK: caseworker guidance*,
> https://www.gov.uk/government/publications/knowledge-of-life-and-language-in-the-uk/knowledge-of-language-and-life-in-the-uk-caseworker-guidance-accessible

Neither page, nor any GOV.UK page we found, publishes questions. What is published is the
*syllabus* — the handbook's subject matter — not the items.

Honest limits on this finding: absence of publication cannot be proved by search. We
searched GOV.UK, the Home Office publication collections, and the National Archives'
licensing registers. We could not open the WhatDoTheyKnow FOI thread on the 3rd-edition
test (`/request/life_in_the_uk_test_3rd_edition`) to read the Home Office's refusal
first-hand — the site is behind bot protection that blocked both fetch and a headless
browser. **Do not cite that FOI as evidence until somebody reads it in a normal browser.**

## 2. What *is* published, and by whom?

Nothing free. Everything official is a priced TSO product, sold at
https://www.officiallifeintheuk.co.uk/shop (retrieved 2026-09-07; the site carries Home
Office and TSO branding and a "© TSO" footer):

| Product | Price from |
| --- | --- |
| Official Life in the UK e-Learning Subscription ("the official e-learning course from the Home Office") | £10.99 |
| *Life in the United Kingdom: A Guide for New Residents* (3rd edition), book / eBook / audio | £12.99 |
| **Official Practice Questions & Answers**, book / app | £7.99 |
| Official Study Guide, book / eBook | £8.99 |
| Three-book pack | £27.99 |

The handbook is ISBN 978-0-11-341340-9, published by The Stationery Office for the Home
Office. GOV.UK links candidates to that shop; we found no free official copy of the
handbook or of any official question set on GOV.UK.

So official practice questions **do** exist for the UK. They are a book you buy. That is
the licensing route, not a scraping route (see `docs/COUNTRY-PIPELINE.md`).

## 3. The licence, quoted

### GOV.UK's default

> "All content is available under the Open Government Licence v3.0, except where otherwise
> stated" — https://www.gov.uk/help/terms-conditions

### The Open Government Licence v3.0, verbatim

From https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/:

> "Use of copyright and database right material expressly made available under this licence
> (the 'Information') indicates your acceptance of the terms and conditions below."
>
> "You are free to:
> - copy, publish, distribute and transmit the Information;
> - adapt the Information;
> - exploit the Information commercially and non-commercially for example, by combining it
>   with other Information, or by including it in your own product or application."
>
> "You must (where you do any of the above):
> - acknowledge the source of the Information in your product or application by including
>   or linking to any attribution statement specified by the Information Provider(s) and,
>   where possible, provide a link to this licence;
>
> If the Information Provider does not provide a specific attribution statement, you must
> use the following:
>
> Contains public sector information licensed under the Open Government Licence v3.0."
>
> "**Exemptions**
>
> This licence does not cover:
> - personal data in the Information;
> - Information that has not been accessed by way of publication or disclosure under
>   information access legislation (including the Freedom of Information Acts for the UK and
>   Scotland) by or with the consent of the Information Provider;
> - departmental or public sector organisation logos, crests and the Royal Arms except where
>   they form an integral part of a document or dataset;
> - military insignia;
> - third party rights the Information Provider is not authorised to license;
> - other intellectual property rights, including patents, trade marks, and design rights; and
> - identity documents such as the British Passport"
>
> "**Non-endorsement**
>
> This licence does not grant you any right to use the Information in a way that suggests
> any official status or that the Information Provider and/or Licensor endorse you or your
> use of the Information."

Two clauses matter here. First, OGL only reaches material "expressly made available under
this licence" — the handbook and the practice-questions book are not. Second, the
exemptions expressly exclude "Information that has not been accessed by way of publication
or disclosure" — which is precisely the status of an unpublished question bank.

### How Crown copyright can sit outside the OGL

From The National Archives, https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/:

> "Crown copyright is defined under section 163 of the Copyright, Designs and Patents Act
> 1988 as works made by officers or servants of the Crown in the course of their duties."
>
> "The default licence for most Crown copyright and Crown database right information is the
> Open Government Licence."
>
> "It is the Keeper who decides whether Crown copyright material can be made available on
> terms other than the Open Government Licence."
>
> "Delegations of Authority are granted by the Keeper to enable government departments or
> agencies to licence the re-use of Crown copyright material they produce outside the terms
> of the Open Government Licence."

The register of such delegations
(https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/delegations-of-authority/licensed-material/,
retrieved 2026-09-07; roughly 40 entries) contains a near-exact precedent for a government test
question bank:

> "Driver and Vehicle Standards Agency (DVSA) — The Official DVSA Revision Theory Test
> Question Banks; Visual Media and Hazard Perception Clips; Driving: the Essential Skills'
> (DES); All assets that are the subject of, or created for, DVSA's publishing services
> concession contract — 16 February 2024"

That is how UK government test content reaches third-party apps: a publishing concession
and a licence, negotiated. **The Home Office does not appear in that register** as at the
retrieval date, which tells us where to ask, not what the answer would be.

## 4. Is commercial reuse permitted?

State only what the documents say:

- The **handbook** and the **Official Practice Questions & Answers** are Crown copyright
  works published for sale by TSO. Neither carries an OGL notice. Neither carries any
  grant of reuse. There is therefore no licence permitting us to reproduce them.
- The **question pool** is not published, so no licence is on offer at all. A "practice
  question" circulating on a third-party site is somebody's reconstruction, and copying it
  copies their work, not the Crown's.
- **Unclear, and for a lawyer:** whether the Home Office would grant a licence to the
  Official Practice Questions & Answers content, on what terms and via which route (TSO's
  publishing concession, or a Delegation of Authority from the Keeper of Public Records).
  Also for a lawyer: the copyright status of individual short factual questions, and
  database right in a question set. **Marked for counsel. We are not counsel and give no
  conclusion.**

## 5. Test mechanics (for the study-guide product, which needs them)

| | |
| --- | --- |
| Questions asked | 24 |
| Format | multiple choice, computer based |
| Time | 45 minutes |
| Pass mark | "You must score 75% or more to pass the test." (18/24) |
| Fee | "It costs £50." Payable again on each re-sit: "You can rebook the test as many times as you need. You'll have to pay each time." |
| Basis | the 3rd-edition *Guide for New Residents* handbook |
| Operator | PSI, on behalf of the Home Office |
| Exemptions | waived at 65+ and for a long-term physical or mental condition |
| Languages | English; special arrangements exist for Welsh and Scots Gaelic |

Sources: https://www.gov.uk/life-in-the-uk-test,
https://www.gov.uk/life-in-the-uk-test/what-happens-test, and the caseworker guidance
above.

## 6. Watch item

Third-party immigration sites report a 2025 Home Office intention to refresh the test's
content. As at 2026-09-07 the current caseworker guidance and GOV.UK still describe the
unchanged test against the 2013 3rd-edition handbook, and we found **no** primary GOV.UK
publication of a new syllabus, edition or question bank. Treat the reform reporting as
unverified. If a new handbook is published, re-check whether it is released under the OGL —
that, and only that, would change this assessment.

## Bottom line

No pack. Not "not yet" for want of effort — there is no lawfully copyable official question
content for the UK. A UK product is possible (study material plus practice questions
clearly labelled as ours, or a licence from the Home Office/TSO); it is a different
product, and `docs/COUNTRY-PIPELINE.md` sets out what each route costs.
