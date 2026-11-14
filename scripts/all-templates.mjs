// Headless check of every template: build, sew + drape 5 s, report stability.
import { readFileSync } from 'node:fs';
import { createProject } from '../src/core/project.js';
import { TEMPLATES } from '../src/core/templates.js';
import { FABRICS } from '../src/core/fabrics.js';
import { ASSEMBLY } from '../src/core/assembly.js';
import { TRIMS } from '../src/core/trims.js';
import { buildCloth, initSolver } from '../src/sim/cloth.js';
globalThis.fetch = async () => ({ arrayBuffer: async () => readFileSync(new URL('../public/atelier_sim.wasm', import.meta.url)) });
await initSolver('x');
const only = process.argv[2];
let bad = 0;
for (const id of Object.keys(TEMPLATES)) {
  if (only && !id.includes(only)) continue;
  let line = id.padEnd(20);
  try {
    const p = createProject(id);
    const missing = [...new Set([...p.panels.map((x) => !FABRICS[x.fabric] && !p.customFabrics?.[x.fabric] && `fabric:${x.fabric}`), ...p.seams.map((s) => !ASSEMBLY[s.stitch] && `stitch:${s.stitch}`), ...p.trims.map((t) => !TRIMS[t.type] && `trim:${t.type}`)].filter(Boolean))];
    const sim = buildCloth(p);
    let maxY0 = -1e9; for (let i = 1; i < sim.pos.length; i += 3) maxY0 = Math.max(maxY0, sim.pos[i]);
    const t0 = performance.now();
    let mv = 0; for (let f = 0; f < 300; f++) mv = sim.step(1 / 60);
    const ms = (performance.now() - t0) / 300;
    let minY = 1e9, maxY = -1e9, nan = 0;
    for (let i = 1; i < sim.pos.length; i += 3) { const y = sim.pos[i]; if (!Number.isFinite(y)) nan++; minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const gaps = []; for (let e = 0; e < sim.srest.length; e++) { const a = sim.si[e*2]*3, b = sim.si[e*2+1]*3; gaps.push(Math.hypot(sim.pos[a]-sim.pos[b], sim.pos[a+1]-sim.pos[b+1], sim.pos[a+2]-sim.pos[b+2])); }
    gaps.sort((x, y) => x - y);
    const p95 = gaps.length ? gaps[Math.floor(gaps.length * 0.95)] * 100 : 0;
    const floor = maxY < maxY0 - 0.25; // garment top dropped: it fell off the body / stand
    const flag = nan || floor || p95 > 3 || missing.length ? '  <-- CHECK' : '';
    if (flag) bad++;
    line += `panels=${String(p.panels.length).padStart(2)} n=${String(sim.stats.particles).padStart(5)} ${ms.toFixed(1).padStart(5)}ms y=[${minY.toFixed(2)},${maxY.toFixed(2)}] seamGap95=${p95.toFixed(1)}cm${floor ? ' FELL' : ''}${nan ? ` NaN=${nan}` : ''}${missing.length ? ` missing=${missing.join(',')}` : ''}${flag}`;
  } catch (e) { line += `ERROR ${e.message}`; bad++; }
  console.log(line);
}
console.log(`\n${bad} template(s) need attention`);
