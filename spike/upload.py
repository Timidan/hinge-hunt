"""Upload a local image to Aholo's asset store and print its URL.
  python3 -I spike/upload.py <file.jpg>
"""
import hashlib, json, pathlib, sys, time, urllib.request, uuid
ROOT = pathlib.Path(sys.argv[0]).resolve().parent.parent
key = next(l.split("=", 1)[1].strip() for l in (ROOT / ".env").read_text().splitlines() if l.startswith("AHOLO_API_KEY="))

def req(url, headers, data=None):
    with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=60) as r:
        return json.load(r)

tok = req("https://api.aholo.ai/global/asset/v1/token", {"Authorization": key})
tok = tok.get("d", tok)
print("domain", tok["globalDomain"], "block", tok["blockSize"])
body = pathlib.Path(sys.argv[1]).read_bytes()
b = uuid.uuid4().hex
form = (f"--{b}\r\nContent-Disposition: form-data; name=\"md5\"\r\n\r\n{hashlib.md5(body).hexdigest()}\r\n"
        f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"photo.jpg\"\r\nContent-Type: image/jpeg\r\n\r\n").encode() + body + f"\r\n--{b}--\r\n".encode()
h = {"ous-token-v2": tok["ousToken"]}
print("upload", req(tok["globalDomain"] + "/ous/api/v2/single/upload", {**h, "Content-Type": f"multipart/form-data; boundary={b}"}, form))
for _ in range(25):
    st = req(tok["globalDomain"] + "/ous/api/v2/upload/status", h)
    if st["d"]["status"] in (5, 6, 8):
        break
    time.sleep(0.5)
print("status", json.dumps(st, ensure_ascii=False)[:400])
