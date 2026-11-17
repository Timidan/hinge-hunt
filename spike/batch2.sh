#!/bin/sh
# Second object batch (2026-11-13): G1-Turbo text-to-3D, one task at a time.
cd "$(dirname "$0")/.."
gen() { python3 -I spike/lux.py text "$2" "$1" > "spike/out/$1.log" 2>&1; echo "$1: $(tail -1 spike/out/$1.log)"; }
gen mousetrap "A classic wooden snap mousetrap: flat rectangular wooden base, steel U-shaped snap bar, two coiled steel springs, a long hold-down wire and a small metal bait pedal. Single object, product photo, plain background."
gen desklamp "A balanced-arm desk lamp: heavy round metal base, two straight metal arms joined by an elbow knob, two tension springs along the arms and a cone-shaped lamp shade on top. Single object, product photo, plain background."
gen padlock "A solid brass padlock with a thick steel U-shaped shackle and a small brass key in the keyhole. Single object, product photo, plain background."
gen holepunch "A metal two-hole paper punch: long curved lever handle on top, two steel punch pins, a flat base with a paper guide and a plastic chip tray underneath. Single object, product photo, plain background."
