export { Room } from "./room.js";
import POOL from "../public/objects/index.json";
// Hinge Hunt API: recorded runs and race rooms. The objects themselves are static files made ahead of time with Lux3D.
const json = (body, status = 200) => Response.json(body, { status });

// Recorded runs: the 20 fastest finished races per object are kept, so a player alone races a real earlier run.
// ponytail: an object's list is read, changed and written back, so two finishes of one object in the same moment can
// keep only one; a Durable Object per object would serialise them if that ever matters.
// A run is its time and the moments its confirms locked parts in; nothing here is made up.
const KEEP_RUNS = 20;
// The rules version: runs kept under the rules before objects were worked by hand and parts arrived turned (16 Nov 2026)
// stay in KV under runs:<object> and records, but are not mixed with runs under the current rules.
const RUNS = "runs2";
const PENALTY = 3; // seconds per wrong part, as in the page

// Players: a browser joins with a name and keeps a random id. Each of its runs counts toward its levels: the objects are
// in six levels (objects/index.json), and a level is cleared by rebuilding 3 of its objects, in order from Level 1.
// The board ranks players by levels cleared, then progress in the next one, then the total of their 3 fastest
// rebuilds in each cleared level. Ids never leave the server.
const LEVELS = 6, CLEAR = 3;
function standing(done) {
  let cleared = 0, total = 0;
  for (let l = 1; l <= LEVELS; l++) {
    const t = POOL.filter(o => o.level === l && done[o.id] != null).map(o => done[o.id]).sort((a, b) => a - b);
    if (t.length < CLEAR) return { cleared, now: t.length, total: Math.round(total * 10) / 10 };
    cleared = l; total += t[0] + t[1] + t[2];
  }
  return { cleared, now: 0, total: Math.round(total * 10) / 10 };
}
const ahead = (a, b) => b.cleared - a.cleared || b.now - a.now || a.total - b.total;
async function credit(env, id, name, object, time) {
  const key = `player:${id}`, p = (await env.KV.get(key, "json")) || { done: {} };
  if (p.name === name && p.done[object] <= time) return; // nothing new: a slower rebuild of an object already counted
  p.name = name;
  p.done[object] = Math.min(p.done[object] ?? Infinity, time);
  // the standing rides on the player's own record, so two finishes at once can't overwrite each other on a shared list
  await env.KV.put(key, JSON.stringify(p), { metadata: { name, ...standing(p.done) } });
  boardKept = null;
}
// Every landing asks for the board, and KV allows only so many lists a day, so each Worker instance keeps the board
// for 30 s; a run credited on the same instance clears it. (KV's list can still lag a new finish by up to a minute.)
let boardKept = null, boardAt = 0;
async function board(env) {
  if (boardKept && Date.now() - boardAt < 30000) return boardKept;
  // ponytail: one page of 1,000 players; follow the cursor if it ever grows past that
  const { keys } = await env.KV.list({ prefix: "player:" });
  boardAt = Date.now();
  return (boardKept = keys.map(k => k.metadata).filter(Boolean).sort(ahead).slice(0, 20));
}
async function runs(req, env, object) {
  const o = POOL.find(o => o.id === object);
  if (!o) return json({ error: "No such object." }, 404);
  const key = `${RUNS}:${object}`, list = (await env.KV.get(key, "json")) || [];
  if (req.method === "GET") return json(list);
  if (req.method !== "POST") return json({ error: "Not found." }, 404);
  let b;
  try { b = await req.json(); } catch { return json({ error: "Send JSON." }, 400); }
  const time = Math.round(+b.time * 10) / 10, parts = b.parts | 0, misses = b.misses | 0;
  const checks = Array.isArray(b.checks) ? b.checks.slice(-60).map(c => (Array.isArray(c) ? [Math.round(+c[0]), c[1] | 0] : [NaN, 0])) : [];
  const last = checks.at(-1);
  // A run has to add up: this object's part count, confirms in time order that never lose a part, the last one
  // locking every part in, a time no sooner than that confirm plus 3 s per wrong part, and no faster than half a
  // second per part. Times are measured by the player's page, so this stops impossible runs, not a careful forger.
  const adds = parts === o.parts && misses >= 0 && misses <= 500 && last
    && checks.every(([t, n], i) => t >= 0 && n >= 0 && n <= parts && (!i || (t >= checks[i - 1][0] && n >= checks[i - 1][1])))
    && last[1] === parts && time <= 600 && time >= Math.max(1, 0.5 * parts) && time >= last[0] / 1000 + PENALTY * misses - 0.15;
  if (!adds) return json({ error: "That run does not add up." }, 400);
  const run = { name: String(b.name ?? "").replace(/\s+/g, " ").trim().slice(0, 16) || "Player", time, misses, parts, checks, at: Date.now() };
  const next = [...list, run].sort((x, y) => x.time - y.time).slice(0, KEEP_RUNS);
  if (next.includes(run)) await env.KV.put(key, JSON.stringify(next));
  if (/^[a-z0-9]{8,16}$/.test(b.player || "")) await credit(env, b.player, run.name, object, time);
  return json({ ok: true, rank: next.indexOf(run) + 1, at: run.at });
}

// ---------- forged fakes ----------
// A player describes a fake part. Lux3D G1-Turbo text-to-3D makes it (10,000 faces, about 2 minutes) and it hides in a
// friend's tray in place of the stock decoy. The Lux3D key is a Worker secret and never reaches the page. Lux3D's model
// is about 11 MB, nearly all of it two 2048 px textures, so the forger's page fetches it through here, shrinks the
// textures and sends back a file of about 0.7 MB, which KV keeps (Lux3D's links last 2 hours). The hackathon's credits
// end on 19 Nov 2026 at 15:59 UTC; after that, or with no key, forging is closed, and fakes already made keep playing.
const LUX = "https://api.aholo.ai/global/lux3d/v1";
const FORGE_ENDS = Date.UTC(2026, 10, 19, 15, 59);
// one player's fakes a day; one connection's (a player id is the caller's to make up); all fakes. A fake costs about
// 17 credits (16 Nov 2026: 1,961 -> 1,909 over three), so 50 fakes spend about 850 and leave about 1,050 spare.
// KV counters are not atomic, so a burst can go a little over.
const FORGE_PER_DAY = 5, FORGE_PER_IP = 10, FORGE_CAP = 50;
const forgeOpen = env => !!env.AHOLO_API_KEY && Date.now() < FORGE_ENDS;
const lux = (env, path, body) => fetch(LUX + path, {
  method: body ? "POST" : "GET", body: body && JSON.stringify(body),
  headers: { Authorization: env.AHOLO_API_KEY, "Content-Type": "application/json" },
}).then(r => r.json());
const pub = ({ task, player, src, ...f }) => f; // what the page sees
const nameOf = v => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 16) || "Player";

async function forge(req, env) {
  if (!forgeOpen(env)) return json({ error: "Forging is closed: the hackathon's Lux3D credits ended on 19 November." }, 403);
  let b;
  try { b = await req.json(); } catch { return json({ error: "Send JSON." }, 400); }
  const o = POOL.find(o => o.id === b.object), part = b.part | 0, prompt = String(b.prompt ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!o || part < 0 || part > 64 || !/^[a-z0-9]{8,16}$/.test(b.player || "")) return json({ error: "That fake has no object or player." }, 400);
  if (prompt.length < 3) return json({ error: "Describe the fake part in a few words." }, 400);
  const date = new Date().toISOString().slice(0, 10), ip = req.headers.get("CF-Connecting-IP") || "local";
  // the per-address count keeps a hash, not the address
  const ipHash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)))].slice(0, 8).map(x => x.toString(16).padStart(2, "0")).join("");
  const day = `forged:${b.player}:${date}`, ipDay = `forgedip:${ipHash}:${date}`;
  const [mine, fromIp, all] = (await Promise.all([day, ipDay, "forged"].map(k => env.KV.get(k)))).map(v => +v || 0);
  if (mine >= FORGE_PER_DAY) return json({ error: `You have forged ${FORGE_PER_DAY} fakes today. The forge opens again tomorrow.` }, 429);
  if (fromIp >= FORGE_PER_IP) return json({ error: `This connection has forged ${FORGE_PER_IP} fakes today. The forge opens again tomorrow.` }, 429);
  if (all >= FORGE_CAP) return json({ error: "The forge has used its share of the hackathon's credits." }, 429);
  // counted before the call, so a burst sees the count go up sooner; handed back if Lux3D refuses the job
  const count = d => Promise.all([
    env.KV.put(day, String(mine + d), { expirationTtl: 2 * 86400 }),
    env.KV.put(ipDay, String(fromIp + d), { expirationTtl: 2 * 86400 }),
    env.KV.put("forged", String(all + d)),
  ]);
  await count(1);
  // the player's words, plus the object the part belongs to, so the fake is made in that object's style
  const made = await lux(env, "/generate/text-to-3d/task/create", {
    prompt: `${prompt}. A single part of a ${o.name.toLowerCase()}, on its own, product photo, plain background, no text.`,
    version: "G1-Turbo", outputFormat: ["glb"], faceCount: 10000,
  }).catch(() => null);
  if (made?.c !== "0") {
    await count(0);
    return json({ error: `Lux3D did not take the job${made?.m ? ` (${String(made.m).slice(0, 120)})` : ""}. Try again in a minute.` }, 502);
  }
  const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), x => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("");
  const fake = { id, task: made.d, player: b.player, object: o.id, part, prompt, name: nameOf(b.name), at: Date.now(), status: "making" };
  await env.KV.put(`fake:${id}`, JSON.stringify(fake));
  return json(pub(fake));
}
// A fake: making (Lux3D at work; each look asks Lux3D once) -> made (Lux3D's model is ready to fetch, for 2 hours) ->
// ready (the forger's shrunk copy is in KV) or failed.
async function fake(req, env, id, what) {
  const f = /^[a-z0-9]{8}$/.test(id) && (await env.KV.get(`fake:${id}`, "json"));
  if (!f) return json({ error: "No such fake." }, 404);
  const save = () => env.KV.put(`fake:${id}`, JSON.stringify(f));
  if (what === "glb" && req.method === "GET") {
    const bytes = f.status === "ready" && (await env.KV.get(`fakeglb:${id}`, "arrayBuffer"));
    return bytes ? new Response(bytes, { headers: { "Content-Type": "model/gltf-binary", "Cache-Control": "public, max-age=31536000, immutable" } }) : json({ error: "Not ready." }, 404);
  }
  if (what === "glb" && req.method === "POST") { // the forger's shrunk copy
    if (f.status !== "made" || req.headers.get("X-Player") !== f.player) return json({ error: "Not yours to send, or not made yet." }, 403);
    const bytes = await req.arrayBuffer();
    if (bytes.byteLength > 4e6 || new TextDecoder().decode(bytes.slice(0, 4)) !== "glTF") return json({ error: "Send a GLB under 4 MB." }, 400);
    await env.KV.put(`fakeglb:${id}`, bytes);
    Object.assign(f, { status: "ready", size: bytes.byteLength });
    await save();
    return json(pub(f));
  }
  if (what === "raw") { // Lux3D's own model, passed through to the forger's page
    const res = f.status === "made" && f.src ? await fetch(f.src).catch(() => null) : null;
    if (res?.ok) return new Response(res.body, { headers: { "Content-Type": "model/gltf-binary" } });
    // Lux3D's link lasts 2 hours; a fetch that fails before then can be tried again
    if (f.status === "made" && Date.now() - f.at < 2 * 3600e3) return json({ error: "Lux3D's model could not be fetched. Try again." }, 502);
    if (f.status === "made") { f.status = "failed"; await save(); }
    return json({ error: "Lux3D's model is no longer there." }, 410);
  }
  if (f.status === "making" && env.AHOLO_API_KEY) {
    const got = await lux(env, `/generate/task/get?taskid=${f.task}`).catch(() => null), s = got?.d?.status;
    const outs = got?.d?.outputs || [], url = (outs.find(x => /\.glb(\?|$)/.test(x.content || "")) || outs[0])?.content;
    if (s === 3 && url) Object.assign(f, { status: "made", src: url });
    else if (s === 3 || s === 4 || s === 6 || Date.now() - f.at > 20 * 60e3) f.status = "failed";
    if (f.status !== "making") await save();
  }
  return json(pub(f));
}

export default {
  async fetch(req, env) {
    const [, a, b, c, d] = new URL(req.url).pathname.split("/");
    if (a === "api" && b === "forge") return json({ open: forgeOpen(env) });
    if (a === "api" && b === "fakes" && !c && req.method === "POST") return forge(req, env);
    if (a === "api" && b === "fakes" && c) return fake(req, env, c, d);
    if (a === "api" && b === "runs" && c) return runs(req, env, c);
    if (a === "api" && b === "board") return json(await board(env));
    if (a === "api" && b === "room" && /^[A-Z0-9]{4,8}$/.test(c || "")) return env.ROOM.get(env.ROOM.idFromName(c)).fetch(req);
    if (a === "api") return json({ error: "Not found." }, 404);
    return env.ASSETS.fetch(req);
  },
};
