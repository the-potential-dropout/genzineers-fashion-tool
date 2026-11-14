// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Embroidery: design -> stitches -> machine file.
 *
 * A design (lettering, a motif, or uploaded artwork) is rasterised at 5 px/mm,
 * each pixel assigned to a thread colour, then digitised:
 *   fill   tatami rows 0.4 mm apart, 3.5 mm stitches, staggered, serpentine
 *   satin  zig-zag columns across each run (lettering, borders); long runs are split
 *   cross  cross-stitch on a 2 mm grid
 * with an optional underlay pass, jumps and trims between areas, and a colour
 * change per thread. The result is written as Tajima .DST, the format every
 * commercial embroidery machine and digitising program reads, plus a colour
 * sequence sheet (DST itself carries no colours).
 *
 * This is a basic auto-digitiser: it does not add pull compensation or
 * hand-tuned stitch angles. Send the .DST with the colour sheet; an
 * embroiderer will normally run a test sew-out and may refine it.
 */

export const PX_PER_MM = 5;

export const STITCH_TYPES = {
  fill: { name: 'Fill (tatami)', note: 'Rows of staggered stitches. For areas wider than about 8 mm: logos, large letters, shapes.', density: 0.4, len: 3.5 },
  satin: { name: 'Satin (column)', note: 'Glossy zig-zag across the shape. For lettering and borders 1.5-8 mm wide.', density: 0.4, len: 8 },
  cross: { name: 'Cross-stitch', note: 'Crosses on a 2 mm grid; folk and sampler look.', density: 2, len: 2 },
  puff: { name: '3D puff (satin over foam)', note: 'Satin sewn over 2-3 mm foam for raised cap logos. Wide columns, no fine detail.', density: 0.3, len: 9, foam: true },
  applique: { name: 'Appliqué (fabric + satin edge)', note: 'A cut fabric shape tacked down and edged in satin; big shapes with few stitches.', density: 0.4, len: 6, applique: true },
  print: { name: 'Printed (logo / artwork, not stitched)', note: 'A placed print in full colour: DTF or heat transfer for small runs, screen print or DTG for bulk. Any artwork, photo or logo, anywhere on the piece.', density: 0.4, len: 3.5, print: true },
  chenille: { name: 'Chenille / chain (loop pile)', note: 'Looped pile for varsity letters; needs a chenille machine. File gives the fill area.', density: 0.8, len: 3, chenille: true },
};

export const FONTS = {
  block: { name: 'Block', css: '900 100px "Arial Black", Impact, sans-serif' },
  sans: { name: 'Sans', css: '700 100px Arial, Helvetica, sans-serif' },
  serif: { name: 'Serif', css: '700 100px Georgia, "Times New Roman", serif' },
  script: { name: 'Script', css: 'italic 700 100px "Brush Script MT", "Segoe Script", cursive' },
  mono: { name: 'Typewriter', css: '700 100px "Courier New", monospace' },
  varsity: { name: 'Varsity (outlined block)', css: '900 100px "Arial Black", Impact, sans-serif', outline: true },
};

/** Generic thread chart (name, colour). Match to your embroiderer's brand chart (Madeira, Isacord, Robison-Anton...) by eye or by code. */
export const THREADS_EMB = [
  ['White', '#ffffff'], ['Ivory', '#f4eedc'], ['Cream', '#eadfc4'], ['Silver grey', '#b9bcc0'], ['Steel', '#7d848c'], ['Charcoal', '#3c4046'], ['Black', '#111111'],
  ['Lemon', '#f7e04a'], ['Gold', '#e5b12d'], ['Old gold', '#b8892f'], ['Orange', '#f08a24'], ['Burnt orange', '#c8591a'], ['Coral', '#f26d5b'], ['Red', '#d0202e'], ['Cardinal', '#a1182a'], ['Burgundy', '#6e1423'],
  ['Baby pink', '#f6c1cf'], ['Rose', '#e86a92'], ['Fuchsia', '#d12f86'], ['Lilac', '#b9a3d6'], ['Purple', '#6f3fa0'], ['Plum', '#4a2356'],
  ['Sky', '#8fc7ea'], ['Royal blue', '#1f4fbf'], ['Cobalt', '#0b3d91'], ['Navy', '#152447'], ['Teal', '#0f7c82'], ['Turquoise', '#27b3b8'], ['Mint', '#a5e0c2'],
  ['Lime', '#9bd138'], ['Kelly green', '#1f9d4d'], ['Forest', '#1d5b34'], ['Olive', '#6b6b2a'], ['Khaki', '#b7a77a'], ['Tan', '#c79a66'], ['Brown', '#6b4226'], ['Chocolate', '#3e2415'],
  ['Metallic gold', '#d4af37'], ['Metallic silver', '#c8ccd0'], ['Copper', '#b4683a'], ['Neon yellow', '#e6ff3a'], ['Neon pink', '#ff4fa3'], ['Neon green', '#4dff6a'], ['Neon orange', '#ff7a1a'], ['Glow white', '#eef7e6'],
];

export const MOTIFS_EMB = {
  star: 'Star', heart: 'Heart', crown: 'Crown', anchor: 'Anchor', bolt: 'Lightning bolt', laurel: 'Laurel wreath', shield: 'Shield crest', rose: 'Rose', circle: 'Circle patch', diamond: 'Diamond',
};

const hexRgb = (h) => { const v = parseInt(h.replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };

function motifPath(g, id, S) {
  const c = S / 2;
  g.beginPath();
  switch (id) {
    case 'heart': g.moveTo(c, S * 0.86); g.bezierCurveTo(S * 0.02, S * 0.52, S * 0.12, S * 0.1, c, S * 0.32); g.bezierCurveTo(S * 0.88, S * 0.1, S * 0.98, S * 0.52, c, S * 0.86); break;
    case 'crown': g.moveTo(S * 0.12, S * 0.78); g.lineTo(S * 0.08, S * 0.3); g.lineTo(S * 0.3, S * 0.52); g.lineTo(c, S * 0.18); g.lineTo(S * 0.7, S * 0.52); g.lineTo(S * 0.92, S * 0.3); g.lineTo(S * 0.88, S * 0.78); g.closePath(); break;
    case 'anchor': g.arc(c, S * 0.2, S * 0.08, 0, 7); g.rect(c - S * 0.035, S * 0.26, S * 0.07, S * 0.56); g.rect(S * 0.32, S * 0.36, S * 0.36, S * 0.06); g.moveTo(S * 0.16, S * 0.6); g.quadraticCurveTo(S * 0.2, S * 0.92, c, S * 0.9); g.quadraticCurveTo(S * 0.8, S * 0.92, S * 0.84, S * 0.6); g.lineTo(S * 0.76, S * 0.66); g.quadraticCurveTo(S * 0.72, S * 0.82, c, S * 0.82); g.quadraticCurveTo(S * 0.28, S * 0.82, S * 0.24, S * 0.66); g.closePath(); break;
    case 'bolt': g.moveTo(S * 0.58, S * 0.06); g.lineTo(S * 0.24, S * 0.54); g.lineTo(S * 0.46, S * 0.54); g.lineTo(S * 0.38, S * 0.94); g.lineTo(S * 0.76, S * 0.42); g.lineTo(S * 0.54, S * 0.42); g.closePath(); break;
    case 'laurel': for (const sd of [-1, 1]) for (let k = 0; k < 7; k++) { const a = Math.PI * (0.62 + k * 0.11) * 1; const x = c + sd * Math.cos(a - Math.PI / 2) * S * 0.36; const y = c - Math.sin(a - Math.PI / 2) * S * 0.36 + S * 0.04; g.moveTo(x, y); g.ellipse(x, y, S * 0.085, S * 0.035, sd * (a + 0.6), 0, 7); } break;
    case 'shield': g.moveTo(S * 0.14, S * 0.12); g.lineTo(S * 0.86, S * 0.12); g.lineTo(S * 0.86, S * 0.5); g.quadraticCurveTo(S * 0.84, S * 0.8, c, S * 0.94); g.quadraticCurveTo(S * 0.16, S * 0.8, S * 0.14, S * 0.5); g.closePath(); break;
    case 'rose': for (let k = 0; k < 9; k++) { const a = k * 2.4; const rr = S * (0.06 + k * 0.036); g.moveTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); g.ellipse(c + Math.cos(a) * rr * 0.6, c + Math.sin(a) * rr * 0.6, S * (0.1 + k * 0.012), S * (0.065 + k * 0.006), a, 0, 7); } break;
    case 'circle': g.arc(c, c, S * 0.44, 0, 7); break;
    case 'diamond': g.moveTo(c, S * 0.06); g.lineTo(S * 0.92, c); g.lineTo(c, S * 0.94); g.lineTo(S * 0.08, c); g.closePath(); break;
    default: for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? S * 0.19 : S * 0.46; i ? g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr) : g.moveTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); } g.closePath();
  }
}

/**
 * Rasterise a design (browser only). Returns { w, h, data: Uint8Array (thread index, 255 = no stitch), colors, widthMm, heightMm }.
 * design: { kind: 'text'|'motif'|'image', text, font, motif, image (HTMLImageElement), width (cm), colors: [hex...], threads (image: how many) }
 */
export function rasterizeDesign(d) {
  const Wpx = Math.max(20, Math.round((d.width || 8) * 10 * PX_PER_MM));
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d', { willReadFrequently: true });
  let colors = (d.colors && d.colors.length ? d.colors : ['#111111']).slice(0, 15);
  if (d.kind === 'image' && d.image) {
    const ar = d.image.naturalHeight / d.image.naturalWidth || 1;
    cv.width = Wpx; cv.height = Math.max(10, Math.round(Wpx * ar));
    g.drawImage(d.image, 0, 0, cv.width, cv.height);
  } else if (d.kind === 'motif') {
    cv.width = Wpx; cv.height = Wpx;
    g.fillStyle = colors[0]; motifPath(g, d.motif, Wpx); g.fill('nonzero');
    if (colors[1]) { g.strokeStyle = colors[1]; g.lineWidth = Math.max(4, Wpx * 0.035); g.lineJoin = 'round'; motifPath(g, d.motif, Wpx); g.stroke(); }
  } else {
    const font = FONTS[d.font] || FONTS.block;
    const lines = String(d.text || 'TEXT').split('\n').slice(0, 4);
    g.font = font.css;
    const tw = Math.max(...lines.map((l) => g.measureText(l).width), 10);
    const scale = (Wpx * 0.96) / tw; const lh = 118 * scale;
    cv.width = Wpx; cv.height = Math.max(10, Math.round(lh * lines.length + 14 * scale));
    g.setTransform(scale, 0, 0, scale, Wpx * 0.02, 0);
    g.font = font.css; g.textBaseline = 'top'; g.lineJoin = 'round';
    lines.forEach((l, i) => {
      const x = (tw - g.measureText(l).width) / 2; const y = 10 + i * 118;
      const outline = colors[1] && (font.outline || d.outline);
      if (outline) { g.strokeStyle = colors[1]; g.lineWidth = 12; g.strokeText(l, x, y); }
      g.fillStyle = colors[0]; g.fillText(l, x, y);
    });
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  const img = g.getImageData(0, 0, cv.width, cv.height).data;
  const n = cv.width * cv.height;
  if (d.kind === 'image') {
    // pick the artwork's dominant colours as threads (then each can be recoloured)
    const want = Math.max(1, Math.min(15, d.threads || 6));
    const bins = new Map();
    for (let i = 0; i < n; i++) { if (img[i * 4 + 3] < 128) continue; const k = ((img[i * 4] >> 4) << 8) | ((img[i * 4 + 1] >> 4) << 4) | (img[i * 4 + 2] >> 4); const b = bins.get(k) || [0, 0, 0, 0]; b[0]++; b[1] += img[i * 4]; b[2] += img[i * 4 + 1]; b[3] += img[i * 4 + 2]; bins.set(k, b); }
    const top = [...bins.values()].sort((a, b) => b[0] - a[0]);
    const pal = [];
    for (const b of top) { const c = [b[1] / b[0], b[2] / b[0], b[3] / b[0]]; if (pal.every((p) => Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]) > 42)) pal.push(c); if (pal.length >= want) break; }
    const src = pal.map((c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`);
    colors = src.map((c, i) => d.colors?.[i] || c);
    d = { ...d, _src: src };
  }
  const srcRgb = (d._src || colors).map(hexRgb);
  const data = new Uint8Array(n).fill(255);
  for (let i = 0; i < n; i++) {
    if (img[i * 4 + 3] < 128) continue;
    let best = 0; let bd = 1e9;
    for (let c = 0; c < srcRgb.length; c++) { const q = srcRgb[c]; const dd = (img[i * 4] - q[0]) ** 2 + (img[i * 4 + 1] - q[1]) ** 2 + (img[i * 4 + 2] - q[2]) ** 2; if (dd < bd) { bd = dd; best = c; } }
    // a white background in a JPG/flattened logo is cloth, not stitches
    if (d.kind === 'image' && d.dropWhite !== false && img[i * 4] > 244 && img[i * 4 + 1] > 244 && img[i * 4 + 2] > 244) continue;
    data[i] = best;
  }
  return { w: cv.width, h: cv.height, data, colors, widthMm: cv.width / PX_PER_MM, heightMm: cv.height / PX_PER_MM };
}

/**
 * Digitise a raster into machine commands (mm, origin at the design centre, y up).
 * Returns { cmds: [{ t: 'stitch'|'jump'|'trim'|'color', x, y }], stats }.
 */
export function digitize(bmp, { type = 'fill', density, length, underlay = true } = {}) {
  const st = STITCH_TYPES[type] || STITCH_TYPES.fill;
  const mode = type === 'cross' ? 'cross' : type === 'satin' || type === 'puff' ? 'satin' : 'fill';
  const dens = density || st.density; const len = length || st.len;
  const mm = 1 / PX_PER_MM;
  const cmds = []; const used = [];
  const X = (px) => px * mm - bmp.widthMm / 2; const Y = (py) => bmp.heightMm / 2 - py * mm;
  let cx = 0; let cy = 0; let first = true;
  const go = (x, y) => {
    const dist = Math.hypot(x - cx, y - cy);
    if (first || dist > 7) { if (!first) cmds.push({ t: 'trim' }); cmds.push({ t: 'jump', x, y }); } else if (dist > 2.2) cmds.push({ t: 'jump', x, y });
    else if (dist > 0.05) cmds.push({ t: 'stitch', x, y });
    cx = x; cy = y; first = false;
  };
  const sew = (x, y) => { if (Math.hypot(x - cx, y - cy) < 0.05) return; cmds.push({ t: 'stitch', x, y }); cx = x; cy = y; };
  const runsOf = (row, c) => { const out = []; let s = -1; const base = row * bmp.w; for (let x = 0; x <= bmp.w; x++) { const on = x < bmp.w && bmp.data[base + x] === c; if (on && s < 0) s = x; if (!on && s >= 0) { out.push([s, x - 1]); s = -1; } } return out; };
  const pass = (c, rowStepMm, stitchLen, zig) => {
    const step = Math.max(1, Math.round(rowStepMm * PX_PER_MM)); let flip = false; let k = 0;
    for (let row = Math.floor(step / 2); row < bmp.h; row += step, k++) {
      const runs = runsOf(row, c); if (!runs.length) continue;
      if (flip) runs.reverse();
      for (const [a, b] of runs) {
        const x0 = X(a + 0.5); const x1 = X(b + 0.5); const y = Y(row + 0.5); const w = Math.abs(x1 - x0);
        if (w < 0.6) continue;
        const from = flip ? x1 : x0; const to = flip ? x0 : x1; const dir = Math.sign(to - from) || 1;
        go(from, y);
        if (zig && w <= len) sew(to, y - rowStepMm * 0.5); // satin: one stitch across the column, stepping down
        else { const off = zig ? 0 : ((k % 3) / 3) * stitchLen; for (let d = stitchLen - off; d < w - 0.4; d += stitchLen) sew(from + dir * d, y); sew(to, y); }
      }
      flip = !flip;
    }
  };
  for (let c = 0; c < bmp.colors.length; c++) {
    let any = false; for (let i = 0; i < bmp.data.length; i++) if (bmp.data[i] === c) { any = true; break; }
    if (!any) continue;
    if (used.length) { cmds.push({ t: 'trim' }); cmds.push({ t: 'color' }); first = true; }
    used.push(bmp.colors[c]);
    if (mode === 'cross') {
      const cell = Math.round(2 * PX_PER_MM);
      for (let gy = 0; gy + cell <= bmp.h; gy += cell) for (let gx = 0; gx + cell <= bmp.w; gx += cell) {
        if (bmp.data[(gy + (cell >> 1)) * bmp.w + gx + (cell >> 1)] !== c) continue;
        const l = X(gx); const r = X(gx + cell); const t = Y(gy); const b = Y(gy + cell);
        go(l, b); sew(r, t); sew(r, b); sew(l, t);
      }
      continue;
    }
    if (underlay) pass(c, 2.2, 3, false); // stabilising underlay: sparse rows under the top stitching
    pass(c, dens, len, mode === 'satin');
  }
  cmds.push({ t: 'trim' });
  const stitches = cmds.filter((q) => q.t === 'stitch').length;
  let thread = 0; let px = 0; let py = 0;
  for (const q of cmds) { if (q.x == null) continue; if (q.t === 'stitch') thread += Math.hypot(q.x - px, q.y - py); px = q.x; py = q.y; }
  return { cmds, stats: { stitches, colors: used, colorChanges: Math.max(0, used.length - 1), trims: cmds.filter((q) => q.t === 'trim').length, widthMm: bmp.widthMm, heightMm: bmp.heightMm, threadM: (thread * 1.12) / 1000, minutes: stitches / 750 + used.length * 0.5 } };
}

/** Tajima DST. Units are 0.1 mm; each record moves at most +-12.1 mm. */
export function writeDST(cmds, name = 'design') {
  const recs = [];
  const enc = (dx, dy, flags) => {
    let b0 = 0; let b1 = 0; let b2 = 3 | flags;
    const tern = (v, set) => { // balanced ternary over 81, 27, 9, 3, 1
      for (const [w, idx] of [[81, 4], [27, 3], [9, 2], [3, 1], [1, 0]]) { if (v > w / 2) { set(idx, 1); v -= w; } else if (v < -w / 2) { set(idx, -1); v += w; } }
    };
    tern(dx, (i, s) => { if (i === 0) b0 |= s > 0 ? 0x01 : 0x02; else if (i === 1) b1 |= s > 0 ? 0x01 : 0x02; else if (i === 2) b0 |= s > 0 ? 0x04 : 0x08; else if (i === 3) b1 |= s > 0 ? 0x04 : 0x08; else b2 |= s > 0 ? 0x04 : 0x08; });
    tern(dy, (i, s) => { if (i === 0) b0 |= s > 0 ? 0x80 : 0x40; else if (i === 1) b1 |= s > 0 ? 0x80 : 0x40; else if (i === 2) b0 |= s > 0 ? 0x20 : 0x10; else if (i === 3) b1 |= s > 0 ? 0x20 : 0x10; else b2 |= s > 0 ? 0x20 : 0x10; });
    recs.push(b0, b1, b2);
  };
  let x = 0; let y = 0; let minX = 0; let maxX = 0; let minY = 0; let maxY = 0; let st = 0; let co = 0;
  const move = (tx, ty, jump) => {
    let dx = Math.round(tx * 10) - x; let dy = Math.round(ty * 10) - y;
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 121));
    for (let k = 0; k < n; k++) { const sx = Math.round(dx / (n - k)); const sy = Math.round(dy / (n - k)); enc(sx, sy, jump || n > 1 ? 0x80 : 0); dx -= sx; dy -= sy; x += sx; y += sy; st++; }
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  };
  for (const c of cmds) {
    if (c.t === 'stitch') move(c.x, c.y, false);
    else if (c.t === 'jump') move(c.x, c.y, true);
    else if (c.t === 'trim') { for (let k = 0; k < 3; k++) enc(0, 0, 0x80); st += 3; } // three zero jumps = trim on Tajima machines
    else if (c.t === 'color') { enc(0, 0, 0xC0); co++; st++; }
  }
  recs.push(0, 0, 0xF3);
  const f = (label, v, w) => `${label}:${String(v).padStart(w, ' ')}\r`;
  const head = `LA:${name.slice(0, 16).padEnd(16, ' ')}\r${f('ST', st, 7)}${f('CO', co, 3)}${f('+X', maxX, 5)}${f('-X', -minX, 5)}${f('+Y', maxY, 5)}${f('-Y', -minY, 5)}${f('AX', '+' + String(x).padStart(5, ' '), 6)}${f('AY', '+' + String(y).padStart(5, ' '), 6)}${f('MX', '+    0', 6)}${f('MY', '+    0', 6)}PD:******\r\x1a`;
  const out = new Uint8Array(512 + recs.length).fill(0x20);
  for (let i = 0; i < head.length && i < 512; i++) out[i] = head.charCodeAt(i);
  out.set(recs, 512);
  return out;
}

/** Read back a DST (used by the tests to prove the file reproduces the stitches). */
export function readDST(bytes) {
  const pts = []; let x = 0; let y = 0;
  for (let i = 512; i + 2 < bytes.length; i += 3) {
    const [b0, b1, b2] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    if (b2 === 0xF3) break;
    let dx = 0; let dy = 0;
    if (b0 & 0x01) dx += 1; if (b0 & 0x02) dx -= 1; if (b0 & 0x04) dx += 9; if (b0 & 0x08) dx -= 9;
    if (b0 & 0x80) dy += 1; if (b0 & 0x40) dy -= 1; if (b0 & 0x20) dy += 9; if (b0 & 0x10) dy -= 9;
    if (b1 & 0x01) dx += 3; if (b1 & 0x02) dx -= 3; if (b1 & 0x04) dx += 27; if (b1 & 0x08) dx -= 27;
    if (b1 & 0x80) dy += 3; if (b1 & 0x40) dy -= 3; if (b1 & 0x20) dy += 27; if (b1 & 0x10) dy -= 27;
    if (b2 & 0x04) dx += 81; if (b2 & 0x08) dx -= 81; if (b2 & 0x20) dy += 81; if (b2 & 0x10) dy -= 81;
    x += dx; y += dy;
    pts.push({ x: x / 10, y: y / 10, jump: Boolean(b2 & 0x80), color: (b2 & 0xC0) === 0xC0 });
  }
  return pts;
}

const nearestThread = (hex) => { const c = hexRgb(hex); let best = THREADS_EMB[0]; let bd = 1e9; for (const t of THREADS_EMB) { const q = hexRgb(t[1]); const d = (c[0] - q[0]) ** 2 + (c[1] - q[1]) ** 2 + (c[2] - q[2]) ** 2; if (d < bd) { bd = d; best = t; } } return best[0]; };

/** Run sheet the embroiderer works from: colour order, sizes, counts, materials, machine settings. */
export function embroiderySheet(d, stats, where = '') {
  const st = STITCH_TYPES[d.stitch] || STITCH_TYPES.fill;
  const hoop = Math.max(stats.widthMm, stats.heightMm) <= 90 ? '100 x 100 mm (4 in)' : Math.max(stats.widthMm, stats.heightMm) <= 120 ? '130 x 180 mm (5 x 7 in)' : Math.max(stats.widthMm, stats.heightMm) <= 190 ? '200 x 300 mm' : 'Jumbo / multi-hooping';
  return [
    `EMBROIDERY RUN SHEET: ${d.name || d.text || d.motif || 'artwork'}`,
    `Placement: ${where || 'see tech pack'} (centre of design)`,
    `Finished size: ${stats.widthMm.toFixed(1)} x ${stats.heightMm.toFixed(1)} mm`,
    `Stitch type: ${st.name}. ${st.note}`,
    `Stitch count: ${stats.stitches.toLocaleString()} · colour changes: ${stats.colorChanges} · trims: ${stats.trims}`,
    `Estimated thread: ${stats.threadM.toFixed(1)} m top (+ about ${(stats.threadM * 0.35).toFixed(1)} m bobbin) · run time about ${Math.ceil(stats.minutes)} min at 750 spm`,
    '',
    'COLOUR SEQUENCE (the .DST stops at each change; load threads in this order)',
    ...stats.colors.map((c, i) => `  ${String(i + 1).padStart(2)}. ${c.toUpperCase()}  ${nearestThread(c)}  (match to your brand chart: Madeira / Isacord / Robison-Anton)`),
    '',
    'MACHINE SET-UP',
    `  Hoop: ${hoop}`,
    `  Needle: ${st.foam ? '80/12 sharp' : '75/11 embroidery (ballpoint for knits)'} · thread: 40 wt polyester or rayon top, 60 wt bobbin`,
    `  Stabiliser: cut-away on knits and stretch, tear-away on stable wovens${st.foam ? '; 2-3 mm puff foam on top, torn away after sewing' : ''}; water-soluble topping on pile, piqué and fleece`,
    `  Density: ${(st.density).toFixed(2)} mm row spacing · stitch length ${st.len} mm · underlay: ${d.underlay === false ? 'none' : 'yes'}`,
    st.applique ? '  Appliqué: placement line, tack-down, trim fabric, then satin edge.' : '',
    st.chenille ? '  Chenille: run the fill area as moss stitch on a chenille head; chain-stitch the outline.' : '',
    '',
    'FILES: .DST (Tajima, 0.1 mm units, no colour data), this sheet, and the placement drawing in the tech pack.',
    'Ask for a sew-out on the production fabric before bulk; adjust pull compensation and density to the fabric.',
  ].filter((l) => l !== '').join('\n');
}

// ---------- browser helpers: artwork loading and the stitched preview ----------
const imgCache = new Map();
/** Load uploaded artwork (PNG, JPG, SVG as a data URL). Resolves to an HTMLImageElement. */
export function loadArtwork(src) {
  if (!src) return Promise.resolve(null);
  if (imgCache.has(src)) return imgCache.get(src);
  const p = new Promise((res) => { const im = new Image(); im.onload = () => { p.ready = im; res(im); }; im.onerror = () => res(null); im.src = src; });
  imgCache.set(src, p);
  return p;
}
export const artworkReady = (src) => imgCache.get(src)?.ready || null;

const bmpCache = new Map();
/** Raster for a stored design, or null while its artwork is still loading. */
export function designBitmap(e) {
  const key = JSON.stringify([e.kind, e.text, e.font, e.motif, e.width, e.colors, e.threads, e.outline, e.image?.length, e.image?.slice(-40)]);
  if (bmpCache.has(key)) return bmpCache.get(key);
  let image = null;
  if (e.kind === 'image') { image = artworkReady(e.image); if (!image) return null; }
  const bmp = rasterizeDesign({ ...e, image });
  if (bmpCache.size > 40) bmpCache.clear();
  bmpCache.set(key, bmp);
  return bmp;
}

/** Canvas that looks like the sewn design: thread colour with the sheen and direction of the stitch rows. */
export function previewCanvas(bmp, type = 'fill', image = null) {
  const cv = document.createElement('canvas'); cv.width = bmp.w; cv.height = bmp.h;
  const g = cv.getContext('2d');
  if (type === 'print' && image) { g.drawImage(image, 0, 0, bmp.w, bmp.h); return cv; } // printed artwork keeps every colour
  const im = g.createImageData(bmp.w, bmp.h);
  const rgb = bmp.colors.map(hexRgb);
  const satin = type === 'satin' || type === 'puff'; const cross = type === 'cross';
  const row = Math.max(1, Math.round((STITCH_TYPES[type]?.density || 0.4) * PX_PER_MM));
  for (let y = 0; y < bmp.h; y++) for (let x = 0; x < bmp.w; x++) {
    const c = bmp.data[y * bmp.w + x]; if (c === 255) continue;
    const q = rgb[c] || rgb[0];
    // thread relief: rows for fill, sheen bands across satin columns, little crosses for cross-stitch
    let k;
    if (type === 'print') k = 1;
    else if (cross) { const cx = x % 10; const cy = y % 10; k = Math.abs(cx - cy) < 2 || Math.abs(cx + cy - 9) < 2 ? 1.08 : 0.55; }
    else if (satin) k = 0.82 + 0.26 * Math.abs(Math.sin((x + y * 0.35) * 0.09)) + ((y % row) === 0 ? -0.1 : 0);
    else k = 0.86 + ((Math.floor(y / row) + Math.floor((x + (Math.floor(y / row) % 3) * 6) / 18)) % 2 ? 0.12 : 0) + ((y % row) === 0 ? -0.14 : 0);
    const o = (y * bmp.w + x) * 4;
    im.data[o] = Math.min(255, q[0] * k); im.data[o + 1] = Math.min(255, q[1] * k); im.data[o + 2] = Math.min(255, q[2] * k); im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return cv;
}
