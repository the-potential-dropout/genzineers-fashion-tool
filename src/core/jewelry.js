// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Jewelry: metals (with karat / purity control), gemstones, cuts, settings,
 * chain links, clasps, bails, earring backs, ring sizes and calculations.
 * Pure data + maths (no DOM) so the UI, AI, CLI and MCP all share it.
 */

// ---------------- Metals ----------------
// density g/cm3 at that purity; color = rendered tint.
const M = (name, family, purity, density, color, roughness, hallmark, note, extra = {}) => ({ name, family, purity, density, color, roughness, hallmark, note, ...extra });
export const METALS = {
  'gold-24k': M('Gold 24k (99.9%)', 'gold', 99.9, 19.3, '#f3c13a', 0.18, '999', 'Pure gold: richest colour, too soft for most rings and settings'),
  'gold-22k': M('Gold 22k (91.6%)', 'gold', 91.6, 17.8, '#ecb93f', 0.18, '916', 'Traditional in South Asian & Middle Eastern jewellery; soft'),
  'gold-18k-yellow': M('Gold 18k yellow (75%)', 'gold', 75, 15.6, '#e3b54b', 0.16, '750', 'Luxury standard: rich colour + good durability', { recommended: true }),
  'gold-18k-white': M('Gold 18k white (75%, rhodium plated)', 'gold', 75, 15.9, '#e6e6e3', 0.12, '750', 'Alloyed with palladium/nickel; rhodium plated, re-plate every 1-3 years'),
  'gold-18k-rose': M('Gold 18k rose (75%)', 'gold', 75, 15.2, '#e8a68a', 0.16, '750', 'Copper-rich alloy: warm pink'),
  'gold-14k-yellow': M('Gold 14k yellow (58.5%)', 'gold', 58.5, 13.1, '#dcb35c', 0.16, '585', 'Most popular in the US: durable, affordable'),
  'gold-14k-white': M('Gold 14k white (58.5%)', 'gold', 58.5, 12.9, '#e2e2de', 0.12, '585', 'Durable white gold; rhodium plated'),
  'gold-14k-rose': M('Gold 14k rose (58.5%)', 'gold', 58.5, 13.0, '#e2a084', 0.16, '585', 'Stronger pink than 18k rose'),
  'gold-10k': M('Gold 10k (41.7%)', 'gold', 41.7, 11.6, '#d6b06a', 0.18, '417', 'Minimum to be called gold in the US; very durable, paler'),
  'gold-9k': M('Gold 9k (37.5%)', 'gold', 37.5, 11.2, '#d4ae72', 0.18, '375', 'Common in the UK; budget fine jewellery'),
  'gold-green-18k': M('Gold 18k green (75% with silver)', 'gold', 75, 15.9, '#d8cf73', 0.16, '750', 'Silver-rich alloy: soft green-yellow'),
  'platinum-950': M('Platinum 950', 'platinum', 95, 21.4, '#e5e4e2', 0.12, '950 Pt', 'Densest, hypoallergenic, naturally white, develops patina; best for securing diamonds'),
  'platinum-900': M('Platinum 900 (iridium)', 'platinum', 90, 21.5, '#e3e2df', 0.12, '900 Pt', 'Harder alloy, popular in Japan'),
  'palladium-950': M('Palladium 950', 'palladium', 95, 12.0, '#d9d8d3', 0.14, '950 Pd', 'White, light, hypoallergenic'),
  'silver-999': M('Fine silver 999', 'silver', 99.9, 10.5, '#eceef0', 0.12, '999', 'Very soft; used for clay / bezel wire'),
  'silver-958': M('Britannia silver 958', 'silver', 95.8, 10.4, '#eceef0', 0.12, '958', 'Higher purity than sterling'),
  'silver-925': M('Sterling silver 925', 'silver', 92.5, 10.36, '#e9ebee', 0.12, '925', 'Industry standard silver; tarnishes, can be rhodium plated', { recommended: true }),
  'argentium-935': M('Argentium® type silver 935 (germanium)', 'silver', 93.5, 10.3, '#eef0f2', 0.12, '935', 'Tarnish-resistant germanium sterling'),
  'gold-vermeil': M('Gold vermeil (2.5 µm gold on sterling)', 'plated', 92.5, 10.4, '#e3b54b', 0.16, '925', 'Thick gold plating over sterling; legal "vermeil" needs ≥2.5 µm (US) of ≥10k'),
  'gold-filled': M('Gold-filled (1/20 14k)', 'filled', 5, 11.0, '#dcb35c', 0.16, '1/20 14K GF', 'Bonded gold layer (5% by weight): far more durable than plating'),
  'gold-plated-brass': M('Gold-plated brass (0.5 µm)', 'plated', 0, 8.5, '#e0b24a', 0.2, '-', 'Fashion jewellery; wears off with use'),
  'stainless-316l': M('Stainless steel 316L', 'steel', 0, 8.0, '#c9cbcd', 0.2, '316L', 'Hypoallergenic, waterproof, tarnish free; demi-fine & body jewellery'),
  'titanium': M('Titanium (grade 2 / 23)', 'titanium', 99, 4.5, '#b7b5b0', 0.25, 'Ti', 'Very light, strong, hypoallergenic; can be anodised to colours'),
  'tungsten-carbide': M('Tungsten carbide', 'tungsten', 0, 15.6, '#6d6f72', 0.15, 'TC', 'Scratch-proof men\'s bands; cannot be resized'),
  'brass': M('Brass', 'base', 0, 8.5, '#d6b25c', 0.25, '-', 'Prototyping, fashion jewellery'),
  'bronze': M('Bronze', 'base', 0, 8.8, '#b9824a', 0.3, '-', 'Artisan, sculptural pieces'),
  'copper': M('Copper', 'base', 0, 8.96, '#c27348', 0.25, '-', 'Artisan; oxidises to patina'),
};
export const PLATINGS = { none: 'None', rhodium: 'Rhodium (bright white, tarnish-proof)', 'gold-yellow': 'Yellow gold plating', 'gold-rose': 'Rose gold plating', 'black-rhodium': 'Black rhodium / ruthenium', pvd: 'PVD coating (very durable, steel/titanium)', anodised: 'Anodised colour (titanium / niobium)' };

/** Gold purity from karat (24 = 100%). */
export const karatToPurity = (k) => Math.round((k / 24) * 1000) / 10;
/** Approx. density and colour of gold at any karat and colour family. */
export function goldAlloy(karat, colour = 'yellow') {
  const p = karat / 24;
  const density = 1 / (p / 19.3 + (1 - p) / (colour === 'white' ? 11.0 : colour === 'rose' ? 9.0 : 10.0));
  const tint = { yellow: [243, 193, 58], rose: [232, 166, 138], white: [230, 230, 227], green: [216, 207, 115] }[colour] || [243, 193, 58];
  const pale = [220, 200, 160];
  const mix = (a, b, t) => Math.round(a + (b - a) * t);
  const t = colour === 'white' ? 0 : Math.max(0, 1 - p) * 0.6;
  const rgb = tint.map((c, i) => mix(c, pale[i], t));
  return { purity: karatToPurity(karat), density: Math.round(density * 100) / 100, color: `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`, hallmark: ({ 9: '375', 10: '417', 14: '585', 18: '750', 22: '916', 24: '999' })[karat] || String(Math.round(p * 1000)).padStart(3, '0') };
}

// ---------------- Gemstones ----------------
// ri = refractive index, disp = dispersion, mohs = hardness, sg = specific gravity
const G = (name, color, ri, disp, mohs, sg, kind, note, extra = {}) => ({ name, color, ri, disp, mohs, sg, kind, note, ...extra });
export const GEMS = {
  diamond: G('Diamond (natural)', '#ffffff', 2.42, 0.044, 10, 3.52, 'transparent', 'Hardest gem; grade by 4Cs (cut, colour D-Z, clarity FL-I3, carat); ask for GIA/IGI report'),
  'lab-diamond': G('Lab-grown diamond (CVD / HPHT)', '#ffffff', 2.42, 0.044, 10, 3.52, 'transparent', 'Chemically identical to natural, typically 70-90% cheaper; must be disclosed as lab-grown'),
  moissanite: G('Moissanite', '#fbfbf4', 2.65, 0.104, 9.25, 3.21, 'transparent', 'More fire than diamond, very durable, affordable'),
  cz: G('Cubic zirconia', '#ffffff', 2.15, 0.06, 8, 5.7, 'transparent', 'Inexpensive simulant; scratches and clouds over time'),
  'white-sapphire': G('White sapphire', '#f4f6f8', 1.77, 0.018, 9, 4.0, 'transparent', 'Durable, less sparkle'),
  'blue-sapphire': G('Blue sapphire', '#1f3fa8', 1.77, 0.018, 9, 4.0, 'transparent', 'Corundum; 2nd hardest; heat treatment is common (disclose)'),
  'pink-sapphire': G('Pink sapphire', '#e86aa0', 1.77, 0.018, 9, 4.0, 'transparent', 'Corundum'),
  'yellow-sapphire': G('Yellow sapphire', '#f2c230', 1.77, 0.018, 9, 4.0, 'transparent', 'Corundum'),
  ruby: G('Ruby', '#b3122e', 1.77, 0.018, 9, 4.0, 'transparent', 'Red corundum; pigeon-blood red is most valued'),
  emerald: G('Emerald', '#0e8a4f', 1.58, 0.014, 7.75, 2.72, 'transparent', 'Beryl; naturally included ("jardin"), usually oil-treated; avoid hard knocks and ultrasonics'),
  aquamarine: G('Aquamarine', '#7fc8d8', 1.58, 0.014, 7.75, 2.69, 'transparent', 'Blue beryl'),
  morganite: G('Morganite', '#f2b8a8', 1.58, 0.014, 7.75, 2.8, 'transparent', 'Peach-pink beryl'),
  amethyst: G('Amethyst', '#8a4fc2', 1.54, 0.013, 7, 2.65, 'transparent', 'Purple quartz; affordable'),
  citrine: G('Citrine', '#f0a020', 1.54, 0.013, 7, 2.65, 'transparent', 'Yellow-orange quartz'),
  'smoky-quartz': G('Smoky quartz', '#6d5a4a', 1.54, 0.013, 7, 2.65, 'transparent', 'Brown quartz'),
  topaz: G('Topaz (blue)', '#5fb6e8', 1.62, 0.014, 8, 3.53, 'transparent', 'Often irradiated to blue'),
  garnet: G('Garnet', '#7a1020', 1.79, 0.027, 7, 3.9, 'transparent', 'Many species: almandine, tsavorite (green), spessartite (orange)'),
  peridot: G('Peridot', '#9acd32', 1.67, 0.02, 6.75, 3.34, 'transparent', 'Olive green'),
  tanzanite: G('Tanzanite', '#4b3fb5', 1.70, 0.021, 6.5, 3.35, 'transparent', 'Violet-blue; fragile'),
  tourmaline: G('Tourmaline', '#d64f80', 1.63, 0.017, 7.25, 3.06, 'transparent', 'Every colour, incl. watermelon'),
  spinel: G('Spinel', '#c5162f', 1.72, 0.02, 8, 3.6, 'transparent', 'Durable ruby alternative'),
  alexandrite: G('Alexandrite', '#2f7a5a', 1.75, 0.015, 8.5, 3.73, 'transparent', 'Colour-change green-to-red'),
  opal: G('Opal', '#cfe4ea', 1.45, 0, 6, 2.1, 'opalescent', 'Play-of-colour; soft, can crack (crazing): bezel settings recommended'),
  moonstone: G('Moonstone', '#e8eef5', 1.52, 0, 6, 2.6, 'translucent', 'Adularescent blue sheen; cabochon'),
  labradorite: G('Labradorite', '#5a6e78', 1.56, 0, 6.25, 2.7, 'opaque', 'Labradorescent flash'),
  onyx: G('Black onyx', '#111111', 1.54, 0, 7, 2.65, 'opaque', 'Dyed chalcedony; signet rings'),
  turquoise: G('Turquoise', '#3fbfb0', 1.62, 0, 5.5, 2.7, 'opaque', 'Porous; usually stabilised'),
  lapis: G('Lapis lazuli', '#24418f', 1.5, 0, 5.5, 2.8, 'opaque', 'Blue with golden pyrite'),
  jade: G('Jade (jadeite)', '#3fa36a', 1.66, 0, 7, 3.33, 'translucent', 'Tough; Type A = untreated'),
  'mother-of-pearl': G('Mother-of-pearl', '#f5efe6', 1.53, 0, 3.5, 2.7, 'opaque', 'Inlay'),
  'pearl-akoya': G('Pearl (Akoya)', '#f6f0e8', 1.53, 0, 3, 2.7, 'pearl', 'Classic round white, 6-9 mm; saltwater'),
  'pearl-freshwater': G('Pearl (freshwater)', '#f3ece4', 1.53, 0, 3, 2.7, 'pearl', 'Affordable, many shapes'),
  'pearl-south-sea': G('Pearl (South Sea)', '#f1e3c4', 1.53, 0, 3, 2.7, 'pearl', 'Large 9-16 mm, white or golden'),
  'pearl-tahitian': G('Pearl (Tahitian)', '#3a3f45', 1.53, 0, 3, 2.7, 'pearl', 'Naturally dark, peacock overtones'),
};

// ---------------- Cuts / shapes ----------------
// ratio = length / width; depth = total depth % of width; facets = rough crown facet count
export const CUTS = {
  'round-brilliant': { name: 'Round brilliant', ratio: 1, depth: 0.61, outline: 'circle', facets: 57, note: 'Maximum sparkle; most popular' },
  princess: { name: 'Princess', ratio: 1, depth: 0.7, outline: 'square', facets: 58, note: 'Square brilliant; protect corners with V-prongs' },
  cushion: { name: 'Cushion', ratio: 1.05, depth: 0.65, outline: 'cushion', facets: 58, note: 'Pillow shape, vintage feel' },
  oval: { name: 'Oval', ratio: 1.4, depth: 0.6, outline: 'oval', facets: 58, note: 'Looks larger per carat' },
  emerald: { name: 'Emerald (step cut)', ratio: 1.45, depth: 0.65, outline: 'octagon', facets: 50, step: true, note: 'Hall-of-mirrors; shows inclusions, choose higher clarity' },
  asscher: { name: 'Asscher (square step)', ratio: 1, depth: 0.65, outline: 'octagon', facets: 58, step: true, note: 'Square emerald cut' },
  radiant: { name: 'Radiant', ratio: 1.25, depth: 0.66, outline: 'octagon', facets: 70, note: 'Step outline with brilliant facets' },
  marquise: { name: 'Marquise', ratio: 2.0, depth: 0.6, outline: 'marquise', facets: 58, note: 'Elongating; protect points' },
  pear: { name: 'Pear / teardrop', ratio: 1.55, depth: 0.6, outline: 'pear', facets: 58, note: 'Pendants and drops' },
  heart: { name: 'Heart', ratio: 1, depth: 0.6, outline: 'heart', facets: 59, note: 'Needs ≥1 ct to read clearly' },
  baguette: { name: 'Baguette', ratio: 2.5, depth: 0.6, outline: 'rect', facets: 14, step: true, note: 'Side stones, channel settings' },
  trillion: { name: 'Trillion', ratio: 1, depth: 0.5, outline: 'triangle', facets: 31, note: 'Triangular side stones' },
  'rose-cut': { name: 'Rose cut', ratio: 1, depth: 0.35, outline: 'circle', facets: 24, flatBack: true, note: 'Antique, flat-bottomed, soft glow' },
  cabochon: { name: 'Cabochon', ratio: 1, depth: 0.45, outline: 'circle', facets: 0, dome: true, note: 'Domed, unfaceted: opal, moonstone, turquoise, star stones' },
  briolette: { name: 'Briolette', ratio: 1.6, depth: 1.0, outline: 'pear', facets: 48, drilled: true, note: 'Drilled teardrop for drops' },
  sphere: { name: 'Bead / pearl (sphere)', ratio: 1, depth: 1.0, outline: 'circle', facets: 0, sphere: true, note: 'Pearls, beads' },
  custom: { name: 'Custom outline', ratio: 1, depth: 0.6, outline: 'custom', facets: 40, note: 'Your own shape: outline points (mm), faceted automatically' },
};

/** Rough carat estimate from size in mm (industry rule-of-thumb formulae). */
export function caratEstimate(cut, lengthMm, widthMm, gem = 'diamond') {
  const c = CUTS[cut] || CUTS['round-brilliant'];
  const d = widthMm * c.depth;
  const k = { 'round-brilliant': 0.0061, oval: 0.0062, cushion: 0.0081, princess: 0.0083, emerald: 0.008, asscher: 0.008, radiant: 0.0081, marquise: 0.0058, pear: 0.0059, heart: 0.0061, baguette: 0.0092, trillion: 0.0057, 'rose-cut': 0.0055, cabochon: 0.0026, briolette: 0.006, sphere: 0.0026, custom: 0.0065 }[cut] || 0.0061;
  const sgScale = (GEMS[gem]?.sg || 3.52) / 3.52;
  const ct = (cut === 'round-brilliant' || cut === 'rose-cut' || cut === 'cabochon' || cut === 'sphere' ? widthMm * widthMm : lengthMm * widthMm) * d * k * sgScale;
  return Math.round(ct * 100) / 100;
}

// ---------------- Settings ----------------
export const SETTINGS = {
  'prong-4': { name: '4-prong', note: 'Most light, classic solitaire', prongs: 4 },
  'prong-6': { name: '6-prong (Tiffany-style)', note: 'More secure, rounder look', prongs: 6, recommended: true },
  'double-claw': { name: 'Double claw (8)', note: 'Extra security', prongs: 8 },
  'v-prong': { name: 'V-prongs', note: 'Protects pointed corners (princess, pear, marquise)', prongs: 4 },
  bezel: { name: 'Bezel (full rim)', note: 'Most secure and active-lifestyle friendly; best for soft stones', prongs: 0, bezel: true },
  'half-bezel': { name: 'Half bezel', note: 'Modern, protects two sides', prongs: 0, bezel: true },
  channel: { name: 'Channel', note: 'Stones in a row between two walls; bands', prongs: 0 },
  pave: { name: 'Pavé / micro-pavé', note: 'Many tiny stones held by beads', prongs: 0 },
  halo: { name: 'Halo', note: 'Ring of small stones around the centre: looks bigger', prongs: 6 },
  tension: { name: 'Tension', note: 'Held by pressure of the band; needs hard stones (diamond, sapphire)', prongs: 0 },
  flush: { name: 'Flush / gypsy', note: 'Stone sunk into the metal; men\'s rings', prongs: 0 },
  cathedral: { name: 'Cathedral', note: 'Arches lift the stone', prongs: 6 },
  basket: { name: 'Basket', note: 'Prongs joined by a gallery rail', prongs: 4 },
  bar: { name: 'Bar', note: 'Between metal bars; eternity bands', prongs: 0 },
};

// ---------------- Chains & links ----------------
// pitch = link length / wire gauge; shape drives the 3D link mesh
export const LINKS = {
  cable: { name: 'Cable', shape: 'oval', pitch: 3.0, twist: 90, note: 'Classic alternating oval links; pendants' },
  rolo: { name: 'Rolo / belcher', shape: 'round', pitch: 2.4, twist: 90, note: 'Round links, sturdy' },
  curb: { name: 'Curb', shape: 'oval-flat', pitch: 3.0, twist: 0, flat: true, note: 'Twisted and flattened to lie flat; men\'s chains' },
  cuban: { name: 'Cuban / Miami cuban', shape: 'oval-flat', pitch: 2.4, twist: 0, flat: true, heavy: true, note: 'Thick, tight curb; hip-hop staple' },
  figaro: { name: 'Figaro', shape: 'oval-flat', pitch: 3.0, twist: 0, flat: true, pattern: [1, 1, 1, 2.2], note: '3 short + 1 long link pattern' },
  mariner: { name: 'Mariner / anchor', shape: 'oval-bar', pitch: 3.2, twist: 90, note: 'Oval links with a centre bar' },
  rope: { name: 'Rope', shape: 'helix', pitch: 1.2, twist: 30, note: 'Links twisted into a helix' },
  box: { name: 'Box / Venetian', shape: 'square', pitch: 2.0, twist: 90, note: 'Square links, strong and sleek' },
  snake: { name: 'Snake', shape: 'tube', pitch: 1.0, twist: 0, note: 'Smooth flexible tube; cannot be repaired easily' },
  wheat: { name: 'Wheat / spiga', shape: 'helix', pitch: 1.4, twist: 45, note: 'Braided look' },
  franco: { name: 'Franco', shape: 'square', pitch: 1.6, twist: 45, note: 'V-shaped interlocking, very durable' },
  byzantine: { name: 'Byzantine', shape: 'round', pitch: 1.8, twist: 90, note: 'Complex chainmaille weave' },
  herringbone: { name: 'Herringbone', shape: 'tube-flat', pitch: 0.8, twist: 0, flat: true, note: 'Flat, liquid look; kinks easily' },
  singapore: { name: 'Singapore', shape: 'helix', pitch: 1.5, twist: 60, note: 'Twisted curb, sparkly' },
  'ball-bead': { name: 'Ball / bead chain', shape: 'ball', pitch: 1.5, twist: 0, note: 'Dog-tag chain' },
  paperclip: { name: 'Paperclip', shape: 'rect', pitch: 4.5, twist: 90, note: 'Elongated rectangles; trend chain' },
  satellite: { name: 'Satellite', shape: 'oval', pitch: 3.0, twist: 90, stations: 'ball', note: 'Cable with beads every few cm' },
  'tennis-line': { name: 'Tennis (line of stones)', shape: 'cup', pitch: 1.05, twist: 0, stones: true, note: 'Continuous set stones' },
  custom: { name: 'Custom link', shape: 'custom', pitch: 3.0, twist: 90, note: 'Your own link outline (mm), extruded' },
};

export const CLASPS = {
  lobster: { name: 'Lobster clasp', note: 'Most secure everyday clasp', recommended: true },
  'spring-ring': { name: 'Spring ring', note: 'Lightweight chains; fiddly' },
  toggle: { name: 'Toggle (T-bar)', note: 'Decorative, easy for bracelets' },
  'box-clasp': { name: 'Box clasp with safety', note: 'Tennis bracelets, high value' },
  magnetic: { name: 'Magnetic', note: 'Easy to use; less secure' },
  'fold-over': { name: 'Fold-over / jewellery box clasp', note: 'Cuban chains, watches' },
  'hook-eye': { name: 'Hook & eye / S-hook', note: 'Artisan, rustic' },
  'barrel-screw': { name: 'Barrel / screw', note: 'Bead strands' },
  'slide-bead': { name: 'Adjustable slider bead', note: 'One-size-fits-most bracelets and necklaces' },
  'push-button': { name: 'Push-button (bangle hinge)', note: 'Hinged bangles' },
};

export const BAILS = { 'jump-ring': 'Jump ring', 'fixed-loop': 'Soldered loop', 'tube-bail': 'Tube bail', 'v-bail': 'V-bail / pinch bail (stones)', hidden: 'Hidden bail (back)', 'enhancer': 'Enhancer clip (removable)' };
export const EARRING_BACKS = { butterfly: 'Butterfly / push back', screw: 'Screw back (secure)', lever: 'Lever back', 'french-hook': 'French hook / fish hook', latch: 'Latch back (hoops)', clip: 'Clip-on (no piercing)', threader: 'Threader', huggie: 'Huggie hinge' };

export const RING_PROFILES = { court: 'Court / comfort fit (domed both sides)', 'd-shape': 'D-shape (flat inside)', flat: 'Flat / square', 'flat-court': 'Flat court', 'knife-edge': 'Knife edge', bevelled: 'Bevelled edges', concave: 'Concave', hammered: 'Hammered texture', signet: 'Signet (flat top)' };

/** Ring sizes: US -> inner diameter (mm); UK letters and EU/ISO circumference map from it. */
export function ringSize(us) {
  const d = 11.63 + 0.8128 * us; // inner diameter mm
  const circ = Math.PI * d;
  const ukLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const ukIdx = Math.round((us - 0.5) * 2) - 1 + 2;
  return { us, diameterMm: Math.round(d * 100) / 100, circumferenceMm: Math.round(circ * 10) / 10, eu: Math.round(circ), uk: ukLetters[Math.max(0, Math.min(25, ukIdx))] || 'Z+' };
}

export const NECKLACE_LENGTHS = { collar: 35, choker: 40, princess: 45, matinee: 55, opera: 75, rope: 100 };
export const BRACELET_LENGTHS = { XS: 15, S: 16.5, M: 18, L: 19.5, XL: 21 };

// ---------------- Jewelry piece templates ----------------
const J = (name, group, spec, why) => ({ name, group, spec, why });
export const JEWELRY_TEMPLATES = {
  'solitaire-ring': J('Solitaire engagement ring', 'Rings', { piece: 'ring', size: 6.5, profile: 'court', bandWidth: 2.0, bandThickness: 1.7, metal: 'platinum-950', stones: [{ gem: 'lab-diamond', cut: 'round-brilliant', size: 6.5, setting: 'prong-6', position: 'center' }] }, 'Platinum 950 head with 6 prongs holds the stone most securely; 2 mm court band is comfortable.'),
  'halo-ring': J('Halo ring (oval)', 'Rings', { piece: 'ring', size: 6.5, profile: 'court', bandWidth: 1.8, bandThickness: 1.6, metal: 'gold-18k-white', stones: [{ gem: 'diamond', cut: 'oval', size: 8, width: 6, setting: 'halo', position: 'center' }], pave: true }),
  'eternity-band': J('Eternity band', 'Rings', { piece: 'ring', size: 6, profile: 'flat-court', bandWidth: 2.5, bandThickness: 1.8, metal: 'gold-18k-yellow', eternity: { gem: 'diamond', cut: 'round-brilliant', size: 2.2, setting: 'prong-4' } }),
  'wedding-band': J('Wedding band (comfort fit)', 'Rings', { piece: 'ring', size: 9, profile: 'court', bandWidth: 5, bandThickness: 2.0, metal: 'gold-14k-yellow', stones: [] }),
  'signet-ring': J('Signet ring', 'Rings', { piece: 'ring', size: 9.5, profile: 'signet', bandWidth: 4, bandThickness: 2.2, metal: 'silver-925', signet: { shape: 'oval', w: 14, h: 12 }, stones: [{ gem: 'onyx', cut: 'cabochon', size: 11, width: 9, setting: 'flush', position: 'top', flat: true }] }),
  'cuban-chain': J('Cuban link chain', 'Chains', { piece: 'chain', link: 'cuban', gauge: 2.2, length: 55, metal: 'gold-14k-yellow', clasp: 'fold-over' }, '14k cuban: solid links, box/fold-over clasp; weight scales with gauge squared.'),
  'rope-chain': J('Rope chain', 'Chains', { piece: 'chain', link: 'rope', gauge: 1.0, length: 50, metal: 'gold-18k-yellow', clasp: 'lobster' }),
  'cable-chain': J('Cable chain', 'Chains', { piece: 'chain', link: 'cable', gauge: 0.6, length: 45, metal: 'silver-925', clasp: 'spring-ring' }),
  'figaro-chain': J('Figaro chain', 'Chains', { piece: 'chain', link: 'figaro', gauge: 1.2, length: 55, metal: 'silver-925', clasp: 'lobster' }),
  'paperclip-chain': J('Paperclip chain', 'Chains', { piece: 'chain', link: 'paperclip', gauge: 0.9, length: 45, metal: 'gold-vermeil', clasp: 'lobster' }),
  'pendant-necklace': J('Pendant necklace', 'Necklaces', { piece: 'necklace', link: 'cable', gauge: 0.6, length: 45, metal: 'gold-14k-yellow', clasp: 'lobster', pendant: { shape: 'heart', w: 14, h: 14, thickness: 1.4, bail: 'jump-ring' } }),
  'gem-pendant': J('Gemstone drop pendant', 'Necklaces', { piece: 'necklace', link: 'box', gauge: 0.8, length: 45, metal: 'gold-18k-white', clasp: 'lobster', pendant: { shape: 'none', bail: 'v-bail', stone: { gem: 'blue-sapphire', cut: 'pear', size: 9, width: 6, setting: 'prong-4' } } }),
  'pearl-strand': J('Pearl strand', 'Necklaces', { piece: 'strand', gem: 'pearl-akoya', bead: 7, length: 45, knotted: true, metal: 'gold-14k-yellow', clasp: 'box-clasp' }),
  'tennis-bracelet': J('Tennis bracelet', 'Bracelets', { piece: 'bracelet', link: 'tennis-line', gauge: 2.5, length: 18, metal: 'gold-14k-white', clasp: 'box-clasp', stone: { gem: 'lab-diamond', cut: 'round-brilliant', size: 2.5 } }),
  'cuban-bracelet': J('Cuban link bracelet', 'Bracelets', { piece: 'bracelet', link: 'cuban', gauge: 3.0, length: 21, metal: 'silver-925', clasp: 'fold-over' }),
  'bangle': J('Bangle', 'Bracelets', { piece: 'bangle', diameter: 62, width: 4, thickness: 2.5, profile: 'court', metal: 'gold-18k-rose', clasp: 'push-button' }),
  'cuff': J('Open cuff', 'Bracelets', { piece: 'cuff', diameter: 62, width: 12, thickness: 1.5, gap: 25, profile: 'flat', metal: 'silver-925' }),
  'stud-earrings': J('Stud earrings', 'Earrings', { piece: 'earring', style: 'stud', back: 'screw', metal: 'gold-18k-white', stone: { gem: 'diamond', cut: 'round-brilliant', size: 5, setting: 'prong-4' } }),
  'hoop-earrings': J('Hoop earrings', 'Earrings', { piece: 'earring', style: 'hoop', diameter: 25, thickness: 2.2, back: 'latch', metal: 'gold-14k-yellow' }),
  'drop-earrings': J('Drop earrings', 'Earrings', { piece: 'earring', style: 'drop', back: 'french-hook', metal: 'silver-925', stone: { gem: 'emerald', cut: 'pear', size: 8, width: 5, setting: 'bezel' } }),
};
export const JEWELRY_GROUPS = ['Rings', 'Chains', 'Necklaces', 'Bracelets', 'Earrings'];

/** Estimate metal volume (mm3) and weight (g) of a piece. */
export function estimateMetal(spec) {
  const metal = spec.alloy || METALS[spec.metal] || METALS['silver-925'];
  let vol = 0;
  const wire = (g) => Math.PI * (g / 2) ** 2;
  if (spec.piece === 'ring') {
    const d = ringSize(spec.size || 7).diameterMm + (spec.bandThickness || 1.8);
    vol = Math.PI * d * (spec.bandWidth || 2) * (spec.bandThickness || 1.8) * (spec.profile === 'court' ? 0.85 : 1);
    if (spec.signet) vol += spec.signet.w * spec.signet.h * 2;
    vol += (spec.stones || []).length * 12;
  } else if (['chain', 'necklace', 'bracelet'].includes(spec.piece)) {
    const L = (spec.length || 45) * 10;
    const g = spec.gauge || 1;
    const lk = LINKS[spec.link] || LINKS.cable;
    const fill = { cuban: 2.4, curb: 1.6, rope: 2.6, box: 1.5, franco: 2.2, snake: 1.0, herringbone: 1.2, byzantine: 2.8, wheat: 2.2, singapore: 1.8, 'ball-bead': 0.6, paperclip: 0.8, 'tennis-line': 1.0 }[spec.link] || 1.3;
    vol = L * wire(g) * fill * (lk.heavy ? 1.3 : 1);
    if (spec.pendant?.shape && spec.pendant.shape !== 'none') vol += spec.pendant.w * spec.pendant.h * 0.7 * (spec.pendant.thickness || 1.2);
  } else if (spec.piece === 'bangle' || spec.piece === 'cuff') {
    vol = Math.PI * (spec.diameter || 62) * (spec.width || 4) * (spec.thickness || 2) * (spec.piece === 'cuff' ? 0.85 : 1);
  } else if (spec.piece === 'earring') {
    vol = spec.style === 'hoop' ? Math.PI * (spec.diameter || 20) * wire(spec.thickness || 2) * 2 : 30;
  } else if (spec.piece === 'strand') {
    vol = 40;
  }
  const grams = (vol / 1000) * metal.density;
  return { volumeMm3: Math.round(vol), grams: Math.round(grams * 100) / 100, metal: metal.name, density: metal.density };
}
