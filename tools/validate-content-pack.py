#!/usr/bin/env python3
"""Validate a question pack in apps/us-citizenship/content/<country>/.

Usage:
    python3 tools/validate-content-pack.py apps/us-citizenship/content/au/citizenship-practice.json
    python3 tools/validate-content-pack.py apps/us-citizenship/content/*/*.json

Checks structure, provenance and internal consistency. It cannot check that the
text is verbatim from the source - that is a human step, recorded in the pack
directory's SOURCES.md.

Exit code 0 = every pack passed. 1 = at least one ERROR.
"""

import glob
import json
import os
import re
import sys

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
URL_RE = re.compile(r"https?://[^\s]+")

# Packs whose content is not a full official pool must say so. A pack that
# claims to be an official pool but is really a practice subset is the exact
# misrepresentation this project cannot ship.
#
# `authored-practice` is the third case, and the common one outside the US and Germany:
# the country does not publish its question pool at all, so nobody has the real questions
# and every product in the market - including the official publisher's own app - writes
# questions that test the facts in the official study guide. Facts are not copyrightable;
# the guide's wording is. So these questions are ours, they are built from official
# material, and they must never be presented as the official questions. This type is what
# makes that claim impossible to make by accident.
CONTENT_TYPES = {"official-full-pool", "official-practice-subset", "authored-practice"}

# `authored-practice` packs carry two extra obligations, both user-facing.
AUTHORED_REQUIRED = {
    # The official publication whose facts the questions were written from, with its URL.
    "basedOn": "the official study material these questions were written from",
    # In the user's own words: we are not the government and these are not the real
    # questions. Every competitor states this; it is also simply true.
    "nonAffiliation": "a plain statement that this is not official and not affiliated",
}

# Spellings we author ourselves must follow the pack's locale. Official
# question text is never touched by this check.
US_SPELLINGS = {
    "color": "colour", "colors": "colours", "honor": "honour",
    "labor": "labour", "organize": "organise", "organized": "organised",
    "organization": "organisation", "recognize": "recognise",
    "recognized": "recognised", "license": "licence (noun)",
    "defense": "defence", "center": "centre", "practise": "practice (noun)",
}
NON_US_SPELLINGS = {
    "colour": "color", "colours": "colors", "honour": "honor",
    "labour": "labor", "organise": "organize", "organised": "organized",
    "organisation": "organization", "recognise": "recognize",
    "recognised": "recognized", "licence": "license", "defence": "defense",
    "centre": "center",
}
# Fields we write ourselves, so locale rules apply to them.
AUTHORED_TEXT_FIELDS = ("disclosure",)

# Damage that PDF extraction does silently. Every one of these has a real cause: UTF-8
# read as Latin-1 turns "ä" into "Ã¤"; the catalogue draws its empty answer boxes with a
# Wingdings private-use glyph that comes through as text; and a soft hyphen or zero-width
# space is invisible in a diff but breaks a string comparison against the source. Germany
# is the first pack extracted from a PDF, and Spain and the UK will be too.
MOJIBAKE = ("\u00c3\u00a4", "\u00c3\u00b6", "\u00c3\u00bc", "\u00c3\u009f",
            "\u00c3\u201e", "\u00c3\u2013", "\u00c3\u0153", "\u00e2\u20ac",
            "\ufffd")
CHECKBOX_GLYPHS = ("\uf0a3", "\u25a1", "\u2610")
BAD_CONTROL = ("\ufeff", "\u200b", "\u00ad")
PLACEHOLDER_RE = re.compile(r"\b(TODO|TBD|FIXME|XXX|PLACEHOLDER|LOREM|Lorem ipsum)\b", re.I)
# A trailing ellipsis is how a sentence-completion stem is legitimately written. One wedged
# between word characters means the text was truncated during extraction.
TRUNCATED_RE = re.compile(r"\w\.\.\.\w|\w\u2026\w")


class Report:
    def __init__(self, path):
        self.path = path
        self.errors = []
        self.warnings = []
        self.notes = []

    def error(self, msg):
        self.errors.append(msg)

    def warn(self, msg):
        self.warnings.append(msg)

    def note(self, msg):
        self.notes.append(msg)

    def print(self):
        status = "FAIL" if self.errors else ("PASS with warnings" if self.warnings else "PASS")
        print(f"\n{self.path}\n  {status}")
        for e in self.errors:
            print(f"  ERROR   {e}")
        for w in self.warnings:
            print(f"  WARN    {w}")
        for n in self.notes:
            print(f"  note    {n}")


def check_provenance(pack, r):
    for key in ("version", "language", "source", "sourceRetrieved", "totalQuestions", "categories"):
        if key not in pack:
            r.error(f"missing required top-level key: {key}")

    src = pack.get("source", "")
    if not URL_RE.search(str(src)):
        r.error("source must contain the URL the content came from")

    retrieved = pack.get("sourceRetrieved", "")
    if not DATE_RE.match(str(retrieved)):
        r.error(f"sourceRetrieved must be YYYY-MM-DD, got {retrieved!r}")

    lang = str(pack.get("language", ""))
    if not re.match(r"^[a-z]{2}(-[A-Z]{2})?$", lang):
        r.error(f"language must be a BCP-47 tag like 'en-AU', got {lang!r}")

    ctype = pack.get("contentType")
    if ctype is None:
        r.warn("no contentType: a reader cannot tell an official pool from a practice subset")
    elif ctype not in CONTENT_TYPES:
        r.error(f"contentType must be one of {sorted(CONTENT_TYPES)}, got {ctype!r}")
    else:
        # Whichever it is, the pack has to say so in words a user could read,
        # and the claim about the official pool has to be made deliberately.
        if not str(pack.get("disclosure", "")).strip():
            r.error("contentType is set, so 'disclosure' must say in words what this content is")
        expected = ctype == "official-full-pool"
        if pack.get("officialPoolPublished") is not expected:
            r.error(
                f"contentType {ctype!r} requires officialPoolPublished to be {str(expected).lower()}"
            )

        if ctype == "authored-practice":
            for key, what in sorted(AUTHORED_REQUIRED.items()):
                if not str(pack.get(key, "")).strip():
                    r.error(f"authored-practice packs must set {key!r}: {what}")
            based = str(pack.get("basedOn", ""))
            if based and not URL_RE.search(based):
                r.error("basedOn must include the URL of the official study material")
            # The giveaway that someone has mislabelled a scraped official pool as ours.
            if pack.get("officialNumbersPresent") or any(
                q.get("officialNumber") is not None
                for key2 in ("categories", "stateCategories")
                for cat in (pack.get(key2) or [])
                if isinstance(cat, dict)
                for q in (cat.get("questions") or [])
            ):
                r.error(
                    "authored-practice questions carry officialNumber, which only an "
                    "official question has - either these are not ours, or the field is wrong"
                )

    lic = pack.get("licence") or pack.get("license")
    if lic is None:
        r.warn("no licence block: US federal works need none, everything else does")
    else:
        for key in ("name", "url", "attribution"):
            if not str(lic.get(key, "")).strip():
                r.error(f"licence.{key} is required when a licence block is present")


def check_locale(pack, r):
    lang = str(pack.get("language", ""))
    if lang.startswith("en-US"):
        bad = NON_US_SPELLINGS
    elif lang.startswith("en"):
        bad = US_SPELLINGS
    else:
        return
    for field in AUTHORED_TEXT_FIELDS:
        text = str(pack.get(field, "")).lower()
        for word, better in bad.items():
            if re.search(rf"\b{word}\b", text):
                r.warn(f"{field}: {word!r} does not match language {lang} (expected {better!r})")


def check_extraction_damage(label, value, r):
    """Text that came out of a PDF wrong in ways a reader would not notice."""
    if not isinstance(value, str):
        return
    if "  " in value:
        r.warn(f"{label}: double space -> {value[:70]!r}")
    for bad in MOJIBAKE:
        if bad in value:
            r.error(f"{label}: mojibake {bad!r} - UTF-8 read as Latin-1 -> {value[:70]!r}")
    for glyph in CHECKBOX_GLYPHS:
        if glyph in value:
            r.error(f"{label}: leftover checkbox glyph U+{ord(glyph):04X} from the source PDF")
    for ctrl in BAD_CONTROL:
        if ctrl in value:
            r.error(f"{label}: invisible character U+{ord(ctrl):04X} (BOM, zero-width space "
                    f"or soft hyphen) - breaks any comparison against the source")
    if PLACEHOLDER_RE.search(value):
        r.error(f"{label}: placeholder text -> {value[:70]!r}")
    if TRUNCATED_RE.search(value):
        r.error(f"{label}: ellipsis inside a word, so the text was truncated -> {value[:70]!r}")


def check_questions(pack, r):
    cats = pack.get("categories") or []
    if not cats:
        r.error("no categories")
        return

    # Germany keeps its 160 Bundesland questions in a second list, `stateCategories`.
    # Those were going unchecked entirely - no id uniqueness, no answer-is-an-option -
    # so a state pack could ship an answer that is not one of its own options and
    # nothing here would have said so.
    groups = [("categories", cats)]
    if isinstance(pack.get("stateCategories"), list):
        groups.append(("stateCategories", pack["stateCategories"]))

    seen_ids = {}
    general_text = {}
    counts = {}
    ids_by_group = {}
    restems = {}

    for list_name, group in groups:
        total = 0
        ids_by_group[list_name] = []
        for ci, cat in enumerate(group):
            where = f"{list_name}[{ci}]"
            if not str(cat.get("id", "")).strip():
                r.error(f"{where}: missing id")
            if not str(cat.get("section", "")).strip():
                r.error(f"{where}: missing section")
            questions = cat.get("questions") or []
            if not questions:
                r.error(f"{where} ({cat.get('id')}): no questions")

            # A repeated stem is not by itself a duplicate. BAMF's catalogue asks
            # "Welches Land ist ein Nachbarland von Deutschland?" five times, each with a
            # different set of four countries and a different right answer - five separate
            # official questions that happen to share a sentence. So the identity of a
            # question is its text AND its options; only both together repeating means one
            # of the two is dead weight. Scoped per category for state lists, where
            # "Welches Bundesland ist ein Stadtstaat?" recurs across Bundesländer.
            seen_text = general_text if list_name == "categories" else {}

            for q in questions:
                total += 1
                qid = q.get("id")
                label = f"{cat.get('id')}/q{qid}"
                if not isinstance(qid, int):
                    r.error(f"{label}: id must be an integer")
                elif qid in seen_ids:
                    r.error(f"id {qid} used twice ({seen_ids[qid]} and {label})")
                else:
                    seen_ids[qid] = label
                    ids_by_group[list_name].append(qid)

                text = str(q.get("question", "")).strip()
                if not text:
                    r.error(f"{label}: empty question text")
                else:
                    opts = q.get("options")
                    shape = tuple(str(o) for o in opts) if isinstance(opts, list) else None
                    key = (text.lower(), shape)
                    if key in seen_text:
                        r.error(
                            f"{label}: same question text AND same options as "
                            f"{seen_text[key]} - one of the two is a duplicate"
                        )
                    else:
                        seen_text[key] = label
                        restems.setdefault(text.lower(), []).append(label)
                    if text != q.get("question"):
                        r.error(f"{label}: question text has leading/trailing whitespace")
                    check_extraction_damage(f"{label} question", q.get("question"), r)
                    for oi, opt in enumerate(q.get("options") or []):
                        check_extraction_damage(f"{label} option {oi + 1}", opt, r)

                answers = q.get("answers")
                if not isinstance(answers, list) or not answers:
                    r.error(f"{label}: answers must be a non-empty list")
                    answers = []
                for a in answers:
                    if not str(a).strip():
                        r.error(f"{label}: empty answer")

                options = q.get("options")
                if options is not None:
                    if not isinstance(options, list) or len(options) < 2:
                        r.error(f"{label}: options must be a list of at least 2")
                    else:
                        if len(set(options)) != len(options):
                            r.error(f"{label}: duplicate options")
                        for a in answers:
                            if a not in options:
                                r.error(f"{label}: answer {a!r} is not one of the options")
                        ci_ = q.get("correctIndex")
                        if ci_ is not None:
                            if not isinstance(ci_, int) or not 0 <= ci_ < len(options):
                                r.error(f"{label}: correctIndex {ci_!r} is not a valid index into options")
                            elif answers and options[ci_] not in answers:
                                r.error(
                                    f"{label}: correctIndex points at {options[ci_]!r} "
                                    f"but answers says {answers!r}"
                                )
        counts[list_name] = total

    if pack.get("totalQuestions") != counts.get("categories"):
        r.error(f"totalQuestions says {pack.get('totalQuestions')}, found {counts.get('categories')}")

    if "stateCategories" in counts:
        declared = pack.get("stateQuestionsTotal")
        if declared is None:
            r.warn("stateCategories present but no stateQuestionsTotal to check it against")
        elif declared != counts["stateCategories"]:
            r.error(f"stateQuestionsTotal says {declared}, found {counts['stateCategories']}")

    # Visibility without a failure: a shared stem is normal in the German catalogue, but
    # worth stating out loud so nobody reads it as a copy-paste slip in the pack.
    shared = {t: labels for t, labels in restems.items() if len(labels) > 1}
    if shared:
        r.note(
            f"{len(shared)} question stem(s) appear more than once with different options "
            f"- separate official questions, e.g. {sorted(shared.values())[0]}"
        )

    ids = sorted(ids_by_group.get("categories") or [])
    if ids and ids != list(range(1, len(ids) + 1)):
        r.warn(f"ids are not 1..{len(ids)} without gaps (first={ids[0]}, last={ids[-1]})")


def check_images(pack, r, path):
    """Picture questions: do the files exist, and are we allowed to ship them?

    Germany's catalogue has 38 questions whose answer is a picture. Two failures matter
    and neither is visible by reading the JSON:

      - a path that does not resolve. The question then renders with four blank tiles and
        no answer is reachable, which looks like a bug in the test rather than a missing
        file.
      - shipping a picture that is somebody else's copyright. The question text is an
        official work under section 5(2) UrhG, but five photographs in the catalogue carry
        their own credit line, and those are not ours to redistribute.
    """
    base = os.path.dirname(os.path.abspath(path))
    questions = [
        (cat.get("id"), q)
        for key in ("categories", "stateCategories")
        for cat in (pack.get(key) or [])
        if isinstance(cat, dict)
        for q in (cat.get("questions") or [])
    ]

    shipped = 0
    for cat_id, q in questions:
        label = f"{cat_id}/q{q.get('id')}"
        refs = []
        if q.get("image"):
            refs.append(q["image"])
        if q.get("optionImages"):
            opts = q.get("options") or []
            if not isinstance(q["optionImages"], list):
                r.error(f"{label}: optionImages must be a list")
            elif opts and len(q["optionImages"]) != len(opts):
                r.error(
                    f"{label}: {len(q['optionImages'])} option images for "
                    f"{len(opts)} options - one of them cannot be shown"
                )
            else:
                refs.extend(q["optionImages"])

        for ref in refs:
            shipped += 1
            if os.path.isabs(ref) or ".." in ref.split("/"):
                r.error(f"{label}: image path {ref!r} must be relative to the pack directory")
                continue
            if not os.path.isfile(os.path.join(base, ref)):
                r.error(f"{label}: image {ref!r} does not exist")

        # A credit line naming a rights holder is the pack telling us it is not ours.
        credit = str(q.get("imageCredit") or "")
        if refs and "©" in credit:
            r.error(
                f"{label}: ships an image but imageCredit is {credit!r} - "
                f"a third-party copyright notice. Withdraw the file."
            )

        # A question that cannot be answered without a picture it has not got must be
        # held back, or it goes out as an unanswerable question.
        if q.get("requiresImage") and not refs and q.get("servable") is not False:
            r.error(
                f"{label}: requiresImage is set, no image is shipped, and it is not "
                f"marked servable:false - it would be served unanswerable"
            )

    if shipped:
        lic = pack.get("imageLicence")
        if not isinstance(lic, dict):
            r.warn(f"{shipped} image(s) shipped but no imageLicence block says on what basis")
        elif not str(lic.get("attributionRequired") or "").strip():
            r.warn("imageLicence has no attributionRequired - section 63 UrhG needs a source credit")


def check_mechanics(pack, r):
    asked = pack.get("askedPerTest", pack.get("askedPerInterview"))
    passing = pack.get("passRequirement")
    if asked is None:
        r.warn("no askedPerTest/askedPerInterview: test mechanics are not recorded")
    if passing is None:
        r.warn("no passRequirement: test mechanics are not recorded")
    if isinstance(asked, int) and isinstance(passing, int) and passing > asked:
        r.error(f"passRequirement {passing} exceeds askedPerTest {asked}")

    values = pack.get("valuesRule")
    if isinstance(values, dict):
        v_asked, v_pass = values.get("askedPerTest"), values.get("passRequirement")
        if isinstance(v_asked, int) and isinstance(v_pass, int) and v_pass > v_asked:
            r.error("valuesRule.passRequirement exceeds valuesRule.askedPerTest")
        section = values.get("section")
        sections = {c.get("section") for c in (pack.get("categories") or [])}
        if section and section not in sections:
            r.error(f"valuesRule.section {section!r} matches no category section")
        flagged = sum(
            1
            for c in (pack.get("categories") or [])
            for q in (c.get("questions") or [])
            if q.get("valuesQuestion")
        )
        # The pool is allowed to be bigger than one test - that is the point of a pool.
        # This used to demand that the flagged count EQUAL how many are drawn, which is
        # only true for a pack holding exactly one test's worth. What actually matters is
        # that there are enough to draw from.
        if isinstance(v_asked, int) and flagged and flagged < v_asked:
            r.error(
                f"only {flagged} questions flagged valuesQuestion but valuesRule draws "
                f"{v_asked} - a test cannot be built"
            )
        if isinstance(v_asked, int) and not flagged:
            r.warn(f"valuesRule draws {v_asked} values questions but none are flagged valuesQuestion")


def validate(path):
    r = Report(path)
    try:
        with open(path, encoding="utf-8") as f:
            pack = json.load(f)
    except (OSError, json.JSONDecodeError) as exc:
        r.error(f"could not read as JSON: {exc}")
        r.print()
        return False

    if not isinstance(pack, dict):
        r.error("top level must be an object")
        r.print()
        return False

    # Not every JSON file under content/ is a question pack. The reading and writing
    # vocabulary files also have a `categories` key, but theirs maps a topic name to a
    # list of words - so the test has to be the shape, not the presence of the key.
    # Checking only the key is what made this die with an AttributeError instead.
    cats = pack.get("categories")
    if not isinstance(cats, list) or not all(isinstance(c, dict) for c in cats):
        r.warn("`categories` is not a list of objects - not a question pack, skipped")
        r.print()
        return True

    check_provenance(pack, r)
    check_locale(pack, r)
    check_questions(pack, r)
    check_images(pack, r, path)
    check_mechanics(pack, r)
    r.print()
    return not r.errors


def main(argv):
    paths = []
    for arg in argv:
        paths.extend(sorted(glob.glob(arg)))
    if not paths:
        print("usage: validate-content-pack.py <pack.json> [...]", file=sys.stderr)
        return 2
    results = [validate(p) for p in paths]
    passed = sum(1 for x in results if x)
    print(f"\n{passed}/{len(results)} pack(s) passed")
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
