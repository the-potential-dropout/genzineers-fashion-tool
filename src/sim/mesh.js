// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Pattern-piece mesher.
 *
 * A garment-CAD style conforming mesh: the outline is resampled at an even
 * spacing so every cut edge, hem and seam is smooth and exactly on the
 * pattern line; the interior is a grain-aligned lattice (warp / weft), which
 * lets the solver treat stretch along the grain and shear on the bias
 * differently, like real woven and knitted cloth. Delaunay fills the rest.
 */
import Delaunator from 'delaunator';

export function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distToPoly2(x, y, pts) {
  let best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const ax = pts[j][0]; const ay = pts[j][1]; const bx = pts[i][0]; const by = pts[i][1];
    const ex = bx - ax; const ey = by - ay;
    const ee = ex * ex + ey * ey;
    let t = ee > 0 ? ((x - ax) * ex + (y - ay) * ey) / ee : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const dx = x - ax - ex * t; const dy = y - ay - ey * t;
    const d = dx * dx + dy * dy;
    if (d < best) best = d;
  }
  return best;
}

/**
 * @param points  outline [[x,y]...] in cm
 * @param h       target edge length in cm
 * @param keep    Set of outline vertex indices that must stay vertices (seam ends)
 * @returns { xy: Float64Array, tris: number[], nb: boundary count (first nb points, in outline order),
 *            bsrc: for each boundary point the outline arc position, grid: Map "i,j" -> index, minX, minY }
 */
export function meshPanel(points, h, keep = new Set()) {
  const n = points.length;
  const xs = points.map((q) => q[0]); const ys = points.map((q) => q[1]);
  const minX = Math.min(...xs); const minY = Math.min(...ys);
  const maxX = Math.max(...xs); const maxY = Math.max(...ys);
  // corners: sharp turns always stay
  const corner = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = points[(i - 1 + n) % n]; const b = points[i]; const c = points[(i + 1) % n];
    const ux = b[0] - a[0]; const uy = b[1] - a[1]; const vx = c[0] - b[0]; const vy = c[1] - b[1];
    const lu = Math.hypot(ux, uy); const lv = Math.hypot(vx, vy);
    if (lu < 1e-6 || lv < 1e-6) continue;
    const cos = (ux * vx + uy * vy) / (lu * lv);
    if (cos < 0.9 || keep.has(i)) corner[i] = 1;
  }
  let first = corner.indexOf(1);
  if (first < 0) { first = 0; corner[0] = 1; }
  // boundary: resample each run between corners evenly along its arc length
  const bx = []; const by = [];
  let i = first;
  for (let guard = 0; guard <= n; guard++) {
    // run from corner i to next corner
    const run = [points[i]];
    let j = i;
    do { j = (j + 1) % n; run.push(points[j]); } while (!corner[j] && j !== first);
    let len = 0; const acc = [0];
    for (let k = 1; k < run.length; k++) { len += Math.hypot(run[k][0] - run[k - 1][0], run[k][1] - run[k - 1][1]); acc.push(len); }
    const segs = Math.max(1, Math.round(len / h));
    let k = 1;
    for (let s = 0; s < segs; s++) {
      const d = (len * s) / segs;
      while (k < run.length - 1 && acc[k] < d) k++;
      const seg = acc[k] - acc[k - 1] || 1;
      const u = (d - acc[k - 1]) / seg;
      bx.push(run[k - 1][0] + (run[k][0] - run[k - 1][0]) * u); by.push(run[k - 1][1] + (run[k][1] - run[k - 1][1]) * u);
    }
    i = j;
    if (i === first) break;
  }
  const nb = bx.length;
  const X = bx.slice(); const Y = by.slice();
  const grid = new Map();
  const gap2 = (0.62 * h) ** 2;
  const nx = Math.ceil((maxX - minX) / h); const ny = Math.ceil((maxY - minY) / h);
  // centre the lattice on the piece so both halves of a symmetric panel mesh alike
  const ox = minX + ((maxX - minX) - nx * h) / 2; const oy = minY + ((maxY - minY) - ny * h) / 2;
  for (let gj = 0; gj <= ny; gj++) for (let gi = 0; gi <= nx; gi++) {
    const x = ox + gi * h; const y = oy + gj * h;
    if (!pointInPoly(x, y, points) || distToPoly2(x, y, points) < gap2) continue;
    grid.set(gi + gj * 4096, X.length);
    X.push(x); Y.push(y);
  }
  const coords = new Float64Array(X.length * 2);
  for (let k = 0; k < X.length; k++) { coords[k * 2] = X[k]; coords[k * 2 + 1] = Y[k]; }
  const tris = [];
  if (X.length >= 3) {
    const d = new Delaunator(coords);
    const t = d.triangles;
    for (let k = 0; k < t.length; k += 3) {
      const a = t[k]; const b = t[k + 1]; const c = t[k + 2];
      const cx = (X[a] + X[b] + X[c]) / 3; const cy = (Y[a] + Y[b] + Y[c]) / 3;
      if (!pointInPoly(cx, cy, points)) continue;
      const area = Math.abs((X[b] - X[a]) * (Y[c] - Y[a]) - (X[c] - X[a]) * (Y[b] - Y[a])) / 2;
      if (area < h * h * 0.01) continue;
      // consistent winding (counter-clockwise in pattern space)
      if ((X[b] - X[a]) * (Y[c] - Y[a]) - (X[c] - X[a]) * (Y[b] - Y[a]) > 0) tris.push(a, b, c); else tris.push(a, c, b);
    }
  }
  return { xy: coords, tris, nb, grid, nx, ny };
}
