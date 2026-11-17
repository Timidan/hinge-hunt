#!/bin/sh
# Articulate batch-5 objects that split well, one at a time. Usage: spike/batch5-art.sh name [name...]
cd "$(dirname "$0")/.." || exit 1
for n in "$@"; do
  case $n in
    grinder) p="Keep the wooden box fixed. Add a continuous revolute joint so the crank handle turns around its vertical axle on top." ;;
    pocketknife) p="Keep the handle fixed. Add a revolute joint at the pivot pin so the blade folds closed into the handle and opens about 180 degrees." ;;
    tapemeasure) p="Keep the case fixed. Add a prismatic joint so the steel tape and its hook slide out of the case about 10 centimetres." ;;
    alarmclock) p="Keep the clock body, bells and feet fixed. Add a continuous revolute joint so the clock hands turn around the centre of the dial." ;;
    canopener) p="Keep the body and both handles fixed. Add a continuous revolute joint so the butterfly key turns around its shaft." ;;
    toaster) p="Keep the toaster body, top and base fixed. Add a continuous revolute joint so the round browning knob on the side turns around its shaft." ;;
    pedalbin) p="Keep the bin body fixed. Add a revolute joint at the back hinge so the lid opens about 80 degrees." ;;
    kettle) p="Keep the kettle body, lid and spout fixed. Add a revolute joint at the two pivots where the arched handle meets the body so the handle swings down to one side about 80 degrees." ;;
    chair) p="Keep the leg frames, crossbars and backrest fixed. Add a revolute joint at the back edge of the slatted seat so the seat folds up against the backrest about 80 degrees." ;;
    drawers) p="Keep the cabinet fixed. Add a prismatic joint so the middle drawer slides in and out about 15 centimetres." ;;
    spinner) p="Keep the bowl and lid fixed. Add a continuous revolute joint so the crank handle on the lid turns around the vertical axis." ;;
    suitcase) p="Keep the suitcase body fixed. Add a prismatic joint so the telescopic pull handle slides down into the case about 30 centimetres." ;;
    wheelbarrow) p="Keep the tray, handles and legs fixed. Add a continuous revolute joint so the front wheel turns on its axle." ;;
    deskfan) p="Keep the base and the guard fixed. Add a continuous revolute joint so the blades spin around the fan's axis." ;;
    bottle) p="Keep the bottle fixed. Add a revolute joint at the hinge so the flip-top cap opens about 120 degrees." ;;
    *) echo "unknown $n"; continue ;;
  esac
  url=$(python3 -I spike/lux.py get "$(python3 -I -c "import json; print(json.load(open('spike/out/$n.json'))['d']['taskId'])")" | grep -oE 'https://[^" ]+\.glb' | head -1)
  [ -n "$url" ] || { echo "$n: no model url"; continue; }
  python3 -I spike/lux.py articulate "$url" "$p" "$n-art" > "spike/out/$n-art.log" 2>&1
  echo "$n: $(tail -1 spike/out/$n-art.log)"
  [ -f "spike/out/$n-art.zip" ] && python3 -I spike/unzip.py "spike/out/$n-art.zip" "spike/out/$n-art" > /dev/null
done
