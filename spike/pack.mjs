// Shrink an object's parts.glb for the web: quantize the vertex attributes and pack the buffers with meshopt
// (EXT_meshopt_compression; the page decodes it with three's MeshoptDecoder). Nothing is reordered: rig.json picks
// meshes by index and a cut part owns its triangles by index, so mesh, vertex and triangle order must stay as they are.
// The script reads the result back and checks that, and that every vertex stays within 0.1% of the object's size.
//   cd spike && npm install && node pack.mjs ../app/public/objects/<name>/parts.glb [...]   (rewrites each file in place)
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTMeshoptCompression } from "@gltf-transform/extensions";
import { quantize } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { readFileSync, statSync, writeFileSync } from "node:fs";

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });

// world-space triangles of every mesh, in order, so the packed file can be compared with the original
function triangles(doc) {
  const out = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION"), idx = prim.getIndices(), v = [0, 0, 0], tri = [];
      for (let i = 0; i < idx.getCount(); i++) {
        pos.getElement(idx.getScalar(i), v);
        tri.push(m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]);
      }
      out.push(tri);
    }
  }
  return out;
}

for (const file of process.argv.slice(2)) {
  const before = statSync(file).size, original = await io.readBinary(readFileSync(file));
  if (original.getRoot().listExtensionsUsed().some(e => e.extensionName === "EXT_meshopt_compression")) { console.log(`${file}: already packed`); continue; }
  const want = triangles(original);
  const doc = await io.readBinary(readFileSync(file));
  await doc.transform(quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12 }));
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const packed = await io.writeBinary(doc);
  const got = triangles(await io.readBinary(packed));
  // same meshes, same triangle count and order, every corner where it was (to 0.1% of the object's size)
  let size = 0, worst = 0;
  for (const t of want) for (let i = 0; i < t.length; i++) size = Math.max(size, Math.abs(t[i]));
  if (got.length !== want.length) throw new Error(`${file}: ${want.length} meshes became ${got.length}`);
  // meshopt's index codec may rotate a triangle's corners (a b c -> b c a), which keeps the triangle and its winding
  const off = (t, g, i, r) => { let d = 0; for (let c = 0; c < 3; c++) for (let x = 0; x < 3; x++) d = Math.max(d, Math.abs(g[i + ((c + r) % 3) * 3 + x] - t[i + c * 3 + x])); return d; };
  want.forEach((t, k) => {
    if (got[k].length !== t.length) throw new Error(`${file}: mesh ${k} has ${got[k].length / 9} triangles, expected ${t.length / 9}`);
    for (let i = 0; i < t.length; i += 9) worst = Math.max(worst, Math.min(off(t, got[k], i, 0), off(t, got[k], i, 1), off(t, got[k], i, 2)));
  });
  if (worst > size * 0.001) throw new Error(`${file}: a vertex moved ${worst}, object half-size ${size}`);
  writeFileSync(file, packed);
  console.log(`${file}: ${(before / 1e6).toFixed(2)} MB -> ${(packed.length / 1e6).toFixed(2)} MB, worst vertex shift ${(worst / size * 100).toFixed(3)}%`);
}
