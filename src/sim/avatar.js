// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Body colliders. Fitted to the CC0 MakeHuman mannequin meshes (see
 * scripts/fit-mannequins.mjs): thin elliptical slices for the torso, short
 * capsules along arms and legs, an ellipsoid head. Each collider is
 * { a, b, r, zs, ys }: a capsule from a to b (metres) with radius r, squashed
 * in z by zs and in y by ys.
 *
 * Grading: y scales with height (hs); x/z scale with chest girth above the
 * waist and hip girth below it, blended smoothly. The same transform is
 * applied to the visible mesh, so cloth always sits on the body you see.
 */
import { MANNEQUINS } from './mannequins.js';

export function girthAt(body, yRef) {
  const m = MANNEQUINS[body?.mannequin || 'male'];
  const w = m.landmarks.waistY;
  const t = Math.max(0, Math.min(1, (yRef - (w - 0.12)) / 0.24)); // 0 = hips, 1 = chest
  const gs = body?.gs || 1; const hp = body?.hipS || 1;
  return hp + (gs - hp) * t;
}

/** Map a point from the reference mannequin frame to the graded body. */
export function gradePoint(body, x, y, z) {
  const g = girthAt(body, y);
  return [x * g, y * (body?.hs || 1), z * g];
}

export function buildAvatar(body) {
  const m = MANNEQUINS[body?.mannequin || 'male'];
  const hs = body?.hs || 1;
  return m.colliders.map((c) => {
    const ym = (c.a[1] + c.b[1]) / 2;
    const g = girthAt(body, ym);
    return { a: gradePoint(body, ...c.a), b: gradePoint(body, ...c.b), r: c.r * g, zs: c.zs, ys: (c.ys ?? 1) * (hs / g) };
  });
}

/** Pack colliders as Float32Array [ax,ay,az,bx,by,bz,r,zs,ys]*n for the solver. */
export function packColliders(colliders) {
  const out = new Float32Array(colliders.length * 9);
  colliders.forEach((c, i) => out.set([...c.a, ...c.b, c.r, c.zs ?? 1, c.ys ?? 1], i * 9));
  return out;
}

/**
 * Height bins: for each 3 cm band of y, the colliders that can touch it.
 * Lets the solver test ~5 colliders per particle instead of all of them.
 */
export function binColliders(col, margin = 0.03) {
  const c = col.length / 9;
  const y0 = -0.1; const binH = 0.03; const nb = 80; // covers -0.1 .. 2.3 m
  const lists = Array.from({ length: nb }, () => []);
  for (let k = 0; k < c; k++) {
    const o = k * 9;
    const ext = col[o + 6] * col[o + 8] + margin;
    const lo = Math.min(col[o + 1], col[o + 4]) - ext; const hi = Math.max(col[o + 1], col[o + 4]) + ext;
    const b0 = Math.max(0, Math.floor((lo - y0) / binH)); const b1 = Math.min(nb - 1, Math.floor((hi - y0) / binH));
    for (let b = b0; b <= b1; b++) lists[b].push(k);
  }
  const start = new Uint32Array(nb + 1); const idx = [];
  for (let b = 0; b < nb; b++) { start[b] = idx.length; idx.push(...lists[b]); }
  start[nb] = idx.length;
  return { nb, start, idx: new Uint32Array(idx.length ? idx : [0]), y0, inv: 1 / binH };
}
