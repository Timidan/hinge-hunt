// A race room: friends join by link, the host starts, everyone rebuilds the same object, fastest total time wins.
// One Durable Object per room code, WebSockets with hibernation. Each socket's player lives in its attachment;
// the match lives in storage. Times are measured by the players' own pages; this is a game among friends.
import { DurableObject } from "cloudflare:workers";
import POOL from "../public/objects/index.json";

const PER_MATCH = 3;
const LEAD = 1200; // ms between "start" and the intro starting on every screen
const RACE_IN = 3500; // ms from the intro starting to the race clock: intro, a look and the teardown fit inside (public/index.html)
const GRACE = 30000; // after the first finisher, the others have this long
const LATE = 10; // seconds added to the time of a player who did not finish
const CAP = 180000; // a round ends after this long whatever happens
const PENALTY = 3; // seconds per wrong part, as in the page

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.s = (await ctx.storage.get("s")) || { host: null, phase: "lobby", round: -1, startAt: 0, endAt: 0, results: [], played: [] };
      this.s.played ??= [];
      this.s.gone ??= {}; // players whose connection closed during this round: their place, kept for a reconnect
      this.s.objects ??= pick(this.s.played);
    });
  }

  async fetch(req) {
    if (req.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket.", { status: 426 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  players() {
    // only open sockets count: a closing or replaced one is already gone
    return this.ctx.getWebSockets().filter(ws => ws.readyState === 1).map(ws => ({ ws, ...(ws.deserializeAttachment() || {}) })).filter(p => p.id);
  }
  send(ws, m) { try { ws.send(JSON.stringify(m)); } catch {} }
  all(m) { for (const ws of this.ctx.getWebSockets()) this.send(ws, m); }
  state() {
    return {
      t: "state", now: Date.now(), ...this.s,
      players: this.players().map(({ id, name, n, time, misses, inRound }) => ({ id, name, n, time, misses, inRound })),
    };
  }
  async save() { await this.ctx.storage.put("s", this.s); }
  // everyone in the round has finished, counting a racer whose connection dropped: their 30 s still stand
  allIn() { return this.players().filter(p => p.inRound).every(p => p.time != null) && Object.values(this.s.gone).every(g => g.time != null); }
  set(ws, patch) { ws.serializeAttachment({ ...ws.deserializeAttachment(), ...patch }); }

  async webSocketMessage(ws, raw) {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    const me = ws.deserializeAttachment() || {};
    if (m.t === "ping") return this.send(ws, { t: "pong", now: Date.now(), c: m.c });
    if (m.t === "hello") {
      const id = /^[a-z0-9]{6,16}$/.test(m.id) ? m.id : crypto.randomUUID().replace(/-/g, "").slice(0, 10);
      const name = String(m.name ?? "").replace(/\s+/g, " ").trim().slice(0, 16) || "Player";
      // a player who reloads keeps their place; their old socket goes
      let carry = { n: 0, time: null, misses: 0, inRound: this.s.phase !== "race" };
      for (const p of this.players()) {
        if (p.id === id && p.ws !== ws) { carry = { n: p.n, time: p.time, misses: p.misses, inRound: p.inRound }; p.ws.close(1000, "Replaced"); }
      }
      if (me.id === id) carry = { n: me.n, time: me.time, misses: me.misses, inRound: me.inRound };
      // back after a dropped connection: their place in the round is waiting
      else if (this.s.phase === "race" && this.s.gone[id]) { const g = this.s.gone[id]; carry = { n: g.n, time: g.time, misses: g.misses, inRound: true }; delete this.s.gone[id]; }
      ws.serializeAttachment({ id, name, ...carry });
      if (!this.s.host || !this.players().some(p => p.id === this.s.host)) this.s.host = id;
      await this.save();
      this.send(ws, { t: "you", id });
      return this.all(this.state());
    }
    if (!me.id) return;

    if (m.t === "start" && me.id === this.s.host && this.s.phase !== "race") {
      const fresh = this.s.phase === "lobby" || this.s.phase === "final";
      if (fresh) { this.s.results = []; if (this.s.next) { this.s.objects = this.s.next; this.s.next = null; } }
      this.s.round = fresh ? 0 : this.s.round + 1;
      this.s.phase = "race";
      this.s.startAt = Date.now() + LEAD;
      this.s.raceAt = this.s.startAt + RACE_IN;
      this.s.endAt = 0;
      this.s.gone = {};
      for (const p of this.players()) this.set(p.ws, { n: 0, time: null, misses: 0, inRound: true });
      await this.save();
      await this.ctx.storage.setAlarm(this.s.startAt + CAP);
      return this.all(this.state());
    }
    if (this.s.phase !== "race" || !me.inRound) return;
    if (m.t === "placed") {
      this.set(ws, { n: Math.max(0, Math.min(99, m.n | 0)) });
      return this.all({ t: "progress", id: me.id, n: m.n | 0 });
    }
    if (m.t === "done" && me.time == null) {
      // a finish has to add up, as a recorded run does: no faster than half a second per part, plus 3 s per wrong part
      const time = Math.round(+m.time * 10) / 10, misses = m.misses | 0, parts = POOL.find(o => o.id === this.s.objects[this.s.round])?.parts ?? 1;
      // and it comes after this round's race began: a finish from the round before is not this one's
      if (Date.now() < this.s.raceAt + 1000 * Math.max(1, 0.5 * parts)) return;
      if (!(time <= 600 && misses >= 0 && misses <= 500 && time >= Math.max(1, 0.5 * parts) + PENALTY * misses - 0.15)) return;
      this.set(ws, { time, misses });
      if (!this.s.endAt) {
        this.s.endAt = Date.now() + GRACE;
        await this.save();
        await this.ctx.storage.setAlarm(this.s.endAt);
      }
      if (this.allIn()) return this.finish();
      return this.all(this.state());
    }
  }

  async finish() {
    if (this.s.phase !== "race") return;
    // everyone in the round, including players whose connection dropped and did not come back
    const here = this.players().filter(p => p.inRound), ids = new Set(here.map(p => p.id));
    const all = [...here, ...Object.entries(this.s.gone).filter(([id]) => !ids.has(id)).map(([id, g]) => ({ id, ...g }))];
    // a player still building gets the time on the clock when the round closed plus a penalty, and never less than
    // the slowest finisher plus that penalty: not finishing always ranks below finishing
    const slowest = Math.max(0, ...all.filter(p => p.time != null).map(p => p.time));
    const late = Math.round((Math.max((Date.now() - this.s.raceAt) / 1000, slowest) + LATE) * 10) / 10, times = {};
    for (const p of all) times[p.id] = { name: p.name, time: p.time ?? late, misses: p.misses || 0, dnf: p.time == null };
    this.s.gone = {};
    const object = this.s.objects[this.s.round];
    this.s.results.push({ object, times });
    this.s.played = [...this.s.played.filter(id => id !== object), object];
    this.s.phase = this.s.round >= this.s.objects.length - 1 ? "final" : "results";
    // the next match's objects are chosen now, so every screen can load them during the final standings
    if (this.s.phase === "final") this.s.next = pick(this.s.played);
    await this.ctx.storage.deleteAlarm();
    await this.save();
    this.all(this.state());
  }

  async alarm() { await this.finish(); }

  async webSocketClose(ws) {
    try { ws.close(1000, "Bye"); } catch {}
    const left = this.players(), me = ws.deserializeAttachment() || {};
    // a racer whose connection dropped (not one replaced by their own reload) keeps their place for a reconnect
    if (this.s.phase === "race" && me.id && me.inRound && !left.some(p => p.id === me.id)) this.s.gone[me.id] = { name: me.name, n: me.n, time: me.time, misses: me.misses };
    if (!left.some(p => p.id === this.s.host)) this.s.host = left[0]?.id ?? null;
    await this.save();
    if (this.s.phase === "race" && left.some(p => p.inRound) && this.allIn()) return this.finish();
    this.all(this.state());
  }
}

// Objects this room has not played yet, in random order, then the ones it played longest ago (played is oldest first).
function pick(played) {
  const ids = POOL.map(o => o.id), fresh = ids.filter(id => !played.includes(id));
  for (let i = fresh.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [fresh[i], fresh[j]] = [fresh[j], fresh[i]]; }
  return [...fresh, ...played.filter(id => ids.includes(id))].slice(0, PER_MATCH);
}
