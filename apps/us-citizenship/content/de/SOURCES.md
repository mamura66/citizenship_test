# Germany — Einbürgerungstest: provenance

Everything in `einbuergerungstest.json` is verbatim official text from the sources below.
Nothing was written, reworded, translated, paraphrased or reconstructed from memory. Where
an official text could not be obtained it was left out and recorded as a gap in `NOTES.md`.

Retrieved **2026-09-07**.

## Why two sources

The official catalogue PDF carries the question and option text but **does not mark which
option is correct** — every checkbox in it is empty. The official interactive catalogue
marks the correct option but renders each question's text as a **PNG image**, not as text.
Neither source alone can produce the pack, so the pack is assembled from both:

| Field in the pack | Comes from |
| --- | --- |
| `question`, `options` (text and official order) | Source 1, the catalogue PDF |
| `correctIndex`, `answers` | Source 2, the interactive catalogue |
| `askedPerInterview`, `passRequirement`, `timeLimitMinutes` | Sources 3 and 4 |

## Source 1 — official catalogue PDF (question and option text)

* Landing page:
  <https://www.bamf.de/SharedDocs/Anlagen/DE/Integration/Einbuergerung/gesamtfragenkatalog-lebenindeutschland.html>
* File:
  <https://www.bamf.de/SharedDocs/Anlagen/DE/Integration/Einbuergerung/gesamtfragenkatalog-lebenindeutschland.pdf?__blob=publicationFile&v=23>
* Retrieved 2026-09-07 with `curl`. 8,970,190 bytes, 191 pages, PDF 1.6.
* `sha256 edd3ed5e56a35241b6cc61aa0630482dc9e64498db508a7d6892ccee2ec707a9`
* PDF metadata: Title *"Gesamtfragenkatalog zum Test „Leben in Deutschland“ und zum
  „Einbürgerungstest“ Stand: 07.05.2025"*, Author *Bundesamt für Migration und Flüchtlinge*,
  Company *Bundesregierung*, ModDate 2025-09-03.
* Document structure, exactly as published: `Teil I — Allgemeine Fragen` (Aufgabe 1–300,
  pages 2–111), then sixteen `Teil II — Fragen für das Bundesland <Land>` sections
  (Aufgabe 1–10 each, pages 112–191, Bundesländer in alphabetical order).

### How the text was extracted

No `pdftotext`, `mutool`, `qpdf` or Ghostscript exists on this machine, and no PDF library
was installed; `pdfminer.six` and `pypdf` were installed into a scratch directory for this
job. Nothing was added to the repo's dependencies.

Extraction is **layout-aware**, not a plain text dump, because a plain dump gets this
document wrong in three ways that would have corrupted the content:

1. **Checkbox glyphs sit on their own text line**, at a baseline 1–4 pt below the option
   text they belong to. Read in raw stream order the option text arrives *before* its
   marker, so a naive parse merges all four options into the question. The parser therefore
   merges text lines into *visual rows* by baseline (±5 pt) before reading them.
2. **Two different checkbox glyphs are in use.** 1,800 options are marked with a Wingdings2
   private-use glyph (`U+F0A3`); the 40 options of the ten most recently added questions are
   marked with a literal `□` (`U+25A1`) in Arial. 1,800 + 40 = 1,840 = 460 × 4. A parser that
   only knows the Wingdings glyph silently loses ten whole questions.
3. **`pypdf` drops and invents spaces** at text-run boundaries — it produced
   `imInternet` for "im Internet" and `zu r` for "zur". `pdfminer.six` with
   `word_margin=0.12` reproduces the spacing correctly, so it is the extractor of record.
   `pypdf`'s output is retained only as an independent second opinion for spot checks.

Also handled, and each verified by eye against a rendered page:

* Five `Aufgabe N` headings are split across a line break in the text stream
  (`Auf\ngabe 15`, `A\nufgabe 67`, `97`, `183`, `248`). Headings are found by bold font plus
  baseline row, not by string prefix, so all 460 are located.
* The bold `Teil I` / `Teil II` section headings fall inside the preceding question's block
  and were appending "Teil II" to the last option of sixteen questions. They are now excluded.
* Six questions carry a photo credit or source note in **10 pt** type
  (`© Deutscher Bundestag/Achim Melde`, `In Anlehnung an Bundeswahlordnung (BWO), Anlage 26`,
  …). Question and option text is 12 pt. The 10 pt rows are separated out into
  `imageCredit` instead of being concatenated onto the question.
* One question repeats its own number inside the text (`184. Auf welcher rechtlichen …`);
  the duplicated leading `184. ` is removed, the question text is untouched.
* Soft hyphens, non-breaking spaces and the checkbox glyphs are stripped; nothing else is
  altered. No case changes, no punctuation normalisation, no quote substitution.

## Source 2 — official interactive catalogue (the answer key)

* Entry point: <https://oet.bamf.de/ords/oetut/f?p=514> — "Interaktiver Fragenkatalog
  Einbürgerungstest", linked from BAMF's Online-Testcenter page
  <https://www.bamf.de/DE/Themen/Integration/ZugewanderteTeilnehmende/OnlineTestcenter/online-testcenter-node.html>
* Oracle APEX 22.1.3 application 514, question page 30. Session state is cookie-based and
  APEX rejects setting the question item from the URL, so the catalogue was driven in a real
  browser (Playwright + Chromium, images/CSS/fonts blocked) using the app's own
  "Gehe zu Aufgabe Nr." select (`P30_ROWNUM`), one Bundesland session at a time.
* BAMF's own description of this tool: *"Nach der Bearbeitung jeder Frage bekommen Sie die
  richtige Antwort angezeigt."*
* The correct option is present in the delivered HTML before any answer is given: the
  correct row's radio input carries `id="FARBE"`, its cells carry `name="FARBE"`, and its
  marker span reads `richtige Antwort =>` in green while the other three read
  `falsche Antwort =>` in red. The answer key was read from that markup — no answers were
  guessed, inferred from plausibility, or supplied from memory.
* Coverage: the 300 general questions were read once (indices 1–300); each Bundesland's ten
  questions were read in that Bundesland's own session (indices 301–310), so no state's
  questions can be attributed to another state.

## Source 3 — official sample test form (exam mechanics)

* <https://www.bamf.de/SharedDocs/Anlagen/DE/Integration/Einbuergerung/musterbogen_einbuergerungstest.pdf?__blob=publicationFile&v=10>
* `sha256 ce0f3da9ea9fb08f2d68270afedb99cdf5836de229b5e5e1878df1ca614ac25e`
* Quoted instruction: *"In diesem Testfragebogen werden Sie 33 Fragen beantworten. Zu jeder
  Frage werden Ihnen vier verschiedene Antwortmöglichkeiten angeboten. Dabei ist immer nur
  eine der Antwortmöglichkeiten richtig! … Dafür haben Sie 60 Minuten Zeit."*
* This is a blank answer sheet — it contains options but no question text and no answer key,
  so it was used only to confirm the 33-question / four-option / exactly-one-correct /
  60-minute facts.

## Source 4 — BAMF Einbürgerungstest page (pass mark)

* <https://www.bamf.de/DE/Themen/Integration/ZugewanderteTeilnehmende/Einbuergerung/einbuergerung-node.html>
* *"Bei der Prüfung bekommen Sie ein Testheft mit 33 Fragen. Sie haben 60 Minuten Zeit, die
  Fragen zu beantworten."* and *"Wenn Sie mindestens 17 Fragen richtig beantworten, haben Sie
  den Test bestanden."* → `askedPerInterview: 33`, `passRequirement: 17`,
  `timeLimitMinutes: 60`.

## What was verified

Run `python3 validate.py` in this directory for the machine-checkable part. Beyond that:

1. **Counts.** 300 general questions and 160 state-specific questions (10 × 16
   Bundesländer), 460 total, each with exactly 4 options and exactly one correct answer.
   The 1,840 option markers counted directly in the PDF equal 460 × 4 exactly, which is an
   independent confirmation that no option was dropped or invented.
2. **Encoding.** `ä ö ü ß Ä Ö Ü` all present; the pack contains no mojibake sequence
   (`Ã¤`, `Ã¶`, `Ã¼`, `Ã`, `â€`, `U+FFFD`) and no leftover checkbox glyph. The complete
   set of non-ASCII characters in the pack was enumerated and is exactly
   `ä ö ü ß Ä Ö Ü … „ “ ç` — the `ç` is François Mitterrand in question 235.
3. **Two independent extractions agree.** `pdfminer.six` (used) and `pypdf` (not used) were
   both run over the same PDF and compared per question during spot checks.
4. **Two independent official sources agree on the options.** For every question the PDF's
   four options and the interactive catalogue's four options were aligned by best-match
   over all 24 permutations, using an order-insensitive word-bag similarity so that
   gender-pair reorderings do not confuse the comparison. The identity permutation was the
   optimal alignment for **every one of the 460 questions, with no exceptions**. This is
   what licenses carrying the answer key across by position — see `NOTES.md`, which explains
   why carrying it across by text would have been wrong.
5. **Pages rendered and read by eye.** Chromium rendered PDF pages 2, 25, 117 and 191 to
   PNG and they were compared against the parsed output character by character. Page 2 also
   visually confirms the central fact that every checkbox in the catalogue is empty.
6. **The image answer key was checked against the pictures.** On the rendered page 117 the
   Bavarian coat of arms is plainly `Bild 2` and Baden-Württemberg's is `Bild 1`; the
   answer key independently gives `correctIndex` 1 for Bayern's Aufgabe 1 and 0 for
   Baden-Württemberg's. Two unrelated sources agreeing on a picture-only answer.

Questions spot-checked individually against the official sources are listed in `NOTES.md`.

## Source 5 — the picture-question artwork (added 7 September 2026)

The 38 questions that show artwork take it from the same catalogue PDF as the text, so no
new source was introduced. What matters is *how* it was taken, because the failure mode is
silent: for the 19 questions whose four options **are** the pictures, the wrong order marks
the wrong answer correct and nothing on screen looks broken.

**Extraction.** `pypdf` 6.17 read the embedded image XObjects; Pillow applied each image's
`/SMask`, without which every coat of arms would have carried an opaque block instead of a
transparent background. A 634x434 image repeating on all 191 pages is page furniture and
was excluded by size. The result was then composited onto white — matching how the BAMF
page prints — and saved as palette PNG where that was exactly lossless, JPEG q90 otherwise:
95 files, 4.9 MB.

**Order was derived, not assumed.** XObject names are arbitrary and on 8 of the 19 pages
`/Im1` is not the leftmost picture. The page content stream was therefore interpreted
(`q` / `Q` / `cm` / `Do`, maintaining the CTM) to recover each image's drawn box, and all
19 pages were verified to lay their four pictures out in one row — clean column gaps,
overlapping vertical extents — so left-to-right is the reading order. Question 55's mapping
was moot: its photograph is not ours to ship.

**Verified.** Contact sheets were rendered and read by eye for questions 21, 209, 226,
1001, 1008, 1011 and 1041, and question 130 was read at full size to confirm that ballot 1
is the only one marked validly. Independently, hashing all 95 files shows the 16 state arms
recurring as distractors across the 16 `Aufgabe 1` questions with **no image marked correct
for two different Bundesländer** — a cross-check that does not depend on anyone's eyes.

**Licence boundary.** The catalogue has no imprint and no general rights statement; its only
`©` notices are inline on pages 21, 27, 67, 81 and 88, all naming Deutscher Bundestag or
Bundesregierung photographers. Those five photographs are not redistributed, which is why
question 55 is `servable: false`. Section 5(2) UrhG covers the official work, not a
photograph licensed into it.
