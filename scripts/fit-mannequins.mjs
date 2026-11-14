// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Fits collision shapes + landmarks to the CC0 MakeHuman mannequin meshes and
// writes src/sim/mannequins.js. Usage: node scripts/fit-mannequins.mjs <dir with mannequin-*.glb>
import { writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { glbPositions } from './glb-stats.mjs';

const dir = process.argv[2];
const H = 1.75; // reference height the generators are drafted for
const out = {};
const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))]; };
const r4 = (v) => Math.round(v * 10000) / 10000;

for (const g of ['male', 'female']) {
  let { out: V } = glbPositions(`${dir}/mannequin-${g}.glb`);
  const h0 = Math.max(...V.map((v) => v[1])) - Math.min(...V.map((v) => v[1]));
  const s = H / h0;
  const y0 = Math.min(...V.map((v) => v[1]));
  V = V.map(([x, y, z]) => [x * s, (y - y0) * s, z * s]);
  const slice = (y, half, pred = () => true) => V.filter((v) => Math.abs(v[1] - y) <= half && pred(v));
  // landmarks
  const armY = pct(V.filter((v) => Math.abs(v[0]) > 0.45).map((v) => v[1]), 0.5);
  const legS = slice(0.5, 0.02, (v) => v[0] > 0).map((v) => v[0]);
  const legX = (pct(legS, 0.02) + pct(legS, 0.98)) / 2;
  let crotchY = 0.6;
  for (let y = 0.6; y < 1.05; y += 0.004) { if (slice(y, 0.006, (v) => Math.abs(v[0]) < 0.025).length) { crotchY = y; break; } }
  const torsoHalf = (y) => pct(slice(y, 0.01, (v) => Math.abs(v[0]) < 0.3).map((v) => Math.abs(v[0])), 0.97);
  let waistY = crotchY + 0.15; let wmin = 9;
  for (let y = crotchY + 0.08; y < armY - 0.2; y += 0.01) { const w = torsoHalf(y); if (w > 0 && w < wmin) { wmin = w; waistY = y; } }
  let hipY = crotchY; let hmax = 0;
  for (let y = crotchY; y < waistY; y += 0.01) { const w = torsoHalf(y); if (w > hmax) { hmax = w; hipY = y; } }
  const armStartX = torsoHalf(armY - 0.13);
  const yMax = Math.max(...V.map((v) => v[1]));
  // neck base: lowest y above the arms where the slice is narrow
  let neckBase = armY + 0.05;
  for (let y = armY + 0.02; y < yMax - 0.1; y += 0.005) { if (torsoHalf(y) < 0.075) { neckBase = y; break; } }
  let headBottom = neckBase + 0.06;
  for (let y = neckBase; y < yMax - 0.05; y += 0.005) { const w = torsoHalf(y); if (w > 0.072) { headBottom = y; break; } }
  const shoulderTop = pct(V.filter((v) => Math.abs(v[0]) > armStartX * 0.6 && Math.abs(v[0]) < armStartX * 1.05 && v[1] < neckBase + 0.02).map((v) => v[1]), 0.995);
  // z centre of the torso (so the body is centred on z = 0 like the generators expect)
  const torsoZ = V.filter((v) => v[1] > waistY && v[1] < armY - 0.1 && Math.abs(v[0]) < 0.25).map((v) => v[2]);
  const zc = (pct(torsoZ, 0.02) + pct(torsoZ, 0.98)) / 2;
  V = V.map(([x, y, z]) => [x, y, z - zc]);

  const C = [];
  // grow an ellipse (centre u0,v0, radii ru,rv) until it contains every point (u,v), plus a margin
  const contain = (pts, u0, v0, ru, rv, margin = 0.003) => {
    let k = 1;
    for (const [u, v] of pts) k = Math.max(k, Math.hypot((u - u0) / ru, (v - v0) / rv));
    return [ru * k + margin, rv * k + margin];
  };
  const add = (a, b, r, zs = 1, ys = 1) => C.push({ a: a.map(r4), b: b.map(r4), r: r4(r), zs: r4(zs), ys: r4(ys) });
  // torso: thin elliptical slices, crotch -> neck base
  for (let y = crotchY + 0.015; y <= neckBase + 0.001; y += 0.03) {
    const lim = y > armY - 0.12 && y < armY + 0.09 ? armStartX * 1.02 : 0.32;
    const S = slice(y, 0.015, (v) => Math.abs(v[0]) < lim);
    if (S.length < 8) continue;
    const zs_ = S.map((v) => v[2]);
    const cz = (pct(zs_, 0.03) + pct(zs_, 0.97)) / 2;
    let rx = pct(S.map((v) => Math.abs(v[0])), 0.96);
    let rz = (pct(zs_, 0.97) - pct(zs_, 0.03)) / 2;
    if (rx < 0.03) continue;
    [rx, rz] = contain(S.map((v) => [v[0], v[2]]), 0, cz, rx, rz);
    add([0, y, cz], [0, y, cz], rx, rz / rx, 0.028 / rx);
  }
  // neck + head: thin elliptical slices (accurate where hats and collars sit)
  for (let y = neckBase + 0.01; y <= yMax - 0.01; y += 0.02) {
    const S = slice(y, 0.01, (v) => Math.abs(v[0]) < 0.14);
    if (S.length < 6) continue;
    const zs_ = S.map((v) => v[2]);
    const cz = (pct(zs_, 0.02) + pct(zs_, 0.98)) / 2;
    let rx = pct(S.map((v) => Math.abs(v[0])), 0.98);
    let rz = (pct(zs_, 0.98) - pct(zs_, 0.02)) / 2;
    if (rx < 0.02) continue;
    [rx, rz] = contain(S.map((v) => [v[0], v[2]]), 0, cz, rx, rz);
    add([0, y, cz], [0, y, cz], rx, rz / rx, 0.016 / rx);
  }
  const HS = V.filter((v) => v[1] > headBottom);
  const hcY = (headBottom + yMax) / 2; const hx = pct(HS.map((v) => Math.abs(v[0])), 0.97);
  // arms: short horizontal capsules along x
  for (const sd of [1, -1]) {
    for (let x = armStartX; x < 0.82; x += 0.05) {
      const S = V.filter((v) => v[0] * sd >= x && v[0] * sd < x + 0.05 && Math.abs(v[1] - armY) < 0.12);
      if (S.length < 6) continue;
      const cy = (pct(S.map((v) => v[1]), 0.03) + pct(S.map((v) => v[1]), 0.97)) / 2;
      const cz = (pct(S.map((v) => v[2]), 0.03) + pct(S.map((v) => v[2]), 0.97)) / 2;
      let ry = (pct(S.map((v) => v[1]), 0.97) - pct(S.map((v) => v[1]), 0.03)) / 2;
      let rz = (pct(S.map((v) => v[2]), 0.97) - pct(S.map((v) => v[2]), 0.03)) / 2;
      [ry, rz] = contain(S.map((v) => [v[1], v[2]]), cy, cz, ry, rz);
      add([sd * (x + 0.01), cy, cz], [sd * (x + 0.04), cy, cz], ry, rz / ry);
    }
  }
  // legs: short vertical capsules, ankle -> crotch
  for (const sd of [1, -1]) {
    for (let y = 0.07; y < crotchY - 0.01; y += 0.07) {
      const S = V.filter((v) => v[0] * sd > 0.005 && v[1] >= y && v[1] < y + 0.07);
      if (S.length < 6) continue;
      const xs = S.map((v) => v[0]); const zs_ = S.map((v) => v[2]);
      const cx = (pct(xs, 0.03) + pct(xs, 0.97)) / 2; const cz = (pct(zs_, 0.03) + pct(zs_, 0.97)) / 2;
      let rx = (pct(xs, 0.97) - pct(xs, 0.03)) / 2; let rz = (pct(zs_, 0.97) - pct(zs_, 0.03)) / 2;
      [rx, rz] = contain(S.map((v) => [v[0], v[2]]), cx, cz, Math.max(0.03, rx), rz);
      add([cx, y + 0.015, cz], [cx, y + 0.055, cz], rx, rz / rx);
    }
  }
  const hx2 = hx;
  out[g] = {
    scale: r4(s), zOffset: r4(zc), sourceHeight: r4(h0),
    landmarks: { armY: r4(armY), armStartX: r4(armStartX), legX: r4(legX), crotchY: r4(crotchY), waistY: r4(waistY), hipY: r4(hipY), neckBase: r4(neckBase), shoulderTop: r4(shoulderTop), headY: r4(hcY), headR: r4(hx2), headBottom: r4(headBottom), top: r4(yMax) },
    colliders: C,
  };
  console.log(g, 'colliders', C.length, out[g].landmarks);
}

mkdirSync('public/models', { recursive: true });
for (const g of ['male', 'female']) copyFileSync(`${dir}/mannequin-${g}.glb`, `public/models/mannequin-${g}.glb`);
writeFileSync('src/sim/mannequins.js', `// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Generated by scripts/fit-mannequins.mjs from the CC0 MakeHuman mannequins in public/models/.
// Mesh -> reference frame: scale, then subtract zOffset; reference height ${H} m, arms in T-pose.
export const MANNEQUINS = ${JSON.stringify(out)};
`);
console.log('wrote src/sim/mannequins.js and public/models/*.glb');
