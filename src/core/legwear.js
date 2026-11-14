// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Hosiery & socks. Skin-tight circular knits are rendered as a layer that
 * follows the graded mannequin surface (how garment CAD tools handle
 * hosiery), so they fit every body shape exactly and cost almost nothing.
 */
import { MANNEQUINS } from '../sim/mannequins.js';

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
    thickness: sock ? 0.0025 : 0.0012,
  };
  const bandLook = (pattern, extra = {}) => ({ ...shell.look, opacity: 1, pattern, ...extra });
  if (o.topBand === 'lace' || o.topBand === 'silicone-lace') shell.bands.push({ from: -0.08, to: 0, look: bandLook('lace', { patternScale: 3 }) });
  if (o.topBand === 'rib' || (sock && o.topBand !== 'none')) shell.bands.push({ from: sock ? -0.035 : -0.03, to: 0, look: bandLook('rib', { patternScale: 8 }) });
  if (o.topBand === 'welt' || o.topBand === 'comfort-waist') shell.bands.push({ from: -0.05, to: 0, look: { ...shell.look, opacity: Math.min(1, opacity + 0.25) } });
  if (o.toe === 'reinforced' && !shell.footless) shell.toe = { look: { ...shell.look, opacity: Math.min(1, opacity + 0.2) } };
  if (o.heel !== 'none' && !shell.footless) shell.heel = { look: { ...shell.look, opacity: Math.min(1, opacity + 0.2) }, cuban: o.heel === 'cuban-heel' };
  return { panels: [], seams: [], trims: [], overlays: [], shells: [shell] };
}
