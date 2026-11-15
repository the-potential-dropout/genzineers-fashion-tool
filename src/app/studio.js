/**
 * Studio tools: colourways, costing, version history, command search, turntable video,
 * all-sizes render, measuring and bag volume. Everything here works offline, with no AI.
 */
import { costSheet } from '../make/production.js';
import { resolveFabric } from '../core/fabrics.js';
import { TEMPLATES } from '../core/templates.js';
import { SIZE_CHARTS, bodyFor } from '../core/sizes.js';
import { bodyField, sampleField } from '../sim/bodyfield.js';

const HKEY = 'gft.history.v1';
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('gft-history', 1); r.onupgradeneeded = () => r.result.createObjectStore('v', { keyPath: 't' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const tx = async (mode, fn) => { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('v', mode); const out = fn(t.objectStore('v')); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); }); };

export function initStudio({ store, viewer, h, toast, download, rerender, field, sel }) {
  // ---------- version history: a copy every few minutes while you work, restorable at any time ----------
  let lastSaved = ''; let lastT = 0;
  const snapshotNow = async (label = '') => {
    const p = store.get(); const json = JSON.stringify(p); if (json === lastSaved && !label) return;
    lastSaved = json; lastT = Date.now();
    let thumb = ''; try { thumb = viewer.snapshot(200); } catch { /* no picture */ }
    try { await tx('readwrite', (s) => s.put({ t: Date.now(), name: p.name, label, json, thumb })); const all = await tx('readonly', (s) => s.getAllKeys()); if (all.length > 40) await tx('readwrite', (s) => { for (const k of all.slice(0, all.length - 40)) s.delete(k); }); } catch (e) { console.warn('history unavailable', e); }
  };
  store.subscribe(() => { if (Date.now() - lastT > 120000) setTimeout(() => snapshotNow(), 1500); });
  addEventListener('beforeunload', () => { try { localStorage.setItem(HKEY, String(Date.now())); } catch { /* ignore */ } });

  const modal = (title, body, wide = false) => { const close = () => el.remove(); const el = h('div', { class: 'modal-back', onclick: (e) => { if (e.target === el) close(); } }, h('div', { class: 'modal', role: 'dialog', 'aria-label': title, style: wide ? 'max-width:860px' : '' }, h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:8px' }, h('h3', { style: 'margin:0' }, title), h('button', { class: 'btn sm ghost', onclick: close, 'aria-label': 'Close' }, '✕')), body)); document.body.append(el); return { el, close }; };

  async function openHistory() {
    await snapshotNow();
    const rows = (await tx('readonly', (s) => s.getAll())).sort((a, b) => b.t - a.t);
    const m = modal('Version history', h('div', {},
      h('div', { class: 'tip' }, 'A copy of your work is kept automatically every couple of minutes (the last 40). Restore any of them; the restore itself can be undone with Ctrl+Z.'),
      h('div', { class: 'chips', style: 'margin:8px 0' }, h('button', { class: 'btn sm', onclick: async () => { const l = prompt('Name this version', 'Before changes'); if (l) { await snapshotNow(l); m.close(); openHistory(); } } }, 'Save a named version now')),
      h('div', { class: 'list' }, rows.map((r) => h('div', { class: 'row' }, r.thumb ? h('img', { src: r.thumb, alt: '', style: 'width:56px;height:56px;object-fit:cover;border-radius:8px' }) : null,
        h('div', { class: 'grow' }, h('div', { class: 't' }, r.label || r.name), h('div', { class: 's' }, `${new Date(r.t).toLocaleString()} · ${(r.json.length / 1024).toFixed(0)} KB`)),
        h('button', { class: 'btn sm', onclick: () => { store.replace(JSON.parse(r.json), 'history'); m.close(); toast('Version restored (Ctrl+Z to go back)'); } }, 'Restore'))))));
  }

  // ---------- command search (Ctrl+K): every template, tool and action in one box ----------
  let commands = () => [];
  function openSearch() {
    const p = store.get();
    const tpl = p.mode === 'jewelry' ? [] : Object.entries(TEMPLATES).flatMap(([id, t]) => [{ label: `Template: ${t.name}`, hint: t.group, run: () => store.dispatch({ type: 'new_garment', template: id }) }, { label: `Add to outfit: ${t.name}`, hint: t.group, run: () => store.dispatch({ type: 'add_garment', template: id }) }]);
    const all = [...commands(), ...tpl];
    let idx = 0; const list = h('div', { class: 'list', style: 'max-height:52vh;overflow:auto;margin-top:8px' });
    const input = h('input', { class: 'inp', type: 'search', placeholder: 'Search templates, tools and actions…', 'aria-label': 'Search', style: 'width:100%' });
    let shown = [];
    const draw = () => { const q = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean); shown = all.filter((c) => q.every((w) => `${c.label} ${c.hint || ''}`.toLowerCase().includes(w))).slice(0, 60); idx = Math.min(idx, Math.max(0, shown.length - 1)); list.replaceChildren(...shown.map((c, i) => h('button', { class: `row ${i === idx ? 'on' : ''}`, style: `width:100%;text-align:left;${i === idx ? 'outline:2px solid var(--accent)' : ''}`, onclick: () => go(i) }, h('div', { class: 'grow' }, h('div', { class: 't' }, c.label), c.hint ? h('div', { class: 's' }, c.hint) : null)))); };
    const m = modal('Search', h('div', {}, input, list));
    const go = (i) => { const c = shown[i]; if (!c) return; m.close(); c.run(); };
    input.addEventListener('input', () => { idx = 0; draw(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { idx = Math.min(shown.length - 1, idx + 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { idx = Math.max(0, idx - 1); draw(); e.preventDefault(); } else if (e.key === 'Enter') go(idx); else if (e.key === 'Escape') m.close(); });
    draw(); setTimeout(() => input.focus(), 30);
  }

  // ---------- colourways ----------
  function colorwaySection(p) {
    const cws = (p.colorways || []).filter((c) => c.look);
    return h('div', { class: 'sec' }, h('h3', {}, 'Colourways'),
      h('div', { class: 'tip' }, 'Keep the same design in several colour and material combinations. Save the current look as a colourway, switch between them, and render them all side by side for a line sheet.'),
      h('div', { class: 'chips' }, cws.map((c) => h('span', { style: 'display:inline-flex;gap:2px' }, h('button', { class: `chip ${p.colorway === c.id ? 'on' : ''}`, onclick: () => store.dispatch({ type: 'apply_colorway', id: c.id }) }, c.name), h('button', { class: 'btn sm ghost', title: `Delete ${c.name}`, 'aria-label': `Delete ${c.name}`, onclick: () => store.dispatch({ type: 'remove_colorway', id: c.id }) }, '×'))),
        h('button', { class: 'btn sm', onclick: () => { const n = prompt('Name this colourway', `Colourway ${cws.length + 1}`); if (n) store.dispatch({ type: 'save_colorway', name: n }); } }, '+ Save current look'),
        p.colorway && cws.some((c) => c.id === p.colorway) ? h('button', { class: 'btn sm', title: 'Store the changes you just made in the selected colourway', onclick: () => { const c = cws.find((x) => x.id === p.colorway); store.dispatch({ type: 'save_colorway', id: c.id, name: c.name }); toast(`${c.name} updated`); } }, 'Update selected') : null,
        cws.length > 1 ? h('button', { class: 'btn sm', onclick: () => renderSheet('colorways') }, 'Render all colourways') : null));
  }

  // ---------- render every colourway or every size into one sheet ----------
  async function renderSheet(kind) {
    const p0 = store.get(); const shots = [];
    const wait = () => new Promise((res) => { let n = 0; const tick = () => { n++; if ((!viewer.simAwake && n > 20) || n > 900) res(); else requestAnimationFrame(tick); }; setTimeout(tick, 400); });
    const items = kind === 'colorways' ? (p0.colorways || []).filter((c) => c.look).map((c) => ({ name: c.name, act: { type: 'apply_colorway', id: c.id } })) : (p0.production?.sizes?.length ? p0.production.sizes : Object.keys((SIZE_CHARTS[p0.sizeChart || 'unisex'] || SIZE_CHARTS.unisex).sizes)).map((s) => ({ name: `Size ${s}`, act: { type: 'set_size', size: s } }));
    toast(`Rendering ${items.length} views…`, 4000);
    for (const it of items) { store.dispatch(it.act); await wait(); viewer.frameGarment?.(); await new Promise((r) => setTimeout(r, 250)); shots.push({ name: it.name, url: viewer.snapshot(900) }); }
    store.replace(p0, 'render');
    const imgs = await Promise.all(shots.map((s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = s.url; })));
    const cols = Math.min(4, imgs.length); const rowsN = Math.ceil(imgs.length / cols); const cw = 620; const ch = Math.round(cw * imgs[0].height / imgs[0].width);
    const c = document.createElement('canvas'); c.width = cols * cw; c.height = rowsN * (ch + 44) + 60; const g = c.getContext('2d'); g.fillStyle = '#f4f2ee'; g.fillRect(0, 0, c.width, c.height); g.fillStyle = '#111'; g.font = '600 26px sans-serif'; g.fillText(`${p0.name}: ${kind === 'colorways' ? 'colourways' : 'size run'}`, 20, 40);
    imgs.forEach((im, i) => { const x = (i % cols) * cw; const y = 60 + Math.floor(i / cols) * (ch + 44); g.drawImage(im, x, y, cw, ch); g.fillStyle = '#111'; g.font = '600 20px sans-serif'; g.fillText(shots[i].name, x + 16, y + ch + 28); });
    c.toBlob((b) => download(`${p0.name}-${kind}.png`, b, 'image/png'));
  }

  // ---------- turntable video ----------
  async function recordTurntable(seconds = 8) {
    const canvas = viewer.renderer.domElement; if (!canvas.captureStream || !window.MediaRecorder) { toast('This browser cannot record video; use Snapshot instead.'); return; }
    const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t)); if (!type) { toast('No supported video format.'); return; }
    const stream = canvas.captureStream(30); const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8e6 }); const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const was = viewer.autoOrbit; const speed = viewer.controls.autoRotateSpeed;
    viewer.controls.autoRotateSpeed = 60 / seconds; viewer.setAutoOrbit(true); // one full turn
    const keep = setInterval(() => { viewer.dirty = true; }, 16);
    toast(`Recording a ${seconds}-second turntable…`, seconds * 1000);
    rec.start(); await new Promise((r) => setTimeout(r, seconds * 1000)); rec.stop(); await new Promise((r) => { rec.onstop = r; });
    clearInterval(keep); viewer.controls.autoRotateSpeed = speed; viewer.setAutoOrbit(was);
    download(`${store.get().name}-turntable.${/mp4/.test(type) ? 'mp4' : 'webm'}`, new Blob(chunks, { type }), type);
  }

  // ---------- costing ----------
  function costSection(p) {
    if (p.mode === 'jewelry') return null;
    const cs = costSheet(p); const m = (v) => `${cs.C.currency}${v.toFixed(2)}`;
    const num = (value, on, w = 74) => h('input', { class: 'inp', type: 'number', step: '0.01', min: 0, value, style: `width:${w}px`, onchange: (e) => on(e.target.value === '' ? null : Number(e.target.value)) });
    const setC = (k) => (v) => store.dispatch({ type: 'set_cost', costing: { [k]: v ?? undefined } });
    return h('div', { class: 'sec' }, h('h3', {}, 'Costing'),
      h('div', { class: 'tip' }, 'What one piece costs to make. Type your own supplier prices: figures marked “estimate” are only starting points. The sheet goes into the tech pack and the manufacturing pack.'),
      h('div', { class: 'list' }, cs.rows.map((r) => h('div', { class: 'row', style: 'flex-wrap:wrap;gap:6px' }, h('div', { class: 'grow', style: 'min-width:130px' }, h('div', { class: 't' }, r.item), h('div', { class: 's' }, `${r.cat} · ${r.qty} ${r.unit}${r.estimate ? ' · estimate' : ''}${r.note ? ` · ${r.note}` : ''}`)), h('span', { class: 's' }, `${cs.C.currency}/${r.unit}`), num(r.price, (v) => store.dispatch({ type: 'set_cost', key: r.key, price: v })), h('b', { style: 'min-width:64px;text-align:right' }, m(r.cost)))),
        h('div', { class: 'row', style: 'flex-wrap:wrap;gap:6px' }, h('div', { class: 'grow' }, h('div', { class: 't' }, 'Labour'), h('div', { class: 's' }, `Sewing and assembly minutes${cs.minutesEstimate ? ' (estimated from the seams and operations)' : ''}`)), num(cs.minutes, (v) => store.dispatch({ type: 'set_cost', key: 'labour:minutes', price: v }), 64), h('span', { class: 's' }, `min × ${cs.C.currency}`), num(cs.C.labourRate, setC('labourRate'), 64), h('b', { style: 'min-width:64px;text-align:right' }, m(cs.labour)))),
      h('div', { class: 'grid2', style: 'margin-top:8px' }, field('Overhead %', num(cs.C.overheadPct, setC('overheadPct'))), field('Duty %', num(cs.C.dutyPct, setC('dutyPct'))), field('Freight per unit', num(cs.C.freight, setC('freight'))), field('Wholesale margin %', num(cs.C.marginPct, setC('marginPct'))), field('Retail multiple', num(cs.C.retailX, setC('retailX'))), field('Currency symbol', h('input', { class: 'inp', value: cs.C.currency, style: 'width:60px', onchange: (e) => store.dispatch({ type: 'set_cost', costing: { currency: e.target.value.slice(0, 3) || '$' } }) }))),
      h('div', { class: 'list', style: 'margin-top:8px' }, [['Materials and trims', cs.materials], ['Labour', cs.labour], ['Overhead', cs.overhead], ['Factory price (FOB)', cs.fob], ['Landed (duty and freight)', cs.landed], ['Wholesale', cs.wholesale], ['Retail', cs.retail]].map(([k, v], i) => h('div', { class: 'row' }, h('div', { class: 'grow' }, i >= 3 ? h('b', {}, k) : k), h('b', {}, m(v))))),
      p.costing?.targetCost || p.production?.targetCost ? h('div', { class: 'check' }, h('span', { class: cs.fob <= (p.production.targetCost || 1e9) ? 'ok' : 'warn' }, cs.fob <= p.production.targetCost ? '✓' : '!'), h('span', {}, `Target cost ${m(Number(p.production.targetCost))}: ${cs.fob <= p.production.targetCost ? 'within target' : `${m(cs.fob - p.production.targetCost)} over`}`)) : null);
  }

  // ---------- measuring: body girth at any height, and the garment over it ----------
  function measureSection(p) {
    if (p.mode === 'jewelry' || p.display?.avatar === false) return null;
    const body = bodyFor(p); let f = null; try { f = bodyField(body); } catch { /* body mesh not loaded */ }
    const girth = (y, side = 0) => { if (!f) return 0; const o = [0, 0, 0, 0]; const pts = []; const cx = side * (body.legX || 0.09); for (let a = 0; a < 72; a++) { const th = (a / 72) * Math.PI * 2; let r = 0.6; for (let it = 0; it < 60; it++) { const d = sampleField(f, cx + Math.cos(th) * r, y, Math.sin(th) * r, o); if (d < 0.0015) break; r -= Math.max(0.001, d * 0.8); if (r <= 0) break; } pts.push([Math.cos(th) * r, Math.sin(th) * r]); } let L = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i]; const b = pts[(i + 1) % pts.length]; L += Math.hypot(a[0] - b[0], a[1] - b[1]); } return L * 100; };
    const out = h('div', { class: 'list' });
    const marks = [['Chest / bust', body.bustY], ['Natural waist', body.naturalWaistY], ['Hip', body.crotchY + 0.08], ['Thigh (one leg)', body.crotchY - 0.06, 1], ['Knee (one leg)', body.crotchY * 0.6, 1], ['Calf (one leg)', body.crotchY * 0.4, 1], ['Ankle (one leg)', 0.1 + (body.soleLift || 0), 1]];
    const custom = h('input', { type: 'range', min: 5, max: Math.round(body.shoulderY * 100), value: 100, style: 'flex:1', oninput: (e) => { cv.textContent = `${e.target.value} cm from the floor: ${girth(e.target.value / 100).toFixed(1)} cm round`; viewer.showLevel?.(e.target.value / 100); } }); const cv = h('div', { class: 's' }, 'Slide to measure round the body at any height');
    setTimeout(() => out.replaceChildren(...marks.map(([n, y, s]) => h('div', { class: 'row' }, h('div', { class: 'grow' }, n, h('div', { class: 's' }, `${(y * 100).toFixed(0)} cm from the floor`)), h('b', {}, f ? `${girth(y, s ? 1 : 0).toFixed(1)} cm` : '…')))), 0);
    return h('details', { class: 'sec' }, h('summary', {}, h('b', {}, 'Measure the body')), h('div', { class: 'tip' }, 'Tape measurements taken on the mannequin exactly as it stands now (your size, body type and shoes).'), out, h('div', { class: 'row' }, custom), cv);
  }

  /** Storage volume of a bag from its inside dimensions, in litres. */
  function bagVolume(o) {
    const w = o.width - 1; const hh = o.height - 1; const d = o.depth - 0.6; const k = { rectangle: 1, rounded: 0.9, trapezoid: 0.85, crescent: 0.62, cylinder: Math.PI / 4 }[o.shape] ?? 1;
    const v = o.shape === 'cylinder' ? Math.PI * (d / 2) * (hh / 2) * w : w * hh * d * k * (o.base === 'soft' ? 0.88 : 1);
    return Math.max(0, v / 1000);
  }

  return { openHistory, openSearch, colorwaySection, costSection, measureSection, renderSheet, recordTurntable, bagVolume, snapshotNow, setCommands: (fn) => { commands = fn; } };
}
