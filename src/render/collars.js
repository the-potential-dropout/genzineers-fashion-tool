// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Collars, neckbands and hoods as real 3D pieces.
 *
 * Each one is swept along the sewn neckline of the simulated garment: a stand
 * that rises from the neck seam, a fold, and a fall that turns back down and
 * out to the collar points (or, for hoods, a pouch that lies on the upper
 * back). It follows the cloth every frame, so it moves with the drape.
 */
import * as THREE from 'three';

const cm = 0.01;
const smooth = (u) => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t); };

/**
 * @param spec      collar spec from the generator ({ kind, style, stand, fall, point, spread, flat, paths })
 * @param stations  ordered neckline anchors [{ ids, w }] going from one front end, round the back, to the other
 * @returns { group, update(P, N) }
 */
export function buildCollar(spec, stations, material, edgeColor, threadColor) {
  const n = stations.length;
  const hood = spec.kind === 'hood';
  const band = spec.kind === 'neckband';
  const standOnly = !hood && !band && !spec.fall;
  // profile rows from the neck seam outwards
  const rows = band ? 3 : hood ? 9 : standOnly ? 3 : 7;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(n * rows * 3);
  const uv = new Float32Array(n * rows * 2);
  for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) { uv[(i * rows + j) * 2] = (i / n) * 4; uv[(i * rows + j) * 2 + 1] = (j / (rows - 1)) * (hood ? 3 : 0.6); }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const idx = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < rows - 1; j++) { const a = i * rows + j; const b = a + rows; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  const group = new THREE.Group();
  group.add(mesh);
  // crisp outer edge + a row of topstitching just inside it
  const mkLine = (count, color, seg) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3)); const l = new (seg ? THREE.LineSegments : THREE.Line)(g, new THREE.LineBasicMaterial({ color })); l.frustumCulled = false; group.add(l); return l; };
  const edge = mkLine(n + (hood ? 0 : 2 * (rows - 1)), edgeColor, false);
  const stitch = band || hood ? null : mkLine(n - (n % 2), threadColor, true);

  const ring = new Float32Array(n * 3);
  const out = new Float32Array(n * 3);
  const tan = new Float32Array(n * 3);
  const ang = new Float32Array(n);
  const update = (P) => {
    let cx = 0; let cy = 0; let cz = 0;
    for (let i = 0; i < n; i++) {
      const a = stations[i]; let x = 0; let y = 0; let z = 0;
      for (let k = 0; k < a.ids.length; k++) { const q = a.ids[k] * 3; x += P[q] * a.w[k]; y += P[q + 1] * a.w[k]; z += P[q + 2] * a.w[k]; }
      ring[i * 3] = x; ring[i * 3 + 1] = y; ring[i * 3 + 2] = z; cx += x; cy += y; cz += z;
    }
    cx /= n; cy /= n; cz /= n;
    // light smoothing so the collar line is clean where panels meet
    for (let it = 0; it < 2; it++) for (let i = 1; i < n - 1; i++) for (let c = 0; c < 3; c++) ring[i * 3 + c] = (ring[(i - 1) * 3 + c] + 2 * ring[i * 3 + c] + ring[(i + 1) * 3 + c]) / 4;
    let amax = 0;
    for (let i = 0; i < n; i++) {
      let ox = ring[i * 3] - cx; let oz = ring[i * 3 + 2] - cz; const l = Math.hypot(ox, oz) || 1; ox /= l; oz /= l;
      out[i * 3] = ox; out[i * 3 + 2] = oz;
      const p = Math.max(0, i - 1); const q = Math.min(n - 1, i + 1);
      let tx = ring[q * 3] - ring[p * 3]; let ty = ring[q * 3 + 1] - ring[p * 3 + 1]; let tz = ring[q * 3 + 2] - ring[p * 3 + 2]; const tl = Math.hypot(tx, ty, tz) || 1;
      tan[i * 3] = tx / tl; tan[i * 3 + 1] = ty / tl; tan[i * 3 + 2] = tz / tl;
      ang[i] = Math.atan2(ring[i * 3] - cx, -(ring[i * 3 + 2] - cz)); // 0 = centre back, +-PI = centre front
      amax = Math.max(amax, Math.abs(ang[i]));
    }
    const put = (i, j, r, h, s = 0) => {
      const o = (i * rows + j) * 3; const sg = ang[i] >= 0 ? -1 : 1; // shift towards the back of the neck
      pos[o] = ring[i * 3] + out[i * 3] * r + tan[i * 3] * s * sg;
      pos[o + 1] = ring[i * 3 + 1] + h + tan[i * 3 + 1] * s * sg * 0.3;
      pos[o + 2] = ring[i * 3 + 2] + out[i * 3 + 2] * r + tan[i * 3 + 2] * s * sg;
    };
    for (let i = 0; i < n; i++) {
      const a = Math.abs(ang[i]);
      const wf = smooth((a - amax * 0.5) / (amax * 0.5 || 1)); // 0 at the back, 1 at the front ends
      if (band) {
        // rib neckband: lies just inside the neck edge, slightly raised
        const s = spec.stand * cm;
        put(i, 0, 0.002, 0.001); put(i, 1, -s * 0.5, 0.004); put(i, 2, -s, 0.002);
      } else if (hood) {
        // hood worn down: a soft pouch that falls from the neck onto the upper back
        const wb = 1 - smooth(a / (amax * 0.85 || 1)); // 1 at centre back
        const drop = (9 + 24 * wb) * cm; const bulge = (2.5 + 7 * wb) * cm; const roll = (2.2 + 1.5 * wb) * cm;
        for (let j = 0; j < rows; j++) {
          const u = j / (rows - 1);
          const r = 0.004 + bulge * Math.sin(Math.PI * Math.min(1, u * 1.08)) * (0.6 + 0.4 * u) + roll * Math.sin(Math.PI * u) * 0.3;
          const h = roll * Math.sin(Math.PI * Math.min(1, u * 2.2)) * 0.9 - drop * Math.pow(u, 1.25);
          put(i, j, r, h, (1 - wb) * u * 0.03);
        }
      } else if (standOnly) {
        const s = spec.stand * cm; const lean = spec.lean ?? 0.12;
        put(i, 0, 0.0015, -0.004); put(i, 1, 0.0015 - s * lean * 0.5, s * 0.5); put(i, 2, 0.0015 - s * lean, s);
      } else {
        const s = spec.stand * cm;
        const f = (spec.fall + ((spec.point ?? spec.fall) - spec.fall) * wf * wf) * cm;
        const fl = ((spec.flare ?? (spec.flat ? 62 : 24)) + 14 * wf) * (Math.PI / 180); // how far the fall lies away from the stand
        const sh = (spec.spread || 0) * cm * wf * wf;
        put(i, 0, 0.0015, -0.004);
        put(i, 1, 0.0015 - s * 0.06, s * 0.55);
        put(i, 2, 0.0015 - s * 0.1, s);
        put(i, 3, 0.006, s + 0.003, sh * 0.1); // fold
        put(i, 4, 0.008 + f * 0.33 * Math.sin(fl), s - f * 0.33 * Math.cos(fl), sh * 0.4);
        put(i, 5, 0.008 + f * 0.7 * Math.sin(fl), s - f * 0.7 * Math.cos(fl), sh * 0.75);
        put(i, 6, 0.008 + f * Math.sin(fl), s - f * Math.cos(fl), sh);
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();
    // outline: up one end, along the outer edge, down the other end
    const ep = edge.geometry.attributes.position.array; let e = 0;
    const cp = (i, j) => { const o = (i * rows + j) * 3; ep[e++] = pos[o]; ep[e++] = pos[o + 1]; ep[e++] = pos[o + 2]; };
    if (!hood) for (let j = 0; j < rows - 1; j++) cp(0, j);
    for (let i = 0; i < n; i++) cp(i, rows - 1);
    if (!hood) for (let j = rows - 2; j >= 0; j--) cp(n - 1, j);
    edge.geometry.attributes.position.needsUpdate = true;
    if (stitch) {
      const sp = stitch.geometry.attributes.position.array; const m = n - (n % 2);
      for (let i = 0; i < m; i++) { const a = (i * rows + rows - 1) * 3; const b = (i * rows + rows - 2) * 3; for (let c = 0; c < 3; c++) sp[i * 3 + c] = pos[a + c] * 0.72 + pos[b + c] * 0.28 + (c === 1 ? 0.0006 : 0); }
      stitch.geometry.attributes.position.needsUpdate = true;
    }
  };
  return { group, update };
}
