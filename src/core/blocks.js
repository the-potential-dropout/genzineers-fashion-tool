// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Parametric pattern drafting.
 *
 * Each generator turns a set of options into pattern panels (cm), their 3D
 * arrangement around the avatar, seams, trims (buttons, zips...) and
 * overlays (lapels, collars, pockets, cuffs, bands: pieces that are cut and
 * sewn on top of a base panel; they follow the cloth in 3D and appear in
 * the cut list / tech pack).
 *
 * Seams reference named edges ("tags"), resolved to index ranges.
 */

// ---------- polygon builder with tagged edges ----------
class Poly {
  constructor() { this.pts = []; this.tags = []; }
  add(x, y, tag) { this.pts.push([round(x), round(y)]); this.tags.push(tag); return this; }
  /** Edge index range [first, last] for a tag (edges start at the tagged point). */
  range(tag) {
    // contiguous run of edges with this tag, allowing wrap-around the outline
    const n = this.tags.length;
    let start = -1;
    for (let i = 0; i < n; i++) if (this.tags[i] === tag && this.tags[(i - 1 + n) % n] !== tag) { start = i; break; }
    if (start < 0) {
      if (this.tags.every((t) => t === tag)) return { edge: 0, to: n - 1 };
      throw new Error(`no edge tagged ${tag}`);
    }
    let end = start;
    while (this.tags[(end + 1) % n] === tag && (end + 1) % n !== start) end = (end + 1) % n;
    return { edge: start, to: end };
  }
}
const round = (v) => Math.round(v * 10) / 10;

/** Mirror a Poly across x=0 (left <-> right tags swapped), keeping a valid outline. */
function mirror(poly) {
  const out = new Poly();
  const n = poly.pts.length;
  // reversing the point order turns edge i (pt i -> i+1) into edge (pt i+1 -> i)
  for (let k = 0; k < n; k++) {
    const i = (n - k) % n;
    const prevTag = poly.tags[(i - 1 + n) % n];
    out.add(-poly.pts[i][0], poly.pts[i][1], swapSide(prevTag));
  }
  return out;
}
const swapSide = (t) => (t ? t.replace(/-r$/, '-X').replace(/-l$/, '-r').replace(/-X$/, '-l') : t);

function seam(pa, polyA, tagA, pb, polyB, tagB, stitch) {
  return { a: { panel: pa, ...polyA.range(tagA) }, b: { panel: pb, ...polyB.range(tagB) }, stitch };
}

// ---------- body reference (matches src/sim/avatar.js) ----------
import { DEFAULT_BODY } from './sizes.js';
// Reference body comes from the selected size (o.__body); generators read it via bodyOf().
const bodyOf = (o) => o.__body || DEFAULT_BODY;

const FIT = { slim: 8, regular: 14, relaxed: 20, oversized: 30 };

// =====================================================================
// TOPS: tees, tanks, shirts, hoodies, jackets, coats, dresses
// =====================================================================
export const TOP_OPTIONS = {
  fit: { label: 'Fit', type: 'select', values: ['slim', 'regular', 'relaxed', 'oversized'], default: 'regular' },
  length: { label: 'Body length (cm, shoulder to hem)', type: 'range', min: 40, max: 130, step: 1, default: 70 },
  flare: { label: 'Hem flare (cm per side)', type: 'range', min: -4, max: 40, step: 1, default: 0 },
  neckline: { label: 'Neckline', type: 'select', values: ['crew', 'v-neck', 'deep-v', 'scoop', 'boat', 'mock', 'henley', 'collar-stand'], default: 'crew' },
  sleeve: { label: 'Sleeves', type: 'select', values: ['none', 'cap', 'short', 'elbow', 'three-quarter', 'long'], default: 'short' },
  shoulder: { label: 'Shoulder / strap width (sleeveless)', type: 'select', values: ['full', 'tank', 'a-shirt', 'racer', 'strap'], default: 'full' },
  cuff: { label: 'Cuff', type: 'select', values: ['none', 'hemmed', 'rib', 'barrel', 'french', 'button-tab', 'elastic', 'rolled', 'zip', 'snap-tab', 'storm'], default: 'hemmed' },
  hem: { label: 'Hem', type: 'select', values: ['straight', 'curved', 'rib', 'drawcord', 'raw'], default: 'straight' },
  closure: { label: 'Closure', type: 'select', values: ['none', 'single-breasted', 'double-breasted', 'zip', 'two-way-zip', 'asymmetric-zip', 'snaps', 'toggles', 'half-zip', 'placket'], default: 'none' },
  buttons: { label: 'Buttons (front)', type: 'range', min: 1, max: 8, step: 1, default: 2 },
  lapel: { label: 'Lapel', type: 'select', values: ['none', 'notch', 'peak', 'shawl', 'biker'], default: 'none' },
  lapelWidth: { label: 'Lapel width (cm)', type: 'range', min: 4, max: 13, step: 0.5, default: 8 },
  collar: { label: 'Collar', type: 'select', values: ['none', 'point', 'spread', 'button-down', 'camp', 'mandarin', 'band-snap', 'polo', 'corduroy', 'hood', 'funnel', 'rib'], default: 'none' },
  pockets: { label: 'Pockets', type: 'select', values: ['none', 'chest', 'patch', 'welt', 'flap', 'kangaroo', 'bellows', 'zip'], default: 'none' },
  vent: { label: 'Back vent', type: 'select', values: ['none', 'center', 'side'], default: 'none' },
  belt: { label: 'Belt', type: 'select', values: ['none', 'self-belt', 'buckle-belt'], default: 'none' },
  insulation: { label: 'Insulation / fill', type: 'select', values: ['none', 'goose-down-900', 'goose-down-800', 'goose-down-700', 'duck-down-650', 'duck-down-550', 'hydrophobic-down', 'recycled-down', 'down-feather-50-50', 'feather', 'synthetic-microfiber', 'synthetic-continuous', 'thin-microfiber', 'polyester-wadding', 'recycled-poly-fill', 'wool-batting', 'cotton-batting', 'kapok', 'aerogel'], default: 'none' },
  fillWeight: { label: 'Fill weight (g/m²)', type: 'range', min: 40, max: 400, step: 10, default: 120 },
  quilting: { label: 'Quilting', type: 'select', values: ['channel', 'box', 'diamond', 'onion', 'chevron', 'welded', 'none'], default: 'channel' },
  lining: { label: 'Lining', type: 'select', values: ['none', 'half', 'full'], default: 'none' },
};

function topPanels(o) {
  const BODY = bodyOf(o);
  const ease = FIT[o.fit] ?? 14;
  const hw = (BODY.chest + ease) / 4; // half panel width at chest
  const H = o.length;
  const sleeveless = o.sleeve === 'none';
  const armDepth = sleeveless ? ({ full: 22, tank: 24, 'a-shirt': 27, racer: 26, strap: 24 }[o.shoulder] ?? 23) : 21 + ease * 0.12;
  const sideH = H - armDepth;
  const neckW = o.neckline === 'boat' ? 13 : 8;
  const shoulderX = sleeveless
    ? ({ full: 19, tank: neckW + 6, 'a-shirt': neckW + 3.5, racer: neckW + 4, strap: neckW + 2.5 }[o.shoulder] ?? 19)
    : 19.5 + ease * 0.08;
  const shoulderDrop = sleeveless && o.shoulder !== 'full' ? 1 : 4;
  const hemW = hw + o.flare;
  const curvedHem = o.hem === 'curved' ? 5 : 0;
  const drops = { crew: [8, 2.5], 'v-neck': [17, 2.5], 'deep-v': [26, 2.5], scoop: [14, 3], boat: [3, 2], mock: [5, 2], henley: [8, 2.5], 'collar-stand': [7, 2.5] };
  const [frontDrop, backDrop] = drops[o.neckline] || drops.crew;
  const aDeep = sleeveless && (o.shoulder === 'a-shirt' || o.shoulder === 'racer');

  const build = (drop, isBack) => {
    const p = new Poly();
    // right half (wearer's left when viewed from the front), bottom -> top
    p.add(0, 0, 'hem-r');
    if (curvedHem) p.add(hemW * 0.6, 0.5, 'hem-r');
    p.add(hemW, curvedHem, 'side-r');
    if (Math.abs(o.flare) > 2 && H > 75) p.add(hw - 1, Math.max(curvedHem + 5, sideH - 28), 'side-r'); // waist shaping for dresses
    p.add(hw, sideH, 'arm-r');
    const scoop = aDeep ? 6 : 1.5;
    p.add(hw - scoop, sideH + armDepth * 0.35, 'arm-r');
    p.add(shoulderX + (aDeep ? 0.5 : 0.8), sideH + armDepth * 0.72, 'arm-r');
    p.add(shoulderX, H - shoulderDrop, 'sh-r');
    p.add(neckW, H, 'neck-r');
    if (o.neckline === 'v-neck' || o.neckline === 'deep-v') {
      p.add(neckW * 0.5, H - drop * 0.5, 'neck-r');
    } else {
      p.add(neckW * 0.75, H - drop * 0.55, 'neck-r');
      p.add(neckW * 0.35, H - drop * 0.92, 'neck-r');
    }
    // centre front/back neck point; then mirror the left half
    const right = p.pts.slice();
    const tags = p.tags.slice();
    const full = new Poly();
    for (let i = 0; i < right.length; i++) full.add(right[i][0], right[i][1], tags[i]);
    full.add(0, H - drop, 'neck-l');
    for (let i = right.length - 1; i >= 1; i--) {
      const tag = swapSide(tags[i - 1]);
      full.add(-right[i][0], right[i][1], tag);
    }
    void isBack;
    return full;
  };
  return { front: build(frontDrop, false), back: build(backDrop, true), hw, H, sideH, armDepth, ease, neckW, shoulderX };
}

function sleevePanel(o, ease, side) {
  const BODY = bodyOf(o);
  const lengths = { cap: 9, short: 22, elbow: 32, 'three-quarter': 44, long: 60 };
  const L = lengths[o.sleeve] || 22;
  const W = 34 * BODY.gs + ease * 0.5; // bicep circumference incl. ease
  const cuffW = o.sleeve === 'long' || o.sleeve === 'three-quarter' ? (o.cuff === 'rib' || o.cuff === 'elastic' ? 21 : 25 + ease * 0.2) : W - 3;
  const capH = 9 + (o.fit === 'slim' ? 3 : 0);
  const p = new Poly();
  p.add(L, -cuffW / 2, 'cuff');
  p.add(L, cuffW / 2, 'under-f');
  p.add(0, W / 2, 'cap-f');
  p.add(-capH * 0.45, W * 0.3, 'cap-f');
  p.add(-capH * 0.9, W * 0.1, 'cap-f');
  p.add(-capH, 0, 'cap-b');
  p.add(-capH * 0.9, -W * 0.1, 'cap-b');
  p.add(-capH * 0.45, -W * 0.3, 'cap-b');
  p.add(0, -W / 2, 'under-b');
  const R = W / (2 * Math.PI) / 100;
  return { poly: p, L, W, cuffW, R: Math.max(R, 0.058), side };
}

export function buildTop(o, prefix = '', fabric = 'cotton-jersey') {
  const BODY = bodyOf(o);
  const t = topPanels(o);
  const id = (s) => `${prefix}${s}`;
  const baseY = BODY.shoulderY - t.H / 100 + 0.005;
  const R = 0.21 + t.ease / 400;
  const Rh = Math.max(R, (t.hw + o.flare) / 145); // hem radius (cone) so wide hems don't overlap
  const panels = [
    { id: id('front'), name: 'Front', role: 'body', points: t.front.pts, placement: { position: [0, baseY, R], rotationY: 0, wrap: Rh, wrapTop: R, wrapTopY: t.H, wrapMax: o.sleeve === 'none' ? 1.5 : 0.95 }, fabric },
    { id: id('back'), name: 'Back', role: 'body', points: t.back.pts, placement: { position: [0, baseY, -R], rotationY: Math.PI, wrap: Rh, wrapTop: R, wrapTopY: t.H, wrapMax: o.sleeve === 'none' ? 1.5 : 0.95 }, fabric },
  ];
  const sideStitch = o.__stitch || 'overlock-504';
  const seams = [
    seam(id('front'), t.front, 'side-r', id('back'), t.back, 'side-l', sideStitch),
    seam(id('front'), t.front, 'side-l', id('back'), t.back, 'side-r', sideStitch),
    seam(id('front'), t.front, 'sh-r', id('back'), t.back, 'sh-l', sideStitch),
    seam(id('front'), t.front, 'sh-l', id('back'), t.back, 'sh-r', sideStitch),
  ];
  const trims = [];
  const overlays = [];

  if (o.sleeve !== 'none') {
    for (const side of [1, -1]) {
      const sl = sleevePanel(o, t.ease, side);
      const sid = id(side > 0 ? 'sleeve-r' : 'sleeve-l');
      // front body panel: wearer-left is +x in world; front 'arm-r' is at +x,
      // back 'arm-l' is at +x (back panel is rotated 180 degrees)
      panels.push({ id: sid, name: side > 0 ? 'Sleeve (right)' : 'Sleeve (left)', role: 'sleeve', points: sl.poly.pts, placement: { arm: side, radius: sl.R + 0.01, position: [BODY.armStartX * side, 1.38 * BODY.hs, 0] }, fabric });
      seams.push(seam(sid, sl.poly, 'under-f', sid, sl.poly, 'under-b', sideStitch));
      seams.push(seam(sid, sl.poly, 'cap-f', id('front'), t.front, side > 0 ? 'arm-r' : 'arm-l', sideStitch));
      seams.push(seam(sid, sl.poly, 'cap-b', id('back'), t.back, side > 0 ? 'arm-l' : 'arm-r', sideStitch));
      // cuffs
      const cuffDepth = { rib: 7, barrel: 6, french: 8, 'button-tab': 0, elastic: 3, rolled: 5, storm: 0, 'snap-tab': 0, zip: 0, hemmed: 2.5, none: 0 }[o.cuff] ?? 0;
      if (cuffDepth) overlays.push({ kind: 'cuff', style: o.cuff, panel: sid, points: rect(sl.L - cuffDepth, -sl.cuffW / 2, sl.L, sl.cuffW / 2) });
      if (['barrel', 'button-tab'].includes(o.cuff)) trims.push({ type: 'button-4hole', panel: sid, at: [sl.L - 3, sl.cuffW / 2 - 3], size: 11 });
      if (o.cuff === 'french') trims.push({ type: 'cufflink', panel: sid, at: [sl.L - 4, sl.cuffW / 2 - 2], size: 14 });
      if (o.cuff === 'snap-tab') trims.push({ type: 'snap', panel: sid, at: [sl.L - 3, sl.cuffW / 2 - 2] });
      if (o.cuff === 'zip') trims.push({ type: 'zipper', panel: sid, at: [sl.L - 12, -sl.cuffW / 2 + 1], to: [sl.L, -sl.cuffW / 2 + 1] });
    }
  }

  // hem / neck finishes
  if (o.hem === 'rib') overlays.push({ kind: 'band', style: 'rib', panel: id('front'), points: rect(-t.hw, 0, t.hw, 7) }, { kind: 'band', style: 'rib', panel: id('back'), points: rect(-t.hw, 0, t.hw, 7) });
  if (o.hem === 'drawcord') { trims.push({ type: 'cord-stopper', panel: id('front'), at: [t.hw - 4, 2] }, { type: 'grommet', panel: id('front'), at: [-t.hw + 4, 2] }); }
  if (o.neckline === 'henley') { overlays.push({ kind: 'placket', panel: id('front'), points: rect(-1.5, t.H - 22, 1.5, t.H - 8) }); for (const y of [t.H - 11, t.H - 15, t.H - 19]) trims.push({ type: 'button-2hole', panel: id('front'), at: [0, y], size: 10 }); }

  // closures
  const top = t.H - 10;
  const bot = Math.max(8, t.H * 0.3);
  if (o.closure === 'single-breasted' || o.closure === 'placket' || o.closure === 'snaps' || o.closure === 'toggles') {
    const n = o.closure === 'placket' ? Math.max(o.buttons, 5) : o.buttons;
    const hi = o.lapel !== 'none' ? t.H * 0.62 : top;
    const lo = o.lapel !== 'none' ? Math.max(bot, hi - (n - 1) * 10) : bot;
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? hi : hi - (i * (hi - lo)) / (n - 1);
      trims.push({ type: o.closure === 'snaps' ? 'snap' : o.closure === 'toggles' ? 'toggle-horn' : o.__button || 'button-4hole', panel: id('front'), at: [0, y], size: o.closure === 'toggles' ? 45 : undefined });
    }
    if (o.closure === 'placket') overlays.push({ kind: 'placket', panel: id('front'), points: rect(-1.8, 0, 1.8, t.H - 7) });
  }
  if (o.closure === 'double-breasted') {
    const n = Math.max(2, o.buttons);
    const rows = Math.ceil(n / 2);
    const hi = t.H * 0.6;
    for (let i = 0; i < rows; i++) for (const x of [-7, 7]) trims.push({ type: o.__button || 'button-4hole', panel: id('front'), at: [x, hi - i * 10] });
  }
  if (['zip', 'two-way-zip', 'half-zip'].includes(o.closure)) trims.push({ type: 'zipper', panel: id('front'), at: [0, 1], to: [0, o.closure === 'half-zip' ? t.H - 4 : t.H - 8], twoWay: o.closure === 'two-way-zip' });
  if (o.closure === 'asymmetric-zip') trims.push({ type: 'zipper', panel: id('front'), at: [6, 1], to: [-7, t.H - 5] });

  // lapels / collars (overlays on the front)
  const lw = o.lapelWidth;
  const breakY = t.H * 0.62;
  if (o.lapel === 'notch' || o.lapel === 'peak' || o.lapel === 'shawl') {
    for (const s of [1, -1]) {
      const pts = o.lapel === 'shawl'
        ? [[0, breakY], [s * lw, t.H - 16], [s * (t.neckW + 2), t.H - 3], [s * t.neckW, t.H], [s * 1, t.H - 12]]
        : [[0, breakY], [s * lw, t.H - 18], [s * (lw + (o.lapel === 'peak' ? 3 : 0)), t.H - (o.lapel === 'peak' ? 8 : 12)], [s * (lw - 3), t.H - (o.lapel === 'peak' ? 10 : 9)], [s * (t.neckW + 1), t.H - 4], [s * t.neckW, t.H], [s * 1, t.H - 12]];
      overlays.push({ kind: 'lapel', style: o.lapel, panel: id('front'), points: s > 0 ? pts : pts.slice().reverse() });
    }
  }
  if (o.lapel === 'biker') {
    overlays.push({ kind: 'lapel', style: 'biker', panel: id('front'), points: [[-2, t.H - 22], [-12, t.H - 10], [-9, t.H - 3], [-t.neckW, t.H], [-3, t.H - 10]] });
    overlays.push({ kind: 'lapel', style: 'biker', panel: id('front'), points: [[8, t.H - 26], [16, t.H - 12], [12, t.H - 4], [t.neckW, t.H], [4, t.H - 14]] });
    trims.push({ type: 'snap', panel: id('front'), at: [-10, t.H - 8] }, { type: 'snap', panel: id('front'), at: [14, t.H - 10] });
  }
  if (['point', 'spread', 'button-down', 'camp', 'polo', 'corduroy'].includes(o.collar)) {
    const spread = { point: 4, spread: 7, 'button-down': 4.5, camp: 9, polo: 6, corduroy: 8 }[o.collar];
    const len = { camp: 11, corduroy: 10 }[o.collar] || 8;
    for (const s of [1, -1]) {
      const pts = [[s * 0.5, t.H - 6], [s * (spread + 2), t.H - 6 - len * 0.7], [s * (t.neckW + 3), t.H - 1], [s * t.neckW, t.H + 0.5]];
      overlays.push({ kind: 'collar', style: o.collar, panel: id('front'), points: s > 0 ? pts : pts.slice().reverse(), fabric: o.collar === 'corduroy' ? 'corduroy' : undefined });
      if (o.collar === 'button-down') trims.push({ type: 'button-2hole', panel: id('front'), at: [s * (spread + 1), t.H - 6 - len * 0.6], size: 9 });
    }
    overlays.push({ kind: 'collar', style: o.collar, panel: id('back'), points: rect(-t.neckW - 1, t.H - 5, t.neckW + 1, t.H) });
  }
  if (['mandarin', 'band-snap', 'funnel', 'rib'].includes(o.collar)) {
    const hgt = { mandarin: 3.5, 'band-snap': 4, funnel: 7, rib: 2.5 }[o.collar];
    for (const pid of ['front', 'back']) overlays.push({ kind: 'collar', style: o.collar, panel: id(pid), points: rect(-t.neckW - 1, t.H - hgt - 1, t.neckW + 1, t.H) });
    if (o.collar === 'band-snap') trims.push({ type: 'snap', panel: id('front'), at: [-3, t.H - 2] });
  }
  if (o.collar === 'hood') {
    overlays.push({ kind: 'hood', panel: id('back'), points: [[-16, t.H - 1], [16, t.H - 1], [15, t.H - 24], [6, t.H - 33], [-6, t.H - 33], [-15, t.H - 24]] });
    trims.push({ type: 'grommet', panel: id('front'), at: [4, t.H - 4] }, { type: 'grommet', panel: id('front'), at: [-4, t.H - 4] });
  }

  // pockets
  const pk = o.pockets;
  if (pk === 'chest' || pk === 'patch' || pk === 'flap' || pk === 'bellows') overlays.push({ kind: 'pocket', style: 'patch', panel: id('front'), points: rect(-15, t.H - 30, -5, t.H - 18) });
  if (pk === 'patch' || pk === 'flap' || pk === 'bellows') for (const s of [1, -1]) overlays.push({ kind: 'pocket', style: pk === 'bellows' ? 'bellows' : 'patch', panel: id('front'), points: rect(s > 0 ? 5 : -18, bot - 2, s > 0 ? 18 : -5, bot + 13) });
  if (pk === 'flap' || pk === 'bellows') for (const s of [1, -1]) { overlays.push({ kind: 'flap', panel: id('front'), points: rect(s > 0 ? 4.5 : -18.5, bot + 11, s > 0 ? 18.5 : -4.5, bot + 16) }); trims.push({ type: 'snap', panel: id('front'), at: [s * 11.5, bot + 12.5] }); }
  if (pk === 'welt') for (const s of [1, -1]) overlays.push({ kind: 'pocket', style: 'welt', panel: id('front'), points: rect(s > 0 ? 6 : -19, bot + 6, s > 0 ? 19 : -6, bot + 8) });
  if (pk === 'kangaroo') overlays.push({ kind: 'pocket', style: 'kangaroo', panel: id('front'), points: [[-17, bot - 2], [17, bot - 2], [13, bot + 16], [-13, bot + 16]] });
  if (pk === 'zip') for (const s of [1, -1]) trims.push({ type: 'zipper', panel: id('front'), at: [s * 8, bot + 2], to: [s * 16, bot + 16] });

  if (o.vent === 'center') overlays.push({ kind: 'vent', panel: id('back'), points: rect(-0.5, 0, 0.5, 22) });
  if (o.vent === 'side') for (const s of [1, -1]) overlays.push({ kind: 'vent', panel: id('back'), points: rect(s * t.hw - 0.5, 0, s * t.hw + 0.5, 20) });
  if (o.belt !== 'none') {
    for (const pid of ['front', 'back']) overlays.push({ kind: 'belt', panel: id(pid), points: rect(-t.hw - o.flare * 0.3, t.sideH - 24, t.hw + o.flare * 0.3, t.sideH - 19) });
    if (o.belt === 'buckle-belt') trims.push({ type: 'buckle', panel: id('front'), at: [0, t.sideH - 21.5] });
  }
  if (o.insulation && o.insulation !== 'none') {
    for (const pan of panels) pan.insulation = { fill: o.insulation, weight: o.fillWeight, quilting: o.quilting };
  }
  if (o.sleeve === 'none' && o.shoulder === 'strap') for (const pan of panels) if (pan.role === 'body') pan.tack = { y0: t.H - 2, y1: t.H + 1 };
  if (o.lining && o.lining !== 'none') for (const pan of panels) if (o.lining === 'full' || pan.role === 'body') pan.lining = 'acetate-satin';
  return { panels, seams, trims, overlays };
}

// =====================================================================
// BOTTOMS: trousers, jeans, chinos, shorts, joggers
// =====================================================================
export const BOTTOM_OPTIONS = {
  fit: { label: 'Fit', type: 'select', values: ['slim', 'regular', 'relaxed', 'oversized'], default: 'regular' },
  inseam: { label: 'Inseam (cm)', type: 'range', min: 8, max: 84, step: 0.5, default: 78 },
  rise: { label: 'Rise', type: 'select', values: ['low', 'mid', 'high'], default: 'mid' },
  leg: { label: 'Leg shape', type: 'select', values: ['skinny', 'slim', 'tapered', 'straight', 'wide', 'bootcut', 'flare'], default: 'straight' },
  waistband: { label: 'Waistband', type: 'select', values: ['button', 'hook-bar', 'elastic', 'drawstring', 'side-adjusters'], default: 'button' },
  fly: { label: 'Fly', type: 'select', values: ['zip', 'button', 'none'], default: 'zip' },
  hem: { label: 'Hem', type: 'select', values: ['plain', 'turn-up', 'rib-cuff', 'raw', 'split'], default: 'plain' },
  pockets: { label: 'Pockets', type: 'select', values: ['five-pocket', 'slant', 'side-seam', 'cargo', 'welt-back', 'none'], default: 'slant' },
  pleats: { label: 'Pleats', type: 'select', values: ['flat', 'single', 'double'], default: 'flat' },
  beltLoops: { label: 'Belt loops', type: 'select', values: ['yes', 'no'], default: 'yes' },
};

export function buildBottom(o, prefix = '', fabric = 'cotton-twill') {
  const BODY = bodyOf(o);
  const id = (s) => `${prefix}${s}`;
  const ease = (FIT[o.fit] ?? 14) * 0.6;
  const riseCm = { low: 20, mid: 25, high: 31 }[o.rise] ?? 25;
  const I = o.inseam;
  const legHalf = { skinny: 7, slim: 8.5, tapered: 8, straight: 10.5, wide: 15, bootcut: 11.5, flare: 16 }[o.leg] ?? 10.5;
  const kneeHalf = Math.min(legHalf + 1.5, { bootcut: 9.5, flare: 9.5 }[o.leg] ?? legHalf + 1.5);
  const thighHalf = 13 + ease * 0.4;
  const hipQ = (BODY.hip + ease * 2) / 4;
  const waistQ = (BODY.waist + 4 + (o.waistband === 'elastic' || o.waistband === 'drawstring' ? 14 : 0)) / 4;
  const shortLeg = I < 30;
  // leg-centred coordinates: x=0 at leg centre, +x outseam, -x towards crotch
  const legPoly = (crotchExt, extraRise) => {
    const p = new Poly();
    const hem = shortLeg ? thighHalf + 1 : legHalf;
    p.add(-hem, 0, 'hem');
    p.add(hem, 0, 'out');
    if (!shortLeg && I > 45) p.add(kneeHalf, I * 0.45, 'out');
    p.add(thighHalf, I, 'out');
    p.add(hipQ - 10, I + riseCm * 0.6, 'out');
    p.add(waistQ - 10 + 1, I + riseCm + extraRise, 'waist');
    p.add(-10, I + riseCm + extraRise, 'cf');
    p.add(-10.5, I + riseCm * 0.45, 'cf');
    p.add(-10 - crotchExt * 0.6, I + 2.5, 'cf');
    p.add(-10 - crotchExt, I, 'in');
    if (!shortLeg && I > 45) p.add(-kneeHalf, I * 0.45, 'in');
    return p;
  };
  const front = legPoly(4, 0);
  const back = legPoly(9, 5);
  const hemY = BODY.crotchY - I / 100 + 0.005;
  const panels = [];
  const seams = [];
  const R = 0.12 + ease / 300;
  // mirror: flip local x so the outseam faces outwards; leg: which leg (+1 = +x world)
  const mk = (pid, name, poly, mirrorX, leg, isBack) => {
    const pts = mirrorX > 0 ? poly.pts : poly.pts.map(([x, y]) => [-x, y]);
    panels.push({ id: id(pid), name, role: 'leg', points: pts, placement: { position: [0.1 * BODY.hipS * leg, hemY, isBack ? -R : R], rotationY: isBack ? Math.PI : 0, wrap: R, wrapMax: 1.35 }, fabric });
  };
  // front panels face +z; back panels are rotated PI (local +x -> world -x)
  mk('front-r', 'Front (right leg)', front, 1, 1, false);
  mk('front-l', 'Front (left leg)', front, -1, -1, false);
  mk('back-r', 'Back (right leg)', back, -1, 1, true);
  mk('back-l', 'Back (left leg)', back, 1, -1, true);
  const st = o.__stitch || 'safety-516';
  // mirrored panels share edge indices with their source poly (only x changes)
  seams.push(seam(id('front-r'), front, 'out', id('back-r'), back, 'out', st));
  seams.push(seam(id('front-r'), front, 'in', id('back-r'), back, 'in', st));
  seams.push(seam(id('front-l'), front, 'out', id('back-l'), back, 'out', st));
  seams.push(seam(id('front-l'), front, 'in', id('back-l'), back, 'in', st));
  seams.push(seam(id('front-r'), front, 'cf', id('front-l'), front, 'cf', 'chainstitch-401'));
  seams.push(seam(id('back-r'), back, 'cf', id('back-l'), back, 'cf', 'chainstitch-401'));

  const top = I + riseCm;
  const trims = [];
  const overlays = [];
  for (const pan of panels) pan.tack = { y0: top - 3, y1: top + 6 };
  if (o.waistband === 'elastic' || o.waistband === 'drawstring') for (const pan of panels) pan.gather = [{ y0: top - 4, y1: top + 6, ratio: (BODY.waist + 4) / (BODY.waist + 18) }];
  if (o.hem === 'rib-cuff') for (const pan of panels) pan.gather = [...(pan.gather || []), { y0: -1, y1: 7, ratio: 0.75 }];
  for (const pid of ['front-r', 'front-l', 'back-r', 'back-l']) {
    const s = pid.endsWith('-r') === pid.startsWith('front') ? 1 : -1;
    const isBack = pid.startsWith('back');
    const w0 = -10; const w1 = waistQ - 9;
    const pts = s > 0 ? rect(w0, top - 4 + (isBack ? 5 : 0), w1, top + (isBack ? 5 : 0)) : rect(-w1, top - 4 + (isBack ? 5 : 0), -w0, top + (isBack ? 5 : 0));
    overlays.push({ kind: 'waistband', style: o.waistband, panel: id(pid), points: pts });
    if (o.hem === 'turn-up') overlays.push({ kind: 'cuff', style: 'turn-up', panel: id(pid), points: rect(-legHalf, 0, legHalf, 4) });
    if (o.hem === 'rib-cuff') overlays.push({ kind: 'cuff', style: 'rib', panel: id(pid), points: rect(-legHalf, 0, legHalf, 7) });
    if (o.beltLoops === 'yes' && o.waistband !== 'elastic') trims.push({ type: 'belt-loop', panel: id(pid), at: [s * 4, top - 2 + (isBack ? 5 : 0)] });
  }
  if (o.waistband === 'button') trims.push({ type: o.pockets === 'five-pocket' ? 'jeans-button' : 'button-4hole', panel: id('front-r'), at: [-9, top - 2] });
  if (o.waistband === 'drawstring') trims.push({ type: 'grommet', panel: id('front-r'), at: [-8, top - 2] }, { type: 'grommet', panel: id('front-l'), at: [8, top - 2] });
  if (o.fly === 'zip') overlays.push({ kind: 'fly', panel: id('front-r'), points: rect(-10, top - 18, -7, top - 4) });
  if (o.pockets === 'five-pocket') {
    for (const pid of ['front-r', 'front-l']) {
      const s = pid === 'front-r' ? 1 : -1;
      overlays.push({ kind: 'pocket', style: 'scoop', panel: id(pid), points: [[s * (waistQ - 9), top - 4], [s * (waistQ - 9), top - 13], [s * 2, top - 4]] });
      trims.push({ type: 'rivet', panel: id(pid), at: [s * (waistQ - 9.5), top - 12] }, { type: 'rivet', panel: id(pid), at: [s * 2.5, top - 4.5] });
    }
    overlays.push({ kind: 'pocket', style: 'coin', panel: id('front-r'), points: rect(waistQ - 15, top - 11, waistQ - 10, top - 5) });
    for (const pid of ['back-r', 'back-l']) overlays.push({ kind: 'pocket', style: 'patch', panel: id(pid), points: rect(-6, top - 18, 8, top - 5) });
    for (const pid of ['back-r', 'back-l']) overlays.push({ kind: 'yoke', panel: id(pid), points: [[-11, top + 5], [waistQ - 8, top + 5], [waistQ - 7, top - 3], [-11, top - 7]] });
  }
  if (o.pockets === 'slant') for (const pid of ['front-r', 'front-l']) { const s = pid === 'front-r' ? 1 : -1; overlays.push({ kind: 'pocket', style: 'slant', panel: id(pid), points: [[s * (waistQ - 9), top - 4], [s * (waistQ - 8.5), top - 18], [s * (waistQ - 13), top - 4]] }); }
  if (o.pockets === 'cargo') for (const pid of ['front-r', 'front-l']) { const s = pid === 'front-r' ? 1 : -1; overlays.push({ kind: 'pocket', style: 'bellows', panel: id(pid), points: rect(s > 0 ? 6 : -19, I - 6, s > 0 ? 19 : -6, I + 12) }); overlays.push({ kind: 'flap', panel: id(pid), points: rect(s > 0 ? 5.5 : -19.5, I + 10, s > 0 ? 19.5 : -5.5, I + 15) }); trims.push({ type: 'snap', panel: id(pid), at: [s * 12.5, I + 11.5] }); }
  if (o.pockets === 'welt-back' || o.pockets === 'slant') for (const pid of ['back-r', 'back-l']) overlays.push({ kind: 'pocket', style: 'welt', panel: id(pid), points: rect(-5, top - 9, 8, top - 7.5) });
  if (o.pleats !== 'flat') for (const pid of ['front-r', 'front-l']) { const s = pid === 'front-r' ? 1 : -1; for (let k = 0; k < (o.pleats === 'double' ? 2 : 1); k++) overlays.push({ kind: 'pleat', panel: id(pid), points: rect(s * (1 + k * 3) - 0.3, top - 12, s * (1 + k * 3) + 0.3, top - 4) }); }
  return { panels, seams, trims, overlays };
}

// =====================================================================
// SKIRTS
// =====================================================================
export const SKIRT_OPTIONS = {
  length: { label: 'Length (cm)', type: 'range', min: 30, max: 105, step: 1, default: 58 },
  flare: { label: 'Flare (cm per side at hem)', type: 'range', min: -6, max: 45, step: 1, default: 14 },
  waistband: { label: 'Waistband', type: 'select', values: ['button', 'elastic', 'facing', 'yoke'], default: 'button' },
  slit: { label: 'Slit', type: 'select', values: ['none', 'front', 'back', 'side'], default: 'none' },
  pockets: { label: 'Pockets', type: 'select', values: ['none', 'patch', 'five-pocket'], default: 'none' },
};
export function buildSkirt(o, prefix = '', fabric = 'denim') {
  const BODY = bodyOf(o);
  const id = (s) => `${prefix}${s}`;
  const wq = (BODY.waist + (o.waistband === 'elastic' ? 18 : 6)) / 4;
  const mk = () => {
    const p = new Poly();
    p.add(-(wq + o.flare), 0, 'hem');
    p.add(wq + o.flare, 0, 'side-r');
    if (o.flare < 6) p.add(wq + 4, o.length - 20, 'side-r');
    p.add(wq, o.length, 'waist');
    p.add(-wq, o.length, 'side-l');
    if (o.flare < 6) p.add(-(wq + 4), o.length - 20, 'side-l');
    return p;
  };
  const f = mk();
  const b = mk();
  const y = BODY.waistY - o.length / 100;
  const panels = [
    { id: id('front'), name: 'Front', role: 'body', points: f.pts, placement: { position: [0, y, 0.16], rotationY: 0, wrap: Math.max(0.16, (wq + o.flare) / 145), wrapTop: 0.16, wrapTopY: o.length, wrapMax: 1.5 }, fabric },
    { id: id('back'), name: 'Back', role: 'body', points: b.pts, placement: { position: [0, y, -0.16], rotationY: Math.PI, wrap: Math.max(0.16, (wq + o.flare) / 145), wrapTop: 0.16, wrapTopY: o.length, wrapMax: 1.5 }, fabric },
  ];
  const st = o.__stitch || 'safety-516';
  const seams = [seam(id('front'), f, 'side-r', id('back'), b, 'side-l', st), seam(id('front'), f, 'side-l', id('back'), b, 'side-r', st)];
  const overlays = [];
  const trims = [];
  for (const pan of panels) pan.tack = { y0: o.length - 3, y1: o.length + 1 };
  if (o.waistband === 'elastic') for (const pan of panels) pan.gather = [{ y0: o.length - 4, y1: o.length + 1, ratio: (BODY.waist + 6) / (BODY.waist + 18) }];
  for (const pid of ['front', 'back']) overlays.push({ kind: 'waistband', style: o.waistband, panel: id(pid), points: rect(-wq, o.length - 4, wq, o.length) });
  if (o.waistband === 'button') trims.push({ type: o.pockets === 'five-pocket' ? 'jeans-button' : 'button-4hole', panel: id('front'), at: [0, o.length - 2] });
  if (o.slit !== 'none') overlays.push({ kind: 'vent', panel: id(o.slit === 'back' ? 'back' : 'front'), points: rect((o.slit === 'side' ? wq + o.flare - 1 : 0) - 0.4, 0, (o.slit === 'side' ? wq + o.flare - 1 : 0) + 0.4, Math.min(30, o.length * 0.4)) });
  if (o.pockets === 'patch') for (const s of [1, -1]) overlays.push({ kind: 'pocket', style: 'patch', panel: id('back'), points: rect(s > 0 ? 3 : -15, o.length - 20, s > 0 ? 15 : -3, o.length - 7) });
  if (o.pockets === 'five-pocket') { for (const s of [1, -1]) overlays.push({ kind: 'pocket', style: 'scoop', panel: id('front'), points: [[s * wq, o.length - 4], [s * wq, o.length - 13], [s * (wq - 9), o.length - 4]] }); trims.push({ type: 'rivet', panel: id('front'), at: [wq - 1, o.length - 12] }, { type: 'rivet', panel: id('front'), at: [-wq + 1, o.length - 12] }); }
  return { panels, seams, trims, overlays };
}

// =====================================================================
// ACCESSORIES: scarf, tie, beanie, bucket hat
// =====================================================================
export const SCARF_OPTIONS = {
  length: { label: 'Length (cm)', type: 'range', min: 100, max: 220, step: 5, default: 170 },
  width: { label: 'Width (cm)', type: 'range', min: 15, max: 70, step: 1, default: 28 },
  ends: { label: 'Ends', type: 'select', values: ['hemmed', 'fringe', 'raw'], default: 'fringe' },
};
export function buildScarf(o, prefix = '', fabric = 'wool-cashmere') {
  const B = bodyOf(o);
  const id = (s) => `${prefix}${s}`;
  const L = o.length / 2;
  const panels = [{ id: id('scarf'), name: 'Scarf', role: 'accessory', points: rect(-L, -o.width / 2, L, o.width / 2), placement: { position: [0, 1.5 * B.hs, 0.11 * (B.neck / 38)], rotationY: 0, wrap: 0.11 * (B.neck / 38), wrapMax: Math.PI * 0.98 }, fabric }];
  const trims = o.ends === 'fringe' ? [{ type: 'fringe', panel: id('scarf'), at: [-L + 1, -o.width / 2], to: [-L + 1, o.width / 2] }, { type: 'fringe', panel: id('scarf'), at: [L - 1, -o.width / 2], to: [L - 1, o.width / 2] }] : [];
  return { panels, seams: [], trims, overlays: [] };
}

export const TIE_OPTIONS = {
  width: { label: 'Blade width (cm)', type: 'range', min: 4, max: 10, step: 0.5, default: 7.5 },
  length: { label: 'Hanging length (cm)', type: 'range', min: 35, max: 60, step: 1, default: 48 },
  tip: { label: 'Tip', type: 'select', values: ['pointed', 'square'], default: 'pointed' },
  knot: { label: 'Knot', type: 'select', values: ['four-in-hand', 'half-windsor', 'windsor', 'bow'], default: 'four-in-hand' },
};
export function buildTie(o, prefix = '', fabric = 'silk-twill') {
  const B = bodyOf(o);
  const id = (s) => `${prefix}${s}`;
  const w = o.width / 2;
  const L = o.length;
  const pts = o.knot === 'bow'
    ? [[-9, -3], [-1, -0.8], [1, -0.8], [9, -3], [9, 3], [1, 0.8], [-1, 0.8], [-9, 3]]
    : (o.tip === 'pointed' ? [[0, 0], [w, 5], [w * 0.55, L], [-w * 0.55, L], [-w, 5]] : [[-w, 0], [w, 0], [w * 0.55, L], [-w * 0.55, L]]);
  const placement = o.knot === 'bow' ? { position: [0, 1.47 * B.hs, 0.085 * B.gs], rotationY: 0 } : { position: [0, 1.47 * B.hs - L / 100, 0.13 * B.gs], rotationY: 0 };
  const pins = o.knot === 'bow' ? [[-1, 0], [1, 0]] : [[0, L - 1], [-w * 0.4, L - 1], [w * 0.4, L - 1]];
  const panels = [{ id: id('tie'), name: o.knot === 'bow' ? 'Bow tie' : 'Tie blade', role: 'accessory', points: pts, placement, fabric, pins }];
  const trims = o.knot === 'bow' ? [] : [{ type: 'tie-knot', panel: id('tie'), at: [0, L - 2], size: { 'four-in-hand': 35, 'half-windsor': 42, windsor: 50 }[o.knot] || 35 }];
  return { panels, seams: [], trims, overlays: [] };
}

export const HAT_OPTIONS = {
  style: { label: 'Style', type: 'select', values: ['beanie', 'cuffed-beanie', 'slouch-beanie', 'bucket', 'fedora', 'trilby', 'panama', 'beret', 'baseball', 'snapback', 'trucker', 'dad-cap', 'five-panel', 'flat-cap', 'visor'], default: 'cuffed-beanie' },
  height: { label: 'Crown height (cm)', type: 'range', min: 8, max: 30, step: 1, default: 21 },
  brim: { label: 'Brim / bill length (cm)', type: 'range', min: 3, max: 12, step: 0.5, default: 6.5 },
  stiffener: { label: 'Brim / bill insert', type: 'select', values: ['polyethylene', 'cardboard', 'pvc', 'eva-foam', 'buckram', 'felt-wire', 'straw-sized', 'none'], default: 'polyethylene' },
  billShape: { label: 'Bill shape (caps)', type: 'select', values: ['curved', 'flat'], default: 'curved' },
  closure: { label: 'Back closure (caps)', type: 'select', values: ['strapback', 'snapback', 'velcro', 'fitted', 'elastic'], default: 'strapback' },
  topper: { label: 'Topper', type: 'select', values: ['none', 'pompom', 'cap-button', 'stalk'], default: 'none' },
  band: { label: 'Hat band', type: 'select', values: ['none', 'grosgrain', 'leather', 'chain'], default: 'none' },
};

const HEAD = { y: 1.66, r: 0.1, band: 1.615, circ: 58 };

/** Tagged rounded-triangle cap panel. */
function capPanel(w, h) {
  const p = new Poly();
  p.add(-w / 2, 0, 'band');
  p.add(w / 2, 0, 'side-r');
  p.add(w * 0.36, h * 0.55, 'side-r');
  p.add(w * 0.12, h * 0.9, 'side-r');
  p.add(0, h, 'side-l');
  p.add(-w * 0.12, h * 0.9, 'side-l');
  p.add(-w * 0.36, h * 0.55, 'side-l');
  return p;
}

/** D-shaped horizontal bill / visor; inner arc tagged per crown panel span. */
function billPoly(Ri, L, spans, flat) {
  const p = new Poly();
  const N = 12;
  const a0 = -Math.PI / 3; const a1 = Math.PI / 3;
  for (let k = 0; k <= N; k++) {
    const a = a0 + ((a1 - a0) * k) / N;
    const reach = L * (0.35 + 0.65 * Math.cos(a * 1.4));
    p.add((Ri + reach) * Math.sin(a) * (flat ? 1.0 : 0.97), -(Ri + reach) * Math.cos(a), 'outer');
  }
  for (let k = N; k >= 1; k--) {
    const a = a0 + ((a1 - a0) * k) / N;
    const am = a - (a1 - a0) / N / 2;
    const span = spans.find(([lo, hi]) => am >= lo && am <= hi);
    p.add(Ri * Math.sin(a), -Ri * Math.cos(a), span ? `in-${span[2]}` : 'in-x');
  }
  p.add(Ri * Math.sin(a0), -Ri * Math.cos(a0), 'edge');
  return p;
}

export function buildHat(o, prefix = '', fabric = 'rib-knit-wool') {
  const id = (s) => `${prefix}${s}`;
  const B = bodyOf(o);
  const HEAD = { y: 1.665 * B.hs, r: 0.1 * (B.head / 58), band: 1.615 * B.hs, circ: B.head };
  const q = HEAD.circ / 4;
  const panels = [];
  const seams = [];
  const overlays = [];
  const trims = [];
  const stiff = o.stiffener;
  const rigid = !['none', 'eva-foam', 'buckram'].includes(stiff);
  const brimFab = { 'felt-wire': 'wool-felt', 'straw-sized': 'straw' }[stiff];
  const Ri = HEAD.circ / (2 * Math.PI); // cm

  const knitCrown = (H, wide = 1, flatTop = false) => {
    const p = new Poly();
    p.add(-q, 0, 'band');
    p.add(q, 0, 'side-r');
    p.add(q * wide, H * 0.5, 'side-r');
    p.add(q * wide * (flatTop ? 0.85 : 0.7), H * (flatTop ? 0.96 : 0.88), 'top-r');
    p.add(0, H, 'top-l');
    p.add(-q * wide * (flatTop ? 0.85 : 0.7), H * (flatTop ? 0.96 : 0.88), 'side-l');
    p.add(-q * wide, H * 0.5, 'side-l');
    return p;
  };
  const addFrontBack = (poly, H, f) => {
    const y = HEAD.band - 0.005;
    const R = HEAD.r + 0.005;
    panels.push({ id: id('crown-front'), name: 'Crown front', role: 'hat', points: poly.pts, tack: { y0: -1, y1: 1.5 }, placement: { position: [0, y, R], rotationY: 0, wrap: R, wrapMax: 1.57 }, fabric: f });
    panels.push({ id: id('crown-back'), name: 'Crown back', role: 'hat', points: poly.pts.map((p) => [...p]), tack: { y0: -1, y1: 1.5 }, placement: { position: [0, y, -R], rotationY: Math.PI, wrap: R, wrapMax: 1.57 }, fabric: f });
    for (const [a, b] of [['side-r', 'side-l'], ['side-l', 'side-r'], ['top-r', 'top-l'], ['top-l', 'top-r']]) seams.push(seam(id('crown-front'), poly, a, id('crown-back'), poly, b, 'overlock-504'));
    void H;
  };
  const addBrimRing = (width, crownPoly) => {
    const ri = Ri; const ro = ri + width;
    for (const [pid, sgn, crownId] of [['brim-front', -1, 'crown-front'], ['brim-back', 1, 'crown-back']]) {
      const p = new Poly();
      const N = 10;
      for (let k = 0; k <= N; k++) { const a = Math.PI * (k / N); p.add(Math.cos(a) * ro, sgn * Math.sin(a) * ro, 'outer'); }
      for (let k = N; k >= 0; k--) { const a = Math.PI * (k / N); p.add(Math.cos(a) * ri, sgn * Math.sin(a) * ri, k === 0 ? 'end' : 'inner'); }
      p.tags[N] = 'end2';
      panels.push({ id: id(pid), name: pid === 'brim-front' ? 'Brim front' : 'Brim back', role: 'brim', rigid, stiffener: stiff, points: p.pts, placement: { position: [0, HEAD.band - 0.003, 0], rotationY: 0, rotationX: -Math.PI / 2 }, fabric: brimFab || fabric });
      seams.push(seam(id(pid), p, 'inner', id(crownId), crownPoly, 'band', 'lockstitch-301'));
    }
  };

  const s = o.style;
  if (s === 'beanie' || s === 'cuffed-beanie' || s === 'slouch-beanie') {
    const H = s === 'slouch-beanie' ? o.height + 7 : o.height;
    const c = knitCrown(H, s === 'slouch-beanie' ? 1.12 : 1);
    addFrontBack(c, H, fabric);
    if (s === 'cuffed-beanie') for (const pid of ['crown-front', 'crown-back']) overlays.push({ kind: 'band', style: 'rib', panel: id(pid), points: rect(-q, 0, q, 7) });
  } else if (s === 'beret') {
    const c = knitCrown(Math.min(o.height, 13), 1.45, true);
    addFrontBack(c, 13, fabric === 'rib-knit-wool' ? 'wool-felt' : fabric);
    trims.push({ type: 'cap-button', panel: id('crown-front'), at: [0, 12.5], size: 12 });
  } else if (['bucket', 'fedora', 'trilby', 'panama'].includes(s)) {
    const H = s === 'bucket' ? 12 : Math.max(o.height, 12) + 5; // crown must clear the head
    const c = knitCrown(H, s === 'bucket' ? 1.02 : 1.0, true);
    addFrontBack(c, H, fabric);
    const width = { bucket: o.brim, fedora: Math.max(o.brim, 6), trilby: Math.min(o.brim, 4.5), panama: Math.max(o.brim, 7) }[s];
    addBrimRing(width, c);
    if (s !== 'bucket') {
      overlays.push({ kind: 'pinch', panel: id('crown-front'), points: [[-3, H - 1], [3, H - 1], [1.5, H - 6], [-1.5, H - 6]] });
      if (o.band === 'none') o = { ...o, band: 'grosgrain' };
    }
    if (o.band !== 'none') for (const pid of ['crown-front', 'crown-back']) trims.push({ type: o.band === 'chain' ? 'chain' : 'grosgrain', panel: id(pid), at: [-q, 2.5], to: [q, 2.5], color: o.band === 'leather' ? '#5a3a24' : undefined });
  } else if (s === 'flat-cap') {
    const c = knitCrown(Math.min(o.height, 12), 1.25, true);
    addFrontBack(c, 12, fabric);
    const spans = [[-Math.PI / 3, Math.PI / 3, 'f']];
    const b = billPoly(Ri, Math.min(o.brim, 5.5), spans, true);
    panels.push({ id: id('bill'), name: 'Peak', role: 'brim', rigid, stiffener: stiff, points: b.pts, placement: { position: [0, HEAD.band + 0.01, 0], rotationY: 0, rotationX: -Math.PI / 2 + 0.35 }, fabric });
    void spans;
  } else if (s === 'visor') {
    const p = new Poly();
    const third = HEAD.circ / 6;
    p.add(-HEAD.circ / 2, 0, 'b-l').add(-third, 0, 'b-c').add(third, 0, 'b-r').add(HEAD.circ / 2, 0, 'end-r').add(HEAD.circ / 2, 4.5, 'top').add(-HEAD.circ / 2, 4.5, 'end-l');
    const R = HEAD.r + 0.004;
    panels.push({ id: id('band'), name: 'Sweatband', role: 'hat', points: p.pts, placement: { position: [0, HEAD.band - 0.01, R], rotationY: 0, wrap: R, wrapMax: Math.PI * 0.99 }, fabric });
    seams.push(seam(id('band'), p, 'end-r', id('band'), p, 'end-l', 'lockstitch-301'));
    const b = billPoly(Ri, o.brim, [[-Math.PI / 3, Math.PI / 3, 'f']], o.billShape === 'flat');
    panels.push({ id: id('bill'), name: 'Visor bill', role: 'brim', rigid, stiffener: stiff, points: b.pts, placement: { position: [0, HEAD.band - 0.01, 0], rotationY: 0, rotationX: -Math.PI / 2 + (o.billShape === 'flat' ? 0 : 0.18) }, fabric });
    seams.push(seam(id('bill'), b, 'in-f', id('band'), p, 'b-c', 'lockstitch-301'));
  } else {
    // panel caps: baseball / snapback / trucker / dad-cap / five-panel
    const deg = Math.PI / 180;
    const layout = s === 'five-panel' || s === 'trucker'
      ? [[0, 2 / 6, 'front'], [90, 1 / 6, 'side-r'], [150, 1 / 6, 'back-r'], [-150, 1 / 6, 'back-l'], [-90, 1 / 6, 'side-l']]
      : [[30, 1 / 6, 'front-r'], [90, 1 / 6, 'side-r'], [150, 1 / 6, 'back-r'], [-150, 1 / 6, 'back-l'], [-90, 1 / 6, 'side-l'], [-30, 1 / 6, 'front-l']];
    const H = Math.max(10, Math.min(o.height, 18));
    const R = HEAD.r + 0.004;
    const polys = [];
    const structured = s !== 'dad-cap';
    layout.forEach(([adeg, frac, name], k) => {
      const w = HEAD.circ * frac;
      const p = capPanel(w, frac > 0.2 ? H * 1.02 : H);
      if (frac > 0.2) { p.pts[4] = [0, H * 1.02]; }
      polys.push(p);
      const a = adeg * deg;
      const isFront = Math.abs(adeg) <= 30;
      const fab = s === 'trucker' && !isFront ? 'mesh' : fabric;
      panels.push({ id: id(`crown-${name}`), name: `Crown ${name}`, role: 'hat', points: p.pts, stiffener: isFront && structured ? 'buckram' : undefined, placement: { position: [R * Math.sin(a), HEAD.band - 0.004, R * Math.cos(a)], rotationY: a, wrap: R, wrapMax: frac * Math.PI }, fabric: fab, fabricOverrides: isFront && structured ? { bend: 0.6 } : {} });
    });
    // sort by angle so neighbours are adjacent going around the head
    const order = layout.map((l, k) => ({ k, a: l[0] })).sort((x, y) => x.a - y.a);
    for (let i = 0; i < order.length; i++) {
      const A = order[i].k; const B = order[(i + 1) % order.length].k;
      seams.push(seam(id(`crown-${layout[A][2]}`), polys[A], 'side-r', id(`crown-${layout[B][2]}`), polys[B], 'side-l', 'lockstitch-301'));
    }
    // bill: inner arc split per front panel
    const spans = layout.map(([adeg, frac, name]) => [adeg * deg - frac * Math.PI, adeg * deg + frac * Math.PI, name]).filter(([lo, hi]) => hi > -Math.PI / 3 + 0.01 && lo < Math.PI / 3 - 0.01);
    const b = billPoly(Ri, o.brim, spans, o.billShape === 'flat' || s === 'snapback');
    const tilt = o.billShape === 'flat' || s === 'snapback' ? 0 : 0.22;
    panels.push({ id: id('bill'), name: 'Bill', role: 'brim', rigid, stiffener: stiff, points: b.pts, placement: { position: [0, HEAD.band - 0.004, 0], rotationY: 0, rotationX: -Math.PI / 2 + tilt }, fabric: s === 'trucker' ? fabric : fabric });
    for (const [, , name] of spans) {
      const k = layout.findIndex((l) => l[2] === name);
      try { seams.push(seam(id('bill'), b, `in-${name}`, id(`crown-${name}`), polys[k], 'band', 'lockstitch-301')); } catch { /* span without edges */ }
    }
    trims.push({ type: 'cap-button', panel: id(`crown-${layout[0][2]}`), at: [0, H * 0.98] });
    for (const [, , name] of layout) trims.push({ type: 'grommet', panel: id(`crown-${name}`), at: [0, H * 0.6], size: 6 });
    if (o.closure === 'snapback' || s === 'snapback' || s === 'trucker') trims.push({ type: 'snapback-strap', panel: id('crown-back-r'), at: [-3, 3] });
    if (o.closure === 'strapback') trims.push({ type: 'buckle', panel: id('crown-back-r'), at: [-4, 3], size: 20 });
    if (o.closure === 'velcro') trims.push({ type: 'velcro', panel: id('crown-back-r'), at: [-4, 3] });
    overlays.push({ kind: 'band', style: 'sweatband', panel: id(`crown-${layout[0][2]}`), points: rect(-HEAD.circ * layout[0][1] / 2, 0, HEAD.circ * layout[0][1] / 2, 1.2) });
  }
  if (o.topper === 'pompom') trims.push({ type: 'pompom', panel: id('crown-front'), at: [0, o.height - 0.5] });
  if (o.topper === 'cap-button' || o.topper === 'stalk') trims.push({ type: 'cap-button', panel: id('crown-front'), at: [0, o.height - 0.5], size: o.topper === 'stalk' ? 10 : 18 });
  return { panels, seams, trims, overlays };
}

// =====================================================================
// BAGS
// =====================================================================
export const BAG_OPTIONS = {
  type: { label: 'Bag type', type: 'select', values: ['tote', 'shopper', 'duffel', 'weekender', 'handbag', 'clutch', 'crossbody', 'sling', 'fanny-pack', 'backpack', 'messenger', 'bucket', 'baguette', 'hobo'], default: 'tote' },
  width: { label: 'Width (cm)', type: 'range', min: 12, max: 70, step: 1, default: 38 },
  height: { label: 'Height (cm)', type: 'range', min: 8, max: 55, step: 1, default: 40 },
  depth: { label: 'Depth / gusset (cm)', type: 'range', min: 2, max: 35, step: 1, default: 12 },
  shape: { label: 'Shape', type: 'select', values: ['rectangle', 'rounded', 'crescent', 'trapezoid', 'cylinder'], default: 'rectangle' },
  handles: { label: 'Handles / straps', type: 'select', values: ['top-handles', 'shoulder-straps', 'crossbody', 'chain', 'backpack', 'waist-belt', 'wrist', 'none'], default: 'shoulder-straps' },
  closure: { label: 'Closure', type: 'select', values: ['open', 'zip', 'magnetic-snap', 'flap-magnet', 'flap-buckle', 'drawstring', 'frame-clasp', 'turn-lock'], default: 'magnetic-snap' },
  base: { label: 'Base', type: 'select', values: ['soft', 'structured'], default: 'soft' },
  hardware: { label: 'Hardware finish', type: 'select', values: ['silver', 'gold', 'gunmetal', 'antique-brass', 'matte-black'], default: 'silver' },
  pockets: { label: 'Outer pockets', type: 'select', values: ['none', 'front-zip', 'front-slip', 'side'], default: 'none' },
  feet: { label: 'Base studs / feet', type: 'select', values: ['no', 'yes'], default: 'no' },
};
const HW = { silver: '#c8c8c8', gold: '#d4af37', gunmetal: '#4a4d52', 'antique-brass': '#a07c3a', 'matte-black': '#1a1a1a' };

export function buildBag(o, prefix = '', fabric = 'canvas') {
  const id = (s) => `${prefix}${s}`;
  const W = o.width / 2; const H = o.height; const D = o.depth;
  const mk = () => {
    const p = new Poly();
    const r = o.shape === 'rounded' ? Math.min(W, H) * 0.3 : 0;
    if (o.shape === 'crescent') {
      const N = 8;
      for (let k = 0; k <= N; k++) { const a = Math.PI * (1 - k / N); p.add(Math.cos(a) * W, H * 0.55 - Math.sin(a) * H * 0.55, k < N ? 'body' : 'top'); }
      for (let k = N - 1; k >= 1; k--) { const a = Math.PI * (1 - k / N); p.add(Math.cos(a) * W * 0.98, H * 0.55 + Math.sin(a) * H * 0.3, 'top'); }
      p.tags[p.tags.length - 1] = 'top';
      return p;
    }
    const tw = o.shape === 'trapezoid' ? W * 0.75 : W;
    if (r) {
      p.add(-W + r, 0, 'body').add(W - r, 0, 'body').add(W, r, 'body').add(tw, H, 'top').add(-tw, H, 'body').add(-W, r, 'body');
    } else {
      p.add(-W, 0, 'body').add(W, 0, 'body').add(tw, H, 'top').add(-tw, H, 'body');
    }
    return p;
  };
  const f = mk(); const b = mk();
  const cy = 0.85; // display height of bag bottom (m)
  const topBand = o.shape === 'crescent' ? { y0: H * 0.55, y1: H * 1.2 } : { y0: H - 2, y1: H + 1 }; // hangs from its top (handles) on the display
  const zd = D / 200 + 0.004;
  const panels = [
    { id: id('front'), name: 'Front', role: 'bag', points: f.pts, tack: topBand, placement: { position: [0, cy, zd], rotationY: 0 }, fabric },
    { id: id('back'), name: 'Back', role: 'bag', points: b.pts, tack: topBand, placement: { position: [0, cy, -zd], rotationY: Math.PI }, fabric },
  ];
  const seams = [seam(id('front'), f, 'body', id('back'), b, 'body', 'lockstitch-301')];
  // stuffing form so the bag holds its 3D shape (removed on export)
  const hm = H / 100; const wm = W / 100;
  const rr = Math.max(0.02, Math.min(hm * 0.42, (D / 200) * 0.95 + 0.02));
  const cyl = o.shape === 'cylinder' || o.type === 'duffel';
  const zs = cyl ? 1 : Math.max(0.15, Math.min(1, (D / 200) / (hm * 0.42)));
  const r2 = cyl ? hm * 0.45 : hm * 0.42;
  const colliders = [{ a: [-(wm - r2 * 0.9), cy + r2 + 0.01, 0], b: [wm - r2 * 0.9, cy + r2 + 0.01, 0], r: r2, zs: cyl ? 1 : zs }];
  void rr;
  const metal = HW[o.hardware];
  const trims = [];
  const overlays = [];
  const topY = o.shape === 'crescent' ? H * 0.8 : H;
  const strap = (x0, x1, arch, panel = 'front', extra = {}) => trims.push({ type: o.handles === 'chain' ? 'chain' : 'strap', panel: id(panel), at: [x0, topY - 1], to: [x1, topY - 1], arch, color: o.handles === 'chain' ? metal : undefined, ...extra });
  const ringsAt = (xs) => xs.forEach((x) => trims.push({ type: 'd-ring', panel: id('front'), at: [x, topY - 0.5], color: metal, size: 20 }));
  switch (o.handles) {
    case 'top-handles': strap(-W * 0.3, W * 0.3, 0.12); strap(-W * 0.3, W * 0.3, 0.12, 'back'); break;
    case 'shoulder-straps': strap(-W * 0.45, W * 0.45, 0.3); strap(-W * 0.45, W * 0.45, 0.3, 'back'); break;
    case 'crossbody': case 'chain': strap(-W + 1, W - 1, 0.55, 'front', { side: true }); ringsAt([-W + 1, W - 1]); break;
    case 'backpack': trims.push({ type: 'strap', panel: id('back'), at: [-W * 0.4, topY - 2], to: [-W * 0.5, 3], arch: -0.12 }, { type: 'strap', panel: id('back'), at: [W * 0.4, topY - 2], to: [W * 0.5, 3], arch: -0.12 }); strap(-3, 3, 0.05, 'back'); break;
    case 'waist-belt': trims.push({ type: 'strap', panel: id('back'), at: [-W, H * 0.5], to: [W, H * 0.5], arch: -0.25, waist: true }, { type: 'side-release-buckle', panel: id('front'), at: [-W + 0.5, H * 0.5] }); break;
    case 'wrist': trims.push({ type: 'strap', panel: id('front'), at: [W - 2, topY - 1], to: [W - 6, topY - 1], arch: 0.1 }); break;
    default: break;
  }
  switch (o.closure) {
    case 'zip': trims.push({ type: 'zipper', panel: id('front'), at: [-W * 0.9, topY - 0.3], to: [W * 0.9, topY - 0.3], color: metal }); break;
    case 'magnetic-snap': trims.push({ type: 'magnetic-snap', panel: id('front'), at: [0, topY - 2], color: metal }); break;
    case 'flap-magnet': case 'flap-buckle': case 'turn-lock': {
      overlays.push({ kind: 'flap', panel: id('front'), points: o.closure === 'turn-lock' ? [[-W, topY], [W, topY], [W, topY * 0.55], [0, topY * 0.42], [-W, topY * 0.55]] : rect(-W, topY * 0.5, W, topY) });
      if (o.closure === 'flap-buckle') for (const x of [-W * 0.45, W * 0.45]) trims.push({ type: 'buckle', panel: id('front'), at: [x, topY * 0.5], color: metal, size: 25 });
      else trims.push({ type: o.closure === 'turn-lock' ? 'buckle' : 'magnetic-snap', panel: id('front'), at: [0, topY * 0.47], color: metal, size: 18 });
      break;
    }
    case 'drawstring': for (let x = -W * 0.8; x <= W * 0.8; x += W * 0.4) trims.push({ type: 'grommet', panel: id('front'), at: [x, topY - 2.5], color: metal }); trims.push({ type: 'cord-stopper', panel: id('front'), at: [W * 0.5, topY - 6] }); break;
    case 'frame-clasp': trims.push({ type: 'grosgrain', panel: id('front'), at: [-W * 0.95, topY - 0.5], to: [W * 0.95, topY - 0.5], color: metal }, { type: 'stud-dome', panel: id('front'), at: [0, topY], color: metal, size: 10 }); break;
    default: break;
  }
  if (o.pockets === 'front-zip') { overlays.push({ kind: 'pocket', style: 'patch', panel: id('front'), points: rect(-W * 0.7, H * 0.15, W * 0.7, H * 0.55) }); trims.push({ type: 'zipper-coil', panel: id('front'), at: [-W * 0.65, H * 0.52], to: [W * 0.65, H * 0.52] }); }
  if (o.pockets === 'front-slip') overlays.push({ kind: 'pocket', style: 'patch', panel: id('front'), points: rect(-W * 0.75, H * 0.12, W * 0.75, H * 0.6) });
  if (o.pockets === 'side') overlays.push({ kind: 'pocket', style: 'patch', panel: id('back'), points: rect(W * 0.55, H * 0.1, W * 0.95, H * 0.5) });
  if (o.feet === 'yes') for (const x of [-W * 0.8, W * 0.8]) trims.push({ type: 'stud-dome', panel: id('front'), at: [x, 0.8], color: metal, size: 12 });
  trims.push({ type: 'label', panel: id('front'), at: [W * 0.6, H * 0.12], size: 30 });
  return { panels, seams, trims, overlays, colliders, display: { avatar: false }, meta: { base: o.base, bagBoard: o.base === 'structured' } };
}

function rect(x0, y0, x1, y1) {
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

export const GENERATORS = {
  top: { label: 'Top / jacket / coat / dress', options: TOP_OPTIONS, build: buildTop },
  bottom: { label: 'Trousers / jeans / shorts', options: BOTTOM_OPTIONS, build: buildBottom },
  skirt: { label: 'Skirt', options: SKIRT_OPTIONS, build: buildSkirt },
  scarf: { label: 'Scarf', options: SCARF_OPTIONS, build: buildScarf },
  tie: { label: 'Tie', options: TIE_OPTIONS, build: buildTie },
  hat: { label: 'Hat / cap', options: HAT_OPTIONS, build: buildHat },
  bag: { label: 'Bag', options: BAG_OPTIONS, build: buildBag },
};

export function defaultOptions(gen) {
  return Object.fromEntries(Object.entries(GENERATORS[gen].options).map(([k, v]) => [k, v.default]));
}
