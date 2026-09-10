#!/usr/bin/env python3
"""Build the /guides section of prepareforcitizenship.com.

One source of truth: the GUIDES list below. Running this script writes

  site/public/guides.html              the index (served at /guides)
  site/public/guides/<slug>.html       one page per guide (served at /guides/<slug>)

and leaves everything else alone. The stylesheet is site/public/guides.css, written by
hand, and the hero images are site/public/guides/img/<slug>.png, rendered from the
X-article heroes in docs/marketing/x-articles/.

Why a script rather than eight hand-edited files: the pages share a hero, a rail, a
sources block and JSON-LD, and the first time one of those changed by hand the eight
copies would drift. Edit the data here, run the script, commit the output.

Facts in the guides come from USCIS's own pages, linked in each guide's `sources`. The
`checked` date is the day those pages were last read against the text. Re-read them and
bump the date before every release, as with /which-test.
"""
from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "site" / "public"
ORIGIN = "https://prepareforcitizenship.com"
CHECKED = "September 9, 2026"
CHECKED_ISO = "2026-09-09"

APP_STORE = "https://apps.apple.com/app/id6808512010"

# USCIS and other primary sources, by short key so a guide can cite several.
SRC = {
    "study": ("USCIS: Study for the Test",
              "https://www.uscis.gov/citizenship/find-study-materials-and-resources/study-for-the-test"),
    "updates": ("USCIS: Check for Test Updates",
                "https://www.uscis.gov/citizenship/find-study-materials-and-resources/check-for-test-updates"),
    "interview": ("USCIS: The Naturalization Interview and Test",
                  "https://www.uscis.gov/citizenship/learn-about-citizenship/the-naturalization-interview-and-test"),
    "exceptions": ("USCIS: Exceptions and Accommodations",
                   "https://www.uscis.gov/citizenship/exceptions-and-accommodations"),
    "policy": ("USCIS Policy Manual, Vol. 12, Part E, Ch. 2: English and Civics Testing",
               "https://www.uscis.gov/policy-manual/volume-12-part-e-chapter-2"),
    "scoring": ("USCIS: Scoring Guidelines for the U.S. Naturalization Test (PDF)",
                "https://www.uscis.gov/sites/default/files/document/guides/Scoring_Guidelines_for_the_U.S._Naturalization_Test.pdf"),
    "readvocab": ("USCIS: Reading test vocabulary (PDF)",
                  "https://www.uscis.gov/sites/default/files/document/guides/reading_vocab.pdf"),
    "writevocab": ("USCIS: Writing test vocabulary (PDF)",
                   "https://www.uscis.gov/sites/default/files/document/guides/writing_vocab.pdf"),
    "q128": ("USCIS: 2025 Civics Test, 128 Questions and Answers (PDF)",
             "https://www.uscis.gov/sites/default/files/document/questions-and-answers/2025-Civics-Test-128-Questions-and-Answers.pdf"),
    "q100": ("USCIS: 2008 Civics Test, 100 Questions and Answers",
             "https://www.uscis.gov/citizenship-resource-center/naturalization-test-and-study-resources/study-for-the-test/citizenship-resources-in-text-only-format"),
    "n648": ("USCIS: Form N-648, Medical Certification for Disability Exceptions",
             "https://www.uscis.gov/n-648"),
    "usc105": ("17 U.S.C. § 105: Subject matter of copyright: United States Government works",
               "https://www.copyright.gov/title17/92chap1.html#105"),
    "nga": ("National Governors Association: current governors", "https://www.nga.org/governors/"),
    "senate": ("United States Senate: senators", "https://www.senate.gov/senators/"),
    "house": ("U.S. House of Representatives: find your representative",
              "https://www.house.gov/representatives/find-your-representative"),
    "ceremonies": ("USCIS: Naturalization Ceremonies",
                   "https://www.uscis.gov/citizenship/learn-about-citizenship/naturalization-ceremonies"),
    "pmj5": ("USCIS Policy Manual, Vol. 12, Part J, Ch. 5: Administrative Naturalization Ceremonies",
             "https://www.uscis.gov/policy-manual/volume-12-part-j-chapter-5"),
    "whitehouse": ("The White House: the administration", "https://www.whitehouse.gov/administration/"),
    "speaker": ("U.S. House of Representatives: leadership", "https://www.house.gov/leadership"),
}

# ---------------------------------------------------------------------------------
# The guides. Body blocks are HTML strings; keep them plain (p, ul, ol, table).
# ---------------------------------------------------------------------------------

def p(text: str) -> str:
    return f"<p>{text}</p>"


def ul(*items: str) -> str:
    return "<ul>" + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def ol(*items: str) -> str:
    return "<ol>" + "".join(f"<li>{i}</li>" for i in items) + "</ol>"


def table(head: list[str], rows: list[list[str]]) -> str:
    th = "".join(f"<th>{h}</th>" for h in head)
    trs = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in r) + "</tr>" for r in rows)
    return f'<div class="doc-scroll"><table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>'


WHICH_TEST_CARD = {
    "slug": None,
    "href": "/which-test",
    "category": "The civics test",
    "title": "Which US civics test will I take, the 2008 or the 2025 version?",
    "excerpt": "It depends on the date USCIS received your N-400, not on your interview date. "
               "The two versions side by side, with the pass rules for each.",
    "image": "/guides/img/card/which-test.png",
}

GUIDES: list[dict] = [
    {
        "slug": "naturalization-interview",
        "category": "The interview",
        "title": "What actually happens in the naturalization interview",
        "excerpt": "The N-400 review, the English test, the civics questions and the form you walk "
                   "out with, in the order they happen.",
        "image": "2-interview",
        "lead": "Most of the anxiety about the citizenship interview comes from not knowing the shape "
                "of it. The shape is very consistent. Here is what happens, in order, and what each "
                "part is really testing.",
        "sections": [
            ("Before you sit down", [
                p("You check in, show your appointment notice and green card, and wait. Bring the "
                  "originals of anything you uploaded or mailed: passport, green card, tax transcripts, "
                  "and for marriage-based cases, evidence that the marriage is real."),
                p("Many recent applicants report that the officer reviewed only what had been uploaded to "
                  "the USCIS online account and never opened the paper binder. Upload your recent evidence "
                  "there before the interview, and bring the binder anyway."),
            ]),
            ("Step 1: the oath and your N-400", [
                p("The officer places you under oath, then goes through your application with you, page by "
                  "page. This is the longest part and it does two jobs at once. It confirms your answers "
                  "are still true and asks what has changed since you filed: trips abroad, addresses, "
                  "jobs, any arrests or citations. And it is the spoken English test. USCIS says the "
                  "officer evaluates your ability to speak and understand English throughout the "
                  "eligibility interview."),
                p("Answer plainly and truthfully. If something has changed, say so. If you do not "
                  "understand a question, ask the officer to repeat or rephrase it. That is normal and "
                  "allowed."),
            ]),
            ("Step 2: reading and writing", [
                p("The officer shows you a sentence to read aloud. You must read one sentence correctly, "
                  "and you get up to three tries with different sentences. Then the officer dictates a "
                  "sentence and you write it down, again one correct out of up to three. The vocabulary "
                  "comes from USCIS's published reading and writing lists, and the sentences are short "
                  "and civic."),
                p("Applicants report sentences such as <em>Who can vote in federal elections?</em> for "
                  "reading and <em>Only U.S. citizens can vote in federal elections.</em> for writing. "
                  "That is the register. The <a href=\"/guides/english-test\">English test guide</a> "
                  "covers exactly how it is scored."),
            ]),
            ("Step 3: the civics questions", [
                p("The officer asks the civics questions out loud, one at a time, and you answer from "
                  "memory. You do not read them and you do not need full sentences; a few words is fine. "
                  "Any answer on USCIS's accepted list counts, and you only need one of them."),
                p("The officer stops as soon as the result is decided. On the 2008 test that is 6 right "
                  "or 5 wrong out of up to 10. On the 2025 test it is 12 right or 9 wrong out of up to "
                  "20. <a href=\"/which-test\">Which version you get</a> depends on when USCIS received "
                  "your N-400, before or after October 20, 2025."),
            ]),
            ("Step 4: the result", [
                p("At the end you receive Form N-652, Naturalization Interview Results. It tells you "
                  "whether you passed the English and civics tests and whether your case is approved, "
                  "continued, or denied. <strong>Continued</strong> usually means the officer needs a "
                  "document or a supervisor's review. It is not a denial."),
                p("If you fail either test, USCIS schedules a second interview between 60 and 90 days "
                  "after the first, and you retake only the part you failed. The test version stays the "
                  "same as the first time."),
            ]),
            ("How long it takes", [
                p("Applicants commonly report 20 to 30 minutes in the room. The civics part is often the "
                  "shortest, because a strong start ends it early."),
            ]),
            ("How to prepare for the shape of it", [
                p("Say the answers out loud, not just in your head. Practice in the real format, with the "
                  "real question count and pass line for your version, so that stopping early feels normal "
                  "rather than alarming. And hear the questions spoken before your interview. The first "
                  "time should not be in that chair."),
            ]),
        ],
        "faq": [
            ("What form do I get at the end of the naturalization interview?",
             "Form N-652, Naturalization Interview Results. It records whether you passed the English and "
             "civics tests and whether your case is approved, continued, or denied."),
            ("What happens if I fail the civics test at my interview?",
             "USCIS schedules a second interview between 60 and 90 days after the first. You retake only "
             "the part you failed, on the same test version as the first time."),
            ("Can I ask the officer to repeat a question?",
             "Yes. Asking the officer to repeat or rephrase a question is normal and allowed, and it does "
             "not count against you."),
        ],
        "sources": ["interview", "scoring", "study", "updates"],
        "related": ["which-test", "english-test", "one-answer"],
    },
    {
        "slug": "state-questions",
        "category": "State answers",
        "title": "Four civics answers depend on where you live, and they change on election night",
        "excerpt": "Your governor, one of your US senators, your representative and your state capital: "
                   "what to answer, including in DC and the territories, and when to re-check.",
        "image": "3-state",
        "lead": "Most of the civics test has one right answer for everyone. Four questions do not. They "
                "depend on where you live, they are the ones generic study lists get wrong, and they are "
                "the ones most likely to change between the day you start studying and the day of your "
                "interview.",
        "sections": [
            ("The four questions", [
                p("Both the 2008 and the 2025 tests ask:"),
                ol("Who is the governor of your state now?",
                   "Who is one of your state's US senators now?",
                   "Name your US representative.",
                   "What is the capital of your state?"),
                p("USCIS's answer key for each of these reads <em>answers will vary</em>. The officer has "
                  "the correct answer for your address, and it has to be current."),
            ]),
            ("What \"current\" means", [
                p("Governors, senators and representatives change in bulk on election night, and the new "
                  "ones take office over the following weeks. Senators and representatives are sworn in on "
                  "January 3. Governors follow their own state's schedule, mostly in January. Someone with "
                  "an interview in late January after a November election is in the window where a study "
                  "list printed in the summer is wrong."),
                p("The next such night is November 3, 2026. If your interview is in the months after it, "
                  "check your three officials the week of the interview against the primary sources: the "
                  "National Governors Association for governors, senate.gov for senators, and house.gov "
                  "for your representative. Do not trust a list you downloaded months ago, including "
                  "ours. Check."),
            ]),
            ("Which senator?", [
                p("The question says <em>one of</em>. Either of your state's two senators is a correct "
                  "answer. Learn both, name whichever comes to you first."),
            ]),
            ("If you live in Washington, DC", [
                p("DC is not a state, and USCIS prints the accepted answers right under the questions:"),
                ul("<strong>Governor:</strong> DC does not have a governor.",
                   "<strong>Senators:</strong> DC has no US senators.",
                   "<strong>Capital:</strong> DC is not a state and does not have a capital."),
                p("Those are correct answers, not excuses. An officer will not mark you down for them."),
            ]),
            ("If you live in Puerto Rico, Guam, the US Virgin Islands, American Samoa or the Northern Mariana Islands", [
                p("You do have a governor, so name them. For senators, the accepted answer is that your "
                  "territory has no US senators. For your representative, you may name your territory's "
                  "delegate or resident commissioner, or state that the territory has no voting "
                  "representative in Congress. Your capital is your territory's capital."),
            ]),
            ("Why this matters more than it sounds", [
                p("These four questions are the difference between a study tool and a study list. A wrong "
                  "governor in a study app is not a typo. It is a wrong answer at an interview someone "
                  "waited years for. That is why the officials in our study material are cross-checked "
                  "against the National Governors Association, senate.gov and house.gov before every "
                  "release, and why they update from our server rather than waiting for an app update."),
                p("Pick your state or territory once, and every state-dependent answer follows."),
            ]),
        ],
        "faq": [
            ("What do I answer for \"Who is the governor of your state?\" if I live in Washington, DC?",
             "The accepted USCIS answer is that DC does not have a governor. DC residents also answer that "
             "DC has no US senators and that DC is not a state and does not have a capital."),
            ("Do I need to know both of my state's US senators?",
             "No. The question asks for one of your state's US senators, so either one is a correct answer."),
            ("Do residents of Puerto Rico or Guam have a governor for the civics test?",
             "Yes. The territories have governors, so name yours. For the senator question, the accepted "
             "answer is that the territory has no US senators."),
        ],
        "sources": ["q128", "q100", "nga", "senate", "house"],
        "related": ["which-test", "how-to-study", "one-answer"],
    },
    {
        "slug": "age-rules",
        "category": "Exceptions",
        "title": "Older applicants take a different test. Here are the three age rules.",
        "excerpt": "At 50/20 and 55/15 there is no English test. At 65/20 the civics test shrinks to a "
                   "bank of 20. What each rule means and what still applies.",
        "image": "4-age-rules",
        "lead": "Every few days someone posts a version of the same worry: my mother is 68, her English "
                "is limited, will she fail the interview? Very often the answer is that she is not taking "
                "the test they are imagining. USCIS has three age-and-residency rules that change what "
                "older applicants face, and they are not widely understood.",
        "sections": [
            ("The three rules", [
                p("Age and years as a lawful permanent resident are both counted as of the date you file "
                  "the N-400."),
                table(["You are", "And have been a permanent resident", "English test", "Civics test"], [
                    ["50 or older", "20 years or more", "Exempt", "Required, in your own language"],
                    ["55 or older", "15 years or more", "Exempt", "Required, in your own language"],
                    ["65 or older", "20 years or more", "Exempt", "Shorter version, in your own language"],
                ]),
            ]),
            ("50/20 and 55/15: no English test", [
                p("If you meet either rule, you skip the English reading, writing and speaking tests "
                  "entirely. You still take the civics test, but you may take it in the language of your "
                  "choice. USCIS asks you to bring a qualified interpreter to the interview for that."),
                p("The civics test itself is the full version for your filing date: the 2008 pool if "
                  "USCIS received your N-400 before October 20, 2025, the 2025 pool if on or after."),
            ]),
            ("65/20: the shorter civics test", [
                p("If you are 65 or older with 20 or more years as a permanent resident, you also skip the "
                  "English test, and your civics test is drawn from a specially marked bank of 20 "
                  "questions instead of the full pool. The officer asks up to 10 of them and you need 6 "
                  "correct. USCIS marks these questions on its own lists, and they are marked in our "
                  "study material, so you can study just those 20."),
                p("Which bank of 20 you get, 2008 or 2025, still follows your N-400 received date."),
            ]),
            ("What does not change", [
                p("The interview still happens in person, and the officer still goes through the N-400 "
                  "with you, through an interpreter where the exemption applies. The oath of allegiance "
                  "is still required. The exemptions are about the tests, not the process."),
            ]),
            ("A fourth route: medical exceptions", [
                p("Separately from age, an applicant with a physical or developmental disability or a "
                  "mental impairment that prevents them from learning English or civics can request an "
                  "exception on Form N-648, completed by a licensed medical professional. This is a "
                  "medical and legal matter, not a study matter, and belongs with a lawyer."),
            ]),
            ("What this means for the family", [
                p("If you are helping a parent prepare, do these in order."),
                ol("Check the received date on the I-797C to fix the version.",
                   "Check their age and years as a resident on that date against the table above.",
                   "If they qualify for 65/20, study only the marked 20 questions, in the language they "
                   "will answer in."),
                p("Twenty questions is a very different project from 128."),
            ]),
        ],
        "faq": [
            ("What is the 50/20 rule for the citizenship test?",
             "If you are 50 or older at filing and have been a lawful permanent resident for 20 years or "
             "more, you are exempt from the English test and may take the civics test in your own "
             "language with an interpreter you bring."),
            ("What is the 55/15 rule for the citizenship test?",
             "If you are 55 or older at filing and have been a lawful permanent resident for 15 years or "
             "more, you are exempt from the English test and may take the civics test in your own "
             "language with an interpreter you bring."),
            ("What is the 65/20 rule for the citizenship test?",
             "If you are 65 or older at filing and have been a lawful permanent resident for 20 years or "
             "more, you are exempt from the English test and take a shorter civics test: up to 10 "
             "questions from a marked bank of 20, with 6 correct to pass."),
            ("Does a 50/20 or 55/15 applicant still take the civics test?",
             "Yes. The English exemptions do not remove the civics test. It is the full test for your "
             "filing date, taken in the language of your choice."),
        ],
        "sources": ["exceptions", "policy", "n648", "study"],
        "related": ["which-test", "english-test", "how-to-study"],
    },
    {
        "slug": "how-to-study",
        "category": "How to study",
        "title": "How to study for the civics test in the time you actually have",
        "excerpt": "Fix your version, learn topics instead of numbers, fill in your state answers, pick one "
                   "answer per question and practice out loud.",
        "image": "5-study-method",
        "lead": "The default way to study for the civics test is to open the official list at question 1 "
                "and work down. It is also the slowest way, and for most people it is why the last forty "
                "questions never quite stick. Here is a method that works in the weeks between the "
                "interview notice and the interview.",
        "sections": [
            ("Step 1: fix your version before you learn a single answer", [
                p("Which test you take depends on when USCIS received your N-400. Before October 20, "
                  "2025: the 2008 test, 100 questions. On or after: the 2025 test, 128 questions. The date "
                  "is on your I-797C receipt notice. People have spent months on the wrong list. Ten "
                  "seconds here saves all of that. <a href=\"/which-test\">The two versions, side by "
                  "side.</a>"),
            ]),
            ("Step 2: learn topics, not numbers", [
                p("The questions are not 128 separate facts. They cluster into a small number of topics: "
                  "the Constitution and what it does, the three branches and who runs each, rights and "
                  "amendments, the colonial period and independence, the 1800s, the 1900s, geography, and "
                  "symbols and holidays."),
                p("Study one cluster at a time until it holds together as a story, then move on. When you "
                  "understand that the Constitution sets up three branches and each branch checks the "
                  "others, five or six questions answer themselves. When you know the Declaration was 1776 "
                  "and the Constitution was 1787, the dates stop being random."),
            ]),
            ("Step 3: fill in your state answers early", [
                p("Four questions depend on where you live: your governor, one of your US senators, your "
                  "US representative, and your state capital. No generic list has these right for you, "
                  "and they change after elections. Look them up on the primary sources and check them "
                  "again the week of the interview. <a href=\"/guides/state-questions\">The state "
                  "questions, including DC and the territories.</a>"),
            ]),
            ("Step 4: pick one answer and drill it", [
                p("Many questions accept several answers and you need only one. Do not try to memorize "
                  "every accepted answer. Choose the one that comes most naturally to you and make that "
                  "your answer, every time. Consistency beats coverage. <a href=\"/guides/one-answer\">"
                  "How the answer key works.</a>"),
            ]),
            ("Step 5: practice in the real format, out loud", [
                p("The officer asks spoken questions and stops as soon as you have passed: 6 right on the "
                  "2008 test, 12 on the 2025 test. Practice that way. Take timed practice tests with the "
                  "real question count and the real pass line, and answer out loud rather than in your "
                  "head. The interview is a spoken test, and the first time you hear the questions spoken "
                  "should not be in the interview room."),
            ]),
            ("Step 6: use your results, not your feelings", [
                p("After each practice test, look at which topics you missed and go back to those clusters "
                  "only. Do not restart from question 1. A readiness figure is only useful if it comes "
                  "from tests you actually took, so ignore any app that shows you a score before you have "
                  "answered anything."),
            ]),
            ("A realistic schedule", [
                p("Three weeks is comfortable for most people: one week on government, one on history, and "
                  "one on rights, geography, symbols and practice tests. With one week, do steps 1, 3, 4 "
                  "and 5 and study the topics you miss most. With one day, do the practice tests and learn "
                  "your state answers."),
            ]),
        ],
        "faq": [
            ("How long does it take to study for the US civics test?",
             "Three weeks is comfortable for most people: one week on government, one on history, and one "
             "on rights, geography, symbols and practice tests. With less time, fix your version, learn "
             "your state answers, pick one answer per question and take practice tests."),
            ("Should I memorize every accepted answer to a civics question?",
             "No. For questions that ask for one thing, one accepted answer is a full mark. Choose the "
             "answer that comes most naturally to you and give it every time."),
        ],
        "sources": ["study", "q128", "q100"],
        "related": ["which-test", "state-questions", "one-answer"],
    },
    {
        "slug": "public-domain",
        "category": "The questions",
        "title": "The civics questions are public domain. Nobody should be renting them to you by the week.",
        "excerpt": "USCIS wrote the questions, and works of the US government cannot be copyrighted. What "
                   "the subscription apps are actually selling, and what we did instead.",
        "image": "6-public-domain",
        "lead": "Here is something most people preparing for the citizenship test do not know. The 128 "
                "questions on the 2025 civics test, and the 100 on the 2008 test, were written by USCIS, a "
                "US federal agency. Under US copyright law, works produced by the federal government are "
                "not eligible for copyright. The questions and their accepted answers are in the public "
                "domain. Anyone can use them, print them, or build with them.",
        "sections": [
            ("Free at the source", [
                p("USCIS publishes the questions free, as PDFs and on its website, and it publishes the "
                  "reading and writing vocabulary lists the same way. There is nothing to license."),
            ]),
            ("So what are the apps selling?", [
                p("Open the citizenship category on the App Store and the top results charge "
                  "subscriptions, some of them weekly. The content they are charging for is the same "
                  "public list. What you are paying for is the packaging: flashcards, a quiz, a progress "
                  "bar. Some of that packaging is good. None of it justifies a recurring charge for a test "
                  "you take once."),
                p("Weekly subscriptions in this category rely on one thing: people forget to cancel after "
                  "the interview. The customer who passed and moved on with their life keeps paying for a "
                  "test they will never take again. That is the business model, and it is aimed at people "
                  "at the end of a long and expensive process."),
            ]),
            ("What we did instead", [
                p("Every official question is free, in both versions, with no account, no ads and no "
                  "tracking in the iPhone app, and free with an account in the browser. That includes "
                  "study by topic, the state-specific answers for where you live, and the questions read "
                  "aloud so you hear them before your interview. It stays free whether or not anyone ever "
                  "pays."),
                p("Two things are paid: unlimited practice tests in the real format and the full mock "
                  "interview. They are a single purchase of $9.99, once, plus local tax where it applies. "
                  "There is no subscription to forget to cancel. That one purchase is what pays for the "
                  "servers and for keeping the officials current."),
            ]),
            ("The part that is actually work", [
                p("If the questions are free, what takes effort? Keeping them right. Four questions depend "
                  "on your state, and the answers change after every election. We cross-check governors "
                  "against the National Governors Association and national officeholders against "
                  "senate.gov, house.gov, whitehouse.gov and supremecourt.gov before each release, and "
                  "the names update from our server without waiting for an app update. That is the part "
                  "of a study tool that earns trust, and it is not the part anyone should be charging "
                  "weekly for."),
            ]),
            ("One caution about \"free\" material", [
                p("The question text is public domain. Photographs and illustrations inside USCIS's study "
                  "booklets sometimes are not, because USCIS licenses them from third parties. If you are "
                  "building or sharing study material yourself, that distinction matters. The words are "
                  "yours to use. The pictures may not be."),
            ]),
            ("What to do with this", [
                p("If you are paying a subscription for flashcards, cancel it. The official list is free "
                  "from USCIS, and it is free from us with the packaging included. Spend the money on a "
                  "nice dinner after the oath ceremony."),
            ]),
        ],
        "faq": [
            ("Are the US citizenship test questions copyrighted?",
             "No. The civics questions are written by USCIS, a US federal agency, and under 17 U.S.C. § 105 "
             "works of the United States Government are not eligible for copyright. The questions and "
             "accepted answers are in the public domain."),
            ("Do I have to pay to study the official citizenship test questions?",
             "No. USCIS publishes them free, and both the 2008 and 2025 versions are free to study here, in "
             "the browser or the iPhone app."),
        ],
        "sources": ["usc105", "q128", "q100", "study"],
        "related": ["which-test", "how-to-study"],
    },
    {
        "slug": "one-answer",
        "category": "The answer key",
        "title": "You only need one answer. 41 of the 128 questions accept four or more.",
        "excerpt": "How the USCIS answer key works, what \"name one\" really means, and why it should change "
                   "how you study.",
        "image": "7-one-answer",
        "lead": "A lot of people study the civics test as if every listed answer were required. They see "
                "\"Name one power of the president\" followed by six answers and try to memorize all "
                "six. That is more than double the work the test asks for, and it is the main reason the "
                "list feels so long.",
        "sections": [
            ("How the answer key actually works", [
                p("For each question USCIS publishes a list of accepted answers. The officer accepts any "
                  "answer on that list. If the question asks for one thing, one accepted answer is a full "
                  "mark. If it asks for two or three, you need that many, and any two or three from the "
                  "list will do."),
                p("On the 2025 test, 41 of the 128 questions accept four or more answers. Some examples, "
                  "straight from the key:"),
                ul("<strong>Name one power of the president.</strong> Six accepted answers: signs bills "
                   "into law, vetoes bills, enforces laws, Commander in Chief, chief diplomat, appoints "
                   "federal judges. You need one.",
                   "<strong>Many documents influenced the US Constitution. Name one.</strong> Eight "
                   "accepted answers, from the Declaration of Independence to the Mayflower Compact to the "
                   "Iroquois Great Law of Peace. You need one.",
                   "<strong>What are two Cabinet-level positions?</strong> Twenty-two accepted answers, "
                   "every Cabinet secretary plus the Vice President and several agency heads. You need two.",
                   "<strong>Name one power that is only for the states.</strong> Five accepted answers, "
                   "including providing schooling, issuing driver's licenses, and approving zoning. You "
                   "need one.",
                   "<strong>What is the rule of law?</strong> Four accepted phrasings, all of which mean "
                   "no one is above the law. Any one counts."),
            ]),
            ("What this means for studying", [
                p("Pick your answer. For each multi-answer question, choose the single accepted answer that "
                  "is easiest for you to remember and say, and make it your answer every time. For the "
                  "president's powers, \"signs bills into law\" is a perfectly good permanent answer. For "
                  "documents that influenced the Constitution, \"Declaration of Independence\" is one you "
                  "already know."),
                p("You are allowed to be boring. Nobody gets extra credit for \"Iroquois Great Law of "
                  "Peace.\" You get the same mark for the answer you will not forget under pressure."),
                p("For \"name two\" and \"name three\" questions, learn one more than required, so a blank "
                  "on one of them does not sink you."),
            ]),
            ("Read the question for the number", [
                p("The one trap here is answering with fewer than asked. \"What are three rights of everyone "
                  "living in the United States?\" needs three. Six are accepted, including freedom of "
                  "speech, freedom of religion and freedom of assembly. Give three, then stop."),
            ]),
            ("Watch the wording, not just the number", [
                p("A few questions look similar but ask different things. \"Name one power that is only for "
                  "the federal government\" and \"Name one power that is only for the states\" sit next to "
                  "each other, and the answers do not overlap. Declaring war is federal. Issuing driver's "
                  "licenses is a state power. Learn them as a pair."),
            ]),
            ("The four that vary by person", [
                p("The state-specific questions, your governor, one of your senators, your representative "
                  "and your state capital, are marked \"answers will vary\" on the key. The officer has "
                  "your correct answer. For the senator question, either of your state's two senators "
                  "counts. <a href=\"/guides/state-questions\">The state questions in full.</a>"),
                p("In our study material every accepted answer is shown, and you can pick the one you want "
                  "to drill, so your practice tests reflect the answer you will actually give."),
            ]),
        ],
        "faq": [
            ("Do I need to give every answer listed for a civics question?",
             "No. If the question asks for one thing, any one answer on USCIS's accepted list is a full "
             "mark. If it asks for two or three, give that many."),
            ("How many civics questions accept more than one answer?",
             "On the 2025 test, 41 of the 128 questions accept four or more answers, and many more accept "
             "two or three."),
        ],
        "sources": ["q128", "q100", "scoring"],
        "related": ["how-to-study", "state-questions", "which-test"],
    },
    {
        "slug": "english-test",
        "category": "The English test",
        "title": "The English test is smaller than you fear: one sentence read, one sentence written",
        "excerpt": "Exactly what the reading, writing and speaking parts ask, how strictly USCIS scores "
                   "them, and who is exempt.",
        "image": "8-english-test",
        "lead": "The English test is where the anxiety concentrates, especially for applicants who speak "
                "English well enough for daily life but have never been tested on it. The reality is "
                "narrower than most people imagine. The test is the same for the 2008 and 2025 civics "
                "versions.",
        "sections": [
            ("The three parts", [
                p("The English requirement has three components: speaking, reading and writing."),
                p("<strong>Speaking</strong> is not a separate exercise. The officer evaluates it throughout "
                  "the interview, as they go through your N-400 with you and ask about your application. "
                  "If you can understand the questions and answer them, you are passing the speaking test. "
                  "You may ask the officer to repeat or rephrase."),
                p("<strong>Reading.</strong> The officer shows you a sentence and asks you to read it "
                  "aloud. You must read one sentence correctly. If you miss the first, you get a second, "
                  "and if needed a third. One correct reading out of up to three passes. The words come "
                  "from USCIS's published reading vocabulary list, which is short and civic: words like "
                  "citizens, Congress, President, vote, country, government, right, and question words "
                  "such as who, what, when, where and how."),
                p("<strong>Writing.</strong> The officer reads a sentence aloud and you write it down. "
                  "Again, one correct sentence out of up to three. The words come from USCIS's published "
                  "writing vocabulary list, which overlaps heavily with the reading list and adds a few "
                  "more nouns and verbs."),
                p("Applicants report sentences such as <em>Who can vote in federal elections?</em> for "
                  "reading and <em>Only U.S. citizens can vote in federal elections.</em> for writing. That "
                  "is the register: short, civic, built from the lists."),
            ]),
            ("How strictly it is scored", [
                p("USCIS's own scoring guidelines are more forgiving than people expect."),
                p("For reading, you pass if you read the sentence in a way that conveys its meaning. You "
                  "may skip short words, and pronunciation or intonation errors that do not change the "
                  "meaning are acceptable. You fail a sentence if you omit a content word, substitute a "
                  "word, or pause so long that the sentence does not come through."),
                p("For writing, you pass if the sentence has the same meaning as the one dictated. "
                  "Spelling, capitalization and punctuation errors that do not change the meaning are "
                  "acceptable. You fail a sentence if you write a different sentence, omit a content word, "
                  "abbreviate, or write nothing."),
                p("In other words, <em>Only U S citizens can vote in federal elections</em> with a missing "
                  "period and a spelling slip is a pass. <em>Citizens vote</em> is not."),
            ]),
            ("Who does not take it", [
                p("If you are 50 or older with 20 years as a permanent resident, or 55 or older with 15 "
                  "years, you are exempt from the English test and take civics in your own language. The "
                  "65/20 rule adds a shorter civics test. A medical exception on Form N-648 is a separate "
                  "route through a doctor and a lawyer. <a href=\"/guides/age-rules\">The age rules in "
                  "full.</a>"),
            ]),
            ("How to prepare", [
                p("Print the two USCIS vocabulary lists and read every word aloud. Have someone dictate "
                  "sentences built from the writing list and write them by hand, the way you will at the "
                  "interview, since you will be writing on paper or a tablet, not typing. Then read your "
                  "civics answers aloud too. The same vocabulary is on both tests, and hearing yourself "
                  "say Congress, President and the Constitution a hundred times in practice is what makes "
                  "the interview room feel ordinary."),
            ]),
            ("If you fail one part", [
                p("You are retested only on the part you failed, at a second interview between 60 and 90 "
                  "days after the first. The civics test does not have to be repeated if you passed it."),
            ]),
        ],
        "faq": [
            ("How many sentences do I have to read at the citizenship interview?",
             "One, correctly. The officer gives you up to three sentences, and reading one of them "
             "correctly passes the reading test."),
            ("How many sentences do I have to write at the citizenship interview?",
             "One, correctly. The officer dictates up to three sentences, and writing one of them "
             "correctly passes the writing test."),
            ("Do spelling mistakes fail the writing test?",
             "Not by themselves. Under USCIS's scoring guidelines, spelling, capitalization and "
             "punctuation errors that do not change the meaning of the sentence are acceptable."),
            ("Where do the English test words come from?",
             "From USCIS's published reading test vocabulary and writing test vocabulary lists, both free "
             "on uscis.gov."),
        ],
        "sources": ["interview", "scoring", "readvocab", "writevocab", "exceptions"],
        "related": ["naturalization-interview", "age-rules", "which-test"],
    },
]


D2 = dict(published="September 10, 2026", published_iso="2026-09-10", checked="September 10, 2026")

GUIDES += [
    {
        **D2,
        "slug": "oath-ceremony",
        "category": "The oath ceremony",
        "title": "You passed. Here is what happens at the oath ceremony.",
        "excerpt": "The N-445 notice, the questionnaire on the back, what you hand in, what you get, and "
                   "the three things to do in the week after.",
        "lead": "Passing the interview is not the end. You are not a US citizen until you take the Oath "
                "of Allegiance at a naturalization ceremony, and the ceremony has its own paperwork, its own "
                "order of events and a few traps. Here is the whole thing, from the notice to the passport.",
        "sections": [
            ("The notice", [
                p("Some offices can swear you in the same day as your interview. If not, USCIS mails Form "
                  "N-445, Notice of Naturalization Oath Ceremony, with the date, time and place. On the back is "
                  "a short questionnaire about what has happened since your interview: travel outside the "
                  "country, arrests, changes in marital status and the like. Fill it in before you arrive, "
                  "truthfully. An officer reviews your answers at check-in."),
                p("If you cannot attend, return the N-445 to your local USCIS office with a letter asking for a "
                  "new date and explaining why. Do not simply skip it."),
            ]),
            ("Two kinds of ceremony", [
                p("In an administrative ceremony, USCIS itself administers the oath. In a judicial ceremony, a "
                  "court does. Which one you get depends on your district. The oath and the certificate are "
                  "the same either way."),
            ]),
            ("What to bring, what you hand in", [
                p("Bring the N-445 and your green card. You must return your Permanent Resident Card to USCIS "
                  "when you check in. You will not need it again, because you leave with a Certificate of "
                  "Naturalization instead. Dress as you would for something that matters."),
            ]),
            ("The order of events", [
                p("USCIS standardizes administrative ceremonies, so most follow the same program: a short "
                  "film, the national anthem, welcoming remarks, the call of countries, where each country "
                  "represented in the room is named and its new citizens stand, then the Oath of Allegiance "
                  "itself. After the oath come remarks from USCIS leadership or a guest, a recorded "
                  "congratulatory message, the Pledge of Allegiance, and the presentation of certificates."),
                p("You will have the text of the oath and the pledge in front of you to repeat. Nobody expects "
                  "you to know them by heart."),
            ]),
            ("The certificate", [
                p("The Certificate of Naturalization, Form N-550, is your proof of citizenship. Check it "
                  "before you leave the room: name, date of birth, spelling. USCIS asks you to report any "
                  "error before leaving the ceremony, because fixing it later is a separate application. If "
                  "you ever lose it, the replacement is Form N-565, and it is slow, so store the original "
                  "somewhere safe and keep copies."),
            ]),
            ("The week after", [
                ol("<strong>Passport.</strong> You receive a US passport application at the ceremony. Your "
                   "certificate is the proof of citizenship it needs. Leave enough time between the ceremony "
                   "and any planned travel to get the passport back.",
                   "<strong>Vote.</strong> Voter registration applications are handed out at the ceremony after "
                   "the oath. Registering is the first thing citizenship lets you do that a green card did not.",
                   "<strong>Social Security.</strong> Update your record with the Social Security Administration "
                   "using Form SS-5, by mail or in person. USCIS says to wait at least ten days after the "
                   "ceremony so its records have reached SSA."),
            ]),
        ],
        "faq": [
            ("Am I a US citizen as soon as my N-400 is approved?",
             "No. You become a citizen when you take the Oath of Allegiance at a naturalization ceremony. Until "
             "then you are still a permanent resident."),
            ("Do I have to give up my green card at the oath ceremony?",
             "Yes. You must return your Permanent Resident Card to USCIS when you check in for the ceremony. "
             "You receive a Certificate of Naturalization after the oath."),
            ("What should I do if my Certificate of Naturalization has a mistake?",
             "Tell USCIS before you leave the ceremony. Fixing an error afterward requires a separate "
             "application, Form N-565."),
        ],
        "sources": ["ceremonies", "pmj5", "interview"],
        "related": ["naturalization-interview", "if-you-fail", "which-test"],
    },
    {
        **D2,
        "slug": "if-you-fail",
        "category": "If you fail",
        "title": "Failed part of the test? Exactly what happens next.",
        "excerpt": "Two chances, a second interview 60 to 90 days later, only the part you missed, and what a "
                   "second failure means, all from USCIS's own policy.",
        "lead": "Failing a part of the naturalization test feels final in the room. It is not. USCIS policy "
                "gives every applicant two attempts, and the rules for the second one are written down. Here "
                "they are, without the folklore.",
        "sections": [
            ("You get two attempts", [
                p("USCIS's Policy Manual is plain about it: an applicant has two opportunities to pass the "
                  "English and civics tests, the initial examination and a re-examination. Failing any part "
                  "at the first interview does not end your application."),
            ]),
            ("The second interview is 60 to 90 days later", [
                p("If you fail any portion of the English test, the civics test, or all of them, USCIS "
                  "schedules a second examination between 60 and 90 days after the first. You get a new "
                  "appointment notice. Treat the gap as study time, not waiting time."),
            ]),
            ("You retake only what you failed", [
                p("The re-examining officer tests only the portion you did not pass. Pass the reading, "
                  "speaking and civics tests but miss the writing? At the second interview you take only the "
                  "writing test. Pass English but fail civics? Only civics, on the same test version as the "
                  "first time, with a different set of questions. USCIS requires the officer to use different "
                  "test forms from the first interview, so memorizing the specific questions you were asked "
                  "does not help; learning the topic does."),
            ]),
            ("Do not miss the second appointment", [
                p("Unless USCIS excuses it, failing to appear for the re-examination, or declining to take the "
                  "test at it, counts as a failed attempt. If you cannot make the date, contact USCIS before "
                  "it, not after."),
            ]),
            ("What a second failure means", [
                p("If you fail any portion of the tests after two attempts, USCIS denies the naturalization "
                  "application. That is a denial of the application, not a permanent bar: you can file a new "
                  "N-400, with a new fee, and start again. You can also request a hearing on the denial, and "
                  "at that hearing an officer administers the failed portion of the test again. Which route "
                  "makes sense for you is a question for your lawyer, and this guide stops there."),
            ]),
            ("What you leave the room with", [
                p("At the end of every interview the officer hands you Form N-652, Naturalization Interview "
                  "Results. It states which tests you passed and failed and whether the case is approved, "
                  "continued or denied. Read it before you leave. It is the document that tells you exactly "
                  "what you need to study."),
            ]),
            ("How to use the 60 days", [
                p("Failed civics? Take timed practice tests in the real format, with the real question count "
                  "and pass line for your version, and answer out loud. Look at which topics you miss and study "
                  "those. Failed reading or writing? Print USCIS's vocabulary lists, read every word aloud and "
                  "have someone dictate sentences built from the writing list. Failed speaking? Practice "
                  "answering the N-400 questions about your own life in English, out loud, with someone who "
                  "will not help you."),
            ]),
        ],
        "faq": [
            ("How many times can you take the US citizenship test?",
             "Two. USCIS gives every applicant an initial examination and one re-examination. Failing any "
             "portion after both attempts results in denial of the N-400, after which you can file a new "
             "application."),
            ("How long after failing the citizenship test is the retest?",
             "USCIS schedules the second examination between 60 and 90 days after the first."),
            ("Do I retake the whole test if I fail one part?",
             "No. The officer retests only the portion you failed. Parts you passed the first time stand."),
        ],
        "sources": ["policy", "interview", "scoring", "study"],
        "related": ["naturalization-interview", "english-test", "how-to-study"],
    },
    {
        **D2,
        "slug": "numbers-and-dates",
        "category": "Numbers and dates",
        "title": "Every number and date on the civics test, on one page",
        "excerpt": "Twenty-four questions on the 2025 test have a number or a year in the answer. Here they "
                   "all are, grouped so they stick.",
        "lead": "Numbers are where memory slips under pressure. Six or two? Nine or five? 1870 or 1920? On "
                "the 2025 civics test, 24 of the 128 questions have a number or a date somewhere in the "
                "accepted answer. Here they are in one place, grouped the way they connect, so you learn a "
                "pattern instead of a list.",
        "sections": [
            ("Congress", [
                table(["Question", "Answer"], [
                    ["How many U.S. senators are there?", "100"],
                    ["How many senators does each state have?", "2"],
                    ["How long is a term for a U.S. senator?", "6 years"],
                    ["How many voting members are in the House of Representatives?", "435"],
                    ["How long is a term for a member of the House?", "2 years"],
                ]),
                p("The pattern: the Senate is the small, slow chamber. Two per state, one hundred in all, "
                  "six-year terms. The House is the big, fast one. 435 seats by population, two-year terms."),
            ]),
            ("The president and the courts", [
                table(["Question", "Answer"], [
                    ["The President is elected for how many years?", "4 years"],
                    ["The President can serve only two terms. Why?", "The 22nd Amendment"],
                    ["How many seats are on the Supreme Court?", "9"],
                    ["How many justices are usually needed to decide a case?", "5"],
                ]),
                p("Nine justices, so five is a majority. Four-year terms, two of them at most, because of "
                  "the 22nd Amendment."),
            ]),
            ("The Constitution and its amendments", [
                table(["Question", "Answer"], [
                    ["How many amendments does the Constitution have?", "27"],
                    ["Which amendment says people born or naturalized here are citizens?", "The 14th"],
                    ["When did all men get the right to vote?", "1870, the 15th Amendment, after the Civil War"],
                    ["When did all women get the right to vote?", "1920, the 19th Amendment, after World War I"],
                    ["Why is it important to pay federal taxes?", "Required by law, and by the 16th Amendment"],
                    ["Describe one amendment about who can vote.", "Citizens 18 and older can vote, among others"],
                ]),
                p("The voting amendments run in order of history: 15th for men of any race after the Civil "
                  "War, 19th for women after World War I, and then the voting age of 18."),
            ]),
            ("Dates in history", [
                table(["Question", "Answer"], [
                    ["When was the Declaration of Independence adopted?", "July 4, 1776"],
                    ["Name one war fought by the United States in the 1800s.", "War of 1812, Mexican-American War, Civil War or Spanish-American War"],
                    ["When did the Great Depression start?", "1929, the stock market crash"],
                    ["What major event happened on September 11, 2001?", "Terrorists attacked the United States"],
                    ["James Madison is famous for many things. Name one.", "Fourth president; president during the War of 1812"],
                    ["Abraham Lincoln is famous for many things. Name one.", "16th president; freed the slaves; saved the Union"],
                    ["Dwight Eisenhower is famous for many things. Name one.", "34th president; general in World War II; signed the 1956 Federal-Aid Highway Act"],
                ]),
                p("For the \"famous for many things\" questions you need one answer, and it does not have to "
                  "be the one with a number. \"Freed the slaves\" is a full mark for Lincoln."),
            ]),
            ("The flag", [
                table(["Question", "Answer"], [
                    ["Why does the flag have 13 stripes?", "The 13 original colonies"],
                    ["Why does the flag have 50 stars?", "One star for each of the 50 states"],
                ]),
            ]),
            ("How to use this page", [
                p("Read it once a day for a week, out loud, and the pairs start to hold each other up: 2 and "
                  "100 and 6 for the Senate, 435 and 2 for the House, 9 and 5 for the Court, 27 amendments, "
                  "1776 and 1870 and 1920 and 1929. Then take a practice test and see which ones still slip. "
                  "The 2008 test shares most of these numbers, but it is a different question list, so if your "
                  "N-400 was received before October 20, 2025, study the 2008 pool."),
            ]),
        ],
        "faq": [
            ("How many amendments does the US Constitution have?",
             "Twenty-seven. That is the accepted answer on the civics test."),
            ("How many voting members are in the House of Representatives?",
             "Four hundred thirty-five."),
            ("When did all women get the right to vote in the United States?",
             "In 1920, with the 19th Amendment, after World War I. Any of those three phrasings is accepted."),
        ],
        "sources": ["q128", "q100", "study"],
        "related": ["one-answer", "how-to-study", "which-test"],
    },
    {
        **D2,
        "slug": "sixty-five-twenty-questions",
        "category": "The 65/20 test",
        "title": "The 20 questions on the 65/20 civics test, and how the shorter test works",
        "excerpt": "If you are 65 or older with 20 years as a permanent resident, your civics test comes from "
                   "these 20 questions. All of them, with the accepted answers.",
        "lead": "Applicants who are 65 or older and have held a green card for 20 years or more get a civics "
                "test drawn from a marked bank of 20 questions instead of the full pool of 128. The officer "
                "asks up to 10 of them and you need 6 correct. Here is the whole bank for the 2025 test, with "
                "the accepted answers, in the order USCIS lists them.",
        "sections": [
            ("The rules first", [
                ul("You qualify if you are 65 or older <em>and</em> have been a lawful permanent resident for "
                   "20 years or more, both counted on the day USCIS received your N-400.",
                   "You are also exempt from the English test and may take civics in your own language. USCIS "
                   "asks you to bring a qualified interpreter.",
                   "Up to 10 questions are asked. Six correct passes. The officer stops as soon as the result "
                   "is decided.",
                   "Which bank you get, 2008 or 2025, follows your N-400 received date. The 20 below are the "
                   "2025 bank. The 2008 test has its own marked 20."),
            ]),
            ("The 20 questions", [
                ol("<strong>What is the supreme law of the land?</strong> The Constitution.",
                   "<strong>How many amendments does the U.S. Constitution have?</strong> Twenty-seven.",
                   "<strong>What is the economic system of the United States?</strong> Capitalism, or a free market economy.",
                   "<strong>Name one power of the U.S. Congress.</strong> Writes laws; declares war; makes the federal budget.",
                   "<strong>What is the name of the Speaker of the House of Representatives now?</strong> The current Speaker. Check house.gov the week of your interview.",
                   "<strong>The President of the United States is elected for how many years?</strong> Four.",
                   "<strong>What is the name of the President of the United States now?</strong> The current President. Check whitehouse.gov.",
                   "<strong>What is the name of the Vice President of the United States now?</strong> The current Vice President. Check whitehouse.gov.",
                   "<strong>Who vetoes bills?</strong> The President.",
                   "<strong>What is the highest court in the United States?</strong> The Supreme Court.",
                   "<strong>Who is the governor of your state now?</strong> Your state's governor. DC residents answer that DC does not have a governor.",
                   "<strong>What do we show loyalty to when we say the Pledge of Allegiance?</strong> The United States, or the flag.",
                   "<strong>Who lived in America before the Europeans arrived?</strong> American Indians, or Native Americans.",
                   "<strong>Who wrote the Declaration of Independence?</strong> Thomas Jefferson.",
                   "<strong>George Washington is famous for many things. Name one.</strong> Father of Our Country; first president; general of the Continental Army.",
                   "<strong>Abraham Lincoln is famous for many things. Name one.</strong> Freed the slaves; saved the Union; led the country during the Civil War.",
                   "<strong>Martin Luther King, Jr. is famous for many things. Name one.</strong> Fought for civil rights; worked for equality for all Americans.",
                   "<strong>What major event happened on September 11, 2001 in the United States?</strong> Terrorists attacked the United States.",
                   "<strong>Why does the flag have 13 stripes?</strong> Because there were 13 original colonies.",
                   "<strong>Name three national U.S. holidays.</strong> Any three: New Year's Day, Martin Luther King, Jr. Day, Presidents Day, Memorial Day, Juneteenth, Independence Day, Labor Day, Columbus Day, Veterans Day, Thanksgiving, Christmas."),
            ]),
            ("The four that change", [
                p("Four of the twenty depend on the day and the place: the Speaker, the President, the Vice "
                  "President and your governor. Do not learn these from a list printed months ago, including "
                  "this one. Check them the week of the interview on house.gov, whitehouse.gov and the "
                  "National Governors Association. In our study material they update from our server and are "
                  "cross-checked against those sources before every release."),
            ]),
            ("How to study twenty questions", [
                p("Twenty questions is a small enough set to learn completely. Pick one answer for each, the "
                  "one that is easiest to say in the language you will answer in, and practice saying it. Have "
                  "someone ask the questions in a random order, out loud, ten at a time, and stop at six right. "
                  "That is the interview."),
                p("The full age rules, including the 50/20 and 55/15 English exemptions, are in the "
                  "<a href=\"/guides/age-rules\">age rules guide</a>."),
            ]),
        ],
        "faq": [
            ("How many questions are on the 65/20 citizenship test?",
             "The officer asks up to 10 questions from a marked bank of 20. You need 6 correct to pass."),
            ("Can the 65/20 civics test be taken in my own language?",
             "Yes. Applicants who qualify for 65/20 are exempt from the English test and may take the civics "
             "test in the language of their choice with an interpreter."),
            ("Are the 65/20 questions the same on the 2008 and 2025 tests?",
             "No. Each version has its own marked bank of 20. Which one you get follows your N-400 received "
             "date: before October 20, 2025 the 2008 bank, on or after the 2025 bank."),
        ],
        "sources": ["q128", "exceptions", "policy", "whitehouse", "speaker", "nga"],
        "related": ["age-rules", "state-questions", "which-test"],
    },
    {
        **D2,
        "slug": "why-questions",
        "category": "The why questions",
        "title": "The 2025 test asks why. Here are all 17 why-questions and one answer for each.",
        "excerpt": "Seventeen of the 128 questions ask for a reason, not a fact. They are the ones flashcards "
                   "handle worst, and each has a short accepted answer.",
        "lead": "Most civics questions ask for a name, a number or a date. Seventeen questions on the 2025 "
                "test ask why. Why three branches? Why two senators per state? Why did the United States "
                "enter World War I? These are the questions people freeze on, because a reason is harder to "
                "recall than a fact. The good news is that every one has a short accepted answer, and you "
                "need only one.",
        "sections": [
            ("Why they are harder", [
                p("A fact is either in your memory or not. A reason invites you to explain, and under pressure "
                  "people explain too much and drift away from the accepted wording. The fix is to treat each "
                  "why-question exactly like a fact: pick one accepted answer, learn it word for word, and stop "
                  "talking when you have said it."),
            ]),
            ("Government: how it is built", [
                ol("<strong>There are three branches of government. Why?</strong> So one part does not become too powerful. Also accepted: checks and balances; separation of powers.",
                   "<strong>Why do U.S. representatives serve shorter terms than U.S. senators?</strong> To more closely follow public opinion.",
                   "<strong>Why does each state have two senators?</strong> Equal representation for small states. Also accepted: the Great Compromise.",
                   "<strong>Some states have more representatives than other states. Why?</strong> Because of the state's population.",
                   "<strong>The President can serve only two terms. Why?</strong> Because of the 22nd Amendment. Also accepted: to keep the president from becoming too powerful.",
                   "<strong>Why is the Electoral College important?</strong> It decides who is elected president.",
                   "<strong>Supreme Court justices serve for life. Why?</strong> To be independent of politics.",
                   "<strong>Why is it important to pay federal taxes?</strong> Required by law. Also accepted: all people pay to fund the federal government; civic duty."),
            ]),
            ("The founding documents", [
                ol("<strong>Why is the Declaration of Independence important?</strong> It says America is free from British control. Also accepted: it says all people are created equal.",
                   "<strong>Why were the Federalist Papers important?</strong> They helped people understand the Constitution. Also accepted: they supported passing it."),
            ]),
            ("The wars", [
                p("Five why-questions ask why the United States entered a war. Learn them as a set, because "
                  "two share an answer."),
                ol("<strong>World War I:</strong> Because Germany attacked U.S. ships.",
                   "<strong>World War II:</strong> The bombing of Pearl Harbor.",
                   "<strong>The Korean War:</strong> To stop the spread of communism.",
                   "<strong>The Vietnam War:</strong> To stop the spread of communism.",
                   "<strong>The Persian Gulf War:</strong> To force the Iraqi military from Kuwait."),
            ]),
            ("The flag", [
                ol("<strong>Why does the flag have 13 stripes?</strong> Because there were 13 original colonies.",
                   "<strong>Why does the flag have 50 stars?</strong> One star for each state."),
            ]),
            ("How to drill them", [
                p("Write the 17 questions on one side of a card and your one chosen answer on the other. Say "
                  "the answer out loud, in full, then stop. If you catch yourself adding a second sentence, "
                  "start over. The officer accepts any answer on USCIS's list and needs only one, so the "
                  "shortest correct sentence is the safest one. <a href=\"/guides/one-answer\">How the answer "
                  "key works.</a>"),
            ]),
        ],
        "faq": [
            ("Why are there three branches of government, according to the civics test?",
             "So one part does not become too powerful. Checks and balances and separation of powers are also "
             "accepted answers."),
            ("Why does each state have two senators, according to the civics test?",
             "For equal representation, especially for small states. The Great Compromise is also accepted."),
            ("Why did the United States enter the Korean War and the Vietnam War?",
             "To stop the spread of communism. That is the accepted answer for both."),
        ],
        "sources": ["q128", "study"],
        "related": ["one-answer", "numbers-and-dates", "how-to-study"],
    },
]

# ---------------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------------

MARK_SVG = (
    '<svg class="mark" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    '<rect width="100" height="100" fill="#0FA968"/>'
    '<path d="M50 15 C60.5 32 68 36.5 68 48.5 C68 60.5 60 68.5 50 68.5 C40 68.5 32 60.5 32 48.5 '
    'C32 36.5 39.5 32 50 15 Z" fill="#fff"/>'
    '<rect x="37" y="70" width="26" height="6.5" rx="3.25" fill="#fff"/>'
    '<rect x="44" y="78" width="12" height="10" rx="3" fill="#fff" opacity=".85"/></svg>'
)


def nav() -> str:
    return f'''<nav class="nav">
  <div class="nav-in">
    <a class="mark-link" href="/" aria-label="Prepare for Citizenship home">{MARK_SVG}</a>
    <b><a href="/" style="text-decoration:none;color:inherit">Prepare for Citizenship</a></b>
    <span class="nav-links">
      <a href="/#study" class="hide-sm">What's included</a>
      <a href="/#pricing" class="hide-sm">Pricing</a>
      <a href="/guides">Guides</a>
      <a href="/support">Support</a>
      <a href="/login">Sign in</a>
    </span>
  </div>
</nav>'''


FOOTER = '''<footer>
  <div class="wrap foot-in">
    <a href="/guides">Guides</a>
    <a href="/terms">Terms</a>
    <a href="/refunds">Refunds</a>
    <a href="/privacy-web">Website privacy</a>
    <a href="/privacy">App privacy</a>
    <a href="/support">Support</a>
    <p class="disclaimer">
      Prepare for Citizenship is an independent study tool. It is not affiliated with,
      endorsed by, or sponsored by any government, immigration authority or agency &mdash; in the
      United States, that includes U.S. Citizenship and Immigration Services (USCIS) and the
      Department of Homeland Security. It does not provide legal or immigration advice.
    </p>
  </div>
</footer>
<script src="/nav.js"></script>
<script src="/analytics.js"></script>'''


def head(title: str, description: str, url: str, image: str, image_alt: str,
         ld: list[dict], og_type: str = "article") -> str:
    e = html.escape
    ld_json = json.dumps(ld if len(ld) > 1 else ld[0], ensure_ascii=False, indent=1)
    return f'''<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)} · Prepare for Citizenship</title>
<meta name="description" content="{e(description)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Prepare for Citizenship">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(description)}">
<meta property="og:image" content="{ORIGIN}{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="675">
<meta property="og:image:alt" content="{e(image_alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(title)}">
<meta name="twitter:description" content="{e(description)}">
<meta name="twitter:image" content="{ORIGIN}{image}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap">
<link rel="stylesheet" href="/site.css">
<link rel="stylesheet" href="/guides.css">
<!-- Generated by tools/build-guides.py. Edit the data there, not this file. -->
<script type="application/ld+json">
{ld_json}
</script>
</head>
<body>
'''


def words(guide: dict) -> int:
    text = guide["lead"] + " ".join(b for _, blocks in guide["sections"] for b in blocks)
    return len(re.sub(r"<[^>]+>", " ", text).split())


def guide_url(slug: str) -> str:
    return f"{ORIGIN}/guides/{slug}"


def related_links(keys: list[str]) -> list[tuple[str, str]]:
    out = []
    for k in keys:
        if k == "which-test":
            out.append(("/which-test", "Which test will I take?"))
        else:
            g = next(x for x in GUIDES if x["slug"] == k)
            out.append((f"/guides/{k}", g["category"]))
    return out


def render_guide(g: dict) -> str:
    e = html.escape
    url = guide_url(g["slug"])
    image = f"/guides/img/{g['slug']}.png"
    minutes = max(1, round(words(g) / 200))
    published = g.get("published", CHECKED)
    published_iso = g.get("published_iso", CHECKED_ISO)
    checked = g.get("checked", CHECKED)
    sources = [SRC[k] for k in g["sources"]]

    ld: list[dict] = [{
        "@context": "https://schema.org",
        "@type": "Article",
        "@id": url + "#article",
        "headline": g["title"],
        "description": g["excerpt"],
        "image": ORIGIN + image,
        "datePublished": published_iso,
        "dateModified": published_iso,
        "author": {"@type": "Organization", "name": "Prepare for Citizenship", "url": ORIGIN},
        "publisher": {"@type": "Organization", "name": "Prepare for Citizenship", "url": ORIGIN},
        "mainEntityOfPage": url,
    }, {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": ORIGIN + "/"},
            {"@type": "ListItem", "position": 2, "name": "Guides", "item": ORIGIN + "/guides"},
            {"@type": "ListItem", "position": 3, "name": g["title"], "item": url},
        ],
    }]
    if g.get("faq"):
        # Every answer here is also on the page, word for word, in the FAQ section below.
        ld.append({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": url + "#faq",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in g["faq"]],
        })

    body_sections = "".join(
        f'<h2 class="pm-h2">{e(h)}</h2>' + "".join(blocks) for h, blocks in g["sections"]
    )
    faq_html = ""
    if g.get("faq"):
        faq_html = '<section class="pm-faq"><h2 class="pm-h2" style="margin-top:0">Frequently asked questions</h2>'
        faq_html += "".join(f'<h3 class="pm-q">{e(q)}</h3><p class="pm-a">{e(a)}</p>' for q, a in g["faq"])
        faq_html += "</section>"

    chips = "".join(f'<a href="{h}">{e(l)}</a>' for h, l in related_links(g["related"]))
    def host(u: str) -> str:
        return re.sub(r"^www\.", "", u.split("/")[2])

    src_items = "".join(
        f'<li><span class="pm-mk">{i + 1}</span><span><a href="{u}" target="_blank" rel="noopener noreferrer">{e(label)}</a>'
        f'<span class="pm-host">{host(u)}</span></span></li>'
        for i, (label, u) in enumerate(sources)
    )

    return head(g["title"], g["excerpt"], url, image, g["title"], ld) + nav() + f'''
<article class="pm">
  <header class="pm-hero">
    <div class="pm-hero-inner pm-hero-grid">
      <div>
        <p class="pm-eyebrow"><a href="/guides">Guides</a> · {e(g["category"])}</p>
        <h1 class="pm-title">{e(g["title"])}</h1>
        <p class="pm-kick">{e(g["excerpt"])}</p>
        <p class="pm-byline">
          <span>By Prepare for Citizenship</span>
          <span class="sep">·</span>
          <span>{minutes} min read</span>
          <span class="sep">·</span>
          <span>Published {published}</span>
          <span class="sep">·</span>
          <span>Sources checked {checked}</span>
          <span class="sep">·</span>
          <span>{len(sources)} sources</span>
        </p>
      </div>
      <figure class="pm-hero-figure">
        <img src="{image}" alt="" width="1200" height="675" loading="eager" decoding="async">
      </figure>
    </div>
  </header>

  <div class="pm-body">
    <p class="pm-lead">{e(g["lead"])}</p>
    <div class="pm-prose">
      {body_sections}
    </div>
    {faq_html}

    <section class="pm-cta">
      <p class="pm-lbl">Study the official questions, free</p>
      <p>Both versions of the civics test, the answers for your state, and practice tests in the real format with the real pass line.</p>
      <p class="pm-cta-btns">
        <a class="btn" href="/signup">Study in the browser &mdash; free</a>
        <a class="btn ghost" href="{APP_STORE}" rel="noopener">Get the iPhone app</a>
      </p>
    </section>

    <aside class="pm-rail">
      <div class="pm-after">
        <section class="pm-card">
          <p class="pm-lbl">Related guides</p>
          <div class="pm-chips">{chips}</div>
        </section>
        <section class="pm-card">
          <p class="pm-lbl">Where these facts come from</p>
          <ul class="pm-sources">{src_items}</ul>
          <p class="pm-src-note">If USCIS's pages change, they win. We re-read them before every release.</p>
        </section>
      </div>
    </aside>

    <p class="pm-foot">Prepare for Citizenship teaches the test; it does not advise on applications. Anything about your own case belongs with your lawyer or USCIS. Spotted something wrong? <a href="/support">Tell us</a>.</p>
  </div>
</article>

''' + FOOTER + "\n</body>\n</html>\n"


def render_index() -> str:
    e = html.escape
    url = ORIGIN + "/guides"
    ordered = sorted(GUIDES, key=lambda x: x.get("published_iso", CHECKED_ISO), reverse=True)
    cards = [{
        "href": f"/guides/{g['slug']}", "category": g["category"], "title": g["title"],
        "excerpt": g["excerpt"], "image": f"/guides/img/card/{g['slug']}.png",
    } for g in ordered]
    # which-test is the most-searched page, so it leads its publication day rather than
    # trailing the list; the cards carry title-free thumbnails (img/card/) because the
    # full hero repeats the card's own title, which read as a duplicate on the index.
    first_old = next(i for i, c in enumerate(cards) if c["href"].endswith(tuple(
        g["slug"] for g in GUIDES if g.get("published_iso", CHECKED_ISO) == CHECKED_ISO)))
    cards.insert(first_old, WHICH_TEST_CARD)
    ld = [{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "@id": url,
        "name": "Guides to the US citizenship test",
        "description": "Plain-English guides to the US naturalization test, checked against USCIS's own pages.",
        "url": url,
        "hasPart": [{"@type": "Article", "headline": c["title"], "url": ORIGIN + c["href"]} for c in cards],
    }]
    grid = "".join(f'''
      <a href="{c["href"]}" class="guide-card">
        <img src="{c["image"]}" alt="" width="1200" height="675" loading="lazy" class="guide-card-img">
        <div class="guide-card-body">
          <span class="guide-category">{e(c["category"])}</span>
          <h2 class="guide-title">{e(c["title"])}</h2>
          <p class="guide-excerpt">{e(c["excerpt"])}</p>
          <span class="guide-more">Read the guide &rarr;</span>
        </div>
      </a>''' for c in cards)
    return head("Guides to the US citizenship test",
                "Plain-English guides to the US naturalization test: which version you take, what the "
                "interview is like, the English test, the state questions and the age rules. Checked "
                "against USCIS's own pages.",
                url, "/guides/img/which-test.png",
                "Guides to the US citizenship test", ld, og_type="website") + nav() + f'''
<main class="guides-index">
  <p class="crumbs"><a href="/">Home</a> / <span>Guides</span></p>
  <p class="eyebrow">Guides</p>
  <h1>The US citizenship test, explained in plain English</h1>
  <p class="intro">Which version you take, what the interview is like, how the English test is scored, what to answer for your state, and who is exempt. Every guide is checked against USCIS's own pages, and the date it was last checked is on the page. None of it is legal advice.</p>
  <div class="guide-grid">{grid}
  </div>
</main>

''' + FOOTER + "\n</body>\n</html>\n"


def main() -> None:
    (PUBLIC / "guides").mkdir(exist_ok=True)
    for g in GUIDES:
        (PUBLIC / "guides" / f"{g['slug']}.html").write_text(render_guide(g), encoding="utf-8")
    (PUBLIC / "guides.html").write_text(render_index(), encoding="utf-8")
    print(f"wrote {len(GUIDES)} guides + index to {PUBLIC}")


if __name__ == "__main__":
    main()
