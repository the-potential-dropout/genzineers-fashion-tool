// Prints vertex distribution of a GLB (positions of all meshes).
import { readFileSync } from 'node:fs';
export function glbPositions(file) {
  const b = readFileSync(file);
  const jsonLen = b.readUInt32LE(12);
  const json = JSON.parse(b.slice(20, 20 + jsonLen).toString());
  const binStart = 20 + jsonLen + 8;
  const out = [];
  for (const mesh of json.meshes) for (const prim of mesh.primitives) {
    const acc = json.accessors[prim.attributes.POSITION]; const bv = json.bufferViews[acc.bufferView];
    const f = new Float32Array(b.buffer.slice(b.byteOffset + binStart + (bv.byteOffset || 0) + (acc.byteOffset || 0), b.byteOffset + binStart + (bv.byteOffset || 0) + (acc.byteOffset || 0) + acc.count * 12));
    for (let i = 0; i < acc.count; i++) out.push([f[i * 3], f[i * 3 + 1], f[i * 3 + 2]]);
  }
  return { out, json };
}
if (process.argv[2] && /glb-stats\.mjs$/.test(process.argv[1] || '')) {
  const { out, json } = glbPositions(process.argv[2]);
  const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))].toFixed(3); };
  for (const [k, i] of [['x', 0], ['y', 1], ['z', 2]]) console.log(k, 'min', q(out.map((v) => v[i]), 0), 'p1', q(out.map((v) => v[i]), 0.01), 'p50', q(out.map((v) => v[i]), 0.5), 'p99', q(out.map((v) => v[i]), 0.99), 'max', q(out.map((v) => v[i]), 1));
  console.log('verts', out.length, 'nodes', json.nodes.map((n) => [n.name, n.scale, n.rotation, n.translation]));
}
