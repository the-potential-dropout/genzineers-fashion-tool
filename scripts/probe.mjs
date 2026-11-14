// Probe: where do key pattern points end up on the body after draping?
import { readFileSync } from 'node:fs';
import { createProject } from '../src/core/project.js';
import { applyActions } from '../src/core/actions.js';
import { buildCloth, initSolver, panelAnchor } from '../src/sim/cloth.js';
globalThis.fetch = async () => ({ arrayBuffer: async () => readFileSync(new URL('../public/atelier_sim.wasm', import.meta.url)) });
await initSolver('x');
{ const { loadBodyMesh } = await import('../src/sim/cloth.js'); await loadBodyMesh('male'); await loadBodyMesh('female'); }
const [tpl, ...probes] = process.argv.slice(2);
let p = createProject(tpl);
if (process.env.ACTS) p = applyActions(p, JSON.parse(process.env.ACTS)).project;
const sim = buildCloth(p);
for (let f = 0; f < 480; f++) sim.step(1 / 60);
const at = (pid, x, y) => { const a = panelAnchor(sim, pid, x, y); if (!a) return null; const o = [0, 0, 0]; a.ids.forEach((q, k) => { for (let c = 0; c < 3; c++) o[c] += sim.pos[q * 3 + c] * a.w[k]; }); return o.map((v) => +(v * 100).toFixed(1)); };
for (const pan of p.panels) {
  const xs = pan.points.map((q) => q[0]); const ys = pan.points.map((q) => q[1]);
  const top = pan.points.reduce((b, q) => (q[1] > b[1] ? q : b));
  console.log(pan.id.padEnd(10), 'x', Math.min(...xs), Math.max(...xs), 'y', Math.min(...ys), Math.max(...ys), 'top', top.join(','), '->', at(pan.id, ...top)?.join(' '));
}
for (const pr of probes) { const [pid, x, y] = pr.split(':'); console.log(pr, '->', at(pid, +x, +y)?.join(' ')); }
