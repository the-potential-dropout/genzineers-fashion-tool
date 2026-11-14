// Headless solver test: builds each template, runs 6 simulated seconds, checks stability.
import { readFileSync } from 'node:fs';
import { createProject } from '../src/core/project.js';
import { TEMPLATES } from '../src/core/templates.js';
import { buildCloth, initSolver } from '../src/sim/cloth.js';

const wasmPath = new URL('../public/atelier_sim.wasm', import.meta.url);
globalThis.fetch = async () => ({ arrayBuffer: async () => readFileSync(wasmPath) });

for (const backend of ['wasm', 'js']) {
  if (backend === 'wasm') await initSolver('x');
{ const { loadBodyMesh } = await import('../src/sim/cloth.js'); await loadBodyMesh('male'); await loadBodyMesh('female'); } else { globalThis.fetch = async () => { throw new Error('off'); }; await initSolver('x');
{ const { loadBodyMesh } = await import('../src/sim/cloth.js'); await loadBodyMesh('male'); await loadBodyMesh('female'); } }
  for (const id of Object.keys(TEMPLATES)) {
    const p = createProject(id);
    const sim = buildCloth(p);
    const t0 = performance.now();
    let mv = 0, frames = 0;
    for (; frames < 360; frames++) mv = sim.step(1 / 60);
    const ms = (performance.now() - t0) / frames;
    let minY = Infinity, maxY = -Infinity, nan = 0;
    for (let i = 1; i < sim.pos.length; i += 3) { const y = sim.pos[i]; if (Number.isNaN(y)) nan++; minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    let gap = 0; for (let e = 0; e < sim.srest.length; e++) { const a = sim.si[e*2]*3, b = sim.si[e*2+1]*3; gap = Math.max(gap, Math.hypot(sim.pos[a]-sim.pos[b], sim.pos[a+1]-sim.pos[b+1], sim.pos[a+2]-sim.pos[b+2])); }
    let strain = 0, sc = 0; for (let e = 0; e < sim.rest.length; e++) { const a = sim.ci[e*2]*3, b = sim.ci[e*2+1]*3; const L = Math.hypot(sim.pos[a]-sim.pos[b], sim.pos[a+1]-sim.pos[b+1], sim.pos[a+2]-sim.pos[b+2]); strain += L / sim.rest[e]; sc++; }
    console.log(`strain=${((strain/sc-1)*100).toFixed(1)}% `);
    console.log(`${sim.kind.padEnd(9)} ${id.padEnd(10)} particles=${sim.stats.particles} ${ms.toFixed(2)}ms/frame  y=[${minY.toFixed(2)},${maxY.toFixed(2)}] maxSeamGap=${(gap*100).toFixed(1)}cm motion=${(mv*1000).toFixed(3)}mm nan=${nan}`);
  }
}
