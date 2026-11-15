/**
 * Belts in 3D, worn round the body: the strap follows a real cross-section of the body (over the
 * clothes), starts at the buckle, goes round to the wearer's left, and comes back from the right
 * through the buckle so the tail lies over the start, held by its keeper. Holes, stitching,
 * tooling, studs and conchos sit on the strap; the buckle is built for its type and can carry
 * your own artwork.
 */
import * as THREE from 'three';
import { merge, strand, buckle as rollerBuckle } from './shoes3d.js';
import { BELT_METALS } from '../core/belts.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * @param spec  from core/belts.js
 * @param loop  { pts: Vector3[], nrm: Vector3[] } closed ring round the body at belt height, index 0 at the front centre, going towards the wearer's left
 * @param mats  { part(id), colorOf(id) }
 * @param onReady  called when an image finishes loading
 */
export function buildBelt(spec, loop, mats, onReady) {
  const group = new THREE.Group(); const N = loop.pts.length; if (N < 12) return group;
  const W = spec.width / 1000; const T = spec.thick / 1000; const up = V(0, 1, 0);
  const metalCol = BELT_METALS[spec.buckleFinish] || '#c9c9c9'; const metal = new THREE.MeshStandardMaterial({ color: metalCol, metalness: 0.95, roughness: /brushed|matte|antique|gunmetal/.test(spec.buckleFinish) ? 0.45 : 0.2, side: THREE.DoubleSide });
  // arc length round the ring
  const cum = [0]; for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + loop.pts[i % N].distanceTo(loop.pts[i - 1])); const C = cum[N];
  /** Point at distance s along the ring (s may run past one turn), lifted off the body by h. */
  const at = (s, h = 0) => { const q = ((s % C) + C) % C; let i = 0; while (i < N - 1 && cum[i + 1] < q) i++; const t = (q - cum[i]) / Math.max(1e-9, cum[i + 1] - cum[i]); const a = loop.pts[i]; const b = loop.pts[(i + 1) % N]; const n = loop.nrm[i].clone().lerp(loop.nrm[(i + 1) % N], t).normalize(); return { p: a.clone().lerp(b, t).addScaledVector(n, h), n, tg: b.clone().sub(a).normalize() }; };
  const showB = spec.showSide === 'B' && spec.parts.some((p) => p.id === 'lining');
  const faceMat = () => { const m = mats.part(showB ? 'lining' : 'strap'); if (showB && spec.sideB && !spec.parts.find((p) => p.id === 'lining')?.color) { m.color.set(spec.sideB); m.map = null; } return m; };
  const faceCol = new THREE.Color(showB ? (spec.parts.find((p) => p.id === 'lining')?.color || spec.sideB || mats.colorOf('lining')) : mats.colorOf('strap'));
  const backCol = showB ? new THREE.Color(mats.colorOf('strap')) : new THREE.Color(spec.parts.find((p) => p.id === 'lining')?.color || (spec.parts.some((p) => p.id === 'lining') ? spec.sideB || mats.colorOf('lining') : faceCol.clone().multiplyScalar(0.7)));
  const thread = spec.stitchColor || faceCol.clone().lerp(new THREE.Color('#ffffff'), 0.45).getStyle(); const edgeCol = spec.edgeColor || faceCol.clone().multiplyScalar(0.45).getStyle();
  const dashed = (pts, c = thread) => { const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: c, dashSize: 0.003, gapSize: 0.0013 })); ln.computeLineDistances(); ln.frustumCulled = false; group.add(ln); };
  /** A length of strap from s0 to s1 at height h, with an optional shaped tip at its end. */
  const run = (s0, s1, h, tip = null) => {
    const steps = Math.max(8, Math.round((s1 - s0) / 0.006)); const pos = []; const idx = []; const uv = []; const centre = []; const nor = [];
    for (let i = 0; i <= steps; i++) { const s = s0 + ((s1 - s0) * i) / steps; const o = at(s, h); const rem = s1 - s; let w = W;
      if (tip === 'pointed') w = W * Math.min(1, 0.12 + rem / (W * 0.9)); else if (tip === 'english-point') w = W * Math.min(1, 0.3 + 0.7 * Math.sqrt(Math.min(1, rem / (W * 0.7)))); else if (tip === 'round') w = W * Math.sqrt(Math.max(0.02, 1 - Math.pow(Math.max(0, 1 - rem / (W / 2)), 2)));
      centre.push(o.p); nor.push(o.n);
      for (const [dy, dn] of [[-w / 2, T / 2], [w / 2, T / 2], [w / 2, -T / 2], [-w / 2, -T / 2]]) { pos.push(o.p.x + o.n.x * dn, o.p.y + dy, o.p.z + o.n.z * dn); uv.push(s * 10, (dy / W + 0.5) * W * 10); } }
    for (let i = 0; i < steps; i++) for (let q = 0; q < 4; q++) { const a = i * 4 + q; const b = i * 4 + (q + 1) % 4; idx.push(a, a + 4, b, b, a + 4, b + 4); }
    const e = steps * 4; idx.push(e, e + 1, e + 2, e, e + 2, e + 3, 0, 2, 1, 0, 3, 2);
    // faces as separate groups: 0 = outer face, 1 = edges and back
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); const ng = g.toNonIndexed(); ng.computeVertexNormals();
    const P = ng.attributes.position; const outer = []; const rest = []; const nrmA = ng.attributes.normal; const uvA = ng.attributes.uv;
    for (let t = 0; t < P.count; t += 3) { const ci = Math.min(steps, Math.max(0, Math.round(((t / 3) / (steps * 8 + 4)) * steps))); const n = nor[ci]; const fn = V(nrmA.getX(t), nrmA.getY(t), nrmA.getZ(t)); (fn.dot(n) > 0.7 ? outer : rest).push(t); }
    const sub = (list) => { const p = []; const nn = []; const u = []; for (const t of list) for (let k = 0; k < 3; k++) { p.push(P.getX(t + k), P.getY(t + k), P.getZ(t + k)); nn.push(nrmA.getX(t + k), nrmA.getY(t + k), nrmA.getZ(t + k)); u.push(uvA.getX(t + k), uvA.getY(t + k)); } const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); q.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3)); q.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); return q; };
    group.add(new THREE.Mesh(sub(outer), faceMat())); group.add(new THREE.Mesh(sub(rest), new THREE.MeshStandardMaterial({ color: spec.edge === 'painted' ? edgeCol : backCol, roughness: 0.6, side: THREE.DoubleSide })));
    return { centre, nor, s0, s1, h };
  };
  const onFace = (s, h, dy = 0, lift = 0.0006) => { const o = at(s, h + T / 2 + lift); o.p.y += dy; return o; };
  const disc = (o, r, mat, bulge = 0) => { const g = bulge ? new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2) : new THREE.CircleGeometry(r, 14); if (bulge) g.scale(1, bulge, 1); else g.rotateX(-Math.PI / 2); const x = new THREE.Vector3().crossVectors(up, o.n).normalize(); const m = new THREE.Matrix4().makeBasis(x, o.n, new THREE.Vector3().crossVectors(x, o.n)).setPosition(o.p); return g.applyMatrix4(m); };

  // ---------- chain belt ----------
  if (spec.chain) { const links = []; const step = 0.011; for (let s = 0.02, i = 0; s < C - 0.02; s += step, i++) { const o = at(s, 0.003); const lk = new THREE.TorusGeometry(0.0068, 0.0016, 6, 12); lk.scale(1.4, 1, 1); const x = o.tg; const m = new THREE.Matrix4().makeBasis(x, i % 2 ? o.n : up, new THREE.Vector3().crossVectors(x, i % 2 ? o.n : up)).setPosition(o.p); links.push(lk.applyMatrix4(m)); } const f = at(0.012, 0.004);
    for (let i = 0; i < 12; i++) { const lk = new THREE.TorusGeometry(0.0068, 0.0016, 6, 12); lk.scale(1, 1.4, 1); if (i % 2) lk.rotateY(Math.PI / 2); lk.translate(f.p.x + 0.004, f.p.y - 0.012 - i * step, f.p.z + 0.004); links.push(lk); }
    group.add(new THREE.Mesh(merge(links), metal)); const hk = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.002, 8, 16, Math.PI * 1.5), metal); hk.position.copy(f.p); hk.lookAt(f.p.clone().add(f.n)); group.add(hk); return group; }

  // ---------- strap: under layer, then the tail on top ----------
  const wornOff = (spec.worn - (spec.holes + 1) / 2) * (spec.spacing / 1000); // tighter hole = longer tail
  const tailLen = Math.max(0.05, spec.tail / 100 + wornOff + (spec.size / 100 - C) ); // what is left past the buckle on this body
  const tailShown = Math.min(Math.max(0.045, tailLen), C * 0.42);
  const bS = spec.buckleSize || 1; const frameL = (spec.buckle === 'plate' ? 0.075 : spec.buckle === 'ratchet' || spec.buckle === 'box-frame' || spec.buckle === 'clamp' ? 0.045 : 0.036) * bS;
  if (spec.braided) { // woven strands: the prong goes through anywhere
    for (const [s0, s1, h] of [[0.004, C, 0], [C - 0.01, C + tailShown, T + 0.0006]]) for (let k = 0; k < 5; k++) { const pts = []; const nr = []; for (let s = s0; s <= s1; s += 0.004) { const o = at(s, h); const ph = s * 190 + (k * Math.PI * 2) / 5; pts.push(o.p.clone().add(V(0, Math.sin(ph) * W * 0.36, 0)).addScaledVector(o.n, Math.cos(ph * 2) * T * 0.3)); nr.push(o.n); } const m = faceMat(); if (k % 2) m.color.multiplyScalar(0.9); group.add(new THREE.Mesh(strand(pts, nr, W * 0.26, T * 0.9, true), m)); }
  } else {
    const under = run(0.004, C + 0.001, 0); const tail = spec.buckle === 'tie' ? null : run(C - frameL * 0.2, C + tailShown, T + 0.0006, spec.tip === 'metal-tip' ? 'square' : spec.tip);
    const rowsAt = spec.stitch === 'double' ? [0.003, 0.0058] : spec.stitch === 'single' ? [0.003] : [];
    for (const lay of [under, tail]) { if (!lay) continue; for (const ins of rowsAt) for (const sgn of [-1, 1]) dashed(lay.centre.map((p, i) => p.clone().addScaledVector(lay.nor[i], T / 2 + 0.0005).add(V(0, sgn * (W / 2 - ins), 0))).slice(0, lay === tail && spec.tip !== 'square' ? -Math.ceil(W / 0.006) : undefined));
      if (spec.tooling === 'crease-line' || spec.tooling === 'stamped-border') for (const sgn of [-1, 1]) group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lay.centre.map((p, i) => p.clone().addScaledVector(lay.nor[i], T / 2 + 0.0004).add(V(0, sgn * (W / 2 - 0.0045), 0)))), new THREE.LineBasicMaterial({ color: faceCol.clone().multiplyScalar(0.5) })));
      if (spec.tooling === 'basketweave' || spec.tooling === 'floral') { const pts = []; for (let s = lay.s0 + 0.01; s < lay.s1 - 0.02; s += spec.tooling === 'floral' ? 0.0045 : 0.006) { const k = Math.round(s / 0.006); if (spec.tooling === 'basketweave') { const o = onFace(s, lay.h, 0, 0.0004); for (const dy of [-0.3, 0, 0.3]) { const d = (k % 2 ? 1 : -1) * 0.0022; pts.push(o.p.clone().add(V(0, dy * W - d, 0)).addScaledVector(o.tg, -0.0022), o.p.clone().add(V(0, dy * W + d, 0)).addScaledVector(o.tg, 0.0022)); } } else { const o = onFace(s, lay.h, Math.sin(s * 70) * W * 0.26, 0.0004); const o2 = onFace(s + 0.0045, lay.h, Math.sin((s + 0.0045) * 70) * W * 0.26, 0.0004); pts.push(o.p, o2.p); if (k % 3 === 0) { pts.push(o.p.clone(), o.p.clone().add(V(0, Math.cos(s * 70) * W * 0.16, 0)).addScaledVector(o.tg, 0.004)); } } } const ln = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: faceCol.clone().multiplyScalar(0.5) })); ln.frustumCulled = false; group.add(ln); } }
    // holes: on the tip end, centred on the one in use
    if (spec.holes) { const g = []; const dark = new THREE.MeshBasicMaterial({ color: '#0a0a0a' }); for (let k = 1; k <= spec.holes; k++) { const d = (spec.worn - k) * (spec.spacing / 1000); if (Math.abs(d) < 0.004) continue; const onTail = d > 0; const s = C + d + (onTail ? 0.004 : 0); if (onTail && d > tailShown - 0.012) continue; const o = onFace(s, onTail ? T + 0.0006 : 0, 0, 0.0005); g.push(disc(o, 0.0024, dark)); if (spec.buckle === 'double-pin' || spec.decor === 'grommets') { for (const dy of [-W * 0.22, W * 0.22]) { const o2 = onFace(s, onTail ? T + 0.0006 : 0, dy, 0.0005); g.push(disc(o2, 0.0024, dark)); } } } if (g.length) group.add(new THREE.Mesh(merge(g), dark)); }
    // studs, conchos, grommets, rivets
    if (spec.decor && spec.decor !== 'none') { const g = []; const pitch = spec.decor === 'conchos' ? 0.09 : spec.decor === 'grommets' ? spec.spacing / 1000 : 0.022; for (let s = frameL + 0.03; s < C - 0.05; s += pitch) { const rowsY = spec.decor === 'pyramid-studs' || spec.decor === 'dome-studs' ? (W > 0.036 ? [-0.27, 0.27] : [0]) : spec.decor === 'grommets' ? [-0.22, 0.22] : [0]; for (const ry of rowsY) { const o = onFace(s, 0, ry * W, 0.0003); if (spec.decor === 'conchos') { g.push(disc(o, W * 0.42, metal, 0.22)); g.push(disc({ ...o, p: o.p.clone().addScaledVector(o.n, W * 0.09) }, W * 0.13, metal, 0.6)); } else if (spec.decor === 'pyramid-studs') { const c = new THREE.ConeGeometry(0.0062, 0.0045, 4); c.rotateY(Math.PI / 4); c.translate(0, 0.00225, 0); const x = new THREE.Vector3().crossVectors(up, o.n).normalize(); g.push(c.applyMatrix4(new THREE.Matrix4().makeBasis(x, o.n, new THREE.Vector3().crossVectors(x, o.n)).setPosition(o.p))); } else if (spec.decor === 'grommets') { const t = new THREE.TorusGeometry(0.0042, 0.0012, 6, 14); t.rotateX(Math.PI / 2); const x = new THREE.Vector3().crossVectors(up, o.n).normalize(); g.push(t.applyMatrix4(new THREE.Matrix4().makeBasis(x, o.n, new THREE.Vector3().crossVectors(x, o.n)).setPosition(o.p))); } else g.push(disc(o, spec.decor === 'rivets' ? 0.003 : 0.005, metal, 0.55)); } } if (g.length) group.add(new THREE.Mesh(merge(g), metal)); }
    // keepers
    for (let k = 0; k < spec.keepers; k++) { const s = C + frameL * 0.75 + 0.012 + k * 0.035; if (s > C + tailShown - 0.02) break; const o = at(s, T / 2 + 0.0003); const g = new THREE.BoxGeometry(0.011, W + 0.004, T * 2 + 0.0034); const x = o.tg; const m = new THREE.Mesh(g, /metal/.test(spec.keeperType) ? metal : mats.part(spec.parts.some((p) => p.id === 'keeper') ? 'keeper' : 'strap')); m.applyMatrix4(new THREE.Matrix4().makeBasis(x, up, new THREE.Vector3().crossVectors(x, up)).setPosition(o.p)); group.add(m); }
    if (spec.tip === 'metal-tip' && tail) { const o = at(C + tailShown - 0.011, T + 0.0006); const m = new THREE.Mesh(new THREE.BoxGeometry(0.024, W + 0.0015, T + 0.002), metal); m.applyMatrix4(new THREE.Matrix4().makeBasis(o.tg, up, new THREE.Vector3().crossVectors(o.tg, up)).setPosition(o.p)); group.add(m); }
    if (spec.buckle === 'tie') { const o = at(0, T); const kn = new THREE.Mesh(new THREE.BoxGeometry(0.035, W * 0.7, 0.014), faceMat()); kn.position.copy(o.p).addScaledVector(o.n, 0.006); kn.lookAt(o.p.clone().add(o.n)); group.add(kn); for (const sx of [-1, 1]) { const pts = [o.p.clone().addScaledVector(o.n, 0.008), o.p.clone().add(V(sx * 0.04, -0.07, 0)).addScaledVector(o.n, 0.012), o.p.clone().add(V(sx * 0.055, -0.2, 0)).addScaledVector(o.n, 0.014)]; const c = new THREE.CatmullRomCurve3(pts).getPoints(16); group.add(new THREE.Mesh(strand(c, c.map(() => o.n), W * 0.7, T), faceMat())); } }
  }

  // ---------- buckle ----------
  const f = at(0, T + 0.0006); const X = f.tg.clone(); const Z = f.n.clone(); const frame = new THREE.Matrix4().makeBasis(X, up, new THREE.Vector3().crossVectors(X, up)).setPosition(f.p.clone().addScaledVector(Z, 0.001));
  const bk = []; const h = (W + 0.008) * (0.9 + 0.1 * bS); const add = (g) => bk.push(g.applyMatrix4(frame));
  const tubeRect = (w, hh, r, rad, shape = 'rounded') => { const pts = []; const n = 40; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const ca = Math.cos(a); const sa = Math.sin(a); let x; let y; if (shape === 'oval') { x = ca * w / 2; y = sa * hh / 2; } else { const e = shape === 'rectangle' || shape === 'square' ? 0.18 : 0.5; x = Math.sign(ca) * Math.pow(Math.abs(ca), e) * w / 2; y = Math.sign(sa) * Math.pow(Math.abs(sa), e) * hh / 2; if (shape === 'horseshoe' && x < 0) x *= 0.6; } pts.push(V(x, y, r)); } return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, rad, 8, true); };
  const plate = (w, hh, shape) => { const sh = new THREE.Shape(); const n = 48; for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2; const ca = Math.cos(a); const sa = Math.sin(a); const e = shape === 'oval' ? 1 : shape === 'shield' ? 0.7 : 0.3; let x = Math.sign(ca) * Math.pow(Math.abs(ca), e) * w / 2; let y = Math.sign(sa) * Math.pow(Math.abs(sa), e) * hh / 2; if (shape === 'shield' && y < 0) x *= 1 + y / hh; if (i) sh.lineTo(x, y); else sh.moveTo(x, y); } const g = new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: true, bevelSize: 0.0012, bevelThickness: 0.0012, bevelSegments: 2, curveSegments: 12 }); g.translate(0, 0, 0.002); return g; };
  let artFace = null;
  const B = spec.buckle; const shape = spec.buckleShape;
  if (B === 'frame-pin' || B === 'double-pin' || B === 'twist-reversible') { const fw = frameL; add(tubeRect(fw, h, 0.003, 0.0022 * bS, shape)); const bar = new THREE.CylinderGeometry(0.0019, 0.0019, h * 0.96, 8); bar.translate(-fw * 0.2, 0, 0.003); add(bar); for (const dy of B === 'double-pin' ? [-W * 0.22, W * 0.22] : [0]) { const pr = new THREE.CylinderGeometry(0.0013, 0.0016, fw * 0.74, 6); pr.rotateZ(Math.PI / 2); pr.translate(fw * 0.15, dy, 0.0052); add(pr); } if (B === 'twist-reversible') { const kn = new THREE.CylinderGeometry(0.004, 0.004, 0.006, 12); kn.rotateZ(Math.PI / 2); kn.translate(-fw * 0.36, 0, 0.003); add(kn); } }
  else if (B === 'plate' || B === 'box-frame' || B === 'clamp' || B === 'ratchet') { const pw = (B === 'plate' ? 0.085 : B === 'ratchet' ? 0.042 : 0.05) * bS; const ph = (B === 'plate' ? Math.max(0.058, W * 1.55) : W + 0.006) * (B === 'plate' ? bS : 1); const g = plate(pw, ph, B === 'plate' ? shape : 'rectangle'); g.translate(B === 'plate' ? pw * 0.2 : pw * 0.25, 0, 0); add(g);
    if (B === 'plate') { const rope = tubeRect(pw * 1.0, ph * 1.0, 0.0056, 0.0016, shape === 'rectangle' || shape === 'square' ? 'rectangle' : 'oval'); rope.translate(pw * 0.2, 0, 0); add(rope); }
    if (B === 'ratchet') { const lv = new THREE.BoxGeometry(pw * 0.5, 0.004, 0.003); lv.translate(pw * 0.25, -ph / 2 - 0.001, 0.003); add(lv); }
    const fg = new THREE.PlaneGeometry(pw * 0.86, ph * 0.84); fg.translate(B === 'plate' ? pw * 0.2 : pw * 0.25, 0, 0.0066); artFace = fg.applyMatrix4(frame); }
  else if (B === 'double-d') { for (const dz of [0.002, 0.0052]) { const d = new THREE.TorusGeometry(h / 2, 0.0018, 8, 20, Math.PI); d.rotateZ(-Math.PI / 2); d.translate(0.004, 0, dz); add(d); const bar = new THREE.CylinderGeometry(0.0018, 0.0018, h, 8); bar.translate(0.004, 0, dz); add(bar); } }
  else if (B === 'o-ring') { const r = new THREE.TorusGeometry(h * 0.62, 0.0032, 10, 28); r.translate(0, 0, 0.003); add(r); }
  else if (B === 'side-release') { const a = new THREE.BoxGeometry(0.03, h, 0.01); a.translate(-0.012, 0, 0.005); const b = new THREE.BoxGeometry(0.028, h * 0.9, 0.009); b.translate(0.018, 0, 0.005); add(a); add(b); for (const dy of [-1, 1]) { const p = new THREE.BoxGeometry(0.012, 0.004, 0.011); p.translate(0.016, dy * h * 0.47, 0.005); add(p); } }
  else if (B === 'friction-slide') { const g = plate(0.04, h, 'rectangle'); g.translate(0.008, 0, 0); add(g); const bar = new THREE.CylinderGeometry(0.0016, 0.0016, h * 0.9, 6); bar.translate(-0.006, 0, 0.007); add(bar); }
  if (bk.length) { const plastic = B === 'side-release'; group.add(new THREE.Mesh(merge(bk), plastic ? new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.5 }) : metal)); }
  if (B === 'frame-pin' && !bk.length) { const m = new THREE.Mesh(rollerBuckle(W), metal); m.applyMatrix4(frame); group.add(m); }
  // your artwork on the plate: engraved (darkened into the metal), raised, enamelled in its own colours, or a second plating
  if (artFace && spec.buckleArt && typeof document !== 'undefined') { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const cv2 = document.createElement('canvas'); cv2.width = 512; cv2.height = 512; const tex = new THREE.CanvasTexture(cv); const texC = new THREE.CanvasTexture(cv2); texC.colorSpace = THREE.SRGBColorSpace; const mode = spec.buckleArtMode;
    const im = new Image(); im.onload = () => { const c = cv.getContext('2d'); const k = Math.min(512 / im.width, 512 / im.height); const w = im.width * k; const hh = im.height * k; c.clearRect(0, 0, 512, 512); c.drawImage(im, (512 - w) / 2, (512 - hh) / 2, w, hh); cv2.getContext('2d').drawImage(cv, 0, 0); const d = c.getImageData(0, 0, 512, 512); let hasA = false; for (let i = 3; i < d.data.length; i += 4) if (d.data[i] < 250) { hasA = true; break; } for (let i = 0; i < d.data.length; i += 4) { const lum = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) / 255; const a = hasA ? d.data[i + 3] : Math.round((1 - lum) * 255); d.data[i] = d.data[i + 1] = d.data[i + 2] = a; d.data[i + 3] = 255; } c.putImageData(d, 0, 0); if (!hasA) { const c2 = cv2.getContext('2d'); const d2 = c2.getImageData(0, 0, 512, 512); for (let i = 0; i < d2.data.length; i += 4) d2.data[i + 3] = d.data[i]; c2.putImageData(d2, 0, 0); } tex.needsUpdate = true; texC.needsUpdate = true; onReady?.(); }; im.src = spec.buckleArt;
    const m = /enamel/.test(mode) ? new THREE.MeshPhysicalMaterial({ map: texC, transparent: true, roughness: 0.18, clearcoat: 1, metalness: 0.1 }) : /two-tone/.test(mode) ? new THREE.MeshStandardMaterial({ color: spec.buckleFinish === 'gold' ? '#c9c9c9' : '#d4af37', alphaMap: tex, transparent: true, metalness: 0.95, roughness: 0.25 }) : new THREE.MeshStandardMaterial({ color: /embossed/.test(mode) ? new THREE.Color(metalCol).multiplyScalar(1.12) : new THREE.Color(metalCol).multiplyScalar(0.32), alphaMap: tex, bumpMap: tex, bumpScale: /embossed/.test(mode) ? 2.5 : -2.5, transparent: true, metalness: 0.9, roughness: /embossed/.test(mode) ? 0.25 : 0.55 });
    m.polygonOffset = true; m.polygonOffsetFactor = -2; m.side = THREE.DoubleSide; group.add(new THREE.Mesh(artFace, m)); }
  group.traverse((o) => { o.frustumCulled = false; });
  return group;
}
