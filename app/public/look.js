// The light and materials: a photo studio for reflections, the two lights and the single shadow map, tuned.
// Everything here runs once (at start-up, or once per object as it is built); nothing is added to a frame.

// A product photographer's studio, rendered once into the reflection map: a big softbox overhead, a tall strip on
// each side and a low bounce in front, in a dark room. Metal, gold and gloss pick up its shapes; matte parts get soft,
// even light. The panels are brighter than white (the map is HDR), so highlights stay crisp.
function studio(THREE, renderer) {
  const s = new THREE.Scene();
  // a dim grey room, not black: metal shows the room wherever it does not show a light
  s.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.11, 0.11, 0.115), side: THREE.BackSide })));
  const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.315, 0.3) }));
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = -3;
  s.add(floorGlow);
  const panel = (w, h, glow, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.985, 0.96).multiplyScalar(glow), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  panel(11, 8, 4.5, -0.6, 7, 2.5); // overhead softbox, a little in front and to the key's side
  panel(2.2, 10, 3, -6, 1.5, 3); // left strip
  panel(2.2, 10, 2.4, 6, 1.5, -1.5); // right strip, behind: a rim on curved edges
  panel(14, 3, 0.9, 0, -0.6, 7); // low bounce in front, lifts the shadow side
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(s, 0.035).texture;
  pm.dispose();
  return env;
}

export function setupLook({ THREE, renderer, scene, back, camera, key, rim, floor, ground }) {
  scene.environment = studio(THREE, renderer);
  key.color.set(0xfff8ee);
  key.intensity = 3;
  key.position.set(-1.8, 2.8, 2.4);
  rim.color.set(0xf2efe8);
  rim.intensity = 0.9;
  key.shadow.bias = -0.00006;
  key.shadow.normalBias = 0.001;
  ground.material.uniforms.uAlpha.value = 0.28;

  const seen = new WeakSet();
  return {
    object(root) {
      root.traverse(mesh => {
        if (!mesh.isMesh) return;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          if (!material.isMeshStandardMaterial || material.side === THREE.BackSide) continue;
          mesh.receiveShadow = !material.transparent;
          if (seen.has(material)) continue;
          seen.add(material);
          // An explicit map makes this fill level identical in the thumbnail scene.
          material.envMap = scene.environment;
          material.envMapIntensity *= scene.environmentIntensity * 0.9;
          if (material.roughnessMap) material.roughness *= 0.9;
          else if (material.metalness > 0.5) material.roughness = Math.max(0.22, material.roughness);
          material.needsUpdate = true;
        }
      });
    },
  };
}
