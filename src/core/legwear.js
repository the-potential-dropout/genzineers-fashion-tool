// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Hosiery & socks. Skin-tight circular knits are rendered as a layer that
 * follows the graded mannequin surface (how garment CAD tools handle
 * hosiery), so they fit every body shape exactly and cost almost nothing.
 */
import { MANNEQUINS } from '../sim/mannequins.js';
import { FABRICS } from './fabrics.js';

export const LEGWEAR_TYPES = {
  tights: { name: 'Tights / pantyhose', top: 'waist', note: 'Full legs to the waist; comfort waistband, gusset' },
  leggings: { name: 'Footless tights / leggings', top: 'waist', footless: true, note: 'Ends at the ankle' },
  stockings: { name: 'Stockings (thigh-high, for suspenders)', top: 'thigh', note: 'Welt top, worn with a suspender belt' },
  'hold-ups': { name: 'Hold-ups (stay-ups)', top: 'thigh', note: 'Silicone-lined lace top band holds them up' },
  'over-knee': { name: 'Over-the-knee socks', top: 'overknee', note: 'Rib top above the knee' },
  'knee-high': { name: 'Knee-high socks', top: 'knee', note: 'Dress / sports / compression' },
  crew: { name: 'Crew socks', top: 'crew', note: 'Mid-calf; the everyday sock' },
  quarter: { name: 'Quarter socks', top: 'quarter', note: 'Just above the ankle bone' },
  ankle: { name: 'Ankle socks', top: 'ankle', note: 'Low cut with a heel tab' },
  'no-show': { name: 'No-show / liner socks', top: 'noshow', note: 'Hidden in shoes; silicone heel grip' },
};

export const DENIER = { 5: 'Ultra sheer (5D)', 10: 'Sheer (10D)', 15: 'Sheer (15D)', 20: 'Semi-sheer (20D)', 30: 'Semi-opaque (30D)', 40: 'Opaque (40D)', 60: 'Opaque (60D)', 80: 'Thick opaque (80D)', 100: 'Thick opaque (100D)', 200: 'Thermal / fleece-lined (200D)' };

export const LEGWEAR_PATTERNS = {
  plain: { name: 'Plain', pattern: 'knit' },
  fishnet: { name: 'Fishnet (large)', pattern: 'fishnet', scale: 1.2 },
  'micro-net': { name: 'Micro-net', pattern: 'fishnet', scale: 4 },
  ribbed: { name: 'Ribbed', pattern: 'rib' },
  cable: { name: 'Cable knit', pattern: 'cable' },
  argyle: { name: 'Argyle', pattern: 'knitchart', motif: 'argyle' },
  stripes: { name: 'Stripes', pattern: 'knitchart', motif: 'stripes' },
  'polka-dot': { name: 'Polka dot', pattern: 'plain', print: 'polka' },
  houndstooth: { name: 'Houndstooth', pattern: 'knitchart', motif: 'houndstooth' },
  'lace-allover': { name: 'Lace all-over', pattern: 'lace' },
  lurex: { name: 'Lurex sparkle', pattern: 'sequin', scale: 8 },
  'back-seam': { name: 'Back seam (seamed stockings)', pattern: 'knit', backSeam: true },
};

export const LEGWEAR_YARNS = {
  'nylon-elastane': { name: 'Nylon 6.6 / elastane (85/15)', note: 'Classic hosiery: sheer, strong, smooth' },
  microfiber: { name: 'Microfibre nylon / elastane', note: 'Soft, matte, opaque tights' },
  'cotton-socks': { name: 'Combed cotton / nylon / elastane (80/18/2)', note: 'Everyday socks' },
  'merino-socks': { name: 'Merino / nylon / elastane (70/28/2)', note: 'Hiking, ski, warm & odour resistant' },
  bamboo: { name: 'Bamboo viscose / nylon', note: 'Soft, breathable socks' },
  silk: { name: 'Silk / nylon', note: 'Luxury stockings' },
  'recycled-nylon': { name: 'Recycled nylon / elastane', note: 'Lower impact; ask for GRS' },
  lurex: { name: 'Nylon with metallic lurex', note: 'Party tights' },
};

export const LEGWEAR_OPTIONS = {
  type: { label: 'Type', type: 'select', values: Object.keys(LEGWEAR_TYPES), default: 'tights' },
  denier: { label: 'Denier (sheerness)', type: 'select', values: Object.keys(DENIER), default: '40' },
  pattern: { label: 'Pattern', type: 'select', values: Object.keys(LEGWEAR_PATTERNS), default: 'plain' },
  yarn: { label: 'Yarn', type: 'select', values: Object.keys(LEGWEAR_YARNS), default: 'nylon-elastane' },
  color: { label: 'Colour', type: 'color', default: '#1b1b1d' },
  color2: { label: 'Second colour', type: 'color', default: '#c9a54a' },
  topBand: { label: 'Top band', type: 'select', values: ['comfort-waist', 'rib', 'lace', 'silicone-lace', 'welt', 'picot', 'none'], default: 'comfort-waist' },
  toe: { label: 'Toe', type: 'select', values: ['seamless-linked', 'reinforced', 'sandal-toe', 'flat-seam'], default: 'seamless-linked' },
  heel: { label: 'Heel', type: 'select', values: ['reinforced', 'y-heel', 'cuban-heel', 'none'], default: 'reinforced' },
  cushion: { label: 'Cushioning', type: 'select', values: ['none', 'sole-terry', 'full-terry'], default: 'none' },
};

/** Top height (reference mannequin frame, metres) for each type. */
export function legwearTop(type, mannequin = 'male') {
  const L = MANNEQUINS[mannequin].landmarks;
  const top = LEGWEAR_TYPES[type]?.top || 'waist';
  return { waist: L.waistY - 0.07, thigh: L.crotchY - 0.07, overknee: L.crotchY * 0.62, knee: L.crotchY * 0.53, crew: L.crotchY * 0.33, quarter: L.crotchY * 0.13, ankle: L.crotchY * 0.1, noshow: 0.055 }[top];
}

const opacityFor = (den) => Math.min(0.97, 0.12 + 0.82 * (1 - Math.exp(-Number(den) / 35)));

export function buildLegwear(o, prefix = '') {
  const sock = !['tights', 'leggings', 'stockings', 'hold-ups'].includes(o.type);
  const pat = LEGWEAR_PATTERNS[o.pattern] || LEGWEAR_PATTERNS.plain;
  const opacity = sock ? 1 : pat.pattern === 'fishnet' ? 1 : opacityFor(o.denier);
  const shell = {
    id: `${prefix}legwear`,
    type: o.type,
    footless: Boolean(LEGWEAR_TYPES[o.type]?.footless),
    look: {
      color: o.color, roughness: sock ? 0.9 : 0.45, sheen: sock ? 0.3 : 0.8, sheenColor: '#ffffff', opacity, metalness: o.pattern === 'lurex' ? 0.5 : 0,
      pattern: pat.pattern, patternScale: pat.scale || (sock ? 6 : 14), motif: pat.motif, patternColors: [o.color, o.color2, '#ffffff'], print: pat.print,
    },
    backSeam: Boolean(pat.backSeam),
    bands: [],
    // knit thickness: terry-cushioned socks are several mm thick, sheer hosiery a fraction of a mm
    thickness: sock ? (o.cushion === 'full-terry' ? 0.0045 : o.cushion === 'sole-terry' ? 0.0035 : 0.0028) : 0.0012,
  };
  const bandLook = (pattern, extra = {}) => ({ ...shell.look, opacity: 1, pattern, ...extra });
  if (o.topBand === 'lace' || o.topBand === 'silicone-lace') shell.bands.push({ from: -0.08, to: 0, look: bandLook('lace', { patternScale: 3 }) });
  if (o.topBand === 'rib' || (sock && o.topBand !== 'none')) shell.bands.push({ from: sock ? -0.035 : -0.03, to: 0, look: bandLook('rib', { patternScale: 8 }) });
  if (o.topBand === 'welt' || o.topBand === 'comfort-waist') shell.bands.push({ from: -0.05, to: 0, look: { ...shell.look, opacity: Math.min(1, opacity + 0.25) } });
  if (o.toe === 'reinforced' && !shell.footless) shell.toe = { look: { ...shell.look, opacity: Math.min(1, opacity + 0.2) } };
  if (o.heel !== 'none' && !shell.footless) shell.heel = { look: { ...shell.look, opacity: Math.min(1, opacity + 0.2) }, cuban: o.heel === 'cuban-heel' };
  return { panels: [], seams: [], trims: [], overlays: [], shells: [shell] };
}

// =====================================================================
// Handwear: gloves and mittens. Like hosiery they are fitted to the hand
// itself (a glove is cut to the hand: fourchettes between the fingers, a
// set-in thumb), so they follow the mannequin's hand with the thickness of
// the material and its lining.
// =====================================================================

export const GLOVE_TYPES = {
  dress: { name: 'Dress gloves (unlined or silk lined)', cuff: 3, note: 'Close-fitting table-cut leather; three stitched points on the back.' },
  driving: { name: 'Driving gloves', cuff: 1, open: 'knuckles', note: 'Short, unlined, perforated, open knuckles and back, snap at the wrist.' },
  winter: { name: 'Winter gloves (lined)', cuff: 6, note: 'Cashmere, wool or fleece lined; a size up to make room for the lining.' },
  gauntlet: { name: 'Gauntlets', cuff: 13, note: 'Flared cuff over the sleeve; motorcycling, riding, falconry.' },
  opera: { name: 'Opera gloves (over the elbow)', cuff: 38, note: 'Evening gloves to above the elbow; the mousquetaire has a buttoned wrist opening.' },
  fingerless: { name: 'Fingerless gloves', cuff: 5, fingerless: true, note: 'Cut off at the first knuckle; cycling, lifting, fashion.' },
  work: { name: 'Work gloves', cuff: 7, note: 'Heavy split or grain leather, reinforced palm, safety cuff.' },
  mittens: { name: 'Mittens', cuff: 7, mitten: true, note: 'All four fingers share one pouch: warmest shape.' },
  'shearling-mittens': { name: 'Shearling mittens', cuff: 8, mitten: true, note: 'Wool inside, suede out; seams turned out.' },
  'knit-gloves': { name: 'Knitted gloves', cuff: 7, knit: true, note: 'Seamless or fully-fashioned knit with a rib cuff.' },
  'knit-mittens': { name: 'Knitted mittens', cuff: 8, mitten: true, knit: true, note: 'Rib cuff, thumb gusset.' },
};
export const GLOVE_LININGS = { none: ['Unlined', 0], silk: ['Silk', 0.15], cashmere: ['Cashmere knit', 0.9], wool: ['Wool knit', 1.0], fleece: ['Fleece', 1.6], shearling: ['Shearling (wool in)', 6], thinsulate: ['Microfibre insulation', 2.2] };
export const GLOVE_OPTIONS = {
  type: { label: 'Type', type: 'select', values: Object.keys(GLOVE_TYPES), default: 'dress' },
  lining: { label: 'Lining', type: 'select', values: Object.keys(GLOVE_LININGS), default: 'none' },
  cuffLength: { label: 'Cuff length above the wrist (cm, 0 = type default)', type: 'range', min: 0, max: 45, step: 1, default: 0 },
  closure: { label: 'Wrist', type: 'select', values: ['plain', 'elastic-gather', 'snap', 'strap-buckle', 'zip', 'button', 'rib-cuff'], default: 'plain' },
  seams: { label: 'Seam style', type: 'select', values: ['inseam', 'outseam (prix)', 'half-pique', 'full-pique', 'hand-stitched', 'seamless knit'], default: 'inseam' },
  points: { label: 'Back points (three stitched lines)', type: 'select', values: ['yes', 'no'], default: 'yes' },
  touchscreen: { label: 'Touchscreen fingertips', type: 'select', values: ['no', 'yes'], default: 'no' },
  color: { label: 'Colour (leave as the material colour, or pick)', type: 'color', default: '#000000' },
};
export function buildGlove(o, prefix = '', fabric = 'leather-lambskin') {
  const T = GLOVE_TYPES[o.type] || GLOVE_TYPES.dress;
  const fab = FABRICS[fabric] || FABRICS['leather-lambskin'];
  const lin = GLOVE_LININGS[o.lining] || GLOVE_LININGS.none;
  const cuff = (o.cuffLength || T.cuff) / 100;
  const color = o.color && o.color !== '#000000' ? o.color : fab.look.color;
  const shell = {
    id: `${prefix}glove`, part: 'hand', type: o.type, mitten: Boolean(T.mitten), fingerless: Boolean(T.fingerless), cuff,
    // material thickness plus the lining: a lined winter glove is several millimetres thick
    thickness: Math.max(0.0009, (fab.thicknessMm || 0.7) / 1000 + lin[1] / 1000),
    look: { ...fab.look, color, opacity: 1, patternScale: fab.look.patternScale || 6 },
    fabric, bands: [], points: o.points === 'yes' && !T.knit && !T.mitten,
  };
  if (o.closure === 'rib-cuff' || T.knit) shell.bands.push({ from: -Math.min(cuff, 0.07), to: 0, look: { ...shell.look, pattern: 'rib', patternScale: 9 } });
  if (o.closure === 'strap-buckle' || o.closure === 'snap') shell.bands.push({ from: -0.03, to: -0.012, look: { ...shell.look, roughness: Math.max(0.2, (shell.look.roughness || 0.6) - 0.15) } });
  return { panels: [], seams: [], trims: [], overlays: [], shells: [shell], pieces: glovePieces(o, o.__body, fabric) };
}

/**
 * The pieces a glove is actually cut from (table-cut leather glove):
 *  - trank: the hand, back and palm in one piece folded along the index finger, with the eight
 *    finger blades slit at the top and the thumb hole cut out of the palm
 *  - thumb, sewn into the thumb hole (with a quirk at its base)
 *  - fourchettes: the long strips between the fingers that give them depth (three pairs per hand)
 *  - quirks: small diamonds at the base of the fingers for movement
 *  - cuff binding / welt, and the lining cut to the same shapes
 * Sizes come from the hand: length (wrist to middle fingertip) and palm girth.
 */
export function glovePieces(o, body, fabric) {
  const T = GLOVE_TYPES[o.type] || GLOVE_TYPES.dress;
  if (T.knit) return [];
  const r1 = (v) => Math.round(v * 10) / 10;
  const k = (body?.hs || 1) * (body?.mannequin === 'female' ? 0.92 : 1);
  const HL = 19 * k; const PW = (21.5 * k) / 2 + (o.lining && o.lining !== 'none' ? 0.5 : 0); // hand length, half palm girth (+ room for a lining)
  const cuff = o.cuffLength || T.cuff; const cy = HL * 0.54; // wrist to the finger crotches
  const arc = (x0, x1, top, n = 6) => { const out = []; const r = (x1 - x0) / 2; for (let i = 0; i <= n; i++) { const a = Math.PI - (i / n) * Math.PI; out.push([r1((x0 + x1) / 2 + Math.cos(a) * r), r1(top - r + Math.sin(a) * r)]); } return out; };
  const pieces = [];
  if (T.mitten) {
    const W = PW + 1.6; const H = HL + 1.2;
    const round = (w, h) => [[0, -cuff], [w, -cuff], [w, h - w / 2], ...arc(0, w, h).reverse()];
    pieces.push({ name: 'Mitten back', points: round(W, H), fabric, cut: 2, note: 'One piece over the back of the hand and fingers; cut a mirrored pair.' });
    pieces.push({ name: 'Mitten palm (upper, with thumb gusset)', points: [[0, HL * 0.3], [W * 0.45, HL * 0.3], [W * 0.5, HL * 0.42], [W, HL * 0.42], [W, H - W / 2], ...arc(0, W, H).reverse()], fabric, cut: 2, note: 'Sews to the lower palm along the thumb line; the notch forms the top of the thumb opening.' });
    pieces.push({ name: 'Mitten palm (lower) with thumb front', points: [[0, -cuff], [W, -cuff], [W, HL * 0.42], [W * 0.5, HL * 0.42], [W * 0.45, HL * 0.3], [W * 0.4, HL * 0.3], ...arc(W * 0.02, W * 0.4, HL * 0.3 + HL * 0.36).reverse()], fabric, cut: 2, note: 'The tongue is the front of the thumb; it folds up against the thumb back.' });
    pieces.push({ name: 'Thumb back', points: [[0, 0], [W * 0.42, 0], [W * 0.42, HL * 0.3], ...arc(0, W * 0.42, HL * 0.36 + 2).reverse()], fabric, cut: 2, note: 'Sewn round the thumb tongue, then into the thumb opening.' });
    pieces.push({ name: 'Cuff', points: [[0, 0], [PW * 2 + 2, 0], [PW * 2 + 2, cuff + 2], [0, cuff + 2]], fabric: o.closure === 'rib-cuff' ? 'rib-knit' : fabric, cut: 2, note: 'Folded double; elastic or rib draws it in at the wrist.' });
  } else {
    // trank
    const fw = [2.1, 2.4, 2.5, 2.5].map((v) => v * k); const fl = [6.0, 7.6, 8.2, 7.4].map((v) => v * k); // little, ring, middle, index
    const W = 2 * PW + 0.6; const side = (PW + 0.3 - fw.reduce((a, b) => a + b, 0)) / 1; // ease left at the outer edge of each half
    const pts = [[0, -cuff], [r1(W), -cuff]];
    const blades = [];
    let x = W - side * 0.5;
    for (let i = 0; i < 4; i++) { blades.push([x - fw[i], x, fl[i], i === 3]); x -= fw[i]; } // palm half: little -> index (towards the fold)
    for (let i = 3; i >= 0; i--) { blades.push([x - fw[i], x, fl[i], i === 3]); x -= fw[i]; } // back half: index -> little
    pts.push([r1(W), r1(cy * 0.9)]);
    blades.forEach(([x0, x1, len, isIndex], bi) => {
      const next = blades[bi + 1];
      const joined = isIndex && next && next[3]; // the two index blades are one piece, folded down the middle
      if (joined) return;
      const prev = blades[bi - 1]; const start = isIndex && prev && prev[3] ? prev[1] : x1;
      const tips = arc(x0 + 0.1, start - 0.1, cy + len).reverse();
      pts.push([r1(start - 0.1), r1(cy)], ...tips, [r1(x0 + 0.1), r1(cy)]);
    });
    pts.push([0, r1(cy * 0.9)]);
    const hole = []; for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; hole.push([r1(W * 0.73 + Math.cos(a) * 1.6 * k), r1(cy * 0.38 + Math.sin(a) * 2.3 * k)]); }
    pieces.push({ name: 'Trank (back and palm, folded at the index finger)', points: pts, holes: [hole], fabric, cut: 2, note: `Cut a mirrored pair with the stretch across the hand. Slits between the finger blades take the fourchettes; the oval is the thumb hole. ${o.points === 'yes' ? 'Three rows of pointing are stitched on the back before closing. ' : ''}Side seam: ${o.seams}.` });
    const TL = 10.4 * k;
    pieces.push({ name: 'Thumb (with quirk)', points: [[0, 0], [1.2 * k, -1.2 * k], [2.4 * k, 0], [6.6 * k, 0], [6.6 * k, TL - 3.3 * k], ...arc(0, 6.6 * k, TL).reverse()].map(([a, b]) => [r1(a), r1(b)]), fabric, cut: 2, note: 'Folded and seamed up the inside, the rounded base is set into the thumb hole; the small V is the quirk.' });
    const four = (len, nm) => ({ name: `Fourchette (${nm})`, points: [[0, 0], [0.8 * k, r1(len * 0.12)], [0.85 * k, r1(len * 0.8)], [0, r1(len)], [-0.85 * k, r1(len * 0.8)], [-0.8 * k, r1(len * 0.12)]].map(([a, b]) => [r1(a), b]), fabric, cut: 4, note: 'Two per gap, joined at the base into a V: they form the sides of the fingers.' });
    pieces.push(four(fl[3] + 1.6, 'index / middle'), four(fl[2] + 1.6, 'middle / ring'), four(fl[1] + 1.4, 'ring / little'));
    if (!/seamless/.test(o.seams || '')) pieces.push({ name: 'Quirk', points: [[0, 0], [0.6 * k, 0.8 * k], [0, 1.6 * k], [-0.6 * k, 0.8 * k]].map(([a, b]) => [r1(a), r1(b)]), fabric, cut: 6, note: 'A small diamond at the base of each fourchette pair for freedom of movement.' });
    pieces.push({ name: o.closure === 'strap-buckle' ? 'Wrist strap' : 'Cuff binding / welt', points: [[0, 0], [r1(W + 1.5), 0], [r1(W + 1.5), 2.4], [0, 2.4]], fabric, cut: 2, note: o.closure === 'snap' ? 'Bound edge with a press stud at the wrist vent.' : 'Bound or turned and stitched.' });
    if (T.cuff >= 10 || cuff >= 10) pieces.push({ name: 'Gauntlet cuff', points: [[0, 0], [r1(W + 6), 0], [r1(W + 1), r1(cuff)], [0, r1(cuff)]], fabric, cut: 2, note: 'Flared cuff sewn to the wrist of the trank.' });
  }
  if (o.lining && o.lining !== 'none') pieces.push({ name: `Lining (${GLOVE_LININGS[o.lining][0]})`, points: [[0, -cuff + 1], [r1(2 * PW + 1), -cuff + 1], [r1(2 * PW + 1), r1(HL)], [0, r1(HL)]], fabric: o.lining === 'shearling' ? 'shearling-merino' : o.lining === 'silk' ? 'silk-habotai' : 'rib-knit-wool', cut: 2, note: 'Made up as its own glove (knitted linings are seamless), turned, glued or tacked at the fingertips and closed into the cuff.' });
  return pieces;
}
