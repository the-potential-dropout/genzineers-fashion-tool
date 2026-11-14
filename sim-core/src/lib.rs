// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.
//
// Cloth solver hot loop. No wasm-bindgen: JS allocates buffers inside this
// module's linear memory (alloc_f32 / alloc_u32), fills them, and three.js
// reads positions + normals straight out of the same memory (zero copy).
//
// Method: "small steps" position-based dynamics (Macklin et al. 2019):
// many substeps with one constraint pass each. This converges faster per
// unit of compute than many iterations on one big step, and stays stable.

use core::slice::{from_raw_parts, from_raw_parts_mut};

#[no_mangle]
pub extern "C" fn alloc_f32(len: usize) -> *mut f32 {
    let mut v = vec![0f32; len.max(1)];
    let p = v.as_mut_ptr();
    core::mem::forget(v);
    p
}

#[no_mangle]
pub extern "C" fn alloc_u32(len: usize) -> *mut u32 {
    let mut v = vec![0u32; len.max(1)];
    let p = v.as_mut_ptr();
    core::mem::forget(v);
    p
}

#[no_mangle]
pub unsafe extern "C" fn free_f32(ptr: *mut f32, len: usize) {
    drop(Vec::from_raw_parts(ptr, len.max(1), len.max(1)));
}

#[no_mangle]
pub unsafe extern "C" fn free_u32(ptr: *mut u32, len: usize) {
    drop(Vec::from_raw_parts(ptr, len.max(1), len.max(1)));
}

/// Body collision field: signed distance grid sampled from the real mannequin mesh.
struct Sdf { ptr: *const f32, nx: usize, ny: usize, nz: usize, ox: f32, oy: f32, oz: f32, inv: f32 }
static mut SDF: Sdf = Sdf { ptr: core::ptr::null(), nx: 0, ny: 0, nz: 0, ox: 0.0, oy: 0.0, oz: 0.0, inv: 0.0 };

#[no_mangle]
pub unsafe extern "C" fn set_sdf(ptr: *const f32, nx: usize, ny: usize, nz: usize, ox: f32, oy: f32, oz: f32, inv: f32) {
    SDF = Sdf { ptr, nx, ny, nz, ox, oy, oz, inv };
}

/// Trilinear distance + gradient; None outside the grid.
#[inline(always)]
unsafe fn sdf_sample(f: &Sdf, x: f32, y: f32, z: f32) -> Option<(f32, f32, f32, f32)> {
    let (fx, fy, fz) = ((x - f.ox) * f.inv, (y - f.oy) * f.inv, (z - f.oz) * f.inv);
    if fx < 0.0 || fy < 0.0 || fz < 0.0 {
        return None;
    }
    let (i, j, k) = (fx as usize, fy as usize, fz as usize);
    if i + 1 >= f.nx || j + 1 >= f.ny || k + 1 >= f.nz {
        return None;
    }
    let (u, v, w) = (fx - i as f32, fy - j as f32, fz - k as f32);
    let sy = f.nx;
    let sz = f.nx * f.ny;
    let q = i + sy * j + sz * k;
    let d = |o: usize| *f.ptr.add(q + o);
    let (c000, c100, c010, c110) = (d(0), d(1), d(sy), d(sy + 1));
    let (c001, c101, c011, c111) = (d(sz), d(sz + 1), d(sz + sy), d(sz + sy + 1));
    let c00 = c000 + (c100 - c000) * u;
    let c10 = c010 + (c110 - c010) * u;
    let c01 = c001 + (c101 - c001) * u;
    let c11 = c011 + (c111 - c011) * u;
    let c0 = c00 + (c10 - c00) * v;
    let c1 = c01 + (c11 - c01) * v;
    let gx = ((c100 - c000) * (1.0 - v) + (c110 - c010) * v) * (1.0 - w) + ((c101 - c001) * (1.0 - v) + (c111 - c011) * v) * w;
    let gy = (c10 - c00) * (1.0 - w) + (c11 - c01) * w;
    Some((c0 + (c1 - c0) * w, gx, gy, c1 - c0))
}

#[inline(always)]
fn solve_dist(pos: &mut [f32], inv: &[f32], i: usize, j: usize, rest: f32, k: f32, compress: f32, limit: f32) {
    let (wi, wj) = (inv[i], inv[j]);
    let w = wi + wj;
    if w <= 0.0 {
        return;
    }
    let (i3, j3) = (i * 3, j * 3);
    let dx = pos[j3] - pos[i3];
    let dy = pos[j3 + 1] - pos[i3 + 1];
    let dz = pos[j3 + 2] - pos[i3 + 2];
    let d2 = dx * dx + dy * dy + dz * dz;
    if d2 < 1e-14 {
        return;
    }
    let d = d2.sqrt();
    let c = d - rest;
    // Cloth resists stretching strongly but buckles easily (wrinkles).
    // Strain limiting: beyond rest*(1+limit) the edge is corrected fully, so
    // woven fabrics can't stretch like rubber however long the panel is.
    let corr = if c < 0.0 {
        k * compress * c
    } else {
        let hard = c - rest * limit;
        if hard > k * c { hard } else { k * c }
    };
    let s = corr / (d * w);
    pos[i3] += dx * s * wi;
    pos[i3 + 1] += dy * s * wi;
    pos[i3 + 2] += dz * s * wi;
    pos[j3] -= dx * s * wj;
    pos[j3 + 1] -= dy * s * wj;
    pos[j3 + 2] -= dz * s * wj;
}

/// Advance the cloth by `dt` seconds using `substeps` substeps.
/// Returns the max per-particle displacement (m) of the final substep,
/// which JS uses to put a settled garment to sleep (zero idle CPU).
#[no_mangle]
pub unsafe extern "C" fn step(
    n: usize, pos: *mut f32, prev: *mut f32, inv: *const f32, fric: *const f32,
    m: usize, ci: *const u32, rest: *const f32, kc: *const f32, lim: *const f32,
    s: usize, si: *const u32, srest: *mut f32, sk: *const f32,
    c: usize, col: *const f32, nb: usize, bstart: *const u32, bidx: *const u32, by0: f32, binv: f32,
    substeps: u32, dt: f32, gravity: f32, damping: f32,
    sew_rate: f32, sew_min: f32, thk: *const f32, compress: f32,
) -> f32 {
    let pos = from_raw_parts_mut(pos, n * 3);
    let prev = from_raw_parts_mut(prev, n * 3);
    let inv = from_raw_parts(inv, n);
    let fric = from_raw_parts(fric, n);
    // thk[0..n] = collision margin, thk[n..2n] = max distance outside the body (inner outfit layers; 0 = free)
    let thk = from_raw_parts(thk, n * 2);
    let ci = from_raw_parts(ci, m * 2);
    let rest = from_raw_parts(rest, m);
    let kc = from_raw_parts(kc, m);
    let lim = from_raw_parts(lim, m);
    let si = from_raw_parts(si, s * 2);
    let srest = from_raw_parts_mut(srest, s);
    let sk = from_raw_parts(sk, s);
    let col = from_raw_parts(col, c * 9);
    let bstart = from_raw_parts(bstart, nb + 1);
    let bidx = from_raw_parts(bidx, bstart[nb] as usize);

    let steps = substeps.max(1);
    let h = dt / steps as f32;
    let g = -gravity * h * h;
    let keep = 1.0 - damping;
    let mut max_move = 0f32;

    // Sewing: seams pull their edges together over time.
    for r in srest.iter_mut() {
        *r = (*r * sew_rate).max(sew_min);
    }

    for sub in 0..steps {
        // Integrate (Verlet).
        for p in 0..n {
            if inv[p] == 0.0 {
                continue;
            }
            let b = p * 3;
            for a in 0..3 {
                let v = (pos[b + a] - prev[b + a]) * keep;
                prev[b + a] = pos[b + a];
                pos[b + a] += v;
            }
            pos[b + 1] += g;
        }

        // Body collisions: elliptical capsules + floor, with friction.
        for p in 0..n {
            if inv[p] == 0.0 {
                continue;
            }
            let b = p * 3;
            let (mut x, mut y, mut z) = (pos[b], pos[b + 1], pos[b + 2]);
            let mut hit = false;
            let mut mout = thk[n + p];
            let mut pulled = false;
            // body: one lookup in the distance field of the real mannequin mesh
            let sdf = &*core::ptr::addr_of!(SDF);
            if !sdf.ptr.is_null() {
                if let Some((d, gx, gy, gz)) = sdf_sample(sdf, x, y, z) {
                    let gl = (gx * gx + gy * gy + gz * gz).sqrt();
                    if gl > 1e-7 {
                        let t = thk[p];
                        if d < t {
                            let push = (t - d).min(0.03) / gl;
                            x += gx * push;
                            y += gy * push;
                            z += gz * push;
                            hit = true;
                        } else if mout > 0.0 && d > mout && d < 0.25 {
                            // inner outfit layer: stay close to the body, under the layer above
                            let pull = (d - mout) / gl;
                            x -= gx * pull;
                            y -= gy * pull;
                            z -= gz * pull;
                            pulled = true;
                        }
                    }
                }
                mout = 0.0;
            }
            let mut best = f32::MAX;
            let mut bv = (0f32, 0f32, 0f32, 0f32, 0f32, 0f32, 1f32, 1f32, 0f32);
            // only colliders overlapping this particle's height bin
            let bi = (((y - by0) * binv) as isize).clamp(0, nb as isize - 1) as usize;
            for kk in bstart[bi]..bstart[bi + 1] {
                let k = bidx[kk as usize] as usize;
                // collider: [ax,ay,az,bx,by,bz,r,zs,ys] -> elliptical capsule
                let o = k * 9;
                let r = col[o + 6] + thk[p];
                // cheap AABB reject (world space) before any maths
                let zs = col[o + 7];
                let ys = col[o + 8];
                let ex_ = r;
                let ey_ = r * ys;
                let ez_ = r * zs;
                let (lx0, lx1) = if col[o] < col[o + 3] { (col[o], col[o + 3]) } else { (col[o + 3], col[o]) };
                let (ly0, ly1) = if col[o + 1] < col[o + 4] { (col[o + 1], col[o + 4]) } else { (col[o + 4], col[o + 1]) };
                let (lz0, lz1) = if col[o + 2] < col[o + 5] { (col[o + 2], col[o + 5]) } else { (col[o + 5], col[o + 2]) };
                if mout <= 0.0 && (x < lx0 - ex_ || x > lx1 + ex_ || y < ly0 - ey_ || y > ly1 + ey_ || z < lz0 - ez_ || z > lz1 + ez_) {
                    continue;
                }
                let (ax, ay, az) = (col[o], col[o + 1] / ys, col[o + 2] / zs);
                let (bx, by, bz) = (col[o + 3], col[o + 4] / ys, col[o + 5] / zs);
                let qy = y / ys;
                let qz = z / zs;
                let (ex, ey, ez) = (bx - ax, by - ay, bz - az);
                let ee = ex * ex + ey * ey + ez * ez;
                let t = if ee > 0.0 {
                    (((x - ax) * ex + (qy - ay) * ey + (qz - az) * ez) / ee).clamp(0.0, 1.0)
                } else {
                    0.0
                };
                let (cx, cy, cz) = (ax + ex * t, ay + ey * t, az + ez * t);
                let (dx, dy, dz) = (x - cx, qy - cy, qz - cz);
                let d2 = dx * dx + dy * dy + dz * dz;
                if mout > 0.0 && d2 > 1e-12 {
                    let sd = d2.sqrt() - r;
                    if sd < best {
                        best = sd;
                        bv = (cx, cy, cz, dx, dy, dz, ys, zs, d2.sqrt());
                    }
                }
                if d2 < r * r && d2 > 1e-12 {
                    let d = d2.sqrt();
                    let f = r / d;
                    x = cx + dx * f;
                    y = (cy + dy * f) * ys;
                    z = (cz + dz * f) * zs;
                    hit = true;
                }
            }
            // inner outfit layer: stay close to the body so it never pokes through the layer above
            if mout > 0.0 && !hit && best > mout && best < 0.25 {
                let (cx, cy, cz, dx, dy, dz, ys, zs, d) = bv;
                let f = (d - (best - mout)) / d;
                x = cx + dx * f;
                y = (cy + dy * f) * ys;
                z = (cz + dz * f) * zs;
                pulled = true;
            }
            if y < thk[p] {
                y = thk[p];
                hit = true;
            }
            if pulled && !hit {
                let (dx, dy, dz) = (x - pos[b], y - pos[b + 1], z - pos[b + 2]);
                pos[b] = x;
                pos[b + 1] = y;
                pos[b + 2] = z;
                prev[b] += dx;
                prev[b + 1] += dy;
                prev[b + 2] += dz;
            }
            if hit {
                // Position-only response: the push itself adds no velocity
                // (prevents explosions when cloth starts inside the body).
                let (ox, oy, oz) = (pos[b], pos[b + 1], pos[b + 2]);
                let (px, py, pz) = (x - ox, y - oy, z - oz);
                let pl = (px * px + py * py + pz * pz).sqrt();
                let (mut vx, mut vy, mut vz) = (ox - prev[b], oy - prev[b + 1], oz - prev[b + 2]);
                if pl > 1e-9 {
                    let (nx, ny, nz) = (px / pl, py / pl, pz / pl);
                    let vn = vx * nx + vy * ny + vz * nz;
                    if vn < 0.0 {
                        vx -= nx * vn;
                        vy -= ny * vn;
                        vz -= nz * vn;
                    }
                }
                let keep_t = 1.0 - fric[p];
                pos[b] = x;
                pos[b + 1] = y;
                pos[b + 2] = z;
                prev[b] = x - vx * keep_t;
                prev[b + 1] = y - vy * keep_t;
                prev[b + 2] = z - vz * keep_t;
            }
        }

        // Fabric constraints run AFTER collisions so strain limiting wins
        // (a waistband can't stretch over the hips).
        // Fabric constraints: stretch, shear, bend (all distance-based).
        // Symmetric Gauss-Seidel: forward then backward sweep. Converges much
        // faster on long loops (waistbands, hems) for ~1.6x the cost.
        for e in 0..m {
            solve_dist(pos, inv, ci[e * 2] as usize, ci[e * 2 + 1] as usize, rest[e], kc[e], compress, lim[e]);
        }
        for e in (0..m).rev() {
            solve_dist(pos, inv, ci[e * 2] as usize, ci[e * 2 + 1] as usize, rest[e], kc[e], compress, lim[e]);
        }
        // Seams (few hundred pairs: solve 3x so stitches win over fabric tension)
        for _ in 0..3 {
            for e in 0..s {
                solve_dist(pos, inv, si[e * 2] as usize, si[e * 2 + 1] as usize, srest[e], sk[e], 1.0, 1e9);
            }
        }

        if sub == steps - 1 {
            for p in 0..n {
                let b = p * 3;
                let dx = pos[b] - prev[b];
                let dy = pos[b + 1] - prev[b + 1];
                let dz = pos[b + 2] - prev[b + 2];
                let d = dx * dx + dy * dy + dz * dz;
                if d > max_move {
                    max_move = d;
                }
            }
        }
    }
    max_move.sqrt()
}

/// Area-weighted vertex normals for the render mesh (faster than three.js'
/// computeVertexNormals and writes directly into the GPU-bound buffer).
#[no_mangle]
pub unsafe extern "C" fn normals(n: usize, pos: *const f32, t: usize, idx: *const u32, out: *mut f32) {
    let pos = from_raw_parts(pos, n * 3);
    let idx = from_raw_parts(idx, t * 3);
    let out = from_raw_parts_mut(out, n * 3);
    out.iter_mut().for_each(|v| *v = 0.0);
    for f in 0..t {
        let (a, b, c) = (idx[f * 3] as usize * 3, idx[f * 3 + 1] as usize * 3, idx[f * 3 + 2] as usize * 3);
        let (e1x, e1y, e1z) = (pos[b] - pos[a], pos[b + 1] - pos[a + 1], pos[b + 2] - pos[a + 2]);
        let (e2x, e2y, e2z) = (pos[c] - pos[a], pos[c + 1] - pos[a + 1], pos[c + 2] - pos[a + 2]);
        let nx = e1y * e2z - e1z * e2y;
        let ny = e1z * e2x - e1x * e2z;
        let nz = e1x * e2y - e1y * e2x;
        for v in [a, b, c] {
            out[v] += nx;
            out[v + 1] += ny;
            out[v + 2] += nz;
        }
    }
    for v in 0..n {
        let b = v * 3;
        let l = (out[b] * out[b] + out[b + 1] * out[b + 1] + out[b + 2] * out[b + 2]).sqrt();
        if l > 0.0 {
            out[b] /= l;
            out[b + 1] /= l;
            out[b + 2] /= l;
        }
    }
}
