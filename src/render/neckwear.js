// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Neckwear that is tied, not cut flat: the knot of a necktie and a whole bow
 * tie are modelled as the folded, wrapped shapes they really are.
 * Units: metres. x across the body, y up, z out from the chest.
 */
import * as THREE from 'three';

const cm = 0.01;
function loft(rows, mat, closed = true) {
  // rows: arrays of [x, y, z] of equal length; closed = each row is a ring
  const n = rows[0].length; const pos = []; const idx = [];
  for (const r of rows) for (const p of r) pos.push(p[0], p[1], p[2]);
  for (let i = 0; i + 1 < rows.length; i++) for (let j = 0; j < (closed ? n : n - 1); j++) { const a = i * n + j; const b = i * n + (j + 1) % n; const c = a + n; const d = b + n; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; return m;
}

export const TIE_KNOTS = {
  'four-in-hand': { name: 'Four-in-hand', top: 3.7, bottom: 2.7, height: 4.3, depth: 1.5, lean: 0.35, note: 'Small, slightly asymmetric; the everyday knot, suits most collars.' },
  'half-windsor': { name: 'Half Windsor', top: 4.6, bottom: 2.9, height: 4.4, depth: 1.7, lean: 0.1, note: 'Medium triangular knot; spread and semi-spread collars.' },
  windsor: { name: 'Full Windsor', top: 5.7, bottom: 3.1, height: 4.7, depth: 1.9, lean: 0, note: 'Wide symmetric triangle; cutaway collars, formal.' },
  pratt: { name: 'Pratt (Shelby)', top: 4.3, bottom: 2.8, height: 4.1, depth: 1.5, lean: 0.05, note: 'Neat, symmetric, uses less length; tied inside-out.' },
  kelvin: { name: 'Kelvin', top: 3.9, bottom: 2.7, height: 4.6, depth: 1.6, lean: 0.25, note: 'A fuller four-in-hand; narrow collars.' },
  eldredge: { name: 'Eldredge', top: 5.2, bottom: 2.9, height: 5.4, depth: 2, lean: 0, braided: true, note: 'Ornate braided knot tied with the narrow end.' },
};
export const BOW_STYLES = {
  butterfly: { name: 'Butterfly (thistle)', len: 5.6, h: (u) => 1.15 + 2.5 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.12)), 0.9), note: 'The classic bow: flared wings, about 6 cm tall.' },
  'big-butterfly': { name: 'Big butterfly', len: 6.8, h: (u) => 1.3 + 3.3 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.1)), 0.9), note: 'Larger, more dramatic wings.' },
  batwing: { name: 'Batwing (straight)', len: 5.4, h: (u) => 1.2 + 0.75 * u, note: 'Slim straight wings, about 4 cm tall; modern, with dinner jackets.' },
  diamond: { name: 'Diamond point', len: 6, h: (u) => (u < 0.72 ? 1.15 + 2.3 * Math.sin(Math.PI * u * 0.62) : (1.15 + 2.3 * Math.sin(Math.PI * 0.72 * 0.62)) * (1 - (u - 0.72) / 0.28 * 0.86)), note: 'Wings finish in a point; asymmetric when self-tied.' },
  rounded: { name: 'Rounded club', len: 5.2, h: (u) => 1.2 + 1.9 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.95)), 0.6), note: 'Soft rounded ends.' },
};

/** The knot of a necktie: a wrapped, tapering wedge with the diagonal lap showing across it. */
export function tieKnot(style, mat, edgeColor) {
  const k = TIE_KNOTS[style] || TIE_KNOTS['four-in-hand'];
  const rows = []; const R = 10; const N = 20;
  for (let i = 0; i <= R; i++) {
    const u = i / R; // 0 top (at the collar) -> 1 bottom (where the blade leaves)
    const w = (k.top + (k.bottom - k.top) * Math.pow(u, 0.85)) * cm * (1 - 0.1 * Math.pow(1 - u, 6)); // shoulders rounded at the very top
    const d = (k.depth * (1 - 0.25 * u)) * cm;
    const y = -u * k.height * cm; const xo = k.lean * cm * (1 - u);
    const ring = [];
    for (let j = 0; j < N; j++) { const a = (j / N) * Math.PI * 2; const sx = Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 0.7); const sz = Math.sin(a); ring.push([xo + sx * w / 2, y, (sz > 0 ? sz * d * 0.62 : sz * d * 0.3) + (sz > 0 ? 0.0012 * Math.sin(u * Math.PI) : 0)]); }
    rows.push(ring);
  }
  const g = new THREE.Group(); g.add(loft(rows, mat));
  // the lap of the final wrap: a diagonal fold across the face of the knot
  const lap = []; for (let t = 0; t <= 12; t++) { const u = t / 12; const y = -(0.18 + 0.5 * u) * k.height * cm; const w = (k.top + (k.bottom - k.top) * (0.18 + 0.5 * u)) * cm; lap.push(new THREE.Vector3((u - 0.5) * w * 0.92 + k.lean * cm * 0.5, y, k.depth * cm * 0.62 * (1 - 0.25 * (0.18 + 0.5 * u)) * Math.sqrt(Math.max(0.05, 1 - Math.pow((u - 0.5) * 1.84, 2))) + 0.0016)); }
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lap), new THREE.LineBasicMaterial({ color: edgeColor })));
  if (k.braided) for (const s of [-1, 1]) { const b = lap.map((p, i) => new THREE.Vector3(p.x * s * 0.8, p.y - (i / 12) * 0.012, p.z)); g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(b), new THREE.LineBasicMaterial({ color: edgeColor }))); }
  g.userData.height = k.height * cm;
  return g;
}

/** A tied bow tie: two puffed, pleated wings pinched under a centre knot. */
export function bowTie(style, mat, edgeColor, scale = 1) {
  const b = BOW_STYLES[style] || BOW_STYLES.butterfly;
  const g = new THREE.Group(); const NU = 18; const NV = 10;
  for (const sd of [1, -1]) {
    for (const face of [1, -1]) {
      const rows = [];
      for (let i = 0; i <= NU; i++) {
        const u = i / NU; const hh = b.h(u) * cm * scale; const row = [];
        for (let j = 0; j <= NV; j++) {
          const v = (j / NV) * 2 - 1;
          const puff = 0.85 * cm * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.02)), 0.8) * Math.sqrt(Math.max(0, 1 - v * v)); // the loop of cloth is full in the middle
          const pleat = 0.28 * cm * Math.cos(3 * Math.PI * v) * Math.pow(1 - u, 2.2); // gathered pleats run out from the knot
          row.push([sd * (0.75 + u * b.len) * cm * scale, v * hh, face > 0 ? 0.0025 + puff + pleat : -0.001 - puff * 0.55 + pleat * 0.5]);
        }
        rows.push(row);
      }
      g.add(loft(rows, mat, false));
    }
    // rolled edge at the wing tip and along top and bottom
    const edge = []; for (let i = 0; i <= NU; i++) { const u = i / NU; edge.push(new THREE.Vector3(sd * (0.75 + u * b.len) * cm * scale, b.h(u) * cm * scale, 0.001)); } for (let j = NV; j >= 0; j--) { const v = (j / NV) * 2 - 1; edge.push(new THREE.Vector3(sd * (0.75 + b.len) * cm * scale, v * b.h(1) * cm * scale, 0.001)); } for (let i = NU; i >= 0; i--) { const u = i / NU; edge.push(new THREE.Vector3(sd * (0.75 + u * b.len) * cm * scale, -b.h(u) * cm * scale, 0.001)); }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(edge), new THREE.LineBasicMaterial({ color: edgeColor })));
  }
  // centre knot: the band wrapped once round the gathered middle
  const rows = []; const N = 18;
  for (let i = 0; i <= 8; i++) { const u = i / 8; const y = (u - 0.5) * 2.6 * cm * scale; const w = (1.75 - 0.25 * Math.pow(Math.abs(u - 0.5) * 2, 2)) * cm * scale; const ring = []; for (let j = 0; j < N; j++) { const a = (j / N) * Math.PI * 2; ring.push([Math.cos(a) * w / 2, y, Math.sin(a) * 0.95 * cm * scale + 0.002]); } rows.push(ring); }
  g.add(loft(rows, mat));
  return g;
}

// ---------------------------------------------------------------------------
// A necktie tied the way it is really tied.
//
// The knot is not a shaped block: it is the tie itself, a band of cloth with
// thickness, led through the actual tying sequence of each knot. Waypoints
// are in cm from the centre of the knot (x across, y up, z towards the
// viewer), each with the direction the face of the cloth points.
// "W" is the wide (active) end, which starts at the wearer's right side of
// the neck loop; the narrow end drops straight through the middle.
// ---------------------------------------------------------------------------
const P = (x, y, z, nx, ny, nz) => ({ p: [x, y, z], n: [nx, ny, nz] });
const FINISH = [ // every knot ends the same way: up behind the neck loop, over it, and down through the front band
  P(0.5, 2.0, -0.55, 0, 0.3, -1), P(0, 2.95, -0.05, 0, 1, 0.1), P(0, 2.05, 0.72, 0, 0.3, 1), P(0, 0.6, 0.74, 0, 0, 1), P(0, -1.7, 0.78, 0, -0.1, 1), P(0, -2.7, 0.62, 0, -0.1, 1),
];
export const TIE_PATHS = {
  // over the narrow end, round behind it, across the front, then finish
  'four-in-hand': { w: 3.3, steps: 'Wide end over the narrow end, behind it, across the front, up through the neck loop from behind, down through the front band.', pts: [
    P(-1.6, 3.2, -0.2, 0, 0, 1), P(-0.9, 1.6, 0.35, 0, 0.2, 1), P(1.45, 0.2, 0.5, 0.6, 0, 0.8), P(1.7, -0.4, -0.2, 1, 0, 0), P(0, -0.7, -0.75, 0, 0, -1), P(-1.7, -0.4, -0.2, -1, 0, 0),
    P(-1.5, 0.3, 0.75, -0.5, 0, 0.85), P(0, 0.55, 1.05, 0, 0, 1), P(1.5, 0.75, 0.8, 0.5, 0, 0.85), P(1.6, 1.25, 0, 1, 0.2, 0), ...FINISH] },
  // four-in-hand with a second turn round the back before crossing the front
  kelvin: { w: 3.3, steps: 'Seam out: wide end under the narrow end, over, under again, across the front, up through the neck loop, down through the band.', pts: [
    P(-1.6, 3.2, -0.2, 0, 0, 1), P(-0.9, 1.6, -0.45, 0, 0.2, -1), P(1.5, 0.3, -0.5, 0.6, 0, -0.8), P(1.75, -0.3, 0.2, 1, 0, 0), P(0, -0.5, 0.7, 0, 0, 1), P(-1.75, -0.4, 0.2, -1, 0, 0), P(0, -0.8, -0.8, 0, 0, -1), P(1.7, -0.5, -0.2, 1, 0, 0),
    P(1.5, 0.4, 0.8, 0.5, 0, 0.85), P(0, 0.6, 1.1, 0, 0, 1), P(-1.5, 0.75, 0.8, -0.5, 0, 0.85), P(-1.6, 1.25, 0, -1, 0.2, 0), ...FINISH] },
  // one extra pass over the neck loop on one side makes the knot fuller and triangular
  'half-windsor': { w: 3.4, steps: 'Wide end over the narrow end, behind it, up and over the neck loop and down to the side, across the front, up through the neck loop from behind, down through the band.', pts: [
    P(-1.6, 3.2, -0.2, 0, 0, 1), P(-0.8, 1.7, 0.4, 0, 0.2, 1), P(1.5, 0.5, 0.5, 0.6, 0, 0.8), P(1.8, -0.2, -0.2, 1, 0, 0), P(0, -0.6, -0.8, 0, 0, -1), P(-1.5, 0.2, -0.5, -0.6, 0.3, -0.7),
    P(-1.3, 1.9, -0.2, -0.3, 1, 0), P(-1.5, 1.7, 0.55, -0.4, 0.4, 0.8), P(-2.0, 0.5, 0.55, -0.8, 0, 0.6), P(-2.1, 0.0, 0.0, -1, 0, 0),
    P(-1.9, 0.35, 0.85, -0.5, 0, 0.85), P(0, 0.6, 1.15, 0, 0, 1), P(1.9, 0.75, 0.85, 0.5, 0, 0.85), P(1.9, 1.3, 0, 1, 0.2, 0), ...FINISH] },
  // a pass over the neck loop on BOTH sides: wide, symmetric triangle
  windsor: { w: 3.5, steps: 'Wide end over the narrow end, up through the neck loop and down to one side, behind the knot to the other side, up and over the neck loop and down, across the front, up through the neck loop from behind, down through the band.', pts: [
    P(-1.6, 3.2, -0.2, 0, 0, 1), P(-0.6, 1.8, 0.45, 0, 0.2, 1), P(1.0, 1.3, 0.5, 0.3, 0.2, 0.9), P(0.5, 2.2, -0.45, 0, 0.4, -0.9), P(0.2, 3.0, -0.05, 0, 1, 0), P(-1.2, 2.0, 0.6, -0.3, 0.4, 0.85),
    P(-2.2, 0.7, 0.55, -0.8, 0, 0.6), P(-2.45, 0.0, -0.1, -1, 0, 0), P(0, -0.6, -0.85, 0, 0, -1), P(2.45, 0.0, -0.1, 1, 0, 0), P(2.2, 0.9, 0.55, 0.8, 0.1, 0.6),
    P(1.3, 2.3, 0.35, 0.3, 0.8, 0.5), P(1.2, 2.2, -0.5, 0.3, 0.3, -0.9), P(2.3, 0.9, -0.3, 0.9, 0, -0.4), P(2.5, 0.3, 0.2, 1, 0, 0.2),
    P(2.2, 0.45, 0.95, 0.5, 0, 0.85), P(0, 0.7, 1.25, 0, 0, 1), P(-2.2, 0.85, 0.95, -0.5, 0, 0.85), P(-2.2, 1.4, 0.1, -1, 0.2, 0), ...FINISH] },
  // starts seam-out: under, over the loop and down, then across and through
  pratt: { w: 3.3, steps: 'Seam out: wide end under the narrow end, up and over the neck loop and down, across the front, up through the neck loop from behind, down through the band.', pts: [
    P(-1.6, 3.2, -0.2, 0, 0, -1), P(-0.7, 1.7, -0.45, 0, 0.2, -1), P(0.9, 1.2, -0.5, 0.3, 0.2, -0.9), P(0.5, 2.6, -0.15, 0, 1, 0), P(0.6, 2.0, 0.55, 0.1, 0.4, 0.85), P(1.6, 0.6, 0.6, 0.7, 0, 0.7), P(1.9, 0.1, 0.0, 1, 0, 0),
    P(1.7, 0.35, 0.85, 0.5, 0, 0.85), P(0, 0.6, 1.1, 0, 0, 1), P(-1.7, 0.75, 0.85, -0.5, 0, 0.85), P(-1.7, 1.25, 0, -1, 0.2, 0), ...FINISH] },
};
TIE_PATHS.eldredge = TIE_PATHS.windsor;

/** A band of cloth with thickness swept along a centreline. pts: Vector3[], nrm: Vector3[] (face direction), half(i): half width in m. */
export function clothBand(pts, nrm, half, thick, mat, uvScale = 10) {
  const n = pts.length; const ACR = 5; const pos = []; const uv = []; const idx = [];
  const T = new THREE.Vector3(); const B = new THREE.Vector3(); const N = new THREE.Vector3(); let run = 0;
  for (let i = 0; i < n; i++) {
    T.copy(pts[Math.min(n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize();
    N.copy(nrm[i]).addScaledVector(T, -nrm[i].dot(T)).normalize();
    B.crossVectors(T, N).normalize();
    if (i) run += pts[i].distanceTo(pts[i - 1]);
    const hw = half(i);
    for (const face of [1, -1]) for (let a = 0; a < ACR; a++) {
      const k = (a / (ACR - 1)) * 2 - 1; // -1..1 across the band
      const cup = (1 - k * k) * thick * 0.35; // a soft roll across the cloth, like a lined tie
      const o = face * (thick / 2) + cup;
      pos.push(pts[i].x + B.x * k * hw + N.x * o, pts[i].y + B.y * k * hw + N.y * o, pts[i].z + B.z * k * hw + N.z * o);
      uv.push((k * hw + 0.05) * uvScale, run * uvScale);
    }
  }
  const row = ACR * 2;
  for (let i = 0; i + 1 < n; i++) {
    for (let f = 0; f < 2; f++) for (let a = 0; a < ACR - 1; a++) { const p = i * row + f * ACR + a; const q = p + row; if (f === 0) idx.push(p, q, p + 1, p + 1, q, q + 1); else idx.push(p, p + 1, q, p + 1, q + 1, q); }
    // the two folded edges
    for (const [a, b] of [[0, ACR], [ACR - 1, 2 * ACR - 1]]) { const p = i * row + a; const p2 = i * row + b; idx.push(p, p2, p + row, p2, p2 + row, p + row); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; return m;
}

/**
 * Build the tied part of a necktie in world space.
 * origin: centre of the knot (Vector3). opts: { style, thick (m), bladeAt (cm width where the blade leaves the knot), tail (cm), hug(points, lift) }.
 * Returns { group, exit: Vector3 (where the hanging blade begins) }.
 */
export function tiedTie(origin, opts, mat) {
  const path = TIE_PATHS[opts.style] || TIE_PATHS['four-in-hand'];
  const thick = opts.thick || 0.0024;
  const group = new THREE.Group();
  const sample = (way, per = 9) => {
    const curve = new THREE.CatmullRomCurve3(way.map((w) => new THREE.Vector3(origin.x + w.p[0] * cm, origin.y + w.p[1] * cm, origin.z + w.p[2] * cm)), false, 'centripetal');
    const N = (way.length - 1) * per; const pts = curve.getPoints(N); const nrm = [];
    for (let i = 0; i <= N; i++) { const f = i / per; const a = way[Math.min(way.length - 1, Math.floor(f))].n; const b = way[Math.min(way.length - 1, Math.ceil(f))].n; const t = f - Math.floor(f); nrm.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t).normalize()); }
    return { pts, nrm };
  };
  // wide end through the knot: gathered narrower where it is wrapped tight, opening as it leaves
  const W = sample(path.pts);
  const nW = W.pts.length; const exitW = (opts.bladeAt || 2.9) * cm / 2;
  group.add(clothBand(W.pts, W.nrm, (i) => { const u = i / (nW - 1); return (path.w / 2) * cm * (0.92 + 0.08 * Math.cos(u * Math.PI * 2)) * (u > 0.9 ? 1 - (u - 0.9) * 10 * (1 - exitW / ((path.w / 2) * cm)) : 1); }, thick, mat));
  // narrow end: straight down through the middle of the knot, then the tail hangs behind the blade
  const tail = Math.max(8, opts.tail || 26);
  const way = [P(1.6, 3.2, -0.4, 0, 0, 1), P(0.6, 1.6, -0.3, 0, 0.2, 1), P(0, 0.2, -0.25, 0, 0, 1), P(0, -2.4, -0.2, 0, 0, 1), P(0, -2.4 - tail * 0.5, -0.1, 0, 0, 1), P(0, -2.4 - tail, -0.1, 0, 0, 1)];
  const S = sample(way, 8);
  if (opts.hug) opts.hug(S.pts.slice(Math.round(S.pts.length * 0.62)), 0.004);
  const nS = S.pts.length;
  group.add(clothBand(S.pts, S.nrm, (i) => { const u = i / (nS - 1); const w = (u < 0.5 ? 1.45 : 1.45 + (u - 0.5) * 1.0) * cm; return u > 0.94 ? w * (1 - (u - 0.94) / 0.06 * 0.98) : w; }, thick * 0.85, mat));
  return { group, exit: W.pts[nW - 1].clone() };
}
