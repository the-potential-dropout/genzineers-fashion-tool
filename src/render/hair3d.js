/**
 * Hair and facial hair, grown on the mannequin's own head.
 *
 * The scalp is cut out of the head along a real hairline (temples, sideburns, round the ears, the
 * nape). Thousands of locks are rooted on it and grown in the style's direction; each one bends
 * under its own weight, lies on the head, neck and shoulders (it is kept outside the body's
 * distance field) and carries its own wave or curl. Tied styles gather to a band and continue as
 * a tail, a bun or plaits; locs and box braids are ropes. Beards and moustaches grow the same
 * way on the face. Long hair sways in the air.
 */
import * as THREE from 'three';
import { sampleField } from '../sim/bodyfield.js';
import { strand, merge } from './shoes3d.js';

const H = (name, o) => ({ name, top: 4, side: 3, back: 3, flow: 'down', curl: 0, pitch: 6, lift: 0.3, count: 3200, width: 2.6, stiff: 0.5, mess: 0.15, ...o });
export const HAIR_STYLES = {
  none: { name: 'Bald / none' },
  buzz: H('Buzz cut', { top: 0.6, side: 0.5, back: 0.5, flow: 'radial', count: 5200, width: 1.3, stiff: 1 }),
  crew: H('Crew cut', { top: 2.2, side: 0.8, back: 0.8, flow: 'up', count: 4600, width: 1.6, stiff: 0.95, lift: 0.9 }),
  fade: H('Fade (short sides, textured top)', { top: 4.5, side: 0.35, back: 0.35, flow: 'forward', count: 4600, width: 1.9, stiff: 0.8, mess: 0.5, lift: 0.7, fadeAt: 0.085 }),
  'short-textured': H('Short and textured', { top: 5, side: 2.4, back: 2.4, flow: 'forward', mess: 0.6, stiff: 0.7, lift: 0.6 }),
  'side-part': H('Side part', { top: 7.5, side: 3, back: 3.2, flow: 'side', part: 0.032, stiff: 0.6, lift: 0.45 }),
  'slick-back': H('Slicked back', { top: 10, side: 4.5, back: 5, flow: 'back', stiff: 0.7, lift: 0.25, mess: 0.04 }),
  quiff: H('Quiff / pompadour', { top: 10, side: 2.2, back: 2.6, flow: 'quiff', stiff: 0.85, lift: 1.0, mess: 0.1 }),
  undercut: H('Undercut', { top: 11, side: 0.35, back: 0.35, flow: 'back', stiff: 0.6, lift: 0.4, fadeAt: 0.075 }),
  mohawk: H('Mohawk', { top: 9, side: 0.3, back: 0.3, flow: 'up', stiff: 1, lift: 1, strip: 0.026, count: 4800, width: 1.8 }),
  curtains: H('Curtains (centre part)', { top: 13, side: 9, back: 8, flow: 'side', part: 0, stiff: 0.35, lift: 0.5 }),
  mullet: H('Mullet', { top: 6, side: 2.5, back: 22, flow: 'down', stiff: 0.4, mess: 0.3 }),
  pixie: H('Pixie cut', { top: 6, side: 3, back: 2.5, flow: 'side', part: -0.03, stiff: 0.5, mess: 0.3, fringe: 5 }),
  'short-curls': H('Short curls', { top: 6, side: 4.5, back: 4.5, flow: 'radial', curl: 0.7, pitch: 2.0, stiff: 0.85, lift: 0.8, mess: 1.4, width: 3.2, count: 5600, mass: 0.82 }),
  afro: H('Afro', { top: 9, side: 8, back: 8, flow: 'radial', curl: 0.75, pitch: 1.5, stiff: 1, lift: 1, mess: 1.6, width: 3.6, count: 7000, mass: 0.9 }),
  'big-afro': H('Big afro', { top: 16, side: 15, back: 15, flow: 'radial', curl: 0.9, pitch: 1.8, stiff: 1, lift: 1, mess: 1.6, width: 4, count: 8000, mass: 0.92 }),
  bob: H('Bob (chin length)', { top: 27, side: 24, back: 22, flow: 'side', part: 0.02, stiff: 0.3, tuck: 1, count: 3600, width: 3 }),
  'bob-fringe': H('Bob with a fringe', { top: 27, side: 24, back: 22, flow: 'side', part: 0, stiff: 0.3, tuck: 1, fringe: 5.6, count: 3800, width: 3 }),
  lob: H('Long bob (shoulder length)', { top: 36, side: 33, back: 31, flow: 'side', part: 0.025, stiff: 0.25, count: 3600, width: 3 }),
  'long-straight': H('Long and straight', { top: 60, side: 56, back: 54, flow: 'side', part: 0, stiff: 0.18, count: 3800, width: 3.2, mess: 0.05 }),
  'long-wavy': H('Long and wavy', { top: 58, side: 54, back: 52, flow: 'side', part: 0.02, curl: 0.75, pitch: 11, stiff: 0.2, count: 3800, width: 3.2 }),
  'long-curly': H('Long curls', { top: 48, side: 44, back: 42, flow: 'side', part: 0.02, curl: 1.15, pitch: 4.2, stiff: 0.3, count: 2300, width: 4.4, lift: 0.7 }),
  'long-fringe': H('Long with a fringe', { top: 58, side: 54, back: 52, flow: 'side', part: 0, stiff: 0.18, fringe: 5.8, count: 4000, width: 3.2 }),
  ponytail: H('Ponytail', { tie: [0.085, Math.PI], tail: 38, flow: 'tie', stiff: 0.25, count: 3200 }),
  'high-ponytail': H('High ponytail', { tie: [0.03, Math.PI * 0.94], tail: 46, flow: 'tie', stiff: 0.25, count: 3200 }),
  'low-ponytail': H('Low ponytail', { tie: [0.165, Math.PI], tail: 34, flow: 'tie', stiff: 0.22, count: 3200 }),
  bun: H('Bun', { tie: [0.07, Math.PI], bun: 4.6, flow: 'tie', count: 3200 }),
  'top-knot': H('Top knot', { tie: [0.008, Math.PI * 0.9], bun: 3.6, flow: 'tie', count: 3200 }),
  'man-bun': H('Man bun (shaved sides)', { tie: [0.06, Math.PI], bun: 3.4, flow: 'tie', count: 3200, fadeAt: 0.085, side: 0.35 }),
  braids: H('Two braids', { tie: [0.15, 2.2, true], braid: 42, flow: 'tie', count: 3200, part: 0 }),
  'single-braid': H('Single braid', { tie: [0.15, Math.PI], braid: 50, flow: 'tie', count: 3200 }),
  'box-braids': H('Box braids', { ropes: 120, rope: 52, ropeR: 2.6, flow: 'down', count: 0 }),
  'short-locs': H('Short locs', { ropes: 90, rope: 13, ropeR: 3.4, flow: 'radial', count: 0, rough: 1 }),
  dreadlocks: H('Dreadlocks', { ropes: 64, rope: 44, ropeR: 4.6, flow: 'down', count: 0, rough: 1 }),
  cornrows: H('Cornrows', { rows: 11, flow: 'back', count: 0 }),
};

const F = (name, o) => ({ name, len: 0.4, mou: false, beard: 0, chin: false, burns: false, count: 2600, ...o });
export const FACIAL_STYLES = {
  none: { name: 'Clean shaven' },
  stubble: F('Stubble', { len: 0.25, mou: true, beard: 1.3, count: 4200, shade: 0.5 }),
  moustache: F('Moustache', { len: 1.1, mou: true, count: 900 }),
  handlebar: F('Handlebar moustache', { len: 1.6, mou: true, handlebar: true, count: 1000 }),
  'soul-patch': F('Soul patch', { len: 0.8, chin: 0.1, count: 300 }),
  goatee: F('Goatee', { len: 1.4, mou: true, chin: 0.44, count: 1700 }),
  'van-dyke': F('Van Dyke', { len: 2.4, mou: true, chin: 0.3, count: 1500, point: true }),
  'chin-strap': F('Chin strap', { len: 0.5, beard: 1.35, strap: true, count: 1700 }),
  'mutton-chops': F('Mutton chops', { len: 1.4, beard: 1.35, chops: true, mou: true, count: 2200 }),
  'short-beard': F('Short beard', { len: 1.0, mou: true, beard: 1.3, count: 3800, shade: 0.8 }),
  'full-beard': F('Full beard', { len: 2.8, mou: true, beard: 1.35, count: 4400, shade: 0.9 }),
  'long-beard': F('Long beard', { len: 11, mou: true, beard: 1.35, count: 4600, shade: 0.9, wave: 0.5 }),
};

export const HAIR_COLORS = [['#0c0b0b', 'Black'], ['#241711', 'Darkest brown'], ['#3b2416', 'Dark brown'], ['#5a3a22', 'Brown'], ['#7a5433', 'Light brown'], ['#a67744', 'Dark blonde'], ['#d2b071', 'Blonde'], ['#ead9a8', 'Platinum'], ['#7a2e18', 'Auburn'], ['#b5521d', 'Ginger'], ['#8c8c8c', 'Grey'], ['#e6e6e6', 'White'], ['#b83a6a', 'Pink'], ['#2f5fb0', 'Blue'], ['#2f8f6a', 'Green'], ['#7a3fb0', 'Purple']];

const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const HL = [[0, 0.06], [0.7, 0.05], [1.0, 0.058], [1.24, 0.088], [1.42, 0.136], [1.58, 0.106], [1.92, 0.1], [2.2, 0.15], [2.6, 0.2], [Math.PI, 0.205]]; // depth below the crown of the hairline, by angle from the front: brow, temple, sideburn, over the ear, nape
const hairline = (a) => { a = Math.abs(a); for (let i = 1; i < HL.length; i++) if (a <= HL[i][0]) { const t = (a - HL[i - 1][0]) / (HL[i][0] - HL[i - 1][0]); return HL[i - 1][1] + (HL[i][1] - HL[i - 1][1]) * (t * t * (3 - 2 * t)); } return 0.205; };

/** Cut the region mask > 0 out of a triangle soup (9 numbers per triangle, with matching normals); returns triangles with interpolated normals. */
function cutTris(tris, nors, mf) {
  const out = []; const on = []; const ms = [];
  for (let t = 0; t < tris.length; t += 9) {
    const m = [0, 1, 2].map((k) => mf(tris[t + k * 3], tris[t + k * 3 + 1], tris[t + k * 3 + 2]));
    if (m[0] <= 0 && m[1] <= 0 && m[2] <= 0) continue;
    const poly = [];
    for (let e = 0; e < 3; e++) { const a = t + e * 3; const b = t + ((e + 1) % 3) * 3; const ma = m[e]; const mb = m[(e + 1) % 3]; if (ma > 0) poly.push([a, a, 0]); if ((ma > 0) !== (mb > 0)) poly.push([a, b, ma / (ma - mb)]); }
    for (let q = 1; q + 1 < poly.length; q++) for (const [a, b, s] of [poly[0], poly[q], poly[q + 1]]) { for (let c = 0; c < 3; c++) { out.push(tris[a + c] + (tris[b + c] - tris[a + c]) * s); on.push(nors[a + c] + (nors[b + c] - nors[a + c]) * s); } const ia = (a - t) / 3; const ib = (b - t) / 3; ms.push(Math.max(0, m[ia] + (m[ib] - m[ia]) * s)); }
  }
  return { tris: out, nors: on, ms };
}

/** Evenly scattered roots on a triangle soup: [x,y,z,nx,ny,nz] each. */
function scatter(cut, count, rnd) {
  const { tris, nors } = cut; const nT = tris.length / 9; if (!nT || !count) return [];
  const cum = new Float32Array(nT); let A = 0;
  for (let t = 0; t < nT; t++) { const o = t * 9; const ux = tris[o + 3] - tris[o]; const uy = tris[o + 4] - tris[o + 1]; const uz = tris[o + 5] - tris[o + 2]; const vx = tris[o + 6] - tris[o]; const vy = tris[o + 7] - tris[o + 1]; const vz = tris[o + 8] - tris[o + 2]; A += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx); cum[t] = A; }
  const roots = [];
  for (let i = 0; i < count; i++) { const r = rnd() * A; let lo = 0; let hi = nT - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; } const o = lo * 9; let u = rnd(); let v = rnd(); if (u + v > 1) { u = 1 - u; v = 1 - v; } const w = 1 - u - v; const p = []; for (let c = 0; c < 3; c++) p.push(tris[o + c] * w + tris[o + 3 + c] * u + tris[o + 6 + c] * v); const n = new THREE.Vector3(nors[o] * w + nors[o + 3] * u + nors[o + 6] * v, nors[o + 1] * w + nors[o + 4] * u + nors[o + 7] * v, nors[o + 2] * w + nors[o + 5] * u + nors[o + 8] * v).normalize(); roots.push([p[0], p[1], p[2], n.x, n.y, n.z]); }
  return roots;
}

/**
 * @param look  { hair, hairColor, hairTip, facialHair, facialColor, hairMove }
 * @param tris  Float32Array of the head's triangles (9 per triangle), posed
 * @param field body distance field (keeps hair outside the head, neck and shoulders)
 * @param opts  { hatDepth }: with a hat on, nothing shows above its band
 */
export function buildHair(look, tris, field, opts = {}) {
  const group = new THREE.Group(); if (!tris?.length) return group;
  const style = HAIR_STYLES[look.hair] && look.hair !== 'none' ? HAIR_STYLES[look.hair] : null; const facial = FACIAL_STYLES[look.facialHair] && look.facialHair !== 'none' ? FACIAL_STYLES[look.facialHair] : null;
  if (!style && !facial) return group;
  // ---- head frame and normals
  let top = -9; for (let k = 1; k < tris.length; k += 3) top = Math.max(top, tris[k]);
  let zc = 0; let n0 = 0; let noseZ = -9; let noseD = 0.15;
  for (let k = 0; k < tris.length; k += 3) { const d = top - tris[k + 1]; if (d < 0.12) { zc += tris[k + 2]; n0++; } if (d > 0.1 && d < 0.2 && Math.abs(tris[k]) < 0.012 && tris[k + 2] > noseZ) { noseZ = tris[k + 2]; noseD = d; } }
  { let z0 = 9; let z1 = -9; for (let k = 0; k < tris.length; k += 3) { const d = top - tris[k + 1]; if (d > 0.03 && d < 0.1) { z0 = Math.min(z0, tris[k + 2]); z1 = Math.max(z1, tris[k + 2]); } } zc = z1 > z0 ? (z0 + z1) / 2 : zc / (n0 || 1); } // the middle of the skull front to back (an average would be pulled forward by the face's dense mesh)
  const nors = new Float32Array(tris.length); { const acc = new Map(); const key = (k) => `${Math.round(tris[k] * 5e4)},${Math.round(tris[k + 1] * 5e4)},${Math.round(tris[k + 2] * 5e4)}`;
    for (let t = 0; t < tris.length; t += 9) { const ux = tris[t + 3] - tris[t]; const uy = tris[t + 4] - tris[t + 1]; const uz = tris[t + 5] - tris[t + 2]; const vx = tris[t + 6] - tris[t]; const vy = tris[t + 7] - tris[t + 1]; const vz = tris[t + 8] - tris[t + 2]; const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; for (let q = 0; q < 3; q++) { const kk = key(t + q * 3); const o = acc.get(kk) || [0, 0, 0]; o[0] += n[0]; o[1] += n[1]; o[2] += n[2]; acc.set(kk, o); } }
    for (let k = 0; k < tris.length; k += 3) { const o = acc.get(key(k)); const l = Math.hypot(o[0], o[1], o[2]) || 1; const sgn = o[0] * tris[k] + o[1] * (tris[k + 1] - (top - 0.11)) + o[2] * (tris[k + 2] - zc) < 0 ? -1 : 1; nors[k] = (o[0] / l) * sgn; nors[k + 1] = (o[1] / l) * sgn; nors[k + 2] = (o[2] / l) * sgn; } }
  const angOf = (x, z) => Math.atan2(x, z - zc); const o4 = [0, 0, 0, 0];
  const SD = (x, y, z) => (field && sampleField(field, x, y, z, o4) ? o4[0] : 0.05); // distance to the body (gradient left in o4[1..3]); far when outside the field
  const hat = opts.hatDepth || 0; const hatCut = (y) => (hat ? (top - y) - (hat - 0.006) : 1);
  const C = new THREE.Color(look.hairColor || '#3b2416'); const tipC = new THREE.Color(look.hairTip || look.hairColor || '#3b2416');
  const ribbons = { pos: [], nor: [], uv: [], col: [], idx: [] };
  const centre = new THREE.Vector3(0, top - 0.1, zc);
  /** Add one lock as a ribbon: pts (Vector3[]), width (m), colour, how free it is to move (0..1). */
  const addLock = (pts, width, col, tipCol, free, taper = 0.75, fixed = false) => {
    const n = pts.length; if (n < 2) return; const base = ribbons.pos.length / 3; const tmp = new THREE.Vector3(); const side = new THREE.Vector3(); const out = new THREE.Vector3();
    for (let i = 0; i < n; i++) { const t = i / (n - 1); tmp.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize(); out.subVectors(pts[i], centre); out.y *= 0.5; out.normalize(); if (fixed) side.set(out.z, 0, -out.x); else side.crossVectors(tmp, out); if (side.lengthSq() < 1e-6) side.set(1, 0, 0); side.normalize(); const nn = new THREE.Vector3().crossVectors(side, tmp).normalize(); const w = width * 0.5 * (1 - taper * Math.pow(t, 2.2));
      const c = col.clone().lerp(tipCol, sstep(0.45, 1, t)).multiplyScalar(0.72 + 0.28 * Math.min(1, t * 3));
      for (const s of [-1, 1]) { ribbons.pos.push(pts[i].x + side.x * w * s, pts[i].y + side.y * w * s, pts[i].z + side.z * w * s); ribbons.nor.push(nn.x + side.x * s * 0.35, nn.y + side.y * s * 0.35, nn.z + side.z * s * 0.35); ribbons.uv.push(free, t); ribbons.col.push(c.r, c.g, c.b); } }
    for (let i = 0; i + 1 < n; i++) { const a = base + i * 2; ribbons.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  };
  /** Grow a lock from a root: follows its direction, bends under its weight, stays outside the body. */
  const grow = (root, nrm, len, dir0, P, rnd) => {
    const seg = Math.min(P.curl ? Math.max(0.0036, P.pitch / 100 / 10) : 0.012, Math.max(0.0025, len / 5)); const nS = Math.max(2, Math.min(P.curl ? 116 : 64, Math.round(len / seg))); const pts = [new THREE.Vector3(root[0], root[1], root[2])]; const dir = dir0.clone().normalize(); const p = pts[0].clone(); const g = new THREE.Vector3(0, -1, 0); const clear = (P.clear ?? 0.0022) + rnd() * (P.layer ?? 0.004); const grad = new THREE.Vector3();
    for (let i = 0; i < nS; i++) {
      const t = i / nS; dir.addScaledVector(g, (1 - P.stiff) * (0.16 + 0.5 * t) * (P.grav ?? 1)).normalize();
      if (P.tuck && t > 0.7) dir.addScaledVector(new THREE.Vector3(-p.x, 0, -(p.z - zc)).normalize(), 0.12 * P.tuck).normalize();
      p.addScaledVector(dir, seg);
      if (P.face && p.z - zc > 0.005 && Math.abs(p.x) < 0.082 && top - p.y > 0.035 && top - p.y < 0.26) { const sx = p.x >= 0 ? 1 : -1; const push = (0.082 - Math.abs(p.x)) * 0.55; p.x += sx * push; dir.x += sx * 0.5; dir.z -= 0.25; dir.normalize(); } // hair is worn off the face
      if (field) { const d = SD(p.x, p.y, p.z); if (Number.isFinite(d) && d < clear) { grad.set(o4[1], o4[2], o4[3]); const gl = grad.length(); if (gl > 1e-6) { grad.multiplyScalar(1 / gl); p.addScaledVector(grad, clear - d); const into = dir.dot(grad); if (into < 0) dir.addScaledVector(grad, -into).normalize(); } } }
      pts.push(p.clone());
    }
    if (P.curl) { const R = P.curl / 100; const om = (Math.PI * 2) / (P.pitch / 100); const ph = root[0] * 38 + root[2] * 31 + root[1] * 12 + rnd() * 0.9; let s = 0; const b1 = new THREE.Vector3(); const b2 = new THREE.Vector3(); const tg = new THREE.Vector3();
      for (let i = 1; i < pts.length; i++) { tg.subVectors(pts[i], pts[i - 1]); s += tg.length(); tg.normalize(); b1.crossVectors(tg, Math.abs(tg.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(); b2.crossVectors(tg, b1); const env = Math.min(1, s / 0.02) * R; pts[i].addScaledVector(b1, Math.cos(om * s + ph) * env).addScaledVector(b2, Math.sin(om * s + ph) * env); } }
    return pts;
  };
  const tangent = (v, n) => v.clone().addScaledVector(n, -v.dot(n));
  const shell = (cut, color, off, opacity = 1, fade = 0.009) => { if (!cut.tris.length) return; const pos = new Float32Array(cut.tris.length); for (let k = 0; k < pos.length; k++) pos[k] = cut.tris[k] + cut.nors[k] * off; const nV = pos.length / 3; const col = new Float32Array(nV * 4); for (let v = 0; v < nV; v++) { col[v * 4] = color.r; col[v * 4 + 1] = color.g; col[v * 4 + 2] = color.b; col[v * 4 + 3] = opacity * (fade && cut.ms ? sstep(0, fade, cut.ms[v]) : 1); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(cut.nors), 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 4)); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, alphaHash: true, side: THREE.DoubleSide })); group.add(m); }; // dithered, not blended: the edge breaks up into dots like a real hairline, and it sorts correctly against the skin
  const ropes = []; // thick locks, braids, buns: round strands

  // ================= scalp hair =================
  if (style) {
    const rnd = rng(1234 + (look.hair || '').length * 97);
    const scalpM = (x, y, z) => { const d = top - y; const a = angOf(x, z); return Math.min(hairline(a) - d, hatCut(y), style.strip ? style.strip + 0.03 * sstep(0.12, 0.2, d) - Math.abs(x) : 1); };
    const scalp = cutTris(tris, nors, scalpM);
    const full = style.strip || style.fadeAt ? cutTris(tris, nors, (x, y, z) => Math.min(hairline(angOf(x, z)) - (top - y), hatCut(y))) : scalp;
    shell(full, C.clone().multiplyScalar(0.4), 0.0014, style.strip || style.fadeAt || style.top < 1 ? 0.6 : 1);
    if (style.strip) shell(scalp, C.clone().multiplyScalar(0.55), 0.0009);
    if (style.mass) { const mg = cutTris(tris, nors, (x, y, z) => scalpM(x, y, z) + 0.004); const off = (style.side / 100) * style.mass; const pos = new Float32Array(mg.tris.length); for (let k = 0; k < pos.length; k += 3) { const lump = 1 + 0.07 * Math.sin(mg.tris[k] * 90 + mg.tris[k + 1] * 70) * Math.cos(mg.tris[k + 2] * 80); const edge = 0.45 + 0.55 * sstep(0, 0.03, mg.ms[k / 3]); pos[k] = mg.tris[k] + mg.nors[k] * off * lump * edge; pos[k + 1] = mg.tris[k + 1] + mg.nors[k + 1] * off * lump * edge; pos[k + 2] = mg.tris[k + 2] + mg.nors[k + 2] * off * lump * edge; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(mg.nors), 3)); group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: C.clone().multiplyScalar(0.42), roughness: 1, side: THREE.DoubleSide }))); }
    const lenAt = (x, y, z) => { const d = top - y; const a = Math.abs(angOf(x, z)); const sideW = sstep(0.045, 0.1, d) * (1 - sstep(2.2, 2.75, a) * 0.0); const backW = sstep(1.9, 2.6, a) * sstep(0.05, 0.12, d); let L = style.top * (1 - sideW) + (style.side * (1 - backW) + style.back * backW) * sideW; if (style.fadeAt) L = Math.min(L, d > style.fadeAt ? style.side * (1 - sstep(style.fadeAt, style.fadeAt + 0.06, d) * 0.6) : style.top); if (style.fringe && a < 0.75 && d < 0.085) L = Math.min(L, style.fringe); return L / 100; };
    const tieP = style.tie ? (sx) => { const a = style.tie[2] ? sx * style.tie[1] : style.tie[1]; let r = 0.13; const y = top - style.tie[0]; const o = new THREE.Vector3(); for (let it = 0; it < 60; it++) { o.set(Math.sin(a) * r, y, zc + Math.cos(a) * r); const d = SD(o.x, o.y, o.z); if (!Number.isFinite(d) || d < 0.004) break; r -= Math.max(0.001, d * 0.7); } return o; } : null;
    const roots = scatter(scalp, style.count, rnd);
    for (const r of roots) {
      const n = new THREE.Vector3(r[3], r[4], r[5]); const p = new THREE.Vector3(r[0], r[1], r[2]); const a = angOf(p.x, p.z); const d = top - p.y;
      let flow; let L = lenAt(p.x, p.y, p.z) * (0.82 + rnd() * 0.36); let P = { stiff: style.stiff, curl: style.curl * (0.85 + rnd() * 0.3), pitch: style.pitch * (0.92 + rnd() * 0.16), tuck: style.tuck, layer: L > 0.1 ? 0.012 : 0.004, face: L > 0.12 };
      const fringe = style.fringe && Math.abs(a) < 0.75 && d < 0.085;
      if (fringe) flow = new THREE.Vector3(Math.sin(a) * 0.3, -0.5, 1);
      else if (style.flow === 'radial') flow = n.clone();
      else if (style.flow === 'up') flow = n.clone().add(new THREE.Vector3(0, 0.8, d < 0.06 ? 0.15 : 0));
      else if (style.flow === 'forward') flow = new THREE.Vector3(Math.sin(a) * 0.4, d < 0.05 ? 0.25 : -0.6, d < 0.07 ? 0.9 : 0.1);
      else if (style.flow === 'back') flow = new THREE.Vector3(Math.sin(a) * 0.15, -0.35, -1);
      else if (style.flow === 'quiff') flow = d < 0.055 && Math.abs(a) < 1.2 ? new THREE.Vector3(0, 0.9, -0.55) : new THREE.Vector3(Math.sin(a) * 0.2, -0.5, -0.8);
      else if (style.flow === 'side') { const sx = p.x - (style.part || 0) >= 0 ? 1 : -1; const frontal = 1 - sstep(0.7, 1.5, Math.abs(a)); flow = new THREE.Vector3(sx * (d < 0.06 ? 1 : 0.35) * (1 + frontal * (style.top > 15 ? 0.8 : 0)), -0.55 + frontal * (style.top > 15 ? 0.3 : 0), -0.12 - 0.3 * sstep(1.2, 2.4, Math.abs(a)) - frontal * (style.top > 15 ? 0.55 : 0)); }
      else if (style.flow === 'tie') { const tp = tieP(p.x >= 0 ? 1 : -1); flow = tp.clone().sub(p); L = Math.min(Math.max(0.01, flow.length() * 1.12), 0.4); P = { stiff: 0.97, clear: 0.0016, layer: 0.002, grav: 0.2, toward: tp }; }
      else flow = new THREE.Vector3(Math.sin(a) * 0.25, -1, Math.cos(a) * 0.12);
      if (L < 0.002) continue;
      if (style.mass) { // one coil: a small spring lying on the outside of the hair's mass
        const lump = 1 + 0.07 * Math.sin(p.x * 90 + p.y * 70) * Math.cos(p.z * 80); const edge = 0.45 + 0.55 * sstep(0, 0.03, scalpM(p.x, p.y, p.z)); const c0 = p.clone().addScaledVector(n, (style.side / 100) * style.mass * lump * edge - 0.002 + rnd() * 0.006);
        const ax = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).addScaledVector(n, 0.9).normalize(); const u = new THREE.Vector3().crossVectors(ax, Math.abs(ax.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(); const v2 = new THREE.Vector3().crossVectors(ax, u); const R = (style.curl / 100) * (0.55 + rnd() * 0.5); const turns = 1.4 + rnd() * 1.6; const rise = style.pitch / 100 * 0.32; const pts = []; const a0 = rnd() * 6.28;
        for (let q = 0; q <= 16; q++) { const th = a0 + (q / 16) * turns * Math.PI * 2; pts.push(c0.clone().addScaledVector(u, Math.cos(th) * R).addScaledVector(v2, Math.sin(th) * R).addScaledVector(ax, (q / 16) * turns * rise)); }
        const sh2 = 0.72 + rnd() * 0.5; addLock(pts, (style.width / 1000) * (0.55 + rnd() * 0.5), C.clone().multiplyScalar(sh2), tipC.clone().multiplyScalar(sh2), 0, 0.35); continue; }
      flow.x += (rnd() - 0.5) * style.mess * 1.6; flow.y += (rnd() - 0.5) * style.mess; flow.z += (rnd() - 0.5) * style.mess * 1.6;
      const lift = Math.min(1, style.lift) * (style.flow === 'radial' || style.flow === 'up' ? 1 : 0.35);
      const dir = tangent(flow, n).normalize().multiplyScalar(1 - lift).addScaledVector(style.flow === 'up' || style.flow === 'quiff' ? flow.clone().normalize() : n, lift + 0.08);
      let pts;
      if (P.toward) { // pulled tight to the band: follow the head towards it
        pts = [p.clone()]; const q = p.clone(); const steps = Math.max(3, Math.round(L / 0.01)); const grad = new THREE.Vector3();
        for (let i = 0; i < steps; i++) { const to = P.toward.clone().sub(q); const dl = to.length(); if (dl < 0.012) break; q.addScaledVector(to.normalize(), Math.min(0.011, dl)); if (field) { const dd = SD(q.x, q.y, q.z); const cl = 0.002 + rnd() * 0.002; if (Number.isFinite(dd) && dd < cl) { grad.set(o4[1], o4[2], o4[3]).normalize(); q.addScaledVector(grad, cl - dd); } } pts.push(q.clone()); }
        pts.push(P.toward.clone().add(new THREE.Vector3((rnd() - 0.5) * 0.01, (rnd() - 0.5) * 0.01, (rnd() - 0.5) * 0.004)));
      } else pts = grow(r, n, L, dir, P, rnd);
      const shade = 0.8 + rnd() * 0.32; const free = P.toward ? 0 : Math.min(1, Math.max(0, (L - 0.05) / 0.25));
      if (!P.toward && L > 0.09 && style.curl < 0.5 && rnd() < 0.3) addLock(pts.map((q) => q.clone().addScaledVector(n, -0.0012)), (style.width / 1000) * 3.4, C.clone().multiplyScalar(shade * 0.62), tipC.clone().multiplyScalar(shade * 0.7), free, 0.45);
      addLock(pts, (style.width / 1000) * (0.7 + rnd() * 0.7) * (L < 0.02 ? 0.8 : L > 0.2 ? 1.5 : 1), C.clone().multiplyScalar(shade), tipC.clone().multiplyScalar(shade), free, L < 0.03 ? 0.9 : 0.6, style.curl >= 0.9 && L > 0.1);
    }
    // ---- tails, buns, plaits
    if (style.tie) for (const sx of style.tie[2] ? [1, -1] : [1]) {
      const tp = tieP(sx); const outN = new THREE.Vector3(tp.x, 0.15, tp.z - zc).normalize(); const band = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0032, 8, 18), new THREE.MeshStandardMaterial({ color: '#17171a', roughness: 0.7 })); band.position.copy(tp).addScaledVector(outN, 0.006); band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outN); group.add(band);
      if (style.tail) for (let i = 0; i < 260; i++) { const st = tp.clone().addScaledVector(outN, 0.008).add(new THREE.Vector3((rnd() - 0.5) * 0.014, (rnd() - 0.5) * 0.014, (rnd() - 0.5) * 0.008)); const dir = outN.clone().add(new THREE.Vector3((rnd() - 0.5) * 0.5, 0.1 + style.tie[0] * -2 + (rnd() - 0.5) * 0.3, (rnd() - 0.5) * 0.3)); const pts = grow([st.x, st.y, st.z], outN, (style.tail / 100) * (0.75 + rnd() * 0.3), dir, { stiff: 0.3, clear: 0.006, layer: 0.022, curl: style.curl, pitch: style.pitch }, rnd); const sh = 0.8 + rnd() * 0.32; addLock(pts, 0.0036, C.clone().multiplyScalar(sh), tipC.clone().multiplyScalar(sh), 1, 0.7); }
      if (style.bun) { const R = style.bun / 100; const bc = tp.clone().addScaledVector(outN, R * 0.8); for (let i = 0; i < 170; i++) { const ax = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().lerp(outN, 0.45).normalize(); const u = new THREE.Vector3().crossVectors(ax, new THREE.Vector3(0.3, 1, 0.2)).normalize(); const v = new THREE.Vector3().crossVectors(ax, u); const pts = []; const rr = R * (0.86 + rnd() * 0.18); const a0 = rnd() * 6.28; const sweep = 3.5 + rnd() * 2.5; const offA = (rnd() - 0.5) * R * 0.9; for (let q = 0; q <= 22; q++) { const th = a0 + (sweep * q) / 22; const rad = Math.sqrt(Math.max(0, rr * rr - offA * offA)); pts.push(bc.clone().addScaledVector(u, Math.cos(th) * rad).addScaledVector(v, Math.sin(th) * rad).addScaledVector(ax, offA)); } const sh = 0.8 + rnd() * 0.32; addLock(pts, 0.004, C.clone().multiplyScalar(sh), C.clone().multiplyScalar(sh), 0, 0.2); } const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.86, 16, 12), new THREE.MeshStandardMaterial({ color: C.clone().multiplyScalar(0.5), roughness: 0.9 })); core.position.copy(bc); group.add(core); }
      if (style.braid) { const down = outN.clone().multiplyScalar(0.5).add(new THREE.Vector3(style.tie[2] ? sx * 0.25 : 0, -0.6, style.tie[2] ? 0.7 : -0.2)); const cl = grow([tp.x + outN.x * 0.012, tp.y, tp.z + outN.z * 0.012], outN, style.braid / 100, down, { stiff: 0.25, clear: 0.014, layer: 0.001 }, rnd); const cur = new THREE.CatmullRomCurve3(cl).getSpacedPoints(Math.round(style.braid / 0.35)); const A = 0.0075;
        for (let k = 0; k < 3; k++) { const pts = []; const nr = []; for (let i = 0; i < cur.length; i++) { const t = i / (cur.length - 1); const tg = new THREE.Vector3().subVectors(cur[Math.min(cur.length - 1, i + 1)], cur[Math.max(0, i - 1)]).normalize(); const b1 = new THREE.Vector3().crossVectors(tg, outN).normalize(); const b2 = new THREE.Vector3().crossVectors(tg, b1); const ph = i * 0.42 + (k * Math.PI * 2) / 3; const taper = 1 - 0.55 * Math.pow(t, 3); pts.push(cur[i].clone().addScaledVector(b1, Math.sin(ph) * A * taper).addScaledVector(b2, Math.sin(2 * ph) * A * 0.55 * taper)); nr.push(b2.clone()); } ropes.push({ pts, nr, r: 0.0125, t: 0.011, col: C.clone().multiplyScalar(0.8 + k * 0.08) }); }
        const end = cur[cur.length - 1]; const eb = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0024, 6, 14), new THREE.MeshStandardMaterial({ color: '#17171a' })); eb.position.copy(cur[cur.length - 4]); eb.rotation.x = Math.PI / 2; group.add(eb); for (let i = 0; i < 40; i++) { const dir = new THREE.Vector3((rnd() - 0.5) * 0.5, -1, (rnd() - 0.5) * 0.5); const pts = grow([end.x, end.y, end.z], outN, 0.05 + rnd() * 0.02, dir, { stiff: 0.5, clear: 0.006 }, rnd); addLock(pts, 0.003, C, tipC, 1, 0.8); } }
    }
    // ---- box braids, locs: ropes rooted on the scalp
    if (style.ropes) { const rr = scatter(scalp, style.ropes, rnd); for (const r of rr) { const n = new THREE.Vector3(r[3], r[4], r[5]); const a = angOf(r[0], r[2]); const flow = style.flow === 'radial' ? n.clone().add(new THREE.Vector3(0, -0.2, 0)) : new THREE.Vector3(Math.sin(a) * 0.55, -0.8, Math.cos(a) * 0.3 - 0.15); const dir = tangent(flow, n).normalize().multiplyScalar(0.75).addScaledVector(n, 0.3); const R = style.ropeR / 1000; const pts0 = grow(r, n, (style.rope / 100) * (0.8 + rnd() * 0.3), dir, { stiff: style.flow === 'radial' ? 0.75 : 0.3, clear: R + 0.001, layer: 0.012, face: style.rope > 15 }, rnd); const pts = pts0.length > 3 ? new THREE.CatmullRomCurve3(pts0).getSpacedPoints(Math.max(6, pts0.length)) : pts0; if (style.rough) for (const q of pts) q.add(new THREE.Vector3((rnd() - 0.5) * R * 0.7, 0, (rnd() - 0.5) * R * 0.7)); ropes.push({ pts, nr: pts.map(() => n), r: R * 2, t: R * 2, col: C.clone().multiplyScalar(0.75 + rnd() * 0.35), tip: tipC, round: true }); } }
    if (style.rows) { for (let k = 0; k < style.rows; k++) { const x0 = (k - (style.rows - 1) / 2) * 0.0145; const pts = []; const nr = []; for (let q = 0; q <= 44; q++) { const th = -0.62 + (q / 44) * 2.7; let r = 0.16; const dirv = new THREE.Vector3(x0 * (1 + 0.4 * Math.sin(Math.max(0, th))), Math.cos(th), -Math.sin(th)).normalize(); const o = new THREE.Vector3(); for (let it = 0; it < 70; it++) { o.set(dirv.x * r + x0 * 0.4, top - 0.1 + dirv.y * r, zc + dirv.z * r); const dd = SD(o.x, o.y, o.z); if (!Number.isFinite(dd) || dd < 0.0035) break; r -= Math.max(0.0008, dd * 0.7); } if (top - o.y > hairline(angOf(o.x, o.z)) - 0.004 || hatCut(o.y) < 0) continue; pts.push(o.clone().add(new THREE.Vector3(Math.sin(q * 1.6) * 0.0012, 0, 0))); nr.push(dirv.clone()); } if (pts.length > 4) ropes.push({ pts, nr, r: 0.0062, t: 0.0042, col: C.clone().multiplyScalar(0.8 + (k % 2) * 0.12) }); } }
  }

  // ================= facial hair =================
  if (facial) {
    const rnd = rng(77 + (look.facialHair || '').length * 31); const FC = new THREE.Color(look.facialColor || look.hairColor || '#3b2416');
    const dm = noseD + 0.036; const dc = noseD + 0.083;
    const faceM = (x, y, z) => { const d = top - y; const a = Math.abs(angOf(x, z)); const r = Math.hypot(x, z - zc); let m = -1;
      if (facial.mou) m = Math.max(m, Math.min(0.034 - Math.abs(x) + (facial.handlebar ? 0.012 : 0), d - (noseD + 0.013), (dm - 0.003) - d, z - zc - 0.06));
      const cheek = a < 0.3 ? dm + 0.013 : dm - 0.01 + (0.118 - (dm - 0.01)) * sstep(0.3, 1.25, a) + (facial.strap ? 0.03 * (1 - sstep(0.9, 1.3, a)) + 0.012 : 0);
      if (facial.beard) { let b = Math.min(d - cheek, dc + 0.038 - d, facial.beard - a, r - 0.058 - Math.max(0, d - dc) * 0.5); if (facial.chops) b = Math.min(b, a - 0.5); m = Math.max(m, b); }
      if (facial.chin) m = Math.max(m, Math.min(d - (dm + 0.012), dc + 0.03 - d, facial.chin - a, r - 0.06));
      return m; };
    const face = cutTris(tris, nors, faceM);
    shell(face, FC.clone().multiplyScalar(0.75), 0.0009, Math.min(0.9, 0.32 * (facial.shade || 0.8) + (facial.len > 0.8 ? 0.5 : 0)), 0.014);
    for (const r of scatter(face, Math.round(facial.count * 1.6), rnd)) { const n = new THREE.Vector3(r[3], r[4], r[5]); const d = top - r[1]; const mou = d < dm - 0.002 && Math.abs(r[0]) < 0.05; const inside = sstep(0, 0.011, faceM(r[0], r[1], r[2])); if (rnd() > 0.25 + 0.75 * inside) continue; let L = (facial.len / 100) * (0.75 + rnd() * 0.5) * (0.35 + 0.65 * inside); if (mou) L = Math.min(L, facial.handlebar ? 0.022 : 0.012); if (facial.point && d > dc - 0.01) L *= 1.7;
      const flow = mou ? new THREE.Vector3(Math.sign(r[0] || 1) * (facial.handlebar ? 1.2 : 0.8), facial.handlebar ? 0.25 * Math.abs(r[0]) * 30 - 0.2 : -0.5, 0.2) : new THREE.Vector3(r[0] * (facial.point ? -2 : 1.5), -1, 0.25);
      const dir = tangent(flow, n).normalize().multiplyScalar(L > 0.02 ? 0.85 : 0.5).addScaledVector(n, L > 0.02 ? 0.25 : 0.6);
      const pts = grow(r, n, L, dir, { stiff: L > 0.04 ? 0.45 : 0.9, clear: 0.0012, layer: L > 0.03 ? 0.01 : 0.002, curl: facial.wave || (L > 0.012 ? 0.12 : 0), pitch: 1.6 }, rnd); const sh = 0.75 + rnd() * 0.4; addLock(pts, 0.0014 + (L > 0.02 ? 0.0012 : 0), FC.clone().multiplyScalar(sh), FC.clone().multiplyScalar(sh * 1.1), L > 0.05 ? 0.5 : 0, 0.85); }
  }

  // ---- eyebrows: short hairs along the brow ridge, sweeping outwards
  if (look.brows !== 'none') { const rnd = rng(4242); const BC = new THREE.Color(look.facialColor || look.hairColor || '#3b2416').multiplyScalar(0.8); const bd = noseD - (opts.female ? 0.06 : 0.05);
    const browM = (x, y, z) => { const d = top - y; const ax = Math.abs(x); const arch = bd - 0.006 * Math.sin(Math.PI * Math.min(1, Math.max(0, (ax - 0.012) / 0.044))); return Math.min((opts.female ? 0.0034 : 0.0048) * (1 - 0.45 * sstep(0.03, 0.058, ax)) - Math.abs(d - arch), ax - 0.011, 0.058 - ax, z - zc - 0.045); };
    const brow = cutTris(tris, nors, browM); shell(brow, BC.clone().multiplyScalar(0.8), 0.0006, opts.female ? 0.3 : 0.45, 0.003);
    for (const r of scatter(brow, opts.female ? 360 : 520, rnd)) { const n = new THREE.Vector3(r[3], r[4], r[5]); const sx = r[0] >= 0 ? 1 : -1; const dir = tangent(new THREE.Vector3(sx, 0.35 - Math.abs(r[0]) * 9, 0), n).normalize().multiplyScalar(0.9).addScaledVector(n, 0.18); const pts = grow(r, n, 0.005 + rnd() * 0.004, dir, { stiff: 1, clear: 0.0006, layer: 0.0006 }, rnd); const sh = 0.8 + rnd() * 0.4; addLock(pts, 0.0009, BC.clone().multiplyScalar(sh), BC.clone().multiplyScalar(sh), 0, 0.9); } }

  // ---- geometry
  if (ribbons.idx.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(ribbons.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(ribbons.nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(ribbons.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(ribbons.col, 3)); g.setIndex(ribbons.idx);
    const lum = C.r * 0.3 + C.g * 0.59 + C.b * 0.11; // dark hair shines less: a strong sheen turns black hair grey
    const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, sheen: 0.12 + lum * 0.5, sheenRoughness: 0.4, sheenColor: C.clone().lerp(new THREE.Color('#fff1d6'), 0.35), specularIntensity: 0.22 + lum * 0.3, side: THREE.DoubleSide });
    const amp = { still: 0, breeze: 0.006, wind: 0.02 }[look.hairMove || 'breeze'] ?? 0.006; const uni = { uTime: { value: 0 }, uSway: { value: amp } };
    mat.onBeforeCompile = (sh) => { sh.uniforms.uTime = uni.uTime; sh.uniforms.uSway = uni.uSway; sh.vertexShader = `uniform float uTime; uniform float uSway;\n${sh.vertexShader}`.replace('#include <begin_vertex>', `#include <begin_vertex>\n float hw = uv.y * uv.y * uv.x; float hp = position.x * 7.0 + position.z * 5.0 + position.y * 2.0;\n transformed.x += sin(uTime * 1.7 + hp) * uSway * hw + sin(uTime * 0.6) * uSway * 0.8 * hw;\n transformed.z += cos(uTime * 1.3 + hp * 1.3) * uSway * 0.7 * hw;`); };
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; group.add(mesh);
    group.userData.sway = amp > 0 && ribbons.uv.some((v, i) => i % 2 === 0 && v > 0.05); group.userData.tick = (t) => { uni.uTime.value = t; };
  }
  if (ropes.length) { const by = new Map(); for (const r of ropes) { const k = r.col.getHexString(); if (!by.has(k)) by.set(k, []); by.get(k).push(strand(r.pts, r.nr, r.r, r.t, true)); } for (const [k, gs] of by) group.add(new THREE.Mesh(merge(gs), new THREE.MeshPhysicalMaterial({ color: `#${k}`, roughness: 0.6, sheen: 0.5, side: THREE.DoubleSide }))); }
  group.traverse((m) => { m.frustumCulled = false; });
  return group;
}
