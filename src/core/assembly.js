// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Assembly methods: every way two pieces are joined or an edge is finished.
 * Stitch class numbers follow ISO 4915 (US: ASTM D6193 uses the same numbers).
 *
 *  method     stitch | seam (seam construction) | hand | bond | weld | fuse | mechanical | knit | edge
 *  strength   0..1 how rigidly the join holds in the simulation
 *  elasticity 0..1 how much the seam can stretch (knits need >= 0.4)
 *  visible    draw a stitch line on the outside; dash = [mm on, mm off]
 *  machine    equipment the factory needs
 *  forCat     fabric categories it's normally used on (guidance)
 */
const M = (method, name, strength, elasticity, visible, dash, machine, use, forCat = [], extra = {}) => ({ method, name, strength, elasticity, visible, dash, machine, use, forCat, ...extra });

export const ASSEMBLY = {
  // --- ISO 100 chainstitch (single thread)
  'chainstitch-101': M('stitch', 'Single-thread chainstitch (101)', 0.4, 0.3, false, [2, 1], 'Single-thread chainstitch machine', 'Basting, bag closing, temporary', ['Woven', 'Knit']),
  'blindstitch-103': M('stitch', 'Blindstitch (103)', 0.6, 0.15, false, [1, 5], 'Blindstitch hemmer', 'Invisible hems on trousers, skirts, coats', ['Woven']),
  // --- ISO 300 lockstitch
  'lockstitch-301': M('stitch', 'Lockstitch (301)', 0.95, 0.05, false, [2, 0.8], 'Single-needle lockstitch', 'The default for wovens and leather', ['Woven', 'Leather', 'Coated', 'Technical', 'Pile', 'Sheer']),
  'zigzag-304': M('stitch', 'Zigzag lockstitch (304)', 0.85, 0.4, true, [1.5, 1.5], 'Zigzag lockstitch', 'Lingerie, elastic, appliqué, lace', ['Knit', 'Sheer']),
  'bartack': M('stitch', 'Bar tack', 1.0, 0.0, true, [0.6, 0.2], 'Bar-tack machine', 'Reinforce pocket corners, belt loops, fly', ['Woven', 'Leather']),
  'buttonhole-straight': M('stitch', 'Buttonhole (straight)', 1.0, 0.0, true, [0.6, 0.2], 'Lockstitch buttonholer', 'Shirts, knits', ['Woven', 'Knit']),
  'buttonhole-keyhole': M('stitch', 'Buttonhole (keyhole / eyelet)', 1.0, 0.0, true, [0.6, 0.2], 'Keyhole buttonholer (chainstitch)', 'Jeans, jackets, coats', ['Woven']),
  // --- ISO 400 multi-thread chainstitch
  'chainstitch-401': M('stitch', 'Two-thread chainstitch (401)', 0.88, 0.25, true, [2.5, 1], 'Chainstitch (e.g. waistband / feed-off-the-arm)', 'Jeans seams and waistbands, roping hems', ['Woven']),
  'coverstitch-406': M('stitch', 'Bottom coverstitch, 2-needle (406)', 0.85, 0.6, true, [2, 1], 'Coverstitch machine', 'Knit hems, binding, topstitch', ['Knit']),
  // --- ISO 500 overedge
  'overlock-503': M('stitch', 'Overedge 2-thread (503)', 0.5, 0.5, false, [1, 0.5], 'Overlock', 'Edge neatening only (not a seam)', ['Woven', 'Knit']),
  'overlock-504': M('stitch', 'Overlock 3-thread (504)', 0.8, 0.5, false, [1, 0.5], '3-thread overlock', 'Knit seams, edge neatening', ['Knit', 'Woven']),
  'overlock-514': M('stitch', 'Overlock 4-thread (514)', 0.9, 0.5, false, [1, 0.5], '4-thread overlock', 'The default knit seam (T-shirts, sweats)', ['Knit']),
  'safety-516': M('stitch', 'Safety stitch 5-thread (516)', 0.97, 0.3, false, [1, 0.5], '5-thread safety stitch', 'Wovens: seams + neatening in one pass (jeans, chinos)', ['Woven']),
  // --- ISO 600 covering
  'coverstitch-602': M('stitch', 'Coverstitch (602)', 0.85, 0.6, true, [2, 1], 'Coverstitch (top + bottom cover)', 'T-shirt hems, knit topstitch, binding', ['Knit']),
  'flatlock-605': M('stitch', 'Flatseam 3-needle (605)', 0.85, 0.65, true, [1.5, 0.6], 'Flatseamer', 'Underwear, activewear', ['Knit']),
  'flatlock-607': M('stitch', 'Flatlock 4-needle (607)', 0.85, 0.7, true, [1.5, 0.6], 'Flatseamer (4-needle 6-thread)', 'Activewear, base layers, undershirts', ['Knit']),
  // --- seam constructions (ISO 4916 classes)
  'felled-seam': M('seam', 'Flat-felled seam', 1.0, 0.05, true, [2.5, 1], 'Felling machine (2-needle feed-off-the-arm)', 'Jeans, shirts, workwear: strongest, fully enclosed', ['Woven'], { needles: 2 }),
  'french-seam': M('seam', 'French seam', 0.9, 0.05, false, [2, 0.8], 'Lockstitch (two passes)', 'Sheers, silk, unlined couture', ['Sheer', 'Woven']),
  'bound-seam': M('seam', 'Bound (Hong Kong) seam', 0.92, 0.05, false, [2, 0.8], 'Lockstitch + binder attachment', 'Unlined coats and jackets', ['Woven']),
  'welt-seam': M('seam', 'Welt seam', 0.95, 0.05, true, [2.5, 1], 'Lockstitch', 'Tailoring, structured topstitched seams', ['Woven']),
  'lapped': M('seam', 'Lapped seam', 0.9, 0.1, true, [2, 1], 'Lockstitch / zigzag', 'Lace, leather, non-fraying fabrics', ['Sheer', 'Leather']),
  'topstitch': M('seam', 'Topstitch (double needle)', 0.95, 0.05, true, [3, 1.2], 'Twin-needle lockstitch', 'Jeans, jackets, decorative detail', ['Woven', 'Leather']),
  'piped-seam': M('seam', 'Piped seam', 0.92, 0.05, true, [2, 1], 'Lockstitch + piping foot', 'Decorative edges, upholstery-style details', ['Woven']),
  'rolled-hem': M('edge', 'Rolled hem', 0.6, 0.1, true, [1, 0.5], 'Overlock (rolled) or hemmer foot', 'Scarves, chiffon, silk edges', ['Sheer', 'Woven']),
  'blind-hem': M('edge', 'Blind hem', 0.6, 0.1, false, [1, 4], 'Blindstitch hemmer', 'Invisible hems', ['Woven']),
  'bias-binding': M('edge', 'Bias binding', 0.85, 0.2, true, [2, 1], 'Lockstitch + binder', 'Necklines, armholes, edges', ['Woven', 'Knit']),
  'lettuce-edge': M('edge', 'Lettuce edge', 0.5, 0.6, true, [0.8, 0.3], 'Overlock (stretched rolled)', 'Knit ruffled edges', ['Knit']),
  'picot-edge': M('edge', 'Picot edge', 0.5, 0.4, true, [0.8, 0.8], 'Picot attachment', 'Lingerie, elastic', ['Knit', 'Sheer']),
  'raw': M('edge', 'Raw / cut edge', 0.0, 0.0, false, [0, 1], 'Cutter', 'Leather, felt, boiled wool, knits that don\'t run', ['Leather', 'Non-woven']),
  'laser-cut': M('edge', 'Laser-cut sealed edge', 0.0, 0.0, false, [0, 1], 'CO2 laser cutter', 'Synthetics (melts and seals), perforations, leather', ['Technical', 'Leather', 'Coated']),
  'pinked': M('edge', 'Pinked edge', 0.0, 0.0, false, [0, 1], 'Pinking shears / wheel', 'Fray reduction on firm wovens', ['Woven']),
  // --- hand stitches
  'hand-running': M('hand', 'Running stitch (hand)', 0.5, 0.2, true, [3, 3], 'Hand needle', 'Sashiko, visible mending, gathering', ['Woven']),
  'hand-backstitch': M('hand', 'Backstitch (hand)', 0.85, 0.05, true, [2, 0.5], 'Hand needle', 'Strong hand seams', ['Woven', 'Leather']),
  'hand-slipstitch': M('hand', 'Slipstitch / ladder (hand)', 0.6, 0.1, false, [1, 4], 'Hand needle', 'Ties, linings, invisible closures', ['Woven', 'Sheer']),
  'hand-prickstitch': M('hand', 'Pick / prick stitch (hand)', 0.6, 0.05, true, [0.5, 5], 'Hand needle', 'Bespoke lapel edges', ['Woven']),
  'hand-padstitch': M('hand', 'Pad stitch (hand)', 0.5, 0.05, false, [1, 4], 'Hand needle', 'Shaping canvas into bespoke lapels', ['Woven']),
  'saddle-stitch': M('hand', 'Saddle stitch (leather, 2 needles)', 1.0, 0.0, true, [2.5, 1], 'Two harness needles + awl / stitching chisel', 'Hand-sewn leather: will not unravel', ['Leather']),
  'smocking': M('hand', 'Smocking / shirring', 0.6, 0.8, true, [1, 1], 'Shirring elastic in bobbin', 'Gathered elastic panels', ['Woven']),
  'quilting': M('stitch', 'Quilting (channel / diamond)', 0.9, 0.1, true, [2, 1], 'Multi-needle quilting machine', 'Puffers, liners, field jacket linings', ['Technical', 'Woven']),
  // --- bonding, welding, fusing (no thread)
  'adhesive-bond': M('bond', 'Adhesive bonding (hot-melt PU film)', 0.85, 0.3, false, [0, 1], 'Bonding press / hot-air bonder', 'Clean-finish hems, pockets, outdoor gear', ['Technical', 'Knit']),
  'leather-glue': M('bond', 'Contact cement (leather / edges)', 0.7, 0.0, false, [0, 1], 'Brush + roller / hammer', 'Turned leather edges, seam allowances, before stitching', ['Leather', 'Coated']),
  'glued-folded': M('bond', 'Glued & folded edge (leather)', 0.75, 0.0, false, [0, 1], 'Edge folding machine + cement', 'Finished leather edges', ['Leather']),
  'textile-glue': M('bond', 'Textile glue', 0.5, 0.2, false, [0, 1], 'Applicator', 'Prototyping, appliqué, costume', ['Woven', 'Knit']),
  'seam-tape': M('bond', 'Seam taping (hot air)', 0.95, 0.1, false, [0, 1], 'Hot-air seam taping machine', 'Waterproofing stitched seams on 2/2.5/3-layer shells', ['Technical']),
  'ultrasonic-weld': M('weld', 'Ultrasonic welding', 0.9, 0.2, false, [0, 1], 'Ultrasonic welder / sonic quilting', 'Synthetics: seamless quilting, waterproof seams, lace edges', ['Technical', 'Coated']),
  'rf-weld': M('weld', 'RF / HF welding', 0.95, 0.0, false, [0, 1], 'Radio-frequency welder', 'PVC/PU: rainwear, inflatables, bags', ['Coated']),
  'laser-weld': M('weld', 'Laser welding', 0.9, 0.2, false, [0, 1], 'Laser welding system', 'High-end seamless performance wear', ['Technical']),
  'fusing': M('fuse', 'Fusing (fusible interlining)', 0.7, 0.1, false, [0, 1], 'Continuous fusing press', 'Attaching interlinings to collars, cuffs, fronts', ['Woven']),
  // --- mechanical
  'rivets': M('mechanical', 'Rivets / burrs', 1.0, 0.0, true, [0, 1], 'Rivet press', 'Jeans pocket stress points, workwear', ['Woven', 'Leather']),
  'grommets': M('mechanical', 'Grommets / eyelets', 1.0, 0.0, true, [0, 1], 'Eyelet press', 'Drawcords, lacing, ventilation', ['Woven', 'Leather', 'Coated']),
  'snaps-press': M('mechanical', 'Snap setting', 1.0, 0.0, true, [0, 1], 'Snap press with dies', 'Closures, tabs', ['Woven', 'Leather', 'Knit']),
  'staples-lacing': M('mechanical', 'Lacing / whipstitch with cord', 0.7, 0.1, true, [3, 2], 'Hand / awl', 'Decorative leather lacing', ['Leather']),
  // --- knit construction
  'linking': M('knit', 'Linking (knitwear)', 0.85, 0.7, false, [1, 0.5], 'Linking machine (dial linker)', 'Joining fully-fashioned knit panels loop by loop', ['Knit']),
  'cut-and-sew-knit': M('knit', 'Cut & sew (knitwear)', 0.85, 0.5, false, [1, 0.5], 'Overlock', 'Cheaper knitwear: panels cut from knitted fabric', ['Knit']),
  'whole-garment': M('knit', 'Whole-garment / seamless knitting', 1.0, 0.8, false, [0, 1], 'Seamless V-bed knitting machine', 'Knitted in one piece, no seams at all', ['Knit']),
};

/** Back-compat alias used across the app. */
export const STITCHES = ASSEMBLY;
export const ASSEMBLY_GROUPS = { stitch: 'Machine stitches (ISO 4915)', seam: 'Seam constructions', edge: 'Edge finishes & hems', hand: 'Hand stitching', bond: 'Bonding & glue', weld: 'Welding (no thread)', fuse: 'Fusing', mechanical: 'Mechanical fastening', knit: 'Knitwear construction' };

export function resolveStitch(id) {
  return ASSEMBLY[id] || ASSEMBLY['lockstitch-301'];
}

/**
 * Thread & yarn materials for stitching. tex = linear density (g/1000 m);
 * ticket number ~ 1000 / tex * 3 for spun threads. Strength 0..1 relative.
 */
const T = (name, fiber, tex, strength, stretch, sheen, use, extra = {}) => ({ name, fiber, tex, strength, stretch, sheen, use, ...extra });
export const THREADS = {
  'poly-corespun': T('Poly-cotton core-spun (tex 27-40)', 'Polyester core / cotton wrap', 30, 0.8, 0.15, 0.2, 'Industry default for most wovens and knits; dyes like cotton, strong like polyester', { recommended: true }),
  'poly-corespun-heavy': T('Core-spun heavy (tex 70-105)', 'Polyester core / cotton wrap', 80, 0.95, 0.15, 0.2, 'Denim topstitching, workwear, canvas'),
  'poly-spun': T('Spun polyester (tex 18-40)', 'Polyester', 27, 0.7, 0.18, 0.25, 'Budget general sewing'),
  'poly-filament-fine': T('Polyester continuous filament (tex 16-24)', 'Polyester', 18, 0.75, 0.15, 0.4, 'Tailoring, fine wovens, lightweight seams'),
  'poly-textured': T('Textured polyester / "woolly poly"', 'Polyester', 18, 0.6, 0.6, 0.15, 'Overlock and coverstitch loopers on knits (soft, stretchy)'),
  'nylon-textured': T('Textured nylon / "woolly nylon"', 'Nylon 6.6', 18, 0.65, 0.7, 0.15, 'Swim, activewear, lingerie loopers'),
  'nylon-bonded': T('Bonded nylon (tex 70-135)', 'Nylon 6.6', 90, 1.0, 0.2, 0.5, 'Leather, upholstery, bags, footwear'),
  'nylon-bonded-fine': T('Bonded nylon fine (tex 30-45)', 'Nylon 6.6', 40, 0.85, 0.2, 0.5, 'Outerwear, bombers, technical shells'),
  'cotton-mercerized': T('Mercerized cotton (tex 30-40)', 'Cotton', 35, 0.55, 0.05, 0.4, 'Garment-dyed products (dyes with the garment), heritage'),
  'cotton-glace': T('Glacé cotton', 'Cotton (waxed)', 40, 0.6, 0.05, 0.5, 'Hand sewing, buttons'),
  'silk-filament': T('Silk filament (100 wt / tex 10-15)', 'Silk', 12, 0.6, 0.15, 0.8, 'Silk garments, hand-tailored buttonholes, basting'),
  'silk-buttonhole': T('Silk buttonhole twist', 'Silk', 50, 0.7, 0.1, 0.8, 'Hand buttonholes on tailoring'),
  'linen-waxed': T('Waxed linen thread', 'Linen', 90, 0.85, 0.02, 0.4, 'Hand saddle-stitching leather'),
  'wool-thread': T('Wool / acrylic yarn', 'Wool', 60, 0.4, 0.3, 0.1, 'Decorative embroidery, knit linking'),
  'rayon-embroidery': T('Viscose rayon embroidery (40 wt)', 'Viscose', 27, 0.4, 0.1, 0.9, 'Glossy embroidery logos'),
  'poly-embroidery': T('Polyester embroidery (40 wt)', 'Polyester', 27, 0.6, 0.1, 0.8, 'Colour-fast embroidery (bleach-safe)'),
  'metallic': T('Metallic thread', 'Metallised polyester', 30, 0.35, 0.05, 1.0, 'Decorative embroidery, topstitch accents', { metalness: 0.9 }),
  'monofilament': T('Invisible monofilament nylon', 'Nylon', 8, 0.5, 0.2, 0.5, 'Invisible hems, sequins, quilting'),
  'aramid': T('Aramid (Kevlar® / Nomex® type)', 'Para/meta-aramid', 40, 1.0, 0.03, 0.2, 'Fire-resistant and cut-resistant workwear, PPE'),
  'ptfe': T('PTFE (expanded, UV-proof)', 'PTFE', 40, 0.9, 0.05, 0.3, 'Awnings, outdoor gear exposed to sun'),
  'conductive-steel': T('Conductive stainless steel thread', 'Stainless steel fibre', 60, 0.6, 0.02, 0.6, 'E-textiles, touchscreen gloves, sensors', { metalness: 0.8 }),
  'conductive-silver': T('Silver-plated nylon conductive thread', 'Nylon + silver', 30, 0.55, 0.15, 0.7, 'Wearable circuits', { metalness: 0.8 }),
  'elastic-shirring': T('Shirring elastic', 'Elastane covered', 50, 0.4, 1.0, 0.2, 'Smocking / shirring in the bobbin'),
  'reflective': T('Reflective thread', 'Polyester + glass beads', 40, 0.5, 0.1, 0.9, 'Safety and night-visibility details'),
  'glow': T('Glow-in-the-dark thread', 'Polyester (photoluminescent)', 30, 0.5, 0.1, 0.5, 'Novelty embroidery'),
};
