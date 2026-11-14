// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Fibre blends, insulation fills and waterproof technologies.
 * Brand names appear only as "type" references; the library uses generic
 * category names, since many membrane / fibre names are trademarks that need
 * a licence to use in marketing.
 */

// ---------------- Fibres (for blend maths) ----------------
// stretch/bend/friction deltas are applied per 100% of that fibre relative to cotton.
export const FIBERS = {
  cotton: { name: 'Cotton', stretch: 0, bend: 0, warmth: 0.4, wicking: 0.2, wrinkle: 0.7, durability: 0.6, sheen: 0, note: 'Breathable, soft, absorbent; wrinkles and shrinks' },
  polyester: { name: 'Polyester', stretch: 0, bend: -0.02, warmth: 0.4, wicking: 0.8, wrinkle: 0.1, durability: 0.9, sheen: 0.15, note: 'Strong, quick-dry, wrinkle-resistant; holds odour, sheds microfibres' },
  nylon: { name: 'Nylon (polyamide)', stretch: -0.05, bend: -0.03, warmth: 0.35, wicking: 0.6, wrinkle: 0.2, durability: 1.0, sheen: 0.25, note: 'Toughest abrasion resistance, light; UV sensitive' },
  elastane: { name: 'Elastane (spandex / Lycra® type)', stretch: -8, bend: -0.1, warmth: 0.3, wicking: 0.3, wrinkle: 0, durability: 0.4, sheen: 0.1, note: '1-5% adds comfort stretch & recovery; 15-30% for compression; degrades with heat and chlorine' },
  wool: { name: 'Wool', stretch: -0.05, bend: 0.05, warmth: 0.95, wicking: 0.7, wrinkle: 0.2, durability: 0.6, sheen: 0.05, note: 'Warm when wet, odour resistant, drapes and recovers; can felt and pill' },
  cashmere: { name: 'Cashmere', stretch: -0.05, bend: -0.05, warmth: 1.0, wicking: 0.6, wrinkle: 0.3, durability: 0.3, sheen: 0.2, note: 'Ultra soft and warm; delicate and pills' },
  silk: { name: 'Silk', stretch: -0.05, bend: -0.1, warmth: 0.6, wicking: 0.5, wrinkle: 0.5, durability: 0.4, sheen: 0.6, note: 'Lustrous, strong for its weight; water spots, delicate' },
  linen: { name: 'Linen (flax)', stretch: 0.02, bend: 0.1, warmth: 0.2, wicking: 0.8, wrinkle: 1.0, durability: 0.7, sheen: 0.05, note: 'Coolest fibre, gets softer with washing; wrinkles a lot' },
  viscose: { name: 'Viscose / rayon', stretch: -0.03, bend: -0.12, warmth: 0.3, wicking: 0.7, wrinkle: 0.7, durability: 0.3, sheen: 0.3, note: 'Silky drape, cheap; weak when wet, shrinks' },
  modal: { name: 'Modal', stretch: -0.03, bend: -0.1, warmth: 0.35, wicking: 0.7, wrinkle: 0.4, durability: 0.5, sheen: 0.35, note: 'Softer and stronger than viscose; underwear favourite' },
  lyocell: { name: 'Lyocell (Tencel™ type)', stretch: -0.02, bend: -0.06, warmth: 0.35, wicking: 0.8, wrinkle: 0.4, durability: 0.6, sheen: 0.3, note: 'Closed-loop process, smooth, strong; can fibrillate (peach skin)' },
  acrylic: { name: 'Acrylic', stretch: -0.03, bend: 0, warmth: 0.7, wicking: 0.3, wrinkle: 0.2, durability: 0.5, sheen: 0.1, note: 'Cheap wool substitute; pills, low breathability' },
  hemp: { name: 'Hemp', stretch: 0.02, bend: 0.12, warmth: 0.3, wicking: 0.7, wrinkle: 0.8, durability: 0.9, sheen: 0, note: 'Very durable, low-input crop; stiff at first' },
};

// ---------------- Popular blends ----------------
const B = (name, composition, base, uses, pros, cons) => ({ name, composition, base, uses, pros, cons });
export const BLENDS = {
  'cvc-60-40': B('CVC cotton-poly jersey', { cotton: 60, polyester: 40 }, 'cotton-jersey', 'Promo tees, uniforms, everyday basics', 'Softer than poly, less shrinkage and wrinkling than cotton, cheaper', 'Less breathable than 100% cotton; polyester part won\'t take reactive dye (heathered look)'),
  'tc-65-35': B('Poly-cotton (T/C 65/35)', { polyester: 65, cotton: 35 }, 'cotton-poplin', 'Workwear, uniforms, chef & medical wear, school shirts', 'Very durable, wrinkle resistant, cheap, holds colour', 'Feels synthetic, pills, less breathable'),
  'tri-blend': B('Tri-blend jersey', { polyester: 50, cotton: 25, viscose: 25 }, 'cotton-jersey', 'Premium soft tees, vintage-feel merch', 'Super soft, drapey, heathered vintage look', 'Thin, can pill, more expensive'),
  'cotton-spandex-95-5': B('Cotton-spandex jersey (95/5)', { cotton: 95, elastane: 5 }, 'cotton-jersey', 'Fitted tees, leggings, bodysuits', 'Stretch and recovery, holds shape', 'Elastane degrades in hot dryers; needs stretch stitching'),
  'stretch-denim-98-2': B('Stretch denim (98/2)', { cotton: 98, elastane: 2 }, 'denim', 'Slim and skinny jeans', 'Comfort and mobility, less bagging at the knee', 'Elastane breaks over time (grows/"bacon" seams); less authentic fades'),
  'power-stretch-denim': B('Power-stretch denim (92/6/2)', { cotton: 92, polyester: 6, elastane: 2 }, 'denim', 'Jeggings, high-stretch skinny', 'Maximum stretch and recovery', 'Feels less like denim, fades poorly'),
  'activewear-nylon-spandex': B('Nylon-spandex (80/20)', { nylon: 80, elastane: 20 }, 'spandex-jersey', 'Leggings, sports bras, swimwear', 'Compression, durability, quick dry, opaque', 'Can be hot; chlorine shortens life (use chlorine-resistant elastane for swim)'),
  'poly-spandex-88-12': B('Poly-spandex (88/12)', { polyester: 88, elastane: 12 }, 'spandex-jersey', 'Sportswear, sublimated team kits', 'Sublimation-printable, cheap, wicking', 'Holds odour, shiny'),
  'wool-poly-suiting': B('Wool-poly suiting (55/45)', { wool: 55, polyester: 45 }, 'wool-worsted-suiting', 'Entry-level suits, school uniforms, workwear trousers', 'Cheaper, more crease-resistant and durable than pure wool', 'Less breathable, shiny with wear, does not drape like wool'),
  'wool-cashmere-90-10': B('Wool-cashmere (90/10)', { wool: 90, cashmere: 10 }, 'wool-cashmere-coating', 'Overcoats, scarves, knitwear', 'Softer hand and luxe label for little cost increase', 'Only marginally warmer; cashmere content is often over-claimed, so test it'),
  'wool-nylon-coating': B('Wool-nylon coating (80/20)', { wool: 80, nylon: 20 }, 'wool-melton', 'Peacoats, varsity bodies, outerwear', 'Nylon adds abrasion resistance and reduces pilling', 'Slightly less soft'),
  'merino-nylon-core': B('Nylon-core merino (88/12)', { wool: 88, nylon: 12 }, 'merino-jersey', 'Base layers, travel tees', 'Merino comfort with much better durability', 'Pricey'),
  'linen-cotton-55-45': B('Linen-cotton (55/45)', { linen: 55, cotton: 45 }, 'linen', 'Summer shirts, trousers, dresses', 'Linen look with fewer wrinkles, softer, cheaper', 'Less crisp and cool than pure linen'),
  'linen-viscose': B('Linen-viscose (50/50)', { linen: 50, viscose: 50 }, 'linen', 'Fluid summer dresses, wide trousers', 'Drapes better than linen, softer', 'Viscose shrinks and is weak wet'),
  'viscose-elastane-95-5': B('Viscose-elastane jersey (95/5)', { viscose: 95, elastane: 5 }, 'modal-jersey', 'Dresses, fitted tops, loungewear', 'Silky drape with stretch', 'Can grow and lose shape, pills'),
  'modal-cotton-50-50': B('Modal-cotton (50/50)', { modal: 50, cotton: 50 }, 'modal-jersey', 'Underwear, premium undershirts, pyjamas', 'Soft, cool, less shrinkage', 'Thin, more expensive'),
  'nyco-50-50': B('NYCO (nylon-cotton 50/50)', { nylon: 50, cotton: 50 }, 'cotton-nylon-blend', 'Military / field jackets, cargo pants', 'Cotton comfort with nylon toughness', 'Stiffer, nylon part is hard to dye'),
  'acrylic-wool': B('Acrylic-wool knit (70/30)', { acrylic: 70, wool: 30 }, 'rib-knit-wool', 'Beanies, budget sweaters', 'Cheap, warm, machine washable', 'Pills, less breathable, synthetic hand'),
  'silk-cotton': B('Silk-cotton voile (30/70)', { silk: 30, cotton: 70 }, 'chiffon', 'Shirts, scarves, summer blouses', 'Silk lustre with cotton comfort and price', 'Delicate'),
  'hemp-cotton': B('Hemp-cotton (55/45)', { hemp: 55, cotton: 45 }, 'canvas', 'Sustainable workwear, tees', 'Durable, lower water footprint', 'Coarser hand at first'),
  'recycled-poly-cotton': B('Recycled poly / organic cotton (50/50)', { polyester: 50, cotton: 50 }, 'french-terry', 'Sustainable sweats', 'Lower virgin-material use; ask for GRS / OCS certificates', 'Blends are hard to recycle again (fibre separation)'),
};

/** Compute physical props of a custom blend on top of a base fabric. */
export function blendFabric(base, composition) {
  const total = Object.values(composition).reduce((a, b) => a + b, 0) || 100;
  let dStretch = 0; let dBend = 0; let sheen = 0;
  for (const [fib, pct] of Object.entries(composition)) {
    const f = FIBERS[fib];
    if (!f) throw new Error(`unknown fibre "${fib}" (have: ${Object.keys(FIBERS).join(', ')})`);
    const w = pct / total;
    dStretch += f.stretch * w * (fib === 'elastane' ? 0.1 : 1);
    dBend += f.bend * w;
    sheen += f.sheen * w;
  }
  const fiberLabel = Object.entries(composition).sort((a, b) => b[1] - a[1]).map(([f, p]) => `${p}% ${FIBERS[f].name.split(' ')[0].toLowerCase()}`).join(' / ');
  return {
    ...base,
    fiber: fiberLabel,
    composition,
    stretch: Math.max(0.15, Math.min(1, base.stretch + dStretch)),
    bend: Math.max(0.005, Math.min(1, base.bend + dBend)),
    look: { ...base.look, sheen: Math.min(1, (base.look.sheen || 0) + sheen * 0.5) },
  };
}

// ---------------- Insulation fills ----------------
// warmth: relative warmth per gram; wet: performance when wet; loft: cm per 100 g/m²
const I = (name, kind, warmth, wet, loft, compress, weights, use, pros, cons, extra = {}) => ({ name, kind, warmth, wet, loft, compress, weights, use, pros, cons, ...extra });
export const INSULATION = {
  'goose-down-900': I('Goose down, 900 fill power', 'down', 1.0, 0.2, 4.2, 1.0, [60, 80, 100, 150], 'Ultralight expedition jackets', 'Best warmth-to-weight, packs tiny, lasts decades', 'Very expensive; useless when wet unless hydrophobic-treated', { cert: 'RDS / TDS (Responsible / Traceable Down Standard)' }),
  'goose-down-800': I('Goose down, 800 fill power', 'down', 0.92, 0.2, 3.8, 0.95, [80, 120, 160, 200], 'Premium puffers, sleeping bags', 'Excellent warmth-to-weight', 'Expensive, loses loft wet', { cert: 'RDS / TDS' }),
  'goose-down-700': I('Goose down, 700 fill power', 'down', 0.85, 0.2, 3.4, 0.9, [100, 150, 200, 250], 'Mid-to-premium puffers', 'Great warmth, good value', 'Loses loft wet', { cert: 'RDS' }),
  'duck-down-650': I('Duck down, 650 fill power', 'down', 0.78, 0.2, 3.0, 0.85, [120, 180, 250, 300], 'Mainstream puffers and parkas', 'Warm, cheaper than goose', 'Heavier for the same warmth; can smell', { cert: 'RDS' }),
  'duck-down-550': I('Duck down 80/20, 550 fill power', 'down', 0.7, 0.2, 2.6, 0.8, [150, 200, 300], 'Budget down jackets', 'Real down at low cost', 'Feather quills poke through, heavier'),
  'hydrophobic-down': I('Hydrophobic-treated down (DWR down)', 'down', 0.9, 0.55, 3.6, 0.95, [80, 120, 160], 'Wet-climate puffers', 'Keeps more loft when damp', 'Price premium; treatment wears over time'),
  'recycled-down': I('Recycled down', 'down', 0.8, 0.2, 3.1, 0.85, [120, 180, 250], 'Sustainable puffers', 'Lower impact, real down performance', 'Variable quality: ask for fill-power test reports'),
  'down-feather-50-50': I('Down/feather 50/50', 'feather', 0.55, 0.25, 2.0, 0.6, [200, 300, 400], 'Budget winter coats, bedding', 'Cheap', 'Heavy, lumpy, feathers poke through fabric'),
  'feather': I('Feather fill', 'feather', 0.35, 0.25, 1.4, 0.5, [300, 400], 'Pillows, cushions, very cheap coats', 'Cheapest natural fill', 'Heavy, poor warmth, quills escape'),
  'synthetic-microfiber': I('Synthetic microfibre insulation (PrimaLoft®-type)', 'synthetic', 0.7, 0.85, 2.2, 0.75, [40, 60, 80, 100, 133], 'Down-alternative jackets, hybrids, vests', 'Warm when wet, vegan, machine washable', 'Bulkier than down, loses loft over years'),
  'synthetic-continuous': I('Continuous-filament synthetic (Climashield®-type)', 'synthetic', 0.6, 0.9, 1.8, 0.6, [60, 100, 150, 200], 'Belay jackets, sleeping bags, workwear', 'Very durable, no cold spots (no quilting needed)', 'Less compressible'),
  'thin-microfiber': I('Thin microfibre (Thinsulate™-type)', 'synthetic', 0.65, 0.8, 1.0, 0.5, [40, 60, 100, 150, 200], 'Gloves, boots, slim jackets, hats', 'Warm without bulk', 'Not very packable'),
  'polyester-wadding': I('Polyester wadding / batting', 'synthetic', 0.45, 0.8, 1.6, 0.5, [60, 80, 100, 120, 150, 200], 'Quilted jackets, liners, budget puffers', 'Cheapest, easy to sew', 'Heavy for its warmth, flattens'),
  'recycled-poly-fill': I('Recycled polyester fill (rPET)', 'synthetic', 0.5, 0.8, 1.7, 0.55, [80, 120, 160], 'Sustainable quilted jackets', 'Made from bottles, washable', 'Similar drawbacks to polyester wadding'),
  'wool-batting': I('Wool batting', 'natural', 0.6, 0.7, 1.5, 0.4, [100, 150, 200, 300], 'Heritage quilted coats, liners', 'Warm when damp, breathable, odour resistant, natural', 'Heavier, can migrate unless stitched densely'),
  'cotton-batting': I('Cotton batting', 'natural', 0.3, 0.1, 1.0, 0.3, [100, 150, 200], 'Quilted chore coats, kimono jackets', 'Soft, natural, cheap', 'Poor warmth, heavy and cold when wet'),
  'kapok': I('Kapok fibre', 'natural', 0.6, 0.6, 2.0, 0.6, [80, 120, 160], 'Eco down alternative', 'Plant-based, light, buoyant, hollow fibre', 'Brittle fibres, often blended with polyester'),
  'aerogel': I('Aerogel composite', 'technical', 1.1, 0.9, 0.3, 0.2, [50, 100], 'Extreme cold, panels in high-end jackets and boots', 'Thinnest insulation per warmth', 'Very expensive, stiff, dusty to cut'),
};
export const QUILTING = { 'none': 'No quilting (continuous-filament or loose lining)', 'channel': 'Horizontal channel baffles (classic puffer)', 'box': 'Box baffles (sewn-through walls; warmest, no cold spots)', 'diamond': 'Diamond quilt (heritage / field jackets)', 'onion': 'Onion quilt', 'chevron': 'Chevron', 'welded': 'Welded / bonded baffles (no needle holes, wind-proof)' };

// ---------------- Waterproof / weatherproof technologies ----------------
// hydro: hydrostatic head (mm); mvtr: breathability (g/m²/24h); air: air-permeable
const W = (name, layers, hydro, mvtr, air, use, pros, cons, extra = {}) => ({ name, layers, hydro, mvtr, air, use, pros, cons, ...extra });
export const WATERPROOF = {
  'eptfe-3l': W('Expanded PTFE membrane, 3-layer', '3L', 28000, 25000, false, 'Mountain shells, premium rain jackets', 'The benchmark for durable waterproofing + breathability', 'Expensive; PTFE is a fluoropolymer (PFAS concerns): many brands are moving away', { note: 'This is the category the best-known membrane brand belongs to; generic ePTFE laminates are sold by many mills.' }),
  'pu-hydrophilic-3l': W('Hydrophilic PU membrane, 3-layer', '3L', 20000, 15000, false, 'Rain shells, ski jackets', 'PFAS-free, durable, cheaper than ePTFE', 'Feels clammier during hard exertion'),
  'pu-microporous-2l': W('Microporous PU membrane, 2-layer (with hanging liner)', '2L', 10000, 10000, false, 'Urban rain jackets, ski wear', 'Soft and quiet, mid-price', 'Heavier, liner adds bulk'),
  'nanofiber-3l': W('Electrospun nanofibre membrane, 3-layer (air-permeable)', '3L', 20000, 30000, true, 'High-output alpine and running shells', 'Highest breathability, air-permeable: dumps heat fast', 'Price, newer technology; slightly less wind-proof'),
  'pu-25l': W('2.5-layer printed PU coating', '2.5L', 10000, 8000, false, 'Packable rain jackets, running shells', 'Very light and packable, cheap', 'Less durable inside (printed protective layer wears)'),
  'tpu-laminate': W('TPU laminate', '2L/3L', 15000, 8000, false, 'Bags, rain gear, dry bags', 'PFAS-free, weldable, very waterproof', 'Low breathability'),
  'pvc-coated': W('PVC-coated rainwear', 'Coated', 30000, 0, false, 'Fishing, industrial, fashion raincoats', '100% waterproof, cheap, glossy fashion look', 'Zero breathability, cracks in cold, environmental concerns'),
  'rubberised': W('Rubberised cotton (bonded rubber)', 'Bonded', 25000, 0, false, 'Heritage mackintosh coats', 'Iconic, very waterproof', 'Heavy, no breathability, glued/taped seams by hand'),
  'waxed-cotton': W('Waxed cotton', 'Impregnated', 3000, 2000, false, 'Field jackets, bags', 'Repairable, re-waxable, patina', 'Not fully waterproof, needs re-waxing'),
  'ventile-type': W('Densely-woven long-staple cotton (Ventile®-type)', 'Woven', 1000, 20000, true, 'Expedition smocks, heritage outdoor', 'Fibres swell when wet to block water; quiet, natural, breathable', 'Expensive, heavier, slow to dry'),
  'dwr-c0': W('PFC-free DWR finish (C0)', 'Finish', 0, 0, true, 'Any outer fabric', 'Makes water bead and roll off; PFAS-free', 'Washes off: renew with wash-in or spray-on proofer'),
  'softshell-membrane': W('Softshell with membrane', 'Bonded', 8000, 12000, false, 'Hiking, ski touring, cycling', 'Stretchy, comfortable, wind-proof', 'Not storm-proof'),
};
export const SEAM_SEALING = ['seam-tape', 'ultrasonic-weld', 'laser-weld', 'rf-weld', 'adhesive-bond'];
