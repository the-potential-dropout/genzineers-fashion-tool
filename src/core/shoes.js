/**
 * Footwear: every shoe is described the way a shoemaker builds it. An upper closed from named
 * pieces (vamp, quarters, toe cap, counter, backstay, facings, tongue, collar, shaft...), lasted over
 * a last, and bottomed with a welt / midsole / outsole / heel by a named construction. Each piece can
 * take its own material and colour. Closures carry their real hardware: punched or metal eyelets,
 * D-rings, speed hooks, webbing loops, hook-and-loop straps, buckles, zips, elastic gores.
 *
 * Lengths here are centimetres unless a name ends in M (metres, handed to the 3D builder).
 */
import { FOOT, girthAt, gradePoint } from '../sim/avatar.js';

/** What the outsole, midsole and heel can be made of. look = [colour, roughness]. */
export const SOLE_MATERIALS = {
  'leather': { name: 'Leather sole (oak-bark or pit-tanned bend)', look: ['#b98a5a', 0.55], density: 1.0, desc: 'Dense vegetable-tanned sole bend, 4.5-5.5 mm, channelled and stitched.', pros: 'Breathes, moulds to the foot, elegant thin edge, can be resoled many times', cons: 'Slippery when new or wet, wears faster on wet pavement, soaks up water' },
  'rubber': { name: 'Rubber (vulcanised compound)', look: ['#1c1c1c', 0.85], density: 1.15, desc: 'Natural / SBR rubber moulded and cured.', pros: 'Grip, waterproof, hard-wearing', cons: 'Heavier, does not breathe' },
  'gum-rubber': { name: 'Gum rubber (natural, translucent honey)', look: ['#b9843c', 0.8], density: 1.0, desc: 'Uncoloured natural rubber.', pros: 'Very grippy on courts and decks, soft', cons: 'Wears quicker, picks up dirt, yellows' },
  'lug-rubber': { name: 'Lug rubber unit (deep cleated)', look: ['#2a2420', 0.9], density: 1.2, desc: 'Hard-wearing carbon rubber with 4-7 mm lugs.', pros: 'Traction on mud and rock, long life, resoleable on welted boots', cons: 'Heavy, stiff, holds stones' },
  'studded-rubber': { name: 'Studded rubber (low-profile dress sole)', look: ['#222222', 0.8], density: 1.15, desc: 'Thin rubber with small round studs.', pros: 'Wet grip while keeping a slim edge', cons: 'Less breathable than leather' },
  'crepe': { name: 'Crepe (coagulated latex)', look: ['#c9a25e', 1.0], density: 0.9, desc: 'Sheets of raw natural latex, pressed in layers.', pros: 'Very soft and quiet, great cushioning, grippy when dry', cons: 'Heavy, gets dirty and sticky in heat, poor on wet smooth floors' },
  'eva': { name: 'EVA foam', look: ['#f2f2ee', 0.9], density: 0.2, desc: 'Ethylene-vinyl acetate foam, compression or injection moulded.', pros: 'Very light, cushioned, cheap', cons: 'Compresses and loses bounce with wear, low abrasion resistance as an outsole' },
  'pu': { name: 'Polyurethane (PU)', look: ['#3a3a3a', 0.8], density: 0.55, desc: 'Poured or injected PU, often direct-attached to the upper.', pros: 'Durable cushioning, oil resistant, lighter than rubber', cons: 'Can hydrolyse and crumble after years in storage' },
  'tpu': { name: 'TPU', look: ['#d8d8d8', 0.5], density: 1.1, desc: 'Thermoplastic polyurethane, injection moulded.', pros: 'Abrasion and oil resistant, holds sharp shapes, can be clear', cons: 'Firm, slippery on wet smooth floors unless textured' },
  'tpr': { name: 'TPR (thermoplastic rubber)', look: ['#2b2b2b', 0.85], density: 0.95, desc: 'Injection-moulded rubber-like plastic.', pros: 'Cheap, flexible, easy to colour', cons: 'Wears faster than vulcanised rubber' },
  'cork': { name: 'Cork (agglomerated, latex bound)', look: ['#b88d5c', 0.95], density: 0.35, desc: 'Cork granules bound with latex: moulded footbeds and platform wedges.', pros: 'Light, moulds to the foot, absorbs shock, renewable', cons: 'Crumbles at the edges if not sealed' },
  'wood': { name: 'Wood (alder, beech, lime)', look: ['#c79a63', 0.7], density: 0.6, desc: 'Carved or turned clog bases and stacked-look heels.', pros: 'Rigid support, long life', cons: 'No flex, noisy, needs a rubber top piece' },
  'jute': { name: 'Jute rope (espadrille)', look: ['#c8ae7c', 1.0], density: 0.5, desc: 'Braided jute coiled and stitched, with a vulcanised rubber skin underneath.', pros: 'Light, breathable, the summer classic', cons: 'Must stay dry; rots if soaked' },
  'stacked-leather': { name: 'Stacked leather (heel lifts)', look: ['#8a5a34', 0.55], density: 1.0, desc: 'Layers of sole leather nailed and glued, with a rubber or leather top piece.', pros: 'Repairable, traditional', cons: 'Heavier than a plastic heel block' },
  'abs': { name: 'ABS / moulded plastic heel (covered or lacquered)', look: ['#151515', 0.3], density: 1.05, desc: 'Injection-moulded heel block with a steel pin, covered in the upper leather or lacquered.', pros: 'Strong enough for stilettos, cheap, exact shape', cons: 'Needs a replaceable top piece' },
  'translucent': { name: 'Translucent "ice" rubber', look: ['#bfe3ea', 0.35], density: 1.1, desc: 'Clear tinted rubber.', pros: 'Striking look, good court grip', cons: 'Yellows with age and UV' },
};

/** How the bottom is attached to the upper. */
export const CONSTRUCTIONS = {
  'goodyear-welt': { name: 'Goodyear welt', stitched: true, welt: true, desc: 'A leather welt is sewn to the upper and a canvas rib on the insole; the outsole is then stitched to the welt. The cavity is filled with cork.', pros: 'Resoleable many times, water resistant, the dress-shoe and boot standard', cons: 'Stiffer at first, more labour, thicker edge' },
  'storm-welt': { name: 'Storm welt (Goodyear with a raised lip)', stitched: true, welt: true, storm: true, desc: 'A welt with a turned-up ridge that seals the join between upper and welt.', pros: 'Keeps water out; country boots and brogues', cons: 'Chunkier look' },
  'norwegian': { name: 'Norwegian / Norvegese', stitched: true, welt: true, side: true, desc: 'The upper is turned outwards and stitched through its side to the insole and again to the midsole: two visible rows.', pros: 'Very water resistant, mountain-boot tradition', cons: 'Bulky, labour heavy' },
  'stitchdown': { name: 'Stitchdown / veldtschoen', stitched: true, welt: true, flange: true, desc: 'The upper is flanged outwards and stitched straight down to the midsole.', pros: 'Flexible, water sheds off the flange, resoleable', cons: 'Wide edge, needs skilled lasting' },
  'blake': { name: 'Blake stitch', stitched: false, welt: false, desc: 'One row of stitching goes through insole, upper and outsole from inside the shoe.', pros: 'Slim, light, flexible, close-cut sole', cons: 'Less water resistant, needs a Blake machine to resole' },
  'blake-rapid': { name: 'Blake-rapid', stitched: true, welt: false, desc: 'Blake stitched to a midsole, then the outsole is stitched to the midsole outside the upper.', pros: 'Resoleable like a welt with less bulk', cons: 'Stiffer than plain Blake' },
  'cemented': { name: 'Cemented (glued)', stitched: false, welt: false, desc: 'The lasted upper is roughed, primed and bonded to the sole with polyurethane or neoprene cement under a press.', pros: 'Light, cheap, any sole shape; most sneakers and fashion shoes', cons: 'Hard to resole; bond can fail with heat and age' },
  'vulcanised': { name: 'Vulcanised', stitched: false, welt: false, foxing: true, desc: 'A raw rubber outsole and foxing tape are wrapped on the lasted canvas or suede upper and cured in an autoclave.', pros: 'Very flexible, great board feel, cheap', cons: 'Little cushioning, heavier, limited to heat-proof uppers' },
  'cupsole': { name: 'Cupsole (stitched and cemented)', stitched: true, welt: false, cup: true, desc: 'A moulded rubber cup is cemented on and stitched through its sidewall to the upper.', pros: 'Durable, supportive, protects the upper edge', cons: 'Stiffer than vulcanised' },
  'strobel': { name: 'Strobel (force-lasted)', stitched: false, welt: false, desc: 'The upper is sewn to a fabric sock (the strobel board) and slipped over the last, then cemented or injected onto the midsole.', pros: 'Very flexible and light; running shoes', cons: 'Less torsional support' },
  'direct-injection': { name: 'Direct injection (moulded on)', stitched: false, welt: false, desc: 'The lasted upper is clamped in a mould and PU or rubber is injected straight onto it.', pros: 'Permanent waterproof bond; work and rain boots', cons: 'Cannot be resoled; tooling is expensive' },
  'moccasin': { name: 'True moccasin', stitched: true, welt: false, moc: true, desc: 'One piece of leather wraps under the foot and is hand-sewn to an apron (plug) on top; a sole is added underneath.', pros: 'Glove-like, very flexible', cons: 'Little structure, stretches' },
  'bologna': { name: 'Bologna (sacchetto)', stitched: false, welt: false, desc: 'The lining is sewn into a sock around the foot before Blake stitching.', pros: 'Extremely soft and flexible Italian loafers', cons: 'Delicate' },
  'turnshoe': { name: 'Turned (sewn inside out)', stitched: false, welt: false, desc: 'Upper and thin sole are sewn inside out, then turned.', pros: 'No visible sole seam; ballet flats, slippers', cons: 'Thin soles only' },
  'moulded': { name: 'One-piece moulded', stitched: false, welt: false, desc: 'The whole shoe is injection or dip moulded (rubber boots, foam clogs, slides).', pros: 'Waterproof, washable, cheap at volume', cons: 'No breathability, tooling per size' },
  'opanka': { name: 'Opanka (hand-sewn sidewall)', stitched: true, welt: false, cup: true, desc: 'Upper, sock lining and sole are sewn together in one hand-stitched seam on the outside.', pros: 'Very flexible comfort shoes and sandals', cons: 'Slow to make' },
};

export const TOE_SHAPES = {
  round: { name: 'Round', ext: 1.3, taper: 0.55, blunt: 0.0 },
  almond: { name: 'Almond', ext: 2.2, taper: 0.8, blunt: 0.0 },
  pointed: { name: 'Pointed', ext: 4.2, taper: 1.0, blunt: 0.0 },
  'extra-pointed': { name: 'Extra pointed (winklepicker)', ext: 6.5, taper: 1.0, blunt: 0.0 },
  square: { name: 'Square', ext: 1.6, taper: 0.25, blunt: 0.85 },
  chisel: { name: 'Chisel (soft square)', ext: 2.4, taper: 0.55, blunt: 0.55 },
  snub: { name: 'Snub / bulbous (work boot)', ext: 1.5, taper: 0.4, blunt: 0.2, high: 1.25 },
  'western-j': { name: 'Western pointed', ext: 5.0, taper: 1.0, blunt: 0.12 },
  'western-square': { name: 'Western broad square', ext: 2.0, taper: 0.15, blunt: 1.0 },
  open: { name: 'Open toe (peep)', ext: 0.6, taper: 0.5, blunt: 0, open: 1 },
};

export const HEELS = {
  flat: { name: 'Flat (spring heel / no heel)', taper: 0, breast: 0.3 },
  stacked: { name: 'Stacked block (dress and boot heel)', taper: 0.06, breast: 0.27 },
  block: { name: 'Block', taper: 0.1, breast: 0.26 },
  cuban: { name: 'Cuban (tapered, slanted back)', taper: 0.28, breast: 0.27, slant: 0.35 },
  western: { name: 'Western riding (underslung)', taper: 0.3, breast: 0.28, slant: 0.6 },
  stiletto: { name: 'Stiletto', taper: 0.86, breast: 0.2, slant: 0.1, pin: true },
  kitten: { name: 'Kitten', taper: 0.8, breast: 0.2, slant: 0.3, pin: true },
  cone: { name: 'Cone', taper: 0.7, breast: 0.22 },
  flare: { name: 'Flared / spool', taper: 0.45, breast: 0.22, flare: 0.5 },
  wedge: { name: 'Wedge', wedge: true, taper: 0, breast: 1 },
  platform: { name: 'Flatform (level platform)', wedge: true, taper: 0, breast: 1 },
  louis: { name: 'Louis (curved)', taper: 0.5, breast: 0.24, flare: 0.35, slant: 0.2 },
};

export const TREADS = {
  smooth: 'Smooth (leather / dress)',
  studs: 'Small round studs',
  commando: 'Commando lugs (perimeter cleats and centre crosses)',
  lug: 'Deep block lugs',
  herringbone: 'Herringbone (court grip)',
  waffle: 'Waffle squares',
  ripple: 'Ripple (transverse waves)',
  siped: 'Siped (razor cuts, boat deck)',
  hex: 'Hexagons',
  cleats: 'Moulded studs (field cleats)',
};

/** What each pair of lace positions is. The speed hook is the open hook riveted to work and hiking boots. */
export const LACE_HARDWARE = {
  'punched': { name: 'Punched holes (no metal)', rows: () => 'hole' },
  'blind-eyelets': { name: 'Blind eyelets (metal hidden under the facing)', rows: () => 'blind' },
  'eyelets': { name: 'Metal eyelets', rows: () => 'eyelet' },
  'eyelets-hooks': { name: 'Eyelets, then speed hooks at the top', rows: (i, n, h) => (i >= n - h ? 'hook' : 'eyelet') },
  'd-rings': { name: 'D-rings', rows: () => 'dring' },
  'd-rings-hooks': { name: 'D-rings, then speed hooks at the top', rows: (i, n, h) => (i >= n - h ? 'hook' : 'dring') },
  'eyelets-lock-hooks': { name: 'Eyelets, a locking eyelet at the ankle, then speed hooks', rows: (i, n, h) => (i >= n - h ? 'hook' : i === n - h - 1 ? 'lock' : 'eyelet') },
  'hooks': { name: 'Speed hooks all the way', rows: (i) => (i === 0 ? 'eyelet' : 'hook') },
  'webbing-loops': { name: 'Webbing loops (ghillie)', rows: () => 'loop' },
  'loops-hooks': { name: 'Webbing loops, then speed hooks', rows: (i, n, h) => (i >= n - h ? 'hook' : 'loop') },
};

export const METALS = { brass: ['Brass', '#b08d3c'], 'antique-brass': ['Antique brass', '#7d6431'], nickel: ['Nickel', '#c9c9c9'], gunmetal: ['Gunmetal', '#3c3d41'], black: ['Black oxide', '#16161a'], copper: ['Copper', '#a8623a'], gold: ['Gold plated', '#d4af37'], 'painted': ['Painted to match', null] };

export const LACES = {
  'flat-cotton': { name: 'Flat cotton (sneaker)', w: 8, t: 1.2, round: false },
  'flat-wide': { name: 'Wide flat (skate, 10 mm)', w: 10, t: 1.4, round: false },
  'round-waxed': { name: 'Round waxed cotton (dress, 2.5 mm)', w: 2.5, t: 2.5, round: true },
  'round-braided': { name: 'Round braided polyester (boot, 4 mm)', w: 4, t: 4, round: true },
  'kevlar-round': { name: 'Round aramid-reinforced (work boot, 4.5 mm)', w: 4.5, t: 4.5, round: true },
  'leather': { name: 'Rawhide leather (boat shoe, 3 mm square)', w: 3, t: 3, round: true },
  'paracord': { name: 'Paracord (5 mm)', w: 5, t: 5, round: true },
  'elastic': { name: 'Elastic no-tie', w: 6, t: 1.5, round: false },
  'ribbon': { name: 'Satin ribbon', w: 12, t: 0.6, round: false },
  'oval': { name: 'Oval (running)', w: 6, t: 2.4, round: false },
};

export const LACINGS = {
  'criss-cross': 'Criss-cross (the standard)',
  'over-under': 'Over-under (less friction, easier to tighten)',
  'straight-bar': 'Straight bar (dress oxford: bars outside, verticals hidden)',
  'ladder': 'Ladder (military: locked verticals and bars)',
  'army': 'Army (crosses hidden inside, verticals outside: flexes with stiff boots)',
  'loop-back': 'Loop back (each side loops through the other)',
};

/**
 * Types. cut: low (below the ankle) | mid (covers the ankle) | boot (shaft) | pump (low-cut court)
 * | mule (no back) | open (sandal straps). shaft = height of the back above the heel seat, cm.
 * throat = how far forward the opening reaches, as a share of the foot length from the heel.
 */
const T = (name, group, o) => ({ name, group, cut: 'low', shaft: 6.5, throat: 0.5, closure: 'laces', rows: 5, hardware: 'blind-eyelets', lacing: 'criss-cross', lace: 'round-waxed', toe: 'round', toecap: 'none', heel: 'stacked', heelH: 2.5, soleT: 0.6, platform: 0, outsole: 'leather', midsole: 'none', tread: 'smooth', construction: 'goodyear-welt', fabric: 'leather-calfskin', parts: [], ext: 0.4, ...o });
export const SHOE_TYPES = {
  // ---- dress
  oxford: T('Oxford (closed lacing)', 'Dress shoes', { toecap: 'cap', closedLacing: true, lacing: 'straight-bar', toe: 'almond', why: 'Facings sewn under the vamp: the formal lace-up.' }),
  'oxford-wholecut': T('Wholecut oxford', 'Dress shoes', { closedLacing: true, lacing: 'straight-bar', toe: 'almond', wholecut: true, why: 'The whole upper cut from one flawless piece of calf, one back seam.' }),
  'oxford-brogue': T('Full brogue / wingtip oxford', 'Dress shoes', { toecap: 'wingtip', brogue: 'full', closedLacing: true, toe: 'round', construction: 'storm-welt', why: 'Wing cap with perforations and a toe medallion.' }),
  derby: T('Derby / blucher (open lacing)', 'Dress shoes', { toe: 'round', hardware: 'eyelets', rows: 4, why: 'Quarters sewn on top of the vamp: opens wider, suits high insteps.' }),
  'derby-longwing': T('Longwing derby', 'Dress shoes', { toecap: 'longwing', brogue: 'full', construction: 'storm-welt', soleT: 1.0, outsole: 'leather', why: 'Wings run the full length to the back seam; double sole.' }),
  monk: T('Single monk strap', 'Dress shoes', { closure: 'buckle', straps: 1, toe: 'almond', toecap: 'cap', why: 'A strap and buckle over the instep instead of laces.' }),
  'double-monk': T('Double monk strap', 'Dress shoes', { closure: 'buckle', straps: 2, toe: 'almond', toecap: 'cap' }),
  'penny-loafer': T('Penny loafer', 'Loafers & slip-ons', { closure: 'slip-on', throat: 0.56, toecap: 'apron', parts: ['saddle'], heelH: 2.2, construction: 'blake', why: 'Moccasin apron, saddle strap with the slit.' }),
  'tassel-loafer': T('Tassel loafer', 'Loafers & slip-ons', { closure: 'slip-on', throat: 0.56, toecap: 'apron', parts: ['tassel'], construction: 'blake' }),
  'bit-loafer': T('Horsebit loafer', 'Loafers & slip-ons', { closure: 'slip-on', throat: 0.56, toecap: 'apron', parts: ['bit'], construction: 'blake', toe: 'almond' }),
  'belgian-loafer': T('Belgian loafer', 'Loafers & slip-ons', { closure: 'slip-on', throat: 0.6, toecap: 'apron', parts: ['bow'], heelH: 1.2, soleT: 0.35, construction: 'turnshoe', fabric: 'suede' }),
  'driving-moc': T('Driving moccasin', 'Loafers & slip-ons', { closure: 'slip-on', throat: 0.56, toecap: 'apron', heel: 'flat', heelH: 0.4, soleT: 0.3, outsole: 'rubber', tread: 'studs', construction: 'moccasin', fabric: 'suede', parts: ['moc-lace'], ext: 0, why: 'Rubber pebbles through a soft one-piece moccasin bottom.' }),
  'boat-shoe': T('Boat shoe', 'Loafers & slip-ons', { rows: 2, hardware: 'eyelets', lace: 'leather', toecap: 'apron', heel: 'flat', heelH: 1.0, soleT: 0.8, outsole: 'rubber', tread: 'siped', construction: 'moccasin', fabric: 'leather-cowhide-pullup', parts: ['collar-lace'], metal: 'brass', why: 'Siped non-marking sole, rawhide lace running round the collar.' }),
  'venetian': T('Venetian loafer', 'Loafers & slip-ons', { closure: 'slip-on', throat: 0.56, toecap: 'apron', construction: 'blake' }),
  'opera-slipper': T('Opera pump / evening slipper', 'Loafers & slip-ons', { closure: 'slip-on', throat: 0.62, heelH: 1.5, soleT: 0.4, construction: 'turnshoe', fabric: 'velvet', parts: ['bow'] }),
  espadrille: T('Espadrille', 'Loafers & slip-ons', { closure: 'slip-on', throat: 0.58, heel: 'flat', heelH: 0.6, soleT: 1.6, outsole: 'jute', tread: 'smooth', construction: 'opanka', fabric: 'canvas', ext: 0.2, why: 'Canvas upper blanket-stitched to a coiled jute rope sole.' }),
  // ---- sneakers
  'court-sneaker': T('Court sneaker (low, leather)', 'Sneakers', { hardware: 'punched', rows: 7, lace: 'flat-cotton', heel: 'flat', heelH: 1.0, soleT: 2.4, outsole: 'rubber', midsole: 'none', tread: 'herringbone', construction: 'cupsole', fabric: 'leather-cowhide', parts: ['collar', 'heel-tab', 'side-panel'], sidePanel: 'none', ext: 0.25, perf: true, why: 'Stitched rubber cupsole, padded collar, perforated vamp.' }),
  'canvas-low': T('Canvas plimsoll (low)', 'Sneakers', { hardware: 'eyelets', rows: 6, lace: 'flat-cotton', toecap: 'bumper', heel: 'flat', heelH: 0.6, soleT: 2.0, outsole: 'rubber', tread: 'waffle', construction: 'vulcanised', fabric: 'canvas', metal: 'nickel', ext: 0.3, why: 'Vulcanised rubber foxing and toe bumper on canvas.' }),
  'canvas-high': T('Canvas high-top', 'Sneakers', { cut: 'mid', shaft: 13, hardware: 'eyelets', rows: 8, lace: 'flat-cotton', toecap: 'bumper', heel: 'flat', heelH: 0.6, soleT: 2.0, outsole: 'rubber', tread: 'waffle', construction: 'vulcanised', fabric: 'canvas', metal: 'nickel', parts: ['ankle-patch'], ext: 0.3 }),
  'skate-shoe': T('Skate shoe', 'Sneakers', { hardware: 'punched', rows: 6, lace: 'flat-wide', toecap: 'cap', heel: 'flat', heelH: 0.6, soleT: 2.2, outsole: 'gum-rubber', tread: 'waffle', construction: 'vulcanised', fabric: 'suede', parts: ['collar', 'side-panel'], sidePanel: 'bar', ext: 0.3 }),
  'basketball-high': T('Basketball high-top', 'Sneakers', { cut: 'mid', shaft: 14, hardware: 'punched', rows: 9, lace: 'flat-cotton', toecap: 'cap', heel: 'flat', heelH: 1.2, soleT: 2.8, outsole: 'rubber', midsole: 'eva', tread: 'herringbone', construction: 'cupsole', fabric: 'leather-cowhide', parts: ['collar', 'heel-tab', 'side-panel', 'ankle-strap'], sidePanel: 'chevron', ext: 0.3, perf: true }),
  runner: T('Running shoe', 'Sneakers', { hardware: 'webbing-loops', rows: 6, lace: 'oval', heel: 'flat', heelH: 1.0, soleT: 2.6, outsole: 'rubber', midsole: 'eva', tread: 'waffle', construction: 'strobel', fabric: 'mesh', parts: ['collar', 'heel-tab', 'mudguard', 'heel-clip', 'side-panel'], sidePanel: 'arc', toeSpring: 1.6, rocker: true, ext: 0.5, why: 'Mesh upper on a strobel board, foam midsole with a heel-to-toe drop, rubber pods.' }),
  'retro-runner': T('Retro runner (suede and nylon)', 'Sneakers', { hardware: 'punched', rows: 6, lace: 'flat-cotton', toecap: 'mudguard', heel: 'flat', heelH: 1.2, soleT: 2.2, outsole: 'gum-rubber', midsole: 'eva', tread: 'waffle', construction: 'cemented', fabric: 'nylon-taslan', parts: ['collar', 'heel-tab', 'mudguard', 'side-panel'], sidePanel: 'bar', toeSpring: 1.2, ext: 0.4 }),
  'chunky-sneaker': T('Chunky / platform sneaker', 'Sneakers', { hardware: 'punched', rows: 7, lace: 'flat-wide', heel: 'flat', heelH: 1.5, soleT: 4.2, outsole: 'rubber', midsole: 'eva', tread: 'lug', construction: 'cemented', fabric: 'leather-cowhide', parts: ['collar', 'heel-tab', 'mudguard', 'side-panel'], sidePanel: 'arc', ext: 0.7 }),
  'slip-on-sneaker': T('Slip-on sneaker', 'Sneakers', { closure: 'gore', throat: 0.52, heel: 'flat', heelH: 0.6, soleT: 2.0, outsole: 'rubber', tread: 'waffle', construction: 'vulcanised', fabric: 'canvas', parts: ['collar'], ext: 0.3 }),
  'strap-sneaker': T('Hook-and-loop strap sneaker', 'Sneakers', { closure: 'velcro', straps: 3, heel: 'flat', heelH: 1.0, soleT: 2.4, outsole: 'rubber', tread: 'herringbone', construction: 'cupsole', fabric: 'leather-cowhide', parts: ['collar', 'heel-tab'], ext: 0.25 }),
  'knit-trainer': T('Knit sock trainer', 'Sneakers', { cut: 'mid', shaft: 11, closure: 'slip-on', heel: 'flat', heelH: 1.0, soleT: 3.0, outsole: 'rubber', midsole: 'eva', tread: 'waffle', construction: 'strobel', fabric: 'rib-knit', parts: ['heel-tab', 'heel-clip'], toeSpring: 1.4, ext: 0.5 }),
  'football-boot': T('Football boot (cleats)', 'Sneakers', { hardware: 'punched', rows: 6, lace: 'flat-cotton', heel: 'flat', heelH: 0.4, soleT: 0.5, outsole: 'tpu', tread: 'cleats', construction: 'cemented', fabric: 'leather-kangaroo', toe: 'almond', ext: 0.1 }),
  // ---- boots
  'work-boot': T('6-inch work boot (nubuck, padded collar)', 'Boots', { cut: 'boot', shaft: 15, hardware: 'eyelets-hooks', hookRows: 0, rows: 7, lace: 'kevlar-round', toe: 'snub', heelH: 3.2, soleT: 1.8, outsole: 'lug-rubber', midsole: 'rubber', tread: 'commando', construction: 'direct-injection', fabric: 'leather-cowhide-nubuck', parts: ['collar', 'counter', 'backstay'], metal: 'brass', outsoleColor: '#a9772f', midsoleColor: '#b9843c', hexEyelets: true, ext: 0.7, rows4: true, why: 'Waterproof nubuck, four rows of stitching, hexagonal brass eyelets, padded leather collar, lug sole in honey rubber.' }),
  'logger-boot': T('Logger / speed-hook work boot', 'Boots', { cut: 'boot', shaft: 20, hardware: 'eyelets-hooks', hookRows: 4, rows: 9, lace: 'kevlar-round', toe: 'snub', toecap: 'cap', heel: 'stacked', heelH: 4.5, soleT: 1.4, outsole: 'lug-rubber', midsole: 'leather', tread: 'commando', construction: 'stitchdown', fabric: 'leather-cowhide-pullup', parts: ['counter', 'backstay', 'kiltie', 'pull-loop'], metal: 'brass', ext: 0.8, why: 'Eyelets over the instep, solid brass speed hooks up the ankle, raised logger heel, stitchdown lug sole.' }),
  'service-boot': T('Service boot', 'Boots', { cut: 'boot', shaft: 15, hardware: 'eyelets-hooks', hookRows: 3, rows: 8, lace: 'round-braided', toe: 'round', toecap: 'cap', heelH: 3.0, soleT: 1.0, outsole: 'studded-rubber', midsole: 'leather', tread: 'studs', construction: 'goodyear-welt', fabric: 'leather-cowhide-pullup', parts: ['counter', 'backstay'], metal: 'antique-brass', ext: 0.5 }),
  'combat-boot': T('Combat boot', 'Boots', { cut: 'boot', shaft: 21, hardware: 'eyelets', rows: 10, lace: 'round-braided', lacing: 'army', toe: 'round', toecap: 'cap', heelH: 3.2, soleT: 1.6, outsole: 'lug-rubber', tread: 'commando', construction: 'goodyear-welt', fabric: 'leather-cowhide', parts: ['counter', 'backstay', 'collar', 'pull-loop'], metal: 'black', ext: 0.6 }),
  'hiking-boot': T('Hiking boot', 'Boots', { cut: 'boot', shaft: 14, hardware: 'd-rings-hooks', hookRows: 2, rows: 7, lace: 'round-braided', toe: 'round', toecap: 'bumper', heelH: 2.6, soleT: 1.8, outsole: 'lug-rubber', midsole: 'eva', tread: 'lug', construction: 'cemented', fabric: 'leather-cowhide-nubuck', parts: ['collar', 'counter', 'mudguard', 'pull-loop'], metal: 'gunmetal', toeSpring: 1.2, ext: 0.6, gusset: true }),
  'mountaineering-boot': T('Mountaineering boot (Norwegian welt)', 'Boots', { cut: 'boot', shaft: 17, hardware: 'd-rings-hooks', hookRows: 3, rows: 8, lace: 'round-braided', toe: 'round', heelH: 3.0, soleT: 2.0, outsole: 'lug-rubber', midsole: 'leather', tread: 'commando', construction: 'norwegian', fabric: 'leather-cowhide', parts: ['collar', 'counter', 'backstay'], metal: 'nickel', ext: 0.9, gusset: true }),
  chukka: T('Chukka boot', 'Boots', { cut: 'mid', shaft: 11.5, hardware: 'punched', rows: 3, toe: 'round', heelH: 2.4, construction: 'goodyear-welt', fabric: 'suede', why: 'Two or three eyelets, two-piece quarters over a plain vamp.' }),
  'desert-boot': T('Desert boot (crepe sole)', 'Boots', { cut: 'mid', shaft: 11, hardware: 'punched', rows: 2, toe: 'round', heel: 'flat', heelH: 1.6, soleT: 1.2, outsole: 'crepe', tread: 'smooth', construction: 'stitchdown', fabric: 'suede', ext: 0.5 }),
  'chelsea-boot': T('Chelsea boot', 'Boots', { cut: 'boot', shaft: 14, closure: 'gore', toe: 'almond', heelH: 2.8, construction: 'goodyear-welt', fabric: 'leather-calfskin', parts: ['pull-loop'], why: 'Elastic side gores, pull tab, clean vamp.' }),
  'jodhpur-boot': T('Jodhpur boot', 'Boots', { cut: 'boot', shaft: 13, closure: 'buckle', straps: 1, wrapStrap: true, toe: 'almond', heelH: 2.8, construction: 'goodyear-welt' }),
  'engineer-boot': T('Engineer boot', 'Boots', { cut: 'boot', shaft: 27, closure: 'pull-on', straps: 1, topStrap: true, instepStrap: true, toe: 'snub', heel: 'stacked', heelH: 4.2, soleT: 1.2, outsole: 'lug-rubber', midsole: 'leather', tread: 'commando', construction: 'goodyear-welt', fabric: 'leather-cowhide-pullup', parts: ['counter', 'backstay'], metal: 'nickel', ext: 0.6 }),
  'western-boot': T('Western / cowboy boot', 'Boots', { cut: 'boot', shaft: 31, closure: 'pull-on', toe: 'western-j', toecap: 'none', heel: 'western', heelH: 4.5, soleT: 0.6, construction: 'goodyear-welt', fabric: 'leather-calfskin', parts: ['counter', 'pull-straps', 'scallop', 'shaft-stitch'], ext: 0.4, why: 'Scalloped shaft with decorative stitching, underslung heel, pull straps, lemonwood-pegged leather sole.' }),
  'roper-boot': T('Roper boot', 'Boots', { cut: 'boot', shaft: 25, closure: 'pull-on', toe: 'round', heel: 'block', heelH: 2.8, soleT: 0.6, construction: 'goodyear-welt', parts: ['counter', 'pull-straps'] }),
  'riding-boot': T('Riding boot (knee high)', 'Boots', { cut: 'boot', shaft: 42, closure: 'zip', zipSide: 'back', toe: 'almond', heelH: 2.4, soleT: 0.6, outsole: 'rubber', tread: 'studs', construction: 'cemented', parts: ['counter'] }),
  'knee-boot': T('Knee-high boot (heeled)', 'Boots', { cut: 'boot', shaft: 40, closure: 'zip', zipSide: 'medial', toe: 'almond', heel: 'block', heelH: 7, soleT: 0.5, outsole: 'rubber', construction: 'cemented', fabric: 'leather-lambskin' }),
  'over-knee-boot': T('Over-the-knee boot', 'Boots', { cut: 'boot', shaft: 56, closure: 'zip', zipSide: 'medial', toe: 'pointed', heel: 'stiletto', heelH: 9, soleT: 0.4, outsole: 'rubber', construction: 'cemented', fabric: 'suede' }),
  'ankle-bootie': T('Ankle bootie (heeled)', 'Boots', { cut: 'boot', shaft: 12, closure: 'zip', zipSide: 'medial', toe: 'pointed', heel: 'block', heelH: 7.5, soleT: 0.4, outsole: 'rubber', construction: 'cemented' }),
  'sock-boot': T('Stretch sock boot', 'Boots', { cut: 'boot', shaft: 22, closure: 'pull-on', toe: 'pointed', heel: 'stiletto', heelH: 9, soleT: 0.4, outsole: 'rubber', construction: 'cemented', fabric: 'rib-knit' }),
  'lace-up-heeled-boot': T('Lace-up heeled boot (granny)', 'Boots', { cut: 'boot', shaft: 20, hardware: 'eyelets-hooks', hookRows: 4, rows: 11, lace: 'round-waxed', toe: 'almond', heel: 'louis', heelH: 6, soleT: 0.5, construction: 'blake', metal: 'antique-brass' }),
  'platform-boot': T('Platform combat boot', 'Boots', { cut: 'boot', shaft: 20, hardware: 'eyelets', rows: 9, lace: 'round-braided', toe: 'round', heel: 'block', heelH: 9, platform: 4, soleT: 4.6, outsole: 'rubber', tread: 'lug', construction: 'cemented', parts: ['counter', 'pull-loop'], metal: 'nickel', ext: 0.6, zipSide: 'medial' }),
  'rain-boot': T('Rain boot (moulded rubber)', 'Boots', { cut: 'boot', shaft: 38, closure: 'pull-on', toe: 'round', heel: 'flat', heelH: 2.4, soleT: 1.4, outsole: 'rubber', tread: 'lug', construction: 'moulded', fabric: 'pvc-rain', parts: ['top-band', 'side-buckle'], ext: 0.5 }),
  'duck-boot': T('Duck boot (rubber shell, leather shaft)', 'Boots', { cut: 'boot', shaft: 20, hardware: 'eyelets', rows: 6, lace: 'leather', toe: 'round', toecap: 'shell', heel: 'flat', heelH: 2.0, soleT: 1.4, outsole: 'rubber', tread: 'ripple', construction: 'moulded', fabric: 'leather-cowhide-pullup', metal: 'brass', ext: 0.4 }),
  'sheepskin-boot': T('Sheepskin boot (twin-face)', 'Boots', { cut: 'boot', shaft: 22, closure: 'pull-on', toe: 'round', heel: 'flat', heelH: 0.8, soleT: 1.8, outsole: 'eva', tread: 'ripple', construction: 'cemented', fabric: 'shearling-merino', parts: ['backstay', 'fur-cuff'], ext: 0.5 }),
  'snow-boot': T('Insulated snow boot', 'Boots', { cut: 'boot', shaft: 26, hardware: 'd-rings', rows: 6, lace: 'round-braided', toe: 'round', toecap: 'shell', heel: 'flat', heelH: 2.4, soleT: 2.2, outsole: 'lug-rubber', tread: 'lug', construction: 'moulded', fabric: 'nylon-ripstop', parts: ['fur-cuff', 'collar'], metal: 'gunmetal', ext: 0.7 }),
  'moto-boot': T('Motorcycle / harness boot', 'Boots', { cut: 'boot', shaft: 28, closure: 'pull-on', straps: 1, harness: true, toe: 'western-square', heel: 'block', heelH: 4, soleT: 1.2, outsole: 'lug-rubber', tread: 'commando', construction: 'goodyear-welt', fabric: 'leather-cowhide-pullup', parts: ['counter', 'pull-straps'], metal: 'nickel', ext: 0.6 }),
  'wellington-dress': T('Dress zip boot', 'Boots', { cut: 'boot', shaft: 16, closure: 'zip', zipSide: 'medial', toe: 'almond', heelH: 2.8, construction: 'blake' }),
  // ---- heels & flats
  pump: T('Court shoe / pump', 'Heels & flats', { cut: 'pump', throat: 0.74, closure: 'slip-on', toe: 'pointed', heel: 'stiletto', heelH: 8.5, soleT: 0.4, construction: 'cemented', fabric: 'leather-kidskin', ext: 0.1, why: 'Low-cut vamp, covered heel, leather sole 3-4 mm.' }),
  'kitten-pump': T('Kitten-heel pump', 'Heels & flats', { cut: 'pump', throat: 0.74, closure: 'slip-on', toe: 'pointed', heel: 'kitten', heelH: 4.5, soleT: 0.4, construction: 'cemented', fabric: 'leather-kidskin', ext: 0.1 }),
  'block-pump': T('Block-heel pump', 'Heels & flats', { cut: 'pump', throat: 0.72, closure: 'slip-on', toe: 'square', heel: 'block', heelH: 6, soleT: 0.4, construction: 'cemented', ext: 0.1 }),
  slingback: T('Slingback', 'Heels & flats', { cut: 'pump', throat: 0.74, closure: 'slingback', toe: 'pointed', heel: 'kitten', heelH: 5, soleT: 0.4, construction: 'cemented', ext: 0.1, sling: true }),
  'mary-jane': T('Mary Jane', 'Heels & flats', { cut: 'pump', throat: 0.7, closure: 'buckle', straps: 1, instepBar: true, toe: 'round', heel: 'block', heelH: 4, soleT: 0.5, construction: 'cemented', fabric: 'leather-patent', ext: 0.2 }),
  'ankle-strap-heel': T("Ankle-strap d'Orsay heel", 'Heels & flats', { cut: 'pump', throat: 0.76, closure: 'buckle', straps: 1, ankleStrap: true, dorsay: true, toe: 'pointed', heel: 'stiletto', heelH: 10, soleT: 0.4, construction: 'cemented', ext: 0.1 }),
  'platform-pump': T('Platform pump', 'Heels & flats', { cut: 'pump', throat: 0.74, closure: 'slip-on', toe: 'round', heel: 'stiletto', heelH: 13, platform: 3, soleT: 3.4, construction: 'cemented', fabric: 'leather-patent', ext: 0.15 }),
  'peep-toe': T('Peep-toe pump', 'Heels & flats', { cut: 'pump', throat: 0.72, closure: 'slip-on', toe: 'open', heel: 'stiletto', heelH: 9, soleT: 0.4, construction: 'cemented', ext: 0.1 }),
  'wedge-pump': T('Wedge', 'Heels & flats', { cut: 'pump', throat: 0.72, closure: 'slip-on', toe: 'almond', heel: 'wedge', heelH: 8, soleT: 1.0, outsole: 'rubber', midsole: 'cork', construction: 'cemented', ext: 0.2 }),
  'ballet-flat': T('Ballet flat', 'Heels & flats', { cut: 'pump', throat: 0.76, closure: 'slip-on', toe: 'round', heel: 'flat', heelH: 0.5, soleT: 0.35, construction: 'turnshoe', fabric: 'leather-lambskin', parts: ['bow', 'binding'], ext: 0.05, why: 'Turned construction, drawstring binding with a bow.' }),
  'pointed-flat': T('Pointed flat', 'Heels & flats', { cut: 'pump', throat: 0.74, closure: 'slip-on', toe: 'pointed', heel: 'flat', heelH: 0.8, soleT: 0.4, construction: 'cemented', ext: 0.1 }),
  mule: T('Heeled mule', 'Heels & flats', { cut: 'mule', throat: 0.62, closure: 'slip-on', toe: 'pointed', heel: 'kitten', heelH: 6, soleT: 0.4, construction: 'cemented', ext: 0.1 }),
  'backless-loafer': T('Backless loafer / slipper mule', 'Heels & flats', { cut: 'mule', throat: 0.54, closure: 'slip-on', toe: 'round', toecap: 'apron', parts: ['bit'], heel: 'flat', heelH: 1.2, soleT: 0.5, construction: 'blake' }),
  clog: T('Clog (wooden base)', 'Heels & flats', { cut: 'mule', throat: 0.5, closure: 'slip-on', toe: 'round', heel: 'wedge', heelH: 5, platform: 2, soleT: 2.6, outsole: 'wood', tread: 'smooth', construction: 'stitchdown', fabric: 'leather-cowhide', parts: ['staples'], ext: 0.5, why: 'Leather upper stapled to a carved alder base with a rubber top piece.' }),
  'foam-clog': T('Moulded foam clog', 'Heels & flats', { cut: 'mule', throat: 0.48, closure: 'slip-on', toe: 'snub', heel: 'flat', heelH: 1.0, soleT: 2.0, outsole: 'eva', tread: 'ripple', construction: 'moulded', fabric: 'eva-foam', parts: ['heel-strap', 'vents'], ext: 0.6 }),
  slipper: T('House slipper (shearling lined)', 'Heels & flats', { cut: 'mule', throat: 0.5, closure: 'slip-on', toe: 'round', heel: 'flat', heelH: 0.6, soleT: 1.0, outsole: 'rubber', construction: 'cemented', fabric: 'suede', parts: ['fur-cuff'], ext: 0.3 }),
  // ---- sandals
  slide: T('Slide (one band)', 'Sandals', { cut: 'open', straps: 'slide', closure: 'slip-on', heel: 'flat', heelH: 0.8, soleT: 2.0, outsole: 'eva', tread: 'ripple', construction: 'moulded', fabric: 'faux-pu-soft', ext: 0.5 }),
  'two-strap-sandal': T('Two-strap cork footbed sandal', 'Sandals', { cut: 'open', straps: 'two-band', closure: 'buckle', heel: 'flat', heelH: 0.8, soleT: 2.2, outsole: 'eva', midsole: 'cork', tread: 'ripple', construction: 'cemented', fabric: 'leather-cowhide', metal: 'nickel', ext: 0.5, why: 'Anatomical cork-latex footbed with a suede liner, two adjustable buckled straps.' }),
  'flip-flop': T('Flip-flop / thong sandal', 'Sandals', { cut: 'open', straps: 'thong', closure: 'slip-on', heel: 'flat', heelH: 0.4, soleT: 1.5, outsole: 'rubber', tread: 'ripple', construction: 'moulded', fabric: 'rubber-sheet', ext: 0.3 }),
  'sport-sandal': T('Sport sandal (three straps)', 'Sandals', { cut: 'open', straps: 'sport', closure: 'velcro', heel: 'flat', heelH: 1.0, soleT: 2.4, outsole: 'rubber', midsole: 'eva', tread: 'lug', construction: 'cemented', fabric: 'nylon-webbing', ext: 0.5 }),
  'gladiator-sandal': T('Gladiator sandal', 'Sandals', { cut: 'open', straps: 'gladiator', closure: 'buckle', heel: 'flat', heelH: 0.6, soleT: 0.6, outsole: 'leather', construction: 'blake', fabric: 'leather-cowhide', metal: 'brass', ext: 0.2 }),
  'strappy-heel': T('Strappy heeled sandal', 'Sandals', { cut: 'open', straps: 'ankle', closure: 'buckle', heel: 'stiletto', heelH: 9.5, soleT: 0.4, outsole: 'leather', construction: 'cemented', fabric: 'leather-kidskin', metal: 'gold', ext: 0.1 }),
  'block-sandal': T('Block-heel sandal', 'Sandals', { cut: 'open', straps: 'ankle', closure: 'buckle', heel: 'block', heelH: 6.5, soleT: 0.5, outsole: 'leather', construction: 'cemented', fabric: 'suede', metal: 'gold', ext: 0.15 }),
  'espadrille-wedge': T('Espadrille wedge', 'Sandals', { cut: 'open', straps: 'ankle-tie', closure: 'tie', heel: 'wedge', heelH: 9, platform: 2.5, soleT: 3, outsole: 'jute', construction: 'cemented', fabric: 'canvas', ext: 0.2 }),
  'fisherman-sandal': T('Fisherman sandal', 'Sandals', { cut: 'open', straps: 'fisherman', closure: 'buckle', heel: 'flat', heelH: 1.2, soleT: 1.0, outsole: 'rubber', tread: 'studs', construction: 'stitchdown', fabric: 'leather-cowhide', metal: 'brass', ext: 0.4 }),
  huarache: T('Woven huarache', 'Sandals', { cut: 'open', straps: 'woven', closure: 'slip-on', heel: 'flat', heelH: 1.0, soleT: 1.0, outsole: 'rubber', construction: 'stitchdown', fabric: 'leather-veg-tan', ext: 0.3 }),
};

export const SIDE_PANELS = { none: 'None', bar: 'Bars (three stripes)', chevron: 'Chevron', arc: 'Sweeping arc', wave: 'Wave', star: 'Round patch' };

const keys = (o) => Object.keys(o);
export const SHOE_OPTIONS = {
  type: { label: 'Type', type: 'select', values: keys(SHOE_TYPES), default: 'derby' },
  toe: { label: 'Toe shape', type: 'select', values: ['type-default', ...keys(TOE_SHAPES)], default: 'type-default' },
  toecap: { label: 'Toe', type: 'select', values: ['type-default', 'none', 'cap', 'wingtip', 'longwing', 'apron', 'bumper', 'mudguard', 'shell', 'steel'], default: 'type-default' },
  brogue: { label: 'Broguing (perforations)', type: 'select', values: ['type-default', 'none', 'quarter', 'semi', 'full'], default: 'type-default' },
  shaft: { label: 'Shaft height (cm above the heel seat, 0 = type default)', type: 'range', min: 0, max: 60, step: 1, default: 0 },
  closure: { label: 'Closure', type: 'select', values: ['type-default', 'laces', 'velcro', 'buckle', 'zip', 'gore', 'slip-on', 'pull-on', 'dial'], default: 'type-default' },
  rows: { label: 'Lace rows (pairs, 0 = type default)', type: 'range', min: 0, max: 16, step: 1, default: 0 },
  hardware: { label: 'Lace hardware', type: 'select', values: ['type-default', ...keys(LACE_HARDWARE)], default: 'type-default' },
  hookRows: { label: 'Speed-hook rows at the top (-1 = type default)', type: 'range', min: -1, max: 8, step: 1, default: -1 },
  metal: { label: 'Hardware metal', type: 'select', values: ['type-default', ...keys(METALS)], default: 'type-default' },
  lacing: { label: 'Lacing pattern', type: 'select', values: ['type-default', ...keys(LACINGS)], default: 'type-default' },
  lace: { label: 'Laces', type: 'select', values: ['type-default', ...keys(LACES)], default: 'type-default' },
  laceColor: { label: 'Lace colour', type: 'color', default: '#2a2018' },
  tied: { label: 'Laces', type: 'select', values: ['tied', 'untied', 'tucked'], default: 'tied' },
  straps: { label: 'Straps (count, 0 = type default)', type: 'range', min: 0, max: 5, step: 1, default: 0 },
  zipSide: { label: 'Zip', type: 'select', values: ['type-default', 'none', 'medial', 'lateral', 'back', 'front'], default: 'type-default' },
  heel: { label: 'Heel shape', type: 'select', values: ['type-default', ...keys(HEELS)], default: 'type-default' },
  heelH: { label: 'Heel height (cm, -1 = type default)', type: 'range', min: -1, max: 16, step: 0.5, default: -1 },
  platform: { label: 'Platform under the forefoot (cm, -1 = type default)', type: 'range', min: -1, max: 8, step: 0.5, default: -1 },
  soleT: { label: 'Sole thickness at the forefoot (cm, 0 = type default)', type: 'range', min: 0, max: 8, step: 0.1, default: 0 },
  outsole: { label: 'Outsole material', type: 'select', values: ['type-default', ...keys(SOLE_MATERIALS)], default: 'type-default' },
  outsoleColor: { label: 'Outsole colour', type: 'color', default: '#000001' },
  midsole: { label: 'Midsole', type: 'select', values: ['type-default', 'none', 'leather', 'rubber', 'eva', 'pu', 'tpu', 'cork', 'crepe'], default: 'type-default' },
  midsoleColor: { label: 'Midsole colour', type: 'color', default: '#000001' },
  tread: { label: 'Tread', type: 'select', values: ['type-default', ...keys(TREADS)], default: 'type-default' },
  construction: { label: 'Construction (how the sole is attached)', type: 'select', values: ['type-default', ...keys(CONSTRUCTIONS)], default: 'type-default' },
  weltColor: { label: 'Welt / sole edge colour', type: 'color', default: '#000001' },
  heelMaterial: { label: 'Heel material', type: 'select', values: ['auto', 'stacked-leather', 'abs', 'rubber', 'wood', 'cork', 'covered'], default: 'auto' },
  stitchColor: { label: 'Stitching colour', type: 'color', default: '#000001' },
  stitchRows: { label: 'Rows of stitching on the seams', type: 'select', values: ['auto', '1', '2', '3', '4'], default: 'auto' },
  sidePanel: { label: 'Side overlay', type: 'select', values: ['type-default', ...keys(SIDE_PANELS)], default: 'type-default' },
  collar: { label: 'Collar', type: 'select', values: ['type-default', 'plain', 'padded', 'rolled', 'fur-cuff'], default: 'type-default' },
  lining: { label: 'Lining', type: 'select', values: ['calf', 'pigskin', 'textile-mesh', 'canvas', 'shearling', 'waterproof-membrane', 'unlined'], default: 'calf' },
  liningColor: { label: 'Lining colour', type: 'color', default: '#c9a27a' },
  insole: { label: 'Footbed', type: 'select', values: ['leather-sock', 'cork-leather', 'eva-ortholite', 'memory-foam', 'shearling', 'moulded-cork', 'none'], default: 'leather-sock' },
  toePuff: { label: 'Toe stiffener', type: 'select', values: ['auto', 'none (unstructured)', 'thermoplastic', 'leather', 'celastic', 'steel toe cap (200 J)', 'composite toe cap', 'alloy toe cap'], default: 'auto' },
  shank: { label: 'Shank', type: 'select', values: ['auto', 'none', 'steel', 'fibreglass', 'wood', 'leather', 'nylon'], default: 'auto' },
  pullLoop: { label: 'Heel pull loop', type: 'select', values: ['type-default', 'no', 'yes'], default: 'type-default' },
  width: { label: 'Width fitting', type: 'select', values: ['B (narrow)', 'D (standard)', 'E (wide)', 'EE (extra wide)', 'EEE'], default: 'D (standard)' },
  color: { label: 'Upper colour (leave as the material colour, or pick)', type: 'color', default: '#000000' },
};

/** Notes shown under an option when a value is picked. */
export const SHOE_INFO = {
  outsole: Object.fromEntries(Object.entries(SOLE_MATERIALS).map(([k, m]) => [k, `${m.desc} Pros: ${m.pros}. Cons: ${m.cons}.`])),
  construction: Object.fromEntries(Object.entries(CONSTRUCTIONS).map(([k, m]) => [k, `${m.desc} Pros: ${m.pros}. Cons: ${m.cons}.`])),
  hardware: {
    'eyelets-hooks': 'Eyelets hold the lace over the instep; open speed hooks (riveted through the facing with a backing washer) take over at the ankle so the boot can be laced and released quickly.',
    'd-rings': 'A D-shaped wire ring held by a riveted leather or webbing tab: the lace slides freely, so the boot tightens evenly.',
    'eyelets-lock-hooks': 'The locking eyelet pinches the lace so the foot and the ankle can be tensioned separately.',
    'blind-eyelets': 'The metal eyelet is set from the lining side so only a clean hole shows: the dress-shoe standard.',
  },
  lacing: { 'straight-bar': 'Needs an even number of rows to end with both ends at the top.', army: 'Used on stiff military boots: the sides can flex because no lace crosses on the outside.', ladder: 'Very secure and hard to loosen: paratrooper boots.' },
};

/** Resolve a garment's options against its type: one flat description of the shoe. */
export function shoeSpec(o) {
  const t = SHOE_TYPES[o.type] || SHOE_TYPES.derby;
  const pick = (k, none) => (o[k] === undefined || o[k] === 'type-default' || o[k] === none ? t[k] : o[k]);
  const s = { ...t, type: o.type };
  for (const k of ['toe', 'toecap', 'closure', 'hardware', 'metal', 'lacing', 'lace', 'zipSide', 'heel', 'outsole', 'midsole', 'tread', 'construction', 'sidePanel']) s[k] = pick(k);
  s.brogue = pick('brogue') || 'none';
  s.metal = s.metal || 'nickel';
  s.shaft = o.shaft > 0 ? o.shaft : t.shaft;
  if (o.shaft > 0 && t.cut !== 'open' && t.cut !== 'mule') s.cut = o.shaft >= 13 ? 'boot' : o.shaft >= 10 ? 'mid' : t.cut === 'pump' ? 'pump' : 'low';
  s.rows = o.rows > 0 ? o.rows : t.rows;
  s.hookRows = o.hookRows >= 0 ? o.hookRows : (t.hookRows ?? (/hooks/.test(s.hardware) ? Math.min(3, Math.max(1, Math.round(s.rows / 3))) : 0));
  if (s.hardware === 'eyelets-hooks' && t.hookRows === 0 && !(o.hookRows > 0)) s.hookRows = 0;
  s.straps = typeof t.straps === 'string' ? t.straps : (o.straps > 0 ? o.straps : t.straps || (s.closure === 'velcro' ? 2 : s.closure === 'buckle' ? 1 : 0));
  s.heelH = o.heelH >= 0 ? o.heelH : t.heelH;
  s.platform = o.platform >= 0 ? o.platform : t.platform;
  s.soleT = Math.max(o.soleT > 0 ? o.soleT : t.soleT, s.platform ? s.platform + 0.3 : 0);
  if (s.heel === 'flat' && s.heelH > 3) s.heel = 'block';
  s.collar = o.collar && o.collar !== 'type-default' ? o.collar : t.parts.includes('fur-cuff') ? 'fur-cuff' : t.parts.includes('collar') ? 'padded' : 'plain';
  s.pullLoop = o.pullLoop === 'yes' || (o.pullLoop !== 'no' && t.parts.includes('pull-loop'));
  s.pitch = Math.max(0, s.heelH - s.soleT); // how much higher the heel seat is than the ball of the foot
  s.stitchRows = o.stitchRows && o.stitchRows !== 'auto' ? Number(o.stitchRows) : t.rows4 ? 4 : /boot/.test(o.type) ? 2 : 1;
  s.rowKinds = []; // from the toe end up
  if (s.closure === 'laces') { const H = LACE_HARDWARE[s.hardware] || LACE_HARDWARE.eyelets; for (let i = 0; i < s.rows; i++) s.rowKinds.push(H.rows(i, s.rows, s.hookRows)); }
  s.opt = o;
  return s;
}

/** The named pieces of an upper for this shoe, in the order they are layered (later lies on top). */
export function shoeParts(s) {
  const P = [];
  const add = (id, name, fabric, note) => P.push({ id, name, fabric: fabric || null, note });
  if (s.cut === 'open') {
    add('straps', s.straps === 'thong' ? 'Thong strap' : 'Straps', null, 'Skived, folded and stitched, or bound; ends are lasted between insole and sole.');
    add('footbed', 'Footbed cover (sock)', s.midsole === 'cork' ? 'suede' : 'leather-calf-lining', 'Glued over the insole board / cork footbed.');
    return P;
  }
  add('vamp', s.wholecut ? 'Wholecut upper' : 'Vamp (front of the upper)', null, 'Cut tight to toe along the backbone of the skin; lasted over the toe.');
  if (!s.wholecut && s.cut !== 'mule' && s.cut !== 'pump') add('quarter', 'Quarters (sides and back)', null, s.closedLacing ? 'Closed lacing: the quarters are stitched under the vamp.' : 'Open lacing: the quarters lie on top of the vamp.');
  if (s.cut === 'boot' || s.cut === 'mid') add('shaft', 'Shaft / leg', s.type === 'duck-boot' ? 'leather-cowhide-pullup' : null, 'Front and back leg pieces, closed with the back seam.');
  if (s.toecap === 'cap' || s.toecap === 'steel') add('toecap', 'Toe cap', null, 'Straight cap stitched over the vamp, two rows.');
  if (s.toecap === 'wingtip' || s.toecap === 'longwing') add('toecap', s.toecap === 'longwing' ? 'Longwing cap' : 'Wing cap', null, 'W-shaped cap; gimped (zig-zag) edge with perforations.');
  if (s.toecap === 'apron') add('apron', 'Apron / plug (moccasin front)', null, 'Hand- or machine-sewn to the vamp with a raised or skin-stitched seam.');
  if (s.toecap === 'bumper') add('bumper', 'Rubber toe bumper', 'rubber-sheet', 'Moulded rubber cap applied before vulcanising.');
  if (s.toecap === 'shell') add('shell', 'Rubber shell (lower)', 'rubber-sheet', 'Moulded waterproof bottom; the shaft is stitched to its top edge and seam-sealed.');
  if (s.toecap === 'mudguard' || s.parts.includes('mudguard')) add('mudguard', 'Mudguard / rand', s.fabric && /mesh|nylon|knit/.test(s.fabric) ? 'suede' : null, 'Overlay wrapping the toe and sides above the sole.');
  if (s.parts.includes('counter') || /oxford|derby|monk/.test(s.type)) add('counter', 'Heel counter (outside)', null, 'Covers the back seam and stiffener; stitched to the quarters.');
  if (s.parts.includes('backstay') || s.cut === 'boot') add('backstay', 'Backstay (back strip)', null, 'Strip covering the back seam from counter to top.');
  if (s.closure === 'laces') { add('facing', 'Eyestay / facings', null, 'Reinforced with tape or a leather stay between outside and lining; takes the eyelets and hooks.'); add('tongue', s.gusset ? 'Bellows tongue (gusseted)' : 'Tongue', null, s.gusset ? 'Sewn to the facings up both sides to keep water and grit out.' : 'Stitched at its base to the vamp; padded on boots and sneakers.'); }
  if (s.closure === 'velcro' || s.closure === 'buckle' || s.closure === 'dial') { if (s.cut !== 'pump') add('tongue', 'Tongue', null, 'Under the straps.'); add('strap', s.closure === 'velcro' ? 'Hook-and-loop straps' : 'Straps', null, 'Lined, edges folded or painted; hook tape on the strap, loop tape on the upper.'); }
  if (s.closure === 'gore') add('gore', 'Elastic gores', 'elastic-webbing', 'Woven elastic inserted between outside and lining on both sides.');
  if (s.parts.includes('saddle')) add('saddle', 'Saddle strap', null, 'Strap across the instep with the cut-out slit.');
  if (s.parts.includes('side-panel') && s.sidePanel && s.sidePanel !== 'none') add('sidepanel', 'Side overlay', null, 'Decorative and supporting overlay on both sides.');
  if (s.parts.includes('heel-tab')) add('heeltab', 'Heel tab', null, 'Overlay at the top of the heel.');
  if (s.parts.includes('heel-clip')) add('heelclip', 'Heel clip (moulded)', 'tpu-film', 'External TPU counter wrapping the heel.');
  if (s.parts.includes('ankle-patch')) add('patch', 'Ankle patch', 'rubber-sheet', 'Round patch on the inside ankle.');
  if (s.parts.includes('ankle-strap') || s.ankleStrap || s.instepBar || s.sling) add('strap', s.sling ? 'Sling strap' : 'Strap', null, 'With a small buckle or elastic.');
  if (s.collar === 'padded' || s.collar === 'rolled') add('collar', 'Collar (padded top line)', /work-boot/.test(s.type) ? 'leather-cowhide' : null, 'Foam padding rolled in soft leather round the top line.');
  if (s.collar === 'fur-cuff') add('collar', 'Fur / shearling cuff', 'shearling-merino', 'Turned-down cuff at the top.');
  if (s.parts.includes('kiltie')) add('kiltie', 'Kiltie (false tongue)', null, 'Fringed leather under the laces that keeps debris out.');
  if (s.pullLoop || s.parts.includes('pull-straps')) add('pull', s.parts.includes('pull-straps') ? 'Pull straps' : 'Pull loop', s.type === 'chelsea-boot' ? 'cotton-webbing' : null, 'Stitched into the top line.');
  if (s.parts.includes('top-band')) add('topband', 'Top band', null, 'Contrast band round the top of the leg.');
  if (s.parts.includes('binding')) add('binding', 'Top-line binding', null, 'Folded binding carrying the drawstring.');
  add('lining', 'Lining', { calf: 'leather-calf-lining', pigskin: 'leather-pig-lining', 'textile-mesh': 'mesh', canvas: 'canvas', shearling: 'shearling-merino', 'waterproof-membrane': 'mesh', unlined: null }[s.opt?.lining || 'calf'], 'Vamp lining and quarter linings; the quarter lining is cut grain-side to the foot.');
  return P;
}

const r1 = (v) => Math.round(v * 10) / 10;
const arcPts = (cx, cy, rx, ry, a0, a1, n = 10) => { const out = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([r1(cx + Math.cos(a) * rx), r1(cy + Math.sin(a) * ry)]); } return out; };

/** Foot and last measurements for a body: length, ball girth, sizes. */
export function footOf(body) {
  const F = FOOT[body?.mannequin || 'male']; const g = body ? girthAt(body, 0) : 1;
  const len = (F.toe - F.heel) * g * 100; const width = F.width * g * 100;
  const ballGirth = width * 2.48; const last = len + 1.5;
  return { len: r1(len), width: r1(width), ballGirth: r1(ballGirth), instep: r1(ballGirth * 1.02), heelGirth: r1(len * 1.32), last: r1(last), eu: Math.round(last * 1.5 * 2) / 2, uk: Math.round(((last / 2.54) * 3 - 25) * 2) / 2, usM: Math.round(((last / 2.54) * 3 - 24) * 2) / 2, usW: Math.round(((last / 2.54) * 3 - 22.5) * 2) / 2, mondo: Math.round(len * 10 / 5) * 5 };
}

/**
 * Flat pattern pieces for one shoe (cut a mirrored pair for left and right), drafted from the
 * standard forme: the last's side surface flattened, length SL and half ball girth HG.
 * x runs from the back seam (0) to the toe; y up from the feather edge (where upper meets sole).
 */
export function shoePieces(s, body, fabric) {
  const F = footOf(body); const toe = TOE_SHAPES[s.toe] || TOE_SHAPES.round;
  const SL = F.last + toe.ext * 0.6; const HG = F.ballGirth / 2; const LA = 1.6; // lasting allowance
  const partFab = Object.fromEntries(shoeParts(s).map((p) => [p.id, p.fabric || fabric]));
  const out = [];
  const pc = (part, name, points, cut, note, extra = {}) => out.push({ name, points: points.map(([a, b]) => [r1(a), r1(b)]), fabric: partFab[part] || fabric, cut, note, part, ...extra });
  const backH = s.cut === 'low' || s.cut === 'pump' ? 6.3 : s.shaft; const vampPt = SL * (1 - s.throat) + 1; // from the toe
  const xV = SL - vampPt; // where the vamp ends towards the back (throat)
  const isOpen = s.cut === 'open';
  // ---- bottom pieces: insole, outsole, midsole, heel lifts, welt
  const sole = (grow, heelCut = 0) => { const w = F.width / 2 + grow; const hw = w * 0.68; const L = SL + grow * 2; const pts = [];
    for (let i = 0; i <= 28; i++) { const t = i / 28; const x = t * L; if (x < heelCut) continue; const wd = t < 0.1 ? hw * Math.sqrt(t / 0.1) : t < 0.38 ? hw + (w * 0.8 - hw) * ((t - 0.1) / 0.28) * 0.5 : t < 0.7 ? w * (0.74 + 0.26 * Math.sin(((t - 0.38) / 0.32) * Math.PI / 2)) : w * Math.max(toe.blunt * 0.8, Math.pow(Math.max(0, 1 - Math.pow((t - 0.7) / 0.3, 2.2)), 0.5 + toe.taper * 0.5)); pts.push([x, wd]); }
    return [...pts.map(([x, y]) => [x, y * 1.06]), ...pts.reverse().map(([x, y]) => [x, -y * 0.94])]; };
  if (!isOpen) {
    // ---- upper
    const cap = SL * 0.24 + toe.ext * 0.4; const vampW = HG + LA + 0.6;
    if (s.wholecut) pc('vamp', 'Wholecut upper', [[0, 0], [0, backH], ...arcPts(SL * 0.2, backH, SL * 0.2, 1.4, Math.PI, Math.PI * 1.5, 5), [xV * 0.7, backH - 1.2], [xV, vampW * 0.9], [SL * 0.75, vampW], ...arcPts(SL * 0.86, 0, SL * 0.14 + LA, vampW, Math.PI / 2, 0, 8)].map(([x, y]) => [x, y]).concat([[SL + LA, -LA], [0, -LA]]), 2, 'One piece each side of the fold at the centre front; cut on the fold or seam at the back only.');
    else {
      const vp = [[xV - 2.5, -LA], [xV - 1.5, vampW * 0.45], [xV + 0.5, vampW * 0.86], ...(s.closure === 'laces' && !s.closedLacing ? [[xV - 4.5, vampW + 1.5], [xV - 5, vampW + 3.2], [xV - 1, vampW + 3.4]] : []), [SL * 0.72, vampW + (s.closure === 'laces' && !s.closedLacing ? 3 : 0)], ...arcPts(SL * 0.84, vampW * 0.5, SL * 0.16 + LA, vampW * 0.55 + (s.closure === 'laces' && !s.closedLacing ? 3 : 0), Math.PI / 2, 0, 8), [SL + LA, -LA]];
      pc('vamp', 'Vamp', vp, 2, `Half pattern: cut on the fold along the top edge, or mirror. ${s.closure === 'laces' && !s.closedLacing ? 'The tab is where the tongue is attached. ' : ''}Lasting allowance ${LA * 10} mm included at the bottom.${s.perf ? ' Perforate the vamp (2 mm holes, 8 mm pitch).' : ''}`);
      if (s.cut !== 'mule' && s.cut !== 'pump') {
        const top = s.cut === 'low' ? backH : Math.min(backH, 9.5);
        const q = [[0, -LA], [0.3, top * 0.5], [0, top], ...(s.cut === 'low' ? arcPts(SL * 0.17, top, SL * 0.17, 1.6, Math.PI, Math.PI * 1.5, 5) : [[SL * 0.2, top]]), [xV - 3, s.cut === 'low' ? top - 1.1 : top], ...(s.closure === 'laces' ? [[xV + (s.closedLacing ? 0 : 5), vampW * 0.86 + 1.4], [xV + (s.closedLacing ? 0.5 : 6.5), vampW * 0.7]] : [[xV + 1, vampW * 0.8]]), [xV + (s.closedLacing ? 0 : 1.5), vampW * 0.3], [xV - 1, -LA]];
        pc('quarter', 'Quarter (outside)', q, 2, `Cut a pair per shoe is not needed: one outside quarter per shoe. ${s.closure === 'laces' ? `Mark ${s.rows} lace positions along the front edge, 1.1 cm in. ` : ''}Back edge joins the inside quarter with the back seam.`);
        pc('quarter', 'Quarter (inside)', q.map(([x, y]) => [x, y * 0.985]), 2, 'The inside (medial) quarter is slightly lower under the ankle bone; the inside waist is cut straighter.');
      }
    }
    if (s.cut === 'boot' || s.cut === 'mid') {
      const legTop = HG * 0.82 + Math.max(0, s.shaft - 16) * 0.12; const base = Math.min(s.shaft, 9.5);
      pc('shaft', s.cut === 'mid' ? 'Ankle piece' : 'Shaft (leg) half', [[0, base], [-0.6 - (s.shaft - base) * 0.03, s.shaft], [legTop, s.shaft], [legTop + 1.2, base + (s.shaft - base) * 0.4], [xV - 2, base]], 4, `Leg ${r1(s.shaft)} cm above the heel seat. Two halves per boot (inside and outside), closed by the back seam and backstay${s.zipSide && s.zipSide !== 'none' ? `; a ${s.zipSide} zip is set into the seam` : ''}.`);
    }
    if (s.toecap === 'cap' || s.toecap === 'steel') pc('toecap', 'Toe cap', [[SL - cap, vampW * 0.98], ...arcPts(SL - cap * 0.45, vampW * 0.5, cap * 0.45 + LA + 0.6, vampW * 0.55, Math.PI / 2, 0, 8), [SL + LA, -LA], [SL - cap, -LA]], 2, 'Half pattern, cut on the fold. Straight edge is folded or left raw and gimped, stitched with two rows 1.5 mm apart.');
    if (s.toecap === 'wingtip' || s.toecap === 'longwing') { const wl = s.toecap === 'longwing' ? SL * 0.98 : SL * 0.55; pc('toecap', s.toecap === 'longwing' ? 'Longwing cap' : 'Wing cap', [[SL - cap * 0.75, vampW * 0.98], [SL - cap * 1.2, vampW * 0.62], [SL - wl * 0.7, 2.6], [SL - wl, 1.6], [SL - wl, -LA], [SL + LA, -LA], ...arcPts(SL - cap * 0.4, vampW * 0.5, cap * 0.4 + LA + 0.6, vampW * 0.55, 0, Math.PI / 2, 8)], 2, 'Half pattern, cut on the fold at the centre point. Gimp the edge, punch the brogue rows (4 mm hole, two 1.5 mm holes) and the medallion before closing.'); }
    if (s.toecap === 'apron') pc('apron', 'Apron / plug', [[xV + 1, 0], ...arcPts(SL * 0.8, 0, SL * 0.14, F.width * 0.36, Math.PI / 2, 0, 8), [SL * 0.94, 0]].concat([[xV + 1, F.width * 0.3]]).sort((a, b) => a[0] - b[0] || b[1] - a[1]), 2, 'Half pattern on the fold. Sewn to the vamp wall with a raised seam (pre-punched for hand stitching).');
    if (out.some((p) => p.part === 'counter') || shoeParts(s).some((p) => p.id === 'counter')) pc('counter', 'Heel counter (outside)', [[0, -LA], [0, Math.min(backH, 6.3) * 0.92], [SL * 0.1, Math.min(backH, 6.3) * 0.95], [SL * 0.2, 3.2], [SL * 0.25, -LA]], 2, 'Half pattern on the fold at the back seam.');
    if (shoeParts(s).some((p) => p.id === 'backstay')) pc('backstay', 'Backstay', [[-1.1, 0], [1.1, 0], [0.9, backH], [-0.9, backH]], 1, 'Covers the back seam; skive both long edges.');
    if (s.closure === 'laces') {
      const fl = Math.max(6, (s.cut === 'low' ? 7.5 : s.shaft + 4) + (s.rows - 4) * 0.6);
      pc('facing', 'Eyestay / facing', [[0, 0], [fl, 0], [fl, 2.3], [0, 2.6]], 2, `One per side. Lace positions: ${s.rowKinds.map((k) => ({ hole: 'punched hole', blind: 'blind eyelet', eyelet: 'eyelet', hook: 'speed hook', dring: 'D-ring', loop: 'webbing loop', lock: 'locking eyelet' }[k])).join(', ')} (from the toe end), pitch ${r1((fl - 1.6) / Math.max(1, s.rows - 1))} cm. Back with an eyelet stay tape.`);
      pc('tongue', s.gusset ? 'Bellows tongue' : 'Tongue', [[-2.6 - (s.gusset ? 3 : 0), 0], [2.6 + (s.gusset ? 3 : 0), 0], [3.4 + (s.gusset ? 3.5 : 0), fl * 0.8], ...arcPts(0, fl + 1.5, 3.6, 2.2, 0, Math.PI, 6), [-3.4 - (s.gusset ? 3.5 : 0), fl * 0.8]], 1, s.gusset ? 'The side wings are stitched to the facings; fold lines 2.6 cm either side of the centre.' : 'Skive the base and stitch to the vamp tab; line or fold the top edge.');
    }
    if (shoeParts(s).some((p) => p.id === 'collar')) pc('collar', s.collar === 'fur-cuff' ? 'Cuff' : 'Collar', [[0, 0], [F.heelGirth * 0.55, 0], [F.heelGirth * 0.55, s.collar === 'fur-cuff' ? 7 : 4.2], [0, s.collar === 'fur-cuff' ? 7 : 4.2]], 1, s.collar === 'fur-cuff' ? 'Sewn to the top line and turned down.' : 'Rolled over a 10 mm foam strip and stitched down inside.');
    if (shoeParts(s).some((p) => p.id === 'strap')) pc('strap', 'Strap', [[0, 0], [F.instep * 0.55, 0], [F.instep * 0.55 + 1, 1.1], [F.instep * 0.55, 2.2], [0, 2.2]], (typeof s.straps === 'number' ? Math.max(1, s.straps) : 1) * 2, 'Cut twice per strap (outside and lining), cemented and stitched; edges painted.');
    if (shoeParts(s).some((p) => p.id === 'saddle')) pc('saddle', 'Saddle strap', [[0, 0], [F.instep * 0.6, 0], [F.instep * 0.6, 3], [F.instep * 0.36, 3.6], [F.instep * 0.24, 3.6], [0, 3]], 1, 'Cut the slit 2.2 x 0.6 cm at the centre; ends are stitched into the apron seam.', { holes: [[[F.instep * 0.3 - 1.1, 1.5], [F.instep * 0.3 + 1.1, 1.5], [F.instep * 0.3 + 1.1, 2.1], [F.instep * 0.3 - 1.1, 2.1]]] });
    if (shoeParts(s).some((p) => p.id === 'mudguard')) pc('mudguard', 'Mudguard', [[SL * 0.35, -LA], [SL * 0.35, 1.8], [SL * 0.75, 2.6], ...arcPts(SL * 0.86, 1.4, SL * 0.14 + LA, 2.6, Math.PI / 2, 0, 6), [SL + LA, -LA]], 2, 'Half pattern on the fold at the toe.');
    if (shoeParts(s).some((p) => p.id === 'pull')) pc('pull', 'Pull loop', [[0, 0], [2, 0], [2, 11], [0, 11]], s.parts.includes('pull-straps') ? 2 : 1, 'Folded in half and stitched into the top line.');
    if (shoeParts(s).some((p) => p.id === 'kiltie')) pc('kiltie', 'Kiltie', [[-4, 0], [4, 0], [4.5, 9], ...Array.from({ length: 9 }, (_, i) => [[4.5 - i - 0.5, 10.2], [4.5 - i - 1, 9]]).flat(), [-4.5, 9]], 1, 'Fringe cut 1 cm deep; lace holes punched to match the bottom two rows.');
    // ---- lining and stiffeners
    if (s.opt?.lining !== 'unlined') {
      pc('lining', 'Vamp lining', [[xV - 2, -LA + 0.4], [xV - 1, vampW * 0.86], [SL * 0.75, vampW], ...arcPts(SL * 0.86, vampW * 0.5, SL * 0.14 + LA - 0.4, vampW * 0.5, Math.PI / 2, 0, 6), [SL + LA - 0.4, -LA + 0.4]], 2, 'Half pattern on the fold. 2 mm smaller than the vamp all round.');
      if (s.cut !== 'mule') pc('lining', 'Quarter lining', [[0, -LA + 0.4], [0, backH + 0.5], [SL * 0.2, backH + 0.5], [xV, vampW * 0.8], [xV, -LA + 0.4]], 2, 'One-piece counter lining, 5 mm above the top line for trimming after top-line stitching.');
    }
    const puff = s.opt?.toePuff && s.opt.toePuff !== 'auto' ? s.opt.toePuff : /work|logger|combat|engineer|mountaineer/.test(s.type) ? 'thermoplastic' : s.cut === 'pump' || /oxford|derby|monk|boot/.test(s.type) ? 'thermoplastic' : /sneaker|canvas|runner|skate|trainer/.test(s.type) ? 'thermoplastic' : 'none (unstructured)';
    if (!/none/.test(puff)) pc('lining', `Toe puff (${puff})`, [[SL - cap * 0.9, vampW * 0.9], ...arcPts(SL - cap * 0.4, vampW * 0.45, cap * 0.4 + LA, vampW * 0.5, Math.PI / 2, 0, 6), [SL + LA, -LA], [SL - cap * 0.9, -LA]], 2, 'Half pattern on the fold; skived to nothing at the back edge. Activated by heat or solvent and lasted between upper and lining.', { fabric: 'interfacing-stiffener' });
    if (s.cut !== 'mule') pc('lining', 'Heel stiffener (counter)', [[0, -LA], [0, Math.min(backH, 6) * 0.85], [SL * 0.09, Math.min(backH, 6) * 0.88], [SL * 0.24, 2.4], [SL * 0.3, -LA]], 2, 'Half pattern on the fold at the back. Leatherboard or thermoplastic, skived on all edges, moulded to the last.', { fabric: 'interfacing-stiffener' });
  } else {
    const n = { slide: 1, 'two-band': 2, thong: 1, sport: 3, gladiator: 7, ankle: 2, 'ankle-tie': 2, fisherman: 6, woven: 9 }[s.straps] || 2;
    const w = { slide: 9, 'two-band': 5, thong: 1.4, sport: 2.5, gladiator: 1.2, ankle: 1.2, 'ankle-tie': 2.5, fisherman: 1.8, woven: 1 }[s.straps] || 2;
    for (let i = 0; i < Math.min(n, 4); i++) pc('straps', `Strap ${i + 1}${n > 4 && i === 3 ? ` (and ${n - 4} more like it)` : ''}`, [[0, 0], [F.instep * (0.62 - i * 0.03) + 3, 0], [F.instep * (0.62 - i * 0.03) + 3, w], [0, w]], n > 4 && i === 3 ? (n - 3) * 2 : 2, `Outside and lining. 1.5 cm at each end is lasted under the insole${/buckle/.test(s.closure) ? '; one strap carries the buckle, punch 5 holes at 8 mm' : ''}.`);
    pc('footbed', 'Footbed cover', sole(0.3), 1, 'Wrapped over the insole board / footbed and cemented.');
  }
  // ---- bottom
  const soleFab = { leather: 'leather-sole-bend' }[s.outsole] || 'leather-sole-bend';
  const bottom = (name, pts, cut, note) => out.push({ name, points: pts.map(([a, b]) => [r1(a), r1(b)]), fabric: soleFab, cut, note, part: 'bottom', material: name });
  bottom(`Insole (${s.construction === 'strobel' ? 'strobel sock, non-woven' : 'leather or cellulose board, 2.5-3.5 mm'})`, sole(0), 1, s.construction === 'goodyear-welt' || s.construction === 'storm-welt' ? 'Channelled or ribbed (gemming) 6 mm in from the edge to take the welt seam.' : 'Shaped to the last bottom.');
  if (s.midsole && s.midsole !== 'none') bottom(`Midsole (${SOLE_MATERIALS[s.midsole]?.name || s.midsole})`, sole(s.ext), 1, 'Between the welt and the outsole.');
  bottom(`Outsole (${SOLE_MATERIALS[s.outsole]?.name || s.outsole}, ${TREADS[s.tread] || s.tread})`, sole(s.ext + (CONSTRUCTIONS[s.construction]?.welt ? 0.45 : 0.1), HEELS[s.heel]?.pin ? 0 : 0), 1, `${CONSTRUCTIONS[s.construction]?.name}. Forefoot ${r1(s.soleT * 10)} mm${s.platform ? ` including a ${r1(s.platform * 10)} mm platform` : ''}.`);
  if (CONSTRUCTIONS[s.construction]?.welt) bottom('Welt strip', [[0, 0], [SL * 2.25, 0], [SL * 2.25, 1.8], [0, 1.8]], 1, `${CONSTRUCTIONS[s.construction].storm ? 'Storm welt with a raised lip. ' : ''}3 mm vegetable-tanned leather, runs heel breast to heel breast (360 degree welt: add ${r1(SL * 0.7)} cm).`);
  if (!HEELS[s.heel]?.wedge && s.heelH > 0.9) { const lifts = Math.max(1, Math.round((s.heelH - s.soleT * 0.4) / 0.6)); const hp = sole(s.ext + 0.3).filter(([x]) => x <= SL * (HEELS[s.heel]?.breast || 0.27)); bottom(HEELS[s.heel]?.pin ? 'Heel (moulded, steel pin) cover' : `Heel lift (x${lifts} stacked) and top piece`, hp.length > 4 ? hp : [[0, -3], [6, -3], [6, 3], [0, 3]], HEELS[s.heel]?.pin ? 1 : lifts + 1, HEELS[s.heel]?.pin ? `Covering for a ${r1(s.heelH)} cm ${HEELS[s.heel].name.toLowerCase()} heel: wrap, seam at the breast. Top piece 9-11 mm polyurethane with a steel dowel.` : `${r1(s.heelH)} cm total heel height. Last lift is a rubber or quarter-rubber top piece.`); }
  const shank = s.opt?.shank && s.opt.shank !== 'auto' ? s.opt.shank : s.heelH >= 2 ? 'steel' : 'none';
  if (shank !== 'none') bottom(`Shank (${shank})`, [[SL * 0.18, -0.6], [SL * 0.58, -0.6], [SL * 0.58, 0.6], [SL * 0.18, 0.6]], 1, 'Bridges the waist of the shoe between heel and ball; set in the bottom filler.');
  return out;
}

/** Lace length in cm for n pairs of holes: gap across, pitch along, plus the bow. */
export function laceLength(s, body) {
  const F = footOf(body); const n = s.rows; if (!n || s.closure !== 'laces') return 0;
  const gap = Math.max(2.5, F.instep * 0.11 + (s.cut === 'boot' ? 1 : 0)); const run = (s.cut === 'low' ? 7.5 : s.shaft + 4) + (n - 4) * 0.6; const pitch = run / Math.max(1, n - 1);
  const cross = Math.hypot(gap, pitch);
  const body_ = s.lacing === 'straight-bar' ? n * gap + 2 * (n - 1) * pitch : s.lacing === 'ladder' ? 2 * (n - 1) * (pitch + gap * 0.5) + gap : 2 * (n - 1) * cross + gap;
  return Math.ceil((body_ + 2 * (s.cut === 'boot' ? 30 : 25)) / 15) * 15;
}

/** Everything a maker needs that is not a pattern piece: last, hardware counts, bottoming. */
export function shoeSheet(s, body, fabricName) {
  const F = footOf(body); const C = CONSTRUCTIONS[s.construction] || {}; const toe = TOE_SHAPES[s.toe] || {};
  const count = (k) => s.rowKinds.filter((x) => x === k).length * 4; // two sides, two shoes
  const hw = [];
  if (count('eyelet')) hw.push(`${count('eyelet')} ${s.hexEyelets ? 'hexagonal ' : ''}eyelets with washers (${METALS[s.metal]?.[0]}, 5 mm bore)`);
  if (count('blind')) hw.push(`${count('blind')} blind eyelets set from the lining side`);
  if (count('hole')) hw.push(`${count('hole')} punched holes (3.5 mm) with reinforcing tape`);
  if (count('hook')) hw.push(`${count('hook')} speed hooks, riveted with backing washers (${METALS[s.metal]?.[0]})`);
  if (count('dring')) hw.push(`${count('dring')} D-rings on riveted tabs (${METALS[s.metal]?.[0]})`);
  if (count('lock')) hw.push(`${count('lock')} locking eyelets`);
  if (count('loop')) hw.push(`${count('loop')} webbing loops, bar-tacked`);
  if (s.closure === 'buckle') hw.push(`${(typeof s.straps === 'number' ? s.straps : 1) * 2} roller buckles (${METALS[s.metal]?.[0]}) with keepers`);
  if (s.closure === 'velcro') hw.push(`${(typeof s.straps === 'number' ? s.straps : 2) * 2} hook-and-loop sets, 25 mm, with moulded strap rings`);
  if (s.zipSide && s.zipSide !== 'none' && (s.closure === 'zip' || s.type === 'platform-boot')) hw.push(`2 zips, No. 5 metal, ${Math.round(s.shaft - 2)} cm, ${s.zipSide}, with leather zip guard`);
  if (s.closure === 'gore') hw.push('4 elastic gores (woven, 2 per boot)');
  const rows = [
    ['Style', `${s.name} · ${TOE_SHAPES[s.toe]?.name || s.toe} toe`],
    ['Size', `EU ${F.eu} · UK ${F.uk} · US men ${F.usM} / women ${F.usW} · Mondopoint ${F.mondo}`],
    ['Foot', `Length ${F.len} cm · ball width ${F.width} cm · ball girth ${F.ballGirth} cm · instep girth ${F.instep} cm`],
    ['Last', `Stick length ${r1(F.last + (toe.ext || 1.3))} cm (foot + 1.5 cm allowance + ${toe.ext} cm toe extension) · width ${s.opt?.width || 'D (standard)'} · heel pitch ${r1(s.heelH)} cm · toe spring ${r1(s.toeSpring || (s.heelH > 5 ? 0.8 : 1.0))} cm`],
    ['Upper', `${fabricName}${shoeParts(s).filter((p) => p.fabric).length ? ' with contrast pieces (see cut list)' : ''} · ${s.stitchRows} row(s) of stitching at 3-3.5 stitches per cm, bonded nylon or polyester Tex 70-90`],
    ['Lining / footbed', `${s.opt?.lining || 'calf'} lining · ${s.opt?.insole || 'leather-sock'} footbed`],
    ['Closure', s.closure === 'laces' ? `${s.rows} rows · ${LACE_HARDWARE[s.hardware]?.name} · ${LACINGS[s.lacing]} · ${LACES[s.lace]?.name}, ${laceLength(s, body)} cm per lace, metal or acetate aglets` : s.closure],
    ['Hardware (per pair)', hw.join('; ') || 'none'],
    ['Construction', `${C.name}: ${C.desc}`],
    ['Bottom', `${s.midsole && s.midsole !== 'none' ? `${SOLE_MATERIALS[s.midsole]?.name} midsole, ` : ''}${SOLE_MATERIALS[s.outsole]?.name} outsole, ${TREADS[s.tread]}, forefoot ${r1(s.soleT * 10)} mm${s.platform ? ` (platform ${r1(s.platform * 10)} mm)` : ''}`],
    ['Heel', `${HEELS[s.heel]?.name}, ${r1(s.heelH)} cm${HEELS[s.heel]?.pin ? ', moulded with a steel pin, replaceable top piece' : ''}`],
    ['Stiffeners', `Toe puff and heel counter stiffener (see cut list)${s.heelH >= 2 ? ', shank in the waist' : ''}`],
    ['Adhesives', C.stitched ? 'Neoprene (contact) cement for closing and bottom filling; cork-latex filler' : 'Polyurethane cement on halogenated / primed surfaces, heat reactivated and pressed 10-15 s at 3-4 bar'],
    ['Order of work', 'Clicking (cutting) → skiving and edge folding → closing (stitching the upper, eyeletting) → lasting (toe puff and counter in, upper pulled over the last, 24 h or heat-set) → bottoming (welt / midsole / sole, heel attached) → finishing (edge trimming, inking, burnishing, de-lasting, sock lining, lacing) → inspection and boxing'],
  ];
  return rows;
}

/** A pair of shoes as a garment: no draped panels, but stance, 3D spec, pieces and colliders. */
export function buildShoe(o, prefix = '', fabric = 'leather-calfskin') {
  const s = shoeSpec(o); const body = o.__body;
  const parts = shoeParts(s);
  const spec = { kind: 'shoe', ...s, opt: undefined, fabric, color: o.color && o.color !== '#000000' ? o.color : null, parts,
    laceColor: o.laceColor, outsoleColor: o.outsoleColor !== '#000001' ? o.outsoleColor : s.outsoleColor || null, midsoleColor: o.midsoleColor !== '#000001' ? o.midsoleColor : s.midsoleColor || null, weltColor: o.weltColor !== '#000001' ? o.weltColor : null, stitchColor: o.stitchColor !== '#000001' ? o.stitchColor : null,
    liningColor: o.liningColor, heelMaterial: o.heelMaterial || 'auto', tied: o.tied || 'tied', widthFit: o.width };
  const stance = { sole: s.soleT / 100, heel: s.pitch / 100 };
  // what trousers and skirts fall on: the shoe over the foot and the leg of a boot
  const colliders = [];
  if (body) {
    const F = FOOT[body.mannequin || 'male']; const b2 = { ...body, soleLift: stance.sole, heelLift: stance.heel };
    for (const sd of [1, -1]) {
      const h = gradePoint(b2, sd * F.x, 0.035, F.heel + 0.035); const t = gradePoint(b2, sd * F.x, 0.03, F.toe - 0.03);
      if (s.cut !== 'open') colliders.push({ a: h, b: [t[0], t[1] + 0.004, t[2] + (TOE_SHAPES[s.toe]?.ext || 1.3) / 100], r: 0.05, zs: 1, ys: 0.92 });
      if (s.cut === 'boot' || s.cut === 'mid') { const a = gradePoint(b2, sd * (F.x - 0.006), 0.09, -0.03); const top = gradePoint(b2, sd * (F.x - 0.02), 0.085, -0.03); top[1] = h[1] - 0.035 + s.shaft / 100; top[0] = a[0] - sd * Math.min(0.03, s.shaft / 100 * 0.07); colliders.push({ a, b: top, r: 0.052 + Math.min(0.02, Math.max(0, s.shaft - 22) * 0.001), zs: 1.1, ys: 1 }); }
    }
  }
  return { panels: [], seams: [], trims: [], overlays: [], shoes: [spec], pieces: body ? shoePieces(s, body, fabric) : [], colliders, meta: { stance, sheet: body ? shoeSheet(s, body, fabric) : [] } };
}
