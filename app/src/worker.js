// Hinge Hunt API. Rounds live in KV: round:<id> (JSON), file:<id>:photo, file:<id>:zip, guesses:<id>.
// Pipeline per round: photo -> Lux3D G1-Turbo img-to-3D -> Lux3D articulation -> ZIP copied into KV
// (Aholo result links expire after 2 h) -> uploader confirms -> live.
const API = "https://api.aholo.ai/global/lux3d/v1";
const json = (body, status = 200) => Response.json(body, { status });
const id = () => crypto.randomUUID().replace(/-/g, "").slice(0, 10);

async function lux(env, method, path, body) {
  const r = await fetch(API + path, {
    method,
    headers: { Authorization: env.AHOLO_API_KEY, "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });
  return r.json();
}

// Task status 3 = success, 4 = failed, 6 = cancelled.
async function task(env, taskId) {
  const d = (await lux(env, "GET", `/generate/task/get?taskid=${taskId}`)).d || {};
  return { status: d.status, url: d.outputs?.[0]?.content };
}

const getRound = (env, rid) => env.KV.get(`round:${rid}`, "json");
const putRound = (env, r) => env.KV.put(`round:${r.id}`, JSON.stringify(r));
const view = r => ({ id: r.id, status: r.status, error: r.error, created: r.created, ready: r.ready });

async function create(req, env, origin) {
  const type = req.headers.get("content-type");
  if (!["image/jpeg", "image/png"].includes(type)) return json({ error: "Send a JPEG or PNG photo." }, 415);
  const count = +(await env.KV.get("count:created")) || 0;
  if (count >= +env.MAX_ROUNDS) return json({ error: "New rounds are closed: this demo has used its Lux3D credits. The existing rounds still play." }, 429);
  const photo = await req.arrayBuffer();
  if (photo.byteLength > 10e6) return json({ error: "Photo is over 10 MB." }, 413);
  const r = { id: id(), secret: id() + id(), status: "mesh", created: Date.now(), ext: type === "image/png" ? "png" : "jpg" };
  await env.KV.put(`file:${r.id}:photo`, photo, { metadata: { type } });
  const made = await lux(env, "POST", "/generate/img-to-3d/task/create", {
    img: `${origin}/f/${r.id}/photo.${r.ext}`, version: "G1-Turbo", outputFormat: ["glb"], faceCount: 50000,
  });
  if (made.c !== "0") return json({ error: "Lux3D is busy (3 jobs at once). Try again in a few minutes.", detail: made.m }, 503);
  r.meshTask = made.d;
  await env.KV.put("count:created", String(count + 1));
  await putRound(env, r);
  return json({ id: r.id, secret: r.secret });
}

// Moves the pipeline one step. Only the uploader's polling (with the secret) advances it,
// so a public viewer can never start a second paid articulation task.
// ponytail: two uploader tabs polling at once could double-start articulation; add a KV lock if that shows up.
async function advance(env, r) {
  if (r.status === "mesh") {
    const t = await task(env, r.meshTask);
    if (t.status === 3) {
      const made = await lux(env, "POST", "/articulation-animation/task/create", { glbUrl: t.url, prompt: "open it fully" });
      if (made.c !== "0") return r; // busy: retry on next poll
      Object.assign(r, { status: "mechanism", artTask: made.d });
    } else if (t.status === 4 || t.status === 6) Object.assign(r, { status: "failed", error: "Lux3D could not build a 3D model from this photo." });
  } else if (r.status === "mechanism") {
    const t = await task(env, r.artTask);
    if (t.status === 3) {
      const zip = await fetch(t.url);
      await env.KV.put(`file:${r.id}:zip`, zip.body);
      Object.assign(r, { status: "review", ready: Date.now() });
    } else if (t.status === 4 || t.status === 6) Object.assign(r, { status: "failed", error: "Lux3D could not find a moving part in this object." });
  } else return r;
  await putRound(env, r);
  return r;
}

async function confirm(req, env, r) {
  const { s, ok } = await req.json();
  if (s !== r.secret || r.status !== "review") return json({ error: "Not allowed." }, 403);
  r.status = ok ? "live" : "discarded";
  await putRound(env, r);
  if (ok) {
    const live = (await env.KV.get("list:live", "json")) || [];
    await env.KV.put("list:live", JSON.stringify([...live, r.id]));
  }
  return json(view(r));
}

// ponytail: read-modify-write on one KV key; simultaneous guesses can drop one. Fine at demo scale.
async function guess(req, env, r) {
  if (r.status !== "live") return json({ error: "This round is not live." }, 403);
  const { p, score } = await req.json();
  if (!Array.isArray(p) || p.length !== 3 || !p.every(Number.isFinite) || !(score >= 0 && score <= 100)) return json({ error: "Bad guess." }, 400);
  const all = (await env.KV.get(`guesses:${r.id}`, "json")) || [];
  all.push({ p, score: Math.round(score) });
  await env.KV.put(`guesses:${r.id}`, JSON.stringify(all.slice(-500)));
  return json(all);
}

async function file(env, rid, name) {
  const key = name === "model.zip" ? `file:${rid}:zip` : name.startsWith("photo.") ? `file:${rid}:photo` : null;
  const got = key && (await env.KV.getWithMetadata(key, "stream"));
  if (!got?.value) return new Response("Not found", { status: 404 });
  return new Response(got.value, {
    headers: { "Content-Type": got.metadata?.type || "application/zip", "Cache-Control": "public, max-age=86400" },
  });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const [, a, b, c, d] = url.pathname.split("/");
    if (a === "f" && b && c) return file(env, b, c);
    if (a !== "api" || b !== "rounds") return env.ASSETS.fetch(req);
    if (!c) {
      if (req.method === "POST") return create(req, env, url.origin);
      return json((await env.KV.get("list:live", "json")) || []);
    }
    let r = await getRound(env, c);
    if (!r) return json({ error: "No such round." }, 404);
    const owner = url.searchParams.get("s") === r.secret;
    if (!d && req.method === "GET") {
      if (owner) r = await advance(env, r);
      else if (r.status !== "live") return json({ error: "This round is not live yet." }, 404);
      const guesses = r.status === "live" ? (await env.KV.get(`guesses:${r.id}`, "json")) || [] : [];
      return json({ ...view(r), guesses });
    }
    if (d === "confirm" && req.method === "POST") return confirm(req, env, r);
    if (d === "guesses" && req.method === "POST") return guess(req, env, r);
    return json({ error: "Not found." }, 404);
  },
};
