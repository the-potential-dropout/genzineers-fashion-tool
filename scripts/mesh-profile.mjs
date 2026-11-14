// Mannequin mesh cross-sections (reference frame, T-pose): half-width and depth per height.
import { readFileSync } from 'node:fs';
import { MANNEQUINS } from '../src/sim/mannequins.js';
export function loadMannequin(which) {
  const buf = readFileSync(new URL(`../public/models/mannequin-${which}.glb`, import.meta.url));
  const jl = buf.readUInt32LE(12); const json = JSON.parse(buf.subarray(20, 20 + jl).toString());
  const bin = buf.subarray(20 + jl + 8);
  const prim = json.meshes[0].primitives[0];
  const acc = json.accessors[prim.attributes.POSITION]; const bv = json.bufferViews[acc.bufferView];
  const f = new Float32Array(bin.buffer.slice(bin.byteOffset + (bv.byteOffset || 0) + (acc.byteOffset || 0), bin.byteOffset + (bv.byteOffset || 0) + (acc.byteOffset || 0) + acc.count * 12));
  const ia = json.accessors[prim.indices]; const ibv = json.bufferViews[ia.bufferView];
  const raw = bin.buffer.slice(bin.byteOffset + (ibv.byteOffset || 0), bin.byteOffset + (ibv.byteOffset || 0) + ibv.byteLength);
  const idx = ia.componentType === 5125 ? new Uint32Array(raw) : new Uint16Array(raw);
  const M = MANNEQUINS[which]; let minY = Infinity; for (let i = 1; i < f.length; i += 3) minY = Math.min(minY, f[i]);
  const P = new Float32Array(f.length);
  for (let i = 0; i < f.length; i += 3) { P[i] = f[i] * M.scale; P[i + 1] = (f[i + 1] - minY) * M.scale; P[i + 2] = f[i + 2] * M.scale - M.zOffset; }
  return { P, idx, M };
}
if (/mesh-profile/.test(process.argv[1] || '')) {
  const { P, M } = loadMannequin(process.argv[2] || 'male');
  console.log('landmarks', JSON.stringify(M.landmarks));
  for (let y = 1.56; y >= 1.26; y -= 0.02) {
    let w = 0; let zf = -9; let zb = 9; let wn = 0;
    for (let i = 0; i < P.length; i += 3) if (Math.abs(P[i + 1] - y) < 0.006) { w = Math.max(w, Math.abs(P[i])); if (Math.abs(P[i]) < 0.03) { zf = Math.max(zf, P[i + 2]); zb = Math.min(zb, P[i + 2]); } }
    console.log('y', y.toFixed(2), 'halfW', (w * 100).toFixed(1), 'z centre', (zb * 100).toFixed(1), (zf * 100).toFixed(1));
  }
}
