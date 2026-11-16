// Settled cloth must be still: measure frame-to-frame motion after the drape, per garment.
import { readFileSync } from 'node:fs';
import { createProject } from '../src/core/project.js';
import { applyAction } from '../src/core/actions.js';
import { buildCloth, initSolver } from '../src/sim/cloth.js';
globalThis.fetch = async () => ({ arrayBuffer: async () => readFileSync(new URL('../public/atelier_sim.wasm', import.meta.url)) });
await initSolver('x');
{ const { loadBodyMesh } = await import('../src/sim/cloth.js'); await loadBodyMesh('male'); await loadBodyMesh('female'); }
const CASES = (process.argv[2] ? process.argv.slice(2).map((s) => s.split('+')) : [['jeans-straight'], ['chinos'], ['sweatpants'], ['jeans-straight', 'oxford-shirt'], ['jeans-skinny'], ['skirt-pencil'], ['oxford-shirt'], ['crew-tee'], ['chinos', 'crew-tee']]);
let bad = 0;
for (const list of CASES) {
  let p = createProject(list[0]); for (const t of list.slice(1)) p = applyAction(p, { type: 'add_garment', template: t }).project || p;
  const sim = buildCloth(p); const n = sim.pos.length / 3; if (process.env.NOLAYER && sim.layerPass) sim.layerPass = () => {};
  for (let f = 0; f < 600; f++) sim.step(1 / 60);
  // then 120 frames: how far does each particle move per frame, and does it oscillate?
  let prev = sim.pos.slice(); let maxV = 0; let sumV = 0; let worst = -1; const vel = new Float32Array(n); let flips = 0;
  for (let f = 0; f < 120; f++) {
    sim.step(1 / 60);
    for (let i = 0; i < n; i++) { const dx = sim.pos[i * 3] - prev[i * 3]; const dy = sim.pos[i * 3 + 1] - prev[i * 3 + 1]; const dz = sim.pos[i * 3 + 2] - prev[i * 3 + 2]; const v = Math.hypot(dx, dy, dz); sumV += v; if (v > maxV) { maxV = v; worst = i; } const sgn = Math.sign(dx + dy + dz); if (vel[i] && sgn && sgn !== Math.sign(vel[i]) && v > 0.0005) flips++; vel[i] = dx + dy + dz; }
    prev = sim.pos.slice();
  }
  const pan = sim.panels.find((q) => worst >= q.offset && worst < q.offset + q.count);
  const ok = maxV < 0.004 && flips < n * 0.5;
  if (!ok) bad++;
  console.log(`${list.join('+').padEnd(32)} n=${n} max ${(maxV * 1000).toFixed(2)} mm/frame mean ${(sumV / n / 120 * 1000).toFixed(3)} mm/frame, oscillations ${flips}, worst on ${pan?.id} y=${sim.pos[worst * 3 + 1]?.toFixed(3)}${ok ? '' : '  <-- JITTER'}`);
}
console.log(`${bad} case(s) jitter`);
process.exitCode = bad ? 1 : 0;
