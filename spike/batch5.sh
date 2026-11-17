#!/bin/sh
# Batch 5 (2026-11-15): 15 candidates with a clear moving part and several distinct parts, G1-Turbo text-to-3D, one
# at a time. Text-to-3D is cheap; only the best 12 or so go on to part-split and articulation.
cd "$(dirname "$0")/.." || exit 1
tail=" Single object, product photo, plain background, no text, no logo."
gen() { [ -f "spike/out/$1.glb" ] && { echo "$1: already made"; return; }; python3 -I spike/lux.py text "$2$tail" "$1" > "spike/out/$1.log" 2>&1; echo "$1: $(tail -1 spike/out/$1.log)"; }
gen grinder "A hand-crank coffee grinder: a square wooden box with a small front drawer, a brass bowl on top and an iron crank handle with a wooden knob."
gen pocketknife "A folding pocket knife with a wooden handle, brass bolsters, a steel blade opened halfway and a pivot pin."
gen tapemeasure "A tape measure with a yellow plastic case, a plain steel tape pulled out a little with a hook at its end, a lock button and a belt clip."
gen alarmclock "A red metal wind-up alarm clock with two bells on top, a hammer between them, two feet and a winding key on the back."
gen canopener "A manual can opener with two long red handles, a steel cutting wheel and a butterfly turning key."
gen toaster "A cream two-slice toaster with a push-down lever on the side, a browning knob and two bread slots."
gen pedalbin "A small round pedal bin in pale green metal with a hinged lid and a foot pedal at the bottom."
gen kettle "A stovetop kettle in polished steel with a hinged lid, a curved spout and an arched wooden handle."
gen chair "A wooden folding chair with a slatted seat and two pairs of legs crossing on a pivot bolt, painted white."
gen drawers "A small wooden desk drawer unit with three drawers, each with a round brass knob, the middle drawer pulled half open."
gen spinner "A salad spinner: a white plastic bowl, a green basket inside and a lid with a crank handle on top."
gen suitcase "A small hard-shell suitcase in teal with a telescopic pull handle extended, a top carry handle and four wheels."
gen wheelbarrow "A garden wheelbarrow with a green metal tray, one rubber wheel at the front, two wooden handles and two legs."
gen deskfan "A retro desk fan with a round chrome wire guard, four metal blades, a tilting head and a round base."
gen bottle "A sports water bottle in blue plastic with a flip-top cap on a hinge and a carry loop."
