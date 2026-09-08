"""Shared machinery for the packs whose questions we write ourselves.

Canada and the United Kingdom do not publish their question pools, so a pack for them is
our own questions testing facts from the official study guide. Australia publishes a
twenty-question sample and nothing more, and its guide is CC BY 4.0, so the same applies
there. Three things have to happen identically for every one of them, and each exists
because getting it wrong would be invisible:

  * The correct answer must be distributed. Questions get authored with the right answer
    first, because that is the only way a human keeps a list of eighty straight. Shipping
    that way puts the answer at option 1 every single time - and the apps deliberately
    never shuffle a pack's printed options, because Germany's four are official and
    reordering them would break their alignment with the pictures. So the shuffle happens
    here, once, with a fixed seed, which keeps the generated file reproducible and its
    diffs readable.

  * Originality must be checked against whatever the government does publish. Our whole
    position is that the questions are ours and only the facts are theirs. A question that
    has drifted into being one of theirs gives that up, and nobody would notice by reading
    the file. This caught a real collision on Canada's first build.

  * The official questions used for that comparison are downloaded, never committed. They
    are the government's expression, and this repository has no business holding a copy.
"""

import json
import os
import random
import re
import urllib.request


def fetch_published_questions(url: str, offline: bool = False):
    """Whatever question text the government does publish, for comparison only.

    Returns an empty list when `offline`, so a build can be run deliberately without the
    check rather than silently skipping it.
    """
    if offline:
        return []
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            page = response.read().decode("utf-8", "replace")
    except OSError as exc:
        raise SystemExit(
            f"could not fetch {url} for the originality check: {exc}\n"
            f"pass --offline to skip it deliberately"
        )
    text = re.sub(r"<[^>]+>", "\n", page)
    return [
        " ".join(line.split())
        for line in text.split("\n")
        if line.strip().endswith("?") and len(line.split()) > 3
    ]


def _significant_words(s: str):
    return {w for w in re.findall(r"[a-z']+", s.lower()) if len(w) > 3}


def check_originality(mine, published, threshold: float = 0.6):
    """Return (similarity, ours, theirs) for every pair too close to ship."""
    problems = []
    for q in mine:
        wq = _significant_words(q)
        if not wq:
            continue
        for other in published:
            wo = _significant_words(other)
            if not wo:
                continue
            jaccard = len(wq & wo) / len(wq | wo)
            if jaccard >= threshold:
                problems.append((round(jaccard, 2), q, other))
    return problems


# Two tiers, because one threshold cannot tell these apart:
#
#   "What is the capital city of Victoria?"  vs  "What is Australia's capital city?"
#
# scores 0.6 and is a perfectly good, different question - short factual questions share
# most of their significant words by construction. Whereas
#
#   "What do the colours of the Australian Aboriginal Flag represent?"  vs
#   "What are the colours of the Australian Aboriginal Flag?"
#
# scores 0.83 and is the same question with a synonym. So >= HARD fails the build, and the
# middle band is printed for a human to look at once rather than blocking every build on a
# coincidence of short sentences.
COLLISION_HARD = 0.8
COLLISION_REVIEW = 0.6


def enforce_originality(mine, published, offline: bool, label: str):
    """Print the outcome, and stop the build when a question is really one of theirs."""
    found = check_originality(mine, published, threshold=COLLISION_REVIEW)
    hard = [x for x in found if x[0] >= COLLISION_HARD]
    review = [x for x in found if x[0] < COLLISION_HARD]

    if review:
        print(f"  {len(review)} pair(s) in the review band "
              f"({COLLISION_REVIEW}-{COLLISION_HARD}) - short questions that share words:")
        for jaccard, ours, theirs in review:
            print(f"    {jaccard}  ours: {ours}\n          theirs: {theirs}")

    if hard:
        print(f"{len(hard)} question(s) too close to {label}'s own wording "
              f"(>= {COLLISION_HARD}):")
        for jaccard, ours, theirs in hard:
            print(f"  jaccard {jaccard}\n    ours:   {ours}\n    theirs: {theirs}")
        raise SystemExit(1)

    print(
        f"originality gate: compared {len(mine)} questions against {len(published)} "
        f"published {label} questions, no collisions"
        + (" (SKIPPED - offline)" if offline else "")
    )


def build_categories(questions, sections, order, seed, id_prefix="", extra=None):
    """Turn authored tuples into pack categories, distributing the correct answer.

    `questions` is a list of (section_key, text, options, correct_index) with the correct
    answer at `correct_index` as authored. `sections` maps a key to (section name, url).
    `id_prefix` is prepended to each section key to form the category id. `extra` is an
    optional callable taking (section_key, question_dict) for per-country fields such as
    Australia's `valuesQuestion` flag.
    """
    rng = random.Random(seed)
    cats = {}
    for i, (key, text, options, correct_index) in enumerate(questions, start=1):
        name, url = sections[key]
        correct = options[correct_index]
        shuffled = list(options)
        rng.shuffle(shuffled)
        q = {
            "id": i,
            "question": text,
            "options": shuffled,
            "correctIndex": shuffled.index(correct),
            "answers": [correct],
            "guideSection": name,
            "guideUrl": url,
        }
        if extra:
            extra(key, q)
        cats.setdefault(key, {"id": f"{id_prefix}{key}", "section": name, "questions": []})
        cats[key]["questions"].append(q)
    return [cats[k] for k in order if k in cats]


def write_pack(relative_path: str, pack: dict) -> str:
    """Write the pack under the repository root and report where it went."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = os.path.join(root, relative_path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(pack, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return out
