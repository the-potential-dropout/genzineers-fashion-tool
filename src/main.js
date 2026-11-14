// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.
import { createStore, settings } from './app/store.js';
import { applyActions } from './core/actions.js';
import { createPatternEditor } from './app/pattern.js';
import { Viewer } from './render/viewer.js';
import { initSolver, buildCloth, solverKind, loadBodyMesh } from './sim/cloth.js';
import { TEMPLATES, TEMPLATE_GROUPS } from './core/templates.js';
import { GENERATORS } from './core/blocks.js';
import { FABRICS, FABRIC_FAMILIES, FABRIC_CATEGORIES, resolveFabric } from './core/fabrics.js';
import { ASSEMBLY, ASSEMBLY_GROUPS, THREADS } from './core/assembly.js';
import { TRIMS, TRIM_GROUPS, ZIPPER_TYPES, ZIPPER_SIZES, ZIPPER_ENDS, ZIPPER_SLIDERS, ZIPPER_PULLERS, EDGE_TREATMENTS, LACING_STYLES, zipperSpec } from './core/trims.js';
import { DYES, PRINT_METHODS, PRINT_DESIGNS, PAINTS, compatible, printColors, PRINT_COLOR_LABELS } from './core/color.js';
import { BLENDS, FIBERS, INSULATION, QUILTING, WATERPROOF } from './core/materials.js';
import { SIZE_CHARTS, REF_BODY, bodyFor } from './core/sizes.js';
import { BODY_SHAPES } from './sim/avatar.js';
import { recommendFor, checkProject, fabricTip } from './core/guidance.js';
import { JEWELRY_TEMPLATES, JEWELRY_GROUPS, METALS, GEMS, CUTS, SETTINGS, LINKS, CLASPS, BAILS, EARRING_BACKS, RING_PROFILES, PLATINGS, estimateMetal, caratEstimate, ringSize, goldAlloy } from './core/jewelry.js';
import { PROVIDERS, IMAGE_PROVIDERS, chat, generateImage } from './ai/providers.js';
import { SCOPES, systemPrompt, parseActions, filterActions } from './ai/assistant.js';
import { connectBridge } from './ai/bridge.js';
import { techPackHTML, patternSVG, patternDXF, tiledPrintHTML, bomCSV, GUIDE, rfqTemplates } from './make/production.js';
import { parseDXF, parseSVG, piecesToActions, MODEL_EXT, readAs } from './io/import.js';
import { KNIT_METHODS, GAUGES, YARNS, KNIT_STRUCTURES, MOTIFS, knitChartSVG } from './core/knit.js';
import { invoke } from './io/tauri.js';
import { knitFiles, operationsCSV, printProtocol } from './make/machine.js';
import { printTileCanvas, printTileCm } from './render/textures.js';
import { designBitmap } from './make/embroidery.js';
import { collection, kindOf } from './app/collection.js';
import { POCKETS, POCKET_CLOSURES } from './core/pockets.js';
import { STITCH_TYPES, FONTS, THREADS_EMB, MOTIFS_EMB, rasterizeDesign, digitize, writeDST, embroiderySheet, loadArtwork } from './make/embroidery.js';
import { LAYER_NAMES } from './core/project.js';
import { layerOf } from './sim/cloth.js';

const LINKS_OUT = {
  genzineers: 'https://genzineers.com/?utm_source=fashion-tool&utm_medium=app&utm_campaign=gft',
  tpd: 'https://thepotentialdropout.com/?utm_source=fashion-tool&utm_medium=app&utm_campaign=gft',
  pd: 'https://potentialdropout.com/?utm_source=fashion-tool&utm_medium=app&utm_campaign=gft',
  licence: 'mailto:genzineers@gmail.com?subject=Commercial%20licence%20-%20Genzineers%20Fashion%20Tool',
  repo: 'https://github.com/the-potential-dropout/genzineers-fashion-tool',
};

// ---------- tiny DOM helper ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'selected' || k === 'disabled') el[k] = Boolean(v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k.nodeType ? k : document.createTextNode(String(k)));
  return el;
}
const sel = (value, options, onchange, attrs = {}) => h('select', { ...attrs, onchange: (e) => onchange(e.target.value) }, options.map((o) => (o.group ? h('optgroup', { label: o.group }, o.items.map((i) => h('option', { value: i.value, selected: i.value === value }, i.label))) : h('option', { value: o.value, selected: o.value === value }, o.label))));
const field = (label, input, right) => h('label', { class: 'field' }, h('span', {}, label, right || ''), input);
const pretty = (s) => String(s).replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const toast = (msg, ms = 2600) => { const t = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), ms); };
function download(name, data, type = 'text/plain') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function openDoc(html, name) {
  const w = window.open('', '_blank');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); } else download(name, html, 'text/html');
}

// ---------- app ----------
const store = createStore();
const ui = { step: 'style', group: 'All', query: '', target: 'all', garment: 'g0', fabCat: 'All', trimGroup: 'Buttons', placing: null, ai: false, aiTab: 'chat', history: [], pattern: 'off', jGroup: 'All' };

const root = document.getElementById('app');
const top = h('header', { class: 'top' });
const panel = h('aside', { class: 'panel', 'aria-label': 'Design steps' });
const stage = h('section', { class: 'stage', 'aria-label': '3D view' });
const viewEl = h('div', { class: 'view' });
const patternCanvas = h('canvas', { class: 'pattern', 'aria-label': 'Pattern editor' });
const hud = h('div', { class: 'hud' });
const placeHint = h('div', { class: 'pill place-hint hide' });
const drawer = h('aside', { class: 'drawer', 'aria-label': 'AI assistant' });
stage.append(viewEl, patternCanvas, hud, placeHint);
root.append(top, h('div', { class: 'layout' }, panel, stage, drawer));

const viewer = new Viewer(viewEl);
window.__gft = { viewer, store }; // handy for debugging from the console
viewer.onError = (m) => toast(m, 5000);
// grade nest: the same design drafted in every size of the chart (cached per design)
let gradeCache = { key: null, sizes: [] };
function gradeNest(p) {
  if (gradeCache.key === p) return gradeCache.sizes;
  const chart = SIZE_CHARTS[p.sizeChart || 'unisex'];
  const sizes = [];
  for (const size of Object.keys(chart.sizes)) {
    try { const r = applyActions(p, [{ type: 'set_size', size }]); if (r.results[0].ok) sizes.push({ size, panels: r.project.panels, current: !p.customBody && p.size === size }); } catch { /* skip */ }
  }
  gradeCache = { key: p, sizes };
  return sizes;
}
const pattern = createPatternEditor(patternCanvas, store, { toast: (m) => toast(m), grade: gradeNest });
let sim = null;
let simStatus = { text: 'Loading…', live: true };
let lastMs = 0;

// theme
const theme = settings.get('theme', 'system');
if (theme !== 'system') document.documentElement.dataset.theme = theme;
viewer.setAutoOrbit(settings.get('orbit', true) && !viewer.reducedMotion);

// ---------- rebuild on change ----------
let rebuildTimer;
function rebuild(info = {}) {
  const p = store.get();
  if (p.mode === 'jewelry') { sim?.dispose?.(); sim = null; viewer.setProject(p, null); simStatus = { text: 'Jewelry preview', live: false }; renderHud(); return; }
  if (!p.panels.length) { clearTimeout(rebuildTimer); sim?.dispose?.(); sim = null; viewer.setProject(p, null); simStatus = { text: 'Blank design: draw pieces on the flat pattern', live: false }; renderHud(); return; }
  if (info.lookOnly && sim) { viewer.refreshLooks(p); return; }
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(async () => {
    // the body collision field needs the mannequin mesh (cached after the first load)
    if (p.display?.avatar !== false) { try { await loadBodyMesh(bodyFor(p).mannequin, import.meta.env.BASE_URL); } catch (e) { console.warn('body mesh unavailable, using capsules', e); } }
    if (store.get() !== p) return; // a newer change is already queued
    sim?.dispose?.();
    const t0 = performance.now();
    sim = buildCloth(p);
    lastMs = performance.now() - t0;
    viewer.setProject(p, sim);
    if (!info.keepCamera) viewer.frameGarment();
    simStatus = { text: 'Sewing & draping…', live: true };
    renderHud();
  }, 40);
}
let stepMs = 0;
viewer.onStep = (mv) => { stepMs = stepMs * 0.9 + 0.1 * (performance.now() - (viewer._t || performance.now())); viewer._t = performance.now(); void mv; };
viewer.onSleep = () => { simStatus = { text: `Settled · ${sim?.stats.particles.toLocaleString()} pts · ${solverKind()}`, live: false }; renderHud(); };

store.subscribe((p, info) => {
  rebuild({ lookOnly: info.lookOnly, keepCamera: info.lookOnly || info.source === 'ui' });
  renderAll();
});

// ---------- top bar ----------
function renderTop() {
  const p = store.get();
  top.replaceChildren(
    h('a', { class: 'brand', href: LINKS_OUT.genzineers, target: '_blank', rel: 'noopener', title: 'By Genzineers' }, h('span', { class: 'mark', 'aria-hidden': 'true' }, '✂'), h('span', { class: 'full' }, 'Genzineers ', h('small', {}, 'Fashion Tool'))),
    h('div', { class: 'seg', role: 'tablist', 'aria-label': 'Design mode' },
      h('button', { class: p.mode !== 'jewelry' ? 'on' : '', role: 'tab', onclick: () => p.mode === 'jewelry' && store.dispatch({ type: 'new_garment', template: p.template || 'crew-tee' }) }, 'Clothing'),
      h('button', { class: p.mode === 'jewelry' ? 'on' : '', role: 'tab', onclick: () => p.mode !== 'jewelry' && store.dispatch({ type: 'new_jewelry', template: 'solitaire-ring' }) }, 'Jewelry')),
    h('div', { class: 'spacer' }),
    h('button', { class: 'btn ghost icon', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', disabled: !store.canUndo(), onclick: () => store.undo() }, '↶'),
    h('button', { class: 'btn ghost icon', title: 'Redo (Ctrl+Shift+Z)', 'aria-label': 'Redo', disabled: !store.canRedo(), onclick: () => store.redo() }, '↷'),
    h('button', { class: `btn desk-only ${ui.pattern !== 'off' ? 'primary' : ''}`, onclick: () => { ui.pattern = ui.pattern === 'off' ? 'split' : ui.pattern === 'split' ? 'only' : 'off'; applyPatternMode(); renderTop(); }, title: 'Flat pattern: every piece laid flat with cut lines, stitch lines and seam matching. Draw your own pieces here too.' }, ui.pattern === 'off' ? '✂ Flat pattern' : ui.pattern === 'split' ? '✂ Pattern: split' : '✂ Pattern: full'),
    h('button', { class: 'btn', onclick: () => openCollection(), title: 'My collection: everything you have saved (Ctrl+S saves)' }, '♡ ', h('span', { class: 'full' }, 'Collection')),
    h('button', { class: 'btn', onclick: () => toggleAI(true), title: 'AI assistant & image tools' }, '✦ AI'),
    h('button', { class: 'btn primary', onclick: () => { ui.step = 'make'; renderPanel(); } }, 'Make it →'),
    h('button', { class: 'btn ghost icon', 'aria-label': 'Menu', onclick: (e) => { e.stopPropagation(); openMenu(); } }, '⋯'),
  );
}
function applyPatternMode() {
  stage.classList.toggle('split', ui.pattern === 'split');
  stage.classList.toggle('pattern-only', ui.pattern === 'only');
  if (ui.pattern !== 'off') setTimeout(() => { pattern.resize(); pattern.fit(); }, 30);
  setTimeout(() => viewer.resize(), 30);
}
if (matchMedia('(max-width: 760px)').matches) ui.pattern = 'off';

// ---------- menu ----------
let menuEl;
function openMenu() {
  menuEl?.remove();
  const p = store.get();
  const item = (label, fn) => h('button', { onclick: () => { menuEl.remove(); fn(); } }, label);
  menuEl = h('div', { class: 'menu', role: 'menu' },
    item('Open / import file… (project, DXF, SVG, STL, OBJ, GLB, STEP…)', () => fileInput.click()),
    item('Save to my collection (Ctrl+S)', () => saveToCollection()),
    item('My collection…', () => openCollection()),
    item('Save project (.json)', () => download(`${p.name}.gft.json`, JSON.stringify(p, null, 1), 'application/json')),
    item('Export 3D model (GLB)', async () => download(`${p.name}.glb`, await viewer.exportModel('glb'))),
    item('Export 3D model (OBJ)', async () => download(`${p.name}.obj`, await viewer.exportModel('obj'))),
    item('Export 3D model (STL, for 3D printing / casting)', async () => download(`${p.name}.stl`, await viewer.exportModel('stl'))),
    item('Open in Blender', () => openInBlender()),
    item('Snapshot (PNG)', () => download(`${p.name}.png`, dataUrlToBlob(viewer.snapshot(1600)))),
    h('hr'),
    item(`Auto-orbit: ${viewer.autoOrbit ? 'on' : 'off'}`, () => { viewer.setAutoOrbit(!viewer.autoOrbit); settings.set('orbit', viewer.autoOrbit); }),
    item(`Theme: ${settings.get('theme', 'system')}`, () => { const order = ['system', 'light', 'dark']; const nt = order[(order.indexOf(settings.get('theme', 'system')) + 1) % 3]; settings.set('theme', nt); if (nt === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = nt; viewer.setBackground(getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#eceae6'); }),
    item('Connect AI & tools…', () => { ui.aiTab = 'connect'; toggleAI(true); }),
    h('hr'),
    h('a', { href: LINKS_OUT.genzineers, target: '_blank', rel: 'noopener' }, 'Genzineers: more tools ↗'),
    h('a', { href: LINKS_OUT.tpd, target: '_blank', rel: 'noopener' }, 'The Potential Dropout: learn to build & launch ↗'),
    h('a', { href: LINKS_OUT.pd, target: '_blank', rel: 'noopener' }, 'Potential Dropout ↗'),
    h('a', { href: LINKS_OUT.licence, target: '_blank', rel: 'noopener' }, 'Commercial licence: email genzineers@gmail.com'),
    item('About & licence', () => showAbout()),
  );
  document.body.append(menuEl);
  setTimeout(() => document.addEventListener('click', () => menuEl?.remove(), { once: true }), 0);
}
const dataUrlToBlob = (u) => { const [m, b] = u.split(','); const bin = atob(b); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: m.split(':')[1].split(';')[0] }); };

// ---------- Blender ----------
async function openInBlender() {
  const p = store.get();
  const blob = await viewer.exportModel('glb');
  if (window.__TAURI_INTERNALS__) {
    try { await invoke('open_in_blender', { data: Array.from(new Uint8Array(await blob.arrayBuffer())), name: p.name.replace(/[^\w-]+/g, '_') }); toast('Opening in Blender…'); return; } catch (e) { toast(`${e}`, 6000); }
  }
  download(`${p.name.replace(/[^\w-]+/g, '_')}.glb`, blob);
  toast('Saved .glb. In Blender: File → Import → glTF 2.0. (The desktop app opens Blender for you.)', 6000);
}

// ---------- import ----------
const fileInput = h('input', { type: 'file', class: 'hide', accept: ['.json', '.dxf', '.svg', ...MODEL_EXT.map((e) => `.${e}`)].join(','), onchange: async (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) await importFile(f); } });
document.body.append(fileInput);
async function importFile(f) {
  const ext = f.name.toLowerCase().split('.').pop();
  try {
    if (ext === 'json') { store.replace(JSON.parse(await readAs(f, 'readAsText'))); toast('Project opened'); return; }
    if (ext === 'dxf' || ext === 'svg') {
      const pieces = ext === 'dxf' ? parseDXF(await readAs(f, 'readAsText')) : parseSVG(await readAs(f, 'readAsText'));
      if (!pieces.length) throw new Error('No closed pattern pieces found');
      if (store.get().mode === 'jewelry') { store.dispatch({ type: 'set_custom_shape', target: 'pendant', points: pieces[0].points.map(([x, y]) => [x * 10, y * 10]) }); toast('Shape used as a custom pendant'); return; }
      store.dispatch(piecesToActions(pieces));
      toast(`Imported ${pieces.length} pattern piece(s). Add seams in Details or ask the AI to sew them.`, 4500);
      return;
    }
    if (MODEL_EXT.includes(ext)) {
      if (store.get().mode !== 'jewelry') store.dispatch({ type: 'new_jewelry', template: 'pendant-necklace' });
      const data = await readAs(f, 'readAsDataURL');
      store.dispatch({ type: 'add_part', name: f.name, data, material: store.get().jewelry.metal });
      ui.step = 'details'; renderPanel();
      toast('CAD part imported. Adjust material, size and shape under Details.', 4000);
      return;
    }
    throw new Error(`Unsupported file .${ext}`);
  } catch (err) { toast(`Import failed: ${err.message}`, 6000); }
}
stage.addEventListener('dragover', (e) => e.preventDefault());
stage.addEventListener('drop', (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) importFile(f); });

// ---------- HUD ----------
function renderHud() {
  const p = store.get();
  hud.replaceChildren(...[
    h('span', { class: 'pill' }, h('span', { class: `dot ${simStatus.live ? 'live' : 'ok'}` }), simStatus.text),
    p.mode !== 'jewelry' ? h('button', { class: 'pill', onclick: () => rebuild({ keepCamera: true }) }, '↻ Re-drape') : null,
    h('button', { class: 'pill', onclick: () => (p.mode === 'jewelry' ? viewer.setProject(p) : viewer.frameGarment()) }, '⤢ Fit'),
    h('button', { class: 'pill', onclick: () => { viewer.setAutoOrbit(!viewer.autoOrbit); settings.set('orbit', viewer.autoOrbit); renderHud(); } }, viewer.autoOrbit ? '⟳ Orbit on' : '⟳ Orbit off'),
    p.mode !== 'jewelry' ? h('button', { class: `pill ${viewer.fitMap ? 'on' : ''}`, title: 'Colour the cloth by tension: red = tight, blue = loose', onclick: () => { viewer.setFitMap(!viewer.fitMap); renderHud(); } }, viewer.fitMap ? '◐ Fit map on' : '◐ Fit map') : null,
    p.mode !== 'jewelry' ? h('span', { class: 'pill' }, `Size ${p.customBody ? 'custom' : p.size} · ${SIZE_CHARTS[p.sizeChart || 'unisex'].label}`) : null,
    h('button', { class: 'pill', onclick: () => { ui.aiTab = 'images'; ui.useRef = true; toggleAI(true); } }, '✦ AI render'),
  ].filter(Boolean));
}

// ---------- placing trims by clicking the garment ----------
viewEl.addEventListener('click', (e) => {
  if (!ui.placing) return;
  const hit = viewer.pick(e.clientX, e.clientY);
  if (!hit) return toast('Click on the garment');
  if (ui.placing === 'embroidery') {
    const d = ui.emb;
    const r = store.dispatch({ type: 'add_embroidery', panel: hit.panelId, at: hit.local.map((v) => Math.round(v * 10) / 10), kind: d.kind, text: d.text, font: d.font, motif: d.motif, image: d.image, width: d.width, stitch: d.stitch, colors: d.colors, threads: d.threads, outline: d.outline });
    toast(r[0]?.ok ? 'Embroidery placed. Adjust it in the list below.' : r[0]?.error || 'Could not add embroidery', 3500);
    ui.placing = null; renderPanel(); renderPlaceHint();
    return;
  }
  if (ui.placing.startsWith('pocket:')) {
    const r = store.dispatch({ type: 'add_pocket', pocket: ui.placing.slice(7), panel: hit.panelId, at: hit.local.map((v) => Math.round(v * 10) / 10), ...(ui.pocketClosure ? { closure: ui.pocketClosure } : {}), ...(ui.pocketAngle ? { angle: ui.pocketAngle } : {}), mirror: hit.local[0] < 0 });
    toast(r[0]?.ok ? r[0].result : r[0]?.error || 'Could not add pocket');
    return;
  }
  const def = TRIMS[ui.placing];
  const a = { type: 'add_trim', trim: ui.placing, panel: hit.panelId, at: hit.local.map((v) => Math.round(v * 10) / 10) };
  if (def.line) a.to = [a.at[0] + 10, a.at[1]];
  store.dispatch(a);
});
addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'Escape' && ui.placing) { ui.placing = null; renderPanel(); renderPlaceHint(); }
  if (mod && e.key.toLowerCase() === 'z' && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName)) { e.preventDefault(); e.shiftKey ? store.redo() : store.undo(); }
  if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); store.redo(); }
  if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveToCollection(); }
  if (e.key === 'Escape' && collEl) closeCollection();
});
function renderPlaceHint() {
  placeHint.classList.toggle('hide', !ui.placing);
  if (ui.placing) placeHint.replaceChildren(`Click the garment to place ${ui.placing === 'embroidery' ? 'the embroidery' : ui.placing.startsWith('pocket:') ? POCKETS[ui.placing.slice(7)].name : TRIMS[ui.placing].name} · `, h('button', { class: 'btn sm', onclick: () => { ui.placing = null; renderPanel(); renderPlaceHint(); } }, 'Done'));
}

// ---------- panel ----------
const STEPS = [['style', 'Style'], ['materials', 'Materials'], ['details', 'Details'], ['make', 'Make it']];
function renderPanel() {
  const p = store.get();
  const scrollTop = panel.querySelector('.scroll')?.scrollTop || 0;
  const body = h('div', { class: 'scroll' });
  const isJ = p.mode === 'jewelry';
  const fns = isJ ? { style: jStyle, materials: jMaterials, details: jDetails, make: jMake } : { style: cStyle, materials: cMaterials, details: cDetails, make: cMake };
  fns[ui.step](body, p);
  panel.replaceChildren(
    h('nav', { class: 'steps', role: 'tablist' }, STEPS.map(([k, l], i) => h('button', { class: ui.step === k ? 'on' : '', role: 'tab', 'aria-selected': ui.step === k, onclick: () => { ui.step = k; renderPanel(); } }, h('span', { class: 'n' }, i + 1), isJ && k === 'details' ? 'Stones & parts' : l))),
    body,
    h('div', { class: 'foot' }, 'Free for non-commercial use · ', h('a', { href: LINKS_OUT.licence, target: '_blank', rel: 'noopener' }, 'Commercial licence'), ' · by ', h('a', { href: LINKS_OUT.genzineers, target: '_blank', rel: 'noopener' }, 'Genzineers'), ' · ', h('a', { href: LINKS_OUT.tpd, target: '_blank', rel: 'noopener' }, 'Learn to launch')),
  );
  panel.querySelector('.scroll').scrollTop = scrollTop;
}
const next = (label, step) => h('div', { style: 'margin-top:14px;display:flex;justify-content:flex-end' }, h('button', { class: 'btn primary', onclick: () => { ui.step = step; renderPanel(); } }, label));

// ===== Clothing: Style =====
const KEY_OPTS = { legwear: ['type', 'denier', 'pattern', 'color', 'color2', 'topBand'], brief: ['style', 'rise', 'legCut', 'waistband', 'pouch'], bra: ['style', 'band', 'cup', 'straps', 'closure', 'wire', 'padding'], top: ['fit', 'length', 'sleeve', 'cuff', 'neckline', 'collar', 'lapel', 'closure', 'insulation'], bottom: ['fit', 'inseam', 'rise', 'leg', 'waistband', 'hem', 'pockets'], skirt: ['length', 'flare', 'waistband', 'slit'], hat: ['style', 'height', 'brim', 'stiffener', 'billShape', 'closure'], bag: ['type', 'width', 'height', 'depth', 'handles', 'closure', 'hardware'], scarf: ['length', 'width', 'ends'], tie: ['width', 'length', 'tip', 'knot'] };
function cStyle(el, p) {
  const t = TEMPLATES[p.template];
  if (t?.why) el.append(h('div', { class: 'tip' }, h('b', {}, 'Industry default: '), t.why));
  const groups = ['All', ...TEMPLATE_GROUPS];
  const list = Object.entries(TEMPLATES).filter(([id, v]) => (ui.group === 'All' || v.group === ui.group) && (!ui.query || `${v.name} ${v.group} ${v.audience || ''}`.toLowerCase().includes(ui.query.toLowerCase())));
  el.append(h('div', { class: 'sec' },
    h('h3', {}, 'Start from a template'),
    h('input', { class: 'inp', type: 'search', placeholder: 'Search: hoodie, peak lapel, 5 inch shorts, fedora, tote…', value: ui.query, oninput: (e) => { ui.query = e.target.value; const pos = e.target.selectionStart; renderPanel(); const i = panel.querySelector('input[type=search]'); i.focus(); i.setSelectionRange(pos, pos); }, 'aria-label': 'Search templates' }),
    h('div', { class: 'chips scrollx', style: 'margin:8px 0' }, groups.map((g) => h('button', { class: `chip ${ui.group === g ? 'on' : ''}`, onclick: () => { ui.group = g; renderPanel(); } }, g))),
    h('div', { class: 'grid2' }, list.slice(0, ui.query || ui.group !== 'All' ? 200 : 12).map(([id, v]) => h('button', { class: `tile ${p.template === id ? 'on' : ''}`, onclick: () => store.dispatch({ type: 'new_garment', template: id }) }, h('div', { class: 't' }, v.name), h('div', { class: 's' }, v.group, v.audience ? ` · ${v.audience}` : '')))),
    !ui.query && ui.group === 'All' ? h('div', { class: 's', style: 'margin-top:6px;color:var(--muted);font-size:12px' }, `${Object.keys(TEMPLATES).length} templates. Pick a category to see all.`) : null,
  ));
  // garment options
  const gs = p.garments || [];
  if (gs.length) {
    if (!gs.some((g) => g.id === ui.garment)) ui.garment = gs[0].id;
    const g = gs.find((x) => x.id === ui.garment);
    const schema = GENERATORS[g.generator].options;
    const opt = (k) => {
      const s = schema[k]; if (!s) return null;
      const val = g.options[k];
      const input = s.type === 'select'
        ? sel(String(val), s.values.map((v) => ({ value: v, label: pretty(v) + (v === s.default ? ' (default)' : '') })), (v) => store.dispatch({ type: 'set_option', garment: g.id, key: k, value: v }))
        : s.type === 'color' ? h('input', { type: 'color', value: val, onchange: (e) => store.dispatch({ type: 'set_option', garment: g.id, key: k, value: e.target.value }) })
        : h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: val, onchange: (e) => store.dispatch({ type: 'set_option', garment: g.id, key: k, value: Number(e.target.value) }), oninput: (e) => (e.target.closest('label').querySelector('b').textContent = e.target.value) });
      return field(s.label, input, s.type === 'range' ? h('b', {}, val) : null);
    };
    const keys = KEY_OPTS[g.generator] || Object.keys(schema);
    el.append(h('div', { class: 'sec' },
      h('h3', {}, 'Customise'),
      gs.length > 1 ? h('div', { class: 'chips', style: 'margin-bottom:8px' }, gs.map((x) => h('button', { class: `chip ${x.id === ui.garment ? 'on' : ''}`, onclick: () => { ui.garment = x.id; renderPanel(); } }, GENERATORS[x.generator].label.split(' /')[0]))) : null,
      keys.map(opt),
      h('details', {}, h('summary', {}, 'All options'), h('div', {}, Object.keys(schema).filter((k) => !keys.includes(k) && !/Adj$/.test(k)).map(opt))),
    ));
    const adj = Object.keys(schema).filter((k) => /Adj$/.test(k) || ['length', 'inseam', 'flare'].includes(k));
    if (adj.length) el.append(h('details', { open: ui.tailorOpen }, h('summary', { onclick: () => (ui.tailorOpen = !ui.tailorOpen) }, '✂ Tailor the fit'), h('div', {},
      h('div', { class: 'tip' }, 'Quick alterations like a tailor: take in / let out, lengthen / shorten. Turn on ', h('b', {}, 'Fit map'), ' (bottom of the 3D view) to see tight (red) and loose (blue) areas.'),
      adj.map((k) => { const sc = schema[k]; const v = g.options[k] ?? 0; const step = (d) => store.dispatch({ type: 'set_option', garment: g.id, key: k, value: Math.round((Number(v) + d) * 10) / 10 }); return h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 't' }, sc.label.replace('Tailor: ', '')), h('div', { class: 's' }, `${v} ${/Adj$/.test(k) && v ? '(altered)' : ''}`)), h('button', { class: 'btn sm', onclick: () => step(-2) }, '−2'), h('button', { class: 'btn sm', onclick: () => step(-1) }, '−1'), h('button', { class: 'btn sm', onclick: () => step(1) }, '+1'), h('button', { class: 'btn sm', onclick: () => step(2) }, '+2')); }),
    )));
  }
  // size
  const chart = SIZE_CHARTS[p.sizeChart || 'unisex'];
  el.append(h('div', { class: 'sec' },
    h('h3', {}, 'Size (re-drafts the pattern and the avatar)'),
    h('div', { class: 'seg', style: 'margin-bottom:8px' }, Object.entries(SIZE_CHARTS).map(([k, c]) => h('button', { class: (p.sizeChart || 'unisex') === k ? 'on' : '', onclick: () => store.dispatch({ type: 'set_size', chart: k, size: c.sizes[p.size] ? p.size : 'M' }) }, c.label))),
    h('div', { class: 'chips' }, Object.keys(chart.sizes).map((s) => h('button', { class: `chip ${!p.customBody && p.size === s ? 'on' : ''}`, onclick: () => store.dispatch({ type: 'set_size', size: s }) }, s))),
    field('Mannequin', sel(p.mannequin || 'auto', [{ value: 'auto', label: 'Match size chart' }, { value: 'female', label: 'Female body' }, { value: 'male', label: 'Male body' }], (v) => store.dispatch({ type: 'set_size', mannequin: v }))),
    bodyEditor(p, chart),  ));
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Outfit (wear several pieces together)'),
    h('div', { class: 'chips', style: 'margin-bottom:8px' },
      h('button', { class: 'btn sm primary', onclick: () => openCollection({ pick: true }) }, '♡ Add from my collection'),
      h('button', { class: 'btn sm', onclick: () => saveToCollection() }, 'Save to collection')),
    field('Or add a new piece from a template', sel('', [{ value: '', label: 'Choose…' }, ...TEMPLATE_GROUPS.map((gr) => ({ group: gr, items: Object.entries(TEMPLATES).filter(([, v]) => v.group === gr).map(([id, v]) => ({ value: id, label: v.name })) }))], (v) => v && store.dispatch({ type: 'add_garment', template: v }))),
    gs.length > 1 ? h('div', { class: 'tip' }, 'Pieces are layered inside-out: underwear, base, knits, jackets, coats. Change a layer if something should sit over or under another.') : null,
    gs.length > 1 ? h('div', { class: 'list' }, [...gs].sort((a, b) => layerOf(p, { garment: a.id }) - layerOf(p, { garment: b.id })).map((x) => h('div', { class: 'row' },
      h('div', { class: 'grow' }, h('div', { class: 't' }, x.name || GENERATORS[x.generator].label.split(' /')[0]), h('div', { class: 's' }, x.layer == null ? `Layer: ${LAYER_NAMES[layerOf(p, { garment: x.id })]} (auto)` : `Layer: ${LAYER_NAMES[x.layer]}`)),
      sel(x.layer == null ? 'auto' : String(x.layer), [{ value: 'auto', label: 'Auto layer' }, ...LAYER_NAMES.map((n, i) => ({ value: String(i), label: n }))], (v) => store.dispatch({ type: 'set_layer', garment: x.id, layer: v === 'auto' ? null : Number(v) })),
      h('button', { class: 'btn sm', onclick: () => store.dispatch({ type: 'remove_garment', garment: x.id }) }, 'Remove')))) : null));
  el.append(next('Next: materials →', 'materials'));
}

// ---- body: shape presets + every key measurement ----
const BODY_FIELDS = [['height', 'Height', 140, 210], ['weight', 'Weight (kg)', 40, 160], ['chest', 'Chest / bust', 70, 150], ['underbust', 'Underbust', 60, 140], ['waist', 'Waist', 50, 150], ['hip', 'Hips', 70, 160], ['thigh', 'Thigh', 40, 90], ['shoulder', 'Shoulder width', 32, 58], ['inseam', 'Inseam', 60, 95], ['arm', 'Arm length', 45, 72], ['neck', 'Neck', 28, 50], ['head', 'Head', 50, 64]];
function bodyEditor(p, chart) {
  const mq = p.mannequin || ((p.sizeChart || 'unisex') === 'womens' ? 'female' : 'male');
  const R = REF_BODY[mq];
  const cur = { ...R, ...(chart.sizes[p.size] || chart.sizes.M), ...(p.customBody || {}) };
  cur.weight = cur.weight || Math.round(22 * (cur.height / 100) ** 2);
  const setM = (k, v) => {
    const patch = { [k]: v };
    if (k === 'weight') {
      // weight changes girths: waist most, then hips/chest, then thigh/underbust
      const r = v / cur.weight;
      for (const [kk, pw] of [['waist', 0.75], ['hip', 0.45], ['chest', 0.4], ['underbust', 0.45], ['thigh', 0.5], ['neck', 0.3]]) patch[kk] = Math.round(cur[kk] * r ** pw * 10) / 10;
    }
    store.dispatch({ type: 'set_size', custom: patch });
  };
  return h('details', { style: 'margin-top:8px', open: Boolean(p.customBody) }, h('summary', {}, p.customBody ? `Custom body${p.bodyShape ? ` · ${BODY_SHAPES[p.bodyShape]?.name}` : ''}` : 'Body type & custom measurements'), h('div', {},
    h('div', { class: 'chips scrollx', style: 'margin-bottom:8px' }, Object.entries(BODY_SHAPES).map(([k, b]) => h('button', { class: `chip ${p.bodyShape === k ? 'on' : ''}`, onclick: () => store.dispatch({ type: 'set_size', shape: k }) }, b.name))),
    h('div', { class: 'grid2' }, BODY_FIELDS.map(([k, label, min, max]) => field(label, h('input', { type: 'range', min, max, step: k === 'weight' || k === 'height' ? 1 : 0.5, value: cur[k], onchange: (e) => setM(k, Number(e.target.value)), oninput: (e) => (e.target.closest('label').querySelector('b').textContent = e.target.value) }), h('b', {}, cur[k])))),
    h('div', { class: 'chips' }, h('button', { class: 'btn sm', onclick: () => store.dispatch({ type: 'set_size', size: p.size || 'M' }) }, 'Reset to size chart')),
    h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin-top:6px' }, 'cm unless noted. The mannequin, its collision body and every pattern re-draft to these measurements.')));
}

// ---- target chooser (all / garment / panel) ----
function targetChips(p) {
  const opts = [['all', 'Whole outfit'], ...((p.garments || []).length > 1 ? p.garments.map((g) => [`g:${g.id}`, GENERATORS[g.generator].label.split(' /')[0]]) : []), ...p.panels.map((x) => [`p:${x.id}`, x.name])];
  if (!opts.some(([k]) => k === ui.target)) ui.target = 'all';
  return h('div', { class: 'sec' }, h('h3', {}, 'Apply to'), h('div', { class: 'chips scrollx' }, opts.map(([k, l]) => h('button', { class: `chip ${ui.target === k ? 'on' : ''}`, onclick: () => { ui.target = k; renderPanel(); } }, l))));
}
const tgt = () => (ui.target.startsWith('p:') ? { panel: ui.target.slice(2) } : ui.target.startsWith('g:') ? { panel: 'all', garment: ui.target.slice(2) } : { panel: 'all' });
const tgtPanel = (p) => (ui.target.startsWith('p:') ? p.panels.find((x) => x.id === ui.target.slice(2)) : ui.target.startsWith('g:') ? p.panels.find((x) => x.garment === ui.target.slice(2)) : p.panels[0]);

// ===== Clothing: Materials =====
function cMaterials(el, p) {
  el.append(targetChips(p));
  const cur = tgtPanel(p); if (!cur) return;
  const fab = resolveFabric(p, cur.fabric, cur.fabricOverrides);
  const rec = recommendFor(cur.fabric, p);
  // physical properties of this material in this project (defaults per material, all editable)
  { const num = (label, key, step, unit) => field(`${label} (${unit})`, h('input', { type: 'number', step, min: 0, value: fab[key], onchange: (e) => { const v = Number(e.target.value); if (v > 0) store.dispatch({ type: 'set_fabric', ...tgt(), overrides: { [key]: v } }); } }));
    el.append(h('details', {}, h('summary', {}, `Material properties: ${fab.thicknessMm} mm thick · ${fab.weightGsm} g/m²`), h('div', {},
      h('div', { class: 'grid2' }, num('Thickness', 'thicknessMm', 0.05, 'mm'), num('Weight', 'weightGsm', 5, 'g/m²')),
      h('div', { class: 's', style: 'font-size:12px;color:var(--muted)' }, `Default thickness is ${fab.thicknessSource || 'the material default'}. Thickness changes stiffness (bending follows thickness cubed) and how far the cloth stands off the body; weight changes how it hangs. ${fab.mech ? `Measured behaviour used: stretches ${fab.mech.emt}% under load, shear ${fab.mech.G} gf/cm·deg, bending ${fab.mech.B.toFixed(3)} gf·cm²/cm, friction ${fab.mech.mu}.` : ''}`),
      h('button', { class: 'btn sm', style: 'margin-top:6px', onclick: () => store.dispatch({ type: 'set_fabric', ...tgt(), fabric: fab.id }) }, 'Reset to material defaults')))); }
  el.append(h('div', { class: 'tip' }, h('b', {}, fab.name), ` · ${fab.fiber} · ${fab.weightGsm} gsm. `, fabricTip(fab.id) || fab.note || '', h('br'), h('b', {}, 'Recommended: '), `${ASSEMBLY[rec.stitch]?.name}, ${THREADS[rec.thread]?.name}, needle ${rec.needle}, ${rec.spi} SPI.`));
  // fabric picker
  const cats = ['All', ...FABRIC_CATEGORIES];
  const q = (ui.fabQ || '').toLowerCase();
  const fams = Object.values(FABRIC_FAMILIES).filter((f) => (ui.fabCat === 'All' || f.category === ui.fabCat) && (!q || f.variants.some((v) => `${FABRICS[v].name} ${FABRICS[v].fiber}`.toLowerCase().includes(q))));
  el.append(h('div', { class: 'sec' },
    h('h3', {}, 'Fabric'),
    h('input', { class: 'inp', type: 'search', placeholder: 'Search fabrics: selvedge, virgin wool, pre-shrunk, ripstop, waterproof…', value: ui.fabQ || '', oninput: (e) => { ui.fabQ = e.target.value; const pos = e.target.selectionStart; renderPanel(); const i = panel.querySelectorAll('input[type=search]')[0]; i.focus(); i.setSelectionRange(pos, pos); } }),
    h('div', { class: 'chips scrollx', style: 'margin:8px 0' }, cats.map((c) => h('button', { class: `chip ${ui.fabCat === c ? 'on' : ''}`, onclick: () => { ui.fabCat = c; renderPanel(); } }, c))),
    h('div', { class: 'list' }, fams.map((f) => {
      const inFam = f.variants.includes(cur.fabric);
      return h('div', { class: 'row', style: inFam ? 'border-color:var(--accent)' : '' },
        h('span', { class: 'sw', style: `background:${FABRICS[f.id].look.color}` }),
        h('div', { class: 'grow' }, h('div', { class: 't' }, f.name), h('div', { class: 's' }, `${f.category} · ${f.fiber}`)),
        sel(inFam ? cur.fabric : '', [{ value: '', label: f.variants.length > 1 ? `${f.variants.length} qualities…` : 'Use' }, ...f.variants.map((v) => ({ value: v, label: FABRICS[v].name.replace(f.name, '').trim() || 'Standard' }))], (v) => v && store.dispatch({ type: 'set_fabric', ...tgt(), fabric: v }), { class: 'inp', style: 'width:auto;max-width:46%', 'aria-label': `${f.name} quality` }));
    })),
  ));
  // knitwear
  const kg = (p.garments || []).find((x) => x.id === (ui.target.startsWith('g:') ? ui.target.slice(2) : cur.garment)) || (p.garments || [])[0];
  if (kg && kg.generator !== 'bag') {
    const k = kg.knit;
    const setK = (patch) => store.dispatch({ type: 'set_knit', garment: kg.id, ...patch });
    el.append(h('details', { open: Boolean(k) }, h('summary', {}, k ? `Knitwear: ${KNIT_STRUCTURES[k.structure].name}, ${k.gauge}` : 'Make it knitted (sweaters, cardigans, knit polos…)'), h('div', {},
      !k ? h('button', { class: 'btn', onclick: () => setK({}) }, 'Knit this garment (12gg merino jersey)') : [
        h('div', { class: 'tip' }, KNIT_METHODS[k.method].note),
        h('div', { class: 'grid2' },
          field('Method', sel(k.method, Object.entries(KNIT_METHODS).map(([id, m]) => ({ value: id, label: `${m.name}${m.recommended ? ' ★' : ''}` })), (v) => setK({ method: v }))),
          field('Gauge', sel(k.gauge, Object.entries(GAUGES).map(([id, g2]) => ({ value: id, label: `${g2.name}` })), (v) => setK({ gauge: v }))),
          field('Yarn', sel(k.yarn, Object.entries(YARNS).map(([id, y]) => ({ value: id, label: y.name })), (v) => setK({ yarn: v }))),
          field('Stitch / structure', sel(k.structure, Object.entries(KNIT_STRUCTURES).map(([id, x]) => ({ value: id, label: x.name })), (v) => setK({ structure: v }))),
          field('Colourwork motif', sel(k.motif || 'none', Object.entries(MOTIFS).map(([id, m]) => ({ value: id, label: m.name })), (v) => setK({ motif: v }))),
          h('span')),
        h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin-bottom:8px' }, `${GAUGES[k.gauge].use} · Yarn: ${YARNS[k.yarn].note} · ${KNIT_STRUCTURES[k.structure].note}`),
        h('div', { class: 'grid2' }, [0, 1, 2].map((i) => field(i ? `Colour ${i + 1}` : 'Main colour', h('input', { type: 'color', value: k.colors[i] || '#888888', onchange: (e) => { const c = [...k.colors]; c[i] = e.target.value; setK({ colors: c }); } })))),
      ])));
  }
  // blends
  el.append(h('details', {}, h('summary', {}, 'Fibre blends (e.g. 65/35 poly-cotton, 95/5 cotton-spandex)'), h('div', {},
    h('div', { class: 'list' }, Object.entries(BLENDS).map(([id, b]) => h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 't' }, `${b.name}`), h('div', { class: 's' }, `${Object.entries(b.composition).map(([k, v]) => `${v}% ${k}`).join(' / ')} · ${b.uses}`), h('div', { class: 's' }, h('span', { class: 'okc' }, '+ '), b.pros), h('div', { class: 's' }, h('span', { class: 'warn' }, '− '), b.cons)), h('button', { class: 'btn sm', onclick: () => { store.dispatch([{ type: 'create_blend', id: `blend-${id}`, blend: id }, { type: 'set_fabric', ...tgt(), fabric: `blend-${id}` }]); } }, 'Use')))),
    h('h3', { style: 'margin-top:12px' }, 'Custom blend'),
    customBlend(),
  )));
  // colour & finish
  const fin = cur.finish || {};
  const dyeOk = (id) => compatible(DYES[id], fab).ok;
  const recDye = rec.dye;
  el.append(h('div', { class: 'sec' },
    h('h3', {}, 'Colour & dyeing'),
    h('div', { class: 'grid2' },
      field('Colour', h('input', { type: 'color', value: fin.color || fab.look.color, onchange: (e) => store.dispatch({ type: 'set_finish', ...tgt(), color: e.target.value }) })),
      field('Dye method', sel(fin.dye || '', [{ value: '', label: 'As supplied' }, ...Object.entries(DYES).map(([id, d]) => ({ value: id, label: `${d.name}${id === recDye ? ' ★ recommended' : ''}${dyeOk(id) ? '' : ' (not for this fibre)'}` }))], (v) => store.dispatch({ type: 'set_finish', ...tgt(), dye: v || null })))),
    fin.dye ? h('div', { class: 's', style: 'font-size:12px;color:var(--muted)' }, DYES[fin.dye].use, DYES[fin.dye].note ? ` ${DYES[fin.dye].note}` : '') : null,
    h('h3', { style: 'margin-top:12px' }, 'Print'),
    h('div', { class: 'grid2' },
      field('Method', sel(fin.print?.method || '', [{ value: '', label: 'No print' }, ...Object.entries(PRINT_METHODS).map(([id, m]) => ({ value: id, label: `${m.name}${id === rec.print ? ' ★' : ''}${compatible(m, fab).ok ? '' : ' (not for this fibre)'}` }))], (v) => store.dispatch({ type: 'set_finish', ...tgt(), print: v ? { ...(fin.print || { design: 'stripes', colors: ['#111111', '#ffffff', '#c0392b'] }), method: v } : null }))),
      field('Design', sel(fin.print?.design || 'stripes', PRINT_DESIGNS.map((d) => ({ value: d, label: pretty(d) })), (v) => store.dispatch({ type: 'set_finish', ...tgt(), print: { method: fin.print?.method || rec.print, ...(fin.print || {}), design: v, colors: printColors(v, null) } })))),
    fin.print && fin.print.design !== 'solid' ? field('Print size', h('input', { type: 'range', min: 0.25, max: 3, step: 0.05, value: fin.print.scale || 1, oninput: (e) => (e.target.closest('label').querySelector('b').textContent = `${Math.round(e.target.value * 100)}%`), onchange: (e) => store.dispatch({ type: 'set_finish', ...tgt(), print: { ...fin.print, scale: Number(e.target.value) } }) }), h('b', {}, `${Math.round((fin.print.scale || 1) * 100)}%`)) : null,
    fin.print ? h('div', { class: 'grid2' }, [0, 1, 2].map((i) => field(PRINT_COLOR_LABELS[i], h('input', { type: 'color', value: printColors(fin.print.design, fin.print.colors)[i], onchange: (e) => { const c = printColors(fin.print.design, fin.print.colors); c[i] = e.target.value; store.dispatch({ type: 'set_finish', ...tgt(), print: { ...fin.print, colors: c } }); } }))), field('Colours', h('button', { class: 'btn sm', onclick: () => store.dispatch({ type: 'set_finish', ...tgt(), print: { ...fin.print, colors: printColors(fin.print.design, null) } }) }, 'Reset to natural')), field('Artwork image', h('input', { type: 'file', accept: 'image/*', onchange: async (e) => { const f = e.target.files[0]; if (f) store.dispatch({ type: 'set_finish', ...tgt(), print: { ...fin.print, design: 'image', image: await readAs(f, 'readAsDataURL') } }); } }))) : null,
    h('h3', { style: 'margin-top:12px' }, 'Paint'),
    h('div', { class: 'grid2' },
      field('Paint', sel(fin.paint?.method || '', [{ value: '', label: 'No paint' }, ...Object.entries(PAINTS).map(([id, m]) => ({ value: id, label: m.name }))], (v) => store.dispatch({ type: 'set_finish', ...tgt(), paint: v ? { design: 'floral', colors: ['#ffffff', '#ffd400', '#ff2d87'], ...(fin.paint || {}), method: v } : null }))),
      fin.paint ? field('Motif', sel(fin.paint.design, PRINT_DESIGNS.filter((d) => d !== 'image').map((d) => ({ value: d, label: pretty(d) })), (v) => store.dispatch({ type: 'set_finish', ...tgt(), paint: { ...fin.paint, design: v } }))) : h('span')),
  ));
  // insulation
  if ((p.garments || []).some((g) => g.generator === 'top')) {
    const ins = cur.insulation || {};
    el.append(h('details', { open: Boolean(cur.insulation) }, h('summary', {}, 'Insulation / fill (down, synthetic, wool…)'), h('div', {},
      field('Fill', sel(ins.fill || '', [{ value: '', label: 'None' }, ...Object.entries(INSULATION).map(([id, f]) => ({ value: id, label: f.name }))], (v) => store.dispatch({ type: 'set_insulation', ...tgt(), fill: v || null, weight: ins.weight || 120, quilting: ins.quilting || 'channel' }))),
      ins.fill ? h('div', { class: 'tip' }, INSULATION[ins.fill].use, '. ', h('span', { class: 'okc' }, '+ '), INSULATION[ins.fill].pros, '. ', h('span', { class: 'warn' }, '− '), INSULATION[ins.fill].cons, INSULATION[ins.fill].cert ? ` · Ask for ${INSULATION[ins.fill].cert}.` : '') : null,
      ins.fill ? h('div', { class: 'grid2' }, field('Fill weight g/m²', h('input', { type: 'number', min: 20, max: 600, value: ins.weight || 120, onchange: (e) => store.dispatch({ type: 'set_insulation', ...tgt(), fill: ins.fill, weight: Number(e.target.value) }) })), field('Quilting', sel(ins.quilting || 'channel', Object.entries(QUILTING).map(([k, v]) => ({ value: k, label: v })), (v) => store.dispatch({ type: 'set_insulation', ...tgt(), fill: ins.fill, quilting: v })))) : null,
    )));
  }
  el.append(h('details', {}, h('summary', {}, 'Waterproof & weatherproof tech (generic, non-trademarked)'), h('div', { class: 'list' }, Object.entries(WATERPROOF).map(([, w]) => h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 't' }, w.name), h('div', { class: 's' }, `${w.layers} · ${w.hydro ? `${w.hydro.toLocaleString()} mm` : '-'} / ${w.mvtr ? `${w.mvtr.toLocaleString()} g/m²/24h` : '-'}${w.air ? ' · air-permeable' : ''} · ${w.use}`), h('div', { class: 's' }, h('span', { class: 'okc' }, '+ '), w.pros, ' ', h('span', { class: 'warn' }, '− '), w.cons))))), h('div', { class: 's', style: 'font-size:12px;color:var(--muted);padding:6px 0' }, 'Pick a membrane fabric under Fabric → Technical. Stitched seams on waterproof shells must be taped or welded (set in Details).')));
  el.append(next('Next: details →', 'details'));
}
function customBlend() {
  const rows = ui.blendRows || (ui.blendRows = [['cotton', 60], ['polyester', 40], ['', 0]]);
  const fibers = Object.keys(FIBERS);
  return h('div', {},
    rows.map((r, i) => h('div', { class: 'grid2' }, sel(r[0], [{ value: '', label: '—' }, ...fibers.map((f) => ({ value: f, label: FIBERS[f].name }))], (v) => { rows[i][0] = v; renderPanel(); }), h('input', { class: 'inp', type: 'number', min: 0, max: 100, value: r[1], onchange: (e) => { rows[i][1] = Number(e.target.value); renderPanel(); } }))),
    h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin:4px 0' }, rows.filter((r) => r[0]).map((r) => `${FIBERS[r[0]].name}: ${FIBERS[r[0]].note}`).join(' · ')),
    h('button', { class: 'btn sm', onclick: () => { const comp = Object.fromEntries(rows.filter((r) => r[0] && r[1] > 0)); const p = store.get(); const id = `blend-custom-${Date.now().toString(36)}`; store.dispatch([{ type: 'create_blend', id, base: tgtPanel(p).fabric, composition: comp }, { type: 'set_fabric', ...tgt(), fabric: id }]); } }, 'Create & apply blend'),
  );
}

// ===== Clothing: Details =====
function cDetails(el, p) {
  const cur = p.panels[0];
  const rec = recommendFor(cur?.fabric || 'cotton-jersey', p);
  const groups = Object.entries(ASSEMBLY_GROUPS).map(([m, label]) => ({ group: label, items: Object.entries(ASSEMBLY).filter(([, v]) => v.method === m).map(([id, v]) => ({ value: id, label: `${v.name}${id === rec.stitch ? ' ★' : ''}` })) }));
  const s0 = p.seams[0] || {};
  el.append(h('div', { class: 'sec' },
    h('h3', {}, 'Stitching & assembly'),
    h('div', { class: 'tip' }, h('b', {}, 'Recommended for this fabric: '), `${ASSEMBLY[rec.stitch]?.name} (${ASSEMBLY[rec.stitch]?.use}) with ${THREADS[rec.thread]?.name}.`, ' ', h('button', { class: 'btn sm', onclick: () => store.dispatch({ type: 'apply_recommendations' }) }, 'Apply recommended')),
    field('Method for all seams', sel(s0.stitch, groups, (v) => store.dispatch({ type: 'set_stitch', seam: 'all', stitch: v }))),
    s0.stitch ? h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin:-4px 0 8px' }, `${ASSEMBLY[s0.stitch].use} · Machine: ${ASSEMBLY[s0.stitch].machine}`) : null,
    h('div', { class: 'grid2' },
      field('Thread material', sel(s0.thread || 'poly-corespun', Object.entries(THREADS).map(([id, t]) => ({ value: id, label: `${t.name}${t.recommended ? ' ★' : ''}` })), (v) => store.dispatch({ type: 'set_stitch', seam: 'all', thread: v }))),
      field('Thread colour', h('input', { type: 'color', value: s0.threadColor || '#d8d2c4', onchange: (e) => store.dispatch({ type: 'set_stitch', seam: 'all', threadColor: e.target.value }) }))),
    s0.thread ? h('div', { class: 's', style: 'font-size:12px;color:var(--muted)' }, THREADS[s0.thread]?.use) : null,
    h('details', { style: 'margin-top:8px' }, h('summary', {}, `Each seam (${p.seams.length})`), h('div', { class: 'list' }, p.seams.map((s) => { const a = p.panels.find((x) => x.id === s.a.panel); const b = p.panels.find((x) => x.id === s.b.panel); return h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 't' }, `${a?.name} ↔ ${b?.name}`), sel(s.stitch, groups, (v) => store.dispatch({ type: 'set_stitch', seam: s.id, stitch: v }), { class: 'inp' })), h('button', { class: 'btn sm', title: 'Remove seam', onclick: () => store.dispatch({ type: 'remove_seam', id: s.id }) }, '✕')); }))),
  ));
  // trims
  // ---- embroidery ----
  ui.emb = ui.emb || { kind: 'text', text: 'GENZ', font: 'block', motif: 'star', width: 8, stitch: 'satin', colors: ['#111111'], threads: 6, outline: false };
  {
    const d = ui.emb;
    const swatches = (cols, onChange) => h('div', {}, h('div', { class: 'chips' },
      cols.map((c, i) => h('span', { style: 'display:inline-flex;align-items:center;gap:2px' }, h('input', { type: 'color', value: c, title: `Thread ${i + 1}`, onchange: (e) => { const n = [...cols]; n[i] = e.target.value; onChange(n); } }), cols.length > 1 ? h('button', { class: 'btn sm ghost', title: 'Remove this thread', onclick: () => onChange(cols.filter((_, k) => k !== i)) }, '×') : null)),
      cols.length < 15 ? h('button', { class: 'btn sm', onclick: () => onChange([...cols, '#d0202e']) }, '+ thread') : null),
      h('details', {}, h('summary', {}, 'Thread chart (45 colours)'), h('div', { class: 'chips' }, THREADS_EMB.map(([n, c]) => h('button', { class: 'chip', title: n, style: `background:${c};width:22px;height:22px;padding:0;border:1px solid var(--line)`, onclick: () => onChange(cols.length < 15 ? [...cols, c] : [...cols.slice(0, 14), c]) })))));
    const files = async (e) => {
      const image = e.kind === 'image' ? await loadArtwork(e.image) : null;
      const bmp = rasterizeDesign({ ...e, image });
      const { cmds, stats } = digitize(bmp, { type: e.stitch, underlay: e.underlay });
      const nm = `${p.name}-embroidery-${(e.text || e.motif || 'artwork').replace(/[^\w-]+/g, '_').slice(0, 20)}`;
      download(`${nm}.dst`, new Blob([writeDST(cmds, (e.text || e.motif || 'ART').toUpperCase())], { type: 'application/octet-stream' }));
      download(`${nm}-run-sheet.txt`, embroiderySheet(e, stats, p.panels.find((x) => x.id === e.panel)?.name), 'text/plain');
      toast(`${stats.stitches.toLocaleString()} stitches, ${stats.colors.length} thread colour(s): .DST + run sheet saved`, 4500);
    };
    el.append(h('div', { class: 'sec' },
      h('h3', {}, 'Embroidery'),
      h('div', { class: 'seg', style: 'margin-bottom:8px' }, [['text', 'Lettering'], ['motif', 'Motif'], ['image', 'Your artwork']].map(([k, l]) => h('button', { class: d.kind === k ? 'on' : '', onclick: () => { d.kind = k; if (k !== 'text' && d.stitch === 'satin') d.stitch = 'fill'; renderPanel(); } }, l))),
      d.kind === 'text' ? h('div', { class: 'grid2' }, field('Text (Enter = new line)', h('textarea', { rows: 2, value: d.text, onchange: (e) => { d.text = e.target.value; } }, d.text)), field('Lettering style', sel(d.font, Object.entries(FONTS).map(([k, v]) => ({ value: k, label: v.name })), (v) => { d.font = v; if (v === 'varsity' && d.colors.length < 2) d.colors = [...d.colors, '#ffffff']; renderPanel(); }))) : null,
      d.kind === 'motif' ? field('Motif', sel(d.motif, Object.entries(MOTIFS_EMB).map(([k, v]) => ({ value: k, label: v })), (v) => { d.motif = v; })) : null,
      d.kind === 'image' ? h('div', {}, field('Artwork (PNG, JPG or SVG; a transparent or white background is left unstitched)', h('input', { type: 'file', accept: 'image/*,.svg', onchange: async (e) => { const f = e.target.files[0]; if (f) { d.image = await readAs(f, 'readAsDataURL'); d.colors = []; await loadArtwork(d.image); renderPanel(); } } })), field('Thread colours to reduce the artwork to', h('input', { type: 'range', min: 1, max: 15, step: 1, value: d.threads, oninput: (e) => (e.target.closest('label').querySelector('b').textContent = e.target.value), onchange: (e) => { d.threads = Number(e.target.value); } }), h('b', {}, d.threads)), d.image ? h('img', { src: d.image, alt: 'Artwork', style: 'max-width:100%;max-height:90px;border-radius:8px;border:1px solid var(--line)' }) : null) : null,
      h('div', { class: 'grid2' },
        field('Stitch type', sel(d.stitch, Object.entries(STITCH_TYPES).map(([k, v]) => ({ value: k, label: v.name })), (v) => { d.stitch = v; renderPanel(); })),
        field('Width (cm)', h('input', { type: 'number', min: 1, max: 40, step: 0.5, value: d.width, onchange: (e) => { d.width = Number(e.target.value) || 8; } }))),
      h('div', { class: 's', style: 'font-size:12px;color:var(--muted)' }, STITCH_TYPES[d.stitch].note),
      d.kind !== 'image' ? field(d.kind === 'text' ? 'Thread colours (1st = letters, 2nd = outline)' : 'Thread colours (1st = fill, 2nd = border)', swatches(d.colors, (n) => { d.colors = n; renderPanel(); })) : null,
      h('button', { class: `btn ${ui.placing === 'embroidery' ? 'primary' : ''}`, style: 'margin-top:8px', disabled: d.kind === 'image' && !d.image, onclick: () => { ui.placing = ui.placing === 'embroidery' ? null : 'embroidery'; renderPanel(); renderPlaceHint(); } }, ui.placing === 'embroidery' ? 'Now click the garment…' : 'Place on the garment'),
      (p.embroidery || []).length ? h('div', { class: 'list', style: 'margin-top:10px' }, p.embroidery.map((e) => h('div', { class: 'row', style: 'flex-wrap:wrap' },
        h('div', { class: 'grow' }, h('div', { class: 't' }, e.kind === 'text' ? `“${e.text}”` : e.kind === 'motif' ? MOTIFS_EMB[e.motif] : 'Artwork'), h('div', { class: 's' }, `${STITCH_TYPES[e.stitch]?.name} · ${e.width} cm · ${p.panels.find((x) => x.id === e.panel)?.name || e.panel}`)),
        h('input', { type: 'number', title: 'Width (cm)', style: 'width:64px', min: 1, max: 40, step: 0.5, value: e.width, onchange: (ev) => store.dispatch({ type: 'update_embroidery', id: e.id, width: Number(ev.target.value) }) }),
        h('input', { type: 'number', title: 'Rotation (degrees)', style: 'width:64px', step: 5, value: e.rotation || 0, onchange: (ev) => store.dispatch({ type: 'update_embroidery', id: e.id, rotation: Number(ev.target.value) }) }),
        h('button', { class: 'btn sm primary', title: 'Tajima .DST machine file + run sheet with the colour sequence', onclick: () => files(e) }, 'Machine file'),
        h('button', { class: 'btn sm', onclick: () => store.dispatch({ type: 'remove_embroidery', id: e.id }) }, 'Remove'),
        e.colors?.length ? h('div', { style: 'flex-basis:100%' }, swatches(e.colors, (n) => store.dispatch({ type: 'update_embroidery', id: e.id, colors: n }))) : null))) : null,
    ));
  }
  // ---- pockets: outside and inside ----
  ui.pocketWhere = ui.pocketWhere || 'outside';
  el.append(h('div', { class: 'sec' },
    h('h3', {}, 'Pockets'),
    h('div', { class: 'seg', style: 'margin-bottom:8px' }, [['outside', 'Outside'], ['inside', 'Inside']].map(([k, l]) => h('button', { class: ui.pocketWhere === k ? 'on' : '', onclick: () => { ui.pocketWhere = k; renderPanel(); } }, l))),
    h('div', { class: 'grid2' }, Object.entries(POCKETS).filter(([, d]) => d.where === ui.pocketWhere).map(([id, d]) => h('button', { class: `tile ${ui.placing === `pocket:${id}` ? 'on' : ''}`, title: `${d.note} Used on: ${d.uses}.`, onclick: () => { ui.placing = ui.placing === `pocket:${id}` ? null : `pocket:${id}`; renderPanel(); renderPlaceHint(); } }, h('div', { class: 't' }, d.name), h('div', { class: 's' }, d.uses)))),
    h('div', { class: 'grid2', style: 'margin-top:8px' },
      field('Closure', sel(ui.pocketClosure || '', [{ value: '', label: 'Default for this pocket' }, ...Object.entries(POCKET_CLOSURES).map(([k, l]) => ({ value: k, label: l }))], (v) => { ui.pocketClosure = v || null; })),
      field('Angle (degrees)', h('input', { type: 'number', min: -90, max: 90, step: 5, value: ui.pocketAngle || 0, onchange: (e) => { ui.pocketAngle = Number(e.target.value) || 0; } }))),
    h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin-top:6px' }, ui.placing?.startsWith('pocket:') ? `${POCKETS[ui.placing.slice(7)].note} Now click the garment where the top of the pocket opening should be.` : 'Pick a pocket, then click the garment (jacket, shirt, trousers, sleeve…) to place it. Inside pockets show as faint stitching and are added to the tech pack.'),
    (p.pockets || []).length ? h('div', { class: 'list', style: 'margin-top:8px' }, p.pockets.map((k) => h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 't' }, POCKETS[k.type]?.name || k.type), h('div', { class: 's' }, `${k.inside ? 'Inside' : 'Outside'} · ${p.panels.find((x) => x.id === k.panel)?.name || k.panel} · ${k.width} × ${k.height} cm`)), h('button', { class: 'btn sm', onclick: () => store.dispatch({ type: 'remove_pocket', id: k.id }) }, 'Remove')))) : null,
  ));
  el.append(h('div', { class: 'sec' },
    h('h3', {}, 'Buttons, trims & decorations'),
    h('div', { class: 'chips scrollx', style: 'margin-bottom:8px' }, TRIM_GROUPS.map((g) => h('button', { class: `chip ${ui.trimGroup === g ? 'on' : ''}`, onclick: () => { ui.trimGroup = g; renderPanel(); } }, g))),
    h('div', { class: 'grid2' }, Object.entries(TRIMS).filter(([, t]) => t.group === ui.trimGroup).map(([id, t]) => h('button', { class: `tile ${ui.placing === id ? 'on' : ''}`, onclick: () => { ui.placing = ui.placing === id ? null : id; renderPanel(); renderPlaceHint(); } }, h('div', { class: 't' }, h('span', { class: 'sw', style: `background:${t.color};margin-right:6px` }), t.name, t.recommended ? h('span', { class: 'rec' }, ' ★') : ''), h('div', { class: 's' }, t.use)))),
    h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin-top:6px' }, 'Pick one, then click on the 3D garment to place it.'),
  ));
  if (p.trims.length) {
    const types = [...new Set(p.trims.map((t) => t.type))];
    el.append(h('details', {}, h('summary', {}, `Placed (${p.trims.length})`), h('div', {},
      types.map((ty) => h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 't' }, `${TRIMS[ty]?.name} × ${p.trims.filter((t) => t.type === ty).length}`)), sel(ty, Object.entries(TRIMS).filter(([, t]) => t.group === TRIMS[ty]?.group).map(([id, t]) => ({ value: id, label: t.name })), (v) => store.dispatch({ type: 'set_trim', id: 'all', match: ty, trim: v }), { class: 'inp', style: 'width:150px', 'aria-label': 'Swap' }), h('input', { type: 'color', value: p.trims.find((t) => t.type === ty).color || TRIMS[ty]?.color || '#888888', onchange: (e) => store.dispatch({ type: 'set_trim', id: 'all', match: ty, color: e.target.value }), style: 'width:36px;height:32px;border:0;background:none' }))),
      h('div', { class: 'list', style: 'margin-top:8px' }, p.trims.slice(-12).map((t) => h('div', { class: 'row' }, h('div', { class: 'grow s' }, `${TRIMS[t.type]?.name} on ${p.panels.find((x) => x.id === t.panel)?.name}`), h('button', { class: 'btn sm', onclick: () => store.dispatch({ type: 'remove_trim', id: t.id }) }, '✕')))),
    )));
  }
  // zippers
  const zips = p.trims.filter((t) => t.type.startsWith('zipper'));
  el.append(h('details', { open: zips.length > 0 }, h('summary', {}, `Zippers (${zips.length})`), h('div', {},
    zips.length ? null : h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin-bottom:6px' }, 'No zipper yet: choose a zip closure in Style, or add one below.'),
    zips.map((t, i) => { const z = zipperSpec(t.zip); const set = (patch) => store.dispatch({ type: 'set_zipper', id: t.id, ...patch }); return h('div', { class: 'sec' }, h('div', { class: 't', style: 'font-weight:600;font-size:13px' }, `Zipper ${i + 1} on ${p.panels.find((x) => x.id === t.panel)?.name}`), h('div', { class: 'grid2' },
      field('Type', sel(z.type, Object.entries(ZIPPER_TYPES).map(([k, v]) => ({ value: k, label: `${v.name}${v.recommended ? ' ★' : ''}` })), (v) => set({ zipType: v }))),
      field('Size', sel(z.size, Object.keys(ZIPPER_SIZES).map((k) => ({ value: k, label: k })), (v) => set({ size: v }))),
      field('Ends', sel(z.end, Object.entries(ZIPPER_ENDS).map(([k, v]) => ({ value: k, label: v })), (v) => set({ end: v }))),
      field('Slider', sel(z.slider, Object.entries(ZIPPER_SLIDERS).map(([k, v]) => ({ value: k, label: v })), (v) => set({ slider: v }))),
      field('Puller', sel(z.puller, Object.entries(ZIPPER_PULLERS).map(([k, v]) => ({ value: k, label: v })), (v) => set({ puller: v }))),
      field('Tape colour', h('input', { type: 'color', value: z.tape, onchange: (e) => set({ tape: e.target.value }) }))),
      h('div', { class: 's', style: 'font-size:12px;color:var(--muted)' }, ZIPPER_TYPES[z.type]?.use), h('button', { class: 'btn sm', onclick: () => store.dispatch({ type: 'remove_trim', id: t.id }) }, 'Remove')); }),
    h('button', { class: 'btn sm', onclick: () => { const pan = p.panels.find((x) => x.role === 'body' || x.role === 'bag' || x.role === 'leg') || p.panels[0]; const ys = pan.points.map((q) => q[1]); store.dispatch({ type: 'add_zipper', panel: pan.id, at: [0, Math.min(...ys) + 3], to: [0, Math.max(...ys) - 6] }); } }, '+ Add centre zipper'),
  )));
  // decorative edges
  const edgeKeys = [...new Set(p.panels.flatMap((x) => Object.keys(x.edges || {}).filter((k) => x.edges[k]?.length)))];
  if (edgeKeys.length) el.append(h('details', {}, h('summary', {}, 'Decorative edges (scallops, ruffles, piping, fringe…)'), h('div', {},
    edgeKeys.map((w) => { const curE = p.panels.find((x) => x.edgeFinish?.[w])?.edgeFinish[w] || 'hemmed'; return h('div', { class: 'grid2' }, field(`${pretty(w)} edge`, sel(curE, Object.entries(EDGE_TREATMENTS).map(([k, v]) => ({ value: k, label: v.name })), (v) => store.dispatch({ type: 'set_edge', where: w, treatment: v, color: ui.edgeColor }), { 'aria-label': `${w} edge` })), field('Trim colour', h('input', { type: 'color', value: ui.edgeColor || '#ffffff', onchange: (e) => { ui.edgeColor = e.target.value; if (curE !== 'hemmed') store.dispatch({ type: 'set_edge', where: w, treatment: curE, color: e.target.value }); } }))); }),
  )));
  // lacing
  el.append(h('details', {}, h('summary', {}, 'Lacing (lace-up fronts, backs, corsets)'), h('div', {},
    h('div', { class: 'grid2' }, field('Style', sel(ui.laceStyle || 'crisscross', Object.entries(LACING_STYLES).map(([k, v]) => ({ value: k, label: v })), (v) => { ui.laceStyle = v; })), field('Cord colour', h('input', { type: 'color', value: ui.laceColor || '#111111', onchange: (e) => { ui.laceColor = e.target.value; } }))),
    h('div', { class: 'chips' }, p.panels.filter((x) => ['body', 'brief', 'bra', 'leg'].includes(x.role)).slice(0, 4).map((pan) => h('button', { class: 'btn sm', onclick: () => { const ys = pan.points.map((q) => q[1]); const y0 = Math.min(...ys); const y1 = Math.max(...ys); store.dispatch({ type: 'add_lacing', panel: pan.id, at: [0, y0 + (y1 - y0) * 0.2], to: [0, y1 - (y1 - y0) * 0.15], style: ui.laceStyle || 'crisscross', color: ui.laceColor }); } }, `+ Lacing on ${pan.name}`))),
  )));
  el.append(next('Next: make it →', 'make'));
}

// ===== Clothing: Make it =====
function makeCommon(el, p) {
  const warns = p.mode === 'jewelry' ? [] : checkProject(p);
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Checks'), warns.length ? warns.map((w) => h('div', { class: 'check' }, h('span', { class: w.level === 'error' ? 'err' : w.level === 'warn' ? 'warn' : '' }, w.level === 'error' ? '✕' : w.level === 'warn' ? '!' : 'i'), h('div', {}, w.msg, w.fix ? h('div', { class: 's', style: 'color:var(--muted)' }, w.fix) : null))) : h('div', { class: 'check' }, h('span', { class: 'okc' }, '✓'), 'No issues found.')));
  const pr = p.production;
  const chart = SIZE_CHARTS[p.sizeChart || 'unisex'];
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Production'),
    h('div', { class: 'grid2' }, field('Quantity', h('input', { type: 'number', min: 1, value: pr.quantity, onchange: (e) => store.dispatch({ type: 'set_production', quantity: Number(e.target.value) }) })), field('Target cost per unit ($)', h('input', { type: 'number', min: 0, value: pr.targetCost ?? '', onchange: (e) => store.dispatch({ type: 'set_production', targetCost: e.target.value ? Number(e.target.value) : null }) }))),
    p.mode !== 'jewelry' ? field('Sizes to produce', h('div', { class: 'chips' }, Object.keys(chart.sizes).map((s) => h('button', { class: `chip ${pr.sizes.includes(s) ? 'on' : ''}`, onclick: () => store.dispatch({ type: 'set_production', sizes: pr.sizes.includes(s) ? pr.sizes.filter((x) => x !== s) : Object.keys(chart.sizes).filter((x) => pr.sizes.includes(x) || x === s) }) }, s)))) : null));
}
function cMake(el, p) {
  makeCommon(el, p);
  const name = p.name.replace(/[^\w-]+/g, '_');
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Files for manufacturers'),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn primary', onclick: () => openDoc(techPackHTML(p, { image: viewer.snapshot(1000) }), `${name}-techpack.html`) }, 'Tech pack (PDF)'),
      h('button', { class: 'btn', onclick: () => download(`${name}.dxf`, patternDXF(p), 'application/dxf') }, 'Pattern DXF (CAD)'),
      h('button', { class: 'btn', onclick: () => download(`${name}.svg`, patternSVG(p), 'image/svg+xml') }, 'Pattern SVG'),
      h('button', { class: 'btn', onclick: () => openDoc(tiledPrintHTML(p, 'A4'), `${name}-A4.html`) }, 'Print at home (A4)'),
      h('button', { class: 'btn', onclick: () => openDoc(tiledPrintHTML(p, 'Letter'), `${name}-letter.html`) }, 'Print at home (Letter)'),
      h('button', { class: 'btn', onclick: () => download(`${name}-BOM.csv`, bomCSV(p), 'text/csv') }, 'Bill of materials (CSV)'),
      h('button', { class: 'btn', onclick: async () => download(`${name}.glb`, await viewer.exportModel('glb')) }, '3D model (GLB)'),
      h('button', { class: 'btn', onclick: () => download(`${name}.gft.json`, JSON.stringify(p, null, 1), 'application/json') }, 'Project file'),
      ...(p.garments || []).filter((g) => g.knit?.motif && g.knit.motif !== 'none').map((g) => h('button', { class: 'btn', onclick: () => download(`${name}-knitting-chart.svg`, knitChartSVG(g.knit), 'image/svg+xml') }, 'Knitting chart (SVG)')),
      h('button', { class: 'btn', onclick: () => openInBlender() }, 'Open in Blender'),
    ),
    h('h3', { style: 'margin-top:14px' }, 'Machine code & work protocols'),
    h('div', { class: 'tip' }, 'What the factory floor runs: the sewing operations in order, knitting programs, embroidery machine files, and print and dye instructions. The ', h('b', {}, 'manufacturing pack'), ' puts everything for this design in one ZIP.'),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn primary', onclick: () => manufacturingPack() }, 'Manufacturing pack (ZIP)'),
      h('button', { class: 'btn', onclick: () => download(`${name}-sewing-operations.csv`, operationsCSV(p), 'text/csv') }, 'Sewing operations (CSV)'),
      (p.garments || []).some((g) => g.knit) ? h('button', { class: 'btn', onclick: () => { for (const f of knitFiles(p)) download(`${name}-${f.file.replace('knit/', '')}`, f.text, 'text/plain'); } }, 'Knitting programs (Knitout) + instructions') : null,
      printProtocol(p) ? h('button', { class: 'btn', onclick: () => download(`${name}-print-dye-protocol.txt`, printProtocol(p, printTileCm), 'text/plain') }, 'Print & dye protocol') : null,
      (p.embroidery || []).length ? h('div', { class: 's', style: 'font-size:12px;color:var(--muted);align-self:center' }, 'Embroidery machine files: Details → Embroidery → Machine file, or in the pack.') : null,
    )));
  guideSection(el, p);
}
function guideSection(el, p) {
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'How to get it made'), GUIDE.map((g, i) => h('details', { open: i === 0 }, h('summary', {}, g.title), h('div', {}, g.body)))));
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Ready-to-send RFQ emails'), rfqTemplates(p).map((r) => h('details', {}, h('summary', {}, r.to), h('div', {}, h('div', { class: 's', style: 'font-weight:600' }, `Subject: ${r.subject}`), h('pre', {}, r.body), h('div', { class: 'chips' }, h('button', { class: 'btn sm', onclick: () => navigator.clipboard?.writeText(`Subject: ${r.subject}\n\n${r.body}`).then(() => toast('Copied')) }, 'Copy'), h('a', { class: 'btn sm', href: `mailto:?subject=${encodeURIComponent(r.subject)}&body=${encodeURIComponent(r.body)}` }, 'Open in email')))))));
  el.append(h('div', { class: 'tip' }, h('b', {}, 'Turning this into a brand? '), 'Learn how to build, launch and market products at ', h('a', { href: LINKS_OUT.tpd, target: '_blank', rel: 'noopener' }, 'thepotentialdropout.com'), '. Using this software commercially (selling, in a business, or modified versions)? ', h('a', { href: LINKS_OUT.licence, target: '_blank', rel: 'noopener' }, 'Get a licence from Genzineers'), '.'));
}

// ===== Jewelry =====
function jStyle(el, p) {
  const j = p.jewelry;
  const t = JEWELRY_TEMPLATES[j.template];
  if (t?.why) el.append(h('div', { class: 'tip' }, h('b', {}, 'Industry default: '), t.why));
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Start from a piece'),
    h('div', { class: 'chips scrollx', style: 'margin-bottom:8px' }, ['All', ...JEWELRY_GROUPS].map((g) => h('button', { class: `chip ${ui.jGroup === g ? 'on' : ''}`, onclick: () => { ui.jGroup = g; renderPanel(); } }, g))),
    h('div', { class: 'grid2' }, Object.entries(JEWELRY_TEMPLATES).filter(([, v]) => ui.jGroup === 'All' || v.group === ui.jGroup).map(([id, v]) => h('button', { class: `tile ${j.template === id ? 'on' : ''}`, onclick: () => store.dispatch({ type: 'new_jewelry', template: id }) }, h('div', { class: 't' }, v.name), h('div', { class: 's' }, v.group))))));
  const set = (patch) => store.dispatch({ type: 'set_jewelry', patch });
  const num = (label, key, min, max, step, obj) => field(label, h('input', { type: 'range', min, max, step, value: obj ? j[obj]?.[key] : j[key], onchange: (e) => set(obj ? { [obj]: { [key]: Number(e.target.value) } } : { [key]: Number(e.target.value) }), oninput: (e) => (e.target.closest('label').querySelector('b').textContent = e.target.value) }), h('b', {}, obj ? j[obj]?.[key] : j[key]));
  const opts = [];
  if (j.piece === 'ring') {
    const rs = ringSize(j.size || 7);
    opts.push(num('Ring size (US)', 'size', 3, 15, 0.25), h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin:-6px 0 8px' }, `UK ${rs.uk} · EU ${rs.eu} · inner Ø ${rs.diameterMm} mm`),
      field('Band profile', sel(j.profile, Object.entries(RING_PROFILES).map(([k, v]) => ({ value: k, label: v })), (v) => set({ profile: v }))), num('Band width (mm)', 'bandWidth', 1.2, 12, 0.1), num('Band thickness (mm)', 'bandThickness', 1.0, 3.5, 0.1));
  }
  if (['chain', 'necklace', 'bracelet'].includes(j.piece)) {
    opts.push(field('Link type', sel(j.link, Object.entries(LINKS).map(([k, v]) => ({ value: k, label: v.name })), (v) => set({ link: v }))), h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin:-6px 0 8px' }, LINKS[j.link]?.note), num('Wire gauge (mm)', 'gauge', 0.4, 6, 0.1), num('Length (cm)', 'length', 14, 100, 0.5), field('Clasp / lock', sel(j.clasp, Object.entries(CLASPS).map(([k, v]) => ({ value: k, label: `${v.name}${v.recommended ? ' ★' : ''}` })), (v) => set({ clasp: v }))));
    if (j.pendant) opts.push(field('Pendant shape', sel(j.pendant.shape, ['none', 'circle', 'heart', 'bar', 'star', 'custom'].map((s) => ({ value: s, label: pretty(s) })), (v) => set({ pendant: { shape: v } }))), num('Pendant width (mm)', 'w', 4, 60, 0.5, 'pendant'), num('Pendant height (mm)', 'h', 4, 80, 0.5, 'pendant'), field('Bail', sel(j.pendant.bail, Object.entries(BAILS).map(([k, v]) => ({ value: k, label: v })), (v) => set({ pendant: { bail: v } }))));
  }
  if (j.piece === 'bangle' || j.piece === 'cuff') opts.push(num('Inner diameter (mm)', 'diameter', 45, 80, 0.5), num('Width (mm)', 'width', 2, 40, 0.5), num('Thickness (mm)', 'thickness', 1, 5, 0.1), field('Profile', sel(j.profile, Object.entries(RING_PROFILES).map(([k, v]) => ({ value: k, label: v })), (v) => set({ profile: v }))));
  if (j.piece === 'earring') opts.push(field('Style', sel(j.style, ['stud', 'hoop', 'drop'].map((s) => ({ value: s, label: pretty(s) })), (v) => set({ style: v }))), field('Back / closure', sel(j.back, Object.entries(EARRING_BACKS).map(([k, v]) => ({ value: k, label: v })), (v) => set({ back: v }))), j.style === 'hoop' ? num('Hoop diameter (mm)', 'diameter', 8, 80, 0.5) : null);
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Customise'), opts));
  el.append(h('details', {}, h('summary', {}, 'Custom shape (pendant, stone, link, signet)'), h('div', {}, shapeDrawer())));
  el.append(next('Next: metal →', 'materials'));
}
function shapeDrawer() {
  const pts = ui.shapePts || (ui.shapePts = []);
  const cv = h('canvas', { width: 300, height: 220, style: 'width:100%;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);touch-action:none' });
  const draw = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, 300, 220); g.strokeStyle = '#ff5a1f'; g.lineWidth = 2; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); if (pts.length > 2) g.closePath(); g.stroke(); for (const [x, y] of pts) { g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); } g.fillStyle = '#888'; g.font = '11px sans-serif'; g.fillText('Tap to add points (1 square = 1 mm)', 6, 214); };
  cv.addEventListener('pointerdown', (e) => { const r = cv.getBoundingClientRect(); pts.push([((e.clientX - r.left) / r.width) * 300, ((e.clientY - r.top) / r.height) * 220]); draw(); });
  setTimeout(draw);
  const use = (target) => { if (pts.length < 3) return toast('Add at least 3 points'); store.dispatch({ type: 'set_custom_shape', target, points: pts.map(([x, y]) => [(x - 150) / 5, (y - 110) / 5]) }); };
  return h('div', {}, cv, h('div', { class: 'chips', style: 'margin-top:6px' }, ['pendant', 'stone', 'link', 'signet'].map((t) => h('button', { class: 'btn sm', onclick: () => use(t) }, `Use as ${t}`)), h('button', { class: 'btn sm', onclick: () => { pts.length = 0; draw(); } }, 'Clear')), h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin-top:4px' }, 'Or import an SVG / DXF outline from the menu.'));
}
function jMaterials(el, p) {
  const j = p.jewelry;
  const m = j.alloy || METALS[j.metal];
  el.append(h('div', { class: 'tip' }, h('b', {}, m.name), ` · ${m.density} g/cm³ · hallmark ${m.hallmark}. `, m.note || ''));
  const fams = [...new Set(Object.values(METALS).map((x) => x.family))];
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Metal'), h('div', { class: 'list' }, fams.map((f) => h('div', { class: 'row' }, h('div', { class: 'grow' }, h('div', { class: 't' }, pretty(f))), sel(j.alloy ? '' : Object.keys(METALS).find((k) => k === j.metal && METALS[k].family === f) || '', [{ value: '', label: 'Choose…' }, ...Object.entries(METALS).filter(([, x]) => x.family === f).map(([k, x]) => ({ value: k, label: `${x.name}${x.recommended ? ' ★' : ''}` }))], (v) => v && store.dispatch({ type: 'set_jewelry', patch: { metal: v } }), { class: 'inp', style: 'width:200px' }))))));
  const k = j.alloy?.karat || 18; const col = j.alloy?.colour || 'yellow';
  const preview = goldAlloy(k, col);
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Karat control (custom gold alloy)'),
    field('Karat', h('input', { type: 'range', min: 8, max: 24, step: 1, value: k, onchange: (e) => store.dispatch({ type: 'set_karat', karat: Number(e.target.value), colour: col }), oninput: (e) => (e.target.closest('label').querySelector('b').textContent = `${e.target.value}k · ${goldAlloy(Number(e.target.value), col).purity}%`) }), h('b', {}, `${k}k · ${preview.purity}%`)),
    h('div', { class: 'seg' }, ['yellow', 'white', 'rose', 'green'].map((c) => h('button', { class: col === c && j.alloy ? 'on' : '', onclick: () => store.dispatch({ type: 'set_karat', karat: k, colour: c }) }, pretty(c)))),
    h('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin-top:6px' }, `Density ≈ ${preview.density} g/cm³ · stamp ${preview.hallmark} · `, h('span', { class: 'sw', style: `background:${preview.color}` }))));
  el.append(h('div', { class: 'sec grid2' }, field('Plating', sel(j.plating || 'none', Object.entries(PLATINGS).map(([k2, v]) => ({ value: k2, label: v })), (v) => store.dispatch({ type: 'set_jewelry', patch: { plating: v } }))), field('Surface finish', sel(j.finish || 'polish', ['polish', 'brushed', 'matte'].map((f) => ({ value: f, label: pretty(f) })), (v) => store.dispatch({ type: 'set_jewelry', patch: { finish: v } })))));
  el.append(next('Next: stones & parts →', 'details'));
}
function jDetails(el, p) {
  const j = p.jewelry;
  const stones = j.stones || [];
  const gemOpts = Object.entries(GEMS).map(([k, g]) => ({ value: k, label: `${g.name} (Mohs ${g.mohs})` }));
  const cutOpts = Object.entries(CUTS).map(([k, c]) => ({ value: k, label: c.name }));
  const setOpts = Object.entries(SETTINGS).map(([k, s]) => ({ value: k, label: `${s.name}${s.recommended ? ' ★' : ''}` }));
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Stones'),
    stones.map((s, i) => h('details', { open: i === 0 }, h('summary', {}, `${GEMS[s.gem]?.name} · ${CUTS[s.cut]?.name} · ~${caratEstimate(s.cut, s.size, s.width || s.size, s.gem)} ct`), h('div', {},
      h('div', { class: 'grid2' }, field('Gem', sel(s.gem, gemOpts, (v) => store.dispatch({ type: 'update_stone', index: i, gem: v }))), field('Cut / shape', sel(s.cut, cutOpts, (v) => store.dispatch({ type: 'update_stone', index: i, cut: v }))), field('Length (mm)', h('input', { type: 'number', step: 0.1, value: s.size, onchange: (e) => store.dispatch({ type: 'update_stone', index: i, size: Number(e.target.value) }) })), field('Width (mm)', h('input', { type: 'number', step: 0.1, value: s.width || s.size, onchange: (e) => store.dispatch({ type: 'update_stone', index: i, width: Number(e.target.value) }) }))),
      field('Setting', sel(s.setting, setOpts, (v) => store.dispatch({ type: 'update_stone', index: i, setting: v }))),
      h('div', { class: 's', style: 'font-size:12px;color:var(--muted)' }, GEMS[s.gem]?.note, ' · ', CUTS[s.cut]?.note, ' · ', SETTINGS[s.setting]?.note),
      h('button', { class: 'btn sm', style: 'margin-top:6px', onclick: () => store.dispatch({ type: 'remove_stone', index: i }) }, 'Remove stone')))),
    h('button', { class: 'btn', onclick: () => store.dispatch({ type: 'add_stone', gem: 'diamond', cut: 'round-brilliant', size: 2, setting: 'prong-4', position: 'side' }) }, '+ Add stone')));
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Imported CAD parts'),
    h('button', { class: 'btn', onclick: () => fileInput.click() }, 'Import part (STL, OBJ, GLB, 3MF, PLY, FBX, DAE, STEP, IGES, .blend)'),
    (j.parts || []).map((pt, i) => {
      const upd = (patch) => store.dispatch({ type: 'update_part', index: i, ...patch });
      const vec = (label, key, idx, min, max, step) => field(`${label}`, h('input', { type: 'range', min, max, step, value: pt[key]?.[idx] ?? 0, onchange: (e) => { const v = [...(pt[key] || [0, 0, 0])]; v[idx] = Number(e.target.value); upd({ [key]: v }); } }));
      return h('details', { open: true }, h('summary', {}, pt.name), h('div', {},
        field('Material', sel(pt.material, [{ group: 'Metals', items: Object.entries(METALS).map(([k, v]) => ({ value: k, label: v.name })) }, { group: 'Gems', items: gemOpts }], (v) => upd({ material: v }))),
        field('Size (longest side, mm)', h('input', { type: 'range', min: 1, max: 80, step: 0.5, value: pt.size, onchange: (e) => upd({ size: Number(e.target.value) }) })),
        h('div', { class: 'grid2' }, vec('Stretch X', 'scale', 0, 0.2, 3, 0.05), vec('Stretch Y', 'scale', 1, 0.2, 3, 0.05), vec('Stretch Z', 'scale', 2, 0.2, 3, 0.05), vec('Move X (mm)', 'position', 0, -40, 40, 0.5), vec('Move Y (mm)', 'position', 1, -40, 40, 0.5), vec('Move Z (mm)', 'position', 2, -40, 40, 0.5), vec('Rotate X°', 'rotation', 0, -180, 180, 1), vec('Rotate Y°', 'rotation', 1, -180, 180, 1)),
        h('div', { class: 'grid2' }, ['taper', 'twist', 'bend'].map((k2) => field(`Distort: ${k2}`, h('input', { type: 'range', min: k2 === 'taper' ? -1.5 : -180, max: k2 === 'taper' ? 1.5 : 180, step: k2 === 'taper' ? 0.05 : 1, value: pt.distort?.[k2] || 0, onchange: (e) => upd({ distort: { [k2]: Number(e.target.value) } }) })))),
        h('button', { class: 'btn sm', onclick: () => store.dispatch({ type: 'remove_part', index: i }) }, 'Remove part')));
    })));
  el.append(next('Next: make it →', 'make'));
}
function jMake(el, p) {
  makeCommon(el, p);
  const j = p.jewelry; const w = estimateMetal(j);
  const name = p.name.replace(/[^\w-]+/g, '_');
  el.append(h('div', { class: 'tip' }, h('b', {}, `≈ ${w.grams} g of ${w.metal}`), ` (${w.volumeMm3} mm³). Stones: ${(j.stones || []).map((s) => `~${caratEstimate(s.cut, s.size, s.width || s.size, s.gem)} ct ${GEMS[s.gem]?.name}`).join(', ') || 'none'}.`));
  el.append(h('div', { class: 'sec' }, h('h3', {}, 'Files for casting & setting'), h('div', { class: 'grid2' },
    h('button', { class: 'btn primary', onclick: () => openDoc(techPackHTML(p, { image: viewer.snapshot(900) }), `${name}-spec.html`) }, 'Spec sheet (PDF)'),
    h('button', { class: 'btn', onclick: async () => download(`${name}.stl`, await viewer.exportModel('stl')) }, 'STL (3D print / cast)'),
    h('button', { class: 'btn', onclick: async () => download(`${name}.obj`, await viewer.exportModel('obj')) }, 'OBJ'),
    h('button', { class: 'btn', onclick: async () => download(`${name}.glb`, await viewer.exportModel('glb')) }, 'GLB'),
    h('button', { class: 'btn', onclick: () => openInBlender() }, 'Open in Blender'))));
  guideSection(el, p);
}

// ---------- AI drawer ----------
function toggleAI(open) { ui.ai = open; drawer.classList.toggle('open', open); if (open) renderDrawer(); }
function aiCfg() { const prov = settings.get('ai.provider', 'anthropic'); return { provider: prov, model: settings.get(`ai.${prov}.model`, PROVIDERS[prov].models[0]), key: settings.get(`ai.${prov}.key`, ''), base: settings.get(`ai.${prov}.base`, '') }; }
function renderDrawer() {
  const tabs = h('div', { class: 'seg' }, [['chat', 'Chat'], ['images', 'Images'], ['connect', 'Connect']].map(([k, l]) => h('button', { class: ui.aiTab === k ? 'on' : '', onclick: () => { ui.aiTab = k; renderDrawer(); } }, l)));
  const head = h('header', {}, tabs, h('div', { class: 'spacer' }), h('button', { class: 'btn ghost icon', 'aria-label': 'Close', onclick: () => toggleAI(false) }, '✕'));
  const body = h('div', { style: 'flex:1;display:flex;flex-direction:column;min-height:0' });
  ({ chat: aiChat, images: aiImages, connect: aiConnect })[ui.aiTab](body);
  drawer.replaceChildren(head, body);
}
function aiChat(body) {
  const cfg = aiCfg();
  const scope = settings.get('ai.scope', { shape: true, construction: true, materials: true, color: true, prints: false, trims: true, jewelry: true, production: false });
  const msgs = h('div', { class: 'msgs', 'aria-live': 'polite' });
  if (!ui.history.length) msgs.append(h('div', { class: 'msg sys' }, 'Describe what you want: "a cropped boxy hoodie in heavyweight french terry, garment-dyed sage, with a puff-print chest logo", or "14k rose gold cuban bracelet, 3 mm". Tick what the AI is allowed to design below. The app works fully without AI too.'));
  for (const m of ui.history) msgs.append(h('div', { class: `msg ${m.role === 'user' ? 'user' : m.role === 'sys' ? 'sys' : 'ai'}` }, m.content));
  const ta = h('textarea', { class: 'inp', placeholder: 'Ask or describe a design…', 'aria-label': 'Message' });
  const send = async () => {
    const text = ta.value.trim(); if (!text) return;
    const c = aiCfg();
    if (PROVIDERS[c.provider].needsKey && !c.key) { ui.aiTab = 'connect'; renderDrawer(); return toast(`Add your ${PROVIDERS[c.provider].name} key first`); }
    ui.history.push({ role: 'user', content: text }); renderDrawer();
    try {
      const sys = systemPrompt(store.get(), scope);
      const reply = await chat(c, sys, ui.history.filter((m) => m.role !== 'sys').slice(-12).map((m) => ({ role: m.role, content: m.content })));
      const { kept, dropped } = filterActions(parseActions(reply), scope);
      ui.history.push({ role: 'assistant', content: reply.replace(/```(?:json)?[\s\S]*?```/g, '').trim() || 'Done.' });
      if (kept.length) { const res = store.dispatch(kept, { source: 'ai' }); ui.history.push({ role: 'sys', content: `Applied ${res.filter((r) => r.ok).length}/${res.length} change(s)${res.some((r) => !r.ok) ? `; skipped: ${res.filter((r) => !r.ok).map((r) => r.error).join('; ')}` : ''}. Undo with ↶.` }); }
      if (dropped.length) ui.history.push({ role: 'sys', content: `Not applied (outside what you allowed): ${[...new Set(dropped)].join(', ')}` });
    } catch (e) { ui.history.push({ role: 'sys', content: `Error: ${e.message}${/Failed to fetch|NetworkError/i.test(e.message) && PROVIDERS[c.provider].local ? ' (local servers must allow this origin, e.g. OLLAMA_ORIGINS=*)' : ''}` }); }
    renderDrawer();
  };
  ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
  const provSel = sel(cfg.provider, Object.entries(PROVIDERS).map(([k, v]) => ({ value: k, label: v.name })), (v) => { settings.set('ai.provider', v); renderDrawer(); }, { class: 'inp' });
  const modelIn = h('input', { class: 'inp', list: 'models', value: cfg.model, onchange: (e) => settings.set(`ai.${cfg.provider}.model`, e.target.value), 'aria-label': 'Model' });
  body.append(
    h('div', { style: 'padding:10px 12px 0;display:grid;grid-template-columns:1fr 1fr;gap:6px' }, provSel, modelIn, h('datalist', { id: 'models' }, PROVIDERS[cfg.provider].models.map((m) => h('option', { value: m })))),
    msgs,
    h('div', { class: 'composer' },
      h('div', { class: 's', style: 'font-size:12px;color:var(--muted)' }, 'The AI may design:'),
      h('div', { class: 'scope' }, Object.entries(SCOPES).map(([k, s]) => h('label', {}, h('input', { type: 'checkbox', checked: scope[k], onchange: (e) => { scope[k] = e.target.checked; settings.set('ai.scope', scope); } }), s.label))),
      ta,
      h('div', { style: 'display:flex;gap:6px;justify-content:space-between' }, h('button', { class: 'btn sm', onclick: () => { ui.history = []; renderDrawer(); } }, 'Clear'), h('button', { class: 'btn primary', onclick: send }, 'Send')),
    ),
  );
  setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; });
}
function aiImages(body) {
  const prov = settings.get('img.provider', 'nano-banana');
  const P = IMAGE_PROVIDERS[prov];
  const out = h('div', { style: 'display:grid;gap:8px' });
  const ta = h('textarea', { class: 'inp', placeholder: 'e.g. "Editorial studio photo of this garment on a model, soft daylight" or "Moodboard: 90s skate denim, faded indigo"', value: ui.imgPrompt || '' });
  const useRef = h('input', { type: 'checkbox', checked: ui.useRef ?? true });
  const go = async () => {
    const key = P.keyFrom ? settings.get(`ai.${P.keyFrom}.key`, '') : settings.get(`img.${prov}.key`, '');
    if (P.keyFrom && !key) { ui.aiTab = 'connect'; renderDrawer(); return toast(`Add your ${PROVIDERS[P.keyFrom].name} key in Connect`); }
    ui.imgPrompt = ta.value;
    out.replaceChildren(h('div', { class: 'msg sys' }, 'Generating…'));
    try {
      const ref = useRef.checked ? viewer.snapshot(1024) : null;
      const img = await generateImage({ provider: prov, key, endpoint: settings.get(`img.${prov}.endpoint`, '') }, ta.value || 'Photorealistic product photo of this design, studio lighting, high detail', ref);
      ui.lastImage = img;
      renderDrawer();
    } catch (e) { out.replaceChildren(h('div', { class: 'msg sys' }, `Error: ${e.message}`)); }
  };
  if (ui.lastImage) out.append(h('img', { src: ui.lastImage, alt: 'Generated image', style: 'width:100%;border-radius:10px' }), h('div', { class: 'chips' }, h('button', { class: 'btn sm', onclick: () => download('render.png', dataUrlToBlob(ui.lastImage)) }, 'Download'), store.get().mode !== 'jewelry' ? h('button', { class: 'btn sm', onclick: () => { store.dispatch({ type: 'set_finish', ...tgt(), print: { method: 'digital-textile', design: 'image', image: ui.lastImage } }); toast('Applied as a print'); } }, 'Use as fabric print') : null));
  body.append(h('div', { class: 'msgs' },
    field('Image tool', sel(prov, Object.entries(IMAGE_PROVIDERS).map(([k, v]) => ({ value: k, label: v.name })), (v) => { settings.set('img.provider', v); renderDrawer(); }, { class: 'inp' })),
    h('div', { class: 'tip' }, P.note),
    ta,
    h('label', { class: 'scope' }, h('label', {}, useRef, 'Use the current 3D view as reference')),
    h('button', { class: 'btn primary', onclick: go }, 'Generate'),
    out));
}
function aiConnect(body) {
  const box = h('div', { class: 'msgs' });
  const prov = settings.get('ai.provider', 'anthropic');
  const P = PROVIDERS[prov];
  box.append(
    h('h3', {}, '1 · Chat model (any provider)'),
    field('Provider', sel(prov, Object.entries(PROVIDERS).map(([k, v]) => ({ value: k, label: v.name })), (v) => { settings.set('ai.provider', v); renderDrawer(); }, { class: 'inp' })),
    P.needsKey ? field('API key (stored only on this device)', h('input', { class: 'inp', type: 'password', autocomplete: 'off', value: settings.get(`ai.${prov}.key`, ''), onchange: (e) => settings.set(`ai.${prov}.key`, e.target.value.trim()) }), P.keyUrl ? h('a', { href: P.keyUrl, target: '_blank', rel: 'noopener' }, 'Get a key ↗') : null) : null,
    field('Model', h('input', { class: 'inp', list: 'models2', value: settings.get(`ai.${prov}.model`, P.models[0]), onchange: (e) => settings.set(`ai.${prov}.model`, e.target.value) }), h('datalist', { id: 'models2' }, P.models.map((m) => h('option', { value: m })))),
    field('Base URL (change for proxies, edge devices or self-hosted servers)', h('input', { class: 'inp', value: settings.get(`ai.${prov}.base`, '') || P.base, onchange: (e) => settings.set(`ai.${prov}.base`, e.target.value.trim()) })),
    P.local ? h('div', { class: 'tip' }, 'Local / edge: run the server on this computer or a device on your network (e.g. ', h('code', {}, 'ollama serve'), '). Allow this app\'s origin, e.g. ', h('code', {}, 'OLLAMA_ORIGINS=*'), ', and pick a model you have pulled (', h('code', {}, 'ollama pull qwen2.5'), ').') : null,
    h('button', { class: 'btn', onclick: async () => { try { const r = await chat(aiCfg(), 'Reply with OK.', [{ role: 'user', content: 'ping' }]); toast(`Connected: ${r.slice(0, 40)}`); } catch (e) { toast(`Failed: ${e.message}`, 6000); } } }, 'Test connection'),
    h('h3', { style: 'margin-top:16px' }, '2 · Image tools'),
    h('div', { class: 'tip' }, 'Nano Banana / Nano Banana Pro use your Google Gemini key above (select Google Gemini, paste key). OpenAI images use your OpenAI key. Higgsfield: connect its MCP server to your agent alongside this app (see 3), or paste an HTTP endpoint below.'),
    ['higgsfield', 'custom'].map((k) => h('div', {}, field(`${IMAGE_PROVIDERS[k].name}: endpoint URL`, h('input', { class: 'inp', value: settings.get(`img.${k}.endpoint`, ''), onchange: (e) => settings.set(`img.${k}.endpoint`, e.target.value.trim()) })), field('Key / token (optional)', h('input', { class: 'inp', type: 'password', value: settings.get(`img.${k}.key`, ''), onchange: (e) => settings.set(`img.${k}.key`, e.target.value.trim()) })))),
    h('h3', { style: 'margin-top:16px' }, '3 · MCP: let any AI agent drive the app'),
    h('ol', { class: 'steps-list' },
      h('li', {}, 'Install Node.js 18+ and clone the repo, or use the desktop app, which includes the server.'),
      h('li', {}, 'Run the MCP server: ', h('code', {}, 'npx genzineers-fashion-mcp'), ' or ', h('code', {}, 'node mcp-server/index.js')),
      h('li', {}, 'Add it to your AI client (examples below), then turn on Live link here so the AI edits what you see.')),
    h('pre', {}, `Claude Desktop / Claude Code (.mcp.json or claude_desktop_config.json):\n{ "mcpServers": { "genzineers-fashion": { "command": "node", "args": ["<repo>/mcp-server/index.js"] } } }\n\nClaude Code CLI:\nclaude mcp add genzineers-fashion -- node <repo>/mcp-server/index.js\n\nOpenAI Codex CLI (~/.codex/config.toml):\n[mcp_servers.genzineers-fashion]\ncommand = "node"\nargs = ["<repo>/mcp-server/index.js"]\n\nGemini CLI (~/.gemini/settings.json):\n{ "mcpServers": { "genzineers-fashion": { "command": "node", "args": ["<repo>/mcp-server/index.js"] } } }\n\nCursor / Windsurf / VS Code: same command in their MCP settings.`),
    h('label', { class: 'scope' }, h('label', {}, h('input', { type: 'checkbox', checked: settings.get('bridge', false), onchange: (e) => { settings.set('bridge', e.target.checked); setupBridge(); renderDrawer(); } }), `Live link (ws://127.0.0.1:7821): ${bridgeStatus}`)),
    h('h3', { style: 'margin-top:16px' }, '4 · Command line'),
    h('pre', {}, 'node cli/gft.mjs "make a waxed field jacket in olive, size L"   # prompt with your AI key\nnode cli/gft.mjs do set_option \'{"key":"cuff","value":"rib"}\'          # direct action\nnode cli/gft.mjs export techpack out.html'),
  );
  body.append(box);
}

// ---------- MCP live link ----------
let bridge = null; let bridgeStatus = 'off';
function setupBridge() {
  bridge?.close(); bridge = null; bridgeStatus = 'off';
  if (!settings.get('bridge', false)) return;
  bridge = connectBridge({ store, viewer, exportFn: async (what) => (what === 'techpack' ? techPackHTML(store.get(), { image: viewer.snapshot(900) }) : what === 'dxf' ? patternDXF(store.get()) : what === 'svg' ? patternSVG(store.get()) : what === 'bom' ? bomCSV(store.get()) : JSON.stringify(store.get())), onStatus: (s) => { bridgeStatus = s; if (ui.ai && ui.aiTab === 'connect') renderDrawer(); } });
}

// ---------- about / welcome ----------
function modal(content) { const back = h('div', { class: 'modal-back', onclick: (e) => e.target === back && back.remove() }, h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' }, content, h('div', { style: 'margin-top:14px;text-align:right' }, h('button', { class: 'btn primary', onclick: () => back.remove() }, 'Start designing')))); document.body.append(back); }
function showAbout() {
  modal(h('div', {}, h('h2', {}, 'Genzineers Fashion Tool'),
    h('p', {}, 'Design, simulate, assemble and produce clothing, hats, bags and jewelry. Real cloth physics (Rust/WebAssembly), real construction methods, and factory-ready files.'),
    h('ol', { class: 'steps-list' }, h('li', {}, h('b', {}, 'Style: '), 'pick a template, customise it, choose a size.'), h('li', {}, h('b', {}, 'Materials: '), 'fabric quality, blends, colour, dye, print, fill.'), h('li', {}, h('b', {}, 'Details: '), 'stitching, threads, buttons, trims, decorations.'), h('li', {}, h('b', {}, 'Make it: '), 'tech pack, patterns, BOM, supplier guide and RFQ emails.')),
    h('p', { class: 's', style: 'color:var(--muted)' }, 'Free for personal, educational and non-commercial use. Commercial use (email genzineers@gmail.com), including modified versions, requires a licence from Genzineers. © 2026 Genzineers. All rights reserved.'),
    h('div', { class: 'chips' }, h('a', { class: 'btn sm', href: LINKS_OUT.genzineers, target: '_blank', rel: 'noopener' }, 'genzineers.com'), h('a', { class: 'btn sm', href: LINKS_OUT.tpd, target: '_blank', rel: 'noopener' }, 'thepotentialdropout.com'), h('a', { class: 'btn sm', href: LINKS_OUT.pd, target: '_blank', rel: 'noopener' }, 'potentialdropout.com'), h('a', { class: 'btn sm', href: LINKS_OUT.licence, target: '_blank', rel: 'noopener' }, 'Commercial licence'), h('a', { class: 'btn sm', href: LINKS_OUT.repo, target: '_blank', rel: 'noopener' }, 'Source code'))));
}

// ---------- manufacturing pack: every file a factory needs, in one ZIP ----------
async function manufacturingPack() {
  const p = store.get(); const name = p.name.replace(/[^\w-]+/g, '_');
  toast('Building the manufacturing pack…');
  try {
    const { zipSync, strToU8 } = await import('three/examples/jsm/libs/fflate.module.js');
    const files = {}; const put = (path, data) => { files[`${name}/${path}`] = typeof data === 'string' ? strToU8(data) : data; };
    const bytes = async (blob) => new Uint8Array(await blob.arrayBuffer());
    put('01-tech-pack.html', techPackHTML(p, { image: viewer.snapshot(1000) }));
    put('02-bill-of-materials.csv', bomCSV(p));
    put('03-sewing-operations.csv', operationsCSV(p));
    put('pattern/pattern.dxf', patternDXF(p)); put('pattern/pattern.svg', patternSVG(p));
    put('pattern/print-at-home-A4.html', tiledPrintHTML(p, 'A4'));
    for (const f of knitFiles(p)) put(f.file, f.text);
    for (const g of (p.garments || []).filter((x) => x.knit?.motif && x.knit.motif !== 'none')) put(`knit/${g.id}-colourwork-chart.svg`, knitChartSVG(g.knit));
    let n = 0;
    for (const e of p.embroidery || []) {
      if (e.kind === 'image') await loadArtwork(e.image);
      const bmp = designBitmap(e); if (!bmp) continue; n++;
      const { cmds, stats } = digitize(bmp, { type: e.stitch, underlay: e.underlay });
      const nm = `embroidery/${String(n).padStart(2, '0')}-${(e.text || e.motif || 'artwork').replace(/[^\w-]+/g, '_').slice(0, 20)}`;
      put(`${nm}.dst`, writeDST(cmds, (e.text || e.motif || 'ART').toUpperCase()));
      put(`${nm}-run-sheet.txt`, embroiderySheet(e, stats, p.panels.find((x) => x.id === e.panel)?.name));
    }
    const pp = printProtocol(p, printTileCm);
    if (pp) {
      put('prints/print-and-dye-protocol.txt', pp);
      const done = new Set();
      for (const pan of p.panels) { const pr = pan.finish?.print; if (!pr?.design || pr.design === 'solid' || pr.design === 'image' || done.has(pr.design + JSON.stringify(pr.colors))) continue; done.add(pr.design + JSON.stringify(pr.colors)); put(`prints/${pr.design}.png`, await bytes(await new Promise((res) => printTileCanvas(pr.design, pr.colors, 2048).toBlob(res, 'image/png')))); }
      for (const pan of p.panels) { const im = pan.finish?.print?.image; if (im && !done.has(im.length)) { done.add(im.length); put(`prints/artwork-${pan.id}.${(im.match(/^data:image\/(\w+)/) || [0, 'png'])[1].replace('svg+xml', 'svg')}`, await bytes(await (await fetch(im)).blob())); } }
    }
    put('3d/model.glb', await bytes(await viewer.exportModel('glb')));
    put('project.gft.json', JSON.stringify(p));
    put('README.txt', [`${p.name}: manufacturing pack`, `Made with Genzineers Fashion Tool (genzineers.com)`, '', '01-tech-pack.html         spec sheet, measurements, construction, materials (print to PDF)', '02-bill-of-materials.csv   fabric, trims, thread', '03-sewing-operations.csv   every operation in sewing order: stitch, machine, thread, SPI, length', 'pattern/                  cut pieces with seam allowance: DXF for CAD and cutters, SVG, tiled A4', 'knit/                     Knitout machine programs (.k) per panel + written instructions', 'embroidery/               Tajima .DST machine files + run sheets (colour sequence, set-up)', 'prints/                   repeat artwork (PNG) + print and dye protocol', '3d/                       GLB model of the draped garment', 'project.gft.json          reopen in the tool', '', 'Always approve a sample (fit, sew-out, strike-off, lab dip) before bulk production.'].join('\r\n'));
    download(`${name}-manufacturing-pack.zip`, new Blob([zipSync(files)], { type: 'application/zip' }));
    toast(`Manufacturing pack saved (${Object.keys(files).length} files)`, 4000);
  } catch (e) { console.error(e); toast(`Could not build the pack: ${e.message}`, 6000); }
}

// ---------- my collection ----------
function thumbOf() {
  return new Promise((res) => {
    try {
      const img = new Image();
      img.onload = () => { const W = 320; const c = document.createElement('canvas'); c.width = W; c.height = Math.round((W * img.height) / img.width) || W; const g = c.getContext('2d'); g.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim() || '#eceae6'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.78)); };
      img.onerror = () => res('');
      img.src = viewer.snapshot(640);
    } catch { res(''); }
  });
}
async function saveToCollection({ asNew = false } = {}) {
  const p = store.get();
  try {
    const it = await collection.save(p, await thumbOf(), { id: asNew ? undefined : ui.savedId, name: p.name });
    ui.savedId = it.id;
    toast(`Saved "${it.name}" to your collection`);
    if (collEl) renderCollection();
  } catch (e) { toast(`Could not save: ${e.message}`, 5000); }
}
let collEl = null;
const coll = { filter: 'all', q: '', pick: false };
function openCollection({ pick = false } = {}) {
  coll.pick = pick;
  collEl?.remove();
  collEl = h('div', { class: 'modal-back', onclick: (e) => e.target === collEl && closeCollection() }, h('div', { class: 'modal wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'My collection' }));
  document.body.append(collEl);
  renderCollection();
}
function closeCollection() { collEl?.remove(); collEl = null; }
async function renderCollection() {
  if (!collEl) return;
  const box = collEl.firstChild;
  const p = store.get();
  const items = await collection.list();
  const shown = items.filter((it) => (coll.filter === 'all' || it.kind === coll.filter) && (!coll.pick || it.kind !== 'jewelry') && (!coll.q || it.name.toLowerCase().includes(coll.q.toLowerCase())));
  const importer = h('input', { type: 'file', class: 'hide', accept: '.json', onchange: async (e) => { const f = e.target.files[0]; if (!f) return; try { const n = await collection.importAll(await readAs(f, 'readAsText')); toast(`Imported ${n} design(s)`); renderCollection(); } catch (err) { toast(`Import failed: ${err.message}`, 5000); } } });
  const act = (label, fn, cls = 'btn sm') => h('button', { class: cls, onclick: async (e) => { e.stopPropagation(); await fn(); } }, label);
  const card = (it) => h('div', { class: 'card' },
    h('div', { class: 'thumb', style: it.thumb ? `background-image:url(${it.thumb})` : '' }, h('span', { class: 'badge' }, it.kind === 'outfit' ? `Outfit · ${(it.project.garments || []).length}` : it.kind === 'jewelry' ? 'Jewelry' : 'Garment')),
    h('div', { class: 't', title: it.name }, it.name),
    h('div', { class: 's' }, new Date(it.updated).toLocaleDateString()),
    h('div', { class: 'chips' },
      coll.pick || (p.mode !== 'jewelry' && it.kind !== 'jewelry')
        ? act(coll.pick ? 'Wear it' : 'Add to outfit', () => { const r = store.dispatch({ type: 'add_design', design: it.project }); if (r[0]?.ok) { toast(`Added "${it.name}" to the outfit`); closeCollection(); ui.step = 'style'; renderPanel(); } else toast(r[0]?.error || 'Could not add', 5000); }, `btn sm ${coll.pick ? 'primary' : ''}`) : null,
      coll.pick ? null : act('Open', () => { store.replace(it.project, 'collection'); ui.savedId = it.id; toast(`Opened "${it.name}"`); closeCollection(); }, 'btn sm primary'),
      coll.pick ? null : act('Rename', async () => { const n = prompt('Name', it.name); if (n && n.trim()) { await collection.put({ ...it, name: n.trim(), project: { ...it.project, name: n.trim() } }); renderCollection(); } }),
      coll.pick ? null : act('Duplicate', async () => { await collection.duplicate(it.id); renderCollection(); }),
      coll.pick ? null : act('Delete', async () => { if (confirm(`Delete "${it.name}" from your collection? This cannot be undone.`)) { await collection.remove(it.id); if (ui.savedId === it.id) ui.savedId = null; renderCollection(); } })));
  box.replaceChildren(
    h('div', { class: 'coll-head' },
      h('h2', {}, coll.pick ? 'Add a saved piece to this outfit' : 'My collection'),
      h('div', { class: 'spacer' }),
      h('button', { class: 'btn ghost icon', 'aria-label': 'Close', onclick: closeCollection }, '✕')),
    h('p', { class: 's', style: 'color:var(--muted);margin:0 0 10px' }, coll.pick ? 'Pick a garment or outfit you saved. It is put on the mannequin with all its fabrics, colours, prints and trims, layered with what is already worn.' : `${items.length} saved design(s), stored on this device. Export to back up or move them to another device.`),
    coll.pick ? null : h('div', { class: 'chips', style: 'margin-bottom:8px' },
      act(ui.savedId ? 'Save changes' : 'Save current design', () => saveToCollection(), 'btn sm primary'),
      ui.savedId ? act('Save as new', () => saveToCollection({ asNew: true })) : null,
      act('Export all', async () => download('my-collection.gft-collection.json', await collection.exportAll(), 'application/json')),
      act('Import', () => importer.click()), importer),
    h('div', { class: 'coll-tools' },
      h('div', { class: 'seg' }, [['all', 'All'], ['garment', 'Garments'], ['outfit', 'Outfits'], ...(coll.pick ? [] : [['jewelry', 'Jewelry']])].map(([k, l]) => h('button', { class: coll.filter === k ? 'on' : '', onclick: () => { coll.filter = k; renderCollection(); } }, l))),
      h('input', { type: 'search', placeholder: 'Search…', value: coll.q, oninput: (e) => { coll.q = e.target.value; clearTimeout(coll.t); coll.t = setTimeout(() => { renderCollection().then(() => { const i = collEl?.querySelector('input[type=search]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }); }, 150); } })),
    shown.length ? h('div', { class: 'coll-grid' }, shown.map(card)) : h('div', { class: 'empty' }, items.length ? 'Nothing matches.' : 'Nothing saved yet. Design something, then press "Save current design" (or Ctrl+S). Saved pieces can be worn together as an outfit.'),
  );
}

// ---------- boot ----------
function renderAll() { renderTop(); renderPanel(); renderHud(); if (ui.ai) renderDrawer(); }
(async () => {
  const kind = await initSolver(`${import.meta.env.BASE_URL}atelier_sim.wasm`);
  simStatus = { text: `Solver: ${kind === 'wasm' ? 'Rust/WASM' : 'JS'}`, live: true };
  renderAll();
  rebuild({});
  setupBridge();
  if (!settings.get('welcomed', false)) { settings.set('welcomed', true); showAbout(); }
})();
