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
  return { panels: [], seams: [], trims: [], overlays: [], shells: [shell] };
}
