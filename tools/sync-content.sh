#!/bin/zsh
# The app is the single source of truth for content (it must live inside
# apps/us-citizenship/ or EAS cannot bundle it - see BUILD_PLAN v19). The website reads
# the same files, so they are copied here rather than duplicated by hand.
# Run after any content change, before deploying the site.
#
# It copies whatever country folders it finds, so a new country needs no edit here. What it
# does do is three things beyond copying:
#
#   1. Resolve its own paths from the script's location. It used to depend on being run
#      from the repo root, and `rm -rf "$DST"` with a relative DST is not a mistake worth
#      leaving available.
#   2. Write content/packs.json - the manifest the website reads to know which countries
#      are selectable. Generated from the files that were actually copied, never edited by
#      hand, so a country becomes selectable by having a pack and no other way.
#   3. Say out loud when a synced pack is one the website does not know about, or when a
#      country the website lists has no pack. Both are silent failures otherwise: a pack
#      lands, nothing happens, and nobody can see why.
set -e

ROOT=${0:A:h:h}
SRC="$ROOT/apps/us-citizenship/content"
DST="$ROOT/site/public/content"
LIST="$ROOT/site/public/countries.js"

[[ -d "$SRC" ]] || { echo "no content directory at $SRC" >&2; exit 1 }

# A timestamped copy before the destination is removed, so a sync is reversible.
#
# Deliberately NOT beside $DST. Anything under site/public/ is a static asset: a backup
# left there is served to the internet and shipped on the next deploy, which for content
# held back over a licence question would be the whole problem again. It goes one level up,
# under a `.backup_*` name, which .gitignore already excludes from the repository.
if [[ -d "$DST" ]]; then
  BACKUP="$ROOT/site/.backup_content_$(date +%Y%m%d-%H%M%S)"
  cp -R "$DST" "$BACKUP"
  echo "  previous content backed up to site/${BACKUP:t}"
fi

rm -rf "$DST"
mkdir -p "$DST"

typeset -a synced
for country in "$SRC"/*/; do
  name=$(basename "$country")
  mkdir -p "$DST/$name"
  # The packs themselves, plus anything under the country's img/ directory - Germany's
  # picture questions are unanswerable without those files, so they are content, not
  # decoration. Deliberately NOT everything non-JSON: us/officials/photos are app assets
  # the web app does not use, and SOURCES.md / NOTES.md / validate.py are working notes
  # that have no business being served.
  find "$country" -name "*.json" -not -path "*/.*" | while read -r f; do
    rel=${f#$country}
    mkdir -p "$DST/$name/$(dirname "$rel")"
    cp "$f" "$DST/$name/$rel"
  done
  if [[ -d "$country/img" ]]; then
    mkdir -p "$DST/$name/img"
    find "$country/img" -type f \( -name '*.jpg' -o -name '*.png' -o -name '*.svg' -o -name '*.webp' \) \
      -not -path "*/.*" -exec cp {} "$DST/$name/img/" \;
    echo "  $name: $(ls "$DST/$name/img" | wc -l | tr -d ' ') image(s) ($(du -sh "$DST/$name/img" | cut -f1))"
  fi
  n=$(find "$DST/$name" -name '*.json' | wc -l | tr -d ' ')
  if [[ "$n" == "0" ]]; then
    # An empty country folder is how a pack in progress looks. Leaving a directory behind
    # would put an empty country in the manifest. rm -rf, not rmdir: a country whose
    # images synced but whose pack is still held back has a non-empty img/ directory, and
    # rmdir would silently leave it there to be served.
    rm -rf "$DST/$name"
    echo "  $name: no JSON yet, skipped"
  else
    synced+=("$name")
    echo "  $name: $n files"
  fi
done

# ---- the manifest the website reads -------------------------------------------------
# Scanned out of the destination, so it can only ever describe files that are really there.
python3 - "$DST" <<'PY'
import json, os, sys, datetime

dst = sys.argv[1]

# A pack that says its own licence has not been cleared does not go in the manifest, and
# therefore cannot be chosen on the website. The flag is the content author's, and this is
# what makes it bite: without it, "pending-legal-review" is a note in a file that the
# website happily ignores. Spain's pack is held outside apps/ entirely for the same reason;
# this covers the case where a pack is publishable-looking but flagged.
HELD = ('pending-legal-review', 'blocked', 'hold')

def held_back(path):
    try:
        with open(path, encoding='utf-8') as f:
            pack = json.load(f)
    except (OSError, json.JSONDecodeError):
        return None
    lic = pack.get('licence') or pack.get('license') or {}
    status = str(lic.get('reviewStatus', '')).strip().lower()
    return status if status in HELD else None

packs = {}
withheld = []
for code in sorted(os.listdir(dst)):
    d = os.path.join(dst, code)
    if not os.path.isdir(d):
        continue
    # Top level only. A pack is a file directly under content/<code>/; the officials data
    # lives in a subfolder and is not a question pack.
    files = []
    for f in sorted(os.listdir(d)):
        if not f.endswith('.json') or not os.path.isfile(os.path.join(d, f)):
            continue
        status = held_back(os.path.join(d, f))
        if status:
            withheld.append((code, f, status))
        else:
            files.append(f)
    if files:
        packs[code] = files

out = {
    'generated': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),
    'note': 'Written by tools/sync-content.sh from the files it copied. Never edit by hand.',
    'packs': packs,
}
with open(os.path.join(dst, 'packs.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
    f.write('\n')
print(f"  manifest: {len(packs)} countr{'y' if len(packs) == 1 else 'ies'} with packs -> packs.json")
for code, f, status in withheld:
    print(f"  {code}/{f}: kept OUT of the manifest - licence.reviewStatus is {status!r}, "
          f"so the country is not selectable")
PY

# ---- does the website know about what was synced, and vice versa? --------------------
python3 - "$DST" "$LIST" <<'PY'
import json, os, re, sys

dst, list_path = sys.argv[1], sys.argv[2]
with open(os.path.join(dst, 'packs.json'), encoding='utf-8') as f:
    packs = json.load(f)['packs']

try:
    with open(list_path, encoding='utf-8') as f:
        src = f.read()
except OSError:
    sys.exit(0)

# Each country row in public/countries.js, with the pack file it expects.
listed = {}
for m in re.finditer(r"code:\s*'([a-z]{2})'", src):
    code = m.group(1)
    tail = src[m.end():m.end() + 1200]
    stop = re.search(r"code:\s*'[a-z]{2}'", tail)
    if stop:
        tail = tail[:stop.start()]
    listed[code] = re.findall(r"file:\s*'([^']+)'", tail)

problems = []
for code, files in packs.items():
    if code not in listed:
        problems.append(f"{code}: synced {len(files)} pack(s) but public/countries.js has no row for it - "
                        f"the country cannot be chosen. Add a row, and the code to site/src/lib/countries.js.")
        continue
    if not listed[code]:
        problems.append(f"{code}: synced {', '.join(files)} but its row in countries.js declares no pack file, "
                        f"so the country stays unselectable. Deliberate for a pack still under review; "
                        f"otherwise add the file to its `versions`.")
        continue
    for want in listed[code]:
        if want not in files:
            problems.append(f"{code}: countries.js expects {want}, which was not synced "
                            f"(found: {', '.join(files) or 'nothing'})")
for code, files in listed.items():
    if files and code not in packs:
        problems.append(f"{code}: listed with pack {files[0]}, no content yet - stays unselectable")

if problems:
    print('\n  notes:')
    for p in problems:
        print(f'    - {p}')
PY

echo "synced to $DST"
