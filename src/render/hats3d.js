/**
 * Hats in 3D, built on the mannequin's own head: the band follows a real cross-section of the
 * head, the crown is swept up from it in the style's shape (and never cuts into the head), then
 * the pieces are laid on: panels with taped seams and eyelets, bills with their rows of stitching,
 * blocked crowns with creases and pinches, brims with curl, bands, bows, closures, poms.
 */
import * as THREE from 'three';
import { NA, slice, gridFrom, layPiece, clip, geoOf, merge, strand, seatM, buckle, gridVert } from './shoes3d.js';

const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function radiiAbout(segs, cu, cv) {
  const R = new Float32Array(NA);
  for (let i = 0; i < NA; i++) { const a = (i / NA) * Math.PI * 2; const du = Math.sin(a); const dv = -Math.cos(a); let best = 0;
    for (let s = 0; s < segs.length; s += 4) { const ax = segs[s] - cu; const ay = segs[s + 1] - cv; const ex = segs[s + 2] - segs[s]; const ey = segs[s + 3] - segs[s + 1]; const den = du * ey - dv * ex; if (Math.abs(den) < 1e-12) continue; const t = (ax * ey - ay * ex) / den; const q = (ax * dv - ay * du) / den; if (t > best && q >= -0.001 && q <= 1.001) best = t; }
    R[i] = best; }
  for (let it = 0; it < 6; it++) for (let i = 0; i < NA; i++) { const l = R[(i + NA - 1) % NA]; const r = R[(i + 1) % NA]; if (R[i] < (l + r) * 0.5 * 0.97) R[i] = (l + r) * 0.5 * 0.97; }
  return R;
}

export function buildHat(spec, tris, mats) {
  const group = new THREE.Group(); if (!tris.length) return group;
  let top = -9; let zc = 0; let n0 = 0;
  for (let t = 0; t < tris.length; t += 3) top = Math.max(top, tris[t + 1]);
  for (let t = 0; t < tris.length; t += 3) if (tris[t + 1] > top - 0.1) { zc += tris[t + 2]; n0++; }
  zc /= n0 || 1;
  const kind = spec.kind; const H = (spec.H / 100) * (spec.kind === 'cap' ? 0.7 : 1); const back = spec.wear === 'backwards';
  const drop = (kind === 'knit' ? 0.118 : kind === 'beret' ? 0.085 : spec.deep ? 0.125 : kind === 'bucket' ? 0.104 : kind === 'flat' ? 0.096 : kind === 'block' ? 0.097 : 0.1) + (spec.wear === 'low-on-brow' ? 0.012 : spec.wear === 'tilted-back' ? -0.012 : 0);
  const tau = ((spec.wear === 'tilted-back' ? 22 : spec.wear === 'low-on-brow' ? 3 : kind === 'knit' ? 14 : 9) * Math.PI) / 180 * (back ? -1 : 1);
  const X = [1, 0, 0]; const F = [0, Math.sin(tau), Math.cos(tau)]; const n = [0, Math.cos(tau), -Math.sin(tau)]; const D = [0, -F[1], -F[2]];
  const O = [0, top - drop, zc];
  // head sections parallel to the band, about the band's own centre
  const s0 = slice(tris, O, D); if (s0.length < 12) return group;
  let cu = 0; let cv = 0; let Ls = 0; for (let s = 0; s < s0.length; s += 4) { const l = Math.hypot(s0[s + 2] - s0[s], s0[s + 3] - s0[s + 1]) + 1e-9; cu += (s0[s] + s0[s + 2]) * 0.5 * l; cv += (s0[s + 1] + s0[s + 3]) * 0.5 * l; Ls += l; } cu /= Ls; cv /= Ls;
  const DH = 0.007; const head = []; for (let j = 0; j < 40; j++) { const Oj = [O[0], O[1] + n[1] * j * DH, O[2] + n[2] * j * DH]; const sg = slice(tris, Oj, D); if (sg.length < 8) break; head.push(radiiAbout(sg, cu, cv)); }
  const hTop = (head.length - 1) * DH + 0.004;
  const headR = (h, i) => { const f = h / DH; if (f >= head.length - 1) { const last = head[head.length - 1][i]; const over = (h - (head.length - 1) * DH) / 0.008; return over >= 1 ? 0 : last * Math.sqrt(1 - over * over); } const j = Math.max(0, Math.floor(f)); return head[j][i] + (head[j + 1][i] - head[j][i]) * (f - j); };
  const ease = kind === 'knit' ? 0.0028 : kind === 'cap' ? 0.0045 : 0.004;
  const Rb = new Float32Array(NA); for (let i = 0; i < NA; i++) Rb[i] = head[0][i] + ease;
  for (let it = 0; it < 3; it++) { const c = Rb.slice(); for (let i = 0; i < NA; i++) Rb[i] = (c[(i + NA - 1) % NA] + 2 * c[i] + c[(i + 1) % NA]) / 4; }
  const at = (h, r, i, dx = 0, dF = 0) => { const a = (i / NA) * Math.PI * 2; const su = cu + Math.sin(a) * r + dx; const sf = Math.cos(a) * r + dF; return [O[0] + su, O[1] + cv * D[1] + sf * F[1] + n[1] * h, O[2] + cv * D[2] + sf * F[2] + n[2] * h]; };
  // ---- the crown's shape
  const tw = kind === 'block' ? 0.6 : 0.58; const Hw = kind === 'block' && spec.top === 'dome' ? H - 0.034 : H;
  const shape = (t, i) => {
    const a = (i / NA) * Math.PI * 2; const ca = Math.cos(a); const sa = Math.sin(a); const front = Math.max(0, ca);
    if (kind === 'knit') { const Hk = hTop + 0.009 + (spec.slouch ? 0.055 : 0) + Math.max(0, H - 0.23) * 0.5; const fill = (spec.slouch ? 0.82 : 0.5) * Math.pow(Math.cos(t * Math.PI / 2), 0.6); const sl = spec.slouch ? t * t * t : 0; return { h: Hk * Math.sin(t * Math.PI / 2) - sl * 0.045, s: fill, dF: -sl * 0.085, follow: 1 }; }
    if (kind === 'cap') { const st = spec.structured || 0; const e = lerp(0.66, lerp(0.66, 0.4, st), Math.pow(front, 1.2)) * (spec.camp ? 0.72 : 1); return { h: H * Math.sin(t * Math.PI / 2) * (spec.camp ? 0.86 + 0.14 * t : 1), s: Math.pow(Math.cos(t * Math.PI / 2), e) }; }
    if (kind === 'visor') return { h: H * Math.min(1, t / 0.6) * 0.98, s: t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4 };
    if (kind === 'beret') { if (t < 0.45) { const q = t / 0.45; return { h: 0.03 * q - 0.02 * Math.max(0, sa) * q, s: 1 + 0.52 * Math.sin(q * Math.PI / 2), dx: 0.03 * q }; } const u = (t - 0.45) / 0.55; return { h: 0.03 + 0.026 * Math.sin(u * Math.PI / 2) - 0.02 * Math.max(0, sa) * (1 - u), s: 1.52 * Math.pow(1 - u, 0.9), dx: 0.03 }; }
    if (kind === 'flat') { const full = 1 + (spec.full ? 0.2 : 0.08) * Math.sin(t * Math.PI); return { h: H * Math.sin(t * Math.PI / 2) * (1 - 0.5 * Math.pow(front, 1.4)) , s: Math.pow(Math.cos(t * Math.PI / 2), 0.5) * full * (1 + 0.3 * Math.pow(front, 2) * Math.sin(t * Math.PI) ), dF: 0.03 * Math.sin(t * Math.PI / 2) }; }
    // block and bucket: a wall, then the tip
    if (t <= tw) { const q = t / tw; let s = 1 - spec.taper * q; if (kind === 'block' && ['teardrop', 'center-dent', 'cattleman', 'diamond'].includes(spec.top)) s -= 0.2 * Math.exp(-Math.pow((Math.abs(a > Math.PI ? a - 2 * Math.PI : a) - 0.5) / 0.22, 2)) * q * q * q; return { h: Hw * q, s }; }
    const u = (t - tw) / (1 - tw); const rho = 1 - u; const xn = rho * sa; const zn = rho * ca; let h = Hw; const sT = 1 - spec.taper;
    let s = sT * Math.pow(rho, 0.92); h -= 0.007 * Math.pow(rho, 8);
    if (kind === 'bucket') h += 0.006 * (1 - rho * rho);
    else if (spec.top === 'dome') h += 0.034 * Math.sqrt(Math.max(0, 1 - rho * rho));
    else if (spec.top === 'telescope') h -= 0.013 * sstep(0.9, 0.7, rho);
    else if (spec.top === 'center-dent') h -= 0.024 * Math.exp(-Math.pow(xn / 0.34, 2)) * sstep(1, 0.75, rho) + 0.012 * zn;
    else if (spec.top === 'teardrop' || spec.top === 'diamond') h -= 0.03 * Math.exp(-(xn * xn / (0.1 + 0.16 * Math.max(0, 0.5 - zn)) + Math.pow(zn + 0.12, 2) / 0.5)) * sstep(1, 0.86, rho) + 0.02 * zn;
    else if (spec.top === 'cattleman') h -= (0.036 * Math.exp(-Math.pow(xn / 0.18, 2)) + 0.024 * Math.exp(-Math.pow((Math.abs(xn) - 0.55) / 0.15, 2))) * sstep(1, 0.78, rho) * (1 - 0.35 * Math.max(0, -zn)) + 0.01 * zn; // a centre crease front to back and a dent down each side, deeper at the front
    if (kind === 'block' && ['teardrop', 'center-dent', 'cattleman', 'diamond'].includes(spec.top)) s -= 0.2 * Math.exp(-Math.pow((Math.abs(a > Math.PI ? a - 2 * Math.PI : a) - 0.5) / 0.22, 2)) * rho;
    return { h, s };
  };
  const KC = 34; const rings = []; const TT = []; const HH = [];
  for (let k = 0; k < KC; k++) { const t = k / KC; const ring = []; for (let i = 0; i < NA; i++) { const sh = shape(t, i); const hr = headR(Math.max(0, sh.h), i) + ease; const r = sh.follow ? Math.max(hr, sh.s * Rb[i]) : Math.max(sh.h < hTop ? hr * (kind === 'beret' && t > 0.2 ? 0 : 1) : 0, sh.s * Rb[i]); ring.push(at(sh.h, r, i, sh.dx || 0, sh.dF || 0)); TT.push(t); HH.push(sh.h); } rings.push(ring); }
  const shA = shape(1, 0); const tipP = at(shA.h, 0, 0, shA.dx || 0, shA.dF || 0);
  const G = gridFrom(rings, tipP, [O[0] + cu, O[1] + n[1] * H * 0.3, O[2] + n[2] * H * 0.3]);
  TT.push(1); HH.push(shA.h);
  const M = (fn) => { const m = new Float32Array(G.N); for (let v = 0; v < G.N; v++) m[v] = fn(v); return m; };
  const sgn = (v) => { const a = G.ang[v]; return a > Math.PI ? a - 2 * Math.PI : a; }; // -pi..pi, 0 at the front
  const stitch = spec.stitchColor || null; const col = (id) => mats.colorOf(id);
  const rB = Rb.reduce((a, b) => a + b, 0) / NA;
  // ---- crown, cut for the back closure of an adjustable cap
  const adjustable = kind === 'cap' && !['fitted', 'elastic'].includes(spec.closureType);
  const arch = (v) => { const da = Math.abs(Math.abs(sgn(v)) - Math.PI) * rB; return adjustable ? 0.05 * Math.sqrt(Math.max(0, 1 - Math.pow(da / 0.047, 2))) - HH[v] : -1; };
  const exist = M((v) => (kind === 'visor' ? 0.57 - TT[v] : -arch(v)));
  layPiece(G, group, exist, mats.part('crown'), { color: col('crown'), stitch: adjustable || kind === 'visor' ? 1 : 0, stitchColor: stitch, edge: true });
  if (kind !== 'knit') { const c = clip(G, M((v) => Math.min(exist[v], 0.034 - HH[v])), -0.0016); if (c.pos.length) group.add(new THREE.Mesh(geoOf(c), new THREE.MeshStandardMaterial({ color: mats.colorOf('sweatband'), roughness: 0.9, side: THREE.DoubleSide }))); }
  const part = (id) => spec.parts.find((p) => p.id === id);
  if (kind === 'cap') {
    const fa = (spec.panels === 5 ? 60 : 60) * Math.PI / 180;
    if (part('front') && (spec.mesh || part('front').fabric || part('front').color || spec.contrastFront)) { const m = mats.part('front'); if (spec.contrastFront && !part('front').color) { m.color.set(spec.contrastFront); m.map = null; } layPiece(G, group, M((v) => Math.min(exist[v], (fa - Math.abs(sgn(v))) * rB)), m, { off: 0.0007, color: spec.contrastFront || col('front'), stitch: 0, edge: false, order: 1 }); }
    if (part('mesh')) layPiece(G, group, M((v) => Math.min(exist[v], (Math.abs(sgn(v)) - fa) * rB)), mats.part('mesh'), { off: 0.0005, color: col('mesh'), stitch: 0, edge: false, order: 1 });
  }
  // ---- a line up the crown at angle a (seams, decrease lines)
  const meridian = (a, t0 = 0, t1 = 1, off = 0.0008) => { const f = (((a / (Math.PI * 2)) % 1) + 1) % 1 * NA; const i0 = Math.floor(f) % NA; const i1 = (i0 + 1) % NA; const w = f - Math.floor(f); const pts = []; const nr = []; for (let k = 0; k < KC; k++) { const t = k / KC; if (t < t0 || t > t1) continue; const a0 = (k * NA + i0) * 3; const a1 = (k * NA + i1) * 3; const nn = new THREE.Vector3(lerp(G.Nn[a0], G.Nn[a1], w), lerp(G.Nn[a0 + 1], G.Nn[a1 + 1], w), lerp(G.Nn[a0 + 2], G.Nn[a1 + 2], w)).normalize(); pts.push(new THREE.Vector3(lerp(G.P[a0], G.P[a1], w), lerp(G.P[a0 + 1], G.P[a1 + 1], w), lerp(G.P[a0 + 2], G.P[a1 + 2], w)).addScaledVector(nn, off)); nr.push(nn); } if (t1 >= 1) { pts.push(new THREE.Vector3(...tipP).addScaledVector(new THREE.Vector3(...n), off)); nr.push(new THREE.Vector3(...n)); } return { pts, nr }; };
  const dashed = (pts, color) => { const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color, dashSize: 0.0026, gapSize: 0.0011 })); ln.computeLineDistances(); group.add(ln); };
  const crownCol = new THREE.Color(col('crown')); const thread = stitch || crownCol.clone().lerp(new THREE.Color('#ffffff'), 0.35).getStyle();
  const seamAt = (a, t0 = 0, t1 = 1) => { const m = meridian(a, t0, t1); if (m.pts.length < 3) return; const sm = new THREE.Mesh(strand(m.pts, m.nr, 0.0024, 0.0009), new THREE.MeshStandardMaterial({ color: crownCol.clone().multiplyScalar(0.82), roughness: 0.9 })); group.add(sm); for (const d of [-1, 1]) dashed(meridian(a + d * 0.0034 / rB, t0, Math.min(t1, 0.96), 0.001).pts, thread); };
  const metalCol = '#b9b9b9'; const metal = new THREE.MeshStandardMaterial({ color: metalCol, metalness: 0.9, roughness: 0.3 });
  const spot = (a, t) => { const m = meridian(a, t - 0.02, t + 0.05, 0.0009); if (m.pts.length < 2) return null; const tu = new THREE.Vector3().crossVectors(m.nr[0], new THREE.Vector3().subVectors(m.pts[1], m.pts[0]).normalize()).normalize(); return { p: m.pts[0], n: m.nr[0], tu }; };
  if (kind === 'cap' || (kind === 'flat' && spec.panels >= 8)) {
    const angs = spec.panels === 8 ? [0, 45, 90, 135, 180, 225, 270, 315] : spec.panels === 4 ? [0, 90, 180, 270] : spec.panels === 5 ? [60, 120, 180, 240, 300] : [0, 60, 120, 180, 240, 300];
    for (const d of angs) seamAt((d * Math.PI) / 180, d === 180 && adjustable ? 0.36 : 0);
    if (spec.eyelets !== 'none' && kind === 'cap') { const g = []; const holes = []; for (const d of spec.panels === 5 ? [90, 150, 210, 270] : [30, 90, 150, 210, 270, 330]) { const o = spot((d * Math.PI) / 180, 0.6); if (!o) continue; const t = new THREE.TorusGeometry(0.0034, 0.001, 6, 16); t.rotateX(Math.PI / 2); t.scale(1, 0.5, 1); g.push(t.applyMatrix4(seatM(o))); const hgeo = new THREE.CircleGeometry(0.0022, 12); hgeo.rotateX(-Math.PI / 2); hgeo.translate(0, 0.0003, 0); holes.push(hgeo.applyMatrix4(seatM(o))); } if (g.length) { group.add(new THREE.Mesh(merge(g), spec.eyelets === 'metal' ? metal : new THREE.MeshStandardMaterial({ color: thread, roughness: 0.8 }))); group.add(new THREE.Mesh(merge(holes), new THREE.MeshBasicMaterial({ color: '#0a0a0a' }))); } }
  }
  if (kind === 'bucket') { seamAt(Math.PI / 2, 0, tw); seamAt(-Math.PI / 2, 0, tw); { const ring = rings[Math.round(tw * KC)]; const pts = ring.map((p, i) => new THREE.Vector3(...p).addScaledVector(new THREE.Vector3(G.Nn[(Math.round(tw * KC) * NA + i) * 3], G.Nn[(Math.round(tw * KC) * NA + i) * 3 + 1], G.Nn[(Math.round(tw * KC) * NA + i) * 3 + 2]), 0.001)); pts.push(pts[0]); dashed(pts, thread); } if (spec.eyelets !== 'none') { const g = []; for (const d of [75, 105, 255, 285]) { const o = spot((d * Math.PI) / 180, tw * 0.55); if (!o) continue; const t = new THREE.TorusGeometry(0.0036, 0.0011, 6, 16); t.rotateX(Math.PI / 2); t.scale(1, 0.5, 1); g.push(t.applyMatrix4(seatM(o))); } if (g.length) group.add(new THREE.Mesh(merge(g), metal)); } }
  if (kind === 'knit') { for (const d of [45, 135, 225, 315]) { const m = meridian((d * Math.PI) / 180, 0.62, 1, 0.0008); if (m.pts.length > 2) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(m.pts), new THREE.LineBasicMaterial({ color: crownCol.clone().multiplyScalar(0.6) }))); }
    if (spec.cuff) layPiece(G, group, M((v) => spec.cuff / 100 - HH[v]), mats.part('cuff'), { off: 0.0032, color: col('cuff'), stitch: 0, edge: true, order: 1 }); }
  // ---- band, bow
  if (part('band')) { const bh = spec.band === 'leather' ? 0.015 : spec.band === 'rope' || spec.band === 'chain' ? 0.006 : 0.038; const bm = mats.part('band'); if (!part('band').color && spec.bandColor) { bm.color.set(spec.bandColor); bm.map = null; } const bc = part('band').color || spec.bandColor || col('band');
    layPiece(G, group, M((v) => Math.min(bh - HH[v], HH[v] + 0.001)), bm, { off: spec.band === 'leather' ? 0.0016 : 0.0008, color: bc, stitch: spec.band === 'leather' ? 1 : 0, stitchColor: stitch, order: 2 });
    const o = spot(Math.PI / 2, (bh * 0.5) / Math.max(0.03, Hw) * tw); if (o && spec.band !== 'leather' && spec.band !== 'chain') { const g = []; for (const s of [-1, 1]) { const lp = new THREE.BoxGeometry(0.03, 0.004, bh * 0.82); lp.translate(s * 0.017, 0.003, 0); g.push(lp); } const kn = new THREE.BoxGeometry(0.01, 0.006, bh * 0.9); kn.translate(0, 0.004, 0); g.push(kn); const m = new THREE.Mesh(merge(g), bm); m.applyMatrix4(seatM({ ...o, p: o.p.clone().addScaledVector(o.n, 0.001) })); group.add(m); }
    if (o && spec.band === 'leather') { const bk = new THREE.Mesh(buckle(bh), metal); bk.applyMatrix4(seatM({ ...o, p: o.p.clone().addScaledVector(o.n, 0.002) })); group.add(bk); } }
  // ---- bill
  const outline = (pts) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: crownCol.clone().multiplyScalar(0.45) })); group.add(l); };
  const Xv = new THREE.Vector3(...X); const Fv = new THREE.Vector3(...F); const nv = new THREE.Vector3(...n);
  if (spec.brim && (kind === 'cap' || kind === 'visor' || kind === 'flat')) {
    const Lb = spec.brim / 100; const a0 = (kind === 'flat' ? 58 : 66) * Math.PI / 180; const NAb = 40; const NS = 10;
    const tilt = spec.flipBill ? -0.5 : kind === 'flat' ? 0.3 : 0.2; const curve = spec.billShape === 'flat' ? 0.02 : spec.billShape === 'slight-curve' ? 0.22 : 0.45; const thick = 0.0028;
    const P = (ia, is, side) => { const a = -a0 + (2 * a0 * ia) / NAb; const fi = ((a / (Math.PI * 2)) * NA + NA) % NA; const i0 = Math.floor(fi) % NA; const r = lerp(Rb[i0], Rb[(i0 + 1) % NA], fi - Math.floor(fi)) + 0.001; const base = new THREE.Vector3(...at(0.004, r, fi)); const w = Lb * Math.pow(Math.max(0, 1 - Math.pow(a / a0, 2)), 0.5) + 0.0005; const s = is / NS; const dir = Xv.clone().multiplyScalar(Math.sin(a) * 0.3).addScaledVector(Fv, 0.7 + 0.3 * Math.cos(a)).normalize(); const lat = Math.sin(a) * r + dir.x * w * s; return base.addScaledVector(dir, w * s).addScaledVector(nv, -tilt * w * s - curve * lat * lat * 1.5 * s - (side < 0 ? thick : 0)); };
    const surf = (side) => { const pos = []; const idx = []; const uv = []; for (let ia = 0; ia <= NAb; ia++) for (let is = 0; is <= NS; is++) { const p = P(ia, is, side); pos.push(p.x, p.y, p.z); uv.push(ia / NAb * 1.8, is / NS * 0.8); } for (let ia = 0; ia < NAb; ia++) for (let is = 0; is < NS; is++) { const a = ia * (NS + 1) + is; const b = a + NS + 1; if (side > 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
    group.add(new THREE.Mesh(surf(1), mats.part('bill'))); const um = mats.part('underbill'); if (spec.underbrim && !part('underbill')?.color) { um.color.set(spec.underbrim); um.map = null; } group.add(new THREE.Mesh(surf(-1), um));
    const edge = []; for (let ia = 0; ia <= NAb; ia++) edge.push(P(ia, NS, 1).addScaledVector(nv, -thick / 2)); group.add(new THREE.Mesh(strand(edge, edge.map(() => nv), thick * 1.25, thick * 1.25, true), mats.part('bill'))); outline(edge);
    const rowsN = kind === 'flat' ? 2 : 6; for (let r = 1; r <= rowsN; r++) { const pts = []; for (let ia = 1; ia < NAb; ia++) { const p = P(ia, NS, 1); const b = P(ia, 0, 1); const w = p.distanceTo(b); const back = Math.min(w - 0.002, r * 0.0075); if (back <= 0) continue; pts.push(p.lerp(b, back / Math.max(1e-6, w)).addScaledVector(nv, 0.0005)); } if (pts.length > 2) dashed(pts, stitch || new THREE.Color(col('bill')).lerp(new THREE.Color('#ffffff'), 0.35).getStyle()); }
  }
  // ---- brim
  if (spec.brim && (kind === 'block' || kind === 'bucket')) {
    const W = spec.brim / 100; const NS = 14; const sig = (spec.brimSlope * Math.PI) / 180; const thick = kind === 'bucket' ? 0.003 : 0.0022; const cl = spec.curl || [0, 0, 0];
    const P = (i, is, side) => { const a = (i / NA) * Math.PI * 2; const s = is / NS; const ca = Math.cos(a); const base = new THREE.Vector3(...at(0.0005, Rb[i % NA] * (shape(0, i % NA).s || 1) + 0.0005, i % NA)); const dir = Xv.clone().multiplyScalar(Math.sin(a)).addScaledVector(Fv, ca); const curl = (cl[0] * Math.pow(Math.max(0, ca), 2) + cl[1] * Math.pow(Math.max(0, -ca), 2) + cl[2] * Math.pow(Math.sin(a), 2)) / 100; const wv = spec.floppy ? 0.007 * Math.sin(5 * a + 1) * s * s : 0; return base.addScaledVector(dir, W * s * Math.cos(sig)).addScaledVector(nv, -W * s * Math.sin(sig) + curl * Math.pow(s, 2.4) + wv - (side < 0 ? thick : 0)); };
    const surf = (side) => { const pos = []; const idx = []; const uv = []; for (let i = 0; i <= NA; i++) for (let is = 0; is <= NS; is++) { const p = P(i, is, side); pos.push(p.x, p.y, p.z); uv.push((i / NA) * 6, (is / NS) * W * 10); } for (let i = 0; i < NA; i++) for (let is = 0; is < NS; is++) { const a = i * (NS + 1) + is; const b = a + NS + 1; if (side > 0) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g; };
    group.add(new THREE.Mesh(surf(1), mats.part('brim'))); group.add(new THREE.Mesh(surf(-1), mats.part('brim')));
    const edge = []; for (let i = 0; i <= NA; i++) edge.push(P(i, NS, 1).addScaledVector(nv, -thick / 2));
    const bound = spec.brimEdge === 'bound'; const em = bound ? mats.part('binding') : mats.part('brim'); if (bound && !part('binding')?.color && spec.bandColor) { em.color.set(spec.bandColor); em.map = null; }
    group.add(new THREE.Mesh(strand(edge, edge.map(() => nv), bound ? 0.0075 : spec.brimEdge === 'rolled' ? 0.005 : thick * 1.2, bound ? thick * 1.9 : spec.brimEdge === 'rolled' ? 0.005 : thick * 1.2, !bound), em)); if (!bound) outline(edge);
    if (kind === 'bucket') for (let r = 1; r <= Math.floor(W / 0.008); r++) { const pts = []; for (let i = 0; i <= NA; i++) { const s = 1 - (r * 0.008) / W; if (s <= 0.02) break; const p0 = P(i, Math.floor(s * NS), 1); const p1 = P(i, Math.min(NS, Math.floor(s * NS) + 1), 1); pts.push(p0.lerp(p1, s * NS - Math.floor(s * NS)).addScaledVector(nv, 0.0006)); } if (pts.length > 3) dashed(pts, thread); }
    if (spec.loops) { const g = []; for (let i = 0; i < NA; i += 4) { const o = gridVert(G, Math.round(0.3 * KC) * NA + i); const b = new THREE.BoxGeometry(0.02, 0.0016, 0.012); g.push(b.applyMatrix4(seatM({ ...o, p: o.p.clone().addScaledVector(o.n, 0.0012) }))); } group.add(new THREE.Mesh(merge(g), mats.part('crown'))); }
  }
  // ---- back closure
  if (adjustable) { const pts = []; const nr = []; for (let q = 0; q <= 16; q++) { const a = Math.PI - 0.42 + (0.84 * q) / 16; const fi = ((a / (Math.PI * 2)) * NA + NA) % NA; const i0 = Math.floor(fi) % NA; const r = lerp(Rb[i0], Rb[(i0 + 1) % NA], fi - Math.floor(fi)) + 0.0012; pts.push(new THREE.Vector3(...at(0.013, r, fi))); nr.push(Xv.clone().multiplyScalar(Math.sin(a)).addScaledVector(Fv, Math.cos(a))); }
    const ct = spec.closureType; const sm = ct === 'snapback' ? new THREE.MeshStandardMaterial({ color: col('crown'), roughness: 0.5 }) : mats.part('strap');
    group.add(new THREE.Mesh(strand(pts, nr, ct === 'velcro' ? 0.022 : 0.017, 0.0016), sm));
    const mid = { p: pts[8].clone().addScaledVector(nr[8], 0.001), n: nr[8], tu: new THREE.Vector3().subVectors(pts[9], pts[7]).normalize() };
    if (ct === 'strapback' || ct === 'leather-strap') { const bk = new THREE.Mesh(buckle(0.017), ct === 'leather-strap' ? new THREE.MeshStandardMaterial({ color: '#b08d3c', metalness: 0.9, roughness: 0.3 }) : metal); bk.applyMatrix4(seatM(mid)); group.add(bk); } else if (ct === 'snapback') { const g = []; for (let q = 3; q <= 13; q += 1.6) { const k = Math.round(q); const c = new THREE.CylinderGeometry(0.0016, 0.0016, 0.0016, 8); g.push(c.applyMatrix4(seatM({ p: pts[k].clone().addScaledVector(nr[k], 0.0012), n: nr[k], tu: mid.tu }))); } group.add(new THREE.Mesh(merge(g), sm)); } }
  // ---- toppers and cords
  const apex = new THREE.Vector3(...tipP);
  if (spec.topper === 'pompom') { const pm = new THREE.Mesh(new THREE.IcosahedronGeometry(0.043, 3), mats.part('pom')); pm.position.copy(apex).addScaledVector(nv, 0.034); group.add(pm); } else if (spec.topper === 'cap-button') { const b = new THREE.SphereGeometry(0.0085, 14, 8); b.scale(1, 0.45, 1); const m = new THREE.Mesh(b, mats.part('button')); m.applyMatrix4(seatM({ p: apex.clone().addScaledVector(nv, 0.001), n: nv, tu: Xv })); group.add(m); } else if (spec.topper === 'stalk') { const c = new THREE.CylinderGeometry(0.0022, 0.003, 0.016, 8); c.translate(0, 0.008, 0); const m = new THREE.Mesh(c, mats.part('button')); m.applyMatrix4(seatM({ p: apex, n: nv, tu: Xv })); group.add(m); }
  if (spec.chin) { const cm = new THREE.MeshStandardMaterial({ color: new THREE.Color(col('crown')).multiplyScalar(0.5), roughness: 0.8 }); const chinP = new THREE.Vector3(0, top - 0.262, zc + 0.065); for (const s of [1, -1]) { const st = new THREE.Vector3(...at(0, Rb[s > 0 ? NA / 4 : (3 * NA) / 4] + 0.003, s > 0 ? NA / 4 : (3 * NA) / 4)); const c = new THREE.CatmullRomCurve3([st, st.clone().lerp(chinP, 0.5).add(new THREE.Vector3(s * 0.02, -0.01, 0.01)), chinP]).getPoints(20); group.add(new THREE.Mesh(strand(c, c.map(() => new THREE.Vector3(s, 0, 0.3).normalize()), 0.003, 0.003, true), cm)); } const bead = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), cm); bead.position.copy(chinP); group.add(bead); }
  // ---- how it is worn
  const pivot = new THREE.Vector3(O[0] + cu, O[1], O[2]);
  if (back || spec.wear === 'to-one-side') { const R = new THREE.Matrix4(); if (back) R.makeRotationAxis(nv, Math.PI); else R.makeRotationAxis(Fv, -0.2); group.applyMatrix4(new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z).multiply(R).multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z))); }
  return group;
}
