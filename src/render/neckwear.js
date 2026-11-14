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
