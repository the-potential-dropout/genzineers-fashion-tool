// Machine code and protocols for manufacturers: knitout, written knitting, sewing operations, print protocol.
import { createProject } from '../src/core/project.js';
import { applyActions } from '../src/core/actions.js';
import { knitFiles, operations, operationsCSV, printProtocol } from '../src/make/machine.js';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const knit = createProject('knit-crew');
const files = knitFiles(knit);
ok(files.length === 5, `expected 4 panel programs + written instructions, got ${files.length}`);
for (const f of files.filter((x) => x.file.endsWith('.k'))) {
  const L = f.text.split('\n'); const ops = L.filter((l) => l && !l.startsWith(';'));
  ok(L[0] === ';!knitout-2', `${f.file}: header`);
  ok(ops.every((l) => /^(inhook|releasehook|outhook) \d+$|^(knit|tuck) [+-] [fb]\d+ \d+$|^xfer [fb]\d+ [fb]\d+$|^rack -?\d+$/.test(l)), `${f.file}: invalid knitout line: ${ops.find((l) => !/^(inhook|releasehook|outhook) \d+$|^(knit|tuck) [+-] [fb]\d+ \d+$|^xfer [fb]\d+ [fb]\d+$|^rack -?\d+$/.test(l))}`);
  ok(ops.every((l) => !/[fb]0\b|[fb]-/.test(l)), `${f.file}: needle numbers must start at 1`);
  console.log(f.file.padEnd(22), `${ops.length} machine operations, ${L.filter((l) => l.startsWith('; course')).length} courses`);
}
console.log(files.find((x) => x.file.endsWith('.txt')).text.split('\n').slice(0, 9).join('\n'));
let blazer = createProject('blazer-sb');
blazer = applyActions(blazer, [{ type: 'set_finish', panel: 'all', print: { method: 'screen-plastisol', design: 'dalmatian' } }, { type: 'add_embroidery', panel: 'front-r', at: [14, 55], kind: 'text', text: 'GZ', width: 5 }, { type: 'add_pocket', panel: 'front-l', at: [-12, 50], pocket: 'inside-breast' }]).project;
const ops = operations(blazer);
ok(ops.length > 15 && ops.some((o) => /seam [A-Z]/.test(o.operation)) && ops.some((o) => /Embroider/.test(o.operation)) && ops.some((o) => /inside/.test(o.operation)), 'operations bulletin content');
console.log(`blazer: ${ops.length} sewing operations, e.g. "${ops.find((o) => /Join/.test(o.operation)).operation}" · ${ops.find((o) => /Join/.test(o.operation)).stitch} · ${ops.find((o) => /Join/.test(o.operation)).length} cm`);
ok(operationsCSV(blazer).split('\r\n').length === ops.length + 1, 'csv rows');
const pp = printProtocol(blazer, () => 36);
ok(/dalmatian/.test(pp) && /mesh/.test(pp) && /#141414/i.test(pp), 'print protocol');
console.log(pp.split('\n').slice(2, 8).join('\n'));
console.log(`${bad} machine-file failure(s)`);
process.exit(bad ? 1 : 0);
