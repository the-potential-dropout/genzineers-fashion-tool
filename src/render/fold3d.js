/**
 * Folding the draped garment in 3D. The settled cloth is taken off the body and laid face up on
 * the table (front over back, as it hangs), then each step of the fold plan turns the moving part
 * about its fold line like folding paper: lengths stay true, layers stack in order, nothing is
 * stretched. Everything sewn on (pockets, buttons, zips, stitching) follows the cloth.
 */
import * as THREE from 'three';

const ease = (t) => t * t * (3 - 2 * t);

export function startFold(viewer, project, plan, onDone) {
  const sim = viewer.sim; if (!sim || !plan) return false;
  stopFold(viewer, true);
  const P = sim.pos; const n = P.length / 3; const base = P.slice();
  const mine = new Uint8Array(n); let any = false;
  for (const pan of sim.panels) if (pan.panel.garment === plan.garment) { for (let i = pan.offset; i < pan.offset + pan.count; i++) mine[i] = 1; any = true; }
  if (!any) return false;
  // lay it flat: x across, d down the length from the top, h stacking (front on top)
  let yTop = -9; let zMin = 9; let zMax = -9; let xMin = 9; let xMax = -9;
  for (let i = 0; i < n; i++) if (mine[i]) { yTop = Math.max(yTop, P[i * 3 + 1]); zMin = Math.min(zMin, P[i * 3 + 2]); zMax = Math.max(zMax, P[i * 3 + 2]); xMin = Math.min(xMin, P[i * 3]); xMax = Math.max(xMax, P[i * 3]); }
  const X = new Float32Array(n); const D = new Float32Array(n); const H = new Float32Array(n); const cx = (xMin + xMax) / 2;
  let dMax = 0;
  for (let i = 0; i < n; i++) { if (!mine[i]) continue; X[i] = P[i * 3] - cx; D[i] = yTop - P[i * 3 + 1]; H[i] = ((P[i * 3 + 2] - zMin) / Math.max(1e-6, zMax - zMin)) * 0.0022; if (D[i] > dMax) dMax = D[i]; }
  // the body length is the reference for length folds (sleeves hang beside it)
  let bodyLen = 0; for (const pan of sim.panels) { if (pan.panel.garment !== plan.garment || pan.panel.role === 'sleeve') continue; for (let i = pan.offset; i < pan.offset + pan.count; i++) bodyLen = Math.max(bodyLen, D[i]); }
  if (!bodyLen) bodyLen = dMax;
  const state = { base, mine, X, D, H, step: -1, t: 0, plan, steps: plan.steps.slice(), tidied: 0, bodyLen, onDone, prev: null, hidden: viewer.avatarGroup.visible };
  viewer._fold = state; viewer.simAwake = false; viewer.avatarGroup.visible = false;
  for (let i = 0; i < n; i++) if (!mine[i]) { P[i * 3 + 1] = -50; } // other garments of the outfit are put aside
  writeWorld(viewer, state, null, 0);
  frameFolded(viewer, state);
  state.step = 0; state.t0 = performance.now(); state.prev = { X: X.slice(), D: D.slice(), H: H.slice() };
  return true;
}

export function stopFold(viewer, quiet = false) {
  const s = viewer._fold; if (!s) return;
  viewer.sim.pos.set(s.base); viewer.avatarGroup.visible = true; viewer._fold = null;
  recomputeNormals(viewer.sim); viewer.updateGarment(); viewer.simAwake = !quiet; viewer._simFrames = 600; viewer.dirty = true;
}

/** Advance the animation; called from the viewer's frame loop. */
export function tickFold(viewer) {
  const s = viewer._fold; if (!s || s.step < 0) return;
  const steps = s.steps;
  if (s.step >= steps.length) return;
  const st = steps[s.step]; const dur = 900; const t = Math.min(1, (performance.now() - s.t0) / dur); const phi = Math.PI * ease(t);
  writeWorld(viewer, s, st, phi);
  if (t >= 1) { // bake this fold, start the next
    applyFold(s, st, Math.PI, true); s.prev = { X: s.X.slice(), D: s.D.slice(), H: s.H.slice() }; s.step++; s.t0 = performance.now() + 250;
    if (s.step >= steps.length) { const t2 = tidyStep(s); if (t2) steps.push(t2); else { frameFolded(viewer, s); s.onDone?.(); } }
  }
}

/** Anything still sticking out of the folded block (usually a sleeve end) is folded back in along that edge. */
function tidyStep(s) {
  if (s.tidied >= 6) return null; const pl = s.plan; const k = pl.steps.filter((q) => q.axis === 'd').length; const W = pl.board ? pl.board / 200 : 0;
  const top = 0; const bottom = s.bodyLen / (k + 1); let xMin = Infinity; let xMax = -Infinity; let dMin = Infinity; let dMax = -Infinity;
  for (let i = 0; i < s.mine.length; i++) if (s.mine[i]) { xMin = Math.min(xMin, s.X[i]); xMax = Math.max(xMax, s.X[i]); dMin = Math.min(dMin, s.D[i]); dMax = Math.max(dMax, s.D[i]); }
  const m = 0.012; s.tidied++;
  if (W && xMax > W + m) return { axis: 'x', at: W * 100, side: 1, dir: 'under' };
  if (W && xMin < -W - m) return { axis: 'x', at: -W * 100, side: -1, dir: 'under' };
  if (dMax > bottom + m) return { axis: 'd', at: bottom / s.bodyLen, side: 1, dir: 'under' };
  if (dMin < top - m) return { axis: 'd', at: top, side: -1, dir: 'under' };
  return null;
}

/** Positions after turning the moving part of fold st by phi (0..pi). In place when bake, else into temp arrays. */
function applyFold(s, st, phi, bake) {
  const src = s.prev; const n = src.X.length; const X = bake ? s.X : new Float32Array(src.X); const D = bake ? s.D : new Float32Array(src.D); const H = bake ? s.H : new Float32Array(src.H);
  const at = st.axis === 'x' ? st.at / 100 : st.at * s.bodyLen; const under = st.dir === 'under'; const sgn = under ? -1 : 1;
  const moving = (i) => st.side * ((st.axis === 'x' ? src.X[i] : src.D[i]) - at) > 0;
  // the stack, cell by cell: where each moving point leaves from and where it lands
  const C = 0.02; const cell = (x, d) => `${Math.floor(x / C)},${Math.floor(d / C)}`;
  const lo = new Map(); const hi = new Map(); const stayLo = new Map(); const stayHi = new Map();
  for (let i = 0; i < n; i++) { if (!s.mine[i]) continue; const k = cell(src.X[i], src.D[i]); const h = src.H[i];
    if (!(h >= lo.get(k))) lo.set(k, h); if (!(h <= hi.get(k))) hi.set(k, h);
    if (!moving(i)) { if (!(h >= stayLo.get(k))) stayLo.set(k, h); if (!(h <= stayHi.get(k))) stayHi.set(k, h); } }
  let gLo = Infinity; let gHi = -Infinity; for (const v of stayLo.values()) gLo = Math.min(gLo, v); for (const v of stayHi.values()) gHi = Math.max(gHi, v); if (!Number.isFinite(gLo)) { gLo = 0; gHi = 0; }
  const near = (m, k, dflt) => { if (m.has(k)) return m.get(k); const [cx, cz] = k.split(',').map(Number); let best = null; for (let r = 1; r <= 2 && best == null; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { const v = m.get(`${cx + dx},${cz + dz}`); if (v != null && (best == null || (under ? v < best : v > best))) best = v; } return best ?? dflt; };
  const cs = Math.cos(phi); const sn = Math.sin(phi); const k01 = (1 - cs) / 2; const gap = 0.0007;
  for (let i = 0; i < n; i++) {
    if (!s.mine[i]) continue;
    const c = st.axis === 'x' ? src.X[i] : src.D[i]; const a = st.side * (c - at); if (a <= 0) { X[i] = src.X[i]; D[i] = src.D[i]; H[i] = src.H[i]; continue; }
    const kSrc = cell(src.X[i], src.D[i]); const base = under ? lo.get(kSrc) : hi.get(kSrc); const rel = (src.H[i] - base) * (under ? 1 : -1); // how deep in its own part of the stack (>= 0)
    const a2 = a * cs + rel * sn * 0; const nc = at + st.side * a2; // the moving part swings round the fold line
    const fx = st.axis === 'x' ? at - st.side * a : src.X[i]; const fd = st.axis === 'd' ? at - st.side * a : src.D[i]; const kDst = cell(fx, fd);
    const land = under ? near(stayLo, kDst, gLo) - gap - rel : near(stayHi, kDst, gHi) + gap + rel; // where it ends up: just under (or over) the cloth already there
    const swing = sgn * a * sn; // height while it turns over
    if (st.axis === 'x') { X[i] = nc; D[i] = src.D[i]; } else { D[i] = nc; X[i] = src.X[i]; }
    H[i] = src.H[i] * (1 - k01) + land * k01 + swing;
  }
  return { X, D, H };
}

function writeWorld(viewer, s, st, phi) {
  const r = st ? applyFold(s, st, phi, false) : { X: s.X, D: s.D, H: s.H };
  const P = viewer.sim.pos; const n = P.length / 3; let hMin = Infinity;
  for (let i = 0; i < n; i++) if (s.mine[i]) hMin = Math.min(hMin, r.H[i]);
  const dMid = s.bodyLen / 2;
  for (let i = 0; i < n; i++) { if (!s.mine[i]) continue; P[i * 3] = r.X[i]; P[i * 3 + 1] = 0.75 + (r.H[i] - hMin) + 0.003; P[i * 3 + 2] = r.D[i] - dMid; }
  recomputeNormals(viewer.sim); viewer.updateGarment(); viewer.dirty = true;
}

function recomputeNormals(sim) {
  const P = sim.pos; const N = sim.nor; if (!N) return; N.fill(0);
  for (const pan of sim.panels) { const T = pan.tris; const o = pan.offset; for (let t = 0; t < T.length; t += 3) { const a = (T[t] + o) * 3; const b = (T[t + 1] + o) * 3; const c = (T[t + 2] + o) * 3; const ux = P[b] - P[a]; const uy = P[b + 1] - P[a + 1]; const uz = P[b + 2] - P[a + 2]; const vx = P[c] - P[a]; const vy = P[c + 1] - P[a + 1]; const vz = P[c + 2] - P[a + 2]; const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx; for (const q of [a, b, c]) { N[q] += nx; N[q + 1] += ny; N[q + 2] += nz; } } }
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
}

function frameFolded(viewer, s) {
  const P = viewer.sim.pos; const box = new THREE.Box3();
  for (let i = 0; i < s.mine.length; i++) if (s.mine[i]) box.expandByPoint(new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]));
  const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3());
  viewer.controls.autoRotate = false; viewer.controls.target.copy(c);
  const R = Math.max(sz.x, sz.z, 0.3) * 1.25; viewer.camera.position.set(c.x + R * 0.15, c.y + R * 1.05, c.z + R * 0.75); viewer.controls.update(); viewer.dirty = true;
}
