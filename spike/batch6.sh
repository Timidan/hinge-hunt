#!/bin/sh
# Batch 6 (2026-11-16): 13 new candidates with one clear moving part and several distinct parts, G1-Turbo
# text-to-3D, three at a time. Avoids what failed before: lettering, plants and animals, two-part tools, intricate work.
cd "$(dirname "$0")/.." || exit 1
tail=" Single object, product photo, plain background, no text, no logo."
gen() { [ -f "spike/out/$1.glb" ] && { echo "$1: already made"; return; }; python3 -I spike/lux.py text "$2$tail" "$1" > "spike/out/$1.log" 2>&1; echo "$1: $(tail -1 spike/out/$1.log)"; }
gen gramophone "A wind-up gramophone: a square wooden box, a brass horn on a curved arm, a turntable with a record and a crank handle on the side." &
gen microscope "A student microscope in white and black: a heavy base, a curved arm, a stage with two clips, a revolving nosepiece with three lenses and an eyepiece tube." &
gen dumptruck "A yellow toy dump truck with a cab, a tipping bed hinged at the back and six black wheels." &
wait
gen wagon "A red toy pull wagon with a metal tray, four black rubber wheels and a long pull handle with a loop grip." &
gen robot "A tin wind-up toy robot in silver and red: a box body, a square head with round eyes, two arms hinged at the shoulders and a winding key on its back." &
gen catapult "A wooden toy catapult on a rectangular frame with four small wheels, a throwing arm with a cup at its end and a crossbar that stops the arm." &
wait
gen caliper "A steel vernier caliper with a fixed jaw, a sliding jaw with a thumb wheel and a locking screw." &
gen lunchbox "A retro metal lunch box in orange with a hinged lid, two side latches and a carry handle on top." &
gen excavator "A yellow toy excavator on black tracks with a cab, a long boom, an arm and a toothed bucket." &
wait
gen scooter "A kick scooter for children in blue with two wheels, a deck, a handlebar with grips and a folding hinge at the bottom of the steering column." &
gen officechair "An office chair in black with a padded seat and backrest, armrests, a gas lift column and a five-star base with five wheels." &
gen register "A vintage brass cash register with a row of round keys, a crank handle on the side and a cash drawer at the bottom, no text." &
wait
gen piano "A small black toy grand piano with a lid propped open, a row of black and white keys, a folding key cover and three legs." &
wait
