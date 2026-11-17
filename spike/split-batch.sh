#!/bin/sh
# Part-split the named objects one at a time (30 credits each). Usage: spike/split-batch.sh name [name...]
cd "$(dirname "$0")/.." || exit 1
for n in "$@"; do
  [ -f "spike/out/$n-split.glb" ] && { echo "$n: already split"; continue; }
  url=$(python3 -I spike/lux.py get "$(python3 -I -c "import json; print(json.load(open('spike/out/$n.json'))['d']['taskId'])")" | grep -oE 'https://[^" ]+\.glb' | head -1)
  [ -n "$url" ] || { echo "$n: no model url"; continue; }
  python3 -I spike/lux.py split "$url" "$n-split" > "spike/out/$n-split.log" 2>&1
  echo "$n: $(tail -1 spike/out/$n-split.log)"
done
