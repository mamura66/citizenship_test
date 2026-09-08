# -*- coding: utf-8 -*-
"""Build Canada's practice-question pack.

These questions are OURS. Canada does not publish its question pool, so there is no
official pool to reproduce - IRCC publishes the free study guide, and every product in
this market (including the official publisher's own app for the UK) writes questions that
test the guide's facts. Facts are not copyrightable; the guide's wording is. So each
question here is written from a fact in `Discover Canada`, and each records the section it
came from so any answer can be checked against the source.

Two things the guide itself forced:

  * It is internally inconsistent about dates. The Oath chapter has been updated to
    "King Charles the Third", while the Symbols chapter still says Queen Elizabeth II
    "celebrates her Diamond Jubilee ... in 2012" and the Elections chapter still says
    Canada has 308 electoral districts (it has had more than that since 2015). Anything
    that has since moved is either taken from the updated chapter or left out entirely -
    a stale number presented as fact is worse than one fewer question.
  * Canadian English. `language: en-CA`, so the validator holds authored text to
    non-US spelling.
"""
import sys

from practice_pack import (
    build_categories,
    enforce_originality,
    fetch_published_questions,
    write_pack,
)

GUIDE = "Discover Canada: The Rights and Responsibilities of Citizenship"
BASE = ("https://www.canada.ca/en/immigration-refugees-citizenship/corporate/"
        "publications-manuals/discover-canada/read-online")

S = {
    "rights":    ("Rights and Responsibilities of Citizenship", f"{BASE}/rights-resonsibilities-citizenship.html"),
    "govern":    ("How Canadians Govern Themselves",            f"{BASE}/how-canadians-govern-themselves.html"),
    "elections": ("Federal Elections",                          f"{BASE}/federal-elections.html"),
    "symbols":   ("Canadian Symbols",                           f"{BASE}/canadian-symbols.html"),
    "history":   ("Canada's History",                           f"{BASE}/canadas-history.html"),
    "regions":   ("Canada's Regions",                           f"{BASE}/canadas-regions.html"),
    "justice":   ("The Justice System",                         f"{BASE}/justice-system.html"),
    "oath":      ("The Oath of Citizenship",                    f"{BASE}/oath-citizenship.html"),
}

# (section_key, question, options, correct_index)
Q = [
 # ---- Rights and responsibilities -------------------------------------------------------
 ("rights", "Canada's tradition of ordered liberty is usually traced back to the signing of which document?",
  ["Magna Carta, signed in England in 1215", "The Constitution Act, 1867",
   "The Canadian Charter of Rights and Freedoms", "The Quebec Act of 1774"], 0),
 ("rights", "Which right lets a person challenge unlawful detention by the state?",
  ["Habeas corpus", "Mobility rights", "Due process", "Royal assent"], 0),
 ("rights", "In which year was the Constitution amended to entrench the Canadian Charter of Rights and Freedoms?",
  ["1982", "1867", "1965", "1931"], 0),
 ("rights", "Which of these is a fundamental freedom protected in Canada?",
  ["Freedom of peaceful assembly", "Freedom from paying taxes",
   "The right to carry a weapon", "The right to a government job"], 0),
 ("rights", "What do mobility rights give Canadians?",
  ["The right to live and work anywhere in Canada, and to enter and leave the country freely",
   "The right to free public transport", "The right to move to any other country",
   "The right to change province without telling any government"], 0),
 ("rights", "Which of these is a responsibility of Canadian citizenship?",
  ["Serving on a jury when called to do so", "Joining a political party",
   "Owning property", "Speaking both official languages"], 0),
 ("rights", "What does Canadian law say about military service?",
  ["There is no compulsory military service in Canada",
   "Every citizen must serve for two years", "Only men must serve",
   "Service is compulsory in wartime only"], 0),
 ("rights", "Under Canadian law, what is the status of men and women?",
  ["Men and women are equal under the law", "Men have priority in family matters",
   "It depends on the province", "It is decided by each community"], 0),
 ("rights", "What does the responsibility of 'obeying the law' rest on?",
  ["The rule of law, under which no person or group is above the law",
   "The decisions of the police", "The will of the majority in each town",
   "The discretion of the Prime Minister"], 0),
 ("rights", "Which of these is named in the guide as a citizenship responsibility?",
  ["Helping others in the community", "Attending church",
   "Flying the flag at home", "Learning a third language"], 0),

 # ---- How Canadians govern themselves ---------------------------------------------------
 ("govern", "What are the three key facts about Canada's system of government?",
  ["It is a federal state, a parliamentary democracy and a constitutional monarchy",
   "It is a republic, a direct democracy and a federation",
   "It is a unitary state, a presidential democracy and a monarchy",
   "It is a confederation, a republic and a parliamentary democracy"], 0),
 ("govern", "What are the three parts of Parliament?",
  ["The Sovereign, the Senate and the House of Commons",
   "The Prime Minister, the Cabinet and the Senate",
   "The House of Commons, the Supreme Court and the Senate",
   "The Governor General, the Prime Minister and the House of Commons"], 0),
 ("govern", "Which Act of 1867 defined the responsibilities of the federal and provincial governments?",
  ["The British North America Act, now known as the Constitution Act, 1867",
   "The Quebec Act", "The Statute of Westminster", "The Canada Act"], 0),
 ("govern", "Which of these is a federal responsibility?",
  ["Citizenship", "Education", "Health", "Highways"], 0),
 ("govern", "Which of these is a provincial responsibility?",
  ["Education", "Currency", "Foreign policy", "Criminal law"], 0),
 ("govern", "Which two areas do the federal government and the provinces share jurisdiction over?",
  ["Agriculture and immigration", "Defence and currency",
   "Health and education", "Criminal law and citizenship"], 0),
 ("govern", "How do senators take their seats, and how long do they serve?",
  ["They are appointed by the Governor General on the advice of the Prime Minister, and serve until age 75",
   "They are elected for a fixed term of eight years",
   "They are chosen by the provincial legislatures for life",
   "They are elected at the same time as members of the House of Commons"], 0),
 ("govern", "Who grants royal assent to a bill, and on whose behalf?",
  ["The Governor General, on behalf of the Sovereign", "The Prime Minister, on behalf of Parliament",
   "The Speaker of the House of Commons", "The Chief Justice of the Supreme Court"], 0),
 ("govern", "What must happen before a bill becomes law in Canada?",
  ["It must be passed by both the House of Commons and the Senate, and receive royal assent",
   "It must be passed by the House of Commons alone",
   "It must be approved in a national referendum",
   "It must be signed by the Prime Minister"], 0),
 # Reworded away from IRCC's own "What does it mean to say that Canada is a constitutional
 # monarchy?", which the originality gate below flagged as word-for-word identical.
 ("govern", "In Canada's constitutional monarchy, what does the Sovereign reign in accordance with?",
  ["The Constitution, and so the rule of law",
   "The instructions of the Prime Minister",
   "A vote of the House of Commons",
   "The advice of the Supreme Court"], 0),
 ("govern", "What happens to Cabinet ministers who are defeated in a non-confidence vote?",
  ["They have to resign", "They may stay in office for one more year",
   "They are appointed to the Senate", "Nothing; the vote is only advisory"], 0),

 # ---- Federal elections -----------------------------------------------------------------
 ("elections", "Under legislation passed by Parliament, when must a federal election be held?",
  ["On the third Monday in October every four years after the most recent general election",
   "On the first Tuesday in November every four years",
   "In the spring of every fifth year", "Whenever the Senate decides"], 0),
 ("elections", "Who may ask the Governor General to call an earlier election?",
  ["The Prime Minister", "The Speaker of the Senate",
   "The Chief Electoral Officer", "The Chief Justice"], 0),
 ("elections", "What are the three requirements to vote in a federal election?",
  ["Being a Canadian citizen, being at least 18 on voting day, and being on the voters' list",
   "Being a resident of Canada, being 21, and owning property",
   "Being a Canadian citizen, speaking English or French, and paying taxes",
   "Being born in Canada, being 18, and having a passport"], 0),
 ("elections", "What is an electoral district also known as?",
  ["A riding or constituency", "A ward or precinct",
   "A canton", "A parish"], 0),
 ("elections", "In each electoral district, which candidate becomes the member of Parliament?",
  ["The candidate who receives the most votes",
   "The candidate whose party wins nationally",
   "The candidate who receives more than half of all votes",
   "The candidate chosen by the outgoing MP"], 0),
 ("elections", "Which neutral agency of Parliament produces the voters' lists?",
  ["Elections Canada", "Statistics Canada",
   "The Privy Council Office", "The Department of Justice"], 0),
 ("elections", "What is a majority government?",
  ["One where the party in power holds at least half of the seats in the House of Commons",
   "One where the party in power holds fewer than half of the seats",
   "One formed by two or more parties together",
   "One where the party in power won the most votes nationally"], 0),
 ("elections", "What does the right to a secret ballot mean?",
  ["No one can watch you vote and no one has the right to insist you say how you voted",
   "You must not discuss politics on election day",
   "Ballots are destroyed after counting",
   "Only election officers may know your name"], 0),
 ("elections", "After an election, who is ordinarily invited to form the government?",
  ["The leader of the party with the most seats in the House of Commons",
   "The leader of the party with the most votes nationally",
   "The longest-serving member of Parliament",
   "The Speaker of the House of Commons"], 0),
 ("elections", "What is the Official Opposition?",
  ["The opposition party with the most members in the House of Commons",
   "Any party that voted against the budget",
   "The second chamber of Parliament",
   "A committee of senators who review government bills"], 0),

 # ---- Canadian symbols ------------------------------------------------------------------
 ("symbols", "In which year was a new Canadian flag raised for the first time?",
  ["1965", "1921", "1867", "1982"], 0),
 ("symbols", "Where does the red-white-red pattern of the Canadian flag come from?",
  ["The flag of the Royal Military College in Kingston",
   "The flag of the Hudson's Bay Company",
   "The Union Jack", "The flag of Quebec"], 0),
 ("symbols", "Since when have red and white been the national colours of Canada?",
  ["1921", "1867", "1965", "1931"], 0),
 ("symbols", "Which flag is Canada's official Royal Flag?",
  ["The Union Jack", "The Canadian Red Ensign",
   "The Royal Standard of Quebec", "The flag of the Royal Military College"], 0),
 ("symbols", "What is Canada's best-known symbol?",
  ["The maple leaf", "The beaver", "The fleur-de-lys", "The Crown"], 0),
 ("symbols", "What does Canada's national motto, A Mari Usque Ad Mare, mean?",
  ["From sea to sea", "Peace, order and good government",
   "Strong and free", "One land, one people"], 0),
 ("symbols", "When did Canada adopt an official coat of arms and a national motto?",
  ["As an expression of national pride after the First World War",
   "At Confederation in 1867", "When the new flag was raised in 1965",
   "When the Constitution was amended in 1982"], 0),
 ("symbols", "In which year did Quebec adopt its own flag, based on the Cross and the fleur-de-lys?",
  ["1948", "1867", "1965", "1912"], 0),
 ("symbols", "Which institutions is the Crown a symbol of?",
  ["Parliament, the legislatures, the courts, police services and the Canadian Forces",
   "Only the monarchy and the Governor General",
   "The federal government alone", "The Senate and the House of Commons only"], 0),
 ("symbols", "During whose reign did Canada become a constitutional monarchy in its own right, at Confederation?",
  ["Queen Victoria", "Queen Elizabeth II", "King George V", "King Charles III"], 0),

 # ---- History ---------------------------------------------------------------------------
 ("history", "Who was the first to map Canada's Atlantic shore, in 1497?",
  ["John Cabot", "Jacques Cartier", "Samuel de Champlain", "Henry Hudson"], 0),
 ("history", "Who built a fortress in 1608 at what is now Quebec City?",
  ["Samuel de Champlain", "John Cabot", "Sir Guy Carleton", "Sir Leonard Tilley"], 0),
 ("history", "In which year did the French and the Iroquois make peace?",
  ["1701", "1608", "1774", "1812"], 0),
 ("history", "Why did the British Parliament pass the Quebec Act of 1774?",
  ["To better govern the French Roman Catholic majority",
   "To create the Dominion of Canada",
   "To abolish slavery in the colonies",
   "To unite Upper and Lower Canada"], 0),
 ("history", "Where and when was the first representative assembly in what is now Canada elected?",
  ["Halifax, Nova Scotia, in 1758", "Quebec City in 1774",
   "Toronto in 1813", "Charlottetown in 1864"], 0),
 ("history", "In which year did the British Parliament abolish slavery throughout the Empire?",
  ["1833", "1807", "1867", "1793"], 0),
 ("history", "Which country launched an invasion of Canada in June 1812?",
  ["The United States", "France", "Spain", "Russia"], 0),
 ("history", "What was the outcome of the War of 1812 for Canada?",
  ["The American attempt to conquer Canada failed, and Canada remained independent of the United States",
   "Canada was annexed by the United States",
   "Britain gave up its North American colonies",
   "Upper and Lower Canada were united"], 0),
 ("history", "In 1840, Upper and Lower Canada were united as what?",
  ["The Province of Canada", "The Dominion of Canada",
   "The Confederation of Canada", "British North America"], 0),
 ("history", "Which was the first British North American colony to attain full responsible government?",
  ["Nova Scotia, in 1847-48", "Ontario, in 1867",
   "New Brunswick, in 1785", "Prince Edward Island, in 1773"], 0),
 ("history", "On what date was the Dominion of Canada officially born?",
  ["1 July 1867", "1 April 1867", "11 December 1931", "17 April 1982"], 0),
 ("history", "Who suggested the term 'Dominion of Canada' in 1864?",
  ["Sir Leonard Tilley", "Sir John A. Macdonald",
   "Sir Guy Carleton", "Sir Wilfrid Laurier"], 0),

 # ---- Regions ---------------------------------------------------------------------------
 ("regions", "What is the capital city of Ontario?",
  ["Toronto", "Ottawa", "Kingston", "Hamilton"], 0),
 ("regions", "What is the capital city of Quebec?",
  ["Quebec City", "Montreal", "Laval", "Gatineau"], 0),
 ("regions", "What is the capital city of Nova Scotia?",
  ["Halifax", "Sydney", "Fredericton", "Charlottetown"], 0),
 ("regions", "What is the capital city of British Columbia?",
  ["Victoria", "Vancouver", "Kelowna", "Prince George"], 0),
 ("regions", "What is the capital city of Alberta?",
  ["Edmonton", "Calgary", "Red Deer", "Banff"], 0),
 ("regions", "What is the capital city of Manitoba?",
  ["Winnipeg", "Brandon", "Regina", "Thunder Bay"], 0),
 ("regions", "What is the capital city of Saskatchewan?",
  ["Regina", "Saskatoon", "Moose Jaw", "Prince Albert"], 0),
 ("regions", "What is the capital city of Newfoundland and Labrador?",
  ["St. John's", "Corner Brook", "Halifax", "Gander"], 0),
 ("regions", "What is the capital city of New Brunswick?",
  ["Fredericton", "Moncton", "Saint John", "Bathurst"], 0),
 ("regions", "What is the capital city of Prince Edward Island?",
  ["Charlottetown", "Summerside", "Halifax", "Montague"], 0),
 ("regions", "What is the capital city of Nunavut?",
  ["Iqaluit", "Yellowknife", "Whitehorse", "Rankin Inlet"], 0),
 ("regions", "What is the capital city of the Northwest Territories?",
  ["Yellowknife", "Iqaluit", "Whitehorse", "Inuvik"], 0),
 ("regions", "What is the capital city of Yukon?",
  ["Whitehorse", "Dawson City", "Yellowknife", "Skagway"], 0),
 ("regions", "Which four provinces make up the Atlantic region?",
  ["Newfoundland and Labrador, Prince Edward Island, Nova Scotia and New Brunswick",
   "Quebec, Ontario, Manitoba and Nova Scotia",
   "Nova Scotia, New Brunswick, Quebec and Ontario",
   "Prince Edward Island, Nova Scotia, New Brunswick and Quebec"], 0),
 ("regions", "Which three provinces are the Prairie Provinces?",
  ["Manitoba, Saskatchewan and Alberta",
   "Alberta, British Columbia and Saskatchewan",
   "Manitoba, Ontario and Saskatchewan",
   "Saskatchewan, Alberta and the Northwest Territories"], 0),
 ("regions", "Which two provinces make up Central Canada?",
  ["Quebec and Ontario", "Ontario and Manitoba",
   "Quebec and New Brunswick", "Ontario and Alberta"], 0),

 # ---- Justice ---------------------------------------------------------------------------
 ("justice", "What is the Canadian justice system founded on in criminal matters?",
  ["The presumption of innocence - everyone is innocent until proven guilty",
   "The balance of probabilities", "The discretion of the judge",
   "The decision of the police"], 0),
 ("justice", "Which is Canada's highest court?",
  ["The Supreme Court of Canada", "The Federal Court of Canada",
   "The Court of Queen's Bench", "The Ontario Court of Appeal"], 0),
 ("justice", "What does the Federal Court of Canada deal with?",
  ["Matters concerning the federal government", "All criminal trials",
   "Family law in every province", "Small claims"], 0),
 ("justice", "What is due process?",
  ["The principle that government must respect all the legal rights a person is entitled to under the law",
   "The right to a jury in every case",
   "The rule that trials must finish within a year",
   "The requirement that laws be published before they take effect"], 0),
 ("justice", "Who does the law in Canada apply to?",
  ["Everyone, including judges, politicians and the police",
   "Everyone except sitting judges", "Everyone except the Sovereign",
   "Everyone except members of Parliament while in session"], 0),

 # ---- The oath --------------------------------------------------------------------------
 ("oath", "In the Oath of Citizenship, to whom does a new citizen bear true allegiance?",
  ["His Majesty King Charles the Third, King of Canada", "The Prime Minister of Canada",
   "The Governor General of Canada", "The Constitution of Canada"], 0),
 ("oath", "As well as allegiance, what does the Oath of Citizenship now refer to?",
  ["Aboriginal and treaty rights of Indigenous peoples in Canada",
   "The two official languages", "The provinces and territories",
   "The Canadian Charter of Rights and Freedoms"], 0),
]

# The correct answer is written first above, because that is how a human keeps a long list
# of questions straight. It must not SHIP that way - see practice_pack.build_categories,
# which distributes it with a fixed seed.

cats = build_categories(
    Q, S,
    order=["rights", "govern", "elections", "symbols", "history", "regions", "justice", "oath"],
    seed=20260908, id_prefix="ca-",
)

pack = {
  "version": "2026-09-08",
  "language": "en-CA",
  "country": "CA",
  "officialTestName": "Canadian Citizenship Test",
  "contentType": "authored-practice",
  "officialPoolPublished": False,
  "source": f"{GUIDE} (Immigration, Refugees and Citizenship Canada) - {BASE}.html",
  "sourceRetrieved": "2026-09-08",
  "basedOn": f"{GUIDE}, published free of charge by Immigration, Refugees and Citizenship Canada - {BASE}.html",
  "nonAffiliation": (
    "These are our own practice questions. They are not the official test questions, and "
    "this app is not affiliated with, endorsed by or approved by the Government of Canada "
    "or Immigration, Refugees and Citizenship Canada. Canada does not publish the real "
    "question pool, so nobody has it."
  ),
  "disclosure": (
    "Canada does not publish the questions used in the citizenship test, so these are "
    "practice questions we wrote ourselves. Every one of them tests a fact stated in "
    f"{GUIDE}, the free official study guide, and records the chapter it came from so you "
    "can check it. IRCC's own advice is that the official guide is the only official study "
    "guide and should be your primary resource - it is free, and we link to every chapter."
  ),
  "questionFormat": "single-choice-4",
  "askedPerTest": 20,
  "passRequirement": 15,
  "timeLimitMinutes": 45,
  "totalQuestions": len(Q),
  "licence": {
    "name": "Our own questions; facts drawn from a Crown-copyright publication",
    "url": f"{BASE}/notice.html",
    "attribution": (
      f"Facts drawn from {GUIDE}, Immigration, Refugees and Citizenship Canada. "
      "Questions written by Prepare for Citizenship."
    ),
    "reviewStatus": "cleared",
    "reviewedOn": "2026-09-08",
    "obligations": [
      "Do not reproduce the guide's wording. These questions restate facts, which are not "
      "copyrightable; the guide's expression of them is.",
      "Never present these as the official test questions.",
      "Point users to the free official guide as their primary resource, as IRCC asks.",
    ],
  },
  "categories": cats,
}

offline = "--offline" in sys.argv
enforce_originality(
    [q for _, q, _, _ in Q],
    fetch_published_questions(f"{BASE}/study-questions.html", offline),
    offline,
    "IRCC",
)
out = write_pack("apps/us-citizenship/content/ca/practice-questions.json", pack)
print(f"wrote {out}")
print(f"  {len(Q)} questions in {len(pack['categories'])} sections")
for c in pack["categories"]:
    print(f"    {c['section']}: {len(c['questions'])}")
