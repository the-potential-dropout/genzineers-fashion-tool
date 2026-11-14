// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Custom mannequins: bring your own body (a scan, a sculpt, a doll or puppet
 * body) as STL, OBJ, PLY, GLB/GLTF, FBX, DAE, 3MF or STEP. The mesh is stood on
 * the floor, centred, scaled to the height you give, simplified if it is very
 * dense, and then used for both the display and the cloth collision field.
 * Stored on this device (IndexedDB) so it survives a restart.
 */
import * as THREE from 'three';
import { loadModel } from '../io/import.js';
import { setCustomBodyMesh } from '../sim/bodyfield.js';

const DB = 'gft-assets';
function open() { return new Promise((res) => { try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore('mesh', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }); }
async function idb(mode, fn) { const db = await open(); if (!db) return null; return new Promise((res) => { const t = db.transaction('mesh', mode); const q = fn(t.objectStore('mesh')); t.oncomplete = () => res(q?.result ?? null); t.onerror = () => res(null); }); }

/** Merge every mesh in a loaded model into one indexed triangle soup (world transforms applied). */
function soup(root) {
  const pos = []; const idx = [];
  root.updateMatrixWorld?.(true);
  const v = new THREE.Vector3();
  root.traverse?.((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const p = o.geometry.attributes.position; const base = pos.length / 3;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); pos.push(v.x, v.y, v.z); }
    if (o.geometry.index) for (let i = 0; i < o.geometry.index.count; i++) idx.push(o.geometry.index.getX(i) + base); else for (let i = 0; i < p.count; i++) idx.push(i + base);
  });
  if (root.isMesh && !pos.length && root.geometry) { const p = root.geometry.attributes.position; for (let i = 0; i < p.count; i++) pos.push(p.getX(i), p.getY(i), p.getZ(i)); if (root.geometry.index) for (let i = 0; i < root.geometry.index.count; i++) idx.push(root.geometry.index.getX(i)); else for (let i = 0; i < p.count; i++) idx.push(i); }
  return { pos, idx };
}

/** Vertex clustering: merge vertices on a grid so a scan of a million triangles becomes a workable body. */
function simplify(P, idx, cell) {
  const map = new Map(); const out = []; const remap = new Uint32Array(P.length / 3);
  for (let i = 0; i < P.length; i += 3) {
    const k = `${Math.round(P[i] / cell)},${Math.round(P[i + 1] / cell)},${Math.round(P[i + 2] / cell)}`;
    let j = map.get(k); if (j === undefined) { j = out.length / 3; map.set(k, j); out.push(P[i], P[i + 1], P[i + 2]); }
    remap[i / 3] = j;
  }
  const tri = [];
  for (let i = 0; i < idx.length; i += 3) { const a = remap[idx[i]]; const b = remap[idx[i + 1]]; const c = remap[idx[i + 2]]; if (a !== b && b !== c && a !== c) tri.push(a, b, c); }
  return { P: new Float32Array(out), idx: new Uint32Array(tri) };
}

/**
 * Import a body file. upAxis: 'y' (default) or 'z' (most CAD / scan exports). heightCm: real height to scale to.
 * Returns { id, name, height, triangles }.
 */
export async function importMannequin(file, data, { heightCm = 175, upAxis = 'auto' } = {}) {
  const root = await loadModel(file, data);
  const { pos, idx } = soup(root);
  if (pos.length < 9 || idx.length < 3) throw new Error('No mesh found in that file');
  // stand it up: the tallest axis is "up" unless told otherwise
  let min = [1e9, 1e9, 1e9]; let max = [-1e9, -1e9, -1e9];
  for (let i = 0; i < pos.length; i += 3) for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], pos[i + a]); max[a] = Math.max(max[a], pos[i + a]); }
  const ext = [0, 1, 2].map((a) => max[a] - min[a]);
  const up = upAxis === 'z' ? 2 : upAxis === 'y' ? 1 : ext[2] > ext[1] * 1.2 ? 2 : 1;
  let P = new Float32Array(pos.length);
  const s = (heightCm / 100) / (ext[up] || 1);
  const cx = (min[0] + max[0]) / 2; const cd = up === 2 ? (min[1] + max[1]) / 2 : (min[2] + max[2]) / 2;
  for (let i = 0; i < pos.length; i += 3) {
    // z-up files: x stays, z -> y (up), -y -> z (so the front still faces the viewer)
    if (up === 2) { P[i] = (pos[i] - cx) * s; P[i + 1] = (pos[i + 2] - min[2]) * s; P[i + 2] = -(pos[i + 1] - cd) * s; } else { P[i] = (pos[i] - cx) * s; P[i + 1] = (pos[i + 1] - min[1]) * s; P[i + 2] = (pos[i + 2] - cd) * s; }
  }
  let I = new Uint32Array(idx);
  let cell = 0.004;
  while (I.length / 3 > 60000 && cell < 0.03) { const r = simplify(P, I, cell); P = r.P; I = r.idx; cell *= 1.5; }
  const id = `mq_${Date.now().toString(36)}`;
  const rec = { id, name: file, height: heightCm, P, idx: I };
  setCustomBodyMesh(id, rec);
  await idb('readwrite', (st) => st.put(rec));
  return { id, name: file, height: heightCm, triangles: I.length / 3 };
}

/** Make sure a stored custom mannequin is in memory (after a restart). */
export async function ensureMannequin(id) {
  if (!id) return false;
  const rec = await idb('readonly', (st) => st.get(id));
  if (!rec) return false;
  setCustomBodyMesh(id, rec);
  return true;
}
