"""Unpack a Lux3D articulation ZIP safely: python3 -I spike/unzip.py in.zip out_dir (rejects absolute or .. paths)."""
import pathlib, sys, zipfile

src, dst = sys.argv[1], pathlib.Path(sys.argv[2]).resolve()
with zipfile.ZipFile(src) as z:
    for info in z.infolist():
        target = (dst / info.filename).resolve()
        if not str(target).startswith(str(dst) + "/") and target != dst:
            sys.exit(f"unsafe path in zip: {info.filename}")
    z.extractall(dst)
print("unpacked", len(z.infolist()), "files into", dst)
