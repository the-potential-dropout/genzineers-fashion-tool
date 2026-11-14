// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Body model. The CC0 MakeHuman mannequins (male / female) are graded to any
 * body with one transform shared by the visible mesh, the collision shapes and
 * the pattern landmarks, so cloth always sits on the body you see.
 *
 * Grading:
 *  - vertical: legs scale with inseam, torso + head with the remaining height
 *  - girth: piecewise between thigh, hip, waist, underbust, chest, shoulders
 *  - arms: shoulder width moves the arm root, arm length stretches the arm
 *
 * Colliders are { a, b, r, zs, ys }: capsules squashed in z and y.
 */
import { MANNEQUINS } from './mannequins.js';

/** Reference measurements of the mannequins (cm), the "1.0" of every scale. */
export const REF_BODY = {
  male: { height: 175, inseam: 80, chest: 94, underbust: 88, waist: 80, hip: 100, thigh: 56, shoulder: 46, arm: 61, neck: 38, head: 58, weight: 72 },
  female: { height: 175, inseam: 80, chest: 90, underbust: 75, waist: 72, hip: 98, thigh: 56, shoulder: 40, arm: 57, neck: 34, head: 56, weight: 64 },
};

/** Per-region scales for a measurement set (missing values fall back sensibly). */
export function bodyScales(m, mannequin = 'male') {
  const R = REF_BODY[mannequin];
  const L = MANNEQUINS[mannequin].landmarks;
  const chestS = (m.chest || R.chest) / R.chest;
  const hipS = (m.hip || R.hip) / R.hip;
  const waistS = (m.waist || R.waist * chestS) / R.waist;
  const underS = (m.underbust || R.underbust * (chestS * 0.6 + waistS * 0.4)) / R.underbust;
  const thighS = (m.thigh || R.thigh * hipS) / R.thigh;
  const shoulderS = (m.shoulder || R.shoulder * Math.sqrt(chestS)) / R.shoulder;
  const legS = ((m.inseam || R.inseam) / R.inseam) * 0.92 + 0.08 * ((m.height || R.height) / R.height);
  const crotch = L.crotchY;
  const torsoS = ((m.height || R.height) / 100 - crotch * legS) / (1.75 - crotch);
  const armS = (m.arm || R.arm * ((m.height || R.height) / R.height)) / R.arm;
  return { chestS, hipS, waistS, underS, thighS, shoulderS, legS, torsoS, armS, crotch, L };
}

/** Girth scale at a reference height y (piecewise linear between landmarks). */
export function girthAt(body, y) {
  const s = body?._scales || bodyScales(body || {}, body?.mannequin || 'male');
  const L = s.L;
  const pts = [
    [0, s.thighS * 0.9 + 0.1], [L.crotchY - 0.12, s.thighS], [L.crotchY + 0.06, s.hipS], [L.waistY, s.waistS],
    [(L.waistY + L.armY) / 2 + 0.03, s.underS], [L.armY - 0.1, s.chestS], [L.armY + 0.04, s.shoulderS * 0.5 + s.chestS * 0.5], [L.neckBase, 1 + (s.chestS - 1) * 0.3], [9, 1],
  ];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [y0, g0] = pts[i - 1]; const [y1, g1] = pts[i]; const t = (y - y0) / (y1 - y0 || 1); return g0 + (g1 - g0) * Math.max(0, Math.min(1, t)); }
  return 1;
}

/** Map a point from the reference mannequin frame to the graded body. */
export function gradePoint(body, x, y, z) {
  const s = body?._scales || bodyScales(body || {}, body?.mannequin || 'male');
  const L = s.L;
  const ny = y < s.crotch ? y * s.legS : s.crotch * s.legS + (y - s.crotch) * s.torsoS;
  // arms (T-pose along x): move the root with the shoulders, stretch with arm length
  if (Math.abs(x) > L.armStartX && Math.abs(y - L.armY) < 0.14) {
    const sx = Math.sign(x);
    const root = L.armStartX * s.shoulderS;
    const nx = sx * (root + (Math.abs(x) - L.armStartX) * s.armS);
    const ag = Math.sqrt(s.chestS); // arm girth follows the body gently
    const nArmY = s.crotch * s.legS + (L.armY - s.crotch) * s.torsoS;
    return [nx, nArmY + (y - L.armY) * ag, z * ag];
  }
  const g = girthAt(body, y);
  const sw = y > L.armY - 0.15 ? 1 + (s.shoulderS - 1) * Math.min(1, (y - (L.armY - 0.15)) / 0.15) * 0.6 : 1;
  return [x * g * sw, ny, z * g];
}

export function buildAvatar(body) {
  const m = MANNEQUINS[body?.mannequin || 'male'];
  const s = body?._scales || bodyScales(body || {}, body?.mannequin || 'male');
  return m.colliders.map((c) => {
    const ym = (c.a[1] + c.b[1]) / 2;
    const g = girthAt(body, ym);
    const vs = ym < s.crotch ? s.legS : s.torsoS;
    return { a: gradePoint(body, ...c.a), b: gradePoint(body, ...c.b), r: c.r * g, zs: c.zs, ys: (c.ys ?? 1) * (vs / g) };
  });
}

/** Pack colliders as Float32Array [ax,ay,az,bx,by,bz,r,zs,ys]*n for the solver. */
export function packColliders(colliders) {
  const out = new Float32Array(colliders.length * 9);
  colliders.forEach((c, i) => out.set([...c.a, ...c.b, c.r, c.zs ?? 1, c.ys ?? 1], i * 9));
  return out;
}

/** Height bins: colliders per 3 cm band, so each particle tests only a few. */
export function binColliders(col, margin = 0.03) {
  const c = col.length / 9;
  const y0 = -0.1; const binH = 0.03; const nb = 85;
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

/** Body-shape presets: multipliers applied to a base measurement set. */
export const BODY_SHAPES = {
  average: { name: 'Average', m: {} },
  hourglass: { name: 'Hourglass', m: { chest: 1.04, waist: 0.88, hip: 1.04 } },
  pear: { name: 'Pear', m: { chest: 0.96, waist: 0.97, hip: 1.1, thigh: 1.1 } },
  apple: { name: 'Apple / round', m: { chest: 1.06, underbust: 1.08, waist: 1.18, hip: 1.02, weight: 1.12 } },
  rectangle: { name: 'Rectangle', m: { chest: 0.98, waist: 1.06, hip: 0.97 } },
  'inverted-triangle': { name: 'Inverted triangle', m: { chest: 1.08, shoulder: 1.08, waist: 0.98, hip: 0.94 } },
  athletic: { name: 'Athletic', m: { chest: 1.06, shoulder: 1.06, waist: 0.94, hip: 0.98, thigh: 1.06 } },
  petite: { name: 'Petite', m: { height: 0.92, inseam: 0.9, arm: 0.92, shoulder: 0.95, weight: 0.88 } },
  tall: { name: 'Tall', m: { height: 1.08, inseam: 1.1, arm: 1.07, weight: 1.1 } },
  plus: { name: 'Plus', m: { chest: 1.2, underbust: 1.2, waist: 1.25, hip: 1.18, thigh: 1.2, weight: 1.35 } },
  slim: { name: 'Slim', m: { chest: 0.92, waist: 0.9, hip: 0.93, thigh: 0.9, weight: 0.85 } },
};
