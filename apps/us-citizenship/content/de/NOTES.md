# Germany — Einbürgerungstest: notes for whoever touches this next

Read `SOURCES.md` first for where the text came from. This file is about the decisions,
the schema, and everything that is *not* settled.

## The test, in one paragraph

BAMF publishes one catalogue of **460 questions**: 300 nationwide (`Teil I — Allgemeine
Fragen`) plus 10 for each of the 16 Bundesländer (`Teil II`). A candidate faces the 300
general questions plus the 10 for the Bundesland they live in — **310**, never another
state's. The exam draws **33** questions from those 310; **17 correct** passes; 60 minutes.

**Every question has exactly 4 options and exactly one correct answer.** This is the big
structural difference from the US pack, where one question can have many acceptable
free-text answers and the interview is spoken. A German question is single-choice, so the
three wrong options are part of the official question and have to be carried.

## Schema additions, and why

Both additions are **additive**. Nothing in the US pack changed and nothing about it is
invalidated: `apps/us-citizenship/content/us/civics-2025.json` has no `options`, no
`correctIndex` and no `stateCategories`, and a reader that only understands the US shape
still reads this pack's `categories` and `answers` correctly.

### 1. Distractors: `options` + `correctIndex`, with `answers` kept

```json
"options":      ["hier Religionsfreiheit gilt.", "die Menschen Steuern zahlen.",
                 "die Menschen das Wahlrecht haben.", "hier Meinungsfreiheit gilt."],
"answers":      ["hier Meinungsfreiheit gilt."],
"correctIndex": 3
```

* `options` — the four official options **in the official order printed in the catalogue**.
  Order is preserved rather than normalised because it is part of the published question,
  and because the answer key is carried across from the second source *by position* (see
  below). Do not sort or shuffle this array in the data; shuffle at presentation time if
  you want to.
* `answers` — kept, and keeps its US meaning of "the acceptable answers", which here is
  always exactly one. Anything already written against `answers` works unchanged.
* `correctIndex` — the 0-based index into `options`. This is the field to trust. It exists
  because `answers[0]` alone forces a string comparison to re-locate the right option,
  and two of the options in this catalogue are the literal strings `"Bild 1"` and `"1"`.

`answers[0] === options[correctIndex]` is enforced by `validate.py`, so the two can never
drift apart.

### 2. State questions: `stateCategories`

The US pack handles "the answer depends on where you live" — one shared question whose
*answer* varies by state, with the volatile parts (`governors.json`,
`national-dynamic.json`) split out because officeholders change, and the stable parts
(`state-capitals.json`) bundled. `jurisdictions.json` is an index of jurisdictions with
per-jurisdiction metadata.

Germany is a different shape: the *questions themselves* belong to one Bundesland. So:

* `categories` holds **only the 300 nationwide questions**, in one category. A
  country-agnostic reader that knows nothing about Bundesländer therefore sees exactly the
  300 general questions and **cannot accidentally serve a candidate another state's
  question** — the failure mode worth designing against. That is deliberate: state
  questions are opt-in, not opt-out.
* `stateCategories` is an array of 16 categories with the *same shape* as a `categories`
  entry (`id`, `section`, `subsection`, `questions`) plus `state`, `stateCode`
  (ISO 3166-2:DE, e.g. `BY`) and `bamfStateId` (BAMF's own id for the Bundesland in its
  interactive catalogue, useful for re-verification).
* `stateProvision.states` is the index that plays `jurisdictions.json`'s role — the list a
  picker can render, with the category id to load for each.
* **Every state question also carries its own `state` field.** Redundant on purpose: it
  makes a mis-filed question detectable, and `validate.py` fails if a question's `state`
  disagrees with the category it sits in.

Unlike the US officials data this all lives *in* the pack, because state test questions are
stable published catalogue content, not officeholders that change between releases. Nothing
here needs a network fetch at runtime.

### Question ids

`id` is a number and unique across the whole pack, as the US pack requires.

* General questions: **1–300**, which are the official `Aufgabe` numbers.
* State questions: **1001–1160**, as `1000 + (alphabetical index of Bundesland) * 10 +
  official number`. So Baden-Württemberg (index 0) is 1001–1010, Bayern 1011–1020, …
  Thüringen (index 15) is 1151–1160.

The official state numbering restarts at 1 for every Bundesland, so official numbers alone
collide sixteen ways. `officialNumber` preserves what the catalogue actually prints — show
*that* to a user if you show a number at all, never `id`.

### Other per-question fields

| Field | Meaning |
| --- | --- |
| `officialNumber` | the `Aufgabe` number as printed in the catalogue |
| `hasImage` | the catalogue prints a picture with this question |
| `requiresImage` | **the question cannot be answered without the picture** — see gaps |
| `imageLabels` | the captions printed under the pictures (`Bild 1`…`Bild 4`) |
| `imageCredit` | the photo credit / source note printed in 10 pt under the picture |
| `answerKeyMatch` | `exact` or `aligned` — how the answer key was tied to this question |
| `bamfQuestionId` | BAMF's own internal question id, for re-verification |
| `bamfSlug` | BAMF's internal mnemonic where the catalogue exposes one |
| `sourcePages` | page(s) of the catalogue PDF this question was read from |

## Categories are NOT official — this needs review

**The official catalogue provides no topic grouping.** Its only structural division is
`Teil I — Allgemeine Fragen` (all 300 general questions, in one undifferentiated run) and
the 16 `Teil II` state sections. There is no equivalent of the USCIS
"AMERICAN GOVERNMENT / A: Principles of American Government" hierarchy.

So the pack is grouped faithfully by the source's own structure and nothing else: one
category, `allgemeine-fragen`, section `TEIL I`, subsection `Allgemeine Fragen`, holding all
300 in official order. **No taxonomy was invented.**

This is honest but it is poor for a study product: a performance screen has nothing to
break down, and "one category of 300" gives a learner no map. Before shipping, someone
should decide how to group them. Two options, and the difference matters:

1. Find an official or semi-official grouping. The BAMF/BMI curriculum for the
   Orientierungskurs (*Curriculum für einen bundesweiten Orientierungskurs*) has three
   modules — *Politik in der Demokratie*, *Geschichte und Verantwortung*, *Mensch und
   Gesellschaft* — and the test is built on it. If a published mapping of question numbers
   to modules exists, use it and cite it.
2. Group them ourselves. Fine for navigation, but then it is **our** editorial grouping and
   must not be presented as official, in the UI or anywhere else.

Do not quietly do (2) and label it like (1). Until this is decided, treat
`allgemeine-fragen` as a placeholder for grouping only — the *questions* in it are final.

## Gaps and things not verified — read this list before shipping

### 1. Picture questions — 37 of 38 now ship images; one is held back

Resolved on 7 September 2026. The images were extracted from the catalogue PDF and live in
`img/`, referenced from the questions two ways:

* `optionImages` — 4 paths, index-aligned with `options`, for the 19 questions whose
  options *are* the pictures (`"Bild 1".."Bild 4"`): the federal Wappen, the DDR Wappen,
  the EU flag, and `Aufgabe 1` for all 16 Bundesländer. `optionImages[correctIndex]` is
  the picture for the right answer.
* `image` — one path, for the 18 questions with a single figure and text or numbered
  options: the 16 `Aufgabe 8` locator maps, the specimen ballot papers (130) and the 1945
  occupation-zones map (176). The digits `1`..`4` are printed inside the artwork, so the
  figure has to be rendered above the ordinary text options.

**Order was the whole risk here and it was not taken on trust.** The four images on a page
are stored as XObjects whose names (`/Im1`../`/Im4`) are in arbitrary order — on 8 of the
19 pages `/Im1` is *not* the leftmost picture, so naming would have silently mismarked the
answer on those. The order was taken instead from where each image is actually *drawn*:
the page content stream was interpreted (`q`/`Q`/`cm`/`Do`, tracking the CTM) to get every
image's on-page box, and all 19 pages were confirmed to place their four pictures in a
single row with clean column gaps and overlapping vertical extents, so left-to-right x is
the reading order. Do not reorder `optionImages`.

Verified three ways, not just asserted:

1. **By eye.** Contact sheets were rendered and read: 21 -> Bild 1 is the Bundesadler;
   209 -> Bild 4 is the DDR hammer-and-compass; 226 -> Bild 2 is the ring of gold stars;
   1011 -> Bild 2 is the Bavarian lozenge; 1041 -> Bild 3 is the Bremen key; 1008 -> arrow
   2 points at the south-west. Each matches the `correctIndex` already in the pack.
   130 was read at full size: ballot 1 is the only one with exactly one mark in each
   column, which is what makes it the valid one.
2. **By image identity.** The same 16 state coats of arms recur as distractors across the
   16 `Aufgabe 1` questions. Hashing every file gives 24 distinct images, of which exactly
   16 are the correct answer for exactly one Bundesland each, and **no image is marked
   correct for two states**. A misalignment would almost certainly have broken that.
3. **Against the earlier independent check.** The answer key derived from the interactive
   catalogue already said Bayern = 2 and Baden-Württemberg = 1 before any image was
   extracted; the pictures agree.

**Question 55 is `servable: false`** and must be filtered out by anything loading this
pack. It asks "Was zeigt dieses Bild?" about a photograph credited
`© Deutscher Bundestag/Achim Melde` — see the licence note below. Without the photograph
the question cannot be answered, so it is withheld rather than served broken. That leaves
**459 of 460** servable.

### 1a. The five photographs are not ours — this is a real licence boundary

The catalogue has no imprint and no general rights notice. Its only `©` notices sit inline
on five pages, and they name third parties:

| Question | Page | Credit |
|---|---|---|
| 55 | 21 | © Deutscher Bundestag/Achim Melde |
| 70 | 27 | © Bundesregierung/Engelbert Reineke |
| 181 | 67 | © Bundesregierung/Engelbert Reineke |
| 216 | 81 | © Deutscher Bundestag/Janine Schmitz |
| 235 | 88 | © Bundesregierung/Richard Schulze-Vorberg |

Section 5(2) UrhG frees the *official work* — the questions and options — from copyright.
It does not transfer rights in a photograph that BAMF licensed for its own publication.
So these five are flagged `imageOmitted: "third-party-copyright"` and **no file was
written** for any of them. Questions 70, 181, 216 and 235 read fine without their
photograph and stay servable as ordinary text questions; only 55 is about its picture.

Question **187** is the useful counter-example. It has `hasImage` and sits on page 70, but
page 70 carries no credit line — the picture is the DDR flag, a state emblem drawn as part
of the official work, not a photograph. It was inspected and is shipped as `image`, so 38
questions ship artwork in total: the 37 that need it plus this one. The test applied was
the credit line in the catalogue, not the page number.

Everything actually shipped — coats of arms, flags, the occupation-zone map, the state
locator maps, the specimen ballots — carries no separate credit anywhere in the catalogue
and is reproduced as part of the official work. The specimen ballots additionally say
"In Anlehnung an Bundeswahlordnung (BWO), Anlage 26", i.e. derived from a statutory annex.
`tools/validate-content-pack.py` now fails the pack if a question ever ships a file while
carrying a `©` credit, so this cannot quietly regress.

### 1b. Rendering rules that are not optional

* **Render on a white tile in both themes.** Every file was composited onto white, the way
  the BAMF page prints it. Do not invert, filter or blend them: several are black line art
  and question 21's second option is a black Chi-Rho that vanishes completely on a dark
  ground. This was found by looking, not predicted.
* **BAMF attribution must be on screen** wherever these questions are shown — section 63
  UrhG makes source attribution an obligation. The string is in `licence.attribution`.
* **Do not claim the wording matches the exam.** BAMF's own first page says the wording
  "können leicht von den verwendeten Originalfragen abweichen". "From the official
  catalogue" is the strongest true claim; see gap 4.

### 2. The two official sources are at different revisions — 120 questions

This is the most important caveat in the pack.

The catalogue PDF is dated **Stand 07.05.2025**. The interactive catalogue that supplies the
answer key is running **older text**. The differences are systematic, not random:

| PDF (used for `options`) | Interactive catalogue (answer key only) |
| --- | --- |
| `Alle Einwohnerinnen/Einwohner und der Staat …` | `Alle Einwohner / Einwohnerinnen und der Staat …` |
| `Erste Ministerin/Erster Minister` | `Erster Minister/ Erste Ministerin` |
| `Justizministerin/Justizminister` | `Justizminister/ Justizministerin` |
| `selbstständig` | `selbständig` |
| `Kirchensteuer` | `Kirchensteuern` |
| `Bild 1` | `1` |

The PDF is the current dated publication, so **the PDF's text is what the pack ships**.
The answer key is therefore carried across **by position**, not by matching text —
matching by text would have silently dropped the answer for 120 questions.

Position was not assumed. For all 460 questions the two sources' option lists were aligned
by best match over all 24 permutations, using an order-insensitive word-bag similarity so
that gender-pair reorderings (`A/B` vs `B / A`) do not defeat the comparison. **The identity
permutation was optimal for all 460, with zero exceptions.** `answerKeyMatch` records the
outcome per question:

* `exact` (**340** questions) — both sources' option text is character-identical, so the
  answer key is confirmed by text as well as position.
* `aligned` (**120** questions) — the wording differs as above; the answer rests on the
  verified positional alignment.

**What is still not proven:** that BAMF did not also *reorder* options between the two
revisions in some question where the reordering happens to look like a rewording. The
permutation test makes this unlikely and nothing suggests it happened, but the only way to
close it completely is a source that has the current wording *and* the answer key together,
and no such source was found. If one appears, re-verify the 120 `aligned` questions first.
A cheap partial check on any single question: `bamfQuestionId` identifies it in BAMF's own
system.

### 3. Underlined emphasis is not carried

44 questions turn on a negation — *"Welche Ministerin/welchen Minister hat Thüringen
**nicht**?"*, *"Was ist **kein** Bundesland …?"* — and the catalogue **underlines** the
negating word. The pack stores plain strings, so the underline is gone. No text is missing;
the word `nicht` is there. But the official emphasis is a real reading aid on exactly the
questions most easily misread, and dropping it is a downgrade. The underlines are present
in the PDF as thin rectangle primitives and are recoverable if someone wants to add an
emphasis field later.

### 4. BAMF's own disclaimer

Page 1 of the catalogue says: *"Die Formulierungen von einzelnen Fragen und Antworten können
leicht von den verwendeten Originalfragen abweichen."* The wording of individual questions
in the published catalogue may differ slightly from the wording actually used in the exam.
That is BAMF's caveat about its own document and there is nothing we can do about it — but
it means "verbatim from the official catalogue" is the strongest claim available, and
"identical to what you will see in the exam" is **not** a claim we can make. Do not let
marketing copy drift into the second one.

### 5. Volatility

Question format and the pool are stable, but some state questions ask which ministry a
Bundesland does *not* have, and ministries get reorganised. These answers come from BAMF
rather than from us, so the risk is BAMF's, not a fact we assert independently — but
re-fetch the catalogue before each release and diff. `catalogueStand` in the pack is the
date to compare against.

### 6. Not done, on purpose

* `tools/sync-content.sh` was **not** run by this task, but a concurrent run of it has
  already picked the pack up: `site/public/content/de/einbuergerungstest.json` is present
  and its sha256 matches the copy here, and `site/public/content/packs.json` lists `de`.
  Re-run the script after any further content change and confirm the hashes still match —
  a stale website copy is exactly the "one source of truth" failure the script exists to
  prevent.
* `site/src/lib/countries.js` and `site/public/countries.js` still have **no `de` entry**,
  so the website will not offer Germany yet even though the pack is synced. Those files are
  owned elsewhere and were deliberately not touched.
* No app or website code was written or changed. Nothing was deployed.
* The `Leben in Deutschland` test shares this same catalogue but has a different pass mark
  and purpose. This pack describes the **Einbürgerungstest** only.

## Project rules that apply to this pack specifically

* **No question counts and no test-version years in user-facing UI.** `totalQuestions: 300`,
  `askedPerInterview: 33`, `version` and `catalogueStand` are data for logic and provenance.
  Do not print them on a screen. The same rule that applies to the USCIS pool size applies
  to the BAMF one.
* **The locale flips per country.** The "US English everywhere" rule is a US-product rule.
  This pack is German and every user-facing string in it is German by design. German
  orthography, including `ß` and the `…` in sentence-completion stems, is intentional —
  do not "fix" `selbstständig`, and do not transliterate `ß` to `ss`.
* **The country is locked once set.** These 460 questions belong to the German test only;
  a recorded answer here is meaningless against any other country's sections.

## Two validators, and which owns what

`tools/validate-content-pack.py` is the shared one every pack must pass. It owns ids,
duplicate detection (text **and** options together - a shared stem is not a duplicate
here), answer-is-an-option, `correctIndex` validity, the image references and licence
rules, and the PDF-extraction hygiene checks. Those hygiene checks were written for this
pack first and have been moved there, since Spain and the UK will also come out of PDFs.
It also walks `stateCategories` now; it used to walk only `categories`, which meant these
160 state questions were getting no structural checks at all.

`validate.py` in this directory is the Germany-specific supplement: the exact 300 + 10x16
shape against a named list of the sixteen Bundeslaender. Run both.

## Regenerating and re-verifying

`validate.py` in this directory is the gate. Run it after any change:

```
python3 apps/us-citizenship/content/de/validate.py
```

It asserts the counts (300 / 160 / 16), four options with exactly one correct answer,
`answers[0] === options[correctIndex]`, unique numeric ids, no state question filed under
the wrong state, no empty strings, no placeholders, no truncation ellipsis, no leftover
checkbox glyphs, and no mojibake. **The mojibake check matters more than it looks**: a pack
full of `Ã¤` instead of `ä` is valid JSON and reads as fine to anyone not looking for it.

The extraction and scraping scripts were scratch tooling and are not in the repo; the method
is documented step by step in `SOURCES.md` so it can be redone. `pdfminer.six` is required
for the PDF — `pypdf` mangles the spacing, see `SOURCES.md`.

## Questions spot-checked individually

Compared against the official sources, three ways where possible: this parser's output, an
independent `pypdf` extraction of the same PDF block, and the live interactive catalogue.

| Question | How checked | Result |
| --- | --- | --- |
| General 1 | 3-way + rendered PDF page 2 | agrees; answer `hier Meinungsfreiheit gilt.` |
| General 3 | rendered PDF page 2 | agrees; confirms PDF's `Einwohnerinnen/Einwohner` wording |
| General 21 | 3-way + rendered page 9 | caption strip correctly separated; answer `Bild 1` |
| General 55 | 3-way | agrees; credit line correctly separated |
| General 66 | 3-way + rendered page 25 | agrees; one of the `□`-marker questions |
| General 67 | rendered page 25 | agrees |
| General 96 | 3-way | agrees; `□`-marker question |
| General 130 | 3-way | agrees; `In Anlehnung an BWO` note separated |
| General 182, 183 | rendered page 68 | agrees; both checkbox glyph styles visible |
| General 184 | 3-way | agrees; duplicated `184. ` prefix correctly removed |
| General 206 | 3-way | agrees; `„Stolpersteine“` German quotes intact |
| General 226 | 3-way | agrees; answer `Bild 2` (EU flag) |
| General 250 | 3-way | agrees |
| General 300 | 3-way | agrees; `Teil II` heading bleed excluded, `Italien` not `Ita lien` |
| Bayern 1 | rendered page 117 + answer key | arms visibly `Bild 2`; key says index 1 |
| Baden-Württemberg 1 | rendered page 117 + answer key | arms visibly `Bild 1`; key says index 0 |
| Bayern 5 | parser + answer key | agrees; `weiß-blau` |
| Thüringen 9, 10 | rendered page 191 + answer key | agrees; shows the underline loss and the wording-revision difference |

The `Bayern 1` / `Baden-Württemberg 1` checks are worth keeping: they verify a
**picture-only answer key** against the actual pictures, from two unrelated sources.
