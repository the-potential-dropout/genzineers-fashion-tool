// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Fabric library: families x quality/finish variants.
 *
 * Physical (0..1 unless noted): weightGsm, stretch (1 = rigid), shear, bend
 * (stiffness), damping, friction, thicknessMm.
 * Look: color, roughness, sheen, sheenColor, metalness, opacity, pattern,
 * patternScale (repeats / 10 cm), fx (distressed | faded | slub | mottled |
 * selvedge | waxed | quilted | crushed | fuzzy | crinkle).
 * rec: industry-default construction for this family (used for guidance).
 */

const F = {};
const FAMILIES = {};

function family(id, name, category, fiber, [gsm, stretch, shear, bend, damping, friction, thick], look, rec, variants = []) {
  const base = {
    id, family: id, name, category, fiber, weightGsm: gsm, stretch, shear, bend, damping, friction, thicknessMm: thick,
    look: { roughness: 0.85, metalness: 0, sheen: 0.3, sheenColor: '#ffffff', opacity: 1, patternScale: 6, ...look },
    rec, quality: 'Standard',
  };
  F[id] = base;
  FAMILIES[id] = { id, name, category, fiber, variants: [id] };
  for (const [vid, vname, d = {}, note = ''] of variants) {
    const { gsm: g2, color, rough, sheen, sheenColor, metal, opacity, pattern, scale, fx, colors, ...phys } = d;
    F[vid] = {
      ...base, ...phys, id: vid, name: vname, quality: vname.replace(name, '').replace(/^[\s,()-]+|[\s()]+$/g, '') || vname, note,
      weightGsm: g2 ?? base.weightGsm,
      look: {
        ...base.look,
        ...(color ? { color } : {}), ...(rough != null ? { roughness: rough } : {}), ...(sheen != null ? { sheen } : {}),
        ...(sheenColor ? { sheenColor } : {}), ...(metal != null ? { metalness: metal } : {}), ...(opacity != null ? { opacity } : {}),
        ...(pattern ? { pattern } : {}), ...(scale ? { patternScale: scale } : {}), ...(fx ? { fx } : {}), ...(colors ? { patternColors: colors } : {}),
      },
    };
    FAMILIES[id].variants.push(vid);
  }
}

const KNIT = (o = {}) => ({ stitch: 'overlock-514', hem: 'coverstitch-602', thread: 'poly-textured', needle: 'Ball point 70/10-80/12', spi: 12, interfacing: 'Knit fusible (tricot) at neck/plackets only', press: 'Low-medium heat, no stretch while hot', care: 'Machine wash 30-40 °C', ...o });
const WOVEN = (o = {}) => ({ stitch: 'lockstitch-301', finish: 'overlock-504', thread: 'poly-corespun', needle: 'Sharp/universal 80/12', spi: 12, interfacing: 'Woven fusible at collar, cuffs, placket', press: 'Steam, medium-high heat', care: 'Machine wash 40 °C', ...o });

// ---------------- Cotton knits ----------------
family('cotton-jersey', 'Cotton Jersey', 'Knit', 'Cotton', [180, 0.55, 0.4, 0.08, 0.02, 0.5, 0.6], { color: '#e9e4da', roughness: 0.92, sheen: 0.4, pattern: 'knit', patternScale: 6 }, KNIT({ uses: 'T-shirts, undershirts, dresses' }), [
  ['cotton-jersey-combed', 'Cotton Jersey (combed ring-spun)', { rough: 0.88 }, 'Shorter fibres combed out; smoother, softer, less pilling than carded open-end.'],
  ['cotton-jersey-preshrunk', 'Cotton Jersey (pre-shrunk)', {}, 'Compacted / pre-shrunk: residual shrinkage under 5% after washing.'],
  ['cotton-jersey-organic', 'Cotton Jersey (organic, GOTS)', { color: '#efe8d8' }, 'Certified organic fibre and processing; buyers ask for the GOTS scope certificate.'],
  ['cotton-jersey-pima', 'Cotton Jersey (Pima)', { gsm: 150, rough: 0.8, sheen: 0.55 }, 'Extra-long staple; silky hand, stronger and more durable.'],
  ['cotton-jersey-supima', 'Cotton Jersey (Supima)', { gsm: 160, rough: 0.78, sheen: 0.6 }, 'Licensed US-grown Pima; premium tees and underwear.'],
  ['cotton-jersey-slub', 'Cotton Jersey (slub)', { fx: 'slub' }, 'Irregular thick-thin yarn for a vintage, textured look.'],
  ['cotton-jersey-heavyweight', 'Cotton Jersey (heavyweight 260 gsm)', { gsm: 260, bend: 0.18, thicknessMm: 0.9 }, 'Boxy streetwear tees; holds shape, less cling.'],
  ['cotton-jersey-mercerized', 'Cotton Jersey (mercerized)', { rough: 0.6, sheen: 0.8 }, 'Caustic-treated yarn: lustrous, deeper colour uptake, crisp.'],
]);
family('modal-jersey', 'Modal Jersey', 'Knit', 'Modal / elastane', [160, 0.4, 0.3, 0.03, 0.015, 0.35, 0.4], { color: '#d9d4cf', roughness: 0.6, sheen: 0.7, pattern: 'knit', patternScale: 10 }, KNIT({ stitch: 'flatlock-607', uses: 'Underwear, loungewear, undershirts' }), [
  ['modal-jersey-micro', 'Modal Jersey (MicroModal)', { gsm: 140, rough: 0.5 }, 'Finer fibres; very soft, premium underwear.'],
]);
family('rib-knit', 'Rib Knit 1x1', 'Knit', 'Cotton / elastane', [220, 0.35, 0.35, 0.12, 0.02, 0.55, 1.0], { color: '#1d1d1f', roughness: 0.9, pattern: 'rib', patternScale: 8 }, KNIT({ uses: 'Neckbands, cuffs, hems, fitted tops' }), [
  ['rib-knit-2x1', 'Rib Knit 2x1', { gsm: 200, color: '#f4f2ec' }, 'Classic A-shirt / singlet rib.'],
  ['rib-knit-2x2', 'Rib Knit 2x2', { gsm: 280 }, 'Heavier, more elastic; sweatshirt cuffs and hems.'],
  ['rib-knit-wool', 'Rib Knit (merino wool)', { gsm: 300, color: '#6b2d2d', pattern: 'rib', scale: 4, fx: 'fuzzy', thicknessMm: 3 }, 'Beanies, sweaters.'],
]);
family('cotton-pique', 'Cotton Piqué', 'Knit', 'Cotton', [210, 0.7, 0.5, 0.15, 0.02, 0.55, 0.9], { color: '#203a5c', roughness: 0.92, pattern: 'waffle', patternScale: 14 }, KNIT({ uses: 'Polo shirts' }), [
  ['cotton-pique-mercerized', 'Cotton Piqué (mercerized)', { rough: 0.65, sheen: 0.7 }],
]);
family('waffle-knit', 'Waffle / Thermal Knit', 'Knit', 'Cotton', [230, 0.6, 0.45, 0.14, 0.02, 0.6, 1.4], { color: '#cfc6b4', roughness: 0.95, pattern: 'waffle', patternScale: 5 }, KNIT({ uses: 'Henleys, thermals' }));
family('french-terry', 'French Terry (loopback)', 'Knit', 'Cotton', [340, 0.65, 0.5, 0.3, 0.03, 0.6, 1.6], { color: '#8a8f96', roughness: 0.97, pattern: 'knit', patternScale: 5 }, KNIT({ hem: 'flatlock-607', uses: 'Sweatshirts, hoodies, joggers' }), [
  ['french-terry-heavy', 'French Terry (heavyweight 450 gsm)', { gsm: 450, bend: 0.4 }, 'Premium heavy sweats.'],
  ['french-terry-organic', 'French Terry (organic)', {}],
]);
family('cotton-fleece', 'Cotton Fleece (brushed back)', 'Knit', 'Cotton / polyester', [320, 0.65, 0.5, 0.32, 0.035, 0.65, 2.0], { color: '#2b2f36', roughness: 1.0, sheen: 0.5, pattern: 'velvet', patternScale: 6 }, KNIT({ uses: 'Hoodies, sweatpants' }), [
  ['polar-fleece', 'Polar Fleece (polyester)', { gsm: 280, color: '#5b6b4a', fx: 'fuzzy', thicknessMm: 2.5 }, 'Anti-pill polyester fleece; mid-layers.'],
  ['sherpa', 'Sherpa / Berber fleece', { gsm: 330, color: '#efe6d6', fx: 'fuzzy', thicknessMm: 6, bend: 0.4 }],
]);
family('merino-jersey', 'Merino Wool Jersey', 'Knit', 'Wool', [180, 0.5, 0.4, 0.08, 0.02, 0.55, 0.7], { color: '#3b3f46', roughness: 0.9, pattern: 'knit', patternScale: 9 }, KNIT({ care: 'Wool wash 30 °C, dry flat', uses: 'Base layers, tees, mock necks' }), [
  ['merino-jersey-17', 'Merino Jersey (17.5 micron)', { gsm: 150 }, 'Next-to-skin soft; lower micron = finer and softer.'],
]);
family('ponte-knit', 'Ponte di Roma', 'Knit', 'Viscose / nylon / elastane', [300, 0.55, 0.5, 0.3, 0.025, 0.5, 1.1], { color: '#1a1a1a', roughness: 0.7, sheen: 0.4, pattern: 'plain', patternScale: 12 }, KNIT({ uses: 'Sheath dresses, leggings, structured knits' }));
family('spandex-jersey', 'Spandex / Lycra Jersey', 'Knit', 'Nylon / elastane', [200, 0.2, 0.25, 0.04, 0.015, 0.35, 0.4], { color: '#141414', roughness: 0.4, sheen: 0.6, pattern: 'knit', patternScale: 14 }, KNIT({ stitch: 'flatlock-607', thread: 'nylon-textured', uses: 'Activewear, swim' }), [
  ['spandex-recycled', 'Spandex Jersey (recycled nylon)', {}, 'Recycled nylon 6 content; ask for GRS certificate.'],
]);
family('scuba-neoprene', 'Scuba / Neoprene', 'Knit', 'Polyester / elastane', [350, 0.45, 0.6, 0.55, 0.03, 0.5, 2.5], { color: '#2a2a33', roughness: 0.5, sheen: 0.4, pattern: 'plain', patternScale: 12 }, KNIT({ stitch: 'flatlock-607', uses: 'Structured skirts, wetsuits' }));
family('velour', 'Velour', 'Knit', 'Cotton / polyester', [280, 0.55, 0.45, 0.2, 0.03, 0.6, 1.5], { color: '#4a1f5c', roughness: 0.7, sheen: 1.0, sheenColor: '#c69be0', pattern: 'velvet', patternScale: 8 }, KNIT({ uses: 'Tracksuits, loungewear' }));

// ---------------- Cotton wovens ----------------
family('cotton-poplin', 'Cotton Poplin', 'Woven', 'Cotton', [120, 0.95, 0.7, 0.18, 0.02, 0.45, 0.3], { color: '#f4f6fb', roughness: 0.8, sheen: 0.2, pattern: 'plain', patternScale: 10 }, WOVEN({ stitch: 'felled-seam', spi: 16, needle: 'Sharp 70/10', uses: 'Shirts, dresses' }), [
  ['cotton-poplin-egyptian', 'Cotton Poplin (Egyptian Giza, 2-ply 100s)', { gsm: 110, rough: 0.65, sheen: 0.45 }, 'Extra-long staple, two-ply yarns: smooth, lustrous, durable dress shirts.'],
  ['cotton-poplin-preshrunk', 'Cotton Poplin (pre-shrunk / sanforized)', {}, 'Mechanically compacted so it shrinks under 1-3%.'],
  ['cotton-poplin-organic', 'Cotton Poplin (organic)', {}],
  ['cotton-poplin-stretch', 'Cotton Poplin (2% elastane)', { stretch: 0.75 }, 'Comfort stretch; needs stretch-aware sewing.'],
  ['cotton-poplin-noniron', 'Cotton Poplin (non-iron / easy-care)', { bend: 0.22 }, 'Resin finish; crisp, low wrinkle.'],
]);
family('oxford-cloth', 'Oxford Cloth', 'Woven', 'Cotton', [140, 0.97, 0.75, 0.24, 0.02, 0.5, 0.4], { color: '#bcd0e8', roughness: 0.92, pattern: 'canvas', patternScale: 9 }, WOVEN({ stitch: 'felled-seam', spi: 14, uses: 'Button-down shirts' }), [
  ['oxford-pinpoint', 'Oxford (pinpoint)', { gsm: 120, rough: 0.8, scale: 14 }, 'Finer, smoother; dressier than standard oxford.'],
  ['oxford-royal', 'Oxford (royal)', { gsm: 125, rough: 0.7, sheen: 0.4 }, 'Pronounced basket weave with sheen.'],
]);
family('chambray', 'Chambray', 'Woven', 'Cotton', [140, 0.96, 0.7, 0.2, 0.02, 0.5, 0.4], { color: '#7f9cc0', roughness: 0.9, pattern: 'plain', patternScale: 9, fx: 'slub' }, WOVEN({ stitch: 'felled-seam', uses: 'Work shirts, dresses' }));
family('flannel', 'Cotton Flannel (plaid)', 'Woven', 'Cotton', [200, 0.95, 0.7, 0.25, 0.025, 0.6, 0.8], { color: '#ffffff', roughness: 0.95, sheen: 0.4, pattern: 'plaid', patternScale: 1.2, patternColors: ['#9b1c1c', '#1d2a44', '#e8d9b0'] }, WOVEN({ stitch: 'felled-seam', uses: 'Overshirts, pyjamas' }), [
  ['flannel-brushed', 'Cotton Flannel (double-brushed)', { gsm: 220, fx: 'fuzzy' }, 'Brushed both sides; extra soft and warm.'],
  ['flannel-buffalo', 'Cotton Flannel (buffalo check)', { colors: ['#b01818', '#111111', '#b01818'] }],
]);
family('cotton-twill', 'Cotton Twill (chino)', 'Woven', 'Cotton', [250, 0.98, 0.8, 0.4, 0.025, 0.55, 0.7], { color: '#c2ad86', roughness: 0.9, pattern: 'twill', patternScale: 8 }, WOVEN({ stitch: 'safety-516', spi: 11, needle: 'Sharp 90/14', uses: 'Chinos, shorts, workwear' }), [
  ['cotton-twill-stretch', 'Cotton Twill (stretch, 2% elastane)', { stretch: 0.8 }],
  ['cotton-twill-garmentdyed', 'Cotton Twill (garment-dyed)', { fx: 'mottled' }, 'Dyed after sewing: soft hand, lived-in tonal variation.'],
  ['cotton-twill-peached', 'Cotton Twill (peached)', { rough: 1.0, fx: 'fuzzy' }, 'Sanded surface: suede-like hand.'],
]);
family('cotton-gabardine', 'Cotton Gabardine', 'Woven', 'Cotton', [230, 0.99, 0.85, 0.42, 0.025, 0.5, 0.6], { color: '#b9a37a', roughness: 0.75, sheen: 0.3, pattern: 'twill', patternScale: 14 }, WOVEN({ uses: 'Trench coats, Harringtons, uniforms' }), [
  ['cotton-gabardine-dwr', 'Cotton Gabardine (water-repellent DWR)', {}, 'Durable water repellent finish; ask for PFC-free C0 DWR.'],
]);
family('canvas', 'Cotton Canvas / Duck', 'Woven', 'Cotton', [340, 1.0, 0.9, 0.7, 0.03, 0.6, 1.0], { color: '#c9b48a', roughness: 1.0, sheen: 0, pattern: 'canvas', patternScale: 3 }, WOVEN({ stitch: 'felled-seam', thread: 'poly-corespun-heavy', needle: 'Jeans 100/16-110/18', spi: 8, uses: 'Workwear, chore coats, bags, hats' }), [
  ['canvas-12oz', 'Cotton Duck (12 oz)', { gsm: 400, bend: 0.8 }],
  ['canvas-washed', 'Cotton Canvas (washed)', { bend: 0.5, fx: 'mottled' }],
]);
family('waxed-cotton', 'Waxed Cotton', 'Coated', 'Cotton + paraffin wax', [270, 1.0, 0.9, 0.62, 0.03, 0.45, 0.8], { color: '#3a4632', roughness: 0.45, sheen: 0.4, pattern: 'canvas', patternScale: 6, fx: 'waxed' }, WOVEN({ stitch: 'lockstitch-301', thread: 'poly-corespun-heavy', spi: 9, care: 'Do not wash; sponge clean, re-wax yearly', uses: 'Field jackets, bags' }), [
  ['waxed-cotton-dry', 'Waxed Cotton (dry wax)', { rough: 0.6, sheen: 0.25 }, 'Less tacky, matte; modern finish.'],
]);
family('cotton-ripstop', 'Cotton Ripstop', 'Woven', 'Cotton', [220, 0.99, 0.85, 0.38, 0.025, 0.55, 0.6], { color: '#4a5240', roughness: 0.92, pattern: 'ripstop', patternScale: 4 }, WOVEN({ stitch: 'felled-seam', uses: 'Cargo pants, military' }));
family('corduroy', 'Corduroy (wide wale)', 'Pile', 'Cotton', [320, 0.97, 0.8, 0.45, 0.03, 0.65, 1.6], { color: '#8a5a2b', roughness: 0.8, sheen: 0.6, pattern: 'corduroy', patternScale: 2.5 }, WOVEN({ press: 'Steam from the back, never flatten the pile', uses: 'Trousers, collars, jackets' }), [
  ['corduroy-pinwale', 'Corduroy (pinwale / needlecord)', { gsm: 240, scale: 7, bend: 0.3 }],
]);

// ---------------- Denim ----------------
family('denim', 'Denim 12 oz', 'Woven', 'Cotton', [400, 1.0, 0.85, 0.55, 0.03, 0.6, 1.0], { color: '#2f4a73', roughness: 0.95, sheen: 0.1, sheenColor: '#9fb4d6', pattern: 'denim', patternScale: 5 }, WOVEN({ stitch: 'felled-seam', thread: 'poly-corespun-heavy', needle: 'Jeans 100/16', spi: 9, care: 'Wash cold, inside out', uses: 'Jeans, jackets, skirts' }), [
  ['denim-raw', 'Denim (raw / rigid, unwashed)', { color: '#1d2f52', bend: 0.6 }, 'Unwashed, unsanforized: shrinks ~7-10% and fades to the wearer.'],
  ['denim-japanese-selvedge', 'Denim (Japanese selvedge, shuttle-loomed)', { gsm: 470, color: '#1b2c4e', fx: 'selvedge', bend: 0.62 }, 'Slow shuttle looms (e.g. Okayama region mills), rope-dyed indigo, clean selvedge edge used on the outseam.'],
  ['denim-selvedge-us', 'Denim (US-style selvedge)', { gsm: 440, fx: 'selvedge' }],
  ['denim-stretch', 'Denim (stretch, 2-3% elastane)', { gsm: 340, stretch: 0.7, bend: 0.35 }, 'Comfort/power stretch; skinny fits.'],
  ['denim-stonewashed', 'Denim (stone-washed)', { color: '#4f6c96', fx: 'faded', bend: 0.45 }, 'Washed with pumice for softness and a lighter, worn look.'],
  ['denim-acidwash', 'Denim (acid / snow wash)', { color: '#7d93b5', fx: 'mottled', bend: 0.42 }, 'Pumice soaked in bleach: high-contrast marbled fade.'],
  ['denim-distressed', 'Denim (distressed / destroyed)', { color: '#5a77a1', fx: 'distressed', bend: 0.42 }, 'Abrasion, whiskers, rips added by laser or hand.'],
  ['denim-black', 'Denim (black, sulphur-dyed)', { color: '#1e1f24' }],
  ['denim-white', 'Denim (white / ecru)', { color: '#efece3' }],
  ['denim-heavy', 'Denim (heavyweight 21 oz)', { gsm: 710, bend: 0.85, thicknessMm: 1.6 }, 'Very stiff; long break-in.'],
  ['denim-recycled', 'Denim (recycled cotton blend)', { fx: 'slub' }],
]);

// ---------------- Linen, hemp ----------------
family('linen', 'Linen', 'Woven', 'Flax', [170, 0.97, 0.75, 0.3, 0.025, 0.55, 0.5], { color: '#d8cdb5', roughness: 0.97, sheen: 0.15, pattern: 'canvas', patternScale: 4, fx: 'slub' }, WOVEN({ stitch: 'french-seam', finish: 'french-seam', care: 'Wash 40 °C; wrinkles are normal', uses: 'Summer shirts, dresses, suits' }), [
  ['linen-washed', 'Linen (stone-washed)', { bend: 0.18, fx: 'crinkle' }, 'Pre-washed: soft, relaxed, pre-shrunk.'],
  ['linen-irish', 'Linen (Irish / Belgian, long-line flax)', { gsm: 190, rough: 0.9 }, 'Long-line European flax: smoother yarns, crisp hand.'],
  ['linen-cotton', 'Linen-Cotton blend (55/45)', { bend: 0.22 }, 'Less wrinkling than pure linen, cheaper.'],
]);
family('hemp', 'Hemp Canvas', 'Woven', 'Hemp', [250, 0.98, 0.85, 0.45, 0.03, 0.6, 0.8], { color: '#bfb08d', roughness: 1.0, pattern: 'canvas', patternScale: 4, fx: 'slub' }, WOVEN({ uses: 'Workwear, sustainable basics' }));

// ---------------- Silk ----------------
family('silk-charmeuse', 'Silk Charmeuse', 'Woven', 'Silk', [70, 0.9, 0.35, 0.02, 0.012, 0.15, 0.15], { color: '#b5243f', roughness: 0.35, metalness: 0.05, sheen: 1.0, sheenColor: '#ffd6de', pattern: 'satin', patternScale: 12 }, WOVEN({ stitch: 'french-seam', finish: 'rolled-hem', thread: 'silk-filament', needle: 'Microtex 60/8', spi: 16, press: 'Low heat, press cloth', care: 'Hand wash cold or dry clean', uses: 'Slip dresses, blouses, lingerie' }), [
  ['silk-charmeuse-mulberry-6a', 'Silk Charmeuse (mulberry grade 6A, 22 momme)', { gsm: 95, sheen: 1.0 }, 'Highest grade filament silk; momme = weight (19-25 typical).'],
  ['silk-sandwashed', 'Silk Charmeuse (sand-washed)', { rough: 0.6, sheen: 0.6 }, 'Matte, peach-skin hand.'],
]);
family('silk-twill', 'Silk Twill', 'Woven', 'Silk', [80, 0.95, 0.5, 0.06, 0.015, 0.2, 0.2], { color: '#1f3a6b', roughness: 0.45, sheen: 0.8, pattern: 'twill', patternScale: 16 }, WOVEN({ stitch: 'french-seam', finish: 'rolled-hem', thread: 'silk-filament', needle: 'Microtex 60/8', uses: 'Scarves, ties, pocket squares' }));
family('silk-satin', 'Silk Duchess Satin', 'Woven', 'Silk', [150, 0.97, 0.7, 0.3, 0.02, 0.2, 0.35], { color: '#111111', roughness: 0.25, sheen: 1.0, pattern: 'satin', patternScale: 14 }, WOVEN({ thread: 'silk-filament', uses: 'Bow ties, lapel facings, eveningwear' }));
family('silk-crepe', 'Silk Crêpe de Chine', 'Woven', 'Silk', [60, 0.9, 0.35, 0.02, 0.015, 0.25, 0.15], { color: '#e8d6c0', roughness: 0.6, sheen: 0.5, pattern: 'plain', patternScale: 16 }, WOVEN({ stitch: 'french-seam', uses: 'Blouses, dresses' }));
family('silk-dupioni', 'Silk Dupioni', 'Woven', 'Silk', [110, 0.98, 0.8, 0.35, 0.02, 0.3, 0.3], { color: '#c4a53a', roughness: 0.4, metalness: 0.1, sheen: 0.9, pattern: 'plain', patternScale: 6, fx: 'slub' }, WOVEN({ uses: 'Eveningwear, bridal' }));

// ---------------- Cellulosics ----------------
family('viscose-challis', 'Viscose Challis', 'Woven', 'Viscose', [110, 0.92, 0.4, 0.03, 0.02, 0.3, 0.25], { color: '#2f6b5e', roughness: 0.7, sheen: 0.4, pattern: 'plain', patternScale: 12 }, WOVEN({ stitch: 'french-seam', care: 'Cold wash, may shrink 3-5%', uses: 'Camp shirts, flowy dresses, skirts' }), [
  ['lyocell-twill', 'Lyocell / Tencel twill', { gsm: 180, bend: 0.1, sheen: 0.5 }, 'Closed-loop solvent spinning; ask for brand licence if marketing it by name.'],
  ['cupro', 'Cupro', { gsm: 100, sheen: 0.8 }, 'Silky, breathable; linings and blouses.'],
  ['bamboo-viscose', 'Bamboo viscose', { gsm: 160 }, 'Labelled as "viscose from bamboo" in the US (FTC).'],
  ['acetate-satin', 'Acetate satin (lining)', { gsm: 80, rough: 0.3, sheen: 0.9 }, 'Classic jacket lining.'],
]);

// ---------------- Wool ----------------
family('wool-worsted-suiting', 'Worsted Wool Suiting (Super 110s)', 'Woven', 'Wool', [260, 0.97, 0.8, 0.4, 0.03, 0.6, 0.7], { color: '#2c3038', roughness: 0.82, sheen: 0.35, sheenColor: '#8a8f9c', pattern: 'twill', patternScale: 9 }, WOVEN({ thread: 'poly-filament-fine', spi: 14, interfacing: 'Floating chest canvas (hair/horsehair) or fusible for fused construction', press: 'Steam + clapper, wool setting', care: 'Dry clean', uses: 'Suits, blazers, trousers, skirts' }), [
  ['wool-virgin', 'Virgin Wool Suiting', { gsm: 280 }, 'Never-before-processed (not recycled) wool; "virgin" / "new" wool label.'],
  ['wool-super130', 'Worsted Wool (Super 130s)', { gsm: 240, rough: 0.7, sheen: 0.45 }, 'Finer fibre (≈17.5 µm): softer drape, more delicate.'],
  ['wool-super150', 'Worsted Wool (Super 150s)', { gsm: 220, rough: 0.6, sheen: 0.55, bend: 0.3 }, 'Luxury handle; less hard-wearing.'],
  ['wool-tropical', 'Tropical wool (high-twist 4-season)', { gsm: 210, bend: 0.32 }, 'Open weave, crease-resistant; travel suits.'],
  ['wool-recycled', 'Recycled wool blend', { gsm: 300, rough: 0.95 }, 'Regenerated fibre; ask for GRS / RWS certification.'],
  ['wool-pinstripe', 'Worsted wool (pinstripe)', { pattern: 'pinstripe', scale: 7 }],
  ['wool-glencheck', 'Worsted wool (glen check)', { pattern: 'plaid', scale: 3, colors: ['#4a4d52', '#7b7f86', '#2a2d33'] }],
]);
family('wool-flannel', 'Wool Flannel', 'Woven', 'Wool', [320, 0.96, 0.75, 0.4, 0.03, 0.65, 1.0], { color: '#6e7076', roughness: 0.98, sheen: 0.25, pattern: 'plain', patternScale: 8, fx: 'fuzzy' }, WOVEN({ thread: 'poly-filament-fine', care: 'Dry clean', uses: 'Winter suits, trousers' }));
family('wool-barathea', 'Wool Barathea', 'Woven', 'Wool', [300, 0.98, 0.85, 0.45, 0.03, 0.6, 0.8], { color: '#121214', roughness: 0.8, sheen: 0.3, pattern: 'twill', patternScale: 12 }, WOVEN({ uses: 'Dinner jackets, uniforms' }));
family('wool-melton', 'Wool Melton', 'Woven', 'Wool', [600, 1.0, 0.92, 0.72, 0.035, 0.7, 2.2], { color: '#23283a', roughness: 1.0, sheen: 0.15, pattern: 'plain', patternScale: 8, fx: 'fuzzy' }, WOVEN({ stitch: 'lockstitch-301', finish: 'bound-seam', needle: 'Sharp 100/16', spi: 10, care: 'Dry clean', uses: 'Overcoats, peacoats, varsity bodies' }), [
  ['wool-melton-recycled', 'Wool Melton (recycled)', {}],
  ['wool-boiled', 'Boiled wool', { gsm: 450, stretch: 0.85, fx: 'fuzzy' }, 'Felted knit: wind-resistant, raw edges will not fray.'],
]);
family('wool-cashmere-coating', 'Wool-Cashmere Coating (90/10)', 'Woven', 'Wool / cashmere', [520, 0.99, 0.85, 0.55, 0.035, 0.6, 2.0], { color: '#b08a62', roughness: 0.9, sheen: 0.5, pattern: 'twill', patternScale: 6, fx: 'fuzzy' }, WOVEN({ care: 'Dry clean', uses: 'Luxury overcoats' }));
family('wool-cashmere', 'Cashmere (knit / woven scarf)', 'Woven', 'Cashmere', [250, 0.85, 0.5, 0.06, 0.025, 0.6, 1.5], { color: '#7a1f2b', roughness: 0.92, sheen: 0.6, pattern: 'twill', patternScale: 6, fx: 'fuzzy' }, WOVEN({ care: 'Hand wash cold, dry flat', uses: 'Scarves, knitwear' }), [
  ['cashmere-grade-a', 'Cashmere (grade A, 2-ply, 15.5 µm)', { gsm: 260 }, 'Longest, finest fibres; low pilling.'],
  ['mohair', 'Mohair', { fx: 'fuzzy', sheen: 0.8 }],
  ['alpaca', 'Alpaca', { color: '#c9b9a3' }],
  ['camel-hair', 'Camel hair', { color: '#b28a5c' }],
  ['lambswool', 'Lambswool', { rough: 1.0 }, 'First shearing; soft, slightly fuzzy.'],
]);
family('tweed', 'Tweed', 'Woven', 'Wool', [380, 0.98, 0.85, 0.6, 0.03, 0.7, 1.4], { color: '#7a6a55', roughness: 1.0, sheen: 0.2, pattern: 'tweed', patternScale: 4 }, WOVEN({ uses: 'Sport coats, caps, skirts' }), [
  ['tweed-harris-style', 'Tweed (hand-woven island style)', { gsm: 470 }, 'Hand-woven in the Outer Hebrides tradition; the Harris Tweed® orb mark requires certification.'],
  ['tweed-donegal', 'Tweed (Donegal fleck)', { color: '#5f6a5a' }],
  ['tweed-herringbone', 'Tweed (herringbone)', { pattern: 'herringbone', scale: 4 }],
]);
family('wool-knit-tie', 'Knit tie (silk/wool)', 'Knit', 'Silk / wool', [220, 0.75, 0.5, 0.15, 0.025, 0.6, 1.4], { color: '#1c2b4a', roughness: 0.9, pattern: 'knit', patternScale: 6 }, KNIT({ uses: 'Knit ties' }));

// ---------------- Synthetics & technical ----------------
family('polyester-satin', 'Polyester Satin', 'Woven', 'Polyester', [110, 0.95, 0.5, 0.08, 0.015, 0.2, 0.25], { color: '#d9c38a', roughness: 0.25, metalness: 0.15, sheen: 0.9, sheenColor: '#fff3cc', pattern: 'satin', patternScale: 12 }, WOVEN({ stitch: 'french-seam', uses: 'Eveningwear, linings' }), [
  ['polyester-recycled', 'Recycled polyester (rPET)', {}, 'From PET bottles; ask for GRS certification.'],
  ['polyester-crepe', 'Polyester crêpe', { rough: 0.7, sheen: 0.3, pattern: 'plain' }],
]);
family('polyester-woven-stretch', 'Polyester Stretch Woven', 'Woven', 'Polyester / elastane', [130, 0.75, 0.5, 0.1, 0.02, 0.35, 0.3], { color: '#1e2a3a', roughness: 0.5, sheen: 0.4, pattern: 'plain', patternScale: 14 }, WOVEN({ stitch: 'flatlock-607', uses: 'Running shorts, activewear' }));
family('nylon-satin', 'Nylon Flight Satin', 'Woven', 'Nylon', [120, 0.98, 0.7, 0.2, 0.02, 0.25, 0.3], { color: '#3c4a2e', roughness: 0.35, sheen: 0.8, pattern: 'satin', patternScale: 14 }, WOVEN({ thread: 'nylon-bonded-fine', uses: 'Bomber jackets' }));
family('nylon-ripstop', 'Nylon Ripstop', 'Woven', 'Nylon', [70, 0.99, 0.75, 0.12, 0.03, 0.25, 0.15], { color: '#e06c1a', roughness: 0.5, sheen: 0.5, pattern: 'ripstop', patternScale: 6 }, WOVEN({ thread: 'nylon-bonded-fine', needle: 'Microtex 70/10', uses: 'Outerwear, packable layers' }), [
  ['nylon-ripstop-quilted', 'Nylon Ripstop (down-quilted)', { gsm: 220, bend: 0.5, thicknessMm: 18, fx: 'quilted', color: '#151515' }, 'Channel-quilted with down or synthetic fill; baffles sewn or ultrasonically welded.'],
]);
family('nylon-taslan', 'Nylon Taslan', 'Woven', 'Nylon', [110, 0.99, 0.75, 0.18, 0.03, 0.4, 0.3], { color: '#2c5b8a', roughness: 0.8, pattern: 'plain', patternScale: 12 }, WOVEN({ uses: 'Windbreakers, anoraks' }));
family('cotton-nylon-blend', 'Cotton-Nylon (NYCO) Twill', 'Woven', 'Cotton / nylon', [260, 0.99, 0.85, 0.42, 0.03, 0.55, 0.7], { color: '#5d6b4f', roughness: 0.85, pattern: 'twill', patternScale: 8 }, WOVEN({ uses: 'Parkas, field gear' }));
family('waterproof-3l', 'Waterproof-breathable 3L (ePTFE membrane)', 'Technical', 'Nylon + ePTFE membrane', [180, 1.0, 0.85, 0.35, 0.03, 0.35, 0.5], { color: '#1f2b33', roughness: 0.6, sheen: 0.3, pattern: 'plain', patternScale: 12 }, WOVEN({ stitch: 'lockstitch-301', finish: 'seam-tape', thread: 'nylon-bonded-fine', needle: 'Microtex 70/10 (fewest holes)', spi: 10, care: 'Wash 30 °C with tech wash, tumble low to reactivate DWR', uses: 'Shell jackets (seams must be taped)' }), [
  ['waterproof-pu-3l', 'Waterproof 3L (hydrophilic PU membrane, PFAS-free)', { fiber: 'Nylon + PU membrane' }, '20,000 mm / 15,000 g: PFAS-free alternative to ePTFE.'],
  ['waterproof-nanofiber-3l', 'Waterproof 3L (electrospun nanofibre, air-permeable)', { gsm: 150, fiber: 'Nylon + nanofibre PU membrane' }, 'Highest breathability; air-permeable membrane category.'],
  ['waterproof-2l', 'Waterproof 2L (microporous PU + mesh liner)', { gsm: 160, bend: 0.25, fiber: 'Polyester + PU membrane' }, 'Softer, quieter, mid price; needs a hanging liner.'],
  ['waterproof-25l', 'Waterproof 2.5L (printed PU)', { gsm: 110, bend: 0.2, sheen: 0.45, fiber: 'Nylon + PU coating' }, 'Lightest and most packable; less durable inside.'],
  ['tpu-laminate', 'TPU-laminated nylon', { gsm: 200, rough: 0.4, sheen: 0.5, fiber: 'Nylon + TPU' }, 'Weldable, PFAS-free; bags, dry bags, rain gear.'],
  ['pvc-rain', 'PVC-coated polyester (rainwear)', { gsm: 300, rough: 0.15, sheen: 0.2, color: '#f2c200', fiber: 'Polyester + PVC' }, 'Fully waterproof, zero breathability; RF-weld or tape seams.'],
  ['rubberised-cotton', 'Rubberised cotton (mackintosh)', { gsm: 330, bend: 0.5, color: '#4a4a3c', rough: 0.5, fiber: 'Cotton + rubber' }, 'Heritage raincoats: glued and taped seams.'],
  ['ventile-type', 'Densely woven long-staple cotton (weatherproof)', { gsm: 220, rough: 0.85, sheen: 0.2, color: '#6a6f4c', fiber: 'Cotton' }, 'Fibres swell when wet: natural, breathable, quiet (Ventile®-type).'],
  ['softshell', 'Softshell (bonded fleece back)', { gsm: 300, stretch: 0.8, bend: 0.4, fiber: 'Polyester / elastane + membrane' }],
]);
family('mesh', 'Polyester Mesh', 'Knit', 'Polyester', [90, 0.6, 0.4, 0.05, 0.04, 0.3, 0.4], { color: '#e9e9e9', roughness: 0.7, opacity: 0.75, pattern: 'mesh', patternScale: 10 }, KNIT({ uses: 'Linings, jerseys, panels' }));
family('lame-metallic', 'Metallic Lamé', 'Woven', 'Polyester / metallised film', [120, 0.97, 0.7, 0.15, 0.02, 0.2, 0.3], { color: '#d4af37', roughness: 0.25, metalness: 0.9, sheen: 0.4, pattern: 'plain', patternScale: 14 }, WOVEN({ uses: 'Eveningwear, stage' }));
family('sequin-fabric', 'Sequin fabric (on mesh)', 'Embellished', 'Polyester', [300, 0.8, 0.5, 0.2, 0.03, 0.3, 1.5], { color: '#c0c6d1', roughness: 0.15, metalness: 0.9, pattern: 'sequin', patternScale: 6 }, WOVEN({ stitch: 'lockstitch-301', press: 'Do not press sequins', uses: 'Party dresses' }));

// ---------------- Pile / fur ----------------
family('velvet', 'Velvet', 'Pile', 'Viscose / silk', [300, 0.9, 0.6, 0.25, 0.03, 0.65, 1.5], { color: '#3b1250', roughness: 0.75, sheen: 1.0, sheenColor: '#c58ce0', pattern: 'velvet', patternScale: 8 }, WOVEN({ press: 'Needle board only', uses: 'Blazers, dresses, eveningwear' }), [
  ['velvet-silk', 'Velvet (silk-viscose)', { gsm: 220, bend: 0.12 }],
  ['velveteen', 'Velveteen (cotton)', { gsm: 320, bend: 0.35, sheen: 0.7 }],
  ['velvet-crushed', 'Crushed velvet (stretch)', { stretch: 0.6, fx: 'crushed' }],
]);
family('faux-fur', 'Faux Fur', 'Pile', 'Modacrylic', [600, 0.9, 0.6, 0.5, 0.05, 0.8, 25], { color: '#d8cbb8', roughness: 1.0, sheen: 0.6, pattern: 'velvet', patternScale: 2, fx: 'fuzzy' }, WOVEN({ stitch: 'overlock-504', uses: 'Collars, coats, trims (cut from the back with a blade)' }));
family('terry', 'Terry Towelling', 'Pile', 'Cotton', [400, 0.85, 0.6, 0.3, 0.04, 0.8, 3], { color: '#f2efe8', roughness: 1.0, pattern: 'waffle', patternScale: 8, fx: 'fuzzy' }, KNIT({ stitch: 'overlock-504', uses: 'Robes, resort shirts' }));

// ---------------- Sheer & lace ----------------
family('chiffon', 'Chiffon', 'Sheer', 'Polyester / silk', [40, 0.85, 0.3, 0.01, 0.04, 0.2, 0.1], { color: '#f0c7d8', roughness: 0.6, sheen: 0.6, opacity: 0.55, pattern: 'plain', patternScale: 14 }, WOVEN({ stitch: 'french-seam', finish: 'rolled-hem', needle: 'Microtex 60/8', uses: 'Overlays, blouses, maxi skirts' }), [
  ['georgette', 'Georgette', { gsm: 60, opacity: 0.65, rough: 0.75 }],
  ['voile', 'Cotton voile', { gsm: 60, opacity: 0.7, rough: 0.85 }],
]);
family('organza', 'Organza', 'Sheer', 'Silk / polyester', [35, 0.98, 0.85, 0.35, 0.04, 0.25, 0.1], { color: '#ffffff', roughness: 0.3, metalness: 0.1, sheen: 0.8, opacity: 0.4, pattern: 'plain', patternScale: 16 }, WOVEN({ stitch: 'french-seam', uses: 'Structured overlays, bridal' }));
family('tulle', 'Tulle', 'Sheer', 'Nylon', [20, 0.8, 0.4, 0.08, 0.06, 0.25, 0.1], { color: '#f7eef2', roughness: 0.6, opacity: 0.35, pattern: 'mesh', patternScale: 14 }, WOVEN({ stitch: 'lockstitch-301', finish: 'raw', uses: 'Petticoats, veils, skirts' }));
family('lace', 'Lace (Chantilly)', 'Sheer', 'Nylon / cotton', [90, 0.7, 0.4, 0.05, 0.03, 0.3, 0.4], { color: '#fbf7f0', roughness: 0.7, sheen: 0.4, pattern: 'lace', patternScale: 3 }, WOVEN({ stitch: 'zigzag-304', finish: 'lapped', uses: 'Lingerie, overlays, bridal' }), [
  ['lace-guipure', 'Lace (guipure)', { gsm: 200, bend: 0.25, scale: 2 }],
  ['lace-corded', 'Lace (corded / re-embroidered)', { gsm: 140, bend: 0.12 }],
  ['lace-stretch', 'Stretch lace (Leavers-style / raschel)', { gsm: 110, stretch: 0.35, bend: 0.03 }, 'Elastic lace for bralettes and briefs; scalloped edges are used as hems.'],
]);

// ---------------- Intimates / lingerie ----------------
family('microfiber-jersey', 'Microfibre Jersey (nylon / elastane 80/20)', 'Knit', 'Nylon / elastane', [180, 0.25, 0.25, 0.03, 0.015, 0.3, 0.4], { color: '#e9c9b5', roughness: 0.45, sheen: 0.7, pattern: 'knit', patternScale: 16 }, KNIT({ stitch: 'flatlock-607', hem: 'laser-cut', thread: 'nylon-textured', needle: 'Ball point 70/10', uses: 'Briefs, bras, bodysuits, seamless intimates' }), [
  ['microfiber-recycled', 'Microfibre Jersey (recycled nylon)', {}, 'Recycled nylon 6 / 6.6; ask for GRS.'],
  ['microfiber-poly', 'Microfibre Jersey (polyester / elastane)', { gsm: 170 }, 'Cheaper, sublimation-printable.'],
  ['cotton-elastane-jersey', 'Cotton-elastane jersey (95/5)', { gsm: 190, rough: 0.9, sheen: 0.3, color: '#f2f0ea', pattern: 'knit', scale: 10 }, 'Classic cotton briefs and boxer briefs.'],
  ['modal-elastane', 'Modal-elastane jersey (92/8)', { gsm: 170, rough: 0.55, sheen: 0.6, color: '#2b2f36' }, 'Softest everyday underwear; premium trunks.'],
  ['merino-underwear', 'Merino-elastane (sports underwear)', { gsm: 160, rough: 0.85, color: '#3b3f46' }, 'Odour resistant, warm; outdoor base layers.'],
]);
family('power-mesh', 'Power Mesh', 'Sheer', 'Nylon / elastane', [130, 0.2, 0.2, 0.02, 0.03, 0.3, 0.3], { color: '#f2d6cf', roughness: 0.6, sheen: 0.4, opacity: 0.7, pattern: 'mesh', patternScale: 16 }, KNIT({ stitch: 'zigzag-304', thread: 'nylon-textured', uses: 'Bra wings, shapewear, sheer panels' }));
family('bra-foam', 'Bra Cup Foam (laminated spacer)', 'Technical', 'Polyurethane foam + tricot', [250, 0.85, 0.7, 0.55, 0.04, 0.4, 3], { color: '#f0d8cc', roughness: 0.6, sheen: 0.4, pattern: 'knit', patternScale: 18 }, WOVEN({ stitch: 'zigzag-304', finish: 'bias-binding', uses: 'Moulded / T-shirt bra cups (heat-moulded)' }));
family('stretch-satin', 'Stretch Satin (charmeuse / elastane)', 'Woven', 'Polyester / elastane', [120, 0.7, 0.4, 0.06, 0.015, 0.2, 0.25], { color: '#b0234b', roughness: 0.25, sheen: 1.0, sheenColor: '#ffd1de', pattern: 'satin', patternScale: 14 }, WOVEN({ stitch: 'zigzag-304', finish: 'picot-edge', uses: 'Lingerie, slips, camisoles' }));

// ---------------- Millinery ----------------
family('wool-felt', 'Wool Felt (hat body)', 'Non-woven', 'Wool', [450, 1.0, 0.95, 0.75, 0.03, 0.7, 2.0], { color: '#3a3330', roughness: 0.95, sheen: 0.3, pattern: 'plain', patternScale: 8, fx: 'fuzzy' }, WOVEN({ stitch: 'lockstitch-301', finish: 'raw', press: 'Steam and block on a hat block', uses: 'Fedoras, trilbies, berets' }), [
  ['fur-felt', 'Fur felt (rabbit / beaver blend)', { gsm: 400, rough: 0.8, sheen: 0.5 }, 'Denser, smoother, more water-resistant than wool felt; premium hats.'],
]);
family('straw', 'Toquilla Straw (Panama)', 'Non-woven', 'Toquilla palm', [300, 1.0, 0.95, 0.8, 0.03, 0.6, 1.0], { color: '#e6d6a8', roughness: 0.85, pattern: 'canvas', patternScale: 6 }, WOVEN({ stitch: 'lockstitch-301', finish: 'raw', uses: 'Panamas, boaters, summer hats' }), [
  ['straw-paper', 'Paper straw (braid)', { color: '#d8c58f' }, 'Cheaper, lighter; avoid rain.'],
]);
family('nylon-ballistic', 'Ballistic Nylon (1680D)', 'Woven', 'Nylon 6.6', [500, 1.0, 0.9, 0.6, 0.03, 0.5, 0.9], { color: '#151515', roughness: 0.7, sheen: 0.3, pattern: 'canvas', patternScale: 7 }, WOVEN({ thread: 'nylon-bonded', needle: 'Sharp 110/18', spi: 8, uses: 'Backpacks, luggage, slings' }), [
  ['cordura-500d', 'Nylon 500D (Cordura® type)', { gsm: 280, bend: 0.45 }, 'Abrasion-resistant air-textured nylon; "CORDURA" is a licensed brand.'],
]);

// ---------------- Leather & alternatives ----------------
const LEATHER = (o = {}) => ({ stitch: 'lockstitch-301', finish: 'glued-folded', thread: 'nylon-bonded', needle: 'Leather (wedge) point 100/16-110/18', spi: 7, interfacing: 'Leather tape at zips and shoulders', press: 'No steam; mallet / roller seams open with glue', care: 'Specialist leather clean', uses: 'Jackets, trousers, accessories', ...o });
family('leather-lambskin', 'Lambskin Leather (0.7 mm)', 'Leather', 'Lamb hide', [550, 0.98, 0.9, 0.55, 0.03, 0.5, 0.8], { color: '#1b1714', roughness: 0.5, sheen: 0.3, sheenColor: '#8a6650', pattern: 'leather', patternScale: 3 }, LEATHER(), [
  ['leather-lambskin-washed', 'Lambskin (washed / vintage)', { rough: 0.75, fx: 'faded' }],
]);
family('leather-cowhide', 'Cowhide Leather (1.2 mm)', 'Leather', 'Cow hide', [900, 0.99, 0.95, 0.82, 0.03, 0.5, 1.2], { color: '#141210', roughness: 0.45, sheen: 0.35, pattern: 'leather', patternScale: 2 }, LEATHER(), [
  ['leather-full-grain', 'Cowhide (full-grain, vegetable tanned)', { color: '#6b3d1f', rough: 0.55 }, 'Top layer with natural grain intact; develops patina. Veg-tan uses tree tannins.'],
  ['leather-top-grain', 'Cowhide (top-grain, chrome tanned, corrected)', {}, 'Sanded and finished; uniform look, cheaper.'],
  ['leather-horsehide', 'Horsehide (1.3 mm)', { gsm: 1000, bend: 0.9 }, 'Very tough; classic motorcycle jackets.'],
  ['leather-patent', 'Patent leather', { rough: 0.08, sheen: 0.2, metal: 0.1 }],
]);
family('suede', 'Suede', 'Leather', 'Split hide', [600, 0.97, 0.85, 0.45, 0.035, 0.75, 1.0], { color: '#9b6a3e', roughness: 1.0, sheen: 0.4, pattern: 'velvet', patternScale: 10 }, LEATHER({ uses: 'Jackets, shoes, trims' }), [
  ['nubuck', 'Nubuck', { color: '#7a5a3c', rough: 0.95 }],
]);
family('vegan-leather', 'Vegan Leather (PU on fabric)', 'Coated', 'Polyurethane / polyester', [450, 0.95, 0.85, 0.5, 0.03, 0.45, 0.9], { color: '#1a1a1a', roughness: 0.45, sheen: 0.3, pattern: 'leather', patternScale: 3 }, LEATHER({ thread: 'poly-corespun', uses: 'Jackets, skirts, bags' }), [
  ['bio-leather', 'Bio-based leather alternative (plant / mycelium)', { color: '#4a3324' }, 'Plant or mycelium based coatings; check bio-content % and durability data.'],
  ['pvc-vinyl', 'PVC vinyl (high gloss)', { rough: 0.1, sheen: 0.2 }],
]);

export const FABRICS = F;
export const FABRIC_FAMILIES = FAMILIES;
export const FABRIC_CATEGORIES = [...new Set(Object.values(FAMILIES).map((f) => f.category))];
export const PATTERNS = ['plain', 'twill', 'denim', 'knit', 'rib', 'satin', 'canvas', 'tweed', 'velvet', 'leather', 'plaid', 'lace', 'waffle', 'ripstop', 'corduroy', 'mesh', 'sequin', 'pinstripe', 'herringbone'];
export const FX = ['distressed', 'faded', 'slub', 'mottled', 'selvedge', 'waxed', 'quilted', 'crushed', 'fuzzy', 'crinkle'];

/** Resolve a fabric id (preset or custom) + overrides into a full definition. */
export function resolveFabric(project, fabricId, overrides = {}) {
  const base = (project.customFabrics && project.customFabrics[fabricId]) || F[fabricId] || F['cotton-jersey'];
  return { ...base, ...overrides, look: { ...base.look, ...(overrides.look || {}) } };
}
