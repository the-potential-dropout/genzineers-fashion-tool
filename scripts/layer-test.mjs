// Layers must stay in order: where an outer garment lies over an inner one, it is outside it (further from the body).
import { readFileSync } from 'node:fs';
import { createProject } from '../src/core/project.js';
import { applyAction } from '../src/core/actions.js';
import { buildCloth, initSolver, loadBodyMesh } from '../src/sim/cloth.js';
import { bodyField, sampleField } from '../src/sim/bodyfield.js';
import { bodyFor } from '../src/core/sizes.js';
globalThis.fetch = async () => ({ arrayBuffer: async () => readFileSync(new URL('../public/atelier_sim.wasm', import.meta.url)) });
await initSolver('x'); await loadBodyMesh('male'); await loadBodyMesh('female');
const CASES = [['jeans-straight', 'oxford-shirt', 'out'], ['jeans-straight', 'oxford-shirt', 'in'], ['chinos', 'crew-tee', 'out']];
let bad = 0;
for (const [lo, up, tuck] of CASES) {
  let p = createProject(lo); p = applyAction(p, { type: 'add_garment', template: up }).project;
  const top = p.garments[1]; if (tuck === 'in') p = applyAction(p, { type: 'set_wear', garment: top.id, tuck: 'in' }).project || p;
  const sim = buildCloth(p); const n = sim.pos.length / 3; const f = bodyField(bodyFor(p)); const o = [0, 0, 0, 0];
  for (let k = 0; k < 700; k++) sim.step(1 / 60);
  const gOf = new Array(n); for (const pan of sim.panels) for (let i = pan.offset; i < pan.offset + pan.count; i++) gOf[i] = pan.panel.garment;
  const P = sim.pos; const sd = new Float32Array(n); const G = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { sampleField(f, P[i * 3], P[i * 3 + 1], P[i * 3 + 2], o); sd[i] = o[0]; const l = Math.hypot(o[1], o[2], o[3]) || 1; G[i * 3] = o[1] / l; G[i * 3 + 1] = o[2] / l; G[i * 3 + 2] = o[3] / l; }
  const low = p.garments[0].id; const hi = top.id; let pairs = 0; let wrong = 0;
  for (let i = 0; i < n; i++) { if (gOf[i] !== hi) continue; let best = null; let bd = 1e9;
    for (let q = 0; q < n; q++) { if (gOf[q] !== low) continue; const dx = P[i*3]-P[q*3], dy = P[i*3+1]-P[q*3+1], dz = P[i*3+2]-P[q*3+2]; const al = dx*G[q*3]+dy*G[q*3+1]+dz*G[q*3+2]; const lat = dx*dx+dy*dy+dz*dz-al*al; if (lat < 1e-4 && Math.abs(al) < 0.03 && G[i*3]*G[q*3]+G[i*3+1]*G[q*3+1]+G[i*3+2]*G[q*3+2] > 0.7 && lat < bd) { bd = lat; best = q; } }
    if (best == null) continue; pairs++; const d = sd[i] - sd[best]; if (tuck === 'in' ? d > 0.003 && P[i*3+1] < P[best*3+1] - 0.03 : d < -0.001) wrong++; }
  const frac = pairs ? wrong / pairs : 0; const ok = frac < 0.05; if (!ok) bad++;
  console.log(`${lo}+${up} (${tuck})`.padEnd(36), `overlapping points ${pairs}, out of order ${wrong} (${(frac * 100).toFixed(1)}%)${ok ? '' : '  <-- LAYERS CROSS'}`);
}
console.log(`${bad} case(s) with crossed layers`); process.exitCode = bad ? 1 : 0;
