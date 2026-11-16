/**
 * A backpack, built the way a daypack is sewn.
 *
 * Body: a front panel and a padded back panel, both cut to the same rounded-top ("tombstone") outline, joined by
 * one continuous strip that runs round the outline: the base across the bottom, the side gussets up the sides and the
 * zip panel over the top, the main two-way zip set into the middle of the zip panel. Every seam shows as a welt.
 * Back panel: two foam pads under 3D air mesh with a spine channel between them and a lumbar pad, the edge bound.
 * Outside: a front pocket with its own gusset and zip, stretch-mesh bottle pockets with an elastic-bound top,
 * side compression straps with side-release buckles, a webbing haul loop sewn into the top seam under a yoke.
 * Harness: S-curved shoulder straps (shell over foam, air-mesh underside, bound edges) sewn into the top of the back
 * panel under the yoke; at the lower end a ladder-lock on the strap, the adjusting webbing running from an anchor
 * tab folded into a reinforcement triangle at the base corner, up through the ladder-lock, its tail hanging free;
 * a sternum strap on rails with a side-release buckle; load lifters on larger packs. Every webbing end is bartacked.
 *
 * Metres; the pack stands on the floor at the origin, front towards +z, back panel towards -z.
 */
import * as THREE from 'three';
import { merge, strand } from './shoes3d.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/** The tombstone outline (front view), closed, evenly spaced, counter-clockwise from the bottom centre. */
function outline(W, H, rb, Ht, taper, N) {
  const raw = [];
  const push = (x, y) => raw.push([x, y]);
  for (let i = 0; i <= 12; i++) push((W - rb) * (i / 12), 0);
  for (let i = 1; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * (Math.PI / 2); push(W - rb + Math.cos(a) * rb, rb + Math.sin(a) * rb); }
  for (let i = 1; i <= 16; i++) push(W, rb + (H - Ht - rb) * (i / 16));
  const n = 2.7; for (let i = 1; i <= 30; i++) { const t = (i / 30) * (Math.PI / 2); push(W * Math.pow(Math.cos(t), 2 / n), H - Ht + Ht * Math.pow(Math.sin(t), 2 / n)); }
  const half = raw.slice(); for (let i = half.length - 2; i > 0; i--) push(-half[i][0], half[i][1]);
  for (const p of raw) p[0] *= 1 - taper * (p[1] / H);
  // resample by arc length
  const L = [0]; for (let i = 1; i <= raw.length; i++) L.push(L[i - 1] + Math.hypot(raw[i % raw.length][0] - raw[i - 1][0], raw[i % raw.length][1] - raw[i - 1][1]));
  const tot = L[L.length - 1]; const out = []; let j = 0;
  for (let k = 0; k < N; k++) { const s = (k / N) * tot; while (L[j + 1] < s) j++; const a = raw[j]; const b = raw[(j + 1) % raw.length]; const t = (s - L[j]) / (L[j + 1] - L[j] || 1); out.push({ x: lerp(a[0], b[0], t), y: lerp(a[1], b[1], t) }); }
  for (let k = 0; k < N; k++) { const a = out[(k + N - 1) % N]; const b = out[(k + 1) % N]; const tx = b.x - a.x; const ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; out[k].nx = ty / l; out[k].ny = -tx / l; }
  return { pts: out, len: tot };
}

/** A smooth surface from a grid of points (rows of equal length). */
function gridGeo(rows, closedU = false) {
  const R = rows.length; const C = rows[0].length; const pos = []; const uv = []; const idx = [];
  rows.forEach((row, i) => row.forEach((p, j) => { pos.push(p.x, p.y, p.z); uv.push(j / (C - 1) * 4, i / (R - 1) * 4); }));
  const Cc = closedU ? C : C - 1;
  for (let i = 0; i + 1 < R; i++) for (let j = 0; j < Cc; j++) { const j2 = (j + 1) % C; const a = i * C + j; const b = i * C + j2; const c = a + C; const d = b + C; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

/** Side-release buckle (female body, male tongue with its two prongs), long axis along x, 1 = 25 mm webbing. */
function releaseBuckle(w = 0.025) {
  const s = w / 0.025; const g = [];
  const f = new THREE.BoxGeometry(0.032 * s, 0.009 * s, w + 0.007); f.translate(0.012 * s, 0, 0); g.push(f);
  const slot = new THREE.BoxGeometry(0.004 * s, 0.0096 * s, w * 0.72); slot.translate(0.027 * s, 0, 0); g.push(slot);
  const m = new THREE.BoxGeometry(0.02 * s, 0.006 * s, w + 0.004); m.translate(-0.012 * s, 0, 0); g.push(m);
  for (const z of [-1, 1]) { const pr = new THREE.BoxGeometry(0.008 * s, 0.0065 * s, 0.004 * s); pr.translate(-0.001 * s, 0, z * (w / 2 + 0.003)); g.push(pr); }
  const bar = new THREE.BoxGeometry(0.004 * s, 0.006 * s, w + 0.004); bar.translate(-0.024 * s, 0, 0); g.push(bar);
  return merge(g);
}
/** Ladder-lock adjuster: a frame with two bars the webbing threads over and under. */
function ladderLock(w = 0.025) {
  const g = []; const L = 0.028; const Wd = w + 0.007; const t = 0.0028;
  for (const z of [-1, 1]) { const b = new THREE.BoxGeometry(L, t, 0.0035); b.translate(0, 0, z * (Wd / 2)); g.push(b); }
  for (const x of [-L / 2, -L * 0.1, L * 0.22, L / 2]) { const b = new THREE.BoxGeometry(0.003, t * (x === L / 2 ? 1.6 : 1), Wd); b.translate(x, x === L / 2 ? t * 0.3 : 0, 0); g.push(b); }
  return merge(g);
}
/** Place a part (built along x, thickness along y, width along z) at p with its long axis along `along` and face normal n. */
function place(geo, p, along, n) {
  const x = along.clone().normalize(); const y = n.clone().addScaledVector(x, -n.dot(x)).normalize(); const z = new THREE.Vector3().crossVectors(x, y);
  return geo.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z).setPosition(p));
}

export function buildBackpack(spec, mats) {
  const group = new THREE.Group(); const ruck = spec.style === 'rucksack';
  const W = spec.width / 200; const H = spec.height / 100; const D = spec.depth / 100; const soft = spec.soft ?? 0.35;
  const col = (id) => mats.colorOf(id); const has = (id) => spec.parts.some((q) => q.id === id);
  const bodyCol = new THREE.Color(col('body'));
  const M = (id) => { const m = mats.part(has(id) ? id : 'body'); m.side = THREE.DoubleSide;
    // 3D spacer (air) mesh is a mesh face on a closed backing: it reads as mesh but is not see-through
    if (id === 'back') { m.transparent = false; m.opacity = 1; m.alphaMap = null; m.alphaTest = 0; m.depthWrite = true; m.needsUpdate = true; }
    // mesh parts are made in the pack's colour unless a colour has been chosen for that part
    if ((id === 'back' || id === 'mesh' || id === 'base' || id === 'throat') && !spec.parts.find((q) => q.id === id)?.color) m.color.set(bodyCol.clone().multiplyScalar(id === 'back' ? 0.85 : id === 'throat' ? 0.78 : 1));
    return m; };
  const thread = spec.stitchColor || bodyCol.clone().lerp(new THREE.Color('#ffffff'), 0.35).getStyle();
  const plastic = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.42, metalness: 0.05 });
  const tackM = new THREE.MeshStandardMaterial({ color: thread, roughness: 0.8 });
  const tapeM = new THREE.MeshStandardMaterial({ color: bodyCol.clone().multiplyScalar(0.55), roughness: 0.85 });
  const coilM = new THREE.MeshStandardMaterial({ color: bodyCol.clone().multiplyScalar(0.35), roughness: 0.5 });
  const metal = new THREE.MeshStandardMaterial({ color: '#9a9ca0', metalness: 0.85, roughness: 0.35 });
  const tacks = []; const plast = []; const metalG = [];
  const bartack = (p, along, n, len = 0.012) => tacks.push(place(new THREE.BoxGeometry(len, 0.0012, 0.0035), p.clone().addScaledVector(n, 0.0012), along, n));
  const dashed = (pts) => { if (pts.length < 2) return; const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: thread, dashSize: 0.0028, gapSize: 0.0013 })); ln.computeLineDistances(); group.add(ln); };

  // ---------- the body ----------
  // a rucksack is squarer, its top a straight edge with rounded corners where the throat is sewn on
  const rb = Math.min(0.045, W * 0.3); const Ht = ruck ? 0.055 : Math.min(H * 0.38, W * 1.05); const N = 160;
  const { pts: O } = outline(W, H, rb, Ht, ruck ? 0.02 : 0.06, N);
  const zb = (y) => -D / 2 - 0.006 * Math.sin(Math.PI * clamp(y / H, 0, 1)); // the back panel: a slight curve into the small of the back
  const gw = (y) => D * (1 - (ruck ? 0.12 * sstep(0.7, 1, y / H) : 0.42 * sstep(0.42, 1, y / H))); // the strip (gusset / zip panel) narrows towards the top
  const bulge = (u, y) => soft * 0.014 * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(Math.PI * clamp(y / H, 0, 1)));
  const MU = 12; const stripAt = (k, u, extra = 0) => { const o = O[k]; const b = bulge(u, o.y) + extra; return V(o.x + o.nx * b, o.y + o.ny * b, zb(o.y) + gw(o.y) * u); };
  // the outline seen from the centre, for the domed faces
  const C = { x: 0, y: H * 0.47 }; const rho = O.map((o) => ({ a: Math.atan2(o.y - C.y, o.x - C.x), r: Math.hypot(o.x - C.x, o.y - C.y) })).sort((p, q) => p.a - q.a);
  const rhoAt = (a) => { let i = rho.findIndex((p) => p.a >= a); if (i < 0) i = 0; const p = rho[(i - 1 + rho.length) % rho.length]; const q = rho[i]; const da = (q.a - p.a + Math.PI * 2) % (Math.PI * 2) || 1e-6; const t = ((a - p.a + Math.PI * 2) % (Math.PI * 2)) / da; return lerp(p.r, q.r, clamp(t, 0, 1)); };
  const rOf = (x, y) => Math.hypot(x - C.x, y - C.y) / rhoAt(Math.atan2(y - C.y, x - C.x));
  const dome = 0.012 + soft * 0.02;
  const frontZ = (x, y) => zb(y) + gw(y) + dome * (1 - Math.pow(clamp(rOf(x, y), 0, 1), 2.2));
  const padT = 0.011;
  const backZ = (x, y) => { const r = clamp(rOf(x, y), 0, 1); const v = y / H; let pad = padT * (1 - sstep(0.84, 0.95, r)); pad *= 1 - (1 - sstep(0.012, 0.03, Math.abs(x))) * sstep(0.14, 0.2, v) * (1 - sstep(0.8, 0.86, v)); pad += 0.006 * sstep(0.06, 0.14, v) * (1 - sstep(0.26, 0.34, v)) * (1 - sstep(0.75, 0.9, r)); return zb(y) - pad; };
  // strip pieces: base across the bottom, gussets up the sides, the zip panel over the top
  const yZip = H * 0.34; const regionOf = (o) => (o.y < rb * 0.75 ? 'base' : ruck ? (o.y > H - 0.035 && o.ny > 0.45 ? 'open' : 'gusset') : o.y < yZip ? 'gusset' : 'body');
  const runs = []; { let cur = null; for (let k = 0; k <= N; k++) { const kk = k % N; const r = regionOf(O[kk]); if (!cur || cur.r !== r) { if (cur) cur.ks.push(kk); cur = { r, ks: [kk] }; runs.push(cur); } else cur.ks.push(kk); } }
  for (const run of runs) { if (run.ks.length < 2 || run.r === 'open') continue; const rows = run.ks.map((k) => { const row = []; for (let j = 0; j <= MU; j++) row.push(stripAt(k, j / MU)); return row; }); group.add(new THREE.Mesh(gridGeo(rows), M(run.r))); }
  // cross seams where base, gusset and zip panel meet
  for (let i = 0; i < runs.length; i++) { const k = runs[i].ks[0]; if ((i === 0 && regionOf(O[(k + N - 1) % N]) === runs[i].r) || runs[i].r === 'open' || regionOf(O[(k + N - 1) % N]) === 'open') continue; const p = []; const nr = []; for (let j = 0; j <= MU; j++) { p.push(stripAt(k, j / MU, 0.0012)); nr.push(V(O[k].nx, O[k].ny, 0)); } group.add(new THREE.Mesh(strand(p, nr, 0.004, 0.003, true), M('body'))); }
  // front panel and back panel, each filling the outline
  const NR = 18; const faceRows = (zf, r0 = 0, r1 = 1) => { const rows = []; for (let i = 0; i <= NR; i++) { const r = lerp(r0, r1, i / NR); const row = []; for (let k = 0; k < N; k++) { const o = O[k]; const x = lerp(C.x, o.x, r); const y = lerp(C.y, o.y, r); row.push(V(x, y, zf(x, y, r, k))); } rows.push(row); } return rows; };
  const edgeFront = (x, y, r, k) => (r >= 0.999 ? stripAt(k, 1).z : frontZ(x, y));
  group.add(new THREE.Mesh(gridGeo(faceRows(edgeFront), true), M('body')));
  const edgeBack = (x, y, r, k) => (r >= 0.999 ? stripAt(k, 0).z : backZ(x, y));
  group.add(new THREE.Mesh(gridGeo(faceRows(edgeBack, 0, 0.94), true), M('back'))); // air mesh over the pads
  group.add(new THREE.Mesh(gridGeo(faceRows(edgeBack, 0.94, 1), true), M('piping'))); // the bound edge of the back panel
  // seam welts round the front and the back, topstitching beside them
  for (const u of [0, 1]) { const p = []; const nr = []; for (let k = 0; k <= N; k++) { const kk = k % N; p.push(stripAt(kk, u, 0.0008)); nr.push(V(O[kk].nx, O[kk].ny, 0)); } group.add(new THREE.Mesh(strand(p, nr, 0.0055, 0.0042, true), M(u ? 'body' : 'piping'))); }
  { const st = []; for (let k = 0; k <= N; k++) { const o = O[k % N]; const x = lerp(C.x, o.x, 0.965); const y = lerp(C.y, o.y, 0.965); st.push(V(x, y, frontZ(x, y) + 0.0006)); } dashed(st); }
  // ---------- main zip: two-way coil zip down the middle of the zip panel, garages at the ends ----------
  const zipK = []; for (let k = 0; k < N; k++) if (regionOf(O[k]) === 'body') zipK.push(k);
  zipK.sort((a, b) => a - b); // the outline runs from the bottom centre up the right side, over the top and down the left: one unbroken run
  const zipped = zipK.slice(4, -4);
  // a coil zip: the two tapes, and the interlocking coil teeth from each tape in turn (No. 8 is about 4 a centimetre)
  const zipLine = (ks, at, nrmOf, wTape = 0.02, pitch = 0.0025) => { const p = ks.map(at); const nr = ks.map(nrmOf); group.add(new THREE.Mesh(strand(p, nr, wTape, 0.0012), tapeM));
    const teeth = []; const cum = [0]; for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + p[i].distanceTo(p[i - 1])); let j = 0;
    for (let s0 = 0, t = 0; s0 < cum[cum.length - 1]; s0 += pitch, t++) { while (cum[j + 1] < s0) j++; const f = (s0 - cum[j]) / (cum[j + 1] - cum[j] || 1); const q = p[j].clone().lerp(p[j + 1], f); const n = nr[j].clone().lerp(nr[j + 1], f).normalize(); const along = p[j + 1].clone().sub(p[j]).normalize(); const across = new THREE.Vector3().crossVectors(along, n).normalize();
      const g = new THREE.CylinderGeometry(0.0011, 0.0011, 0.0056, 6); g.rotateX(Math.PI / 2); teeth.push(place(g, q.clone().addScaledVector(n, 0.0017).addScaledVector(across, (t % 2 ? 1 : -1) * 0.0009), along, n)); }
    if (teeth.length) group.add(new THREE.Mesh(merge(teeth), coilM)); return { p, nr }; };
  const zn = (k) => V(O[k].nx, O[k].ny, 0);
  const slider = (p, n, along, puller = true, pullDir = 1) => { const g = new THREE.BoxGeometry(0.016, 0.006, 0.012); plast.push(place(g, p.clone().addScaledVector(n, 0.004), along, n)); const tab = new THREE.BoxGeometry(0.004, 0.003, 0.006); metalG.push(place(tab, p.clone().addScaledVector(n, 0.008), along, n));
    if (puller) { // a cord loop through the slider's pull tab, lying on the panel and trailing away from the slider, a moulded tip on its end
      const dir = along.clone().normalize().multiplyScalar(pullDir); const across = new THREE.Vector3().crossVectors(dir, n).normalize(); const a = p.clone().addScaledVector(n, 0.0075);
      const lp = [a, a.clone().addScaledVector(dir, 0.012).addScaledVector(across, 0.0032).addScaledVector(n, -0.002), a.clone().addScaledVector(dir, 0.04).addScaledVector(across, 0.0026).addScaledVector(n, -0.0035), a.clone().addScaledVector(dir, 0.046).addScaledVector(n, -0.0035), a.clone().addScaledVector(dir, 0.04).addScaledVector(across, -0.0026).addScaledVector(n, -0.0035), a.clone().addScaledVector(dir, 0.012).addScaledVector(across, -0.0032).addScaledVector(n, -0.002), a];
      const c = new THREE.CatmullRomCurve3(lp).getPoints(30); group.add(new THREE.Mesh(strand(c, c.map(() => n), 0.0026, 0.0026, true), M('webbing')));
      const tip = new THREE.CylinderGeometry(0.0036, 0.0044, 0.017, 10); tip.rotateZ(Math.PI / 2); plast.push(place(tip, a.clone().addScaledVector(dir, 0.034).addScaledVector(n, -0.003), dir, n)); } };
  if (!ruck) { const mainZip = zipLine(zipped, (k) => stripAt(k, 0.5, 0.0012), zn); const m = Math.floor(mainZip.p.length / 2); for (const d of [-3, 3]) { const i = m + d; slider(mainZip.p[i], mainZip.nr[i], mainZip.p[i + 1].clone().sub(mainZip.p[i - 1]), true, Math.sign(d)); } } // the two sliders meet at the top, each pull trailing away from the other
  if (!ruck) for (const end of [zipK.slice(0, 7), zipK.slice(-7)]) { // zip garages: a small hood of the panel fabric over each end of the zip
    const ks = end; const rows = []; for (let i = 0; i < ks.length; i++) { const k = ks[i]; const row = []; for (let j = 0; j <= 8; j++) { const a = Math.PI * (j / 8); const u = 0.5 + Math.cos(a) * (0.016 / gw(O[k].y)); row.push(stripAt(k, clamp(u, 0, 1), 0.0016 + Math.sin(a) * 0.0055 * Math.min(1, i / 2, (ks.length - 1 - i) / 2 + 0.6))); } rows.push(row); }
    group.add(new THREE.Mesh(gridGeo(rows), M('body'))); }
  // ---------- front pocket: its own outline, gusset and zip, sewn onto the front panel ----------
  if (spec.pockets !== 'none' && !ruck) {
    const pw = W * 0.74; const ph = H * 0.5; const y0 = H * 0.05; const NP = 110;
    const { pts: Q } = outline(pw, ph, Math.min(0.03, rb), Math.min(ph * 0.42, pw * 0.9), 0.04, NP); for (const q of Q) q.y += y0;
    const pg = (y) => 0.03 * (1 - 0.35 * sstep(y0 + ph * 0.5, y0 + ph, y)); const pb = (u) => soft * 0.008 * Math.sin(Math.PI * u);
    const pAt = (k, u, extra = 0) => { const q = Q[k]; const b = pb(u) + extra; const x = q.x + q.nx * b; const y = q.y + q.ny * b; return V(x, y, frontZ(q.x, q.y) + pg(q.y) * u); };
    const rows = []; for (let k = 0; k <= NP; k++) { const row = []; for (let j = 0; j <= 8; j++) row.push(pAt(k % NP, j / 8)); rows.push(row); } group.add(new THREE.Mesh(gridGeo(rows), M('pocket')));
    const PC = { x: 0, y: y0 + ph * 0.45 }; const prow = []; for (let i = 0; i <= 12; i++) { const r = i / 12; const row = []; for (let k = 0; k < NP; k++) { const q = Q[k]; const x = lerp(PC.x, q.x, r); const y = lerp(PC.y, q.y, r); row.push(i === 12 ? pAt(k, 1) : V(x, y, frontZ(x, y) + pg(y) + (0.006 + soft * 0.006) * (1 - r * r))); } prow.push(row); } group.add(new THREE.Mesh(gridGeo(prow, true), M('pocket')));
    for (const u of [0, 1]) { const p = []; const nr = []; for (let k = 0; k <= NP; k++) { p.push(pAt(k % NP, u, 0.0006)); nr.push(V(Q[k % NP].nx, Q[k % NP].ny, 0)); } group.add(new THREE.Mesh(strand(p, nr, 0.0045, 0.0034, true), M('pocket'))); }
    const pk = []; for (let k = 0; k < NP; k++) if (Q[k].y > y0 + ph * 0.42) pk.push(k); pk.sort((a, b) => a - b);
    const pz = zipLine(pk.slice(2, -2), (k) => pAt(k, 0.5, 0.001), (k) => V(Q[k].nx, Q[k].ny, 0), 0.016); const i0 = Math.floor(pz.p.length * 0.78); slider(pz.p[i0], pz.nr[i0], pz.p[i0 + 1].clone().sub(pz.p[i0 - 1]));
  }
  // ---------- side bottle pockets: stretch mesh, elastic-bound top ----------
  const sideK = (s, y) => { let best = 0; let bd = 9; for (let k = 0; k < N; k++) { const o = O[k]; if (Math.sign(o.x) !== s || Math.abs(o.nx) < 0.7) continue; const d = Math.abs(o.y - y); if (d < bd) { bd = d; best = k; } } return best; };
  if (spec.bottle && !ruck) for (const s of [-1, 1]) {
    const ks = []; for (let k = 0; k < N; k++) { const o = O[k]; if (Math.sign(o.x) === s && o.y > rb * 0.3 && o.y < H * 0.42 && (Math.abs(o.nx) > 0.5 || o.y < rb)) ks.push(k); }
    ks.sort((a, b) => O[a].y - O[b].y); if (ks.length < 3) continue;
    const full = (y) => 0.01 + 0.014 * sstep(0, H * 0.25, y) * (1 - sstep(H * 0.36, H * 0.42, y));
    const rows = ks.map((k) => { const row = []; for (let j = 0; j <= 10; j++) { const u = 0.06 + 0.88 * (j / 10); row.push(stripAt(k, u, full(O[k].y) * Math.sin(Math.PI * (j / 10)) + 0.0015)); } return row; });
    group.add(new THREE.Mesh(gridGeo(rows), M('mesh')));
    const top = rows[rows.length - 1]; const kt = ks[ks.length - 1]; group.add(new THREE.Mesh(strand(top, top.map(() => V(O[kt].nx, O[kt].ny, 0)), 0.012, 0.004, true), M('piping')));
  }
  // ---------- side compression straps ----------
  if (spec.compress && !ruck) for (const s of [-1, 1]) {
    const k = sideK(s, H * 0.6); const n = V(O[k].nx, O[k].ny, 0); const p = []; for (let j = 0; j <= 20; j++) p.push(stripAt(k, 0.02 + 0.96 * (j / 20), 0.0034));
    const bi = 13; group.add(new THREE.Mesh(strand(p.slice(0, bi), p.slice(0, bi).map(() => n), 0.02, 0.0016), M('webbing'))); group.add(new THREE.Mesh(strand(p.slice(bi + 2), p.slice(bi + 2).map(() => n), 0.02, 0.0016), M('webbing')));
    plast.push(place(releaseBuckle(0.02), p[bi + 1].clone().addScaledVector(n, 0.003), p[bi + 2].clone().sub(p[bi]), n));
    for (const q of [p[0], p[p.length - 1]]) bartack(q, V(0, 1, 0), n, 0.016);
  }
  // ---------- rucksack: throat with drawcord, lid hinged at the back, lid straps, bellows side pockets ----------
  if (ruck) {
    // the throat (extension collar): a tube of lighter cloth sewn to the open top, gathered by a cord in a channel
    const topK = []; for (let k = 0; k < N; k++) if (regionOf(O[k]) === 'open') topK.push(k); topK.sort((a, b) => a - b);
    const rim = [...topK.map((k) => stripAt(k, 1)), ...[0.75, 0.5, 0.25].map((u) => stripAt(topK[topK.length - 1], u)), ...topK.slice().reverse().map((k) => stripAt(k, 0)), ...[0.25, 0.5, 0.75].map((u) => stripAt(topK[0], u))];
    const NM = 96; const rl = [0]; for (let i = 1; i <= rim.length; i++) rl.push(rl[i - 1] + rim[i % rim.length].distanceTo(rim[i - 1])); const ring0 = []; { let j = 0; for (let q = 0; q < NM; q++) { const s0 = (q / NM) * rl[rl.length - 1]; while (rl[j + 1] < s0) j++; ring0.push(rim[j].clone().lerp(rim[(j + 1) % rim.length], (s0 - rl[j]) / (rl[j + 1] - rl[j] || 1))); } }
    const cen = ring0.reduce((a, p) => a.add(p), V(0, 0, 0)).multiplyScalar(1 / NM); const thH = 0.13; const cinch = 0.8;
    const thAt = (q, t) => { const p = ring0[q]; const g = 1 - 0.62 * sstep(0.45, cinch, t) + 0.18 * sstep(cinch + 0.02, 1, t); const a = (q / NM) * Math.PI * 2; const rip = 1 + (0.05 + 0.1 * sstep(0.5, cinch, t)) * Math.sin(a * 14) * sstep(0.1, 0.6, t);
      return V(cen.x + (p.x - cen.x) * g * rip, p.y + thH * t, cen.z + (p.z - cen.z) * g * rip); };
    const thRows = []; for (let i = 0; i <= 20; i++) { const t = i / 20; const row = []; for (let q = 0; q < NM; q++) row.push(thAt(q, t)); thRows.push(row); }
    group.add(new THREE.Mesh(gridGeo(thRows, true), M(has('throat') ? 'throat' : 'lining')));
    const chan = []; for (let q = 0; q <= NM; q++) chan.push(thAt(q % NM, cinch)); group.add(new THREE.Mesh(strand(chan, chan.map((p) => V(p.x - cen.x, 0, p.z - cen.z).normalize()), 0.016, 0.006, true), M(has('throat') ? 'throat' : 'lining')));
    // the drawcord leaves the channel at the front through two eyelets, through a cord lock, and ends in knots
    const qF = topK.length >> 1; const eye = chan[qF].clone(); const outN = V(0, 0, 1);
    for (const dx of [-0.008, 0.008]) metalG.push(place(new THREE.TorusGeometry(0.0042, 0.0012, 6, 14).rotateX(Math.PI / 2), eye.clone().add(V(dx, 0, 0.004)), V(1, 0, 0), outN));
    const lockP = eye.clone().add(V(0, -0.045, 0.03)); for (const dx of [-0.008, 0.008]) { const c = new THREE.CatmullRomCurve3([eye.clone().add(V(dx, 0, 0.004)), eye.clone().add(V(dx * 0.6, -0.02, 0.022)), lockP.clone().add(V(dx * 0.25, 0, 0)), lockP.clone().add(V(dx * 0.8, -0.045, 0.004)), lockP.clone().add(V(dx * 1.2, -0.075, -0.002))]).getPoints(30); group.add(new THREE.Mesh(strand(c, c.map(() => outN), 0.0045, 0.0045, true), M('webbing'))); const kn = new THREE.SphereGeometry(0.0055, 10, 8); kn.translate(c[c.length - 1].x, c[c.length - 1].y, c[c.length - 1].z); plast.push(kn); }
    { const cl = new THREE.CylinderGeometry(0.008, 0.009, 0.022, 14); cl.translate(lockP.x, lockP.y, lockP.z); plast.push(cl); const btn = new THREE.CylinderGeometry(0.004, 0.004, 0.006, 10); btn.rotateZ(Math.PI / 2); btn.translate(lockP.x + 0.01, lockP.y + 0.004, lockP.z); plast.push(btn); }
    // the lid: sewn on along the top of the back panel, over the gathered throat, down the front, its edge bound
    const lidLen = H * (spec.flap || 0.42); const zBt = zb(H); const zFt = zb(H) + gw(H);
    const prof = new THREE.CatmullRomCurve3([V(0, H - 0.012, zBt - 0.004), V(0, H + 0.075, zBt - 0.006), V(0, H + thH * 0.92, zBt + gw(H) * 0.25), V(0, H + thH + 0.004, zBt + gw(H) * 0.6), V(0, H + thH * 0.8, zFt + 0.016), V(0, H + 0.03, zFt + 0.022), V(0, H - lidLen, frontZ(0, H - lidLen) + 0.012)], false, 'centripetal').getSpacedPoints(40);
    const NL = 26; const lidW = (v) => W * (0.97 - 0.06 * v); const lidRows = [];
    for (let i = 0; i <= NL; i++) { const u = -1 + (2 * i) / NL; const endCut = 1 - 0.1 * Math.pow(Math.abs(u), 5); const row = []; for (let j = 0; j <= 40; j++) { const v = Math.min(j / 40, endCut); const pp = prof[Math.round(v * 40)]; const x = u * lidW(v); let z = pp.z; if (pp.y < H - 0.005) z = Math.max(z, frontZ(x, pp.y) + 0.009); const sag = (1 - u * u) * 0.006 * Math.sin(Math.PI * v); const drape = pp.y > H ? (pp.y - H) * (0.55 * Math.pow(Math.abs(u), 2.2)) : 0; row.push(V(x * (1 - 0.06 * Math.pow(Math.abs(u), 3) * (pp.y > H ? 1 : 0)), pp.y + (pp.y > H ? sag : 0) - drape, z + (pp.y <= H ? sag : 0))); } lidRows.push(row); }
    const lidT = lidRows[0].map((_, j) => lidRows.map((r) => r[j])); group.add(new THREE.Mesh(gridGeo(lidT), M(has('flap') ? 'flap' : 'body')));
    const edge = [...lidRows[0], ...lidRows.map((r) => r[r.length - 1]), ...lidRows[NL].slice().reverse()]; group.add(new THREE.Mesh(strand(edge, edge.map((p) => V(0, p.y > H ? 1 : 0, p.y > H ? 0 : 1).normalize()), 0.007, 0.005, true), M('piping')));
    dashed(lidRows.map((r) => r[r.length - 1].clone().add(V(0, 0.008, 0.0012))));
    // lid straps: from the end of the lid down to side-release buckles on tabs sewn to the front
    for (const sx of [-1, 1]) { const x = sx * W * 0.45; const iRow = Math.round((x / lidW(1) + 1) * NL / 2); const r = lidRows[clamp(iRow, 0, NL)]; const top = r[Math.round(r.length * 0.72)]; const end = r[r.length - 1]; const yB = H - lidLen - 0.05;
      const sp = [top, end.clone().add(V(0, 0, 0.003))]; for (let y = end.y - 0.01; y >= yB; y -= 0.01) sp.push(V(x, y, frontZ(x, y) + 0.004));
      const nF = V(0, 0, 1); group.add(new THREE.Mesh(strand(sp, sp.map(() => nF), 0.02, 0.0016), M('webbing'))); bartack(top, V(1, 0, 0), nF, 0.016);
      const bP = V(x, yB - 0.016, frontZ(x, yB - 0.016) + 0.008); plast.push(place(releaseBuckle(0.02), bP, V(0, -1, 0), nF));
      const tab = []; for (let y = yB - 0.035; y >= yB - 0.075; y -= 0.008) tab.push(V(x, y, frontZ(x, y) + 0.0025)); group.add(new THREE.Mesh(strand(tab, tab.map(() => nF), 0.02, 0.0016), M('webbing'))); bartack(tab[tab.length - 1], V(1, 0, 0), nF, 0.016); }
    // bellows side pockets: a box pocket on each side gusset, its flap closed by a strap and buckle
    if (spec.pockets !== 'none') for (const sgn of [-1, 1]) {
      const ks = []; for (let k = 0; k < N; k++) { const o = O[k]; if (Math.sign(o.x) === sgn && Math.abs(o.nx) > 0.8 && o.y > 0.05 && o.y < H * 0.48) ks.push(k); } ks.sort((a, b) => O[a].y - O[b].y); if (ks.length < 4) continue;
      const y0 = O[ks[0]].y; const y1 = O[ks[ks.length - 1]].y; const box = (u) => sstep(0.1, 0.2, u) * (1 - sstep(0.8, 0.9, u)); const dep = (y) => 0.034 * sstep(y0, y0 + 0.02, y) * (1 - sstep(y1 - 0.012, y1, y) * 0.35);
      const rows = ks.map((k) => { const row = []; for (let j = 0; j <= 12; j++) { const u = 0.1 + 0.8 * (j / 12); row.push(stripAt(k, u, 0.002 + dep(O[k].y) * box(u))); } return row; });
      group.add(new THREE.Mesh(gridGeo(rows), M('pocket'))); const nS = V(sgn, 0, 0);
      for (const j of [0, 12]) { const e = rows.map((r) => r[j]); group.add(new THREE.Mesh(strand(e, e.map(() => nS), 0.004, 0.003, true), M('pocket'))); }
      const kT = ks[ks.length - 1]; const flap = []; for (let i = 0; i <= 6; i++) { const t = i / 6; const row = []; for (let j = 0; j <= 12; j++) { const u = 0.08 + 0.84 * (j / 12); const base = stripAt(kT, u, 0.003); row.push(base.clone().add(V(sgn * (0.004 + 0.036 * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2)), 0.018 - t * 0.07, 0))); } flap.push(row); }
      group.add(new THREE.Mesh(gridGeo(flap), M('pocket'))); const fe = flap[flap.length - 1]; group.add(new THREE.Mesh(strand(fe, fe.map(() => nS), 0.005, 0.004, true), M('piping')));
      const mid = fe[6]; const strap = [mid.clone().add(V(sgn * 0.002, 0.03, 0)), mid.clone().add(V(sgn * 0.003, 0, 0)), mid.clone().add(V(sgn * 0.0032, -0.04, 0))]; group.add(new THREE.Mesh(strand(strap, strap.map(() => nS), 0.016, 0.0016), M('webbing'))); plast.push(place(releaseBuckle(0.016), mid.clone().add(V(sgn * 0.007, -0.018, 0)), V(0, -1, 0), nS));
    }
  }
  // ---------- top: yoke, haul loop ----------
  const topY = H; const zT = zb(topY);
  { const rows = []; for (let i = 0; i <= 6; i++) { const y = topY - 0.004 - (i / 6) * 0.075; const hw = 0.075 - (i / 6) * 0.04; const row = []; for (let j = 0; j <= 10; j++) { const x = -hw + (2 * hw * j) / 10; const r = rOf(x, y); if (r > 1) { row.push(V(x, y, zb(y) - 0.0012)); continue; } row.push(V(x, y, Math.min(backZ(x, y), zb(y)) - 0.0018)); } rows.push(row); }
    group.add(new THREE.Mesh(gridGeo(rows), M('body'))); dashed(rows[rows.length - 1]); }
  { const a = V(-0.019, topY - 0.006, zT - 0.006); const b = V(0.019, topY - 0.006, zT - 0.006); const c = new THREE.CatmullRomCurve3([a, V(-0.022, topY + 0.03, zT - 0.012), V(0, topY + 0.052, zT - 0.016), V(0.022, topY + 0.03, zT - 0.012), b]).getPoints(40);
    group.add(new THREE.Mesh(strand(c, c.map(() => V(0, 0, -1)), 0.025, 0.0018), M('webbing'))); bartack(a, V(1, 0, 0), V(0, 0, -1), 0.02); bartack(b, V(1, 0, 0), V(0, 0, -1), 0.02); }
  // ---------- harness ----------
  if (spec.harness !== false) {
    const zB = zb(H * 0.5); const shellM = M('handle'); const meshM = M('back'); const bindM = M('piping');
    const ends = [];
    for (const s of [-1, 1]) {
      // the strap hangs in a loop off the back of the pack, as it does when the pack is set down
      const cp = [V(s * 0.03, H - 0.05, zb(H - 0.05) - 0.013), V(s * 0.052, H - 0.012, zB - 0.055), V(s * 0.085, H - 0.075, zB - 0.098), V(s * 0.104, H * 0.6, zB - 0.096), V(s * 0.11, H * 0.37, zB - 0.064), V(s * 0.108, 0.16, zB - 0.032)];
      const path = new THREE.CatmullRomCurve3(cp, false, 'centripetal').getSpacedPoints(70);
      const NS = 18; const rowsS = []; const rowsM = []; const edgeA = []; const edgeB = []; const frames = [];
      for (let i = 0; i < path.length; i++) {
        const t = i / (path.length - 1); const T = path[Math.min(path.length - 1, i + 1)].clone().sub(path[Math.max(0, i - 1)]).normalize();
        const away = V(s * 0.25, 0.1, -1).normalize(); const Nn = away.addScaledVector(T, -away.dot(T)).normalize(); const B = new THREE.Vector3().crossVectors(T, Nn).normalize();
        const w = (0.056 + 0.016 * Math.sin(Math.PI * Math.min(1, t * 1.6)) - 0.012 * t) * (t < 0.03 ? 0.75 + t * 8 : 1); const th = 0.012 * Math.min(1, t * 9, (1 - t) * 7 + 0.25);
        const sc = s * 0.009 * Math.sin(Math.PI * 2 * (t * 0.9 + 0.05)); const c0 = path[i].clone().addScaledVector(B, sc); frames.push({ c: c0, T, N: Nn, B, w, th });
        const sec = (a) => { const ca = Math.cos(a); const sa = Math.sin(a); return c0.clone().addScaledVector(B, (w / 2) * Math.sign(ca) * Math.pow(Math.abs(ca), 0.35)).addScaledVector(Nn, (th / 2) * Math.sign(sa) * Math.pow(Math.abs(sa), 0.7)); };
        const rs = []; const rm = []; for (let q = 0; q <= NS; q++) { rs.push(sec((q / NS) * Math.PI)); rm.push(sec(Math.PI + (q / NS) * Math.PI)); } rowsS.push(rs); rowsM.push(rm); edgeA.push(rs[0]); edgeB.push(rs[NS]);
      }
      group.add(new THREE.Mesh(gridGeo(rowsS), shellM)); group.add(new THREE.Mesh(gridGeo(rowsM), meshM));
      for (const e of [edgeA, edgeB]) group.add(new THREE.Mesh(strand(e, frames.map((f) => f.N), 0.0065, 0.0055, true), bindM));
      dashed(frames.map((f) => f.c.clone().addScaledVector(f.N, f.th / 2 + 0.0004).addScaledVector(f.B, -f.w / 2 + 0.008))); dashed(frames.map((f) => f.c.clone().addScaledVector(f.N, f.th / 2 + 0.0004).addScaledVector(f.B, f.w / 2 - 0.008)));
      bartack(frames[1].c, frames[1].B, frames[1].N, 0.03);
      // lower end: a short webbing tab out of the strap end to the ladder-lock
      const fe = frames[frames.length - 1]; const lockP = fe.c.clone().addScaledVector(fe.T, 0.034);
      group.add(new THREE.Mesh(strand([fe.c.clone().addScaledVector(fe.T, -0.012), lockP], [fe.N, fe.N], 0.025, 0.0018), M('webbing'))); bartack(fe.c.clone().addScaledVector(fe.T, 0.004), fe.B, fe.N, 0.022);
      plast.push(place(ladderLock(0.025), lockP.clone().addScaledVector(fe.T, 0.012), fe.T, fe.N));
      // the anchor at the base corner: webbing folded into a reinforcement triangle, sewn into the back seam
      const ak = (() => { let best = 0; let bd = 9; for (let k = 0; k < N; k++) { const o = O[k]; const d = Math.hypot(o.x - s * (W - rb * 0.55), o.y - rb * 0.45); if (d < bd) { bd = d; best = k; } } return best; })();
      // anything lying on the back panel lies on its padded surface, never under it
      const overBack = (q, gap = 0.003) => { const r = rOf(q.x, q.y); if (r <= 1) q.z = Math.min(q.z, backZ(q.x, q.y) - gap); return q; };
      const A = overBack(stripAt(ak, 0.02, 0.002), 0.0025); const An = V(O[ak].nx * 0.3, O[ak].ny * 0.3, -1).normalize();
      { const tri = []; const sz = 0.034; const up = V(-s, 1, 0).normalize(); const sd = V(s, 0.25, 0).normalize(); const r0 = [A.clone().addScaledVector(An, 0.0015), A.clone().addScaledVector(up, sz).addScaledVector(An, 0.0015), A.clone().addScaledVector(sd, sz * 0.6).addScaledVector(up, sz * 0.4).addScaledVector(An, 0.0015)]; for (const p of r0) { overBack(p, 0.0015); tri.push(p.x, p.y, p.z); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3)); g.computeVertexNormals(); group.add(new THREE.Mesh(g, M('base'))); dashed([...r0, r0[0], r0[2]]); }
      // adjusting webbing: from the anchor up through the ladder-lock, the tail hanging free with a folded end
      const lk = lockP.clone().addScaledVector(fe.T, 0.012); const up1 = new THREE.CatmullRomCurve3([A, A.clone().lerp(lk, 0.5).add(V(s * 0.008, 0, -0.012)), lk]).getPoints(26).map((q) => overBack(q));
      group.add(new THREE.Mesh(strand(up1, up1.map(() => An), 0.025, 0.0016), M('webbing')));
      const tail = new THREE.CatmullRomCurve3([lk, lk.clone().add(V(s * 0.004, -0.03, -0.012)), lk.clone().add(V(s * 0.006, -0.09, -0.016)), lk.clone().add(V(s * 0.002, Math.max(-0.15, -(lk.y - 0.03)), -0.012))]).getPoints(26).map((q) => overBack(q));
      group.add(new THREE.Mesh(strand(tail, tail.map(() => An), 0.025, 0.0016), M('webbing'))); const te = tail[tail.length - 1]; plast.push(place(new THREE.BoxGeometry(0.008, 0.004, 0.027), te, tail[tail.length - 1].clone().sub(tail[tail.length - 3]), An)); // the folded, bar-tacked tail end
      bartack(A.clone().addScaledVector(up1[2].clone().sub(A).normalize(), 0.006), V(s, 0.3, 0), An, 0.02);
      ends.push(frames);
      // load lifters: from the top of the strap back to the top corners of the pack
      if (spec.lifters) { const f = frames[9]; const C2 = V(s * W * 0.72, H * 0.83, zb(H * 0.83) - 0.004); const lp = f.c.clone().addScaledVector(f.N, f.th / 2 + 0.002); const c = new THREE.CatmullRomCurve3([lp, lp.clone().lerp(C2, 0.5).add(V(0, 0.01, 0)), C2]).getPoints(20); group.add(new THREE.Mesh(strand(c, c.map(() => V(0, 0.4, -1).normalize()), 0.02, 0.0015), M('webbing'))); plast.push(place(ladderLock(0.02), c[3], c[5].clone().sub(c[1]), f.N)); bartack(C2, V(0, 1, 0), V(0, 0, -1), 0.018); }
    }
    // sternum strap: a slider on a rail on each strap, webbing to a side-release buckle between them
    if (spec.sternum && ends.length === 2) {
      const i = Math.round(ends[0].length * 0.42); const pts = ends.map((fr) => { const f = fr[i]; const inner = f.B.clone().multiplyScalar(Math.sign(-f.c.x * f.B.x || 1)); return { f, p: f.c.clone().addScaledVector(f.N, f.th / 2 + 0.002), inner }; });
      for (const q of pts) { const rail = []; for (let d = -8; d <= 8; d++) { const f = ends[pts.indexOf(q)][i + d]; rail.push(f.c.clone().addScaledVector(f.N, f.th / 2 + 0.0015)); } group.add(new THREE.Mesh(strand(rail, rail.map(() => q.f.N), 0.009, 0.002), plastic)); plast.push(place(new THREE.BoxGeometry(0.016, 0.006, 0.022), q.p, q.f.T, q.f.N)); }
      const mid = pts[0].p.clone().lerp(pts[1].p, 0.5).add(V(0, 0, -0.008)); const nM = V(0, 0, -1);
      for (const q of pts) { const c = new THREE.CatmullRomCurve3([q.p, q.p.clone().lerp(mid, 0.5).add(V(0, -0.004, -0.004)), mid.clone().add(V(Math.sign(q.p.x) * 0.02, 0, 0))]).getPoints(16); group.add(new THREE.Mesh(strand(c, c.map(() => nM), 0.02, 0.0015), M('webbing'))); }
      plast.push(place(releaseBuckle(0.02), mid, V(1, 0, 0), nM));
      const tailS = [mid.clone().add(V(0.022, 0, 0)), mid.clone().add(V(0.03, -0.02, 0.002)), mid.clone().add(V(0.032, -0.05, 0.002))]; group.add(new THREE.Mesh(strand(tailS, tailS.map(() => nM), 0.02, 0.0015), M('webbing')));
    }
  }
  if (tacks.length) group.add(new THREE.Mesh(merge(tacks), tackM));
  if (plast.length) group.add(new THREE.Mesh(merge(plast), plastic));
  if (metalG.length) group.add(new THREE.Mesh(merge(metalG), metal));
  group.traverse((o) => { o.frustumCulled = false; if (o.isMesh) o.castShadow = true; });
  group.userData.size = Math.max(2 * W, H, D * 2.4, 0.3); group.userData.centre = [0, H / 2, -D * 0.2];
  return group;
}
