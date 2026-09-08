# United Kingdom — everything verified, and the one thing still missing

**Status, 8 September 2026: no pack, and this is a deliberate decision rather than an
unfinished task.** Everything that can be established without the official handbook is
established below and verified from primary Home Office sources. The remaining input is the
handbook itself, which costs about £12 and has no lawful substitute. Once it is in hand the
pack is a short build — the machinery, the schema and the guardrails all exist and are
already carrying Canada and Australia.

## 1. The test, verified from Home Office primary sources

| | | Source |
|---|---|---|
| Questions | 24, multiple choice | Home Office, *Knowledge of language and life in the UK* |
| Time | 45 minutes, computer based | same |
| Pass mark | "You must score 75% or more to pass the test" (so 18 of 24) | Home Office, *Guide AN — Naturalisation booklet* |
| Result | Told on the day | *Knowledge of language and life in the UK* |
| Languages | English; Welsh at a test centre in Wales, Scottish Gaelic in Scotland | same |
| Attempts | "Applicants may take the test as many times as is necessary to pass" | same |
| Basis | "The test questions are based on the 'Life in the United Kingdom: A Guide for New Residents' handbook. People must study the handbook to prepare for the test." | same |
| Also | GOV.UK: "You'll have 45 minutes to answer 24 questions about British traditions and customs" | gov.uk/life-in-the-uk-test |

Note the last row of the table above and the sentence in bold in it: the Home Office does
not merely recommend the handbook, it states that people **must** study it. Any product for
this test is supplementary to a book the candidate is told to buy, and should say so.

Quoted verbatim, because the pass mark took three documents to pin down and the next person
should not have to repeat that:

> The test lasts 45 minutes and is computer based. There are 24 multiple choice questions.
> People are told if they have passed or failed on the day they take the test. People can
> take the test in Welsh if they go to a test centre in Wales, or Scottish Gaelic if they
> take the test in Scotland. The test questions are based on the 'Life in the United
> Kingdom: A Guide for New Residents' handbook. People must study the handbook to prepare
> for the test. Applicants may take the test as many times as is necessary to pass.
>
> — Home Office, *Knowledge of language and life in the UK*, published for Home Office staff

> You must score 75% or more to pass the test.
>
> — Home Office, *Guide AN: Naturalisation booklet*

The pass mark is **not** stated on the public GOV.UK test pages. A "75%" string does appear
in the page's stylesheet, which is not a statement of anything; the figure was taken from
Guide AN instead.

## 2. The question pool is published nowhere

Established previously and still true: the Life in the UK question bank is confidential
Crown copyright and is not published by anyone. **Nobody has the real questions** — not us,
not any competitor, and not the official publisher's own app, which describes its questions
as "based on the style and structure of official questions".

So the route is the one Canada and Australia now use: our own questions, written from the
official study material, `contentType: "authored-practice"`, never presented as official.
That part is settled. The obstacle is not permission — it is *access to the study material*.

## 3. Why there is no substitute for buying the handbook

Each of these was checked, not assumed.

**There is no free official copy.** The handbook is a priced product of TSO, the official
publisher. The GOV.UK publication page for it returns 404; the paid formats are paperback,
eBook and audio.

**The Open Government Licence does not reach it.** OGL v3 covers GOV.UK pages and
government publications made available under it — but its exemptions expressly exclude
"Information that has not been accessed by way of publication or disclosure under
information access legislation … by or with the consent of the Information Provider". A
commercially sold Crown-copyright book is not OGL material. (OGL also states it grants no
right to use information "in a way that suggests any official status", which is a second
reason our packs carry a non-affiliation notice.)

**Third-party PDFs of the handbook are unauthorised copies.** Several sites host one. Using
it would be copying a Crown-copyright book, which is the single thing this project ruled out
when it decided not to copy competitors' question banks either. The rule does not bend
because the owner is a government.

**The Cabinet Manual route was tried and rejected on quality, not licence.** *The Cabinet
Manual* (Cabinet Office) is genuinely OGL, genuinely authoritative, and covers UK
government in 110 pages — it was downloaded and read. It is dated **2011**, and it is stale
in ways that matter for a 2026 exam:

- it calls the Welsh legislature the "National Assembly for Wales", renamed Senedd Cymru /
  Welsh Parliament in 2020;
- it describes the UK's EU membership, which ended in 2020;
- it predates the repeal of the Fixed-term Parliaments Act in 2022.

Writing questions from a 2011 constitutional document, for a test based on a 2013 handbook,
in 2026, would stack three vintages of staleness — and there would be no way to check the
result against the actual syllabus. Germany's pack showed how much care a single stale
official document needs (its Elections chapter still claims 308 electoral districts); three
at once, for an exam people pay to sit, is not a risk worth taking to avoid £12.

**Coverage cannot be verified without the book.** The five chapters are publicly known —
values and principles; what is the UK; a long and illustrious history; a modern, thriving
society; the UK government, the law and your role. Chapters on government, law and the
nations could be sourced from OGL material. The history and society chapters could not: the
handbook makes specific selections from a thousand years of history and from British
cultural life, and guessing which ones is exactly the kind of confident wrongness that
loses somebody an exam.

## 4. What to do next

1. Buy *Life in the United Kingdom: A Guide for New Residents*, 3rd edition, from the
   official TSO shop (ISBN 9780113413409, about £12). Paperback or eBook both work; the
   eBook is easier to work from.
2. Build the pack with `tools/build-uk-practice-pack.py`, modelled on the Canadian and
   Australian builders and sharing `tools/practice_pack.py`. Everything it needs already
   exists: the `authored-practice` content type, the answer-position shuffle, the per-question
   source reference, and the originality gate.
3. The originality reference is a problem worth thinking about for one minute: unlike Canada
   and Australia, the UK publishes no sample questions, so there is nothing to compare
   against. The gate should therefore run against the **handbook's own practice questions**
   if the edition carries any, and otherwise be skipped explicitly with `--offline` and a
   note here saying so — not silently passed.
4. Carry the mechanics from section 1: `askedPerTest` 24, `passRequirement` 18,
   `timeLimitMinutes` 45. All three are sourced above.
5. `uk` is the account code and `gb` is the folder. That mapping is deliberate and is
   explained in `site/src/lib/countries.js` — the entry there must read `/content/gb/<file>`
   against the key `uk`.

## 5. What is on the site today

The United Kingdom is listed and not selectable — `versions: []` in
`site/public/countries.js` and no entry in `COUNTRY_PACKS`. It is deliberately **not** on
the home page's country strip, because a "coming soon" chip is a promise, and the Countries
section explains the position in words instead. That copy is accurate as it stands and needs
no change when the pack lands beyond adding the chip.
