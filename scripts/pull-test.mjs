// Pulling hard on clothes: seams hold (a sewn seam opens by millimetres, never tears), the cloth stretches only as its
// fibres allow, and on release the garment springs back onto the body instead of coming off it.
import { readFileSync } from 'node:fs';
import { createProject } from '../src/core/project.js';
import { buildCloth, initSolver, loadBodyMesh } from '../src/sim/cloth.js';
import { bodyField, sampleField } from '../src/sim/bodyfield.js';
import { bodyFor } from '../src/core/sizes.js';
globalThis.fetch = async () => ({ arrayBuffer: async () => readFileSync(new URL('../public/atelier_sim.wasm', import.meta.url)) });
await initSolver('x'); await loadBodyMesh('male'); await loadBodyMesh('female');
const CASES = [['oxford-shirt', 'front-r', [0, 0.35, 0.25]], ['jeans-straight', 'front-l', [0, -0.25, 0.3]], ['crew-tee', 'back', [0, 0.1, -0.35]]];
let bad = 0;
for (const [t, pid, pull] of CASES) {
  const p = createProject(t); const sim = buildCloth(p); const n = sim.pos.length / 3; const f = bodyField(bodyFor(p)); const o = [0, 0, 0, 0];
  for (let k = 0; k < 600; k++) sim.step(1 / 60);
  const before = sim.pos.slice(); const pan = sim.panels.find((q) => q.id.endsWith(pid));
  // pinch the middle of the piece: three neighbouring particles, held the way the viewer holds them
  let c = [0, 0, 0]; for (let i = pan.offset; i < pan.offset + pan.count; i++) for (let a = 0; a < 3; a++) c[a] += sim.pos[i * 3 + a] / pan.count;
  const ids = []; { const d = []; for (let i = pan.offset; i < pan.offset + pan.count; i++) d.push([Math.hypot(sim.pos[i * 3] - c[0], sim.pos[i * 3 + 1] - c[1], sim.pos[i * 3 + 2] - c[2]), i]); d.sort((x, y) => x[0] - y[0]); for (const [, i] of d.slice(0, 3)) ids.push(i); }
  const inv0 = ids.map((i) => sim.inv[i]); const start = ids.map((i) => [sim.pos[i * 3], sim.pos[i * 3 + 1], sim.pos[i * 3 + 2]]);
  const reach = 0.3 * 1.5; const L = Math.hypot(...pull); const tgt = pull.map((v) => (v / L) * reach); // as far as the viewer lets the hand draw it
  let maxSeam = 0;
  for (let k = 0; k < 300; k++) {
    ids.forEach((i, j) => { sim.inv[i] = inv0[j] * 0.15; for (let a = 0; a < 3; a++) { const want = start[j][a] + tgt[a]; sim.pos[i * 3 + a] += (want - sim.pos[i * 3 + a]) * 0.3; sim.prev[i * 3 + a] = sim.pos[i * 3 + a]; } });
    sim.step(1 / 60);
    if (k % 30 === 29) for (let e = 0; e < sim.si.length / 2; e++) { const u = sim.si[e * 2]; const w = sim.si[e * 2 + 1]; maxSeam = Math.max(maxSeam, Math.hypot(sim.pos[u * 3] - sim.pos[w * 3], sim.pos[u * 3 + 1] - sim.pos[w * 3 + 1], sim.pos[u * 3 + 2] - sim.pos[w * 3 + 2])); }
  }
  ids.forEach((i, j) => { sim.inv[i] = inv0[j]; });
  for (let k = 0; k < 600; k++) sim.step(1 / 60);
  let off = 0; let mean = 0; for (let i = 0; i < n; i++) { if (sampleField(f, sim.pos[i * 3], sim.pos[i * 3 + 1], sim.pos[i * 3 + 2], o) && o[0] > 0.12) off++; mean += Math.hypot(sim.pos[i * 3] - before[i * 3], sim.pos[i * 3 + 1] - before[i * 3 + 1], sim.pos[i * 3 + 2] - before[i * 3 + 2]); }
  mean /= n; const ok = maxSeam < 0.008 && off < n * 0.01 && mean < 0.02; if (!ok) bad++;
  console.log(`${t.padEnd(16)} widest seam under the pull ${(maxSeam * 1000).toFixed(1)} mm, after release: ${off} points off the body, mean shift ${(mean * 1000).toFixed(1)} mm${ok ? '' : '  <-- TORN / CAME OFF'}`);
}
console.log(`${bad} case(s) failed`); process.exitCode = bad ? 1 : 0;
