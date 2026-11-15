// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Body collision field.
 *
 * Cloth collides with a signed distance field sampled from the *actual*
 * mannequin mesh (graded and posed exactly like the visible body), so
 * garments rest on the real neck, shoulders, chest, seat and arms instead of
 * on approximating capsules. One trilinear lookup per particle: faster than
 * testing capsules and far more accurate.
 */
import { MANNEQUINS } from './mannequins.js';
import { gradePoint } from './avatar.js';

const meshes = {};
const fields = new Map();

/** Minimal GLB reader (positions + indices of the first primitive). */
function parseGLB(buf) {
  const dv = new DataView(buf);
  const jl = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)));
  const binStart = 20 + jl + 8;
  const prim = json.meshes[0].primitives[0];
  const view = (ai) => { const a = json.accessors[ai]; const bv = json.bufferViews[a.bufferView]; return { a, off: binStart + (bv.byteOffset || 0) + (a.byteOffset || 0) }; };
  const p = view(prim.attributes.POSITION);
  const pos = new Float32Array(buf.slice(p.off, p.off + p.a.count * 12));
  const i = view(prim.indices);
  const idx = i.a.componentType === 5125 ? new Uint32Array(buf.slice(i.off, i.off + i.a.count * 4)) : new Uint32Array(new Uint16Array(buf.slice(i.off, i.off + i.a.count * 2)));
  return { pos, idx };
}

/** Load a mannequin mesh into the reference frame (metres, feet on the floor, T-pose). */
export async function loadBodyMesh(which, baseUrl = './') {
  if (meshes[which]) return meshes[which];
  let buf;
  if (typeof window === 'undefined') {
    const fs = await import(/* @vite-ignore */ 'node:' + 'fs');
    const b = fs.readFileSync(new URL(`../../public/models/mannequin-${which}.glb`, import.meta.url));
    buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  } else buf = await (await fetch(`${baseUrl}models/mannequin-${which}.glb`)).arrayBuffer();
  const { pos, idx } = parseGLB(buf);
  const M = MANNEQUINS[which];
  let minY = Infinity; for (let k = 1; k < pos.length; k += 3) minY = Math.min(minY, pos[k]);
  const P = new Float32Array(pos.length);
  for (let k = 0; k < pos.length; k += 3) { P[k] = pos[k] * M.scale; P[k + 1] = (pos[k + 1] - minY) * M.scale; P[k + 2] = pos[k + 2] * M.scale - M.zOffset; }
  meshes[which] = { P, idx };
  return meshes[which];
}
export const bodyMeshLoaded = (which) => Boolean(meshes[which]);
/** Register a user-supplied body (already posed, scaled and standing on the floor). */
export function setCustomBodyMesh(id, mesh) { meshes[`custom:${id}`] = { P: mesh.P, idx: mesh.idx, custom: true }; }
export const customBodyMesh = (id) => meshes[`custom:${id}`] || null;

/** Signed distance field of the graded, posed body. Returns null until the mesh is loaded. */
export function bodyField(body, cell = 0.0125) {
  const custom = body?.customMesh && meshes[`custom:${body.customMesh}`];
  const which = custom ? `custom:${body.customMesh}` : body?.mannequin || 'male';
  const mesh = custom || meshes[which];
  if (!mesh) return null;
  const key = custom ? which + cell : which + JSON.stringify(body._scales, (k, v) => (k === 'L' ? undefined : typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v)) + (body.armAngle ?? '') + `|${body.soleLift || 0}|${body.heelLift || 0}` + cell;
  if (fields.has(key)) return fields.get(key);
  const { P: ref, idx } = mesh;
  const P = new Float32Array(ref.length);
  let x0 = 1e9; let y0 = 1e9; let z0 = 1e9; let x1 = -1e9; let y1 = -1e9; let z1 = -1e9;
  for (let k = 0; k < ref.length; k += 3) {
    const g = custom ? [ref[k], ref[k + 1], ref[k + 2]] : gradePoint(body, ref[k], ref[k + 1], ref[k + 2]);
    P[k] = g[0]; P[k + 1] = g[1]; P[k + 2] = g[2];
    if (g[0] < x0) x0 = g[0]; if (g[0] > x1) x1 = g[0]; if (g[1] < y0) y0 = g[1]; if (g[1] > y1) y1 = g[1]; if (g[2] < z0) z0 = g[2]; if (g[2] > z1) z1 = g[2];
  }
  const pad = 0.1;
  const ox = x0 - pad; const oy = y0 - pad; const oz = z0 - pad;
  const nx = Math.ceil((x1 - x0 + 2 * pad) / cell) + 1; const ny = Math.ceil((y1 - y0 + 2 * pad) / cell) + 1; const nz = Math.ceil((z1 - z0 + 2 * pad) / cell) + 1;
  const N = nx * ny * nz;
  const dist = new Float32Array(N).fill(1e9);
  const sgn = new Int8Array(N).fill(1);
  const band = cell * 2.6;
  const inv = 1 / cell;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3; const b = idx[t + 1] * 3; const c = idx[t + 2] * 3;
    const ax = P[a]; const ay = P[a + 1]; const az = P[a + 2];
    const e0x = P[b] - ax; const e0y = P[b + 1] - ay; const e0z = P[b + 2] - az;
    const e1x = P[c] - ax; const e1y = P[c + 1] - ay; const e1z = P[c + 2] - az;
    let nxn = e0y * e1z - e0z * e1y; let nyn = e0z * e1x - e0x * e1z; let nzn = e0x * e1y - e0y * e1x;
    const nl = Math.hypot(nxn, nyn, nzn); if (nl < 1e-12) continue;
    nxn /= nl; nyn /= nl; nzn /= nl;
    const d00 = e0x * e0x + e0y * e0y + e0z * e0z; const d01 = e0x * e1x + e0y * e1y + e0z * e1z; const d11 = e1x * e1x + e1y * e1y + e1z * e1z;
    const i0 = Math.max(0, Math.floor((Math.min(ax, P[b], P[c]) - band - ox) * inv)); const i1 = Math.min(nx - 1, Math.ceil((Math.max(ax, P[b], P[c]) + band - ox) * inv));
    const j0 = Math.max(0, Math.floor((Math.min(ay, P[b + 1], P[c + 1]) - band - oy) * inv)); const j1 = Math.min(ny - 1, Math.ceil((Math.max(ay, P[b + 1], P[c + 1]) + band - oy) * inv));
    const k0 = Math.max(0, Math.floor((Math.min(az, P[b + 2], P[c + 2]) - band - oz) * inv)); const k1 = Math.min(nz - 1, Math.ceil((Math.max(az, P[b + 2], P[c + 2]) + band - oz) * inv));
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const px = ox + i * cell - ax; const py = oy + j * cell - ay; const pz = oz + k * cell - az;
      // closest point on the triangle (Ericson, Real-Time Collision Detection)
      const d1 = e0x * px + e0y * py + e0z * pz; const d2 = e1x * px + e1y * py + e1z * pz;
      let u; let v;
      if (d1 <= 0 && d2 <= 0) { u = 0; v = 0; } else {
        const d3 = d1 - d00; const d4 = d2 - d01;
        if (d3 >= 0 && d4 <= d3) { u = 1; v = 0; } else {
          const vc = d1 * d4 - d3 * d2;
          if (vc <= 0 && d1 >= 0 && d3 <= 0) { u = d1 / (d1 - d3); v = 0; } else {
            const d5 = d1 - d01; const d6 = d2 - d11;
            if (d6 >= 0 && d5 <= d6) { u = 0; v = 1; } else {
              const vb = d5 * d2 - d1 * d6;
              if (vb <= 0 && d2 >= 0 && d6 <= 0) { u = 0; v = d2 / (d2 - d6); } else {
                const va = d3 * d6 - d5 * d4;
                if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { v = (d4 - d3) / (d4 - d3 + (d5 - d6)); u = 1 - v; } else { const den = 1 / (va + vb + vc); u = vb * den; v = vc * den; }
              }
            }
          }
        }
      }
      const qx = px - (e0x * u + e1x * v); const qy = py - (e0y * u + e1y * v); const qz = pz - (e0z * u + e1z * v);
      const d = Math.sqrt(qx * qx + qy * qy + qz * qz);
      const q = i + nx * (j + ny * k);
      if (d < dist[q] - 1e-7) { dist[q] = d; sgn[q] = qx * nxn + qy * nyn + qz * nzn >= 0 ? 1 : -1; }
    }
  }
  // extend beyond the band (chamfer sweeps), carrying the sign outwards
  const sweep = (dir) => {
    const ks = dir > 0 ? 0 : nz - 1; const js = dir > 0 ? 0 : ny - 1; const is = dir > 0 ? 0 : nx - 1;
    for (let k = ks; k >= 0 && k < nz; k += dir) for (let j = js; j >= 0 && j < ny; j += dir) for (let i = is; i >= 0 && i < nx; i += dir) {
      const q = i + nx * (j + ny * k);
      let best = dist[q]; let s = sgn[q];
      for (let dk = -1; dk <= 0; dk++) for (let dj = -1; dj <= (dk < 0 ? 1 : 0); dj++) for (let di = -1; di <= (dk < 0 || dj < 0 ? 1 : -1); di++) {
        const ii = i + di * dir; const jj = j + dj * dir; const kk = k + dk * dir;
        if (ii < 0 || jj < 0 || kk < 0 || ii >= nx || jj >= ny || kk >= nz) continue;
        const r = ii + nx * (jj + ny * kk);
        const dd = dist[r] + cell * Math.sqrt(di * di + dj * dj + dk * dk);
        if (dd < best) { best = dd; s = sgn[r]; }
      }
      dist[q] = best; sgn[q] = s;
    }
  };
  sweep(1); sweep(-1);
  const data = new Float32Array(N);
  for (let q = 0; q < N; q++) data[q] = Math.min(dist[q], 1) * sgn[q];
  const field = { data, nx, ny, nz, ox, oy, oz, inv, cell };
  if (fields.size > 3) fields.clear();
  fields.set(key, field);
  return field;
}

/** Trilinear sample: [distance, gx, gy, gz] or null outside the grid (JS mirror of the Rust solver). */
export function sampleField(f, x, y, z, out) {
  const fx = (x - f.ox) * f.inv; const fy = (y - f.oy) * f.inv; const fz = (z - f.oz) * f.inv;
  const i = Math.floor(fx); const j = Math.floor(fy); const k = Math.floor(fz);
  if (i < 0 || j < 0 || k < 0 || i >= f.nx - 1 || j >= f.ny - 1 || k >= f.nz - 1) return false;
  const u = fx - i; const v = fy - j; const w = fz - k;
  const d = f.data; const q = i + f.nx * (j + f.ny * k); const sy = f.nx; const sz = f.nx * f.ny;
  const c000 = d[q]; const c100 = d[q + 1]; const c010 = d[q + sy]; const c110 = d[q + sy + 1];
  const c001 = d[q + sz]; const c101 = d[q + sz + 1]; const c011 = d[q + sz + sy]; const c111 = d[q + sz + sy + 1];
  const c00 = c000 + (c100 - c000) * u; const c10 = c010 + (c110 - c010) * u; const c01 = c001 + (c101 - c001) * u; const c11 = c011 + (c111 - c011) * u;
  const c0 = c00 + (c10 - c00) * v; const c1 = c01 + (c11 - c01) * v;
  out[0] = c0 + (c1 - c0) * w;
  out[1] = ((c100 - c000) * (1 - v) + (c110 - c010) * v) * (1 - w) + ((c101 - c001) * (1 - v) + (c111 - c011) * v) * w;
  out[2] = (c10 - c00) * (1 - w) + (c11 - c01) * w;
  out[3] = c1 - c0;
  return true;
}
