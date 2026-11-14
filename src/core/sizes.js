// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Size charts (body measurements in cm). Patterns and the avatar are both
 * generated from these, so every design is graded automatically.
 * Values are typical industry body measurements; brands adjust their own.
 */
const row = (chest, waist, hip, height, inseam, head, neck) => ({ chest, waist, hip, height, inseam, head, neck });

export const SIZE_CHARTS = {
  unisex: {
    label: 'Unisex',
    sizes: {
      XXS: row(80, 66, 86, 162, 74, 55, 34), XS: row(84, 70, 90, 166, 76, 56, 35), S: row(88, 74, 94, 170, 78, 57, 36),
      M: row(94, 80, 100, 175, 80, 58, 38), L: row(100, 86, 106, 179, 81, 59, 40), XL: row(108, 94, 112, 182, 82, 60, 42),
      XXL: row(116, 102, 118, 184, 82, 61, 44), '3XL': row(124, 112, 126, 185, 82, 62, 46), '4XL': row(132, 122, 134, 186, 82, 62, 48),
    },
  },
  mens: {
    label: "Men's",
    sizes: {
      XS: row(86, 72, 88, 168, 78, 56, 36), S: row(92, 78, 94, 172, 80, 57, 37), M: row(98, 84, 100, 177, 81, 58, 39),
      L: row(104, 90, 106, 181, 82, 59, 41), XL: row(112, 98, 112, 184, 83, 60, 43), XXL: row(120, 106, 118, 186, 83, 61, 45),
      '3XL': row(128, 116, 126, 187, 83, 62, 47), '4XL': row(136, 126, 134, 188, 83, 62, 49),
    },
  },
  womens: {
    label: "Women's",
    sizes: {
      XXS: row(76, 58, 84, 158, 74, 54, 31), XS: row(80, 62, 88, 162, 75, 55, 32), S: row(84, 66, 92, 165, 76, 55, 33),
      M: row(90, 72, 98, 168, 77, 56, 34), L: row(96, 78, 104, 170, 78, 57, 35), XL: row(102, 84, 110, 171, 78, 57, 36),
      XXL: row(110, 92, 118, 172, 78, 58, 37), '3XL': row(118, 102, 126, 172, 78, 58, 38), '4XL': row(126, 112, 134, 172, 78, 59, 40),
    },
  },
};

import { MANNEQUINS } from '../sim/mannequins.js';
import { bodyScales, gradePoint, girthAt, REF_BODY, ARM_ANGLE } from '../sim/avatar.js';

/**
 * Map body measurements to the reference body used by the generators and the
 * avatar. Landmarks come from the fitted CC0 mannequin, graded with exactly
 * the same transform as the mesh and the colliders.
 */
export function bodyFromMeasurements(m, mannequin = 'male') {
  const L = MANNEQUINS[mannequin].landmarks;
  const R = REF_BODY[mannequin];
  const body = { ...m, mannequin };
  body._scales = bodyScales(m, mannequin);
  const sc = body._scales;
  const gp = (x, y, z = 0) => gradePoint(body, x, y, z);
  Object.assign(body, {
    hs: (m.height || R.height) / 175,
    gs: sc.chestS, hipS: sc.hipS, waistS: sc.waistS,
    shoulderY: gp(0, L.shoulderTop)[1] + 0.01,
    waistY: gp(0, L.waistY - 0.06)[1], // where waistbands sit (just below the natural waist)
    naturalWaistY: gp(0, L.waistY)[1],
    crotchY: gp(0, L.crotchY)[1],
    armY: gp(L.armStartX, L.armY)[1],
    armStartX: L.armStartX * sc.shoulderS,
    armAngle: m.armAngle ?? ARM_ANGLE,
    shoulderW: R.shoulder * sc.shoulderS,
    neckC: m.neck || R.neck,
    armCm: R.arm * sc.armS,
    armLen: (L.wristX ? L.wristX - L.armStartX : 0.56) * sc.armS,
    legX: L.legX * girthAt(body, L.crotchY - 0.2),
    headY: gp(0, L.headY)[1],
    headR: L.headR * 1.12 * ((m.head || R.head) / R.head),
    neckBase: gp(0, L.neckBase)[1],
  });
  return body;
}

export function bodyFor(project) {
  const chart = SIZE_CHARTS[project.sizeChart || 'unisex'] || SIZE_CHARTS.unisex;
  const m = project.customBody || chart.sizes[project.size || 'M'] || chart.sizes.M;
  const mannequin = project.mannequin || (project.sizeChart === 'womens' ? 'female' : 'male');
  const body = bodyFromMeasurements(project.armAngle != null ? { ...m, armAngle: project.armAngle } : m, mannequin);
  if (project.customMannequin?.id) body.customMesh = project.customMannequin.id; // your own body mesh for display and collision
  body.scale = project.scale || 1; // miniature / doll scale: 1 = life size
  return body;
}

export const DEFAULT_BODY = bodyFromMeasurements(SIZE_CHARTS.unisex.sizes.M, 'male');
export { REF_BODY };
