/**
 * Shoes in 3D, built the way they are made.
 *
 * 1. The last: cross-sections of the mannequin's own foot and leg (exact plane cuts of the mesh)
 *    are taken down the leg, fanned round the heel and along the foot, eased, given a flat seat
 *    and a toe box in the chosen toe shape. That swept surface is the lasted upper.
 * 2. Every piece of the upper (vamp, quarters, cap, counter, backstay, facings, tongue, collar,
 *    straps...) is a region of that surface with a crisp cut edge, lifted by its own thickness,
 *    edged and stitched, in its own material.
 * 3. The bottom: welt, midsole, outsole with tread, heel in its real shape.
 * 4. Hardware: eyelets, D-rings, speed hooks, buckles, zips, and the lace threaded through them.
 *
 * Everything is metres, in the mannequin's space.
 */
import * as THREE from 'three';
import { TOE_SHAPES, HEELS, CONSTRUCTIONS, SOLE_MATERIALS, METALS, LACES } from '../core/shoes.js';

export const NA = 64; // points round each section
/** A closed polar section (radius per equal angle step) made convex: the hull of its points, read back along every angle. */
function convexPolar(R) {
  const n = R.length; const pts = R.map((r, i) => { const a = (i / n) * Math.PI * 2; return [Math.sin(a) * r, Math.cos(a) * r]; });
  const srt = pts.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = []; const hi = [];
  for (const q of srt) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = srt.length - 1; i >= 0; i--) { const q = srt[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  const h = lo.slice(0, -1).concat(hi.slice(0, -1)); if (h.length < 3) return R.slice();
  return R.map((r0, i) => { const a = (i / n) * Math.PI * 2; const dx = Math.sin(a); const dy = Math.cos(a); let best = r0;
    for (let k = 0; k < h.length; k++) { const p = h[k]; const q = h[(k + 1) % h.length]; const ex = q[0] - p[0]; const ey = q[1] - p[1]; const den = dx * ey - dy * ex; if (Math.abs(den) < 1e-12) continue; const t = (p[0] * ey - p[1] * ex) / den; const u = (p[0] * dy - p[1] * dx) / den; if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6) { best = Math.max(r0, t); break; } }
    return best; });
}
/** Marks a mesh as part of the shoe's body (upper pieces, lining, footbed, sole): what the foot is inside. Trims (laces, tassels, buckles, bows) are not. */
const shell = (m) => { m.userData.shell = true; return m; };
const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const smax = (a, b, k) => 0.5 * (a + b + Math.sqrt((a - b) * (a - b) + k * k));
const smin = (a, b, k) => -smax(-a, -b, k);
const lerp = (a, b, t) => a + (b - a) * t;

/** Exact cross-section of a triangle soup with the plane through O spanned by X=(1,0,0) and D (unit, in the y-z plane). Returns 2D segments [u0,v0,u1,v1]. */
export function slice(tris, O, D) {
  const nY = -D[2]; const nZ = D[1]; // plane normal (in y-z)
  const segs = [];
  for (let t = 0; t < tris.length; t += 9) {
    const d0 = (tris[t + 1] - O[1]) * nY + (tris[t + 2] - O[2]) * nZ; const d1 = (tris[t + 4] - O[1]) * nY + (tris[t + 5] - O[2]) * nZ; const d2 = (tris[t + 7] - O[1]) * nY + (tris[t + 8] - O[2]) * nZ;
    if ((d0 > 0 && d1 > 0 && d2 > 0) || (d0 < 0 && d1 < 0 && d2 < 0)) continue;
    const pts = [];
    const cut = (a, da, b, db) => { if ((da > 0) === (db > 0)) return; const s = da / (da - db); const x = tris[a] + (tris[b] - tris[a]) * s; const y = tris[a + 1] + (tris[b + 1] - tris[a + 1]) * s; const z = tris[a + 2] + (tris[b + 2] - tris[a + 2]) * s; pts.push(x - O[0], (y - O[1]) * D[1] + (z - O[2]) * D[2]); };
    cut(t, d0, t + 3, d1); cut(t + 3, d1, t + 6, d2); cut(t + 6, d2, t, d0);
    if (pts.length >= 4) segs.push(pts[0], pts[1], pts[2], pts[3]);
  }
  return segs;
}

/** Radii of the outline of a set of segments, seen from its centre, in NA directions (the envelope: gaps between toes are bridged). */
export function envelope(segs, vMin = -1e9) {
  let cu = 0; let cv = 0; let L = 0;
  for (let s = 0; s < segs.length; s += 4) { if (segs[s + 1] < vMin && segs[s + 3] < vMin) continue; const l = Math.hypot(segs[s + 2] - segs[s], segs[s + 3] - segs[s + 1]) + 1e-9; cu += (segs[s] + segs[s + 2]) * 0.5 * l; cv += (segs[s + 1] + segs[s + 3]) * 0.5 * l; L += l; }
  if (L < 0.02) return null;
  cu /= L; cv /= L;
  const R = new Float32Array(NA);
  for (let i = 0; i < NA; i++) {
    const a = (i / NA) * Math.PI * 2; const du = Math.sin(a); const dv = -Math.cos(a); let best = 0;
    for (let s = 0; s < segs.length; s += 4) {
      const ax = segs[s] - cu; const ay = segs[s + 1] - cv; const bx = segs[s + 2] - cu; const by = segs[s + 3] - cv;
      const ex = bx - ax; const ey = by - ay; const den = du * ey - dv * ex; if (Math.abs(den) < 1e-12) continue;
      const t = (ax * ey - ay * ex) / den; const q = (ax * dv - ay * du) / den;
      if (t > best && q >= -0.001 && q <= 1.001) best = t;
    }
    R[i] = best;
  }
  for (let it = 0; it < 8; it++) for (let i = 0; i < NA; i++) { const l = R[(i + NA - 1) % NA]; const r = R[(i + 1) % NA]; if (R[i] < (l + r) * 0.5 * 0.97) R[i] = (l + r) * 0.5 * 0.97; }
  return { cu, cv, R };
}

/** The lasted surface for one foot. */
function buildLast(spec, tris, sd, seat0) {
  const toe = TOE_SHAPES[spec.toe] || TOE_SHAPES.round;
  // ---- measure the foot with vertical cuts: seat height, widths, top
  let zB = 9; let zT = -9; let cx = 0; let n = 0;
  for (let t = 0; t < tris.length; t += 3) { if (tris[t + 1] < seat0 + 0.055) { zB = Math.min(zB, tris[t + 2]); cx += tris[t]; n++; } if (tris[t + 1] < spec.soleT / 100 + 0.05) zT = Math.max(zT, tris[t + 2]); }
  if (!n || zT < zB + 0.1) return null;
  cx /= n;
  const DZ = 0.005; const nm = Math.ceil((zT - zB) / DZ) + 1;
  const M = { yb: new Float32Array(nm), xl: new Float32Array(nm), xr: new Float32Array(nm), yt: new Float32Array(nm) };
  for (let j = 0; j < nm; j++) {
    const z = zB + j * DZ; const segs = slice(tris, [cx, 0, Math.min(zT - 0.001, Math.max(zB + 0.001, z))], [0, -1, 0]);
    let yb = 9; let xl = 9; let xr = -9; let yt = -9;
    for (let s = 0; s < segs.length; s += 2) { const y = -segs[s + 1]; if (y > seat0 + 0.13) continue; yb = Math.min(yb, y); yt = Math.max(yt, y); xl = Math.min(xl, segs[s] + cx); xr = Math.max(xr, segs[s] + cx); }
    M.yb[j] = yb > 8 ? NaN : yb; M.xl[j] = xl; M.xr[j] = xr; M.yt[j] = yt;
  }
  for (let j = 1; j < nm; j++) if (Number.isNaN(M.yb[j])) { M.yb[j] = M.yb[j - 1]; M.xl[j] = M.xl[j - 1]; M.xr[j] = M.xr[j - 1]; M.yt[j] = M.yt[j - 1]; }
  for (let j = nm - 2; j >= 0; j--) if (Number.isNaN(M.yb[j])) { M.yb[j] = M.yb[j + 1]; M.xl[j] = M.xl[j + 1]; M.xr[j] = M.xr[j + 1]; M.yt[j] = M.yt[j + 1]; }
  for (let it = 0; it < 4; it++) for (let j = 1; j < nm - 1; j++) M.yb[j] = (M.yb[j - 1] + 2 * M.yb[j] + M.yb[j + 1]) / 4;
  const Lf = zT - zB; const ext = toe.ext / 100 + 0.012; const zTip = zT + ext; const Ltot = zTip - zB + 0.004;
  const zBack = zB - 0.004;
  const mAt = (arr, z) => { const f = Math.max(0, Math.min(nm - 1.001, (z - zB) / DZ)); const j = Math.floor(f); return arr[j] + (arr[j + 1] - arr[j]) * (f - j); };
  const spring = (spec.toeSpring || (spec.pitch > 4 ? 0.6 : 1.0)) / 100;
  const zRef = zB + Lf * 0.7;
  // The bottom of a last is drawn, not traced: a flat heel seat under the heel bone back to the end of the shoe, one
  // smooth shank curve to the ball (rising or falling with the heel height), then the toe spring. Only three heights
  // are taken from the foot: the heel seat, the ball, and where the heel bone sits.
  let zH = zB; let yH = 9; for (let z = zB; z <= zB + Lf * 0.3; z += 0.002) { const y = mAt(M.yb, z); if (y < yH) { yH = y; zH = z; } }
  let yBall = 0; { let c = 0; for (let z = zRef - 0.012; z <= zRef + 0.012; z += 0.002) { yBall += mAt(M.yb, z); c++; } yBall /= c; }
  const zS0 = zH + 0.015; const zS1 = zRef - 0.008;
  const seatAt = (z) => (z <= zS0 ? yH : z < zS1 ? yH + (yBall - yH) * sstep(zS0, zS1, z) : yBall + spring * 0.35 * Math.pow(Math.max(0, z - zRef) / (zTip - zRef), 2));
  // ---- ease: room between foot and upper, plus the upper's own thickness
  const loose = spec.closure === 'pull-on' && !/sock/.test(spec.type);
  const easeFoot = 0.0042 + (spec.collar === 'padded' ? 0.001 : 0) + (/shearling|sheepskin|snow/.test(spec.type) ? 0.005 : 0);
  // ---- stations: leg (horizontal), fan round the heel, foot (vertical)
  const shaftTop = seat0 + (spec.cut === 'boot' || spec.cut === 'mid' ? spec.shaft / 100 : spec.straps === 'gladiator' ? 0.2 : 0.118) + 0.006;
  const yP = Math.min(seat0 + 0.118, shaftTop - 0.004);
  // front of the leg at the pivot height
  let zFront = -9; { const segs = slice(tris, [cx, yP, 0], [0, 0, -1]); for (let s = 0; s < segs.length; s += 2) zFront = Math.max(zFront, -segs[s + 1]); if (zFront < -8) zFront = zB + Lf * 0.36; }
  const zP = Math.min(zFront + 0.042, zB + Lf * 0.55);
  const st = [];
  const legN = Math.max(0, Math.ceil((shaftTop - yP) / 0.011));
  for (let k = 0; k < legN; k++) { const y = shaftTop - (k / legN) * (shaftTop - yP); st.push({ kind: 0, O: [cx, y, zP], D: [0, 0, -1] }); }
  const NF = 18; for (let j = 0; j < NF; j++) { const ph = (j / NF) * Math.PI / 2; st.push({ kind: 1, O: [cx, yP, zP], D: [0, -Math.sin(ph), -Math.cos(ph)] }); }
  for (let z = zP; z < zRef - 0.0005; z += 0.0058) st.push({ kind: 2, O: [cx, yP, z], D: [0, -1, 0] });
  st.push({ kind: 2, O: [cx, yP, zRef], D: [0, -1, 0], ref: true });
  const K0 = st.length; // toe box stations follow
  const rings = []; // [k][i] = [x,y,z]
  let prev = null;
  for (const s of st) {
    const env = envelope(slice(tris, s.O, s.D), s.kind === 0 ? -1e9 : 0.0005) || prev;
    if (!env) return null;
    prev = env;
    const F = [0, -s.D[1], -s.D[2]]; const ring = [];
    const yHere = s.O[1] + env.cv * s.D[1];
    const e = s.kind === 0 ? easeFoot + (loose ? 0.004 + 0.012 * sstep(seat0 + 0.12, seat0 + 0.3, yHere) : 0) + (spec.type === 'rain-boot' ? 0.008 : 0) : easeFoot + (loose && s.kind === 1 ? 0.003 : 0);
    const Rc = convexPolar(env.R); // a last is convex in every section: leather lasted over it bridges the gaps between toes and joints
    for (let i = 0; i < NA; i++) { const a = (i / NA) * Math.PI * 2; const r = Rc[i] + e; ring.push([s.O[0] + env.cu + Math.sin(a) * r, s.O[1] + env.cv * s.D[1] + Math.cos(a) * r * F[1], s.O[2] + env.cv * s.D[2] + Math.cos(a) * r * F[2]]); }
    rings.push(ring);
  }
  // soften along the sweep (keeps each section's shape)
  for (let it = 0; it < 4; it++) for (let k = 1; k < rings.length - 1; k++) for (let i = 0; i < NA; i++) for (let c = 0; c < 3; c++) rings[k][i][c] = (rings[k - 1][i][c] + 2 * rings[k][i][c] + rings[k + 1][i][c]) / 4;
  // flat seat: nothing below the insole
  for (const ring of rings) for (const p of ring) { const ys = seatAt(Math.max(zB, p[2])); if (p[1] < ys) p[1] = ys; }
  // ---- toe box: the reference section at the ball, drawn out to the toe shape
  const ref = rings[K0 - 1]; let rx0 = 9; let rx1 = -9; let ryt = -9; const ryb = seatAt(zRef);
  for (const p of ref) { rx0 = Math.min(rx0, p[0]); rx1 = Math.max(rx1, p[0]); ryt = Math.max(ryt, p[1]); }
  const Wref = rx1 - rx0; const Href = ryt - ryb; const cxRef = (rx0 + rx1) / 2;
  const cxToe = (mAt(M.xl, zT - 0.02) + mAt(M.xr, zT - 0.02)) / 2;
  const Htoe = 0.027 * (toe.high || 1) * (toe.taper > 0.9 ? 0.82 : 1);
  const nT = Math.max(18, Math.round((zTip - zRef) / 0.0036));
  for (let q = 1; q <= nT; q++) {
    const tau = Math.min(0.9992, 1 - Math.pow(1 - q / nT, 2.1)); const z = zRef + (zTip - zRef) * tau;
    const e1 = Math.max(1.4, 5.3 - 3.8 * toe.taper); const e2 = 0.5 + Math.max(0, toe.taper - 0.55);
    let W = Wref * Math.pow(Math.max(0, 1 - Math.pow(tau, e1)), e2);
    W = Math.max(W, toe.blunt * 0.86 * Wref * Math.pow(1 - sstep(0.9, 1, tau), 0.6));
    let H = (Htoe + (Href - Htoe) * Math.pow(1 - tau, 1.6)) * Math.pow(Math.max(0, 1 - Math.pow(tau, 5)), 0.5);
    const cxT = lerp(cxRef, cxToe, sstep(0, 0.8, tau));
    if (z < zT + 0.004) { const zz = Math.min(z, zT - 0.0005); W = Math.max(W, 2 * Math.max(mAt(M.xr, zz) - cxT, cxT - mAt(M.xl, zz)) + 2 * easeFoot + 0.005); H = Math.max(H, (mAt(M.yt, zz) - mAt(M.yb, zz)) * 1.12 + easeFoot + 0.004); }
    const yb = seatAt(z); const ring = [];
    const sq = lerp(1, 0.55, sstep(0, 0.45, tau)); // the toe box is squarer in section than the ball: room over every toe
    for (let i = 0; i < NA; i++) { const yy = Math.max(0, (ref[i][1] - ryb) / Href); const xx = (ref[i][0] - cxRef) / (Wref / 2); ring.push([cxT + Math.sign(xx) * Math.pow(Math.abs(xx), lerp(1, 0.8, sstep(0, 0.45, tau))) * (W / 2), yb + Math.pow(yy, sq) * H, z]); }
    rings.push(ring); st.push({ kind: 2, toe: true });
  }
  // fairing: leather lasted under tension lies in long, even curves. Smooth round every section and along the whole
  // last (heel, instep and toe box together), the top of the shaft and the toe tip held, then the seat made flat again
  for (let it = 0; it < 3; it++) for (const ring of rings) { const c = ring.map((p) => p.slice()); for (let i = 0; i < NA; i++) for (let q = 0; q < 3; q++) ring[i][q] = (c[(i - 1 + NA) % NA][q] + 2 * c[i][q] + c[(i + 1) % NA][q]) / 4; }
  // along the length only between the heel and the ball: the heel fan turns round the back in its own planes and the
  // toe box is drawn to its toe shape, so averaging across either would cut the heel and flatten the toe into a wedge
  { let kA = st.findIndex((q) => q.kind === 2); const kB = K0 - 1; if (kA < 1) kA = 1; for (let it = 0; it < 8; it++) for (let k = kA + 1; k < kB; k++) for (let i = 0; i < NA; i++) for (let c = 0; c < 3; c++) rings[k][i][c] = (rings[k - 1][i][c] + 2 * rings[k][i][c] + rings[k + 1][i][c]) / 4;
    // and the join between the foot sections and the toe box blended over a few sections either side
    for (let it = 0; it < 4; it++) for (let k = Math.max(kA + 1, kB - 4); k < Math.min(rings.length - 3, kB + 5); k++) for (let i = 0; i < NA; i++) for (let c = 0; c < 3; c++) rings[k][i][c] = (rings[k - 1][i][c] + 2 * rings[k][i][c] + rings[k + 1][i][c]) / 4; }
  // lasting: the bottom of the upper is pulled down and round onto the insole all the way round (heel included), so it
  // meets the sole along one clean feather edge; nothing below the insole
  // only the bottom edge and the sides are pulled under: a point whose surface faces upwards (the top of the toe box,
  // the vamp) keeps its height, so the toe box keeps its full volume
  const LB = 0.025; for (const ring of rings) { const c = [0, 0, 0]; for (const p of ring) { c[0] += p[0] / NA; c[1] += p[1] / NA; c[2] += p[2] / NA; }
    for (const p of ring) { const ys = seatAt(Math.max(zB, p[2])); const h = p[1] - ys; if (h < 0) { p[1] = ys; continue; } if (h >= LB) continue;
      const dx = p[0] - c[0]; const dy = p[1] - c[1]; const dz = p[2] - c[2]; const up = dy / (Math.hypot(dx, dy, dz) || 1); const w = 1 - sstep(-0.1, 0.45, up);
      p[1] = lerp(p[1], ys + LB * Math.pow(h / LB, 1.6), w); } }
  const K = rings.length; const N = K * NA + 1;
  const tipR = rings[K - 1]; const tip = [0, 0, zTip]; for (const p of tipR) { tip[0] += p[0] / NA; tip[1] += p[1] / NA; }
  // ---- vertex arrays and per-vertex coordinates
  const G = { K, N, P: new Float32Array(N * 3), Nn: new Float32Array(N * 3), UV: new Float32Array(N * 2), zr: new Float32Array(N), hr: new Float32Array(N), uu: new Float32Array(N), ww: new Float32Array(N), kind: new Uint8Array(N), ang: new Float32Array(N), half: new Float32Array(K), wk: new Float32Array(K), arc: [], L: Ltot, Lf, zBack, zTip, cx, seat0, seatAt, sd, M, zB, zT, DZ, nm, mAt, shaftTop, yP, easeFoot };
  for (let k = 0; k < K; k++) for (let i = 0; i < NA; i++) G.P.set(rings[k][i], (k * NA + i) * 3);
  G.P.set(tip, (N - 1) * 3);
  for (let k = K - 2; k >= 0; k--) { const a = rings[k][0]; const b = rings[k + 1][0]; G.wk[k] = G.wk[k + 1] + Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
  for (let k = 0; k < K; k++) {
    const arc = new Float32Array(NA + 1); for (let i = 0; i < NA; i++) { const a = rings[k][i]; const b = rings[k][(i + 1) % NA]; arc[i + 1] = arc[i] + Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
    G.arc.push(arc); G.half[k] = arc[NA] / 2;
    for (let i = 0; i < NA; i++) { const v = k * NA + i; const p = rings[k][i]; G.zr[v] = p[2] - zBack; G.hr[v] = p[1] - seatAt(Math.max(zB, p[2])); G.uu[v] = i <= NA / 2 ? arc[i] : -(arc[NA] - arc[i]); G.ww[v] = G.wk[k]; G.kind[v] = st[k].kind; G.ang[v] = (i / NA) * Math.PI * 2; G.UV[v * 2] = G.uu[v] * 10; G.UV[v * 2 + 1] = (G.wk[k]) * 10; }
  }
  G.zr[N - 1] = Ltot; G.hr[N - 1] = tip[1] - seatAt(zTip); G.kind[N - 1] = 2; G.UV[(N - 1) * 2 + 1] = 0;
  const T = [];
  for (let k = 0; k + 1 < K; k++) for (let i = 0; i < NA; i++) { const a = k * NA + i; const b = k * NA + (i + 1) % NA; const c = (k + 1) * NA + i; const d = (k + 1) * NA + (i + 1) % NA; T.push(a, b, c, b, d, c); }
  for (let i = 0; i < NA; i++) T.push((K - 1) * NA + i, (K - 1) * NA + (i + 1) % NA, N - 1);
  G.T = new Uint32Array(T);
  // normals (smooth), pointing out
  const P = G.P; const Nn = G.Nn;
  for (let t = 0; t < G.T.length; t += 3) { const a = G.T[t] * 3; const b = G.T[t + 1] * 3; const c = G.T[t + 2] * 3; const ux = P[b] - P[a]; const uy = P[b + 1] - P[a + 1]; const uz = P[b + 2] - P[a + 2]; const vx = P[c] - P[a]; const vy = P[c + 1] - P[a + 1]; const vz = P[c + 2] - P[a + 2]; const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx; for (const q of [a, b, c]) { Nn[q] += nx; Nn[q + 1] += ny; Nn[q + 2] += nz; } }
  { const v = (Math.floor(K / 3) * NA) * 3; const kc = Math.floor(K / 3); let ccx = 0; for (let i = 0; i < NA; i++) ccx += rings[kc][i][0] / NA; G.flip = Nn[v + NA / 4 * 3] * (P[v + NA / 4 * 3] - ccx) < 0; }
  for (let v = 0; v < N; v++) { const l = (Math.hypot(Nn[v * 3], Nn[v * 3 + 1], Nn[v * 3 + 2]) || 1) * (G.flip ? -1 : 1); Nn[v * 3] /= l; Nn[v * 3 + 1] /= l; Nn[v * 3 + 2] /= l; }
  return G;
}

/** Cut the region mask > 0 out of the last as its own piece, lifted off the surface by `off`. */
export function clip(G, mask, off = 0, lvl = 0) {
  const pos = []; const nor = []; const uv = []; const cuts = [];
  const { P, Nn, UV, T } = G;
  const put = (a, b, t) => {
    const nx = Nn[a * 3] + (Nn[b * 3] - Nn[a * 3]) * t; const ny = Nn[a * 3 + 1] + (Nn[b * 3 + 1] - Nn[a * 3 + 1]) * t; const nz = Nn[a * 3 + 2] + (Nn[b * 3 + 2] - Nn[a * 3 + 2]) * t; const l = Math.hypot(nx, ny, nz) || 1;
    const o = typeof off === 'function' ? off(a, b, t) : off;
    pos.push(P[a * 3] + (P[b * 3] - P[a * 3]) * t + (nx / l) * o, P[a * 3 + 1] + (P[b * 3 + 1] - P[a * 3 + 1]) * t + (ny / l) * o, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * t + (nz / l) * o);
    nor.push(nx / l, ny / l, nz / l); uv.push(UV[a * 2] + (UV[b * 2] - UV[a * 2]) * t, UV[a * 2 + 1] + (UV[b * 2 + 1] - UV[a * 2 + 1]) * t);
  };
  for (let t = 0; t < T.length; t += 3) {
    const v = [T[t], T[t + 1], T[t + 2]]; const m = [mask[v[0]] - lvl, mask[v[1]] - lvl, mask[v[2]] - lvl];
    const inside = (m[0] > 0) + (m[1] > 0) + (m[2] > 0);
    if (!inside) continue;
    if (inside === 3) { if (G.flip) { put(v[0], v[0], 0); put(v[2], v[2], 0); put(v[1], v[1], 0); } else for (const q of v) put(q, q, 0); continue; }
    const poly = []; const cut = [];
    for (let e = 0; e < 3; e++) { const a = v[e]; const b = v[(e + 1) % 3]; const ma = m[e]; const mb = m[(e + 1) % 3]; if (ma > 0) poly.push([a, a, 0]); if ((ma > 0) !== (mb > 0)) { const s = ma / (ma - mb); poly.push([a, b, s]); cut.push([a, b, s]); } }
    if (G.flip) poly.reverse();
    for (let q = 1; q + 1 < poly.length; q++) { put(...poly[0]); put(...poly[q]); put(...poly[q + 1]); }
    if (cut.length === 2) cuts.push(cut);
  }
  return { pos, nor, uv, cuts };
}

/** The line where mask = lvl, as ordered polylines of { p, n } on the surface. */
export function isoLines(G, mask, lvl = 0, off = 0.0006, keep = null) {
  const { P, Nn, T } = G; const segs = []; const adj = new Map();
  const key = (a, b) => (a < b ? a * G.N + b : b * G.N + a);
  for (let t = 0; t < T.length; t += 3) {
    const v = [T[t], T[t + 1], T[t + 2]]; const m = [mask[v[0]] - lvl, mask[v[1]] - lvl, mask[v[2]] - lvl]; const c = [];
    for (let e = 0; e < 3; e++) { const a = v[e]; const b = v[(e + 1) % 3]; if ((m[e] > 0) !== (m[(e + 1) % 3] > 0)) c.push([a, b, m[e] / (m[e] - m[(e + 1) % 3])]); }
    if (c.length !== 2) continue;
    if (keep && !(keep(v[0]) && keep(v[1]) && keep(v[2]))) continue;
    const id = segs.length; segs.push(c);
    for (const q of c) { const k = key(q[0], q[1]); if (!adj.has(k)) adj.set(k, []); adj.get(k).push(id); }
  }
  const pt = ([a, b, s]) => { const nx = Nn[a * 3] + (Nn[b * 3] - Nn[a * 3]) * s; const ny = Nn[a * 3 + 1] + (Nn[b * 3 + 1] - Nn[a * 3 + 1]) * s; const nz = Nn[a * 3 + 2] + (Nn[b * 3 + 2] - Nn[a * 3 + 2]) * s; const l = Math.hypot(nx, ny, nz) || 1; const n = new THREE.Vector3(nx / l, ny / l, nz / l); return { p: new THREE.Vector3(P[a * 3] + (P[b * 3] - P[a * 3]) * s, P[a * 3 + 1] + (P[b * 3 + 1] - P[a * 3 + 1]) * s, P[a * 3 + 2] + (P[b * 3 + 2] - P[a * 3 + 2]) * s).addScaledVector(n, off), n }; };
  const used = new Uint8Array(segs.length); const lines = [];
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (used[s0]) continue; used[s0] = 1;
    const line = [pt(segs[s0][0]), pt(segs[s0][1])];
    for (const dir of [1, 0]) {
      let cur = s0; let end = segs[s0][dir];
      for (;;) { const nb = (adj.get(key(end[0], end[1])) || []).find((q) => !used[q]); if (nb === undefined) break; used[nb] = 1; const sg = segs[nb]; const other = key(sg[0][0], sg[0][1]) === key(end[0], end[1]) ? sg[1] : sg[0]; if (dir) line.push(pt(other)); else line.unshift(pt(other)); end = other; cur = nb; }
    }
    if (line.length > 2) lines.push(line);
  }
  return lines;
}

export const geoOf = (c) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(c.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(c.uv, 2)); return g; };

export function merge(geos) {
  const pos = []; const nor = [];
  for (const g0 of geos) { const g = g0.index ? g0.toNonIndexed() : g0; if (!g.attributes.normal) g.computeVertexNormals(); pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g;
}

/** A flat or round strand swept along points with surface normals (laces, straps, zips, pull loops). */
export function strand(pts, nors, width, thick, round = false) {
  const n = pts.length; const pos = []; const idx = []; const R = round ? 8 : 4;
  for (let i = 0; i < n; i++) {
    const t = new THREE.Vector3().subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
    const nn = nors[i].clone().addScaledVector(t, -nors[i].dot(t)).normalize(); const b = new THREE.Vector3().crossVectors(t, nn);
    for (let q = 0; q < R; q++) {
      let ox; let oy;
      if (round) { const a = (q / R) * Math.PI * 2; ox = Math.cos(a) * width / 2; oy = Math.sin(a) * thick / 2; } else { ox = (q === 0 || q === 3 ? -1 : 1) * width / 2; oy = (q < 2 ? -1 : 1) * thick / 2; }
      pos.push(pts[i].x + b.x * ox + nn.x * oy, pts[i].y + b.y * ox + nn.y * oy, pts[i].z + b.z * ox + nn.z * oy);
    }
  }
  for (let i = 0; i + 1 < n; i++) for (let q = 0; q < R; q++) { const a = i * R + q; const b2 = i * R + (q + 1) % R; const c = a + R; const d = b2 + R; idx.push(a, c, b2, b2, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const out = round ? g : g.toNonIndexed(); out.computeVertexNormals(); return out;
}

/** Place a small part at a point on the surface: x = across (towards +u), y = out of the surface, z = along the lace line. */
export function seatM(o, flipX = 1) {
  const y = o.n.clone(); const x = o.tu.clone().multiplyScalar(flipX); x.addScaledVector(y, -x.dot(y)).normalize(); const z = new THREE.Vector3().crossVectors(x, y);
  return new THREE.Matrix4().makeBasis(x, y, z).setPosition(o.p);
}

/** The open hook riveted to work and hiking boots: base plate, post, and the lip the lace seats under. */
function speedHook() {
  const mm = 0.001; const c = [[5.2, 0.55], [1.5, 0.55], [-2.2, 0.6], [-3.3, 1.5], [-3.4, 3.0], [-2.6, 4.3], [-0.9, 4.9], [1.4, 4.7], [2.9, 3.9], [3.3, 3.1]];
  const L = []; const Rr = []; const th = 0.55;
  for (let i = 0; i < c.length; i++) { const a = c[Math.max(0, i - 1)]; const b = c[Math.min(c.length - 1, i + 1)]; const dx = b[0] - a[0]; const dy = b[1] - a[1]; const l = Math.hypot(dx, dy); const nx = -dy / l; const ny = dx / l; L.push([c[i][0] + nx * th, c[i][1] + ny * th]); Rr.push([c[i][0] - nx * th, c[i][1] - ny * th]); }
  const sh = new THREE.Shape(); const all = [...L, ...Rr.reverse()]; sh.moveTo(all[0][0] * mm, all[0][1] * mm); for (const q of all.slice(1)) sh.lineTo(q[0] * mm, q[1] * mm); sh.closePath();
  const hook = new THREE.ExtrudeGeometry(sh, { depth: 5.4 * mm, bevelEnabled: true, bevelSize: 0.25 * mm, bevelThickness: 0.25 * mm, bevelSegments: 1, curveSegments: 4 }); hook.translate(0, 0, -2.7 * mm);
  const base = new THREE.CylinderGeometry(4.3 * mm, 4.6 * mm, 0.9 * mm, 16); base.translate(2.2 * mm, 0.45 * mm, 0);
  const rivet = new THREE.SphereGeometry(1.5 * mm, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); rivet.translate(3.2 * mm, 0.9 * mm, 0);
  return merge([hook, base, rivet]);
}
function eyelet(hex) { const g = new THREE.TorusGeometry(0.0034, 0.0011, 6, hex ? 6 : 18); g.rotateX(Math.PI / 2); g.scale(1, 0.55, 1); g.translate(0, 0.0005, 0); return g; }
function dRing() {
  const mm = 0.001; const tab = new THREE.BoxGeometry(9 * mm, 1.6 * mm, 8 * mm); tab.translate(3.5 * mm, 0.8 * mm, 0);
  const riv = new THREE.SphereGeometry(1.4 * mm, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2); riv.translate(5 * mm, 1.6 * mm, 0);
  const ring = new THREE.TorusGeometry(5 * mm, 0.95 * mm, 6, 14, Math.PI); ring.rotateX(Math.PI / 2); ring.rotateY(Math.PI / 2); ring.rotateZ(0.35); ring.translate(-1.2 * mm, 1.6 * mm, 0);
  const bar = new THREE.CylinderGeometry(0.95 * mm, 0.95 * mm, 10 * mm, 6); bar.rotateX(Math.PI / 2); bar.translate(-1.2 * mm, 1.6 * mm, 0);
  return { tab: merge([tab]), metal: merge([riv, ring, bar]) };
}
export function buckle(w = 0.016) {
  const r = 0.0011; const h = w + 0.004; const l = 0.013; const parts = [];
  for (const z of [-h / 2, h / 2]) { const c = new THREE.CylinderGeometry(r, r, l, 6); c.rotateZ(Math.PI / 2); c.translate(0, 0.0022, z); parts.push(c); }
  for (const x of [-l / 2, l / 2]) { const c = new THREE.CylinderGeometry(x < 0 ? r : r * 1.5, x < 0 ? r : r * 1.5, h, 8); c.rotateX(Math.PI / 2); c.translate(x, 0.0022, 0); parts.push(c); }
  const prong = new THREE.CylinderGeometry(0.0007, 0.0007, l, 5); prong.rotateZ(Math.PI / 2); prong.translate(0, 0.0034, 0); parts.push(prong);
  return merge(parts);
}

const soleLook = (id, color) => { const m = SOLE_MATERIALS[id] || SOLE_MATERIALS.rubber; return new THREE.MeshPhysicalMaterial({ color: color || m.look[0], roughness: m.look[1], metalness: 0, clearcoat: id === 'abs' ? 0.6 : 0, transparent: id === 'translucent', opacity: id === 'translucent' ? 0.82 : 1, side: THREE.DoubleSide }); };

/** Outsole, midsole, welt and heel under the lasted upper. */
function buildBottom(spec, G, group, upperColor) {
  const C = CONSTRUCTIONS[spec.construction] || {}; const H = HEELS[spec.heel] || HEELS.flat;
  const unit = Boolean(H.wedge) || spec.heel === 'flat' || spec.heelH <= spec.soleT + 0.6;
  const ext = spec.ext / 100 + (C.welt ? 0.0015 : 0); // edge projection past the upper: about 4 mm on a cemented sole, 5 to 6 mm with a welt
  // planform from the upper's own feather edge
  const foxUp = C.foxing ? 0.024 : C.cup ? 0.018 : spec.construction === 'moulded' && spec.cut !== 'open' ? 0.012 : spec.construction === 'strobel' || (spec.midsole === 'eva' && unit) ? 0.008 : 0;
  const DZ = 0.0025; const nb = Math.ceil((G.zTip - G.zBack) / DZ) + 1; const xl = new Float32Array(nb).fill(9); const xr = new Float32Array(nb).fill(-9);
  // the feather edge: the lowest 6 mm of the upper at every station along the foot (measured from that station's own bottom)
  const yMinB = new Float32Array(nb).fill(9); for (let v = 0; v < G.N; v++) { if (G.kind[v] === 0) continue; const j = Math.round((G.P[v * 3 + 2] - G.zBack) / DZ); if (j >= 0 && j < nb && G.P[v * 3 + 1] < yMinB[j]) yMinB[j] = G.P[v * 3 + 1]; }
  for (let v = 0; v < G.N; v++) { if (G.kind[v] === 0) continue; const j = Math.round((G.P[v * 3 + 2] - G.zBack) / DZ); if (j < 0 || j >= nb || G.P[v * 3 + 1] > yMinB[j] + 0.006 + foxUp) continue; xl[j] = Math.min(xl[j], G.P[v * 3]); xr[j] = Math.max(xr[j], G.P[v * 3]); }
  let j0 = 0; while (j0 < nb && xl[j0] > 8) j0++; let j1 = nb - 1; while (j1 > 0 && xl[j1] > 8) j1--;
  // The sole is cut to the bottom pattern of the last: one smooth, convex curve round the whole footprint (heel seat,
  // waist, ball, toe), never the bumps of single toes or of the mesh. The convex hull of the footprint is drawn into a
  // smooth curve (averaged over 6 cm along its length, which keeps it convex and rounds the toe and heel), set out by the sole's
  // extension past the upper, and read across at stations packed closer at the toe and heel.
  const zs = []; const L = []; const R = [];
  {
    // the feather edge of the upper: its left edge from heel to toe and its right edge back again (gaps bridged)
    for (let j = j0 + 1; j < j1; j++) if (xl[j] > 8) { let e = j; while (xl[e] > 8) e++; for (let q = j; q < e; q++) { const t = (q - j + 1) / (e - j + 1); xl[q] = xl[j - 1] + (xl[e] - xl[j - 1]) * t; xr[q] = xr[j - 1] + (xr[e] - xr[j - 1]) * t; } j = e; }
    // stray points (counter, heel construction) are dropped: a running median over 2.5 cm of the edge on each side
    { const med = (arr, j) => { const w = []; for (let d = -5; d <= 5; d++) { const q = Math.min(j1, Math.max(j0, j + d)); w.push(arr[q]); } w.sort((p, q) => p - q); return w[5]; }; const ml = []; const mr = []; for (let j = j0; j <= j1; j++) { ml.push(med(xl, j)); mr.push(med(xr, j)); } for (let j = j0; j <= j1; j++) { xl[j] = Math.min(ml[j - j0], mr[j - j0]); xr[j] = Math.max(ml[j - j0], mr[j - j0]); } }
    const raw = []; for (let j = j0; j <= j1; j++) raw.push([xl[j], G.zBack + j * DZ]); for (let j = j1; j >= j0; j--) raw.push([xr[j], G.zBack + j * DZ]);
    const cum = [0]; for (let i = 1; i <= raw.length; i++) { const a = raw[i - 1]; const b = raw[i % raw.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const per = cum[cum.length - 1]; const M = Math.max(80, Math.round(per / 0.002)); const ev = []; { let k = 0; for (let q = 0; q < M; q++) { const s0 = (q / M) * per; while (cum[k + 1] < s0) k++; const a = raw[k]; const b = raw[(k + 1) % raw.length]; const t = (s0 - cum[k]) / (cum[k + 1] - cum[k] || 1); ev.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    const win = Math.max(2, Math.round(0.03 / (per / M))); let sm = ev.map((_, i) => { let x = 0; let z = 0; let w = 0; for (let d = -win; d <= win; d++) { const q = ev[(i + d + M) % M]; const wt = 1 - Math.abs(d) / (win + 1); x += q[0] * wt; z += q[1] * wt; w += wt; } return [x / w, z / w]; });
    // outward normals of the drawn curve; how far the upper's real edge still lies outside it (true distance), then set out
    const nrm = sm.map((q, i) => { const a = sm[(i - 1 + M) % M]; const b = sm[(i + 1) % M]; let nx = b[1] - a[1]; let nz = -(b[0] - a[0]); const l = Math.hypot(nx, nz) || 1; return [nx / l, nz / l]; });
    { let area = 0; for (let i = 0; i < M; i++) { const p = sm[i]; const q = sm[(i + 1) % M]; area += p[0] * q[1] - q[0] * p[1]; } if (area < 0) for (const n of nrm) { n[0] = -n[0]; n[1] = -n[1]; } }
    const outBy = new Float32Array(M); for (const q of ev) { let bi = 0; let bd = 9; for (let i = 0; i < M; i++) { const d = Math.hypot(q[0] - sm[i][0], q[1] - sm[i][1]); if (d < bd) { bd = d; bi = i; } } const o = (q[0] - sm[bi][0]) * nrm[bi][0] + (q[1] - sm[bi][1]) * nrm[bi][1]; if (o > outBy[bi]) outBy[bi] = o; }
    // one even set-out all round (the welt or sole edge projection), enough to cover the upper's edge everywhere it can
    const ob = Array.from(outBy).sort((p, q) => p - q); const off = ext + Math.min(0.001, ob[Math.floor(ob.length * 0.5)] || 0);
    sm = sm.map((q, i) => [q[0] + nrm[i][0] * off, q[1] + nrm[i][1] * off]);
    // each side of the sole read as its own edge from heel to toe, kept monotone along the foot
    const iMin = sm.reduce((bi, q, i) => (q[1] < sm[bi][1] ? i : bi), 0); const iMax = sm.reduce((bi, q, i) => (q[1] > sm[bi][1] ? i : bi), 0);
    const chain = (dir) => { const c = []; let zz = -9; for (let i = iMin; ; i = (i + dir + M) % M) { const q = sm[i]; if (q[1] > zz) { c.push(q); zz = q[1]; } if (i === iMax) break; } return c; };
    let cA = chain(1); let cB = chain(-1); if (cA.reduce((t, q) => t + q[0], 0) / cA.length > cB.reduce((t, q) => t + q[0], 0) / cB.length) [cA, cB] = [cB, cA];
    const xAt = (c, z) => { if (z <= c[0][1]) return c[0][0]; for (let i = 1; i < c.length; i++) if (c[i][1] >= z) { const t = (z - c[i - 1][1]) / (c[i][1] - c[i - 1][1] || 1); return c[i - 1][0] + (c[i][0] - c[i - 1][0]) * t; } return c[c.length - 1][0]; };
    const zMin = sm[iMin][1]; const zMax = sm[iMax][1]; const NS = Math.max(60, Math.round((zMax - zMin) / DZ));
    for (let k = 0; k <= NS; k++) { const t = k / NS; const z = zMin + (zMax - zMin) * (0.5 - 0.5 * Math.cos(Math.PI * t)); if (k === 0 || k === NS) { const q = sm[k === 0 ? iMin : iMax]; zs.push(q[1]); L.push(q[0] - 1e-5); R.push(q[0] + 1e-5); continue; } zs.push(z); L.push(xAt(cA, z)); R.push(xAt(cB, z)); }
  }
  group.userData.sole = { zs: zs.slice(), L: L.slice(), R: R.slice() };
  const n = zs.length; const soleT = spec.soleT / 100; const spring = (spec.toeSpring || (spec.pitch > 4 ? 0.6 : 1.0)) / 100; const zRef = G.zB + G.Lf * 0.7;
  const top = zs.map((z) => G.seatAt(Math.max(G.zB, Math.min(G.zTip, z))));
  const ground = zs.map((z) => (z > zRef ? spring * 0.35 * Math.pow((z - zRef) / (G.zTip - zRef), 2) : 0) + (spec.rocker && z < G.zB + 0.03 ? (G.zB + 0.03 - z) * 0.25 : 0));
  const zr = zs.map((z) => z - G.zBack);
  const bot = zs.map((z, i) => (unit ? ground[i] : Math.max(ground[i], top[i] - lerp(0.0045, Math.max(0.0045, soleT), sstep(0.4 * G.L, 0.6 * G.L, zr[i])))));
  const lugged = ['commando', 'lug', 'cleats'].includes(spec.tread); const recess = lugged ? (spec.tread === 'cleats' ? Math.max(0.006, soleT - 0.004) : Math.min(0.006, soleT * 0.4)) : 0;
  // bands from the top down: [name, material, y(i) top, y(i) bottom]
  const thick = (i) => top[i] - bot[i];
  const weltT = C.welt ? 0.0032 : 0; const outT = (i) => Math.max(0.003, Math.min(thick(i) - weltT, unit ? Math.min(0.009, soleT * 0.35) + recess : thick(i) - weltT - (spec.midsole && spec.midsole !== 'none' ? Math.max(0.003, thick(i) * 0.4) : 0)));
  const hasMid = unit ? true : spec.midsole && spec.midsole !== 'none';
  const outsoleMat = soleLook(spec.outsole, spec.outsoleColor);
  const edgeCol = spec.weltColor || (spec.outsole === 'leather' ? new THREE.Color(upperColor).multiplyScalar(0.45).getStyle() : null);
  const midId = spec.midsole && spec.midsole !== 'none' ? spec.midsole : unit ? spec.outsole : 'leather';
  const midMat = soleLook(midId, spec.midsoleColor || (C.foxing || C.cup ? '#f1eee6' : spec.midsole === 'none' || !spec.midsole ? (spec.outsoleColor || null) : null));
  const weltMat = soleLook('leather', spec.weltColor || (C.welt ? '#b88a55' : edgeCol));
  if (spec.outsole === 'leather' && !spec.outsoleColor) outsoleMat.color.set(edgeCol || '#3a2416');
  const bands = [];
  if (weltT) bands.push([weltMat, (i) => top[i], (i) => top[i] - weltT]);
  if (hasMid) bands.push([midMat, (i) => top[i] - weltT + (weltT ? 0 : foxUp), (i) => bot[i] + outT(i)]);
  bands.push([outsoleMat, (i) => (hasMid ? bot[i] + outT(i) : top[i] - weltT + (weltT ? 0 : foxUp)), (i) => bot[i] + recess]);
  // inward direction of the outline at each station, on each side
  const nrmL = []; const nrmR = []; for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1); const b = Math.min(n - 1, i + 1); const dz = zs[b] - zs[a]; let dx = L[b] - L[a]; let l = Math.hypot(dx, dz) || 1; nrmL.push([dz / l, -dx / l]); dx = R[b] - R[a]; l = Math.hypot(dx, dz) || 1; nrmR.push([-dz / l, dx / l]); }
  const PROF = {
    square: [[0, 0.0005], [0.12, 0], [0.88, 0], [1, 0.0007]], // trimmed leather edge, just broken at the corners
    bevel: [[0, 0.0003], [0.1, 0], [0.55, 0], [0.8, 0.0008], [1, 0.0032]], // rubber outsole rolling under
    cup: [[0, 0.0022], [0.07, 0.0007], [0.2, 0], [0.75, 0], [0.92, 0.0006], [1, 0.0012]], // cupsole / foxing: lip leaning onto the upper
    sculpt: [[0, 0.0026], [0.1, 0.0008], [0.3, 0.0002], [0.55, -0.0012], [0.8, -0.0026], [0.93, -0.0022], [1, -0.0008]], // foam midsole flaring out to the ground
    round: [[0, 0.0016], [0.1, 0.0004], [0.3, 0], [0.7, 0], [0.9, 0.0005], [1, 0.0018]],
  };
  const wall = (yA, yB, prof = PROF.square) => { const pos = []; const idx = []; const m = prof.length;
    for (let i = 0; i < n; i++) for (const side of [0, 1]) for (const [v, ins] of prof) { const nn = side ? nrmR[i] : nrmL[i]; const x0 = side ? R[i] : L[i]; const hw = (R[i] - L[i]) / 2; const k = Math.min(ins, hw * 0.6); pos.push(x0 + nn[0] * k, yA(i) + (yB(i) - yA(i)) * v, zs[i] + nn[1] * k); }
    for (let i = 0; i + 1 < n; i++) for (const side of [0, 1]) for (let q = 0; q + 1 < m; q++) { const a = (i * 2 + side) * m + q; const b = ((i + 1) * 2 + side) * m + q; if (side) idx.push(a, a + 1, b, a + 1, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const capG = (y, up) => { const pos = []; const idx = []; for (let i = 0; i < n; i++) pos.push(L[i], y(i), zs[i], R[i], y(i), zs[i]); for (let i = 0; i + 1 < n; i++) { const a = i * 2; if (up) idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); else idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const runner = spec.midsole === 'eva' && unit && (spec.rocker || spec.toeSpring > 1.1 || /chunky|runner|trainer/.test(spec.type));
  bands.forEach(([mat, yA, yB], bi) => { const last = bi === bands.length - 1; const prof = mat === weltMat ? PROF.square : last ? (spec.outsole === 'leather' ? PROF.square : PROF.bevel) : foxUp && !runner ? PROF.cup : runner ? PROF.sculpt : spec.outsole === 'leather' || spec.midsole === 'leather' ? PROF.square : PROF.round; group.add(shell(new THREE.Mesh(wall(yA, yB, bands.length === 1 && spec.outsole !== 'leather' ? PROF.round : prof), mat))); });
  const footbed = new THREE.MeshStandardMaterial({ color: spec.liningColor || '#c9a27a', roughness: 0.8, side: THREE.DoubleSide });
  group.add(shell(new THREE.Mesh(capG((i) => top[i] + (weltT ? 0 : foxUp) * 0 + 0.0002, true), spec.cut === 'open' ? footbed : weltT ? weltMat : midMat)));
  if (foxUp) { // the rim of a cup sole / foxing closes onto the upper
    const rim = []; const ri = []; for (let i = 0; i < n; i++) { const c = (L[i] + R[i]) / 2; const wI = Math.max(0, (R[i] - L[i]) / 2 - ext - 0.0005); rim.push(L[i], top[i] + foxUp, zs[i], c - wI, top[i] + foxUp - 0.001, zs[i], R[i], top[i] + foxUp, zs[i], c + wI, top[i] + foxUp - 0.001, zs[i]); }
    for (let i = 0; i + 1 < n; i++) { const a = i * 4; const b = a + 4; ri.push(a, a + 1, b, a + 1, b + 1, b, a + 2, b + 2, a + 3, a + 3, b + 2, b + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3)); g.setIndex(ri); g.computeVertexNormals(); group.add(new THREE.Mesh(g, midMat));
  }
  { const k = spec.outsole === 'leather' ? 0.0007 : 0.0032; const L0 = L.slice(); const R0 = R.slice(); const z0 = zs.slice(); for (let i = 0; i < n; i++) { const hw = (R0[i] - L0[i]) / 2; const q = Math.min(k, hw * 0.6); L[i] = L0[i] + nrmL[i][0] * q; R[i] = R0[i] + nrmR[i][0] * q; }
    group.add(shell(new THREE.Mesh(capG((i) => bot[i] + recess, false), outsoleMat))); for (let i = 0; i < n; i++) { L[i] = L0[i]; R[i] = R0[i]; zs[i] = z0[i]; } }
  const lineMat = (col) => new THREE.LineBasicMaterial({ color: col });
  const loop = (y, col, inset = 0) => { const pts = []; for (let i = 0; i < n; i++) pts.push(new THREE.Vector3(L[i] + inset - 0.0003, y(i), zs[i])); for (let i = n - 1; i >= 0; i--) pts.push(new THREE.Vector3(R[i] - inset + 0.0003, y(i), zs[i])); pts.push(pts[0]); return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat(col)); };
  if (C.foxing) { group.add(loop((i) => top[i] + foxUp * 0.55, spec.stitchColor || '#1b1b1b')); group.add(loop((i) => top[i] + foxUp * 0.45, spec.stitchColor || '#1b1b1b')); }
  if (spec.outsole === 'jute' || spec.midsole === 'jute') for (let y = 0.004; y < soleT + (spec.pitch || 0) / 100; y += 0.0042) group.add(loop((i) => Math.min(top[i] - 0.001, bot[i] + y), '#8f7a52'));
  if (spec.midsole === 'cork' || spec.outsole === 'cork') group.add(loop((i) => bot[i] + outT(i), '#6d5132'));
  // welt stitching: the row of stitches you see from above on a welted shoe
  if (C.stitched && ext > 0.002) {
    const mk = (side, ins) => { const pts = []; for (let i = 1; i < n - 1; i++) pts.push(new THREE.Vector3(side < 0 ? L[i] + ins : R[i] - ins, top[i] + (foxUp ? foxUp * 0.5 : 0.0006), zs[i])); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: spec.stitchColor || (C.cup ? '#e9e6dd' : '#e8d9b6'), dashSize: 0.0032, gapSize: 0.0014 })); ln.computeLineDistances(); return ln; };
    const ins = C.cup ? -0.0004 : ext * 0.5;
    group.add(mk(-1, ins), mk(1, ins));
    if (C.side) { const ln = loop((i) => top[i] + 0.005, spec.stitchColor || '#e8d9b6', ext + 0.0006); ln.material = new THREE.LineDashedMaterial({ color: spec.stitchColor || '#e8d9b6', dashSize: 0.004, gapSize: 0.002 }); ln.computeLineDistances(); group.add(ln); }
  }
  if (C.storm) { const pts = []; const nr = []; for (let i = 1; i < n - 1; i++) { pts.push(new THREE.Vector3(L[i] + ext - 0.0006, top[i] + 0.0012, zs[i])); nr.push(new THREE.Vector3(0, 1, 0)); } for (let i = n - 2; i > 0; i--) { pts.push(new THREE.Vector3(R[i] - ext + 0.0006, top[i] + 0.0012, zs[i])); nr.push(new THREE.Vector3(0, 1, 0)); } group.add(new THREE.Mesh(strand(pts, nr, 0.0028, 0.0028, true), weltMat)); }
  // ---- tread: perimeter cleats and centre blocks, or studs
  if (lugged) {
    const blocks = [];
    if (spec.tread === 'cleats') { for (const [f, s] of [[0.1, -0.5], [0.1, 0.5], [0.22, -0.55], [0.22, 0.55], [0.58, -0.6], [0.58, 0.6], [0.7, 0], [0.76, -0.6], [0.76, 0.6], [0.9, -0.35], [0.9, 0.35]]) { const z = G.zBack + f * G.L; const i = Math.max(0, zs.findIndex((q) => q >= z)); const c = (L[i] + R[i]) / 2; const w = (R[i] - L[i]) / 2; const st = new THREE.CylinderGeometry(0.0062, 0.0042, recess, 10); st.translate(c + s * w, bot[i] + recess / 2, z); blocks.push(st); } } else {
      let acc = 0; for (let i = 2; i < n - 2; i++) { acc += zs[i] - zs[i - 1]; if (acc < 0.017) continue; acc = 0; if (!unit && zr[i] > H.breast * G.L - 0.004 && zr[i] < 0.42 * G.L) continue; const yb = bot[i] + recess / 2; for (const sgn of [-1, 1]) { const x = sgn < 0 ? L[i] + 0.006 : R[i] - 0.006; const b = new THREE.BoxGeometry(0.012, recess, 0.011); b.translate(x, yb, zs[i]); blocks.push(b); } const c = (L[i] + R[i]) / 2; if (R[i] - L[i] > 0.05) { if (spec.tread === 'commando') { const b1 = new THREE.BoxGeometry(0.018, recess, 0.005); b1.translate(c, yb, zs[i]); const b2 = new THREE.BoxGeometry(0.005, recess, 0.012); b2.translate(c, yb, zs[i]); blocks.push(b1, b2); } else { const b1 = new THREE.BoxGeometry((R[i] - L[i]) * 0.36, recess, 0.01); b1.translate(c, yb, zs[i]); blocks.push(b1); } } }
    }
    if (blocks.length) group.add(new THREE.Mesh(merge(blocks), outsoleMat));
  }
  // ---- heel
  if (!unit) {
    const zBr = H.breast * G.L; const ring = []; // planform of the heel seat
    for (let i = 0; i < n; i++) if (zr[i] <= zBr) ring.push([L[i] + 0.0006, zs[i], i]);
    const lastI = ring[ring.length - 1][2];
    { const xa = L[lastI] + 0.0006; const xb = R[lastI] - 0.0006; const dip = H.pin ? 0.002 : Math.min(0.007, (xb - xa) * 0.11); for (let q = 1; q < 12; q++) { const t = q / 12; ring.push([xa + (xb - xa) * t, zs[lastI] - dip * Math.sin(Math.PI * t), lastI]); } } // the breast is cut in a curve
    for (let i = lastI; i >= 0; i--) ring.push([R[i] - 0.0006, zs[i], i]);
    const cxh = (L[lastI] + R[lastI]) / 2; const zc = lerp(zs[0], G.zBack + zBr, H.pin ? 0.42 : 0.5);
    const Hh = Math.max(...ring.map((q) => bot[q[2]]));
    const levels = 18; const liftH = Math.min(0.006, Hh * 0.2);
    const mk = (v0, v1, mat, nl) => { const pos = []; const idx = []; const m = ring.length;
      for (let q = 0; q <= nl; q++) { const v = lerp(v0, v1, q / nl); const s = H.flare ? 1 - H.taper * Math.sin(Math.PI * Math.min(1, v * 1.15)) * 0.9 - H.taper * 0.15 * v : 1 - H.taper * Math.pow(v, H.pin ? 0.5 : 1); const sh = (H.slant || 0) * Hh * 0.45 * v; for (const [x, z, i] of ring) pos.push(cxh + (x - cxh) * s, bot[i] * (1 - v), zc + (z - zc) * s + sh); }
      for (let q = 0; q < nl; q++) for (let a = 0; a < m; a++) { const b = (a + 1) % m; const p0 = q * m + a; const p1 = q * m + b; const p2 = p0 + m; const p3 = p1 + m; idx.push(p0, p1, p2, p1, p3, p2); }
      const base0 = pos.length / 3; { const v = v1; const s = H.flare ? 1 - H.taper * Math.sin(Math.PI * Math.min(1, v * 1.15)) * 0.9 - H.taper * 0.15 * v : 1 - H.taper * Math.pow(v, H.pin ? 0.5 : 1); const sh = (H.slant || 0) * Hh * 0.45 * v; for (const [x, z, i] of ring) pos.push(cxh + (x - cxh) * s, bot[i] * (1 - v), zc + (z - zc) * s + sh); }
      const cI = pos.length / 3; { const v = v1; const s = H.flare ? 1 - H.taper * Math.sin(Math.PI * Math.min(1, v * 1.15)) * 0.9 - H.taper * 0.15 * v : 1 - H.taper * Math.pow(v, H.pin ? 0.5 : 1); pos.push(cxh, 0, zc + (H.slant || 0) * Hh * 0.45 * v + s * 0); for (let a = 0; a < m; a++) idx.push(base0 + a, base0 + (a + 1) % m, cI); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return new THREE.Mesh(g, mat); };
    const hm = spec.heelMaterial && spec.heelMaterial !== 'auto' ? spec.heelMaterial : H.pin || H.flare || spec.cut === 'pump' ? 'covered' : spec.outsole === 'leather' || spec.midsole === 'leather' || C.welt ? 'stacked-leather' : spec.outsole;
    const heelMat = hm === 'covered' ? new THREE.MeshPhysicalMaterial({ color: upperColor, roughness: 0.4, clearcoat: 0.2, side: THREE.DoubleSide }) : soleLook(hm, hm === 'stacked-leather' ? (spec.weltColor || null) : spec.outsoleColor);
    const vTop = 1 - liftH / Math.max(liftH + 0.001, Hh);
    group.add(mk(0, vTop, heelMat, levels)); group.add(mk(vTop, 1, soleLook('rubber', '#141414'), 1));
    if (hm === 'stacked-leather') for (let y = 0.0055; y < Hh - 0.003; y += 0.0055) { const v = 1 - y / Hh; const s = 1 - H.taper * v; const sh = (H.slant || 0) * Hh * 0.45 * v; const pts = ring.map(([x, z, i]) => new THREE.Vector3(cxh + (x - cxh) * s * 1.004, Math.min(bot[i] * (1 - v), bot[i]), zc + (z - zc) * s * 1.004 + sh)); pts.push(pts[0]); group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat('#3d2817'))); }
  }
  return { zs, L, R, top, bot, ext, foxUp };
}

/**
 * Build one shoe on one foot.
 * @param spec  from core/shoes.js buildShoe
 * @param tris  Float32Array, 9 numbers per triangle: the posed mannequin's leg on this side
 * @param sd    +1 / -1: which side of the body
 * @param mats  { part(id, fallbackFabric) -> THREE.Material, colorOf(id) -> css }
 */
export function buildShoe(spec, tris, sd, mats) {
  const seat0 = Math.max(spec.heelH, spec.soleT) / 100;
  const G = buildLast(spec, tris, sd, seat0);
  const group = new THREE.Group();
  if (!G) return group;
  const { N, zr, hr, uu, ww, kind, L } = G; const P = G.P;
  const lat = (v) => Math.sign(uu[v] || 1) * sd; // +1 on the outside of the foot
  const part = (id) => spec.parts.find((p) => p.id === id);
  const stitchCol = spec.stitchColor || null;
  const zThroat = spec.throat * L; const isBoot = spec.cut === 'boot' || spec.cut === 'mid'; const laced = spec.closure === 'laces' || spec.closure === 'dial';
  const M = (fn) => { const m = new Float32Array(N); for (let v = 0; v < N; v++) m[v] = fn(v); return m; };
  const yOf = (v) => P[v * 3 + 1]; const topY = G.shaftTop - 0.006;
  // ---- front-line coordinate of the lacing
  const wOfZr = (z) => { let best = 0; let bd = 9; for (let k = 0; k < G.K; k++) { const d = Math.abs(zr[k * NA] - z); if (kind[k * NA] === 2 && d < bd) { bd = d; best = k; } } return G.wk[best]; };
  const gap = spec.closedLacing ? 0.0022 : isBoot ? 0.0085 : 0.0075; const wF = 0.021; const ue = gap + 0.0095;
  // ---- where the upper exists
  let exist;
  if (spec.cut === 'open') {
    const band = (v, z0, z1, hmin = 0.004) => Math.min(zr[v] - z0 * L, z1 * L - zr[v], hr[v] - hmin + 0.004);
    const ringBand = (v, h0, h1) => (kind[v] === 2 ? -1 : Math.min(hr[v] - h0, h1 - hr[v]));
    const heelCup = (v, h = 0.05) => Math.min(0.2 * L - zr[v] - hr[v] * 0.5, h - hr[v]);
    const S = spec.straps;
    exist = M((v) => {
      if (S === 'slide') return band(v, 0.5, 0.8);
      if (S === 'two-band') return Math.max(band(v, 0.42, 0.56), band(v, 0.63, 0.8));
      if (S === 'thong') return -1;
      if (S === 'sport') return Math.max(band(v, 0.64, 0.74), band(v, 0.4, 0.5), Math.min(0.3 * L - zr[v], Math.min(hr[v] - 0.03, 0.055 - hr[v])), Math.min(Math.min(zr[v] - 0.22 * L, 0.5 * L - zr[v]), 0.012 - Math.abs(hr[v] - 0.03 - (zr[v] - 0.22 * L) * 0.02)));
      if (S === 'gladiator') { let m = Math.min(0.0065 - Math.abs(uu[v]), zr[v] - 0.3 * L, 0.84 * L - zr[v]); for (let q = 0; q < 6; q++) m = Math.max(m, Math.min(0.0055 - Math.abs(ww[v] - (wOfZr(0.8 * L) + q * 0.026)), hr[v] - 0.002)); for (let q = 0; q < 3; q++) m = Math.max(m, ringBand(v, 0.085 + q * 0.035, 0.096 + q * 0.035)); return Math.max(m, heelCup(v, 0.04), Math.min(0.011 - Math.abs(G.half[Math.floor(v / NA)] - Math.abs(uu[v])), hr[v] - 0.03, kind[v] === 2 ? -1 : 1)); }
      if (S === 'ankle' || S === 'ankle-tie') return Math.max(band(v, 0.7, S === 'ankle' ? 0.775 : 0.86), heelCup(v), ringBand(v, 0.088, S === 'ankle' ? 0.098 : 0.11));
      if (S === 'fisherman') { let m = Math.min(0.008 - Math.abs(uu[v]), zr[v] - 0.38 * L); for (let q = 0; q < 5; q++) m = Math.max(m, Math.min(0.007 - Math.abs(zr[v] - (0.52 + q * 0.075) * L), hr[v] - 0.002)); return Math.max(m, zr[v] - 0.9 * L, heelCup(v, 0.055), ringBand(v, 0.085, 0.1), Math.min(0.02 - hr[v], zr[v] - 0.5 * L)); }
      if (S === 'woven') { const p = 0.016; const a = ((zr[v] + uu[v]) % p + p) % p; const b = ((zr[v] - uu[v]) % p + p) % p; const wv = Math.max(0.0055 - Math.abs(a - p / 2), 0.0055 - Math.abs(b - p / 2)); return Math.max(Math.min(wv, zr[v] - 0.44 * L, hr[v] - 0.003), zr[v] - 0.9 * L, Math.min(0.26 * L - zr[v], Math.min(hr[v] - 0.03, 0.055 - hr[v])), Math.min(0.012 - hr[v], 1)); }
      return band(v, 0.5, 0.8);
    });
  } else {
    const backH = spec.cut === 'pump' ? 0.056 : spec.collar === 'padded' ? 0.071 : spec.shaft / 100;
    const throatH = spec.cut === 'pump' ? 0.019 : spec.closure === 'slip-on' ? backH + 0.002 : backH + 0.016; const dip = spec.cut === 'pump' ? 0.012 : 0.013;
    const Tl = (z) => { const s = Math.max(0, Math.min(1, z / zThroat)); return lerp(backH, throatH, s * s) - dip * Math.sin(Math.PI * Math.min(1, s * 1.5)) * (s < 0.667 ? 1 : 0.999); };
    const scallop = spec.parts.includes('scallop');
    exist = M((v) => {
      let m;
      if (isBoot) { const a = G.ang[v]; m = topY - (scallop ? 0.04 * Math.pow(Math.cos(a), 2) : spec.type === 'chelsea-boot' ? 0 : 0.012 * Math.max(0, Math.cos(a)) * (laced ? 0 : 1)) - yOf(v); } else m = smax(Tl(zr[v]) - hr[v], (zr[v] - zThroat) * 0.9, 0.012);
      if (spec.cut === 'mule') m = Math.min(m, zr[v] - 0.4 * L + hr[v] * 0.7);
      if (spec.sling) m = Math.max(Math.min(m, zr[v] - 0.42 * L + hr[v] * 0.5), Math.min(m, Math.min(hr[v] - 0.038, 0.05 - hr[v]) + (zr[v] > 0.42 * L ? -1 : 0)));
      if (spec.dorsay) m = Math.min(m, Math.max(0.3 * L - zr[v], zr[v] - 0.6 * L, 0.006 - hr[v]));
      if (TOE_SHAPES[spec.toe]?.open) m = Math.min(m, L - 0.03 - zr[v] + Math.max(0, 0.012 - hr[v]) * 3);
      if (spec.type === 'foam-clog') m = Math.min(m, 1);
      return m;
    });
  }
  // lacing runs from the vamp point up to where the facings end at the top line
  const wVamp = wOfZr(Math.min(0.66 * L, zThroat + 0.16 * L));
  let wTop = G.wk[0] - 0.016;
  { const at = (k) => { const arc = G.arc[k]; let i = 0; while (i < NA / 2 && arc[i] < ue + 0.004) i++; return Math.min(exist[k * NA + i], exist[k * NA + (NA - i) % NA]); }; for (let k = 0; k < G.K; k++) if (at(k) > 0.007) { wTop = G.wk[k]; break; } }
  const rows = spec.rowKinds?.length || (spec.closure === 'dial' ? 5 : 0);
  const pitch = rows > 1 ? Math.min(isBoot ? 0.03 : 0.0155, (wTop - 0.004 - wVamp) / (rows - 1)) : 0.012;
  const wStart = rows ? wTop - 0.004 - pitch * (rows - 1) : wVamp; const wEnd = wTop;
  // the slot between the facings (the tongue shows through it)
  const slot = laced ? M((v) => Math.min(gap - Math.abs(uu[v]), ww[v] - wStart + 0.004, kind[v] === 2 || isBoot || spec.cut === 'low' ? 1 : 1)) : null;
  const baseMask = slot ? M((v) => Math.min(exist[v], -slot[v])) : exist;
  const baseId = spec.cut === 'open' ? 'straps' : 'vamp';
  const upperColor = mats.colorOf(baseId);
  // ---- lay a piece: surface, lining side, cut edge, stitching
  const edgeT = spec.collar === 'padded' ? 0.0045 : spec.cut === 'open' ? 0.0022 : 0.0026;
  const pieces = [];
  const lay = (id, mask, layer, { stitch = true, edge = true, bulge = 0, rowsN = spec.stitchRows, matId = id, keep = null } = {}) => {
    const off = bulge ? (a, b, t) => { const m = mask[a] + (mask[b] - mask[a]) * t; return 0.0009 * layer + bulge * Math.sin(Math.PI * Math.max(0, Math.min(1, m / (bulge * 7)))); } : 0.0009 * layer;
    const c = clip(G, mask, off); if (!c.pos.length) return null;
    const mesh = new THREE.Mesh(geoOf(c), mats.part(matId)); mesh.renderOrder = layer; shell(mesh); group.add(mesh); pieces.push(id);
    const col = new THREE.Color(mats.colorOf(matId));
    if (edge) for (const line of isoLines(G, mask, 0.0002, 0.0009 * layer + 0.0003, keep)) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(line.map((q) => q.p)), new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(0.42) })));
    if (stitch) for (let r = 0; r < rowsN; r++) for (const line of isoLines(G, mask, 0.0028 + r * 0.0022, 0.0009 * layer + 0.0005, keep)) { const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(line.map((q) => q.p)), new THREE.LineDashedMaterial({ color: stitchCol || col.clone().lerp(new THREE.Color('#ffffff'), 0.35).getStyle(), dashSize: 0.0026, gapSize: 0.0011 })); ln.computeLineDistances(); group.add(ln); }
    return mesh;
  };
  // base upper with its inside (lining) and the thickness of the top line
  lay(baseId, baseMask, 0, { stitch: spec.cut !== 'open' ? false : true, edge: true });
  if (spec.cut !== 'open') { const c = clip(G, exist, -edgeT); const lm = new THREE.MeshStandardMaterial({ color: spec.liningColor || '#c9a27a', roughness: 0.85, side: THREE.DoubleSide }); if (part('lining')?.fabric && /shearling|fur/.test(part('lining').fabric)) lm.color.set(part('lining').color || '#efe6d2'); group.add(shell(new THREE.Mesh(geoOf(c), lm))); }
  { // top-line rim: the cut edge has thickness
    const rim = []; const rn = [];
    for (const line of isoLines(G, baseMask, 0, 0)) for (let q = 0; q + 1 < line.length; q++) { const a = line[q]; const b = line[q + 1]; const ai = a.p.clone().addScaledVector(a.n, -edgeT); const bi = b.p.clone().addScaledVector(b.n, -edgeT); for (const p of [a.p, b.p, ai, b.p, bi, ai]) rim.push(p.x, p.y, p.z); const nn = new THREE.Vector3().subVectors(b.p, a.p).cross(a.n).normalize(); for (let s = 0; s < 6; s++) rn.push(nn.x, nn.y, nn.z); }
    if (rim.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3)); g.computeVertexNormals(); const mm = mats.part(baseId).clone(); mm.side = THREE.DoubleSide; mm.map = null; mm.color.set(new THREE.Color(upperColor).multiplyScalar(0.8)); group.add(new THREE.Mesh(g, mm)); }
  }
  const E = (v) => exist[v]; let layer = 1;
  const vampLine = (v) => (zThroat - 0.03 + 0.05 * sstep(0, 0.07, hr[v])) - zr[v]; // quarters lie behind this line
  if (spec.cut !== 'open') {
    if (part('tongue')) { // lies under the facings, on the foot
      const tm = M((v) => Math.min(gap + 0.011 - Math.abs(uu[v]), ww[v] - wStart + 0.016, wEnd + (isBoot ? 0.012 : 0.022) - ww[v] - Math.pow(Math.abs(uu[v]) / 0.02, 2) * 0.008));
      const c = clip(G, tm, -0.0012); if (c.pos.length) { const mesh = new THREE.Mesh(geoOf(c), mats.part('tongue')); const m2 = mesh.material; m2.side = THREE.DoubleSide; group.add(mesh); }
      if (spec.gusset) { const gm = M((v) => Math.min(gap + 0.004 - Math.abs(uu[v]), ww[v] - wStart, wEnd - 0.03 - ww[v])); const c2 = clip(G, gm, -0.0006); if (c2.pos.length) group.add(new THREE.Mesh(geoOf(c2), mats.part('tongue'))); }
    }
    if (part('quarter')) { const qm = M((v) => Math.min(baseMask[v], spec.closedLacing ? -vampLine(v) : vampLine(v))); if (spec.closedLacing) { lay('quarter', M((v) => Math.min(baseMask[v], vampLine(v) + 0.004)), 0.5, { stitch: false, edge: false }); lay('vamp', qm, layer++, {}); } else lay('quarter', qm, layer++, {}); }
    if (part('shaft')) lay('shaft', M((v) => Math.min(baseMask[v], hr[v] - (0.098 + 0.02 * sstep(0.2 * L, 0.5 * L, zr[v])), kind[v] === 2 && zr[v] > 0.5 * L ? -1 : 1)), layer++, {});
    if (part('shell')) lay('shell', M((v) => Math.min(baseMask[v], smax(0.05 - hr[v], (zr[v] - 0.6 * L) * 0.8, 0.02))), layer++, { stitch: false });
    if (part('mudguard')) lay('mudguard', M((v) => Math.min(baseMask[v], smax(Math.min(0.024 - hr[v], zr[v] - 0.3 * L), zr[v] - (L - 0.05) - Math.abs(uu[v]) * 0.0, 0.01))), layer++, {});
    if (part('toecap')) { const zc = L - (0.235 * G.Lf + (TOE_SHAPES[spec.toe]?.ext || 1.3) / 100 * 0.6); const wing = spec.toecap === 'wingtip' || spec.toecap === 'longwing';
      lay('toecap', M((v) => { const au = Math.abs(uu[v]); const zb = wing ? zc + 0.012 - 0.022 * Math.exp(-Math.pow(au / 0.011, 2)) - Math.max(0, au - 0.026) * (spec.toecap === 'longwing' ? 3.6 : 1.5) : zc; return Math.min(baseMask[v], zr[v] - zb, wing ? hr[v] + 0.002 + (zr[v] - (spec.toecap === 'longwing' ? -1 : 0.38 * L)) * 2 : 1); }), layer++, { rowsN: Math.max(2, spec.stitchRows) }); }
    if (part('bumper')) lay('bumper', M((v) => Math.min(baseMask[v], zr[v] - (L - 0.052) + Math.max(0, 0.02 - hr[v]) * 0.8)), layer++, { stitch: false });
    if (part('apron')) { const zE = L - 0.03 - (TOE_SHAPES[spec.toe]?.ext || 1.3) / 100; const mask = M((v) => { const wA = 0.029 + 0.006 * sstep(zThroat, zE, zr[v]); const dz = Math.max(0, zr[v] - (zE - wA)); return Math.min(wA - Math.hypot(uu[v], dz), zr[v] - zThroat + 0.012, kind[v] === 2 ? 1 : -1); });
      lay('apron', mask, layer++, { stitch: false });
      for (const line of isoLines(G, mask, 0.0004, 0.0012)) group.add(new THREE.Mesh(strand(line.map((q) => q.p), line.map((q) => q.n), 0.0026, 0.0026, true), mats.part('apron'))); // the raised moccasin seam
    }
    if (part('counter')) lay('counter', M((v) => Math.min(baseMask[v], 0.25 * L - zr[v] - hr[v] * 0.75, 0.058 - hr[v] + (isBoot ? 0.004 : 0))), layer++, {});
    if (part('heelclip')) lay('heelclip', M((v) => Math.min(baseMask[v], 0.2 * L - zr[v] - hr[v] * 0.9, 0.04 - hr[v])), layer++, { stitch: false });
    if (part('heeltab')) lay('heeltab', M((v) => Math.min(baseMask[v], 0.045 - zr[v] + hr[v] * 0.15, hr[v] - 0.04)), layer++, {});
    if (part('sidepanel')) { const sp = spec.sidePanel; lay('sidepanel', M((v) => { const z = zr[v]; const h = hr[v]; let m = -1;
      if (sp === 'bar') for (const z0 of [0.4, 0.47]) m = Math.max(m, 0.0055 - Math.abs(z - (z0 * L - h * 0.55)));
      else if (sp === 'chevron') m = 0.006 - Math.abs(z - (0.5 * L - Math.abs(h - 0.03) * 0.9));
      else if (sp === 'arc') m = 0.008 - Math.abs(Math.hypot(z - 0.2 * L, h + 0.03) - 0.2 * L * 0.72);
      else if (sp === 'wave') m = 0.006 - Math.abs(h - 0.026 - 0.008 * Math.sin((z / L) * 9));
      else if (sp === 'star') m = 0.014 - Math.hypot(z - 0.36 * L, h - 0.032);
      return Math.min(baseMask[v] - 0.004, m, h - 0.005, 0.8 * L - z, z - 0.12 * L, Math.abs(uu[v]) - ue - wF); }), layer++, {}); }
    if (part('patch')) lay('patch', M((v) => Math.min(baseMask[v], lat(v) < 0 ? 0.019 - Math.hypot(zr[v] - 0.17 * L, hr[v] - 0.1) : -1)), layer++, { stitch: false });
    if (part('backstay')) lay('backstay', M((v) => Math.min(baseMask[v], kind[v] === 2 ? -1 : 0.0105 - (G.half[Math.floor(v / NA)] - Math.abs(uu[v])), hr[v] - 0.004)), layer++, {});
    if (part('gore')) lay('gore', M((v) => { const k = Math.floor(v / NA); const side = Math.abs(Math.abs(uu[v]) - G.half[k] * 0.5); return Math.min(E(v) + 0.002, 0.024 - side - Math.max(0, 0.075 - hr[v]) * 0.25, hr[v] - 0.04, kind[v] === 2 ? -1 : 1); }), layer++, { stitch: true, rowsN: 1 });
    if (part('facing')) lay('facing', M((v) => Math.min(baseMask[v], Math.abs(uu[v]) - gap, gap + wF - Math.abs(uu[v]) + (spec.closedLacing ? 0 : 0), ww[v] - wStart + 0.012 - Math.pow(Math.max(0, wStart + 0.004 - ww[v]) / 0.012, 2) * 0.004)), layer++, { rowsN: Math.max(1, Math.min(2, spec.stitchRows)) });
    if (part('kiltie')) { const km = M((v) => Math.min(0.034 - Math.abs(uu[v]), ww[v] - wStart + 0.03 + 0.004 * Math.abs(Math.sin(uu[v] * 900)), wStart + 0.03 - ww[v])); const c = clip(G, km, 0.0009 * layer + 0.0006); if (c.pos.length) { const m = new THREE.Mesh(geoOf(c), mats.part('kiltie')); m.material.side = THREE.DoubleSide; group.add(m); } }
    if (part('saddle')) { const wS = wOfZr(zThroat + 0.035); lay('saddle', M((v) => Math.min(0.015 - Math.abs(ww[v] - wS) + 0.004 * sstep(0.02, 0.05, Math.abs(uu[v])), 0.062 - Math.abs(uu[v]), kind[v] === 2 ? 1 : -1)), layer++, {});
      const o = surf(G, wS, 0); if (o) { const slit = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.0006, 0.006), new THREE.MeshBasicMaterial({ color: '#0b0b0b' })); slit.applyMatrix4(seatM({ ...o, p: o.p.clone().addScaledVector(o.n, 0.0009 * layer + 0.0002) })); group.add(slit); } }
    if (part('topband')) lay('topband', M((v) => Math.min(E(v), 0.028 - E(v), kind[v] === 0 ? 1 : -1)), layer++, { stitch: false });
    if (part('binding')) lay('binding', M((v) => Math.min(E(v) + 0.0005, 0.0048 - E(v))), layer++, { stitch: false, edge: false });
    if (part('collar')) { const fur = spec.collar === 'fur-cuff'; const hC = fur ? 0.055 : isBoot ? 0.03 : 0.02;
      lay('collar', M((v) => Math.min(E(v) + 0.0006, hC - E(v), slot ? -slot[v] + 0.004 : 1, isBoot ? 1 : zThroat - 0.03 - zr[v])), layer++, { stitch: !fur, bulge: fur ? 0.0012 : 0.0006, rowsN: 1 }); }
  }
  // ---- straps across the instep (hook-and-loop, buckles), ankle and top straps
  const metalCol = METALS[spec.metal]?.[1] || upperColor; const metal = new THREE.MeshStandardMaterial({ color: metalCol, metalness: spec.metal === 'painted' ? 0.1 : 0.9, roughness: spec.metal === 'black' ? 0.5 : 0.32 });
  const strapsN = typeof spec.straps === 'number' ? spec.straps : 0;
  if (part('strap') && spec.cut !== 'open') {
    const bands = [];
    if ((spec.closure === 'velcro' || spec.closure === 'buckle') && !spec.wrapStrap && !spec.topStrap && !spec.harness && !spec.ankleStrap && !spec.instepBar && strapsN) for (let q = 0; q < strapsN; q++) bands.push({ w: lerp(wOfZr(zThroat + 0.02), wOfZr(Math.min(0.64 * L, zThroat + 0.02 + 0.06 * strapsN)), strapsN === 1 ? 0 : q / (strapsN - 1)), hw: spec.closure === 'velcro' ? 0.0125 : 0.0095, reach: 0.062 });
    if (spec.instepBar) bands.push({ w: wOfZr(zThroat - 0.03), hw: 0.006, reach: 0.2, free: true });
    if (spec.instepStrap) bands.push({ w: wOfZr(zThroat - 0.01), hw: 0.011, reach: 0.2 });
    const rings = [];
    if (spec.ankleStrap || spec.parts.includes('ankle-strap') || spec.wrapStrap || spec.harness) rings.push([spec.ankleStrap ? 0.092 : spec.harness ? 0.07 : 0.1, spec.ankleStrap ? 0.006 : 0.011]);
    if (spec.topStrap) rings.push([spec.shaft / 100 - 0.035, 0.009]);
    const sm = M((v) => { let m = -1; for (const b of bands) m = Math.max(m, Math.min(b.hw - Math.abs(ww[v] - b.w), b.reach - Math.abs(uu[v]) + (lat(v) > 0 ? 0 : 0.006), b.free ? 1 : 1)); for (const [h, hw] of rings) m = Math.max(m, kind[v] === 2 && zr[v] > 0.45 * L ? -1 : hw - Math.abs(hr[v] - h - (spec.harness ? Math.max(0, zr[v] - 0.25 * L) * 0.0 : 0))); return m; });
    lay('strap', sm, layer + 2, { rowsN: 1 });
    for (const b of bands) { const o = surf(G, b.w, sd * (b.reach - 0.012)); if (!o) continue; o.p.addScaledVector(o.n, 0.0009 * (layer + 2)); const bk = new THREE.Mesh(buckle(b.hw * 2), metal); const mtx = seatM(o); bk.applyMatrix4(mtx); group.add(bk); }
    for (const [h] of rings) { let best = -1; let bd = 9; for (let v = 0; v < N; v++) { if (kind[v] === 2 || lat(v) < 0) continue; const k = Math.floor(v / NA); const d = Math.abs(hr[v] - h) + Math.abs(Math.abs(uu[v]) - G.half[k] * 0.42) * 0.5; if (d < bd) { bd = d; best = v; } } if (best >= 0) { const o = vert(G, best); o.p.addScaledVector(o.n, 0.0009 * (layer + 2)); const bk = new THREE.Mesh(buckle(0.016), metal); bk.applyMatrix4(seatM({ ...o, tu: o.tw, tw: o.tu })); group.add(bk); } }
    if (spec.harness) for (const s of [1, -1]) { let best = -1; let bd = 9; for (let v = 0; v < N; v++) { if (kind[v] === 2 || Math.sign(uu[v]) !== s) continue; const k = Math.floor(v / NA); const d = Math.abs(hr[v] - 0.07) + Math.abs(Math.abs(uu[v]) - G.half[k] * 0.5); if (d < bd) { bd = d; best = v; } } if (best >= 0) { const o = vert(G, best); const rg = new THREE.TorusGeometry(0.011, 0.0018, 8, 20); rg.rotateX(Math.PI / 2); const m = new THREE.Mesh(rg, metal); o.p.addScaledVector(o.n, 0.003); m.applyMatrix4(seatM(o)); group.add(m); } }
    layer += 3;
  }
  if (spec.cut === 'open' && /buckle/.test(spec.closure)) { // a buckle on the outside of each strap
    const spots = spec.straps === 'two-band' ? [[0.49, 0.03], [0.715, 0.028]] : spec.straps === 'gladiator' ? [[0.1, 0.09], [0.1, 0.125], [0.1, 0.16]] : [[0.1, 0.093]];
    for (const [fz, h] of spots) { let best = -1; let bd = 9; for (let v = 0; v < N; v++) { if (lat(v) < 0 || exist[v] < 0.002) continue; const d = Math.abs(zr[v] - fz * L) + Math.abs(hr[v] - h); if (d < bd) { bd = d; best = v; } } if (best >= 0 && bd < 0.03) { const o = vert(G, best); o.p.addScaledVector(o.n, 0.0012); const bk = new THREE.Mesh(buckle(spec.straps === 'two-band' ? 0.03 : 0.012), metal); bk.applyMatrix4(seatM(spec.straps === 'two-band' ? o : { ...o, tu: o.tw, tw: o.tu })); group.add(bk); } }
  }
  if (spec.straps === 'thong') { // a Y strap from the toe post back to both sides
    const post = surf(G, wOfZr(0.76 * L), -sd * 0.012); const mat = mats.part('straps');
    if (post) for (const s of [1, -1]) { const pts = []; const nr = []; for (let q = 0; q <= 14; q++) { const t = q / 14; const o = surf(G, lerp(wOfZr(0.76 * L), wOfZr(0.46 * L), t), lerp(-sd * 0.012, s * 0.075, Math.pow(t, 0.8))); if (!o) continue; pts.push(o.p.addScaledVector(o.n, 0.0035)); nr.push(o.n); } if (pts.length > 3) { const base = pts[pts.length - 1].clone(); base.y = G.seatAt(base.z) + 0.002; pts.push(base); nr.push(nr[nr.length - 1]); const p0 = post.p.clone(); p0.y = G.seatAt(p0.z); pts.unshift(p0); nr.unshift(nr[0]); group.add(new THREE.Mesh(strand(pts, nr, 0.011, 0.005, true), mat)); } }
  }
  // ---- zip
  if (spec.zipSide && spec.zipSide !== 'none' && (spec.closure === 'zip' || spec.type === 'platform-boot') && isBoot) {
    const pts = []; const nr = [];
    for (let k = 0; k < G.K; k++) { if (kind[k * NA] === 2) break; const frac = spec.zipSide === 'back' ? 0.5 : spec.zipSide === 'front' ? 0 : 0.27; const side = spec.zipSide === 'medial' ? -sd : sd; const i = spec.zipSide === 'back' ? NA / 2 : spec.zipSide === 'front' ? 0 : ((Math.round(side > 0 ? NA * frac : NA * (1 - frac)) % NA) + NA) % NA; const v = k * NA + i; if (exist[v] < 0.004 || hr[v] < 0.028) continue; const o = vert(G, v); pts.push(o.p.addScaledVector(o.n, 0.0012)); nr.push(o.n); }
    if (pts.length > 3) { group.add(new THREE.Mesh(strand(pts, nr, 0.013, 0.0008), new THREE.MeshStandardMaterial({ color: new THREE.Color(upperColor).multiplyScalar(0.6), roughness: 0.8 }))); const teeth = pts.map((p, q) => p.clone().addScaledVector(nr[q], 0.0008)); group.add(new THREE.Mesh(strand(teeth, nr, 0.0048, 0.0018), metal)); const pull = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0022, 0.016), metal); pull.applyMatrix4(seatM({ p: teeth[1].clone().addScaledVector(nr[1], 0.002), n: nr[1], tu: new THREE.Vector3(1, 0, 0), tw: new THREE.Vector3(0, 1, 0) })); pull.position.y -= 0.012; group.add(pull); }
  }
  // ---- pull loops
  if (part('pull')) { const sides = spec.parts.includes('pull-straps') ? [NA / 4, (3 * NA) / 4] : [NA / 2];
    for (const i of sides) { let k0 = 0; while (k0 < G.K - 1 && exist[k0 * NA + i] < 0.002) k0++; const a = vert(G, Math.min(G.K - 1, k0 + 3) * NA + i); const t = vert(G, k0 * NA + i); const up = new THREE.Vector3(0, 1, 0);
      const pts = [a.p.clone().addScaledVector(a.n, 0.0016), t.p.clone().addScaledVector(t.n, 0.0018), t.p.clone().addScaledVector(up, 0.026).addScaledVector(t.n, 0.001), t.p.clone().addScaledVector(up, 0.03).addScaledVector(t.n, -0.004), t.p.clone().addScaledVector(t.n, -0.0045), a.p.clone().addScaledVector(a.n, -0.0045)];
      const nr = [a.n, t.n, t.n.clone().add(up).normalize(), up.clone().sub(t.n).normalize(), t.n.clone().negate(), a.n.clone().negate()];
      const curve = new THREE.CatmullRomCurve3(pts); const sp = curve.getPoints(24); const sn = sp.map((_, q) => { const f = (q / 24) * (nr.length - 1); const j = Math.min(nr.length - 2, Math.floor(f)); return nr[j].clone().lerp(nr[j + 1], f - j).normalize(); });
      group.add(new THREE.Mesh(strand(sp, sn, 0.018, 0.0014), mats.part('pull'))); } }
  // ---- lacing: hardware on the facings, the lace through it, the bow
  if (laced && rows) {
    const L0 = LACES[spec.lace] || LACES['round-waxed']; const laceMat = new THREE.MeshStandardMaterial({ color: spec.laceColor || '#2a2018', roughness: spec.lace === 'round-waxed' ? 0.55 : 0.9 });
    const lw = spec.closure === 'dial' ? 0.0009 : L0.w / 1000; const lt = spec.closure === 'dial' ? 0.0009 : L0.t / 1000; const rnd = spec.closure === 'dial' || L0.round;
    const lift = 0.0009 * layer + 0.0008; const geoms = { eyelet: eyelet(spec.hexEyelets), hook: speedHook(), dring: dRing() };
    const metalG = []; const tabG = []; const holeG = []; const rowP = [];
    for (let j = 0; j < rows; j++) {
      const w = wStart + j * pitch; const kd = spec.rowKinds?.[j] || 'eyelet'; const pr = [];
      for (const s of [1, -1]) {
        const o = surf(G, w, s * ue); if (!o) { pr.push(null); continue; }
        o.p.addScaledVector(o.n, lift); const mtx = seatM(o, s);
        if (kd === 'eyelet' || kd === 'lock') { metalG.push(geoms.eyelet.clone().applyMatrix4(mtx)); const h = new THREE.CircleGeometry(0.0022, 12); h.rotateX(-Math.PI / 2); h.translate(0, 0.0003, 0); holeG.push(h.applyMatrix4(mtx)); if (kd === 'lock') { const tb = new THREE.BoxGeometry(0.004, 0.0012, 0.007); tb.translate(0.005, 0.0008, 0); metalG.push(tb.applyMatrix4(mtx)); } } else if (kd === 'hole' || kd === 'blind') { const h = new THREE.CircleGeometry(kd === 'blind' ? 0.0019 : 0.0022, 12); h.rotateX(-Math.PI / 2); h.translate(0, 0.0003, 0); holeG.push(h.applyMatrix4(mtx)); } else if (kd === 'hook') metalG.push(geoms.hook.clone().applyMatrix4(mtx)); else if (kd === 'dring') { tabG.push(geoms.dring.tab.clone().applyMatrix4(mtx)); metalG.push(geoms.dring.metal.clone().applyMatrix4(mtx)); } else if (kd === 'loop') { const lp = new THREE.TorusGeometry(0.0042, 0.0011, 5, 10, Math.PI); lp.rotateX(Math.PI / 2); lp.rotateY(Math.PI / 2); lp.scale(1, 0.5, 1.5); lp.translate(-0.002, 0.0006, 0); tabG.push(lp.applyMatrix4(mtx)); }
        // where the lace bears on this row
        const uL = kd === 'hook' ? ue - 0.0008 : kd === 'dring' ? ue - 0.0052 : kd === 'loop' ? ue - 0.004 : ue; const oo = surf(G, w, s * uL); oo.p.addScaledVector(oo.n, lift + (kd === 'hook' ? 0.0022 : kd === 'dring' ? 0.002 : 0.0006) + lt / 2); pr.push(oo);
      }
      rowP.push(pr);
    }
    if (metalG.length) group.add(new THREE.Mesh(merge(metalG), metal));
    if (tabG.length) group.add(new THREE.Mesh(merge(tabG), mats.part('facing')));
    if (holeG.length) group.add(new THREE.Mesh(merge(holeG), new THREE.MeshBasicMaterial({ color: '#0a0a0a' })));
    const laceG = [];
    const run = (j0, s0, j1, s1, bump = 0, under = false) => { const a = rowP[j0]?.[s0 > 0 ? 0 : 1]; const b = rowP[j1]?.[s1 > 0 ? 0 : 1]; if (!a || !b) return; const pts = []; const nr = []; const w0 = wStart + j0 * pitch; const w1 = wStart + j1 * pitch; const nS = 9;
      for (let q = 0; q <= nS; q++) { const t = q / nS; if (q === 0) { pts.push(a.p.clone()); nr.push(a.n); continue; } if (q === nS) { pts.push(b.p.clone()); nr.push(b.n); continue; } const o = surf(G, lerp(w0, w1, t), lerp(s0 * ue, s1 * ue, t)); if (!o) continue; const mid = Math.sin(Math.PI * t); const inSlot = Math.abs(lerp(s0 * ue, s1 * ue, t)) < gap; pts.push(o.p.addScaledVector(o.n, (under ? -0.0004 : lift + lt / 2 + 0.0006 + bump * mid) - (inSlot ? 0.0006 : 0))); nr.push(o.n); }
      laceG.push(strand(pts, nr, lw, lt, rnd)); };
    const pat = spec.closure === 'dial' ? 'criss-cross' : spec.lacing;
    run(0, 1, 0, -1, 0); // the bar across the first row
    for (let j = 0; j + 1 < rows; j++) {
      if (pat === 'straight-bar') { run(j + 1, 1, j + 1, -1, 0); } else if (pat === 'ladder') { run(j, 1, j + 1, 1); run(j, -1, j + 1, -1); run(j + 1, 1, j + 1, -1, 0.001); } else if (pat === 'army') { if (j % 2 === 0) { run(j, 1, j + 1, 1); run(j, -1, j + 1, -1); } else { run(j, 1, j + 1, -1, 0, false); run(j, -1, j + 1, 1, 0.0014); } } else if (pat === 'loop-back') { const mid = surf(G, wStart + (j + 0.5) * pitch, 0); if (mid) { for (const s of [1, -1]) { const a = rowP[j][s > 0 ? 0 : 1]; const b = rowP[j + 1][s > 0 ? 0 : 1]; if (!a || !b) continue; const m = mid.p.clone().addScaledVector(mid.n, lift + lt).addScaledVector(mid.tu, s * 0.0012); const c = new THREE.CatmullRomCurve3([a.p, m, b.p]).getPoints(12); laceG.push(strand(c, c.map(() => mid.n), lw, lt, rnd)); } } } else { const over = pat === 'over-under' ? j % 2 === 0 : true; run(j, 1, j + 1, -1, 0.0002); run(j, -1, j + 1, 1, over ? lt + 0.0004 : lt + 0.0004); }
    }
    // the bow (or loose / tucked ends) at the top row
    const top = rowP[rows - 1]; const kc = surf(G, wStart + (rows - 1) * pitch + (pat === 'straight-bar' ? 0 : pitch * 0.35), 0);
    if (top[0] && top[1] && kc && spec.closure !== 'dial' && spec.tied !== 'tucked') {
      const K = kc.p.clone().addScaledVector(kc.n, lift + lt * 1.6 + 0.0012); const dn = kc.tw.clone().multiplyScalar(-1); // towards the toe along the instep
      const P3 = (u, wv, h) => K.clone().addScaledVector(kc.tu, u).addScaledVector(dn, wv).addScaledVector(kc.n, h).add(new THREE.Vector3(0, -Math.max(0, wv) * 0.25 - Math.abs(u) * 0.12, 0));
      // a lace resting on the shoe: each point lifted off the leather along its normal (never snapped to a mesh point),
      // then the cord smoothed as one continuous curve and lifted again
      const lift1 = (pts) => pts.map((p) => { const o = closest(G, p); if (!o) return p; const d = p.clone().sub(o.p).dot(o.n); const want = lift + lt * 0.8; return d < want ? p.clone().addScaledVector(o.n, want - d) : p; });
      const follow = (pts) => { let q = lift1(pts); for (let it = 0; it < 6; it++) { const c = q.map((p) => p.clone()); for (let i = 1; i < q.length - 1; i++) q[i] = c[i - 1].clone().add(c[i + 1]).multiplyScalar(0.25).addScaledVector(c[i], 0.5); q = lift1(q); } return q; };
      for (const s of [1, -1]) {
        const end = top[s > 0 ? 0 : 1].p;
        if (spec.tied === 'untied') { const pts = follow(new THREE.CatmullRomCurve3([end, P3(s * 0.03, 0.01, 0.002), P3(s * 0.055, 0.05, -0.02), P3(s * 0.062, 0.1, -0.06)]).getPoints(22)); laceG.push(strand(pts, pts.map(() => kc.n), lw, lt, rnd)); const ag = new THREE.CylinderGeometry(lw * 0.42 + 0.0004, lw * 0.42 + 0.0004, 0.014, 6); const d = pts[pts.length - 1].clone().sub(pts[pts.length - 3]).normalize(); ag.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); ag.translate(pts[pts.length - 1].x, pts[pts.length - 1].y, pts[pts.length - 1].z); laceG.push(ag); continue; }
        const inP = new THREE.CatmullRomCurve3([end, K]).getPoints(6); laceG.push(strand(inP, inP.map(() => kc.n), lw, lt, rnd));
        const ls = isBoot ? 1.25 : 1; const loop = follow(new THREE.CatmullRomCurve3([K, P3(s * 0.016 * ls, -0.004, 0.006), P3(s * 0.036 * ls, 0.004, 0.006), P3(s * 0.045 * ls, 0.018, 0.002), P3(s * 0.032 * ls, 0.026, 0.001), P3(s * 0.012 * ls, 0.012, 0.004), K]).getPoints(40)); laceG.push(strand(loop, loop.map(() => kc.n), lw, lt, rnd));
        const tail = follow(new THREE.CatmullRomCurve3([K, P3(-s * 0.012 * ls, 0.016, 0.004), P3(-s * 0.03 * ls, 0.04 * ls, 0.0), P3(-s * 0.04 * ls, 0.066 * ls, -0.004)]).getPoints(22)); laceG.push(strand(tail, tail.map(() => kc.n), lw, lt, rnd));
        const ag = new THREE.CylinderGeometry(lw * 0.42 + 0.0005, lw * 0.42 + 0.0005, 0.014, 6); const d = tail[tail.length - 1].clone().sub(tail[tail.length - 3]).normalize(); ag.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)); ag.translate(tail[tail.length - 1].x, tail[tail.length - 1].y, tail[tail.length - 1].z); laceG.push(ag);
      }
      const knot = new THREE.SphereGeometry(Math.max(0.0032, lw * 0.9), 10, 8); knot.scale(1.5, 0.8, 1); knot.applyMatrix4(seatM({ p: K, n: kc.n, tu: kc.tu })); laceG.push(knot);
    }
    if (spec.closure === 'dial' && kc) { const d = new THREE.CylinderGeometry(0.012, 0.013, 0.007, 20); const m = new THREE.Mesh(d, new THREE.MeshStandardMaterial({ color: '#1a1a1c', roughness: 0.4, metalness: 0.2 })); m.applyMatrix4(seatM({ p: kc.p.clone().addScaledVector(kc.n, 0.006), n: kc.n, tu: kc.tu })); group.add(m); }
    if (laceG.length) group.add(new THREE.Mesh(merge(laceG), laceMat));
  }
  // ---- ornaments on the vamp
  const orn = surf(G, wOfZr(zThroat + 0.035), 0);
  if (orn) {
    const o = { ...orn, p: orn.p.clone().addScaledVector(orn.n, 0.0009 * layer + 0.001) };
    if (spec.parts.includes('bit')) { const g = []; for (const s of [-1, 1]) { const r = new THREE.TorusGeometry(0.0085, 0.0015, 8, 18); r.rotateX(Math.PI / 2); r.scale(1, 1, 0.8); r.translate(s * 0.0115, 0.0016, 0); g.push(r); } const bar = new THREE.CylinderGeometry(0.0016, 0.0016, 0.012, 8); bar.rotateZ(Math.PI / 2); bar.translate(0, 0.0016, 0); g.push(bar); for (const s of [-1, 1]) { const tb = new THREE.BoxGeometry(0.004, 0.002, 0.012); tb.translate(s * 0.022, 0.001, 0); g.push(tb); } const m = new THREE.Mesh(merge(g), metal); m.applyMatrix4(seatM(o)); group.add(m); }
    if (spec.parts.includes('tassel')) { const g = []; for (const s of [-1, 1]) { const head = new THREE.SphereGeometry(0.0042, 10, 8); head.translate(s * 0.009, 0.004, 0.006); const sk = new THREE.ConeGeometry(0.0058, 0.02, 12, 1, true); sk.rotateX(-Math.PI / 2); sk.translate(s * 0.009, 0.004, 0.018); g.push(head, sk); } const cord = new THREE.CylinderGeometry(0.001, 0.001, 0.05, 5); cord.rotateZ(Math.PI / 2); cord.translate(0, 0.002, 0); g.push(cord); const m = new THREE.Mesh(merge(g), mats.part('apron')); m.material.side = THREE.DoubleSide; m.applyMatrix4(seatM(o)); group.add(m); }
    if (spec.parts.includes('bow')) { const g = []; for (const s of [-1, 1]) { const lp = new THREE.TorusGeometry(0.0075, 0.0022, 6, 14); lp.rotateX(Math.PI / 2); lp.scale(1.35, 0.7, 0.75); lp.translate(s * 0.011, 0.002, 0); g.push(lp); } const kn = new THREE.SphereGeometry(0.0034, 8, 6); kn.translate(0, 0.0025, 0); g.push(kn); const m = new THREE.Mesh(merge(g), mats.part(part('binding') ? 'binding' : baseId)); m.applyMatrix4(seatM({ ...o, p: (surf(G, wOfZr(zThroat + 0.012), 0) || o).p.clone().addScaledVector(o.n, 0.002) })); group.add(m); }
  }
  // ---- perforations: broguing along the cap, the toe medallion, vents
  const dots = []; const dot = (o, r) => { const c = new THREE.CircleGeometry(r, 8); c.rotateX(-Math.PI / 2); c.translate(0, 0.0004, 0); dots.push(c.applyMatrix4(seatM(o))); };
  const along = (lines, step, r, r2) => { for (const line of lines) { let acc = 0; let q2 = 0; for (let q = 1; q < line.length; q++) { acc += line[q].p.distanceTo(line[q - 1].p); if (acc < step) continue; acc = 0; const tu = line[q].p.clone().sub(line[q - 1].p).normalize(); dot({ p: line[q].p, n: line[q].n, tu }, q2++ % 2 || !r2 ? r : r2); } } };
  if (spec.brogue && spec.brogue !== 'none' && part('toecap')) { const zc = L - (0.235 * G.Lf + (TOE_SHAPES[spec.toe]?.ext || 1.3) / 100 * 0.6); const wing = spec.toecap === 'wingtip' || spec.toecap === 'longwing'; const bm = M((v) => { const au = Math.abs(uu[v]); const zb = wing ? zc + 0.012 - 0.022 * Math.exp(-Math.pow(au / 0.011, 2)) - Math.max(0, au - 0.026) * (spec.toecap === 'longwing' ? 3.6 : 1.5) : zc; return Math.min(baseMask[v], zr[v] - zb); });
    along(isoLines(G, bm, 0.0075, 0.0009 * layer + 0.0006, (v) => hr[v] > 0.004), 0.0042, 0.0016, 0.0007);
    if (spec.brogue === 'full' || spec.brogue === 'semi') { const c = surf(G, wOfZr(L - 0.045 - (TOE_SHAPES[spec.toe]?.ext || 1.3) / 200), 0); if (c) for (let ring = 0; ring < 3; ring++) for (let q = 0; q < (ring ? ring * 8 : 1); q++) { const a = (q / (ring * 8 || 1)) * Math.PI * 2; const o = surf(G, wOfZr(L - 0.045 - (TOE_SHAPES[spec.toe]?.ext || 1.3) / 200) + Math.cos(a) * ring * 0.005, Math.sin(a) * ring * 0.0055); if (o) { o.p.addScaledVector(o.n, 0.0009 * layer + 0.0006); dot(o, ring === 2 ? 0.0007 : 0.0013); } } }
    if (spec.brogue === 'full') along(isoLines(G, M((v) => Math.min(baseMask[v], vampLine(v))), 0.006, 0.0009 * layer + 0.0006, (v) => hr[v] > 0.004 && Math.abs(uu[v]) > ue + wF), 0.0042, 0.0016, 0.0007);
  }
  if (spec.perf) for (let a = 0; a < 5; a++) for (let b = -2; b <= 2; b++) { const o = surf(G, wOfZr(0.74 * L) + a * 0.008, b * 0.008 + (a % 2 ? 0.004 : 0)); if (o && closestMask(G, baseMask, o) > 0.003) { o.p.addScaledVector(o.n, 0.0004); dot(o, 0.001); } }
  if (spec.parts.includes('vents')) for (let a = 0; a < 3; a++) for (let b = -3; b <= 3; b++) { const o = surf(G, wOfZr(0.86 * L) + a * 0.017, b * 0.013); if (o) { o.p.addScaledVector(o.n, 0.0004); dot(o, 0.0042); } }
  if (dots.length) group.add(new THREE.Mesh(merge(dots), new THREE.MeshBasicMaterial({ color: '#0c0c0c' })));
  // ---- the bottom
  const B = buildBottom(spec, G, group, upperColor);
  if (spec.parts.includes('staples')) { const g = []; for (let i = 3; i < B.zs.length - 3; i += 3) for (const s of [-1, 1]) { if (B.zs[i] - G.zBack < 0.42 * L) continue; const b = new THREE.BoxGeometry(0.0012, 0.006, 0.0012); b.translate(s < 0 ? B.L[i] + B.ext - 0.0005 : B.R[i] - B.ext + 0.0005, B.top[i] + 0.006, B.zs[i]); g.push(b); } if (g.length) group.add(new THREE.Mesh(merge(g), metal)); }
  group.userData.last = { zBack: G.zBack, zTip: G.zTip, cx: G.cx, top: topY, P: G.P, K: G.K, NA }; // the lasted surface itself: the foot is kept inside it
  return group;
}

/** Point on the last at front-line distance w and arc u across (bilinear in the swept grid). */
function surf(G, w, u) {
  const { wk, K } = G; if (w >= wk[0]) w = wk[0] - 1e-6; if (w <= wk[K - 1]) w = wk[K - 1] + 1e-6;
  let k = 0; while (k < K - 2 && wk[k + 1] > w) k++;
  const t = (wk[k] - w) / Math.max(1e-9, wk[k] - wk[k + 1]);
  const at = (kk) => { const arc = G.arc[kk]; const tot = arc[NA]; let a = u >= 0 ? u : tot + u; a = Math.max(0, Math.min(tot - 1e-9, a)); let i = 0; while (i < NA - 1 && arc[i + 1] < a) i++; const f = (a - arc[i]) / Math.max(1e-9, arc[i + 1] - arc[i]); const v0 = kk * NA + i; const v1 = kk * NA + (i + 1) % NA; const p = new THREE.Vector3(lerp(G.P[v0 * 3], G.P[v1 * 3], f), lerp(G.P[v0 * 3 + 1], G.P[v1 * 3 + 1], f), lerp(G.P[v0 * 3 + 2], G.P[v1 * 3 + 2], f)); const n = new THREE.Vector3(lerp(G.Nn[v0 * 3], G.Nn[v1 * 3], f), lerp(G.Nn[v0 * 3 + 1], G.Nn[v1 * 3 + 1], f), lerp(G.Nn[v0 * 3 + 2], G.Nn[v1 * 3 + 2], f)); const tu = new THREE.Vector3(G.P[v1 * 3] - G.P[v0 * 3], G.P[v1 * 3 + 1] - G.P[v0 * 3 + 1], G.P[v1 * 3 + 2] - G.P[v0 * 3 + 2]); return { p, n, tu }; };
  const a = at(k); const b = at(k + 1);
  const n = a.n.lerp(b.n, t).normalize(); const tu = a.tu.lerp(b.tu, t).normalize(); const tw = a.p.clone().sub(b.p).normalize();
  return { p: a.p.lerp(b.p, t), n, tu, tw };
}
function vert(G, v) { const k = Math.min(G.K - 1, Math.floor(v / NA)); const i = v % NA; const v1 = k * NA + (i + 1) % NA; const v2 = (k > 0 ? k - 1 : k + 1) * NA + i; const p = new THREE.Vector3(G.P[v * 3], G.P[v * 3 + 1], G.P[v * 3 + 2]); return { p, n: new THREE.Vector3(G.Nn[v * 3], G.Nn[v * 3 + 1], G.Nn[v * 3 + 2]), tu: new THREE.Vector3(G.P[v1 * 3] - p.x, G.P[v1 * 3 + 1] - p.y, G.P[v1 * 3 + 2] - p.z).normalize(), tw: new THREE.Vector3(G.P[v2 * 3] - p.x, G.P[v2 * 3 + 1] - p.y, G.P[v2 * 3 + 2] - p.z).multiplyScalar(k > 0 ? 1 : -1).normalize() }; }
function closest(G, p) { let best = -1; let bd = 1e9; for (let v = 0; v < G.N - 1; v += 1) { const dx = G.P[v * 3] - p.x; const dy = G.P[v * 3 + 1] - p.y; const dz = G.P[v * 3 + 2] - p.z; const d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = v; } } return best < 0 ? null : vert(G, best); }
function closestMask(G, mask, o) { let best = 0; let bd = 1e9; for (let v = 0; v < G.N - 1; v++) { const dx = G.P[v * 3] - o.p.x; const dy = G.P[v * 3 + 1] - o.p.y; const dz = G.P[v * 3 + 2] - o.p.z; const d = dx * dx + dy * dy + dz * dz; if (d < bd) { bd = d; best = v; } } return mask[best]; }


/**
 * A swept grid (rings of NA points, closed by a tip) ready for clip() and isoLines(): positions,
 * smooth outward normals, arc coordinates round each ring (uu, from index 0) and along the sweep (ww).
 */
export function gridFrom(rings, tip, centreOf = null) {
  const K = rings.length; const N = K * NA + 1;
  const G = { K, N, P: new Float32Array(N * 3), Nn: new Float32Array(N * 3), UV: new Float32Array(N * 2), uu: new Float32Array(N), ww: new Float32Array(N), ang: new Float32Array(N), ring: new Uint16Array(N), half: new Float32Array(K), wk: new Float32Array(K), arc: [] };
  for (let k = 0; k < K; k++) for (let i = 0; i < NA; i++) G.P.set(rings[k][i], (k * NA + i) * 3);
  G.P.set(tip, (N - 1) * 3);
  for (let k = K - 2; k >= 0; k--) { const a = rings[k][0]; const b = rings[k + 1][0]; G.wk[k] = G.wk[k + 1] + Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); }
  for (let k = 0; k < K; k++) { const arc = new Float32Array(NA + 1); for (let i = 0; i < NA; i++) { const a = rings[k][i]; const b = rings[k][(i + 1) % NA]; arc[i + 1] = arc[i] + Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); } G.arc.push(arc); G.half[k] = arc[NA] / 2; for (let i = 0; i < NA; i++) { const v = k * NA + i; G.uu[v] = i <= NA / 2 ? arc[i] : -(arc[NA] - arc[i]); G.ww[v] = G.wk[k]; G.ang[v] = (i / NA) * Math.PI * 2; G.ring[v] = k; G.UV[v * 2] = G.uu[v] * 10; G.UV[v * 2 + 1] = G.wk[k] * 10; } }
  G.ring[N - 1] = K;
  const T = []; for (let k = 0; k + 1 < K; k++) for (let i = 0; i < NA; i++) { const a = k * NA + i; const b = k * NA + (i + 1) % NA; const c = (k + 1) * NA + i; const d = (k + 1) * NA + (i + 1) % NA; T.push(a, b, c, b, d, c); }
  for (let i = 0; i < NA; i++) T.push((K - 1) * NA + i, (K - 1) * NA + (i + 1) % NA, N - 1);
  G.T = new Uint32Array(T);
  const P = G.P; const Nn = G.Nn;
  for (let t = 0; t < G.T.length; t += 3) { const a = G.T[t] * 3; const b = G.T[t + 1] * 3; const c = G.T[t + 2] * 3; const ux = P[b] - P[a]; const uy = P[b + 1] - P[a + 1]; const uz = P[b + 2] - P[a + 2]; const vx = P[c] - P[a]; const vy = P[c + 1] - P[a + 1]; const vz = P[c + 2] - P[a + 2]; const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx; for (const q of [a, b, c]) { Nn[q] += nx; Nn[q + 1] += ny; Nn[q + 2] += nz; } }
  // outward: away from the centre of the middle ring (or a given centre)
  const kc = Math.floor(K / 2); const c0 = centreOf || [0, 0, 0]; if (!centreOf) for (let i = 0; i < NA; i++) for (let q = 0; q < 3; q++) c0[q] += rings[kc][i][q] / NA;
  let dot = 0; for (let i = 0; i < NA; i += 4) { const v = (kc * NA + i) * 3; dot += Nn[v] * (P[v] - c0[0]) + Nn[v + 1] * (P[v + 1] - c0[1]) + Nn[v + 2] * (P[v + 2] - c0[2]); }
  G.flip = dot < 0;
  for (let v = 0; v < N; v++) { const l = (Math.hypot(Nn[v * 3], Nn[v * 3 + 1], Nn[v * 3 + 2]) || 1) * (G.flip ? -1 : 1); Nn[v * 3] /= l; Nn[v * 3 + 1] /= l; Nn[v * 3 + 2] /= l; }
  return G;
}

/** Lay a region of a grid as its own piece: surface, dark cut edge and rows of stitching. Returns the mesh. */
export function layPiece(G, group, mask, mat, { off = 0, color = '#888888', stitch = 1, stitchColor = null, edge = true, order = 0, pitch = 0.0026, inset = 0.0028, keep = null } = {}) {
  const c = clip(G, mask, off); if (!c.pos.length) return null;
  const mesh = new THREE.Mesh(geoOf(c), mat); mesh.renderOrder = order; group.add(mesh);
  const col = new THREE.Color(color); const o0 = typeof off === 'number' ? off : 0;
  if (edge) for (const line of isoLines(G, mask, 0.0002, o0 + 0.0003, keep)) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(line.map((q) => q.p)), new THREE.LineBasicMaterial({ color: col.clone().multiplyScalar(0.42) })));
  for (let r = 0; r < stitch; r++) for (const line of isoLines(G, mask, inset + r * 0.0022, o0 + 0.0005, keep)) { const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(line.map((q) => q.p)), new THREE.LineDashedMaterial({ color: stitchColor || col.clone().lerp(new THREE.Color('#ffffff'), 0.35).getStyle(), dashSize: pitch, gapSize: pitch * 0.42 })); ln.computeLineDistances(); group.add(ln); }
  return mesh;
}

/** A point of a grid with its frame. */
export function gridVert(G, v) { const k = Math.min(G.K - 1, Math.floor(v / NA)); const i = v % NA; const v1 = k * NA + (i + 1) % NA; const v2 = (k > 0 ? k - 1 : k + 1) * NA + i; const p = new THREE.Vector3(G.P[v * 3], G.P[v * 3 + 1], G.P[v * 3 + 2]); return { p, n: new THREE.Vector3(G.Nn[v * 3], G.Nn[v * 3 + 1], G.Nn[v * 3 + 2]), tu: new THREE.Vector3(G.P[v1 * 3] - p.x, G.P[v1 * 3 + 1] - p.y, G.P[v1 * 3 + 2] - p.z).normalize(), tw: new THREE.Vector3(G.P[v2 * 3] - p.x, G.P[v2 * 3 + 1] - p.y, G.P[v2 * 3 + 2] - p.z).multiplyScalar(k > 0 ? 1 : -1).normalize() }; }
