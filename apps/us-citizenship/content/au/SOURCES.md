# Australia — sources, licence and what was verified

> **Status, 8 September 2026: this folder holds TWO packs, and only one is served.**
>
> * `practice-questions.json` — **75 questions of our own**, written from the testable
>   section of *Our Common Bond*. This is the one the website serves.
> * `citizenship-practice.json` — the **20 official sample questions**, described below.
>   Still `pending-legal-review`, so `tools/sync-content.sh` deletes it from the website's
>   content directory on every sync. It is not wasted: it is the originality reference the
>   authored pack is checked against, which is a better comparison than anything scraped.
>
> ## The licence, verified first-hand this time
>
> An earlier pass recorded *Our Common Bond* as CC BY 4.0 but could not re-open the pages,
> so that claim was flagged as unverified. It is now verified from the document itself.
> Page 1 of the testable PDF reads:
>
> > © Commonwealth of Australia 2020
> > With the exception of the Commonwealth Coat of Arms, all material presented in this
> > publication is provided under a Creative Commons Attribution 4.0 International license
>
> And the department's copyright page reads:
>
> > All material presented on this website is provided under a Creative Commons Attribution
> > 3.0 Australia licence, with the exception of: the Commonwealth Coat of Arms ... our logo
> > ... materials specifically not provided under a Creative Commons attribution 3.0
> > Australia licence ... content supplied by third parties.
> >
> > You should attribute material you get from this website as Australian Government
> > Department of Home Affairs.
>
> CC BY 4.0 permits commercial use and adaptation with attribution, which makes Australia
> the **best-licensed country in this project** — better than Canada, where the guide is
> Crown copyright and only the facts are free. We would be entitled to reproduce the
> booklet's wording here. We write our own questions anyway, because that is what the
> product needs, and the attribution is on screen either way: CC BY is not satisfied by an
> attribution nobody can see.
>
> The one gap that remains: the practice-test subdomain carries no copyright footer of its
> own while the department's notice speaks of "this website". That ambiguity is why the 20
> official sample questions stay held back — and it does not touch the authored pack, which
> needs no licence for the sample at all.
>
> ## The test, verified from the official practice test's own landing page
>
> | | |
> |---|---|
> | Questions | 20, multiple choice |
> | Time | 45 minutes |
> | Pass | "at least 15/20 (75%)" **and** "5/5 (100%) of the Australian values questions" |
> | Basis | "All the test questions are based on the OCB resource booklet" |
> | Sample | "This is a sample test only. The questions will be different on the day of the test." |
>
> The values rule is the one a product must not get wrong: it is not part of the 75%. Miss
> one values question and you have not passed, whatever the overall mark. It is carried in
> the pack as `valuesRule`, the twelve values questions are flagged `valuesQuestion`, and
> the rule is printed on screen in the booklet's own terms.
>
> ## How the 75 questions were made, and checked
>
> Built by `tools/build-au-practice-pack.py`, on the shared machinery in
> `tools/practice_pack.py`. Same three guarantees as Canada — the correct answer is
> distributed with a fixed seed, every question records `guideSection` and `guideUrl`, and
> an originality gate runs on every build.
>
> **The gate earned its place again.** It is two-tier now, because one threshold cannot
> tell these apart: "What is the capital city of Victoria?" against Home Affairs' "What is
> Australia's capital city?" scores 0.6 and is a perfectly good different question — short
> factual questions share most of their significant words by construction. So 0.8 and above
> fails the build and the 0.6–0.8 band is printed for a human to read once. Two real
> collisions were caught and reworded: our capital-city question was word for word one of
> theirs, and "What do the colours of the Australian Aboriginal Flag represent?" was their
> "What are the colours of the Australian Aboriginal Flag?" with a synonym.
>
> The validator also caught a mistake of mine that no amount of reading would have: the
> gold-rush question shipped with "1788" as two different options.
>
> **Fact audit: 68 of 68 confirmed verbatim** in the testable booklet — the First Fleet's
> 11 ships on 26 January 1788, Arthur Phillip as first Governor, the 1851 gold rush, six
> states and two mainland territories, all eight capitals, the Commonwealth Star's seven
> points, the yellow circle as the sun, federation on 1 January 1901, the High Court's
> ultimate power, the 1967 referendum's 90 per cent, the double majority, 76 senators with
> 12 per state and two each for the ACT and NT, Premier and Chief Minister, compulsory
> voting, and every values statement used. One initially read as a miss and was **my search
> string**, not the content: the booklet says "This includes government, community and
> religious leaders", and I had searched for "including government".
>
> **Still to do:** the booklet is published in a range of community languages and the test
> itself is English only, so unlike Canada there is no second language obligation here. But
> the 20 official sample questions remain held back pending that one licence question.


Pack: `citizenship-practice.json`
Retrieved: **2026-09-07**
Built by: content-licensing research pass, branch `feature/multi-country`

## What this content is

The 20 questions in the pack are the **official practice test** published by the
Australian Government Department of Home Affairs. They are **not** the real question
pool. Home Affairs does not publish the pool.

The department's own resource book says so, verbatim:

> "The citizenship test is a computer-based, multiple choice test in English. It consists
> of 20 randomly selected questions; and as of 15 November 2020, it will also include five
> questions on Australian values."
> — *Australian Citizenship: Our Common Bond*, p.3

"Randomly selected" from a set that is never published. The practice test itself says:

> "This is a sample test only. The questions will be different on the day of the test."
> — https://citizenshippracticetest.homeaffairs.gov.au/

That distinction is carried in the pack as `contentType: "official-practice-subset"`,
`officialPoolPublished: false`, and a `disclosure` string written to be shown to users.
Nothing in this pack may be presented as "the real questions".

## Where the questions came from

| | |
| --- | --- |
| Question source | https://citizenshippracticetest.homeaffairs.gov.au/test/ |
| Landing page | https://citizenshippracticetest.homeaffairs.gov.au/ |
| Linked from | https://immi.homeaffairs.gov.au/citizenship/test-and-interview/learn-about-citizenship-interview-and-test/learn-about-citizenship-test |
| Study material | https://immi.homeaffairs.gov.au/citizenship/test-and-interview/our-common-bond |

The practice test is a Next.js application. The question set is not in the server-rendered
HTML; it ships in a client bundle
(`/_next/static/chunks/9024420fa6e7110d.js`, build `wxjFl5bXgAcIbhG_4YJh1`) as an array of
`{ category, question, options, answer }` objects. The pack was generated from that array
programmatically — **no question, option or answer was retyped, reworded or edited.**
Question order within each part follows the source array. `id` is our own 1..20 sequence;
`section` strings are the source's `category` strings, verbatim, including the hyphen
spacing.

Chunk hashes change when Home Affairs rebuilds the app. Re-derive from the live practice
test, not from the hash above.

## Licence, quoted

### The website (which is where the practice questions are published)

From https://www.homeaffairs.gov.au/access-and-accountability/using-our-website/copyright-and-disclaimer
(retrieved 2026-09-07), quoted verbatim:

> "Copyright and trademarks are important parts of our website. You should keep them in
> mind when using our website.
>
> The Commonwealth of Australia owns all the material we produce. All material presented on
> this website is provided under a Creative Commons Attribution 3.0 Australia licence, with
> the exception of:
>
> - the Commonwealth Coat of Arms – terms of use are available at It's an Honour
> - our logo
> - materials specifically not provided under a Creative Commons attribution 3.0 Australia licence
> - content supplied by third parties.
>
> License details and conditions are available at Creative Commons Attribution 3.0 Australia.
>
> You should attribute material you get from this website as Australian Government
> Department of Home Affairs."

CC BY 3.0 AU permits reproduction, adaptation and commercial use, on condition of
attribution. That is what the licence says. It is not a legal opinion.

### The resource book (the study material behind the questions)

From *Australian Citizenship: Our Common Bond*
(https://immi.homeaffairs.gov.au/citizenship-subsite/files/our-common-bond-testable.pdf),
copyright page, verbatim:

> "© Commonwealth of Australia 2020
>
> With the exception of the Commonwealth Coat of Arms, all material presented in this
> publication is provided under a Creative Commons Attribution 4.0 International license
> at https://creativecommons.org/licenses/by/4.0/legalcode.
>
> This means this license only applies to material as set out in this document."
>
> "Enquiries regarding the licence and any use of this document are welcome at: Portfolio
> Media and Engagement Branch, Department of Home Affairs, PO Box 25, BELCONNEN ACT 2616"

So the study material is CC BY 4.0 — an explicit, commercial-use-permitted licence with
attribution — and Home Affairs names a contact for licence enquiries.

### Attribution we must carry

- Questions: **Australian Government Department of Home Affairs** (the wording the
  department's own copyright page specifies), with a link to the practice test.
- Any Our Common Bond material: same attribution, plus the CC BY 4.0 link.
- The department's **logo and the Commonwealth Coat of Arms are excluded from both
  licences**. Do not use either, anywhere. See also the non-affiliation disclaimer
  requirement in `docs/LEGAL_REVIEW.md` §2.

## Open questions for counsel — do not resolve these ourselves

1. **Subdomain coverage.** The copyright notice covers "this website". The practice
   questions are served from `citizenshippracticetest.homeaffairs.gov.au`, a Home Affairs
   subdomain that carries **no copyright footer of its own**. `immi.homeaffairs.gov.au`
   does footer-link to the same "Copyright and disclaimer" page. Confirm the CC BY 3.0 AU
   grant reaches the practice-test app, ideally in writing from
   comms@homeaffairs.gov.au — the same address the copyright page nominates.
2. **The "specifically not provided" exception.** The notice excludes "materials
   specifically not provided under a Creative Commons attribution 3.0 Australia licence".
   We found no such marking on or around the practice test, but absence of a marking is
   not a grant. Same enquiry covers it.
3. **Non-endorsement.** CC BY does not permit implying endorsement. Our labelling must say
   the questions are the department's official practice questions *and* that the app is
   independent. Do not use the words "official app".

The pack records this as `licence.reviewStatus: "pending-legal-review"`. Ship nothing to
users under this pack until that field changes.

## Test mechanics (all quoted from primary sources)

From https://immi.homeaffairs.gov.au/citizenship/test-and-interview/learn-about-citizenship-interview-and-test/learn-about-citizenship-test:

> "To pass the test you must:
> - answer 20 multiple choice questions
> - answer 5/5 (100%) of the Australian values questions correctly
> - achieve an overall mark of at least 15/20 (75%)."
>
> "You will have 45 minutes to complete the test."
>
> "There is no extra cost to sit the citizenship test. The citizenship application fee that
> you paid includes the test."

The four testable parts, from *Our Common Bond* p.3:

> "- Part 1—Australia and its people
> - Part 2—Australia's democratic beliefs, rights and liberties
> - Part 3—Government and the law in Australia
> - Part 4—Australian values"

(The practice test writes these with a hyphen rather than an em dash; the pack uses the
practice test's spelling because that is where the questions came from.)

The values rule is the sharp edge: five values questions, all five must be right. The pack
flags each values question with `valuesQuestion: true` and records the rule in
`valuesRule`. A practice mode that lets someone pass having missed a values question would
be teaching them something false.

## One thing to be careful about in marketing copy

*Our Common Bond* says, verbatim:

> "All of the information you need to sit the Australian citizenship test is in this book.
> You are not required to purchase or obtain other citizenship packages from any
> individuals or organisations in order to pass the citizenship test. The Department does
> not endorse or recommend any package that claims it will assist you to pass the
> citizenship test."

We may not claim, or imply, that the app is needed to pass, or that anyone endorses it.

## What was verified, and how

1. **Verbatim match against the live test.** Playwright/Chromium loaded
   `https://citizenshippracticetest.homeaffairs.gov.au/test/`, stepped through all 20
   questions, and read the rendered question text and radio-button labels from the DOM.
   All 20 rendered option sets matched the extracted data, and all 20 rendered question
   strings matched exactly. 20/20.
2. **Every stated answer is one of the stated options** — checked for all 20, in the
   generator and again in the validator.
3. **Part composition**: 5 + 5 + 5 + 5 across the four parts, matching the test's own
   structure and the 5-values-question rule.
4. **No question, option or answer text was authored, paraphrased or corrected by us.**
5. **Validator**: `python3 tools/validate-content-pack.py apps/us-citizenship/content/au/citizenship-practice.json`
   → PASS (2026-09-07). The validator was also run against deliberately broken copies
   (answer not among options, wrong `totalQuestions`, a pack claiming to be a full pool,
   duplicate question text, impossible pass mark) and failed each one, so PASS means
   something.

## Re-check before every release

- Reload the live practice test and re-run the verbatim diff. Home Affairs changes the
  practice questions without announcement.
- Re-read the copyright page; the licence version has moved before (website CC BY 3.0 AU,
  2020 book CC BY 4.0).
- Confirm *Our Common Bond* is still the 2020 edition.
