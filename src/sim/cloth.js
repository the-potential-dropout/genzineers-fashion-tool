// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Cloth builder + solver backend.
 *
 * Mesh strategy (chosen for speed):
 *  - each pattern panel is meshed once on a regular grid clipped to its outline
 *    -> implicit neighbours, cache-friendly, no remeshing at runtime
 *  - all particles of all panels live in ONE set of flat Float32Arrays
 *    (structure-of-arrays) allocated inside WASM memory
 *  - Rust steps the solver and writes vertex normals in place; three.js
 *    geometries are sub-views of that same memory -> zero per-frame copies
 *  - when the garment settles, the solver sleeps (zero idle CPU/GPU)
 *
 * If WebAssembly is unavailable a JS implementation of the same step runs.
 */
import { resolveFabric } from '../core/fabrics.js';
import { resolveStitch } from '../core/stitches.js';
import { buildAvatar, packColliders } from './avatar.js';
import { INSULATION } from '../core/materials.js';
import { bodyFor } from '../core/sizes.js';

let wasm = null; // { exports, memory }

export async function initSolver(url) {
  try {
    const res = await fetch(url);
    const bytes = await res.arrayBuffer();
    const { instance } = await WebAssembly.instantiate(bytes, {});
    wasm = { x: instance.exports, memory: instance.exports.memory };
    return 'wasm';
  } catch (e) {
    console.warn('[atelier] WASM solver unavailable, using JS fallback:', e);
    wasm = null;
    return 'js';
  }
}

export function solverKind() {
  return wasm ? 'rust/wasm' : 'js';
}

function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Panel-local cm -> world metres using the panel placement.
 * placement.wrap (m) bends the flat panel around a vertical cylinder of that
 * radius before sewing, like the "arrangement" step in garment CAD. Wrapping
 * stops at wrapMax radians and continues straight (tangent) beyond that, so
 * e.g. sleeves still point outwards.
 */
export function panelToWorld(panel, x, y) {
  const pl = panel.placement;
  if (pl.arm) {
    // Sleeve: local x runs down the arm from the armhole, local y wraps
    // around the arm (y=0 on top, +y towards the front).
    const sd = pl.arm; // +1 right arm, -1 left arm
    const R = pl.radius || 0.065;
    const [sx, sy, sz] = pl.position || [0.2 * sd, 1.38, 0];
    const t = y / 100 / R;
    return [sx + sd * (x / 100), sy + R * Math.cos(t), sz + R * Math.sin(t)];
  }
  const { position: [px, py, pz], rotationY: r = 0, rotationX: rx = 0, wrap = 0, wrapMax = 1.2, wrapTop, wrapTopY } = pl;
  let lx = x / 100;
  let ly = y / 100;
  let lz = 0;
  if (rx) {
    // tilt the panel (e.g. horizontal hat brims)
    const nz = ly * Math.sin(rx);
    ly *= Math.cos(rx);
    lz = nz;
  }
  if (wrap > 0) {
    // cylinder (or cone when wrapTop is set) centred `wrapRef` behind the panel origin
    const ref = wrapTop ?? wrap;
    const Ry = wrapTop != null && wrapTopY ? wrap + (wrapTop - wrap) * Math.max(0, Math.min(1, y / wrapTopY)) : wrap;
    const a = lx / Ry;
    const ac = Math.max(-wrapMax, Math.min(wrapMax, a));
    const extra = (a - ac) * Ry; // length beyond the wrapped part
    const nx = Ry * Math.sin(ac) + extra * Math.cos(ac);
    lz += Ry * Math.cos(ac) - ref - Math.abs(extra) * Math.sin(Math.abs(ac));
    lx = nx;
  }
  const c = Math.cos(r);
  const sn = Math.sin(r);
  return [px + lx * c + lz * sn, py + ly, pz - lx * sn + lz * c];
}

const perSub = (k, sub) => 1 - Math.pow(1 - Math.min(0.999, Math.max(0, k)), 1 / sub);

/**
 * Build a simulation from a project.
 * Returns an object with step(), arrays, per-panel ranges, seam polylines, trims.
 */
export function buildCloth(project) {
  const h = project.sim.gridSize; // cm
  const substeps = project.sim.iterations;
  const P = []; // world positions (flat)
  const UV = [];
  const local = []; // panel-local cm (flat)
  const inv = [];
  const fric = [];
  const C = []; // constraint pairs
  const R = []; // rest lengths
  const K = []; // stiffness per substep
  const L = []; // max strain per constraint (strain limiting)
  const panels = [];
  let dampSum = 0;

  for (const panel of project.panels) {
    let fab = resolveFabric(project, panel.fabric, panel.fabricOverrides);
    if (panel.insulation) {
      // insulated panels: heavier, stiffer, thicker (loft); quilting look
      const fill = INSULATION[panel.insulation.fill];
      const w = panel.insulation.weight || 120;
      const loftMm = (fill?.loft || 1.5) * w / 10;
      fab = { ...fab, weightGsm: fab.weightGsm * 2 + w, bend: Math.min(0.9, fab.bend + 0.12 + w / 2000), thicknessMm: fab.thicknessMm + loftMm, look: { ...fab.look, fx: panel.insulation.quilting === 'none' ? fab.look.fx : 'quilted' } };
    }
    const xs = panel.points.map((q) => q[0]);
    const ys = panel.points.map((q) => q[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const nx = Math.ceil((Math.max(...xs) - minX) / h) + 1;
    const ny = Math.ceil((Math.max(...ys) - minY) / h) + 1;
    const grid = new Int32Array((nx + 1) * (ny + 1)).fill(-1);
    const gi = (i, j) => j * (nx + 1) + i;
    const offset = P.length / 3;
    const tris = [];
    const mass = (fab.weightGsm / 1000) * (h / 100) ** 2;
    const vert = (i, j) => {
      const k = gi(i, j);
      if (grid[k] < 0) {
        const x = minX + i * h;
        const y = minY + j * h;
        grid[k] = P.length / 3;
        P.push(...panelToWorld(panel, x, y));
        local.push(x, y);
        UV.push(x / 10, y / 10);
        inv.push(1 / mass);
        fric.push(Math.min(0.95, fab.friction * 0.6));
      }
      return grid[k];
    };
    const cells = new Uint8Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (!pointInPoly(minX + (i + 0.5) * h, minY + (j + 0.5) * h, panel.points)) continue;
        cells[j * nx + i] = 1;
        const a = vert(i, j);
        const b = vert(i + 1, j);
        const c = vert(i + 1, j + 1);
        const d = vert(i, j + 1);
        tris.push(a - offset, b - offset, c - offset, a - offset, c - offset, d - offset);
      }
    }
    const count = P.length / 3 - offset;
    if (!count) { panels.push({ id: panel.id, offset, count: 0, tris: new Uint32Array(0), fab }); continue; }

    // Per-substep stiffness. With small-step PBD, stretch must stay near 1 or
    // long panels sag like rubber; stretchy knits get a lower value.
    const kS = 0.55 + 0.45 * fab.stretch;
    const kSh = 0.15 + 0.6 * fab.shear;
    const kB = 0.004 + 0.35 * Math.pow(fab.bend, 1.5);
    // Max stretch before hard limiting: ~5% for rigid wovens, ~60% for spandex.
    const lim = 0.04 + 0.6 * (1 - fab.stretch) ** 1.5;
    const cStart = R.length;
    const add = (p, q, k) => {
      if (p < 0 || q < 0) return;
      const dx = P[q * 3] - P[p * 3];
      const dy = P[q * 3 + 1] - P[p * 3 + 1];
      const dz = P[q * 3 + 2] - P[p * 3 + 2];
      C.push(p, q);
      R.push(Math.hypot(dx, dy, dz));
      K.push(k);
      L.push(lim);
    };
    const at = (i, j) => (i < 0 || j < 0 || i > nx || j > ny ? -1 : grid[gi(i, j)]);
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const p = at(i, j);
        if (p < 0) continue;
        // structural (only along existing cell edges)
        const cellA = j < ny && i < nx && cells[j * nx + i];
        const cellBelow = j > 0 && i < nx && cells[(j - 1) * nx + i];
        const cellLeft = i > 0 && j < ny && cells[j * nx + i - 1];
        if (cellA || cellBelow) add(p, at(i + 1, j), kS);
        if (cellA || cellLeft) add(p, at(i, j + 1), kS);
        if (cellA) { add(p, at(i + 1, j + 1), kSh); add(at(i + 1, j), at(i, j + 1), kSh); }
        // bending (skip-one)
        if (at(i + 1, j) >= 0) add(p, at(i + 2, j), kB);
        if (at(i, j + 1) >= 0) add(p, at(i, j + 2), kB);
      }
    }
    // Long-range tethers along rows and columns: tension-only (k = 0, they act
    // only past the strain limit), rest = true flat-pattern length. They stop
    // heavy garments and waistbands from stretching over the body in one pass.
    const tether = (p, q, steps) => {
      if (p < 0 || q < 0) return;
      C.push(p, q);
      R.push((steps * h) / 100);
      K.push(0);
      L.push(lim * 0.8);
    };
    const runOk = (i, j, di, dj, s) => { for (let k = 1; k <= s; k++) if (at(i + di * k, j + dj * k) < 0) return false; return true; };
    for (let j = 0; j <= ny; j++) {
      for (let i = 0; i <= nx; i++) {
        const p = at(i, j);
        if (p < 0 || (i + j) % 2) continue;
        for (const s of i % 6 === 0 ? [6, 18] : [6]) if (runOk(i, j, 1, 0, s)) tether(p, at(i + s, j), s);
        for (const s of j % 6 === 0 ? [6, 18] : [6]) if (runOk(i, j, 0, 1, s)) tether(p, at(i, j + s), s);
      }
    }
    // Gathering (elastic waists, rib cuffs, drawcords): shorten horizontal
    // rest lengths inside a band of the pattern.
    for (const g of panel.gather || []) {
      for (let e = cStart; e < R.length; e++) {
        const a = C[e * 2]; const b = C[e * 2 + 1];
        const ya = local[a * 2 + 1]; const yb = local[b * 2 + 1];
        if (ya >= g.y0 && ya <= g.y1 && yb >= g.y0 && yb <= g.y1 && Math.abs(ya - yb) < h * 0.5) R[e] *= g.ratio;
      }
    }
    dampSum += fab.damping * count;
    panels.push({ id: panel.id, offset, count, tris: new Uint32Array(tris), fab, panel, grid, minX, minY, nx, ny, h });
  }

  const n = P.length / 3;

  // ---- seams ----
  const S = [];
  const SR = [];
  const SK = [];
  const seamLines = [];
  const nearest = (pan, x, y) => {
    let best = -1;
    let bd = Infinity;
    for (let p = pan.offset; p < pan.offset + pan.count; p++) {
      const dx = local[p * 2] - x;
      const dy = local[p * 2 + 1] - y;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };
  for (const seam of project.seams) {
    const pa = panels.find((x) => x.id === seam.a.panel);
    const pb = panels.find((x) => x.id === seam.b.panel);
    if (!pa?.count || !pb?.count) continue;
    const ea = edgePath(pa.panel, seam.a.edge, seam.a.to ?? seam.a.edge);
    const eb = edgePath(pb.panel, seam.b.edge, seam.b.to ?? seam.b.edge);
    const wa0 = panelToWorld(pa.panel, ...ea[0]);
    const wa1 = panelToWorld(pa.panel, ...ea[ea.length - 1]);
    const wb0 = panelToWorld(pb.panel, ...eb[0]);
    const wb1 = panelToWorld(pb.panel, ...eb[eb.length - 1]);
    const dist = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1], u[2] - v[2]);
    const reverse = seam.reverse ?? (dist(wa0, wb1) + dist(wa1, wb0) < dist(wa0, wb0) + dist(wa1, wb1));
    const samples = Math.max(2, Math.round(Math.max(pathLen(ea), pathLen(eb)) / h) + 1);
    const st = resolveStitch(seam.stitch);
    const k = perSub(0.5 + 0.5 * st.strength, substeps);
    const seen = new Set();
    const line = [];
    for (let s = 0; s < samples; s++) {
      const t = s / (samples - 1);
      const tb = reverse ? 1 - t : t;
      const ia = nearest(pa, ...pathAt(ea, t));
      const ib = nearest(pb, ...pathAt(eb, tb));
      if (ia === ib) continue;
      const key = ia * 1e6 + ib;
      if (seen.has(key)) continue;
      seen.add(key);
      S.push(ia, ib);
      SR.push(Math.hypot(P[ib * 3] - P[ia * 3], P[ib * 3 + 1] - P[ia * 3 + 1], P[ib * 3 + 2] - P[ia * 3 + 2]));
      SK.push(k);
      if (line[line.length - 1] !== ia) line.push(ia);
    }
    seamLines.push({ id: seam.id, stitch: seam.stitch, threadColor: seam.threadColor, particles: line });
  }

  // ---- tacks: waistbands / hat bands held in place once sewing completes ----
  const tack = [];
  for (const pan of panels) {
    const t = pan.panel?.tack;
    if (!t) continue;
    for (let q = pan.offset; q < pan.offset + pan.count; q++) { const y = local[q * 2 + 1]; if (y >= t.y0 && y <= t.y1) tack.push(q); }
  }

  // ---- pins (fixed points, e.g. tie knot) and rigid parts (stiffened brims) ----
  for (const pan of panels) {
    if (pan.panel?.rigid) for (let q = pan.offset; q < pan.offset + pan.count; q++) inv[q] = 0;
    for (const pin of pan.panel?.pins || []) inv[nearest(pan, pin[0], pin[1])] = 0;
  }

  // ---- trims attach to nearest particle ----
  const trims = [];
  for (const t of project.trims) {
    const pan = panels.find((x) => x.id === t.panel);
    if (!pan?.count) continue;
    trims.push({ ...t, particle: nearest(pan, t.at[0], t.at[1]), facing: pan.panel.placement.rotationY || 0 });
  }

  // ---- global triangle index (for normals) ----
  const triTotal = panels.reduce((s, p) => s + p.tris.length, 0);
  const allTris = new Uint32Array(triTotal);
  let o = 0;
  for (const pan of panels) {
    for (let i = 0; i < pan.tris.length; i++) allTris[o + i] = pan.tris[i] + pan.offset;
    pan.triStart = o;
    o += pan.tris.length;
  }

  const body = project.display?.avatar === false ? [] : buildAvatar(bodyFor(project));
  const colliders = packColliders([...body, ...(project.colliders || [])]);
  const damping = n ? Math.min(0.2, (dampSum / n) / Math.sqrt(substeps)) : 0.02;
  const sim = makeBackend({
    n, P, inv, fric, C, R, K, L, S, tack, SR, SK, colliders, allTris,
    substeps, gravity: project.sim.gravity, damping,
    sewRate: project.sim.sewSpeed,
    thickness: 0.006,
  });
  sim.panels = panels;
  sim.uv = new Float32Array(UV);
  sim.local = new Float32Array(local);
  sim.seamLines = seamLines;
  sim.trims = trims;
  sim.stats = { particles: n, constraints: R.length, seams: SR.length, triangles: triTotal / 3 };
  return sim;
}

/** Polyline for edge range e..to (inclusive, wraps around the outline). */
export function edgePath(panel, e, to = e) {
  const pts = panel.points;
  const n = pts.length;
  const out = [pts[e % n]];
  let i = e;
  for (let guard = 0; guard < n; guard++) {
    out.push(pts[(i + 1) % n]);
    if (i % n === to % n) break;
    i++;
  }
  return out;
}
export function edgeOf(panel, e) { return edgePath(panel, e, e); }

function pathLen(path) {
  let L = 0;
  for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  return L;
}
/** Point at arc-length fraction t (0..1) along a polyline. */
export function pathAt(path, t) {
  const L = pathLen(path) * t;
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const seg = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (acc + seg >= L || i === path.length - 1) {
      const u = seg > 0 ? Math.min(1, (L - acc) / seg) : 0;
      return [path[i - 1][0] + (path[i][0] - path[i - 1][0]) * u, path[i - 1][1] + (path[i][1] - path[i - 1][1]) * u];
    }
    acc += seg;
  }
  return path[path.length - 1];
}

function makeBackend(d) {
  const { n } = d;
  const m = d.R.length;
  const s = d.SR.length;
  const c = d.colliders.length / 8;
  const t = d.allTris.length / 3;
  const allocs = [];
  let views;

  // Sew first, then drape: gravity fades in once ~95% of stitch pairs have
  // actually closed (measured gap, not target), or after 3 s at the latest.
  let simTime = 0;
  let sewn = s === 0;
  const gravityNow = (pos, si, dt, invView) => {
    simTime += dt;
    if (!sewn) {
      let open = 0;
      for (let e = 0; e < s; e++) {
        const a = si[e * 2] * 3;
        const b = si[e * 2 + 1] * 3;
        const dx = pos[a] - pos[b]; const dy = pos[a + 1] - pos[b + 1]; const dz = pos[a + 2] - pos[b + 2];
        if (dx * dx + dy * dy + dz * dz > 0.0004) open++;
      }
      if (open <= s * 0.05 || simTime > 3) {
        sewn = true; simTime = 0;
        for (const q of d.tack || []) invView[q] = 0; // waistband / hat band now holds
      }
      return 0;
    }
    return d.gravity * Math.min(1, simTime / 0.5);
  };

  if (wasm) {
    const x = wasm.x;
    const F = (len) => { const p = x.alloc_f32(len); allocs.push(['f', p, len]); return p; };
    const U = (len) => { const p = x.alloc_u32(len); allocs.push(['u', p, len]); return p; };
    const ptr = {
      pos: F(n * 3), prev: F(n * 3), inv: F(n), fric: F(n), nor: F(n * 3),
      ci: U(m * 2), rest: F(m), kc: F(m), lim: F(m), si: U(s * 2), srest: F(s), sk: F(s),
      col: F(c * 8), tri: U(t * 3),
    };
    // views are created after ALL allocations (memory growth detaches old views)
    const buf = wasm.memory.buffer;
    const f32 = (p, len) => new Float32Array(buf, p, len);
    const u32 = (p, len) => new Uint32Array(buf, p, len);
    views = {
      pos: f32(ptr.pos, n * 3), prev: f32(ptr.prev, n * 3), inv: f32(ptr.inv, n), fric: f32(ptr.fric, n),
      nor: f32(ptr.nor, n * 3), ci: u32(ptr.ci, m * 2), rest: f32(ptr.rest, m), kc: f32(ptr.kc, m), lim: f32(ptr.lim, m),
      si: u32(ptr.si, s * 2), srest: f32(ptr.srest, s), sk: f32(ptr.sk, s), col: f32(ptr.col, c * 8), tri: u32(ptr.tri, t * 3),
    };
    fill(views, d);
    return {
      ...views,
      kind: 'rust/wasm',
      step(dt) {
        const mv = x.step(n, ptr.pos, ptr.prev, ptr.inv, ptr.fric, m, ptr.ci, ptr.rest, ptr.kc, ptr.lim, s, ptr.si, ptr.srest, ptr.sk,
          c, ptr.col, d.substeps, dt, gravityNow(views.pos, views.si, dt, views.inv), d.damping, d.sewRate, 0.0015, d.thickness, 0.25);
        if (!(mv < 2)) { views.pos.set(d.P); views.prev.set(d.P); views.srest.set(d.SR); views.inv.set(d.inv); sewn = false; simTime = 0; d.diverged = true; }
        x.normals(n, ptr.pos, t, ptr.tri, ptr.nor);
        return mv;
      },
      computeNormals() { x.normals(n, ptr.pos, t, ptr.tri, ptr.nor); },
      settled: () => sewn,
      dispose() {
        for (const [k, p, len] of allocs) (k === 'f' ? x.free_f32 : x.free_u32)(p, len);
        allocs.length = 0;
      },
    };
  }

  views = {
    pos: new Float32Array(n * 3), prev: new Float32Array(n * 3), inv: new Float32Array(n), fric: new Float32Array(n),
    nor: new Float32Array(n * 3), ci: new Uint32Array(m * 2), rest: new Float32Array(m), kc: new Float32Array(m), lim: new Float32Array(m),
    si: new Uint32Array(s * 2), srest: new Float32Array(s), sk: new Float32Array(s), col: new Float32Array(c * 8), tri: new Uint32Array(t * 3),
  };
  fill(views, d);
  const v = views;
  return {
    ...views,
    kind: 'js',
    step(dt) {
      const mv = jsStep(v, n, m, s, c, d.substeps, dt, gravityNow(v.pos, v.si, dt, v.inv), d.damping, d.sewRate, 0.0015, d.thickness, 0.25);
      if (!(mv < 2)) { v.pos.set(d.P); v.prev.set(d.P); v.srest.set(d.SR); v.inv.set(d.inv); sewn = false; simTime = 0; d.diverged = true; }
      jsNormals(v, n, t);
      return mv;
    },
    computeNormals() { jsNormals(v, n, t); },
    settled: () => sewn,
    dispose() {},
  };
}

function fill(v, d) {
  v.pos.set(d.P);
  v.prev.set(d.P);
  v.inv.set(d.inv);
  v.fric.set(d.fric);
  v.ci.set(d.C);
  v.rest.set(d.R);
  v.kc.set(d.K);
  v.lim.set(d.L);
  v.si.set(d.S);
  v.srest.set(d.SR);
  v.sk.set(d.SK);
  v.col.set(d.colliders);
  v.tri.set(d.allTris);
}

// ---------- JS fallback (mirrors sim-core/src/lib.rs) ----------
function dist(pos, inv, i, j, rest, k, compress, limit) {
  const wi = inv[i];
  const wj = inv[j];
  const w = wi + wj;
  if (w <= 0) return;
  const i3 = i * 3;
  const j3 = j * 3;
  const dx = pos[j3] - pos[i3];
  const dy = pos[j3 + 1] - pos[i3 + 1];
  const dz = pos[j3 + 2] - pos[i3 + 2];
  const d2 = dx * dx + dy * dy + dz * dz;
  if (d2 < 1e-14) return;
  const dd = Math.sqrt(d2);
  const cc = dd - rest;
  let corr;
  if (cc < 0) corr = k * compress * cc;
  else { const hard = cc - rest * limit; corr = hard > k * cc ? hard : k * cc; }
  const sc = corr / (dd * w);
  pos[i3] += dx * sc * wi; pos[i3 + 1] += dy * sc * wi; pos[i3 + 2] += dz * sc * wi;
  pos[j3] -= dx * sc * wj; pos[j3 + 1] -= dy * sc * wj; pos[j3 + 2] -= dz * sc * wj;
}

function jsStep(v, n, m, s, c, substeps, dt, gravity, damping, sewRate, sewMin, thick, compress) {
  const { pos, prev, inv, fric, ci, rest, kc, lim, si, srest, sk, col } = v;
  const h = dt / substeps;
  const g = -gravity * h * h;
  const keep = 1 - damping;
  let maxMove = 0;
  for (let e = 0; e < s; e++) srest[e] = Math.max(sewMin, srest[e] * sewRate);
  for (let sub = 0; sub < substeps; sub++) {
    for (let p = 0; p < n; p++) {
      if (inv[p] === 0) continue;
      const b = p * 3;
      for (let a = 0; a < 3; a++) {
        const vel = (pos[b + a] - prev[b + a]) * keep;
        prev[b + a] = pos[b + a];
        pos[b + a] += vel;
      }
      pos[b + 1] += g;
    }
    for (let p = 0; p < n; p++) {
      if (inv[p] === 0) continue;
      const b = p * 3;
      let x = pos[b]; let y = pos[b + 1]; let z = pos[b + 2];
      let hit = false;
      for (let k = 0; k < c; k++) {
        const o = k * 8;
        const zs = col[o + 7];
        const ax = col[o]; const ay = col[o + 1]; const az = col[o + 2] / zs;
        const ex = col[o + 3] - ax; const ey = col[o + 4] - ay; const ez = col[o + 5] / zs - az;
        const r = col[o + 6] + thick;
        const qz = z / zs;
        const ee = ex * ex + ey * ey + ez * ez;
        let t = ee > 0 ? ((x - ax) * ex + (y - ay) * ey + (qz - az) * ez) / ee : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = ax + ex * t; const cy = ay + ey * t; const cz = az + ez * t;
        const dx = x - cx; const dy = y - cy; const dz = qz - cz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < r * r && d2 > 1e-12) {
          const f = r / Math.sqrt(d2);
          x = cx + dx * f; y = cy + dy * f; z = (cz + dz * f) * zs;
          hit = true;
        }
      }
      if (y < thick) { y = thick; hit = true; }
      if (hit) {
        const ox = pos[b]; const oy = pos[b + 1]; const oz = pos[b + 2];
        const px = x - ox; const py = y - oy; const pz = z - oz;
        const pl = Math.sqrt(px * px + py * py + pz * pz);
        let vx = ox - prev[b]; let vy = oy - prev[b + 1]; let vz = oz - prev[b + 2];
        if (pl > 1e-9) {
          const nx = px / pl; const ny = py / pl; const nz = pz / pl;
          const vn = vx * nx + vy * ny + vz * nz;
          if (vn < 0) { vx -= nx * vn; vy -= ny * vn; vz -= nz * vn; }
        }
        const keepT = 1 - fric[p];
        pos[b] = x; pos[b + 1] = y; pos[b + 2] = z;
        prev[b] = x - vx * keepT; prev[b + 1] = y - vy * keepT; prev[b + 2] = z - vz * keepT;
      }
    }
    for (let e = 0; e < m; e++) dist(pos, inv, ci[e * 2], ci[e * 2 + 1], rest[e], kc[e], compress, lim[e]);
    for (let e = m - 1; e >= 0; e--) dist(pos, inv, ci[e * 2], ci[e * 2 + 1], rest[e], kc[e], compress, lim[e]);
    for (let e = 0; e < s; e++) dist(pos, inv, si[e * 2], si[e * 2 + 1], srest[e], sk[e], 1, 1e9);
    if (sub === substeps - 1) {
      for (let p = 0; p < n * 3; p += 3) {
        const dx = pos[p] - prev[p]; const dy = pos[p + 1] - prev[p + 1]; const dz = pos[p + 2] - prev[p + 2];
        const dd = dx * dx + dy * dy + dz * dz;
        if (dd > maxMove) maxMove = dd;
      }
    }
  }
  return Math.sqrt(maxMove);
}

function jsNormals(v, n, t) {
  const { pos, tri, nor } = v;
  nor.fill(0);
  for (let f = 0; f < t; f++) {
    const a = tri[f * 3] * 3; const b = tri[f * 3 + 1] * 3; const c = tri[f * 3 + 2] * 3;
    const e1x = pos[b] - pos[a]; const e1y = pos[b + 1] - pos[a + 1]; const e1z = pos[b + 2] - pos[a + 2];
    const e2x = pos[c] - pos[a]; const e2y = pos[c + 1] - pos[a + 1]; const e2z = pos[c + 2] - pos[a + 2];
    const nx = e1y * e2z - e1z * e2y; const ny = e1z * e2x - e1x * e2z; const nz = e1x * e2y - e1y * e2x;
    nor[a] += nx; nor[a + 1] += ny; nor[a + 2] += nz;
    nor[b] += nx; nor[b + 1] += ny; nor[b + 2] += nz;
    nor[c] += nx; nor[c + 1] += ny; nor[c + 2] += nz;
  }
  for (let p = 0; p < n * 3; p += 3) {
    const l = Math.hypot(nor[p], nor[p + 1], nor[p + 2]);
    if (l > 0) { nor[p] /= l; nor[p + 1] /= l; nor[p + 2] /= l; }
  }
}

/**
 * World position (and particle anchors) for a panel-local point (cm), by
 * bilinear interpolation of the 4 grid particles around it. Falls back to
 * the nearest existing corner near the outline.
 */
export function panelAnchor(sim, panelId, x, y) {
  const pan = sim.panels.find((p) => p.id === panelId);
  if (!pan || !pan.count) return null;
  const fx = (x - pan.minX) / pan.h; const fy = (y - pan.minY) / pan.h;
  const i = Math.max(0, Math.min(pan.nx - 1, Math.floor(fx))); const j = Math.max(0, Math.min(pan.ny - 1, Math.floor(fy)));
  const u = Math.max(0, Math.min(1, fx - i)); const v = Math.max(0, Math.min(1, fy - j));
  const g = (a, b) => pan.grid[b * (pan.nx + 1) + a];
  const ids = [g(i, j), g(i + 1, j), g(i + 1, j + 1), g(i, j + 1)];
  const w = [(1 - u) * (1 - v), u * (1 - v), u * v, (1 - u) * v];
  const ok = ids.map((q) => q >= 0);
  if (!ok.some(Boolean)) {
    // nearest particle of the panel
    let best = pan.offset; let bd = Infinity;
    for (let q = pan.offset; q < pan.offset + pan.count; q++) { const d = (sim.local[q * 2] - x) ** 2 + (sim.local[q * 2 + 1] - y) ** 2; if (d < bd) { bd = d; best = q; } }
    return { ids: [best], w: [1] };
  }
  const tw = w.reduce((s2, wi, k) => s2 + (ok[k] ? wi : 0), 0) || 1;
  return { ids: ids.filter((_, k) => ok[k]), w: w.filter((_, k) => ok[k]).map((wi) => wi / tw) };
}
