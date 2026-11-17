#!/bin/sh
# Articulate the batch-2 objects that split well. Usage: spike/batch2-art.sh name [name...]
cd "$(dirname "$0")/.."
for n in "$@"; do
  case $n in
    mousetrap) p="Keep the wooden base fixed. Add a revolute joint so the U-shaped steel snap bar swings about 180 degrees over the base, from set open to snapped shut." ;;
    desklamp) p="Keep the round base fixed. Add a revolute joint at the elbow so the upper arm and the lamp shade tilt up and down." ;;
    padlock) p="Keep the lock body fixed. Add a prismatic joint so the U-shaped shackle slides straight up out of the body to unlock." ;;
    holepunch) p="Keep the base fixed. Add a revolute joint at the back so the long lever handle presses down toward the base." ;;
    *) echo "unknown $n"; continue ;;
  esac
  url=$(python3 -I spike/lux.py get "$(python3 -I -c "import json; print(json.load(open('spike/out/$n.json'))['d']['taskId'])")" | grep -oE 'https://[^" ]+\.glb' | head -1)
  python3 -I spike/lux.py articulate "$url" "$p" "$n-art" > "spike/out/$n-art.log" 2>&1
  echo "$n: $(tail -1 spike/out/$n-art.log)"
done
