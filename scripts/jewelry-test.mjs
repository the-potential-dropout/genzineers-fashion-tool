import { createProject } from '../src/core/project.js';
import { applyActions } from '../src/core/actions.js';
import { estimateMetal, JEWELRY_TEMPLATES, ringSize } from '../src/core/jewelry.js';
let p = createProject('crew-tee');
for (const t of Object.keys(JEWELRY_TEMPLATES)) {
  const r = applyActions(p, [{ type: 'new_jewelry', template: t }]);
  console.log(t.padEnd(18), JSON.stringify(estimateMetal(r.project.jewelry)));
}
const r = applyActions(p, [{ type: 'new_jewelry', template: 'solitaire-ring' }, { type: 'set_karat', karat: 14, colour: 'rose' }, { type: 'add_stone', gem: 'ruby', cut: 'pear', size: 5, width: 3.5, setting: 'v-prong' }, { type: 'set_custom_shape', target: 'pendant', points: [[0,0],[10,0],[5,12]] }]);
console.log(r.results, ringSize(7));

// ---- interference: neighbouring chain links must never pass through each other ----
const { LINK_DIMS, linkPoint } = await import('../src/render/jewelry3d.js');
let clash = 0;
for (const [name, dim] of Object.entries(LINK_DIMS)) {
  const N = 360; const pts = (k) => { const out = []; for (let i = 0; i < N; i++) { const q = linkPoint(dim, i / N, [0, 0, 0]); const roll = dim.frame === 'roll' && k % 2; out.push([q[0] + k * dim.pitch, roll ? -q[2] : q[1], roll ? q[1] : q[2]]); } return out; };
  const a = pts(0); let min = 1e9;
  for (const k of [1, 2, 3]) for (const p of a) for (const q of pts(k)) { const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (d < min) min = d; }
  const clear = min - dim.wire; // gap between wire surfaces, in wire diameters
  if (clear < 0.02) clash++;
  console.log(`${name.padEnd(10)} closest wires ${min.toFixed(3)} d apart, clearance ${clear.toFixed(3)} d${clear < 0.02 ? '  <-- INTERFERENCE' : ''}`);
}
console.log(`${clash} chain type(s) with interference`);
if (clash) process.exit(1);
