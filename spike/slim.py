"""Shrink the textures in a Lux3D result ZIP: python3 -I slim.py in.zip out.zip
Images go to at most 1024 px; JPEG unless a material actually uses alpha. Geometry, paths and filenames stay identical,
so stored crowd taps still line up."""
import io, json, struct, sys, zipfile
from PIL import Image

MAX = 1024


def slim_image(data, opaque):
    im = Image.open(io.BytesIO(data))
    im.thumbnail((MAX, MAX))
    out = io.BytesIO()
    if not opaque and im.mode in ("RGBA", "LA") and im.getchannel("A").getextrema()[0] < 255:
        im.save(out, "PNG", optimize=True)
        return out.getvalue(), "image/png"
    im.convert("RGB").save(out, "JPEG", quality=85)
    return out.getvalue(), "image/jpeg"


def slim_glb(b):
    n = struct.unpack("<I", b[12:16])[0]
    j = json.loads(b[20:20 + n])
    bin_start = 20 + n + 8
    old = b[bin_start:bin_start + struct.unpack("<I", b[20 + n:24 + n])[0]]
    views = j["bufferViews"]
    blobs = [old[v.get("byteOffset", 0):v.get("byteOffset", 0) + v["byteLength"]] for v in views]
    opaque = all(m.get("alphaMode", "OPAQUE") == "OPAQUE" for m in j.get("materials", []))  # renderer ignores alpha
    for img in j.get("images", []):
        blobs[img["bufferView"]], img["mimeType"] = slim_image(blobs[img["bufferView"]], opaque)
    buf = bytearray()
    for v, data in zip(views, blobs):
        buf += b"\0" * (-len(buf) % 4)  # keep every view 4-byte aligned
        v["byteOffset"], v["byteLength"] = len(buf), len(data)
        buf += data
    buf += b"\0" * (-len(buf) % 4)
    j["buffers"][0]["byteLength"] = len(buf)
    js = json.dumps(j, separators=(",", ":")).encode()
    js += b" " * (-len(js) % 4)
    body = struct.pack("<I4s", len(js), b"JSON") + js + struct.pack("<I4s", len(buf), b"BIN\0") + buf
    return struct.pack("<4sII", b"glTF", 2, 12 + len(body)) + body


def main(src, dst):
    with zipfile.ZipFile(src) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info)
            zout.writestr(info.filename, slim_glb(data) if info.filename.endswith(".glb") else data)


if __name__ == "__main__":
    main(*sys.argv[1:3])
