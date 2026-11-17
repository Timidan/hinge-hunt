#!/bin/sh
# Articulate batch-3 objects that split well, one at a time. Usage: spike/batch3-art.sh name [name...]
cd "$(dirname "$0")/.." || exit 1
for n in "$@"; do
  case $n in
    scissors) p="Keep one blade with its handle fixed. Add a revolute joint at the pivot screw so the other blade and handle open about 40 degrees." ;;
    pliers) p="Keep one handle with its jaw fixed. Add a revolute joint at the pivot rivet so the other handle and jaw open about 30 degrees." ;;
    wrench) p="Keep the wrench body fixed. Add a prismatic joint so the lower jaw slides open along the head, about 2 centimetres." ;;
    vise) p="Keep the vise body and fixed jaw still. Add a prismatic joint so the sliding jaw, screw and handle slide outward about 5 centimetres." ;;
    corkscrew) p="Keep the body and spiral fixed. Add a revolute joint so the two lever arms swing up about 90 degrees, as when the cork rises." ;;
    sharpener) p="Keep the body fixed. Add a revolute joint so the side crank handle turns a full circle around its axle." ;;
    chest) p="Keep the chest body fixed. Add a revolute joint at the back hinges so the curved lid opens about 110 degrees." ;;
    musicbox) p="Keep the box fixed. Add a revolute joint at the back hinge so the lid opens about 100 degrees." ;;
    toolbox) p="Keep the box fixed. Add a revolute joint at the back hinge so the lid opens about 100 degrees." ;;
    flipphone) p="${RETRY:+Add a revolute joint at the hinge between the screen and the keypad so the screen folds closed.}${RETRY:-Keep the keypad half fixed. Add a revolute joint at the hinge so the screen half opens and closes about 150 degrees.}" ;;
    laptop) p="${RETRY:+Add a revolute joint at the hinge between the screen lid and the keyboard base so the lid closes.}${RETRY:-Keep the keyboard base fixed. Add a revolute joint at the hinge so the lid closes and opens about 110 degrees.}" ;;
    mailbox) p="Keep the box and post fixed. Add a revolute joint at the bottom of the door so it drops open about 90 degrees." ;;
    pocketwatch) p="Keep the watch case fixed. Add a revolute joint at the hinge so the lid closes over the dial, about 160 degrees." ;;
    waffle) p="Keep the base fixed. Add a revolute joint at the back hinge so the lid opens and closes about 80 degrees." ;;
    nutcracker) p="Keep one handle fixed. Add a revolute joint at the hinge so the other handle closes about 30 degrees." ;;
    pruners) p="Keep one handle and blade fixed. Add a revolute joint at the pivot bolt so the other handle and blade close about 30 degrees." ;;
    peg) p="Keep the lower wooden half fixed. Add a revolute joint at the spring so the upper half opens its jaw about 25 degrees." ;;
    pump) p="Keep the barrel and base fixed. Add a prismatic joint so the T-handle and piston rod slide up about 30 centimetres." ;;
    spray) p="Keep the bottle and head fixed. Add a revolute joint at the top of the trigger so it squeezes back about 20 degrees." ;;
    telescope) p="Keep the widest tube fixed. Add a prismatic joint so the narrower tubes slide out to extend the telescope." ;;
    *) echo "unknown $n"; continue ;;
  esac
  url=$(python3 -I spike/lux.py get "$(python3 -I -c "import json; print(json.load(open('spike/out/$n.json'))['d']['taskId'])")" | grep -oE 'https://[^" ]+\.glb' | head -1)
  [ -n "$url" ] || { echo "$n: no model url"; continue; }
  python3 -I spike/lux.py articulate "$url" "$p" "$n-art" > "spike/out/$n-art.log" 2>&1
  echo "$n: $(tail -1 spike/out/$n-art.log)"
  [ -f "spike/out/$n-art.zip" ] && python3 -I spike/unzip.py "spike/out/$n-art.zip" "spike/out/$n-art" > /dev/null
done
