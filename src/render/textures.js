// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Procedural fabric textures (weave + fx + dye effect + print design) drawn
 * once into small canvases and cached. 256 px tiles keep GPU memory tiny.
 */
import * as THREE from 'three';

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
      for (let x = 0; x < SIZE; x += pattern === 'rib' ? 12 : 8) {
        if (pattern === 'rib') { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, SIZE); g.stroke(); continue; }
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
    default: break;
  }
}

function applyFx(g, fx, base) {
  const r = rng(11);
  switch (fx) {
    case 'slub': for (let k = 0; k < 120; k++) { g.fillStyle = css(shade(base, 1.2), 0.25); g.fillRect(0, r() * SIZE, SIZE, 1 + r() * 2); } break;
    case 'faded': { const gr = g.createRadialGradient(SIZE / 2, SIZE / 2, 10, SIZE / 2, SIZE / 2, SIZE * 0.7); gr.addColorStop(0, 'rgba(255,255,255,0.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, SIZE, SIZE); break; }
    case 'mottled': for (let k = 0; k < 60; k++) { g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.12})`; g.beginPath(); g.arc(r() * SIZE, r() * SIZE, 10 + r() * 30, 0, Math.PI * 2); g.fill(); } break;
    case 'distressed': for (let k = 0; k < 18; k++) { g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 1 + r() * 2; const x = r() * SIZE; const y = r() * SIZE; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20 + r() * 30, y + (r() - 0.5) * 6); g.stroke(); } applyFx(g, 'faded', base); break;
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
  const [c1 = '#111111', c2 = '#ffffff', c3 = '#c0392b'] = colors;
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
    case 'leopard': for (let k = 0; k < 70; k++) { const x = r() * SIZE; const y = r() * SIZE; g.fillStyle = c3; g.beginPath(); g.ellipse(x, y, 7, 5, r() * 3, 0, 6.3); g.fill(); g.strokeStyle = c1; g.lineWidth = 2.5; g.beginPath(); g.arc(x, y, 9, r() * 3, r() * 3 + 3.5); g.stroke(); } break;
    case 'floral': for (let k = 0; k < 18; k++) { const x = r() * SIZE; const y = r() * SIZE; for (let p = 0; p < 5; p++) { g.fillStyle = c3; g.beginPath(); g.ellipse(x + Math.cos(p * 1.26) * 7, y + Math.sin(p * 1.26) * 7, 6, 3.5, p * 1.26, 0, 6.3); g.fill(); } g.fillStyle = c2; g.beginPath(); g.arc(x, y, 3, 0, 6.3); g.fill(); } break;
    case 'paisley': for (let k = 0; k < 14; k++) { const x = r() * SIZE; const y = r() * SIZE; g.strokeStyle = c1; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 22, y - 20, x + 30, y + 14, x, y + 18); g.bezierCurveTo(x - 8, y + 10, x - 4, y + 2, x, y); g.stroke(); } break;
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
export function fabricTextures(fab, finish = {}, dyeEffectKey, onUpdate) {
  const look = fab.look;
  const color = finish.color || look.color;
  const key = JSON.stringify([look.pattern, look.fx, color, look.patternColors, dyeEffectKey, finish.print?.design, finish.print?.colors, finish.print?.image?.slice(0, 64), finish.paint?.design, finish.paint?.colors]);
  if (cache.has(key)) return cache.get(key);
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE;
  const g = cv.getContext('2d');
  weave(g, look.pattern, color, look);
  if (look.fx) applyFx(g, look.fx, color);
  if (dyeEffectKey && dyeEffectKey !== 'solid') dyeEffect(g, dyeEffectKey, color);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  const p = finish.print;
  if (p?.design && p.design !== 'image' && p.design !== 'solid') printDesign(g, p.design, p.colors, 0.92);
  if (finish.paint?.design) printDesign(g, finish.paint.design, finish.paint.colors, 0.8);
  if (p?.image) {
    const im = loadImage(p.image, () => { cache.delete(key); onUpdate?.(); });
    if (im.complete && im.naturalWidth) { g.drawImage(im, 0, 0, SIZE, SIZE); }
  }
  // bump from luminance of the weave only
  const bump = new THREE.CanvasTexture(cv);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  const out = { map, bump };
  if (cache.size > 120) cache.clear();
  cache.set(key, out);
  return out;
}
