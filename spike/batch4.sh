#!/bin/sh
# Batch 4 (2026-11-14): 15 more candidates with a clear moving part, G1-Turbo text-to-3D, one at a time.
cd "$(dirname "$0")/.." || exit 1
tail=" Single object, product photo, plain background, no text, no logo."
gen() { [ -f "spike/out/$1.glb" ] && { echo "$1: already made"; return; }; python3 -I spike/lux.py text "$2$tail" "$1" > "spike/out/$1.log" 2>&1; echo "$1: $(tail -1 spike/out/$1.log)"; }
gen metronome "A wooden pyramid metronome with its front cover open, a brass pendulum rod with a sliding weight and a key on the side."
gen globe "A desk globe of the Earth on a curved brass meridian ring and a turned wooden stand."
gen telephone "A cream rotary telephone with a handset resting on its cradle, a round finger dial and a coiled cord."
gen jackbox "A jack-in-the-box toy: a painted wooden box with a hinged lid, a side crank handle and a clown on a spring inside."
gen eggbeater "A hand-crank egg beater with two steel whisks, a gear wheel with a crank handle and a wooden grip."
gen reel "A fishing reel with a spool, a folding crank handle with a knob, a foot and a bail arm."
gen handdrill "A hand drill with a big gear wheel, a crank handle, a wooden side handle and a chuck with a drill bit."
gen sewing "A vintage black sewing machine with gold trim, a hand wheel on the side, a needle bar and a presser foot."
gen typewriter "A vintage manual typewriter with round keys, a carriage with a platen roller and a return lever."
gen cuckoo "A carved wooden cuckoo clock with a small door above the dial, pine cone weights on chains and a pendulum."
gen lantern "A metal camping lantern with a glass globe, a wire bail handle and a hinged top cap."
gen timer "A kitchen timer shaped like a tomato, with a twisting top dial and a stem."
gen radio "A retro tabletop radio with a wooden case, a speaker grille, a tuning dial and two round knobs."
gen toycar "A tin wind-up toy car with four wheels, a side wind-up key and a hinged opening door."
gen camera "A vintage film camera with a lens barrel, a film advance lever, a shutter button and a flip-up flash."
