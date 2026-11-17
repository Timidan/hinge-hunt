# Hinge Hunt report

Run from any directory:

```bash
bash path/to/aholo-hackathon/submission/build-report.sh
```

Or, from the repository root:

```bash
bash submission/build-report.sh
```

The script finds Chrome or Chromium. This machine used `/usr/bin/google-chrome-stable`.
It prints `report.html` to `Hinge Hunt + Hinge Hunt.pdf` (team name + project name), with the GPU disabled and no browser headers or footers.
It requires Python, Chrome or Chromium, `pdfinfo` and `pdffonts`. It needs no npm packages.
Temporary print profiles and cache files stay inside this folder and are removed after printing.

The HTML embeds the regular Latin font files for League Gothic, Geist and Geist Mono from Google Fonts.
Their original download URLs are preserved in CSS comments. Rebuilding does not need a font download.
The page waits for `document.fonts.load`, `document.fonts.ready` and image load completion.
The script rejects a PDF if page readiness, layout bounds, current object counts, page count, paper dimensions or embedded fonts do not pass.

All screenshots are referenced as `../docs/…`. They are not copied here.
Replace the screenshots at their existing paths and rerun the script.
The three palette properties are at the top of the HTML: `--page`, `--ink` and `--signal`.

## Pages

1. Hinge Hunt: the README pitch and landing screenshot.
2. How a round works: watch it, place and turn the parts, leave the look-alike decoy out, make it work, find the hinge.
3. Play together: room links, shared starts, live progress, podium and rematch; alone, six levels, named players on the board, and recorded rivals.
4. How Lux3D makes every object: model, parts, articulation, our rig step and counted totals.
5. The rebuilt object moves: shared mesh, cuts across joints, working the real joint by hand.
6. What we tried and dropped: rejected candidates and the current laptop/radio corrections.
7. How it is built: browser, Worker, Durable Object, KV and the live forge.
8. Limits: client-reported times and objects generated ahead of play.
9. Play Hinge Hunt: the live game, the source and game credits.

## Numbers and their sources

| Number in the report | Source and meaning |
| --- | --- |
| 58 objects | Length of `app/public/objects/index.json`. |
| 337 split parts | Sum of `len(parts)` across the indexed objects' `rig.json` files. Includes bases and merged entries. |
| 65 moving joints | Count of joints whose type is not `fixed` in the same rig files. Includes the joint set by hand on the radio. |
| Five steps, labelled 1 to 5 | README's seven-step "How a round works", condensed. |
| +3 s | README confirmation penalty; also stated in `app/public/index.html`. |
| One decoy | README and `app/public/index.html`: a part from another object. |
| Three objects per room match | README and `PER_MATCH = 3` in `app/src/room.js`. |
| 30 seconds after the first finisher | README and `GRACE = 30000` milliseconds in `app/src/room.js`. |
| 20 fastest runs per object | README and `KEEP_RUNS = 20` in `app/src/worker.js`. |
| Two parts for the rejected wrench, nutcracker, garlic press and pocket knife | README rejected-candidate paragraph. |
| One mesh and both outputs | README pipeline explanation and `spike/rig.py`: part-split and articulation describe the same mesh. |
| One game page | README and `app/public/index.html`. |
| G1-Turbo | Model identifier in README and `spike/lux.py`; not a performance metric. |
| 3D in Lux3D, text-to-3D and the event name; 3 in `batch3-art.sh` | Source names/identifiers, not reported counts. |
| Page numbers 1 to 9 | Report navigation. |

`source-counts.json` records each indexed object's rig path and its counts. The build regenerates this ledger.
Two split-part entries are merged into other parts: `mousetrap/rig.json` part 5 into part 0, and `chest/rig.json` part 5 into part 0.
Thus there are 335 part groups after merging, including bases. This is not the number shown as split parts.
The 65 moving joints comprise 37 revolute, 11 prismatic and 17 continuous joints.
These explanatory totals come from the same rig files; they are not additional claims on the slides.

### Numbers inside the supplied screenshots

These are preserved screenshot UI, not new benchmark or user-count claims:

| Image | Visible numbers |
| --- | --- |
| `docs/race.jpg` | A stapler at the start of a race: 2.0 on the clock (a scripted test run); 0 of 5 parts placed; two parts turned (Level 4 and up); a decoy in the stapler's colour. |
| `docs/forge.jpg` | A friend's result after Timidan's forged fake: 6.2 s (a scripted test run); 2 parts; 0 wrong; 1 confirm; Level 1: 2 of 3 rebuilt. |
| `docs/operate.jpg` | The padlock rebuilt, its key half turned: 50.9 on the clock (scripted test run); 2 of 2 parts placed; "Turn the key (1 of 2)". |
| `docs/rebuilt.jpg` | A desk lamp after a scripted test run: 5.9 s; 4 parts; 0 wrong; 1 confirm; 98 of 100 for finding its pivot; "Test player". |
| `docs/podium.jpg` | A room podium from a match played with test players. |
| `docs/landing.jpg` and `docs/pipeline.jpg` | No numerical result claims; the landing's board is empty under the rules of 16 November. |

## Validation

The completed PDF has nine pages. CSS paper size is exactly `1600px 900px`; Chrome emits `1200 x 675.12` points because of print-unit rounding.
The three requested fonts are embedded and subsetted, with no fallback font in the PDF font inventory.
All seven image placements are present, each image once: landing, race, podium, pipeline, operate, forge and rebuilt.
The HTML bounds check reports no overflow, and PDF text bounding boxes stay within their pages.
All nine pages were rendered using CPU-only `pdftoppm` and visually inspected for clipping, missing images and unreadable text.

Page six describes the laptop's corrected hinge and seam, the joint set by hand on the radio, and the narrowed ranges and moved lunch-box hinge on the batch added on 16 November.

## Links

- Team name: Hinge Hunt.
- Live game: https://hingehunt.timidan.xyz
- Source: https://github.com/Timidan/hinge-hunt
