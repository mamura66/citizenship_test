#!/usr/bin/env python3
"""Extract the Einbürgerungstest picture-question artwork from the BAMF catalogue PDF.

    python3 tools/extract-de-catalogue-images.py --pdf katalog.pdf --write
    python3 tools/extract-de-catalogue-images.py --pdf katalog.pdf --verify

BAMF revises the catalogue, so this has to be repeatable rather than a thing that happened
once. `--write` regenerates `content/de/img/` and rewrites the pack's image references;
`--verify` re-derives everything and only reports, changing nothing.

Three things here are not obvious and each one was a real bug risk:

1. **Option order cannot come from the XObject names.** For the 19 questions whose four
   options *are* the pictures ("Bild 1".."Bild 4"), the wrong order marks the wrong answer
   correct and the screen still looks perfectly fine. `/Im1` is not the leftmost picture on
   8 of those 19 pages. So the page content stream is interpreted (`q`/`Q`/`cm`/`Do`,
   maintaining the CTM) to recover where each image is actually drawn, and the four are
   ordered by x. The single-row layout that makes this valid is asserted, not assumed.

2. **The /SMask has to be applied.** Almost every image in the catalogue carries a soft
   mask. Ignoring it gives each coat of arms an opaque block instead of a background.

3. **A page-furniture image repeats on all 191 pages** (634x434). It is excluded by size,
   not by name.

The images are then composited onto white, which is how the BAMF page prints them. That is
deliberate: several are black line art, and question 21's second option is a black Chi-Rho
that disappears completely against a dark background.

Requires pypdf and Pillow.
"""

import argparse
import hashlib
import io
import json
import os
import sys
import warnings

warnings.filterwarnings("ignore")

try:
    import pypdf
    from pypdf.generic import ContentStream
    from PIL import Image
except ImportError as exc:  # pragma: no cover
    sys.exit(f"needs pypdf and Pillow: {exc}")

PACK = "apps/us-citizenship/content/de/einbuergerungstest.json"
IMGDIR = "apps/us-citizenship/content/de/img"
FURNITURE = (634, 434)   # the header graphic on every page
MAXEDGE = 1400           # no study screen shows more than this

# Pages whose picture carries a third-party copyright notice in the catalogue itself.
# Section 5(2) UrhG frees the official work; it does not license a photograph that BAMF
# licensed for its own publication. These are never written.
CREDITED_PAGES = {21, 27, 67, 81, 88}


def iter_questions(pack):
    for key in ("categories", "stateCategories"):
        for cat in pack.get(key) or []:
            for q in cat.get("questions") or []:
                yield cat, q


def drawn_boxes(reader, pno):
    """Where each image XObject is actually drawn on the page."""
    cs = ContentStream(reader.pages[pno - 1].get_contents(), reader)
    ctm = [1, 0, 0, 1, 0, 0]
    stack, out = [], []

    def mul(m, n):
        a, b, c, d, e, f = m
        A, B, C, D, E, F = n
        return [a * A + b * C, a * B + b * D, c * A + d * C,
                c * B + d * D, e * A + f * C + E, e * B + f * D + F]

    for operands, op in cs.operations:
        o = op.decode() if isinstance(op, bytes) else str(op)
        if o == "q":
            stack.append(list(ctm))
        elif o == "Q":
            ctm = stack.pop() if stack else [1, 0, 0, 1, 0, 0]
        elif o == "cm":
            ctm = mul([float(x) for x in operands], ctm)
        elif o == "Do":
            out.append({"name": str(operands[0]), "x": ctm[4], "y": ctm[5],
                        "w": abs(ctm[0]), "h": abs(ctm[3])})
    return out


def content_images(reader, pno):
    """The page's real pictures, in reading order, as (name, PIL image)."""
    page = reader.pages[pno - 1]
    xobj = (page.get("/Resources", {}) or {}).get("/XObject")
    if xobj is None:
        return []
    keep = set()
    for name, ref in xobj.get_object().items():
        o = ref.get_object()
        if o.get("/Subtype") != "/Image":
            continue
        if (int(o.get("/Width", 0)), int(o.get("/Height", 0))) == FURNITURE:
            continue
        keep.add(str(name))

    boxes = [b for b in drawn_boxes(reader, pno) if b["name"] in keep]
    boxes.sort(key=lambda b: b["x"])

    if len(boxes) == 4:
        # The four-in-a-row layout is what makes ordering by x correct. Assert it.
        tops = [b["y"] + b["h"] for b in boxes]
        bots = [b["y"] for b in boxes]
        if min(tops) - max(bots) <= 0:
            raise SystemExit(f"page {pno}: the four pictures are not in one row - "
                             f"ordering by x would be wrong, stopping")
        gaps = [boxes[i + 1]["x"] - boxes[i]["x"] for i in range(3)]
        if min(gaps) <= max(b["w"] for b in boxes) - 20:
            raise SystemExit(f"page {pno}: picture columns overlap, cannot order by x")

    loaded = {}
    for im in page.images:
        key = "/" + im.name.rsplit(".", 1)[0]
        if key in keep:
            loaded[key] = Image.open(io.BytesIO(im.data))
    missing = [b["name"] for b in boxes if b["name"] not in loaded]
    if missing:
        raise SystemExit(f"page {pno}: could not decode {missing}")
    return [(b["name"], loaded[b["name"]]) for b in boxes]


def flatten(img):
    """Onto white, as the catalogue page prints it, downscaled if oversized."""
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        bg.alpha_composite(img)
        img = bg
    img = img.convert("RGB")
    if max(img.size) > MAXEDGE:
        s = MAXEDGE / max(img.size)
        img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    return img


def save_smallest(img, stem):
    """Palette PNG when that is exactly lossless, JPEG otherwise."""
    cands = []
    colours = img.getcolors(maxcolors=256)
    if colours:
        p = img.convert("P", palette=Image.ADAPTIVE, colors=max(2, len(colours)))
        p.save(stem + ".png", "PNG", optimize=True)
        cands.append(stem + ".png")
    img.save(stem + ".jpg", "JPEG", quality=90, optimize=True, progressive=True)
    cands.append(stem + ".jpg")
    best = min(cands, key=os.path.getsize)
    for c in cands:
        if c != best:
            os.remove(c)
    return best


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True, help="the BAMF Gesamtfragenkatalog PDF")
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true", help="regenerate img/ and the pack refs")
    mode.add_argument("--verify", action="store_true", help="report only, change nothing")
    args = ap.parse_args(argv)

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pack_path = os.path.join(root, PACK)
    img_dir = os.path.join(root, IMGDIR)
    pack = json.load(open(pack_path, encoding="utf-8"))
    reader = pypdf.PdfReader(args.pdf)

    if args.write:
        os.makedirs(img_dir, exist_ok=True)

    problems, written, skipped = [], 0, []
    for _cat, q in iter_questions(pack):
        if not (q.get("requiresImage") or q.get("image") or q.get("optionImages")):
            continue
        pages = q.get("sourcePages") or []
        if not pages:
            problems.append(f"q{q['id']}: no sourcePages, cannot locate its artwork")
            continue
        pno = pages[0]

        if pno in CREDITED_PAGES:
            skipped.append(q["id"])
            if q.get("image") or q.get("optionImages"):
                problems.append(f"q{q['id']}: page {pno} carries a third-party credit "
                                f"but the pack ships an image for it")
            continue

        imgs = content_images(reader, pno)
        if not imgs:
            problems.append(f"q{q['id']}: page {pno} has no picture")
            continue

        if len(imgs) == 4:
            opts = q.get("options") or []
            if len(opts) != 4:
                problems.append(f"q{q['id']}: 4 pictures but {len(opts)} options")
            expect = [f"img/q{q['id']}-bild{i}" for i in range(1, 5)]
        else:
            expect = [f"img/q{q['id']}"]

        if args.write:
            paths = []
            for rel, (_name, img) in zip(expect, imgs[:len(expect)]):
                best = save_smallest(flatten(img), os.path.join(root, IMGDIR,
                                                                os.path.basename(rel)))
                paths.append("img/" + os.path.basename(best))
                written += 1
            if len(expect) == 4:
                q["optionImages"] = paths
                q.pop("image", None)
            else:
                q["image"] = paths[0]
                q.pop("optionImages", None)
            q["imageSource"] = "bamf-gesamtfragenkatalog-2025"
            q["imageSourcePage"] = pno
        else:
            have = ([q["image"]] if q.get("image") else []) + (q.get("optionImages") or [])
            if len(have) != len(expect):
                problems.append(f"q{q['id']}: pack has {len(have)} image ref(s), "
                                f"the PDF page has {len(imgs)}")
            for ref in have:
                if not os.path.isfile(os.path.join(root, os.path.dirname(PACK), ref)):
                    problems.append(f"q{q['id']}: {ref} is referenced but missing")

    if args.write:
        json.dump(pack, open(pack_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"wrote {written} image file(s) into {IMGDIR} and updated the pack")

    # The cross-check that needs no eyes: the 16 state coats of arms recur as distractors,
    # and no single picture may be the correct answer for two different Bundesländer.
    by_hash = {}
    for cat, q in iter_questions(pack):
        if not q.get("optionImages") or q.get("correctIndex") is None:
            continue
        ref = q["optionImages"][q["correctIndex"]]
        full = os.path.join(root, os.path.dirname(PACK), ref)
        if not os.path.isfile(full):
            continue
        h = hashlib.sha256(open(full, "rb").read()).hexdigest()
        by_hash.setdefault(h, []).append(f"{cat.get('stateCode') or cat.get('id')}/q{q['id']}")
    clashes = {h: v for h, v in by_hash.items() if len(v) > 1}
    for v in clashes.values():
        problems.append(f"one picture is the correct answer for more than one question: {v}")

    print(f"skipped {len(skipped)} question(s) whose picture is third-party copyright: {skipped}")
    print(f"answer-picture uniqueness: {len(by_hash)} distinct, {len(clashes)} clash(es)")
    if problems:
        print("\nproblems:")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("no problems found")
    return 0


if __name__ == "__main__":
    sys.exit(main())
