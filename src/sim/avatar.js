// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Parametric avatar built from capsules (T-pose, metres, ~1.75m tall).
 * Each collider: { a:[x,y,z], b:[x,y,z], r, zs } where zs squashes depth to
 * make elliptical cross-sections (chest/hips are wider than deep).
 */
export function buildAvatar(body) {
  // body from sizes.js: hs = height scale, gs = chest girth, hipS = hip girth
  const hs = body?.hs || 1; const gs = body?.gs || 1; const hp = body?.hipS || 1; const hd = (body?.head || 58) / 58;
  const C = (a, b, r, zs = 1, g = gs) => ({ a: [a[0] * g, a[1] * hs, a[2] * g], b: [b[0] * g, b[1] * hs, b[2] * g], r: r * g, zs });
  return [
    C([0, 1.665, 0], [0, 1.665, 0], 0.1 * hd / gs), // head (sphere)
    C([0, 1.47, 0], [0, 1.56, 0], 0.055), // neck
    C([0, 1.08, 0], [0, 1.3, 0], 0.16, 0.66), // torso
    C([-0.17, 1.38, 0], [0.17, 1.38, 0], 0.075), // shoulders
    C([-0.08, 1.24, 0.01], [0.08, 1.24, 0.01], 0.12, 0.85), // chest
    C([0.17, 1.38, 0], [0.72, 1.38, 0], 0.05), // right arm
    C([-0.17, 1.38, 0], [-0.72, 1.38, 0], 0.05), // left arm
    C([-0.06, 0.93, -0.01], [0.06, 0.93, -0.01], 0.125, 1.05, hp), // hips (37 cm wide, 26 cm deep)
    C([0.1, 0.9, 0], [0.1, 0.08, 0], 0.068, 1, hp), // right leg
    C([-0.1, 0.9, 0], [-0.1, 0.08, 0], 0.068, 1, hp), // left leg
  ];
}

/** Pack colliders as Float32Array [ax,ay,az,bx,by,bz,r,zs]*n for the solver. */
export function packColliders(colliders) {
  const out = new Float32Array(colliders.length * 8);
  colliders.forEach((c, i) => out.set([...c.a, ...c.b, c.r, c.zs], i * 8));
  return out;
}
