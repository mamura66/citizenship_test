#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build Australia's practice-question pack.

    python3 tools/build-au-practice-pack.py

Australia is the best-licensed country in this project and it is worth being precise about
why. Home Affairs publishes a twenty-question *sample* test and says on its own landing
page: "This is a sample test only. The questions will be different on the day of the test."
The real pool is never published. But the study booklet is - and the testable section of
`Australian Citizenship: Our Common Bond` carries, on its own first page:

    © Commonwealth of Australia 2020
    With the exception of the Commonwealth Coat of Arms, all material presented in this
    publication is provided under a Creative Commons Attribution 4.0 International license

CC BY 4.0 permits commercial use and adaptation with attribution. That is a stronger
position than Canada's, where the guide is Crown copyright and only the facts are free. Here
we would be entitled to reproduce the booklet's wording; we still write our own questions,
because that is what the product needs, and we attribute the source either way.

The originality reference is Australia's own twenty published sample questions, which we
already hold at content/au/citizenship-practice.json - a better comparison than anything
scraped, and the reason that held-back pack is worth keeping even though it is not served.

Two facts about the real test that this pack has to carry, because getting them wrong would
misrepresent what a candidate has to do: twenty questions in forty-five minutes, at least
15/20 overall, AND all five Australian values questions correct. The values rule is not a
75% question - miss one and you fail regardless of the rest.
"""

import json
import os
import sys

from practice_pack import build_categories, enforce_originality, write_pack

BOOKLET = "Australian Citizenship: Our Common Bond"
OCB_PAGE = "https://immi.homeaffairs.gov.au/citizenship/test-and-interview/our-common-bond"
OCB_PDF = "https://immi.homeaffairs.gov.au/citizenship-subsite/files/our-common-bond-testable.pdf"

S = {
    "p1": ("Part 1 - Australia and its people", OCB_PAGE),
    "p2": ("Part 2 - Australia's democratic beliefs, rights and liberties", OCB_PAGE),
    "p3": ("Part 3 - Government and the law in Australia", OCB_PAGE),
    "p4": ("Part 4 - Australian values", OCB_PAGE),
}

# (section, question, options with the correct answer FIRST, correct index)
Q = [
 # ---- Part 1: Australia and its people --------------------------------------------------
 ("p1", "Who are Australia's first inhabitants?",
  ["The Aboriginal and Torres Strait Islander peoples", "The British settlers of 1788",
   "The Dutch explorers", "The free settlers from Ireland"], 0),
 ("p1", "Whose cultures and traditions are the oldest continuous ones in the world?",
  ["The Aboriginal and Torres Strait Islander peoples'", "The Australian colonists'",
   "The Torres Strait Islander peoples' alone", "The Papua New Guinean peoples'"], 0),
 ("p1", "Where are the Torres Strait Islander people from?",
  ["Islands between the northern tip of Queensland and Papua New Guinea",
   "Mainland Australia and Tasmania", "The islands off Western Australia",
   "The Bass Strait islands"], 0),
 ("p1", "On what date did the First Fleet arrive from Great Britain?",
  ["26 January 1788", "1 January 1901", "26 January 1901", "25 April 1915"], 0),
 ("p1", "What was the First Fleet?",
  ["The first 11 convict ships to arrive from Great Britain",
   "The first free settlers' ships from Ireland",
   "The fleet that discovered the Torres Strait",
   "The ships that carried gold to Britain"], 0),
 ("p1", "Who was the first Governor of the colony of New South Wales?",
  ["Captain Arthur Phillip", "Captain James Cook",
   "Sir Henry Parkes", "Governor Lachlan Macquarie"], 0),
 ("p1", "Why did the British Government decide to transport convicts to New South Wales?",
  ["British laws were harsh and the jails could not hold everyone imprisoned",
   "To defend the colony against invasion",
   "To find gold for the Crown", "To build the Sydney Harbour Bridge"], 0),
 ("p1", "In which year did a gold rush begin in the colonies of New South Wales and Victoria?",
  ["1851", "1788", "1901", "1861"], 0),
 ("p1", "Which was the first colony established by the British in Australia?",
  ["New South Wales", "Victoria", "Tasmania", "Western Australia"], 0),
 ("p1", "How many states and mainland territories does the Commonwealth of Australia have?",
  ["Six states and two mainland territories", "Eight states and no territories",
   "Six states and six territories", "Five states and three mainland territories"], 0),
 # Reworded: "What is Australia's capital city?" is word for word one of Home Affairs'
 # own sample questions. Same fact, asked from the territory side.
 ("p1", "Which city is the capital of both Australia and the Australian Capital Territory?",
  ["Canberra", "Sydney", "Melbourne", "Darwin"], 0),
 ("p1", "Which is Australia's largest city?",
  ["Sydney", "Melbourne", "Canberra", "Perth"], 0),
 ("p1", "What is the capital city of Victoria?",
  ["Melbourne", "Geelong", "Sydney", "Hobart"], 0),
 ("p1", "What is the capital city of Queensland?",
  ["Brisbane", "Cairns", "Gold Coast", "Townsville"], 0),
 ("p1", "What is the capital city of Western Australia?",
  ["Perth", "Fremantle", "Broome", "Adelaide"], 0),
 ("p1", "What is the capital city of South Australia?",
  ["Adelaide", "Perth", "Port Augusta", "Melbourne"], 0),
 ("p1", "What is the capital city of Tasmania?",
  ["Hobart", "Launceston", "Devonport", "Burnie"], 0),
 ("p1", "What is the capital city of the Northern Territory?",
  ["Darwin", "Alice Springs", "Katherine", "Canberra"], 0),
 ("p1", "Which flag is the official flag of Australia?",
  ["The Australian National Flag", "The Australian Aboriginal Flag",
   "The Torres Strait Islander Flag", "The Union Jack"], 0),
 ("p1", "What are the three colours of the Australian National Flag?",
  ["Blue, white and red", "Black, red and yellow",
   "Green, blue and white", "Blue, white and gold"], 0),
 ("p1", "What sits in the top left corner of the Australian National Flag?",
  ["The Union Jack, the flag of the United Kingdom", "The Commonwealth Star",
   "The Southern Cross", "The Commonwealth Coat of Arms"], 0),
 ("p1", "How many points does the Commonwealth Star on the flag have, and why?",
  ["Seven - one for each of the six states and one for the territories",
   "Six - one for each state",
   "Eight - one for each state and territory",
   "Five - one for each original colony"], 0),
 ("p1", "What is the group of stars on the right of the Australian National Flag?",
  ["The Southern Cross", "The Commonwealth Star",
   "The Seven Sisters", "The Federation Stars"], 0),
 # Narrowed: asking what the colours ARE is one of Home Affairs' own sample questions,
 # so this asks what one of them stands for instead.
 ("p1", "What does the yellow circle on the Australian Aboriginal Flag represent?",
  ["The sun", "Gold", "The desert", "The Southern Cross"], 0),
 ("p1", "What does the white dancer's headdress in the centre of the Torres Strait Islander Flag symbolise?",
  ["All Torres Strait Islanders", "The Australian Government",
   "Peace between the islands", "The sea"], 0),
 ("p1", "What is the official symbol of the Commonwealth of Australia?",
  ["The Commonwealth Coat of Arms", "The Australian National Flag",
   "The Southern Cross", "The golden wattle"], 0),
 ("p1", "Which two native animals support the shield on the Commonwealth Coat of Arms?",
  ["A kangaroo and an emu", "A koala and a kangaroo",
   "An emu and a wombat", "A platypus and a kangaroo"], 0),
 ("p1", "What is Australia's national anthem?",
  ["Advance Australia Fair", "Waltzing Matilda",
   "God Save the King", "Song of Australia"], 0),

 # ---- Part 2: democratic beliefs, rights and liberties ----------------------------------
 ("p2", "What kind of system of government does Australia have?",
  ["A parliamentary democracy", "A presidential republic",
   "An absolute monarchy", "A direct democracy"], 0),
 ("p2", "In Australia's system of government, where does the power of the government come from?",
  ["The Australian people, because citizens vote for people to represent them in parliament",
   "The Governor-General", "The High Court", "The Prime Minister"], 0),
 ("p2", "What does the Rule of Law mean?",
  ["No person, group or religious rule is above the law",
   "Judges may set aside a law they disagree with",
   "The government is not bound by the laws it passes",
   "Only citizens are required to obey the law"], 0),
 ("p2", "Who must obey Australia's laws?",
  ["Everyone, including government, community and religious leaders, business people and the police",
   "Everyone except serving judges", "Everyone except elected representatives",
   "Everyone except the police"], 0),
 ("p2", "How do Australians believe change should occur?",
  ["Through discussion, peaceful persuasion and the democratic process",
   "Through whichever means is quickest",
   "Through the decisions of religious leaders",
   "Through protest that may include violence if a cause is just"], 0),
 ("p2", "What does freedom of speech allow people in Australia to do?",
  ["Say and write what they think and discuss their ideas, while still obeying Australian laws",
   "Say anything at all, with no limits",
   "Criticise the government only in private",
   "Publish opinions only if they are true"], 0),
 ("p2", "What is freedom of association?",
  ["The right to form and join associations to pursue common goals",
   "The right to say what you think",
   "The right to practise any religion",
   "The right to move freely between states"], 0),
 ("p2", "What does freedom of expression cover?",
  ["Expressing views through art, film, music and literature",
   "Only spoken and written words",
   "Only political speech", "Only speech in parliament"], 0),
 ("p2", "Which of these is an Australian democratic belief?",
  ["Respect for all individuals regardless of background",
   "Loyalty to one political party",
   "Preference for the wealthy in courts of law",
   "Obedience to religious leaders above the law"], 0),
 ("p2", "How are Australians expected to treat one another?",
  ["With dignity and respect, regardless of background",
   "According to their standing in the community",
   "According to their religion", "According to their wealth"], 0),

 # ---- Part 3: Government and the law ----------------------------------------------------
 ("p3", "On what date did the Australian colonies unite into a federation?",
  ["1 January 1901", "26 January 1788", "1 January 1900", "25 April 1915"], 0),
 ("p3", "What is the name of the federation the colonies became?",
  ["The Commonwealth of Australia", "The Dominion of Australia",
   "The United States of Australia", "The Federation of Australian States"], 0),
 ("p3", "What is the Australian Constitution?",
  ["The legal document that sets out the basic rules for the government of Australia",
   "A list of the rights of every Australian citizen",
   "The Act that created the High Court only",
   "An agreement between the states and the United Kingdom"], 0),
 ("p3", "What did the Australian Constitution establish?",
  ["The Parliament of the Commonwealth of Australia and the High Court of Australia",
   "The office of Prime Minister and the Cabinet",
   "The six state parliaments", "The Australian Public Service"], 0),
 ("p3", "Which court has the ultimate power to apply and interpret the laws of Australia?",
  ["The High Court of Australia", "The Federal Court of Australia",
   "The Supreme Court of New South Wales", "The Australian Human Rights Commission"], 0),
 ("p3", "How can the Australian people change the Australian Constitution?",
  ["By voting in a referendum", "By a vote of the House of Representatives alone",
   "By a decision of the High Court", "By a proclamation of the Governor-General"], 0),
 ("p3", "What is the 'double majority' needed to change the Australian Constitution?",
  ["A majority of voters in a majority of states, and a majority of voters across the nation",
   "A majority in both Houses of Parliament",
   "Two-thirds of voters across the nation",
   "A majority of voters in every state"], 0),
 ("p3", "What did more than 90 per cent of Australians vote 'Yes' to in the 1967 Referendum?",
  ["Allowing Aboriginal peoples to be counted in the Census",
   "Adopting Advance Australia Fair as the anthem",
   "Creating the Australian Capital Territory",
   "Ending appeals to British courts"], 0),
 ("p3", "How does the Australian Constitution stop one person or group from holding all the power?",
  ["It divides power between the legislative, executive and judicial powers",
   "It requires elections every three years",
   "It gives the High Court power over parliament",
   "It limits the Prime Minister to two terms"], 0),
 ("p3", "What is legislative power?",
  ["The power to make laws", "The power to put laws into practice",
   "The power to interpret and apply the law", "The power to dissolve parliament"], 0),
 ("p3", "What is executive power?",
  ["The power to put the laws into practice", "The power to make laws",
   "The power to interpret the law", "The power to change the Constitution"], 0),
 ("p3", "Who holds judicial power in Australia?",
  ["Judges, who interpret and apply the law", "The Prime Minister and the Cabinet",
   "Parliament", "The Governor-General"], 0),
 ("p3", "Which two Houses make up the Australian Parliament?",
  ["The House of Representatives and the Senate",
   "The Lower House and the Cabinet",
   "The House of Commons and the Senate",
   "The House of Representatives and the High Court"], 0),
 ("p3", "By what other names is the House of Representatives known?",
  ["The Lower House or the People's House", "The Upper House or the States' House",
   "The House of Review", "The Federal Chamber"], 0),
 ("p3", "By what other names is the Senate known?",
  ["The Upper House, the House of Review or the States' House",
   "The Lower House or the People's House",
   "The Federal Chamber", "The Council of States"], 0),
 ("p3", "How many senators are there in total?",
  ["76", "150", "12", "40"], 0),
 ("p3", "How many senators does each state elect?",
  ["12", "2", "6", "10"], 0),
 ("p3", "How many senators do the Australian Capital Territory and the Northern Territory each elect?",
  ["Two", "Twelve", "Six", "None"], 0),
 ("p3", "How is the number of members of the House of Representatives for each state and territory decided?",
  ["By the number of people in that state or territory",
   "Equally, regardless of population",
   "By the size of the state's area", "By the state parliaments"], 0),
 ("p3", "How are all the states represented in the Senate?",
  ["Equally, regardless of their size or population",
   "In proportion to their population",
   "In proportion to their area", "By their Premiers"], 0),
 ("p3", "What is the leader of a state government called?",
  ["The Premier", "The Chief Minister", "The Governor", "The Prime Minister"], 0),
 ("p3", "What is the leader of a territory government called?",
  ["The Chief Minister", "The Premier", "The Administrator", "The Governor"], 0),
 ("p3", "Who is the Sovereign's representative in Australia, and on whose advice are they appointed?",
  ["The Governor-General, appointed on the advice of the Australian Prime Minister",
   "The Prime Minister, appointed on the advice of parliament",
   "The Chief Justice, appointed on the advice of the Cabinet",
   "The Governor of New South Wales, appointed by the states"], 0),
 ("p3", "In which elections is voting compulsory in Australia?",
  ["Federal and state or territory elections", "Federal elections only",
   "Local government elections only", "No elections; voting is always voluntary"], 0),
 ("p3", "What does each state government have of its own?",
  ["Its own parliament and constitution", "Its own currency and defence force",
   "Its own High Court", "Its own citizenship"], 0),

 # ---- Part 4: Australian values ---------------------------------------------------------
 ("p4", "What does Australian society value about the rights of all people?",
  ["Their equal rights, regardless of gender, sexual orientation, age, disability, religion, race or origin",
   "The rights of citizens above those of residents",
   "The rights of the community above those of the individual",
   "The rights of those born in Australia above those of migrants"], 0),
 ("p4", "In Australia, what does the law say about marriage between two men or two women?",
  ["Two people can marry each other, including two men or two women",
   "Marriage is only between a man and a woman",
   "It depends on the state", "It requires the approval of a court"], 0),
 ("p4", "What rights do men and women have in Australia?",
  ["Equal rights, with equality of opportunity to pursue their goals and interests",
   "Men have priority in employment", "Women have priority in family matters",
   "Rights that differ by state"], 0),
 ("p4", "What is the position of physical violence against a spouse or partner in Australia?",
  ["It is never acceptable and is a criminal offence",
   "It is a private family matter", "It is only an offence if reported by a doctor",
   "It is dealt with by community leaders"], 0),
 ("p4", "Who may apply to the courts for a divorce in Australia?",
  ["Either a husband or a wife, even if the other spouse wishes to continue the marriage",
   "Only the husband", "Only with the agreement of both spouses",
   "Only after approval by a religious authority"], 0),
 ("p4", "What does a 'fair go' mean in Australia?",
  ["Everyone, regardless of background, has an equal opportunity to achieve success in life",
   "Everyone receives the same income",
   "Everyone is given a government job if they need one",
   "People of the same class are treated alike"], 0),
 ("p4", "On what basis should a person get a job in Australia?",
  ["Their skills and experience", "Their gender", "Their wealth", "Their ethnicity"], 0),
 ("p4", "What should what someone achieves in life be the result of?",
  ["Their hard work and talents", "The class they were born into",
   "Their family's wealth", "Their religion"], 0),
 ("p4", "Do people of different faiths receive different treatment under Australian law?",
  ["No - people of all faiths receive the same treatment",
   "Yes - Christians receive preferential treatment",
   "Yes - it depends on the state", "Yes - only recognised religions are protected"], 0),
 ("p4", "Is it lawful in Australia to treat someone differently because of their gender?",
  ["No - it is against the law to discriminate against a person because of their gender",
   "Yes, in private businesses", "Yes, in religious organisations",
   "Yes, where a job has always been done by one gender"], 0),
 ("p4", "What rights do men and women have over personal matters such as marriage and religion?",
  ["Both have the right to make their own independent choices, protected from intimidation or violence",
   "The head of the household decides", "Parents decide until the age of 25",
   "Religious leaders decide"], 0),
 ("p4", "What access do both men and women have to education and employment?",
  ["Equal access, and both may vote, stand for parliament and join the Defence Force and police",
   "Men have priority for employment", "Women have priority for education",
   "Access set by each state"], 0),
]


def official_sample_questions():
    """Australia's own twenty published sample questions, for comparison only.

    Read from content/au/citizenship-practice.json rather than scraped: those twenty really
    are the official sample, they are already verified against the live practice test, and
    that pack is held back from the website anyway. Using it here is the reason it is worth
    keeping.
    """
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, "apps/us-citizenship/content/au/citizenship-practice.json")
    if not os.path.isfile(path):
        raise SystemExit(f"expected the official sample pack at {path}")
    with open(path, encoding="utf-8") as f:
        pack = json.load(f)
    return [q["question"] for c in pack.get("categories", []) for q in c.get("questions", [])]


def mark_values(section_key, question):
    """Australia's five values questions must all be answered correctly, so the pool has to
    say which questions are values questions."""
    if section_key == "p4":
        question["valuesQuestion"] = True


def main():
    offline = "--offline" in sys.argv
    published = [] if offline else official_sample_questions()
    enforce_originality([q for _, q, _, _ in Q], published, offline, "Home Affairs sample")

    cats = build_categories(
        Q, S, order=["p1", "p2", "p3", "p4"], seed=20260908, id_prefix="au-", extra=mark_values
    )

    pack = {
        "version": "2026-09-08",
        "language": "en-AU",
        "country": "AU",
        "officialTestName": "Australian citizenship test",
        "contentType": "authored-practice",
        "officialPoolPublished": False,
        "source": f"{BOOKLET} (testable section), Australian Government Department of Home Affairs - {OCB_PDF}",
        "sourceRetrieved": "2026-09-08",
        "basedOn": f"{BOOKLET}, testable section, © Commonwealth of Australia 2020, CC BY 4.0 - {OCB_PDF}",
        "nonAffiliation": (
            "These are our own practice questions. They are not the questions used in the "
            "real test, and this app is not affiliated with, endorsed by or approved by the "
            "Australian Government or the Department of Home Affairs. Home Affairs says of "
            "its own sample test that the questions will be different on the day."
        ),
        "disclosure": (
            "Australia does not publish the questions used in the citizenship test - Home "
            "Affairs publishes a twenty-question sample and says the real questions will be "
            "different on the day. These are practice questions we wrote, and each one tests "
            f"a fact stated in the testable section of {BOOKLET}, the free official booklet, "
            "which is the material the real test is drawn from. Every question records the "
            "part of the booklet it came from."
        ),
        "questionFormat": "single-choice-4",
        "askedPerTest": 20,
        "passRequirement": 15,
        "timeLimitMinutes": 45,
        "valuesRule": {
            "section": "Part 4 - Australian values",
            "askedPerTest": 5,
            "passRequirement": 5,
            "note": (
                "All five Australian values questions must be answered correctly, as well as "
                "an overall mark of at least 15 out of 20. Missing one values question means "
                "not passing, whatever the overall mark."
            ),
        },
        "totalQuestions": len(Q),
        "licence": {
            "name": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
            "url": "https://creativecommons.org/licenses/by/4.0/",
            "attribution": (
                f"Facts drawn from {BOOKLET} (testable section), © Commonwealth of Australia "
                "2020, used under CC BY 4.0. Questions written by Prepare for Citizenship."
            ),
            "noticeSource": OCB_PDF,
            "reviewStatus": "cleared",
            "reviewedOn": "2026-09-08",
            "obligations": [
                "CC BY 4.0 requires attribution, and an attribution nobody can see does not "
                "satisfy it - the string above has to be on screen where the questions are.",
                "The Commonwealth Coat of Arms is excluded from the licence and is not used.",
                "Never present these as the questions used in the real test.",
            ],
        },
        "categories": cats,
    }

    out = write_pack("apps/us-citizenship/content/au/practice-questions.json", pack)
    print(f"wrote {out}")
    print(f"  {len(Q)} questions in {len(cats)} parts")
    for c in cats:
        flagged = sum(1 for q in c["questions"] if q.get("valuesQuestion"))
        print(f"    {c['section']}: {len(c['questions'])}"
              + (f"  ({flagged} flagged as values questions)" if flagged else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
