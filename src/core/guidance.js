// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Guidance: industry-default recommendations with reasons, and design checks.
 * Used by the UI ("Recommended" badges, tips), the AI assistant and the tech pack.
 */
import { FABRICS, resolveFabric } from './fabrics.js';
import { ASSEMBLY, THREADS } from './assembly.js';
import { TRIMS } from './trims.js';
import { DYES, PRINT_METHODS, PAINTS, compatible, defaultDyeFor, defaultPrintFor } from './color.js';

/** Recommended construction for a fabric id. */
export function recommendFor(fabricOrId, project = { customFabrics: {} }) {
  const fab = typeof fabricOrId === 'string' ? resolveFabric(project, fabricOrId) : fabricOrId;
  const r = fab.rec || {};
  const out = {
    stitch: r.stitch || 'lockstitch-301',
    finish: r.finish || r.hem || 'overlock-504',
    hem: r.hem || 'blind-hem',
    thread: r.thread || 'poly-corespun',
    needle: r.needle || 'Universal 80/12',
    spi: r.spi || 12,
    interfacing: r.interfacing || '-',
    press: r.press || 'Steam, medium heat',
    care: r.care || 'Follow fibre care',
    dye: defaultDyeFor(fab),
    print: defaultPrintFor(fab),
    buttons: fab.category === 'Leather' ? 'snap' : fab.family?.startsWith('wool') ? 'button-horn' : fab.family === 'denim' ? 'jeans-button' : 'button-4hole',
    uses: r.uses || '',
  };
  out.reasons = [
    `${ASSEMBLY[out.stitch]?.name || out.stitch}: ${ASSEMBLY[out.stitch]?.use || ''}`,
    `${THREADS[out.thread]?.name || out.thread}: ${THREADS[out.thread]?.use || ''}`,
    `Needle ${out.needle}, ${out.spi} stitches per inch.`,
    out.dye ? `${DYES[out.dye].name}: ${DYES[out.dye].use}` : 'Leather is dyed at the tannery (drum dyed / aniline / pigmented finish).',
    `${PRINT_METHODS[out.print].name}: ${PRINT_METHODS[out.print].use}`,
  ];
  return out;
}

/** Scan a project for mistakes a factory would flag. */
export function checkProject(project) {
  const warn = [];
  const add = (level, msg, fix) => warn.push({ level, msg, fix });
  for (const pan of project.panels) {
    const fab = resolveFabric(project, pan.fabric, pan.fabricOverrides);
    const f = pan.finish || {};
    if (f.dye) { const c = compatible(DYES[f.dye], fab); if (!c.ok) add('error', `${pan.name}: ${c.reason}`, `Use ${DYES[defaultDyeFor(fab)]?.name || 'a suitable dye'}.`); }
    if (f.print?.method) { const c = compatible(PRINT_METHODS[f.print.method], fab); if (!c.ok) add('error', `${pan.name}: ${c.reason}`, `Use ${PRINT_METHODS[defaultPrintFor(fab)].name}.`); }
    if (f.paint?.method) { const c = compatible(PAINTS[f.paint.method], fab); if (!c.ok) add('warn', `${pan.name}: ${c.reason}`); }
    if (fab.category === 'Sheer' && f.print?.method === 'screen-plastisol') add('warn', `${pan.name}: plastisol on sheer fabric is stiff and heavy.`, 'Use digital textile or water-based print.');
  }
  for (const s of project.seams) {
    const a = project.panels.find((p) => p.id === s.a.panel);
    if (!a) continue;
    const fab = resolveFabric(project, a.fabric, a.fabricOverrides);
    const m = ASSEMBLY[s.stitch];
    if (!m) continue;
    if (fab.category === 'Knit' && m.elasticity < 0.25 && m.method !== 'bond') add('warn', `${a.name}: ${m.name} has little stretch for a knit; seams may pop.`, 'Use Overlock 4-thread (514), coverstitch or flatlock.');
    if (fab.category === 'Leather' && ['overlock-504', 'overlock-514', 'safety-516'].includes(s.stitch)) add('warn', `${a.name}: overlocking leather is not done; it doesn't fray.`, 'Use lockstitch 301 with glued & folded edges.');
    if (fab.category === 'Technical' && m.method === 'stitch' && !project.seams.some((x) => x.stitch === 'seam-tape')) add('info', `${a.name}: stitched seams on waterproof shells leak unless taped.`, 'Add Seam taping (hot air) or use ultrasonic welding.');
    if (m.method === 'weld' && !/(polyester|nylon|polyurethane|pvc)/i.test(fab.fiber)) add('error', `${a.name}: ${m.name} only works on thermoplastic synthetics.`, 'Use stitching or adhesive bonding.');
    const th = THREADS[s.thread];
    if (th && fab.category === 'Leather' && th.strength < 0.8) add('warn', `${a.name}: ${th.name} is weak for leather.`, 'Use bonded nylon (tex 70+).');
    if (th && (pan(project, s.a.panel)?.finish?.dye === 'garment-dyed') && /polyester/i.test(th.fiber) && !/cotton/i.test(th.fiber)) add('info', `${a.name}: polyester thread won't take a garment dye, so seams stay white.`, 'Use core-spun or mercerized cotton thread (or go for the contrast on purpose).');
  }
  for (const t of project.trims) {
    const tr = TRIMS[t.type];
    if (!tr) continue;
    const p = pan(project, t.panel);
    const fab = p ? resolveFabric(project, p.fabric, p.fabricOverrides) : null;
    if (fab && fab.weightGsm < 80 && ['rivet', 'spike-long', 'stud-cone', 'jeans-button'].includes(t.type)) add('warn', `${tr.name} on lightweight ${fab.name} will tear it.`, 'Add a reinforcement patch or interfacing behind it.');
  }
  if (!project.trims.some((t) => t.type === 'label-care')) add('info', 'No care / composition label yet (legally required in most markets).', 'Add a care label in Trims > Labels; the tech pack lists the required wording.');
  return warn;
}
const pan = (p, id) => p.panels.find((x) => x.id === id);

/** Short tip shown next to a fabric in the picker. */
export function fabricTip(id) {
  const f = FABRICS[id];
  if (!f) return '';
  return [f.note, f.rec?.uses ? `Typical uses: ${f.rec.uses}.` : ''].filter(Boolean).join(' ');
}
