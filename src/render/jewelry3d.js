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
 * Link dimensions in wire diameters (d), solved so neighbouring links never intersect:
 *   pitch >= a + 0.55 d          (a link clears the one after next)
 *   pitch <= 2a - d              (alternating links: the two end bows do not collide)
 *   crossing wires stay > 1 d apart (checked by scripts/jewelry-test.mjs for every chain)
 * a / b = half length / half width of the wire centreline.
 */
export const LINK_DIMS = {
  cuban: { a: 1.85, b: 1.5, wire: 1, twist: 100, pitch: 2.42, flat: 0.2, frame: 'flat' },
  curb: { a: 2.1, b: 1.5, wire: 1, twist: 100, pitch: 2.68, flat: 0.12, frame: 'flat' },
  figaro: { a: 2.1, b: 1.5, wire: 1, twist: 100, pitch: 2.68, flat: 0.12, frame: 'flat' },
  cable: { a: 2.1, b: 1.25, wire: 1, twist: 0, pitch: 2.95, frame: 'roll' },
  mariner: { a: 2.3, b: 1.3, wire: 1, twist: 0, pitch: 3.2, frame: 'roll', bar: true },
  satellite: { a: 2.1, b: 1.25, wire: 1, twist: 0, pitch: 2.95, frame: 'roll' },
  rolo: { a: 1.72, b: 1.72, wire: 1, twist: 0, pitch: 2.34, frame: 'roll' },
  byzantine: { a: 1.72, b: 1.72, wire: 1, twist: 0, pitch: 2.34, frame: 'roll' },
  paperclip: { a: 4.6, b: 1.45, wire: 1, twist: 0, pitch: 7.6, frame: 'roll', stadium: true },
};
/** Centreline of a wire link (shared by the mesh and the interference test). */
export function linkPoint(dim, u, out = [0, 0, 0]) {
  const { a, b } = dim; const t = u * Math.PI * 2;
  let x; let y;
  if (dim.stadium) {
    const c = Math.cos(t); const sn = Math.sin(t); const k = Math.max(Math.abs(c) / a, Math.abs(sn) / b) || 1;
    const px = c / k; const py = sn / k; const sx = Math.max(-(a - b), Math.min(a - b, px));
    const dx = px - sx; const dl = Math.hypot(dx, py) || 1; x = sx + (dx / dl) * b; y = (py / dl) * b;
  } else { x = a * Math.cos(t); y = b * Math.sin(t); }
  const ph = (x / a) * ((dim.twist || 0) * Math.PI / 180) * 0.5; // roll about the long axis grows along the link
  out[0] = x; out[1] = y * Math.cos(ph); out[2] = y * Math.sin(ph);
  return out;
}

function wireLink(dim, d) {
  class Path extends THREE.Curve {
    getPoint(u, target = new THREE.Vector3()) { const q = linkPoint(dim, u); return target.set(q[0] * d, q[1] * d, q[2] * d); }
  }
  const g = new THREE.TubeGeometry(new Path(), 80, (d * dim.wire) / 2, 14, true);
  if (dim.flat > 0) {
    // diamond cut: plane off the crown of the link on both faces (this only removes metal)
    const p = g.attributes.position; let zmax = 0;
    for (let i = 0; i < p.count; i++) zmax = Math.max(zmax, Math.abs(p.getZ(i)));
    const zc = zmax * (1 - dim.flat);
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (Math.abs(z) > zc) p.setZ(i, Math.sign(z) * zc); }
  }
  if (dim.bar) { // mariner: a bar across the middle of the link, in the link's own plane
    const bar = new THREE.CylinderGeometry((d * 0.42), (d * 0.42), dim.b * 2 * d, 10);
    const merged = mergeGeo([g, bar]); g.dispose(); bar.dispose();
    merged.scale(MM, MM, MM); merged.computeVertexNormals(); return merged;
  }
  g.scale(MM, MM, MM);
  g.computeVertexNormals();
  return g;
}
function mergeGeo(list) {
  const pos = []; const idx = []; let off = 0;
  for (const g0 of list) { const g = g0.index ? g0 : g0.toNonIndexed(); const p = g.attributes.position; for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i)); if (g.index) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < p.count; i++) idx.push(i + off); off += p.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setIndex(idx); return out;
}

function linkGeometry(link, gauge, customPts) {
  const lk = LINKS[link] || LINKS.cable;
  const d = gauge; // wire diameter, mm
  const dim = LINK_DIMS[link];
  if (dim) return { g: wireLink(dim, d), step: dim.pitch * d, lk, frame: dim.frame };
  let g; let step; let frame = 'flat';
  switch (lk.shape) {
    case 'ball': { // beads joined by short connector bars
      const bead = new THREE.SphereGeometry(d * 0.9, 20, 14); const bar = new THREE.CylinderGeometry(d * 0.18, d * 0.18, d * 0.5, 8); bar.rotateZ(Math.PI / 2); bar.translate(d * 1.12, 0, 0);
      g = mergeGeo([bead, bar]); g.scale(MM, MM, MM); g.computeVertexNormals(); step = d * 2.24; break;
    }
    case 'square': case 'custom': {
      // box / franco / custom: rectangular frames, alternately turned 90 degrees.
      // bar 0.5 d, opening 1.3 d wide (> the 1 d depth of the neighbour passing through it)
      const Lo = d * 3.2; const Wo = d * 2.3; const tb = d * 0.5;
      const outline = lk.shape === 'custom' && customPts?.length >= 3 ? customPts : [[-Lo / 2, -Wo / 2], [Lo / 2, -Wo / 2], [Lo / 2, Wo / 2], [-Lo / 2, Wo / 2]];
      const sh = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)));
      const xs = outline.map((q) => q[0]); const ys = outline.map((q) => q[1]); const cx = (Math.min(...xs) + Math.max(...xs)) / 2; const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const kx = 1 - (2 * tb) / (Math.max(...xs) - Math.min(...xs)); const ky = 1 - (2 * tb) / (Math.max(...ys) - Math.min(...ys));
      sh.holes.push(new THREE.Path(outline.map(([x, y]) => new THREE.Vector2(cx + (x - cx) * kx, cy + (y - cy) * ky))));
      g = new THREE.ExtrudeGeometry(sh, { depth: d * 0.9, bevelEnabled: true, bevelThickness: d * 0.05, bevelSize: d * 0.04, bevelSegments: 2 });
      g.translate(0, 0, -d * 0.45); g.scale(MM, MM, MM);
      step = d * 2.0; frame = 'roll';
      break;
    }
    case 'cup': g = new THREE.CylinderGeometry(d * 0.55 * MM, d * 0.45 * MM, d * 0.6 * MM, 20); step = d * 1.16; break;
    default: g = null; step = d; frame = 'sweep'; // rope, wheat, singapore, snake, herringbone: continuous swept strands
  }
  return { g, step, lk, frame };
}

/** Chains that are not made of separate rings: strands swept along the whole chain, so nothing can intersect. */
function sweptChain(lk, d, curve, mat) {
  const grp = new THREE.Group();
  const L = curve.getLength() / MM;
  const flat = lk.shape === 'tube-flat';
  const tube = lk.shape === 'tube' || flat;
  const strands = tube ? 1 : lk === LINKS.wheat ? 4 : lk === LINKS.singapore ? 2 : 2;
  const R = tube ? 0 : d * 0.55; const r = tube ? d * 0.6 : d * (strands > 2 ? 0.36 : 0.5); const lead = d * (strands > 2 ? 3.4 : 3.2);
  const N = Math.min(2400, Math.max(200, Math.round(L / (d * 0.35))));
  const T = new THREE.Vector3(); const Nn = new THREE.Vector3(); const B = new THREE.Vector3();
  for (let s = 0; s < strands; s++) {
    const pts = [];
    for (let i = 0; i < N; i++) {
      const t = i / N; const p = curve.getPointAt(t); curve.getTangentAt(t, T);
      Nn.copy(p).setY(p.y * 0.25).normalize(); Nn.addScaledVector(T, -Nn.dot(T)).normalize(); B.crossVectors(Nn, T).normalize();
      const ang = (t * L / lead) * Math.PI * 2 + (s / strands) * Math.PI * 2;
      pts.push(p.clone().addScaledVector(B, Math.cos(ang) * R * MM).addScaledVector(Nn, Math.sin(ang) * R * MM * (flat ? 0.3 : 1)));
    }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), N, r * MM, 8, true);
    grp.add(new THREE.Mesh(g, mat));
  }
  if (flat) grp.userData.flat = true;
  return grp;
}

/**
 * A clasp, modelled along x with its two fixing eyes at the ends. `g` is the chain's wire gauge
 * (mm) so the clasp is in proportion. Each end carries a jump ring turned across the eye: the
 * last link of the chain on that side passes through it, so the clasp is physically connected.
 * Returns { group, length (mm) }.
 */
export function claspGroup(id, g, mat, chainWidth = g * 3) {
  const grp = new THREE.Group(); const mm = MM;
  const tor = (R, r, x, rot) => { const m = new THREE.Mesh(new THREE.TorusGeometry(R * mm, r * mm, 8, 20), mat); m.position.x = x * mm; if (rot) m.rotation.set(...rot); grp.add(m); return m; };
  const box = (w, h, d, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * mm, h * mm, d * mm), mat); m.position.set(x * mm, y * mm, z * mm); grp.add(m); return m; };
  const cyl = (r, l, x = 0, axis = 'x', y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r * mm, r * mm, l * mm, 18), mat); if (axis === 'x') m.rotation.z = Math.PI / 2; if (axis === 'z') m.rotation.x = Math.PI / 2; m.position.set(x * mm, y * mm, z * mm); grp.add(m); return m; };
  const eye = g * 0.95; const ew = Math.max(0.3, g * 0.3); // fixing eye radius / wire
  let L;
  switch (id) {
    case 'spring-ring': { L = g * 5.2; tor(g * 1.9, g * 0.42, 0); box(g * 0.9, g * 0.5, g * 0.5, g * 1.3, g * 1.35, 0); tor(eye * 0.7, ew, -g * 2.5, [0, 0, 0]); break; }
    case 'toggle': { L = g * 9; tor(g * 2.6, g * 0.5, -g * 1.6); cyl(g * 0.5, g * 6.4, g * 2.4, 'y'); tor(eye * 0.6, ew, g * 1.7, [0, 0, 0]); break; }
    case 'cuban-box': case 'box-clasp': case 'push-button': {
      const w = id === 'cuban-box' ? chainWidth * 1.02 : g * 3.2; const hh = id === 'cuban-box' ? g * 1.25 : g * 1.5; L = id === 'cuban-box' ? g * 6.2 : g * 5;
      box(L * 0.62, w, hh, -L * 0.14); // the box
      box(L * 0.3, w * 0.7, hh * 0.45, L * 0.3); // the tongue's base plate
      box(g * 0.5, w * 0.34, hh * 1.25, L * 0.19, 0, 0); // thumb piece
      if (id !== 'push-button') for (const sd of [1, -1]) { // figure-8 safety latches on each side
        const m = new THREE.Mesh(new THREE.TorusGeometry(g * 0.62 * mm, g * 0.14 * mm, 6, 14), mat); m.position.set(g * 0.25 * mm, sd * (w / 2 + g * 0.2) * mm, 0); m.rotation.x = Math.PI / 2; m.scale.x = 1.9; grp.add(m);
        const pin = new THREE.Mesh(new THREE.SphereGeometry(g * 0.22 * mm, 8, 6), mat); pin.position.set(g * 1.2 * mm, sd * (w / 2 + g * 0.2) * mm, 0); grp.add(pin);
      } else cyl(g * 0.3, g * 0.5, -L * 0.14, 'z', 0, hh * 0.6);
      break;
    }
    case 'fold-over': { L = g * 6.5; box(L * 0.92, g * 2.6, g * 0.5, 0, 0, -g * 0.2); box(L * 0.8, g * 2.4, g * 0.4, -L * 0.04, 0, g * 0.35); cyl(g * 0.28, g * 2.7, L * 0.42, 'y', 0, g * 0.1); box(g * 0.7, g * 1.1, g * 0.35, -L * 0.44, 0, g * 0.5); break; }
    case 'magnetic': { L = g * 4.4; cyl(g * 1.3, g * 1.9, -g * 1.02); cyl(g * 1.3, g * 1.9, g * 1.02); cyl(g * 1.34, g * 0.08, 0); break; }
    case 'barrel-screw': case 'bayonet': { L = g * 5.2; cyl(g * 0.95, g * 2.5, -g * 1.3); cyl(g * 0.95, g * 2.5, g * 1.3); for (const x of [-0.25, 0.25]) cyl(g * 1.0, g * 0.12, x * g); if (id === 'bayonet') cyl(g * 0.2, g * 0.5, g * 0.6, 'y', g * 0.9); break; }
    case 'hook-eye': case 's-hook': case 'fish-hook': {
      L = g * 6; const pts = []; for (let k = 0; k <= 30; k++) { const u = k / 30; pts.push(new THREE.Vector3((u - 0.5) * L * 0.72 * mm, Math.sin(u * Math.PI * 2) * g * (id === 'hook-eye' ? 0.75 : 1.15) * mm * (id === 'hook-eye' && u > 0.5 ? 0.2 : 1), 0)); }
      grp.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, g * 0.36 * mm, 8, false), mat));
      if (id === 'fish-hook') { const m = new THREE.Mesh(new THREE.SphereGeometry(g * 1.1 * mm, 14, 10), mat); m.scale.set(1.9, 1, 0.75); m.position.x = -L * 0.16 * mm; grp.add(m); }
      break;
    }
    case 'slide-bead': case 'ball-connector': { L = g * 3; const m = new THREE.Mesh(new THREE.SphereGeometry(g * 1.5 * mm, 18, 12), mat); if (id === 'ball-connector') m.scale.set(1.5, 0.75, 0.75); grp.add(m); break; }
    default: { // lobster claw (and swivel): teardrop body, a sprung trigger, and the claw tip closing the loop
      L = g * 6.2; const sh = new THREE.Shape(); const a = g * 2.9; const bq = g * 1.55;
      sh.moveTo(-a, 0); sh.bezierCurveTo(-a, bq * 1.1, a * 0.55, bq * 1.25, a, bq * 0.25); sh.lineTo(a * 0.92, 0); sh.bezierCurveTo(a * 0.6, -bq * 1.2, -a * 0.6, -bq * 1.15, -a, 0);
      const hole = new THREE.Path(); hole.absellipse(a * 0.2, 0, a * 0.52, bq * 0.55, 0, Math.PI * 2, true); sh.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: g * 0.75, bevelEnabled: true, bevelThickness: g * 0.14, bevelSize: g * 0.12, bevelSegments: 2 }); geo.translate(0, 0, -g * 0.375); geo.scale(mm, mm, mm);
      grp.add(new THREE.Mesh(geo, mat));
      box(g * 0.9, g * 0.55, g * 0.5, -a * 0.2, -bq * 1.05, 0); // trigger
      if (id === 'lobster-swivel') { cyl(g * 0.55, g * 0.9, -a - g * 0.5); L += g * 1.2; }
      break;
    }
  }
  // connection: fixing eye at each end + a jump ring turned through it that the chain's end link passes through
  for (const sd of [-1, 1]) { tor(eye * 0.62, ew, sd * (L / 2 - eye * 0.2), [Math.PI / 2, 0, 0]); tor(eye * 0.95, ew, sd * (L / 2 + eye * 0.75), [0, 0, 0]); }
  const length = L + eye * 3.4;
  return { group: grp, length };
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
  if (frame === 'sweep') {
    const sw = sweptChain(lk, spec.gauge || 1, curve, metalMat);
    { const c2 = claspGroup(spec.clasp || 'lobster', spec.gauge || 1, metalMat); const back = curve.getPointAt(0.5); const tanB = curve.getTangentAt(0.5); const Nb = back.clone().setY(back.y * 0.25).normalize(); Nb.addScaledVector(tanB, -Nb.dot(tanB)).normalize(); c2.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tanB, new THREE.Vector3().crossVectors(Nb, tanB).normalize(), Nb)); c2.group.position.copy(back); sw.add(c2.group); }
    sw.userData.curve = curve;
    return sw;
  }
  const gz = spec.gauge || 1;
  const clasp = claspGroup(spec.clasp || 'lobster', gz, metalMat, (LINK_DIMS[spec.link]?.b || 1.4) * 2 * gz + gz);
  const half = (clasp.length / 2) * MM / curve.getLength(); // as a fraction of the chain
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
    // leave room for the clasp at the back of the neck / wrist so it does not sit inside the links
    const gap = Math.abs(t - 0.5) < half; // the clasp takes the place of these links, its jump rings meeting the links either side
    m.compose(p, q, gap ? new THREE.Vector3(0, 0, 0) : new THREE.Vector3(s, 1, 1));
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
  // clasp at the back, lying along the chain, flat side out
  { const back = curve.getPointAt(0.5); const tanB = curve.getTangentAt(0.5); const Nb = back.clone().setY(back.y * 0.25).normalize(); Nb.addScaledVector(tanB, -Nb.dot(tanB)).normalize(); const Bb = new THREE.Vector3().crossVectors(Nb, tanB).normalize();
    clasp.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(tanB, Bb, Nb)); clasp.group.position.copy(back); grp.add(clasp.group); }
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
