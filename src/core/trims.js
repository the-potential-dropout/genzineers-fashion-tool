// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Trims, fasteners and decorations that attach to a point (or a line) on a
 * pattern panel. Positions are in panel space (cm); size in mm.
 *
 * shape drives 3D rendering: button | shank | toggle | snap | rivet | grommet |
 * stud-cone | stud-pyramid | stud-dome | spike | crystal | pearl | bead |
 * sequin | label | patch | buckle | ring | loop | stopper | knot | pompom |
 * tassel | bow | pin | linear (zip / chain / fringe / piping / tape / strap)
 * `line: true` trims take `at` and `to` (a line on the panel).
 */
const t = (group, name, shape, size, color, metalness, roughness, use, extra = {}) => ({ group, name, shape, size, color, metalness, roughness, use, ...extra });

export const TRIMS = {
  // ---------------- Buttons ----------------
  'button-2hole': t('Buttons', 'Button, 2-hole (polyester)', 'button', 15, '#f1ece2', 0, 0.4, 'Shirts, knits, casual', { holes: 2, ligne: 24 }),
  'button-4hole': t('Buttons', 'Button, 4-hole (polyester)', 'button', 18, '#2b2b2b', 0, 0.35, 'General purpose: shirts, jackets, trousers', { holes: 4, ligne: 28, recommended: true }),
  'button-mop': t('Buttons', 'Mother-of-pearl (trocas / MOP)', 'button', 11, '#f6f1ea', 0.2, 0.15, 'Premium dress shirts', { holes: 4, ligne: 18, iridescent: true }),
  'button-horn': t('Buttons', 'Horn (genuine)', 'button', 20, '#4a3426', 0, 0.3, 'Tailoring: suits, blazers, overcoats', { holes: 4, ligne: 32 }),
  'button-corozo': t('Buttons', 'Corozo (tagua nut)', 'button', 20, '#7a5b3e', 0, 0.35, 'Sustainable alternative to horn; dyeable', { holes: 4, ligne: 32 }),
  'button-wood': t('Buttons', 'Wood', 'button', 20, '#9a6b3d', 0, 0.6, 'Knitwear, casual, chore coats', { holes: 4 }),
  'button-coconut': t('Buttons', 'Coconut shell', 'button', 15, '#5a4030', 0, 0.55, 'Camp/resort shirts', { holes: 2 }),
  'button-leather-knot': t('Buttons', 'Leather knot (football)', 'stud-dome', 20, '#5a3a24', 0, 0.6, 'Tweed jackets, cardigans', {}),
  'button-covered': t('Buttons', 'Fabric-covered', 'button', 18, '#111111', 0, 0.5, 'Dinner jackets, couture, dresses', { holes: 0 }),
  'button-shank': t('Buttons', 'Shank button (metal)', 'shank', 17, '#c9a54a', 0.9, 0.25, 'Blazers, coats, cardigans', {}),
  'button-brass': t('Buttons', 'Brass / gold blazer button', 'shank', 20, '#d4af37', 1.0, 0.2, 'Navy blazers, military', {}),
  'button-pewter': t('Buttons', 'Pewter / antique silver', 'shank', 18, '#8d9096', 1.0, 0.35, 'Heritage, folk, workwear', {}),
  'button-anchor': t('Buttons', 'Anchor button (peacoat)', 'shank', 25, '#1a1a1a', 0.2, 0.4, 'Peacoats', {}),
  'button-enamel': t('Buttons', 'Enamel', 'shank', 15, '#a3202a', 0.5, 0.2, 'Statement buttons, womenswear', {}),
  'button-resin': t('Buttons', 'Resin (tortoiseshell effect)', 'button', 20, '#6b3f1e', 0, 0.2, 'Coats, cardigans', { holes: 4 }),
  'button-glass': t('Buttons', 'Glass', 'shank', 12, '#8fd3e8', 0.1, 0.05, 'Eveningwear, vintage', {}),
  'button-ball': t('Buttons', 'Ball / bead button', 'pearl', 10, '#f3f0ea', 0.1, 0.2, 'Wedding dresses (with loops), qipao', {}),
  'button-novelty': t('Buttons', 'Novelty shaped', 'button', 22, '#ff7a1a', 0, 0.4, 'Kidswear, fun details', { holes: 2 }),
  'jeans-button': t('Buttons', 'Jeans tack button', 'shank', 17, '#b0703c', 0.9, 0.3, 'Jeans waistbands, trucker jackets (hammered on, no sewing)', {}),
  'toggle-horn': t('Buttons', 'Toggle (horn / wood)', 'toggle', 45, '#3f2b1e', 0, 0.4, 'Duffle coats', {}),
  'frog-closure': t('Buttons', 'Frog closure (Chinese knot)', 'knot', 40, '#111111', 0, 0.6, 'Mandarin jackets, qipao', {}),
  'cufflink': t('Buttons', 'Cufflink', 'shank', 14, '#c0c0c0', 1.0, 0.2, 'French cuffs', {}),
  // ---------------- Fasteners & hardware ----------------
  'snap': t('Fasteners', 'Snap fastener (ring spring)', 'snap', 12, '#bfc3c9', 0.9, 0.3, 'Jackets, workwear, kidswear', {}),
  'snap-pearl': t('Fasteners', 'Pearl snap (western)', 'snap', 12, '#f3efe7', 0.4, 0.15, 'Western shirts', {}),
  'magnetic-snap': t('Fasteners', 'Magnetic snap', 'snap', 18, '#c9a54a', 0.9, 0.3, 'Bags, flaps', {}),
  'hook-eye': t('Fasteners', 'Hook & eye / hook-bar', 'snap', 10, '#9aa0a6', 1.0, 0.3, 'Trouser waistbands, bras, dresses', {}),
  'rivet': t('Fasteners', 'Rivet (copper)', 'rivet', 8, '#b0643a', 0.9, 0.35, 'Jeans pocket corners, workwear', {}),
  'grommet': t('Fasteners', 'Grommet / eyelet', 'grommet', 12, '#9aa0a6', 0.9, 0.3, 'Drawcords, lacing, vents', {}),
  'buckle': t('Fasteners', 'Buckle (metal)', 'buckle', 40, '#b8b8b8', 1.0, 0.25, 'Belts, straps, trench coats', {}),
  'side-release-buckle': t('Fasteners', 'Side-release buckle (plastic)', 'buckle', 25, '#111111', 0, 0.5, 'Bags, fanny packs, backpacks', {}),
  'd-ring': t('Fasteners', 'D-ring', 'ring', 25, '#b8b8b8', 1.0, 0.25, 'Straps, bags, belts', {}),
  'o-ring': t('Fasteners', 'O-ring', 'ring', 30, '#b8b8b8', 1.0, 0.25, 'Bags, harness details', {}),
  'swivel-clasp': t('Fasteners', 'Swivel clasp / lobster hook', 'ring', 30, '#c9a54a', 1.0, 0.25, 'Bag straps, keyrings', {}),
  'cord-stopper': t('Fasteners', 'Cord stopper / toggle', 'stopper', 18, '#151515', 0, 0.6, 'Drawcords on hoods, hems, bags', {}),
  'belt-loop': t('Fasteners', 'Belt loop', 'loop', 12, '#000000', 0, 0.8, 'Trousers, coats', { useFabric: true }),
  'velcro': t('Fasteners', 'Hook & loop tape', 'label', 25, '#222222', 0, 0.9, 'Cuffs, pockets, kidswear', {}),
  'zipper': t('Zippers', 'Zipper (configurable)', 'linear', 6, '#b8b8b8', 1.0, 0.3, 'Any garment: choose type, size, ends, slider and puller', { line: true, zip: 'metal' }),
  'zipper-coil': t('Zippers', 'Zip (nylon coil, #5)', 'linear', 5, '#111111', 0, 0.5, 'Garments, linings, pockets', { line: true, zip: 'coil' }),
  'zipper-invisible': t('Zippers', 'Zip (invisible / concealed)', 'linear', 3, '#222222', 0, 0.5, 'Dresses, skirts', { line: true, zip: 'invisible' }),
  'zipper-waterproof': t('Zippers', 'Zip (water-resistant, coated)', 'linear', 6, '#111111', 0.1, 0.2, 'Shell jackets', { line: true, zip: 'coil' }),
  'zipper-vislon': t('Zippers', 'Zip (moulded plastic / Vislon type)', 'linear', 7, '#e5e5e5', 0, 0.4, 'Parkas, sportswear', { line: true, zip: 'moulded' }),
  // ---------------- Lingerie hardware & elastics ----------------
  'underwire': t('Lingerie', 'Underwire (steel / nylon-coated)', 'linear', 3, '#cfcfcf', 0.6, 0.4, 'Cup support; sewn into a channelling casing', { line: true }),
  'bra-hook-eye': t('Lingerie', 'Bra hook & eye (3x2)', 'label', 30, '#e8d6cc', 0.3, 0.5, 'Back or front band closure, 3 rows of eyes for adjustment', {}),
  'strap-slider': t('Lingerie', 'Strap slider (8-shape)', 'ring', 14, '#d8c3b4', 0.5, 0.3, 'Adjusts strap length (metal or nylon-coated)', {}),
  'strap-ring': t('Lingerie', 'Strap ring (O-ring)', 'ring', 12, '#d8c3b4', 0.5, 0.3, 'Joins strap to cup / band', {}),
  'picot-elastic': t('Lingerie', 'Picot elastic (8-12 mm)', 'linear', 4, '#f2e6dc', 0, 0.7, 'Decorative edge elastic for bands and leg openings', { line: true, tape: true }),
  'plush-elastic': t('Lingerie', 'Plush-back elastic (strap / band)', 'linear', 12, '#f2e6dc', 0, 0.7, 'Soft brushed back against the skin', { line: true, tape: true }),
  'fold-over-elastic': t('Lingerie', 'Fold-over elastic (FOE)', 'linear', 15, '#111111', 0, 0.6, 'Binds raw edges in one step', { line: true, tape: true }),
  'jacquard-waistband': t('Lingerie', 'Jacquard waistband elastic (branded)', 'linear', 35, '#111111', 0, 0.6, 'Exposed logo waistband for boxer briefs / trunks', { line: true, tape: true }),
  'bra-gore-bow': t('Lingerie', 'Centre gore bow', 'bow', 14, '#f2e6dc', 0, 0.6, 'Classic small bow at the centre front', {}),
  'lacing': t('Fasteners', 'Lacing (eyelets + cord)', 'linear', 6, '#111111', 0.2, 0.6, 'Corsets, lace-up fronts/backs, lingerie, boots', { line: true, lacing: true }),
  'edge-trim': t('Edges', 'Decorative edge', 'linear', 8, '#ffffff', 0, 0.7, 'Scallops, ruffles, fringe, piping... along an edge', { line: true, edge: true }),
  // ---------------- Decorations ----------------
  'stud-cone': t('Decorations', 'Cone stud', 'stud-cone', 10, '#c8c8c8', 1.0, 0.2, 'Punk / rock leather', {}),
  'stud-pyramid': t('Decorations', 'Pyramid stud', 'stud-pyramid', 10, '#c8c8c8', 1.0, 0.2, 'Belts, jackets, bags', {}),
  'stud-dome': t('Decorations', 'Dome stud', 'stud-dome', 8, '#c8c8c8', 1.0, 0.2, 'Denim, leather', {}),
  'spike-short': t('Decorations', 'Spike (short, 15 mm)', 'spike', 15, '#c8c8c8', 1.0, 0.2, 'Punk jackets, collars', {}),
  'spike-long': t('Decorations', 'Spike (long, 30 mm)', 'spike', 30, '#c8c8c8', 1.0, 0.2, 'Statement shoulders', {}),
  'spike-black': t('Decorations', 'Spike (black matte)', 'spike', 20, '#1a1a1a', 0.6, 0.6, 'Goth / streetwear', {}),
  'rhinestone': t('Decorations', 'Rhinestone (hot-fix glass)', 'crystal', 4, '#e8f4ff', 0.3, 0.02, 'Eveningwear, logos, embellishment', { faceted: true }),
  'crystal-sew-on': t('Decorations', 'Sew-on crystal (faceted)', 'crystal', 10, '#d9ecff', 0.3, 0.02, 'Couture, bridal', { faceted: true }),
  'pearl': t('Decorations', 'Pearl (faux / freshwater)', 'pearl', 6, '#f8f4ec', 0.2, 0.15, 'Bridal, collars, knitwear', {}),
  'seed-bead': t('Decorations', 'Seed bead', 'bead', 2, '#ffffff', 0.4, 0.1, 'Beading, embroidery', {}),
  'bugle-bead': t('Decorations', 'Bugle bead', 'bead', 6, '#c0c0c0', 0.8, 0.1, 'Flapper / eveningwear', {}),
  'sequin': t('Decorations', 'Sequin (6 mm)', 'sequin', 6, '#d0d4dc', 1.0, 0.1, 'Party dresses, embellishment', {}),
  'paillette': t('Decorations', 'Paillette (large sequin)', 'sequin', 20, '#d4af37', 1.0, 0.1, 'Statement eveningwear', {}),
  'chain': t('Decorations', 'Chain (curb)', 'linear', 6, '#c8c8c8', 1.0, 0.2, 'Bag straps, punk details, trims', { line: true, chain: true }),
  'safety-pin': t('Decorations', 'Safety pin (decorative)', 'pin', 35, '#c8c8c8', 1.0, 0.25, 'Punk', {}),
  'fringe': t('Decorations', 'Fringe', 'linear', 60, '#5a3a24', 0, 0.8, 'Western jackets, scarves, bags', { line: true, fringe: true }),
  'tassel': t('Decorations', 'Tassel', 'tassel', 50, '#c9a54a', 0, 0.7, 'Bags, drawcords, homewear', {}),
  'pompom': t('Decorations', 'Pom-pom', 'pompom', 70, '#efefef', 0, 1.0, 'Beanies, kidswear', {}),
  'bow': t('Decorations', 'Bow', 'bow', 50, '#111111', 0, 0.5, 'Dresses, hair, waistbands', {}),
  'feather': t('Decorations', 'Feather trim', 'tassel', 80, '#f2f2f2', 0, 0.9, 'Eveningwear, hats', {}),
  'piping': t('Decorations', 'Piping cord', 'linear', 3, '#111111', 0, 0.6, 'Pyjamas, edges, seams', { line: true }),
  'grosgrain': t('Decorations', 'Grosgrain ribbon / tape', 'linear', 15, '#1a1a1a', 0, 0.6, 'Hat bands, tuxedo stripes, taping', { line: true, tape: true }),
  'reflective-tape': t('Decorations', 'Reflective tape', 'linear', 25, '#d9d9d9', 0.6, 0.2, 'Safety, sportswear', { line: true, tape: true }),
  'lace-trim': t('Decorations', 'Lace trim', 'linear', 30, '#fbf7f0', 0, 0.7, 'Lingerie, hems', { line: true, tape: true }),
  'embroidery': t('Decorations', 'Embroidered logo', 'patch', 60, '#ffffff', 0, 0.6, 'Chest logos, caps', { flat: true }),
  'patch': t('Decorations', 'Patch / appliqué', 'patch', 70, '#ff5a1f', 0, 0.9, 'Workwear, varsity, streetwear', {}),
  'chenille-patch': t('Decorations', 'Chenille patch (varsity letter)', 'patch', 120, '#b5122b', 0, 1.0, 'Varsity jackets', {}),
  'pvc-patch': t('Decorations', 'PVC / rubber patch', 'patch', 60, '#222222', 0, 0.4, 'Tactical, outdoor', {}),
  'label': t('Labels', 'Woven main label', 'label', 40, '#111111', 0, 0.8, 'Neck / back label', {}),
  'label-care': t('Labels', 'Care / composition label', 'label', 30, '#ffffff', 0, 0.8, 'Legally required content & care info', {}),
  'label-leather': t('Labels', 'Leather / jacron patch', 'label', 60, '#8a5a34', 0, 0.6, 'Jeans back waistband', {}),
  'stitch-line': t('Hidden', 'Decorative stitch line', 'knot', 1, '#000000', 0, 0.5, '', { internal: true }),
  'tie-knot': t('Hidden', 'Tie knot', 'knot', 35, '#000000', 0, 0.5, '', { useFabric: true, internal: true }),
  'strap': t('Bags', 'Strap / handle', 'linear', 30, '#3a2418', 0, 0.6, 'Bag handles and straps', { line: true, strap: true, useFabric: true }),
  'cap-button': t('Hidden', 'Cap top button (squatchee)', 'stud-dome', 18, '#000000', 0, 0.5, '', { useFabric: true }),
  'snapback-strap': t('Hidden', 'Snapback closure', 'label', 40, '#1a1a1a', 0, 0.5, '', {}),
};

export const TRIM_GROUPS = ['Buttons', 'Zippers', 'Fasteners', 'Decorations', 'Edges', 'Lingerie', 'Labels', 'Bags'];

// ---------------- Zippers ----------------
export const ZIPPER_TYPES = {
  'metal-brass': { name: 'Metal, brass', teeth: '#c9a24a', metal: 0.9, use: 'Jeans, workwear, heritage jackets' },
  'metal-antique-brass': { name: 'Metal, antique brass', teeth: '#8f7440', metal: 0.85, use: 'Leather, waxed cotton, vintage' },
  'metal-nickel': { name: 'Metal, nickel / silver', teeth: '#c8ccd2', metal: 0.95, use: 'Bikers, bags, outerwear' },
  'metal-gunmetal': { name: 'Metal, gunmetal / black nickel', teeth: '#3d3f44', metal: 0.9, use: 'Modern outerwear, leather' },
  'metal-aluminium': { name: 'Metal, aluminium (light)', teeth: '#b8bcc2', metal: 0.8, use: 'Light garments; cheaper than brass' },
  'premium-polished': { name: 'Premium polished metal (Excella-type)', teeth: '#d8b860', metal: 1.0, use: 'Luxury bags, couture, high-end denim' },
  coil: { name: 'Nylon coil', teeth: null, metal: 0, use: 'Dresses, pockets, linings, sportswear, bags (flexible, light)', recommended: true },
  invisible: { name: 'Invisible / concealed coil', teeth: null, metal: 0, use: 'Dresses, skirts, trousers (hidden in the seam)' },
  'water-resistant': { name: 'Water-resistant coil (PU coated)', teeth: '#111111', metal: 0.1, use: 'Shell jackets, outdoor gear (pair with taped seams)' },
  moulded: { name: 'Moulded plastic (Vislon-type)', teeth: null, metal: 0, use: 'Parkas, sportswear, kidswear (chunky, light, durable)' },
  reversible: { name: 'Reversible coil (two-sided slider)', teeth: null, metal: 0, use: 'Reversible jackets' },
  decorative: { name: 'Decorative (chain / rhinestone)', teeth: '#e8f4ff', metal: 0.6, use: 'Eveningwear, statement pieces' },
};
export const ZIPPER_SIZES = { '#3': 3, '#4.5': 4.5, '#5': 5, '#8': 8, '#10': 10 };
export const ZIPPER_ENDS = { closed: 'Closed-end (one-way)', open: 'Open-end / separating (jackets)', 'two-way': 'Two-way separating (long coats, parkas)', 'two-way-closed': 'Two-way closed (bags, sleeping bags)' };
export const ZIPPER_SLIDERS = { 'auto-lock': 'Auto-lock (stays put; flies, jackets)', 'non-lock': 'Non-lock (free-running; bags, pockets)', 'pin-lock': 'Pin-lock (semi-auto)', reversible: 'Reversible (pull both sides)', 'cam-lock': 'Cam-lock' };
export const ZIPPER_PULLERS = { standard: 'Standard metal tab', 'leather-tab': 'Leather tab', 'cord-pull': 'Cord pull with end stopper', ring: 'Ring pull', 'logo': 'Custom logo puller', 'rubber': 'Rubberised / glove-friendly', 'pearl': 'Pearl / decorative' };
export const ZIPPER_DEFAULTS = {
  jeans: { type: 'metal-brass', size: '#4.5', end: 'closed', slider: 'auto-lock', puller: 'standard' },
  jacket: { type: 'metal-nickel', size: '#5', end: 'open', slider: 'auto-lock', puller: 'standard' },
  parka: { type: 'moulded', size: '#8', end: 'two-way', slider: 'auto-lock', puller: 'cord-pull' },
  dress: { type: 'invisible', size: '#3', end: 'closed', slider: 'non-lock', puller: 'standard' },
  shell: { type: 'water-resistant', size: '#5', end: 'open', slider: 'auto-lock', puller: 'cord-pull' },
  bag: { type: 'coil', size: '#5', end: 'two-way-closed', slider: 'non-lock', puller: 'leather-tab' },
  pocket: { type: 'coil', size: '#3', end: 'closed', slider: 'non-lock', puller: 'cord-pull' },
  leather: { type: 'metal-gunmetal', size: '#5', end: 'open', slider: 'auto-lock', puller: 'leather-tab' },
};
export function zipperSpec(z = {}) { return { ...ZIPPER_DEFAULTS.jacket, tape: '#111111', ...z }; }

// ---------------- Decorative edges ----------------
export const EDGE_TREATMENTS = {
  hemmed: { name: 'Plain hem (coverstitched / turned)', shape: null },
  raw: { name: 'Raw / cut edge', shape: null },
  'laser-cut': { name: 'Laser-cut sealed', shape: null },
  frayed: { name: 'Frayed', shape: 'fray' },
  scalloped: { name: 'Scalloped', shape: 'scallop' },
  lettuce: { name: 'Lettuce edge', shape: 'wave' },
  picot: { name: 'Picot', shape: 'picot' },
  ruffle: { name: 'Ruffle / frill', shape: 'ruffle' },
  pinked: { name: 'Pinked (zigzag cut)', shape: 'pinked' },
  piped: { name: 'Piped', shape: 'tube' },
  'bias-bound': { name: 'Bias-bound', shape: 'band' },
  'blanket-stitch': { name: 'Blanket stitch', shape: 'blanket' },
  'ric-rac': { name: 'Ric-rac braid', shape: 'zigzag' },
  fringe: { name: 'Fringe', shape: 'fringe' },
  'lace-edge': { name: 'Lace edging', shape: 'lace' },
  'pompom-trim': { name: 'Pom-pom trim', shape: 'pompom' },
  'feather-trim': { name: 'Feather trim', shape: 'feather' },
  'sequin-edge': { name: 'Sequin edging', shape: 'sequin' },
};

// ---------------- Lacing ----------------
export const LACING_STYLES = { crisscross: 'Criss-cross', ladder: 'Ladder (straight bar)', corset: 'Corset (bunny-ear loops at waist)', spiral: 'Spiral (single lace)' };

export function resolveTrim(id) {
  return TRIMS[id] || TRIMS['button-4hole'];
}

/**
 * Stiffeners / inserts: what's inside cap bills, hat brims, bag bases,
 * collars and waistbands. bend 0..1 drives the simulation; rigid = static.
 */
export const STIFFENERS = {
  'none': { name: 'None (soft / unstructured)', bend: null, rigid: false, use: 'Dad caps, soft bags, relaxed collars' },
  'polyethylene': { name: 'Polyethylene (PE) plastic insert', bend: 0.95, rigid: true, use: 'Industry standard for cap bills: washable, holds a curve', recommended: true },
  'cardboard': { name: 'Cardboard / pressed board', bend: 0.9, rigid: true, use: 'Vintage caps: crisp but not washable (warps when wet)' },
  'pvc': { name: 'PVC sheet', bend: 0.9, rigid: true, use: 'Budget caps, visors' },
  'eva-foam': { name: 'EVA foam', bend: 0.6, rigid: false, use: 'Light, flexible visors and bag panels' },
  'buckram': { name: 'Buckram (stiffened cotton)', bend: 0.8, rigid: false, use: 'Front panels of structured caps, millinery, waistbands' },
  'felt-wire': { name: 'Wool felt with brim wire', bend: 0.85, rigid: true, use: 'Fedoras, trilbies: wire lets you shape the brim' },
  'straw-sized': { name: 'Sized straw (stiffened)', bend: 0.85, rigid: true, use: 'Panamas, boaters' },
  'bag-board': { name: 'Bag base board (PE / bonded fibre)', bend: 0.95, rigid: true, use: 'Flat bases for totes and handbags' },
  'interfacing-fusible': { name: 'Fusible interfacing', bend: 0.55, rigid: false, use: 'Collars, cuffs, plackets, soft structure' },
  'canvas-hair': { name: 'Hair canvas', bend: 0.6, rigid: false, use: 'Tailored jacket fronts and lapels' },
};
