// The inspection bench Hinge Hunt is played on: node build.mjs → ../public/bench.js
//
// Concept: every part of the game is an instrument on one bench.
//   turntable          the object stands on its platter; dragging turns it (degree ticks turn with it)
//   mechanical timer   its needle sweeps the 15 seconds
//   dial indicator     on the reveal its needle reads the miss, as a share of the object's size (full scale 30% = no points)
//   specimen rack      five drawers, one per object; the current one slides open
//   counter            three digit windows roll the score
//   desk lamp          the key light; the 3D object is lit from the same direction
// Parts list: base (plate, 8 foot parts, groove, 4 screws, ruler strip + ticks, label plate),
// turntable (collar, bearing, platter, knurl, seam, rim ring, ticks, hub, index bracket + pointer),
// timer (housing, puck, bezel knurl, seam, ring, ticks, needle, hub, crown, start lever, screws),
// gauge (magnet base, knob, collar, post x2, seam rings, clamp, thumb screw, arm, dial puck, bezel, ticks, needle, crown, lug, stem, plunger, anvil),
// rack (2 cheeks, top, bottom, 5 drawers x [box, front, pull, holder], screws),
// counter (case, bezel, 3 windows, 3 digits, reset knob, screws), lamp (base, collar, post, knuckles, arms, shade, diffuser).
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import * as G from "./kit/lathe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const W = 640, H = 480;

const PLATE = { x: -160, y: -120, w: 320, d: 240, r: 10 };
const PLATE_H = 12, FOOT_H = 5;
const TT = { x: -6, y: 8, R: 64, top: 15 };            // turntable centre, platter radius, platter top
const TIMER = { x: 112, y: 62, R: 17 };
const GAUGE = { x: -118, y: 56, R: 18, z: 64 };
const RACK = { x: 72, y: -112, w: 70, d: 44 };
const DRAWERS = 5, DRAWER_H = 13, RACK_Z0 = 6;
const COUNTER = { x: -4, y: 92, w: 70, d: 18, h: 20 };
const LAMP = { x: -128, y: -92 };
const LIGHT_AT = [-60, -46, 132];                      // shade centre; the key light shines from here at the platter

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [LAMP.x, LAMP.y, 150], [RACK.x, RACK.y, 80], [TT.x, TT.y, 150]],
  W, H, { pad: 18, azimuth: 45 },
);
const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const screw = (x, y, z, r = 1.8) => L(k.ring(x, y, r, z, P, 14), { tone: "lo" }) + D([at([x, y, z])], { size: 0.45 });

function plate() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 24))) {
    out.push(S(k.cylinder(x, y, 8, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(PLATE, -4, P, 8), { tone: "faint" }) }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  for (const [x, y] of k.corners(PLATE, 11)) out.push(screw(x, y, 0, 2.2));
  // tapped holes on a 12-unit pitch, like an optical breadboard; whatever stands on the plate covers its own
  out.push(D(k.dotGrid(-144, -108, 25, 19, 12, 0, P).filter((_, i) => { const c = i % 25, r = Math.floor(i / 25); return !((c === 0 || c === 24) && (r === 0 || r === 18)); }), { size: 0.42, tone: "lo" }));
  const strip = { x: -136, y: PLATE.y + PLATE.d - 16, w: 272, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // label plate, front left
  const lab = { x: -146, y: 70, w: 34, d: 20, r: 1.5 };
  out.push(S(k.slabOf(lab, 0, 0.8, P, 4), { tone: "lo" }));
  out.push(L(k.planOutline(k.insetPlan(lab, 1.6), 0.8, P), { tone: "faint" }));
  out.push(L([[5, 24], [5, 18], [5, 21]].map(([x0, w], i) => k.lineOnTop([lab.x + x0, lab.y + 6 + i * 4], [lab.x + x0 + w, lab.y + 6 + i * 4], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([lab.x + lab.w - 3, lab.y + 3, 0.8]), at([lab.x + lab.w - 3, lab.y + lab.d - 3, 0.8])], { size: 0.4 }));
  return out.join("");
}

function lamp() {
  const out = [];
  const { x, y } = LAMP;
  out.push(`<path class="iso-halo" d="${k.haloOf({ x: x - 16, y: y - 16, w: 32, d: 32, r: 16 }, 0, 0.1, P)}" style="filter:blur(4px)"/>`);
  out.push(S(k.cylinder(x, y, 16, 0, 5, P, 48, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x + 7, y: y - 3, w: 6, d: 6, r: 1 }, 5, 1.6, P, 2, 0.3), { tone: "mid" }));
  out.push(L(k.lineOnTop([x + 10, y - 3], [x + 10, y + 3], 6.6, P), { tone: "lo" }));
  out.push(S(k.cylinder(x, y, 5, 5, 4, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.6, 9, 82, P, 20), { tone: "mid", crease: "none", inner: L([30, 60].map((z) => k.sideArc(x, y, 2.6, z, P, 12)).join(""), { tone: "faint" }) }));
  const knuckle = [x, y, 94];
  const elbow = [x + 26, y + 18, 150];
  const shade = LIGHT_AT;
  const rod = (a, b, r) => {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len = Math.hypot(...d);
    return S(G.disc(0, len, r, G.frameAlong(a, d.map((v) => v / len)), P), { tone: "mid" });
  };
  out.push(S(G.sphereOf(knuckle, 4.4, P), { tone: "mid" }));
  out.push(rod(knuckle, elbow, 2.2));
  out.push(S(G.sphereOf(elbow, 4, P), { tone: "mid" }));
  out.push(rod(elbow, shade, 2.2));
  // shade: a cone opening toward the platter, its diffuser the one lit part
  const aim = [TT.x - shade[0], TT.y - shade[1], 40 - shade[2]];
  const n = Math.hypot(...aim), a = aim.map((v) => v / n);
  const back = shade.map((v, i) => v - a[i] * 10);
  const F = G.frameAlong(back, a);
  out.push(S(G.solidOf([[0, 4], [4, 6, 1], [10, 12, 1], [20, 19]], F, P), { tone: "mid" }));
  out.push(S(G.disc(20, 20.6, 17.5, F, P), { tone: "hi", lit: true }));
  return out.join("");
}

function rack() {
  const out = [];
  const { x, y, w, d } = RACK;
  const top = RACK_Z0 + DRAWERS * DRAWER_H + 2;
  out.push(`<path class="iso-halo" d="${k.haloOf({ ...RACK, r: 2 }, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  out.push(S(k.slabOf({ x, y, w, d, r: 2 }, 0, RACK_Z0, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf({ x, y, w: 4, d, r: 1 }, RACK_Z0, top - RACK_Z0, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: x + 4, y, w: w - 8, d: 3, r: 0.5 }, RACK_Z0, top - RACK_Z0, P, 2), { tone: "lo" }));
  return out.join("");
}
// drawers are built at rest and moved along +y; index 0 is the bottom one
function drawer(i) {
  const { x, y, w, d } = RACK;
  const z = RACK_Z0 + i * DRAWER_H;
  const out = [];
  out.push(S(k.slabOf({ x: x + 5, y: y + 3, w: w - 10, d: d - 4, r: 0.6 }, z + 0.6, DRAWER_H - 1.6, P, 2), { tone: "lo" }));
  const front = { x: x + 4.5, y: y + d - 3, w: w - 9, d: 3, r: 0.6 };
  out.push(S(k.slabOf(front, z + 0.4, DRAWER_H - 0.8, P, 2, 0.4), { tone: "mid" }));
  const face = y + d;
  const holder = k.pathOf([[x + 12, z + 3.5], [x + 30, z + 3.5], [x + 30, z + 9.5], [x + 12, z + 9.5]].map(([px, pz]) => at([px, face, pz])), true);
  out.push(L(holder, { tone: "lo" }));
  out.push(L(k.pathOf([[x + 14, z + 5.3], [x + 27, z + 5.3]].map(([px, pz]) => at([px, face, pz]))) + k.pathOf([[x + 14, z + 7.6], [x + 23, z + 7.6]].map(([px, pz]) => at([px, face, pz]))), { tone: "lo", free: true }));
  out.push(`<path data-part="tab${i}" class="iso-line" data-tone="faint" d="${holder}" style="stroke:none"/>`);
  out.push(S(k.slabOf({ x: x + w - 22, y: face, w: 12, d: 2.6, r: 1 }, z + 5, 2.6, P, 2), { tone: "mid", crease: "none" }));
  out.push(D([at([x + 8, face, z + DRAWER_H / 2]), at([x + w - 8, face, z + DRAWER_H / 2])], { size: 0.4 }));
  return out.join("");
}
function rackFront() {
  const { x, y, w, d } = RACK;
  const top = RACK_Z0 + DRAWERS * DRAWER_H + 2;
  const out = [];
  out.push(S(k.slabOf({ x: x + w - 4, y, w: 4, d, r: 1 }, RACK_Z0, top - RACK_Z0, P, 3), { tone: "mid" }));
  const side = x + w;
  const slot = (z) => k.pathOf(k.roundedPlan({ x: y + 9, y: z, w: d - 18, d: 2.2, r: 1.1 }, 4).map(([u, v]) => at([side, u, v])), true);
  out.push(L([0, 1, 2, 3, 4, 5].map((i) => slot(top - 14 - i * 6)).join(""), { tone: "lo" }));
  out.push(D([at([side, y + 4, RACK_Z0 + 4]), at([side, y + d - 4, RACK_Z0 + 4]), at([side, y + 4, top - 4]), at([side, y + d - 4, top - 4])], { size: 0.45 }));
  out.push(S(k.slabOf({ x, y, w, d, r: 2 }, top, 4, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan({ x, y, w, d, r: 2 }, 3), top + 4, P), { tone: "faint" }));
  for (const [sx, sy] of k.corners({ x, y, w, d, r: 2 }, 5)) out.push(D([at([sx, sy, top + 4])], { size: 0.45 }));
  return out.join("");
}

function turntable() {
  const { x, y, R, top } = TT;
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: x - R, y: y - R, w: 2 * R, d: 2 * R, r: R }, 0, 0.1, P)}" style="filter:blur(6px)"/>`];
  out.push(S(k.cylinder(x, y, R * 0.6, 0, 5, P, 64, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, R * 0.5, 5, 3, P, 56), { tone: "lo" }));
  const side = L(k.sideArc(x, y, R, top - 3.2, P, 72), { tone: "faint" });
  out.push(S(k.cylinder(x, y, R, 8, top - 8, P, 96, 0.8), { tone: "hi", crease: "lo", inner: side }));
  out.push(L(k.knurl(x, y, R, 8.4, top - 3.6, 120, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, y, R - 7, top, P, 96), { tone: "lo" }));
  out.push(L([R - 18, R - 27, R - 36].map((r) => k.ring(x, y, r, top, P, 96)).join(""), { tone: "faint" }));
  out.push(L(k.ring(x, y, 5, top, P, 24), { tone: "lo" }));
  // index bracket in front: a block on the plate with a pointer that reaches the platter rim
  const ix = x + (R + 6) * Math.SQRT1_2, iy = y + (R + 6) * Math.SQRT1_2;
  out.push(S(k.slabOf({ x: ix - 4, y: iy - 4, w: 8, d: 8, r: 1.2 }, 0, top + 2, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([ix, iy, top + 2])], { size: 0.45 }));
  return out.join("");
}
const ttTicks = (turn) => k.radialTicks(TT.x, TT.y, TT.R - 1.2, 72, 6, TT.top, [2.2, 4.6], P, turn);
const ttPointer = () => {
  const r0 = TT.R + 3, r1 = TT.R - 3;
  return k.lineOnTop([TT.x + r0 * Math.SQRT1_2, TT.y + r0 * Math.SQRT1_2], [TT.x + r1 * Math.SQRT1_2, TT.y + r1 * Math.SQRT1_2], TT.top + 2, P);
};

function timer() {
  const { x, y, R } = TIMER;
  const body = { x: x - R - 5, y: y - R - 5, w: 2 * R + 10, d: 2 * R + 10, r: 4 };
  const out = [`<path class="iso-halo" d="${k.haloOf(body, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(body, 0, 10, P, 5, 0.8), { tone: "mid", inner: L(k.sideSeam(body, 3, P, 5), { tone: "faint" }) }));
  for (const [sx, sy] of k.corners(body, 3.5).slice(1)) out.push(D([at([sx, sy, 10])], { size: 0.45 }));
  out.push(S(k.cylinder(body.x + 4.6, body.y + 4.6, 3.4, 10, 1, P, 20), { tone: "lo" }));
  out.push(S(k.cylinder(body.x + 4.6, body.y + 4.6, 2.5, 11, 2.2, P, 20, 0.3), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, R, 10, 6, P, 64, 0.6), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, R, 13, 16, 80, P, 0.3), { tone: "lo" }));
  out.push(L(k.ring(x, y, R - 2, 16, P, 64), { tone: "lo" }));
  const t = k.radialTicks(x, y, R - 2.6, 60, 4, 16, [1.2, 2.6], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  // crown and start lever on the +x side
  out.push(S(k.slabOf({ x: body.x + body.w, y: y - 3, w: 4, d: 6, r: 1 }, 3, 5, P, 2), { tone: "mid" }));
  out.push(S(k.cylinder(body.x + body.w + 6, y, 3, 2.5, 6, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(body.x + body.w + 6, y, 3, 2.5, 8.5, 16, P), { tone: "lo" }));
  out.push(L(k.ring(x, y, 1.4, 16, P, 14), { tone: "mid" }));
  return out.join("");
}
const needle = (cx, cy, R, z, share) => {
  const a = share * Math.PI * 2;
  return k.lineOnTop([cx - Math.sin(a) * 3, cy + Math.cos(a) * 3], [cx + Math.sin(a) * (R - 3.4), cy - Math.cos(a) * (R - 3.4)], z + 0.2, P);
};

function gauge() {
  const { x, y, R, z } = GAUGE;
  const mag = { x: x - 18, y: y - 20, w: 30, d: 34, r: 3 };
  const post = [x - 8, y - 6];
  const out = [`<path class="iso-halo" d="${k.haloOf(mag, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  // anvil the plunger rests on
  out.push(S(k.slabOf(mag, 0, 9, P, 5, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(mag, 0.8), 9, 9, P, 5, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(mag, 3), 18, P), { tone: "faint" }));
  const knob = [mag.x + 8, mag.y + mag.d - 8];
  out.push(S(k.cylinder(knob[0], knob[1], 5, 18, 4, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 5, 18, 22, 30, P), { tone: "lo" }));
  out.push(L(k.lineOnTop(knob, [knob[0] + 5, knob[1]], 22, P), { tone: "hi" }));
  out.push(S(k.cylinder(post[0], post[1], 4.4, 18, 4, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(post[0], post[1], 2.8, 22, z + 10 - 22, P, 20), { tone: "mid", crease: "none", inner: L(k.sideArc(post[0], post[1], 2.8, 44, P, 12), { tone: "faint" }) }));
  const clamp = { x: post[0] - 6, y: post[1] - 6, w: 12, d: 12, r: 2 };
  out.push(S(k.slabOf(clamp, z + 10, 10, P, 4, 0.6), { tone: "mid" }));
  out.push(S(k.cylinder(post[0], post[1], 2.8, z + 20, 12, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(post[0], post[1], 3.4, z + 32, 2, P, 20), { tone: "mid" }));
  // arm from the clamp to the dial lug
  const arm = { x: post[0] + 6, y: y - 2.5, w: x + R + 6 - post[0] - 6 + 10, d: 5, r: 1.6 };
  out.push(S(k.slabOf(arm, z + 13, 4, P, 3, 0.4), { tone: "mid" }));
  // the anvil sits nearer than the magnet base, so it is drawn after it
  const anvil = { x: x + 14, y: y - 4, w: 12, d: 12, r: 1 };
  out.push(S(k.slabOf(anvil, 0, 6, P, 2, 0.4), { tone: "mid" }));
  // stem and plunger down to the anvil
  const px = x + 20, py = y + 2;
  out.push(S(k.cylinder(px, py, 1.3, 6, z - 6, P, 16), { tone: "hi", crease: "none" }));
  out.push(S(k.cylinder(px, py, 2.6, z - 10, 10, P, 20), { tone: "mid" }));
  // dial on the arm's end, face up
  out.push(S(k.cylinder(px, py, R, z + 4, 9, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(px, py, R, z + 9.6, z + 13, 84, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(px, py, R, z + 9.6, P, 40), { tone: "faint" }));
  out.push(L(k.ring(px, py, R - 2.2, z + 13, P, 64), { tone: "lo" }));
  const t = k.radialTicks(px, py, R - 3, 30, 5, z + 13, [1.3, 2.8], P, -Math.PI * 0.75, Math.PI * 1.5);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(S(k.slabOf({ x: px + R - 1, y: py - 2.4, w: 5, d: 4.8, r: 1.2 }, z + 6, 5, P, 3), { tone: "mid" }));
  out.push(L(k.ring(px, py, 1.6, z + 13, P, 16), { tone: "mid" }));
  return out.join("");
}
const GAUGE_DIAL = { x: GAUGE.x + 20, y: GAUGE.y + 2, R: GAUGE.R, z: GAUGE.z + 13 };
// needle sweeps 270°: 0 at the left stop, full scale (30% of the object's size) at the right
const gaugeNeedle = (share) => {
  const a = -Math.PI * 0.75 + Math.min(1, Math.max(0, share)) * Math.PI * 1.5;
  const { x, y, R, z } = GAUGE_DIAL;
  return k.lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * (R - 4), y - Math.cos(a) * (R - 4)], z + 0.2, P);
};

function counter() {
  const { x, y, w, d, h } = COUNTER;
  const box = { x, y, w, d, r: 2 };
  const out = [`<path class="iso-halo" d="${k.haloOf(box, 0, 0.1, P)}" style="filter:blur(4px)"/>`];
  out.push(S(k.slabOf(box, 0, h, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(box, 4, P, 4), { tone: "faint" }) }));
  const face = y + d;
  const plane = k.sideMatrix([0, face], 0, P, "left");
  const wins = [0, 1, 2].map((i) => ({ x0: x + 12 + i * 16, x1: x + 24 + i * 16, z0: 6, z1: 17 }));
  const rect = (r, inset = 0) => k.pathOf([[r.x0 - inset, r.z0 - inset], [r.x1 + inset, r.z0 - inset], [r.x1 + inset, r.z1 + inset], [r.x0 - inset, r.z1 + inset]].map(([px, pz]) => at([px, face, pz])), true);
  wins.forEach((r) => {
    out.push(`<path d="${rect(r)}" class="hh-window"/>`);
    out.push(L(rect(r), { tone: "lo" }), L(rect(r, 1.2), { tone: "faint" }));
  });
  // digits: text laid in the face plane (local x along +x, local y = -z)
  out.push(`<g transform="${plane}">${wins.map((r, i) => `<text data-part="digit${i}" class="hh-digit" x="${(r.x0 + r.x1) / 2}" y="${-(r.z0 + 2.4)}" text-anchor="middle" font-size="8.6">0</text>`).join("")}</g>`);
  out.push(D([at([x + 5, face, h - 4]), at([x + w - 5, face, h - 4])], { size: 0.45 }));
  // reset knob on top
  out.push(S(k.cylinder(x + w - 9, y + d / 2, 4.2, h, 4, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(x + w - 9, y + d / 2, 4.2, h, h + 4, 24, P), { tone: "lo" }));
  return out.join("");
}


// a vernier caliper lying on the bench behind the turntable
function caliper() {
  const out = [`<path class="iso-halo" d="${k.haloOf({ x: -104, y: -118, w: 92, d: 18, r: 3 }, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf({ x: -101, y: -118, w: 5, d: 16, r: 0.8 }, 0, 1.6, P, 2, 0.3), { tone: "mid" }));
  const beam = { x: -98, y: -108, w: 88, d: 6, r: 0.8 };
  out.push(S(k.slabOf(beam, 0, 1.6, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  const t = k.topTicks(beam.x + 3, beam.x + beam.w - 3, 2, 5, beam.y, 1.6, [1.3, 2.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(S(k.slabOf({ x: -62, y: -118, w: 4, d: 9, r: 0.6 }, 0, 1.6, P, 2, 0.3), { tone: "mid" }));
  const slider = { x: -63, y: -110, w: 17, d: 10, r: 1 };
  out.push(S(k.slabOf(slider, 0, 3.2, P, 3, 0.5), { tone: "mid" }));
  out.push(L(k.planOutline({ x: -60, y: -109, w: 11, d: 4.4, r: 0.6 }, 3.2, P, 2), { tone: "faint" }));
  out.push(S(k.cylinder(-50, -104.6, 1.5, 3.2, 1.6, P, 14), { tone: "mid" }));
  out.push(S(k.cylinder(-55, -98.4, 2.4, 0.2, 3, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(-55, -98.4, 2.4, 0.2, 3.2, 14, P), { tone: "lo" }));
  return out.join("");
}

// the turntable's lock knob on a pillow block beside the platter
function lockKnob() {
  const block = { x: -91, y: 6, w: 12, d: 12, r: 1.6 };
  const out = [`<path class="iso-halo" d="${k.haloOf(block, 0, 0.1, P)}" style="filter:blur(3px)"/>`];
  out.push(S(k.slabOf(block, 0, 9, P, 3, 0.5), { tone: "mid", inner: L(k.sideSeam(block, 3, P, 3), { tone: "faint" }) }));
  out.push(D(k.corners(block, 2.4).map(([x, y]) => at([x, y, 9])), { size: 0.4 }));
  out.push(S(k.cylinder(-85, 12, 2, 9, 2, P, 14), { tone: "mid" }));
  out.push(S(k.cylinder(-85, 12, 4.4, 11, 4.4, P, 28, 0.4), { tone: "mid" }));
  out.push(L(k.knurl(-85, 12, 4.4, 11, 15.4, 28, P), { tone: "lo" }));
  out.push(L(k.lineOnTop([-85, 12], [-80.6, 12], 15.4, P), { tone: "hi" }));
  return out.join("");
}

// back to front by depth of each instrument's centre
const pieces = [
  [LAMP.x, LAMP.y, lamp()],
  [RACK.x + RACK.w / 2, RACK.y + RACK.d / 2, rack() + Array.from({ length: DRAWERS }, (_, i) => `<g data-part="drawer${i}">${drawer(i)}</g>`).join("") + rackFront()],
  [GAUGE.x, GAUGE.y, gauge() + `<path data-part="gaugeNeedle" class="iso-line" data-tone="lit" data-free="start" style="stroke-width:1.1" d="${gaugeNeedle(0)}"/>`],
  [TT.x, TT.y, turntable() + `<g data-part="ttTicks"><path class="iso-line" data-tone="lo" d="${ttTicks(0).minor}"/><path class="iso-line" data-tone="mid" d="${ttTicks(0).major}"/></g><path class="iso-line" data-tone="hi" d="${ttPointer()}"/>`],
  [TIMER.x, TIMER.y, timer() + `<path data-part="timerNeedle" class="iso-line" data-tone="lit" data-free="start" style="stroke-width:1.1" d="${needle(TIMER.x, TIMER.y, TIMER.R, 16, 0)}"/>`],
  [COUNTER.x + COUNTER.w / 2, COUNTER.y + COUNTER.d / 2, counter()],
  [-55, -108, caliper()],
  [-85, 12, lockKnob()],
].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P)).map((p) => p[2]);

const svg = k.figureSvg({
  width: W, height: H,
  label: "An inspection bench. The object stands on a turntable; a mechanical timer counts the round, a dial indicator reads the miss, a rack of five drawers holds today's objects and a counter shows the score.",
  body: [plate(), ...pieces],
});

// Dead centre's lacquer and bone, as the kit's dark tokens
const CSS = `${k.ISO_CSS}
.iso.hh-bench{
  --anatomy-paper:#17191c;--anatomy-card:#17191c;--anatomy-face:#1f2226;--anatomy-top:#212429;
  --anatomy-shade-0:#111316;--anatomy-shade-1:#14171a;--anatomy-shade-2:#181b1f;--anatomy-shade-3:#1c1f23;
  --anatomy-lit-top:#2c3036;--anatomy-lit-shade:#22262b;
  --anatomy-hi:#e4e0d4;--anatomy-mid:#767a80;--anatomy-lo:#474b51;--anatomy-faint:#2e3237;--anatomy-lit:#ffffff;
  --anatomy-halo:#000;--anatomy-halo-opacity:.85;--anatomy-dot:#cfcbc0;
}
.hh-window{fill:var(--anatomy-shade-0)}
.hh-digit{font-family:"Chakra Petch",ui-monospace,monospace;font-weight:700;fill:var(--anatomy-hi)}
`;

const out = `// Built by bench/build.mjs. Do not edit.
export const VIEW = ${JSON.stringify({ w: W, h: H })};
export const P = ${JSON.stringify(P)};
export const TT = ${JSON.stringify(TT)};
export const TIMER = ${JSON.stringify({ ...TIMER, z: 16 })};
export const GAUGE_DIAL = ${JSON.stringify(GAUGE_DIAL)};
export const RACK = ${JSON.stringify({ ...RACK, drawers: DRAWERS })};
export const LIGHT_AT = ${JSON.stringify(LIGHT_AT)};
export const CSS = ${JSON.stringify(CSS)};
export const SVG = ${JSON.stringify(svg)};
`;
writeFileSync(join(HERE, "../public/bench.js"), out);
writeFileSync(join(HERE, "../../spike/bench.js"), out); // for spike pages

// a preview page for checking the drawing on its own
writeFileSync(join(HERE, "../../spike/bench-preview.html"), k.pageHtml({ title: "Bench", theme: "dark", width: 1200, body: `<div class="iso hh-bench" style="max-width:1200px;margin:0 auto;background:#17191c">${svg}</div>`, script: "" }).replace("</style>", `${CSS.slice(k.ISO_CSS.length)}</style>`));
console.log("wrote public/bench.js and spike/bench-preview.html", (out.length / 1024).toFixed(0), "KB");
