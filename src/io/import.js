// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Importers.
 *  - Projects:  .json (this app)
 *  - Patterns:  .dxf (AAMA / ASTM / generic polylines), .svg (paths, polygons)
 *  - 3D / CAD:  .stl .obj .glb .gltf .ply .3mf .fbx .dae (three.js loaders)
 *               .step .stp .iges .igs .brep (OpenCascade WASM, loaded on demand)
 *               .blend (desktop: auto-converted with Blender if installed)
 * Loaders are dynamically imported so they cost nothing until used.
 */
import * as THREE from 'three';

export const MODEL_EXT = ['stl', 'obj', 'glb', 'gltf', 'ply', '3mf', 'fbx', 'dae', 'step', 'stp', 'iges', 'igs', 'brep', 'blend'];
export const PATTERN_EXT = ['dxf', 'svg'];

const ext = (name) => name.toLowerCase().split('.').pop();
export const readAs = (file, how) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r[how](file); });

/** Parse DXF polylines into closed pieces (cm). Handles LWPOLYLINE, POLYLINE/VERTEX, and LINE chains. */
export function parseDXF(text) {
  const lines = text.split(/\r?\n/).map((s) => s.trim());
  const pieces = [];
  let units = 1; // mm by default -> cm divide by 10
  for (let i = 0; i < lines.length - 1; i++) if (lines[i] === '$INSUNITS') { const u = Number(lines[i + 2]); units = u === 1 ? 25.4 : u === 5 ? 10 : u === 6 ? 1000 : 1; }
  let cur = null; let label = '';
  const flush = () => { if (cur && cur.length >= 3) pieces.push({ name: label || `Piece ${pieces.length + 1}`, points: cur.map(([x, y]) => [(x * units) / 10, (y * units) / 10]) }); cur = null; };
  for (let i = 0; i < lines.length - 1; i += 2) {
    const code = lines[i]; const val = lines[i + 1];
    if (code === '0') {
      if (val === 'LWPOLYLINE' || val === 'POLYLINE') { flush(); cur = []; }
      else if (val === 'SEQEND' || (cur && val !== 'VERTEX' && val !== 'LWPOLYLINE')) { if (val === 'SEQEND' || val === 'POLYLINE' || val === 'ENDSEC' || val === 'TEXT') flush(); }
      if (val === 'TEXT') label = '';
    } else if (cur && code === '10') cur.push([Number(val), 0]);
    else if (cur && code === '20' && cur.length) cur[cur.length - 1][1] = Number(val);
    else if (code === '1' && !cur) label = val.split('|')[0].trim();
  }
  flush();
  // Keep the outermost (cut line) of nested duplicates: drop pieces fully inside a bigger one with similar size
  return pieces.filter((p, i) => !pieces.some((q, j) => j !== i && area(q.points) > area(p.points) * 1.02 && area(q.points) < area(p.points) * 1.4 && inside(p.points[0], q.points)));
}
const area = (pts) => { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return Math.abs(a / 2); };
const inside = ([x, y], pts) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

/** Parse SVG shapes into pieces (cm; assumes mm user units unless a viewBox/width says otherwise). */
export function parseSVG(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const svg = doc.documentElement;
  const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  host.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden';
  document.body.appendChild(host);
  const pieces = [];
  const wAttr = svg.getAttribute('width') || '';
  const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  let unitToMm = 1;
  if (/mm$/.test(wAttr) && vb.length === 4) unitToMm = parseFloat(wAttr) / vb[2];
  else if (/in$/.test(wAttr) && vb.length === 4) unitToMm = (parseFloat(wAttr) * 25.4) / vb[2];
  else if (/px$|^\d+$/.test(wAttr)) unitToMm = 25.4 / 96;
  for (const el of svg.querySelectorAll('path, polygon, polyline, rect, circle, ellipse')) {
    const clone = el.cloneNode(true);
    host.appendChild(clone);
    let pts = [];
    if (clone.getTotalLength) {
      const L = clone.getTotalLength();
      const n = Math.min(400, Math.max(12, Math.round(L / 4)));
      for (let k = 0; k < n; k++) { const p = clone.getPointAtLength((L * k) / n); pts.push([(p.x * unitToMm) / 10, (-p.y * unitToMm) / 10]); }
    }
    host.removeChild(clone);
    if (pts.length >= 3 && area(pts) > 4) pieces.push({ name: el.getAttribute('id') || el.getAttribute('inkscape:label') || `Piece ${pieces.length + 1}`, points: pts });
  }
  host.remove();
  return pieces.filter((p, i) => !pieces.some((q, j) => j !== i && area(q.points) > area(p.points) * 1.02 && area(q.points) < area(p.points) * 1.4 && inside(p.points[0], q.points)));
}

/** Turn imported pieces into add_panel actions laid out in front of the avatar. */
export function piecesToActions(pieces) {
  let x = -0.6;
  return pieces.map((pc, i) => {
    const xs = pc.points.map((p) => p[0]); const ys = pc.points.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2; const y0 = Math.min(...ys);
    const pts = pc.points.map(([a, b]) => [Math.round((a - cx) * 10) / 10, Math.round((b - y0) * 10) / 10]);
    const w = (Math.max(...xs) - Math.min(...xs)) / 100;
    const a = { type: 'add_panel', id: `imp-${i}-${Date.now().toString(36)}`, name: pc.name, points: pts, placement: { position: [x + w / 2, 0.6, 0.45], rotationY: 0 } };
    x += w + 0.05;
    return a;
  });
}

let occtPromise;
async function loadOCCT() {
  // OpenCascade compiled to WASM (~7 MB), fetched only when a STEP/IGES file is imported.
  occtPromise ||= (async () => {
    await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js'; s.onload = res; s.onerror = () => rej(new Error('Could not load the STEP/IGES converter (needs internet once).')); document.head.appendChild(s); });
    return window.occtimportjs({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/${f}` });
  })();
  return occtPromise;
}

/** Load any supported 3D/CAD file (ArrayBuffer or text) into a THREE.Object3D. */
export async function loadModel(name, data) {
  const e = ext(name);
  const buf = typeof data === 'string' && data.startsWith('data:') ? await (await fetch(data)).arrayBuffer() : data;
  const text = () => new TextDecoder().decode(buf);
  switch (e) {
    case 'stl': { const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js'); return new THREE.Mesh(new STLLoader().parse(buf)); }
    case 'obj': { const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js'); return new OBJLoader().parse(text()); }
    case 'ply': { const { PLYLoader } = await import('three/examples/jsm/loaders/PLYLoader.js'); const g = new PLYLoader().parse(buf); g.computeVertexNormals(); return new THREE.Mesh(g); }
    case '3mf': { const { ThreeMFLoader } = await import('three/examples/jsm/loaders/3MFLoader.js'); return new ThreeMFLoader().parse(buf); }
    case 'fbx': { const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js'); return new FBXLoader().parse(buf, ''); }
    case 'dae': { const { ColladaLoader } = await import('three/examples/jsm/loaders/ColladaLoader.js'); return new ColladaLoader().parse(text(), '').scene; }
    case 'glb': case 'gltf': { const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js'); return new Promise((res, rej) => new GLTFLoader().parse(buf, '', (g) => res(g.scene), rej)); }
    case 'step': case 'stp': case 'iges': case 'igs': case 'brep': {
      const occt = await loadOCCT();
      const fn = e.startsWith('st') ? 'ReadStepFile' : e === 'brep' ? 'ReadBrepFile' : 'ReadIgesFile';
      const r = occt[fn](new Uint8Array(buf), null);
      if (!r.success) throw new Error('CAD file could not be read');
      const grp = new THREE.Group();
      for (const m of r.meshes) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(m.attributes.position.array, 3));
        if (m.attributes.normal) g.setAttribute('normal', new THREE.Float32BufferAttribute(m.attributes.normal.array, 3));
        g.setIndex(Array.from(m.index.array));
        if (!m.attributes.normal) g.computeVertexNormals();
        grp.add(new THREE.Mesh(g));
      }
      return grp;
    }
    case 'blend': {
      if (window.__TAURI_INTERNALS__) {
        const { invoke } = await import('./tauri.js');
        const glb = await invoke('convert_blend', { data: Array.from(new Uint8Array(buf)) });
        return loadModel('converted.glb', new Uint8Array(glb).buffer);
      }
      throw new Error('.blend files: in Blender use File → Export → glTF 2.0 (.glb) and import that, or use the desktop app with Blender installed for automatic conversion.');
    }
    default: throw new Error(`Unsupported file type .${e}`);
  }
}

/** Deform a geometry in place: taper (top/bottom scale), twist (deg over height), bend (deg). */
export function deformGeometry(geo, { taper = 0, twist = 0, bend = 0 } = {}) {
  if (!taper && !twist && !bend) return geo;
  geo.computeBoundingBox();
  const b = geo.boundingBox; const h = b.max.y - b.min.y || 1; const cy = (b.max.y + b.min.y) / 2;
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i); let y = p.getY(i); let z = p.getZ(i);
    const t = (y - b.min.y) / h; // 0..1
    const s = 1 + taper * (t - 0.5);
    x *= s; z *= s;
    const a = (twist * Math.PI) / 180 * (t - 0.5);
    [x, z] = [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];
    if (bend) { const ang = (bend * Math.PI) / 180 * (y - cy) / h; const R = h / ((bend * Math.PI) / 180); const xr = R - (R - x) * Math.cos(ang); const yr = cy + (R - x) * Math.sin(ang); x = xr; y = yr; }
    p.setXYZ(i, x, y, z);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}
