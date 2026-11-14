// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * 3D viewer. Performance rules:
 *  - render on demand: frames are drawn only while the cloth is moving, the
 *    camera orbits, or something changed; otherwise the GPU idles
 *  - idle auto-orbit renders at ~30 fps; pauses while the pointer is down
 *  - garment geometry reads positions/normals straight from solver memory
 *  - pixel ratio capped (1.5 desktop / 1.25 mobile), one env map, no shadows
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { resolveFabric } from '../core/fabrics.js';
import { resolveTrim, ZIPPER_TYPES, ZIPPER_SIZES, EDGE_TREATMENTS, zipperSpec } from '../core/trims.js';
import { resolveStitch } from '../core/assembly.js';
import { DYES } from '../core/color.js';
import { bodyFor } from '../core/sizes.js';
import { buildAvatar, gradePoint } from '../sim/avatar.js';
import { MANNEQUINS } from '../sim/mannequins.js';
import { legwearTop } from '../core/legwear.js';
import { panelAnchor, layerRank } from '../sim/cloth.js';
import { fabricTextures } from './textures.js';
import { buildCollar } from './collars.js';
import { designBitmap, previewCanvas, loadArtwork, artworkReady, STITCH_TYPES } from '../make/embroidery.js';
import { customBodyMesh, bodyField, sampleField } from '../sim/bodyfield.js';
import { buildJewelry, metalMaterial, gemMaterial } from './jewelry3d.js';
import { loadModel, deformGeometry } from '../io/import.js';
import { METALS } from '../core/jewelry.js';

const OVERLAY_TINT = { lapel: 0.92, collar: 0.95, cuff: 0.9, band: 0.88, waistband: 0.9, pocket: 0.97, flap: 0.94, placket: 0.96, yoke: 0.98, hood: 0.93, belt: 0.85, fly: 0.97, vent: 0.7, pleat: 0.75, pinch: 0.8 };

/**
 * How each kind of material meets the light. Matte fibres scatter (high roughness, almost no
 * specular); filament weaves like satin and silk show a soft directional lustre; pile (velvet,
 * fleece, fur) glows at grazing angles (sheen) but has no highlight; leathers range from dry
 * suede to waxy pull-up to mirror patent; coated shells and vinyl carry a clear top coat.
 * First match wins.
 */
const SHADING = [
  [/patent|vinyl|pvc|latex/, { roughness: 0.18, sheen: 0, clearcoat: 1, clearcoatRoughness: 0.06, specular: 1, env: 1.25, bump: 0.15 }],
  [/suede|nubuck/, { roughness: 1, sheen: 0.9, sheenRoughness: 0.9, specular: 0.05, env: 0.5, bump: 0.9 }],
  [/shearling|fur|sherpa|teddy/, { roughness: 1, sheen: 1, sheenRoughness: 0.85, specular: 0.02, env: 0.45, bump: 1.6 }],
  [/leather-lambskin|nappa|calf|kid|goat/, { roughness: 0.48, sheen: 0.15, clearcoat: 0.25, clearcoatRoughness: 0.45, specular: 0.7, env: 0.95, bump: 0.5 }],
  [/leather|croc|snake|ostrich|vegan|pu-|faux-leather/, { roughness: 0.56, sheen: 0.1, clearcoat: 0.18, clearcoatRoughness: 0.55, specular: 0.6, env: 0.9, bump: 0.75 }],
  [/satin|charmeuse|silk-twill|acetate|cupro|lining/, { roughness: 0.32, sheen: 1, sheenRoughness: 0.25, specular: 0.8, anisotropy: 0.75, env: 1.1, bump: 0.2 }],
  [/silk|taffeta|organza/, { roughness: 0.45, sheen: 0.8, sheenRoughness: 0.35, specular: 0.6, anisotropy: 0.4, env: 1, bump: 0.3 }],
  [/chiffon|georgette|voile|tulle/, { roughness: 0.7, sheen: 0.4, sheenRoughness: 0.6, specular: 0.25, env: 0.8, bump: 0.25 }],
  [/velvet|velour|corduroy|moleskin/, { roughness: 0.95, sheen: 1, sheenRoughness: 0.55, specular: 0.05, env: 0.5, bump: 1 }],
  [/waterproof|membrane|tpu|3l|softshell|ripstop|nylon|shell|taffeta-poly/, { roughness: 0.5, sheen: 0.2, clearcoat: 0.3, clearcoatRoughness: 0.5, specular: 0.55, env: 0.95, bump: 0.35 }],
  [/waxed|oilskin|coated/, { roughness: 0.42, sheen: 0.1, clearcoat: 0.35, clearcoatRoughness: 0.4, specular: 0.6, env: 0.9, bump: 0.6 }],
  [/polyester|microfiber|spandex|lycra|swim|tricot/, { roughness: 0.6, sheen: 0.5, sheenRoughness: 0.45, specular: 0.4, env: 0.9, bump: 0.3 }],
  [/mercerized|pima|supima|sateen|poplin|shirting|lawn|broadcloth/, { roughness: 0.78, sheen: 0.35, sheenRoughness: 0.5, specular: 0.25, env: 0.75, bump: 0.35 }],
  [/fleece|terry|flannel|brushed|boiled|felt|tweed|melton/, { roughness: 1, sheen: 0.7, sheenRoughness: 0.85, specular: 0.03, env: 0.5, bump: 1.1 }],
  [/wool|worsted|suiting|cashmere|mohair|alpaca/, { roughness: 0.9, sheen: 0.45, sheenRoughness: 0.7, specular: 0.1, env: 0.6, bump: 0.6 }],
  [/denim|canvas|duck|twill|chino|linen|hemp/, { roughness: 0.95, sheen: 0.12, sheenRoughness: 0.9, specular: 0.06, env: 0.55, bump: 0.9 }],
  [/jersey|rib|pique|interlock|knit|cotton/, { roughness: 0.96, sheen: 0.25, sheenRoughness: 0.9, specular: 0.05, env: 0.55, bump: 0.7 }],
];
function shadingFor(fab) {
  const tag = `${fab.id} ${fab.family || ''} ${fab.name || ''}`.toLowerCase();
  const hit = SHADING.find(([re]) => re.test(tag));
  const base = { roughness: fab.look.roughness ?? 0.85, sheen: fab.look.sheen || 0, sheenRoughness: 0.6, clearcoat: 0, clearcoatRoughness: 0.3, specular: 0.2, anisotropy: 0, env: 0.7, bump: 0.6 };
  const out = { ...base, ...(hit ? hit[1] : {}) };
  // a variant's own finish nudges the family look (e.g. mercerized = glossier, washed = drier)
  if (hit && fab.look.roughness != null) out.roughness = Math.max(0.05, Math.min(1, out.roughness * 0.6 + fab.look.roughness * 0.4));
  if (/matte|washed|peached|sueded|brushed/.test(tag)) { out.roughness = Math.max(out.roughness, 0.92); out.specular *= 0.4; out.clearcoat = 0; }
  if (/gloss|polished|wet-look|metallic|lame|lurex/.test(tag)) { out.roughness = Math.min(out.roughness, 0.3); out.specular = 1; out.env = 1.2; }
  return out;
}

/** Shrink a polygon by d (cm): each vertex moves along its inward bisector. */
function insetPoly(pts, d) {
  const n = pts.length; if (n < 3) return null;
  let A = 0; for (let i = 0; i < n; i++) { const a = pts[i]; const b = pts[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
  const sg = A > 0 ? 1 : -1; const out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n]; const c = pts[i]; const q = pts[(i + 1) % n];
    let ax = c[0] - p[0]; let ay = c[1] - p[1]; let bx = q[0] - c[0]; let by = q[1] - c[1];
    const la = Math.hypot(ax, ay) || 1; const lb = Math.hypot(bx, by) || 1; ax /= la; ay /= la; bx /= lb; by /= lb;
    let nx = -(ay + by) * sg; let ny = (ax + bx) * sg; const nl = Math.hypot(nx, ny);
    if (nl < 1e-6) { out.push([c[0], c[1]]); continue; }
    nx /= nl; ny /= nl;
    const k = Math.min(3, 1 / Math.max(0.3, Math.sqrt((1 + ax * bx + ay * by) / 2)));
    out.push([c[0] + nx * d * k, c[1] + ny * d * k]);
  }
  return out;
}
/** Offset an open path by d (cm) towards the inside of the piece. */
function offsetPath(path, d, outline) {
  const out = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)]; const b = path[Math.min(path.length - 1, i + 1)];
    let tx = b[0] - a[0]; let ty = b[1] - a[1]; const l = Math.hypot(tx, ty); if (l < 1e-6) continue; tx /= l; ty /= l;
    let x = path[i][0] - ty * d; let y = path[i][1] + tx * d;
    if (!pointInPoly(x, y, outline)) { x = path[i][0] + ty * d; y = path[i][1] - tx * d; if (!pointInPoly(x, y, outline)) continue; }
    out.push([x, y]);
  }
  return out;
}
function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]; const [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export class Viewer {
  constructor(container) {
    this.container = container;
    const mobile = matchMedia('(pointer: coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.setBackground('#eceae6');
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#b9b2a6', 0.6));
    const key = new THREE.DirectionalLight('#ffffff', 1.1);
    key.position.set(1.5, 3, 2.5);
    this.scene.add(key);
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.005, 50);
    this.camera.position.set(0, 1.25, 3.2);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.05, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 0.04;
    this.controls.maxDistance = 8;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.autoOrbit = !this.reducedMotion;
    this.controls.autoRotate = this.autoOrbit;
    this.controls.autoRotateSpeed = 0.55; // slow, natural turntable
    this.controls.addEventListener('change', () => (this.dirty = true));
    const el = this.renderer.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', () => { this.controls.autoRotate = false; clearTimeout(this._resume); });
    const resume = () => { clearTimeout(this._resume); this._resume = setTimeout(() => { this.controls.autoRotate = this.autoOrbit; this.dirty = true; }, 2500); };
    el.addEventListener('pointerup', resume);
    el.addEventListener('pointercancel', resume);
    this.garment = new THREE.Group();
    this.scene.add(this.garment);
    this.avatarGroup = new THREE.Group();
    this.scene.add(this.avatarGroup);
    this.stand = new THREE.Group();
    this.scene.add(this.stand);
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.MeshStandardMaterial({ color: '#dcd8d0', roughness: 1 }));
    this.floor.rotation.x = -Math.PI / 2;
    this.scene.add(this.floor);
    this.panelMeshes = [];
    this.overlays = [];
    this.trimObjs = [];
    this.stitchLines = [];
    this.sim = null;
    this.simAwake = false;
    this.dirty = true;
    this._frame = 0;
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  setBackground(c) { this.scene.background = new THREE.Color(c); this.dirty = true; }
  setAutoOrbit(on) { this.autoOrbit = on; this.controls.autoRotate = on; this.dirty = true; }

  resize() {
    const w = this.container.clientWidth || 1; const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  tick() {
    const orbiting = this.controls.autoRotate;
    this.controls.update();
    if (this.simAwake && this.sim) {
      if (this._grab) { // hold the pinched cloth at the pointer (limited reach so it cannot be torn off the body)
        const g = this._grab; const P = this.sim.pos; const Q = this.sim.prev;
        g.ids.forEach((i, k) => { const x = g.target.x + g.off[k].x; const y = Math.max(0.01, g.target.y + g.off[k].y); const z = g.target.z + g.off[k].z; this.sim.inv[i] = 0; P[i * 3] += (x - P[i * 3]) * 0.35; P[i * 3 + 1] += (y - P[i * 3 + 1]) * 0.35; P[i * 3 + 2] += (z - P[i * 3 + 2]) * 0.35; Q[i * 3] = P[i * 3]; Q[i * 3 + 1] = P[i * 3 + 1]; Q[i * 3 + 2] = P[i * 3 + 2]; });
      }
      const mv = this.sim.step(1 / 60);
      this.onStep?.(mv);
      this.updateGarment();
      this._simFrames = (this._simFrames || 0) + 1;
      if (this._simFrames % 10 === 1) this.coverBody();
      if (mv < 6e-5) this._still = (this._still || 0) + 1; else this._still = 0;
      // sleep when settled (or after 12 s): zero CPU/GPU while idle
      if (!this._grab && ((this._still > 40 && this.sim.settled?.()) || this._simFrames > 720)) {
        this.simAwake = false;
        if (this.project?.shells?.length && this._mannequinMesh && !this._shellMeshes?.length) this.addShells(this.project, bodyFor(this.project));
        this.coverBody();
        this.onSleep?.();
      }
      this.dirty = true;
    }
    this._frame++;
    // idle orbit at ~30 fps saves power
    if (this.dirty || (orbiting && this._frame % 2 === 0)) {
      this.renderer.render(this.scene, this.camera);
      this.dirty = false;
    }
  }

  clearGarment() {
    for (const o of [...this.garment.children]) { this.garment.remove(o); o.traverse?.((c) => { c.geometry?.dispose?.(); }); }
    this.panelMeshes = []; this.overlays = []; this.trimObjs = []; this.stitchLines = [];
    if (!this.sim) this.coverBody?.();
  }

  showAvatar(project) {
    this.avatarGroup.clear();
    this.stand.clear();
    const mat = this._mannequinMat ||= new THREE.MeshStandardMaterial({ color: '#9aa1ab', roughness: 0.55, metalness: 0.02 }); // cool grey mannequin contrasts with fabrics
    mat.color.set(project.look?.skin || '#9aa1ab'); mat.roughness = project.look?.skin ? 0.62 : 0.55;
    if (project.mode === 'jewelry') { this.floor.visible = false; return; }
    this.floor.visible = true;
    if (project.display?.avatar === false) {
      // product stand for bags
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.3, 8), new THREE.MeshStandardMaterial({ color: '#888', metalness: 0.8, roughness: 0.3 }));
      rod.position.set(0, 0.65, -0.25); this.stand.add(rod);
      for (const c of project.colliders || []) this.stand.add(this.capsule(c, new THREE.MeshStandardMaterial({ color: '#cfcac2', transparent: true, opacity: 0.0 })));
      return;
    }
    const body = bodyFor(project);
    const cm = body.customMesh && customBodyMesh(body.customMesh);
    if (cm) { // your own mannequin
      if (this._customKey !== body.customMesh) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(cm.P, 3)); g.setIndex(new THREE.BufferAttribute(cm.idx, 1)); g.computeVertexNormals(); this._customMesh = new THREE.Mesh(g, mat); this._customKey = body.customMesh; }
      this._wantKey = `custom:${body.customMesh}`;
      this.avatarGroup.add(this._customMesh);
      return;
    }
    const key = `${body.mannequin}:${JSON.stringify(body._scales, (k, v) => (k === 'L' ? undefined : v))}`;
    this._wantKey = key;
    if (this._mannequinKey === key && this._mannequinMesh) { this.avatarGroup.add(this._mannequinMesh); this.addShells(project, body); return; }
    // capsule stand-in until the mesh has loaded
    for (const c of buildAvatar(body)) this.avatarGroup.add(this.capsule(c, mat));
    this.loadMannequin(body, key, mat);
  }

  /** Hosiery & socks: skin-tight layers that follow the graded mannequin surface. */
  addShells(project, body) {
    try { this._addShells(project, body); } catch (e) { console.warn('hosiery layer failed', e); }
  }

  _addShells(project, body) {
    for (const m of this._shellMeshes || []) { this.avatarGroup.remove(m); m.geometry.dispose(); }
    this._shellMeshes = [];
    const base = this._mannequinMesh;
    if (!base || !project?.shells?.length) return;
    const g = base.geometry; const ref = g.userData.ref; const pos = g.userData.restAttr || g.attributes.position; const nor = g.userData.restNor || g.attributes.normal; const idx = g.index;
    const L = MANNEQUINS[body.mannequin].landmarks;
    const triCount = idx ? idx.count / 3 : pos.count / 3;
    const vi = (t, k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k);
    // foot extents for toe / heel reinforcement
    let toeZ = -9; let heelZ = 9;
    for (let i = 0; i < pos.count; i++) if (ref[i * 3 + 1] < 0.05) { toeZ = Math.max(toeZ, ref[i * 3 + 2]); heelZ = Math.min(heelZ, ref[i * 3 + 2]); }
    for (const sh of project.shells) {
      const top = legwearTop(sh.type, body.mannequin);
      // The foot of a sock or stocking is one smooth pouch: it bridges the gaps between the toes
      // instead of following each toe. The toe area is relaxed like stretched knit, then kept
      // outside the foot by the fabric thickness.
      const mitt = new Map(); const caps = []; let capZ = 9; // capZ: forward of this (reference frame) the toe cap replaces the per-toe surface
      if (!sh.footless) {
        // envelope of the forefoot: for every slice along the foot and every direction round it,
        // the furthest the foot reaches. The sock lies on that envelope, bridging between the toes.
        const z0 = toeZ - 0.085; const SL = 0.004; const NA = 20;
        for (const sd of [1, -1]) {
          const vs = []; for (let i = 0; i < pos.count; i++) if (ref[i * 3 + 1] < 0.085 && ref[i * 3 + 2] > z0 && Math.sign(ref[i * 3] || 1) === sd) vs.push(i);
          if (!vs.length) continue;
          const zmin = Math.min(...vs.map((i) => pos.getZ(i))); const nz = Math.ceil((Math.max(...vs.map((i) => pos.getZ(i))) - zmin) / SL) + 1;
          const cx = new Float32Array(nz); const cy = new Float32Array(nz); const cn = new Float32Array(nz);
          const zi = (i) => Math.min(nz - 1, Math.max(0, Math.round((pos.getZ(i) - zmin) / SL)));
          for (const i of vs) { const k = zi(i); cx[k] += pos.getX(i); cy[k] += pos.getY(i); cn[k]++; }
          let lx = 0; let ly = 0.03; for (let k = 0; k < nz; k++) { if (cn[k]) { cx[k] /= cn[k]; cy[k] /= cn[k]; lx = cx[k]; ly = cy[k]; } else { cx[k] = lx; cy[k] = ly; } }
          for (let it = 0; it < 3; it++) for (let k = 1; k < nz - 1; k++) { cx[k] = (cx[k - 1] + 2 * cx[k] + cx[k + 1]) / 4; cy[k] = (cy[k - 1] + 2 * cy[k] + cy[k + 1]) / 4; }
          const R = new Float32Array(nz * NA);
          const ai = (i, k) => (Math.round(((Math.atan2(pos.getY(i) - cy[k], pos.getX(i) - cx[k]) + Math.PI) / (2 * Math.PI)) * NA) % NA + NA) % NA;
          for (const i of vs) { const k = zi(i); const a = ai(i, k); const r = Math.hypot(pos.getX(i) - cx[k], pos.getY(i) - cy[k]); if (r > R[k * NA + a]) R[k * NA + a] = r; }
          // close the gaps: each direction takes at least the average of its neighbours (round the foot and along it)
          for (let it = 0; it < 6; it++) for (let k = 0; k < nz; k++) for (let a = 0; a < NA; a++) {
            const l = R[k * NA + (a + NA - 1) % NA]; const r = R[k * NA + (a + 1) % NA]; const f = R[Math.max(0, k - 1) * NA + a]; const g2 = R[Math.min(nz - 1, k + 1) * NA + a];
            R[k * NA + a] = Math.max(R[k * NA + a], (l + r) / 2, (f + g2) / 2 * 0.98);
          }
          for (let it = 0; it < 14; it++) for (let k = 0; k < nz; k++) for (let a = 0; a < NA; a++) { // fill directions no toe reaches, then soften
            const l = R[k * NA + (a + NA - 1) % NA]; const r = R[k * NA + (a + 1) % NA];
            R[k * NA + a] = Math.max(R[k * NA + a], (l + r) / 2 * 0.985);
          }
          // a clean knitted toe: one smooth cap swept from the ball of the foot to the tip
          const k0 = Math.max(0, Math.round((z0 + 0.012 - zmin) / SL)); const pad = sh.thickness + 0.0016;
          const ring = (k, sc) => { const out = []; for (let a = 0; a < NA; a++) { const th = (a / NA) * 2 * Math.PI - Math.PI; const rr = (R[k * NA + a] + pad) * sc; out.push([cx[k] + Math.cos(th) * rr, Math.max(0.0012, cy[k] + Math.sin(th) * rr), zmin + k * SL + (sc < 1 ? (1 - sc) * 0.006 : 0)]); } return out; };
          const rings = []; for (let k = k0; k < nz; k++) rings.push(ring(k, 1));
          rings.push(ring(nz - 1, 0.72), ring(nz - 1, 0.36)); const tip = [cx[nz - 1], cy[nz - 1], zmin + (nz - 1) * SL + 0.0075];
          const tri = [];
          for (let q = 0; q + 1 < rings.length; q++) for (let a = 0; a < NA; a++) { const b2 = (a + 1) % NA; tri.push(rings[q][a], rings[q + 1][a], rings[q][b2], rings[q][b2], rings[q + 1][a], rings[q + 1][b2]); }
          const lastR = rings[rings.length - 1]; for (let a = 0; a < NA; a++) tri.push(lastR[a], tip, lastR[(a + 1) % NA]);
          caps.push({ tri, cx, cy, zmin, SL, nz });
          capZ = Math.min(capZ, z0 + 0.02);
        }
        this._shellField = bodyField(body);
      }
      const regions = [{ from: sh.footless ? 0.07 : -1, to: top, look: sh.look, off: sh.thickness }];
      for (const b of sh.bands || []) regions.push({ from: top + b.from, to: top + b.to, look: b.look, off: sh.thickness * 1.6 });
      if (sh.toe) regions.push({ from: -1, to: 0.06, zMin: toeZ - 0.06, look: sh.toe.look, off: sh.thickness * 1.4 });
      if (sh.heel) regions.push({ from: -1, to: sh.heel.cuban ? 0.09 : 0.07, zMax: heelZ + 0.05, look: sh.heel.look, off: sh.thickness * 1.4 });
      for (const rg of regions) {
        const P = []; const N = []; const UV = [];
        for (let t = 0; t < triCount; t++) {
          const ids = [vi(t, 0), vi(t, 1), vi(t, 2)];
          let ok = true;
          for (const i of ids) {
            const x = ref[i * 3]; const y = ref[i * 3 + 1]; const z = ref[i * 3 + 2];
            if (y > rg.to || y < rg.from) { ok = false; break; }
            if (Math.abs(x) > L.armStartX && y > L.crotchY) { ok = false; break; } // never the arms
            if (rg.zMin != null && z < rg.zMin) { ok = false; break; }
            if (rg.zMax != null && z > rg.zMax) { ok = false; break; }
          }
          if (ok && caps.length && ids.every((i) => ref[i * 3 + 2] > capZ && ref[i * 3 + 1] < 0.085)) ok = false;
          if (!ok) continue;
          for (const i of ids) {
            const x = ref[i * 3]; const y = ref[i * 3 + 1]; const z = ref[i * 3 + 2];
            const cx = y < L.crotchY ? Math.sign(x || 1) * L.legX : 0;
            const ang = Math.atan2(z, x - cx);
            const mp = mitt.get(i); const extra = rg.off - sh.thickness;
            if (mp) P.push(mp[0] + nor.getX(i) * extra, mp[1] + nor.getY(i) * extra, mp[2] + nor.getZ(i) * extra);
            else P.push(pos.getX(i) + nor.getX(i) * rg.off, pos.getY(i) + nor.getY(i) * rg.off, pos.getZ(i) + nor.getZ(i) * rg.off);
            // smooth shading over the toe pouch: use the direction away from the foot, not the toe's own normal
            const fN = mp && this._shellField && sampleField(this._shellField, mp[0], mp[1], mp[2], this._o4 ||= [0, 0, 0, 0]) ? this._o4 : null;
            const gl = fN ? Math.hypot(fN[1], fN[2], fN[3]) : 0;
            if (gl > 1e-7) N.push(fN[1] / gl, fN[2] / gl, fN[3] / gl); else N.push(nor.getX(i), nor.getY(i), nor.getZ(i));
            UV.push((ang * 0.07) / 0.1, y / 0.1);
          }
        }
        if (rg === regions[0]) for (const c of caps) for (const q of c.tri) { const k = Math.min(c.nz - 1, Math.max(0, Math.round((q[2] - c.zmin) / c.SL))); let nx = q[0] - c.cx[k]; let ny = q[1] - c.cy[k]; const nl = Math.hypot(nx, ny) || 1; P.push(q[0], q[1], q[2]); N.push(nx / nl * 0.94, ny / nl * 0.94, 0.34); UV.push((Math.atan2(ny, nx) * 0.07) / 0.1, q[1] / 0.1); }
        if (!P.length) continue;
        const sg = new THREE.BufferGeometry();
        sg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
        sg.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
        sg.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
        const look = rg.look;
        const tex = fabricTextures({ look }, look.print ? { print: { design: look.print, colors: look.patternColors, scale: 0.15 } } : {}, null, () => this.addShells(this.project, body), look.patternScale || 8);
        const srep = (look.patternScale || 8) / (tex.k || 1);
        const map = tex.map.clone(); map.repeat.set(srep, srep); map.needsUpdate = true;
        const cutout = look.pattern === 'fishnet' || look.pattern === 'lace';
        const mat = new THREE.MeshPhysicalMaterial({ map, color: '#ffffff', roughness: look.roughness, sheen: look.sheen, sheenColor: new THREE.Color(look.sheenColor || '#fff'), metalness: look.metalness || 0, transparent: look.opacity < 1 || cutout, opacity: look.opacity, alphaTest: cutout ? 0.35 : 0, depthWrite: look.opacity >= 0.9, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(sg, mat);
        this.avatarGroup.add(mesh);
        this._shellMeshes.push(mesh);
      }
      if (sh.backSeam) {
        for (const sd of [1, -1]) {
          const pts = [];
          for (let y = 0.07; y < top; y += 0.02) {
            let best = -1; let bz = 9;
            for (let i = 0; i < pos.count; i++) { const ry = ref[i * 3 + 1]; const rx = ref[i * 3]; if (Math.abs(ry - y) < 0.012 && Math.sign(rx) === sd && Math.abs(Math.abs(rx) - L.legX) < 0.03 && ref[i * 3 + 2] < bz) { bz = ref[i * 3 + 2]; best = i; } }
            if (best >= 0) pts.push(new THREE.Vector3(pos.getX(best) + nor.getX(best) * 0.002, pos.getY(best), pos.getZ(best) + nor.getZ(best) * 0.002));
          }
          // smooth (moving average) so the seam reads as a straight, clean line
          for (let it = 0; it < 3; it++) for (let i = 1; i < pts.length - 1; i++) { pts[i].x = (pts[i - 1].x + pts[i].x * 2 + pts[i + 1].x) / 4; pts[i].z = (pts[i - 1].z + pts[i].z * 2 + pts[i + 1].z) / 4; }
          if (pts.length > 2) { const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: sh.look.color })); this.avatarGroup.add(line); this._shellMeshes.push(line); }
        }
      }
    }
    this.coverBody(); // the body is tucked in under socks and hosiery too
    this.dirty = true;
  }

  /** CC0 MakeHuman mannequin, graded with the same transform as the colliders. */
  async loadMannequin(body, key, mat) {
    try {
      this._mannequinSrc ||= {};
      if (!this._mannequinSrc[body.mannequin]) {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const url = `${import.meta.env?.BASE_URL || './'}models/mannequin-${body.mannequin}.glb`;
        const gltf = await new GLTFLoader().loadAsync(url);
        let geo = null;
        gltf.scene.traverse((o) => { if (o.isMesh && !geo) geo = o.geometry; });
        this._mannequinSrc[body.mannequin] = geo;
      }
      const src = this._mannequinSrc[body.mannequin];
      const M = MANNEQUINS[body.mannequin];
      const g = src.clone();
      const p = g.attributes.position;
      let minY = Infinity; for (let i = 0; i < p.count; i++) minY = Math.min(minY, p.getY(i));
      const ref = new Float32Array(p.count * 3); // reference-frame positions (for hosiery regions / UVs)
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) * M.scale; const y = (p.getY(i) - minY) * M.scale; const z = p.getZ(i) * M.scale - M.zOffset;
        ref[i * 3] = x; ref[i * 3 + 1] = y; ref[i * 3 + 2] = z;
        p.setXYZ(i, ...gradePoint(body, x, y, z));
      }
      g.userData.ref = ref;
      g.computeVertexNormals();
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat);
      if (this._mannequinKey !== key) this._mannequinMesh?.geometry.dispose();
      this._mannequinKey = key;
      this._mannequinMesh = mesh;
      if (this.project?.mode !== 'jewelry' && this.project?.display?.avatar !== false && this._wantKey === key) {
        this.avatarGroup.clear();
        this._shellMeshes = [];
        this.avatarGroup.add(mesh);
        this.addShells(this.project, body);
        this.dirty = true;
      }
    } catch (e) { console.warn('mannequin load failed, using capsules', e); }
  }

  capsule(c, mat) {
    const a = new THREE.Vector3(...c.a); const b = new THREE.Vector3(...c.b);
    const len = a.distanceTo(b);
    const g = len < 1e-4 ? new THREE.SphereGeometry(c.r, 24, 16) : new THREE.CapsuleGeometry(c.r, len, 8, 20);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    if (len >= 1e-4) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.scale.z = c.zs; // elliptical depth (approximate in local frame)
    return m;
  }

  /** Build meshes for a project + its simulation. */
  setProject(project, sim) {
    this.project = project;
    this.clearGarment();
    this.showAvatar(project);
    if (project.mode === 'jewelry') { this.setJewelry(project.jewelry); return; }
    this.sim = sim;
    if (!sim) return;
    for (const pan of sim.panels) {
      if (!pan.count) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(sim.pos.subarray(pan.offset * 3, (pan.offset + pan.count) * 3), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(sim.nor.subarray(pan.offset * 3, (pan.offset + pan.count) * 3), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(sim.uv.subarray(pan.offset * 2, (pan.offset + pan.count) * 2), 2));
      g.setIndex(new THREE.BufferAttribute(pan.tris, 1));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, this.materialFor(project, pan.panel));
      // outer layers always win where two layers lie close together, so an inner piece never flickers through
      const rank = layerRank(project, pan.panel) + (pan.panel.zBias ? 0.5 : 0);
      if (rank > 0) { mesh.material.polygonOffset = true; mesh.material.polygonOffsetFactor = -2 * rank; mesh.material.polygonOffsetUnits = -6 * rank; }
      mesh.renderOrder = rank;
      mesh.userData.panelId = pan.id;
      mesh.frustumCulled = false;
      this.garment.add(mesh);
      this.panelMeshes.push(mesh);
    }
    this.buildOverlays(project, sim);
    this.buildTrims(project, sim);
    this.buildStitches(project, sim);
    this.updateGarment();
    if (this.fitMap) this.setFitMap(true);
    this.simAwake = true;
    this._still = 0;
    this._simFrames = 0;
    this.dirty = true;
  }

  /** Re-apply looks only (no physics rebuild). */
  refreshLooks(project) {
    this.project = project;
    if (this._mannequinMat) { this._mannequinMat.color.set(project.look?.skin || '#9aa1ab'); }
    for (const m of this.panelMeshes) { const pan = project.panels.find((p) => p.id === m.userData.panelId); if (pan) { m.material.dispose(); m.material = this.materialFor(project, pan); } }
    if (this.sim) { for (const o of this.overlays) this.garment.remove(o.mesh); for (const t of this.trimObjs) this.garment.remove(t.obj); for (const s of this.stitchLines) this.garment.remove(s.line); this.overlays = []; this.trimObjs = []; this.stitchLines = []; this.buildOverlays(project, this.sim); this.buildTrims(project, this.sim); this.buildStitches(project, this.sim); this.updateGarment(); }
    this.dirty = true;
  }

  materialFor(project, panel, overrideFabric, tint = 1) {
    const fab = resolveFabric(project, overrideFabric || panel.fabric, overrideFabric ? {} : panel.fabricOverrides);
    const finish = panel.finish || {};
    const dyeFx = finish.dye ? DYES[finish.dye]?.effect : null;
    const tex = fabricTextures(fab, finish, dyeFx, () => this.refreshLooks(this.project));
    const map = tex.map.clone(); const bump = tex.bump.clone();
    const rep = (fab.look.patternScale || 6) / (tex.k || 1);
    map.repeat.set(rep, rep); bump.repeat.set(rep, rep);
    map.needsUpdate = true; bump.needsUpdate = true;
    const metallicPrint = finish.print?.method && ['foil', 'glitter', 'reflective'].includes(finish.print.method);
    const sh = shadingFor(fab);
    return new THREE.MeshPhysicalMaterial({
      map, bumpMap: bump, bumpScale: sh.bump,
      color: new THREE.Color(tint, tint, tint),
      roughness: sh.roughness, metalness: metallicPrint ? 0.6 : fab.look.metalness || 0,
      sheen: sh.sheen, sheenColor: new THREE.Color(fab.look.sheenColor || '#ffffff'), sheenRoughness: sh.sheenRoughness,
      clearcoat: sh.clearcoat, clearcoatRoughness: sh.clearcoatRoughness,
      specularIntensity: sh.specular, anisotropy: sh.anisotropy, envMapIntensity: sh.env,
      transparent: (fab.look.opacity ?? 1) < 1 || fab.look.pattern === 'lace' || fab.look.pattern === 'mesh',
      opacity: fab.look.opacity ?? 1, alphaTest: fab.look.pattern === 'lace' || fab.look.pattern === 'mesh' ? 0.3 : 0,
      side: THREE.DoubleSide,
    });
  }

  buildOverlays(project, sim) {
    for (const ov of project.overlays || []) {
      const panel = project.panels.find((p) => p.id === ov.panel);
      if (!panel) continue;
      if (ov.hidden) continue; // cut-list piece drawn elsewhere (e.g. 3D collars)
      if (ov.inside) { // inside pocket: only its stitching shows through on the outside, faintly
        if (this.showInside !== false) this.addPathLine(sim, ov.panel, [...ov.points, ov.points[0]], 0.0012, this.threadColor(project, panel).lerp(new THREE.Color(panel.finish?.color || resolveFabric(project, panel.fabric, panel.fabricOverrides).look.color), 0.45), true);
        continue;
      }
      const pts = ov.points;
      const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
      const h = 1.0;
      const x0 = Math.min(...xs); const y0 = Math.min(...ys);
      const nx = Math.max(1, Math.ceil((Math.max(...xs) - x0) / h)); const ny = Math.max(1, Math.ceil((Math.max(...ys) - y0) / h));
      const vid = new Int32Array((nx + 1) * (ny + 1)).fill(-1);
      const anchors = []; const idx = []; const uv = [];
      const V = (i, j) => { const k = j * (nx + 1) + i; if (vid[k] < 0) { const x = x0 + i * h; const y = y0 + j * h; const a = panelAnchor(sim, ov.panel, x, y); if (!a) return -1; vid[k] = anchors.length; anchors.push(a); uv.push(x / 10, y / 10); } return vid[k]; };
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        if (!pointInPoly(x0 + (i + 0.5) * h, y0 + (j + 0.5) * h, pts)) continue;
        const a = V(i, j); const b = V(i + 1, j); const c = V(i + 1, j + 1); const d = V(i, j + 1);
        if (a < 0 || b < 0 || c < 0 || d < 0) continue;
        idx.push(a, b, c, a, c, d);
      }
      if (!idx.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(anchors.length * 3), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(anchors.length * 3), 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      let fabric = ov.fabric;
      if (!fabric && (ov.style === 'rib' || ov.kind === 'band' || ov.kind === 'cuff' && ov.style === 'rib')) fabric = 'rib-knit';
      const mat = this.materialFor(project, panel, fabric, OVERLAY_TINT[ov.kind] ?? 0.95);
      if (ov.color) mat.color.set(ov.color);
      if (fabric === 'rib-knit' && !ov.color) { const f = resolveFabric(project, panel.fabric, panel.fabricOverrides); mat.color.set(panel.finish?.color || f.look.color).multiplyScalar(0.95); mat.map = null; }
      const mesh = new THREE.Mesh(g, mat);
      mesh.frustumCulled = false;
      this.garment.add(mesh);
      const lift = ov.kind === 'vent' || ov.kind === 'pleat' ? 0.0012 : ov.kind === 'lapel' || ov.kind === 'collar' || ov.kind === 'flap' ? 0.0045 : 0.003;
      this.overlays.push({ mesh, anchors, lift });
      // every sewn-on piece gets a crisp edge and its topstitching
      if (ov.kind !== 'pleat' && !ov.hidden) {
        const base = new THREE.Color(ov.color || panel.finish?.color || resolveFabric(project, fabric || panel.fabric, fabric ? {} : panel.fabricOverrides).look.color);
        this.addPathLine(sim, ov.panel, [...pts, pts[0]], lift + 0.0007, base.clone().multiplyScalar(0.45), false);
        if (!['vent', 'yoke-line'].includes(ov.kind)) { const ins = insetPoly(pts, ov.kind === 'waistband' || ov.kind === 'band' || ov.kind === 'cuff' ? 0.5 : 0.35); if (ins) this.addPathLine(sim, ov.panel, [...ins, ins[0]], lift + 0.0009, this.threadColor(project, panel), true); }
      }
    }
  }

  buildTrims(project, sim) {
    for (const t of project.trims || []) {
      const def = resolveTrim(t.type);
      if (def.internal && !['tie-knot', 'stitch-line', 'cut-line'].includes(t.type)) continue;
      const panel = project.panels.find((p) => p.id === t.panel);
      if (!panel) continue;
      const color = t.color || (def.useFabric ? (panel.finish?.color || resolveFabric(project, panel.fabric).look.color) : def.color);
      const mat = new THREE.MeshPhysicalMaterial({ color, metalness: def.metalness, roughness: def.roughness, clearcoat: def.metalness > 0.5 ? 0.4 : 0.2, transmission: def.shape === 'crystal' ? 0.9 : 0, ior: 1.7, thickness: 0.003, iridescence: def.iridescent ? 0.8 : 0 });
      const s = (t.size || def.size) / 1000;
      if (t.type === 'cut-line') { if (t.path?.length >= 2) this.addPathLine(sim, t.panel, t.path, 0.0046, new THREE.Color('#0b0b0b'), false); continue; } // the pocket opening
      if (t.type === 'stitch-line') { if (t.path?.length >= 2) this.addPathLine(sim, t.panel, t.path, 0.0042, t.color ? new THREE.Color(t.color) : this.threadColor(project, panel), true); continue; }
      if (t.type === 'edge-trim' && t.path?.length >= 2) { this.buildEdgeTrim(t, sim, color); continue; }
      if (t.type === 'lacing' && t.to) { this.buildLacing(t, sim); continue; }
      if (t.type.startsWith('zipper') && t.to) { this.buildZipper(t, sim); continue; }
      if (def.line && t.to) {
        const anchors = [];
        if (t.toPanel) anchors.push(panelAnchor(sim, t.panel, t.at[0], t.at[1]), panelAnchor(sim, t.toPanel, t.to[0], t.to[1]));
        else {
          const n = Math.max(2, Math.round(Math.hypot(t.to[0] - t.at[0], t.to[1] - t.at[1]) / (def.strap ? 2 : 0.6)));
          for (let k = 0; k <= n; k++) anchors.push(panelAnchor(sim, t.panel, t.at[0] + ((t.to[0] - t.at[0]) * k) / n, t.at[1] + ((t.to[1] - t.at[1]) * k) / n));
        }
        if (anchors.some((a) => !a)) continue;
        let obj;
        if (def.strap) { mat.side = THREE.DoubleSide; mat.roughness = 0.8; obj = new THREE.Mesh(new THREE.BufferGeometry(), mat); }
        else {
          const geo = def.chain ? new THREE.TorusGeometry(s * 0.5, s * 0.15, 6, 10) : def.fringe ? new THREE.CylinderGeometry(0.0008, 0.0008, s, 4) : def.tape ? new THREE.BoxGeometry(0.006, s * 0.06 + 0.0004, s) : new THREE.BoxGeometry(s * 0.5, s * 0.25, s * 0.18);
          obj = new THREE.InstancedMesh(geo, mat, anchors.length);
        }
        obj.frustumCulled = false;
        this.garment.add(obj);
        this.trimObjs.push({ obj, anchors, line: true, def, trim: t, s });
      } else {
        const a = panelAnchor(sim, t.panel, t.at[0], t.at[1]);
        if (!a) continue;
        const obj = this.trimMesh(def, s, mat);
        this.garment.add(obj);
        this.trimObjs.push({ obj, anchors: [a], def, trim: t, s });
      }
    }
  }

  /** Sample a panel-space polyline every `step` cm into anchors. */
  pathAnchors(sim, panel, path, step = 0.8) {
    const out = [];
    for (let i = 1; i < path.length; i++) {
      const [x0, y0] = path[i - 1]; const [x1, y1] = path[i];
      const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
      for (let k = i === 1 ? 0 : 1; k <= n; k++) { const a = panelAnchor(sim, panel, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n); if (a) out.push(a); }
    }
    return out;
  }

  buildZipper(t, sim) {
    const z = zipperSpec(t.zip || (t.type === 'zipper-invisible' ? { type: 'invisible', size: '#3' } : t.type === 'zipper-coil' ? { type: 'coil' } : {}));
    const zt = ZIPPER_TYPES[z.type] || ZIPPER_TYPES.coil;
    const mm = ZIPPER_SIZES[z.size] || 5;
    const anchors = this.pathAnchors(sim, t.panel, [t.at, t.to], z.type === 'invisible' ? 1.2 : mm * 0.06 + 0.25);
    if (anchors.length < 2) return;
    const teethColor = zt.teeth || z.tape;
    const tm = new THREE.MeshPhysicalMaterial({ color: teethColor, metalness: zt.metal, roughness: zt.metal ? 0.3 : 0.5, clearcoat: zt.metal ? 0.3 : 0 });
    const w = (mm * 1.4) / 1000; const th = (mm * 0.45) / 1000;
    const teeth = z.type === 'invisible' ? null : new THREE.InstancedMesh(z.type === 'moulded' ? new THREE.BoxGeometry(w, w * 0.45, th * 1.4) : z.type.startsWith('metal') || z.type === 'premium-polished' ? new THREE.BoxGeometry(w, w * 0.55, th) : new THREE.CylinderGeometry(w * 0.18, w * 0.18, w, 6).rotateZ(Math.PI / 2), tm, anchors.length);
    const tape = new THREE.InstancedMesh(new THREE.BoxGeometry(w * 2.6, (mm * 0.55) / 1000 + 0.004, 0.0006), new THREE.MeshStandardMaterial({ color: z.tape, roughness: 0.9 }), anchors.length);
    const slider = new THREE.Group();
    const sm = new THREE.MeshPhysicalMaterial({ color: zt.metal ? teethColor : '#2a2a2a', metalness: zt.metal ? 0.9 : 0.6, roughness: 0.3 });
    slider.add(new THREE.Mesh(new THREE.BoxGeometry(w * 1.3, w * 2.2, th * 2.6), sm));
    const pullerShape = { 'leather-tab': [w * 1.2, w * 4, 0.0015, '#5a3a24'], 'cord-pull': [w * 0.35, w * 6, w * 0.35, '#111111'], ring: null, rubber: [w * 1.3, w * 3.5, 0.002, '#1a1a1a'], logo: [w * 1.4, w * 3, 0.0012, teethColor], pearl: null, standard: [w * 0.9, w * 3, 0.0008, teethColor] }[z.puller];
    if (pullerShape) { const pm = new THREE.Mesh(new THREE.BoxGeometry(pullerShape[0], pullerShape[1], pullerShape[2]), new THREE.MeshPhysicalMaterial({ color: pullerShape[3], metalness: pullerShape[3] === teethColor ? zt.metal : 0, roughness: 0.4 })); pm.position.set(0, -pullerShape[1] / 2 - w, th * 2); slider.add(pm); }
    else { const pm = new THREE.Mesh(z.puller === 'pearl' ? new THREE.SphereGeometry(w * 0.9, 12, 8) : new THREE.TorusGeometry(w * 1.1, w * 0.18, 6, 16), sm); pm.position.set(0, -w * 2.4, th * 2); slider.add(pm); }
    const grp = new THREE.Group();
    if (teeth) { teeth.frustumCulled = false; grp.add(teeth); }
    tape.frustumCulled = false; grp.add(tape); grp.add(slider);
    if (z.end === 'two-way' || z.end === 'two-way-closed') { const s2 = slider.clone(); s2.rotation.z = Math.PI; grp.add(s2); grp.userData.slider2 = s2; }
    this.garment.add(grp);
    this.trimObjs.push({ obj: grp, anchors, trim: t, zipper: { teeth, tape, slider, th } });
  }

  buildEdgeTrim(t, sim, color) {
    const ed = EDGE_TREATMENTS[t.treatment];
    if (!ed?.shape) return;
    const anchors = this.pathAnchors(sim, t.panel, t.path, { fringe: 0.5, scallop: 2.2, ruffle: 1.2, pompom: 2.5, feather: 1.5, sequin: 0.6 }[ed.shape] || 0.8);
    if (anchors.length < 2) return;
    const col = t.color || color || '#ffffff';
    const mat = new THREE.MeshPhysicalMaterial({ color: col, roughness: ed.shape === 'sequin' ? 0.15 : 0.75, metalness: ed.shape === 'sequin' ? 0.9 : 0, side: THREE.DoubleSide, sheen: 0.4 });
    let geo;
    switch (ed.shape) {
      case 'scallop': geo = new THREE.CircleGeometry(0.011, 12, Math.PI, Math.PI); break;
      case 'wave': geo = new THREE.TorusGeometry(0.004, 0.0012, 4, 8, Math.PI); break;
      case 'picot': geo = new THREE.SphereGeometry(0.0015, 6, 4); break;
      case 'ruffle': geo = new THREE.ConeGeometry(0.009, 0.03, 6, 1, true); break;
      case 'pinked': geo = new THREE.CircleGeometry(0.004, 3); break;
      case 'tube': case 'band': geo = new THREE.CylinderGeometry(ed.shape === 'tube' ? 0.002 : 0.0035, ed.shape === 'tube' ? 0.002 : 0.0035, 0.009, 8).rotateZ(Math.PI / 2); break;
      case 'blanket': geo = new THREE.BoxGeometry(0.0007, 0.006, 0.0007); break;
      case 'zigzag': geo = new THREE.BoxGeometry(0.008, 0.0015, 0.0012).rotateZ(0.7); break;
      case 'fringe': case 'fray': geo = new THREE.CylinderGeometry(0.0006, 0.0006, ed.shape === 'fringe' ? 0.06 : 0.012, 4); break;
      case 'lace': geo = new THREE.CircleGeometry(0.008, 10, Math.PI, Math.PI); mat.transparent = true; mat.opacity = 0.85; break;
      case 'pompom': geo = new THREE.SphereGeometry(0.006, 10, 8); break;
      case 'feather': geo = new THREE.ConeGeometry(0.006, 0.05, 6); break;
      case 'sequin': geo = new THREE.CylinderGeometry(0.003, 0.003, 0.0004, 10).rotateX(Math.PI / 2); break;
      default: geo = new THREE.SphereGeometry(0.002, 6, 4);
    }
    const obj = new THREE.InstancedMesh(geo, mat, anchors.length);
    obj.frustumCulled = false;
    this.garment.add(obj);
    this.trimObjs.push({ obj, anchors, edgeShape: ed.shape, line: true, def: { fringe: ['fringe', 'fray', 'feather'].includes(ed.shape) } , trim: t, s: 0.01 });
  }

  buildLacing(t, sim) {
    const n = Math.max(2, t.eyelets || 8);
    const left = []; const right = [];
    const dx = t.to[0] - t.at[0]; const dy = t.to[1] - t.at[1]; const len = Math.hypot(dx, dy) || 1;
    const px = (-dy / len) * (t.width || 5) / 2; const py = (dx / len) * (t.width || 5) / 2;
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1); const cx = t.at[0] + dx * u; const cy = t.at[1] + dy * u;
      const a = panelAnchor(sim, t.panel, cx - px, cy - py); const b = panelAnchor(sim, t.panel, cx + px, cy + py);
      if (a && b) { left.push(a); right.push(b); }
    }
    if (left.length < 2) return;
    const eyelets = new THREE.InstancedMesh(new THREE.TorusGeometry(0.0035, 0.0011, 6, 14), new THREE.MeshPhysicalMaterial({ color: '#b8b8b8', metalness: 0.9, roughness: 0.3 }), left.length * 2);
    eyelets.frustumCulled = false;
    const cord = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: t.color || '#111111', roughness: 0.7 }));
    cord.frustumCulled = false;
    const grp = new THREE.Group(); grp.add(eyelets); grp.add(cord);
    this.garment.add(grp);
    this.trimObjs.push({ obj: grp, anchors: [...left, ...right], lacing: { eyelets, cord, n: left.length, style: t.style || 'crisscross' } });
  }

  trimMesh(def, s, mat) {
    const grp = new THREE.Group();
    const add = (g, y = 0, rx = Math.PI / 2) => { const m = new THREE.Mesh(g, mat); m.rotation.x = rx; m.position.z = y; grp.add(m); return m; };
    switch (def.shape) {
      case 'button': { add(new THREE.CylinderGeometry(s / 2, s / 2, s * 0.16, 24), s * 0.08); if (def.holes) { const hm = new THREE.MeshBasicMaterial({ color: '#111' }); for (let k = 0; k < def.holes; k++) { const a = (k / def.holes) * Math.PI * 2 + Math.PI / 4; const h = new THREE.Mesh(new THREE.CircleGeometry(s * 0.06, 8), hm); h.position.set(Math.cos(a) * s * 0.14, Math.sin(a) * s * 0.14, s * 0.165); grp.add(h); } } break; }
      case 'shank': add(new THREE.SphereGeometry(s / 2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), 0, Math.PI / 2); break;
      case 'stud-dome': add(new THREE.SphereGeometry(s / 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, Math.PI / 2); break;
      case 'toggle': { const m = add(new THREE.CapsuleGeometry(s * 0.12, s * 0.75, 4, 10), s * 0.12, 0); m.rotation.z = Math.PI / 2; break; }
      case 'snap': add(new THREE.CylinderGeometry(s / 2, s / 2, s * 0.25, 20), s * 0.12); break;
      case 'rivet': add(new THREE.CylinderGeometry(s / 2, s / 2, s * 0.3, 16), s * 0.15); break;
      case 'grommet': case 'ring': add(new THREE.TorusGeometry(s * 0.4, s * 0.1, 8, 20), s * 0.08, 0); break;
      case 'stud-cone': case 'spike': add(new THREE.ConeGeometry(s * (def.shape === 'spike' ? 0.32 : 0.5), def.shape === 'spike' ? s : s * 0.55, 18), def.shape === 'spike' ? s / 2 : s * 0.27); break;
      case 'stud-pyramid': add(new THREE.ConeGeometry(s * 0.6, s * 0.45, 4), s * 0.22); break;
      case 'crystal': add(new THREE.OctahedronGeometry(s * 0.55, 0), s * 0.2); break;
      case 'pearl': case 'bead': case 'pompom': add(new THREE.SphereGeometry(def.shape === 'bead' ? s * 0.5 : s / 2, 16, 12), s / 2); break;
      case 'sequin': add(new THREE.CylinderGeometry(s / 2, s / 2, 0.0004, 16), 0.0004); break;
      case 'label': case 'patch': { const m = new THREE.Mesh(new THREE.BoxGeometry(s, s * (def.shape === 'label' ? 0.4 : 0.8), 0.0015), mat); m.position.z = 0.001; grp.add(m); break; }
      case 'buckle': { const m = new THREE.Mesh(new THREE.TorusGeometry(s * 0.45, s * 0.07, 6, 4), mat); m.rotation.z = Math.PI / 4; m.position.z = 0.003; grp.add(m); break; }
      case 'loop': { const m = new THREE.Mesh(new THREE.BoxGeometry(s * 0.9, s * 4, 0.003), mat); m.position.z = 0.0015; grp.add(m); break; }
      case 'stopper': add(new THREE.CylinderGeometry(s * 0.35, s * 0.35, s, 12), s * 0.4); break;
      case 'knot': { const m = new THREE.Mesh(new THREE.ConeGeometry(s * 0.5, s * 1.1, 12), mat); m.rotation.x = Math.PI; m.position.set(0, s * 0.3, s * 0.35); grp.add(m); break; }
      case 'tassel': add(new THREE.ConeGeometry(s * 0.2, s, 10), 0); break;
      case 'bow': { for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.ConeGeometry(s * 0.25, s * 0.5, 4), mat); m.rotation.z = sd * Math.PI / 2; m.position.set(sd * s * 0.25, 0, s * 0.05); grp.add(m); } break; }
      case 'pin': { const m = new THREE.Mesh(new THREE.TorusGeometry(s * 0.12, s * 0.02, 4, 12), mat); m.scale.y = 3; m.position.z = 0.002; grp.add(m); break; }
      default: add(new THREE.SphereGeometry(s / 2, 12, 8), s / 2);
    }
    return grp;
  }

  /** Topstitch thread: gold on denim, otherwise tonal (a shade off the cloth), unless set on the garment. */
  threadColor(project, panel) {
    const g = (project.garments || []).find((x) => x.id === panel.garment);
    if (g?.threadColor) return new THREE.Color(g.threadColor);
    const fab = resolveFabric(project, panel.fabric, panel.fabricOverrides);
    if (/denim/.test(panel.fabric) && !panel.finish?.color) return new THREE.Color('#c8912f');
    const c = new THREE.Color(panel.finish?.color || fab.look.color);
    const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    return l < 0.25 ? c.lerp(new THREE.Color('#ffffff'), 0.32) : c.multiplyScalar(0.68);
  }

  /** A line that follows the cloth along a panel-space path: solid (edge) or dashed (stitches). */
  addPathLine(sim, panelId, path, lift, color, stitches) {
    const anchors = this.pathAnchors(sim, panelId, path, stitches ? 0.3 : 0.9);
    if (anchors.length < 2) return;
    if (stitches && anchors.length % 2) anchors.pop();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(anchors.length * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(anchors.length * 3), 3));
    const line = new (stitches ? THREE.LineSegments : THREE.Line)(g, new THREE.LineBasicMaterial({ color }));
    line.frustumCulled = false;
    this.garment.add(line);
    this.overlays.push({ mesh: line, anchors, lift });
  }

  /** Construction stitching every garment ships with: hems, necklines, cuffs, armholes. */
  buildTopstitch(project, sim) {
    for (const pan of sim.panels) {
      const panel = pan.panel; if (!panel?.edges || !pan.count) continue;
      const knit = /knit|jersey|rib|fleece|terry|interlock|pique/.test(panel.fabric) || pan.fab.category === 'Knits';
      const col = this.threadColor(project, panel);
      for (const [where, path] of Object.entries(panel.edges)) {
        if (!path || path.length < 2 || panel.edgeFinish?.[where] === 'raw') continue;
        const depth = { hem: knit ? 2 : 1.2, cuff: knit ? 2 : 1, neck: 0.6, armhole: 0.6, leg: 0.8, waist: 0.6 }[where] ?? 0.8;
        const rows = knit && (where === 'hem' || where === 'cuff') ? [depth, depth - 0.6] : [depth];
        for (const dpt of rows) { const off = offsetPath(path, dpt, panel.points); if (off.length > 1) this.addPathLine(sim, panel.id, off, 0.0012, col, true); }
      }
    }
  }

  /** 3D collars, neckbands and hoods swept along the sewn neckline. */
  buildCollars(project, sim) {
    for (const spec of project.collars || []) {
      const anchors = []; let panel = null;
      for (const [pid, path] of Object.entries(spec.paths || {})) {
        const pan = project.panels.find((p) => p.id === pid); if (!pan) continue;
        panel = panel && !/back$/.test(panel.id) ? panel : pan;
        for (const a of this.pathAnchors(sim, pid, path, 0.9)) anchors.push(a);
      }
      if (anchors.length < 6 || !panel) continue;
      // order the stations round the neck: front end -> back -> other front end
      const P = sim.pos; const pt = (a) => { const o = [0, 0, 0]; a.ids.forEach((q, k) => { o[0] += P[q * 3] * a.w[k]; o[1] += P[q * 3 + 1] * a.w[k]; o[2] += P[q * 3 + 2] * a.w[k]; }); return o; };
      const pts = anchors.map(pt); const c = [0, 0]; for (const q of pts) { c[0] += q[0] / pts.length; c[1] += q[2] / pts.length; }
      const order = anchors.map((a, i) => [Math.atan2(pts[i][0] - c[0], -(pts[i][2] - c[1])), a]).sort((x, y) => x[0] - y[0]);
      const stations = []; let last = -9;
      // collars that open at the front (polo, shirt) stop short of the centre line
      for (const [ang, a] of order) { if (ang - last < 0.012 || (spec.gap && Math.abs(ang) > Math.PI - spec.gap / 2)) continue; last = ang; stations.push(a); }
      const mat = this.materialFor(project, panel, spec.fabric, 0.97);
      if (spec.fabric === 'rib-knit') { const f = resolveFabric(project, panel.fabric, panel.fabricOverrides); mat.color.set(panel.finish?.color || f.look.color).multiplyScalar(0.93); mat.map = null; }
      const base = new THREE.Color(panel.finish?.color || resolveFabric(project, panel.fabric, panel.fabricOverrides).look.color);
      const bd = bodyFor(project);
      const col = buildCollar(spec, stations, mat, base.clone().multiplyScalar(0.45), this.threadColor(project, panel), { x: 0, y: bd.headY, z: 0.012, r: bd.headR / 1.12 });
      this.garment.add(col.group);
      this.stitchLines.push({ line: col.group, update: col.update });
    }
  }

  /** Embroidery: the digitised design, sewn-look, following the cloth. */
  buildEmbroidery(project, sim) {
    for (const e of project.embroidery || []) {
      if (!project.panels.some((p) => p.id === e.panel)) continue;
      if (e.kind === 'image' && e.image) loadArtwork(e.image).then(() => { if (this.project === project && !this._embSeen?.has(e.id + e.image.length)) { (this._embSeen ||= new Set()).add(e.id + e.image.length); this.refreshLooks(project); } });
      const bmp = designBitmap(e); if (!bmp) continue;
      const w = bmp.widthMm / 10; const hgt = bmp.heightMm / 10; // cm
      const nx = Math.max(2, Math.ceil(w / 0.9)); const ny = Math.max(2, Math.ceil(hgt / 0.9));
      const an = ((e.rotation || 0) * Math.PI) / 180; const c = Math.cos(an); const sn = Math.sin(an);
      const anchors = []; const uv = []; const idx = [];
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
        const lx = (i / nx - 0.5) * w; const ly = (j / ny - 0.5) * hgt;
        const a = panelAnchor(sim, e.panel, e.at[0] + lx * c - ly * sn, e.at[1] + lx * sn + ly * c);
        anchors.push(a || { ids: [sim.panels.find((p) => p.id === e.panel).offset], w: [1] }); uv.push(i / nx, j / ny);
      }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i; idx.push(a, a + 1, a + nx + 2, a, a + nx + 2, a + nx + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(anchors.length * 3), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(anchors.length * 3), 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      const printed = STITCH_TYPES[e.stitch]?.print;
      const tex = new THREE.CanvasTexture(previewCanvas(bmp, e.stitch, printed && e.kind === 'image' ? artworkReady(e.image) : null)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
      const puff = STITCH_TYPES[e.stitch]?.foam;
      const mat = new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: printed ? null : tex, bumpScale: puff ? 2.5 : 1.2, transparent: true, alphaTest: printed ? 0.2 : 0.5, roughness: printed ? 0.8 : 0.42, sheen: printed ? 0 : 0.8, sheenRoughness: 0.4, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
      const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.userData.embroidery = e.id;
      this.garment.add(mesh);
      this.overlays.push({ mesh, anchors, lift: puff ? 0.0045 : printed ? 0.0012 : 0.0022 });
    }
  }

  buildStitches(project, sim) {
    this.buildTopstitch(project, sim);
    this.buildEmbroidery(project, sim);
    this.buildCollars(project, sim);
    // seam joins: a narrow strip of the fabric bridges the two sewn edges, so a seam never shows a gap
    for (const sl of sim.seamLines) {
      const n = sl.pairs.length / 2;
      const pan = project.panels.find((p) => p.id === sl.panel);
      if (n < 2 || !pan) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 6), 3));
      const uv = new Float32Array(n * 4);
      for (let k = 0; k < n; k++) { const a = sl.pairs[k * 2]; uv[k * 4] = uv[k * 4 + 2] = sim.uv[a * 2]; uv[k * 4 + 1] = uv[k * 4 + 3] = sim.uv[a * 2 + 1]; }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      const idx = []; for (let k = 0; k < n - 1; k++) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
      g.setIndex(idx);
      const mesh = new THREE.Mesh(g, this.materialFor(project, pan));
      mesh.frustumCulled = false;
      this.garment.add(mesh);
      this.stitchLines.push({ line: mesh, join: sl.pairs });
    }
    for (const sl of sim.seamLines) {
      const st = resolveStitch(sl.stitch);
      if (!st.visible || sl.particles.length < 2) continue;
      const seg = sl.particles.length - 1;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(seg * 2 * 3 * (st.dash[1] > 0 ? 2 : 1)), 3));
      const line = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: sl.threadColor || '#d8d2c4' }));
      line.frustumCulled = false;
      this.garment.add(line);
      this.stitchLines.push({ line, ids: sl.particles, st });
    }
  }

  updateGarment() {
    const sim = this.sim;
    if (!sim) return;
    for (const m of this.panelMeshes) { m.geometry.attributes.position.needsUpdate = true; m.geometry.attributes.normal.needsUpdate = true; }
    if (this.fitMap && (this._fitTick = (this._fitTick || 0) + 1) % 15 === 0) this.updateFitColors();
    const P = sim.pos; const N = sim.nor;
    const at = (a, out, nrm) => { out.set(0, 0, 0); nrm.set(0, 0, 0); for (let k = 0; k < a.ids.length; k++) { const q = a.ids[k] * 3; const w = a.w[k]; out.x += P[q] * w; out.y += P[q + 1] * w; out.z += P[q + 2] * w; nrm.x += N[q] * w; nrm.y += N[q + 1] * w; nrm.z += N[q + 2] * w; } nrm.normalize(); };
    const v = new THREE.Vector3(); const n = new THREE.Vector3();
    for (const o of this.overlays) {
      const pa = o.mesh.geometry.attributes.position.array; const na = o.mesh.geometry.attributes.normal.array;
      for (let i = 0; i < o.anchors.length; i++) { at(o.anchors[i], v, n); pa[i * 3] = v.x + n.x * o.lift; pa[i * 3 + 1] = v.y + n.y * o.lift; pa[i * 3 + 2] = v.z + n.z * o.lift; na[i * 3] = n.x; na[i * 3 + 1] = n.y; na[i * 3 + 2] = n.z; }
      o.mesh.geometry.attributes.position.needsUpdate = true; o.mesh.geometry.attributes.normal.needsUpdate = true;
    }
    const q = new THREE.Quaternion(); const z = new THREE.Vector3(0, 0, 1); const mtx = new THREE.Matrix4(); const one = new THREE.Vector3(1, 1, 1);
    for (const t of this.trimObjs) {
      if (t.zipper) {
        const zp = t.zipper; const pts = []; const nrm = [];
        for (let i = 0; i < t.anchors.length; i++) { at(t.anchors[i], v, n); pts.push(v.clone()); nrm.push(n.clone()); }
        for (let i = 0; i < pts.length; i++) {
          const tan = pts[Math.min(pts.length - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
          const m4 = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(tan, nrm[i]).normalize(), tan, nrm[i]);
          q.setFromRotationMatrix(m4);
          mtx.compose(pts[i].clone().addScaledVector(nrm[i], 0.0012), q, one); zp.tape.setMatrixAt(i, mtx);
          if (zp.teeth) { mtx.compose(pts[i].clone().addScaledVector(nrm[i], 0.0012 + zp.th), q, one); zp.teeth.setMatrixAt(i, mtx); }
          const sIdx = Math.round((t.trim?.slider ?? 1) * (pts.length - 1));
          if (i === sIdx) { zp.slider.position.copy(pts[i]).addScaledVector(nrm[i], 0.003); zp.slider.quaternion.copy(q); }
          if (i > sIdx && zp.teeth) { mtx.compose(pts[i], q, new THREE.Vector3(0, 0, 0)); zp.teeth.setMatrixAt(i, mtx); } // unzipped: the two halves have parted
          if (i === 0 && t.obj.userData.slider2) { t.obj.userData.slider2.position.copy(pts[i]).addScaledVector(nrm[i], 0.003); t.obj.userData.slider2.quaternion.copy(q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI)); }
        }
        zp.tape.instanceMatrix.needsUpdate = true; if (zp.teeth) zp.teeth.instanceMatrix.needsUpdate = true;
        continue;
      }
      if (t.lacing) {
        const lc = t.lacing; const P2 = []; const N2 = [];
        for (let i = 0; i < t.anchors.length; i++) { at(t.anchors[i], v, n); P2.push(v.clone().addScaledVector(n, 0.002)); N2.push(n.clone()); q.setFromUnitVectors(z, n); mtx.compose(P2[i], q, one); lc.eyelets.setMatrixAt(i, mtx); }
        lc.eyelets.instanceMatrix.needsUpdate = true;
        const L2 = P2.slice(0, lc.n); const R2 = P2.slice(lc.n);
        const path = [];
        for (let i = lc.n - 1; i >= 0; i--) {
          if (lc.style === 'ladder') { path.push(L2[i], R2[i]); if (i) path.push(R2[i - 1] ? R2[i - 1] : R2[i], L2[i - 1]); }
          else if (lc.style === 'spiral') path.push(i % 2 ? L2[i] : R2[i]);
          else { path.push(i % 2 ? L2[i] : R2[i]); path.push(i % 2 ? R2[i] : L2[i]); }
        }
        if (lc.style === 'corset') { const mid = L2[Math.floor(lc.n / 2)].clone().lerp(R2[Math.floor(lc.n / 2)], 0.5); const out = N2[0].clone().multiplyScalar(0.01); path.splice(Math.floor(path.length / 2), 0, mid.clone().add(out).add(new THREE.Vector3(0.02, -0.01, 0)), mid.clone().add(out), mid.clone().add(out).add(new THREE.Vector3(-0.02, -0.01, 0)), mid.clone().add(out)); }
        lc.cord.geometry.dispose();
        lc.cord.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path.map((p2) => p2.clone()), false, 'catmullrom', 0.1), Math.max(16, path.length * 6), 0.0011, 5, false);
        continue;
      }
      if (t.edgeShape) {
        for (let i = 0; i < t.anchors.length; i++) {
          at(t.anchors[i], v, n);
          const prev = t.anchors[Math.max(0, i - 1)]; const nxt = t.anchors[Math.min(t.anchors.length - 1, i + 1)];
          const pv = new THREE.Vector3(); const pn = new THREE.Vector3(); const nv = new THREE.Vector3(); const nn2 = new THREE.Vector3();
          at(prev, pv, pn); at(nxt, nv, nn2);
          const tan = nv.sub(pv).normalize();
          const down = new THREE.Vector3().crossVectors(n, tan).normalize(); // points away from the panel interior (roughly)
          if (down.y > 0) down.negate();
          const m4 = new THREE.Matrix4().makeBasis(tan, down.clone().negate(), n);
          q.setFromRotationMatrix(m4);
          const offs = { scallop: 0.004, ruffle: 0.012, fringe: 0.03, fray: 0.005, lace: 0.003, pompom: 0.008, feather: 0.022 }[t.edgeShape] || 0;
          const pos2 = v.clone().addScaledVector(n, 0.002).addScaledVector(down, offs);
          const scl = t.edgeShape === 'zigzag' ? new THREE.Vector3(1, i % 2 ? -1 : 1, 1) : t.edgeShape === 'wave' ? new THREE.Vector3(1, i % 2 ? -1 : 1, 1) : one;
          mtx.compose(pos2, q, scl);
          t.obj.setMatrixAt(i, mtx);
        }
        t.obj.instanceMatrix.needsUpdate = true;
        continue;
      }
      if (t.line) {
        if (t.def.strap) {
          // a strap is a flat band that lies on the body: route it over the shoulder, then press it onto the skin
          const ends = t.anchors.map((a) => { at(a, v, n); return v.clone().addScaledVector(n, 0.003); });
          const p0 = ends[0]; const p1 = ends[ends.length - 1];
          const mid = p0.clone().add(p1).multiplyScalar(0.5); mid.y = Math.max(p0.y, p1.y) + (t.trim.arch ?? 0.2) * 0.7; mid.x *= 1.02;
          const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
          t.obj.geometry.dispose();
          t.obj.geometry = this.bodyRibbon(curve.getPoints(30), Math.max(0.007, t.s * 0.36), 0.0035);
          continue;
        }
        for (let i = 0; i < t.anchors.length; i++) {
          at(t.anchors[i], v, n);
          q.setFromUnitVectors(z, n);
          if (t.def.fringe) { v.y -= t.s / 2; q.identity(); }
          mtx.compose(v.clone().addScaledVector(n, 0.002), q, one);
          t.obj.setMatrixAt(i, mtx);
        }
        t.obj.instanceMatrix.needsUpdate = true;
      } else {
        at(t.anchors[0], v, n);
        t.obj.position.copy(v).addScaledVector(n, 0.0015);
        t.obj.quaternion.setFromUnitVectors(z, n);
      }
    }
    for (const s of this.stitchLines) {
      if (s.update) { s.update(P, N); continue; }
      const arr = s.line.geometry.attributes.position.array;
      if (s.join) {
        const na = s.line.geometry.attributes.normal.array;
        for (let k = 0; k < s.join.length; k++) { const q = s.join[k] * 3; arr[k * 3] = P[q]; arr[k * 3 + 1] = P[q + 1]; arr[k * 3 + 2] = P[q + 2]; const m = s.join[k - (k % 2)] * 3; na[k * 3] = N[m]; na[k * 3 + 1] = N[m + 1]; na[k * 3 + 2] = N[m + 2]; }
        s.line.geometry.attributes.position.needsUpdate = true; s.line.geometry.attributes.normal.needsUpdate = true;
        continue;
      }
      let o = 0;
      const off = 0.0035;
      for (let i = 0; i < s.ids.length - 1; i++) {
        const a = s.ids[i] * 3; const b = s.ids[i + 1] * 3;
        for (const side of s.st.dash[1] > 0 ? [-1, 1] : [1]) {
          const ox = N[a] * off * 0.5 + side * 0.0; const oy = N[a + 1] * off * 0.5; const oz = N[a + 2] * off * 0.5;
          arr[o++] = P[a] + ox; arr[o++] = P[a + 1] + oy; arr[o++] = P[a + 2] + oz;
          const tdash = s.st.dash[0] / (s.st.dash[0] + s.st.dash[1] || 1);
          arr[o++] = P[a] + (P[b] - P[a]) * tdash + ox; arr[o++] = P[a + 1] + (P[b + 1] - P[a + 1]) * tdash + oy; arr[o++] = P[a + 2] + (P[b + 2] - P[a + 2]) * tdash + oz;
        }
      }
      s.line.geometry.attributes.position.needsUpdate = true;
    }
  }

  /** Fit map: colour the cloth by strain (red = tight, white = neutral, blue = loose). */
  setFitMap(on) {
    this.fitMap = on;
    for (const m of this.panelMeshes) {
      if (on) { m.userData.mat ||= m.material; m.material = this._fitMat ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }); }
      else if (m.userData.mat) { m.material = m.userData.mat; }
    }
    if (on) this.updateFitColors();
    this.dirty = true;
  }

  updateFitColors() {
    const sim = this.sim; if (!sim) return;
    const n = sim.pos.length / 3;
    const strain = new Float32Array(n);
    const P = sim.pos;
    for (let e = 0; e < sim.rest.length; e++) {
      if (sim.kc[e] <= 0 || sim.rest[e] > 0.035) continue; // structural/shear only (skip tethers & bend)
      const a = sim.ci[e * 2]; const b = sim.ci[e * 2 + 1];
      const d = Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);
      const st = d / sim.rest[e] - 1;
      if (Math.abs(st) > Math.abs(strain[a])) strain[a] = st;
      if (Math.abs(st) > Math.abs(strain[b])) strain[b] = st;
    }
    for (const m of this.panelMeshes) {
      const pan = sim.panels.find((p) => p.id === m.userData.panelId);
      const col = new Float32Array(pan.count * 3);
      for (let i = 0; i < pan.count; i++) {
        const st = strain[pan.offset + i];
        let r = 1; let g = 1; let b = 1;
        if (st > 0.005) { const k = Math.min(1, st / 0.05); g = 1 - k; b = 1 - k; } // tight -> red
        else if (st < -0.01) { const k = Math.min(1, -st / 0.06); r = 1 - k * 0.8; g = 1 - k * 0.4; } // loose / compressed -> blue
        col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
      }
      m.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
  }

  setJewelry(spec) {
    this.sim = null;
    this.simAwake = false;
    const grp = buildJewelry(spec);
    grp.position.set(0, 1.0, 0);
    this.garment.add(grp);
    if (spec.parts?.length) this.loadParts(spec, grp);
    const box = new THREE.Box3().setFromObject(grp);
    const c = box.getCenter(new THREE.Vector3()); const r = box.getSize(new THREE.Vector3()).length();
    this.frame(c, r);
    this.dirty = true;
  }

  /** Imported CAD parts: material, fit-to-size, transform, distortion. */
  async loadParts(spec, grp) {
    this._partCache ||= new Map();
    for (const part of spec.parts) {
      try {
        const key = `${part.id}:${part.data.length}`;
        if (!this._partCache.has(key)) this._partCache.set(key, await loadModel(part.name, part.data));
        const src = this._partCache.get(key);
        const obj = src.clone(true);
        const mat = METALS[part.material] ? metalMaterial({ metal: part.material }) : gemMaterial(part.material);
        obj.traverse((c) => { if (c.isMesh) { c.geometry = deformGeometry(c.geometry.clone(), part.distort || {}); c.material = mat; } });
        const box = new THREE.Box3().setFromObject(obj); const size = box.getSize(new THREE.Vector3()); const ctr = box.getCenter(new THREE.Vector3());
        const k = ((part.size || 15) / 1000) / (Math.max(size.x, size.y, size.z) || 1);
        const wrap = new THREE.Group();
        obj.position.sub(ctr);
        wrap.add(obj);
        wrap.scale.set(k * (part.scale?.[0] ?? 1), k * (part.scale?.[1] ?? 1), k * (part.scale?.[2] ?? 1));
        wrap.position.set(...(part.position || [0, 0, 0]).map((v) => v / 1000));
        wrap.rotation.set(...(part.rotation || [0, 0, 0]).map((v) => (v * Math.PI) / 180));
        grp.add(wrap);
        this.dirty = true;
      } catch (e) { this.onError?.(`Part "${part.name}": ${e.message}`); }
    }
  }

  frame(center, radius) {
    this.controls.target.copy(center);
    const d = Math.max(radius * 1.9, 0.03);
    this.camera.position.set(center.x + d * 0.3, center.y + d * 0.35, center.z + d);
    this.camera.near = d / 100; this.camera.far = d * 100; this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  frameGarment() {
    const box = new THREE.Box3();
    for (const m of this.panelMeshes) { m.geometry.computeBoundingBox(); box.union(m.geometry.boundingBox); }
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3()); const s = box.getSize(new THREE.Vector3());
    this.frame(c, Math.max(s.x, s.y, s.z) * 1.35);
  }

  /** Ray-pick a garment panel; returns { panelId, local: [x, y] cm }. */
  pick(clientX, clientY) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.camera);
    for (const m of this.panelMeshes) m.geometry.computeBoundingSphere();
    const hit = rc.intersectObjects(this.panelMeshes, false)[0];
    if (!hit || !hit.uv) return null;
    return { panelId: hit.object.userData.panelId, local: [hit.uv.x * 10, hit.uv.y * 10], point: hit.point };
  }

  /**
   * Skin never shows through fabric. Cloth triangles are larger than small body features (nipples,
   * toes, fingers, collar bones), so wherever fabric lies over the body the body surface is drawn
   * slightly inside itself. It is only tucked in under cloth, with a smooth fall-off at openings,
   * so necklines, cuffs and hems still meet the skin naturally.
   */
  coverBody() {
    const mesh = this.avatarGroup.children.find((c) => c.isMesh && (c === this._mannequinMesh || c === this._customMesh));
    if (!mesh) return;
    const g = mesh.geometry; const pos = g.attributes.position;
    if (!g.userData.restAttr || g.userData.restAttr.count !== pos.count) { g.userData.restAttr = pos.clone(); g.computeVertexNormals(); g.userData.restNor = g.attributes.normal.clone(); }
    const rest = g.userData.restAttr; const nor = g.userData.restNor;
    // everything that covers skin: cloth particles and hosiery / sock shells
    const pts = [];
    if (this.sim && this.project?.mode !== 'jewelry') { const P = this.sim.pos; for (let i = 0; i < P.length; i += 3) pts.push(P[i], P[i + 1], P[i + 2]); }
    for (const m of this._shellMeshes || []) { const p = m.geometry?.attributes?.position; if (!p || !m.isMesh) continue; for (let i = 0; i < p.count; i += 2) pts.push(p.getX(i), p.getY(i), p.getZ(i)); }
    if (!pts.length) { if (g.userData.covered) { pos.copy(rest); pos.needsUpdate = true; g.userData.covered = false; this.dirty = true; } return; }
    const R = 0.032; const inv = 1 / R; const hash = new Map();
    const key = (x, y, z) => (x + 512) + (y + 512) * 1024 + (z + 512) * 1048576;
    for (let i = 0; i < pts.length; i += 3) { const k = key(Math.floor(pts[i] * inv), Math.floor(pts[i + 1] * inv), Math.floor(pts[i + 2] * inv)); const a = hash.get(k); if (a) a.push(i); else hash.set(k, [i]); }
    const maxIn = 0.011;
    for (let v = 0; v < rest.count; v++) {
      const x = rest.getX(v); const y = rest.getY(v); const z = rest.getZ(v);
      const cx = Math.floor(x * inv); const cy = Math.floor(y * inv); const cz = Math.floor(z * inv);
      let d2 = R * R;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const list = hash.get(key(cx + a, cy + b, cz + c)); if (!list) continue; for (const i of list) { const dx = pts[i] - x; const dy = pts[i + 1] - y; const dz = pts[i + 2] - z; const q = dx * dx + dy * dy + dz * dz; if (q < d2) d2 = q; } }
      const u = 1 - Math.sqrt(d2) / R; // 1 = fabric right on the skin, 0 = none within reach
      const k = u <= 0 ? 0 : maxIn * Math.min(1, u * 1.8) * Math.min(1, u * 1.8) * (3 - 2 * Math.min(1, u * 1.8));
      pos.setXYZ(v, x - nor.getX(v) * k, y - nor.getY(v) * k, z - nor.getZ(v) * k);
    }
    pos.needsUpdate = true; g.userData.covered = true; this.dirty = true;
  }

  /** Press a polyline onto the body surface (distance field of the real mannequin) at `lift` above the skin. */
  hugBody(pts, lift = 0.003) {
    const f = this.project?.display?.avatar === false ? null : bodyField(bodyFor(this.project));
    const nrm = pts.map(() => new THREE.Vector3(0, 0, 1));
    if (!f) return nrm;
    const o = [0, 0, 0, 0];
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        for (let it = 0; it < 10; it++) {
          if (!sampleField(f, p.x, p.y, p.z, o)) break;
          const gl = Math.hypot(o[1], o[2], o[3]); if (gl < 1e-7) break;
          const step = Math.max(-0.03, Math.min(0.03, lift - o[0]));
          p.x += (o[1] / gl) * step; p.y += (o[2] / gl) * step; p.z += (o[3] / gl) * step;
          nrm[i].set(o[1] / gl, o[2] / gl, o[3] / gl);
          if (Math.abs(step) < 2e-4) break;
        }
      }
      // keep the band smooth and evenly spaced (ends stay where they are sewn)
      if (pass < 2) for (let i = 1; i < pts.length - 1; i++) pts[i].lerp(pts[i - 1].clone().add(pts[i + 1]).multiplyScalar(0.5), 0.5);
    }
    return nrm;
  }

  /** A flat band (strap, tape, neckband) following a path over the body. */
  bodyRibbon(pts, width, lift = 0.003, hug = true) {
    const nrm = hug ? this.hugBody(pts, lift) : pts.map(() => new THREE.Vector3(0, 0, 1));
    const n = pts.length; const pos = new Float32Array(n * 6); const uv = new Float32Array(n * 4); const idx = [];
    const tan = new THREE.Vector3(); const side = new THREE.Vector3(); let run = 0;
    for (let i = 0; i < n; i++) {
      tan.copy(pts[Math.min(n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize();
      side.crossVectors(tan, nrm[i]).normalize().multiplyScalar(width / 2);
      pos.set([pts[i].x - side.x, pts[i].y - side.y, pts[i].z - side.z, pts[i].x + side.x, pts[i].y + side.y, pts[i].z + side.z], i * 6);
      if (i) run += pts[i].distanceTo(pts[i - 1]);
      uv.set([0, run / width, 1, run / width], i * 4);
      if (i < n - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  /** What fastening is under the pointer: { kind: 'zipper'|'button', trim } or null. */
  pickTrim(clientX, clientY) {
    const r = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, this.camera); rc.params.Line = { threshold: 0.004 };
    let best = null;
    for (const t of this.trimObjs) {
      if (!t.trim) continue;
      const hits = rc.intersectObject(t.obj, true);
      if (hits.length && (!best || hits[0].distance < best.d)) best = { d: hits[0].distance, t };
    }
    if (!best) return null;
    // something in front of it (another layer)? then it is not clickable
    const cloth = rc.intersectObjects(this.panelMeshes, false)[0];
    if (cloth && cloth.distance < best.d - 0.02) return null;
    const type = best.t.trim.type;
    return { kind: best.t.zipper ? 'zipper' : /button|snap|toggle/.test(type) ? 'button' : 'trim', trim: best.t.trim };
  }

  /** Pull mode: drag the cloth itself. The grabbed point follows the pointer; the rest reacts through the solver. */
  setGrab(on) {
    this.grabMode = on;
    if (this._grabBound) return;
    this._grabBound = true;
    const el = this.renderer.domElement; const rc = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    const ray = (e) => { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); rc.setFromCamera(ndc, this.camera); };
    el.addEventListener('pointerdown', (e) => {
      if (!this.grabMode || !this.sim) return;
      ray(e);
      const hit = rc.intersectObjects(this.panelMeshes, false)[0];
      if (!hit || !hit.face) return;
      const pan = this.sim.panels.find((p) => p.id === hit.object.userData.panelId); if (!pan) return;
      // pinch the three corners of the triangle under the pointer
      const ids = [hit.face.a, hit.face.b, hit.face.c].map((i) => i + pan.offset);
      const P = this.sim.pos;
      this._grab = { ids, inv: ids.map((i) => this.sim.inv[i]), off: ids.map((i) => new THREE.Vector3(P[i * 3] - hit.point.x, P[i * 3 + 1] - hit.point.y, P[i * 3 + 2] - hit.point.z)), dist: hit.distance, target: hit.point.clone(), id: e.pointerId };
      this.controls.enabled = false;
      el.setPointerCapture?.(e.pointerId);
      e.stopPropagation();
    }, true);
    el.addEventListener('pointermove', (e) => { if (!this._grab || e.pointerId !== this._grab.id) return; ray(e); this._grab.target.copy(rc.ray.origin).addScaledVector(rc.ray.direction, this._grab.dist); this.simAwake = true; this._simFrames = Math.min(this._simFrames || 0, 500); this._still = 0; });
    const end = (e) => { if (!this._grab || e.pointerId !== this._grab.id) return; this._grab.ids.forEach((i, k) => { this.sim.inv[i] = this._grab.inv[k]; }); this._grab = null; this.controls.enabled = true; this.simAwake = true; this._simFrames = Math.min(this._simFrames || 0, 420); this._still = 0; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  snapshot(width = 1024) {
    const old = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(Math.max(1, width / (this.container.clientWidth || width)));
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.renderer.setPixelRatio(old);
    this.resize();
    return url;
  }

  async exportModel(format) {
    const target = this.garment;
    if (format === 'glb') {
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
      return new Promise((res, rej) => new GLTFExporter().parse(target, (r) => res(new Blob([r], { type: 'model/gltf-binary' })), rej, { binary: true }));
    }
    if (format === 'stl') {
      const { STLExporter } = await import('three/examples/jsm/exporters/STLExporter.js');
      return new Blob([new STLExporter().parse(target, { binary: true })], { type: 'model/stl' });
    }
    const { OBJExporter } = await import('three/examples/jsm/exporters/OBJExporter.js');
    return new Blob([new OBJExporter().parse(target)], { type: 'text/plain' });
  }
}
