export const TASKS = {
  padlock: [
    { joint: "key_and_cylinder", to: 0.9, label: "Turn the key" },
    { joint: "shackle", to: 0.95, label: "Lift the shackle" },
  ],
  sharpener: [{ joint: "crank_handle", to: 1, label: "Crank one full turn" }],
  pump: [{ joint: "handle", to: 0.95, label: "Push the pump handle down" }],
  mousetrap: [{ joint: "snap_bar", to: 0.95, label: "Swing the bar over" }],
  stapler: [
    { joint: "top_arm", to: 0.9, label: "Lift the stapler arm" },
    { joint: "top_arm", to: 0, label: "Press the stapler arm down" },
  ],
  chest: [{ joint: "lid", to: 0.9, label: "Open the treasure chest" }],
  metronome: [{ joint: "winding_key", to: 1, label: "Wind the key one full turn" }],
  grinder: [{ joint: "crank", to: 1, label: "Grind one full turn" }],
  handdrill: [{ joint: "crank_wheel", to: 1, label: "Turn the drill crank once" }],
  toolbox: [{ joint: "lid", to: 0.9, label: "Lift the toolbox lid" }],
  telephone: [{ joint: "handset", to: 0.95, label: "Lift the receiver" }],
};

// Call after onLinks(true), with the object at rest and its camera/turn held still.
// onStep is zero-based. Cancellation cleans up but never resolves done as a win.
export function operate({ THREE, camera, canvas, pivots, steps, still, onStep = () => {}, onSound = () => {} }) {
  const TAU = Math.PI * 2, V = () => new THREE.Vector3();
  const plan = steps.map(step => {
    const p = pivots.find(p => p.j.child === step.joint);
    if (!p || !["revolute", "continuous", "prismatic"].includes(p.j.type)
      || !Number.isFinite(p.far) || !p.far || !Number.isFinite(step.to)
      || step.to < 0 || (p.j.type !== "continuous" && step.to > 1)) {
      throw new Error(`Invalid mechanism step: ${step.joint}`);
    }
    return { ...p, target: p.j.type === "continuous" ? step.to * TAU : step.to * p.far, label: step.label };
  });
  const ray = new THREE.Raycaster(), plane = new THREE.Plane();
  const values = new Map(), guide = new THREE.Group();
  guide.name = "operate-guide";
  const bone = new THREE.LineBasicMaterial({ color: 0xf2efe8, depthTest: false, depthWrite: false, toneMapped: false });
  const green = new THREE.LineBasicMaterial({ color: 0x46d18a, depthTest: false, depthWrite: false, toneMapped: false });
  function line(count, material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const object = new THREE.Line(geometry, material);
    object.renderOrder = 1000; object.frustumCulled = false;
    guide.add(object);
    return object;
  }
  const arc = line(65, bone), targetMark = line(17, green), grabDot = line(17, bone);
  let index = -1, active, value, start, anchor, radial, radius, span, bounds, drag = null, ended = false, sounded;
  let resolve;
  const done = new Promise(r => { resolve = r; });
  const oldCursor = canvas.style.cursor, oldTouch = canvas.style.touchAction;
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";

  function screen(point) {
    const r = canvas.getBoundingClientRect(), v = point.clone().project(camera);
    return new THREE.Vector2(r.left + (v.x + 1) * r.width / 2, r.top + (1 - v.y) * r.height / 2);
  }
  function world(point) { return active.pivot.parent.localToWorld(point.clone()); }
  function at(v, handle = false) {
    if (active.j.type === "prismatic") return anchor.clone().addScaledVector(active.axis, v);
    const offset = handle ? anchor.clone().sub(active.o) : radial.clone().setLength(radius);
    return offset.applyAxisAngle(active.axis, v).add(active.o);
  }
  function write(object, points) {
    const a = object.geometry.attributes.position;
    points.forEach((p, i) => a.setXYZ(i, p.x, p.y, p.z));
    a.needsUpdate = true;
    object.geometry.setDrawRange(0, points.length);
  }
  function ring(object, point, pixels) {
    const centre = world(point), r = canvas.getBoundingClientRect();
    const scale = camera.isPerspectiveCamera
      ? 2 * centre.distanceTo(camera.getWorldPosition(V())) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / r.height
      : (camera.top - camera.bottom) / camera.zoom / r.height;
    const right = V().setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(scale * pixels);
    const up = V().setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(scale * pixels);
    write(object, Array.from({ length: 17 }, (_, i) => active.pivot.parent.worldToLocal(
      centre.clone().addScaledVector(right, Math.cos(i * TAU / 16)).addScaledVector(up, Math.sin(i * TAU / 16)))));
  }
  function draw() {
    if (ended || !active) return;
    active.pivot.parent.updateWorldMatrix(true, true);
    write(arc, Array.from({ length: 65 }, (_, i) => at(value + (active.target - value) * i / 64)));
    ring(targetMark, at(active.target), 6);
    ring(grabDot, at(value, true), 4);
  }
  function apply(next) {
    value = next; values.set(active.pivot, value);
    if (active.j.type === "prismatic") active.pivot.position.copy(active.o).addScaledVector(active.axis, value);
    else active.pivot.quaternion.setFromAxisAngle(active.axis, value);
    draw();
  }

  // Use a real surface vertex for the grab dot, avoiding bounding-box corners in empty space.
  function handlePoint() {
    active.pivot.updateWorldMatrix(true, true);
    const inverse = active.pivot.matrixWorld.clone().invert();
    bounds = new THREE.Box3();
    let best = -Infinity, point = V();
    active.pivot.traverse(mesh => {
      if (!mesh.isMesh || mesh.parent.isMesh) return; // the page also draws each mesh's inside
      const pos = mesh.geometry.attributes.position, indices = mesh.geometry.index;
      const count = indices ? indices.count : pos.count;
      // Split link meshes share position buffers; only their indexed triangles belong to this link.
      for (let i = 0; i < count; i += Math.max(1, Math.floor(count / 600))) {
        const w = V().fromBufferAttribute(pos, indices ? indices.getX(i) : i).applyMatrix4(mesh.matrixWorld);
        const local = w.clone().applyMatrix4(inverse);
        bounds.expandByPoint(local);
        const r = local.clone().addScaledVector(active.axis, -local.dot(active.axis));
        const score = r.lengthSq(); // prefer the exposed handle over a sliding shaft inside the body
        if (score > best) { best = score; point = local; }
      }
    });
    return point.add(active.o);
  }
  function release() {
    const id = drag?.id;
    drag = null;
    if (id != null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    canvas.style.cursor = "grab";
  }
  function cleanup() {
    if (ended) return;
    ended = true; release(); guide.removeFromParent();
    for (const [name, fn] of listeners) canvas.removeEventListener(name, fn);
    window.removeEventListener("resize", draw);
    window.removeEventListener("blur", release);
    for (const child of guide.children) child.geometry.dispose();
    bone.dispose(); green.dispose();
    canvas.style.cursor = oldCursor; canvas.style.touchAction = oldTouch;
  }
  function advance() {
    release(); guide.removeFromParent();
    if (++index === plan.length) { cleanup(); onSound("done"); resolve(); return; }
    active = plan[index];
    const q = active.pivot.quaternion;
    value = values.get(active.pivot) ?? (active.j.type === "prismatic"
      ? active.pivot.position.clone().sub(active.o).dot(active.axis)
      : 2 * Math.atan2(q.x * active.axis.x + q.y * active.axis.y + q.z * active.axis.z, q.w));
    start = value; sounded = value;
    anchor = handlePoint();
    radial = anchor.clone().sub(active.o);
    radial.addScaledVector(active.axis, -radial.dot(active.axis));
    const box = new THREE.Box3().setFromObject(active.pivot.parent);
    span = box.getSize(V()).length() / active.pivot.parent.getWorldScale(V()).x;
    radius = Math.max(radial.length() * 1.12, span * 0.12);
    if (radial.lengthSq() < 1e-12) radial.crossVectors(active.axis, Math.abs(active.axis.y) < 0.9 ? V().set(0, 1, 0) : V().set(1, 0, 0));
    active.pivot.parent.add(guide);
    draw(); onStep(index, plan.length, active.label);
    if (Math.abs(value - active.target) < 1e-8) advance();
  }
  function setRay(x, y) {
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((x - r.left) / r.width * 2 - 1, 1 - (y - r.top) / r.height * 2), camera);
  }
  function direction(x, y, origin, axis) {
    setRay(x, y);
    plane.setFromNormalAndCoplanarPoint(axis, origin);
    const hit = ray.ray.intersectPlane(plane, V());
    return hit && hit.sub(origin).lengthSq() > 1e-10 ? hit.normalize() : null;
  }
  function down(e) {
    if (ended || drag || e.button !== 0) return;
    active.pivot.parent.updateWorldMatrix(true, true);
    const mouse = new THREE.Vector2(e.clientX, e.clientY);
    setRay(e.clientX, e.clientY);
    let near = ray.intersectObject(active.pivot, true).length > 0;
    const box = bounds.clone().applyMatrix4(active.pivot.matrixWorld), min = new THREE.Vector2(Infinity, Infinity), max = min.clone().negate();
    for (let i = 0; i < 8; i++) {
      const p = screen(V().set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
      min.min(p); max.max(p);
    }
    near ||= mouse.x >= min.x - 28 && mouse.x <= max.x + 28 && mouse.y >= min.y - 28 && mouse.y <= max.y + 28;
    for (let i = 0; !near && i <= 64; i++) near = mouse.distanceTo(screen(world(at(value + (active.target - value) * i / 64)))) < 36;
    if (!near) return;
    const origin = world(active.o), axis = active.axis.clone().transformDirection(active.pivot.parent.matrixWorld);
    const facing = Math.abs(axis.dot(camera.getWorldPosition(V()).sub(origin).normalize()));
    const angular = active.j.type !== "prismatic" && facing > 0.23 && mouse.distanceTo(screen(origin)) > 14;
    let tangent;
    if (active.j.type === "prismatic") {
      const length = Math.max(Math.abs(active.far), span * 0.1);
      tangent = screen(world(at(value).addScaledVector(active.axis, length))).sub(screen(world(at(value)))).divideScalar(length);
    } else {
      tangent = screen(world(at(value + 0.08))).sub(screen(world(at(value - 0.08)))).divideScalar(0.16);
      if (tangent.length() < 12) tangent = screen(world(at(value + 0.5))).sub(screen(world(at(value)))).multiplyScalar(2);
    }
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, origin, axis, tangent, angular,
      direction: angular ? direction(e.clientX, e.clientY, origin, axis) : null };
    canvas.setPointerCapture(e.pointerId); canvas.style.cursor = "grabbing";
    e.preventDefault(); onSound("grab");
  }
  function move(e) {
    if (!drag || drag.id !== e.pointerId) return;
    let delta = 0;
    if (drag.angular) {
      const next = direction(e.clientX, e.clientY, drag.origin, drag.axis);
      if (next && drag.direction) delta = Math.atan2(drag.axis.dot(drag.direction.clone().cross(next)), drag.direction.dot(next));
      drag.direction = next;
    } else if (active.j.type === "prismatic") {
      const d = new THREE.Vector2(e.clientX - drag.x, e.clientY - drag.y), tangent = drag.tangent.clone().normalize();
      const mouse = screen(world(at(value))).addScaledVector(tangent, d.dot(tangent));
      setRay(mouse.x, mouse.y);
      const hit = V();
      // Recover the value on the projected axis, including perspective foreshortening.
      ray.ray.distanceSqToSegment(world(at(0)), world(at(active.far)), V(), hit);
      delta = active.pivot.parent.worldToLocal(hit).sub(anchor).dot(active.axis) - value;
    } else {
      const d = new THREE.Vector2(e.clientX - drag.x, e.clientY - drag.y);
      if (drag.tangent.lengthSq() > 1e-6) delta = d.dot(drag.tangent) / drag.tangent.lengthSq();
    }
    drag.x = e.clientX; drag.y = e.clientY;
    const end = active.j.type === "continuous" ? Math.max(start, active.target) : active.far;
    const next = THREE.MathUtils.clamp(value + delta, Math.min(0, end), Math.max(0, end));
    apply(next); e.preventDefault();
    if (Math.abs(value - sounded) >= Math.abs(active.target - start) * 0.08) { sounded = value; onSound("move"); }
    const sign = Math.sign(active.target - start);
    if (sign * (value - active.target) >= -Math.max(1e-9, Math.abs(active.target - start) * 1e-5)) { onSound("step"); advance(); }
  }
  function up(e) { if (e.pointerId === drag?.id) release(); }
  const listeners = [["pointerdown", down], ["pointermove", move], ["pointerup", up], ["pointercancel", up], ["lostpointercapture", up]];
  for (const [name, fn] of listeners) canvas.addEventListener(name, fn, { passive: false });
  window.addEventListener("resize", draw);
  window.addEventListener("blur", release);
  // Hand-driven only: still needs no animation, easing, timers or separate render loop.
  advance();
  return { done, cancel: cleanup };
}
