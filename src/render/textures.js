// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Procedural fabric textures (weave + fx + dye effect + print design) drawn
 * once into small canvases and cached. 256 px tiles keep GPU memory tiny.
 */
import * as THREE from 'three';
import { printColors } from '../core/color.js';
import { MOTIFS } from '../core/knit.js';

const SIZE = 256;
const cache = new Map();

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const hex = (c) => new THREE.Color(c);
const css = (c, a = 1) => { const k = hex(c); return `rgba(${(k.r * 255) | 0},${(k.g * 255) | 0},${(k.b * 255) | 0},${a})`; };
const shade = (c, f) => { const k = hex(c); k.multiplyScalar(f); return `#${k.getHexString()}`; };

function weave(g, pattern, base, look) {
  const r = rng(7);
  g.fillStyle = base;
  g.fillRect(0, 0, SIZE, SIZE);
  const dark = css(shade(base, 0.82), 0.55);
  const light = css(shade(base, 1.15), 0.35);
  switch (pattern) {
    case 'twill': case 'denim': case 'herringbone':
      g.strokeStyle = dark; g.lineWidth = 3;
      for (let i = -SIZE; i < SIZE * 2; i += 8) {
        g.beginPath();
        if (pattern === 'herringbone' && ((i / 8) | 0) % 8 < 4) { g.moveTo(i, 0); g.lineTo(i - SIZE, SIZE); } else { g.moveTo(i, 0); g.lineTo(i + SIZE, SIZE); }
        g.stroke();
      }
      if (pattern === 'denim') { g.fillStyle = 'rgba(255,255,255,0.10)'; for (let k = 0; k < 900; k++) g.fillRect(r() * SIZE, r() * SIZE, 1 + r() * 3, 1); }
      break;
    case 'knit': case 'rib':
      g.strokeStyle = dark; g.lineWidth = pattern === 'rib' ? 5 : 2;
      for (let x = 0; x < SIZE; x += pattern === 'rib' ? 12 * (look.ribW || 1) : 8) {
        if (pattern === 'rib') { g.lineWidth = 5 * (look.ribW || 1); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, SIZE); g.stroke(); continue; }
        for (let y = 0; y < SIZE; y += 8) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4, y + 6); g.lineTo(x + 8, y); g.stroke(); }
      }
      break;
    case 'satin':
      for (let y = 0; y < SIZE; y += 2) { g.fillStyle = css(shade(base, 0.96 + 0.08 * Math.sin(y * 0.15)), 0.4); g.fillRect(0, y, SIZE, 1); }
      break;
    case 'canvas': case 'plain': case 'ripstop': {
      const step = pattern === 'canvas' ? 6 : 4;
      g.fillStyle = dark;
      for (let y = 0; y < SIZE; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < SIZE; x += step) g.fillRect(x, y, step / 2, step / 2);
      if (pattern === 'ripstop') { g.strokeStyle = css(shade(base, 0.7), 0.7); g.lineWidth = 2; for (let k = 0; k < SIZE; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, SIZE); g.moveTo(0, k); g.lineTo(SIZE, k); g.stroke(); } }
      break;
    }
    case 'waffle':
      g.strokeStyle = dark; g.lineWidth = 4;
      for (let k = 0; k < SIZE; k += 16) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, SIZE); g.moveTo(0, k); g.lineTo(SIZE, k); g.stroke(); }
      break;
    case 'corduroy':
      for (let x = 0; x < SIZE; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, css(shade(base, 0.7))); gr.addColorStop(0.5, css(shade(base, 1.15))); gr.addColorStop(1, css(shade(base, 0.7))); g.fillStyle = gr; g.fillRect(x, 0, 16, SIZE); }
      break;
    case 'tweed':
      for (let k = 0; k < 6000; k++) { g.fillStyle = r() > 0.5 ? dark : light; g.fillRect(r() * SIZE, r() * SIZE, 2 + r() * 4, 1 + r() * 2); }
      for (let k = 0; k < 300; k++) { g.fillStyle = css(['#c94b2b', '#2f6b3a', '#e0c35a', '#ffffff'][(r() * 4) | 0], 0.6); g.fillRect(r() * SIZE, r() * SIZE, 2, 2); }
      break;
    case 'velvet': case 'leather':
      for (let k = 0; k < (pattern === 'leather' ? 2500 : 5000); k++) { g.fillStyle = r() > 0.5 ? dark : light; const s = pattern === 'leather' ? 2 + r() * 5 : 1; g.beginPath(); g.arc(r() * SIZE, r() * SIZE, s, 0, Math.PI * 2); g.fill(); }
      break;
    case 'plaid': {
      const cols = look.patternColors || ['#9b1c1c', '#1d2a44', '#e8d9b0'];
      g.fillStyle = cols[0]; g.fillRect(0, 0, SIZE, SIZE);
      const bands = [[0, 64, cols[1]], [96, 24, cols[2]], [160, 64, cols[1]], [236, 6, cols[2]]];
      for (const [p, w, c] of bands) { g.fillStyle = css(c, 0.55); g.fillRect(p, 0, w, SIZE); g.fillRect(0, p, SIZE, w); }
      g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1;
      for (let i = -SIZE; i < SIZE * 2; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + SIZE, SIZE); g.stroke(); }
      break;
    }
    case 'pinstripe':
      g.fillStyle = css(shade(base, 1.9), 0.7);
      for (let x = 0; x < SIZE; x += 32) g.fillRect(x, 0, 2, SIZE);
      break;
    case 'fishnet':
      g.clearRect(0, 0, SIZE, SIZE);
      g.strokeStyle = base; g.lineWidth = 5;
      for (let k = -SIZE; k < SIZE * 2; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + SIZE, SIZE); g.stroke(); g.beginPath(); g.moveTo(k, SIZE); g.lineTo(k + SIZE, 0); g.stroke(); }
      break;
    case 'lace': case 'mesh':
      g.clearRect(0, 0, SIZE, SIZE); g.fillStyle = base; g.fillRect(0, 0, SIZE, SIZE);
      g.globalCompositeOperation = 'destination-out';
      for (let y = 0; y < SIZE; y += pattern === 'mesh' ? 10 : 32) for (let x = 0; x < SIZE; x += pattern === 'mesh' ? 10 : 32) { g.beginPath(); g.arc(x + 5, y + 5, pattern === 'mesh' ? 3 : 10 + r() * 4, 0, Math.PI * 2); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      if (pattern === 'lace') { g.strokeStyle = dark; g.lineWidth = 2; for (let k = 0; k < 40; k++) { g.beginPath(); g.arc(r() * SIZE, r() * SIZE, 6 + r() * 14, 0, Math.PI * 1.5); g.stroke(); } }
      break;
    case 'sequin':
      for (let y = 0; y < SIZE; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < SIZE; x += 12) { const gr = g.createRadialGradient(x + 4, y + 4, 1, x + 6, y + 6, 7); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, base); g.fillStyle = gr; g.beginPath(); g.arc(x + 6, y + 6, 6, 0, Math.PI * 2); g.fill(); }
      break;
    case 'purl': case 'garter':
      for (let y = 0; y < SIZE; y += 8) {
        g.fillStyle = (pattern === 'garter' && (y / 8) % 2) ? light : dark;
        for (let x = (y / 8) % 2 ? 4 : 0; x < SIZE; x += 8) { g.beginPath(); g.ellipse(x + 4, y + 4, 4, 2.6, 0, 0, 7); g.fill(); }
      }
      break;
    case 'seed':
      for (let y = 0; y < SIZE; y += 8) for (let x = 0; x < SIZE; x += 8) { g.fillStyle = ((x + y) / 8) % 2 ? dark : light; g.beginPath(); g.ellipse(x + 4, y + 4, 3.2, 2.4, 0, 0, 7); g.fill(); }
      break;
    case 'milano':
      knitV(g, dark, 8, 10);
      g.fillStyle = css(shade(base, 0.78), 0.6);
      for (let y = 0; y < SIZE; y += 20) g.fillRect(0, y, SIZE, 4);
      break;
    case 'cable': {
      knitV(g, css(shade(base, 0.85), 0.5), 8, 8);
      const cw = 48;
      for (let x0 = 16; x0 < SIZE; x0 += cw + 24) {
        g.fillStyle = css(shade(base, 0.7), 0.7); g.fillRect(x0 - 6, 0, 4, SIZE); g.fillRect(x0 + cw + 2, 0, 4, SIZE);
        for (let y = 0; y < SIZE; y += 32) for (const dir of [1, -1]) {
          const gr = g.createLinearGradient(x0, y, x0 + cw, y + 32); gr.addColorStop(0, css(shade(base, 1.18))); gr.addColorStop(1, css(shade(base, 0.72)));
          g.strokeStyle = gr; g.lineWidth = 13; g.beginPath();
          g.moveTo(x0 + (dir > 0 ? 10 : cw - 10), y); g.bezierCurveTo(x0 + (dir > 0 ? 10 : cw - 10), y + 16, x0 + (dir > 0 ? cw - 10 : 10), y + 16, x0 + (dir > 0 ? cw - 10 : 10), y + 32); g.stroke();
        }
      }
      break;
    }
    case 'honeycomb':
      knitV(g, css(shade(base, 0.85), 0.4), 8, 8);
      g.strokeStyle = css(shade(base, 0.7), 0.8); g.lineWidth = 5;
      for (let y = 0; y < SIZE; y += 24) for (let x = (y / 24) % 2 ? 16 : 0; x < SIZE; x += 32) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 16, y + 12); g.lineTo(x + 32, y); g.stroke(); }
      break;
    case 'pointelle':
      knitV(g, dark, 8, 8);
      g.globalCompositeOperation = 'destination-out';
      for (let y = 6; y < SIZE; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < SIZE; x += 24) { g.beginPath(); g.arc(x + 6, y, 2.6, 0, 7); g.fill(); }
      g.globalCompositeOperation = 'source-over';
      break;
    case 'popcorn':
      knitV(g, css(shade(base, 0.85), 0.5), 8, 8);
      for (let y = 12; y < SIZE; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < SIZE; x += 32) { const gr = g.createRadialGradient(x + 7, y - 2, 1, x + 8, y, 8); gr.addColorStop(0, css(shade(base, 1.25))); gr.addColorStop(1, css(shade(base, 0.7))); g.fillStyle = gr; g.beginPath(); g.arc(x + 8, y, 7, 0, 7); g.fill(); }
      break;
    case 'knitchart': {
      const m = MOTIFS[look.motif] || MOTIFS.birdseye;
      const cols = look.patternColors || [base, '#ffffff', '#c0392b'];
      const grid = m.grid || ['0'];
      const st = SIZE / Math.max(grid[0].length * 2, 16); // stitch width
      const sh = st * 0.8;
      for (let yy = 0, r = 0; yy < SIZE; yy += sh, r++) for (let xx = 0, c = 0; xx < SIZE; xx += st, c++) {
        const row = grid[r % grid.length]; const ch = row[c % row.length];
        g.fillStyle = cols[Number(ch)] || base;
        g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + st / 2, yy + sh * 1.1); g.lineTo(xx + st, yy); g.lineTo(xx + st / 2, yy + sh * 0.35); g.closePath(); g.fill();
      }
      break;
    }
    default: break;
  }
}

/** V-shaped knit stitches (stockinette) */
function knitV(g, color, w, h) {
  g.strokeStyle = color; g.lineWidth = 2;
  for (let x = 0; x < SIZE; x += w) for (let y = 0; y < SIZE; y += h) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + w / 2, y + h * 0.75); g.lineTo(x + w, y); g.stroke(); }
}

function applyFx(g, fx, base) {
  const r = rng(11);
  switch (fx) {
    case 'slub': for (let k = 0; k < 120; k++) { g.fillStyle = css(shade(base, 1.2), 0.25); g.fillRect(0, r() * SIZE, SIZE, 1 + r() * 2); } break;
    case 'faded': { const gr = g.createRadialGradient(SIZE / 2, SIZE / 2, 10, SIZE / 2, SIZE / 2, SIZE * 0.7); gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, SIZE, SIZE); break; }
    case 'mottled': for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.12})`; g.beginPath(); g.arc(r() * SIZE, r() * SIZE, 10 + r() * 30, 0, Math.PI * 2); g.fill(); } break;
    case 'distressed': {
      // hand-sanded fades (thighs / seat), fine vertical wear streaks, hip whiskers and small nicks
      for (const [fx, fy, rr, al] of [[0.5, 0.3, 0.42, 0.34], [0.5, 0.78, 0.3, 0.22], [0.15, 0.55, 0.2, 0.14], [0.85, 0.5, 0.22, 0.14]]) { const gr = g.createRadialGradient(SIZE * fx, SIZE * fy, 4, SIZE * fx, SIZE * fy, SIZE * rr); gr.addColorStop(0, `rgba(255,255,255,${al})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, SIZE, SIZE); }
      for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.05})`; g.fillRect(r() * SIZE, r() * SIZE, 0.6, 4 + r() * 14); }
      g.lineCap = 'round';
      for (let k = 0; k < 7; k++) { const y = SIZE * (0.08 + k * 0.022); g.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.06})`; g.lineWidth = 1.6 + r(); g.beginPath(); g.moveTo(SIZE * 0.08, y + r() * 4); g.quadraticCurveTo(SIZE * 0.3, y - 5 - r() * 5, SIZE * 0.46, y + 4 + r() * 4); g.stroke(); g.beginPath(); g.moveTo(SIZE * 0.92, y + r() * 4); g.quadraticCurveTo(SIZE * 0.7, y - 5 - r() * 5, SIZE * 0.54, y + 4 + r() * 4); g.stroke(); }
      for (let k = 0; k < 5; k++) { const x = r() * SIZE; const y = r() * SIZE; g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.5; for (let t = 0; t < 3; t++) { g.beginPath(); g.moveTo(x, y + t * 1.1); g.lineTo(x + 5 + r() * 9, y + t * 1.1 + (r() - 0.5)); g.stroke(); } }
      break;
    }
    case 'selvedge': break;
    case 'waxed': { const gr = g.createLinearGradient(0, 0, SIZE, SIZE); gr.addColorStop(0, 'rgba(0,0,0,0.15)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0.15)'); g.fillStyle = gr; g.fillRect(0, 0, SIZE, SIZE); break; }
    case 'quilted': g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; for (let y = 0; y < SIZE; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(SIZE, y); g.stroke(); } for (let y = 32; y < SIZE; y += 64) { const gr = g.createLinearGradient(0, y - 32, 0, y + 32); gr.addColorStop(0, 'rgba(0,0,0,0.15)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0.15)'); g.fillStyle = gr; g.fillRect(0, y - 32, SIZE, 64); } break;
    case 'crushed': case 'crinkle': for (let k = 0; k < 50; k++) { g.strokeStyle = `rgba(255,255,255,${0.06 + r() * 0.1})`; g.lineWidth = 2 + r() * 6; g.beginPath(); g.moveTo(r() * SIZE, r() * SIZE); g.bezierCurveTo(r() * SIZE, r() * SIZE, r() * SIZE, r() * SIZE, r() * SIZE, r() * SIZE); g.stroke(); } break;
    case 'fuzzy': for (let k = 0; k < 3000; k++) { g.fillStyle = `rgba(255,255,255,${r() * 0.08})`; g.fillRect(r() * SIZE, r() * SIZE, 1, 2); } break;
    default: break;
  }
}

function dyeEffect(g, effect, color) {
  const r = rng(23);
  switch (effect) {
    case 'tiedye': for (let k = 18; k > 0; k--) { g.strokeStyle = css(k % 2 ? color : shade(color, 1.6), 0.45); g.lineWidth = 9; g.beginPath(); for (let a = 0; a < Math.PI * 6; a += 0.1) { const rr = a * 6 + k * 3; g.lineTo(SIZE / 2 + Math.cos(a) * rr, SIZE / 2 + Math.sin(a) * rr); } g.stroke(); } break;
    case 'shibori': for (let y = 0; y < SIZE; y += 32) for (let x = 0; x < SIZE; x += 32) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + 4, y + 4, 24, 3); g.fillRect(x + 4, y + 4, 3, 24); } break;
    case 'batik': for (let k = 0; k < 25; k++) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath(); let x = r() * SIZE; let y = r() * SIZE; g.moveTo(x, y); for (let s = 0; s < 6; s++) { x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); } break;
    case 'ombre': { const gr = g.createLinearGradient(0, 0, 0, SIZE); gr.addColorStop(0, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, SIZE, SIZE); break; }
    case 'space': for (let k = 0; k < 400; k++) { g.fillStyle = css(['#ffffff', '#000000', shade(color, 1.5)][(r() * 3) | 0], 0.2); g.fillRect(r() * SIZE, r() * SIZE, 8 + r() * 20, 1.5); } break;
    case 'speckle': for (let k = 0; k < 500; k++) { g.fillStyle = css(shade(color, 0.6 + r()), 0.5); g.beginPath(); g.arc(r() * SIZE, r() * SIZE, 1 + r() * 3, 0, Math.PI * 2); g.fill(); } break;
    case 'mottled': applyFx(g, 'mottled', color); break;
    case 'faded': applyFx(g, 'faded', color); break;
    default: break;
  }
}

function printDesign(g, design, colors = [], opacity = 1) {
  void design;
  const [c1, c2, c3] = printColors(design, colors);
  const r = rng(31);
  g.globalAlpha = opacity;
  switch (design) {
    case 'stripes': for (let y = 0; y < SIZE; y += 32) { g.fillStyle = c1; g.fillRect(0, y, SIZE, 16); } break;
    case 'breton': for (let y = 0; y < SIZE; y += 24) { g.fillStyle = c1; g.fillRect(0, y, SIZE, 7); } break;
    case 'pinstripe': for (let x = 0; x < SIZE; x += 24) { g.fillStyle = c2; g.fillRect(x, 0, 1.5, SIZE); } break;
    case 'gingham': for (let k = 0; k < SIZE; k += 32) { g.fillStyle = css(c1, 0.5); g.fillRect(k, 0, 16, SIZE); g.fillRect(0, k, SIZE, 16); } break;
    case 'checkerboard': for (let y = 0; y < SIZE; y += 32) for (let x = 0; x < SIZE; x += 32) if (((x + y) / 32) % 2 === 0) { g.fillStyle = c1; g.fillRect(x, y, 32, 32); } break;
    case 'polka': for (let y = 0; y < SIZE; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < SIZE; x += 32) { g.fillStyle = c1; g.beginPath(); g.arc(x + 8, y + 8, 6, 0, Math.PI * 2); g.fill(); } break;
    case 'camo': for (let k = 0; k < 40; k++) { g.fillStyle = [c1, c2, c3, '#4b5320'][k % 4]; g.beginPath(); const x = r() * SIZE; const y = r() * SIZE; for (let a = 0; a < 6.3; a += 0.7) g.lineTo(x + Math.cos(a) * (10 + r() * 30), y + Math.sin(a) * (10 + r() * 30)); g.fill(); } break;
    case 'leopard': g.fillStyle = c2; g.fillRect(0, 0, SIZE, SIZE); for (let k = 0; k < 70; k++) { const x = r() * SIZE; const y = r() * SIZE; g.fillStyle = c3; g.beginPath(); g.ellipse(x, y, 7, 5, r() * 3, 0, 6.3); g.fill(); g.strokeStyle = c1; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 9, r() * 3, r() * 3 + 3.5); g.stroke(); } break;
    case 'floral': for (let k = 0; k < 18; k++) { const x = r() * SIZE; const y = r() * SIZE; for (let p = 0; p < 5; p++) { g.fillStyle = c3; g.beginPath(); g.ellipse(x + Math.cos(p * 1.26) * 7, y + Math.sin(p * 1.26) * 7, 6, 3.5, p * 1.26, 0, 6.3); g.fill(); } g.fillStyle = c2; g.beginPath(); g.arc(x, y, 3, 0, 6.3); g.fill(); } break;
    case 'paisley': for (let k = 0; k < 14; k++) { const x = r() * SIZE; const y = r() * SIZE; g.strokeStyle = c1; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 22, y - 20, x + 30, y + 14, x, y + 18); g.bezierCurveTo(x - 8, y + 10, x - 4, y + 2, x, y); g.stroke(); } break;
    case 'cheetah': // solid round spots on tawny
      g.fillStyle = c2; g.fillRect(0, 0, SIZE, SIZE);
      for (let k = 0; k < 160; k++) { g.fillStyle = c1; g.beginPath(); g.ellipse(r() * SIZE, r() * SIZE, 3 + r() * 3, 2.5 + r() * 2.5, r() * 3, 0, 6.3); g.fill(); }
      break;
    case 'tiger': { // orange with tapering black stripes
      g.fillStyle = c2; g.fillRect(0, 0, SIZE, SIZE);
      const wg = g.createLinearGradient(0, 0, SIZE, 0); wg.addColorStop(0, 'rgba(255,255,255,0.25)'); wg.addColorStop(0.5, 'rgba(255,255,255,0)'); wg.addColorStop(1, 'rgba(255,255,255,0.25)'); g.fillStyle = wg; g.fillRect(0, 0, SIZE, SIZE);
      g.fillStyle = c1;
      for (let k = 0; k < 16; k++) { const y = k * 16 + r() * 6; const x0 = r() * 60; const len = 90 + r() * 120; g.beginPath(); g.moveTo(x0, y); for (let x = x0; x <= x0 + len; x += 8) g.lineTo(x, y + Math.sin(x * 0.04 + k) * 6 - ((x - x0) / len) * 2); for (let x = x0 + len; x >= x0; x -= 8) g.lineTo(x, y + 2 + 6 * Math.sin(((x - x0) / len) * Math.PI) + Math.sin(x * 0.04 + k) * 6); g.fill(); }
      break;
    }
    case 'cougar': { // tawny plain fur with soft shading
      g.fillStyle = c2; g.fillRect(0, 0, SIZE, SIZE);
      for (let k = 0; k < 2500; k++) { g.fillStyle = `rgba(${r() > 0.5 ? '255,235,200' : '80,50,25'},${0.04 + r() * 0.06})`; g.fillRect(r() * SIZE, r() * SIZE, 1, 3 + r() * 4); }
      break;
    }
    case 'jaguar': case 'snow-leopard': { // rosettes with inner dots
      const snow = design === 'snow-leopard';
      g.fillStyle = c2; g.fillRect(0, 0, SIZE, SIZE);
      for (let k = 0; k < (snow ? 26 : 34); k++) {
        const x = r() * SIZE; const y = r() * SIZE; const rr = 8 + r() * 6;
        g.fillStyle = c3; g.beginPath(); g.ellipse(x, y, rr * 0.75, rr * 0.6, r() * 3, 0, 6.3); g.fill();
        g.strokeStyle = c1; g.lineWidth = 3;
        for (let a = 0; a < 6.2; a += 1.1 + r() * 0.4) { g.beginPath(); g.arc(x, y, rr, a, a + 0.7); g.stroke(); }
        if (!snow) for (let d = 0; d < 3; d++) { g.fillStyle = c1; g.beginPath(); g.arc(x + (r() - 0.5) * rr * 0.6, y + (r() - 0.5) * rr * 0.6, 1.6, 0, 6.3); g.fill(); }
      }
      break;
    }
    case 'dalmatian': { // irregular black blotches of mixed size on white
      g.fillStyle = c2; g.fillRect(0, 0, SIZE, SIZE);
      g.fillStyle = c1;
      for (let k = 0; k < 46; k++) {
        const x = r() * SIZE; const y = r() * SIZE; const rad = k % 5 === 0 ? 9 + r() * 7 : 3 + r() * 6; const n = 7 + Math.floor(r() * 4); const ph = r() * 6.3;
        g.beginPath();
        for (let a = 0; a <= n; a++) { const an = ph + (a / n) * Math.PI * 2; const rr = rad * (0.7 + r() * 0.5); const px = x + Math.cos(an) * rr * 1.15; const py = y + Math.sin(an) * rr; a ? g.quadraticCurveTo(x + Math.cos(an - Math.PI / n) * rr * 1.3, y + Math.sin(an - Math.PI / n) * rr * 1.15, px, py) : g.moveTo(px, py); }
        g.closePath(); g.fill();
      }
      break;
    }
    case 'zebra': for (let k = 0; k < 14; k++) { g.fillStyle = c1; g.beginPath(); const y = k * 20 + r() * 8; g.moveTo(0, y); for (let x = 0; x <= SIZE; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + k) * 8); for (let x = SIZE; x >= 0; x -= 16) g.lineTo(x, y + 8 + Math.sin(x * 0.05 + k) * 6 + r() * 3); g.fill(); } break;
    case 'snakeskin': for (let y = 0; y < SIZE; y += 14) for (let x = (y / 14) % 2 ? 9 : 0; x < SIZE; x += 18) { g.fillStyle = css(c1, 0.35 + r() * 0.4); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 9, y + 7); g.lineTo(x, y + 14); g.lineTo(x - 9, y + 7); g.closePath(); g.fill(); g.strokeStyle = css(c3, 0.5); g.lineWidth = 1; g.stroke(); } break;
    case 'ditsy-floral': for (let k = 0; k < 70; k++) { const x = r() * SIZE; const y = r() * SIZE; for (let p2 = 0; p2 < 5; p2++) { g.fillStyle = [c3, c1][k % 2]; g.beginPath(); g.arc(x + Math.cos(p2 * 1.26) * 3, y + Math.sin(p2 * 1.26) * 3, 2.2, 0, 6.3); g.fill(); } } break;
    case 'houndstooth': { const u = 16; for (let y = 0; y < SIZE; y += u) for (let x = 0; x < SIZE; x += u) { g.fillStyle = c1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + u / 2, y); g.lineTo(x + u, y + u / 2); g.lineTo(x + u, y + u); g.lineTo(x + u / 2, y + u); g.lineTo(x + u / 2, y + u * 0.75); g.lineTo(x, y + u / 4); g.closePath(); g.fill(); } break; }
    case 'tartan': for (const [p0, w, c] of [[0, 48, c1], [80, 12, c3], [120, 48, c1], [200, 6, c2]]) { g.fillStyle = css(c, 0.5); g.fillRect(p0, 0, w, SIZE); g.fillRect(0, p0, SIZE, w); } break;
    case 'argyle': { const w = 64; const hgt = 96; for (let y = -hgt; y < SIZE + hgt; y += hgt / 2) for (let x = ((y / (hgt / 2)) % 2 ? w / 2 : 0) - w; x < SIZE + w; x += w) { g.fillStyle = css(((x + y) / 32) % 2 ? c1 : c3, 0.85); g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w, y + hgt / 2); g.lineTo(x + w / 2, y + hgt); g.lineTo(x, y + hgt / 2); g.closePath(); g.fill(); } g.strokeStyle = c2; g.lineWidth = 1.5; for (let k = -SIZE; k < SIZE * 2; k += w) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + SIZE * (w / hgt) * 1.5, SIZE); g.stroke(); g.beginPath(); g.moveTo(k, SIZE); g.lineTo(k + SIZE * (w / hgt) * 1.5, 0); g.stroke(); } break; }
    case 'chevron': g.strokeStyle = c1; g.lineWidth = 10; for (let y = -32; y < SIZE + 32; y += 32) { g.beginPath(); for (let x = 0; x <= SIZE; x += 32) g.lineTo(x, y + ((x / 32) % 2 ? 16 : 0)); g.stroke(); } break;
    case 'zigzag': g.strokeStyle = c1; g.lineWidth = 3; for (let y = 0; y < SIZE; y += 16) { g.beginPath(); for (let x = 0; x <= SIZE; x += 8) g.lineTo(x, y + ((x / 8) % 2 ? 6 : 0)); g.stroke(); } break;
    case 'waves': g.strokeStyle = c1; g.lineWidth = 4; for (let y = 0; y < SIZE; y += 20) { g.beginPath(); for (let x = 0; x <= SIZE; x += 4) g.lineTo(x, y + Math.sin((x / SIZE) * Math.PI * 4) * 6); g.stroke(); } break;
    case 'hearts': for (let y = 16; y < SIZE; y += 40) for (let x = (y / 40) % 2 ? 36 : 16; x < SIZE; x += 40) { g.fillStyle = c3; g.beginPath(); g.moveTo(x, y + 6); g.bezierCurveTo(x - 12, y - 4, x - 6, y - 12, x, y - 5); g.bezierCurveTo(x + 6, y - 12, x + 12, y - 4, x, y + 6); g.fill(); } break;
    case 'stars': for (let k = 0; k < 40; k++) { const x = r() * SIZE; const y = r() * SIZE; const rr = 3 + r() * 5; g.fillStyle = c1; g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const rad = i % 2 ? rr * 0.45 : rr; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } g.fill(); } break;
    case 'triangles': for (let y = 0; y < SIZE; y += 32) for (let x = 0; x < SIZE; x += 32) { g.fillStyle = [c1, c2, c3][(x / 32 + y / 32) % 3]; g.beginPath(); g.moveTo(x, y + 32); g.lineTo(x + 16, y); g.lineTo(x + 32, y + 32); g.fill(); } break;
    case 'ikat': for (let x = 0; x < SIZE; x += 32) for (let y = 0; y < SIZE; y += 4) { g.fillStyle = css((x / 32) % 2 ? c1 : c3, 0.6); const w = 10 + Math.sin(y * 0.08 + x) * 8 + r() * 4; g.fillRect(x + 16 - w / 2, y, w, 3.2); } break;
    case 'gradient': { const gr = g.createLinearGradient(0, 0, 0, SIZE); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, SIZE, SIZE); break; }
    default: break;
  }
  g.globalAlpha = 1;
}

const imgCache = new Map();
function loadImage(src, onload) {
  if (imgCache.has(src)) return imgCache.get(src);
  const im = new Image();
  im.onload = () => onload?.();
  im.src = src;
  imgCache.set(src, im);
  return im;
}

/**
 * Build (or fetch cached) map + bump textures for a resolved fabric and finish.
 * onUpdate is called when an async print image finishes loading.
 */
/** One repeat of a print design as production artwork (opaque, straight repeat). */
export function printTileCanvas(design, colors, px = 2048) {
  const cv = document.createElement('canvas'); cv.width = cv.height = px;
  const g = cv.getContext('2d');
  g.fillStyle = printColors(design, colors)[1]; g.fillRect(0, 0, px, px);
  g.setTransform(px / SIZE, 0, 0, px / SIZE, 0, 0);
  printDesign(g, design, colors, 1);
  return cv;
}

/** Natural repeat of a print design, in cm (before the user's print size multiplier). */
export function printTileCm(design) {
  if (['leopard', 'cheetah', 'tiger', 'cougar', 'jaguar', 'snow-leopard', 'dalmatian', 'zebra', 'camo'].includes(design)) return 36;
  if (['snakeskin', 'houndstooth', 'pinstripe', 'gingham', 'checkerboard', 'ditsy-floral'].includes(design)) return 10;
  if (['stripes', 'breton', 'polka', 'hearts', 'stars', 'triangles', 'zigzag', 'chevron'].includes(design)) return 14;
  return 28; // florals, paisley, tartan, argyle, ikat, waves, gradient, logo, image
}

export function fabricTextures(fab, finish = {}, dyeEffectKey, onUpdate, repeatOverride) {
  const look = fab.look;
  const color = finish.color || look.color;
  const p = finish.print;
  const printed = (p?.design && p.design !== 'solid') || finish.paint?.design;
  // Prints get their own real-world repeat (a leopard rosette is cm-sized, a weave is mm-sized):
  // the canvas then holds k weave tiles under one print tile.
  const rep = repeatOverride || look.patternScale || 6;
  // washes, wear and dye effects are garment-scale too (a fade spans the thigh, not a thread)
  const bigFx = ['faded', 'mottled', 'distressed', 'waxed', 'crushed', 'crinkle'].includes(look.fx) || (dyeEffectKey && dyeEffectKey !== 'solid');
  const tileCm = printed ? printTileCm(p?.design || finish.paint.design) * (Number(p?.scale) || 1) : bigFx ? 42 : 0;
  const k = printed || bigFx ? Math.max(1, Math.round((tileCm * rep) / 10)) : 1;
  const key = JSON.stringify([look.pattern, look.motif, look.ribW, look.fx, color, look.patternColors, dyeEffectKey, p?.design, p?.colors, p?.image?.slice(0, 64), p?.scale, finish.paint?.design, finish.paint?.colors, k, bigFx]);
  if (cache.has(key)) return cache.get(key);
  const tile = document.createElement('canvas');
  tile.width = tile.height = SIZE;
  const tg = tile.getContext('2d');
  weave(tg, look.pattern, color, look);
  if (look.fx && !bigFx) applyFx(tg, look.fx, color);
  let cv = tile; let g = tg;
  if (k > 1) {
    const BIG = 1024;
    cv = document.createElement('canvas'); cv.width = cv.height = BIG;
    g = cv.getContext('2d');
    const w = BIG / k;
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) g.drawImage(tile, x * w, y * w, w, w);
    g.setTransform(BIG / SIZE, 0, 0, BIG / SIZE, 0, 0); // effects and prints draw in SIZE units
  }
  if (bigFx) {
    if (look.fx) applyFx(g, look.fx, color);
    if (dyeEffectKey && dyeEffectKey !== 'solid') dyeEffect(g, dyeEffectKey, color);
  }
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  if (p?.design && p.design !== 'image' && p.design !== 'solid') printDesign(g, p.design, p.colors, 0.92);
  if (finish.paint?.design) printDesign(g, finish.paint.design, finish.paint.colors, 0.8);
  if (p?.image) {
    const im = loadImage(p.image, () => { cache.delete(key); onUpdate?.(); });
    if (im.complete && im.naturalWidth) { g.drawImage(im, 0, 0, SIZE, SIZE); }
  }
  // bump from luminance of the weave only
  const bump = new THREE.CanvasTexture(cv);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  g.setTransform(1, 0, 0, 1, 0, 0);
  const out = { map, bump, k };
  if (cache.size > 120) cache.clear();
  cache.set(key, out);
  return out;
}

/**
 * Placed wear and damage, drawn the way denim really fails: the blue warp threads break and
 * the white weft threads stay, spanning the hole; the edge frays; the cloth round it is sanded pale.
 * kind: 'rip' | 'shred' | 'blowout' | 'whiskers' | 'fade' | 'fray' | 'paint' | 'bleach'
 */
export function distressTexture(kind, base = '#3b5b8c', seed = 7, skin = '#9aa1ab') {
  const W = 256; const H = 160; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); const r = rng(seed);
  const hole = (cx, cy, rx, ry, threads) => {
    const pts = []; for (let a = 0; a < 6.283; a += 0.35) pts.push([cx + Math.cos(a) * rx * (0.82 + r() * 0.3), cy + Math.sin(a) * ry * (0.75 + r() * 0.45)]);
    // sanded halo
    // soft and elliptical, fading out completely before the edge of the piece
    g.save(); g.translate(cx, cy); g.scale(1, Math.min(1, (H * 0.48) / (W * 0.48))); const gr = g.createRadialGradient(0, 0, Math.min(rx, ry) * 0.5, 0, 0, W * 0.48); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.2)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, W * 0.48, 0, 7); g.fill(); g.restore();
    g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.save(); g.clip();
    g.fillStyle = skin; g.fillRect(0, 0, W, H); // what shows through the hole
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, W, cy - ry * 0.45); // shadow under the upper edge
    // surviving weft: white threads across the hole, slack and uneven
    for (let k = 0; k < threads; k++) { const y = cy - ry + (k + r()) * ((2 * ry) / threads); g.strokeStyle = `rgba(250,248,240,${0.65 + r() * 0.35})`; g.lineWidth = 0.7 + r() * 0.9; g.beginPath(); g.moveTo(cx - rx * 1.3, y); g.bezierCurveTo(cx - rx * 0.4, y + (r() - 0.3) * 5, cx + rx * 0.4, y + (r() - 0.3) * 5, cx + rx * 1.3, y + (r() - 0.5) * 2); g.stroke(); if (r() > 0.75) k += 1; }
    g.restore();
    // frayed edge: short broken warp ends and fuzz
    for (const [x, y] of pts) for (let k = 0; k < 7; k++) { const a = Math.atan2(y - cy, x - cx) + (r() - 0.5) * 1.2; const l = 2 + r() * 7; g.strokeStyle = r() > 0.4 ? 'rgba(250,248,240,0.9)' : base; g.lineWidth = 0.6 + r() * 0.5; g.beginPath(); g.moveTo(x + (r() - 0.5) * 5, y + (r() - 0.5) * 4); g.lineTo(x + Math.cos(a) * l * (r() > 0.5 ? 1 : -0.5), y + Math.sin(a) * l * 0.4); g.stroke(); }
  };
  switch (kind) {
    case 'rip': hole(W / 2, H / 2, W * 0.34, H * 0.2, 16); break;
    case 'blowout': hole(W / 2, H / 2, W * 0.36, H * 0.36, 26); break;
    case 'shred': for (let k = 0; k < 4; k++) hole(W / 2 + (r() - 0.5) * 20, H * (0.16 + k * 0.23), W * (0.26 + r() * 0.1), H * 0.07, 6); break;
    case 'whiskers': g.lineCap = 'round'; for (let k = 0; k < 6; k++) { const y = H * (0.12 + k * 0.15); g.strokeStyle = `rgba(255,255,255,${0.3 + r() * 0.2})`; g.lineWidth = 3 + r() * 3; g.filter = 'blur(1.5px)'; g.beginPath(); g.moveTo(8, y + 10); g.quadraticCurveTo(W * 0.5, y - 14 - r() * 8, W - 8, y + 8); g.stroke(); } g.filter = 'none'; break;
    case 'fade': { g.save(); g.translate(W / 2, H / 2); g.scale(1, H / W); const gr = g.createRadialGradient(0, 0, 6, 0, 0, W * 0.49); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, W * 0.49, 0, 7); g.fill(); g.restore(); break; }
    case 'bleach': for (let k = 0; k < 26; k++) { const x = r() * W; const y = r() * H; const rr = 4 + r() * 22; const gr = g.createRadialGradient(x, y, 1, x, y, rr); gr.addColorStop(0, 'rgba(255,250,235,0.75)'); gr.addColorStop(1, 'rgba(255,250,235,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); } break;
    case 'paint': for (let k = 0; k < 40; k++) { g.fillStyle = ['#f4f1ea', '#e8e2d0', '#d94f30', '#2f6bff'][Math.floor(r() * 4)]; g.beginPath(); g.arc(r() * W, r() * H, 0.8 + r() * r() * 7, 0, 7); g.fill(); } break;
    case 'fray': for (let k = 0; k < 260; k++) { const x = r() * W; g.strokeStyle = r() > 0.35 ? 'rgba(250,248,240,0.95)' : base; g.lineWidth = 0.6 + r() * 0.6; g.beginPath(); g.moveTo(x, H * 0.5 + (r() - 0.5) * 6); g.lineTo(x + (r() - 0.5) * 7, H * 0.5 + 8 + r() * (H * 0.45)); g.stroke(); } g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, H * 0.42, W, H * 0.1); break;
    default: break;
  }
  return cv;
}
export const DISTRESS = {
  rip: { name: 'Knee rip (threads left in)', w: 13, h: 7, note: 'Slash the warp with a blade, pull out the blue threads, leave the white weft.' },
  blowout: { name: 'Blow-out hole', w: 12, h: 11, note: 'Grind through with a rotary tool, then wash to open and fray.' },
  shred: { name: 'Shredded ladder', w: 12, h: 16, note: 'Several parallel cuts 1.5 cm apart; pull the warp from each strip.' },
  whiskers: { name: 'Whiskers (hip / knee creases)', w: 22, h: 14, note: 'Hand-sanded or laser-burnt crease lines over a 3D pattern board.' },
  fade: { name: 'Sanded fade', w: 20, h: 24, note: 'Hand sanding or laser; thighs, seat and knees.' },
  bleach: { name: 'Bleach splash', w: 18, h: 14, note: 'Sprayed or sponged hypochlorite / permanganate, then neutralised.' },
  paint: { name: 'Paint splatter', w: 16, h: 12, note: 'Flicked pigment paint, heat-cured.' },
  fray: { name: 'Frayed edge', w: 20, h: 5, note: 'Cut hem left raw; washing opens the fringe.' },
};
