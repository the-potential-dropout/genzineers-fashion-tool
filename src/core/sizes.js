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

/** Map body measurements to the reference body used by the generators / avatar. */
export function bodyFromMeasurements(m) {
  const hs = m.height / 175; // vertical scale
  return {
    ...m,
    hs,
    gs: m.chest / 94, // girth scale (chest)
    hipS: m.hip / 100,
    waistS: m.waist / 80,
    shoulderY: 1.47 * hs,
    waistY: 1.0 * hs,
    crotchY: 0.88 * hs * (m.inseam / 80) ** 0.2,
    armStartX: 0.2 * (m.chest / 94),
  };
}

export function bodyFor(project) {
  const chart = SIZE_CHARTS[project.sizeChart || 'unisex'] || SIZE_CHARTS.unisex;
  const m = project.customBody || chart.sizes[project.size || 'M'] || chart.sizes.M;
  return bodyFromMeasurements(m);
}

export const DEFAULT_BODY = bodyFromMeasurements(SIZE_CHARTS.unisex.sizes.M);
