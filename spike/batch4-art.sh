#!/bin/sh
# Articulate batch-4 objects that split well, one at a time. Usage: spike/batch4-art.sh name [name...]
cd "$(dirname "$0")/.." || exit 1
for n in "$@"; do
  case $n in
    metronome) p="Keep the wooden body fixed. Add a revolute joint at the bottom of the pendulum rod so the pendulum swings side to side about 30 degrees." ;;
    globe) p="Keep the stand and the meridian ring fixed. Add a continuous revolute joint so the globe spins on its tilted axis." ;;
    telephone) p="Keep the telephone base fixed. Add a joint so the handset lifts up off its cradle." ;;
    jackbox) p="Keep the box fixed. Add a revolute joint at the back hinge so the lid opens about 110 degrees." ;;
    eggbeater) p="Keep the frame and handle fixed. Add a continuous revolute joint so the crank handle and gear wheel turn." ;;
    reel) p="Keep the reel body and foot fixed. Add a continuous revolute joint so the crank handle turns around its axle." ;;
    handdrill) p="${RETRY:+Add a revolute joint so the crank handle turns the big gear wheel around its axle.}${RETRY:-Keep the frame and handles fixed. Add a continuous revolute joint so the crank handle and big gear wheel turn.}" ;;
    typewriter) p="Keep the typewriter body fixed. Add a prismatic joint so the carriage with the paper roller slides sideways." ;;
    lantern) p="Keep the lantern base and frame fixed. Add a revolute joint so the wire bail handle swings up about 90 degrees." ;;
    timer) p="Keep the bottom of the tomato fixed. Add a continuous revolute joint so the top half twists around the vertical axis." ;;
    toycar) p="Keep the car body fixed. Add a revolute joint at the front edge of the door so the door swings open about 70 degrees." ;;
    *) echo "unknown $n"; continue ;;
  esac
  url=$(python3 -I spike/lux.py get "$(python3 -I -c "import json; print(json.load(open('spike/out/$n.json'))['d']['taskId'])")" | grep -oE 'https://[^" ]+\.glb' | head -1)
  [ -n "$url" ] || { echo "$n: no model url"; continue; }
  python3 -I spike/lux.py articulate "$url" "$p" "$n-art" > "spike/out/$n-art.log" 2>&1
  echo "$n: $(tail -1 spike/out/$n-art.log)"
  [ -f "spike/out/$n-art.zip" ] && python3 -I spike/unzip.py "spike/out/$n-art.zip" "spike/out/$n-art" > /dev/null
done
