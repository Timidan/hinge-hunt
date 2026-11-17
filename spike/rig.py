"""Match each Lux3D part-split part to the URDF link it rides, and write the joints in the model's own frame.

  python3 -I spike/rig.py <split.glb> <robot.urdf | -> <out.json> [--cut 3] [--merge 5:0] [--anchor 3] [--far joint=rad] [--axis joint=x,y,z] [--origin joint=x,y,z] [--cut-plane joint=nx,ny,nz,d]

A part rides the link most of it belongs to. --cut parts are cut into pieces that each ride their own link, for a
split part that really spans a joint (the flytrap's stem and jaw). --merge folds a stray part into another (the
mousetrap's scattered patch of base surface). Without a URDF (no articulation) every part sits on one fixed base.
--origin and --axis correct a joint in the split model's frame. For --cut parts, --cut-plane replaces a bad
URDF seam: triangles whose centres satisfy dot(normal, centre) > d ride the child; the rest ride the parent.

Both Lux3D outputs are partitions of the same mesh; the articulation links only sit in a translated frame.
"""
import base64, json, struct, sys
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree


def meshes(path, with_tris=False):
    b = Path(path).read_bytes()
    n = struct.unpack_from("<I", b, 12)[0]
    j, bin0 = json.loads(b[20 : 20 + n]), 20 + n + 8
    out = []
    for nd in j["nodes"]:
        if "mesh" not in nd:
            continue
        if any(k in nd for k in ("translation", "rotation", "scale", "matrix")):
            sys.exit(f"{path}: node transforms not handled")
        pts, tris, base = [], [], 0
        for p in j["meshes"][nd["mesh"]]["primitives"]:
            a = j["accessors"][p["attributes"]["POSITION"]]
            bv = j["bufferViews"][a["bufferView"]]
            st = bv.get("byteStride", 12)
            raw = np.frombuffer(b, np.uint8, st * a["count"], bin0 + bv.get("byteOffset", 0) + a.get("byteOffset", 0))
            pts.append(raw.reshape(-1, st)[:, :12].copy().view("<f4").reshape(-1, 3))
            ia = j["accessors"][p["indices"]]
            ib = j["bufferViews"][ia["bufferView"]]
            dt = {5121: "<u1", 5123: "<u2", 5125: "<u4"}[ia["componentType"]]
            tris.append(np.frombuffer(b, dt, ia["count"], bin0 + ib.get("byteOffset", 0) + ia.get("byteOffset", 0)).reshape(-1, 3).astype(np.int64) + base)
            base += a["count"]
        v = np.vstack(pts).astype(np.float64)
        out.append((v, np.vstack(tris)) if with_tris else v)
    return out


def rot(r, p, y):
    cr, sr, cp, sp, cy, sy = np.cos(r), np.sin(r), np.cos(p), np.sin(p), np.cos(y), np.sin(y)
    return np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]]) @ np.array([[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]]) @ np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]])


split_path, urdf_path, out_path = sys.argv[1:4]
opt = dict(zip(sys.argv[4::2], sys.argv[5::2]))
cut = {int(x) for x in opt.get("--cut", "").split(",") if x}
merge = dict(tuple(map(int, m.split(":"))) for m in opt.get("--merge", "").split(",") if m)
split = meshes(split_path, True)
parts = [v for v, _ in split]
urdf = ET.parse(urdf_path).getroot() if urdf_path != "-" else ET.fromstring('<robot><link name="base"/></robot>')
nums = lambda el, attr, d="0 0 0": np.array([float(x) for x in ((el.get(attr) if el is not None else None) or d).split()])

# rest pose of every link in the URDF frame
joints = {j.find("child").get("link"): j for j in urdf.findall("joint")}
world = {}
def place(link):
    if link in world:
        return world[link]
    j = joints.get(link)
    if j is None:
        world[link] = (np.eye(3), np.zeros(3))
    else:
        R0, t0 = place(j.find("parent").get("link"))
        o = j.find("origin")
        world[link] = (R0 @ rot(*nums(o, "rpy")), R0 @ nums(o, "xyz") + t0)
    return world[link]

names, pts = [], []
for l in urdf.findall("link"):
    m = l.find(".//mesh")
    if m is None:
        continue
    R, t = place(l.get("name"))
    v = np.vstack(meshes(Path(urdf_path).parent / m.get("filename"))) @ R.T + t
    names.append(l.get("name"))
    pts.append(v)

# the split parts are in the model frame; the links are that frame moved by a constant offset
allp = np.vstack(parts)
size = np.linalg.norm(allp.max(0) - allp.min(0))
if pts:
    alll = np.vstack(pts)
    d = (allp.min(0) + allp.max(0)) / 2 - (alll.min(0) + alll.max(0)) / 2
    owner = np.concatenate([np.full(len(v), i) for i, v in enumerate(pts)])
    tree = cKDTree(alll + d)

out_parts = []
for i, v in enumerate(parts):
    box = {"centre": [round(float(x), 5) for x in (v.min(0) + v.max(0)) / 2], "size": [round(float(x), 5) for x in v.max(0) - v.min(0)]}
    if not pts:
        out_parts.append({"i": i, "link": "base", "share": 1.0, "fit": 0.0, **box})
        continue
    dist, idx = tree.query(v)
    votes = np.bincount(owner[idx], minlength=len(names))
    k = int(votes.argmax())
    # in a cut part each triangle rides the link most of its corners belong to
    vown = owner[idx][split[i][1]]
    tri = np.array([np.bincount(r, minlength=len(names)).argmax() for r in vown])
    # A generated seam can wander onto the base (the laptop). Keep its straight physical hinge instead.
    if i in cut:
        for spec in opt.get("--cut-plane", "").split(";"):
            if not spec:
                continue
            joint, plane = spec.split("=")
            j = next(j for j in joints.values() if j.get("name") == joint)
            nx, ny, nz, level = map(float, plane.split(","))
            above = v[split[i][1]].mean(1) @ np.array([nx, ny, nz]) > level
            tri = np.where(above, names.index(j.find("child").get("link")), names.index(j.find("parent").get("link")))
    used = [int(x) for x in np.unique(tri)]
    piece = {}
    if i in cut and len(used) > 1:
        piece = {"links": [names[u] for u in used], "owner": base64.b64encode(np.searchsorted(used, tri).astype(np.uint8).tobytes()).decode()}
    out_parts.append({**piece,
        "i": i, "link": names[k], "share": round(float(votes[k] / len(v)), 3),
        "fit": round(float(np.median(dist) / size), 6),
        "centre": [round(float(x), 5) for x in (v.min(0) + v.max(0)) / 2],
        "size": [round(float(x), 5) for x in v.max(0) - v.min(0)],
    })

out_joints = []
for child, j in joints.items():
    R, t = place(child)
    lim = j.find("limit")
    out_joints.append({
        "name": j.get("name"), "type": j.get("type"), "parent": j.find("parent").get("link"), "child": child,
        "origin": [round(float(x), 6) for x in t + d],
        "axis": [round(float(x), 6) for x in R @ nums(j.find("axis"), "xyz", "1 0 0")],
        "lower": float(lim.get("lower", 0)) if lim is not None else 0.0,
        "upper": float(lim.get("upper", 0)) if lim is not None else 0.0,
    })
    if j.get("type") == "continuous":  # no limits: a crank turns all the way round
        out_joints[-1].update(lower=0.0, upper=round(2 * np.pi, 6))
    # --far joint=value: how far the joint moves when the object works, when the larger limit is the wrong way
    # (the laptop's lid starts open, and its larger limit swings it back through the desk)
    for spec in opt.get("--far", "").split(","):
        if spec and spec.split("=")[0] == j.get("name"):
            out_joints[-1]["far"] = float(spec.split("=")[1])
    # --axis joint=x,y,z: the hinge direction when Lux3D chose the wrong axis (the laptop)
    for spec in opt.get("--axis", "").split(";"):
        if spec and spec.split("=")[0] == j.get("name"):
            out_joints[-1]["axis"] = [float(x) for x in spec.split("=")[1].split(",")]
    # --origin joint=x,y,z: a point on the hinge in the split model's frame, not the translated URDF frame
    for spec in opt.get("--origin", "").split(";"):
        if spec and spec.split("=")[0] == j.get("name"):
            out_joints[-1]["origin"] = [float(x) for x in spec.split("=")[1].split(",")]

root = next(l.get("name") for l in urdf.findall("link") if l.get("name") not in joints)
# a merged part is not a part of its own: its pieces join the part it was folded into (and, if it is also --cut,
# each piece still rides its own link, so a lid's stray planks open with the lid)
for a, b in merge.items():
    next(p for p in out_parts if p["i"] == a)["with"] = b
out = {"root": root, "joints": out_joints, "parts": out_parts}
if "--anchor" in opt:
    out["anchor"] = int(opt["--anchor"])  # the part that stays put; otherwise the game takes the biggest on the base
Path(out_path).write_text(json.dumps(out, indent=1))
for p in out_parts:
    print(f"part {p['i']}: {p['link']:<14} share {p['share']:.2f} fit {p['fit']:.1e} size {p['size']}")
for j in out_joints:
    print(f"joint {j['name']}: {j['parent']} -> {j['child']} at {j['origin']} axis {j['axis']} {j['lower']}..{j['upper']}")
