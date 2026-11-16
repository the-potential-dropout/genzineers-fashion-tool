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
import { fabricTextures, distressTexture } from './textures.js';
import { buildCollar } from './collars.js';
import { buildShoe, strand } from './shoes3d.js';
import { buildHat } from './hats3d.js';
import { buildBag } from './bags3d.js';
import { buildHair } from './hair3d.js';
import { buildBelt } from './belts3d.js';
import { startFold, stopFold, tickFold } from './fold3d.js';
import { tieKnot, bowTie, clothBand, TIE_KNOTS } from './neckwear.js';
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
        g.ids.forEach((i, k) => { const x = g.target.x + g.off[k].x; const y = Math.max(0.01, g.target.y + g.off[k].y); const z = g.target.z + g.off[k].z; this.sim.inv[i] = 0; P[i * 3] += (x - P[i * 3]) * g.gain; P[i * 3 + 1] += (y - P[i * 3 + 1]) * g.gain; P[i * 3 + 2] += (z - P[i * 3 + 2]) * g.gain; Q[i * 3] = P[i * 3]; Q[i * 3 + 1] = P[i * 3 + 1]; Q[i * 3 + 2] = P[i * 3 + 2]; });
        if (g.mirror) { const i = g.mirror.i; const x = -g.target.x; const y = Math.max(0.01, g.target.y); const z = g.target.z; this.sim.inv[i] = 0; P[i * 3] += (x - P[i * 3]) * g.gain; P[i * 3 + 1] += (y - P[i * 3 + 1]) * g.gain; P[i * 3 + 2] += (z - P[i * 3 + 2]) * g.gain; Q[i * 3] = P[i * 3]; Q[i * 3 + 1] = P[i * 3 + 1]; Q[i * 3 + 2] = P[i * 3 + 2]; }
      }
      if (this.sim.panels.some((q) => q.panel.insulation)) { const P = this.sim.pos; const Nn = this.sim.nor; for (const pan of this.sim.panels) { const ins = pan.panel.insulation; if (!ins || !Nn) continue; const k = 0.00022 * Math.min(2.5, (ins.weight || 100) / 100); for (let i = pan.offset; i < pan.offset + pan.count; i++) { if (this.sim.inv[i] === 0) continue; let nx = Nn[i * 3]; let ny = Nn[i * 3 + 1]; let nz = Nn[i * 3 + 2]; if (nx * P[i * 3] * 0.3 + nz * P[i * 3 + 2] < 0) { nx = -nx; ny = -ny; nz = -nz; } P[i * 3] += nx * k; P[i * 3 + 1] += ny * k * 0.5; P[i * 3 + 2] += nz * k; } } } // down and fibre fill press the shell outwards
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
        if (this.project?.belts?.length) { try { this.addBelts(this.project); } catch (e) { console.warn('belt failed', e); } }
        this.onSleep?.();
      }
      this.dirty = true;
    }
    this._frame++;
    // idle orbit at ~30 fps saves power
    if (this._fold) tickFold(this);
    if (this._hairGroup?.userData.sway && this._hairGroup.parent) { this._hairGroup.userData.tick(performance.now() / 1000); if ((this._frame || 0) % 2 === 0) this.dirty = true; }
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
      if (project.bags?.length) { rod.visible = false; let x = 0; const key = JSON.stringify(project.bags) + JSON.stringify(project.partLooks || {});
        try { for (const spec of project.bags) { const grp = buildBag(spec, this.formMats(project, spec)); grp.traverse((m) => { m.frustumCulled = false; if (m.isMesh) m.castShadow = true; }); grp.position.x = x; x += spec.width / 100 + 0.12; this.stand.add(grp); if (this._bagKey !== key) { this._bagKey = key; const c = grp.userData.centre; this.frame(new THREE.Vector3(c[0], c[1], c[2]), grp.userData.size * 1.7); } } } catch (e) { console.warn('bag failed', e); } }
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
    const key = `${body.mannequin}:${JSON.stringify(body._scales, (k, v) => (k === 'L' ? undefined : v))}:${body.armAngle ?? ''}:${body.soleLift || 0}:${body.heelLift || 0}`;
    this._wantKey = key;
    if (this._mannequinKey === key && this._mannequinMesh) { this.avatarGroup.add(this._mannequinMesh); this.addShells(project, body); return; }
    // capsule stand-in until the mesh has loaded
    for (const c of buildAvatar(body)) this.avatarGroup.add(this.capsule(c, mat));
    this.loadMannequin(body, key, mat);
  }

  /** Hosiery & socks: skin-tight layers that follow the graded mannequin surface. */
  addShells(project, body) {
    try { this._addShells(project, body); } catch (e) { console.warn('hosiery layer failed', e); }
    try { this.addShoes(project); } catch (e) { console.warn('shoes failed', e); }
    try { this.addHats(project); } catch (e) { console.warn('hats failed', e); }
    try { this.addHair(project); } catch (e) { console.warn('hair failed', e); }
    if (!this.sim || !this.simAwake) { try { this.addBelts(project); } catch (e) { console.warn('belt failed', e); } } // a belt is put on over settled clothes
  }

  /**
   * What makes a cut-and-sewn glove: the fourchettes (strips between the fingers), the thumb set
   * into its hole, the side seam down the little-finger edge, three points stitched on the back,
   * the hemmed or bound cuff, and its fastening. Worked out on the hand itself, in the straight-arm
   * reference pose (fingers along x, back of the hand up, thumb forward).
   */
  gloveDetails(sh, pos, nor, ref, idx, wristX, L) {
    const add = (o) => { o.frustumCulled = false; this.avatarGroup.add(o); this._shellMeshes.push(o); };
    const base = new THREE.Color(sh.look.color); const thread = base.clone().lerp(new THREE.Color('#ffffff'), 0.4); const crease = base.clone().multiplyScalar(0.4);
    const off = sh.thickness + 0.0006; const nT = idx ? idx.count / 3 : pos.count / 3; const vi = (t, k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k);
    for (const sd of [1, -1]) {
      const x0 = wristX - sh.cuff; const tris = []; const inHand = (i) => ref[i * 3] * sd > x0 && Math.abs(ref[i * 3 + 1] - L.armY) < 0.16;
      for (let t = 0; t < nT; t++) { const a = vi(t, 0); const b = vi(t, 1); const c = vi(t, 2); if (inHand(a) && inHand(b) && inHand(c)) tris.push(a, b, c); }
      if (tris.length < 30) continue;
      // normals in the reference pose
      const rn = new Map(); const acc = (i, x, y, z) => { const o = rn.get(i) || [0, 0, 0]; o[0] += x; o[1] += y; o[2] += z; rn.set(i, o); };
      for (let t = 0; t < tris.length; t += 3) { const [a, b, c] = [tris[t], tris[t + 1], tris[t + 2]]; const ux = ref[b * 3] - ref[a * 3]; const uy = ref[b * 3 + 1] - ref[a * 3 + 1]; const uz = ref[b * 3 + 2] - ref[a * 3 + 2]; const vx = ref[c * 3] - ref[a * 3]; const vy = ref[c * 3 + 1] - ref[a * 3 + 1]; const vz = ref[c * 3 + 2] - ref[a * 3 + 2]; const nx = uy * vz - uz * vy; const ny = uz * vx - ux * vz; const nz = ux * vy - uy * vx; acc(a, nx, ny, nz); acc(b, nx, ny, nz); acc(c, nx, ny, nz); }
      for (const o of rn.values()) { const l = Math.hypot(o[0], o[1], o[2]) || 1; o[0] /= l; o[1] /= l; o[2] /= l; }
      const X = (i) => ref[i * 3] * sd - wristX; const Y = (i) => ref[i * 3 + 1] - L.armY; const Z = (i) => ref[i * 3 + 2];
      let zc = 0; let nz0 = 0; let zmin = 9; let zmax = -9; let xTip = 0; let yTop = -9;
      for (const i of rn.keys()) { if (X(i) > 0 && X(i) < 0.03) { zc += Z(i); nz0++; } xTip = Math.max(xTip, X(i)); }
      zc /= nz0 || 1; const knX = xTip * 0.5; // knuckles about half way from wrist to fingertip
      for (const i of rn.keys()) if (X(i) > knX + 0.01) { zmin = Math.min(zmin, Z(i)); zmax = Math.max(zmax, Z(i)); yTop = Math.max(yTop, Y(i)); }
      const P3 = (i, k = off) => new THREE.Vector3(pos.getX(i) + nor.getX(i) * k, pos.getY(i) + nor.getY(i) * k, pos.getZ(i) + nor.getZ(i) * k);
      // ---- pieces cut out of the hand surface along smooth lines (not along the mesh's own edges)
      const thumbZ = zc + 0.036;
      const fourM = (i) => { const n = rn.get(i); const x = X(i); const outer = (Z(i) < zmin + 0.007 && n[2] < 0) || (Z(i) > zmax - 0.007 && n[2] > 0); return Math.min(0.52 - Math.abs(n[1]), (x - knX - 0.002) * 8, outer ? -1 : 1, sh.fingerless ? -1 : 1); };
      const thumbM = (i) => { const x = X(i); return Math.min((Z(i) - thumbZ - Math.max(0, x - knX * 0.45) * 0.55) * 10, (x - 0.01) * 10, (knX + 0.03 - x) * 10); };
      const cut = (mf, emit) => { const segs = []; const pp = []; const nn = [];
        const at = (a, b, t, k) => new THREE.Vector3(pos.getX(a) + (pos.getX(b) - pos.getX(a)) * t, pos.getY(a) + (pos.getY(b) - pos.getY(a)) * t, pos.getZ(a) + (pos.getZ(b) - pos.getZ(a)) * t).add(new THREE.Vector3(nor.getX(a) + (nor.getX(b) - nor.getX(a)) * t, nor.getY(a) + (nor.getY(b) - nor.getY(a)) * t, nor.getZ(a) + (nor.getZ(b) - nor.getZ(a)) * t).normalize().multiplyScalar(k));
        for (let t = 0; t < tris.length; t += 3) { const v = [tris[t], tris[t + 1], tris[t + 2]]; const m = v.map(mf); const ins = (m[0] > 0) + (m[1] > 0) + (m[2] > 0); if (!ins) continue; const poly = []; const cr = [];
          for (let e = 0; e < 3; e++) { const p = v[e]; const q = v[(e + 1) % 3]; if (m[e] > 0) poly.push([p, p, 0]); if ((m[e] > 0) !== (m[(e + 1) % 3] > 0)) { const tt = m[e] / (m[e] - m[(e + 1) % 3]); poly.push([p, q, tt]); cr.push([p, q, tt]); } }
          if (emit) for (let q = 1; q + 1 < poly.length; q++) for (const w of [poly[0], poly[q], poly[q + 1]]) { const p = at(w[0], w[1], w[2], off + 0.0003); pp.push(p.x, p.y, p.z); nn.push(nor.getX(w[0]), nor.getY(w[0]), nor.getZ(w[0])); }
          if (cr.length === 2) segs.push(cr); }
        if (emit && pp.length) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3)); add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: base.clone().multiplyScalar(0.6), roughness: Math.min(1, (sh.look.roughness || 0.6) + 0.08), sheen: sh.look.sheen || 0, side: THREE.DoubleSide }))); }
        for (const [k, color, dashed] of [[0.0005, crease, false], [0.0008, thread, true]]) { const pts = []; for (const sgm of segs) pts.push(at(sgm[0][0], sgm[0][1], sgm[0][2], off + k), at(sgm[1][0], sgm[1][1], sgm[1][2], off + k)); if (!pts.length) continue; const ln = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.002, gapSize: 0.001 }) : new THREE.LineBasicMaterial({ color })); if (dashed) ln.computeLineDistances(); add(ln); } };
      cut(fourM, true); // fourchettes: the strips that give the fingers their depth
      cut(thumbM, false); // the thumb, set into its hole
      // a line of stitching through chosen points of the hand, smoothed
      const run = (pts, tube = false) => { if (pts.length < 3) return; for (let it = 0; it < 2; it++) for (let i = 1; i + 1 < pts.length; i++) pts[i].lerp(pts[i - 1].clone().add(pts[i + 1]).multiplyScalar(0.5), 0.5); if (tube) add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, 0.0009, 5), new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.8), roughness: 0.7 }))); const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map((p) => p.clone())), new THREE.LineDashedMaterial({ color: thread, dashSize: 0.0022, gapSize: 0.001 })); ln.computeLineDistances(); add(ln); };
      const nearest = (x, z, back) => { let best = -1; let bd = 1e9; for (const [i, n] of rn) { if (back ? n[1] < 0.45 : false) continue; const d = Math.abs(X(i) - x) + Math.abs(Z(i) - z); if (d < bd) { bd = d; best = i; } } return best; };
      // three points on the back of the hand
      if (sh.points && !sh.fingerless) for (const dz of [-0.019, 0, 0.019]) { const pts = []; for (let x = 0.022; x < knX - 0.004; x += 0.006) { const i = nearest(x, zc + dz * (0.75 + 0.25 * (x / knX)), true); if (i >= 0) pts.push(P3(i, off + 0.0008)); } run(pts, true); }
      // side seam down the little-finger edge (the trank is folded at the index finger, sewn here)
      { const pts = []; for (let x = -sh.cuff + 0.004; x < xTip - 0.012; x += 0.006) { let best = -1; let bz = 9; for (const i of rn.keys()) if (Math.abs(X(i) - x) < 0.005 && Math.abs(Y(i)) < 0.02 && Z(i) < bz) { bz = Z(i); best = i; } if (best >= 0) pts.push(P3(best, off + 0.0006)); } run(pts); }
      // cuff hem / binding: a row of stitching round the edge
      { const ring = []; for (const i of rn.keys()) if (Math.abs(X(i) + sh.cuff - 0.008) < 0.006) ring.push([Math.atan2(Y(i), Z(i) - zc), i]); ring.sort((a, b) => a[0] - b[0]); const pts = ring.map(([, i]) => P3(i, off + 0.0006)); if (pts.length > 6) { pts.push(pts[0].clone()); run(pts); } }
      // fastening on the back of the wrist
      const bw = nearest(-0.012, zc, true);
      if (bw >= 0 && sh.bands?.length && sh.type !== 'work') { const p = P3(bw, off + 0.0022); const n = new THREE.Vector3(nor.getX(bw), nor.getY(bw), nor.getZ(bw)); const m = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#b9b9b9', metalness: 0.9, roughness: 0.3 })); m.position.copy(p); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); add(m); }
      if (sh.type === 'driving' && !sh.fingerless) { const g = []; for (const dz of [-0.026, -0.009, 0.009, 0.026]) { const i = nearest(knX - 0.006, zc + dz, true); if (i < 0) continue; const c = new THREE.CircleGeometry(0.0052, 14); const n = new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)); const p = P3(i, off + 0.0005); c.translate(p.x, p.y, p.z); g.push(c); } for (const c of g) add(new THREE.Mesh(c, new THREE.MeshBasicMaterial({ color: this.project?.look?.skin || '#8d939c', side: THREE.DoubleSide }))); }
    }
  }

  /** Materials for a constructed form (shoe, hat, bag): each named part in its own material and colour. */
  formMats(project, spec) {
    const gar = (project.garments || []).find((x) => x.id === spec.garment);
    const pseudo = { fabric: spec.fabric, fabricOverrides: {}, finish: gar?.finish || {}, garment: spec.garment };
    const part = (id) => spec.parts.find((q) => q.id === id);
    const fabOf = (id) => part(id)?.fabric || spec.fabric;
    return { colorOf: (id) => part(id)?.color || (part(id)?.fabric ? resolveFabric(project, part(id).fabric).look.color : spec.color || resolveFabric(project, spec.fabric).look.color),
      part: (id) => { const m = this.materialFor(project, pseudo, fabOf(id), 1, { fabric: fabOf(id), color: part(id)?.color || (part(id)?.fabric ? null : spec.color) }); m.side = THREE.DoubleSide; return m; } };
  }

  /** Belts worn round the body, over whatever is worn at that height. */
  addBelts(project) {
    for (const o of this._beltObjs || []) { this.avatarGroup.remove(o); o.traverse((m) => { m.geometry?.dispose(); }); }
    this._beltObjs = [];
    for (const t of this.trimObjs || []) if (t.trim?.type === 'belt-loop') t.obj.visible = true;
    if (!project?.belts?.length || project.display?.avatar === false || !this._mannequinMesh) return;
    const body = bodyFor(project); let f = null; try { f = bodyField(body); } catch { return; }
    const o4 = [0, 0, 0, 0]; const gen = (gid) => (project.garments || []).find((g) => g.id === gid)?.generator;
    const NP = 144; const binOf = (x, z) => ((Math.round((Math.atan2(x, z) / (Math.PI * 2)) * NP) % NP) + NP) % NP;
    const fillRing = (arr) => { const has = Array.from(arr, (v) => Number.isFinite(v)); if (!has.some(Boolean)) return false; for (let i = 0; i < NP; i++) if (!has[i]) { let l = i; let r = i; let dl = 0; let dr = 0; while (!has[l]) { l = (l - 1 + NP) % NP; dl++; } while (!has[r]) { r = (r + 1) % NP; dr++; } arr[i] = (arr[l] * dr + arr[r] * dl) / (dl + dr); } return true; };
    const smooth = (arr, k = 3) => { for (let it = 0; it < k; it++) { const c = arr.slice(); for (let i = 0; i < NP; i++) arr[i] = (c[(i + NP - 1) % NP] + 2 * c[i] + c[(i + 1) % NP]) / 4; } };
    project.belts.forEach((spec, bi) => {
      const W = spec.width / 1000; const T = spec.thick / 1000;
      const P = this.sim?.pos; const low = this.sim ? this.sim.panels.filter((q) => ['bottom', 'skirt'].includes(gen(q.panel.garment))) : [];
      const onBody = (i) => !sampleField(f, P[i * 3], P[i * 3 + 1], P[i * 3 + 2], o4) || o4[0] < 0.05;
      const Y = new Float32Array(NP).fill(NaN); const R = new Float32Array(NP).fill(NaN);
      if (low.length && spec.position !== 'waist') {
        // the waistband itself (sewn on along the waist seam): its centre line, round the body
        const wbs = (project.overlays || []).filter((ov) => ov.kind === 'waistband' && low.some((q) => q.id === ov.panel));
        for (const ov of wbs) {
          const pt = ov.points; if (pt.length < 4) continue; const A = [(pt[0][0] + pt[3][0]) / 2, (pt[0][1] + pt[3][1]) / 2]; const B = [(pt[1][0] + pt[2][0]) / 2, (pt[1][1] + pt[2][1]) / 2]; const hgt = Math.hypot(pt[0][0] - pt[3][0], pt[0][1] - pt[3][1]) / 100;
          for (let q = 0; q <= 24; q++) { const t = q / 24; const an = panelAnchor(this.sim, ov.panel, A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t); if (!an) continue; let x = 0; let y = 0; let z = 0; an.ids.forEach((id, j) => { x += P[id * 3] * an.w[j]; y += P[id * 3 + 1] * an.w[j]; z += P[id * 3 + 2] * an.w[j]; }); const k = binOf(x, z);
            const yc = y + Math.max(0, hgt / 2 - Math.max(0.002, (hgt - W) / 2)) * 0; Y[k] = Number.isFinite(Y[k]) ? (Y[k] + yc) / 2 : yc; const r = Math.hypot(x, z) + 0.003; if (!(r <= R[k])) R[k] = r; }
        }
        if (!fillRing(Y)) { const top = new Float32Array(NP).fill(-Infinity); for (const pan of low) for (let i = pan.offset; i < pan.offset + pan.count; i++) { const k = binOf(P[i * 3], P[i * 3 + 2]); if (P[i * 3 + 1] > top[k]) top[k] = P[i * 3 + 1]; } for (let i = 0; i < NP; i++) { let m = -Infinity; for (let d = -8; d <= 8; d++) m = Math.max(m, top[(i + d + NP) % NP]); Y[i] = m - Math.max(0.02, W / 2 + 0.002); } }
        smooth(Y, 4);
        // the waistband's outside where it has no sample: the cloth there
        for (const pan of low) for (let i = pan.offset; i < pan.offset + pan.count; i++) { const k = binOf(P[i * 3], P[i * 3 + 2]); if (Number.isFinite(R[k]) || Math.abs(P[i * 3 + 1] - Y[k]) > W / 2 + 0.004 || !onBody(i)) continue; const r = Math.hypot(P[i * 3], P[i * 3 + 2]); if (!(r <= R[k])) R[k] = r; }
      } else {
        // a belt worn at the waist, over a dress, shirt or coat: on the outside of whatever is there
        const y0 = body.naturalWaistY; Y.fill(y0);
        if (this.sim) for (const pan of this.sim.panels) { if (pan.panel.role === 'sleeve') continue; for (let i = pan.offset; i < pan.offset + pan.count; i++) { if (Math.abs(P[i * 3 + 1] - y0) > W / 2 + 0.004 || !onBody(i)) continue; const k = binOf(P[i * 3], P[i * 3 + 2]); const r = Math.hypot(P[i * 3], P[i * 3 + 2]); if (!(r <= R[k])) R[k] = r; } }
      }
      // where there is no cloth, the body itself
      for (let i = 0; i < NP; i++) { if (Number.isFinite(R[i])) continue; const a2 = (i / NP) * Math.PI * 2; let r = 0.45; for (let it = 0; it < 90; it++) { const d = sampleField(f, Math.sin(a2) * r, Y[i], Math.cos(a2) * r, o4) ? o4[0] : 0.05; if (d < 0.001) break; r -= Math.max(0.0008, d * 0.8); if (r <= 0.02) break; } R[i] = r + 0.002; }
      for (let i = 0; i < NP; i++) R[i] += T / 2 + 0.0012 + bi * 0.006;
      for (let it = 0; it < 12; it++) for (let i = 0; i < NP; i++) { const l = R[(i + NP - 1) % NP]; const r = R[(i + 1) % NP]; if (R[i] < (l + r) / 2) R[i] = (l + r) / 2; } // a belt under tension bridges hollows: it cannot follow the body inwards
      smooth(R, 2);
      const pts = []; const nrm = []; for (let i = 0; i < NP; i++) { const a2 = (i / NP) * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(a2) * R[i], Y[i], Math.cos(a2) * R[i])); }
      for (let i = 0; i < NP; i++) { const t = pts[(i + 1) % NP].clone().sub(pts[(i + NP - 1) % NP]).normalize(); nrm.push(new THREE.Vector3(t.z, 0, -t.x)); }
      const grp = buildBelt(spec, { pts, nrm }, this.formMats(project, spec), () => { this.dirty = true; });
      // belt loops: each one a folded strip stitched below the waistband and at its top edge, standing out over the belt
      if (low.length && spec.position !== 'waist') for (const t of this.trimObjs || []) {
        if (t.trim?.type !== 'belt-loop') continue; const wp = new THREE.Vector3(); t.obj.getWorldPosition(wp); const k = binOf(wp.x, wp.z); const a2 = (k / NP) * Math.PI * 2;
        const dir = new THREE.Vector3(Math.sin(a2), 0, Math.cos(a2)); const tan = new THREE.Vector3(Math.cos(a2), 0, -Math.sin(a2)); const rc = R[k] - T / 2 - 0.0012; const rOut = R[k] + T / 2 + 0.0016; const y0 = Y[k] - W / 2; const y1 = Y[k] + W / 2;
        const at = (r, y) => dir.clone().multiplyScalar(r).setY(y);
        const path = new THREE.CatmullRomCurve3([at(rc + 0.0008, y0 - 0.011), at(rc + 0.0012, y0 - 0.006), at(rOut - 0.001, y0 - 0.0015), at(rOut, Y[k]), at(rOut - 0.001, y1 + 0.0015), at(rc + 0.002, y1 + 0.004), at(rc + 0.0008, y1 + 0.0005)], false, 'catmullrom', 0.3).getPoints(28);
        const nr = path.map((p, q) => { const tg = path[Math.min(path.length - 1, q + 1)].clone().sub(path[Math.max(0, q - 1)]).normalize(); return new THREE.Vector3().crossVectors(tg, tan).normalize().multiplyScalar(-1); });
        const host = project.panels.find((p) => p.id === t.trim.panel); const m = this.materialFor(project, host || project.panels[0]); m.side = THREE.DoubleSide;
        const loopM = new THREE.Mesh(strand(path, nr.map((v) => (v.dot(dir) < 0 ? v.negate() : v)), 0.0105, 0.0024), m); grp.add(loopM);
        for (const yy of [y0 - 0.008, y1 - 0.001]) { const tack = new THREE.Mesh(new THREE.BoxGeometry(0.0095, 0.0016, 0.0008), new THREE.MeshBasicMaterial({ color: this.threadColor(project, host || project.panels[0]) })); tack.position.copy(at(rc + 0.0024, yy)); tack.lookAt(tack.position.clone().add(dir)); tack.rotateZ(Math.PI / 2); grp.add(tack); } // bar tacks
        t.obj.visible = false;
      }
      grp.traverse((o) => { o.frustumCulled = false; });
      this.avatarGroup.add(grp); this._beltObjs.push(grp);
    });
    this.dirty = true;
  }

  /** Hair and facial hair grown on the mannequin's head (kept under a hat's band when one is worn). */
  addHair(project) {
    const look = project?.look || {}; const key = JSON.stringify([look.hair, look.hairColor, look.hairTip, look.hairMove, look.facialHair, look.facialColor, this._mannequinKey, (project?.hats || []).map((h) => h.style + h.wear)]);
    if (this._hairGroup && this._hairKey === key && this._hairGroup.parent === this.avatarGroup) return;
    if (this._hairGroup) { this.avatarGroup.remove(this._hairGroup); this._hairGroup.traverse((m) => { m.geometry?.dispose(); }); this._hairGroup = null; }
    this._hairKey = key;
    const base = this._mannequinMesh; if (!base || project?.display?.avatar === false || (!look.hair && !look.facialHair)) return;
    const g = base.geometry; const pos = g.userData.restAttr || g.attributes.position; const idx = g.index; const nT = idx ? idx.count / 3 : pos.count / 3;
    let top = -9; for (let i = 0; i < pos.count; i++) top = Math.max(top, pos.getY(i));
    const tris = [];
    for (let t = 0; t < nT; t++) { const a = idx ? idx.getX(t * 3) : t * 3; const b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1; const c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2; if (pos.getY(a) < top - 0.3 || Math.abs(pos.getX(a)) > 0.15) continue; tris.push(pos.getX(a), pos.getY(a), pos.getZ(a), pos.getX(b), pos.getY(b), pos.getZ(b), pos.getX(c), pos.getY(c), pos.getZ(c)); }
    const hat = project.hats?.[0]; const hatDepth = hat ? (hat.kind === 'knit' ? 0.118 : hat.kind === 'beret' ? 0.085 : hat.deep ? 0.125 : hat.kind === 'bucket' ? 0.104 : hat.kind === 'visor' ? 0 : 0.098) : 0;
    let field = null; try { field = bodyField(bodyFor(project)); } catch { /* without the field hair hangs straight */ }
    this._hairGroup = buildHair(look, new Float32Array(tris), field, { hatDepth, female: bodyFor(project).mannequin === 'female' });
    this.avatarGroup.add(this._hairGroup); this.dirty = true;
  }

  /** Hats built on the mannequin's own head. */
  addHats(project) {
    for (const o of this._hatObjs || []) { this.avatarGroup.remove(o); o.traverse((m) => { m.geometry?.dispose(); }); }
    this._hatObjs = [];
    const base = this._mannequinMesh; if (!base || !project?.hats?.length) return;
    const g = base.geometry; const pos = g.userData.restAttr || g.attributes.position; const idx = g.index; const nT = idx ? idx.count / 3 : pos.count / 3;
    let top = -9; for (let i = 0; i < pos.count; i++) top = Math.max(top, pos.getY(i));
    const tris = [];
    for (let t = 0; t < nT; t++) { const a = idx ? idx.getX(t * 3) : t * 3; const b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1; const c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2; if (pos.getY(a) < top - 0.3 || Math.abs(pos.getX(a)) > 0.15) continue; tris.push(pos.getX(a), pos.getY(a), pos.getZ(a), pos.getX(b), pos.getY(b), pos.getZ(b), pos.getX(c), pos.getY(c), pos.getZ(c)); }
    for (const spec of project.hats) { const grp = buildHat(spec, new Float32Array(tris), this.formMats(project, spec)); grp.traverse((m) => { m.frustumCulled = false; }); this.avatarGroup.add(grp); this._hatObjs.push(grp); }
    this.dirty = true;
  }

  /** Shoes and boots, lasted on the mannequin's own feet: every piece in its own material. */
  addShoes(project) {
    for (const o of this._shoeObjs || []) { this.avatarGroup.remove(o); o.traverse((m) => { m.geometry?.dispose(); }); }
    this._shoeObjs = [];
    const base = this._mannequinMesh; if (!base || !project?.shoes?.length) return;
    const g = base.geometry; const pos = g.userData.restAttr || g.attributes.position; const idx = g.index;
    const nT = idx ? idx.count / 3 : pos.count / 3;
    for (const spec of project.shoes) {
      const gar = (project.garments || []).find((x) => x.id === spec.garment);
      const pseudo = { fabric: spec.fabric, fabricOverrides: {}, finish: gar?.finish || {}, garment: spec.garment };
      const part = (id) => spec.parts.find((q) => q.id === id);
      const fabOf = (id) => part(id)?.fabric || spec.fabric;
      const colorOf = (id) => part(id)?.color || (part(id)?.fabric ? resolveFabric(project, part(id).fabric).look.color : spec.color || resolveFabric(project, spec.fabric).look.color);
      const mats = { colorOf, part: (id) => { const m = this.materialFor(project, pseudo, fabOf(id), 1, { fabric: fabOf(id), color: part(id)?.color || (part(id)?.fabric ? null : spec.color) }); m.side = THREE.DoubleSide; return m; } };
      const yMax = Math.min(0.78, Math.max(spec.heelH, spec.soleT) / 100 + Math.max(spec.shaft, 22) / 100 + 0.08);
      for (const sd of [1, -1]) {
        const tris = [];
        for (let t = 0; t < nT; t++) {
          const a = idx ? idx.getX(t * 3) : t * 3; const b = idx ? idx.getX(t * 3 + 1) : t * 3 + 1; const c = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
          if (pos.getX(a) * sd < 0.02 || pos.getX(b) * sd < 0.02 || pos.getX(c) * sd < 0.02) continue;
          if (pos.getY(a) > yMax && pos.getY(b) > yMax && pos.getY(c) > yMax) continue;
          tris.push(pos.getX(a), pos.getY(a), pos.getZ(a), pos.getX(b), pos.getY(b), pos.getZ(b), pos.getX(c), pos.getY(c), pos.getZ(c));
        }
        const grp = buildShoe(spec, new Float32Array(tris), sd, mats);
        grp.traverse((m) => { m.frustumCulled = false; if (m.isMesh) { m.castShadow = true; } });
        this.avatarGroup.add(grp); this._shoeObjs.push(grp);
      }
    }
    this.dirty = true;
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
      const hand = sh.part === 'hand';
      const top = hand ? 0 : legwearTop(sh.type, body.mannequin);
      // gloves: find the wrist (the narrowest part of the forearm) on this mannequin
      let wristX = L.armStartX + 0.53;
      if (hand) { let best = 9; for (let x = L.armStartX + 0.38; x < L.armStartX + 0.62; x += 0.008) { let r = 0; let n = 0; for (let i = 0; i < pos.count; i++) { const rx = ref[i * 3]; if (rx > x && rx < x + 0.008) { r = Math.max(r, Math.hypot(ref[i * 3 + 1] - L.armY, ref[i * 3 + 2])); n++; } } if (n > 3 && r < best) { best = r; wristX = x; } } }
      // The foot of a sock or stocking is one smooth pouch: it bridges the gaps between the toes
      // instead of following each toe. The toe area is relaxed like stretched knit, then kept
      // outside the foot by the fabric thickness.
      const mitt = new Map(); const caps = []; let capZ = 9; // capZ: forward of this (reference frame) the toe cap replaces the per-toe surface
      if (!sh.footless && !hand) {
        // envelope of the forefoot: for every slice along the foot and every direction round it,
        // the furthest the foot reaches. The sock lies on that envelope, bridging between the toes.
        const z0 = toeZ - 0.085; const SL = 0.003; const NA = 36;
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
          const k0 = Math.max(0, Math.round((z0 + 0.012 - zmin) / SL)); const pad0 = sh.thickness + 0.0016; let pad = pad0;
          const ring = (k, sc) => { const out = []; for (let a = 0; a < NA; a++) { const th = (a / NA) * 2 * Math.PI - Math.PI; const rr = (R[k * NA + a] + pad) * sc; out.push([cx[k] + Math.cos(th) * rr, Math.max(0.0012, cy[k] + Math.sin(th) * rr), zmin + k * SL + (sc < 1 ? Math.sqrt(1 - sc * sc) * 0.0085 : 0)]); } return out; };
          const rings = []; for (let k = k0; k < nz; k++) { pad = sh.thickness + 0.0016 * Math.min(1, (k - k0) / 8); rings.push(ring(k, 1)); } pad = pad0; // the pouch leaves the foot gradually: no step where it starts
          for (let q = 1; q <= 7; q++) rings.push(ring(nz - 1, Math.cos((q / 8) * Math.PI / 2))); const tip = [cx[nz - 1], cy[nz - 1], zmin + (nz - 1) * SL + 0.0085];
          for (let it = 0; it < 2; it++) for (let q = 1; q + 1 < rings.length; q++) for (let a = 0; a < NA; a++) for (let c3 = 0; c3 < 2; c3++) rings[q][a][c3] = (rings[q - 1][a][c3] + 2 * rings[q][a][c3] + rings[q + 1][a][c3]) / 4; // no steps between slices
          const tri = [];
          for (let q = 0; q + 1 < rings.length; q++) for (let a = 0; a < NA; a++) { const b2 = (a + 1) % NA; tri.push(rings[q][a], rings[q + 1][a], rings[q][b2], rings[q][b2], rings[q + 1][a], rings[q + 1][b2]); }
          const lastR = rings[rings.length - 1]; for (let a = 0; a < NA; a++) tri.push(lastR[a], tip, lastR[(a + 1) % NA]);
          caps.push({ tri, cx, cy, zmin, SL, nz });
          capZ = Math.min(capZ, z0 + 0.02);
        }
        this._shellField = bodyField(body);
      }
      if (hand && sh.mitten) {
        // mitten: the four fingers (and here the thumb) share one pouch. Built in the straight-arm
        // reference pose as an envelope round the hand, then posed with the arm.
        const x0 = wristX + 0.075; const SL = 0.004; const NA = 18;
        for (const sd of [1, -1]) {
          const vs = []; for (let i = 0; i < pos.count; i++) if (ref[i * 3] * sd > x0 && Math.abs(ref[i * 3 + 1] - L.armY) < 0.16) vs.push(i);
          if (!vs.length) continue;
          const xmax = Math.max(...vs.map((i) => ref[i * 3] * sd)); const nz = Math.ceil((xmax - x0) / SL) + 1;
          const cy = new Float32Array(nz); const cz = new Float32Array(nz); const cn = new Float32Array(nz);
          const ki = (i) => Math.min(nz - 1, Math.max(0, Math.round((ref[i * 3] * sd - x0) / SL)));
          for (const i of vs) { const k = ki(i); cy[k] += ref[i * 3 + 1]; cz[k] += ref[i * 3 + 2]; cn[k]++; }
          let ly = L.armY; let lz = 0; for (let k = 0; k < nz; k++) { if (cn[k]) { cy[k] /= cn[k]; cz[k] /= cn[k]; ly = cy[k]; lz = cz[k]; } else { cy[k] = ly; cz[k] = lz; } }
          for (let it = 0; it < 4; it++) for (let k = 1; k < nz - 1; k++) { cy[k] = (cy[k - 1] + 2 * cy[k] + cy[k + 1]) / 4; cz[k] = (cz[k - 1] + 2 * cz[k] + cz[k + 1]) / 4; }
          const R = new Float32Array(nz * NA);
          for (const i of vs) { const k = ki(i); const a = (Math.round(((Math.atan2(ref[i * 3 + 2] - cz[k], ref[i * 3 + 1] - cy[k]) + Math.PI) / (2 * Math.PI)) * NA) % NA + NA) % NA; const r = Math.hypot(ref[i * 3 + 1] - cy[k], ref[i * 3 + 2] - cz[k]); if (r > R[k * NA + a]) R[k * NA + a] = r; }
          for (let it = 0; it < 14; it++) for (let k = 0; k < nz; k++) for (let a = 0; a < NA; a++) { const l = R[k * NA + (a + NA - 1) % NA]; const r = R[k * NA + (a + 1) % NA]; const f = R[Math.max(0, k - 1) * NA + a]; const g2 = R[Math.min(nz - 1, k + 1) * NA + a]; R[k * NA + a] = Math.max(R[k * NA + a], (l + r) / 2 * 0.985, (f + g2) / 2 * 0.97); }
          const pad = sh.thickness + 0.002;
          const ring = (k, sc, dx = 0) => { const out = []; for (let a = 0; a < NA; a++) { const th = (a / NA) * 2 * Math.PI - Math.PI; const rr = (R[k * NA + a] + pad) * sc; const w = gradePoint(body, sd * (x0 + k * SL + dx), cy[k] + Math.cos(th) * rr, cz[k] + Math.sin(th) * rr); const c0 = gradePoint(body, sd * (x0 + k * SL + dx), cy[k], cz[k]); out.push({ p: w, n: [w[0] - c0[0], w[1] - c0[1], w[2] - c0[2]] }); } return out; };
          const rings = []; for (let k = 0; k < nz; k++) rings.push(ring(k, 1));
          rings.push(ring(nz - 1, 0.74, 0.005), ring(nz - 1, 0.38, 0.008));
          const tipP = gradePoint(body, sd * (x0 + (nz - 1) * SL + 0.0095), cy[nz - 1], cz[nz - 1]); const b0 = gradePoint(body, sd * (x0 + (nz - 1) * SL), cy[nz - 1], cz[nz - 1]); const tip = { p: tipP, n: [tipP[0] - b0[0], tipP[1] - b0[1], tipP[2] - b0[2]] };
          const tri = []; const nrm = []; const put = (v) => { const l = Math.hypot(...v.n) || 1; tri.push(v.p); nrm.push([v.n[0] / l, v.n[1] / l, v.n[2] / l]); };
          for (let q = 0; q + 1 < rings.length; q++) for (let a = 0; a < NA; a++) { const b2 = (a + 1) % NA; for (const v of [rings[q][a], rings[q + 1][a], rings[q][b2], rings[q][b2], rings[q + 1][a], rings[q + 1][b2]]) put(v); }
          const lastR = rings[rings.length - 1]; for (let a = 0; a < NA; a++) for (const v of [lastR[a], tip, lastR[(a + 1) % NA]]) put(v);
          caps.push({ tri, nrm });
        }
      }
      const regions = hand
        ? [{ hand: { x0: wristX - sh.cuff, x1: sh.fingerless ? wristX + 0.105 : sh.mitten ? wristX + 0.09 : 9 }, look: sh.look, off: sh.thickness }]
        : [{ from: sh.footless ? 0.07 : -1, to: top, look: sh.look, off: sh.thickness }];
      for (const b of sh.bands || []) regions.push(hand ? { hand: Math.abs(b.from) <= 0.031 ? { x0: wristX + b.from, x1: wristX + b.to } : { x0: wristX - sh.cuff, x1: wristX - sh.cuff + (b.to - b.from) }, look: b.look, off: sh.thickness * 1.35 } : { from: top + b.from, to: top + b.to, look: b.look, off: sh.thickness * 1.6 });
      if (sh.toe) regions.push({ from: -1, to: 0.06, zMin: toeZ - 0.06, look: sh.toe.look, off: sh.thickness * 1.4 });
      if (sh.heel) regions.push({ from: -1, to: sh.heel.cuban ? 0.09 : 0.07, zMax: heelZ + 0.05, look: sh.heel.look, off: sh.thickness * 1.4 });
      for (const rg of regions) {
        const P = []; const N = []; const UV = [];
        for (let t = 0; t < triCount; t++) {
          const ids = [vi(t, 0), vi(t, 1), vi(t, 2)];
          let ok = true;
          for (const i of ids) {
            const x = ref[i * 3]; const y = ref[i * 3 + 1]; const z = ref[i * 3 + 2];
            if (rg.hand) { if (Math.abs(x) < rg.hand.x0 || Math.abs(x) > rg.hand.x1 || Math.abs(y - L.armY) > 0.17) { ok = false; break; } continue; }
            if (y > rg.to || y < rg.from) { ok = false; break; }
            if (Math.abs(x) > L.armStartX && y > L.crotchY) { ok = false; break; } // never the arms
            if (rg.zMin != null && z < rg.zMin) { ok = false; break; }
            if (rg.zMax != null && z > rg.zMax) { ok = false; break; }
          }
          if (ok && caps.length && !hand && ids.every((i) => ref[i * 3 + 2] > capZ && ref[i * 3 + 1] < 0.085)) ok = false;
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
            if (hand) UV.push(x / 0.1, (z + y * 0.6) / 0.1); else UV.push((ang * 0.07) / 0.1, y / 0.1);
          }
        }
        if (rg === regions[0]) for (const c of caps) { if (c.nrm) { c.tri.forEach((q, qi) => { P.push(q[0], q[1], q[2]); N.push(c.nrm[qi][0], c.nrm[qi][1], c.nrm[qi][2]); UV.push(q[1] / 0.1, q[0] / 0.1); }); continue; } { // true smooth normals: average the faces round every point of the toe
            const acc = new Map(); const key = (q) => `${Math.round(q[0] * 2e4)},${Math.round(q[1] * 2e4)},${Math.round(q[2] * 2e4)}`;
            for (let t = 0; t + 2 < c.tri.length; t += 3) { const a = c.tri[t]; const b = c.tri[t + 1]; const d = c.tri[t + 2]; const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2]; const vx = d[0] - a[0]; const vy = d[1] - a[1]; const vz = d[2] - a[2]; let fx = uy * vz - uz * vy; let fy = uz * vx - ux * vz; let fz = ux * vy - uy * vx; const k = Math.min(c.nz - 1, Math.max(0, Math.round((a[2] - c.zmin) / c.SL))); if (fx * (a[0] - c.cx[k]) + fy * (a[1] - c.cy[k]) + fz * 0.3 < 0) { fx = -fx; fy = -fy; fz = -fz; } for (const q of [a, b, d]) { const kk = key(q); const o = acc.get(kk) || [0, 0, 0]; o[0] += fx; o[1] += fy; o[2] += fz; acc.set(kk, o); } }
            for (const q of c.tri) { const o = acc.get(key(q)); const nl = Math.hypot(o[0], o[1], o[2]) || 1; const k = Math.min(c.nz - 1, Math.max(0, Math.round((q[2] - c.zmin) / c.SL))); P.push(q[0], q[1], q[2]); N.push(o[0] / nl, o[1] / nl, o[2] / nl); UV.push((Math.atan2(q[1] - c.cy[k], q[0] - c.cx[k]) * 0.07) / 0.1, q[1] / 0.1); } } }
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
      if (hand && !sh.mitten && sh.fabric && !/knit|jersey|fleece|rib/.test(sh.fabric)) { try { this.gloveDetails(sh, pos, nor, ref, idx, wristX, L); } catch (e) { console.warn('glove details failed', e); } }
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
      g.userData = { ref }; // its own record: clones share the source's userData otherwise, and a stale rest pose would be reused
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
    if (this._fold && this.sim !== sim) { this._fold = null; this.avatarGroup.visible = true; if (this._table) this._table.visible = false; }
    this.project = project;
    this.clearGarment();
    this.showAvatar(project);
    if (project.mode === 'jewelry') { this.setJewelry(project.jewelry); return; }
    this.sim = sim;
    if (!sim) { this.buildProps(project, null); this.dirty = true; return; }
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
    try { this.addHair(project); } catch (e) { console.warn('hair failed', e); }
    if (this._mannequinMat) { this._mannequinMat.color.set(project.look?.skin || '#9aa1ab'); }
    for (const m of this.panelMeshes) { const pan = project.panels.find((p) => p.id === m.userData.panelId); if (pan) { m.material.dispose(); m.material = this.materialFor(project, pan); } }
    if (this.sim) { for (const o of this.overlays) this.garment.remove(o.mesh); for (const t of this.trimObjs) this.garment.remove(t.obj); for (const s of this.stitchLines) this.garment.remove(s.line); this.overlays = []; this.trimObjs = []; this.stitchLines = []; this.buildOverlays(project, this.sim); this.buildTrims(project, this.sim); this.buildStitches(project, this.sim); this.updateGarment(); }
    this.dirty = true;
  }

  materialFor(project, panel, overrideFabric, tint = 1, look = null) {
    const fab = resolveFabric(project, overrideFabric || panel.fabric, overrideFabric ? {} : panel.fabricOverrides);
    // a sub-piece with its own material / colour does not inherit the body's dye or print
    const finish = look ? { color: look.color || (look.fabric ? undefined : panel.finish?.color) } : panel.finish || {};
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
        // keep the piece inside the garment piece it is sewn to: skip cells whose centre is off the cloth
        if (!pointInPoly(x0 + (i + 0.5) * h, y0 + (j + 0.5) * h, panel.points)) continue;
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
      const mat = this.materialFor(project, panel, fabric, ov.look ? 1 : OVERLAY_TINT[ov.kind] ?? 0.95, ov.look);
      if (ov.color && !ov.look) mat.color.set(ov.color);
      if (fabric === 'rib-knit' && !ov.color && !ov.look) { const f = resolveFabric(project, panel.fabric, panel.fabricOverrides); mat.color.set(panel.finish?.color || f.look.color).multiplyScalar(0.95); mat.map = null; }
      if (ov.kind === 'distress') { // wear and damage: a decal of the damage itself over the cloth
        const basecol = panel.finish?.color || resolveFabric(project, panel.fabric, panel.fabricOverrides).look.color;
        const tex = new THREE.CanvasTexture(distressTexture(ov.style, basecol, (ov.id || '').length * 7 + Math.round(xs[0] * 3), project.look?.skin || '#9aa1ab')); tex.colorSpace = THREE.SRGBColorSpace;
        const w = Math.max(...xs) - x0; const hh = Math.max(...ys) - y0;
        tex.repeat.set(10 / w, 10 / hh); tex.offset.set(-x0 / w, -y0 / hh);
        mat.map = tex; mat.bumpMap = null; mat.color.set('#ffffff'); mat.transparent = true; mat.alphaTest = 0.02; mat.depthWrite = false; mat.polygonOffset = true; mat.polygonOffsetFactor = -4; mat.polygonOffsetUnits = -8; mat.roughness = 0.95;
      }
      const mesh = new THREE.Mesh(g, mat);
      mesh.frustumCulled = false;
      this.garment.add(mesh);
      const lift = ov.kind === 'distress' ? 0.0014 : ov.kind === 'vent' || ov.kind === 'pleat' ? 0.0012 : ov.kind === 'lapel' || ov.kind === 'collar' || ov.kind === 'flap' ? 0.0045 : 0.003;
      this.overlays.push({ mesh, anchors, lift });
      // every sewn-on piece gets a crisp edge and its topstitching
      if (ov.kind !== 'pleat' && ov.kind !== 'distress' && !ov.hidden) {
        const base = new THREE.Color(ov.look?.color || (ov.look?.fabric ? resolveFabric(project, ov.look.fabric).look.color : null) || ov.color || panel.finish?.color || resolveFabric(project, fabric || panel.fabric, fabric ? {} : panel.fabricOverrides).look.color);
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
      const mat = this.materialFor(project, panel, spec.fabric, spec.look ? 1 : 0.97, spec.look);
      if (spec.fabric === 'rib-knit' && !spec.look) { const f = resolveFabric(project, panel.fabric, panel.fabricOverrides); mat.color.set(panel.finish?.color || f.look.color).multiplyScalar(0.93); mat.map = null; }
      const base = new THREE.Color(spec.look?.color || (spec.look?.fabric ? resolveFabric(project, spec.look.fabric).look.color : null) || panel.finish?.color || resolveFabric(project, panel.fabric, panel.fabricOverrides).look.color);
      const bd = bodyFor(project);
      const col = buildCollar(spec, stations, mat, base.clone().multiplyScalar(0.45), this.threadColor(project, panel), { x: 0, y: bd.headY, z: 0.012, r: bd.headR / 1.12 });
      this.garment.add(col.group);
      this.stitchLines.push({ line: col.group, update: col.update });
    }
  }

  /** Tied pieces drawn as the solid forms they are: tie knots and bow ties, with the band round the neck. */
  buildProps(project, sim) {
    for (const pr of project.props || []) {
      const g = (project.garments || []).find((x) => x.id === pr.garment);
      const pseudo = { fabric: g?.fabric || pr.fabric, fabricOverrides: {}, finish: g?.finish || {}, garment: pr.garment };
      const host = project.panels.find((p) => p.id === pr.panel) || pseudo;
      const mat = this.materialFor(project, host);
      const base = new THREE.Color(host.finish?.color || resolveFabric(project, host.fabric, host.fabricOverrides || {}).look.color);
      const edge = base.clone().multiplyScalar(0.5);
      // where it sits: at the front of the neck, on the surface of the body
      // walk in from in front of the neck until the body (or the shirt collar stand) is reached
      const front = [new THREE.Vector3(0, pr.y, 0.2)];
      { const f = project.display?.avatar === false ? null : bodyField(bodyFor(project)); const o4 = [0, 0, 0, 0]; const lift = pr.kind === 'bowtie' ? 0.012 : 0.016; if (f) for (let z = 0.2; z > -0.05; z -= 0.003) { front[0].z = z; if (sampleField(f, 0, pr.y, z, o4) && o4[0] <= lift) break; } }
      if (pr.band && pr.kind !== 'tie-knot') {
        const ring = []; for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI * 2; ring.push(new THREE.Vector3(Math.sin(a) * 0.12, pr.y + (pr.kind === 'bowtie' ? 0.012 : 0.008) + 0.012 * Math.cos(a) * -1, -0.01 + Math.cos(a) * 0.12)); }
        if (pr.kind !== 'bowtie') ring.splice(0, 4), ring.splice(-4, 4); // open at the front: the straps take over there
        const band = new THREE.Mesh(this.bodyRibbon(ring, pr.kind === 'bowtie' ? 0.019 : 0.028, 0.0085), mat); band.frustumCulled = false;
        this.garment.add(band);
      }
      if (pr.kind === 'tie-knot') {
        // What a tied tie shows: the knot's outer wrap with its diagonal lap, the two straps rising
        // under the collar to the neck band, the tail behind, and the blade leaving below the knot.
        const fabT = resolveFabric(project, host.fabric, host.fabricOverrides || {});
        const thick = Math.max(0.0018, ((fabT.thicknessMm || 0.3) * 2 + 0.9) / 1000); // shell, folded, over an interlining
        const K = TIE_KNOTS[pr.style] || TIE_KNOTS['four-in-hand'];
        const knot = tieKnot(pr.style, mat, edge);
        // The knot sits in the collar gap with its top tucked under the collar: just below the top of the
        // collar stand, and far enough in front of the shirt front that the two never intersect.
        const o = front[0]; const top = o.y + 0.004; o.z += 0.004;
        knot.position.set(o.x, top, o.z + 0.002);
        this.garment.add(knot);
        const V = (x, y, z) => new THREE.Vector3(o.x + x, top + y, o.z + z);
        if (pr.band) {
          // The neck loop: both ends of a tied tie leave the knot at its two shoulders, rise under the collar and pass
          // round the back of the neck. It is one strip of the same cloth, from one side of the knot round to the other,
          // so it is built as one continuous band: it cannot come apart from the knot or from itself.
          const fb = project.display?.avatar === false ? null : bodyField(bodyFor(project)); const o5 = [0, 0, 0, 0];
          let zBack = o.z - 0.12; if (fb) for (let z = -0.25; z < o.z; z += 0.003) { if (sampleField(fb, 0, top + 0.03, z, o5) && o5[0] <= 0.0085) { zBack = z; break; } }
          const zc = (o.z - 0.004 + zBack) / 2; const rz = (o.z - 0.004 - zBack) / 2; const rx = rz * 1.02;
          const a0 = 0.42; const NR = 30; const ring = [];
          for (let k = 0; k <= NR; k++) { const a = a0 + ((Math.PI * 2 - 2 * a0) * k) / NR; ring.push(new THREE.Vector3(Math.sin(a) * rx, top + 0.014 + 0.022 * (1 - Math.cos(a)) / 2, zc + Math.cos(a) * rz)); }
          this.hugBody(ring, 0.0085); // lies on the shirt's collar stand, under the collar fall
          const path = [V(K.top * 0.003, -0.006, 0.002), V(K.top * 0.005 + 0.008, 0.002, -0.004), ...ring, V(-(K.top * 0.005 + 0.008), 0.002, -0.004), V(-K.top * 0.003, -0.006, 0.002)];
          const pts = new THREE.CatmullRomCurve3(path, false, 'centripetal').getPoints(90);
          // the band lies flat on the neck (its face along the skin's normal, not held upright), folded to the narrow
          // width a tie has under the collar; every point of its width is kept clear of the neck
          const n9 = pts.length - 1; const halfW = (i) => { const e = Math.min(i, n9 - i) / n9; return 0.0145 - Math.min(1, e * 5) * 0.003; };
          const nrm = pts.map((q) => { const r = new THREE.Vector3(q.x, 0.25, q.z - zc).normalize(); if (fb && sampleField(fb, q.x, q.y, q.z, o5)) { const gl = Math.hypot(o5[1], o5[2], o5[3]); if (gl > 1e-7) { const g = new THREE.Vector3(o5[1] / gl, o5[2] / gl, o5[3] / gl); if (g.dot(r) > 0.2) return g; } } return r; });
          if (fb) for (let i = 2; i < n9 - 1; i++) { const q = pts[i]; const T = pts[i + 1].clone().sub(pts[i - 1]).normalize(); const N = nrm[i].clone().addScaledVector(T, -nrm[i].dot(T)).normalize(); const Bv = new THREE.Vector3().crossVectors(T, N).normalize(); for (let it = 0; it < 4; it++) { let need = 0; const g = new THREE.Vector3(); for (const s2 of [-1, -0.5, 0, 0.5, 1]) for (const s3 of [-1, 1]) { const e = q.clone().addScaledVector(Bv, s2 * halfW(i)).addScaledVector(N, s3 * thick * 0.6); if (sampleField(fb, e.x, e.y, e.z, o5) && 0.0085 - o5[0] > need) { need = 0.0085 - o5[0]; const gl = Math.hypot(o5[1], o5[2], o5[3]) || 1; g.set(o5[1] / gl, o5[2] / gl, o5[3] / gl); } } if (need <= 0.0002) break; q.addScaledVector(g, need); } }
          const m2 = clothBand(pts, nrm, halfW, thick * 0.9, mat); this.garment.add(m2);
        }
        { // the narrow end hangs behind the blade
          const len = (pr.tail || 26) / 100; const pts = []; for (let k = 0; k <= 14; k++) pts.push(V(0.004, -K.height * 0.01 - (k / 14) * len, 0.003));
          this.hugBody(pts.slice(2), 0.0045);
          const m3 = clothBand(pts, pts.map(() => new THREE.Vector3(0, 0, 1)), (i) => (i > 12 ? 0.019 * (1 - (i - 12) / 2 * 0.95) : 0.0145 + (i / 14) * 0.0045), thick * 0.85, mat); this.garment.add(m3);
        }
        // hang the blade from the bottom of the knot, gathered (the dimple) where it leaves
        const exit = V(0, -K.height * 0.0098, K.depth * 0.0035);
        const bp = sim?.panels.find((x) => x.id === pr.panel);
        if (bp && sim) { const ymax = Math.max(...bp.panel.points.map((q) => q[1])); for (let q = bp.offset; q < bp.offset + bp.count; q++) { if (sim.inv[q] !== 0 || sim.local[q * 2 + 1] < ymax - 1.5) continue; const lx = sim.local[q * 2] / 100; sim.pos[q * 3] = sim.prev[q * 3] = exit.x + lx * 0.9; sim.pos[q * 3 + 1] = sim.prev[q * 3 + 1] = exit.y; sim.pos[q * 3 + 2] = sim.prev[q * 3 + 2] = exit.z - Math.abs(lx) * 0.25 + (Math.abs(lx) < 0.004 ? -0.002 : 0); } }
        continue;
      }
      const obj = bowTie(pr.style, mat, edge);
      obj.position.copy(front[0]);
      this.garment.add(obj);
      if (pr.kind === 'tie-knot' && sim && pr.panel) {
        // the blade hangs from the bottom of the knot
        const a = panelAnchor(sim, pr.panel, pr.at[0], pr.at[1]);
        if (a) this.stitchLines.push({ line: obj, update: (P) => { let x = 0; let y = 0; let z = 0; a.ids.forEach((q, k) => { x += P[q * 3] * a.w[k]; y += P[q * 3 + 1] * a.w[k]; z += P[q * 3 + 2] * a.w[k]; }); obj.position.set(x, y + (obj.userData.height || 0.04) * 0.92, z - 0.004); } });
      }
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
    this.buildProps(project, sim);
    this.buildEmbroidery(project, sim);
    this.buildCollars(project, sim);
    // torn seams: broken threads and frayed yarn ends along both edges
    for (const seam of project.seams || []) {
      if (!seam.ripped) continue;
      for (const side of [seam.a, seam.b]) {
        const pan = project.panels.find((p) => p.id === side.panel); if (!pan) continue;
        const n = pan.points.length; const path = []; for (let i = side.edge; ; i++) { path.push(pan.points[i % n]); if (i % n === ((side.to ?? side.edge) + 1) % n) break; if (path.length > n + 1) break; }
        const anchors = this.pathAnchors(sim, side.panel, path, 0.35); if (anchors.length < 2) continue;
        const rnd = anchors.map((_, i) => { const s = Math.sin(i * 12.9898 + side.edge * 7.1) * 43758.5453; const t = Math.sin(i * 78.233 + 1.7) * 12543.123; return [(s - Math.floor(s)) - 0.5, (t - Math.floor(t)) - 0.5, 0.004 + (s - Math.floor(s)) * 0.009]; });
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(anchors.length * 6), 3));
        const line = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: this.threadColor(project, pan).lerp(new THREE.Color(pan.finish?.color || resolveFabric(project, pan.fabric, pan.fabricOverrides).look.color), 0.5) })); line.frustumCulled = false;
        const upd = () => { const P = sim.pos; const A = g.attributes.position; for (let i = 0; i < anchors.length; i++) { const a = anchors[i]; const b = anchors[Math.min(anchors.length - 1, i + 1)]; let x = 0; let y = 0; let z = 0; let x2 = 0; let y2 = 0; let z2 = 0; a.ids.forEach((q, k) => { x += P[q * 3] * a.w[k]; y += P[q * 3 + 1] * a.w[k]; z += P[q * 3 + 2] * a.w[k]; }); b.ids.forEach((q, k) => { x2 += P[q * 3] * b.w[k]; y2 += P[q * 3 + 1] * b.w[k]; z2 += P[q * 3 + 2] * b.w[k]; }); const r = rnd[i]; A.setXYZ(i * 2, x, y, z); A.setXYZ(i * 2 + 1, x + (x2 - x) * 0.4 + r[0] * r[2], y - r[2] * 0.8 + r[1] * 0.003, z + (z2 - z) * 0.4 + r[1] * r[2]); } A.needsUpdate = true; };
        upd(); this.garment.add(line); this.stitchLines.push({ line, update: upd });
      }
    }
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
      if ((!this.grabMode && !this.ripMode) || !this.sim) return;
      ray(e);
      const hit = rc.intersectObjects(this.panelMeshes, false)[0];
      if (!hit || !hit.face) return;
      const pan = this.sim.panels.find((p) => p.id === hit.object.userData.panelId); if (!pan) return;
      if (this.ripMode) { // tear the nearest seam open
        let best = null; let bd = 0.05; const Q = this.sim.pos;
        for (const sl of this.sim.seamLines || []) for (const i of sl.particles || []) { const d = Math.hypot(Q[i * 3] - hit.point.x, Q[i * 3 + 1] - hit.point.y, Q[i * 3 + 2] - hit.point.z); if (d < bd) { bd = d; best = sl.id; } }
        if (best) { e.stopPropagation(); this.onRip?.(best); }
        return;
      }
      if (e.shiftKey) { // pin: hold this spot of cloth where it is until unpinned
        const ids0 = [hit.face.a, hit.face.b, hit.face.c].map((i) => i + pan.offset);
        this.pins = (this.pins || []).filter((q) => q.sim === this.sim);
        const mk = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff4f1f', depthTest: false })); mk.renderOrder = 99;
        const sim = this.sim; mk.onBeforeRender = () => { const i = ids0[0]; mk.position.set(sim.pos[i * 3], sim.pos[i * 3 + 1], sim.pos[i * 3 + 2]); }; mk.position.copy(hit.point); mk.frustumCulled = false;
        this.pins.push({ sim, ids: ids0, inv: ids0.map((i) => sim.inv[i]), mk }); for (const i of ids0) sim.inv[i] = 0;
        this.scene.add(mk); this.dirty = true; this.onPins?.(this.pins.length); e.stopPropagation(); return;
      }
      // pinch the three corners of the triangle under the pointer
      const ids = [hit.face.a, hit.face.b, hit.face.c].map((i) => i + pan.offset);
      const P = this.sim.pos;
      const fab = pan.fab || {}; const emt = fab.mech?.emt ?? 6; const gsm = fab.weightGsm || 200; const stiff = fab.mech?.B ?? 0.1;
      // how readily the pinched cloth follows the hand, and how far it can be drawn before it resists
      const gain = Math.max(0.07, Math.min(0.6, 0.42 * Math.sqrt(160 / gsm) / (1 + stiff * 0.5)));
      const reach = Math.max(0.035, Math.min(0.3, 0.03 + emt * 0.0042 + 0.02 * Math.sqrt(160 / gsm)));
      this._grab = { gain, reach, anchor: hit.point.clone(), ids, inv: ids.map((i) => this.sim.inv[i]), off: ids.map((i) => new THREE.Vector3(P[i * 3] - hit.point.x, P[i * 3 + 1] - hit.point.y, P[i * 3 + 2] - hit.point.z)), dist: hit.distance, target: hit.point.clone(), id: e.pointerId };
      if (this.grabSym) { // symmetric pinching: the mirrored spot on the other side of the body moves with it
        let mi = -1; let md = 0.04; for (let i = 0; i < P.length / 3; i++) { const d = Math.hypot(P[i * 3] + hit.point.x, P[i * 3 + 1] - hit.point.y, P[i * 3 + 2] - hit.point.z); if (d < md) { md = d; mi = i; } }
        if (mi >= 0 && Math.abs(hit.point.x) > 0.02) this._grab.mirror = { i: mi, inv: this.sim.inv[mi] };
      }
      this.controls.enabled = false;
      el.setPointerCapture?.(e.pointerId);
      e.stopPropagation();
    }, true);
    el.addEventListener('pointermove', (e) => { if (!this._grab || e.pointerId !== this._grab.id) return; ray(e); this._grab.target.copy(rc.ray.origin).addScaledVector(rc.ray.direction, this._grab.dist); { const g2 = this._grab; const off = g2.target.clone().sub(g2.anchor); const l = off.length(); if (l > g2.reach) g2.target.copy(g2.anchor).addScaledVector(off, (g2.reach + (l - g2.reach) * 0.12) / l); } this.simAwake = true; this._simFrames = Math.min(this._simFrames || 0, 500); this._still = 0; });
    const end = (e) => { if (!this._grab || e.pointerId !== this._grab.id) return; const pinned = new Set((this.pins || []).filter((q) => q.sim === this.sim).flatMap((q) => q.ids)); this._grab.ids.forEach((i, k) => { this.sim.inv[i] = pinned.has(i) ? 0 : this._grab.inv[k]; }); if (this._grab.mirror) this.sim.inv[this._grab.mirror.i] = this._grab.mirror.inv; this._grab = null; this.controls.enabled = true; this.simAwake = true; this._simFrames = Math.min(this._simFrames || 0, 420); this._still = 0; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  /** Fold the garment for packing, step by step (plan from core/folding.js). */
  fold(project, plan, onDone) {
    if (!this._table) { this._table = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 1.0), new THREE.MeshStandardMaterial({ color: '#c9b79c', roughness: 0.8 })); this._table.position.set(0, 0.73, 0); this._table.receiveShadow = true; this.scene.add(this._table); }
    this._table.visible = true; this._grab = null;
    const ok = startFold(this, project, plan, onDone); if (!ok) this._table.visible = false; return ok;
  }
  unfold() { stopFold(this); if (this._table) this._table.visible = false; this.frameGarment?.(); }
  get folded() { return Boolean(this._fold); }

  /** Let go of every pinned spot. */
  clearPins() { for (const q of this.pins || []) { this.scene.remove(q.mk); if (q.sim === this.sim) q.ids.forEach((i, k) => { q.sim.inv[i] = q.inv[k]; }); } this.pins = []; this.simAwake = true; this._simFrames = 0; this._still = 0; this.dirty = true; this.onPins?.(0); }

  /** A faint ring round the body at a height (while measuring). */
  showLevel(y) { if (!this._level) { this._level = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.345, 64), new THREE.MeshBasicMaterial({ color: '#ff4f1f', side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); this._level.rotation.x = -Math.PI / 2; this.scene.add(this._level); } this._level.position.y = y; this._level.visible = true; clearTimeout(this._levelT); this._levelT = setTimeout(() => { this._level.visible = false; this.dirty = true; }, 2500); this.dirty = true; }

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
