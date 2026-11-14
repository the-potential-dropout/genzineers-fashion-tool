// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * 2D pattern editor (canvas). Drag a point to move it, double-click / double-tap
 * an edge to add a point, right-click / long-press a point to delete it.
 * Wheel / pinch to zoom, drag empty space to pan. Seams are colour-matched.
 */
const COLORS = ['#ff5a1f', '#2f6bff', '#1f8a4c', '#a63fd6', '#c79a00', '#d6336c', '#00a3a3', '#6b4f2a'];

export function createPatternEditor(canvas, store) {
  const g = canvas.getContext('2d');
  let view = { s: 3, x: 40, y: 40 };
  let layout = [];
  let drag = null;
  let pointers = new Map();
  let longPress;

  const dpr = () => Math.min(2, devicePixelRatio || 1);
  function resize() {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, r.width * dpr()); canvas.height = Math.max(1, r.height * dpr());
    draw();
  }
  new ResizeObserver(resize).observe(canvas);

  function computeLayout(p) {
    layout = []; let x = 0;
    for (const pan of p.panels) {
      const xs = pan.points.map((q) => q[0]); const ys = pan.points.map((q) => q[1]);
      const minX = Math.min(...xs); const maxX = Math.max(...xs); const maxY = Math.max(...ys);
      layout.push({ id: pan.id, ox: x - minX, oy: maxY, w: maxX - minX });
      x += maxX - minX + 12;
    }
  }
  const toScreen = (L, [px, py]) => [(L.ox + px) * view.s + view.x, (L.oy - py) * view.s + view.y];
  const toLocal = (L, sx, sy) => [(sx - view.x) / view.s - L.ox, L.oy - (sy - view.y) / view.s];

  function fit() {
    const p = store.get(); if (p.mode === 'jewelry' || !p.panels.length) return;
    computeLayout(p);
    const W = layout.reduce((m, L) => Math.max(m, L.ox + L.w + 1e-9 + (layout.indexOf(L) === layout.length - 1 ? 0 : 0)), 0) + 12;
    const H = Math.max(...p.panels.map((pan) => Math.max(...pan.points.map((q) => q[1])) - Math.min(...pan.points.map((q) => q[1])))) + 12;
    const r = canvas.getBoundingClientRect();
    view.s = Math.max(0.5, Math.min((r.width - 40) / Math.max(W, 1), (r.height - 60) / Math.max(H, 1)));
    view.x = 20; view.y = 30;
    draw();
  }

  function draw() {
    const p = store.get();
    g.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    const r = canvas.getBoundingClientRect();
    const css = getComputedStyle(document.documentElement);
    g.fillStyle = css.getPropertyValue('--surface') || '#fff';
    g.fillRect(0, 0, r.width, r.height);
    if (p.mode === 'jewelry') { g.fillStyle = css.getPropertyValue('--muted'); g.font = '13px sans-serif'; g.fillText('Pattern view is for garments. Jewelry uses the 3D view and custom-shape tools.', 16, 28); return; }
    computeLayout(p);
    // grid (10 cm)
    g.strokeStyle = 'rgba(128,128,128,.12)'; g.lineWidth = 1;
    const step = 10 * view.s;
    for (let x = view.x % step; x < r.width; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, r.height); g.stroke(); }
    for (let y = view.y % step; y < r.height; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(r.width, y); g.stroke(); }
    const seamColor = new Map();
    p.seams.forEach((s, i) => seamColor.set(s.id, COLORS[i % COLORS.length]));
    const text = css.getPropertyValue('--text') || '#111';
    for (const pan of p.panels) {
      const L = layout.find((l) => l.id === pan.id);
      const pts = pan.points.map((q) => toScreen(L, q));
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
      g.fillStyle = 'rgba(255,90,31,.06)'; g.fill();
      g.strokeStyle = text; g.lineWidth = 1.2; g.stroke();
      // seam edges
      for (const s of p.seams) for (const side of ['a', 'b']) {
        if (s[side].panel !== pan.id) continue;
        const n = pan.points.length; const to = s[side].to ?? s[side].edge;
        g.strokeStyle = seamColor.get(s.id); g.lineWidth = 3;
        for (let e = s[side].edge; ; e++) { const a = pts[e % n]; const b = pts[(e + 1) % n]; g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke(); if (e % n === to % n) break; }
      }
      // overlays
      g.setLineDash([4, 3]); g.lineWidth = 1; g.strokeStyle = 'rgba(128,128,128,.8)';
      for (const o of p.overlays || []) { if (o.panel !== pan.id) continue; const op = o.points.map((q) => toScreen(L, q)); g.beginPath(); op.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke(); }
      g.setLineDash([]);
      // trims
      for (const t of p.trims) { if (t.panel !== pan.id) continue; const [x, y] = toScreen(L, t.at); g.fillStyle = '#2f6bff'; g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
      // points
      for (const [x, y] of pts) { g.fillStyle = css.getPropertyValue('--surface') || '#fff'; g.strokeStyle = text; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.stroke(); }
      // label
      const xs = pts.map((q) => q[0]); const ys = pts.map((q) => q[1]);
      g.fillStyle = text; g.font = '600 12px sans-serif'; g.textAlign = 'center';
      g.fillText(pan.name, (Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
      g.textAlign = 'left';
    }
    g.fillStyle = css.getPropertyValue('--muted'); g.font = '12px sans-serif';
    g.fillText('Drag points · double-click edge to add · right-click / long-press point to delete · grid = 10 cm', 12, r.height - 10);
  }

  function hit(sx, sy) {
    const p = store.get(); if (p.mode === 'jewelry') return null;
    for (const pan of p.panels) {
      const L = layout.find((l) => l.id === pan.id);
      for (let i = 0; i < pan.points.length; i++) { const [x, y] = toScreen(L, pan.points[i]); if (Math.hypot(x - sx, y - sy) < 9) return { kind: 'point', pan, L, i }; }
    }
    for (const pan of p.panels) {
      const L = layout.find((l) => l.id === pan.id); const n = pan.points.length;
      for (let i = 0; i < n; i++) {
        const [ax, ay] = toScreen(L, pan.points[i]); const [bx, by] = toScreen(L, pan.points[(i + 1) % n]);
        const t = Math.max(0, Math.min(1, ((sx - ax) * (bx - ax) + (sy - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
        if (Math.hypot(ax + (bx - ax) * t - sx, ay + (by - ay) * t - sy) < 7) return { kind: 'edge', pan, L, i };
      }
    }
    return null;
  }

  const pos = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, pos(e));
    const [sx, sy] = pos(e);
    const h = hit(sx, sy);
    if (pointers.size === 1) {
      drag = h?.kind === 'point' ? { ...h, moved: false } : { kind: 'pan', sx, sy, vx: view.x, vy: view.y };
      if (h?.kind === 'point') longPress = setTimeout(() => { store.dispatch({ type: 'delete_point', panel: h.pan.id, index: h.i }); drag = null; }, 650);
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId); pointers.set(e.pointerId, pos(e));
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d1 = Math.hypot(a[0] - b[0], a[1] - b[1]); const d0 = Math.hypot(prev[0] - (a === pointers.get(e.pointerId) ? b[0] : a[0]), prev[1] - (a === pointers.get(e.pointerId) ? b[1] : a[1]));
      if (d0 > 0) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, d1 / d0);
      return;
    }
    if (!drag) return;
    const [sx, sy] = pos(e);
    clearTimeout(longPress);
    if (drag.kind === 'pan') { view.x = drag.vx + sx - drag.sx; view.y = drag.vy + sy - drag.sy; draw(); return; }
    drag.moved = true;
    const [lx, ly] = toLocal(drag.L, sx, sy);
    drag.pan.points[drag.i] = [Math.round(lx * 2) / 2, Math.round(ly * 2) / 2]; // preview (0.5 cm snap)
    draw();
  });
  const end = (e) => {
    clearTimeout(longPress);
    pointers.delete(e.pointerId);
    if (drag?.kind === 'point' && drag.moved) store.dispatch({ type: 'move_point', panel: drag.pan.id, index: drag.i, to: drag.pan.points[drag.i] });
    drag = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('dblclick', (e) => {
    const [sx, sy] = pos(e); const h = hit(sx, sy);
    if (h?.kind === 'edge') { const [lx, ly] = toLocal(h.L, sx, sy); store.dispatch({ type: 'insert_point', panel: h.pan.id, edge: h.i, at: [Math.round(lx * 2) / 2, Math.round(ly * 2) / 2] }); }
  });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const [sx, sy] = pos(e); const h = hit(sx, sy);
    if (h?.kind === 'point') store.dispatch({ type: 'delete_point', panel: h.pan.id, index: h.i });
  });
  function zoomAt(sx, sy, f) { const ns = Math.max(0.3, Math.min(40, view.s * f)); view.x = sx - ((sx - view.x) * ns) / view.s; view.y = sy - ((sy - view.y) * ns) / view.s; view.s = ns; draw(); }
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); const [sx, sy] = pos(e); zoomAt(sx, sy, e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });

  store.subscribe(() => draw());
  return { draw, fit, resize };
}
