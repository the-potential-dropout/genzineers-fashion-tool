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
