// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Flat pattern canvas: every garment broken down into the pieces you cut,
 * laid flat, the way a factory needs them.
 *
 *  - stitch line (the drafted outline, dashed) and cut line (stitch line +
 *    seam allowance, solid); deeper allowance on hems
 *  - seams: matching edges share a colour and a letter (A sews to A), with a
 *    notch at the middle of each; click an edge to see what it joins and how
 *  - grainline, piece name, cut quantity, pocket / placket / button positions
 *  - view all pieces together, or step through them one at a time
 *  - draw your own pieces from scratch and sew edges together
 *
 * Editing: drag a point, double-click an edge to add a point, right-click /
 * long-press a point to delete it. Wheel / pinch zooms, drag pans.
 */
import { ASSEMBLY, ASSEMBLY_GROUPS, THREADS } from '../core/assembly.js';
import { cutList } from '../make/production.js';

const COLORS = ['#ff5a1f', '#2f6bff', '#1f8a4c', '#a63fd6', '#c79a00', '#d6336c', '#00a3a3', '#6b4f2a', '#5f6caf', '#b34d00', '#3d8b8b', '#8a3ffc'];
const letter = (i) => (i < 26 ? String.fromCharCode(65 + i) : String.fromCharCode(65 + Math.floor(i / 26) - 1) + String.fromCharCode(65 + (i % 26)));

/** Offset a closed outline outwards by d[i] per edge (cm): mitred corners. */
function offsetOutline(pts, dist) {
  const n = pts.length;
  let A = 0; for (let i = 0; i < n; i++) { const a = pts[i]; const b = pts[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
  const sg = A > 0 ? 1 : -1;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n]; const c = pts[i]; const q = pts[(i + 1) % n];
    const d0 = dist((i - 1 + n) % n); const d1 = dist(i);
    let ax = c[0] - p[0]; let ay = c[1] - p[1]; let bx = q[0] - c[0]; let by = q[1] - c[1];
    const la = Math.hypot(ax, ay) || 1; const lb = Math.hypot(bx, by) || 1; ax /= la; ay /= la; bx /= lb; by /= lb;
    // outward normals of the two edges
    const n0 = [ay * sg, -ax * sg]; const n1 = [by * sg, -bx * sg];
    const cross = ax * by - ay * bx;
    if (Math.abs(cross) < 0.05) { out.push([c[0] + n1[0] * (d0 + d1) / 2, c[1] + n1[1] * (d0 + d1) / 2]); continue; }
    // intersect the two offset lines
    const p0 = [c[0] + n0[0] * d0, c[1] + n0[1] * d0]; const p1 = [c[0] + n1[0] * d1, c[1] + n1[1] * d1];
    const t = ((p1[0] - p0[0]) * by - (p1[1] - p0[1]) * bx) / cross;
    let x = p0[0] + ax * t; let y = p0[1] + ay * t;
    const far = Math.hypot(x - c[0], y - c[1]); const lim = Math.max(d0, d1) * 2.5;
    if (far > lim) { x = c[0] + ((x - c[0]) / far) * lim; y = c[1] + ((y - c[1]) / far) * lim; }
    out.push([x, y]);
  }
  return out;
}

export function createPatternEditor(canvas, store, { toast = () => {}, grade = null } = {}) {
  const g = canvas.getContext('2d');
  const view = { s: 3, x: 40, y: 40 };
  const opt = { mode: 'all', index: 0, allowance: true, stitch: true, details: true, tool: 'edit', grading: false, fabricWidth: 150 };
  let marker = null; // { length, efficiency } of the last marker layout
  let layout = [];
  let drag = null;
  const pointers = new Map();
  let longPress;
  let draft = []; // points of the piece being drawn (cm, canvas-local frame)
  let sewA = null; // first edge picked with the sew tool
  let picked = null; // { seam } highlighted

  // ---------- toolbar ----------
  const bar = document.createElement('div');
  bar.className = 'pattern-tools';
  canvas.parentElement.append(bar);
  // ---- "how do I" guide and the connection editor (shown over the canvas) ----
  const help = document.createElement('div'); help.className = 'pattern-help'; help.hidden = true;
  help.innerHTML = `<b>Make and join pattern pieces</b>
    <ol>
      <li><b>New piece:</b> press <i>✎ Draw piece</i>, click to place each corner, then double-click (or click the first point) to close it. Drag points to refine; double-click an edge to add a point; right-click a point to delete it.</li>
      <li><b>Connect two edges:</b> press <i>⧓ Sew edges</i>, click one edge, then the edge it joins. The two edges take the same colour and letter, and the garment is sewn in the 3D view.</li>
      <li><b>Choose how they are joined:</b> click a connected edge. A panel opens where you pick the method: any machine stitch, a seam construction, hand stitching, glue or bonding, welding, taping, or rivets, plus the thread.</li>
      <li><b>Edit or undo a connection:</b> click the edge again to change the method, or press <i>Remove connection</i>. Ctrl+Z undoes any step.</li>
      <li><b>Check it:</b> turn on <i>Pattern: split</i> (top bar) to see the piece and the sewn garment side by side; <i>One piece</i> shows sizes and seam lengths.</li>
    </ol>`;
  const conn = document.createElement('div'); conn.className = 'pattern-conn'; conn.hidden = true;
  canvas.parentElement.append(help, conn);
  const closeConn = () => { conn.hidden = true; };
  function openConn(seam, i, a, b, len) {
    const p = store.get();
    const mk = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'class') e.className = v; else if (v != null && v !== false) e.setAttribute(k, v); } for (const c of kids.flat()) if (c != null) e.append(c); return e; };
    const methods = mk('select', { 'aria-label': 'How the edges are joined', onchange: (e) => { store.dispatch({ type: 'set_stitch', seam: seam.id, stitch: e.target.value }); toast(`Seam ${letter(i)}: ${ASSEMBLY[e.target.value].name}`); } },
      Object.entries(ASSEMBLY_GROUPS).map(([gk, gname]) => mk('optgroup', { label: gname }, Object.entries(ASSEMBLY).filter(([, v]) => v.method === gk).map(([id, v]) => mk('option', { value: id, selected: id === seam.stitch ? '' : null }, v.name)))));
    const threads = mk('select', { 'aria-label': 'Thread', onchange: (e) => store.dispatch({ type: 'set_stitch', seam: seam.id, thread: e.target.value }) }, Object.entries(THREADS).map(([id, v]) => mk('option', { value: id, selected: id === (seam.thread || 'poly-corespun') ? '' : null }, v.name)));
    const m = ASSEMBLY[seam.stitch];
    conn.replaceChildren(
      mk('div', { class: 'row' }, mk('b', {}, `Connection ${letter(i)}`), mk('span', { class: 'grow' }), mk('button', { class: 'btn ghost icon', 'aria-label': 'Close', onclick: closeConn }, '✕')),
      mk('div', { class: 's' }, `${a.name} ↔ ${b ? b.name : '?'} · ${len.toFixed(1)} cm`),
      mk('label', {}, mk('span', {}, 'Joined by'), methods),
      m ? mk('div', { class: 's' }, `${m.use || ''}${m.machine ? ` Machine: ${m.machine}.` : ''}`) : null,
      ['bond', 'weld'].includes(m?.method) ? null : mk('label', {}, mk('span', {}, 'Thread'), threads),
      mk('label', {}, mk('span', {}, 'Thread colour'), mk('input', { type: 'color', value: seam.threadColor || '#d8d2c4', onchange: (e) => store.dispatch({ type: 'set_stitch', seam: seam.id, threadColor: e.target.value }) })),
      mk('button', { class: 'btn sm', onclick: () => { store.dispatch({ type: 'remove_seam', id: seam.id }); closeConn(); picked = null; toast(`Connection ${letter(i)} removed`); } }, 'Remove connection'));
    conn.hidden = false;
    void p;
  }
  const btn = (label, title, on, fn) => { const b = document.createElement('button'); b.className = `btn sm ${on ? 'primary' : ''}`; b.textContent = label; b.title = title; b.onclick = (e) => { e.stopPropagation(); fn(); renderBar(); draw(); }; return b; };
  function renderBar() {
    const p = store.get();
    const n = p.mode === 'jewelry' ? 0 : allPieces(p).length;
    bar.replaceChildren(
      btn('All pieces', 'Show every cut piece laid flat', opt.mode === 'all', () => { opt.mode = 'all'; setTimeout(fit, 0); }),
      btn('One piece', 'Step through the pieces one at a time', opt.mode === 'one', () => { opt.mode = 'one'; opt.index = Math.min(opt.index, Math.max(0, n - 1)); setTimeout(fit, 0); }),
      ...(opt.mode === 'one' ? [btn('◀', 'Previous piece', false, () => { opt.index = (opt.index - 1 + n) % Math.max(1, n); setTimeout(fit, 0); }), btn('▶', 'Next piece', false, () => { opt.index = (opt.index + 1) % Math.max(1, n); setTimeout(fit, 0); })] : []),
      btn('Marker', 'Lay the pieces on the fabric width (grain kept) and report how much fabric one garment needs', opt.mode === 'marker', () => { if (opt.mode === 'marker') { const w = Number(prompt('Usable fabric width (cm)', opt.fabricWidth)); if (w > 30) opt.fabricWidth = w; } opt.mode = 'marker'; setTimeout(fit, 0); }),
      ...(grade ? [btn('Grading', 'Overlay every size of each piece (the grade nest)', opt.grading, () => { opt.grading = !opt.grading; })] : []),
      btn('Seam allowance', 'Cut line = stitch line + seam allowance', opt.allowance, () => { opt.allowance = !opt.allowance; }),
      btn('Stitch lines', 'Sewing lines, topstitching and seam letters', opt.stitch, () => { opt.stitch = !opt.stitch; }),
      btn('Details', 'Pockets, plackets, buttons and other placements', opt.details, () => { opt.details = !opt.details; }),
      btn('✎ Draw piece', 'Click to place points; double-click (or click the first point) to close the piece', opt.tool === 'draw', () => { opt.tool = opt.tool === 'draw' ? 'edit' : 'draw'; draft = []; sewA = null; }),
      btn('⧓ Sew edges', 'Click one edge, then the edge it is sewn to', opt.tool === 'sew', () => { opt.tool = opt.tool === 'sew' ? 'edit' : 'sew'; sewA = null; draft = []; }),
      btn('? How to', 'How to draw pieces, connect them and edit connections', !help.hidden, () => { help.hidden = !help.hidden; }),
      btn('Blank canvas', 'Start a design from scratch with no pieces', false, () => { if (confirm('Start a blank design? Your current design stays in undo and in your collection if saved.')) { store.dispatch({ type: 'new_blank' }); opt.tool = 'draw'; } }),
    );
  }

  const dpr = () => Math.min(2, devicePixelRatio || 1);
  function resize() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, r.width * dpr()); canvas.height = Math.max(1, r.height * dpr());
    const pr = canvas.parentElement.getBoundingClientRect();
    bar.style.left = `${r.left - pr.left + 8}px`; bar.style.top = `${r.top - pr.top + 8}px`; bar.style.maxWidth = `${Math.max(120, r.width - 16)}px`;
    bar.style.display = r.width > 2 && getComputedStyle(canvas).display !== 'none' ? 'flex' : 'none';
    for (const el2 of [help, conn]) { el2.style.left = `${r.left - pr.left + 10}px`; el2.style.maxWidth = `${Math.max(200, Math.min(380, r.width - 20))}px`; if (bar.style.display === 'none') el2.hidden = true; }
    help.style.top = `${r.top - pr.top + 92}px`; conn.style.top = `${r.top - pr.top + 92}px`; conn.style.left = `${Math.max(r.left - pr.left + 10, r.right - pr.left - 330)}px`;
    draw();
  }
  new ResizeObserver(resize).observe(canvas);

  /** Everything that is cut: the garment pieces, then pocket bags, welts, flaps and facings. */
  // Nothing is left out: main pieces, then every sewn-on piece (collar and stand, plackets, cuffs, bands,
  // waistbands, yokes, lapel facings, epaulettes, flaps, straps, tabs), then pocket bags, welts and facings.
  let cache = { key: null, list: [] };
  const allPieces = (p) => {
    if (cache.key === p) return cache.list;
    const small = cutList(p).filter((c) => c.kind === 'overlay').map((c) => ({ id: `cut-${c.id}`, name: c.name, points: c.points, fabric: c.fabric, cut: c.qty, role: 'piece', piece: true, note: c.note || `Sewn onto ${c.panel?.name || 'the garment'}; its position is drawn dashed on that piece.` }));
    cache = { key: p, list: [...p.panels, ...small, ...(p.pieces || []).map((k) => ({ ...k, role: 'piece', piece: true }))] };
    return cache.list;
  };
  const shown = (p) => { const all = allPieces(p); return opt.mode === 'one' ? all.slice(opt.index, opt.index + 1) : all; };
  const GRADE_COLORS = ['#8a3ffc', '#2f6bff', '#00a3a3', '#1f8a4c', '#c79a00', '#ff5a1f', '#d6336c', '#6b4f2a', '#5f6caf'];
  /** Shelf layout: pieces in rows, wrapped to a comfortable sheet width. */
  function computeLayout(p) {
    layout = [];
    let pans = shown(p);
    if (opt.mode === 'marker') pans = [...pans].sort((a, b) => (Math.max(...b.points.map((q) => q[1])) - Math.min(...b.points.map((q) => q[1]))) - (Math.max(...a.points.map((q) => q[1])) - Math.min(...a.points.map((q) => q[1]))));
    const total = pans.reduce((s, pan) => s + (Math.max(...pan.points.map((q) => q[0])) - Math.min(...pan.points.map((q) => q[0]))) + 14, 0);
    const mk = opt.mode === 'marker';
    const sheet = mk ? opt.fabricWidth : Math.max(150, Math.sqrt(total * 90) * 1.25);
    const gapX = mk ? 2 : 14; const gapY = mk ? 2 : 16; // marker: pieces sit 1 cm apart beyond their seam allowances
    if (mk && pans.length) { nestMarker(pans, sheet); return; }
    let x = mk ? 1.5 : 0; let y = mk ? 1.5 : 0; let rowH = 0; let area = 0;
    for (const pan of pans) {
      const xs = pan.points.map((q) => q[0]); const ys = pan.points.map((q) => q[1]);
      const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
      const w = maxX - minX; const h = maxY - minY;
      if (x > (mk ? 1.5 : 0) && x + w > sheet) { x = mk ? 1.5 : 0; y += rowH + gapY; rowH = 0; }
      layout.push({ id: pan.id, ox: x - minX, oy: y + maxY, w, h, x0: x, y0: y });
      x += w + gapX; rowH = Math.max(rowH, h);
      let A = 0; for (let i = 0; i < pan.points.length; i++) { const a = pan.points[i]; const b = pan.points[(i + 1) % pan.points.length]; A += a[0] * b[1] - b[0] * a[1]; } area += Math.abs(A) / 2;
    }
    layout.W = mk ? sheet : Math.max(...layout.map((L) => L.x0 + L.w), 10); layout.H = y + rowH + (mk ? 1.5 : 0);
    marker = mk && pans.length ? { length: layout.H, efficiency: area / (sheet * layout.H), area } : null;
  }
  /**
   * Nested marker: every piece keeps its grain (it may only be turned end for end) and is slid up
   * against the true outlines of the pieces already laid, so curves interlock: a sleeve head nests
   * into an armhole, a crotch curve into a waist. Pieces sit 1 cm apart.
   */
  function nestMarker(pans, sheet) {
    const CELL = 0.5; const cols = Math.max(4, Math.floor(sheet / CELL)); const sky = new Float32Array(cols).fill(1); let area = 0; const oneWay = opt.oneWay === true;
    const prof = (pan) => { const xs = pan.points.map((q) => q[0]); const ys = pan.points.map((q) => q[1]); const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys); const wc = Math.max(1, Math.ceil((maxX - minX) / CELL)); const lo = new Float32Array(wc).fill(1e9); const hi = new Float32Array(wc).fill(-1e9); const n = pan.points.length;
      for (let i = 0; i < n; i++) { const a = pan.points[i]; const b = pan.points[(i + 1) % n]; const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELL * 0.5))); for (let k = 0; k <= steps; k++) { const px = a[0] + ((b[0] - a[0]) * k) / steps; const py = a[1] + ((b[1] - a[1]) * k) / steps; const c = Math.min(wc - 1, Math.max(0, Math.floor((px - minX) / CELL))); if (py < lo[c]) lo[c] = py; if (py > hi[c]) hi[c] = py; } }
      for (let c = 0; c < wc; c++) if (lo[c] > 1e8) { lo[c] = c ? lo[c - 1] : minY; hi[c] = c ? hi[c - 1] : maxY; }
      let A = 0; for (let i = 0; i < n; i++) { const a = pan.points[i]; const b = pan.points[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
      return { pan, minX, maxX, minY, maxY, wc, lo, hi, w: maxX - minX, h: maxY - minY, A: Math.abs(A) / 2 }; };
    const items = pans.map(prof).sort((a, b) => b.A - a.A);
    for (const it of items) {
      area += it.A; let best = null; const pad = 2; // one cell either side: 1 cm between neighbours
      for (const flip of oneWay ? [false] : [false, true]) {
        // distance from the top of the piece to its upper and lower outline, per column, as laid
        const top = new Float32Array(it.wc + 2 * pad); const bot = new Float32Array(it.wc + 2 * pad);
        for (let c = 0; c < it.wc + 2 * pad; c++) { let t = 1e9; let b = -1e9; for (let d = -pad; d <= pad; d++) { const k = c - pad + d; if (k < 0 || k >= it.wc) continue; const src = flip ? it.wc - 1 - k : k; const tt = flip ? it.lo[src] - it.minY : it.maxY - it.hi[src]; const bb = flip ? it.hi[src] - it.minY : it.maxY - it.lo[src]; if (tt < t) t = tt; if (bb > b) b = bb; } top[c] = t > 1e8 ? it.h : t; bot[c] = b < -1e8 ? 0 : b; }
        for (let x = 0; x + it.wc + 2 * pad <= cols || x === 0; x++) { let y = 1; for (let c = 0; c < it.wc + 2 * pad && x + c < cols; c++) { const need = sky[x + c] - top[c]; if (need > y) y = need; } const score = y + it.h + x * 0.002; if (!best || score < best.score) best = { x, y, flip, top, bot, score }; if (x + it.wc + 2 * pad >= cols) break; }
      }
      for (let c = 0; c < it.wc + 2 * best.pad || c < best.bot.length; c++) { if (best.x + c >= cols || c >= best.bot.length) break; const v = best.y + best.bot[c] + 1; if (v > sky[best.x + c]) sky[best.x + c] = v; }
      const x0 = (best.x + 2) * CELL; // the pad columns on the left
      layout.push(best.flip ? { id: it.pan.id, flip: true, ox: x0 + it.maxX, oy: best.y - it.minY, w: it.w, h: it.h, x0, y0: best.y } : { id: it.pan.id, ox: x0 - it.minX, oy: best.y + it.maxY, w: it.w, h: it.h, x0, y0: best.y });
    }
    layout.W = sheet; layout.H = Math.max(...layout.map((L) => L.y0 + L.h)) + 1;
    marker = { length: layout.H, efficiency: area / (sheet * layout.H), area, nested: true };
  }
  const toScreen = (L, [px, py]) => (L.flip ? [(L.ox - px) * view.s + view.x, (L.oy + py) * view.s + view.y] : [(L.ox + px) * view.s + view.x, (L.oy - py) * view.s + view.y]);
  const toLocal = (L, sx, sy) => (L.flip ? [L.ox - (sx - view.x) / view.s, (sy - view.y) / view.s - L.oy] : [(sx - view.x) / view.s - L.ox, L.oy - (sy - view.y) / view.s]);
  const toSheet = (sx, sy) => [(sx - view.x) / view.s, -(sy - view.y) / view.s];

  function fit() {
    const p = store.get(); if (p.mode === 'jewelry') return;
    computeLayout(p);
    const r = canvas.getBoundingClientRect();
    if (!p.panels.length) { view.s = 4; view.x = r.width / 2; view.y = r.height / 2; draw(); return; }
    view.s = Math.max(0.3, Math.min((r.width - 60) / Math.max(layout.W, 1), (r.height - 130) / Math.max(layout.H, 1)));
    view.x = (r.width - layout.W * view.s) / 2; view.y = 64 + (r.height - 110 - layout.H * view.s) / 2;
    draw();
  }

  /** Seam side lookup: which seam (index, side) owns edge e of a panel. */
  function seamSides(p, pan) {
    const map = new Map(); const n = pan.points.length;
    p.seams.forEach((s, i) => { for (const side of ['a', 'b']) { if (s[side].panel !== pan.id) continue; const to = s[side].to ?? s[side].edge; for (let e = s[side].edge, k = 0; k < n; e++, k++) { map.set(e % n, { seam: s, i, side }); if (e % n === to % n) break; } } });
    return map;
  }
  const hemLike = (pan, e) => { const n = pan.points.length; const a = pan.points[e]; const b = pan.points[(e + 1) % n]; const ys = pan.points.map((q) => q[1]); const minY = Math.min(...ys); return pan.role !== 'sleeve' && Math.abs(a[1] - minY) < 2.5 && Math.abs(b[1] - minY) < 2.5; };

  function draw() {
    const p = store.get();
    g.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    const r = canvas.getBoundingClientRect();
    const css = getComputedStyle(document.documentElement);
    const surface = css.getPropertyValue('--surface') || '#fff'; const text = css.getPropertyValue('--text') || '#111'; const muted = css.getPropertyValue('--muted') || '#777';
    g.fillStyle = surface; g.fillRect(0, 0, r.width, r.height);
    if (p.mode === 'jewelry') { g.fillStyle = muted; g.font = '13px sans-serif'; g.fillText('The flat pattern view is for garments. Jewelry uses the 3D view and custom-shape tools.', 16, 60); return; }
    computeLayout(p);
    // grid (10 cm)
    g.strokeStyle = 'rgba(128,128,128,.12)'; g.lineWidth = 1;
    const step = 10 * view.s;
    if (step > 6) { for (let x = ((view.x % step) + step) % step; x < r.width; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, r.height); g.stroke(); } for (let y = ((view.y % step) + step) % step; y < r.height; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(r.width, y); g.stroke(); } }
    const SA = p.production?.seamAllowance ?? 1; const HEM = p.production?.hemAllowance ?? 2.5;
    // marker: the fabric, selvedge to selvedge
    if (opt.mode === 'marker' && marker) {
      const x0 = view.x; const y0 = view.y; const w = opt.fabricWidth * view.s; const hgt = marker.length * view.s;
      g.fillStyle = 'rgba(47,107,255,.05)'; g.fillRect(x0, y0, w, hgt); g.strokeStyle = '#2f6bff'; g.lineWidth = 1.5; g.strokeRect(x0, y0, w, hgt);
      g.fillStyle = '#2f6bff'; g.font = '600 12px sans-serif'; g.fillText(`Fabric ${opt.fabricWidth} cm wide · ${(marker.length / 100).toFixed(2)} m needed for one garment · nested marker, ${(marker.efficiency * 100).toFixed(0)}% of the cloth used (grain kept; pieces may be turned end for end, 1 cm apart)`, x0, y0 - 8);
    }
    const sizes = opt.grading && grade ? grade(p) : null;
    for (const pan of shown(p)) {
      const L = layout.find((l) => l.id === pan.id); if (!L) continue;
      const n = pan.points.length;
      const pts = pan.points.map((q) => toScreen(L, q));
      const sides = seamSides(p, pan);
      // grade nest: this piece in every size, stacked on the same origin
      if (sizes) sizes.forEach((sz, k) => { const gp = sz.panels.find((x) => x.id === pan.id); if (!gp || sz.current) return; const q = gp.points.map((pt) => toScreen(L, pt)); g.strokeStyle = GRADE_COLORS[k % GRADE_COLORS.length]; g.lineWidth = 0.9; g.setLineDash([]); g.beginPath(); q.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); const top = q.reduce((b, c) => (c[1] < b[1] ? c : b)); g.fillStyle = GRADE_COLORS[k % GRADE_COLORS.length]; g.font = '9px sans-serif'; g.fillText(sz.size, top[0] + 3, top[1] - 2); });
      // cut line = stitch line + allowance (hems deeper, raw / bound edges none)
      if (opt.allowance) {
        const cut = offsetOutline(pan.points, (e) => (hemLike(pan, e) && !sides.has(e) ? HEM : SA)).map((q) => toScreen(L, q));
        g.beginPath(); cut.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
        g.fillStyle = 'rgba(255,90,31,.05)'; g.fill();
        g.strokeStyle = text; g.lineWidth = 1.4; g.setLineDash([]); g.stroke();
      }
      // stitch line (the drafted outline)
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
      if (!opt.allowance) { g.fillStyle = 'rgba(255,90,31,.06)'; g.fill(); }
      g.strokeStyle = opt.allowance ? muted : text; g.lineWidth = opt.allowance ? 1 : 1.3; g.setLineDash(opt.allowance ? [5, 3] : []); g.stroke(); g.setLineDash([]);
      for (const hole of pan.holes || []) { g.strokeStyle = '#d0202e'; g.lineWidth = 1.4; g.setLineDash([]); g.beginPath(); hole.forEach((q, i) => { const [x, y] = toScreen(L, q); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fillStyle = css.getPropertyValue('--surface') || '#fff'; g.fill(); g.stroke(); const [hx, hy] = toScreen(L, hole[0]); g.fillStyle = '#d0202e'; g.font = '10px sans-serif'; g.fillText('✂ cut out', hx + 4, hy); }
      // seams: coloured, lettered, notched
      if (opt.stitch) {
        const done = new Set();
        for (let e = 0; e < n; e++) {
          const sd = sides.get(e); if (!sd) continue;
          const hot = picked && picked.seam === sd.seam.id;
          g.strokeStyle = COLORS[sd.i % COLORS.length]; g.lineWidth = hot ? 5 : 2.6;
          g.beginPath(); g.moveTo(...pts[e]); g.lineTo(...pts[(e + 1) % n]); g.stroke();
          const key = `${sd.i}${sd.side}`; if (done.has(key)) continue; done.add(key);
          // notch + letter at the middle of the seam run
          const s = sd.seam[sd.side]; const to = s.to ?? s.edge; const run = [];
          for (let k = s.edge, c = 0; c < n; k++, c++) { run.push(k % n); if (k % n === to % n) break; }
          let len = 0; const segs = run.map((k) => { const a = pan.points[k]; const b = pan.points[(k + 1) % n]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]); len += l; return [a, b, l]; });
          let acc = 0; let mid = segs[0][0]; let dir = [1, 0];
          for (const [a, b, l] of segs) { if (acc + l >= len / 2) { const u = l ? (len / 2 - acc) / l : 0; mid = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; dir = [(b[0] - a[0]) / (l || 1), (b[1] - a[1]) / (l || 1)]; break; } acc += l; }
          const [mx, my] = toScreen(L, mid); const nx = -dir[1]; const ny = -dir[0];
          g.lineWidth = 1.6; g.beginPath(); g.moveTo(mx - nx * 5, my - ny * 5); g.lineTo(mx + nx * 5, my + ny * 5); g.stroke();
          g.fillStyle = COLORS[sd.i % COLORS.length]; g.font = '700 11px sans-serif'; g.textAlign = 'center';
          let A = 0; for (let i = 0; i < n; i++) { const a = pan.points[i]; const b = pan.points[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
          const inward = A > 0 ? [-dir[1], dir[0]] : [dir[1], -dir[0]];
          g.fillText(`${letter(sd.i)}${sd.seam.closure ? ' (opening)' : ''}`, mx + inward[0] * 11, my - inward[1] * 11 + 4);
          if (opt.mode === 'one') { g.font = '10px sans-serif'; g.fillText(`${len.toFixed(1)} cm`, mx + inward[0] * 26, my - inward[1] * 26 + 4); }
        }
      }
      // fastened overlaps (button stands): the line both layers are stitched / buttoned through
      for (const at of pan.attach || []) { g.strokeStyle = '#2f6bff'; g.setLineDash([2, 4]); g.lineWidth = 1.2; g.beginPath(); at.pts.forEach((q, i) => { const [x, y] = toScreen(L, q); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]); }
      if (opt.details) {
        // sewn-on pieces and placements
        g.lineWidth = 1;
        for (const o of p.overlays || []) {
          if (o.panel !== pan.id || o.hidden) continue;
          const op = o.points.map((q) => toScreen(L, q));
          g.setLineDash(o.inside ? [2, 3] : [4, 3]); g.strokeStyle = o.inside ? 'rgba(47,107,255,.8)' : 'rgba(110,110,110,.9)';
          g.beginPath(); op.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
          if (opt.mode === 'one' && view.s > 3) { const cx = op.reduce((s, q) => s + q[0], 0) / op.length; const cy = op.reduce((s, q) => s + q[1], 0) / op.length; g.fillStyle = muted; g.font = '10px sans-serif'; g.textAlign = 'center'; g.fillText(`${o.inside ? 'inside ' : ''}${o.style && o.style !== o.kind ? `${o.style} ` : ''}${o.kind}`, cx, cy + 3); }
        }
        g.setLineDash([]);
        for (const t of p.trims) {
          if (t.panel !== pan.id) continue;
          if (t.type === 'cut-line') { g.strokeStyle = '#d0202e'; g.lineWidth = 1.6; g.setLineDash([]); g.beginPath(); t.path.forEach((q, i) => { const [x, y] = toScreen(L, q); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); const [sx, sy] = toScreen(L, t.path[0]); g.fillStyle = '#d0202e'; g.font = '10px sans-serif'; g.fillText('✂ slash', sx, sy - 5); g.lineWidth = 1; continue; }
          if (t.path) { g.strokeStyle = 'rgba(200,145,47,.9)'; g.setLineDash([3, 2]); g.beginPath(); t.path.forEach((q, i) => { const [x, y] = toScreen(L, q); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]); continue; }
          if (!t.at) continue;
          const [x, y] = toScreen(L, t.at);
          if (t.to) { const [x2, y2] = toScreen(L, t.to); g.strokeStyle = '#2f6bff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); g.lineWidth = 1; } else { g.strokeStyle = '#2f6bff'; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.moveTo(x, y - 4); g.lineTo(x, y + 4); g.stroke(); g.beginPath(); g.arc(x, y, 3, 0, 7); g.stroke(); }
        }
      }
      // hem / neck / cuff topstitching
      if (opt.stitch) for (const [where, path] of Object.entries(pan.edges || {})) { if (!path || path.length < 2 || where === 'armhole') continue; g.strokeStyle = 'rgba(200,145,47,.7)'; g.setLineDash([3, 2]); g.lineWidth = 1; const up = where === 'hem' || where === 'leg' ? 1 : -1; g.beginPath(); path.forEach((q, i) => { const [x, y] = toScreen(L, [q[0], q[1] + up * (where === 'hem' ? 1.5 : 0.6)]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.setLineDash([]); }
      // points
      if (opt.tool === 'edit' && view.s > 1.6) for (const [x, y] of pts) { g.fillStyle = surface; g.strokeStyle = text; g.lineWidth = 1; g.beginPath(); g.arc(x, y, opt.mode === 'one' ? 3.5 : 2.6, 0, 7); g.fill(); g.stroke(); }
      // grainline + label
      const xs = pts.map((q) => q[0]); const ys = pts.map((q) => q[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2; const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const gl = Math.min(18 * view.s, (Math.max(...ys) - Math.min(...ys)) * 0.3);
      const horiz = pan.role === 'sleeve'; // sleeves are drafted with the grain along x
      g.strokeStyle = text; g.fillStyle = text; g.lineWidth = 1;
      const gx = cx + (horiz ? 0 : Math.min(18, (Math.max(...xs) - Math.min(...xs)) * 0.18)); const gy = cy + (horiz ? 16 : 0);
      const a = horiz ? [gx - gl, gy] : [gx, gy - gl]; const b = horiz ? [gx + gl, gy] : [gx, gy + gl];
      g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
      for (const [q, s] of [[a, -1], [b, 1]]) { g.beginPath(); if (horiz) { g.moveTo(q[0], q[1]); g.lineTo(q[0] - s * 6, q[1] - 3); g.lineTo(q[0] - s * 6, q[1] + 3); } else { g.moveTo(q[0], q[1]); g.lineTo(q[0] - 3, q[1] - s * 6); g.lineTo(q[0] + 3, q[1] - s * 6); } g.closePath(); g.fill(); }
      g.font = '600 12px sans-serif'; g.textAlign = 'center';
      g.fillText(pan.name, cx - (horiz ? 0 : 6), cy - 6);
      g.font = '10.5px sans-serif'; g.fillStyle = muted;
      const fabName = (p.customFabrics?.[pan.fabric]?.name) || pan.fabric;
      g.fillText(`Cut ${pan.cut || 1} · ${fabName}${pan.lining ? ' + lining' : ''}`, cx - (horiz ? 0 : 6), cy + 8);
      if (opt.mode === 'one') { let area = 0; for (let i = 0; i < n; i++) { const p0 = pan.points[i]; const p1 = pan.points[(i + 1) % n]; area += p0[0] * p1[1] - p1[0] * p0[1]; } g.fillText(`${(Math.max(...pan.points.map((q) => q[0])) - Math.min(...pan.points.map((q) => q[0]))).toFixed(1)} × ${(Math.max(...pan.points.map((q) => q[1])) - Math.min(...pan.points.map((q) => q[1]))).toFixed(1)} cm · ${(Math.abs(area) / 2 / 1e4).toFixed(3)} m²`, cx - (horiz ? 0 : 6), cy + 22); }
      g.textAlign = 'left';
    }
    // piece being drawn
    if (draft.length) {
      g.strokeStyle = '#ff5a1f'; g.lineWidth = 1.6; g.setLineDash([]);
      g.beginPath(); draft.forEach(([x, y], i) => { const sx = x * view.s + view.x; const sy = -y * view.s + view.y; i ? g.lineTo(sx, sy) : g.moveTo(sx, sy); }); g.stroke();
      for (const [x, y] of draft) { g.fillStyle = '#ff5a1f'; g.beginPath(); g.arc(x * view.s + view.x, -y * view.s + view.y, 3.5, 0, 7); g.fill(); }
    }
    const pan0 = opt.mode === 'one' ? shown(p)[0] : null;
    // legend / status
    g.fillStyle = muted; g.font = '12px sans-serif';
    const tip = opt.tool === 'draw' ? `Drawing a piece: click to add points (${draft.length} so far), double-click or click the first point to close. Esc cancels.`
      : opt.tool === 'sew' ? (sewA ? 'Now click the edge it is sewn to.' : 'Sew: click the first edge.')
      : picked ? picked.text
      : !p.panels.length ? 'Blank canvas. Use "Draw piece" to draft your first pattern piece, then "Sew edges" to join pieces.'
      : `Solid = cut line · dashed = stitch line (${SA} cm seam allowance, ${HEM} cm hems) · same letter = sewn together · grid = 10 cm`;
    g.fillText(tip, 12, r.height - 10);
    if (opt.mode === 'one' && pan0) { g.fillStyle = muted; g.font = '12px sans-serif'; g.fillText(pan0.note || '', 12, r.height - 28); }
    if (opt.mode === 'one' && p.panels.length) { g.textAlign = 'right'; g.fillText(`Piece ${opt.index + 1} of ${allPieces(p).length}`, r.width - 12, r.height - 10); g.textAlign = 'left'; }
  }

  function hit(sx, sy, pointsToo = true) {
    const p = store.get(); if (p.mode === 'jewelry') return null;
    if (pointsToo) for (const pan of shown(p)) {
      if (pan.piece) continue;
      const L = layout.find((l) => l.id === pan.id); if (!L) continue;
      for (let i = 0; i < pan.points.length; i++) { const [x, y] = toScreen(L, pan.points[i]); if (Math.hypot(x - sx, y - sy) < 9) return { kind: 'point', pan, L, i }; }
    }
    for (const pan of shown(p)) {
      if (pan.piece) continue;
      const L = layout.find((l) => l.id === pan.id); if (!L) continue; const n = pan.points.length;
      for (let i = 0; i < n; i++) {
        const [ax, ay] = toScreen(L, pan.points[i]); const [bx, by] = toScreen(L, pan.points[(i + 1) % n]);
        const t = Math.max(0, Math.min(1, ((sx - ax) * (bx - ax) + (sy - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
        if (Math.hypot(ax + (bx - ax) * t - sx, ay + (by - ay) * t - sy) < 7) return { kind: 'edge', pan, L, i };
      }
    }
    return null;
  }
  /** Extend a clicked edge to the whole straight / smooth run between corners, so a seam covers the full side. */
  function edgeRun(pan, e) {
    const n = pan.points.length;
    const turn = (i) => { const a = pan.points[(i - 1 + n) % n]; const b = pan.points[i]; const c = pan.points[(i + 1) % n]; const ux = b[0] - a[0]; const uy = b[1] - a[1]; const vx = c[0] - b[0]; const vy = c[1] - b[1]; return (ux * vx + uy * vy) / ((Math.hypot(ux, uy) || 1) * (Math.hypot(vx, vy) || 1)); };
    let s = e; let t = e;
    for (let k = 0; k < n && turn(s) > 0.9; k++) s = (s - 1 + n) % n;
    for (let k = 0; k < n && turn((t + 1) % n) > 0.9; k++) t = (t + 1) % n;
    return { edge: s, to: t };
  }
  function closeDraft() {
    if (draft.length < 3) { toast('A piece needs at least three points'); return; }
    const xs = draft.map((q) => q[0]); const ys = draft.map((q) => q[1]);
    const minX = (Math.min(...xs) + Math.max(...xs)) / 2; const minY = Math.min(...ys);
    const p = store.get(); const back = p.panels.filter((x) => x.custom).length % 2 === 1;
    // centre the piece on x = 0 with its lowest point at y = 0, and wear it at chest height (front, then back, alternating)
    store.dispatch({ type: 'add_panel', name: `Piece ${p.panels.length + 1}${back ? ' (back)' : ' (front)'}`, points: draft.map(([x, y]) => [Math.round((x - minX) * 2) / 2, Math.round((y - minY) * 2) / 2]), placement: { position: [0, 0.95, back ? -0.22 : 0.22], rotationY: back ? Math.PI : 0, wrap: 0.22, wrapMax: 1.2 } });
    draft = []; opt.tool = 'edit'; renderBar(); setTimeout(fit, 30);
    toast('Piece added. Use "Sew edges" to join it to another piece.');
  }

  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, pos(e));
    const [sx, sy] = pos(e);
    if (pointers.size !== 1) return;
    if (opt.tool === 'draw') { drag = { kind: 'draw', sx, sy, vx: view.x, vy: view.y, moved: false }; return; }
    const h = hit(sx, sy, opt.tool === 'edit');
    if (opt.tool === 'sew') { drag = { kind: 'sewclick', sx, sy, vx: view.x, vy: view.y, h, moved: false }; return; }
    drag = h?.kind === 'point' ? { ...h, moved: false } : { kind: 'pan', sx, sy, vx: view.x, vy: view.y, h, moved: false };
    if (h?.kind === 'point') longPress = setTimeout(() => { store.dispatch({ type: 'delete_point', panel: h.pan.id, index: h.i }); drag = null; }, 650);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId); pointers.set(e.pointerId, pos(e));
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const other = a === pointers.get(e.pointerId) ? b : a;
      const d1 = Math.hypot(a[0] - b[0], a[1] - b[1]); const d0 = Math.hypot(prev[0] - other[0], prev[1] - other[1]);
      if (d0 > 0) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d1 / d0);
      return;
    }
    if (!drag) return;
    const [sx, sy] = pos(e);
    clearTimeout(longPress);
    if (drag.kind === 'pan' || drag.kind === 'draw' || drag.kind === 'sewclick') { if (Math.hypot(sx - drag.sx, sy - drag.sy) > 4) drag.moved = true; if (drag.moved) { view.x = drag.vx + sx - drag.sx; view.y = drag.vy + sy - drag.sy; draw(); } return; }
    drag.moved = true;
    const [lx, ly] = toLocal(drag.L, sx, sy);
    drag.pan.points[drag.i] = [Math.round(lx * 2) / 2, Math.round(ly * 2) / 2]; // preview (0.5 cm snap)
    draw();
  });
  const end = (e) => {
    clearTimeout(longPress);
    pointers.delete(e.pointerId);
    const d = drag; drag = null;
    if (!d) return;
    if (d.kind === 'point' && d.moved) { store.dispatch({ type: 'move_point', panel: d.pan.id, index: d.i, to: d.pan.points[d.i] }); return; }
    if (d.moved) return;
    if (d.kind === 'draw') {
      const [x, y] = toSheet(d.sx, d.sy);
      if (draft.length >= 3 && Math.hypot((draft[0][0] - x) * view.s, (draft[0][1] - y) * view.s) < 10) { closeDraft(); draw(); return; }
      draft.push([Math.round(x * 2) / 2, Math.round(y * 2) / 2]); draw(); return;
    }
    if (d.kind === 'sewclick') {
      if (d.h?.kind !== 'edge') return;
      const run = { panel: d.h.pan.id, ...edgeRun(d.h.pan, d.h.i) };
      if (!sewA) { sewA = run; draw(); return; }
      const r = store.dispatch({ type: 'add_seam', a: sewA, b: run });
      toast(r[0]?.ok ? 'Edges sewn together' : r[0]?.error || 'Could not sew');
      sewA = null; draw(); return;
    }
    if (d.kind === 'pan' && d.h?.kind === 'edge') {
      // click an edge: show what it sews to
      const p = store.get(); const sd = seamSides(p, d.h.pan).get(d.h.i);
      if (sd) { const o = sd.seam[sd.side === 'a' ? 'b' : 'a']; const op = p.panels.find((x) => x.id === o.panel); { const sA = sd.seam[sd.side]; const n2 = d.h.pan.points.length; let L2 = 0; const to2 = sA.to ?? sA.edge; for (let e2 = sA.edge, c2 = 0; c2 < n2; e2++, c2++) { const q0 = d.h.pan.points[e2 % n2]; const q1 = d.h.pan.points[(e2 + 1) % n2]; L2 += Math.hypot(q1[0] - q0[0], q1[1] - q0[1]); if (e2 % n2 === to2 % n2) break; } openConn(sd.seam, sd.i, d.h.pan, op, L2); } picked = { seam: sd.seam.id, text: `Seam ${letter(sd.i)}: ${d.h.pan.name} ↔ ${op?.name || o.panel} · ${sd.seam.stitch} · thread ${sd.seam.thread || 'poly-corespun'}` }; } else picked = { seam: null, text: `${d.h.pan.name}: this edge is not sewn (hem, opening or free edge).` };
      draw();
    } else if (d.kind === 'pan') { picked = null; closeConn(); draw(); }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('dblclick', (e) => {
    if (opt.tool === 'draw') { draft.pop(); closeDraft(); draw(); return; }
    if (opt.tool !== 'edit') return;
    const [sx, sy] = pos(e); const h = hit(sx, sy);
    if (h?.kind === 'edge') { const [lx, ly] = toLocal(h.L, sx, sy); store.dispatch({ type: 'insert_point', panel: h.pan.id, edge: h.i, at: [Math.round(lx * 2) / 2, Math.round(ly * 2) / 2] }); }
  });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (opt.tool !== 'edit') return;
    const [sx, sy] = pos(e); const h = hit(sx, sy);
    if (h?.kind === 'point') store.dispatch({ type: 'delete_point', panel: h.pan.id, index: h.i });
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && (draft.length || sewA || opt.tool !== 'edit')) { draft = []; sewA = null; opt.tool = 'edit'; renderBar(); draw(); } });
  function zoomAt(sx, sy, f) { const ns = Math.max(0.3, Math.min(40, view.s * f)); view.x = sx - ((sx - view.x) * ns) / view.s; view.y = sy - ((sy - view.y) * ns) / view.s; view.s = ns; draw(); }
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const [sx, sy] = pos(e); zoomAt(sx, sy, e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });

  let lastCount = -1;
  store.subscribe(() => { const p = store.get(); const n = p.mode === 'jewelry' ? 0 : allPieces(p).length; if (n !== lastCount) { lastCount = n; opt.index = Math.min(opt.index, Math.max(0, n - 1)); renderBar(); } draw(); });
  renderBar();
  try { if (!localStorage.getItem('gft.s.patternHelp')) { help.hidden = false; localStorage.setItem('gft.s.patternHelp', '1'); renderBar(); } } catch { /* private window */ }
  return { draw, fit, resize, options: opt };
}
