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
import { resolveTrim } from '../core/trims.js';
import { resolveStitch } from '../core/assembly.js';
import { DYES } from '../core/color.js';
import { bodyFor } from '../core/sizes.js';
import { buildAvatar, gradePoint } from '../sim/avatar.js';
import { MANNEQUINS } from '../sim/mannequins.js';
import { panelAnchor } from '../sim/cloth.js';
import { fabricTextures } from './textures.js';
import { buildJewelry, metalMaterial, gemMaterial } from './jewelry3d.js';
import { loadModel, deformGeometry } from '../io/import.js';
import { METALS } from '../core/jewelry.js';

const OVERLAY_TINT = { lapel: 0.92, collar: 0.95, cuff: 0.9, band: 0.88, waistband: 0.9, pocket: 0.97, flap: 0.94, placket: 0.96, yoke: 0.98, hood: 0.93, belt: 0.85, fly: 0.97, vent: 0.7, pleat: 0.75, pinch: 0.8 };

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
      const mv = this.sim.step(1 / 60);
      this.onStep?.(mv);
      this.updateGarment();
      this._simFrames = (this._simFrames || 0) + 1;
      if (mv < 6e-5) this._still = (this._still || 0) + 1; else this._still = 0;
      // sleep when settled (or after 12 s): zero CPU/GPU while idle
      if ((this._still > 40 && this.sim.settled?.()) || this._simFrames > 720) { this.simAwake = false; this.onSleep?.(); }
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
  }

  showAvatar(project) {
    this.avatarGroup.clear();
    this.stand.clear();
    const mat = this._mannequinMat ||= new THREE.MeshStandardMaterial({ color: '#9aa1ab', roughness: 0.55, metalness: 0.02 }); // cool grey mannequin contrasts with fabrics
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
    const key = `${body.mannequin}:${body.hs}:${body.gs}:${body.hipS}`;
    if (this._mannequinKey === key && this._mannequinMesh) { this.avatarGroup.add(this._mannequinMesh); return; }
    // capsule stand-in until the mesh has loaded
    for (const c of buildAvatar(body)) this.avatarGroup.add(this.capsule(c, mat));
    this.loadMannequin(body, key, mat);
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
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i) * M.scale; const y = (p.getY(i) - minY) * M.scale; const z = p.getZ(i) * M.scale - M.zOffset;
        p.setXYZ(i, ...gradePoint(body, x, y, z));
      }
      g.computeVertexNormals();
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat);
      if (this._mannequinKey !== key) this._mannequinMesh?.geometry.dispose();
      this._mannequinKey = key;
      this._mannequinMesh = mesh;
      if (this.project?.mode !== 'jewelry' && this.project?.display?.avatar !== false && key === `${bodyFor(this.project).mannequin}:${bodyFor(this.project).hs}:${bodyFor(this.project).gs}:${bodyFor(this.project).hipS}`) {
        this.avatarGroup.clear();
        this.avatarGroup.add(mesh);
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
      mesh.userData.panelId = pan.id;
      mesh.frustumCulled = false;
      this.garment.add(mesh);
      this.panelMeshes.push(mesh);
    }
    this.buildOverlays(project, sim);
    this.buildTrims(project, sim);
    this.buildStitches(project, sim);
    this.updateGarment();
    this.simAwake = true;
    this._still = 0;
    this._simFrames = 0;
    this.dirty = true;
  }

  /** Re-apply looks only (no physics rebuild). */
  refreshLooks(project) {
    this.project = project;
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
    const rep = fab.look.patternScale || 6;
    map.repeat.set(rep, rep); bump.repeat.set(rep, rep);
    map.needsUpdate = true; bump.needsUpdate = true;
    const metallicPrint = finish.print?.method && ['foil', 'glitter', 'reflective'].includes(finish.print.method);
    return new THREE.MeshPhysicalMaterial({
      map, bumpMap: bump, bumpScale: 0.6,
      color: new THREE.Color(tint, tint, tint),
      roughness: fab.look.roughness, metalness: metallicPrint ? 0.6 : fab.look.metalness || 0,
      sheen: fab.look.sheen || 0, sheenColor: new THREE.Color(fab.look.sheenColor || '#ffffff'), sheenRoughness: 0.6,
      transparent: (fab.look.opacity ?? 1) < 1 || fab.look.pattern === 'lace' || fab.look.pattern === 'mesh',
      opacity: fab.look.opacity ?? 1, alphaTest: fab.look.pattern === 'lace' || fab.look.pattern === 'mesh' ? 0.3 : 0,
      side: THREE.DoubleSide,
    });
  }

  buildOverlays(project, sim) {
    for (const ov of project.overlays || []) {
      const panel = project.panels.find((p) => p.id === ov.panel);
      if (!panel) continue;
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
    }
  }

  buildTrims(project, sim) {
    for (const t of project.trims || []) {
      const def = resolveTrim(t.type);
      if (def.internal && t.type !== 'tie-knot') continue;
      const panel = project.panels.find((p) => p.id === t.panel);
      if (!panel) continue;
      const color = t.color || (def.useFabric ? (panel.finish?.color || resolveFabric(project, panel.fabric).look.color) : def.color);
      const mat = new THREE.MeshPhysicalMaterial({ color, metalness: def.metalness, roughness: def.roughness, clearcoat: def.metalness > 0.5 ? 0.4 : 0.2, transmission: def.shape === 'crystal' ? 0.9 : 0, ior: 1.7, thickness: 0.003, iridescence: def.iridescent ? 0.8 : 0 });
      const s = (t.size || def.size) / 1000;
      if (def.line && t.to) {
        const anchors = [];
        if (t.toPanel) anchors.push(panelAnchor(sim, t.panel, t.at[0], t.at[1]), panelAnchor(sim, t.toPanel, t.to[0], t.to[1]));
        else {
          const n = Math.max(2, Math.round(Math.hypot(t.to[0] - t.at[0], t.to[1] - t.at[1]) / (def.strap ? 2 : 0.6)));
          for (let k = 0; k <= n; k++) anchors.push(panelAnchor(sim, t.panel, t.at[0] + ((t.to[0] - t.at[0]) * k) / n, t.at[1] + ((t.to[1] - t.at[1]) * k) / n));
        }
        if (anchors.some((a) => !a)) continue;
        let obj;
        if (def.strap) obj = new THREE.Mesh(new THREE.BufferGeometry(), mat);
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

  buildStitches(project, sim) {
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
      if (t.line) {
        if (t.def.strap) {
          const pts = t.anchors.map((a) => { at(a, v, n); return v.clone().addScaledVector(n, 0.004); });
          const p0 = pts[0]; const p1 = pts[pts.length - 1];
          const mid = p0.clone().add(p1).multiplyScalar(0.5).add(new THREE.Vector3(0, t.trim.arch ?? 0.2, 0));
          const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
          t.obj.geometry.dispose();
          t.obj.geometry = new THREE.TubeGeometry(curve, 24, Math.max(0.003, t.s * 0.12), 6, false);
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
      const arr = s.line.geometry.attributes.position.array;
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
