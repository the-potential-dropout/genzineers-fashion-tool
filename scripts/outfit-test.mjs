// Headless outfit check: several garments layered on one mannequin.
import { readFileSync } from 'node:fs';
import { createProject } from '../src/core/project.js';
import { applyAction } from '../src/core/actions.js';
import { buildCloth, initSolver, layerRank } from '../src/sim/cloth.js';
globalThis.fetch = async () => ({ arrayBuffer: async () => readFileSync(new URL('../public/atelier_sim.wasm', import.meta.url)) });
await initSolver('x');
{ const { loadBodyMesh } = await import('../src/sim/cloth.js'); await loadBodyMesh('male'); await loadBodyMesh('female'); }
const OUTFITS = [['crew-tee', 'jeans-straight', 'blazer-sb'], ['oxford-shirt', 'chinos', 'knit-crew', 'overcoat'], ['lace-bralette', 'boxer-briefs', 'opaque-tights', 'skirt-pencil', 'camisole'], ['pullover-hoodie', 'joggers', 'beanie']];
let bad = 0;
for (const list of OUTFITS) {
  try {
    let p = createProject(list[0]);
    for (const t of list.slice(1)) { const r = applyAction(p, { type: 'add_garment', template: t }); p = r.project || p; }
    const sim = buildCloth(p);
    let mv = 0; for (let f = 0; f < 360; f++) mv = sim.step(1 / 60);
    let nan = 0; for (const v of sim.pos) if (!Number.isFinite(v)) nan++;
    const gaps = []; for (let e = 0; e < sim.srest.length; e++) { const a = sim.si[e*2]*3, b = sim.si[e*2+1]*3; gaps.push(Math.hypot(sim.pos[a]-sim.pos[b], sim.pos[a+1]-sim.pos[b+1], sim.pos[a+2]-sim.pos[b+2])); }
    gaps.sort((x, y) => x - y);
    const ranks = p.garments.map((g) => `${g.template || g.generator}:${layerRank(p, { garment: g.id })}`).join(' ');
    const ok = !nan && gaps[Math.floor(gaps.length * 0.95)] < 0.05;
    if (!ok) bad++;
    console.log(`${list.join('+').padEnd(55)} n=${sim.stats.particles} gap95=${(gaps[Math.floor(gaps.length*0.95)]*100).toFixed(1)}cm nan=${nan} [${ranks}]${ok ? '' : '  <-- CHECK'}`);
  } catch (e) { bad++; console.log(list.join('+'), 'ERROR', e.message); }
}
// collection merge: a customised design saved earlier, worn with another one
{
  let jacket = createProject('biker-jacket');
  jacket = applyAction(jacket, { type: 'set_finish', panel: 'all', print: { method: 'screen-plastisol', design: 'tiger' } }).project;
  jacket = applyAction(jacket, { type: 'set_size', size: 'L' }).project;
  let tee = createProject('crew-tee');
  tee = applyAction(tee, { type: 'set_knit', structure: 'cable' }).project;
  let p = createProject('jeans-straight');
  p = applyAction(p, { type: 'add_design', design: tee }).project;
  p = applyAction(p, { type: 'add_design', design: jacket }).project;
  p = applyAction(p, { type: 'set_layer', garment: 'g1', layer: 2 }).project;
  const ids = new Set(); let dup = 0; for (const x of p.panels) { if (ids.has(x.id)) dup++; ids.add(x.id); }
  const printed = p.panels.filter((x) => x.finish?.print?.design === 'tiger').length;
  const knit = p.panels.filter((x) => x.fabric === 'knit-g1').length && p.customFabrics['knit-g1'];
  const sim = buildCloth(p); for (let f = 0; f < 300; f++) sim.step(1 / 60);
  let nan = 0; for (const v of sim.pos) if (!Number.isFinite(v)) nan++;
  const ok = !dup && printed && knit && !nan && p.garments.length === 3;
  if (!ok) bad++;
  console.log(`collection merge: garments=${p.garments.length} dupIds=${dup} tigerPanels=${printed} knitKept=${Boolean(knit)} nan=${nan}${ok ? '' : '  <-- CHECK'}`);
}
console.log(`${bad} outfit(s) need attention`);
process.exit(bad ? 1 : 0);
