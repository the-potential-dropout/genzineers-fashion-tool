// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Procedural jewelry geometry. Units: millimetres in, metres out (x 0.001).
 * Chains use InstancedMesh (one draw call per chain, thousands of links).
 */
import * as THREE from 'three';
import { METALS, GEMS, CUTS, LINKS, ringSize, SETTINGS } from '../core/jewelry.js';

const MM = 0.001;

export function metalMaterial(spec) {
  const m = spec.alloy || METALS[spec.metal] || METALS['silver-925'];
  const plating = spec.plating && spec.plating !== 'none' ? { rhodium: '#eef0f2', 'gold-yellow': '#e3b54b', 'gold-rose': '#e8a68a', 'black-rhodium': '#2a2b2e', pvd: '#1c1c1e', anodised: '#4a63c8' }[spec.plating] : null;
  return new THREE.MeshPhysicalMaterial({ color: plating || m.color, metalness: 1, roughness: spec.finish === 'matte' ? 0.45 : spec.finish === 'brushed' ? 0.3 : m.roughness ?? 0.15, clearcoat: 0.3, clearcoatRoughness: 0.1 });
}

export function gemMaterial(gemId) {
  const g = GEMS[gemId] || GEMS.diamond;
  if (g.kind === 'pearl') return new THREE.MeshPhysicalMaterial({ color: g.color, roughness: 0.25, metalness: 0, sheen: 1, sheenColor: '#ffffff', iridescence: 0.6, iridescenceIOR: 1.6, clearcoat: 1 });
  if (g.kind === 'opaque') return new THREE.MeshPhysicalMaterial({ color: g.color, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
  if (g.kind === 'opalescent') return new THREE.MeshPhysicalMaterial({ color: g.color, roughness: 0.15, transmission: 0.4, iridescence: 1, iridescenceIOR: 2, clearcoat: 1, thickness: 2 * MM });
  if (g.kind === 'translucent') return new THREE.MeshPhysicalMaterial({ color: g.color, roughness: 0.15, transmission: 0.6, thickness: 3 * MM, ior: g.ri, clearcoat: 1 });
  return new THREE.MeshPhysicalMaterial({ color: g.color, roughness: 0, metalness: 0, transmission: 1, ior: Math.min(2.333, g.ri), thickness: 4 * MM, dispersion: g.disp * 60, specularIntensity: 1, envMapIntensity: 2.2, attenuationColor: g.color, attenuationDistance: g.color === '#ffffff' ? 1 : 6 * MM, flatShading: true });
}

/** 2D outline (mm) for a cut, centred, length along y. */
export function cutOutline(cut, L, W, custom) {
  const c = CUTS[cut] || CUTS['round-brilliant'];
  const out = [];
  const N = 32;
  const kind = c.outline;
  if (kind === 'custom' && custom?.length >= 3) {
    const xs = custom.map((p) => p[0]); const ys = custom.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2; const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const sx = W / ((Math.max(...xs) - Math.min(...xs)) || 1); const sy = L / ((Math.max(...ys) - Math.min(...ys)) || 1);
    return custom.map(([x, y]) => [(x - cx) * sx, (y - cy) * sy]);
  }
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    let x = Math.cos(a); let y = Math.sin(a);
    if (kind === 'square' || kind === 'rect') { const m = Math.max(Math.abs(x), Math.abs(y)); x /= m; y /= m; }
    if (kind === 'cushion') { const p = 4; const m = (Math.abs(x) ** p + Math.abs(y) ** p) ** (1 / p); x /= m; y /= m; }
    if (kind === 'octagon') { const m = Math.max(Math.abs(x), Math.abs(y), (Math.abs(x) + Math.abs(y)) / 1.4); x /= m; y /= m; }
    if (kind === 'marquise') { x *= Math.abs(Math.sin(a)) ** 0.3; }
    if (kind === 'pear') { const t = (y + 1) / 2; x *= Math.sqrt(Math.max(0, t)) * (1.2 - 0.2 * t); }
    if (kind === 'heart') { const t = a; x = 16 * Math.sin(t) ** 3 / 16; y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16; [x, y] = [x, y]; }
    if (kind === 'triangle') { const k = Math.floor((a / (Math.PI * 2)) * 3); const t = ((a / (Math.PI * 2)) * 3) % 1; const P = [[0, 1], [0.87, -0.5], [-0.87, -0.5], [0, 1]]; x = P[k][0] + (P[k + 1][0] - P[k][0]) * t; y = P[k][1] + (P[k + 1][1] - P[k][1]) * t; }
    out.push([(x * W) / 2, (y * L) / 2]);
  }
  return out;
}

/** Faceted (or domed) stone; table up (+y), girdle at y=0. */
export function stoneGeometry(cut, L, W, custom) {
  const c = CUTS[cut] || CUTS['round-brilliant'];
  if (c.sphere) return new THREE.SphereGeometry((W / 2) * MM, 24, 16);
  if (c.dome) { const g = new THREE.SphereGeometry(0.5 * MM, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(W, W * c.depth * 1.4, L); return g; }
  const ring = cutOutline(cut, L, W, custom);
  const n = ring.length;
  const crownH = W * (c.flatBack ? c.depth : 0.16);
  const pavD = c.flatBack ? 0 : W * (c.depth - 0.16);
  const tableS = c.step ? 0.7 : 0.56;
  const pos = [];
  const tri = (a, b, d) => pos.push(...a, ...b, ...d);
  const P = (p, y, s = 1) => [p[0] * s * MM, y * MM, p[1] * s * MM];
  const tc = [0, crownH * MM, 0];
  const cul = [0, -pavD * MM, 0];
  for (let i = 0; i < n; i++) {
    const a = ring[i]; const b = ring[(i + 1) % n];
    const ga = P(a, 0); const gb = P(b, 0);
    const ta = P(a, crownH, tableS); const tb = P(b, crownH, tableS);
    tri(ga, gb, tb); tri(ga, tb, ta); // crown
    tri(ta, tb, tc); // table
    if (pavD > 0) {
      const ma = P(a, -pavD * 0.45, 0.6); const mb = P(b, -pavD * 0.45, 0.6);
      tri(gb, ga, ma); tri(gb, ma, mb); tri(mb, ma, cul); // pavilion
    } else { tri(gb, ga, [0, 0, 0]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Prongs / bezel around a stone at origin. */
function settingGroup(setting, L, W, mat) {
  const grp = new THREE.Group();
  const s = SETTINGS[setting] || SETTINGS['prong-4'];
  if (s.bezel) {
    const shape = new THREE.Shape(cutOutline('round-brilliant', L + 1.2, W + 1.2).map(([x, y]) => new THREE.Vector2(x, y)));
    shape.holes.push(new THREE.Path(cutOutline('round-brilliant', L, W).map(([x, y]) => new THREE.Vector2(x, y))));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: W * 0.32, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.15, bevelSegments: 2, curveSegments: 24 });
    geo.scale(MM, MM, MM); geo.rotateX(-Math.PI / 2); geo.translate(0, -W * 0.18 * MM, 0);
    grp.add(new THREE.Mesh(geo, mat));
    return grp;
  }
  const n = s.prongs || 4;
  const ring = cutOutline('round-brilliant', L, W);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.PI / n;
    const x = Math.cos(a) * (W / 2) * 0.98; const z = Math.sin(a) * (L / 2) * 0.98;
    const pr = new THREE.Mesh(new THREE.CylinderGeometry(0.45 * MM, 0.55 * MM, W * 0.9 * MM, 8), mat);
    pr.position.set(x * MM, -W * 0.25 * MM, z * MM);
    grp.add(pr);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.5 * MM, 10, 8), mat);
    tip.position.set(x * 0.92 * MM, W * 0.2 * MM, z * 0.92 * MM);
    grp.add(tip);
  }
  void ring;
  // basket rail
  const rail = new THREE.Mesh(new THREE.TorusGeometry((W / 2) * 0.75 * MM, 0.35 * MM, 6, 24), mat);
  rail.rotation.x = Math.PI / 2; rail.position.y = -W * 0.45 * MM;
  grp.add(rail);
  return grp;
}

function stoneWithSetting(st, metalMat) {
  const L = st.size || 5; const W = st.width || st.size || 5;
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(stoneGeometry(st.cut, L, W, st.outline), gemMaterial(st.gem)));
  if (st.setting && st.setting !== 'flush' && st.setting !== 'tension' && st.setting !== 'channel' && st.setting !== 'pave') grp.add(settingGroup(st.setting, L, W, metalMat));
  return grp;
}

function bandProfile(profile, w, t) {
  // (r offset, y) points for a lathe; r measured outward from inner radius
  const pts = [];
  const N = 12;
  for (let i = 0; i <= N; i++) {
    const u = i / N; const y = (u - 0.5) * w;
    let r;
    switch (profile) {
      case 'flat': case 'signet': r = t; break;
      case 'd-shape': r = t * Math.sqrt(1 - (2 * u - 1) ** 2) * 0.9 + t * 0.1; break;
      case 'knife-edge': r = t * (1 - Math.abs(2 * u - 1)) * 0.8 + t * 0.2; break;
      case 'concave': r = t * (0.75 + 0.25 * (2 * u - 1) ** 2); break;
      case 'bevelled': r = t * Math.min(1, (1 - Math.abs(2 * u - 1)) * 3); break;
      default: r = t * (0.55 + 0.45 * Math.sqrt(1 - (2 * u - 1) ** 2)); // court / comfort
    }
    pts.push([r, y]);
  }
  return pts;
}

function lathe(innerR, profile, w, t, mat, arc = Math.PI * 2, inside = profile === 'court' || profile === 'flat-court') {
  const prof = bandProfile(profile, w, t);
  const pts = [];
  for (const [r, y] of prof) pts.push(new THREE.Vector2((innerR + r) * MM, y * MM));
  for (let i = prof.length - 1; i >= 0; i--) { const y = prof[i][1]; const bulge = inside ? t * 0.12 * Math.sqrt(Math.max(0, 1 - (2 * y / w) ** 2)) : 0; pts.push(new THREE.Vector2((innerR - bulge) * MM, y * MM)); }
  pts.push(pts[0].clone());
  const g = new THREE.LatheGeometry(pts, 96, 0, arc);
  g.rotateX(Math.PI / 2); // ring axis along z (stands up facing the camera)
  return new THREE.Mesh(g, mat);
}

/**
 * A closed wire link swept along its true centreline.
 *  - cable / rolo / paperclip: a planar oval, round or stadium of round wire
 *  - curb / Cuban / figaro: the oval is twisted about its long axis (so each link passes
 *    through the next and the chain lies flat), then its top and bottom are cut flat and
 *    polished ("diamond cut"), which is what gives a Cuban its broad mirror faces
 * a, b = half length / half width of the centreline (mm); d = wire diameter (mm).
 */
function wireLink({ a, b, d, twist = 0, flat = 0, stadium = false, ry = 1 }) {
  class Path extends THREE.Curve {
    getPoint(u, target = new THREE.Vector3()) {
      const t = u * Math.PI * 2;
      let x; let y;
      if (stadium) { // straight sides, round ends
        const c = Math.cos(t); const sn = Math.sin(t); const k = Math.max(Math.abs(c) / a, Math.abs(sn) / b) || 1;
        const px = c / k; const py = sn / k; const cr = b; const sx = Math.max(-(a - cr), Math.min(a - cr, px));
        const dx = px - sx; const dl = Math.hypot(dx, py) || 1; x = sx + (dx / dl) * cr; y = (py / dl) * cr;
      } else { x = a * Math.cos(t); y = b * Math.sin(t); }
      const ph = (x / a) * twist * 0.5; // roll about the long axis grows along the link
      return target.set(x, y * Math.cos(ph), y * Math.sin(ph));
    }
  }
  const g = new THREE.TubeGeometry(new Path(), 72, d / 2, 14, true);
  if (ry !== 1) g.scale(1, ry, 1);
  if (flat > 0) {
    // diamond cut: plane off the crown of the link on both faces
    const p = g.attributes.position; let zmax = 0;
    for (let i = 0; i < p.count; i++) zmax = Math.max(zmax, Math.abs(p.getZ(i)));
    const zc = zmax * (1 - flat);
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (Math.abs(z) > zc) p.setZ(i, Math.sign(z) * zc); }
  }
  g.scale(MM, MM, MM);
  g.computeVertexNormals();
  return g;
}

function linkGeometry(link, gauge, customPts) {
  const lk = LINKS[link] || LINKS.cable;
  const d = gauge; // wire diameter, mm
  let g; let step; let frame = 'roll'; // 'roll': links alternate 90 degrees; 'flat': all links lie the same way
  switch (lk.shape) {
    case 'oval-flat': {
      // curb family. Cuban: heavier wire, tighter pitch, deeper diamond cut
      const heavy = Boolean(lk.heavy);
      const a = d * (heavy ? 1.75 : 2.05); const b = d * (heavy ? 1.28 : 1.3);
      g = wireLink({ a, b, d: d * (heavy ? 1.12 : 1), twist: Math.PI / 2, flat: heavy ? 0.24 : 0.14 });
      step = 2 * a - d * (heavy ? 1.52 : 1.35); frame = 'flat';
      break;
    }
    case 'round': g = wireLink({ a: d * 1.55, b: d * 1.55, d }); step = d * 2.0; break;
    case 'oval-bar': case 'oval': g = wireLink({ a: d * 2.1, b: d * 1.25, d }); step = d * 2.95; break;
    case 'rect': g = wireLink({ a: d * 4.6, b: d * 1.45, d, stadium: true }); step = d * 7.6; break;
    case 'ball': g = new THREE.SphereGeometry(d * 0.9 * MM, 20, 14); step = d * 1.95; frame = 'flat'; break;
    case 'square': case 'custom': {
      const len = d * lk.pitch * 1.25; const wid = d * 2.4;
      const outline = lk.shape === 'custom' && customPts?.length >= 3 ? customPts : [[-len / 2, -wid / 2], [len / 2, -wid / 2], [len / 2, wid / 2], [-len / 2, wid / 2]];
      const sh = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
      sh.holes.push(new THREE.Path(outline.map(([x, y]) => new THREE.Vector2(x * 0.55, y * 0.45))));
      g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: d * 0.15, bevelSize: d * 0.12, bevelSegments: 3 });
      g.scale(MM, MM, MM); g.translate(0, 0, -d * MM / 2);
      step = len * 0.62;
      break;
    }
    case 'cup': g = new THREE.CylinderGeometry(d * 0.55 * MM, d * 0.45 * MM, d * 0.6 * MM, 20); step = d * 1.05; frame = 'flat'; break;
    case 'tube': case 'tube-flat': { const len = d * lk.pitch * 1.25; g = new THREE.CylinderGeometry(d * 0.6 * MM, d * 0.6 * MM, len * MM, 16); g.rotateZ(Math.PI / 2); if (lk.flat) g.scale(1, 1, 0.35); step = len * 0.7; frame = 'flat'; break; }
    case 'helix': g = wireLink({ a: d * 1.5, b: d * 1.15, d: d * 0.8, twist: Math.PI * 0.6 }); step = d * 0.9; break;
    default: g = wireLink({ a: d * 2.1, b: d * 1.25, d }); step = d * 2.95;
  }
  return { g, step, lk, frame };
}

/** Necklace / bracelet path: a hanging loop (ellipse squashed at the back). */
function chainCurve(lengthCm, around = 'neck') {
  const C = lengthCm * 10;
  const pts = [];
  const N = 200;
  const rx = C / (2 * Math.PI) * 1.05;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const drop = around === 'neck' ? Math.max(0, Math.cos(a)) ** 2 * C * 0.18 : 0;
    pts.push(new THREE.Vector3(Math.sin(a) * rx * MM, (-drop) * MM, Math.cos(a) * rx * (around === 'neck' ? 0.75 : 1) * MM));
  }
  return new THREE.CatmullRomCurve3(pts, true);
}

function chainMesh(spec, metalMat) {
  const { g, step, lk, frame } = linkGeometry(spec.link, spec.gauge || 1, spec.customLink);
  const curve = chainCurve(spec.length || 45, spec.piece === 'bracelet' ? 'wrist' : 'neck');
  const L = curve.getLength() / MM;
  const pattern = lk.pattern || [1];
  const avg = pattern.reduce((x, y) => x + y, 0) / pattern.length;
  const count = Math.max(8, Math.round(L / (step * avg)));
  const pitch = L / (count * avg); // spread evenly so the loop closes on a whole link
  const mesh = new THREE.InstancedMesh(g, metalMat, count);
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const up = new THREE.Vector3(0, 1, 0);
  const basis = new THREE.Matrix4(); const N = new THREE.Vector3(); const B = new THREE.Vector3();
  const twist = (lk.twist || 0) * Math.PI / 180;
  let u = 0;
  for (let i = 0; i < count; i++) {
    const s = pattern[i % pattern.length];
    const t = ((u + (s * pitch * MM * 0.5) / curve.getLength()) % 1 + 1) % 1;
    const p = curve.getPointAt(t); const tan = curve.getTangentAt(t);
    // frame: x along the chain, z facing outwards from the neck / wrist so the flat faces show
    N.copy(p).setY(p.y * 0.25).normalize(); N.addScaledVector(tan, -N.dot(tan)).normalize();
    B.crossVectors(N, tan).normalize();
    basis.makeBasis(tan, B, N);
    q.setFromRotationMatrix(basis);
    if (frame === 'roll') q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), (i % 2) * (twist || Math.PI / 2) + (lk.shape === 'helix' ? i * 0.55 : 0)));
    m.compose(p, q, new THREE.Vector3(s, 1, 1));
    mesh.setMatrixAt(i, m);
    u += (pitch * s * MM) / curve.getLength();
  }
  void up;
  mesh.instanceMatrix.needsUpdate = true;
  const grp = new THREE.Group();
  grp.add(mesh);
  // stones along a tennis line
  if (lk.stones && spec.stone) {
    const sg = stoneGeometry(spec.stone.cut, spec.stone.size, spec.stone.size);
    const sm = new THREE.InstancedMesh(sg, gemMaterial(spec.stone.gem), count);
    for (let i = 0; i < count; i++) {
      const t = (i / count) % 1; const p = curve.getPointAt(t); const n = p.clone().setY(0).normalize();
      q.setFromUnitVectors(up, n); m.compose(p.clone().addScaledVector(n, (spec.gauge || 2) * 0.3 * MM), q, new THREE.Vector3(1, 1, 1)); sm.setMatrixAt(i, m);
    }
    grp.add(sm);
  }
  // clasp at the back
  const clasp = new THREE.Mesh(new THREE.CapsuleGeometry((spec.gauge || 1) * 1.1 * MM, (spec.gauge || 1) * 5 * MM, 4, 10), metalMat);
  const back = curve.getPointAt(0.5); clasp.position.copy(back); clasp.rotation.z = Math.PI / 2;
  grp.add(clasp);
  grp.userData.curve = curve;
  return grp;
}

function pendantShape(pd) {
  const sh = new THREE.Shape();
  const w = pd.w || 14; const h = pd.h || 14;
  if (pd.shape === 'custom' && pd.points?.length >= 3) { pd.points.forEach(([x, y], i) => (i ? sh.lineTo(x, -y) : sh.moveTo(x, -y))); return sh; }
  if (pd.shape === 'heart') { sh.moveTo(0, -h * 0.35); sh.bezierCurveTo(w * 0.5, -h, w * 0.6, -h * 0.1, 0, h * 0.5); sh.bezierCurveTo(-w * 0.6, -h * 0.1, -w * 0.5, -h, 0, -h * 0.35); return sh; }
  if (pd.shape === 'bar') { sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(w / 2, -h); sh.lineTo(-w / 2, -h); return sh; }
  if (pd.shape === 'star') { for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? w * 0.22 : w / 2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r - h / 2) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r - h / 2); } return sh; }
  sh.absellipse(0, -h / 2, w / 2, h / 2, 0, Math.PI * 2, false, 0);
  return sh;
}

/**
 * Signet ring as one continuous solid. Going round the finger from the base to the top, the
 * section grows from the slim band into broad shoulders and a thick head; the top of the head
 * is planed flat (the face that takes an engraving). Face shapes: oval (Oxford), round,
 * cushion, and marquise-like "bullet".
 */
function signetRing(inner, spec, mat) {
  const sg = spec.signet;
  const Wf = sg.w || 13; const Hf = sg.h || 11; // face: across the finger x along the finger (mm)
  const w0 = Math.max(2.2, spec.bandWidth || 3); const t0 = Math.max(1.3, (spec.bandThickness || 1.8) * 0.85);
  const T = Math.max(2.4, t0 * 1.7); // head thickness
  const yTop = inner + T;
  const power = { cushion: 0.55, round: 0.8, bullet: 1.25 }[sg.shape] ?? 0.8;
  const span = Math.min(2.2, Math.atan2(Wf / 2, yTop) * 2.4 + 0.5); // how far round the shoulders run
  const NA = 160; const NP = 28;
  const pos = new Float32Array(NA * NP * 3);
  for (let i = 0; i < NA; i++) {
    const phi = (i / NA) * Math.PI * 2 - Math.PI; // 0 = top of the finger
    const S = Math.pow(0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, Math.abs(phi) / span)), power);
    const half = w0 / 2 + (Hf / 2 - w0 / 2) * S; // half width along the finger
    const shoulder = inner + t0 + (T * 1.18 - t0) * S;
    const plane = Math.abs(phi) < 1.2 ? yTop / Math.cos(phi) : 1e9; // the flat face
    const rOut = Math.min(shoulder, plane);
    const flatTop = plane < shoulder;
    const rIn = inner; const rc = (rIn + rOut) / 2; const th = (rOut - rIn) / 2;
    const n = flatTop ? 7 : 3.2; // crisp edge round the face, soft comfort edges on the band
    for (let j = 0; j < NP; j++) {
      const psi = (j / NP) * Math.PI * 2;
      const cy = Math.cos(psi); const cr = Math.sin(psi);
      const y = half * Math.sign(cy) * Math.pow(Math.abs(cy), 2 / n);
      let r = rc + th * Math.sign(cr) * Math.pow(Math.abs(cr), 2 / n);
      if (cr < 0) r -= 0.12 * Math.sqrt(Math.max(0, 1 - (y / half) ** 2)) * -1 * 0 + 0; // inner stays a true cylinder for sizing
      const o = (i * NP + j) * 3;
      pos[o] = r * Math.sin(phi) * MM; pos[o + 1] = r * Math.cos(phi) * MM; pos[o + 2] = y * MM;
    }
  }
  const idx = [];
  for (let i = 0; i < NA; i++) for (let j = 0; j < NP; j++) {
    const a = i * NP + j; const b = ((i + 1) % NA) * NP + j; const c = ((i + 1) % NA) * NP + ((j + 1) % NP); const d = i * NP + ((j + 1) % NP);
    idx.push(a, b, d, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, mat));
  // engraved border just inside the edge of the face
  const ring = []; const k = 0.8;
  for (let e = 0; e <= 64; e++) { const a = (e / 64) * Math.PI * 2; const ex = Math.pow(Math.abs(Math.cos(a)), sg.shape === 'cushion' ? 0.6 : 1) * Math.sign(Math.cos(a)); const ey = Math.pow(Math.abs(Math.sin(a)), sg.shape === 'cushion' ? 0.6 : 1) * Math.sign(Math.sin(a)); ring.push(new THREE.Vector3(ex * Wf * 0.5 * k * 0.86 * MM, (yTop + 0.02) * MM, ey * Hf * 0.5 * k * MM)); }
  const border = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 96, 0.11 * MM, 6, true), new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.35, roughness: 1 }));
  grp.add(border);
  return grp;
}

/** Build a THREE.Group for any jewelry spec. */
export function buildJewelry(spec) {
  const grp = new THREE.Group();
  const metal = metalMaterial(spec);
  const piece = spec.piece;
  if (piece === 'ring') {
    const inner = ringSize(spec.size || 7).diameterMm / 2;
    const t = spec.bandThickness || 1.8; const w = spec.bandWidth || 2;
    grp.add(lathe(inner, spec.profile || 'court', w, t, metal));
    const topY = inner + t;
    if (spec.signet && spec.signet.shape !== 'custom') {
      // a real signet: the band swells through tapered shoulders into one solid head with a flat face
      grp.clear();
      grp.add(signetRing(inner, spec, metal));
    } else if (spec.signet) {
      const sh = pendantShape({ shape: 'custom', w: spec.signet.w, h: spec.signet.h, points: spec.signet.points });
      const g = new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 3 });
      g.scale(MM, MM, MM); g.rotateX(-Math.PI / 2); g.translate(0, (topY - 1.5) * MM, spec.signet.h / 2 * MM);
      grp.add(new THREE.Mesh(g, metal));
    }
    for (const st of spec.stones || []) {
      const s = stoneWithSetting(st, metal);
      if (st.position === 'center' || st.position === 'top' || !st.position) { s.position.y = (topY + (st.flat ? 1.5 : (st.width || st.size) * 0.45)) * MM; if (st.flat) s.scale.y = 0.4; }
      else { s.position.y = topY * MM; s.position.x = (st.width || st.size) * 1.1 * MM * (grp.children.length % 2 ? 1 : -1); s.scale.setScalar(0.8); }
      grp.add(s);
    }
    if (spec.eternity) {
      const e = spec.eternity; const n = Math.floor((Math.PI * 2 * (inner + t)) / (e.size * 1.15));
      const sg = stoneGeometry(e.cut, e.size, e.size); const gm = gemMaterial(e.gem); const im = new THREE.InstancedMesh(sg, gm, n);
      const mtx = new THREE.Matrix4(); const qq = new THREE.Quaternion();
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const dir = new THREE.Vector3(Math.sin(a), Math.cos(a), 0); qq.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); mtx.compose(dir.clone().multiplyScalar((inner + t) * MM), qq, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, mtx); }
      grp.add(im);
    }
    if (spec.pave) {
      const n = 26; const sg = stoneGeometry('round-brilliant', 1.2, 1.2); const im = new THREE.InstancedMesh(sg, gemMaterial('diamond'), n);
      const mtx = new THREE.Matrix4(); const qq = new THREE.Quaternion();
      for (let i = 0; i < n; i++) { const a = -0.9 + (i / (n - 1)) * 1.8; const dir = new THREE.Vector3(Math.sin(a), Math.cos(a), 0); qq.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir); mtx.compose(dir.clone().multiplyScalar((inner + t) * MM), qq, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, mtx); }
      grp.add(im);
    }
  } else if (piece === 'chain' || piece === 'necklace' || piece === 'bracelet') {
    const ch = chainMesh(spec, metal);
    grp.add(ch);
    if (spec.pendant && (spec.pendant.shape !== 'none' || spec.pendant.stone)) {
      const front = ch.userData.curve.getPointAt(0);
      const pg = new THREE.Group();
      if (spec.pendant.shape && spec.pendant.shape !== 'none') {
        const g = new THREE.ExtrudeGeometry(pendantShape(spec.pendant), { depth: spec.pendant.thickness || 1.2, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 3, curveSegments: 24 });
        g.scale(MM, MM, MM);
        pg.add(new THREE.Mesh(g, metal));
      }
      if (spec.pendant.stone) { const s = stoneWithSetting(spec.pendant.stone, metal); s.rotation.x = Math.PI / 2; s.position.set(0, -(spec.pendant.stone.size / 2 + 2) * MM, 1 * MM); pg.add(s); }
      const bail = new THREE.Mesh(new THREE.TorusGeometry(1.6 * MM, 0.45 * MM, 8, 16), metal);
      bail.position.y = 1 * MM; pg.add(bail);
      pg.position.copy(front).add(new THREE.Vector3(0, -2 * MM, 0));
      grp.add(pg);
    }
  } else if (piece === 'strand') {
    const curve = chainCurve(spec.length || 45);
    const n = Math.floor((spec.length * 10) / ((spec.bead || 7) * (spec.knotted ? 1.15 : 1.0)));
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry((spec.bead || 7) / 2 * MM, 20, 14), gemMaterial(spec.gem || 'pearl-akoya'), n);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { mtx.makeTranslation(curve.getPointAt(i / n)); im.setMatrixAt(i, mtx); }
    grp.add(im);
  } else if (piece === 'bangle' || piece === 'cuff') {
    const arc = piece === 'cuff' ? Math.PI * 2 * (1 - (spec.gap || 25) / (Math.PI * (spec.diameter || 62))) : Math.PI * 2;
    const m = lathe((spec.diameter || 62) / 2, spec.profile || 'court', spec.width || 4, spec.thickness || 2, metal, arc, false);
    grp.add(m);
  } else if (piece === 'earring') {
    const pair = new THREE.Group();
    for (const side of [-1, 1]) {
      const e = new THREE.Group();
      if (spec.style === 'hoop') { const tor = new THREE.Mesh(new THREE.TorusGeometry((spec.diameter || 20) / 2 * MM, (spec.thickness || 2) / 2 * MM, 12, 48), metal); e.add(tor); }
      else {
        if (spec.style === 'drop') { const hook = new THREE.Mesh(new THREE.TorusGeometry(5 * MM, 0.4 * MM, 6, 24, Math.PI * 1.3), metal); hook.position.y = 8 * MM; e.add(hook); }
        if (spec.stone) { const s = stoneWithSetting(spec.stone, metal); s.rotation.x = Math.PI / 2; e.add(s); }
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.4 * MM, 0.4 * MM, 10 * MM, 8), metal); post.rotation.x = Math.PI / 2; post.position.z = -5 * MM; if (spec.style !== 'drop') e.add(post);
      }
      e.position.x = side * 18 * MM;
      pair.add(e);
    }
    grp.add(pair);
  }
  return grp;
}
