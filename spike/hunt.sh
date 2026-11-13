#!/bin/sh
# One object: text -> GLB -> articulation. Usage: spike/hunt.sh <name> "<object prompt>" ["<motion prompt>"]
set -e
cd "$(dirname "$0")/.."
python3 spike/lux.py text "$2" "$1" | tee spike/out/$1.log
url=$(grep '^url ' spike/out/$1.log | cut -d' ' -f2)
python3 spike/lux.py articulate "$url" "${3:-open it fully}" "$1-art" | tee -a spike/out/$1.log
