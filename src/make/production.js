// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Production outputs: tech pack, graded spec, BOM, pattern files (DXF / SVG /
 * tiled print), care label text, jewelry spec, production guide and RFQs.
 * Pure functions returning strings so they work in the app, CLI and MCP.
 */
import { resolveFabric } from '../core/fabrics.js';
import { ASSEMBLY, THREADS } from '../core/assembly.js';
import { TRIMS, STIFFENERS, ZIPPER_TYPES, ZIPPER_ENDS, ZIPPER_SLIDERS, ZIPPER_PULLERS, EDGE_TREATMENTS, zipperSpec } from '../core/trims.js';
import { LEGWEAR_TYPES, LEGWEAR_YARNS, LEGWEAR_PATTERNS, DENIER } from '../core/legwear.js';
import { DYES, PRINT_METHODS, PAINTS } from '../core/color.js';
import { INSULATION } from '../core/materials.js';
import { SIZE_CHARTS } from '../core/sizes.js';
import { applyAction } from '../core/actions.js';
import { checkProject, recommendFor } from '../core/guidance.js';
import { METALS, GEMS, CUTS, SETTINGS, LINKS, CLASPS, estimateMetal, caratEstimate, ringSize } from '../core/jewelry.js';
import { KNIT_METHODS, GAUGES, YARNS, KNIT_STRUCTURES, MOTIFS, knitChartSVG } from '../core/knit.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const r1 = (v) => Math.round(v * 10) / 10;
const BRAND = { name: 'Genzineers Fashion Tool', url: 'https://genzineers.com/?utm_source=fashion-tool&utm_medium=techpack', learn: 'https://thepotentialdropout.com/?utm_source=fashion-tool&utm_medium=techpack' };

function polyArea(pts) { let a = 0; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j][0] + pts[i][0]) * (pts[j][1] - pts[i][1]); return Math.abs(a / 2); }
function bbox(pts) { const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]); return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; }
function edgeLen(pan, e, to = e) { let L = 0; const n = pan.points.length; for (let i = e; ; i++) { const a = pan.points[i % n]; const b = pan.points[(i + 1) % n]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); if (i % n === to % n) break; } return L; }

/** Seam allowance outline: offset polygon outward by sa (cm), mitred. */
export function offsetPoly(pts, sa) {
  const n = pts.length;
  let area = 0; for (let i = 0; i < n; i++) { const a = pts[i]; const b = pts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const sgn = area > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n]; const b = pts[(i + 1) % n];
    const n1 = norm([p[1] - a[1], -(p[0] - a[0])]); const n2 = norm([b[1] - p[1], -(b[0] - p[0])]);
    const m = norm([n1[0] + n2[0], n1[1] + n2[1]]); const d = sa / Math.max(0.3, m[0] * n1[0] + m[1] * n1[1]);
    return [p[0] + m[0] * d * sgn, p[1] + m[1] * d * sgn];
  });
}
const norm = ([x, y]) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };

/** Pieces that get cut: panels + overlay pieces (pockets, collars, cuffs...). */
export function cutList(project) {
  const pieces = project.panels.map((p) => ({ id: p.id, name: p.name, points: p.points, fabric: p.fabric, qty: 1, kind: 'panel', panel: p }));
  const seen = {};
  for (const o of project.overlays || []) {
    if (['vent', 'pleat', 'pinch', 'distress', 'hem'].includes(o.kind) || o.pocket) continue; // pockets carry their own pieces; hems and vents are part of their panel
    const key = `${o.kind}-${o.style || ''}-${JSON.stringify(o.points.map((p) => [Math.abs(p[0]).toFixed(0), p[1].toFixed(0)]))}`;
    if (seen[key]) { seen[key].qty++; continue; }
    const host = project.panels.find((p) => p.id === o.panel);
    const piece = { id: o.id, name: `${o.kind[0].toUpperCase()}${o.kind.slice(1)}${o.style ? ` (${o.style})` : ''}`, points: o.points, fabric: o.fabric || (o.style === 'rib' ? 'rib-knit' : host?.fabric), qty: o.cut || (o.kind === 'lapel' || o.kind === 'collar' || o.kind === 'epaulette' || o.kind === 'flap' ? 2 : 1), kind: 'overlay', panel: host, note: o.note || '', color: o.look?.color || null };
    seen[key] = piece; pieces.push(piece);
  }
  // pocket bags, welts, flaps and other made-up pieces
  for (const k of project.pieces || []) pieces.push({ id: k.id, name: k.name, points: k.points, fabric: k.fabric, qty: k.cut || 1, kind: 'piece', color: k.color || null, panel: project.panels.find((p) => p.id === k.forPanel), note: k.note });
  return pieces;
}

/** Bill of materials. */
export function bom(project) {
  const qty = project.production?.quantity || 1;
  const rows = [];
  const fabArea = {};
  for (const pc of cutList(project)) { const a = polyArea(offsetPoly(pc.points, 1)) * pc.qty; fabArea[pc.fabric] = (fabArea[pc.fabric] || 0) + a; }
  for (const [fid, cm2] of Object.entries(fabArea)) {
    const f = resolveFabric(project, fid);
    const m2 = (cm2 / 1e4) * 1.18; // +18% marker waste
    const width = 1.5; // m usable width
    rows.push({ cat: 'Fabric', item: f.name, spec: `${f.fiber}, ${f.weightGsm} gsm${f.quality && f.quality !== 'Standard' ? `, ${f.quality}` : ''}`, perUnit: `${r1(m2 / width * 100) / 100} m @150cm (${r1(m2)} m²)`, total: `${Math.ceil((m2 / width) * qty * 10) / 10} m`, note: f.note || '' });
  }
  const thr = {};
  for (const s of project.seams) {
    const a = project.panels.find((p) => p.id === s.a.panel); if (!a) continue;
    const L = edgeLen(a, s.a.edge, s.a.to ?? s.a.edge) / 100;
    const m = ASSEMBLY[s.stitch]; if (!m || ['bond', 'weld', 'fuse', 'mechanical', 'edge'].includes(m.method) && m.method !== 'edge') { thr[`(no thread) ${m?.name}`] = (thr[`(no thread) ${m?.name}`] || 0) + L; continue; }
    const ratio = { stitch: s.stitch.startsWith('overlock-514') ? 18 : s.stitch.includes('overlock') || s.stitch.includes('safety') ? 15 : s.stitch.includes('cover') || s.stitch.includes('flatlock') ? 20 : 3, seam: 6, hand: 3 }[m.method] || 4;
    const key = `${THREADS[s.thread]?.name || s.thread} | ${s.threadColor}`;
    thr[key] = (thr[key] || 0) + L * ratio;
  }
  for (const [k, m] of Object.entries(thr)) rows.push({ cat: k.startsWith('(no thread)') ? 'Bonding / welding' : 'Thread', item: k.replace('(no thread) ', ''), spec: k.startsWith('(no') ? 'tape / film / energy' : 'Tex per factory', perUnit: `${r1(m)} m`, total: `${Math.ceil(m * qty * 1.1)} m (+10%)`, note: '' });
  const trims = {};
  for (const t of project.trims) {
    const d = TRIMS[t.type]; if (!d || d.internal) continue;
    let k;
    if (t.type.startsWith('zipper')) { const z = zipperSpec(t.zip); const len = t.at && t.to ? Math.round(Math.hypot(t.to[0] - t.at[0], t.to[1] - t.at[1])) : '?'; k = `Zipper: ${ZIPPER_TYPES[z.type]?.name} ${z.size}, ${len} cm|${ZIPPER_ENDS[z.end]}, ${ZIPPER_SLIDERS[z.slider]}, ${ZIPPER_PULLERS[z.puller]}|tape ${z.tape}`; }
    else if (t.type === 'edge-trim') k = `${EDGE_TREATMENTS[t.treatment]?.name} (${t.edge})|${t.path?.length ? 'along edge' : ''}|${t.color || 'self'}`;
    else if (t.type === 'lacing') k = `Lacing: ${t.eyelets || 8} pairs of eyelets + cord (${t.style})|${t.width || 5} cm wide|${t.color || '#111111'}`;
    else k = `${d.name}|${t.size || d.size} mm|${t.color || d.color}`;
    trims[k] = (trims[k] || 0) + 1;
  }
  for (const [k, n] of Object.entries(trims)) { const [name, size, color] = k.split('|'); rows.push({ cat: 'Trim', item: name, spec: `${size}, ${color}`, perUnit: n, total: `${Math.ceil(n * qty * 1.03)} (+3% spares)`, note: '' }); }
  for (const g of project.garments || []) if (g.generator === 'legwear') { const o = g.options; rows.push({ cat: 'Hosiery', item: `${LEGWEAR_TYPES[o.type]?.name}`, spec: `${DENIER[o.denier] || ''} ${LEGWEAR_YARNS[o.yarn]?.name}, ${LEGWEAR_PATTERNS[o.pattern]?.name}, top: ${o.topBand}, toe: ${o.toe}, heel: ${o.heel}${o.cushion !== 'none' ? `, ${o.cushion}` : ''}`, perUnit: '1 pair', total: `${qty} pairs`, note: 'Circular knit (hosiery 400-needle; socks 144-200 needle); cotton gusset for tights; linked seamless toe recommended' }); }
  const fills = {};
  for (const p of project.panels) if (p.insulation) { const k = `${INSULATION[p.insulation.fill]?.name}|${p.insulation.weight}|${p.insulation.quilting}`; fills[k] = (fills[k] || 0) + polyArea(p.points) / 1e4; }
  for (const [k, m2] of Object.entries(fills)) { const [name, w, q] = k.split('|'); rows.push({ cat: 'Insulation', item: name, spec: `${w} g/m², ${q} quilting`, perUnit: `${r1(m2 * w)} g`, total: `${r1((m2 * w * qty) / 1000)} kg`, note: INSULATION[Object.keys(INSULATION).find((x) => INSULATION[x].name === name)]?.cert || '' }); }
  for (const p of project.panels) if (p.stiffener && STIFFENERS[p.stiffener]?.bend) rows.push({ cat: 'Stiffener', item: STIFFENERS[p.stiffener].name, spec: p.name, perUnit: 1, total: qty, note: STIFFENERS[p.stiffener].use });
  if (project.panels.some((p) => p.lining)) rows.push({ cat: 'Lining', item: 'Acetate / cupro lining', spec: 'cut from body pattern', perUnit: 'see cut list', total: '-', note: '' });
  rows.push({ cat: 'Labels', item: 'Main label + size label + care/composition label', spec: 'woven / printed satin', perUnit: 3, total: qty * 3, note: 'Legally required: fibre content, country of origin, care, RN/importer (US)' });
  rows.push({ cat: 'Packaging', item: 'Polybag (recycled LDPE) + hangtag + barcode sticker', spec: 'suffocation warning on polybag', perUnit: 1, total: qty, note: '' });
  return rows;
}

/** Graded points of measure: re-draft for every production size. */
export function gradedSpec(project) {
  const sizes = project.production?.sizes?.length ? project.production.sizes : ['S', 'M', 'L'];
  const chart = SIZE_CHARTS[project.sizeChart || 'unisex'];
  const table = {};
  for (const sz of sizes) {
    if (!chart.sizes[sz]) continue;
    const p = applyAction(project, { type: 'set_size', size: sz }).project;
    for (const pan of p.panels) {
      const b = bbox(pan.points);
      table[`${pan.name}: width`] = { ...(table[`${pan.name}: width`] || {}), [sz]: r1(b.w) };
      table[`${pan.name}: length`] = { ...(table[`${pan.name}: length`] || {}), [sz]: r1(b.h) };
    }
  }
  return { sizes: sizes.filter((s) => chart.sizes[s]), table, chart: chart.label, body: Object.fromEntries(sizes.filter((s) => chart.sizes[s]).map((s) => [s, chart.sizes[s]])) };
}

export function careLabel(project) {
  const comp = {};
  for (const p of project.panels) { const f = resolveFabric(project, p.fabric); const k = f.fiber; comp[k] = (comp[k] || 0) + polyArea(p.points); }
  const main = Object.entries(comp).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const f0 = resolveFabric(project, project.panels[0]?.fabric);
  return { composition: `Shell: ${main}`, care: f0.rec?.care || 'Machine wash cold, tumble dry low', symbols: 'ISO 3758 / ASTM D5489 symbols: wash, bleach, dry, iron, professional care', origin: 'Made in: (factory country)', extra: 'US: RN or importer name; EU: fibre names per EU 1007/2011; JP/CN have local formats.' };
}

function svgPiece(pc, ox, oy, scale) {
  const sa = offsetPoly(pc.points, 1);
  const b = bbox(sa);
  const tx = (p) => `${((p[0] - b.x0) * scale + ox).toFixed(2)},${((b.y1 - p[1]) * scale + oy).toFixed(2)}`;
  const cx = (b.x0 + b.x1) / 2;
  return `<g><polygon points="${sa.map(tx).join(' ')}" fill="none" stroke="#000" stroke-width="0.6"/><polygon points="${pc.points.map(tx).join(' ')}" fill="none" stroke="#000" stroke-width="0.3" stroke-dasharray="3 2"/>` +
    `<line x1="${tx([cx, b.y0 + b.h * 0.2]).split(',')[0]}" y1="${tx([cx, b.y0 + b.h * 0.2]).split(',')[1]}" x2="${tx([cx, b.y0 + b.h * 0.8]).split(',')[0]}" y2="${tx([cx, b.y0 + b.h * 0.8]).split(',')[1]}" stroke="#000" stroke-width="0.4" marker-end="url(#arr)" marker-start="url(#arr)"/>` +
    `<text x="${tx([cx, b.y0 + b.h * 0.5])}".split(',')[0] font-size="${Math.max(3, scale * 1.4)}" font-family="sans-serif" text-anchor="middle" transform="translate(${tx([cx + 2, b.y0 + b.h * 0.5]).replace(',', ' ')})">${esc(pc.name)} · cut ${pc.qty}${pc.qty > 1 ? ' (mirror)' : ''} · ${esc(pc.fabric)}</text></g>`;
}

/** SVG of all pieces at 1:1 (1 cm = 10 user units -> mm). */
export function patternSVG(project) {
  const pieces = cutList(project);
  let x = 10; let y = 10; let rowH = 0; const maxW = 1600; const parts = [];
  for (const pc of pieces) { const b = bbox(offsetPoly(pc.points, 1)); const w = b.w * 10; const h = b.h * 10; if (x + w > maxW) { x = 10; y += rowH + 20; rowH = 0; } parts.push(svgPiece(pc, x, y, 10)); x += w + 20; rowH = Math.max(rowH, h); }
  const H = y + rowH + 20;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${maxW}mm" height="${H}mm" viewBox="0 0 ${maxW} ${H}"><defs><marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs><title>${esc(project.name)} pattern (1 unit = 1 mm, solid = cut line incl. 1 cm seam allowance, dashed = stitch line)</title>${parts.join('')}</svg>`;
}

/** DXF (R12 ASCII, mm). Layer 1 = cut line, 8 = sew line, 7 = grain line (AAMA-style layers). */
export function patternDXF(project) {
  const out = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
  let ox = 0;
  const poly = (pts, layer, dx) => { out.push('0', 'POLYLINE', '8', layer, '66', '1', '70', '1'); for (const p of pts) out.push('0', 'VERTEX', '8', layer, '10', ((p[0] + dx) * 10).toFixed(2), '20', (p[1] * 10).toFixed(2)); out.push('0', 'SEQEND'); };
  for (const pc of cutList(project)) {
    const sa = offsetPoly(pc.points, 1); const b = bbox(sa); const dx = ox - b.x0;
    poly(sa, '1', dx); poly(pc.points, '8', dx);
    const cx = (b.x0 + b.x1) / 2 + dx;
    out.push('0', 'LINE', '8', '7', '10', (cx * 10).toFixed(2), '20', ((b.y0 + b.h * 0.2) * 10).toFixed(2), '11', (cx * 10).toFixed(2), '21', ((b.y0 + b.h * 0.8) * 10).toFixed(2));
    out.push('0', 'TEXT', '8', '1', '10', (cx * 10).toFixed(2), '20', ((b.y0 + b.h * 0.5) * 10).toFixed(2), '40', '8', '1', `${pc.name} | QTY ${pc.qty} | ${pc.fabric}`.slice(0, 120));
    ox += b.w + 5;
  }
  out.push('0', 'ENDSEC', '0', 'EOF');
  return out.join('\n');
}

/** Printable 1:1 tiled pattern (A4 / Letter) for home sewing. */
export function tiledPrintHTML(project, paper = 'A4') {
  const [pw, ph] = paper === 'Letter' ? [215.9, 279.4] : [210, 297];
  const m = 10; const tw = pw - m * 2; const th = ph - m * 2;
  const svg = patternSVG(project);
  const W = Number(svg.match(/width="(\d+)mm"/)[1]); const H = Number(svg.match(/height="([\d.]+)mm"/)[1]);
  const cols = Math.ceil(W / tw); const rows = Math.ceil(H / th);
  const inner = svg.replace(/^<\?xml[^>]*>\n/, '').replace(/<svg [^>]*>/, '').replace('</svg>', '');
  let pages = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pages += `<div class="pg"><svg width="${tw}mm" height="${th}mm" viewBox="${c * tw} ${r * th} ${tw} ${th}">${inner}${r === 0 && c === 0 ? '<rect x="5" y="5" width="50" height="50" fill="none" stroke="#000"/><text x="8" y="32" font-size="5">5 cm test square</text>' : ''}</svg><div class="lb">Row ${r + 1} / Col ${c + 1} · tape edges together</div></div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(project.name)} - tiled pattern</title><style>@page{size:${paper};margin:${m}mm}body{margin:0;font:10px sans-serif}.pg{page-break-after:always;position:relative;width:${tw}mm;height:${th}mm;outline:0.2mm dashed #999}.lb{position:absolute;bottom:1mm;right:2mm;color:#666}</style></head><body>${pages}<script>onload=()=>print()</script></body></html>`;
}

export function bomCSV(project) {
  const rows = bom(project);
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  return ['Category,Item,Spec,Per unit,Total,Note', ...rows.map((r) => [r.cat, r.item, r.spec, r.perUnit, r.total, r.note].map(q).join(','))].join('\n');
}

/** Complete tech pack as a printable HTML document. */
export function techPackHTML(project, { image } = {}) {
  if (project.mode === 'jewelry') return jewelrySpecHTML(project, { image });
  const spec = gradedSpec(project);
  const rows = bom(project);
  const warns = checkProject(project);
  const care = careLabel(project);
  const recs = recommendFor(project.panels[0]?.fabric || 'cotton-jersey', project);
  const fin = project.panels.filter((p) => p.finish && Object.keys(p.finish).length);
  const svg = patternSVG(project).replace(/^<\?xml[^>]*>\n/, '').replace(/width="\d+mm" height="[\d.]+mm"/, 'width="100%"');
  const seamRows = project.seams.map((s) => { const a = project.panels.find((p) => p.id === s.a.panel); const b = project.panels.find((p) => p.id === s.b.panel); const m = ASSEMBLY[s.stitch]; return `<tr><td>${esc(a?.name)} ↔ ${esc(b?.name)}</td><td>${esc(m?.name)}</td><td>${esc(m?.machine)}</td><td>${esc(THREADS[s.thread]?.name || s.thread)}</td><td><span class="sw" style="background:${esc(s.threadColor)}"></span>${esc(s.threadColor)}</td><td>${r1(edgeLen(a, s.a.edge, s.a.to ?? s.a.edge))} cm</td></tr>`; }).join('');
  const date = new Date().toISOString().slice(0, 10);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(project.name)} - Tech pack</title>
<style>body{font:11px/1.45 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:24px;max-width:1000px}h1{font-size:22px;margin:0}h2{font-size:14px;border-bottom:2px solid #111;padding-bottom:3px;margin-top:26px;page-break-after:avoid}table{border-collapse:collapse;width:100%;margin:6px 0}td,th{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f2f2f2}.sw{display:inline-block;width:10px;height:10px;border:1px solid #999;margin-right:4px;vertical-align:middle}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.meta td:first-child{width:160px;font-weight:600}.warn{color:#9a5b00}.err{color:#b00020}.foot{margin-top:30px;font-size:10px;color:#666;border-top:1px solid #ccc;padding-top:8px}img{max-width:100%;border:1px solid #ddd}@media print{.np{display:none}h2{page-break-before:auto}}</style></head><body>
<div class="np" style="margin-bottom:12px"><button onclick="print()">Print / Save as PDF</button></div>
<h1>${esc(project.name)}</h1><div>Tech pack · ${date} · Base size ${esc(project.size)} (${esc(spec.chart)})</div>
<div class="grid"><div>${image ? `<img src="${image}" alt="3D view">` : ''}</div><div><table class="meta">
<tr><td>Style no.</td><td>${esc(project.styleNo || 'GFT-' + date.replace(/-/g, ''))}</td></tr><tr><td>Season</td><td>${esc(project.season || '-')}</td></tr>
<tr><td>Quantity</td><td>${project.production.quantity} pcs</td></tr><tr><td>Sizes</td><td>${esc(spec.sizes.join(', '))}</td></tr>
<tr><td>Main fabric</td><td>${esc(resolveFabric(project, project.panels[0]?.fabric).name)}</td></tr><tr><td>Recommended</td><td>${esc(recs.reasons.join(' · '))}</td></tr>
<tr><td>Needle / SPI</td><td>${esc(recs.needle)} · ${recs.spi} SPI</td></tr><tr><td>Interfacing</td><td>${esc(recs.interfacing)}</td></tr><tr><td>Pressing</td><td>${esc(recs.press)}</td></tr></table></div></div>
<h2>1. Flats & pattern pieces (incl. 1 cm seam allowance)</h2>${svg}
<h2>2. Bill of materials</h2><table><tr><th>Category</th><th>Item</th><th>Spec</th><th>Per unit</th><th>Total (${project.production.quantity} pcs)</th><th>Notes</th></tr>${rows.map((r) => `<tr><td>${esc(r.cat)}</td><td>${esc(r.item)}</td><td>${esc(r.spec)}</td><td>${esc(r.perUnit)}</td><td>${esc(r.total)}</td><td>${esc(r.note)}</td></tr>`).join('')}</table>
<h2>3. Construction</h2><table><tr><th>Seam</th><th>Method</th><th>Machine</th><th>Thread</th><th>Colour</th><th>Length</th></tr>${seamRows}</table>
${(project.garments || []).filter((g) => g.knit).map((g) => { const k = g.knit; const chart = knitChartSVG(k); return `<h2>Knit specification (${esc(g.id)})</h2><table class="meta"><tr><td>Method</td><td>${esc(KNIT_METHODS[k.method].name)}: ${esc(KNIT_METHODS[k.method].note)}</td></tr><tr><td>Machine</td><td>${esc(KNIT_METHODS[k.method].machine)}</td></tr><tr><td>Gauge</td><td>${esc(GAUGES[k.gauge].name)} (${GAUGES[k.gauge].gg} needles/inch)</td></tr><tr><td>Yarn</td><td>${esc(YARNS[k.yarn].name)}, ${esc(YARNS[k.yarn].fiber)}, count ${esc(YARNS[k.yarn].nm)} Nm, ${esc(YARNS[k.yarn].weight)}</td></tr><tr><td>Body structure</td><td>${esc(KNIT_STRUCTURES[k.structure].name)}</td></tr><tr><td>Trims</td><td>1x1 rib cuffs, hem and neck (linked)</td></tr><tr><td>Colourwork</td><td>${esc(MOTIFS[k.motif || 'none'].name)} · colours ${k.colors.map((c) => `<span class="sw" style="background:${esc(c)}"></span>${esc(c)}`).join(' ')}</td></tr><tr><td>Notes</td><td>Agree stitch density (wales x courses per 10 cm) on a knitted swatch before sampling; wash-test the swatch for shrinkage and pilling (ISO 12945).</td></tr></table>${chart ? chart.replace('<svg ', '<svg style="max-width:100%" ') : ''}`; }).join('')}
<h2>4. Colour, dye, print & paint</h2>${fin.length ? `<table><tr><th>Piece</th><th>Colour</th><th>Dye</th><th>Print</th><th>Paint</th></tr>${fin.map((p) => `<tr><td>${esc(p.name)}</td><td>${p.finish.color ? `<span class="sw" style="background:${esc(p.finish.color)}"></span>${esc(p.finish.color)} (send Pantone TCX / lab dip)` : '-'}</td><td>${esc(DYES[p.finish.dye]?.name || '-')}</td><td>${esc(p.finish.print ? `${PRINT_METHODS[p.finish.print.method]?.name || ''} ${p.finish.print.design || ''}` : '-')}</td><td>${esc(p.finish.paint ? `${PAINTS[p.finish.paint.method]?.name || ''} ${p.finish.paint.design || ''}` : '-')}</td></tr>`).join('')}</table>` : '<p>Fabric colour as supplied. For custom colours send a Pantone TCX reference and approve lab dips (A/B/C) before bulk.</p>'}
<h2>5. Graded spec (pattern piece dimensions, cm)</h2><table><tr><th>Point of measure</th>${spec.sizes.map((s) => `<th>${s}</th>`).join('')}<th>Tol ±</th></tr>${Object.entries(spec.table).map(([k, v]) => `<tr><td>${esc(k)}</td>${spec.sizes.map((s) => `<td>${v[s] ?? '-'}</td>`).join('')}<td>1.0</td></tr>`).join('')}</table>
<p>Body measurements used (${esc(spec.chart)}):</p><table><tr><th>Size</th><th>Chest</th><th>Waist</th><th>Hip</th><th>Height</th><th>Inseam</th></tr>${Object.entries(spec.body).map(([s, b]) => `<tr><td>${s}</td><td>${b.chest}</td><td>${b.waist}</td><td>${b.hip}</td><td>${b.height}</td><td>${b.inseam}</td></tr>`).join('')}</table>
<h2>6. Labels, care & packaging</h2><table class="meta"><tr><td>Composition</td><td>${esc(care.composition)}</td></tr><tr><td>Care</td><td>${esc(care.care)}</td></tr><tr><td>Symbols</td><td>${esc(care.symbols)}</td></tr><tr><td>Origin</td><td>${esc(care.origin)}</td></tr><tr><td>Legal</td><td>${esc(care.extra)}</td></tr><tr><td>Packaging</td><td>Folded to 25×30 cm, tissue, recycled polybag with suffocation warning, hangtag with barcode (GS1 UPC/EAN).</td></tr></table>
<h2>7. Quality control</h2><ul><li>Inspection: AQL 2.5 (major) / 4.0 (minor), ISO 2859-1 general level II.</li><li>Measurement tolerance ±1 cm (±0.5 cm on small POMs); stitch density per construction table ±1 SPI.</li><li>Colour: within ΔE ≤ 1.0 of approved lab dip under D65; check shading between panels (same dye lot per garment).</li><li>Wash test: 3 washes, shrinkage ≤ 3% (≤ 5% knits), no seam slippage, no colour transfer.</li></ul>
<h2>8. Design checks</h2>${warns.length ? `<ul>${warns.map((w) => `<li class="${w.level === 'error' ? 'err' : 'warn'}">${esc(w.msg)}${w.fix ? ` <b>Fix:</b> ${esc(w.fix)}` : ''}</li>`).join('')}</ul>` : '<p>No issues found.</p>'}
<div class="foot">Generated with ${BRAND.name} by Genzineers (<a href="${BRAND.url}">genzineers.com</a>). Learn to build and launch products: <a href="${BRAND.learn}">thepotentialdropout.com</a>. Commercial use of the software requires a licence from Genzineers.</div>
</body></html>`;
}

export function jewelrySpecHTML(project, { image } = {}) {
  const j = project.jewelry;
  const metal = j.alloy || METALS[j.metal];
  const w = estimateMetal(j);
  const stones = [...(j.stones || []), ...(j.stone ? [j.stone] : []), ...(j.pendant?.stone ? [j.pendant.stone] : [])];
  const rs = j.piece === 'ring' ? ringSize(j.size || 7) : null;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(project.name)} - Jewelry spec</title><style>body{font:12px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;margin:24px;max-width:900px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;text-align:left}th{background:#f2f2f2}h2{border-bottom:2px solid #111}img{max-width:420px;border:1px solid #ddd}</style></head><body><button onclick="print()">Print / Save as PDF</button>
<h1>${esc(project.name)}</h1>${image ? `<img src="${image}">` : ''}
<h2>Specification</h2><table><tr><td>Piece</td><td>${esc(j.piece)}</td></tr><tr><td>Metal</td><td>${esc(metal?.name)} · hallmark ${esc(metal?.hallmark)} · ${metal?.density} g/cm³</td></tr><tr><td>Plating / finish</td><td>${esc(j.plating || 'none')} / ${esc(j.finish || 'high polish')}</td></tr>
${rs ? `<tr><td>Ring size</td><td>US ${rs.us} · UK ${rs.uk} · EU ${rs.eu} · Ø ${rs.diameterMm} mm</td></tr><tr><td>Band</td><td>${esc(j.profile)} · ${j.bandWidth} mm wide × ${j.bandThickness} mm thick</td></tr>` : ''}
${j.link ? `<tr><td>Chain</td><td>${esc(LINKS[j.link]?.name)} · ${j.gauge} mm wire · ${j.length} cm · clasp: ${esc(CLASPS[j.clasp]?.name)}</td></tr>` : ''}
<tr><td>Est. metal weight</td><td>${w.grams} g (${w.volumeMm3} mm³; final weight from CAD/casting)</td></tr></table>
<h2>Stones</h2><table><tr><th>Gem</th><th>Cut</th><th>Size (mm)</th><th>Est. ct</th><th>Setting</th><th>Hardness</th></tr>${stones.map((s) => `<tr><td>${esc(GEMS[s.gem]?.name)}</td><td>${esc(CUTS[s.cut]?.name)}</td><td>${s.size}${s.width ? ` × ${s.width}` : ''}</td><td>${caratEstimate(s.cut, s.size, s.width || s.size, s.gem)}</td><td>${esc(SETTINGS[s.setting]?.name || '-')}</td><td>Mohs ${GEMS[s.gem]?.mohs}</td></tr>`).join('') || '<tr><td colspan=6>None</td></tr>'}</table>
<h2>Production route</h2><ol><li>Export STL from the app → CAD check (wall ≥ 0.8 mm gold / 1.0 mm silver; prong ≥ 0.8 mm; shank ≥ 1.4 mm).</li><li>3D-print castable resin / wax (SLA/DLP, 25-50 µm).</li><li>Lost-wax casting in ${esc(metal?.name)} (send STL + metal + quantity to a casting house).</li><li>Clean-up, pre-polish, assembly (solder jump rings / clasp).</li><li>Stone setting (setter): ${esc([...new Set(stones.map((s) => SETTINGS[s.setting]?.name))].join(', ') || '-')}.</li><li>Final polish, plating (${esc(j.plating || 'none')}), hallmarking at an assay office where required (UK/EU over set weights).</li><li>QC: stone security, sizing, weight, finish; pack in pouch/box with certificate.</li></ol>
<p style="font-size:10px;color:#666">Generated with ${BRAND.name} by Genzineers (<a href="${BRAND.url}">genzineers.com</a>) · <a href="${BRAND.learn}">thepotentialdropout.com</a></p></body></html>`;
}

// ---------------- Production guide & RFQ templates ----------------
export const GUIDE = [
  { title: '1. Finalise the design pack', body: 'Export the tech pack (PDF), pattern (DXF for factory CAD, SVG/PDF for small workshops), BOM (CSV) and 3D model (GLB). Decide target retail price → work back to a target FOB cost (roughly retail ÷ 4 to ÷ 5 for wholesale brands, ÷ 3 for DTC).' },
  { title: '2. Pick a production route', body: 'Small batch (1-100): local sample room / seamstress, print-on-demand, micro-factories. 100-1000: cut-make-trim (CMT) factory where you supply fabric, or full-package (FPP) where they source everything. 1000+: overseas full-package (Portugal, Turkey, Bangladesh, Vietnam, China, India, Pakistan, Peru for knits/alpaca, Italy for luxury).' },
  { title: '3. Find suppliers', body: 'Fabric: mill directories and trade shows (Première Vision Paris, Texworld, Intertextile Shanghai, Kingpins for denim, Munich Fabric Start), wholesalers for small MOQs. Trims: zipper/button makers and trim wholesalers. Factories: manufacturer directories and platforms (e.g. Maker\'s Row, Sewport, Alibaba/1688 with verified suppliers, Kompass, local fashion incubators), referrals and LinkedIn. Always ask for references, certifications (BSCI/amfori, SEDEX/SMETA, WRAP, GOTS/OEKO-TEX for materials) and photos of similar work.' },
  { title: '4. Send an RFQ', body: 'Send the tech pack, target quantity per colour/size, target cost, deadline, delivery terms (FOB / EXW / DDP) and ask for: price per unit at 2-3 quantity breaks, MOQ, sample cost and lead time, bulk lead time, payment terms. Use the RFQ templates below.' },
  { title: '5. Sampling', body: 'Proto sample (fit & construction) → fit sample on a real body in your base size → size set (all sizes, check grading) → salesman samples (SMS) → pre-production (PP) sample in final fabric and trims → top-of-production (TOP). Approve lab dips and strike-offs (prints) in parallel.' },
  { title: '6. Costing & contract', body: 'Get a cost breakdown (fabric, trims, CMT, finishing/wash, packing, overhead, margin). Agree a purchase order with specs, tolerances, AQL, delivery date, penalties and payment (typical 30% deposit / 70% before shipment or against inspection).' },
  { title: '7. Bulk, QC & shipping', body: 'Book a third-party inspection (during production + final random inspection at AQL 2.5). Arrange freight (sea/air/courier), customs broker, duties (HS code), and labels compliant with your market.' },
  { title: '8. Launch', body: 'Photograph (use the app\'s AI render for pre-launch tests), list, and market. Learn more about building and launching products at thepotentialdropout.com.' },
];

export function rfqTemplates(project) {
  const p = project;
  const fab = p.mode === 'jewelry' ? '' : resolveFabric(p, p.panels[0]?.fabric);
  const q = p.production?.quantity || 100;
  const sizes = (p.production?.sizes || []).join('/');
  if (p.mode === 'jewelry') {
    const j = p.jewelry; const m = j.alloy || METALS[j.metal];
    return [{ to: 'Casting house / jewelry manufacturer', subject: `RFQ: ${p.name} in ${m?.name}`, body: `Hello,\n\nWe are developing "${p.name}" and would like a quote for casting, finishing and setting.\n\n- Metal: ${m?.name} (${m?.hallmark})\n- Quantity: ${q} pcs\n- Estimated metal weight: ${estimateMetal(j).grams} g per piece\n- Stones: ${(j.stones || []).map((s) => `${GEMS[s.gem]?.name} ${CUTS[s.cut]?.name} ${s.size} mm (${SETTINGS[s.setting]?.name})`).join('; ') || 'none'}\n- Finish / plating: ${j.plating || 'high polish'}\n- Files attached: STL (CAD), spec sheet PDF, render\n\nPlease quote: unit price at ${q}/${q * 3}/${q * 10} pcs, metal price basis (spot + loss %), setting cost per stone, sample cost and lead time, bulk lead time, hallmarking, and payment terms.\n\nThank you,\n[Your name]\n[Brand / website]` }];
  }
  return [
    { to: 'Fabric mill / supplier', subject: `Fabric enquiry: ${fab.name}, ${fab.weightGsm} gsm`, body: `Hello,\n\nWe are sourcing fabric for a ${p.name} (approx. ${q} pcs).\n\n- Quality: ${fab.name} (${fab.fiber}), ${fab.weightGsm} gsm, width 145-150 cm\n- Colour: ${p.panels[0]?.finish?.color || fab.look.color} (Pantone TCX to follow)\n- Finish: ${fab.quality}${fab.note ? ` - ${fab.note}` : ''}\n- Quantity: approx. ${bom(p).find((r) => r.cat === 'Fabric')?.total || '?'}\n- Certifications wanted: OEKO-TEX Standard 100${/organic/i.test(fab.name) ? ', GOTS' : ''}\n\nPlease share: price per metre at MOQ and at 2x MOQ, MOQ per colour, sample yardage / headers / swatch cards, lab-dip lead time, bulk lead time, shrinkage & colourfastness test reports.\n\nThank you,\n[Your name]\n[Brand / website]` },
    { to: 'Trim supplier (buttons, zips, labels)', subject: `Trim enquiry for ${p.name}`, body: `Hello,\n\nPlease quote the following trims for ${q} units:\n\n${bom(p).filter((r) => r.cat === 'Trim' || r.cat === 'Labels').map((r) => `- ${r.item} (${r.spec}) x ${r.total}`).join('\n')}\n\nPlease include MOQ, colour matching (to Pantone), lead time and samples.\n\nThank you,\n[Your name]` },
    { to: 'Cut-make-trim / full-package factory', subject: `RFQ: ${p.name} - ${q} pcs`, body: `Hello,\n\nWe are looking for a manufacturing partner for "${p.name}".\n\n- Quantity: ${q} pcs, sizes ${sizes}\n- Main fabric: ${fab.name}, ${fab.weightGsm} gsm (we can supply / please source)\n- Construction: ${[...new Set(p.seams.map((s) => ASSEMBLY[s.stitch]?.name))].join(', ')}\n- Target FOB price: ${p.production?.targetCost ? `$${p.production.targetCost}` : '[your target]'}\n- Target delivery: [date], terms FOB / DDP [port / address]\n\nAttached: tech pack (PDF), pattern (DXF), BOM (CSV), 3D reference.\n\nPlease quote CMT and full-package unit prices at ${q}/${q * 5}/${q * 10} pcs, MOQ, sample cost and lead time, bulk lead time, and payment terms. Please also share photos of similar products you make and your audits/certifications.\n\nThank you,\n[Your name]\n[Brand / website]` },
  ];
}

/**
 * The project at its real making size. Designs are drafted on the life-size body; for a
 * miniature (doll, puppet, merch figure) every length is multiplied by project.scale before
 * any file is written, so patterns, specs and machine files come out at the size you will cut.
 */
export function atMakingSize(project) {
  const k = project.scale || 1;
  if (k === 1) return project;
  const p = JSON.parse(JSON.stringify(project));
  const m = (pt) => [Math.round(pt[0] * k * 100) / 100, Math.round(pt[1] * k * 100) / 100];
  for (const pan of p.panels) { pan.points = pan.points.map(m); for (const key of Object.keys(pan.edges || {})) pan.edges[key] = (pan.edges[key] || []).map(m); for (const at of pan.attach || []) at.pts = at.pts.map(m); }
  for (const o of p.overlays || []) o.points = o.points.map(m);
  for (const t of p.trims || []) { if (t.at) t.at = m(t.at); if (t.to) t.to = m(t.to); if (t.path) t.path = t.path.map(m); if (t.size) t.size = Math.max(2, Math.round(t.size * k)); }
  for (const e of p.embroidery || []) { e.at = m(e.at); e.width = Math.max(0.5, Math.round(e.width * k * 10) / 10); }
  for (const q of p.pockets || []) { q.at = m(q.at); q.width = Math.round(q.width * k * 10) / 10; q.height = Math.round(q.height * k * 10) / 10; }
  for (const c of p.collars || []) { for (const key of ['stand', 'fall', 'point', 'spread']) if (c[key]) c[key] = Math.round(c[key] * k * 10) / 10; }
  if (p.customBody) for (const key of Object.keys(p.customBody)) if (typeof p.customBody[key] === 'number' && key !== 'weight') p.customBody[key] = Math.round(p.customBody[key] * k * 10) / 10;
  p.production = { ...(p.production || {}), seamAllowance: p.production?.seamAllowance ?? (k < 0.6 ? 0.5 : 1), hemAllowance: p.production?.hemAllowance ?? (k < 0.6 ? 1 : 2.5) };
  p.name = `${p.name} (${Math.round(k * 100)}% scale)`;
  p.scale = 1; p.madeAtScale = k;
  return p;
}
