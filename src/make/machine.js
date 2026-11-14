// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Machine code and work protocols for manufacturers.
 *
 *  - Knitting: one Knitout file per knitted panel (the open machine-knitting
 *    format from the Carnegie Mellon Textiles Lab; its public back-ends convert
 *    it to Shima Seiki DAT and Kniterate k-code), plus row-by-row written
 *    instructions a hand or domestic-machine knitter can follow.
 *  - Sewing: the operations bulletin: every operation in sewing order with
 *    stitch class, machine, thread, stitches per inch and seam length.
 *  - Printing: the print protocol per method (separations, mesh, cure) and the
 *    repeat artwork at production resolution.
 *  - Embroidery lives in embroidery.js (Tajima .DST + run sheet).
 */
import { resolveFabric } from '../core/fabrics.js';
import { ASSEMBLY, THREADS } from '../core/assembly.js';
import { TRIMS } from '../core/trims.js';
import { GAUGES, YARNS, KNIT_STRUCTURES, KNIT_METHODS } from '../core/knit.js';
import { PRINT_METHODS, DYES, printColors } from '../core/color.js';
import { POCKETS } from '../core/pockets.js';

const seamLetter = (i) => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(64 + Math.floor(i / 26)) + String.fromCharCode(65 + (i % 26)));

// ---------------------------------------------------------------------------
// Knitting
// ---------------------------------------------------------------------------
/** Needle ranges per course for a panel: [{ l, r }] from the hem up (needle 0 = panel centre line x = 0). */
export function knitRows(panel, spec) {
  const gg = GAUGES[spec.gauge]?.gg || 7;
  const wales = (gg / 2.54) * 1.05; // stitches per cm across (relaxed fabric)
  const courses = wales * 1.35; // rows per cm
  const ys = panel.points.map((q) => q[1]); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  // sleeves are drafted lying along x: knit them from the cuff up, so swap axes
  const sleeve = panel.role === 'sleeve';
  const pts = sleeve ? panel.points.map(([x, y]) => [y, -x]) : panel.points;
  const y0 = sleeve ? Math.min(...pts.map((q) => q[1])) : minY; const y1 = sleeve ? Math.max(...pts.map((q) => q[1])) : maxY;
  const rows = [];
  const n = Math.max(1, Math.round((y1 - y0) * courses));
  for (let k = 0; k < n; k++) {
    const y = y0 + (k + 0.5) / courses;
    const xs = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i]; const b = pts[(i + 1) % pts.length]; if ((a[1] > y) !== (b[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
    if (xs.length < 2) continue;
    xs.sort((p, q) => p - q);
    // outer extent; a neck opening (4 crossings) is knitted as two sides
    const parts = [];
    for (let i = 0; i + 1 < xs.length; i += 2) parts.push({ l: Math.round(xs[i] * wales), r: Math.round(xs[i + 1] * wales) });
    rows.push(parts);
  }
  return { rows, wales, courses, gg };
}

/** Knitout (v2) for one panel. Single carrier; jersey, 1x1 and 2x2 rib are knitted true, other structures are flagged for the programmer. */
export function knitout(panel, spec, { ribRows = 0, name = '' } = {}) {
  const { rows, wales, courses, gg } = knitRows(panel, spec);
  if (!rows.length) return '';
  const st = spec.structure || 'jersey';
  const ribW = st === 'rib-2x2' ? 2 : st === 'rib-1x1' ? 1 : 0;
  const bed = (n, inRib) => { const w = inRib ? (ribW || 1) : ribW; if (!w) return 'f'; return Math.floor((n + 4096) / w) % 2 ? 'b' : 'f'; };
  const all = rows.flat(); const min = Math.min(...all.map((p) => p.l)); const max = Math.max(...all.map((p) => p.r));
  const N = (n) => n - min + 1; // machine needles start at 1
  const out = [
    ';!knitout-2',
    `;;Machine: V-bed flat knitting machine, ${gg} gauge`,
    `;;Gauge: ${gg}`,
    ';;Carriers: 1 2 3 4 5 6 7 8 9 10',
    ';;Position: Center',
    `; Panel: ${name || panel.name} · ${KNIT_STRUCTURES[st]?.name || st} · ${YARNS[spec.yarn]?.name || spec.yarn}`,
    `; Tension target: ${wales.toFixed(2)} wales/cm x ${courses.toFixed(2)} courses/cm (${(wales * 10).toFixed(0)} sts x ${(courses * 10).toFixed(0)} rows per 10 cm, relaxed and steamed)`,
    `; Needle bed used: ${max - min + 1} needles · ${rows.length} courses`,
    ribW || !ribRows ? '' : `; First ${ribRows} courses: 1x1 rib welt`,
    KNIT_STRUCTURES[st] && !['jersey', 'rib-1x1', 'rib-2x2'].includes(st) ? `; NOTE: "${KNIT_STRUCTURES[st].name}" is written here as plain jersey shaping. Apply the stitch structure in your knit programming software (stitch pattern fill).` : '',
    spec.motif && spec.motif !== 'none' ? '; NOTE: colourwork motif: follow the knitting chart (SVG) supplied; add carriers per colour.' : '',
    '', '; ---- cast on (alternate-needle tuck, then a closing pass) ----', 'inhook 1',
  ].filter((l) => l !== '');
  const first = rows[0][0];
  for (let n = first.r; n >= first.l; n--) if ((n - first.l) % 2 === 0) out.push(`tuck - ${bed(n, ribRows > 0)}${N(n)} 1`);
  for (let n = first.l; n <= first.r; n++) if ((n - first.l) % 2 === 1) out.push(`tuck + ${bed(n, ribRows > 0)}${N(n)} 1`);
  out.push('releasehook 1');
  let prev = rows[0]; let dir = '-';
  rows.forEach((parts, k) => {
    const inRib = k < ribRows;
    if (k === ribRows && ribRows && !ribW) { out.push('; ---- rib welt done: transfer back-bed stitches to the front for jersey ----'); for (let n = parts[0].l; n <= parts[parts.length - 1].r; n++) if (bed(n, true) === 'b') out.push(`xfer b${N(n)} f${N(n)}`); }
    // shaping against the previous course (same number of parts only)
    if (parts.length === prev.length) parts.forEach((p, i) => {
      const q = prev[i];
      for (let n = q.l; n < p.l; n++) { out.push(`; narrow left edge`, `xfer ${bed(n, inRib)}${N(n)} ${bed(n, inRib) === 'f' ? 'b' : 'f'}${N(n)}`, `rack ${bed(n, inRib) === 'f' ? 1 : -1}`, `xfer ${bed(n, inRib) === 'f' ? 'b' : 'f'}${N(n)} ${bed(n, inRib)}${N(n + 1)}`, 'rack 0'); }
      for (let n = q.r; n > p.r; n--) { out.push(`; narrow right edge`, `xfer ${bed(n, inRib)}${N(n)} ${bed(n, inRib) === 'f' ? 'b' : 'f'}${N(n)}`, `rack ${bed(n, inRib) === 'f' ? -1 : 1}`, `xfer ${bed(n, inRib) === 'f' ? 'b' : 'f'}${N(n)} ${bed(n, inRib)}${N(n - 1)}`, 'rack 0'); }
      for (let n = p.l; n < q.l; n++) out.push(`; widen left edge`, `tuck ${dir} ${bed(n, inRib)}${N(n)} 1`);
      for (let n = p.r; n > q.r; n--) out.push(`; widen right edge`, `tuck ${dir} ${bed(n, inRib)}${N(n)} 1`);
    }); else out.push(`; course ${k + 1}: the piece divides / rejoins here (neck opening). Knit each side with its own carrier or hold one side on the needles.`);
    out.push(`; course ${k + 1}`);
    for (const p of dir === '+' ? parts : [...parts].reverse()) {
      if (dir === '+') for (let n = p.l; n <= p.r; n++) out.push(`knit + ${bed(n, inRib)}${N(n)} 1`);
      else for (let n = p.r; n >= p.l; n--) out.push(`knit - ${bed(n, inRib)}${N(n)} 1`);
    }
    dir = dir === '+' ? '-' : '+'; prev = parts;
  });
  out.push('; ---- finish: knit waste yarn or link off; do not drop live loops if the piece will be linked ----', 'outhook 1');
  return out.join('\n');
}

/** Row-by-row written instructions (hand knitting / domestic machine) from the same shaping. */
export function knitInstructions(panel, spec, { ribRows = 0 } = {}) {
  const { rows, wales, courses } = knitRows(panel, spec);
  if (!rows.length) return '';
  const count = (parts) => parts.reduce((s, p) => s + (p.r - p.l + 1), 0);
  const lines = [
    `${panel.name.toUpperCase()}`,
    `Tension: ${(wales * 10).toFixed(0)} stitches and ${(courses * 10).toFixed(0)} rows to 10 cm in ${KNIT_STRUCTURES[spec.structure]?.name || 'stocking stitch'}, after blocking.`,
    `Yarn: ${YARNS[spec.yarn]?.name || spec.yarn}. Cast on ${count(rows[0])} stitches.`,
  ];
  if (ribRows) lines.push(`Rows 1-${ribRows}: 1x1 rib.`);
  let start = ribRows; let cur = count(rows[Math.min(ribRows, rows.length - 1)]); let split = rows[0].length;
  for (let k = Math.max(1, ribRows); k < rows.length; k++) {
    const c = count(rows[k]); const parts = rows[k].length;
    if (c !== cur || parts !== split) {
      if (k - start > 0) lines.push(`Rows ${start + 1}-${k}: work straight on ${cur} stitches (${((k - start) / courses).toFixed(1)} cm).`);
      const dl = rows[k][0].l - rows[k - 1][0].l; const dr = rows[k - 1][rows[k - 1].length - 1].r - rows[k][rows[k].length - 1].r;
      if (parts !== split) lines.push(parts > split ? `Row ${k + 1}: divide for the neck: work each side separately (${rows[k].map((p) => p.r - p.l + 1).join(' + ')} stitches).` : `Row ${k + 1}: rejoin: ${c} stitches.`);
      else if (c < cur) lines.push(`Row ${k + 1}: ${dl > 2 || dr > 2 ? 'cast off' : 'decrease'} ${Math.max(0, dl)} at the beginning and ${Math.max(0, dr)} at the end: ${c} stitches.`);
      else lines.push(`Row ${k + 1}: increase ${Math.max(0, -dl)} at the beginning and ${Math.max(0, -dr)} at the end: ${c} stitches.`);
      start = k; cur = c; split = parts;
    }
  }
  lines.push(`Rows ${start + 1}-${rows.length}: work straight on ${cur} stitches, then cast off (or leave on waste yarn for linking).`);
  // merge runs of single-row shaping into "every row" statements stays readable enough; keep the list as is
  return lines.join('\n');
}

/** Everything knitted in a project: [{ file, text }]. */
export function knitFiles(project) {
  const out = [];
  for (const g of project.garments || []) {
    if (!g.knit) continue;
    const hemRib = g.options?.hem === 'rib' ? Math.round(7 * ((GAUGES[g.knit.gauge]?.gg || 7) / 2.54) * 1.05 * 1.35) : 0;
    const text = [`KNITTING INSTRUCTIONS: ${project.name}`, `Method: ${KNIT_METHODS[g.knit.method]?.name}. ${KNIT_METHODS[g.knit.method]?.note || ''}`, `Assembly: ${ASSEMBLY[g.stitch]?.name || 'linking'}.`, ''];
    for (const pan of project.panels.filter((p) => p.garment === g.id)) {
      const rib = pan.role === 'body' ? hemRib : 0;
      out.push({ file: `knit/${pan.id}.k`, text: knitout(pan, g.knit, { ribRows: rib, name: pan.name }) });
      text.push(knitInstructions(pan, g.knit, { ribRows: rib }), '');
    }
    out.push({ file: `knit/${g.id}-written-instructions.txt`, text: text.join('\n') });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sewing: operations bulletin
// ---------------------------------------------------------------------------
const edgeLen = (pan, s) => { const n = pan.points.length; let L = 0; const to = s.to ?? s.edge; for (let e = s.edge, k = 0; k < n; e++, k++) { const a = pan.points[e % n]; const b = pan.points[(e + 1) % n]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); if (e % n === to % n) break; } return L; };

/** Operations in sewing order: [{ no, section, operation, stitch, machine, thread, spi, length, notes }]. */
export function operations(project) {
  const ops = [];
  const P = (id) => project.panels.find((p) => p.id === id);
  const add = (section, operation, stitchId, o = {}) => { const a = ASSEMBLY[stitchId]; ops.push({ section, operation, stitch: a?.name || stitchId || '', machine: a?.machine || o.machine || '', thread: o.thread || '', spi: o.spi || '', length: o.length ? Math.round(o.length) : '', notes: o.notes || '' }); };
  for (const g of project.garments?.length ? project.garments : [{ id: null }]) {
    const pans = project.panels.filter((p) => (g.id ? p.garment === g.id : true));
    if (!pans.length) continue;
    const ids = new Set(pans.map((p) => p.id));
    const fab = resolveFabric(project, pans[0].fabric, pans[0].fabricOverrides);
    const spi = fab.rec?.spi || 12; const thr = THREADS[fab.rec?.thread]?.name || fab.rec?.thread || '';
    const sec = g.id ? `${g.name || g.template || g.generator} (${g.id})` : 'Garment';
    add(sec, `Cut ${pans.length} main pieces on grain; mark notches`, null, { machine: 'Cutting table / CNC cutter', notes: `Fabric: ${fab.name}. Needle: ${fab.rec?.needle || ''}` });
    if (fab.rec?.interfacing) add(sec, 'Fuse interfacing', null, { machine: 'Fusing press', notes: fab.rec.interfacing });
    // preparation: pockets, plackets, flaps, embroidery and prints before the garment is closed
    for (const e of project.embroidery || []) if (ids.has(e.panel)) add(sec, `Embroider ${e.kind === 'text' ? `"${e.text}"` : e.kind === 'motif' ? e.motif : 'artwork'} on ${P(e.panel)?.name} (flat panel, before assembly)`, null, { machine: 'Multi-head embroidery machine', notes: 'Run the supplied .DST; see run sheet for colour sequence' });
    for (const pan of pans) if (pan.finish?.print?.method) add(sec, `Print ${pan.finish.print.design} on ${pan.name} (cut panel)`, null, { machine: PRINT_METHODS[pan.finish.print.method]?.name || pan.finish.print.method, notes: 'See print protocol' });
    for (const k of project.pockets || []) if (ids.has(k.panel)) add(sec, `Make and set ${POCKETS[k.type]?.name || k.type}${k.inside ? ' (inside)' : ''} on ${P(k.panel)?.name}`, 'lockstitch-301', { thread: thr, spi, length: 2 * (k.width + k.height), notes: `${POCKETS[k.type]?.note} Pieces: ${(project.pieces || []).filter((x) => x.pocket === k.id).map((x) => `${x.name.split(': ')[1]} x${x.cut}`).join('; ')}` });
    const seenOv = new Set();
    for (const o of project.overlays || []) { if (!ids.has(o.panel) || o.pocket || o.hidden) continue; const key = `${o.kind}:${o.style || ''}`; if (seenOv.has(key)) continue; seenOv.add(key); const cnt = project.overlays.filter((x) => ids.has(x.panel) && x.kind === o.kind && (x.style || '') === (o.style || '')).length; add(sec, `Prepare and attach ${o.style && o.style !== o.kind ? `${o.style} ` : ''}${o.kind}${cnt > 1 ? ` x${cnt}` : ''}`, 'lockstitch-301', { thread: thr, spi }); }
    // seams, ordered the way a garment goes together
    const rank = (s) => { const a = P(s.a.panel); const b = P(s.b.panel); const r = `${a?.role}|${b?.role}`; const len = edgeLen(a, s.a); if (s.closure) return 8; if (a === b) return 5; if (/sleeve/.test(r) && /body/.test(r)) return 4; if (a?.role === 'body' && b?.role === 'body') return len < 22 ? 1 : 6; return 3; };
    const seams = project.seams.map((s, i) => ({ s, i })).filter(({ s }) => ids.has(s.a.panel) && ids.has(s.b.panel)).sort((x, y) => rank(x.s) - rank(y.s));
    for (const { s, i } of seams) {
      const a = P(s.a.panel); const b = P(s.b.panel);
      add(sec, `${s.closure ? 'Set closure / zip between' : 'Join'} ${a.name}${a === b ? ' (close into a tube)' : ` to ${b.name}`}: seam ${seamLetter(i)}`, s.stitch, { thread: THREADS[s.thread]?.name || s.thread || thr, spi, length: edgeLen(a, s.a), notes: 'Match notches; ease the longer edge' });
    }
    for (const pan of pans) for (const at of pan.attach || []) add(sec, `Fasten ${pan.name} over ${P(at.to)?.name} along the centre line (buttons / snaps through both layers)`, null, { machine: 'Button sewer + buttonhole machine' });
    for (const c of project.collars || []) if (Object.keys(c.paths || {}).some((id) => ids.has(id))) add(sec, c.kind === 'hood' ? `Make hood (${c.hoodStyle || 'three-panel'}) and set to neckline` : c.kind === 'neckband' ? 'Attach rib neckband (stretch 10-15% while sewing), coverstitch down' : `Make ${c.style} collar (stand ${c.stand} cm${c.fall ? `, fall ${c.fall} cm` : ''}) and set to neckline`, c.kind === 'neckband' ? 'overlock-504' : 'lockstitch-301', { thread: thr, spi });
    for (const pan of pans) for (const [where, path] of Object.entries(pan.edges || {})) { if (!path || path.length < 2 || where === 'armhole' && !/none/.test(g.options?.sleeve || '')) continue; let L = 0; for (let k = 1; k < path.length; k++) L += Math.hypot(path[k][0] - path[k - 1][0], path[k][1] - path[k - 1][1]); add(sec, `${where === 'hem' || where === 'cuff' || where === 'leg' ? 'Turn and stitch' : 'Finish'} ${where} of ${pan.name}`, fab.rec?.hem || fab.rec?.stitch, { thread: thr, spi, length: L, notes: pan.edgeFinish?.[where] || '' }); }
    const tr = {}; for (const t of project.trims) { if (!ids.has(t.panel) || ['stitch-line', 'cut-line', 'edge-trim'].includes(t.type)) continue; tr[t.type] = (tr[t.type] || 0) + 1; }
    for (const [type, n] of Object.entries(tr)) add(sec, `Attach ${TRIMS[type]?.name || type} x${n}`, null, { machine: /button/.test(type) ? 'Button sewer + buttonhole machine' : /zip/.test(type) ? 'Lockstitch with zip foot' : /snap|rivet|grommet|eyelet/.test(type) ? 'Press / setting machine' : 'Lockstitch / hand' });
    add(sec, 'Trim threads, press, inspect against the spec sheet, fold and pack', null, { machine: 'Pressing station / QC', notes: fab.rec?.press || '' });
  }
  return ops.map((o, i) => ({ no: (i + 1) * 10, ...o }));
}
export function operationsCSV(project) {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return ['Op no,Section,Operation,Stitch / seam,Machine,Thread,Stitches per inch,Seam length (cm),Notes', ...operations(project).map((o) => [o.no, o.section, o.operation, o.stitch, o.machine, o.thread, o.spi, o.length, o.notes].map(q).join(','))].join('\r\n');
}

// ---------------------------------------------------------------------------
// Printing and dyeing protocol
// ---------------------------------------------------------------------------
const PRINT_PROTOCOL = [
  [/discharge/, 'Screens: 43-62T mesh. Activate discharge base 6% (pot life 6-8 h). Print wet-on-wet, cure 160-170 C for 90-120 s with good airflow. 100% cotton reactive-dyed grounds only; test for discharge.'],
  [/water/, 'Screens: 62-90T mesh. Water-based ink, flood the screen between prints, cure 150-160 C for 2-3 min (or add catalyst and air-dry). Soft hand; best on light grounds.'],
  [/puff/, 'Screens: 34-43T mesh. Puff additive in plastisol, print one heavy pass, cure 160 C for 60-90 s (rises in the dryer). Keep detail above 1.5 mm.'],
  [/foil/, 'Print foil adhesive through 43T mesh, gel, apply foil with a heat press 160 C, 12-15 s, medium pressure, peel cold.'],
  [/screen|plastisol/, 'Screens: 43-62T mesh (110-156 US) at 25-30 N tension. One screen per colour, light colours first, underbase white on dark grounds. Flash 110 C between colours, final cure 160 C for 60 s through the full ink film.'],
  [/dtg/, 'Pre-treat dark garments and heat-press dry. Print at 1200 dpi, white underbase + CMYK. Cure 165 C for 90 s (press) or tunnel 160 C for 4-6 min. Cotton-rich fabrics.'],
  [/dtf/, 'Print mirrored on PET film (CMYK + white), apply hot-melt powder, cure powder 110-120 C, press onto garment 150-165 C for 12-15 s, peel as the film specifies, re-press 5 s.'],
  [/sublim/, 'Print mirrored on sublimation paper. Press 195-205 C for 40-60 s, medium pressure. Polyester (65%+) white or light grounds only; all-over prints are pressed on cut panels before sewing.'],
  [/digital|rotary|reactive/, 'Digital / rotary textile printing on prepared fabric: print, steam to fix (reactive 102 C for 8-10 min; acid for silk and nylon), wash off, dry and finish. Supply the repeat tile at 300 dpi.'],
  [/heat|vinyl|transfer/, 'Cut or print the transfer, weed, press 150-160 C for 10-15 s, peel as specified.'],
  [/emboss|deboss/, 'Engraved die, heat press 120-150 C, 10-20 s; test pressure on the fabric.'],
];
/** Print and dye instructions for every finish used in a project. */
export function printProtocol(project, tileCmOf = () => 28) {
  const seen = new Map();
  for (const pan of project.panels) {
    const f = pan.finish || {};
    if (f.print?.method || f.print?.design) { const k = JSON.stringify([f.print.method, f.print.design, f.print.colors, f.print.scale]); const e = seen.get(k) || { print: f.print, panels: [] }; e.panels.push(pan.name); seen.set(k, e); }
    if (f.dye) { const k = `dye:${f.dye}:${f.color || ''}`; const e = seen.get(k) || { dye: f.dye, color: f.color, panels: [] }; e.panels.push(pan.name); seen.set(k, e); }
  }
  if (!seen.size) return '';
  const out = [`PRINT AND DYE PROTOCOL: ${project.name}`, ''];
  for (const e of seen.values()) {
    if (e.print) {
      const m = PRINT_METHODS[e.print.method]; const cols = [...new Set(printColors(e.print.design, e.print.colors).map((c) => c.toLowerCase()))];
      const rep = tileCmOf(e.print.design) * (Number(e.print.scale) || 1);
      out.push(`PRINT: ${e.print.design}${e.print.image ? ' (supplied artwork)' : ''}`, `  Method: ${m?.name || e.print.method || 'to be agreed'}`, `  On: ${e.panels.join(', ')}`,
        `  Repeat: ${rep.toFixed(1)} x ${rep.toFixed(1)} cm, straight repeat. Artwork file: prints/${e.print.design}.png`,
        `  Colours / separations (${cols.length}): ${cols.map((c, i) => `${i + 1}. ${c.toUpperCase()}`).join('   ')}  (give your printer a physical or Pantone TCX reference for each; screens show hex only)`,
        `  Process: ${(PRINT_PROTOCOL.find(([re]) => re.test(e.print.method || '')) || [0, 'Agree process with the printer.'])[1]}`,
        '  Approval: strike-off on the production fabric before bulk. Wash test 5 cycles at the care-label temperature.', '');
    } else {
      const d = DYES[e.dye];
      out.push(`DYE: ${d?.name || e.dye}${e.color ? ` to ${e.color.toUpperCase()}` : ''}`, `  On: ${e.panels.join(', ')}`, `  ${d?.note || ''}`, '  Approval: lab dip (3 options) against the colour standard under D65 light; then bulk with a shade band.', '');
    }
  }
  return out.join('\n');
}
