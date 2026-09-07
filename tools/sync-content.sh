#!/bin/zsh
# The app is the single source of truth for content (it must live inside
# apps/us-citizenship/ or EAS cannot bundle it - see BUILD_PLAN v19). The website reads
# the same files, so they are copied here rather than duplicated by hand.
# Run after any content change, before deploying the site.
set -e
SRC="apps/us-citizenship/content"
DST="site/public/content"
rm -rf "$DST"
mkdir -p "$DST"
for country in "$SRC"/*/; do
  name=$(basename "$country")
  mkdir -p "$DST/$name"
  # JSON only - the officials photos are app assets, not needed by the web app yet.
  find "$country" -name "*.json" -not -path "*/.*" | while read -r f; do
    rel=${f#$country}
    mkdir -p "$DST/$name/$(dirname "$rel")"
    cp "$f" "$DST/$name/$rel"
  done
  echo "  $name: $(find "$DST/$name" -name '*.json' | wc -l | tr -d ' ') files"
done
echo "synced to $DST"
