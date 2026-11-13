"""Kill-test helper for Lux3D tasks. Saves task JSON + result file in spike/out/.

  python3 spike/lux.py glb <image_url> <name>            # G1-Turbo image -> GLB
  python3 spike/lux.py text "<prompt>" <name>              # G1-Turbo text -> GLB
  python3 spike/lux.py articulate <glb_url> "<prompt>" <name>

Reads AHOLO_API_KEY from the environment or .env in the project root.
"""
import json, os, pathlib, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "spike" / "out"
API = "https://api.aholo.ai/global/lux3d/v1"


def key():
    if os.environ.get("AHOLO_API_KEY"):
        return os.environ["AHOLO_API_KEY"]
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith("AHOLO_API_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit("AHOLO_API_KEY missing")


def call(method, path, body=None):
    req = urllib.request.Request(
        API + path, method=method,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": key(), "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def run(path, body, name):
    created = call("POST", path, body)
    if created.get("c") != "0":
        sys.exit(f"create failed: {created}")
    task, t0 = created["d"], time.time()
    print("task", task, flush=True)
    while True:
        got = call("GET", f"/generate/task/get?taskid={task}")
        status = (got.get("d") or {}).get("status")
        print(f"{int(time.time() - t0)}s status={status}", flush=True)
        if status == 3:
            break
        if status in (4, 6):
            sys.exit(f"task ended: {got}")
        time.sleep(10)
    OUT.mkdir(exist_ok=True)
    (OUT / f"{name}.json").write_text(json.dumps(got, ensure_ascii=False, indent=1))
    url = got["d"]["outputs"][0]["content"]
    ext = pathlib.Path(url.split("?")[0]).suffix or ".bin"
    urllib.request.urlretrieve(url, OUT / f"{name}{ext}")
    print("url", url)
    print("saved", OUT / f"{name}{ext}", f"after {int(time.time() - t0)}s")


mode, src = sys.argv[1:3]
if mode == "glb":
    run("/generate/img-to-3d/task/create",
        {"img": src, "version": "G1-Turbo", "outputFormat": ["glb"], "faceCount": 50000}, sys.argv[3])
elif mode == "text":
    run("/generate/text-to-3d/task/create",
        {"prompt": src, "version": "G1-Turbo", "outputFormat": ["glb"], "faceCount": 50000}, sys.argv[3])
elif mode == "articulate":
    run("/articulation-animation/task/create", {"glbUrl": src, "prompt": sys.argv[3]}, sys.argv[4])
else:
    sys.exit(__doc__)
