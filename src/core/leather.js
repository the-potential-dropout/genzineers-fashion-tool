// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Leather and fur know-how: how hides are tanned and finished, what each
 * treatment is for, what colours are realistic and how they are achieved,
 * and which leather belongs on which product. Thickness follows the trade
 * (1 oz = 1/64 in = 0.4 mm). Prices are relative ($ cheapest to $$$$$).
 */

/** Tanning: turns raw hide into stable leather. */
export const TANNING = {
  chrome: { name: 'Chrome tanned', price: '$$', share: 'about 80-85% of all leather', feel: 'Soft, supple, stretchy, water-tolerant; consistent colour', uses: 'Garments, gloves, upholstery, most shoe uppers, soft bags', pros: 'Fast (a day), soft, takes bright colours, heat and water resistant', cons: 'Does not mould or tool, does not patina much, chromium effluent must be treated', not: 'Holsters and knife sheaths (chrome salts can corrode metal), tooled goods' },
  vegetable: { name: 'Vegetable tanned', price: '$$$$', share: 'under 10%', feel: 'Firm, dense, smells of bark; darkens and burnishes with age', uses: 'Belts, holsters, sheaths, saddlery, wallets, soles, tooling and carving, structured bags', pros: 'Moulds when wet (holds a holster shape), burnishable edges, rich patina, metal-safe', cons: 'Slow (4-8 weeks), stiffer, water spots until waxed, fewer bright colours', not: 'Soft drapey garments, gloves' },
  combination: { name: 'Combination (chrome re-tan / veg re-tan)', price: '$$$', feel: 'Between the two: supple but with body', uses: 'Boots, work boots, structured-soft bags, watch straps, heavy jackets', pros: 'Pull-up oils and waxes take well; durable', cons: 'Costlier than chrome', not: 'Wet-moulded holsters (not firm enough)' },
  aldehyde: { name: 'Aldehyde / wet-white (chrome-free)', price: '$$$', feel: 'Very soft, pale cream base', uses: 'Baby shoes, car interiors, washable gloves, chamois', pros: 'Chrome-free, washable, good for pastel colours', cons: 'Less heat resistance', not: 'Structured goods' },
  brain: { name: 'Brain / oil tanned (buckskin, chamois)', price: '$$$$', feel: 'Cloth-soft, breathable, napped both sides', uses: 'Buckskin garments, moccasins, chamois cloths, glove linings', pros: 'Softest of all, washable', cons: 'Stretches, stains, low water resistance', not: 'Anything needing structure' },
  alum: { name: 'Alum tawed', price: '$$$', feel: 'White, soft, slightly papery', uses: 'Bookbinding, white gloves, fur skins (dressing)', pros: 'Pure white', cons: 'Reverts if soaked', not: 'Outdoor goods' },
  synthetic: { name: 'Synthetic tanned (syntan)', price: '$$', feel: 'Pale, even, soft', uses: 'Light colours, white leather, re-tanning', pros: 'Even dyeing, pale base', cons: 'Usually combined with another tannage', not: '' },
};

/** Finishing: what is done to the surface. Changes the look, the feel and the price. */
export const LEATHER_FINISHES = {
  aniline: { name: 'Full aniline', price: '$$$$$', look: { roughness: 0.5, clearcoat: 0.08 }, desc: 'Dyed through with soluble dye, no pigment coat: every pore and mark shows.', uses: 'Luxury jackets, bags, small leather goods from the best hides', pros: 'Most natural look and hand, breathes, patinas beautifully', cons: 'Stains and fades easily; only clean hides qualify (so it is expensive)' },
  'semi-aniline': { name: 'Semi-aniline', price: '$$$$', look: { roughness: 0.48, clearcoat: 0.18 }, desc: 'Aniline dyed plus a thin protective coat with a little pigment.', uses: 'Premium jackets, handbags, car and furniture leather', pros: 'Natural look with real stain resistance', cons: 'Slightly less depth than full aniline' },
  pigmented: { name: 'Pigmented / corrected grain', price: '$$', look: { roughness: 0.42, clearcoat: 0.35 }, desc: 'Grain buffed to remove flaws, then embossed with a grain pattern and coated with opaque pigment.', uses: 'Everyday shoes, belts, uniform goods, upholstery', pros: 'Uniform colour, hard-wearing, cheap, easy to clean', cons: 'Plastic-like hand, no patina, cracks when the coat ages' },
  nubuck: { name: 'Nubuck', price: '$$$$', look: { roughness: 1, sheen: 0.9, clearcoat: 0 }, desc: 'Top grain lightly sanded on the grain side to a fine velvet nap.', uses: 'Boots (wheat work boots), premium sneakers, jackets, bags', pros: 'Velvety but stronger than suede', cons: 'Marks with water and oil; needs proofing spray' },
  suede: { name: 'Suede', price: '$$', look: { roughness: 1, sheen: 0.95, clearcoat: 0 }, desc: 'The flesh side or a split, napped.', uses: 'Jackets, desert boots, linings, gloves, trims', pros: 'Soft, light, inexpensive', cons: 'Weaker than grain leather, stains, not for wet weather' },
  'pull-up': { name: 'Pull-up / oiled / waxed', price: '$$$', look: { roughness: 0.5, clearcoat: 0.22 }, desc: 'Loaded with oils and waxes: colour lightens where it is bent or pulled.', uses: 'Work and heritage boots, belts, rugged bags, watch straps', pros: 'Water resistant, scuffs rub out, strong character', cons: 'Marks easily (by design), heavier' },
  patent: { name: 'Patent (high gloss)', price: '$$$', look: { roughness: 0.1, clearcoat: 1 }, desc: 'Sealed under a mirror-gloss polyurethane or lacquer coat.', uses: 'Formal shoes, evening bags, belts, statement outerwear', pros: 'Mirror shine, waterproof surface', cons: 'Creases and scuffs permanently, colour transfer, does not breathe' },
  burnished: { name: 'Burnished / antiqued', price: '$$$', look: { roughness: 0.38, clearcoat: 0.3 }, desc: 'Heat and friction or wax darken raised areas, toes and edges.', uses: 'Dress shoes, belts, briefcases', pros: 'Depth of colour', cons: 'Hand work adds cost' },
  embossed: { name: 'Embossed (croc, lizard, ostrich, pebble, saffiano)', price: '$$', look: { roughness: 0.45, clearcoat: 0.3 }, desc: 'A pattern pressed into the grain under heat; saffiano is a wax-coated cross-hatch.', uses: 'Bags, wallets, belts, shoes: the look of exotics or scratch-proof texture', pros: 'Exotic look at cowhide price, hides flaws, scratch resistant', cons: 'Not the real thing; pattern can flatten with wear' },
  metallic: { name: 'Metallic / foil', price: '$$$', look: { roughness: 0.25, clearcoat: 0.4, metalness: 0.8 }, desc: 'A metal foil or pearlescent film laminated to the surface.', uses: 'Fashion shoes and bags, trims', pros: 'Striking', cons: 'Foil wears off at flex points' },
  distressed: { name: 'Distressed / tumbled / washed', price: '$$$', look: { roughness: 0.7, clearcoat: 0.05 }, desc: 'Tumbled, waxed and rubbed back for a worn-in look.', uses: 'Biker and aviator jackets, vintage bags', pros: 'Broken-in from day one, hides wear', cons: 'Uneven by nature' },
  glazed: { name: 'Glazed / polished (box calf, cordovan)', price: '$$$$', look: { roughness: 0.2, clearcoat: 0.6 }, desc: 'Polished under a glass or agate roller to a deep natural gloss.', uses: 'Dress shoes, fine small leather goods', pros: 'Deep shine without a plastic coat', cons: 'Costly, shows scratches' },
  bridle: { name: 'Bridle (stuffed with tallow and wax)', price: '$$$$', look: { roughness: 0.4, clearcoat: 0.25 }, desc: 'Vegetable-tanned leather hot-stuffed with greases; a white wax bloom rises to the surface.', uses: 'Belts, straps, briefcases, saddlery', pros: 'Very strong, weatherproof, ages for decades', cons: 'Stiff, heavy, slow to make' },
  'raw-veg': { name: 'Natural vegetable tan (tooling, undyed)', price: '$$$', look: { roughness: 0.65, clearcoat: 0 }, desc: 'Undyed pale tan; meant to be dyed, tooled, moulded and finished by the maker.', uses: 'Holsters, sheaths, carved belts, saddlery', pros: 'Moulds wet, tools and stamps crisply', cons: 'Stains with water until sealed' },
};

/** Realistic leather colours and the treatment that produces them. */
export const LEATHER_COLOURS = [
  ['#c9a27a', 'Natural / russet', 'Undyed vegetable tan; darkens to honey and then brown with sun and oil.'],
  ['#8a5a3c', 'Tan / cognac', 'Aniline or semi-aniline dye on vegetable or combination tan; antiqued for depth.'],
  ['#6b3d1f', 'Mid brown (chestnut)', 'Drum dyed; pull-up oils give lighter highlights where it flexes.'],
  ['#4a2a18', 'Dark brown (chocolate)', 'Drum dyed through; the classic for boots and belts.'],
  ['#5a1f1a', 'Oxblood / burgundy', 'Aniline dye, often glazed (classic cordovan colour #8).'],
  ['#141210', 'Black', 'Drum dyed black then pigment or aniline top coat; the easiest colour to make uniform.'],
  ['#2a2c3a', 'Navy', 'Chrome tan with a pigmented or semi-aniline finish; hard to get even on vegetable tan.'],
  ['#3f4a36', 'Olive / forest', 'Chrome or combination tan, semi-aniline.'],
  ['#8b8f93', 'Grey / taupe', 'Chrome or wet-white base; nubuck and suede take greys well.'],
  ['#d8c9a8', 'Sand / beige', 'Suede or nubuck; needs a pale (wet-white or syntan) base.'],
  ['#f2efe6', 'White / off-white', 'Wet-white or syntan base with an opaque white pigment coat; pure white is never aniline.'],
  ['#a8262b', 'Red', 'Chrome tan, pigmented or semi-aniline; bright colours need a pale base and pigment.'],
  ['#d9a521', 'Yellow / mustard', 'Pigmented on a chrome base; the wheat nubuck of work boots is dyed nubuck.'],
  ['#1f5fa8', 'Blue', 'Pigmented finish on chrome tan.'],
  ['#d98a9c', 'Pastels (pink, mint, lilac)', 'Wet-white base, pigmented; fade in sunlight unless UV-stabilised.'],
  ['#c8a437', 'Metallic gold / silver', 'Foil or pearlescent film over a pigmented base.'],
];

/** Which leather for which product. good = first choices, ok = works, avoid = wrong for the job. */
export const LEATHER_USE = {
  jacket: { name: 'Jackets & coats', mm: [0.6, 1.3], good: ['lambskin', 'goatskin', 'calfskin', 'horsehide', 'cowhide-nappa', 'deerskin', 'suede'], ok: ['buffalo', 'pigskin', 'faux'], avoid: ['bridle', 'veg-tooling', 'shell-cordovan', 'sole'], why: 'Must drape and flex: soft chrome-tanned skins 0.6-1.3 mm. Horsehide and steerhide for bikers (heavier, protective).' },
  trousers: { name: 'Leather trousers & skirts', mm: [0.5, 0.9], good: ['lambskin', 'goatskin', 'stretch-leather', 'suede'], ok: ['calfskin', 'faux'], avoid: ['cowhide-heavy', 'bridle', 'veg-tooling'], why: 'Thin and supple, often bonded to stretch backing.' },
  gloves: { name: 'Gloves', mm: [0.4, 0.8], good: ['lambskin', 'goatskin', 'deerskin', 'peccary', 'kangaroo'], ok: ['calfskin'], avoid: ['cowhide-heavy', 'veg-tooling', 'bridle'], why: 'Thin, stretchy, strong for its weight.' },
  'shoe-upper': { name: 'Shoe & boot uppers', mm: [1.2, 2.4], good: ['calfskin', 'cowhide', 'shell-cordovan', 'kangaroo', 'pull-up', 'nubuck'], ok: ['goatskin', 'suede', 'pigskin'], avoid: ['lambskin', 'veg-tooling'], why: 'Firm enough to hold the last shape and resist creasing: 1.2-1.6 mm dress, 1.8-2.4 mm boots. Garment lambskin is far too soft and thin.' },
  'shoe-lining': { name: 'Shoe linings', mm: [0.6, 1.0], good: ['calf-lining', 'goatskin', 'pigskin'], ok: ['sheepskin'], avoid: ['pigmented'], why: 'Absorbs moisture, smooth against the foot; vegetable-tanned linings are kindest to skin.' },
  sole: { name: 'Soles & heels', mm: [4, 6], good: ['sole-bend'], ok: [], avoid: ['everything-else'], why: 'Pit-tanned vegetable bend, compressed: 4.5-5.5 mm.' },
  belt: { name: 'Belts & straps', mm: [3.2, 4.4], good: ['bridle', 'veg-tan', 'harness', 'pull-up'], ok: ['cowhide-lined', 'shell-cordovan'], avoid: ['lambskin', 'suede-unlined', 'bonded'], why: 'One piece of 8-11 oz (3.2-4.4 mm) vegetable or bridle leather, or two thinner layers stitched. Soft garment leather stretches and curls.' },
  wallet: { name: 'Wallets & small leather goods', mm: [0.8, 1.4], good: ['calfskin', 'goatskin', 'veg-tan-thin', 'shell-cordovan', 'saffiano', 'buttero'], ok: ['kangaroo', 'pigskin-lining', 'exotic'], avoid: ['cowhide-heavy', 'lambskin'], why: 'Thin and firm: 1.0-1.4 mm outside, 0.6-0.9 mm pockets, skived at the folds. Lambskin scuffs through at the corners.' },
  holster: { name: 'Holsters & sheaths', mm: [2.8, 3.6], good: ['veg-tooling', 'bridle', 'horsehide-veg'], ok: ['kydex-hybrid'], avoid: ['chrome', 'lambskin', 'suede', 'faux'], why: 'Vegetable tanned only, 7-9 oz (2.8-3.6 mm): it wet-moulds to the tool and stays rigid. Chrome-tanned leather will not hold shape and its salts can corrode metal.' },
  bag: { name: 'Bags', mm: [1.2, 2.4], good: ['cowhide', 'calfskin', 'veg-tan', 'pull-up', 'saffiano', 'pebble'], ok: ['goatskin', 'lambskin-lined', 'exotic', 'faux'], avoid: ['sole'], why: 'Structured bags 1.6-2.4 mm (or thinner leather on a stiffener); soft slouchy bags 1.2-1.6 mm.' },
  hat: { name: 'Hats & caps', mm: [0.6, 1.2], good: ['lambskin', 'suede', 'goatskin'], ok: ['faux'], avoid: ['bridle', 'veg-tooling'], why: 'Light and supple; lined with a sweatband.' },
  upholstery: { name: 'Trims & patches (labels, elbow patches, pulls)', mm: [0.8, 1.6], good: ['veg-tan-thin', 'suede', 'pull-up'], ok: ['any-offcut'], avoid: [], why: 'Jeans back patches are 1.2-1.6 mm vegetable tan (embossed) or a paper-like alternative (jacron).' },
};

/** Is this leather a sensible choice for this product? Returns 'good' | 'ok' | 'avoid' | null. */
export function leatherFit(fabric, use) {
  const u = LEATHER_USE[use]; if (!u || !fabric) return null;
  const tag = `${fabric.id} ${fabric.family || ''} ${fabric.name || ''}`.toLowerCase();
  const hit = (list) => list.some((k) => tag.includes(k.replace('-', ' ')) || tag.includes(k) || (k === 'faux' && /vegan|faux|pu-|pvc|microfib|bonded|cactus|pineapple|apple|mycelium|cork/.test(tag)) || (k === 'exotic' && /croc|alligator|ostrich|python|snake|lizard|stingray/.test(tag)) || (k === 'chrome' && /chrome|nappa|lamb/.test(tag)) || (k === 'veg-tooling' && /tooling|veg/.test(tag)) || (k === 'veg-tan' && /veg|bridle|harness/.test(tag)));
  if (hit(u.avoid)) return 'avoid';
  if (hit(u.good)) return 'good';
  if (hit(u.ok)) return 'ok';
  const t = fabric.thicknessMm; if (t && (t < u.mm[0] * 0.75 || t > u.mm[1] * 1.3)) return 'avoid';
  return 'ok';
}
