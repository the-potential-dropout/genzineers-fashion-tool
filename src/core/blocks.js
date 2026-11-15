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
/** Polyline of a tagged edge run (for decorative edges / lacing placement). */
function pathOf(poly, tag) {
  try { const r = poly.range(tag); const n = poly.pts.length; const out = []; for (let i = r.edge; ; i++) { out.push(poly.pts[i % n]); if (i % n === r.to % n) { out.push(poly.pts[(i + 1) % n]); break; } } return out; } catch { return []; }
}

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
import { LEGWEAR_OPTIONS, buildLegwear, GLOVE_OPTIONS, buildGlove } from './legwear.js';
import { SHOE_OPTIONS, buildShoe } from './shoes.js';
import { ZIPPER_DEFAULTS } from './trims.js';
// Reference body comes from the selected size (o.__body); generators read it via bodyOf().
const bodyOf = (o) => o.__body || DEFAULT_BODY;

const FIT = { slim: 8, regular: 14, relaxed: 20, oversized: 30 };

// =====================================================================
// TOPS: tees, tanks, shirts, hoodies, jackets, coats, dresses
// =====================================================================
export const TOP_OPTIONS = {
  fit: { label: 'Fit', type: 'select', values: ['slim', 'regular', 'relaxed', 'oversized'], default: 'regular' },
  length: { label: 'Body length (cm, shoulder to hem)', type: 'range', min: 30, max: 160, step: 1, default: 70 },
  slit: { label: 'Slit', type: 'select', values: ['none', 'side-left', 'side-right', 'both-sides', 'front', 'back'], default: 'none' },
  slitHeight: { label: 'Slit height (cm from the hem)', type: 'range', min: 5, max: 90, step: 1, default: 35 },
  flare: { label: 'Hem flare (cm per side)', type: 'range', min: -4, max: 40, step: 1, default: 0 },
  neckline: { label: 'Neckline', type: 'select', values: ['crew', 'v-neck', 'deep-v', 'scoop', 'boat', 'mock', 'henley', 'collar-stand'], default: 'crew' },
  sleeve: { label: 'Sleeves', type: 'select', values: ['none', 'cap', 'short', 'elbow', 'three-quarter', 'long'], default: 'short' },
  shoulder: { label: 'Shoulder / strap width (sleeveless)', type: 'select', values: ['full', 'tank', 'a-shirt', 'racer', 'strap'], default: 'full' },
  cuff: { label: 'Cuff', type: 'select', values: ['none', 'hemmed', 'rib', 'barrel', 'french', 'button-tab', 'elastic', 'rolled', 'zip', 'snap-tab', 'storm'], default: 'hemmed' },
  hem: { label: 'Hem', type: 'select', values: ['straight', 'curved', 'rib', 'drawcord', 'raw'], default: 'straight' },
  closure: { label: 'Closure', type: 'select', values: ['none', 'single-breasted', 'double-breasted', 'zip', 'two-way-zip', 'asymmetric-zip', 'snaps', 'toggles', 'half-zip', 'placket', 'lace-up-front', 'lace-up-back'], default: 'none' },
  buttons: { label: 'Buttons (front)', type: 'range', min: 1, max: 8, step: 1, default: 2 },
  lapel: { label: 'Lapel', type: 'select', values: ['none', 'notch', 'peak', 'shawl', 'biker'], default: 'none' },
  lapelWidth: { label: 'Lapel width (cm)', type: 'range', min: 4, max: 13, step: 0.5, default: 8 },
  collar: { label: 'Collar', type: 'select', values: ['none', 'point', 'spread', 'button-down', 'camp', 'mandarin', 'band-snap', 'polo', 'corduroy', 'hood', 'funnel', 'rib'], default: 'none' },
  hood: { label: 'Hood construction', type: 'select', values: ['three-panel', 'two-panel', 'crossover', 'scuba', 'lined-double', 'snorkel', 'detachable'], default: 'three-panel' },
  pockets: { label: 'Pockets', type: 'select', values: ['none', 'chest', 'patch', 'welt', 'flap', 'kangaroo', 'bellows', 'zip'], default: 'none' },
  vent: { label: 'Back vent', type: 'select', values: ['none', 'center', 'side'], default: 'none' },
  belt: { label: 'Belt', type: 'select', values: ['none', 'self-belt', 'buckle-belt'], default: 'none' },
  epaulettes: { label: 'Shoulder straps (epaulettes)', type: 'select', values: ['none', 'buttoned', 'snap', 'pointed-buttoned'], default: 'none' },
  stormFlap: { label: 'Storm details', type: 'select', values: ['none', 'gun-flap', 'back-shield', 'gun-flap+back-shield'], default: 'none' },
  sleeveStrap: { label: 'Sleeve straps', type: 'select', values: ['none', 'strap-buckle', 'tab-button'], default: 'none' },
  throatLatch: { label: 'Throat latch', type: 'select', values: ['no', 'yes'], default: 'no' },
  insulation: { label: 'Insulation / fill', type: 'select', values: ['none', 'goose-down-900', 'goose-down-800', 'goose-down-700', 'duck-down-650', 'duck-down-550', 'hydrophobic-down', 'recycled-down', 'down-feather-50-50', 'feather', 'synthetic-microfiber', 'synthetic-continuous', 'thin-microfiber', 'polyester-wadding', 'recycled-poly-fill', 'wool-batting', 'cotton-batting', 'kapok', 'aerogel'], default: 'none' },
  fillWeight: { label: 'Fill weight (g/m²)', type: 'range', min: 40, max: 400, step: 10, default: 120 },
  quilting: { label: 'Quilting', type: 'select', values: ['channel', 'box', 'diamond', 'onion', 'chevron', 'welded', 'none'], default: 'channel' },
  lining: { label: 'Lining', type: 'select', values: ['none', 'half', 'full'], default: 'none' },
  chestAdj: { label: 'Tailor: chest (cm, + let out / − take in)', type: 'range', min: -12, max: 20, step: 0.5, default: 0 },
  waistAdj: { label: 'Tailor: waist suppression (cm taken in)', type: 'range', min: 0, max: 16, step: 0.5, default: 0 },
  shoulderAdj: { label: 'Tailor: shoulder width (cm)', type: 'range', min: -4, max: 6, step: 0.5, default: 0 },
  sleeveAdj: { label: 'Tailor: sleeve length (cm)', type: 'range', min: -15, max: 10, step: 0.5, default: 0 },
};

/** Sample a cubic Bezier into the outline: points t = 0 .. (n-1)/n, all tagged (the end point belongs to the next run). */
function bez(p, P0, P1, P2, P3, tag, n = 8) {
  n = Math.round(n * 1.8); // fine sampling: a drafted curve is never flattened into a few straight lines
  for (let k = 0; k < n; k++) {
    const t = k / n; const u = 1 - t;
    p.add(u * u * u * P0[0] + 3 * u * u * t * P1[0] + 3 * u * t * t * P2[0] + t * t * t * P3[0], u * u * u * P0[1] + 3 * u * u * t * P1[1] + 3 * u * t * t * P2[1] + t * t * t * P3[1], tag);
  }
}
function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
/** Clip a polygon to x >= 0 (side = 1) or x <= 0 (side = -1). */
function clipX(pts, side) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]; const b = pts[(i + 1) % pts.length];
    const ia = a[0] * side >= 0; const ib = b[0] * side >= 0;
    if (ia) out.push(a);
    if (ia !== ib) { const t = a[0] / (a[0] - b[0]); out.push([0, a[1] + (b[1] - a[1]) * t]); }
  }
  return out;
}
const polyArea = (pts) => { let A = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i]; const b = pts[(i + 1) % pts.length]; A += a[0] * b[1] - b[0] * a[1]; } return Math.abs(A) / 2; };

function inPoly(x, y, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]; const [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }
/** A path moved d cm towards the inside of the piece (for bindings and bands that follow an edge). */
function insetPath(path, d, outline) {
  const out = [];
  for (let i = 0; i < path.length; i++) {
    const a = path[Math.max(0, i - 1)]; const b = path[Math.min(path.length - 1, i + 1)];
    let tx = b[0] - a[0]; let ty = b[1] - a[1]; const l = Math.hypot(tx, ty); if (l < 1e-6) continue; tx /= l; ty /= l;
    let x = path[i][0] - ty * d; let y = path[i][1] + tx * d;
    if (!inPoly(x, y, outline)) { x = path[i][0] + ty * d; y = path[i][1] - tx * d; }
    out.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  }
  return out;
}

/** Front-opening garments are cut as two real front pieces that overlap and fasten. */
const OPEN_FRONT = ['single-breasted', 'double-breasted', 'zip', 'two-way-zip', 'asymmetric-zip', 'snaps', 'toggles', 'placket'];

/**
 * Bodice draft. Coordinates: x from centre front/back, y up from the hem,
 * H = high point of the shoulder. Curves are true drafted curves (neck,
 * armscye, side shaping, shirt-tail hem), not straight segments.
 */
function topPanels(o) {
  const BODY = bodyOf(o);
  const ease = (FIT[o.fit] ?? 14) + (o.chestAdj || 0);
  const hw = (BODY.chest + ease) / 4; // quarter chest incl. ease
  const H = o.length;
  const sleeveless = o.sleeve === 'none';
  const armDepth = sleeveless ? ({ full: 22, tank: 24, 'a-shirt': 27, racer: 26, strap: 24 }[o.shoulder] ?? 23) : 21.5 + ease * 0.12;
  const sideH = H - armDepth;
  const neckBase = (BODY.neckC || 38) / 5 + 0.6;
  const neckW = neckBase + ({ boat: 5, scoop: 2.5, 'deep-v': 0.5, 'collar-stand': -0.4, mock: -0.3 }[o.neckline] || 0) + (o.lapel !== 'none' ? 0.6 : 0);
  const natural = (BODY.shoulderW || 46) / 2 - 3; // shoulder point of the body
  const shoulderX = sleeveless
    ? ({ full: natural - 0.5, tank: neckW + 6, 'a-shirt': neckW + 3.5, racer: neckW + 4, strap: neckW + 2.5 }[o.shoulder] ?? natural)
    : natural + ({ slim: 0, regular: 0.6, relaxed: 2.2, oversized: 6 }[o.fit] ?? 0.6) + (o.shoulderAdj || 0) / 2;
  const shoulderDrop = sleeveless && o.shoulder !== 'full' ? 1.2 : 3.2 + (shoulderX - neckW) * 0.1;
  const hemW = hw + o.flare;
  const tail = o.hem === 'curved' ? 6 : 0;
  const drops = { crew: [8.5, 2.2], 'v-neck': [17, 2.2], 'deep-v': [26, 2.2], scoop: [14, 3], boat: [3.5, 2], mock: [6, 2], henley: [8.5, 2.2], 'collar-stand': [7.5, 2.2] };
  let [frontDrop, backDrop] = drops[o.neckline] || drops.crew;
  const split = OPEN_FRONT.includes(o.closure);
  const lapel = o.lapel !== 'none' && o.lapel !== 'biker';
  const breakY = H * 0.62; // where the lapel roll line meets the front edge
  if (split && lapel) frontDrop = H - breakY;
  // overlap past the centre line (button stand); zips meet edge to edge
  const ext = !split ? 0 : o.closure === 'double-breasted' ? 8 : ['zip', 'two-way-zip'].includes(o.closure) ? 0 : o.closure === 'asymmetric-zip' ? 6 : (o.lapel !== 'none' || o.length > 80 ? 2.2 : 1.6);
  const aDeep = sleeveless && (o.shoulder === 'a-shirt' || o.shoulder === 'racer');
  const waistY = Math.max(tail + 6, H - 43 * (BODY.hs || 1));
  const sup = (o.waistAdj || 0) / 4 + (o.fit === 'slim' ? 1.2 : 0) + (lapel ? 1.2 : 0);
  const shaped = H - waistY > armDepth + 6 && (sup > 0.3 || Math.abs(o.flare) > 2);

  /** Right half outline from the hem at the centre, anticlockwise to the centre neck point. */
  const half = (drop, isBack) => {
    const p = new Poly();
    const S = [shoulderX, H - shoulderDrop];
    const U = [hw, sideH];
    if (tail) { p.add(0, 0, 'hem-r'); bez(p, [hemW * 0.35, 0], [hemW * 0.75, 0], [hemW, tail * 0.35], [hemW, tail], 'hem-r', 6); } else p.add(0, 0, 'hem-r');
    // side seam, with waist shaping
    if (shaped) {
      const W = [hw - sup, waistY];
      bez(p, [hemW, tail], [hemW - (hemW - W[0]) * 0.35, tail + (waistY - tail) * 0.5], [W[0], waistY - (waistY - tail) * 0.25], W, 'side-r', 6);
      bez(p, W, [W[0], waistY + (sideH - waistY) * 0.4], [hw, sideH - (sideH - waistY) * 0.35], U, 'side-r', 6);
    } else p.add(hemW, tail, 'side-r');
    // armscye: front is scooped for the arm moving forwards, back stays fuller
    const xc = Math.min(hw - 0.8, sleeveless ? S[0] - (aDeep ? 5 : 1.5) + (isBack && aDeep && o.shoulder === 'racer' ? -3 : 0) : S[0] - (isBack ? 0.5 : 2));
    const ah = S[1] - sideH;
    bez(p, U, [xc - 0.6, sideH + ah * 0.02], [xc - 0.4, sideH + ah * 0.5], S, 'arm-r', 10);
    p.add(S[0], S[1], 'sh-r');
    const N = [neckW, H];
    const vneck = o.neckline === 'v-neck' || o.neckline === 'deep-v' || (split && lapel && !isBack);
    if (isBack || !vneck) bez(p, N, [neckW, H - drop * 0.75], [neckW * 0.6, H - drop], [0, H - drop], 'neck-r', isBack ? 5 : 8);
    else p.add(N[0], N[1], 'neck-r');
    return p;
  };
  const whole = (drop, isBack) => {
    const r = half(drop, isBack);
    const full = new Poly();
    for (let i = 0; i < r.pts.length; i++) full.add(r.pts[i][0], r.pts[i][1], r.tags[i]);
    full.add(0, H - drop, 'neck-l');
    for (let i = r.pts.length - 1; i >= 1; i--) full.add(-r.pts[i][0], r.pts[i][1], swapSide(r.tags[i - 1]));
    return full;
  };
  // one front piece of an open-front garment: the half plus the overlap past centre
  const frontPiece = () => {
    const r = half(frontDrop, false);
    const p = new Poly();
    // start at the bottom of the front edge
    p.add(-ext, 0, 'hem-r');
    for (let i = ext > 0 ? 0 : 1; i < r.pts.length; i++) p.add(r.pts[i][0], r.pts[i][1], r.tags[i]);
    p.add(-ext, H - frontDrop - (lapel ? 0 : 0), 'cf');
    if (!lapel && ext > 0) { p.tags[p.tags.length - 1] = 'cf'; p.pts.splice(p.pts.length - 1, 0, [0, H - frontDrop]); p.tags.splice(p.tags.length - 1, 0, 'neck-r'); }
    return p;
  };
  const back = whole(backDrop, true);
  const front = split ? null : whole(frontDrop, false);
  const fr = split ? frontPiece() : null;
  const fl = split ? mirror(fr) : null;
  const armLen = (poly, tag) => polyLen(pathOf(poly, tag));
  const scye = split ? armLen(fr, 'arm-r') + armLen(back, 'arm-r') : armLen(front, 'arm-r') + armLen(back, 'arm-r');
  return { front, back, fr, fl, split, ext, lapel, breakY, hw, H, sideH, armDepth, ease, neckW, shoulderX, natural, scye, frontDrop, waistY };
}

/** Set-in sleeve with a true cap: the cap curve is solved to match the armscye it is sewn into. */
function sleevePanel(o, t, side) {
  const BODY = bodyOf(o);
  const ease = t.ease;
  const W = 34 * BODY.gs + 4 + ease * 0.5 + (o.fit === 'oversized' ? 3 : 0); // bicep girth incl. ease
  const capLen = (ch) => { const p = new Poly(); bez(p, [0, W / 2], [0, W / 2 - W * 0.2], [-ch, W * 0.24], [-ch, 0], 'c', 12); p.add(-ch, 0, 'c'); return polyLen(p.pts) * 2; };
  let lo = 1; let hi = 24;
  const target = t.scye + 1.2;
  for (let k = 0; k < 24; k++) { const mid = (lo + hi) / 2; if (capLen(mid) < target) lo = mid; else hi = mid; }
  const capH = Math.max(2, Math.min(19, (lo + hi) / 2));
  const total = ({ cap: 8, short: 22, elbow: 33, 'three-quarter': 46, long: (BODY.armCm || 61) + 3 }[o.sleeve] || 22) + (o.sleeveAdj || 0) - Math.max(0, t.shoulderX - t.natural) ;
  const L = Math.max(2, total - capH);
  const longish = o.sleeve === 'long' || o.sleeve === 'three-quarter';
  const cuffW = longish ? (o.cuff === 'rib' || o.cuff === 'elastic' ? 20 : ['barrel', 'french', 'button-tab'].includes(o.cuff) ? 24 : 23 + ease * 0.25) * (o.sleeve === 'three-quarter' ? 1.12 : 1) : Math.max(W - 2 - L * 0.12, W * 0.8);
  const p = new Poly();
  p.add(L, -cuffW / 2, 'cuff');
  // underarm seam (front): gently shaped through the elbow on long sleeves
  if (longish) bez(p, [L, cuffW / 2], [L * 0.6, cuffW / 2 + (W - cuffW) * 0.12], [L * 0.3, W / 2 - (W - cuffW) * 0.08], [0, W / 2], 'under-f', 6); else p.add(L, cuffW / 2, 'under-f');
  bez(p, [0, W / 2], [0, W / 2 - W * 0.2], [-capH, W * 0.24], [-capH, 0], 'cap-f', 12);
  bez(p, [-capH, 0], [-capH, -W * 0.24], [0, -W / 2 + W * 0.2], [0, -W / 2], 'cap-b', 12);
  if (longish) bez(p, [0, -W / 2], [L * 0.3, -W / 2 + (W - cuffW) * 0.08], [L * 0.6, -cuffW / 2 - (W - cuffW) * 0.12], [L, -cuffW / 2], 'under-b', 6); else p.add(0, -W / 2, 'under-b');
  const R = W / (2 * Math.PI) / 100;
  return { poly: p, L, W, cuffW, capH, R: Math.max(R, 0.055), side };
}

export function buildTop(o, prefix = '', fabric = 'cotton-jersey') {
  // how the piece is worn right now (does not change the pattern that is cut)
  const wear = o.__wear || {};
  const drafted = o;
  if (wear.sleeves === 'rolled' && ['long', 'three-quarter'].includes(o.sleeve)) o = { ...o, sleeve: 'elbow', cuff: 'rolled', sleeveAdj: (o.sleeveAdj || 0) - 3 };
  void drafted;
  const BODY = bodyOf(o);
  const t = topPanels(o);
  const id = (s) => `${prefix}${s}`;
  const baseY = BODY.shoulderY - t.H / 100 + 0.035; // arrange slightly above the shoulders, gravity settles it
  const R = 0.21 + t.ease / 400;
  const Rh = Math.max(R, (t.hw + o.flare) / 145); // hem radius (cone) so wide hems don't overlap
  const wrapMax = o.sleeve === 'none' ? 1.5 : 0.95;
  // arrange the pieces close around the torso (which is deeper behind the arms than in front),
  // so the shoulder seams close on top of the shoulder ridge instead of sliding off it
  const zc = -0.027; const Rz = 0.135 + t.ease / 800;
  const place = (z, rot, dz = 0) => ({ position: [0, baseY, zc + Math.sign(z) * (Rz + (Rh - R)) + dz], rotationY: rot, wrap: Rh, wrapTop: R, wrapTopY: t.H, wrapMax });
  const panels = [];
  // open fronts: the wearer's-left piece laps over the right one (menswear side)
  if (t.split) {
    panels.push({ id: id('front-r'), name: 'Front (left, on top)', role: 'body', points: t.fr.pts, placement: place(R, 0, 0.004), fabric, zBias: 1 });
    panels.push({ id: id('front-l'), name: 'Front (right, under)', role: 'body', points: t.fl.pts, placement: place(R, 0), fabric });
  } else panels.push({ id: id('front'), name: 'Front', role: 'body', points: t.front.pts, placement: place(R, 0), fabric });
  panels.push({ id: id('back'), name: 'Back', role: 'body', points: t.back.pts, placement: place(-R, Math.PI), fabric });
  const sideStitch = o.__stitch || 'overlock-504';
  // [panel id, poly] that carries the right / left front edges
  const FR = t.split ? [id('front-r'), t.fr] : [id('front'), t.front];
  const FL = t.split ? [id('front-l'), t.fl] : [id('front'), t.front];
  // side slits: the side seam is simply left open from the hem up to the slit height
  const sideLen = polyLen(pathOf(FR[1], 'side-r')) || 1;
  const slitFrac = Math.min(0.85, (o.slitHeight || 35) / sideLen);
  const slitR = ['side-left', 'both-sides'].includes(o.slit) ? { open: slitFrac, slit: true } : {}; // wearer's left is +x
  const slitL = ['side-right', 'both-sides'].includes(o.slit) ? { open: slitFrac, slit: true } : {};
  const seams = [
    { ...seam(FR[0], FR[1], 'side-r', id('back'), t.back, 'side-l', sideStitch), ...slitR },
    { ...seam(FL[0], FL[1], 'side-l', id('back'), t.back, 'side-r', sideStitch), ...slitL },
    seam(FR[0], FR[1], 'sh-r', id('back'), t.back, 'sh-l', sideStitch),
    seam(FL[0], FL[1], 'sh-l', id('back'), t.back, 'sh-r', sideStitch),
  ];
  const trims = [];
  const overlays = [];
  if (t.split) {
    const top = t.lapel ? t.breakY : o.collar === 'hood' || ['zip', 'two-way-zip'].includes(o.closure) ? t.H - t.frontDrop : t.H - t.frontDrop - 1;
    // tailored jackets fasten at the buttons and fall open below the last one
    const bottom = t.lapel && o.closure !== 'double-breasted' ? Math.max(6, t.breakY - Math.max(1, o.buttons - 1) * 10 - 9) : 0;
    if (t.ext === 0) seams.push({ ...seam(id('front-r'), t.fr, 'cf', id('front-l'), t.fl, 'cf', 'lockstitch-301'), closure: true, open: Math.max(0, Math.min(1, wear.open || 0)) });
    else {
      // overlapping fronts: fastened along the centre line through both layers
      const pts = []; for (let y = bottom; y <= top; y += 2.5) pts.push([0, y]);
      panels[0].attach = [{ to: id('front-l'), pts }];
    }
  }

  if (o.sleeve !== 'none') {
    const an = (BODY.armAngle * Math.PI) / 180;
    for (const side of [1, -1]) {
      const sl = sleevePanel(o, t, side);
      const sid = id(side > 0 ? 'sleeve-r' : 'sleeve-l');
      // front body panel: wearer-left is +x in world; front 'arm-r' is at +x,
      // back 'arm-l' is at +x (back panel is rotated 180 degrees)
      const d0 = 0.035 + Math.max(0, t.shoulderX - t.natural) / 100;
      panels.push({ id: sid, name: side > 0 ? 'Sleeve (left)' : 'Sleeve (right)', role: 'sleeve', points: sl.poly.pts, placement: { arm: side, angle: BODY.armAngle, radius: sl.R + 0.012, position: [(BODY.armStartX + d0 * Math.sin(an)) * side, BODY.armY - d0 * Math.cos(an), 0] }, fabric });
      seams.push(seam(sid, sl.poly, 'under-f', sid, sl.poly, 'under-b', sideStitch));
      seams.push(seam(sid, sl.poly, 'cap-f', side > 0 ? FR[0] : FL[0], side > 0 ? FR[1] : FL[1], side > 0 ? 'arm-r' : 'arm-l', sideStitch));
      seams.push(seam(sid, sl.poly, 'cap-b', id('back'), t.back, side > 0 ? 'arm-l' : 'arm-r', sideStitch));
      // cuffs
      const cuffDepth = { rib: 7, barrel: 6, french: 8, 'button-tab': 0, elastic: 3, rolled: 5, storm: 0, 'snap-tab': 0, zip: 0, hemmed: 2.5, none: 0 }[o.cuff] ?? 0;
      if (cuffDepth) overlays.push({ kind: 'cuff', style: o.cuff, panel: sid, points: rect(sl.L - cuffDepth, -sl.cuffW / 2, sl.L, sl.cuffW / 2) });
      if (o.cuff === 'rib' || o.cuff === 'elastic') panels[panels.length - 1].gatherX = [{ x0: sl.L - cuffDepth, x1: sl.L + 1, ratio: 0.82 }];
      if (['barrel', 'button-tab'].includes(o.cuff)) trims.push({ type: 'button-4hole', panel: sid, at: [sl.L - 3, sl.cuffW / 2 - 3], size: 11 });
      if (o.cuff === 'french') trims.push({ type: 'cufflink', panel: sid, at: [sl.L - 4, sl.cuffW / 2 - 2], size: 14 });
      if (o.cuff === 'snap-tab') trims.push({ type: 'snap', panel: sid, at: [sl.L - 3, sl.cuffW / 2 - 2] });
      if (o.cuff === 'zip') trims.push({ type: 'zipper', panel: sid, at: [sl.L - 12, -sl.cuffW / 2 + 1], to: [sl.L, -sl.cuffW / 2 + 1] });
    }
  }

  // hem / neck finishes
  if (o.hem === 'rib') { overlays.push({ kind: 'band', style: 'rib', panel: id('front'), points: rect(-t.hw, 0, t.hw, 7) }, { kind: 'band', style: 'rib', panel: id('back'), points: rect(-t.hw, 0, t.hw, 7) }); for (const pan of panels) if (pan.role === 'body') pan.gather = [{ y0: -1, y1: 7, ratio: 0.86 }]; }
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
  if (o.closure === 'lace-up-front' || o.closure === 'lace-up-back') trims.push({ type: 'lacing', panel: id(o.closure === 'lace-up-front' ? 'front' : 'back'), at: [0, Math.max(3, t.H * 0.25)], to: [0, t.H - 12], width: 5, eyelets: 8, style: 'corset' });
  // zipper defaults by garment type
  const zipKind = /leather/.test(fabric) ? 'leather' : o.length > 80 ? 'parka' : /waterproof|tpu|pvc/.test(fabric) ? 'shell' : 'jacket';
  for (const tr of trims) if (tr.type === 'zipper' && tr.panel === id('front') && Math.abs(tr.at[0]) < 1 && wear.open) tr.slider = 1 - wear.open;
  for (const tr of trims) if (tr.type === 'zipper' && !tr.zip) tr.zip = { ...ZIPPER_DEFAULTS[zipKind], ...(o.closure === 'two-way-zip' ? { end: 'two-way' } : {}), ...(o.closure === 'half-zip' ? { end: 'closed' } : {}) };

  // lapels / collars (overlays on the front)
  const lw = o.lapelWidth;
  const breakY = t.H * 0.62;
  if (o.lapel === 'notch' || o.lapel === 'peak' || o.lapel === 'shawl') {
    // The lapel is the front edge folded back along the roll line (break point -> neck point);
    // it lies on the chest, with the collar joining it at the gorge.
    const B = [-t.ext, breakY]; const N = [t.neckW, t.H];
    const len = Math.hypot(N[0] - B[0], N[1] - B[1]);
    const d = [(N[0] - B[0]) / len, (N[1] - B[1]) / len]; const pr = [d[1], -d[0]];
    const at = (u, off) => [B[0] + d[0] * len * u + pr[0] * off, B[1] + d[1] * len * u + pr[1] * off];
    let lap; let col;
    if (o.lapel === 'shawl') {
      lap = [B]; for (let k = 1; k <= 10; k++) { const u = k / 10; lap.push(at(u, lw * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.62 + 0.02)), 0.7))); }
      lap.push(N);
      col = null;
    } else if (o.lapel === 'peak') {
      lap = [B, at(0.3, lw * 0.5), at(0.62, lw * 0.95), at(0.86, lw + 2.2), at(0.8, lw * 0.62), at(0.84, 0)];
      col = [at(0.8, lw * 0.62), at(0.87, lw * 0.9), at(1.02, lw * 0.5 + 2.5), [N[0] + 1.5, N[1] - 0.4], N, at(0.84, 0)];
    } else {
      lap = [B, at(0.3, lw * 0.5), at(0.6, lw * 0.92), at(0.74, lw), at(0.8, lw * 0.6), at(0.84, 0)];
      col = [at(0.8, lw * 0.6), at(0.86, lw * 0.98), at(1.02, lw * 0.5 + 2.5), [N[0] + 1.5, N[1] - 0.4], N, at(0.84, 0)];
    }
    const mir = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
    overlays.push({ kind: 'lapel', style: o.lapel, panel: id('front-r'), points: lap }, { kind: 'lapel', style: o.lapel, panel: id('front-l'), points: mir(lap) });
    void col;
  }
  if (o.lapel === 'biker') {
    overlays.push({ kind: 'lapel', style: 'biker', panel: id('front'), points: [[-2, t.H - 22], [-12, t.H - 10], [-9, t.H - 3], [-t.neckW, t.H], [-3, t.H - 10]] });
    overlays.push({ kind: 'lapel', style: 'biker', panel: id('front'), points: [[8, t.H - 26], [16, t.H - 12], [12, t.H - 4], [t.neckW, t.H], [4, t.H - 14]] });
    trims.push({ type: 'snap', panel: id('front'), at: [-10, t.H - 8] }, { type: 'snap', panel: id('front'), at: [14, t.H - 10] });
  }
  // ---- collars, neckbands and hoods: real 3D pieces that follow the sewn neckline ----
  const COLLARS = {
    point: { stand: 3, fall: 4.3, point: 7.5, spread: 2.5, gap: 0.07 }, spread: { stand: 3.2, fall: 4.5, point: 8, spread: 6.5, gap: 0.1 },
    'button-down': { stand: 3, fall: 4.3, point: 8.2, spread: 3.5, roll: 1 }, camp: { stand: 0.6, fall: 6, point: 8.5, spread: 7.5, flat: 1 },
    polo: { stand: 2.1, fall: 6.4, point: 7.6, spread: 1.6, flare: 44, gap: 0.2, fabric: 'rib-knit' }, corduroy: { stand: 1.2, fall: 7, point: 9, spread: 5, fabric: 'corduroy' },
    mandarin: { stand: 3.5 }, 'band-snap': { stand: 4 }, funnel: { stand: 8, lean: 0.05 }, rib: { stand: 2.6, fabric: 'rib-knit' },
    hood: { hood: 1, stand: 1 },
  };
  const collars = [];
  // neckline of each body piece, trimmed to where the collar is sewn (lapel jackets: down to the gorge)
  const neckPaths = (frontLen) => {
    const out = {};
    for (const pan of panels) {
      if (pan.role !== 'body') continue;
      const poly = pan.id === id('back') ? t.back : pan.id === id('front-r') ? t.fr : pan.id === id('front-l') ? t.fl : t.front;
      let path = [...pathOf(poly, 'neck-r'), ...pathOf(poly, 'neck-l').slice(pathOf(poly, 'neck-r').length ? 1 : 0)];
      if (frontLen && pan.id !== id('back')) path = path.filter(([, y]) => y >= t.H - frontLen);
      if (frontLen && pan.id !== id('back') && path.length === 1) { const N = path[0]; const B = [-t.ext * Math.sign(N[0]), breakY]; const L = Math.hypot(N[0] - B[0], N[1] - B[1]); const u = Math.min(1, frontLen / L); path = [N, [N[0] + (B[0] - N[0]) * u, N[1] + (B[1] - N[1]) * u]]; }
      if (path.length >= 2) out[pan.id] = path;
    }
    return out;
  };
  const tailored = t.split && t.lapel;
  if (tailored && o.lapel !== 'shawl') collars.push({ kind: 'collar', style: 'tailored', stand: 2.6, fall: 4.4, point: 5.2, spread: 0, paths: neckPaths(Math.hypot(t.neckW + t.ext, t.H - breakY) * 0.2) });
  else if (o.lapel === 'biker') collars.push({ kind: 'collar', style: 'biker', stand: 1.2, fall: 7.5, point: 10, spread: 6, flat: 1, paths: neckPaths() });
  else if (o.collar === 'hood') {
    // A real hood: two side pieces joined over the crown and down the back of the head, sewn
    // round the neckline. It is cloth like the rest of the garment, so it drapes on the head
    // when worn up and falls down the back when worn down.
    const style = o.hood || 'three-panel';
    const Lf = polyLen(pathOf(FR[1], 'neck-r')); const Lb = polyLen(pathOf(t.back, 'neck-r'));
    const Ln = Lf + Lb + 1; // a little ease so the hood sets smoothly
    // height from the neck seam over the crown, measured on this body, plus wearing ease
    const crown = BODY.headY + (BODY.headR / 1.12) * 1.06; // top of the head
    const Hh = (crown - BODY.shoulderY - 0.03) * 100 + 4 + ({ slim: -0.8, regular: 0, relaxed: 1.2, oversized: 2.5 }[o.fit] ?? 0) + (style === 'snorkel' ? 1.5 : 0);
    const fwd = { crossover: 3.5, scuba: 5, snorkel: 7 }[style] || 0; // how far the front edge comes forward of the neck point
    const chin = style === 'scuba' ? 6 : style === 'snorkel' ? 3 : 0; // extra height over the chin
    const hp = new Poly();
    hp.add(-fwd, chin ? chin * 0.2 : 0, 'neck-f');
    hp.add(Lf * 0.5, -1.2, 'neck-f');
    hp.add(Lf, -1.4, 'neck-b');
    hp.add(Lf + Lb * 0.5, -0.4, 'neck-b');
    // back of the head: fullest at about half height, then a round crown (no point), easing down to the forehead
    const Bk = [Ln, 1]; const K1 = [Ln + 3.2, Hh * 0.78]; const K2 = [Ln * 0.32, Hh];
    bez(hp, Bk, [Ln + 4.5, 6], [Ln + 6.5, Hh * 0.5], K1, 'cb', 8);
    bez(hp, K1, [Ln + 0.5, Hh * 0.97], [Ln * 0.68, Hh + 0.6], K2, 'cb', 8);
    bez(hp, K2, [7 - fwd, Hh - 0.2], [2.5 - fwd, Hh - 1.2], [0.4 - fwd, Hh - 3.6], 'cb', 6);
    bez(hp, [0.4 - fwd, Hh - 3.6], [-1 - fwd, Hh * 0.62], [-1.3 - fwd, Hh * 0.3], [-fwd, chin ? chin * 0.2 : 0], 'face', 7);
    const hl = mirror(hp);
    const up = wear.hood === 'up';
    // worn up, the pieces are arranged with their top just above the crown so the hood settles straight onto the head
    const py = up ? crown + 0.012 - Hh / 100 : BODY.shoulderY + 0.025;
    const mkHood = (pid, name, poly, sd) => panels.push({ id: id(pid), name, role: 'hood', points: poly.pts, placement: { position: [sd * (up ? 0.108 : 0.03), py, up ? 0.075 : -0.07], rotationY: sd * Math.PI / 2 }, fabric, edges: { face: pathOf(poly, 'face') }, ...(style === 'lined-double' ? { lining: fabric } : {}),
      // worn up, the crown of the hood stays where it settles on top of the head (as friction and the wearer's hair do)
      ...(up ? { tack: { y0: Hh - 3.5, y1: Hh + 3, x0: sd > 0 ? 1 - fwd : -11, x1: sd > 0 ? 11 : -1 + fwd } } : {}),
      // the drawcord channel draws the face opening in a little
      gatherX: [{ x0: sd > 0 ? -2 - fwd : -3 + fwd - 0, x1: sd > 0 ? 3 - fwd : 2 + fwd, ratio: 0.93 }] });
    mkHood('hood-r', 'Hood (left side)', hp, 1);
    mkHood('hood-l', 'Hood (right side)', hl, -1);
    seams.push(seam(id('hood-r'), hp, 'cb', id('hood-l'), hl, 'cb', sideStitch));
    seams.push(seam(id('hood-r'), hp, 'neck-f', FR[0], FR[1], 'neck-r', sideStitch), seam(id('hood-r'), hp, 'neck-b', id('back'), t.back, 'neck-l', sideStitch));
    seams.push(seam(id('hood-l'), hl, 'neck-f', FL[0], FL[1], 'neck-l', sideStitch), seam(id('hood-l'), hl, 'neck-b', id('back'), t.back, 'neck-r', sideStitch));
    // three-panel hoods have a centre strip: its two seams are shown as stitch lines either side of the crown seam
    if (style === 'three-panel') for (const [pid, poly] of [['hood-r', hp], ['hood-l', hl]]) { const inner = insetPath(pathOf(poly, 'cb'), 4.5, poly.pts); if (inner.length > 2) trims.push({ type: 'stitch-line', panel: id(pid), path: inner }); }
    if (style === 'detachable') for (const sd of [1, -1]) for (const x of [4, 12, 20]) trims.push({ type: 'snap', panel: id('back'), at: [sd * Math.min(x, t.neckW + 2), t.H - 3.2] });
    void COLLARS.hood;
  }
  else if (COLLARS[o.collar]) collars.push({ kind: 'collar', style: o.collar, ...COLLARS[o.collar], paths: neckPaths() });
  else if (o.neckline === 'mock') collars.push({ kind: 'collar', style: 'mock', stand: 5, fabric: /knit|jersey|fleece|terry|rib/.test(fabric) ? 'rib-knit' : undefined, paths: neckPaths() });
  else if (!t.split && /knit|jersey|fleece|terry|rib|pique|interlock/.test(fabric) && o.shoulder !== 'strap') collars.push({ kind: 'neckband', style: 'rib-neckband', stand: o.neckline === 'henley' ? 1.6 : 2, fabric: 'rib-knit', paths: neckPaths() });
  // sleeveless knits (tanks, A-shirts, racerbacks): rib binding round each armhole
  if (o.sleeve === 'none' && /knit|jersey|rib|pique|interlock|terry|fleece/.test(fabric)) {
    const depth = o.shoulder === 'strap' ? 0.9 : 1.5;
    for (const pan of panels) {
      if (pan.role !== 'body') continue;
      const poly = pan.id === id('back') ? t.back : pan.id === id('front-r') ? t.fr : pan.id === id('front-l') ? t.fl : t.front;
      for (const tag of ['arm-r', 'arm-l']) {
        const path = pathOf(poly, tag); if (path.length < 3) continue;
        const inner = insetPath(path, depth, poly.pts);
        if (inner.length >= 2) overlays.push({ kind: 'band', style: 'rib', panel: pan.id, points: [...path, ...inner.reverse()] });
      }
    }
  }
  // pattern pieces for the cut list (the 3D collar is drawn from the spec above)
  if (['point', 'spread', 'button-down', 'camp', 'polo', 'corduroy'].includes(o.collar)) {
    const c = COLLARS[o.collar];
    const NL = polyLen(pathOf(FR[1], 'neck-r')) + polyLen(pathOf(t.back, 'neck-r')); // half the neckline the collar is sewn to
    // collar leaf: its neck edge is curved (so it rolls), the outer edge runs out to the collar point
    const leaf = []; for (let k = 0; k <= 12; k++) { const u = k / 12; leaf.push([-NL + 2 * NL * u, 1.4 * Math.pow(2 * u - 1, 2)]); }
    const outer = []; for (let k = 12; k >= 0; k--) { const u = k / 12; const e = Math.pow(Math.abs(2 * u - 1), 3); outer.push([(-NL + 2 * NL * u) * (1 + (c.spread || 0) * e / (NL * 2.2)), 1.4 * Math.pow(2 * u - 1, 2) + c.fall + (c.point - c.fall) * e]); }
    overlays.push({ kind: 'collar', style: o.collar, hidden: true, cut: 2, panel: id('back'), points: [...leaf, ...outer], note: 'Upper collar and under collar (cut 2); interline the upper collar.' });
    if (c.stand > 1) { const st = []; for (let k = 0; k <= 12; k++) { const u = k / 12; st.push([(-NL - 1.6) + 2 * (NL + 1.6) * u, -1.1 * Math.pow(2 * u - 1, 2)]); } const top = st.slice().reverse().map(([x, y]) => [x * 0.985, y + c.stand - 0.5 * Math.pow(Math.abs(x) / (NL + 1.6), 6)]); overlays.push({ kind: 'collar', style: 'collar-stand', hidden: true, cut: 2, panel: id('back'), points: [...st, ...top], note: 'Collar stand (cut 2 + interfacing); the extension carries the top button and buttonhole.' }); }
    if (o.collar === 'button-down') for (const sd of [1, -1]) trims.push({ type: 'button-2hole', panel: id('front'), at: [sd * 5.5, t.H - t.frontDrop - 5.5], size: 9 });
  }
  if (['mandarin', 'band-snap', 'funnel', 'rib'].includes(o.collar)) {
    overlays.push({ kind: 'collar', style: o.collar, hidden: true, panel: id('back'), points: rect(-t.neckW - 12, t.H - COLLARS[o.collar].stand, t.neckW + 12, t.H) });
    if (o.collar === 'band-snap') trims.push({ type: 'snap', panel: id('front'), at: [-1, t.H - t.frontDrop - 1.5] });
  }
  if (o.collar === 'hood') {
    trims.push({ type: 'grommet', panel: id('front'), at: [4, t.H - t.frontDrop - 3] }, { type: 'grommet', panel: id('front'), at: [-4, t.H - t.frontDrop - 3] });
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
  if (o.slit === 'back') overlays.push({ kind: 'vent', panel: id('back'), points: [[-0.4, 0], [0.4, 0], [0, o.slitHeight || 35]] });
  if (o.slit === 'front') overlays.push({ kind: 'vent', panel: id('front'), points: [[-0.4, 0], [0.4, 0], [0, o.slitHeight || 35]] });
  if (o.vent === 'side') for (const s of [1, -1]) overlays.push({ kind: 'vent', panel: id('back'), points: rect(s * t.hw - 0.5, 0, s * t.hw + 0.5, 20) });
  if (o.belt !== 'none') {
    for (const pid of ['front', 'back']) overlays.push({ kind: 'belt', panel: id(pid), points: rect(-t.hw - o.flare * 0.3, t.sideH - 24, t.hw + o.flare * 0.3, t.sideH - 19) });
    if (o.belt === 'buckle-belt') trims.push({ type: 'buckle', panel: id('front'), at: [0, t.sideH - 21.5] });
  }
  // ---- extra pieces that make a coat or jacket: each is cut, sewn on and shown in the flat pattern ----
  {
    const frontPoly = t.split ? t.fr : t.front;
    const S = frontPoly.pts.find((q, i) => frontPoly.tags[i] === 'sh-r') || [t.shoulderX, t.H - 4];
    const Nk = [t.neckW, t.H];
    const sl = Math.hypot(S[0] - Nk[0], S[1] - Nk[1]) || 1; const ux = (Nk[0] - S[0]) / sl; const uy = (Nk[1] - S[1]) / sl; // along the shoulder, tip -> neck
    if (o.epaulettes && o.epaulettes !== 'none') for (const sd of [1, -1]) {
      const len = Math.min(sl - 1.5, 11.5); const w = 4.6; const pt = o.epaulettes === 'pointed-buttoned' ? 1.6 : 0.5;
      // sewn into the armhole seam, lying along the shoulder towards the collar, buttoned at the neck end
      const P = (a, d) => [sd * (S[0] + ux * a - uy * 0 ), S[1] + uy * a - d];
      const pts = [P(0, 0.4), P(len - pt, 0.4), P(len, 0.4 + w / 2), P(len - pt, 0.4 + w), P(0, 0.4 + w)];
      overlays.push({ kind: 'epaulette', style: o.epaulettes, panel: id('front'), points: sd > 0 ? pts : pts.reverse() });
      trims.push({ type: o.epaulettes === 'snap' ? 'snap' : o.__button || 'button-4hole', panel: id('front'), at: [sd * (S[0] + ux * (len - 2.2)), S[1] + uy * (len - 2.2) - 0.4 - w / 2], size: 15 });
    }
    if (/gun-flap/.test(o.stormFlap || '')) { // right chest flap, buttoned (originally to stop rain running in when the rifle was shouldered)
      const x0 = -(t.neckW + 1.5); const x1 = -(S[0] - 0.5); const yb = t.H - 24;
      overlays.push({ kind: 'storm-flap', style: 'gun-flap', panel: id('front'), points: [[x0, t.H - 3.5], [x1, S[1] - 1], [x1 - 0.5, yb + 5], [(x0 + x1) / 2 - 2, yb], [x0 + 1.5, yb + 3.5]].reverse() });
      trims.push({ type: o.__button || 'button-4hole', panel: id('front'), at: [x0 + 2.5, yb + 5.5], size: 20 });
    }
    if (/back-shield/.test(o.stormFlap || '')) { // loose cape over the upper back sheds rain past the seams
      const yb = t.H - 30; const xb = S[0] + 1;
      overlays.push({ kind: 'storm-flap', style: 'back-shield', panel: id('back'), points: [[-xb, S[1] - 0.5], [-t.neckW, t.H - 1], [t.neckW, t.H - 1], [xb, S[1] - 0.5], [xb + 1.5, yb + 5], [xb * 0.5, yb + 0.8], [0, yb], [-xb * 0.5, yb + 0.8], [-xb - 1.5, yb + 5]] });
    }
    if (o.throatLatch === 'yes') { overlays.push({ kind: 'tab', style: 'throat-latch', panel: id('front'), points: [[-2, t.H - t.frontDrop + 3.2], [9, t.H - t.frontDrop + 4.6], [9.6, t.H - t.frontDrop + 2.8], [9, t.H - t.frontDrop + 1], [-2, t.H - t.frontDrop + 0.2]] }); trims.push({ type: o.__button || 'button-4hole', panel: id('front'), at: [7.6, t.H - t.frontDrop + 2.8], size: 15 }); }
    if (o.sleeveStrap && o.sleeveStrap !== 'none') for (const pan of panels) {
      if (pan.role !== 'sleeve') continue;
      const xs = pan.points.map((q) => q[0]); const L2 = Math.max(...xs); const atCuff = pan.points.filter((q) => q[0] > L2 - 0.6).map((q) => q[1]); const half = Math.max(...atCuff.map(Math.abs)) + 0.6;
      overlays.push({ kind: 'strap', style: o.sleeveStrap, panel: pan.id, points: rect(L2 - 9.5, -half * 0.98, L2 - 6.3, half * 0.62) });
      trims.push(o.sleeveStrap === 'strap-buckle' ? { type: 'buckle', panel: pan.id, at: [L2 - 7.9, half * 0.2], size: 26 } : { type: o.__button || 'button-4hole', panel: pan.id, at: [L2 - 7.9, half * 0.4], size: 18 });
      overlays.push({ kind: 'belt-loop', style: 'keeper', panel: pan.id, points: rect(L2 - 9.9, -half * 0.5, L2 - 5.9, -half * 0.5 + 1.1) });
    }
  }
  // decorative-edge paths
  const edgesOf = (poly) => ({ hem: [...pathOf(poly, 'hem-l'), ...pathOf(poly, 'hem-r').slice(pathOf(poly, 'hem-l').length ? 1 : 0)], neck: [...pathOf(poly, 'neck-r'), ...pathOf(poly, 'neck-l').slice(pathOf(poly, 'neck-r').length ? 1 : 0)], armhole: o.sleeve === 'none' ? [...pathOf(poly, 'arm-r'), ...pathOf(poly, 'arm-l')] : [] });
  for (const pan of panels) {
    if (pan.role === 'sleeve') { const c = pan.points; pan.edges = { cuff: [c[0], c[1]] }; continue; }
    pan.edges = edgesOf(pan.id === id('back') ? t.back : pan.id === id('front-r') ? t.fr : pan.id === id('front-l') ? t.fl : t.front);
  }
  if (o.insulation && o.insulation !== 'none') {
    for (const pan of panels) pan.insulation = { fill: o.insulation, weight: o.fillWeight, quilting: o.quilting };
  }
  if (o.sleeve === 'none') for (const pan of panels) if (pan.role === 'body') pan.tack = { y0: t.H - (o.shoulder === 'strap' ? 2 : 5), y1: t.H + 1 };
  if (o.lining && o.lining !== 'none') for (const pan of panels) if (o.lining === 'full' || pan.role === 'body') pan.lining = 'acetate-satin';
  // fastenings: number the centre-front buttons, and unfasten whatever is worn open
  if (t.split && panels[0].attach) {
    const btns = trims.filter((tr) => tr.panel === id('front') && tr.at && !tr.to && /button|snap|toggle/.test(tr.type) && tr.type !== 'button-2hole' && Math.abs(tr.at[0]) < 8.5).sort((a, b) => b.at[1] - a.at[1]);
    const rows = [...new Set(btns.map((b) => Math.round(b.at[1])))];
    for (const b of btns) { b.btn = rows.indexOf(Math.round(b.at[1])); b.undone = wear.buttons?.[b.btn] === false || wear.buttons === 'none'; }
    const pts = panels[0].attach[0].pts; const top = pts.length ? pts[pts.length - 1][1] : 0; const bot = pts.length ? pts[0][1] : 0;
    panels[0].attach[0].pts = wear.buttons === 'none' ? [] : pts.filter(([, y]) => {
      if (wear.open && y > top - wear.open * (top - bot) - 0.01) return false;
      if (!rows.length || !wear.buttons) return true;
      let k = 0; for (let i = 1; i < rows.length; i++) if (Math.abs(rows[i] - y) < Math.abs(rows[k] - y)) k = i;
      return wear.buttons[k] !== false;
    });
  }
  // open fronts: details drafted on "the front" land on the piece they sit on
  if (t.split) {
    const fid = id('front');
    const routed = [];
    for (const ov of overlays) {
      if (ov.panel !== fid) { routed.push(ov); continue; }
      const xs = ov.points.map((q) => q[0]);
      // a piece wholly inside the overlap belongs to the top front
      if (Math.min(...xs) >= -t.ext - 0.01 && Math.max(...xs) > 0) { routed.push({ ...ov, panel: id('front-r') }); continue; }
      if (Math.max(...xs) <= 0) { routed.push({ ...ov, panel: id('front-l') }); continue; }
      for (const sd of [1, -1]) { const pts = clipX(ov.points, sd); if (pts.length >= 3 && polyArea(pts) > 0.5) routed.push({ ...ov, panel: id(sd > 0 ? 'front-r' : 'front-l'), points: pts }); }
    }
    overlays.length = 0; overlays.push(...routed);
    for (const tr of trims) if (tr.panel === fid) tr.panel = id(tr.at && tr.at[0] < -t.ext - 0.01 && !tr.to ? 'front-l' : 'front-r');
  }
  return { panels, seams, trims, overlays, collars };
}

// =====================================================================
// BOTTOMS: trousers, jeans, chinos, shorts, joggers
// =====================================================================
export const BOTTOM_OPTIONS = {
  fit: { label: 'Fit', type: 'select', values: ['slim', 'regular', 'relaxed', 'oversized'], default: 'regular' },
  inseam: { label: 'Inseam (cm)', type: 'range', min: 8, max: 84, step: 0.5, default: 78 },
  rise: { label: 'Rise', type: 'select', values: ['ultra-low', 'low', 'mid', 'high', 'ultra-high'], default: 'mid' },
  leg: { label: 'Leg shape', type: 'select', values: ['skinny', 'cigarette', 'slim', 'tapered', 'straight', 'relaxed', 'carpenter', 'wide', 'baggy', 'barrel', 'bootcut', 'flare', 'bell-bottom'], default: 'straight' },
  waistband: { label: 'Waistband', type: 'select', values: ['button', 'hook-bar', 'elastic', 'drawstring', 'side-adjusters'], default: 'button' },
  fly: { label: 'Fly', type: 'select', values: ['zip', 'button', 'none'], default: 'zip' },
  hem: { label: 'Hem', type: 'select', values: ['plain', 'turn-up', 'rib-cuff', 'raw', 'split'], default: 'plain' },
  pockets: { label: 'Pockets', type: 'select', values: ['five-pocket', 'slant', 'side-seam', 'cargo', 'welt-back', 'none'], default: 'slant' },
  pleats: { label: 'Pleats', type: 'select', values: ['flat', 'single', 'double'], default: 'flat' },
  beltLoops: { label: 'Belt loops', type: 'select', values: ['yes', 'no'], default: 'yes' },
  distress: { label: 'Distressing', type: 'select', values: ['none', 'knee-rips', 'one-knee', 'shredded', 'thigh-blowout', 'worn-fades'], default: 'none' },
  waistAdj: { label: 'Tailor: waist (cm)', type: 'range', min: -10, max: 12, step: 0.5, default: 0 },
  hipAdj: { label: 'Tailor: seat / hips (cm)', type: 'range', min: -10, max: 14, step: 0.5, default: 0 },
  thighAdj: { label: 'Tailor: thigh (cm)', type: 'range', min: -8, max: 10, step: 0.5, default: 0 },
  hemAdj: { label: 'Tailor: leg opening (cm)', type: 'range', min: -10, max: 14, step: 0.5, default: 0 },
};

export function buildBottom(o, prefix = '', fabric = 'cotton-twill') {
  const wear = o.__wear || {};
  // cuffed (turned-up) hems shorten the leg by the fold: one turn 4.5 cm, two turns 9 cm
  if (wear.cuff && o.inseam > 30) o = { ...o, inseam: o.inseam - 4.5 * wear.cuff, hem: 'turn-up' };
  const BODY = bodyOf(o);
  const id = (s) => `${prefix}${s}`;
  const ease = (FIT[o.fit] ?? 14) * 0.6;
  const riseCm = { 'ultra-low': 17.5, low: 20.5, mid: 25, high: 30, 'ultra-high': 34 }[o.rise] ?? 25;
  const I = o.inseam;
  // leg silhouettes: [knee half-width, hem half-width] in cm for one pattern piece (opening = 4 x hem)
  const LEGS = { skinny: [8.6, 7.2], cigarette: [9, 7.8], slim: [9.6, 8.2], tapered: [10.2, 7.8], straight: [10.4, 9.6], relaxed: [11.6, 10.6], carpenter: [12, 11], wide: [13.5, 13.5], baggy: [14.5, 12.5], barrel: [15, 8.8], bootcut: [9.2, 10.8], flare: [9, 13.6], 'bell-bottom': [8.8, 17] };
  const [kneeBase, hemBase] = LEGS[o.leg] || LEGS.straight;
  const fitAdd = { slim: -0.4, regular: 0, relaxed: 0.8, oversized: 1.8 }[o.fit] ?? 0;
  const legHalf = hemBase + fitAdd * 0.6 + (o.hemAdj || 0) / 4;
  const kneeHalf = kneeBase + fitAdd;
  const hipQ = (BODY.hip + ease * 2 + (o.hipAdj || 0)) / 4;
  const waistQ = (BODY.waist + 4 + (o.waistAdj || 0) + (o.waistband === 'elastic' || o.waistband === 'drawstring' ? 14 : 0)) / 4;
  const thighHalf = 13 + ease * 0.4 + (o.thighAdj || 0) / 4;
  const shortLeg = I < 30;
  const kneeY = I * 0.56;
  // Trouser draft. Centre front/back seam runs at x = -10; +x is the outseam, the fork
  // extends to -x. The back has a longer fork, a deeper seat curve and a raised, angled waist.
  const legPoly = (crotchExt, extraRise) => {
    const p = new Poly();
    const isBack = extraRise > 0;
    const fork = [-10 - crotchExt, I - (isBack ? 0.8 : 0)];
    const hipY = I + riseCm * 0.36;
    const outHip = [hipQ - 10 + (isBack ? 0.8 : -0.4), hipY];
    const thighOut = (o.thighAdj || 0) / 4 + outHip[0] - 0.6;
    const cx = (fork[0] + thighOut) / 2; // crease line
    const hem = shortLeg ? Math.max(legHalf, (thighOut - fork[0]) / 2 - I * 0.07) : legHalf;
    const top = I + riseCm;
    const waistOut = [waistQ - 10 + 1, top + extraRise * 0.25];
    const waistIn = [-10 + (isBack ? 2.6 : 0.4), top + extraRise - (isBack ? 0 : 0.8)];
    p.add(cx - hem, 0, 'hem');
    // outseam
    if (!shortLeg && I > 45) {
      bez(p, [cx + hem, 0], [cx + hem - (hem - kneeHalf) * 0.2, kneeY * 0.45], [cx + kneeHalf + (hem - kneeHalf) * 0.15, kneeY * 0.8], [cx + kneeHalf, kneeY], 'out', 6);
      bez(p, [cx + kneeHalf, kneeY], [cx + kneeHalf + (thighOut - cx - kneeHalf) * 0.35, kneeY + (I - kneeY) * 0.45], [thighOut - 0.4, I - (I - kneeY) * 0.25], [thighOut, I], 'out', 6);
    } else { p.add(cx + hem, 0, 'out'); }
    bez(p, [thighOut, I], [thighOut + 0.3, I + (hipY - I) * 0.5], [outHip[0], hipY - (hipY - I) * 0.3], outHip, 'out', 4);
    bez(p, outHip, [outHip[0], hipY + (top - hipY) * 0.45], [waistOut[0] + 0.6, top - (top - hipY) * 0.35], waistOut, 'out', 6);
    p.add(waistOut[0], waistOut[1], 'waist');
    // centre seam: straight (angled on the back) down to the hip line, then the crotch curve
    p.add(waistIn[0], waistIn[1], 'cf');
    const turn = [-10 - (isBack ? 0.3 : 0), I + riseCm * (isBack ? 0.42 : 0.34)];
    p.add(turn[0], turn[1], 'cf');
    bez(p, turn, [turn[0] - 0.2, I + riseCm * 0.12], [fork[0] + crotchExt * 0.55, fork[1] + (isBack ? 0.1 : 0.6)], fork, 'cf', isBack ? 9 : 7);
    // inseam
    if (!shortLeg && I > 45) {
      bez(p, fork, [fork[0] + (cx - kneeHalf - fork[0]) * 0.55, I - (I - kneeY) * 0.35], [cx - kneeHalf - 0.3, kneeY + (I - kneeY) * 0.3], [cx - kneeHalf, kneeY], 'in', 7);
      bez(p, [cx - kneeHalf, kneeY], [cx - kneeHalf - (hem - kneeHalf) * 0.15, kneeY * 0.8], [cx - hem + (hem - kneeHalf) * 0.2, kneeY * 0.45], [cx - hem, 0], 'in', 6);
    } else p.add(fork[0], fork[1], 'in');
    p.cx = cx;
    return p;
  };
  const front = legPoly(4.2 * (BODY.hip / 100), 0);
  const back = legPoly(9.4 * (BODY.hip / 100), 4);
  const hemY = BODY.crotchY - I / 100 + 0.005;
  const panels = [];
  const seams = [];
  const R = 0.12 + ease / 300;
  // mirror: flip local x so the outseam faces outwards; leg: which leg (+1 = +x world)
  const mk = (pid, name, poly, mirrorX, leg, isBack) => {
    const pts = mirrorX > 0 ? poly.pts : poly.pts.map(([x, y]) => [-x, y]);
    panels.push({ id: id(pid), name, role: 'leg', points: pts, placement: { position: [BODY.legX * leg, hemY, isBack ? -R : R], rotationY: isBack ? Math.PI : 0, wrap: R, wrapMax: 1.35 }, fabric });
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
  // the fly is the top of the front rise seam: unzipped / unbuttoned, that part is left open
  seams.push({ ...seam(id('front-r'), front, 'cf', id('front-l'), front, 'cf', 'chainstitch-401'), ...(wear.fly === 'open' && o.fly !== 'none' ? { open: Math.min(0.6, 12 / (polyLen(pathOf(front, 'cf')) || 30)), fly: true } : {}) });
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
    // waistband follows the (angled) waist seam of its piece
    const src = isBack ? back : front;
    const wp = pathOf(src, 'waist');
    const band = [...wp, ...wp.slice().reverse().map(([x, y]) => [x, y - 4])].map(([x, y]) => [s > 0 ? x : -x, y]);
    overlays.push({ kind: 'waistband', style: o.waistband, panel: id(pid), points: s > 0 ? band : band.reverse() });
    const legHalfC = legHalf; const cxs = (s > 0 ? 1 : -1) * src.cx;
    if (o.hem === 'turn-up') overlays.push({ kind: 'cuff', style: 'turn-up', panel: id(pid), points: rect(cxs - legHalfC, 0, cxs + legHalfC, 4.5) });
    // a finished hem: the fold shows as a band (narrow double-turned on jeans, deeper blind hem on tailored trousers)
    if ((o.hem === 'plain' || o.hem === 'split') && !shortLeg) overlays.push({ kind: 'hem', style: /denim/.test(fabric) ? 'double-turned' : 'blind', panel: id(pid), points: rect(cxs - legHalfC, 0, cxs + legHalfC, /denim/.test(fabric) ? 1.3 : /wool|suiting/.test(fabric) ? 4 : 2.5) });
    if ((o.hem === 'plain' || o.hem === 'split') && shortLeg) { const hx = src.pts.filter((q) => q[1] < 0.6).map((q) => q[0] * (s > 0 ? 1 : -1)); if (hx.length >= 2) overlays.push({ kind: 'hem', style: 'turned', panel: id(pid), points: rect(Math.min(...hx), 0, Math.max(...hx), 2) }); }
    if (o.hem === 'rib-cuff') overlays.push({ kind: 'cuff', style: 'rib', panel: id(pid), points: rect(cxs - legHalfC, 0, cxs + legHalfC, 7) });
    if (o.beltLoops === 'yes' && o.waistband !== 'elastic') trims.push({ type: 'belt-loop', panel: id(pid), at: [s * 4, top - 2 + (isBack ? 5 : 0)] });
  }
  if (o.waistband === 'button') trims.push({ type: o.pockets === 'five-pocket' ? 'jeans-button' : 'button-4hole', panel: id('front-r'), at: [-9, top - 2] });
  if (o.waistband === 'drawstring') trims.push({ type: 'grommet', panel: id('front-r'), at: [-8, top - 2] }, { type: 'grommet', panel: id('front-l'), at: [8, top - 2] });
  if (o.fly === 'zip') { overlays.push({ kind: 'fly', panel: id('front-r'), points: rect(-10, top - 18, -7, top - 4) }); trims.push({ type: 'zipper', panel: id('front-r'), at: [-8.5, top - 17], to: [-8.5, top - 5], zip: { ...ZIPPER_DEFAULTS[/denim/.test(fabric) ? 'jeans' : 'pocket'], end: 'closed', slider: 'auto-lock' }, fly: true, ...(wear.fly === 'open' ? { slider: 0 } : {}) }); }
  for (const pan of panels) pan.edges = { hem: pathOf(pan.id.endsWith('front-r') || pan.id.endsWith('back-l') ? front : back, 'hem') };
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
  // factory distressing on the front legs (placed pieces: more can be added by clicking the garment)
  if (o.distress && o.distress !== 'none' && !shortLeg) {
    const D = (pid, style, y, w, h2, dx = 0) => { const sg = pid === 'front-r' ? 1 : -1; const cxd = sg * front.cx + dx; overlays.push({ kind: 'distress', style, panel: id(pid), points: rect(cxd - w / 2, y - h2 / 2, cxd + w / 2, y + h2 / 2) }); };
    const knee = I * 0.56;
    if (o.distress === 'knee-rips') { D('front-r', 'rip', knee, 13, 7); D('front-l', 'rip', knee + 1.5, 12, 6); D('front-r', 'whiskers', I + riseCm * 0.3, 18, 12); D('front-l', 'whiskers', I + riseCm * 0.3, 18, 12); }
    if (o.distress === 'one-knee') { D('front-l', 'blowout', knee, 12, 11); D('front-r', 'fade', I * 0.8, 16, 22); D('front-l', 'fade', I * 0.82, 16, 22); }
    if (o.distress === 'shredded') { D('front-r', 'shred', I * 0.74, 12, 17); D('front-l', 'shred', knee, 12, 16); D('front-r', 'rip', knee - 4, 11, 6); }
    if (o.distress === 'thigh-blowout') { D('front-r', 'blowout', I * 0.82, 11, 10); D('front-l', 'rip', I * 0.7, 12, 6); D('front-l', 'rip', knee, 12, 6); }
    if (o.distress === 'worn-fades') for (const pid of ['front-r', 'front-l']) { D(pid, 'fade', I * 0.8, 17, 24); D(pid, 'fade', knee, 14, 16); D(pid, 'whiskers', I + riseCm * 0.3, 18, 12); }
  }
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
  panels[0].edges = { hem: pathOf(f, 'hem') }; panels[1].edges = { hem: pathOf(b, 'hem') };
  if (o.waistband === 'facing') trims.push({ type: 'zipper', panel: id('back'), at: [0, o.length - 20], to: [0, o.length - 1], zip: { ...ZIPPER_DEFAULTS.dress } });
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
  wear: { label: 'Worn', type: 'select', values: ['draped', 'one-end-back', 'short-drape'], default: 'draped' },
};
export function buildScarf(o, prefix = '', fabric = 'wool-cashmere') {
  const B = bodyOf(o);
  const id = (s) => `${prefix}${s}`;
  const L = o.length / 2;
  // worn folded in half along its length: laid round the back of the neck, both ends brought to the front
  const W = Math.min(o.width / 2, 16);
  const Rn = 0.083 * ((B.neckC || 38) / 38);
  const shift = o.wear === 'one-end-back' ? L * 0.45 : 0; // one end much longer, to throw over the shoulder
  const pts = rect(-L + shift, 0, L + shift, W);
  const panels = [{ id: id('scarf'), name: 'Scarf', role: 'accessory', points: pts, fold: 'worn folded in half lengthwise',
    placement: { position: [0, B.neckBase - 0.075, -0.012 - Rn], rotationY: Math.PI, wrap: Rn, wrapMax: o.wear === 'short-drape' ? 1.75 : 1.95 }, fabric,
    edges: { hem: [[-L + shift, 0], [-L + shift, W]], cuff: [[L + shift, 0], [L + shift, W]] } }];
  const trims = o.ends === 'fringe' ? [{ type: 'fringe', panel: id('scarf'), at: [-L + shift + 0.6, 0], to: [-L + shift + 0.6, W] }, { type: 'fringe', panel: id('scarf'), at: [L + shift - 0.6, 0], to: [L + shift - 0.6, W] }] : [];
  return { panels, seams: [], trims, overlays: [] };
}

export const TIE_OPTIONS = {
  knot: { label: 'Type / knot', type: 'select', values: ['four-in-hand', 'half-windsor', 'windsor', 'pratt', 'kelvin', 'eldredge', 'bow'], default: 'four-in-hand' },
  attach: { label: 'How it fastens', type: 'select', values: ['self-tie', 'pre-tied', 'clip-on'], default: 'self-tie' },
  bow: { label: 'Bow shape (bow ties)', type: 'select', values: ['butterfly', 'big-butterfly', 'batwing', 'diamond', 'rounded'], default: 'butterfly' },
  width: { label: 'Blade width (cm)', type: 'range', min: 4, max: 10, step: 0.5, default: 7.5 },
  length: { label: 'Hanging length (cm)', type: 'range', min: 35, max: 60, step: 1, default: 48 },
  tip: { label: 'Tip', type: 'select', values: ['pointed', 'square'], default: 'pointed' },
};
export function buildTie(o, prefix = '', fabric = 'silk-twill') {
  const B = bodyOf(o);
  const id = (s) => `${prefix}${s}`;
  const y = B.shoulderY - 0.022; // the knot sits in the collar gap at the base of the neck
  const band = o.attach !== 'clip-on'; // clip-ons have a metal clip behind the knot instead of a neckband
  if (o.knot === 'bow') return { panels: [], seams: [], trims: [], overlays: [], props: [{ kind: 'bowtie', style: o.bow || 'butterfly', attach: o.attach || 'self-tie', y, fabric, band }] };
  const w = o.width / 2; const L = o.length; const kw = 1.45; // half width where the blade leaves the knot
  // blade: narrow under the knot, widening to the tip (a real blade, not a strip)
  const pts = o.tip === 'pointed' ? [[0, 0], [w, w * 0.95], [w * 0.86, L * 0.45], [kw, L], [-kw, L], [-w * 0.86, L * 0.45], [-w, w * 0.95]] : [[-w, 0], [w, 0], [w * 0.86, L * 0.45], [kw, L], [-kw, L], [-w * 0.86, L * 0.45]];
  // the blade is lined cloth (shell + interlining + tipping), so it hangs with body; it starts where the wide end leaves the knot
  const panels = [{ id: id('tie'), name: 'Tie blade (front)', role: 'accessory', points: pts, lining: 'wool interlining', placement: { position: [0, y - 0.027 - L / 100, 0.135 * B.gs], rotationY: 0 }, fabric, pins: [[0, L - 0.3], [-kw * 0.8, L - 0.3], [kw * 0.8, L - 0.3]], edges: { hem: o.tip === 'pointed' ? [[-w, w * 0.95], [0, 0], [w, w * 0.95]] : [[-w, 0], [w, 0]] } }];
  return { panels, seams: [], trims: [], overlays: [], props: [{ kind: 'tie-knot', style: o.knot, attach: o.attach || 'self-tie', y, fabric, band, panel: id('tie'), at: [0, L - 0.3], bladeAt: kw * 2, tail: Math.max(10, L - 18) }] };
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
  const HEAD = { y: B.headY, r: B.headR * (B.head / 58), band: B.headY - 0.05 * B.hs, circ: B.head };
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
  const topBand = o.shape === 'crescent' ? { y0: H * 0.55, y1: H * 1.2, now: true } : { y0: H - 2, y1: H + 1, now: true }; // hangs from its top (handles) on the display
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
    case 'zip': trims.push({ type: 'zipper', panel: id('front'), at: [-W * 0.9, topY - 0.3], to: [W * 0.9, topY - 0.3], zip: { ...ZIPPER_DEFAULTS.bag, type: o.hardware === 'gold' ? 'premium-polished' : 'coil' } }); break;
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

// =====================================================================
// UNDERWEAR: briefs (bottoms) and bras (tops)
// =====================================================================
export const BRIEF_OPTIONS = {
  style: { label: 'Style', type: 'select', values: ['brief', 'bikini', 'hipster', 'high-waist', 'boyshort', 'thong', 'trunk'], default: 'brief' },
  rise: { label: 'Rise (cm, crotch to waist)', type: 'range', min: 14, max: 36, step: 0.5, default: 24 },
  legCut: { label: 'Leg cut height at side (cm)', type: 'range', min: 3, max: 22, step: 0.5, default: 9 },
  waistband: { label: 'Waistband', type: 'select', values: ['exposed-elastic', 'fold-over', 'picot', 'covered', 'laser-cut'], default: 'exposed-elastic' },
  pouch: { label: 'Front pouch (men)', type: 'select', values: ['none', 'contour', 'fly'], default: 'none' },
  gusset: { label: 'Gusset', type: 'select', values: ['cotton', 'self', 'none'], default: 'cotton' },
};
export function buildBrief(o, prefix = '', fabric = 'microfiber-jersey') {
  const BODY = bodyOf(o);
  const id = (s) => `${prefix}${s}`;
  const hipQ = (BODY.hip * 0.94) / 4; // negative ease: stretch fabrics hug the body
  const waistY0 = BODY.waistY - (o.style === 'high-waist' ? -0.04 : o.style === 'bikini' ? 0.07 : 0.02);
  // rise adapts to the body so the crotch seam always starts below the crotch
  const H = Math.max(o.style === 'trunk' ? o.rise + 8 : o.style === 'boyshort' ? o.rise + 6 : o.rise, (waistY0 - (BODY.crotchY - 0.045)) * 100);
  const side = o.style === 'trunk' || o.style === 'boyshort' ? H * 0.75 : o.style === 'high-waist' ? Math.max(o.legCut, 14) : o.legCut;
  const crotchW = 4.5;
  const mk = (back) => {
    const p = new Poly();
    const cw = back && o.style === 'thong' ? 1.5 : back ? crotchW + 2.5 : crotchW;
    const seatW = back && o.style === 'thong' ? 3 : hipQ;
    p.add(-cw, 0, 'crotch');
    p.add(cw, 0, 'leg-r');
    if (o.style !== 'trunk' && o.style !== 'boyshort') p.add(back && o.style === 'thong' ? 2 : hipQ * 0.55, H - side - (back ? 4 : 6), 'leg-r');
    p.add(back && o.style === 'thong' ? seatW : hipQ, H - side, 'side-r');
    p.add(hipQ, H, 'waist');
    p.add(-hipQ, H, 'side-l');
    p.add(back && o.style === 'thong' ? -seatW : -hipQ, H - side, 'leg-l');
    if (o.style !== 'trunk' && o.style !== 'boyshort') p.add(back && o.style === 'thong' ? -2 : -hipQ * 0.55, H - side - (back ? 4 : 6), 'leg-l');
    return p;
  };
  const f = mk(false); const b = mk(true);
  const y = waistY0 - H / 100;
  const R = 0.16;
  const panels = [
    { id: id('front'), name: 'Front', role: 'brief', points: f.pts, tack: { y0: H - 2.5, y1: H + 1 }, placement: { position: [0, y, R], rotationY: 0, wrap: R, wrapMax: 1.5 }, fabric },
    { id: id('back'), name: 'Back', role: 'brief', points: b.pts, tack: { y0: H - 2.5, y1: H + 1 }, placement: { position: [0, y, -R], rotationY: Math.PI, wrap: R, wrapMax: 1.5 }, fabric },
  ];
  const st = o.__stitch || 'flatlock-607';
  const seams = [
    seam(id('front'), f, 'side-r', id('back'), b, 'side-l', st),
    seam(id('front'), f, 'side-l', id('back'), b, 'side-r', st),
    seam(id('front'), f, 'crotch', id('back'), b, 'crotch', st),
  ];
  const overlays = []; const trims = [];
  for (const pid of ['front', 'back']) {
    if (o.waistband !== 'laser-cut') overlays.push({ kind: 'waistband', style: o.waistband, panel: id(pid), points: rect(-hipQ, H - (o.waistband === 'exposed-elastic' ? 3.5 : 1.2), hipQ, H), color: o.waistband === 'exposed-elastic' ? '#111111' : undefined });
  }
  panels[0].edges = { leg: [...pathOf(f, 'leg-r'), ...pathOf(f, 'leg-l')], waist: pathOf(f, 'waist') }; panels[1].edges = { leg: [...pathOf(b, 'leg-r'), ...pathOf(b, 'leg-l')], waist: pathOf(b, 'waist') };
  if (o.gusset !== 'none') overlays.push({ kind: 'gusset', style: o.gusset, panel: id('front'), points: rect(-crotchW, 0, crotchW, 9), fabric: o.gusset === 'cotton' ? 'cotton-jersey' : undefined });
  if (o.pouch !== 'none') overlays.push({ kind: 'pouch', style: o.pouch, panel: id('front'), points: [[-6, 2], [6, 2], [8, H * 0.55], [0, H * 0.7], [-8, H * 0.55]] });
  if (o.pouch === 'fly') trims.push({ type: 'button-2hole', panel: id('front'), at: [0, H * 0.55], size: 9 });
  if (o.waistband === 'exposed-elastic') trims.push({ type: 'label', panel: id('front'), at: [0, H - 1.8], size: 40, color: '#ffffff' });
  if (o.waistband === 'picot') for (const pid of ['front', 'back']) trims.push({ type: 'picot-elastic', panel: id(pid), at: [-hipQ, H - 0.3], to: [hipQ, H - 0.3] });
  return { panels, seams, trims, overlays };
}

export const BRA_OPTIONS = {
  style: { label: 'Style', type: 'select', values: ['triangle', 'balconette', 'sports', 'bandeau'], default: 'triangle' },
  band: { label: 'Band (underbust, cm)', type: 'range', min: 60, max: 120, step: 1, default: 74 },
  cup: { label: 'Cup', type: 'select', values: ['AA', 'A', 'B', 'C', 'D', 'DD', 'E', 'F', 'G'], default: 'B' },
  straps: { label: 'Straps', type: 'select', values: ['standard', 'racer', 'halter', 'convertible', 'strapless'], default: 'standard' },
  strapWidth: { label: 'Strap width (mm)', type: 'range', min: 6, max: 30, step: 1, default: 10 },
  closure: { label: 'Closure', type: 'select', values: ['back-hook', 'front-hook', 'pullover'], default: 'back-hook' },
  wire: { label: 'Underwire', type: 'select', values: ['none', 'underwire'], default: 'none' },
  padding: { label: 'Padding / cup', type: 'select', values: ['unlined', 'lined', 'removable-pads', 'molded-foam'], default: 'unlined' },
  bandHeight: { label: 'Underband height (cm)', type: 'range', min: 1.5, max: 10, step: 0.5, default: 3 },
};
const CUP_INDEX = { AA: 0, A: 1, B: 2, C: 3, D: 4, DD: 5, E: 5, F: 6, G: 7 };
export function buildBra(o, prefix = '', fabric = 'microfiber-jersey') {
  const BODY = bodyOf(o);
  const id = (s) => `${prefix}${s}`;
  const sports = o.style === 'sports';
  const bandQ = (o.band * 0.92) / 4; // negative ease on the band (it carries the support)
  const bh = sports ? Math.max(o.bandHeight, 6) : o.bandHeight;
  const ci = CUP_INDEX[o.cup] ?? 2;
  const cupH = sports ? 16 : o.style === 'bandeau' ? 0 : 12 + ci * 1.6;
  const cupW = 15 + ci * 1.2;
  // the band sits on the underbust: a cup radius below the fullest point of the bust (deeper for larger cups)
  const bandY = (BODY.bustY || BODY.armY - 0.1) - (0.05 + (CUP_INDEX[o.cup] ?? 2) * 0.006) - (sports ? Math.max(o.bandHeight, 6) : o.bandHeight) / 100;
  const R = 0.135 * BODY.gs;
  const bandPoly = () => { const p = new Poly(); p.add(-bandQ, 0, 'bottom').add(bandQ, 0, 'side-r').add(bandQ, bh, 'top').add(-bandQ, bh, 'side-l'); return p; };
  const fB = bandPoly(); const bB = bandPoly();
  const panels = [
    { id: id('band-front'), name: o.style === 'bandeau' ? 'Bandeau front' : 'Underband front', role: 'bra', points: fB.pts, tack: { y0: -1, y1: 1.5 }, placement: { position: [0, bandY, R], rotationY: 0, wrap: R, wrapMax: 1.55 }, fabric },
    { id: id('band-back'), name: 'Back band', role: 'bra', points: bB.pts, tack: { y0: -1, y1: 1.5 }, placement: { position: [0, bandY, -R], rotationY: Math.PI, wrap: R, wrapMax: 1.55 }, fabric },
  ];
  const st = o.__stitch || 'zigzag-304';
  const seams = [seam(id('band-front'), fB, 'side-r', id('band-back'), bB, 'side-l', st), seam(id('band-front'), fB, 'side-l', id('band-back'), bB, 'side-r', st)];
  const trims = []; const overlays = [];
  if (o.style === 'bandeau') {
    fB.pts[2][1] = fB.pts[3][1] = bh + 12;
    panels[0].points = fB.pts;
  } else {
    for (const s of [1, -1]) {
      // cup: shaped triangle (sports = wider, higher coverage)
      const p = new Poly();
      const inner = sports ? 0.5 : 1;
      p.add(s * inner, 0, 'base');
      p.add(s * (inner + cupW), 0, 'outer');
      if (sports) p.add(s * (inner + cupW - 2), cupH * 0.7, 'outer');
      p.add(s * (inner + cupW * (sports ? 0.45 : 0.55)), cupH, 'inner');
      if (sports) p.add(s * inner, cupH * 0.75, 'inner');
      const pts = s > 0 ? p.pts : p.pts.slice().reverse();
      const poly = new Poly();
      if (s > 0) p.pts.forEach((q, i) => poly.add(q[0], q[1], p.tags[i]));
      else { const n = p.pts.length; for (let k = 0; k < n; k++) { const i = (n - k) % n; poly.add(p.pts[i][0], p.pts[i][1], p.tags[(i - 1 + n) % n]); } }
      void pts;
      const cid = id(s > 0 ? 'cup-r' : 'cup-l');
      panels.push({ id: cid, name: s > 0 ? 'Cup (right)' : 'Cup (left)', role: 'bra', points: poly.pts, tack: { y0: cupH - 2, y1: cupH + 1 }, placement: { position: [0, bandY + bh / 100 + 0.005, R + 0.02], rotationY: 0, wrap: R + 0.02, wrapMax: 1.2 }, fabric: o.padding === 'molded-foam' ? 'bra-foam' : fabric });
      // cup base sewn to the top of the front underband
      const bandSeg = new Poly();
      void bandSeg;
      seams.push({ a: { panel: cid, ...poly.range('base') }, b: { panel: id('band-front'), edge: 2, to: 2 }, stitch: st, half: s });
      const apex = [s * (inner + cupW * (sports ? 0.45 : 0.55)), cupH - 0.5];
      if (o.straps !== 'strapless') {
        const backX = o.straps === 'racer' ? 0 : o.straps === 'halter' ? null : s * -bandQ * 0.45;
        if (o.straps === 'halter') trims.push({ type: 'strap', panel: cid, at: apex, to: [0, cupH + 18], arch: 0.06, size: o.strapWidth * 3 });
        else trims.push({ type: 'strap', panel: cid, at: apex, toPanel: id('band-back'), to: [backX, bh], arch: 0.2, size: o.strapWidth * 3 });
        if (o.straps !== 'racer') trims.push({ type: 'strap-slider', panel: cid, at: [apex[0], apex[1] - 0.5], size: o.strapWidth + 4 });
      }
      if (o.wire === 'underwire') trims.push({ type: 'underwire', panel: cid, at: [s * (inner + 0.5), 0.6], to: [s * (inner + cupW - 0.5), 0.6] });
      if (o.padding !== 'unlined' && o.padding !== 'molded-foam') overlays.push({ kind: 'lining', style: o.padding, panel: cid, points: poly.pts.map(([x, y]) => [x * 0.95, y * 0.95]) });
    }
    // a seam per cup joins half of the band top; split the band top edge in two
    const ft = fB.pts; // [-q,0],[q,0],[q,bh],[-q,bh]  -> insert centre point on the top edge
    ft.splice(3, 0, [0, bh]);
    panels[0].points = ft;
    for (const sm of seams) if (sm.half) { sm.b = { panel: id('band-front'), edge: sm.half > 0 ? 2 : 3, to: sm.half > 0 ? 2 : 3 }; delete sm.half; }
    // after the insert, side-l edge index shifts from 3 to 4
    seams[1] = { a: { panel: id('band-front'), edge: 4, to: 4 }, b: seams[1].b, stitch: st };
  }
  if (o.closure === 'back-hook') trims.push({ type: 'bra-hook-eye', panel: id('band-back'), at: [0, bh / 2], size: 30 });
  if (o.closure === 'front-hook') trims.push({ type: 'bra-hook-eye', panel: id('band-front'), at: [0, bh / 2], size: 22 });
  trims.push({ type: 'picot-elastic', panel: id('band-front'), at: [-bandQ, 0.2], to: [bandQ, 0.2] });
  trims.push({ type: 'picot-elastic', panel: id('band-back'), at: [-bandQ, 0.2], to: [bandQ, 0.2] });
  if (!sports && o.style !== 'bandeau') trims.push({ type: 'bow', panel: id('band-front'), at: [0, bh], size: 18 });
  return { panels, seams, trims, overlays };
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
  brief: { label: 'Underwear bottoms', options: BRIEF_OPTIONS, build: buildBrief },
  bra: { label: 'Bra / bralette', options: BRA_OPTIONS, build: buildBra },
  legwear: { label: 'Hosiery & socks', options: LEGWEAR_OPTIONS, build: buildLegwear },
  glove: { label: 'Gloves & mittens', options: GLOVE_OPTIONS, build: buildGlove },
  shoe: { label: 'Shoes & boots', options: SHOE_OPTIONS, build: buildShoe },
};

export function defaultOptions(gen) {
  return Object.fromEntries(Object.entries(GENERATORS[gen].options).map(([k, v]) => [k, v.default]));
}
