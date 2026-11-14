// Grade check: build key templates in XS / M / 4XL and sew them.
import { readFileSync } from 'node:fs';
import { createProject } from '../src/core/project.js';
import { applyAction } from '../src/core/actions.js';
import { buildCloth, initSolver } from '../src/sim/cloth.js';
globalThis.fetch = async () => ({ arrayBuffer: async () => readFileSync(new URL('../public/atelier_sim.wasm', import.meta.url)) });
await initSolver('x');
{ const { loadBodyMesh } = await import('../src/sim/cloth.js'); await loadBodyMesh('male'); await loadBodyMesh('female'); }
for (const t of ['crew-tee', 'blazer-sb', 'jeans-straight', 'skirt-aline', 'baseball-cap']) for (const [chart, size] of [['womens', 'XS'], ['unisex', 'M'], ['mens', '4XL']]) {
  let p = createProject(t); p = applyAction(p, { type: 'set_size', chart, size }).project;
  const sim = buildCloth(p); let y0 = -1e9; for (let i = 1; i < sim.pos.length; i += 3) y0 = Math.max(y0, sim.pos[i]);
  for (let f = 0; f < 300; f++) sim.step(1 / 60);
  let y1 = -1e9, nan = 0; for (let i = 1; i < sim.pos.length; i += 3) { if (!Number.isFinite(sim.pos[i])) nan++; y1 = Math.max(y1, sim.pos[i]); }
  const front = p.panels[0]; const w = Math.max(...front.points.map(q => q[0])) - Math.min(...front.points.map(q => q[0]));
  console.log(`${t.padEnd(15)} ${chart.padEnd(7)} ${size.padEnd(4)} frontWidth=${w.toFixed(1)}cm top ${y0.toFixed(2)}->${y1.toFixed(2)} ${y1 < y0 - 0.25 ? 'FELL' : 'ok'}${nan ? ' NaN' : ''}`);
}
