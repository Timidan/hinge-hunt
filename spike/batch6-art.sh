#!/bin/sh
# Articulate batch-6 objects that split well, one at a time. Usage: spike/batch6-art.sh name [name...]
cd "$(dirname "$0")/.." || exit 1
for n in "$@"; do
  case $n in
    wheelbarrow) p="Keep the tray, handles and legs fixed. Add a continuous revolute joint so the front wheel turns on its axle." ;;
    deskfan) p="Keep the base and the guard fixed. Add a continuous revolute joint so the blades spin around the fan's axis." ;;
    gramophone) p="Keep the wooden box and the horn fixed. Add a continuous revolute joint so the turntable and its record turn around the vertical spindle." ;;
    microscope) p="Keep the base, arm and stage fixed. Add a continuous revolute joint so the revolving nosepiece with its three lenses turns around its own axis." ;;
    dumptruck) p="Keep the cab, chassis and wheels fixed. Add a revolute joint at the back hinge so the tipping bed lifts at its front about 50 degrees." ;;
    wagon) p="Keep the tray and wheels fixed. Add a revolute joint where the pull handle meets the front axle so the handle swings up and down about 70 degrees." ;;
    robot) p="Keep the body, head and legs fixed. Add a revolute joint at the right shoulder so the right arm swings forward and up about 120 degrees." ;;
    catapult) p="Keep the frame, wheels and crossbar fixed. Add a revolute joint at the axle at the bottom of the throwing arm so the arm swings up from lying flat to the crossbar, about 80 degrees." ;;
    caliper) p="Keep the main beam with its fixed jaw fixed. Add a prismatic joint so the sliding jaw slides along the beam about 8 centimetres." ;;
    lunchbox) p="Keep the box body fixed. Add a revolute joint at the back hinge so the lid opens about 100 degrees." ;;
    excavator) p="Keep the tracks and the cab fixed. Add a revolute joint where the boom meets the cab so the boom, arm and bucket lift up together about 40 degrees." ;;
    scooter) p="Keep the deck and the rear wheel fixed. Add a revolute joint at the folding hinge so the steering column with the handlebar and front wheel folds down towards the deck about 80 degrees." ;;
    officechair) p="Keep the base, wheels and gas lift column fixed. Add a continuous revolute joint so the seat, backrest and armrests swivel around the column." ;;
    register) p="Keep the register body and keys fixed. Add a prismatic joint so the cash drawer at the bottom slides out towards the front about 12 centimetres." ;;
    piano) p="Keep the body, legs and keys fixed. Add a revolute joint at the long straight hinge so the lid opens about 50 degrees." ;;
    *) echo "unknown $n"; continue ;;
  esac
  url=$(python3 -I spike/lux.py get "$(python3 -I -c "import json; print(json.load(open('spike/out/$n.json'))['d']['taskId'])")" | grep -oE 'https://[^" ]+\.glb' | head -1)
  [ -n "$url" ] || { echo "$n: no model url"; continue; }
  python3 -I spike/lux.py articulate "$url" "$p" "$n-art" > "spike/out/$n-art.log" 2>&1
  echo "$n: $(tail -1 spike/out/$n-art.log)"
  [ -f "spike/out/$n-art.zip" ] && python3 -I spike/unzip.py "spike/out/$n-art.zip" "spike/out/$n-art" > /dev/null
done
