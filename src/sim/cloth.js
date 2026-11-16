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
import { resolveFabric, fabricPhysics } from '../core/fabrics.js';
import { resolveStitch } from '../core/stitches.js';
import { buildAvatar, packColliders, binColliders } from './avatar.js';
import { INSULATION } from '../core/materials.js';
import { bodyFor } from '../core/sizes.js';
import { meshPanel, pointInPoly } from './mesh.js';
import { bodyField, sampleField, loadBodyMesh } from './bodyfield.js';
export { loadBodyMesh };
export { pointInPoly };

let wasm = null; // { exports, memory }
let wasmField = null; // { field, ptr }: body distance field currently held in WASM memory

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
    // the arm hangs at pl.angle from vertical (90 = T-pose): axis (sin, -cos), "up" (cos, sin)
    const an = ((pl.angle ?? 90) * Math.PI) / 180;
    const ax = Math.sin(an); const ay = -Math.cos(an);
    const d = x / 100; const up = R * Math.cos(t);
    return [sx + sd * (d * ax - up * ay), sy + d * ay + up * ax, sz + R * Math.sin(t)];
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
  // a leg panel leans with the leg: shifted sideways by lean.dx at the hem, fading to nothing at lean.y1 (cm up the panel)
  const lean = pl.lean ? pl.lean.dx * Math.max(0, 1 - y / pl.lean.y1) : 0;
  return [px + lx * c + lz * sn + lean, py + ly, pz - lx * sn + lz * c];
}

const perSub = (k, sub) => 1 - Math.pow(1 - Math.min(0.999, Math.max(0, k)), 1 / sub);

/**
 * Build a simulation from a project.
 * Returns an object with step(), arrays, per-panel ranges, seam polylines, trims.
 */
export function buildCloth(project) {
  const h = project.sim.gridSize; // cm
  const substeps = project.sim.iterations;
  const scale = Math.max(0.05, project.scale || 1);
  const P = []; // world positions (flat)
  const UV = [];
  const local = []; // panel-local cm (flat)
  const inv = [];
  const fric = [];
  const gar = []; // garment of each particle
  const thk = []; // per-particle collision margin: outer garment layers rest over inner ones
  const rankMargin = []; // the blanket extra clearance of an outer layer, only used without the body field
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
    // seam end points must stay mesh vertices so matching seams pair up cleanly
    const keep = new Set();
    for (const sm of project.seams) for (const side of [sm.a, sm.b]) if (side.panel === panel.id) { keep.add(side.edge % panel.points.length); keep.add(((side.to ?? side.edge) + 1) % panel.points.length); }
    const mesh = meshPanel(panel.points, h, keep);
    const offset = P.length / 3;
    const count = mesh.xy.length / 2;
    const tris = mesh.tris;
    if (!count || !tris.length) { panels.push({ id: panel.id, offset, count: 0, tris: new Uint32Array(0), fab }); continue; }
    // lumped mass: a third of each adjacent triangle
    const area = new Float64Array(count);
    for (let k = 0; k < tris.length; k += 3) {
      const [i0, i1, i2] = [tris[k], tris[k + 1], tris[k + 2]];
      const ar = Math.abs((mesh.xy[i1 * 2] - mesh.xy[i0 * 2]) * (mesh.xy[i2 * 2 + 1] - mesh.xy[i0 * 2 + 1]) - (mesh.xy[i2 * 2] - mesh.xy[i0 * 2]) * (mesh.xy[i1 * 2 + 1] - mesh.xy[i0 * 2 + 1])) / 2;
      area[i0] += ar / 3; area[i1] += ar / 3; area[i2] += ar / 3;
    }
    const rank = layerRank(project, panel);
    for (let q = 0; q < count; q++) {
      const x = mesh.xy[q * 2]; const y = mesh.xy[q * 2 + 1];
      P.push(...panelToWorld(panel, x, y));
      local.push(x, y);
      UV.push(x / 10, y / 10);
      inv.push(1 / ((fab.weightGsm / 1000) * (Math.max(area[q], h * h * 0.4) / 1e4)));
      fric.push(Math.min(0.95, fab.mech ? fab.mech.mu * 1.1 : fab.friction * 0.6));
      // collision margin: skin clearance + half the cloth thickness (thick coatings and leathers stand further off)
      thk.push(0.0045 + Math.min(0.02, ((fab.thicknessMm || 0.5) / 1000) / scale) + rank * 0.009 + (panel.zBias ? 0.0035 : 0)); rankMargin.push(rank * 0.009);
      gar.push(panel.garment);
    }

    // Per-substep stiffness. With small-step PBD, stretch must stay near 1 or
    // long panels sag like rubber; stretchy knits get a lower value.
    const { kS, kSh, lim } = fabricPhysics(fab);
    let { kB } = fabricPhysics(fab);
    // miniature garments: the same cloth is relatively much stiffer and thicker on a small body
    if (scale < 1) kB = Math.min(0.9, kB / Math.pow(scale, 1.5));
    if (panel.insulation) kB = Math.min(0.9, kB + 0.05 + (panel.insulation.weight || 120) / 3000);
    if (panel.lining) kB = Math.min(0.9, kB * 1.3 + 0.01);
    const cStart = R.length;
    const flat = (p, q) => Math.hypot(mesh.xy[p * 2] - mesh.xy[q * 2], mesh.xy[p * 2 + 1] - mesh.xy[q * 2 + 1]) / 100;
    const add = (p, q, k, l = lim) => { C.push(p + offset, q + offset); R.push(flat(p, q)); K.push(k); L.push(l); };
    // edges: along the grain = stretch, on the bias = shear (cloth shears far more easily)
    const edges = new Map();
    for (let k = 0; k < tris.length; k += 3) for (let e = 0; e < 3; e++) {
      const p = tris[k + e]; const q = tris[k + (e + 1) % 3]; const o = tris[k + (e + 2) % 3];
      const key = p < q ? p * 65536 + q : q * 65536 + p;
      const rec = edges.get(key); if (rec) rec.push(o); else edges.set(key, [p, q, o]);
    }
    // Only the diagonals of the interior grain lattice are "bias" (shear) edges. Everything
    // else, including the strip along the cut edges, resists stretch fully.
    const onGrid = new Uint8Array(count); for (const q of mesh.grid.values()) onGrid[q] = 1;
    for (const [p, q, o1, o2] of edges.values()) {
      const dx = Math.abs(mesh.xy[p * 2] - mesh.xy[q * 2]); const dy = Math.abs(mesh.xy[p * 2 + 1] - mesh.xy[q * 2 + 1]);
      const diag = onGrid[p] && onGrid[q] && Math.abs(dx - dy) < 0.05 * h && o2 !== undefined && onGrid[o1] && onGrid[o2];
      add(p, q, diag ? kSh : kS, diag ? lim * 3 : lim);
      if (o2 !== undefined) add(o1, o2, diag ? kSh : kB, diag ? lim * 3 : lim);
    }
    // stay-stitching: cut edges (necklines, armholes, hems) cannot grow
    for (let q = 0; q < mesh.nb; q++) for (const st of [3, 8]) {
      if (mesh.nb < st * 2) continue;
      let len = 0; for (let k = 0; k < st; k++) len += flat((q + k) % mesh.nb, (q + k + 1) % mesh.nb);
      if (flat(q, (q + st) % mesh.nb) > len * 0.97) { C.push(q + offset, ((q + st) % mesh.nb) + offset); R.push(flat(q, (q + st) % mesh.nb)); K.push(0); L.push(Math.min(lim, 0.03)); }
    }
    // Long-range tethers along the grain: tension-only (k = 0, they act only
    // past the strain limit), rest = true flat-pattern length. They stop heavy
    // garments and waistbands from stretching over the body in one pass.
    const at = (i, j) => (i < 0 || j < 0 ? -1 : mesh.grid.get(i + j * 4096) ?? -1);
    const tether = (p, q, steps) => { if (p < 0 || q < 0) return; C.push(p + offset, q + offset); R.push((steps * h) / 100); K.push(0); L.push(lim * 0.8); };
    const runOk = (i, j, di, dj, st) => { for (let k = 1; k <= st; k++) if (at(i + di * k, j + dj * k) < 0) return false; return true; };
    for (let j = 0; j <= mesh.ny; j++) for (let i = 0; i <= mesh.nx; i++) {
      const p = at(i, j);
      if (p < 0 || (i + j) % 2) continue;
      for (const st of i % 6 === 0 ? [6, 18] : [6]) if (runOk(i, j, 1, 0, st)) tether(p, at(i + st, j), st);
      for (const st of j % 6 === 0 ? [6, 18] : [6]) if (runOk(i, j, 0, 1, st)) tether(p, at(i, j + st), st);
    }
    // Gathering (elastic waists, rib cuffs, drawcords): shorten the rest
    // lengths across a band of the pattern.
    for (const g of panel.gather || []) {
      for (let e = cStart; e < R.length; e++) {
        const pa = C[e * 2]; const pb = C[e * 2 + 1];
        const ya = local[pa * 2 + 1]; const yb = local[pb * 2 + 1];
        if (ya >= g.y0 && ya <= g.y1 && yb >= g.y0 && yb <= g.y1) {
          const ddx = Math.abs(local[pa * 2] - local[pb * 2]); const ddy = Math.abs(ya - yb);
          const hor = ddx / (ddx + ddy || 1); // only the widthwise part gathers
          R[e] *= 1 + (g.ratio - 1) * hor;
        }
      }
    }
    for (const g of panel.gatherX || []) {
      for (let e = cStart; e < R.length; e++) {
        const pa = C[e * 2]; const pb = C[e * 2 + 1];
        const xa = local[pa * 2]; const xb = local[pb * 2];
        if (xa >= g.x0 && xa <= g.x1 && xb >= g.x0 && xb <= g.x1) {
          const ddx = Math.abs(xa - xb); const ddy = Math.abs(local[pa * 2 + 1] - local[pb * 2 + 1]);
          R[e] *= 1 + (g.ratio - 1) * (ddy / (ddx + ddy || 1));
        }
      }
    }
    // interfaced bands: a barrel cuff, waistband, collar stand or placket is two layers of cloth with fusible
    // interfacing between them, so it bends and stretches far less than the single layer around it
    {
      const BAND = { cuff: 1, waistband: 1, placket: 1, 'collar-stand': 1, stand: 1, facing: 1 };
      const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i]; const b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1] || 1e-9) + a[0]) c = !c; } return c; };
      const bands = (project.overlays || []).filter((ov) => ov.panel === panel.id && BAND[ov.kind] && (ov.points || []).length >= 3 && !/elastic|rib|knit/.test(ov.style || ''));
      if (bands.length) {
        const kBand = Math.max(kS, 0.92); const bBand = Math.min(0.85, Math.max(kB * 6, 0.35));
        const inBand = (q) => { const x = mesh.xy[q * 2]; const y = mesh.xy[q * 2 + 1]; for (const ov of bands) if (inPoly(ov.points, x, y)) return true; return false; };
        const mark = new Uint8Array(count); for (let q = 0; q < count; q++) mark[q] = inBand(q) ? 1 : 0;
        for (let e = cStart; e < R.length; e++) { const pa = C[e * 2] - offset; const pb = C[e * 2 + 1] - offset; if (!mark[pa] || !mark[pb] || K[e] === 0) continue; K[e] = K[e] >= kS * 0.99 || K[e] === kSh ? Math.max(K[e], kBand) : Math.max(K[e], bBand); L[e] = Math.min(L[e], 0.02); }
      }
    }
    // triangle buckets for fast panel-space lookups (overlays, trims, stitches)
    const cell = Math.max(2 * h, 3);
    const bk = new Map();
    for (let k = 0; k < tris.length; k += 3) {
      const X = [mesh.xy[tris[k] * 2], mesh.xy[tris[k + 1] * 2], mesh.xy[tris[k + 2] * 2]]; const Y = [mesh.xy[tris[k] * 2 + 1], mesh.xy[tris[k + 1] * 2 + 1], mesh.xy[tris[k + 2] * 2 + 1]];
      for (let cx = Math.floor(Math.min(...X) / cell); cx <= Math.floor(Math.max(...X) / cell); cx++) for (let cy = Math.floor(Math.min(...Y) / cell); cy <= Math.floor(Math.max(...Y) / cell); cy++) {
        const key = cx * 8192 + cy; const arr = bk.get(key); if (arr) arr.push(k); else bk.set(key, [k]);
      }
    }
    dampSum += fab.damping * count;
    panels.push({ id: panel.id, offset, count, tris: new Uint32Array(tris), fab, panel, h, nb: mesh.nb, buckets: bk, cell });
  }

  const n = P.length / 3;

  // ---- seams ----
  const S = [];
  const SR = [];
  const SK = [];
  const seamLines = [];
  const nearest = (pan, x, y, boundaryOnly) => {
    let best = -1;
    let bd = Infinity;
    for (let p = pan.offset; p < pan.offset + (boundaryOnly ? pan.nb : pan.count); p++) {
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
    if (seam.ripped) continue; // torn open: the two edges are free
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
    const pairs = [];
    for (let s = 0; s < samples; s++) {
      const t = s / (samples - 1);
      if (seam.open && t < seam.open) continue; // unzipped / unbuttoned part of a closure
      const tb = reverse ? 1 - t : t;
      const ia = nearest(pa, ...pathAt(ea, t), true);
      const ib = nearest(pb, ...pathAt(eb, tb), true);
      if (ia === ib) continue;
      const key = ia * 1e6 + ib;
      if (seen.has(key)) continue;
      seen.add(key);
      S.push(ia, ib);
      SR.push(Math.hypot(P[ib * 3] - P[ia * 3], P[ib * 3 + 1] - P[ia * 3 + 1], P[ib * 3 + 2] - P[ia * 3 + 2]));
      SK.push(k);
      if (line[line.length - 1] !== ia) line.push(ia);
      pairs.push(ia, ib);
    }
    seamLines.push({ id: seam.id, stitch: seam.stitch, threadColor: seam.threadColor, particles: line, pairs, panel: pa.id, closure: seam.closure });
  }

  // ---- fastened overlaps (button stands, double-breasted fronts): stitched through both layers ----
  for (const pa of panels) {
    for (const at of pa.panel?.attach || []) {
      const pb = panels.find((x) => x.id === at.to);
      if (!pa.count || !pb?.count) continue;
      const k = perSub(0.9, substeps);
      for (const [x, y] of at.pts) {
        const ia = nearest(pa, x, y); const ib = nearest(pb, x, y);
        if (ia < 0 || ib < 0) continue;
        S.push(ia, ib);
        SR.push(Math.hypot(P[ib * 3] - P[ia * 3], P[ib * 3 + 1] - P[ia * 3 + 1], P[ib * 3 + 2] - P[ia * 3 + 2]));
        SK.push(k);
      }
    }
  }

  // ---- tacks: waistbands / hat bands held in place once sewing completes ----
  const tack = [];
  const tackNow = []; // pieces that must hold the moment sewing ends (bags on a hook)
  for (const pan of panels) {
    const t = pan.panel?.tack;
    if (!t) continue;
    for (let q = pan.offset; q < pan.offset + pan.count; q++) { const x = local[q * 2]; const y = local[q * 2 + 1]; if (y >= t.y0 && y <= t.y1 && (t.x0 == null || (x >= t.x0 && x <= t.x1))) (t.now ? tackNow : tack).push(q); }
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
    trims.push({ ...t, particle: t.at ? nearest(pan, t.at[0], t.at[1]) : -1, facing: pan.panel.placement.rotationY || 0 });
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

  // Outfits: an inner layer covered by an outer one is held close to the body (just inside the
  // outer layer's margin) so it can never poke through. Costs nothing for a single garment.
  const rankOf = {}; for (const g of project.garments || []) rankOf[g.id] = layerRank(project, { garment: g.id });
  const boxes = {};
  for (let i = 0; i < n; i++) {
    const g = gar[i]; const bx = boxes[g] || (boxes[g] = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]);
    for (let a = 0; a < 3; a++) { bx[a] = Math.min(bx[a], P[i * 3 + a]); bx[a + 3] = Math.max(bx[a + 3], P[i * 3 + a]); }
  }
  const outer = Object.keys(boxes).filter((g) => rankOf[g] > 0);
  for (let i = 0; i < n; i++) {
    const r = rankOf[gar[i]] ?? 0; let out = 0;
    for (const g of outer) {
      if (rankOf[g] <= r) continue;
      const bx = boxes[g]; const e = 0.03;
      if (P[i * 3] > bx[0] - e && P[i * 3] < bx[3] + e && P[i * 3 + 1] > bx[1] - e && P[i * 3 + 1] < bx[4] + e && P[i * 3 + 2] > bx[2] - e && P[i * 3 + 2] < bx[5] + e) { out = thk[i] + 0.004; break; }
    }
    thk.push(out);
  }
  // body collision: distance field of the real mannequin mesh when loaded, capsules otherwise
  const field = project.display?.avatar === false ? null : bodyField(bodyFor(project));
  // with the body field, layers are kept apart cloth to cloth (layerPass below), so an inner garment is never yanked onto the body where it bridges a hollow
  if (field) for (let i = 0; i < n; i++) thk[n + i] = 0;
  // with the body field the outer layer stands off the inner one exactly where they overlap (layerPass), so it needs no
  // blanket extra clearance everywhere else (that jams sleeves in the armpit and lifts cloth off the body where nothing is under it)
  if (field) for (let i = 0; i < n; i++) thk[i] -= rankMargin[i];
  const body = project.display?.avatar === false || field ? [] : buildAvatar(bodyFor(project));
  const colliders = packColliders([...body, ...(project.colliders || [])]);
  const bins = binColliders(colliders);
  const damping = n ? Math.min(0.2, (dampSum / n) / Math.sqrt(substeps)) : 0.02;
  const sim = makeBackend({
    n, P, inv, fric, thk, C, R, K, L, S, tack, tackNow, bins, SR, SK, colliders, allTris, field,
    substeps, gravity: project.sim.gravity, damping,
    sewRate: project.sim.sewSpeed,
    thickness: 0.006,
  });
  sim.panels = panels;
  // ---- garment over garment: wherever two layers meet, the outer one stays outside the inner one ----
  const rankP = new Float32Array(n); let maxRank = 0; for (let i = 0; i < n; i++) { rankP[i] = rankOf[gar[i]] ?? 0; maxRank = Math.max(maxRank, rankP[i]); }
  if (maxRank > 0 && field) {
    const genOf = {}; for (const g of project.garments || []) genOf[g.id] = g.generator;
    const isLow = new Uint8Array(n); let anyLow = false; for (let i = 0; i < n; i++) if (genOf[gar[i]] === 'bottom' || genOf[gar[i]] === 'skirt') { isLow[i] = 1; anyLow = true; }
    const belt = anyLow ? (project.belts || [])[0] : null; const beltW = belt ? belt.width / 1000 : 0; const beltT = belt ? belt.thick / 1000 + 0.004 : 0;
    const TB = 16384; const head = new Int32Array(TB); const next = new Int32Array(n); const sd = new Float32Array(n); const cap = new Float32Array(n); const gx = new Float32Array(n); const gy = new Float32Array(n); const gz = new Float32Array(n); const ok = new Uint8Array(n); const o4 = [0, 0, 0, 0];
    const CELL = 0.02; const key = (ix, iy, iz) => (((ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791)) >>> 0) & (TB - 1);
    const base = sim.step.bind(sim); const base0 = Float32Array.from(thk.slice(0, n));
    sim.layerPass = () => {
      const P = sim.pos; const Q = sim.prev; head.fill(-1);
      const NB = 48; const topB = new Float32Array(NB).fill(-1e9); const binB = (x, z) => ((Math.round((Math.atan2(x, z) / (Math.PI * 2)) * NB) % NB) + NB) % NB;
      if (belt) for (let i = 0; i < n; i++) if (isLow[i]) { const k = binB(P[i * 3], P[i * 3 + 2]); if (P[i * 3 + 1] > topB[k]) topB[k] = P[i * 3 + 1]; }
      const topD = new Float32Array(NB); for (let k = 0; k < NB; k++) { let m = -1e9; for (let d = -3; d <= 3; d++) m = Math.max(m, topB[(k + d + NB) % NB]); topD[k] = m; } const bcAt = (x, z) => topD[binB(x, z)] - Math.max(0.02, beltW / 2 + 0.002); const bh = beltW / 2 + 0.004;
      for (let i = 0; i < n; i++) {
        ok[i] = sampleField(field, P[i * 3], P[i * 3 + 1], P[i * 3 + 2], o4) ? 1 : 0; if (!ok[i]) continue;
        sd[i] = o4[0]; const gl = Math.hypot(o4[1], o4[2], o4[3]) || 1; gx[i] = o4[1] / gl; gy[i] = o4[2] / gl; gz[i] = o4[3] / gl;
        if (belt && isLow[i] && Math.abs(P[i * 3 + 1] - bcAt(P[i * 3], P[i * 3 + 2])) < bh) sd[i] += beltT; // the belt is worn over the trousers here
        cap[i] = 1e9;
        if (rankP[i] < maxRank) { const k = key(Math.floor(P[i * 3] / CELL), Math.floor(P[i * 3 + 1] / CELL), Math.floor(P[i * 3 + 2] / CELL)); next[i] = head[k]; head[k] = i; }
      }
      for (let i = 0; i < n; i++) {
        const r = rankP[i]; if (!r || !ok[i] || sim.inv[i] === 0) continue;
        const px = P[i * 3]; const py = P[i * 3 + 1]; const pz = P[i * 3 + 2]; const ix = Math.floor(px / CELL); const iy = Math.floor(py / CELL); const iz = Math.floor(pz / CELL);
        let need = -1e9;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
          for (let q = head[key(ix + a, iy + b, iz + c)]; q >= 0; q = next[q]) {
            if (rankP[q] >= r) continue;
            const fdot = gx[i] * gx[q] + gy[i] * gy[q] + gz[i] * gz[q]; if (fdot < 0.6) continue; /* the two layers must face the same way: not cloth on the other side of a leg or across the crotch */
            const dx = px - P[q * 3]; const dy = py - P[q * 3 + 1]; const dz = pz - P[q * 3 + 2]; const along = dx * gx[q] + dy * gy[q] + dz * gz[q]; if (along < -0.025) continue;
            const lat2 = dx * dx + dy * dy + dz * dz - along * along; if (lat2 > 0.00026) continue; // within about 1.6 cm sideways
            /* the demand fades smoothly with sideways distance and with how differently the layers face, so a neighbour
               coming into or leaving the search never makes the layer jump */
            const wl = 1 - lat2 / 0.00026; const wf = Math.min(1, (fdot - 0.6) / 0.25); const w = wl * wf;
            const g2 = 0.0028 * Math.min(2, r - rankP[q] + 0.5); const want = sd[q] + g2 * w - (1 - w) * 0.006; if (want > need) need = want; const lim = sd[i] - g2 * w + (1 - w) * 0.006; if (lim < cap[q]) cap[q] = lim;
          }
        }
        /* the gap is handed to the solver as this point's contact distance from the body, enforced in every substep
           (a correction after the step is undone by the cloth springs in the next one: a two-frame flicker) */
        const tgt = Math.min(base0[i] + 0.04, Math.max(base0[i], need)); const T = sim.thk; T[i] += (tgt - T[i]) * 0.35;
      }
    };
    sim.layerPass = ((outerPass) => () => {
      outerPass();
      /* the inner layer, where an outer one lies on it, is held no further from the body than the outer one allows */
      const T = sim.thk;
      for (let q = 0; q < n; q++) { if (rankP[q] >= maxRank) continue; const m = ok[q] && cap[q] < 1e8 ? Math.max(base0[q] + 0.002, cap[q]) : 0; T[n + q] = m && T[n + q] ? T[n + q] + (m - T[n + q]) * 0.35 : m; }
    })(sim.layerPass);
    sim.step = (dt) => { const mv = base(dt); sim.layerPass(); sim.computeNormals?.(); return mv; };
  }
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
  const c = d.colliders.length / 9;
  const t = d.allTris.length / 3;
  const allocs = [];
  let views;

  // Sew first, then drape: gravity fades in once ~95% of stitch pairs have
  // actually closed (measured gap, not target), or after 3 s at the latest.
  let simTime = 0;
  let sewn = s === 0;
  let tacked = false;
  if (sewn) for (const q of [...(d.tack || []), ...(d.tackNow || [])]) d.inv[q] = 0; // nothing to sew: tack immediately
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
      if (open <= s * 0.05 || simTime > 3) { sewn = true; simTime = 0; for (const q of d.tackNow || []) invView[q] = 0; }
      return 0;
    }
    // let the last stitches settle, then the waistband / hat band holds
    if (!tacked && simTime > 0.35) { tacked = true; for (const q of d.tack || []) invView[q] = 0; }
    return d.gravity * Math.min(1, simTime / 0.5);
  };

  if (wasm) {
    const x = wasm.x;
    const F = (len) => { const p = x.alloc_f32(len); allocs.push(['f', p, len]); return p; };
    const U = (len) => { const p = x.alloc_u32(len); allocs.push(['u', p, len]); return p; };
    const ptr = {
      pos: F(n * 3), prev: F(n * 3), inv: F(n), fric: F(n), thk: F(n * 2), nor: F(n * 3),
      ci: U(m * 2), rest: F(m), kc: F(m), lim: F(m), si: U(s * 2), srest: F(s), sk: F(s),
      col: F(c * 9), tri: U(t * 3), bst: U(d.bins.nb + 1), bix: U(d.bins.idx.length),
    };
    // body distance field lives in WASM memory once per body (shared by successive sims)
    let fptr = 0;
    if (d.field) {
      if (wasmField?.field !== d.field) {
        if (wasmField) x.free_f32(wasmField.ptr, wasmField.field.data.length);
        const p = x.alloc_f32(d.field.data.length);
        new Float32Array(wasm.memory.buffer, p, d.field.data.length).set(d.field.data);
        wasmField = { field: d.field, ptr: p };
      }
      fptr = wasmField.ptr;
    }
    const useField = () => { const f = d.field; if (f) x.set_sdf(fptr, f.nx, f.ny, f.nz, f.ox, f.oy, f.oz, f.inv); else x.set_sdf(0, 0, 0, 0, 0, 0, 0, 0); };
    // views are created after ALL allocations (memory growth detaches old views)
    const buf = wasm.memory.buffer;
    const f32 = (p, len) => new Float32Array(buf, p, len);
    const u32 = (p, len) => new Uint32Array(buf, p, len);
    views = {
      pos: f32(ptr.pos, n * 3), prev: f32(ptr.prev, n * 3), inv: f32(ptr.inv, n), fric: f32(ptr.fric, n), thk: f32(ptr.thk, n * 2),
      nor: f32(ptr.nor, n * 3), ci: u32(ptr.ci, m * 2), rest: f32(ptr.rest, m), kc: f32(ptr.kc, m), lim: f32(ptr.lim, m),
      si: u32(ptr.si, s * 2), srest: f32(ptr.srest, s), sk: f32(ptr.sk, s), col: f32(ptr.col, c * 9), tri: u32(ptr.tri, t * 3), bst: u32(ptr.bst, d.bins.nb + 1), bix: u32(ptr.bix, d.bins.idx.length),
    };
    fill(views, d);
    return {
      ...views,
      kind: 'rust/wasm',
      step(dt) {
        useField();
        const mv = x.step(n, ptr.pos, ptr.prev, ptr.inv, ptr.fric, m, ptr.ci, ptr.rest, ptr.kc, ptr.lim, s, ptr.si, ptr.srest, ptr.sk,
          c, ptr.col, d.bins.nb, ptr.bst, ptr.bix, d.bins.y0, d.bins.inv, d.substeps, dt, gravityNow(views.pos, views.si, dt, views.inv), d.damping, d.sewRate, 0.0015, ptr.thk, 0.25);
        if (!(mv < 2)) { views.pos.set(d.P); views.prev.set(d.P); views.srest.set(d.SR); views.inv.set(d.inv); sewn = false; tacked = false; simTime = 0; d.diverged = true; }
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
    pos: new Float32Array(n * 3), prev: new Float32Array(n * 3), inv: new Float32Array(n), fric: new Float32Array(n), thk: new Float32Array(n * 2),
    nor: new Float32Array(n * 3), ci: new Uint32Array(m * 2), rest: new Float32Array(m), kc: new Float32Array(m), lim: new Float32Array(m),
    si: new Uint32Array(s * 2), srest: new Float32Array(s), sk: new Float32Array(s), col: new Float32Array(c * 9), tri: new Uint32Array(t * 3), bst: new Uint32Array(d.bins.nb + 1), bix: new Uint32Array(d.bins.idx.length),
  };
  fill(views, d);
  const v = views;
  return {
    ...views,
    kind: 'js',
    step(dt) {
      const mv = jsStep(v, n, m, s, c, d.bins, d.substeps, dt, gravityNow(v.pos, v.si, dt, v.inv), d.damping, d.sewRate, 0.0015, v.thk, 0.25, d.field);
      if (!(mv < 2)) { v.pos.set(d.P); v.prev.set(d.P); v.srest.set(d.SR); v.inv.set(d.inv); sewn = false; tacked = false; simTime = 0; d.diverged = true; }
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
  v.thk.set(d.thk);
  v.ci.set(d.C);
  v.rest.set(d.R);
  v.kc.set(d.K);
  v.lim.set(d.L);
  v.si.set(d.S);
  v.srest.set(d.SR);
  v.sk.set(d.SK);
  v.col.set(d.colliders);
  v.tri.set(d.allTris);
  v.bst.set(d.bins.start);
  v.bix.set(d.bins.idx);
}

// ---------- JS fallback (mirrors sim-core/src/lib.rs) ----------
function dist(pos, inv, i, j, rest, k, compress, limit, hg = 1) {
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
  else { const hard = cc - rest * limit; corr = hard > k * cc ? k * cc + (hard - k * cc) * hg : k * cc; }
  const sc = corr / (dd * w);
  pos[i3] += dx * sc * wi; pos[i3 + 1] += dy * sc * wi; pos[i3 + 2] += dz * sc * wi;
  pos[j3] -= dx * sc * wj; pos[j3 + 1] -= dy * sc * wj; pos[j3 + 2] -= dz * sc * wj;
}

const sdfOut = [0, 0, 0, 0];
function jsStep(v, n, m, s, c, bins, substeps, dt, gravity, damping, sewRate, sewMin, thkArr, compress, field) {
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
      const thick = thkArr[p];
      let mout = thkArr[n + p];
      let pulled = false;
      if (field) {
        if (sampleField(field, x, y, z, sdfOut)) {
          const d = sdfOut[0]; const gl = Math.hypot(sdfOut[1], sdfOut[2], sdfOut[3]);
          if (gl > 1e-7) {
            if (d < thick) { const push = Math.min(thick - d, 0.03) / gl; x += sdfOut[1] * push; y += sdfOut[2] * push; z += sdfOut[3] * push; hit = true; }
            else if (mout > 0 && d > mout && d < 0.25) { const pull = (d - mout) / gl; x -= sdfOut[1] * pull; y -= sdfOut[2] * pull; z -= sdfOut[3] * pull; pulled = true; }
          }
        }
        mout = 0;
      }
      let best = 1e9; let bcx = 0; let bcy = 0; let bcz = 0; let bdx = 0; let bdy = 0; let bdz = 0; let bys = 1; let bzs = 1; let bd = 0;
      let bi = Math.floor((y - bins.y0) * bins.inv); bi = bi < 0 ? 0 : bi >= bins.nb ? bins.nb - 1 : bi;
      for (let kk = bins.start[bi]; kk < bins.start[bi + 1]; kk++) {
        const k = bins.idx[kk];
        const o = k * 9;
        const r = col[o + 6] + thick;
        const zs = col[o + 7]; const ys = col[o + 8];
        const ex_ = r; const ey_ = r * ys; const ez_ = r * zs;
        if (mout <= 0 && (x < Math.min(col[o], col[o + 3]) - ex_ || x > Math.max(col[o], col[o + 3]) + ex_ || y < Math.min(col[o + 1], col[o + 4]) - ey_ || y > Math.max(col[o + 1], col[o + 4]) + ey_ || z < Math.min(col[o + 2], col[o + 5]) - ez_ || z > Math.max(col[o + 2], col[o + 5]) + ez_)) continue;
        const ax = col[o]; const ay = col[o + 1] / ys; const az = col[o + 2] / zs;
        const ex = col[o + 3] - ax; const ey = col[o + 4] / ys - ay; const ez = col[o + 5] / zs - az;
        const qy = y / ys; const qz = z / zs;
        const ee = ex * ex + ey * ey + ez * ez;
        let t = ee > 0 ? ((x - ax) * ex + (qy - ay) * ey + (qz - az) * ez) / ee : 0;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const cx = ax + ex * t; const cy = ay + ey * t; const cz = az + ez * t;
        const dx = x - cx; const dy = qy - cy; const dz = qz - cz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (mout > 0 && d2 > 1e-12) { const dd = Math.sqrt(d2); if (dd - r < best) { best = dd - r; bcx = cx; bcy = cy; bcz = cz; bdx = dx; bdy = dy; bdz = dz; bys = ys; bzs = zs; bd = dd; } }
        if (d2 < r * r && d2 > 1e-12) {
          const f = r / Math.sqrt(d2);
          x = cx + dx * f; y = (cy + dy * f) * ys; z = (cz + dz * f) * zs;
          hit = true;
        }
      }
      if (mout > 0 && !hit && best > mout && best < 0.25) { const f = (bd - (best - mout)) / bd; x = bcx + bdx * f; y = (bcy + bdy * f) * bys; z = (bcz + bdz * f) * bzs; pulled = true; }
      if (y < thick) { y = thick; hit = true; }
      if (pulled && !hit) { prev[b] += x - pos[b]; prev[b + 1] += y - pos[b + 1]; prev[b + 2] += z - pos[b + 2]; pos[b] = x; pos[b + 1] = y; pos[b + 2] = z; }
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
    for (let it = 0; it < 3; it++) for (let e = 0; e < s; e++) dist(pos, inv, si[e * 2], si[e * 2 + 1], srest[e], sk[e], 1, srest[e] <= sewMin * 1.01 ? 0.0025 / Math.max(srest[e], 1e-4) : 1e9, 0.5); /* a sewn seam is held by its thread: under load it opens about 2.5 mm beyond the sewn gap, never more */
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
  const L = sim.local; const o = pan.offset;
  const cx = Math.floor(x / pan.cell); const cy = Math.floor(y / pan.cell);
  // Inside a triangle: its barycentric weights. On or beyond the cut edge: the closest point of the
  // nearest triangle, so pieces that run to the edge (cuffs, hems, waistbands) follow the edge exactly.
  let best = null; let bd = Infinity;
  for (let ring = 0; ring <= 2 && !best; ring++) {
    for (let dx = -ring; dx <= ring; dx++) for (let dy = -ring; dy <= ring; dy++) {
      if (ring && Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
      const list = pan.buckets.get((cx + dx) * 8192 + (cy + dy)); if (!list) continue;
      for (const k of list) {
        const a = pan.tris[k] + o; const b = pan.tris[k + 1] + o; const c = pan.tris[k + 2] + o;
        const ax = L[a * 2]; const ay = L[a * 2 + 1]; const bx = L[b * 2]; const by = L[b * 2 + 1]; const qx = L[c * 2]; const qy = L[c * 2 + 1];
        const v0x = bx - ax; const v0y = by - ay; const v1x = qx - ax; const v1y = qy - ay;
        const den = v0x * v1y - v1x * v0y; if (Math.abs(den) < 1e-9) continue;
        const u = ((x - ax) * v1y - v1x * (y - ay)) / den; const v = (v0x * (y - ay) - (x - ax) * v0y) / den; const w = 1 - u - v;
        if (u >= 0 && v >= 0 && w >= 0) return { ids: [a, b, c], w: [w, u, v] };
        // closest point on the triangle's three edges
        const seg = (px, py, rx, ry, i0, i1) => { const ex = rx - px; const ey = ry - py; const ee = ex * ex + ey * ey || 1; let t = ((x - px) * ex + (y - py) * ey) / ee; t = t < 0 ? 0 : t > 1 ? 1 : t; const ddx = px + ex * t - x; const ddy = py + ey * t - y; const d = ddx * ddx + ddy * ddy; if (d < bd) { bd = d; best = { ids: [i0, i1], w: [1 - t, t] }; } };
        seg(ax, ay, bx, by, a, b); seg(bx, by, qx, qy, b, c); seg(qx, qy, ax, ay, c, a);
      }
    }
  }
  if (best) return best;
  // far outside the piece: nearest particle
  let nb = o; let d0 = Infinity;
  for (let q = o; q < o + pan.count; q++) { const d = (L[q * 2] - x) ** 2 + (L[q * 2 + 1] - y) ** 2; if (d < d0) { d0 = d; nb = q; } }
  return { ids: [nb], w: [1] };
}

/** Garment layer: 0 underwear, 1 base (tees, shirts, trousers), 2 mid (knits), 3 jackets, 4 coats, 5 accessories. */
export function layerOf(project, panel) {
  const g = (project.garments || []).find((x) => x.id === panel.garment);
  if (!g) return 1;
  if (g.layer != null) return g.layer;
  if (g.generator === 'brief' || g.generator === 'bra') return 0;
  if (g.generator === 'scarf' || g.generator === 'tie') return 5;
  if (g.generator === 'bottom' || g.generator === 'skirt') return (project.garments || []).some((t) => t.generator === 'top' && t.wear?.tuck === 'in') ? 1.5 : 0.9; // tucked tops go inside, untucked ones hang over
  if (g.generator === 'top') {
    if (g.knit) return 2;
    const o = g.options || {};
    if (o.length > 90 && o.sleeve === 'long' && o.closure !== 'none') return 4;
    if (o.closure && !['none', 'placket', 'henley'].includes(o.closure) && o.sleeve === 'long') return 3;
    if (o.insulation && o.insulation !== 'none') return 3;
  }
  return 1;
}

/** Rank of a panel's layer among the layers actually worn (0 when worn alone), so a solo garment drapes exactly as before. */
export function layerRank(project, panel) {
  const worn = [...new Set((project.garments || []).map((g) => layerOf(project, { garment: g.id })))].sort((a, b) => a - b);
  return Math.max(0, worn.indexOf(layerOf(project, panel)));
}
