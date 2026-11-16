// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Socks in 3D, built the way a sock machine knits them: one seamless tube on a fixed number of needles.
 *
 * - Welt (cuff): a double layer of rib folded at the top edge, so the top is a rolled fold, not a cut.
 * - Leg: the main stitch (plain, rib, cable, argyle, stripes), the same needles all the way down, so the
 *   knit stretches over the calf and relaxes at the ankle.
 * - Heel pocket: short rows turn the tube through the heel; it is knitted denser (reinforced) and its
 *   edges run diagonally down each side from the back of the ankle to the sole: the gusset lines.
 * - Foot, then the toe pocket, closed by a linked seam across the top of the toes.
 *
 * The tube is swept through exact cross-sections of the wearer's own leg and foot (each section made
 * convex: stretched knit bridges the hollows behind the ankle bone and between the toes), so it fits
 * every body. Every part is cut from that one surface with a clean edge.
 */
import * as THREE from 'three';
import { slice, envelope, convexPolar, clip, geoOf, isoLines, strand, NA } from './shoes3d.js';

const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Sock top height (posed frame) per type, and how deep its rib welt is. */
const CUFF = { 'over-knee': 0.06, 'knee-high': 0.045, crew: 0.035, quarter: 0.02, ankle: 0.016, 'no-show': 0.006 };

/**
 * @param sh     the shell spec from core/legwear.js (type, look, thickness, heel, toe, bands)
 * @param tris   Float32Array, 9 numbers per triangle: the posed leg and foot on this side
 * @param sd     +1 / -1
 * @param yTop   height of the top edge (posed frame, metres)
 * @param makeMat (look) -> THREE.Material, in the viewer's texture units (UV of 1 = 10 cm)
 */
export function buildSock(sh, tris, sd, yTop, makeMat) {
  const group = new THREE.Group();
  // ---- the foot: back of the heel, toe tip, centre line
  let zB = 9; let zT = -9; let cx = 0; let n = 0;
  for (let t = 0; t < tris.length; t += 3) { if (tris[t + 1] < 0.05) { zB = Math.min(zB, tris[t + 2]); zT = Math.max(zT, tris[t + 2]); cx += tris[t]; n++; } }
  if (!n || zT < zB + 0.1) return group;
  cx /= n; const Lf = zT - zB;
  const type = sh.type; const noShow = type === 'no-show';
  const tab = type === 'ankle' ? 0.014 : 0;
  // ---- stations: down the leg (horizontal), fanned round the heel, along the foot (vertical), then the toe
  const yP = 0.095;
  let zFront = -9; { const segs = slice(tris, [cx, yP, 0], [0, 0, -1]); for (let s = 0; s < segs.length; s += 2) zFront = Math.max(zFront, -segs[s + 1]); if (zFront < -8) zFront = zB + Lf * 0.36; }
  const zP = Math.min(zFront + 0.035, zB + Lf * 0.5);
  const st = [];
  const yHigh = Math.max(yTop + tab + 0.012, yP + 0.006);
  for (let y = yHigh; y > yP + 0.0005; y -= 0.005) st.push({ kind: 0, O: [cx, y, zP], D: [0, 0, -1] });
  const NF = 20; for (let j = 0; j < NF; j++) { const ph = (j / NF) * Math.PI / 2; st.push({ kind: 1, O: [cx, yP, zP], D: [0, -Math.sin(ph), -Math.cos(ph)] }); }
  for (let z = zP; z < zT - 0.004; z += 0.004) st.push({ kind: 2, O: [cx, yP, z], D: [0, -1, 0] });
  const gap = 0.0006; const rings = []; let prev = null; const used = [];
  for (const s of st) {
    // heel and foot sections keep only what lies beyond the pivot (below the ankle): on a long sock the shin rises
    // into the first foot planes and must not join the foot's section
    let segs = slice(tris, s.O, s.D); if (s.kind !== 0) { const f = []; for (let q = 0; q < segs.length; q += 4) if (segs[q + 1] > -0.004 && segs[q + 3] > -0.004) f.push(segs[q], segs[q + 1], segs[q + 2], segs[q + 3]); segs = f; }
    const env = envelope(segs, s.kind === 0 ? -1e9 : 0.0005) || prev; if (!env) continue; prev = env;
    const F = [0, -s.D[1], -s.D[2]]; const Rc = convexPolar(env.R); const ring = [];
    for (let i = 0; i < NA; i++) { const a = (i / NA) * Math.PI * 2; const r = Rc[i] + gap; ring.push([s.O[0] + env.cu + Math.sin(a) * r, s.O[1] + env.cv * s.D[1] + Math.cos(a) * r * F[1], s.O[2] + env.cv * s.D[2] + Math.cos(a) * r * F[2]]); }
    rings.push(ring); used.push(s);
  }
  if (rings.length < 10) return group;
  // the toe pocket closes round the toes in a short dome (the knit is pulled over them, a few mm past the tip)
  { const last = rings[rings.length - 1]; const c = [0, 0, 0]; for (const p of last) { c[0] += p[0] / NA; c[1] += p[1] / NA; c[2] += p[2] / NA; }
    for (let q = 1; q <= 6; q++) { const th = (q / 7) * Math.PI / 2; const sc = Math.cos(th); const dz = Math.sin(th) * 0.008; rings.push(last.map((p) => [c[0] + (p[0] - c[0]) * sc, c[1] + (p[1] - c[1]) * sc, p[2] + dz])); used.push({ kind: 2, toe: true }); } }
  // knit under tension lies in even curves: round each section and along the tube
  for (let it = 0; it < 2; it++) for (const ring of rings) { const c = ring.map((p) => p.slice()); for (let i = 0; i < NA; i++) for (let q = 0; q < 3; q++) ring[i][q] = (c[(i - 1 + NA) % NA][q] + 2 * c[i][q] + c[(i + 1) % NA][q]) / 4; }
  for (let it = 0; it < 3; it++) for (let k = 1; k < rings.length - 1; k++) for (let i = 0; i < NA; i++) for (let q = 0; q < 3; q++) rings[k][i][q] = (rings[k - 1][i][q] + 2 * rings[k][i][q] + rings[k + 1][i][q]) / 4;
  // the toe pocket is pulled smooth over the toes: no groove between the big toe and the next
  { const k0 = Math.max(1, rings.length - 26); for (let it = 0; it < 10; it++) for (let k = k0; k < rings.length - 1; k++) for (let i = 0; i < NA; i++) for (let q = 0; q < 2; q++) rings[k][i][q] = (rings[k - 1][i][q] + 2 * rings[k][i][q] + rings[k + 1][i][q]) / 4;
    for (let it = 0; it < 4; it++) for (let k = k0; k < rings.length; k++) { const c = rings[k].map((p) => p.slice()); for (let i = 0; i < NA; i++) for (let q = 0; q < 2; q++) rings[k][i][q] = (c[(i - 1 + NA) % NA][q] + 2 * c[i][q] + c[(i + 1) % NA][q]) / 4; } }
  // ---- the surface: positions, outward normals, and the knit's own coordinates (u round the needles, v down the rows)
  const W1 = NA + 1; const K = rings.length; const N = K * W1 + 1; const P = new Float32Array(N * 3); const Nn = new Float32Array(N * 3); const UV = new Float32Array(N * 2);
  for (let k = 0; k < K; k++) for (let i = 0; i <= NA; i++) P.set(rings[k][i % NA], (k * W1 + i) * 3);
  { const l = rings[K - 1]; const tip = [0, 0, 0]; for (const p of l) { tip[0] += p[0] / NA; tip[1] += p[1] / NA; tip[2] = Math.max(tip[2], p[2]); } tip[2] += 0.0012; P.set(tip, (N - 1) * 3); }
  // the number of needles is fixed: the ankle's round is the knit's natural width, wider sections stretch it
  const circ = (k) => { let s = 0; for (let i = 0; i < NA; i++) { const a = rings[k][i]; const b = rings[k][(i + 1) % NA]; s += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); } return s; };
  let kA = 0; let best = 9; for (let k = 0; k < K; k++) if (used[k].kind === 0 && Math.abs(rings[k][0][1] - 0.11) < best) { best = Math.abs(rings[k][0][1] - 0.11); kA = k; }
  const needlesW = used.some((u) => u.kind === 0) ? circ(kA) : circ(Math.floor(K / 2)) * 0.9;
  const sAt = new Float32Array(K); for (let k = 1; k < K; k++) { let s = 0; for (let i = 0; i < NA; i += 8) { const a = rings[k][i]; const b = rings[k - 1][i]; s += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); } sAt[k] = sAt[k - 1] + s / (NA / 8); }
  // rows: each needle's own column counts its own rows, so the instep knits straight on past the heel while the back
  // needles add the heel's short rows (the pattern carries on unbroken down the front and over the foot)
  { const kH = Math.max(0, used.findIndex((u) => u.kind === 1)); const vcol = new Float64Array(NA);
    for (let k = 0; k < K; k++) for (let i = 0; i <= NA; i++) { const ii = i % NA;
      if (k <= kH) vcol[ii] = sAt[k]; else if (i < NA) { const a = rings[k][ii]; const b = rings[k - 1][ii]; vcol[ii] += Math.hypot(a[1] - b[1], a[2] - b[2], a[0] - b[0]); }
      const v = k * W1 + i; UV[v * 2] = ((i / NA) * needlesW) / 0.1; UV[v * 2 + 1] = -vcol[ii] / 0.1; } }
  UV[(N - 1) * 2] = 0; UV[(N - 1) * 2 + 1] = -(sAt[K - 1] + 0.004) / 0.1;
  const T = []; for (let k = 0; k + 1 < K; k++) for (let i = 0; i < NA; i++) { const a = k * W1 + i; const b = a + 1; const c = a + W1; const d = c + 1; T.push(a, c, b, b, c, d); }
  for (let i = 0; i < NA; i++) T.push((K - 1) * W1 + i, N - 1, (K - 1) * W1 + i + 1);
  for (let t = 0; t < T.length; t += 3) { const a = T[t] * 3; const b = T[t + 1] * 3; const c = T[t + 2] * 3; const ux = P[b] - P[a]; const uy = P[b + 1] - P[a + 1]; const uz = P[b + 2] - P[a + 2]; const vx = P[c] - P[a]; const vy = P[c + 1] - P[a + 1]; const vz = P[c + 2] - P[a + 2]; const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx; for (const q of [a, b, c]) { Nn[q] += nx; Nn[q + 1] += ny; Nn[q + 2] += nz; } }
  for (let k = 0; k < K; k++) { const a = (k * W1) * 3; const b = (k * W1 + NA) * 3; for (let q = 0; q < 3; q++) { const t = Nn[a + q] + Nn[b + q]; Nn[a + q] = t; Nn[b + q] = t; } }
  // normals point away from the leg
  let flip = false; { const k = Math.floor(K / 3); let ccx = 0; let ccy = 0; let ccz = 0; for (let i = 0; i < NA; i++) { ccx += rings[k][i][0] / NA; ccy += rings[k][i][1] / NA; ccz += rings[k][i][2] / NA; } const v = (k * W1 + NA / 4) * 3; flip = Nn[v] * (P[v] - ccx) + Nn[v + 1] * (P[v + 1] - ccy) + Nn[v + 2] * (P[v + 2] - ccz) < 0; }
  for (let v = 0; v < N; v++) { const l = (Math.hypot(Nn[v * 3], Nn[v * 3 + 1], Nn[v * 3 + 2]) || 1) * (flip ? -1 : 1); Nn[v * 3] /= l; Nn[v * 3 + 1] /= l; Nn[v * 3 + 2] /= l; }
  const G = { P, Nn, UV, T: new Uint32Array(T), N, flip: false };
  // ---- where each part of the sock is (positive inside)
  const kFan0 = used.findIndex((u) => u.kind === 1); const kFan1 = used.length - 1 - [...used].reverse().findIndex((u) => u.kind === 1);
  const sF0 = sAt[Math.max(0, kFan0)]; const sF1 = sAt[Math.max(0, kFan1)];
  let kToe = K - 1; for (let k = 0; k < K; k++) if (used[k].kind === 2 && rings[k][0][2] > zT - 0.033) { kToe = k; break; }
  const sToe = sAt[kToe]; let kSeam = K - 1; for (let k = 0; k < K; k++) if (used[k].kind === 2 && rings[k][0][2] > zT - 0.011) { kSeam = k; break; }
  const sSeam = sAt[kSeam];
  const sOf = (v) => (v === N - 1 ? sAt[K - 1] + 0.004 : sAt[Math.floor(v / W1)]);
  const angOf = (v) => (v === N - 1 ? 0 : ((v % W1) / NA) * Math.PI * 2);
  const yOf = (v) => P[v * 3 + 1]; const zOf = (v) => P[v * 3 + 2];
  const M = (fn) => { const m = new Float32Array(N); for (let v = 0; v < N; v++) m[v] = fn(v); return m; };
  // the top edge: level round the leg (the ankle sock's tab rises at the back); a no-show liner is cut low round the
  // heel and along the sides of the foot and covers only the toes in front
  const fOf = (v) => (zOf(v) - zB) / Lf;
  const topLine = (v) => {
    if (noShow) { const f = fOf(v); return f < 0.66 ? 0.055 - 0.029 * sstep(0, 0.45, f) : 0.026 + 0.2 * sstep(0.64, 0.76, f); }
    return yTop + tab * Math.pow(Math.max(0, -Math.cos(angOf(v))), 3);
  };
  const exists = M((v) => topLine(v) - yOf(v));
  const cuffH = CUFF[type] ?? 0.03;
  const cuff = M((v) => Math.min(exists[v], cuffH - exists[v]));
  // heel pocket (Y-heel): the short rows cup the heel, about 6.8 cm up the back and 7.8 cm along the sole; the gusset
  // lines where the short rows turn run diagonally down each side between those two points
  const hu = 0.068 * (Lf / 0.25); const hd = 0.078 * (Lf / 0.25);
  const heel = sh.heel ? M((v) => 0.05 * (1 - (zOf(v) - zB) / hd - yOf(v) / hu)) : null;
  const toe = M((v) => sOf(v) - sToe);
  // a patterned sock (argyle, stripes, prints) carries its pattern on the leg; the foot below the ankle is knitted plain
  const patterned = Boolean(sh.look.motif || sh.look.print);
  const ankleLine = hu + 0.012;
  const sole = patterned ? M((v) => ankleLine - yOf(v)) : null;
  const main = M((v) => Math.min(exists[v], -cuff[v] + (cuffH > 0.008 ? 0 : 1), heel ? -heel[v] : 1, -toe[v], sole ? -sole[v] : 1));
  // ---- the parts, each lifted by its own knit thickness
  const t0 = sh.thickness || 0.0028; const parts = [];
  const look = sh.look; const plainLook = { ...look, pattern: look.pattern === 'fishnet' ? 'fishnet' : 'knit', motif: undefined, print: undefined };
  const bandLook = sh.bands?.[0]?.look || { ...look, pattern: 'rib', patternScale: 8, motif: undefined, print: undefined };
  // the knit goes round the needles a whole number of pattern repeats (no step where the rounds meet); an argyle diamond
  // is about 4.5 cm across and 7 cm tall on a sock
  const add = (mask, lk, off) => { const c = clip(G, mask, off); if (!c.pos.length) return; const m = new THREE.Mesh(geoOf(c), makeMat(lk, { round: needlesW, tile: lk.motif === 'argyle' ? 0.09 : lk.motif === 'stripes' ? 0.12 : null })); m.material.side = THREE.DoubleSide; group.add(m); parts.push(m); };
  add(main, look, t0);
  if (sole) add(M((v) => Math.min(exists[v], sole[v], heel ? -heel[v] : 1, -toe[v])), plainLook, t0 + 0.0002);
  if (cuffH > 0.008) add(cuff, bandLook, t0 + 0.0005);
  if (heel) add(M((v) => Math.min(exists[v], heel[v], -toe[v])), sh.heel?.look ? { ...plainLook, ...sh.heel.look, pattern: plainLook.pattern, motif: undefined } : plainLook, t0 + 0.0003);
  add(M((v) => Math.min(exists[v], toe[v])), sh.toe?.look ? { ...plainLook, ...sh.toe.look, pattern: plainLook.pattern, motif: undefined } : plainLook, t0 + 0.0003);
  // ---- the top edge: the welt is folded, so the edge is a rolled lip of the knit
  const lipCol = new THREE.Color(look.color || '#ffffff');
  const edgeLines = isoLines(G, exists, 0, t0 + 0.0002);
  if (edgeLines.length) { const geos = []; for (const line of edgeLines) { if (line.length < 4) continue; const pts = line.map((q) => q.p); const nors = line.map((q) => q.n); geos.push(strand(pts, nors, 0.0026, 0.0024, true)); }
    if (geos.length) { const m = new THREE.Mesh(geos.length === 1 ? geos[0] : mergeG(geos), makeMat(bandLook)); m.material.side = THREE.DoubleSide; group.add(m); } }
  // the linked toe seam: a soft ridge across the top of the toes, side to side
  { const seam = M((v) => sOf(v) - sSeam); const tops = isoLines(G, seam, 0, t0 + 0.0006, (v) => Math.cos(angOf(v)) > -0.15);
    for (const line of tops) { if (line.length < 4) continue; const g = strand(line.map((q) => q.p), line.map((q) => q.n), 0.0016, 0.0007, true); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: lipCol.clone().multiplyScalar(0.86), roughness: 0.95 })); group.add(m); } }
  group.userData.sock = { yTop, parts: parts.length, sF0, sF1, sToe, sEnd: sAt[K - 1], K, kFan0, kFan1, needlesW };
  return group;
}

function mergeG(geos) {
  const pos = []; const nor = []; const idx = []; let base = 0;
  for (const g of geos) { const p = g.attributes.position; const nn = g.attributes.normal; for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); if (nn) nor.push(nn.getX(i), nn.getY(i), nn.getZ(i)); } if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + base); base += p.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (nor.length === pos.length) g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); if (idx.length) g.setIndex(idx); if (nor.length !== pos.length) g.computeVertexNormals(); return g;
}
