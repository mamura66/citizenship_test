#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Build Canada's French practice-question pack.

    python3 tools/build-ca-fr-practice-pack.py

Canada's citizenship test may be taken in either official language - "vous pouvez le
passer en français ou en anglais" - and IRCC publishes *Découvrir le Canada* in French at
the /fr/ equivalent of every English URL. So an English-only Canadian product is not a
finished one, and this is the other half.

These are **not translations of the English pack**. They are written from the French guide,
because the French guide is not a translation either - it is the official text a French
candidate studies, and its terms of art are the ones they will see on the day:

  * "d'un océan à l'autre", not the English guide's "from sea to sea", for
    *A mari usque ad mare*.
  * "la Chambre des communes", "le gouverneur général", "la sanction royale",
    "la Cour suprême du Canada", "la présomption d'innocence".
  * "le roi Charles Trois", exactly as the French Oath sets it out.

Translating the English questions would have produced French sentences carrying English
concepts, and in a test taken in French that is a worse error than a missing question.

The originality reference is IRCC's own French sample questions, from the French guide -
not the English ones. A French question of ours converging on a French question of theirs
is the failure that matters here, and comparing against English would never see it.

The same staleness caveat applies as the English pack: the French guide also says
"308 zones électorales", untrue since 2015, so nothing here asks about it.
"""

import re
import sys
import unicodedata
import urllib.request

from practice_pack import build_categories, enforce_originality, write_pack

GUIDE = "Découvrir le Canada : les droits et responsabilités liés à la citoyenneté"
BASE = ("https://www.canada.ca/fr/immigration-refugies-citoyennete/organisation/"
        "publications-guides/decouvrir-canada/lisez-ligne")

S = {
    "droits":    ("Les droits et responsabilités liés à la citoyenneté", f"{BASE}/droits-responsabilites-citoyennete.html"),
    "gouv":      ("Le système de gouvernement du Canada",                f"{BASE}/canadiens-systeme-gouvernement.html"),
    "elections": ("Les élections fédérales",                             f"{BASE}/elections-federales.html"),
    "symboles":  ("Les symboles canadiens",                              f"{BASE}/symboles-canadiens.html"),
    "histoire":  ("L'histoire du Canada",                                f"{BASE}/histoire-canada.html"),
    "regions":   ("Les régions du Canada",                               f"{BASE}/regions-canada.html"),
    "justice":   ("Le système de justice",                               f"{BASE}/systeme-justice.html"),
    "serment":   ("Le serment de citoyenneté",                           f"{BASE}/serment-citoyennete.html"),
}

# (section, question, options with the correct answer FIRST, correct index)
Q = [
 # ---- Droits et responsabilités ---------------------------------------------------------
 ("droits", "La tradition de liberté ordonnée du Canada remonte à la signature de quel document?",
  ["La Magna Carta, signée en Angleterre en 1215", "La Loi constitutionnelle de 1867",
   "La Charte canadienne des droits et libertés", "L'Acte de Québec de 1774"], 0),
 ("droits", "Quel droit permet de contester une détention illégale par l'État?",
  ["L'habeas corpus", "La liberté de circulation et d'établissement",
   "La sanction royale", "La primauté du droit"], 0),
 ("droits", "En quelle année la Constitution du Canada a-t-elle été modifiée pour y inclure la Charte canadienne des droits et libertés?",
  ["1982", "1867", "1965", "1931"], 0),
 ("droits", "D'où l'habeas corpus est-il emprunté?",
  ["De la common law britannique", "Du code civil de la France",
   "De la Charte canadienne des droits et libertés", "Des lois provinciales"], 0),
 ("droits", "Laquelle de ces libertés fondamentales est garantie au Canada?",
  ["La liberté de réunion pacifique", "La liberté de ne pas payer d'impôts",
   "Le droit de porter une arme", "Le droit à un emploi dans la fonction publique"], 0),
 ("droits", "Que garantit la liberté de circulation et d'établissement?",
  ["Le droit de vivre et de travailler n'importe où au Canada, d'entrer au pays et d'en sortir librement",
   "Le droit aux transports en commun gratuits",
   "Le droit de s'installer dans n'importe quel autre pays",
   "Le droit de changer de province sans en informer personne"], 0),
 ("droits", "Laquelle de ces responsabilités est liée à la citoyenneté canadienne?",
  ["Faire partie d'un jury lorsqu'on est appelé à le faire",
   "Adhérer à un parti politique", "Être propriétaire",
   "Parler les deux langues officielles"], 0),
 ("droits", "Que prévoit le droit canadien au sujet du service militaire?",
  ["Le service militaire n'est pas obligatoire au Canada",
   "Chaque citoyen doit servir pendant deux ans",
   "Seuls les hommes doivent servir",
   "Le service est obligatoire en temps de guerre seulement"], 0),
 ("droits", "Quelles sont les sources des règles juridiques du Canada?",
  ["Les lois du Parlement et des assemblées législatives, la common law, le code civil de la France et la tradition constitutionnelle britannique",
   "Uniquement les lois adoptées par le Parlement du Canada",
   "Uniquement la common law britannique",
   "Uniquement la Charte canadienne des droits et libertés"], 0),
 ("droits", "Selon la loi canadienne, quel est le statut des hommes et des femmes?",
  ["Les hommes et les femmes sont égaux devant la loi",
   "Les hommes ont priorité en matière familiale",
   "Cela dépend de la province", "Chaque communauté en décide"], 0),

 # ---- Le système de gouvernement --------------------------------------------------------
 ("gouv", "Quelles sont les trois parties du Parlement du Canada?",
  ["Le souverain, le Sénat et la Chambre des communes",
   "Le premier ministre, le Cabinet et le Sénat",
   "La Chambre des communes, la Cour suprême et le Sénat",
   "Le gouverneur général, le premier ministre et la Chambre des communes"], 0),
 ("gouv", "Comment les sénateurs sont-ils nommés et jusqu'à quel âge restent-ils en poste?",
  ["Ils sont nommés par le gouverneur général sur recommandation du premier ministre et restent en poste jusqu'à 75 ans",
   "Ils sont élus pour un mandat de huit ans",
   "Ils sont choisis à vie par les assemblées législatives provinciales",
   "Ils sont élus en même temps que les députés"], 0),
 ("gouv", "Qui accorde la sanction royale à un projet de loi, et au nom de qui?",
  ["Le gouverneur général, au nom du souverain",
   "Le premier ministre, au nom du Parlement",
   "Le président de la Chambre des communes",
   "Le juge en chef de la Cour suprême"], 0),
 ("gouv", "Que faut-il pour qu'un projet de loi devienne loi au Canada?",
  ["Il doit être adopté par la Chambre des communes et le Sénat, puis recevoir la sanction royale",
   "Il doit être adopté par la Chambre des communes seulement",
   "Il doit être approuvé par référendum national",
   "Il doit être signé par le premier ministre"], 0),
 ("gouv", "Quelle est une responsabilité du gouvernement fédéral?",
  ["La citoyenneté", "L'éducation", "La santé", "Les routes"], 0),
 ("gouv", "Quelle est une responsabilité des provinces?",
  ["L'éducation", "La monnaie", "La politique étrangère", "Le droit criminel"], 0),
 ("gouv", "Quels deux domaines relèvent à la fois du gouvernement fédéral et des provinces?",
  ["L'agriculture et l'immigration", "La défense et la monnaie",
   "La santé et l'éducation", "Le droit criminel et la citoyenneté"], 0),
 ("gouv", "Quelle loi de 1867 a défini les responsabilités des gouvernements fédéral et provinciaux?",
  ["L'Acte de l'Amérique du Nord britannique, aujourd'hui la Loi constitutionnelle de 1867",
   "L'Acte de Québec", "Le Statut de Westminster", "La Loi sur le Canada"], 0),
 ("gouv", "Qu'arrive-t-il aux ministres du Cabinet défaits lors d'un vote de censure?",
  ["Ils doivent démissionner", "Ils peuvent rester en poste une année de plus",
   "Ils sont nommés au Sénat", "Rien : le vote n'est que consultatif"], 0),
 ("gouv", "Qui choisit les ministres du Cabinet?",
  ["Le premier ministre", "Le gouverneur général seul",
   "La Chambre des communes par vote", "Le Sénat"], 0),

 # ---- Les élections fédérales -----------------------------------------------------------
 ("elections", "Selon une loi adoptée par le Parlement, quand les élections fédérales doivent-elles avoir lieu?",
  ["Le troisième lundi d'octobre, tous les quatre ans après les dernières élections générales",
   "Le premier mardi de novembre, tous les quatre ans",
   "Au printemps, tous les cinq ans", "Quand le Sénat en décide"], 0),
 ("elections", "Quel organisme neutre du Parlement établit les listes électorales?",
  ["Élections Canada", "Statistique Canada",
   "Le Bureau du Conseil privé", "Le ministère de la Justice"], 0),
 ("elections", "À partir de quel âge un citoyen canadien peut-il se présenter à une élection fédérale?",
  ["18 ans", "16 ans", "21 ans", "25 ans"], 0),
 ("elections", "Comment appelle-t-on les zones électorales du Canada?",
  ["Des circonscriptions", "Des cantons", "Des paroisses", "Des districts municipaux"], 0),
 ("elections", "Dans chaque circonscription, quel candidat devient député?",
  ["Celui qui obtient le plus de voix",
   "Celui dont le parti gagne à l'échelle nationale",
   "Celui qui obtient plus de la moitié des voix",
   "Celui que désigne le député sortant"], 0),
 ("elections", "Qu'est-ce qu'un gouvernement majoritaire?",
  ["Un gouvernement dont le parti au pouvoir détient au moins la moitié des sièges à la Chambre des communes",
   "Un gouvernement dont le parti au pouvoir détient moins de la moitié des sièges",
   "Un gouvernement formé par deux partis ou plus",
   "Un gouvernement dont le parti a obtenu le plus de voix au pays"], 0),
 ("elections", "Que garantit le scrutin secret?",
  ["Que personne ne peut vous regarder voter ni exiger que vous disiez pour qui vous avez voté",
   "Qu'il est interdit de parler de politique le jour du scrutin",
   "Que les bulletins sont détruits après le dépouillement",
   "Que seuls les agents électoraux connaissent votre nom"], 0),
 ("elections", "Après une élection, qui est habituellement invité à former le gouvernement?",
  ["Le chef du parti qui détient le plus de sièges à la Chambre des communes",
   "Le chef du parti ayant obtenu le plus de voix au pays",
   "Le député le plus ancien", "Le président de la Chambre des communes"], 0),

 # ---- Les symboles canadiens ------------------------------------------------------------
 ("symboles", "En quelle année un nouveau drapeau canadien a-t-il été hissé pour la première fois?",
  ["1965", "1921", "1867", "1982"], 0),
 ("symboles", "Que signifie la devise nationale du Canada, A mari usque ad mare?",
  ["D'un océan à l'autre", "Paix, ordre et bon gouvernement",
   "Fort et libre", "Une terre, un peuple"], 0),
 ("symboles", "À quelle occasion le Canada a-t-il adopté des armoiries officielles et une devise nationale?",
  ["Pour exprimer sa fierté nationale après la Première Guerre mondiale",
   "À la Confédération, en 1867",
   "Lorsque le nouveau drapeau a été hissé en 1965",
   "Lorsque la Constitution a été modifiée en 1982"], 0),
 ("symboles", "En quelle année le Québec a-t-il adopté son propre drapeau?",
  ["1948", "1867", "1965", "1912"], 0),
 ("symboles", "Quel est le symbole le plus connu du Canada?",
  ["La feuille d'érable", "Le castor", "La fleur de lys", "La Couronne"], 0),
 ("symboles", "Depuis quand le rouge et le blanc sont-ils les couleurs nationales du Canada?",
  ["1921", "1867", "1965", "1931"], 0),
 ("symboles", "Quel drapeau est le drapeau royal officiel du Canada?",
  ["L'Union Jack", "Le Red Ensign canadien",
   "Le drapeau du Québec", "Le drapeau du Collège militaire royal"], 0),

 # ---- L'histoire du Canada --------------------------------------------------------------
 ("histoire", "En quelle année le Dominion du Canada a-t-il été officiellement créé?",
  ["Le 1er juillet 1867", "Le 1er avril 1867",
   "Le 11 décembre 1931", "Le 17 avril 1982"], 0),
 ("histoire", "Qui a construit une forteresse en 1608 à l'emplacement actuel de la ville de Québec?",
  ["Samuel de Champlain", "Jean Cabot", "Sir Guy Carleton", "Sir Leonard Tilley"], 0),
 ("histoire", "En quelle année les Français et les Iroquois ont-ils fait la paix?",
  ["1701", "1608", "1774", "1812"], 0),
 ("histoire", "Pourquoi le Parlement britannique a-t-il adopté l'Acte de Québec de 1774?",
  # Le guide dit « la majorité catholique romaine francophone » - repris tel quel plutôt
 # qu'une paraphrase, puisque c'est le vocabulaire que le candidat aura lu.
  ["Pour mieux administrer la majorité catholique romaine francophone",
   "Pour créer le Dominion du Canada",
   "Pour abolir l'esclavage dans les colonies",
   "Pour unir le Haut et le Bas-Canada"], 0),
 ("histoire", "En 1840, le Haut et le Bas-Canada ont été unis pour former quoi?",
  ["La Province du Canada", "Le Dominion du Canada",
   "La Confédération canadienne", "L'Amérique du Nord britannique"], 0),
 ("histoire", "Quel pays a lancé une invasion du Canada en juin 1812?",
  ["Les États-Unis", "La France", "L'Espagne", "La Russie"], 0),
 ("histoire", "Quelle a été l'issue de la guerre de 1812 pour le Canada?",
  ["La tentative américaine de conquérir le Canada a échoué",
   "Le Canada a été annexé par les États-Unis",
   "La Grande-Bretagne a abandonné ses colonies d'Amérique du Nord",
   "Le Haut et le Bas-Canada ont été unis"], 0),
 ("histoire", "Qui a proposé l'expression « Dominion du Canada » en 1864?",
  ["Sir Leonard Tilley", "Sir John A. Macdonald",
   "Sir Guy Carleton", "Sir Wilfrid Laurier"], 0),

 # ---- Les régions du Canada -------------------------------------------------------------
 ("regions", "Quelle est la capitale de l'Ontario?",
  ["Toronto", "Ottawa", "Kingston", "Hamilton"], 0),
 ("regions", "Quelle est la capitale du Québec?",
  ["Québec", "Montréal", "Laval", "Gatineau"], 0),
 ("regions", "Quelle est la capitale de la Nouvelle-Écosse?",
  ["Halifax", "Sydney", "Fredericton", "Charlottetown"], 0),
 ("regions", "Quelle est la capitale de la Colombie-Britannique?",
  ["Victoria", "Vancouver", "Kelowna", "Prince George"], 0),
 ("regions", "Quelle est la capitale de l'Alberta?",
  ["Edmonton", "Calgary", "Red Deer", "Banff"], 0),
 ("regions", "Quelle est la capitale du Manitoba?",
  ["Winnipeg", "Brandon", "Regina", "Thunder Bay"], 0),
 ("regions", "Quelle est la capitale de la Saskatchewan?",
  ["Regina", "Saskatoon", "Moose Jaw", "Prince Albert"], 0),
 ("regions", "Quelle est la capitale de Terre-Neuve-et-Labrador?",
  ["St. John's", "Corner Brook", "Halifax", "Gander"], 0),
 ("regions", "Quelle est la capitale du Nouveau-Brunswick?",
  ["Fredericton", "Moncton", "Saint-Jean", "Bathurst"], 0),
 ("regions", "Quelle est la capitale de l'Île-du-Prince-Édouard?",
  ["Charlottetown", "Summerside", "Halifax", "Montague"], 0),
 ("regions", "Quelle est la capitale du Nunavut?",
  ["Iqaluit", "Yellowknife", "Whitehorse", "Rankin Inlet"], 0),
 ("regions", "Quelle est la capitale des Territoires du Nord-Ouest?",
  ["Yellowknife", "Iqaluit", "Whitehorse", "Inuvik"], 0),
 ("regions", "Quelle est la capitale du Yukon?",
  ["Whitehorse", "Dawson", "Yellowknife", "Skagway"], 0),
 ("regions", "Quelles quatre provinces forment la région de l'Atlantique?",
  ["Terre-Neuve-et-Labrador, l'Île-du-Prince-Édouard, la Nouvelle-Écosse et le Nouveau-Brunswick",
   "Le Québec, l'Ontario, le Manitoba et la Nouvelle-Écosse",
   "La Nouvelle-Écosse, le Nouveau-Brunswick, le Québec et l'Ontario",
   "L'Île-du-Prince-Édouard, la Nouvelle-Écosse, le Nouveau-Brunswick et le Québec"], 0),
 ("regions", "Quelles trois provinces forment les Prairies?",
  ["Le Manitoba, la Saskatchewan et l'Alberta",
   "L'Alberta, la Colombie-Britannique et la Saskatchewan",
   "Le Manitoba, l'Ontario et la Saskatchewan",
   "La Saskatchewan, l'Alberta et les Territoires du Nord-Ouest"], 0),
 ("regions", "Quelles deux provinces forment le Centre du Canada?",
  ["Le Québec et l'Ontario", "L'Ontario et le Manitoba",
   "Le Québec et le Nouveau-Brunswick", "L'Ontario et l'Alberta"], 0),

 # ---- Le système de justice -------------------------------------------------------------
 ("justice", "Sur quoi le système judiciaire canadien est-il fondé en matière criminelle?",
  ["Sur la présomption d'innocence : chacun est innocent jusqu'à preuve du contraire",
   "Sur la prépondérance des probabilités",
   "Sur l'appréciation du juge", "Sur la décision de la police"], 0),
 ("justice", "Quel est le plus haut tribunal du Canada?",
  ["La Cour suprême du Canada", "La Cour fédérale du Canada",
   "La Cour du Banc du Roi", "La Cour d'appel de l'Ontario"], 0),
 ("justice", "De quoi la Cour fédérale du Canada s'occupe-t-elle?",
  ["Des affaires concernant le gouvernement fédéral", "De tous les procès criminels",
   "Du droit de la famille dans chaque province", "Des petites créances"], 0),
 ("justice", "À qui la loi s'applique-t-elle au Canada?",
  ["À tout le monde, y compris les juges, les politiciens et la police",
   "À tout le monde sauf aux juges en fonction",
   "À tout le monde sauf au souverain",
   "À tout le monde sauf aux députés pendant les sessions"], 0),

 # ---- Le serment de citoyenneté ---------------------------------------------------------
 ("serment", "Dans le serment de citoyenneté, à qui le nouveau citoyen porte-t-il sincère allégeance?",
  ["À Sa Majesté le roi Charles Trois, Roi du Canada", "Au premier ministre du Canada",
   "Au gouverneur général du Canada", "À la Constitution du Canada"], 0),
 ("serment", "Outre l'allégeance, à quoi le serment de citoyenneté fait-il désormais référence?",
  ["Aux droits ancestraux et issus de traités des peuples autochtones du Canada",
   "Aux deux langues officielles", "Aux provinces et territoires",
   "À la Charte canadienne des droits et libertés"], 0),
]


def french_sample_questions(offline: bool):
    """IRCC's own French sample questions, for comparison only.

    The FRENCH ones, deliberately. A French question of ours drifting into a French
    question of theirs is the collision that matters for this pack, and comparing against
    the English list would never see it.
    """
    if offline:
        return []
    url = f"{BASE}/exemples-questions-examen.html"
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            page = r.read().decode("utf-8", "replace")
    except OSError as exc:
        raise SystemExit(f"could not fetch {url}: {exc}\npass --offline to skip the check")
    text = re.sub(r"<[^>]+>", "\n", page)
    text = re.sub(r"\s+", " ", unicodedata.normalize("NFKC", text))
    return [q.strip() for q in re.findall(r"[A-ZÀ-Ý][^?]{10,160}\?", text)]


def main():
    offline = "--offline" in sys.argv
    enforce_originality(
        [q for _, q, _, _ in Q], french_sample_questions(offline), offline, "IRCC (français)"
    )

    cats = build_categories(
        Q, S,
        order=["droits", "gouv", "elections", "symboles", "histoire", "regions", "justice", "serment"],
        seed=20260908, id_prefix="ca-fr-",
    )

    pack = {
        "version": "2026-09-08-fr",
        "language": "fr-CA",
        "country": "CA",
        "officialTestName": "Examen pour la citoyenneté canadienne",
        "contentType": "authored-practice",
        "officialPoolPublished": False,
        "source": f"{GUIDE} (Immigration, Réfugiés et Citoyenneté Canada) - {BASE}.html",
        "sourceRetrieved": "2026-09-08",
        "basedOn": f"{GUIDE}, publié gratuitement par Immigration, Réfugiés et Citoyenneté Canada - {BASE}.html",
        "nonAffiliation": (
            "Ce sont nos propres questions d'entraînement. Ce ne sont pas les questions "
            "officielles de l'examen, et cette application n'est ni affiliée au "
            "gouvernement du Canada ou à Immigration, Réfugiés et Citoyenneté Canada, ni "
            "approuvée par eux. Le Canada ne publie pas la banque de questions réelles : "
            "personne ne la possède."
        ),
        "disclosure": (
            "Le Canada ne publie pas les questions utilisées à l'examen de citoyenneté. Ce "
            "sont donc des questions d'entraînement que nous avons rédigées nous-mêmes. "
            f"Chacune porte sur un fait énoncé dans {GUIDE}, le guide d'étude officiel "
            "gratuit, et indique le chapitre d'où elle provient afin que vous puissiez le "
            "vérifier. IRCC précise que le guide officiel est le seul guide d'étude "
            "officiel et qu'il devrait être votre principale ressource : il est gratuit, et "
            "nous renvoyons à chacun de ses chapitres."
        ),
        "questionFormat": "single-choice-4",
        "askedPerTest": 20,
        "passRequirement": 15,
        "timeLimitMinutes": 45,
        "totalQuestions": len(Q),
        "licence": {
            "name": "Nos propres questions; faits tirés d'une publication protégée par le droit d'auteur de la Couronne",
            "url": f"{BASE}/avis.html",
            "attribution": (
                f"Faits tirés de {GUIDE}, Immigration, Réfugiés et Citoyenneté Canada. "
                "Questions rédigées par Prepare for Citizenship."
            ),
            "reviewStatus": "cleared",
            "reviewedOn": "2026-09-08",
            "obligations": [
                "Ne pas reproduire le libellé du guide. Ces questions reformulent des faits, "
                "qui ne sont pas protégés par le droit d'auteur; la formulation du guide l'est.",
                "Ne jamais présenter ces questions comme les questions officielles de l'examen.",
                "Renvoyer les utilisateurs au guide officiel gratuit comme principale ressource, "
                "comme le demande IRCC.",
            ],
        },
        "categories": cats,
    }

    out = write_pack("apps/us-citizenship/content/ca/practice-questions-fr.json", pack)
    print(f"wrote {out}")
    print(f"  {len(Q)} questions dans {len(cats)} sections")
    for c in cats:
        print(f"    {c['section']}: {len(c['questions'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
