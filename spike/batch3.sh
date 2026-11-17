#!/bin/sh
# Batch 3 (2026-11-13): 20 candidate objects, G1-Turbo text-to-3D, one at a time. Hand tools and hinged things,
# because they split into real parts and have one clear moving part.
cd "$(dirname "$0")/.." || exit 1
tail=" Single object, product photo, plain background, no text, no logo."
gen() { [ -f "spike/out/$1.glb" ] && { echo "$1: already made"; return; }; python3 -I spike/lux.py text "$2$tail" "$1" > "spike/out/$1.log" 2>&1; echo "$1: $(tail -1 spike/out/$1.log)"; }
gen scissors "A pair of steel office scissors with red plastic handles and a visible pivot screw."
gen pliers "A pair of steel combination pliers with blue rubber grips and a round pivot rivet."
gen wrench "A chrome adjustable wrench with a sliding lower jaw and a knurled worm screw."
gen vise "A cast-iron bench vise painted blue, with a fixed jaw, a sliding jaw, a long screw and a T-bar handle."
gen corkscrew "A chrome winged corkscrew with two lever arms, a top handle and a spiral worm."
gen sharpener "A hand-crank pencil sharpener with a metal body, a side crank handle with a wooden knob and a clear shavings drawer."
gen chest "A wooden treasure chest with a curved lid, iron bands, corner brackets, side handles and a hasp lock."
gen musicbox "A small wooden music box with a hinged lid, a brass comb and cylinder inside and a side wind-up key."
gen toolbox "A red metal toolbox with a hinged lid, a folding top handle and two latches."
gen flipphone "A silver flip phone with the screen half open on its hinge, a keypad and a small outer display."
gen laptop "A slim grey laptop with the lid half open, a keyboard and a trackpad."
gen mailbox "A rural metal mailbox on a short wooden post, with a rounded hinged door and a red side flag."
gen pocketwatch "A brass pocket watch with its hinged lid open, a white dial, a crown and a short chain."
gen waffle "A round electric waffle iron with its lid half open, a hinged handle and black cooking plates."
gen nutcracker "A chrome lever nutcracker with two long handles joined by a hinge and ridged jaws."
gen pruners "A pair of garden pruners with red handles, curved steel blades, a pivot bolt and a spring between the handles."
gen peg "A wooden clothes peg with two wooden halves and a steel coil spring."
gen pump "A floor bicycle pump with a tall steel barrel, a T-handle on a piston rod, a foot base and a pressure gauge."
gen spray "A plastic spray bottle with a trigger sprayer head, a nozzle and a clear bottle."
gen telescope "A brass collapsible spyglass telescope with three sliding tubes and a lens cap."
