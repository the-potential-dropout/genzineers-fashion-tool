// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Knitwear: construction methods, machine gauges, yarns, stitch structures and
 * colourwork motifs. knitFabric() turns a knit spec into a simulated fabric
 * (weight, stretch, drape, texture) so knit choices change the physics too.
 */

export const KNIT_METHODS = {
  'fully-fashioned': { name: 'Fully-fashioned', note: 'Panels knitted to shape on a flatbed (V-bed) machine and linked together; visible fashioning marks; little waste. Industry standard for quality knitwear.', machine: 'Computerised flatbed / V-bed (Shima Seiki- or Stoll-type)', seams: 'linking', recommended: true },
  'whole-garment': { name: 'Whole-garment / seamless', note: 'Entire garment knitted in one piece, no seams at all; best fit and comfort, minimal waste; needs specialist machines and programming.', machine: 'Seamless 4-bed flatbed (WholeGarment®-type)', seams: 'whole-garment' },
  'cut-and-sew': { name: 'Cut & sew (from knitted yardage)', note: 'Knit fabric (often circular-knit) cut like a woven and overlocked; cheapest and fastest, less premium.', machine: 'Circular knitting machine + overlock', seams: 'cut-and-sew-knit' },
  'circular': { name: 'Circular knit (tube)', note: 'Knitted as a tube for bodies, socks, beanies; few or no side seams.', machine: 'Circular / sock / hat machine', seams: 'linking' },
  'hand-knit': { name: 'Hand-knit', note: 'Knitted by hand (needles); artisanal, slow, high value; ideal for chunky gauges, cables and colourwork.', machine: 'Hand knitters (outworkers / cooperatives)', seams: 'hand-running' },
  'hand-crochet': { name: 'Crochet', note: 'Hook-made loops; cannot be machine-made, so always handwork; lacy, sculptural.', machine: 'Hand crochet', seams: 'hand-running' },
};

// gg = needles per inch on the machine bed
const G = (gg, name, yarn, gsm, use) => ({ gg, name, yarn, gsm, use });
export const GAUGES = {
  '1.5gg': G(1.5, '1.5 gauge (super chunky)', 'Super bulky / roving', 900, 'Statement chunky knits, blankets'),
  '3gg': G(3, '3 gauge (chunky)', 'Chunky / bulky', 650, 'Chunky fisherman, outdoor sweaters'),
  '5gg': G(5, '5 gauge (heavy)', 'Aran / heavy worsted', 480, 'Cable knits, cardigans'),
  '7gg': G(7, '7 gauge (mid)', 'Worsted / DK', 380, 'Everyday sweaters, the most common gauge', ),
  '10gg': G(10, '10 gauge', 'DK / sport', 300, 'Lighter sweaters, polos'),
  '12gg': G(12, '12 gauge (fine)', 'Sport / fingering', 240, 'Fine merino and cotton sweaters, cardigans'),
  '14gg': G(14, '14 gauge (fine)', 'Fingering', 200, 'Fine-gauge layering knits, knit polos'),
  '16gg': G(16, '16 gauge (extra fine)', 'Fine fingering', 170, 'Luxury fine knits, base layers'),
  '18gg': G(18, '18 gauge (superfine)', 'Lace / cobweb', 140, 'Superfine merino / cashmere layering'),
};

const Y = (name, fiber, weight, nm, note, colour) => ({ name, fiber, weight, nm, note, colour });
export const YARNS = {
  'merino-extrafine': Y('Extra-fine merino (18.5 µm)', 'Wool', 'Fingering-DK', '2/48', 'Soft next-to-skin, machine washable if treated; the default for fine knits', '#3b3f46'),
  'lambswool': Y('Lambswool', 'Wool', 'DK-worsted', '2/28', 'Classic British knits, slightly fuzzy, warm', '#7a2b2b'),
  'shetland': Y('Shetland wool', 'Wool', 'Fingering-sport', '2/12', 'Traditional Fair Isle yarn: grippy, light, brushed hand', '#6b6a3f'),
  'aran-wool': Y('Aran wool (lanolin-rich)', 'Wool', 'Aran', '1/4.5', 'Fisherman sweaters: water-repellent, cables pop', '#e8e0cc'),
  'cashmere-yarn': Y('Cashmere (2-ply)', 'Cashmere', 'Fingering-DK', '2/26', 'Luxury: very soft and warm, pills, needs care', '#c9b49a'),
  'cashmere-merino': Y('Merino-cashmere (90/10)', 'Wool / cashmere', 'Fingering-DK', '2/28', 'Cashmere softness, merino durability', '#5a5f6b'),
  'mohair-silk': Y('Kid mohair-silk (70/30)', 'Mohair / silk', 'Lace', '1/14', 'Halo, airy brushed look, very light', '#d8c8e0'),
  'alpaca-yarn': Y('Baby alpaca', 'Alpaca', 'DK-worsted', '2/14', 'Warmer than wool, silky drape, slight halo', '#bfae95'),
  'cotton-combed-yarn': Y('Combed cotton', 'Cotton', 'Sport-DK', '2/30', 'Summer knits, crisp stitch definition, heavier and less elastic', '#f1ece2'),
  'organic-cotton-yarn': Y('Organic cotton', 'Cotton', 'Sport-DK', '2/30', 'GOTS-certifiable summer knits', '#efe8d8'),
  'linen-yarn': Y('Linen / linen-cotton', 'Flax', 'Sport', '2/26', 'Cool, crisp summer knits that soften with washing', '#d8cdb5'),
  'silk-yarn': Y('Spun silk', 'Silk', 'Fingering', '2/60', 'Lustrous fine knits, drapes well', '#e9dcc8'),
  'acrylic-yarn': Y('Acrylic (high-bulk)', 'Acrylic', 'DK-worsted', '2/32', 'Cheapest, washable; pills and less breathable', '#2f5b8a'),
  'wool-acrylic': Y('Wool-acrylic (50/50)', 'Wool / acrylic', 'Worsted', '2/28', 'Budget warmth, easy care', '#5b4a3b'),
  'recycled-wool': Y('Recycled wool blend', 'Wool / nylon', 'DK', '2/24', 'Lower impact; ask for GRS / RWS', '#6e6a62'),
  'merino-nylon-sock': Y('Merino-nylon (75/25)', 'Wool / nylon', 'Fingering', '2/48', 'Socks and hard-wearing knits', '#2b2b2b'),
  'chenille-yarn': Y('Chenille', 'Polyester / cotton', 'Bulky', '1/3', 'Velvety soft, can worm (loops pull out)', '#a85a7a'),
  'boucle-yarn': Y('Bouclé', 'Wool / mohair', 'Bulky', '1/4', 'Looped, textured surface', '#e7dfd2'),
};

// stretch 0..1 (1 = rigid), bend 0..1, weight multiplier vs plain jersey
const S = (name, stretch, bend, wMul, pattern, note, extra = {}) => ({ name, stretch, bend, wMul, pattern, note, ...extra });
export const KNIT_STRUCTURES = {
  jersey: S('Single jersey / stockinette', 0.55, 0.08, 1, 'knit', 'Smooth V-face, curls at edges; the base of most knits'),
  'reverse-jersey': S('Reverse jersey (purl side out)', 0.55, 0.09, 1, 'purl', 'Bumpy purl face; textured, casual'),
  garter: S('Garter stitch', 0.45, 0.12, 1.25, 'garter', 'Horizontal ridges; lies flat, very stretchy lengthwise'),
  'rib-1x1': S('Rib 1x1', 0.3, 0.12, 1.35, 'rib', 'Highly elastic; cuffs, hems, fitted bodies', { ribW: 1 }),
  'rib-2x2': S('Rib 2x2', 0.32, 0.14, 1.4, 'rib', 'Bolder rib; classic cuffs, hems, beanies', { ribW: 2 }),
  'fisherman-rib': S('Fisherman rib (full cardigan)', 0.35, 0.3, 1.8, 'rib', 'Thick, plush, lofty rib with tuck stitches', { ribW: 1, fx: 'fuzzy' }),
  'half-cardigan': S('Half-cardigan rib (half Milano)', 0.4, 0.26, 1.6, 'rib', 'Textured, chunky rib, one-sided tuck'),
  'milano-rib': S('Milano rib', 0.6, 0.3, 1.5, 'milano', 'Stable double-knit with horizontal ridges; structured, less stretch'),
  interlock: S('Interlock (double knit)', 0.6, 0.2, 1.6, 'knit', 'Smooth both sides, does not curl or ladder'),
  seed: S('Seed / moss stitch', 0.55, 0.18, 1.2, 'seed', 'Pebbly texture, lies flat, reversible'),
  'links-links': S('Links-links (purl-purl)', 0.5, 0.15, 1.3, 'purl', 'Purl stitches both sides; texture panels'),
  cable: S('Cable (braided)', 0.7, 0.4, 1.7, 'cable', 'Crossed stitches forming ropes; adds warmth and weight', { cable: 'rope' }),
  aran: S('Aran (cables + honeycomb + moss)', 0.75, 0.5, 1.9, 'cable', 'Traditional fisherman combination panels', { cable: 'aran' }),
  honeycomb: S('Honeycomb cable', 0.72, 0.45, 1.8, 'honeycomb', 'Interlocking cable cells'),
  pointelle: S('Pointelle', 0.55, 0.06, 0.85, 'pointelle', 'Small eyelet holes; feminine, light, airy'),
  'knit-lace': S('Lace knit', 0.5, 0.04, 0.7, 'lace', 'Open lacy patterns; needs a camisole underneath'),
  popcorn: S('Popcorn / bobble', 0.6, 0.35, 1.5, 'popcorn', 'Raised knots; playful texture'),
  waffle: S('Waffle / thermal', 0.55, 0.2, 1.3, 'waffle', 'Grid texture traps air; henleys, base layers'),
  tuck: S('Tuck stitch', 0.55, 0.2, 1.3, 'seed', 'Puckered texture, spreads the fabric wider'),
  'brushed-mohair': S('Brushed open jersey (mohair)', 0.6, 0.05, 0.6, 'knit', 'Hazy halo, see-through, airy', { fx: 'fuzzy', opacity: 0.85 }),
  jacquard: S('Jacquard (2-colour, birdseye back)', 0.7, 0.25, 1.6, 'jacquard', 'Machine colourwork; floats are tied in on the back'),
  'fair-isle': S('Fair Isle (stranded colourwork)', 0.7, 0.25, 1.5, 'jacquard', 'Traditional 2-colours-per-row bands; floats on the back'),
  intarsia: S('Intarsia', 0.6, 0.12, 1.05, 'jacquard', 'Blocks of colour (argyle, logos) with no floats'),
};

// Colourwork motifs as small charts (0/1/2 = colour index), tiled across the garment
export const MOTIFS = {
  none: { name: 'None (solid)' },
  stripes: { name: 'Breton / rugby stripes', grid: ['0', '0', '0', '1', '1', '1'] },
  'fair-isle-band': { name: 'Fair Isle band', grid: ['0000000000000000', '0010000100001000', '0111001110011100', '1101101101101101', '0111001110011100', '0010000100001000', '0000000000000000', '2222222222222222', '2020202020202020', '2222222222222222'] },
  'nordic-star': { name: 'Nordic star (selbu)', grid: ['000010000', '100111001', '010111010', '011010110', '111101111', '011010110', '010111010', '100111001', '000010000'] },
  argyle: { name: 'Argyle (intarsia)', grid: ['0000001000000', '0000011100000', '0000111110000', '0001112111000', '0011121211100', '0111211121110', '1112111112111', '0111211121110', '0011121211100', '0001112111000', '0000111110000', '0000011100000', '0000001000000'] },
  birdseye: { name: 'Birdseye', grid: ['01', '10'] },
  houndstooth: { name: 'Houndstooth jacquard', grid: ['00110000', '00111000', '00011100', '11111110', '11001111', '11000111', '11000011', '00000011'] },
  checks: { name: 'Gingham checks', grid: ['0011', '0011', '1122', '1122'] },
  'snowflake': { name: 'Snowflake yoke', grid: ['0001000', '1001001', '0101010', '0011100', '1111111', '0011100', '0101010', '1001001', '0001000'] },
};

export function knitDefaults(o = {}) {
  return { method: 'fully-fashioned', gauge: '7gg', yarn: 'merino-extrafine', structure: 'jersey', motif: 'none', colors: ['#2f3a4a', '#e8e0cc', '#9b1c1c'], trims: 'rib-1x1', ...o };
}

/** Build a simulated fabric from a knit spec. */
export function knitFabric(spec) {
  const k = knitDefaults(spec);
  const st = KNIT_STRUCTURES[k.structure] || KNIT_STRUCTURES.jersey;
  const ga = GAUGES[k.gauge] || GAUGES['7gg'];
  const yn = YARNS[k.yarn] || YARNS['merino-extrafine'];
  const gsm = Math.round(ga.gsm * st.wMul * (/cotton|linen|silk/i.test(yn.fiber) ? 1.15 : /mohair|alpaca/i.test(yn.fiber) ? 0.85 : 1));
  const coarse = Math.min(1, 4 / ga.gg); // chunky gauges are stiffer & thicker
  const colorwork = ['jacquard', 'fair-isle', 'intarsia'].includes(k.structure) || (k.motif && k.motif !== 'none');
  return {
    id: `knit-${k.structure}-${k.gauge}`,
    family: 'knit',
    name: `${st.name}, ${ga.name}, ${yn.name}`,
    category: 'Knit',
    fiber: yn.fiber,
    weightGsm: gsm,
    stretch: st.stretch,
    shear: 0.35,
    bend: Math.min(0.9, st.bend + coarse * 0.25),
    damping: 0.03,
    friction: 0.6,
    thicknessMm: 0.6 + 6 * coarse,
    quality: `${k.method}, ${k.gauge}`,
    note: `${st.note}. ${KNIT_METHODS[k.method]?.note || ''}`,
    knit: k,
    look: {
      color: k.colors[0],
      roughness: /silk|cotton/i.test(yn.fiber) ? 0.75 : 0.95,
      metalness: 0,
      sheen: /mohair|alpaca|cashmere/i.test(yn.fiber) ? 0.8 : 0.4,
      sheenColor: '#ffffff',
      opacity: st.opacity ?? 1,
      pattern: colorwork ? 'knitchart' : st.pattern,
      patternScale: Math.max(1, ga.gg * 0.55),
      fx: st.fx || (/mohair|alpaca|lambswool|shetland/i.test(yn.name) ? 'fuzzy' : undefined),
      patternColors: k.colors,
      motif: colorwork ? (k.motif && k.motif !== 'none' ? k.motif : 'birdseye') : null,
      ribW: st.ribW,
      cable: st.cable,
    },
    rec: { stitch: KNIT_METHODS[k.method]?.seams || 'linking', hem: 'linking', thread: 'wool-thread', needle: 'Linking: same gauge points as the knit', spi: 0, interfacing: 'Twill tape at shoulders to stop stretching', press: 'Steam without touching (hover), dry flat', care: /cotton|acrylic/i.test(yn.fiber) ? 'Machine wash cold, dry flat' : 'Hand wash cold or wool cycle, dry flat', uses: 'Sweaters, cardigans, knit accessories' },
  };
}

/** Knitting chart for the motif as an SVG (for the factory / hand knitters). */
export function knitChartSVG(spec) {
  const k = knitDefaults(spec);
  const m = MOTIFS[k.motif];
  if (!m?.grid) return null;
  const cell = 14; const W = m.grid[0].length; const H = m.grid.length;
  let r = '';
  m.grid.forEach((row, y) => [...row].forEach((c, x) => { r += `<rect x="${x * cell + 30}" y="${y * cell + 30}" width="${cell}" height="${cell}" fill="${k.colors[Number(c)] || '#fff'}" stroke="#999" stroke-width="0.5"/>`; }));
  const nums = Array.from({ length: H }, (_, i) => `<text x="${W * cell + 36}" y="${(H - i - 1) * cell + 30 + cell * 0.75}" font-size="9">${i + 1}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * cell + 70}" height="${H * cell + 90}"><text x="30" y="20" font-family="sans-serif" font-size="12">${m.name}: ${W} st x ${H} rows repeat, read right to left from row 1 (bottom)</text>${r}${nums}<text x="30" y="${H * cell + 55}" font-size="10" font-family="sans-serif">Colours: ${k.colors.map((c, i) => `${i}=${c}`).join('  ')}</text></svg>`;
}
