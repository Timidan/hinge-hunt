# Look-alike decoys: for each object, the parts of other objects that could pass for one of its own parts.
# A candidate is scored on shape (its box's proportions), on how big it is within its own object, and on kind
# (a handle for a handle, a lid for a lid, read from the link names). Writes app/public/objects/decoys.json:
#   { object: [ { "from": other object, "i": its part, "twin": this object's part it imitates, "kind": "crank" }, ... ] }
#   python3 -I spike/decoys.py
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "app/public/objects"
KINDS = ["handle", "lid", "crank", "knob", "lever", "arm", "jaw", "door", "key", "blade", "wheel", "spring", "button",
         "trigger", "drawer", "screen", "shackle", "tube", "seat", "tape", "hands", "pendulum", "carriage"]
TOP = 3  # candidates kept per object; a room or a solo round picks one by its seed, so only it needs loading


def kind(link):
    return next((k for k in KINDS if k in link), "")


def loose_parts(rig):
    own = [p for p in rig["parts"] if p.get("with") is None]
    vol = lambda p: p["size"][0] * p["size"][1] * p["size"][2]
    anchor = next((p for p in own if p["i"] == rig.get("anchor")), None)
    if anchor is None:
        roots = sorted((p for p in own if p["link"] == rig["root"]), key=vol, reverse=True)
        anchor = roots[0] if roots else None
    lo = [min(p["centre"][k] - p["size"][k] / 2 for p in own) for k in range(3)]
    hi = [max(p["centre"][k] + p["size"][k] / 2 for p in own) for k in range(3)]
    diag = math.dist(lo, hi)
    return [dict(p, rel=max(p["size"]) / diag, root=p["link"] == rig["root"]) for p in own if p is not anchor]


def shape(p):
    s = sorted(p["size"], reverse=True)
    return [x / s[0] for x in s[1:]]


objects = json.loads((ROOT / "index.json").read_text())
parts = {o["id"]: loose_parts(json.loads((ROOT / o["id"] / "rig.json").read_text())) for o in objects}
out = {}
for o in objects:
    a, mine = o["id"], parts[o["id"]]
    # imitate one of this object's bigger parts: a tiny pin as a decoy is too hard to see to be fair
    big = sorted(mine, key=lambda p: p["rel"], reverse=True)[: max(1, math.ceil(len(mine) / 2))]
    scored = []
    for b, theirs in parts.items():
        if b == a:
            continue
        for q in theirs:
            for p in big:
                d = sum(abs(x - y) for x, y in zip(shape(p), shape(q))) + 0.5 * abs(math.log(p["rel"] / q["rel"]))
                if kind(p["link"]) and kind(p["link"]) == kind(q["link"]):
                    d -= 0.25
                scored.append((d, b, q, p))
    scored.sort(key=lambda x: x[0])
    picks, used = [], set()
    for d, b, q, p in scored:
        if b in used:
            continue
        used.add(b)
        picks.append({"from": b, "i": q["i"], "twin": p["i"], "kind": "" if q["root"] else kind(q["link"])})
        if len(picks) == TOP:
            break
    out[a] = picks
(ROOT / "decoys.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
print(f"{len(out)} objects, e.g. stapler -> {out['stapler']}")
