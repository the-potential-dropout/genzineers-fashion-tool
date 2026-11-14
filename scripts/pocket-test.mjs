// Every pocket type can be placed and removed.
import { createProject } from '../src/core/project.js';
import { applyActions } from '../src/core/actions.js';
import { POCKETS } from '../src/core/pockets.js';
let p = createProject('chore-coat'); let bad = 0;
for (const id of Object.keys(POCKETS)) { const r = applyActions(p, [{ type: 'add_pocket', pocket: id, panel: p.panels[0].id, at: [12, 40] }]); if (!r.results[0].ok) { bad++; console.log(id, r.results[0].error); } p = r.project; }
const n = p.pockets.length;
p = applyActions(p, [{ type: 'remove_pocket', id: p.pockets[0].id }]).project;
console.log(`${Object.keys(POCKETS).length} pocket types, ${bad} failures, placed ${n}, after one removal ${p.pockets.length}`);
process.exit(bad || p.pockets.length !== n - 1 ? 1 : 0);
