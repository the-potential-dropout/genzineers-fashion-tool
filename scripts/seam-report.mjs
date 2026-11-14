// Per-seam gap report after sewing + draping: node scripts/seam-report.mjs <template>
import { readFileSync } from 'node:fs';
import { createProject } from '../src/core/project.js';
import { buildCloth, initSolver } from '../src/sim/cloth.js';
globalThis.fetch = async () => ({ arrayBuffer: async () => readFileSync(new URL('../public/atelier_sim.wasm', import.meta.url)) });
await initSolver('x');
const p = createProject(process.argv[2] || 'crew-tee');
const sim = buildCloth(p);
for (let f = 0; f < 300; f++) sim.step(1 / 60);
let e = 0;
for (const sl of sim.seamLines) {
  const s = p.seams.find((x) => x.id === sl.id);
  const n = sl.particles.length; // approx pairs per seam
  const gaps = [];
  for (let k = 0; k < sim.srest.length; k++) {
    const a = sim.si[k * 2]; if (!sl.particles.includes(a)) continue;
    const b = sim.si[k * 2 + 1];
    gaps.push(Math.hypot(sim.pos[a*3]-sim.pos[b*3], sim.pos[a*3+1]-sim.pos[b*3+1], sim.pos[a*3+2]-sim.pos[b*3+2]) * 100);
  }
  gaps.sort((x, y) => x - y);
  console.log(`${s.a.panel}#${s.a.edge}-${s.a.to ?? s.a.edge} <-> ${s.b.panel}#${s.b.edge}-${s.b.to ?? s.b.edge}: n=${gaps.length} median=${(gaps[gaps.length >> 1] || 0).toFixed(1)} max=${(gaps[gaps.length - 1] || 0).toFixed(1)} cm`);
  void n; void e;
}
