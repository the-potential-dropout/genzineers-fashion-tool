// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Colour, dyeing, printing and painting.
 *
 * A panel's `finish` = { color, dye, print: { method, design, image?, colors?, scale?, placement? }, paint: { method, design, image?, colors? } }
 * effect keys drive the procedural texture overlay in the renderer.
 * fibers: which fibre families accept it (matched against fabric.fiber text).
 */
const CELL = ['cotton', 'linen', 'flax', 'hemp', 'viscose', 'modal', 'lyocell', 'cupro', 'bamboo', 'rayon'];
const PROTEIN = ['wool', 'silk', 'cashmere', 'mohair', 'alpaca', 'camel'];
const POLY = ['polyester'];
const NYLON = ['nylon'];
const ANY = ['*'];

const D = (name, stage, fibers, effect, use, extra = {}) => ({ name, stage, fibers, effect, use, ...extra });
export const DYES = {
  'piece-reactive': D('Piece dyeing (reactive)', 'Fabric', CELL, 'solid', 'Default for cotton/viscose solids: bright, wash-fast', { recommended: true, fastness: 'High' }),
  'yarn-dyed': D('Yarn dyeing', 'Yarn', ANY, 'solid', 'Stripes, plaids, chambray, oxford: colour goes through the yarn, highest quality', { fastness: 'High' }),
  'garment-dyed': D('Garment dyeing', 'Garment', [...CELL, ...PROTEIN, ...NYLON], 'mottled', 'Dyed after sewing: soft, vintage tonal variation; thread must be cotton or dyeable', { fastness: 'Medium', note: 'Expect 3-6% shrinkage; sew with cotton or core-spun thread so seams dye too.' }),
  'pigment-dyed': D('Pigment dyeing (garment)', 'Garment', CELL, 'faded', 'Washed-out vintage look that fades further with wear', { fastness: 'Low (by design)' }),
  'indigo-rope': D('Indigo rope dyeing', 'Yarn', ['cotton'], 'solid', 'Denim warp: ring-dyed core stays white, so it fades to the wearer', { fastness: 'Fades by design' }),
  'vat': D('Vat dyeing', 'Fabric / yarn', CELL, 'solid', 'Very high light/wash fastness (workwear, uniforms)', { fastness: 'Very high' }),
  'sulfur': D('Sulphur dyeing', 'Fabric / yarn', CELL, 'faded', 'Black/grey denim and canvas; economical, fades to grey', { fastness: 'Medium' }),
  'acid': D('Acid dyeing', 'Fabric / yarn', [...PROTEIN, ...NYLON], 'solid', 'Wool, silk and nylon: brilliant colour', { fastness: 'High' }),
  'disperse': D('Disperse dyeing', 'Fabric', [...POLY, 'acetate'], 'solid', 'The only dye class that colours polyester (high-temperature)', { fastness: 'High' }),
  'dope-dyed': D('Solution / dope dyeing', 'Fibre', [...POLY, ...NYLON, 'viscose'], 'solid', 'Colour added before spinning: ~60-90% less water, best fastness', { fastness: 'Excellent', sustainable: true }),
  'natural-indigo': D('Natural indigo (plant)', 'Any', [...CELL, ...PROTEIN], 'mottled', 'Hand-dyed blue with natural variation', { sustainable: true }),
  'natural-madder': D('Natural dyes (madder, cochineal, weld, walnut)', 'Any', [...CELL, ...PROTEIN], 'mottled', 'Earthy, unique batches; needs mordant (alum) on cellulose', { sustainable: true }),
  'tie-dye': D('Tie-dye', 'Garment', [...CELL, ...PROTEIN], 'tiedye', 'Spiral, crumple, bullseye patterns'),
  'shibori': D('Shibori (itajime / arashi / kumo)', 'Garment / fabric', [...CELL, ...PROTEIN], 'shibori', 'Japanese resist folding / binding'),
  'batik': D('Batik (wax resist)', 'Fabric', [...CELL, 'silk'], 'batik', 'Wax-resist patterns with crackle'),
  'dip-dye': D('Dip-dye / ombré', 'Garment', [...CELL, ...PROTEIN, ...NYLON], 'ombre', 'Gradient from hem upwards'),
  'space-dye': D('Space dyeing', 'Yarn', ANY, 'space', 'Multi-coloured yarn segments: heathered streaks'),
  'ice-dye': D('Ice dyeing', 'Garment', CELL, 'speckle', 'Watercolour / crystal-like speckles'),
  'overdye': D('Overdye', 'Garment', [...CELL, ...PROTEIN, ...NYLON], 'mottled', 'Dye an already-coloured or printed garment for depth'),
  'bleach-wash': D('Bleach wash / reverse dye', 'Garment', CELL, 'faded', 'Lightened, washed look; neutralise bleach after'),
  'acid-wash': D('Acid / snow wash', 'Garment', ['cotton'], 'mottled', 'High-contrast marbling on denim'),
  'enzyme-wash': D('Enzyme wash', 'Garment', CELL, 'faded', 'Softens and slightly fades; removes fuzz'),
  'stone-wash': D('Stone wash', 'Garment', ['cotton'], 'faded', 'Denim: pumice abrasion fade'),
};

const P = (name, fibers, effect, use, extra = {}) => ({ name, fibers, effect, use, ...extra });
export const PRINT_METHODS = {
  'screen-plastisol': P('Screen print (plastisol)', ANY, 'flat', 'Bold, opaque, durable; slightly rubbery hand. Best for 1-6 spot colours.', { moq: '24-50 pcs', recommended: true }),
  'screen-water': P('Screen print (water-based)', [...CELL, ...PROTEIN], 'soft', 'Soft hand, breathable; best on light/natural fabrics.', { moq: '24-50 pcs' }),
  'screen-discharge': P('Discharge print', ['cotton'], 'soft', 'Removes dye and replaces it: zero hand on dark cotton.', { moq: '50 pcs' }),
  'dtg': P('Direct-to-garment (DTG)', [...CELL], 'soft', 'Full colour, photos, no screens; great for small runs.', { moq: '1 pc' }),
  'dtf': P('Direct-to-film (DTF) transfer', ANY, 'flat', 'Full colour on almost any fabric including dark polyester.', { moq: '1 pc' }),
  'sublimation': P('Dye sublimation', [...POLY], 'soft', 'All-over full colour on white/light polyester only (≥65% poly). No hand at all.', { moq: '1 pc', warnOn: 'cotton' }),
  'htv': P('Heat-transfer vinyl (HTV)', ANY, 'flat', 'Names, numbers, simple logos; one colour per layer.', { moq: '1 pc' }),
  'rotary-screen': P('Rotary screen (yardage)', ANY, 'soft', 'Mill printing of fabric rolls: all-over repeats at volume.', { moq: '500-3000 m' }),
  'digital-textile': P('Digital textile print (reactive / pigment inkjet)', [...CELL, ...PROTEIN, ...POLY], 'soft', 'Unlimited colours, photographic repeats on yardage.', { moq: '1-100 m' }),
  'block-print': P('Hand block print', [...CELL, 'silk'], 'soft', 'Artisanal carved-block repeats (e.g. Indian dabu, ajrakh).', { moq: '50 m' }),
  'puff': P('Puff print', ANY, 'raised', 'Raised 3D foam-like ink.', { moq: '24 pcs' }),
  'high-density': P('High-density print', ANY, 'raised', 'Sharp raised edges, rubber-like.', { moq: '50 pcs' }),
  'foil': P('Foil print', ANY, 'metallic', 'Metallic / holographic foil over adhesive.', { moq: '24 pcs' }),
  'glitter': P('Glitter ink', ANY, 'metallic', 'Sparkle effect.', { moq: '24 pcs' }),
  'reflective': P('Reflective print', ANY, 'metallic', 'Glass-bead reflective ink.', { moq: '24 pcs' }),
  'flock': P('Flock print', ANY, 'raised', 'Velvety raised fibres.', { moq: '24 pcs' }),
  'burnout': P('Burnout / devoré', ['cotton', 'polyester', 'viscose', 'silk'], 'burnout', 'Chemically burns one fibre of a blend away: sheer patterns.', { moq: '100 m' }),
  'emboss': P('Embossing / debossing', ['leather', 'polyurethane', 'polyester', 'wool'], 'raised', 'Heat-pressed relief (leather, scuba, felt).', { moq: '50 pcs' }),
  'laser-etch': P('Laser etching', ['cotton', 'leather', 'polyester'], 'faded', 'Laser fades, whiskers and graphics (denim, leather, fleece).', { moq: '1 pc' }),
  'embroidery': P('Embroidery (machine)', ANY, 'raised', 'Thread-stitched logos; 3D puff embroidery available.', { moq: '12-24 pcs' }),
};

export const PRINT_DESIGNS = ['solid', 'stripes', 'breton', 'pinstripe', 'gingham', 'polka', 'camo', 'leopard', 'zebra', 'snakeskin', 'floral', 'ditsy-floral', 'paisley', 'checkerboard', 'houndstooth', 'tartan', 'argyle', 'chevron', 'zigzag', 'waves', 'hearts', 'stars', 'triangles', 'ikat', 'gradient', 'logo', 'image'];

const PT = (name, fibers, effect, use) => ({ name, fibers, effect, use });
export const PAINTS = {
  'fabric-acrylic': PT('Fabric paint (acrylic + textile medium)', ANY, 'painted', 'Hand-painted designs; heat-set to make washable'),
  'airbrush': PT('Airbrush textile paint', ANY, 'painted', 'Smooth gradients, custom one-offs'),
  'leather-paint': PT('Leather acrylic paint', ['leather', 'polyurethane'], 'painted', 'Painting leather jackets, bags, shoes (deglaze first)'),
  'spray-fabric': PT('Fabric spray paint', ANY, 'painted', 'Stencils, fades, graffiti looks'),
  'fabric-marker': PT('Fabric markers', ANY, 'painted', 'Fine lines, illustration'),
  'silk-paint': PT('Silk paint with gutta resist', ['silk'], 'painted', 'Classic hand-painted silk scarves'),
  'puff-paint': PT('3D puff paint', ANY, 'raised', 'Raised dimensional lines'),
  'bleach-paint': PT('Bleach painting', CELL, 'faded', 'Discharge designs onto dark cotton by hand'),
};

/** Does a dye / print / paint suit this fabric? Returns { ok, reason }. */
export function compatible(entry, fabric) {
  if (!entry) return { ok: true };
  if (entry.fibers.includes('*')) return { ok: true };
  const fib = (fabric.fiber || '').toLowerCase();
  const ok = entry.fibers.some((f) => fib.includes(f));
  return ok ? { ok: true } : { ok: false, reason: `${entry.name} is meant for ${entry.fibers.join(', ')}; this fabric is ${fabric.fiber}.` };
}

/** Pick the industry-default dye for a fabric. */
export function defaultDyeFor(fabric) {
  const fib = (fabric.fiber || '').toLowerCase();
  if (fabric.family === 'denim' || fabric.id?.startsWith('denim')) return 'indigo-rope';
  if (fib.includes('polyester')) return 'disperse';
  if (fib.includes('nylon') || PROTEIN.some((x) => fib.includes(x))) return 'acid';
  if (fabric.category === 'Leather') return null;
  return 'piece-reactive';
}

/** Pick the default print method for a fabric. */
export function defaultPrintFor(fabric) {
  const fib = (fabric.fiber || '').toLowerCase();
  if (fib.startsWith('polyester') && !fib.includes('/')) return 'sublimation';
  if (fabric.category === 'Leather') return 'emboss';
  if (fabric.category === 'Knit' && fib.includes('cotton')) return 'screen-water';
  return 'screen-plastisol';
}
