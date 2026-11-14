// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Template presets. Each preset is one or more garments, each produced by a
 * parametric generator (see blocks.js) with option overrides, a default
 * fabric, stitch and button: the industry-typical starting point that the
 * user can then customise. `why` explains the defaults (shown as guidance).
 */
import { GENERATORS, defaultOptions } from './blocks.js';

const g = (generator, options = {}, extra = {}) => ({ generator, options, ...extra });

export const TEMPLATE_GROUPS = ['T-shirts & tanks', 'Shirts & polos', 'Sweats & hoodies', 'Jackets', 'Tailoring & suits', 'Coats', 'Dresses', 'Trousers & jeans', 'Shorts', 'Skirts', 'Accessories', 'Hats', 'Bags'];

export const TEMPLATES = {
  // ---------- T-shirts & tanks ----------
  'crew-tee': { name: 'Crew-neck T-shirt', group: 'T-shirts & tanks', garments: [g('top', { length: 70, neckline: 'crew', sleeve: 'short', cuff: 'hemmed' }, { fabric: 'cotton-jersey', stitch: 'overlock-514' })], why: '180 gsm combed cotton jersey, 4-thread overlock seams, coverstitch hems and a 1x1 rib neckband are the retail standard.' },
  'v-neck-tee': { name: 'V-neck T-shirt', group: 'T-shirts & tanks', garments: [g('top', { length: 70, neckline: 'v-neck', sleeve: 'short', cuff: 'hemmed' }, { fabric: 'cotton-jersey', stitch: 'overlock-514' })], why: 'Same block as the crew tee; the V is bound with a mitred rib band.' },
  'long-sleeve-tee': { name: 'Long-sleeve T-shirt', group: 'T-shirts & tanks', garments: [g('top', { length: 70, neckline: 'crew', sleeve: 'long', cuff: 'rib' }, { fabric: 'cotton-jersey', stitch: 'overlock-514' })] },
  'heavyweight-tee': { name: 'Heavyweight boxy tee', group: 'T-shirts & tanks', garments: [g('top', { fit: 'oversized', length: 68, neckline: 'crew', sleeve: 'short', cuff: 'hemmed' }, { fabric: 'cotton-jersey-heavyweight', stitch: 'overlock-514' })], why: '240-300 gsm ring-spun jersey, dropped shoulder, thick 2.5 cm rib collar.' },
  'undershirt-crew': { name: 'Undershirt (crew)', group: 'T-shirts & tanks', garments: [g('top', { fit: 'slim', length: 74, neckline: 'crew', sleeve: 'short', cuff: 'hemmed' }, { fabric: 'cotton-jersey-pima', stitch: 'flatlock-607' })], why: 'Lightweight Pima or modal jersey with flatlock seams so nothing shows or rubs under a shirt.' },
  'undershirt-v': { name: 'Undershirt (deep V)', group: 'T-shirts & tanks', garments: [g('top', { fit: 'slim', length: 74, neckline: 'deep-v', sleeve: 'short', cuff: 'hemmed' }, { fabric: 'modal-jersey', stitch: 'flatlock-607' })] },
  'tank-top': { name: 'Tank top', group: 'T-shirts & tanks', garments: [g('top', { length: 70, neckline: 'scoop', sleeve: 'none', shoulder: 'tank' }, { fabric: 'cotton-jersey', stitch: 'overlock-514' })] },
  'a-shirt': { name: 'A-shirt / ribbed singlet ("wifebeater")', group: 'T-shirts & tanks', garments: [g('top', { fit: 'slim', length: 72, neckline: 'scoop', sleeve: 'none', shoulder: 'a-shirt' }, { fabric: 'rib-knit-2x1', stitch: 'overlock-514' })], why: 'Classic 2x1 cotton rib, narrow straps, deep armholes, bound neck and armholes.' },
  'racerback-tank': { name: 'Racerback tank', group: 'T-shirts & tanks', garments: [g('top', { fit: 'slim', length: 66, neckline: 'scoop', sleeve: 'none', shoulder: 'racer' }, { fabric: 'spandex-jersey', stitch: 'flatlock-607' })] },
  'henley': { name: 'Henley', group: 'T-shirts & tanks', garments: [g('top', { length: 71, neckline: 'henley', sleeve: 'long', cuff: 'rib' }, { fabric: 'waffle-knit', stitch: 'overlock-514' })] },
  'mock-neck': { name: 'Mock-neck top', group: 'T-shirts & tanks', garments: [g('top', { fit: 'slim', length: 68, neckline: 'mock', sleeve: 'long', cuff: 'rib', collar: 'rib' }, { fabric: 'merino-jersey', stitch: 'overlock-514' })] },

  // ---------- Shirts & polos ----------
  'polo': { name: 'Polo shirt', group: 'Shirts & polos', garments: [g('top', { length: 72, neckline: 'henley', sleeve: 'short', cuff: 'rib', collar: 'polo', hem: 'curved' }, { fabric: 'cotton-pique', stitch: 'overlock-514' })], why: 'Cotton piqué body, flat-knit collar and cuffs, 2-3 button placket, split side hem.' },
  'oxford-shirt': { name: 'Oxford button-down shirt', group: 'Shirts & polos', garments: [g('top', { length: 76, neckline: 'collar-stand', sleeve: 'long', cuff: 'barrel', collar: 'button-down', closure: 'placket', buttons: 7, hem: 'curved', pockets: 'chest' }, { fabric: 'oxford-cloth', stitch: 'felled-seam', button: 'button-4hole' })], why: 'Oxford cloth, flat-felled side seams, 4-hole buttons at ~9 cm spacing.' },
  'dress-shirt': { name: 'Dress shirt (French cuff)', group: 'Shirts & polos', garments: [g('top', { fit: 'slim', length: 78, neckline: 'collar-stand', sleeve: 'long', cuff: 'french', collar: 'spread', closure: 'placket', buttons: 7, hem: 'curved' }, { fabric: 'cotton-poplin-egyptian', stitch: 'felled-seam', button: 'button-mop' })], why: '2-ply 100s+ poplin, fused collar and cuffs, mother-of-pearl buttons, 18-22 stitches per inch.' },
  'flannel-overshirt': { name: 'Flannel overshirt', group: 'Shirts & polos', garments: [g('top', { fit: 'relaxed', length: 76, neckline: 'collar-stand', sleeve: 'long', cuff: 'barrel', collar: 'point', closure: 'placket', buttons: 6, hem: 'curved', pockets: 'flap' }, { fabric: 'flannel', stitch: 'topstitch', button: 'button-4hole' })] },
  'camp-shirt': { name: 'Camp-collar shirt', group: 'Shirts & polos', garments: [g('top', { fit: 'relaxed', length: 72, neckline: 'v-neck', sleeve: 'short', cuff: 'hemmed', collar: 'camp', closure: 'placket', buttons: 5, pockets: 'chest' }, { fabric: 'viscose-challis', stitch: 'french-seam', button: 'button-coconut' })] },

  // ---------- Sweats & hoodies ----------
  'crew-sweatshirt': { name: 'Crew sweatshirt', group: 'Sweats & hoodies', garments: [g('top', { fit: 'relaxed', length: 68, neckline: 'crew', sleeve: 'long', cuff: 'rib', hem: 'rib', collar: 'rib' }, { fabric: 'french-terry', stitch: 'overlock-514' })], why: 'Loopback French terry 330-400 gsm, 2x2 rib trims, flatlock or coverstitch topstitching.' },
  'pullover-hoodie': { name: 'Pullover hoodie', group: 'Sweats & hoodies', garments: [g('top', { fit: 'relaxed', length: 70, neckline: 'crew', sleeve: 'long', cuff: 'rib', hem: 'rib', collar: 'hood', pockets: 'kangaroo' }, { fabric: 'cotton-fleece', stitch: 'overlock-514' })] },
  'zip-hoodie': { name: 'Zip hoodie', group: 'Sweats & hoodies', garments: [g('top', { length: 68, neckline: 'crew', sleeve: 'long', cuff: 'rib', hem: 'rib', collar: 'hood', closure: 'zip', pockets: 'kangaroo' }, { fabric: 'french-terry', stitch: 'overlock-514' })] },

  // ---------- Jackets ----------
  'denim-trucker': { name: 'Denim trucker jacket', group: 'Jackets', garments: [g('top', { length: 60, neckline: 'collar-stand', sleeve: 'long', cuff: 'barrel', collar: 'point', closure: 'single-breasted', buttons: 6, pockets: 'flap' }, { fabric: 'denim', stitch: 'felled-seam', button: 'jeans-button' })], why: '12-14 oz denim, chain-stitched flat-felled seams in tex 70 core-spun thread, shank jeans buttons.' },
  'bomber': { name: 'Bomber jacket', group: 'Jackets', garments: [g('top', { fit: 'relaxed', length: 62, neckline: 'crew', sleeve: 'long', cuff: 'rib', hem: 'rib', collar: 'rib', closure: 'zip', pockets: 'welt' }, { fabric: 'nylon-satin', stitch: 'lockstitch-301' })] },
  'biker-jacket': { name: 'Biker jacket (asymmetric)', group: 'Jackets', garments: [g('top', { fit: 'slim', length: 58, neckline: 'crew', sleeve: 'long', cuff: 'zip', closure: 'asymmetric-zip', lapel: 'biker', pockets: 'zip', belt: 'buckle-belt' }, { fabric: 'leather-cowhide', stitch: 'lockstitch-301' })], why: '1.0-1.2 mm cowhide or lambskin, bonded nylon thread, 6-8 SPI, edges glued and folded, metal zips.' },
  'racer-jacket': { name: 'Racer / café jacket', group: 'Jackets', garments: [g('top', { fit: 'slim', length: 60, neckline: 'crew', sleeve: 'long', cuff: 'zip', closure: 'zip', collar: 'band-snap', pockets: 'welt' }, { fabric: 'leather-lambskin', stitch: 'lockstitch-301' })] },
  'waxed-field-jacket': { name: 'Waxed field jacket', group: 'Jackets', garments: [g('top', { fit: 'relaxed', length: 74, neckline: 'collar-stand', sleeve: 'long', cuff: 'storm', collar: 'corduroy', closure: 'two-way-zip', pockets: 'bellows' }, { fabric: 'waxed-cotton', stitch: 'lockstitch-301', button: 'snap' })], why: '6-8 oz waxed cotton, corduroy collar, two-way metal zip with storm flap, bellows pockets, tartan lining.' },
  'harrington': { name: 'Harrington jacket', group: 'Jackets', garments: [g('top', { length: 62, neckline: 'crew', sleeve: 'long', cuff: 'rib', hem: 'rib', collar: 'funnel', closure: 'zip', pockets: 'flap' }, { fabric: 'cotton-gabardine', stitch: 'lockstitch-301' })] },
  'chore-coat': { name: 'Chore coat', group: 'Jackets', garments: [g('top', { fit: 'relaxed', length: 74, neckline: 'collar-stand', sleeve: 'long', cuff: 'hemmed', collar: 'point', closure: 'single-breasted', buttons: 5, pockets: 'patch' }, { fabric: 'canvas', stitch: 'felled-seam', button: 'button-shank' })] },
  'varsity': { name: 'Varsity jacket', group: 'Jackets', garments: [g('top', { fit: 'relaxed', length: 64, neckline: 'crew', sleeve: 'long', cuff: 'rib', hem: 'rib', collar: 'rib', closure: 'snaps', buttons: 6, pockets: 'welt' }, { fabric: 'wool-melton', stitch: 'lockstitch-301', sleeveFabric: 'leather-cowhide' })] },
  'puffer': { name: 'Puffer jacket', group: 'Jackets', garments: [g('top', { fit: 'oversized', length: 66, neckline: 'crew', sleeve: 'long', cuff: 'elastic', collar: 'funnel', closure: 'zip', pockets: 'zip', insulation: 'duck-down-650', fillWeight: 180, quilting: 'channel' }, { fabric: 'nylon-ripstop', stitch: 'lockstitch-301' })], why: 'Downproof 20-30D nylon shell, 650-700 fill-power RDS down, channel baffles, DWR finish.' },
  'parka': { name: 'Parka', group: 'Jackets', garments: [g('top', { fit: 'relaxed', length: 88, neckline: 'crew', sleeve: 'long', cuff: 'storm', collar: 'hood', closure: 'two-way-zip', pockets: 'flap', hem: 'drawcord', insulation: 'synthetic-microfiber', fillWeight: 133, quilting: 'none', lining: 'full' }, { fabric: 'cotton-nylon-blend', stitch: 'lockstitch-301' })] },
  'rain-shell': { name: 'Waterproof rain shell (3-layer)', group: 'Jackets', garments: [g('top', { fit: 'regular', length: 74, neckline: 'crew', sleeve: 'long', cuff: 'snap-tab', collar: 'hood', closure: 'zip', pockets: 'zip', hem: 'drawcord' }, { fabric: 'waterproof-pu-3l', stitch: 'seam-tape' })], why: 'PFAS-free 3-layer membrane, all seams taped, water-resistant zips, 20,000 mm / 15,000 g rating.' },
  'anorak': { name: 'Anorak / windbreaker', group: 'Jackets', garments: [g('top', { fit: 'relaxed', length: 70, neckline: 'crew', sleeve: 'long', cuff: 'elastic', collar: 'hood', closure: 'half-zip', pockets: 'kangaroo', hem: 'drawcord' }, { fabric: 'nylon-taslan', stitch: 'lockstitch-301' })] },
  'gilet': { name: 'Gilet / vest', group: 'Jackets', garments: [g('top', { length: 64, neckline: 'crew', sleeve: 'none', shoulder: 'full', collar: 'funnel', closure: 'zip', pockets: 'zip', insulation: 'synthetic-microfiber', fillWeight: 100, quilting: 'box' }, { fabric: 'nylon-ripstop', stitch: 'lockstitch-301' })] },

  // ---------- Tailoring & suits ----------
  'blazer-sb': { name: 'Single-breasted blazer (notch lapel)', group: 'Tailoring & suits', garments: [g('top', { fit: 'slim', length: 74, neckline: 'deep-v', sleeve: 'long', cuff: 'button-tab', closure: 'single-breasted', buttons: 2, lapel: 'notch', lapelWidth: 8, pockets: 'flap', vent: 'side' }, { fabric: 'wool-worsted-suiting', stitch: 'lockstitch-301', button: 'button-horn' })], why: 'Super 110s-130s worsted wool, half-canvas chest, 8 cm notch lapel, 2 horn buttons, flap pockets, double vents.' },
  'blazer-db': { name: 'Double-breasted blazer (peak lapel)', group: 'Tailoring & suits', garments: [g('top', { length: 75, neckline: 'deep-v', sleeve: 'long', cuff: 'button-tab', closure: 'double-breasted', buttons: 6, lapel: 'peak', lapelWidth: 9.5, pockets: 'flap', vent: 'side' }, { fabric: 'wool-worsted-suiting', stitch: 'lockstitch-301', button: 'button-horn' })] },
  'tuxedo-jacket': { name: 'Shawl-collar dinner jacket', group: 'Tailoring & suits', garments: [g('top', { fit: 'slim', length: 74, neckline: 'deep-v', sleeve: 'long', cuff: 'button-tab', closure: 'single-breasted', buttons: 1, lapel: 'shawl', lapelWidth: 7, pockets: 'welt' }, { fabric: 'wool-barathea', stitch: 'lockstitch-301', button: 'button-covered' })] },
  'waistcoat': { name: 'Waistcoat', group: 'Tailoring & suits', garments: [g('top', { fit: 'slim', length: 56, neckline: 'deep-v', sleeve: 'none', shoulder: 'full', closure: 'single-breasted', buttons: 5, pockets: 'welt' }, { fabric: 'wool-worsted-suiting', stitch: 'lockstitch-301', button: 'button-horn' })] },
  'suit-2pc': { name: 'Two-piece suit', group: 'Tailoring & suits', garments: [
    g('top', { fit: 'slim', length: 74, neckline: 'deep-v', sleeve: 'long', cuff: 'button-tab', closure: 'single-breasted', buttons: 2, lapel: 'notch', pockets: 'flap', vent: 'side' }, { fabric: 'wool-worsted-suiting', stitch: 'lockstitch-301', button: 'button-horn', prefix: 'jkt-' }),
    g('bottom', { fit: 'slim', inseam: 78, rise: 'mid', leg: 'tapered', waistband: 'hook-bar', pockets: 'slant' }, { fabric: 'wool-worsted-suiting', stitch: 'safety-516', prefix: 'trs-' }),
  ], why: 'Jacket and trousers cut from the same bolt (same dye lot) so the colour matches.' },
  'suit-db': { name: 'Double-breasted suit', group: 'Tailoring & suits', garments: [
    g('top', { length: 75, neckline: 'deep-v', sleeve: 'long', cuff: 'button-tab', closure: 'double-breasted', buttons: 6, lapel: 'peak', lapelWidth: 10, pockets: 'flap', vent: 'side' }, { fabric: 'wool-flannel', stitch: 'lockstitch-301', button: 'button-horn', prefix: 'jkt-' }),
    g('bottom', { inseam: 78, rise: 'high', leg: 'wide', waistband: 'side-adjusters', pockets: 'side-seam', pleats: 'double', hem: 'turn-up', beltLoops: 'no' }, { fabric: 'wool-flannel', stitch: 'safety-516', prefix: 'trs-' }),
  ] },

  // ---------- Coats ----------
  'overcoat': { name: 'Overcoat (single-breasted)', group: 'Coats', garments: [g('top', { fit: 'relaxed', length: 100, neckline: 'deep-v', sleeve: 'long', cuff: 'button-tab', closure: 'single-breasted', buttons: 3, lapel: 'notch', lapelWidth: 9, pockets: 'flap', vent: 'center' }, { fabric: 'wool-melton', stitch: 'lockstitch-301', button: 'button-horn' })] },
  'overcoat-db': { name: 'Double-breasted overcoat', group: 'Coats', garments: [g('top', { fit: 'relaxed', length: 104, neckline: 'deep-v', sleeve: 'long', cuff: 'button-tab', closure: 'double-breasted', buttons: 6, lapel: 'peak', lapelWidth: 11, pockets: 'flap', vent: 'center' }, { fabric: 'wool-cashmere-coating', stitch: 'lockstitch-301', button: 'button-horn' })] },
  'trench': { name: 'Trench coat', group: 'Coats', garments: [g('top', { fit: 'relaxed', length: 106, flare: 6, neckline: 'deep-v', sleeve: 'long', cuff: 'button-tab', closure: 'double-breasted', buttons: 8, lapel: 'notch', lapelWidth: 10, pockets: 'welt', vent: 'center', belt: 'buckle-belt' }, { fabric: 'cotton-gabardine', stitch: 'lockstitch-301', button: 'button-horn' })] },
  'peacoat': { name: 'Peacoat', group: 'Coats', garments: [g('top', { length: 74, neckline: 'deep-v', sleeve: 'long', cuff: 'hemmed', closure: 'double-breasted', buttons: 6, lapel: 'notch', lapelWidth: 11, pockets: 'welt' }, { fabric: 'wool-melton', stitch: 'lockstitch-301', button: 'button-anchor' })] },

  // ---------- Dresses ----------
  'slip-dress': { name: 'Slip dress', group: 'Dresses', garments: [g('top', { length: 112, flare: 12, neckline: 'v-neck', sleeve: 'none', shoulder: 'strap' }, { fabric: 'silk-charmeuse', stitch: 'french-seam' })], why: 'Bias-cut silk charmeuse, French seams, rolled hems, spaghetti straps.' },
  'tshirt-dress': { name: 'T-shirt dress', group: 'Dresses', garments: [g('top', { fit: 'relaxed', length: 95, flare: 4, neckline: 'crew', sleeve: 'short', cuff: 'hemmed' }, { fabric: 'cotton-jersey', stitch: 'overlock-514' })] },
  'shirt-dress': { name: 'Shirt dress', group: 'Dresses', garments: [g('top', { length: 105, flare: 8, neckline: 'collar-stand', sleeve: 'long', cuff: 'barrel', collar: 'point', closure: 'placket', buttons: 9, belt: 'self-belt' }, { fabric: 'cotton-poplin', stitch: 'french-seam', button: 'button-4hole' })] },
  'sheath-dress': { name: 'Sheath dress', group: 'Dresses', garments: [g('top', { fit: 'slim', length: 100, flare: -2, neckline: 'boat', sleeve: 'none', shoulder: 'full', vent: 'center' }, { fabric: 'ponte-knit', stitch: 'overlock-514' })] },
  'sundress': { name: 'A-line sundress', group: 'Dresses', garments: [g('top', { length: 105, flare: 22, neckline: 'scoop', sleeve: 'none', shoulder: 'strap' }, { fabric: 'linen', stitch: 'french-seam' })] },

  // ---------- Trousers & jeans ----------
  'jeans-straight': { name: '5-pocket jeans (straight)', group: 'Trousers & jeans', garments: [g('bottom', { inseam: 81, rise: 'mid', leg: 'straight', waistband: 'button', fly: 'button', pockets: 'five-pocket' }, { fabric: 'denim-japanese-selvedge', stitch: 'felled-seam' })], why: 'Chain-stitched felled inseam, safety-stitched or selvedge outseam, copper rivets, bar tacks, tex 70-90 thread.' },
  'jeans-skinny': { name: 'Skinny jeans', group: 'Trousers & jeans', garments: [g('bottom', { fit: 'slim', inseam: 80, rise: 'high', leg: 'skinny', waistband: 'button', fly: 'zip', pockets: 'five-pocket' }, { fabric: 'denim-stretch', stitch: 'safety-516' })] },
  'jeans-wide': { name: 'Wide-leg jeans', group: 'Trousers & jeans', garments: [g('bottom', { fit: 'relaxed', inseam: 82, rise: 'high', leg: 'wide', waistband: 'button', fly: 'button', pockets: 'five-pocket' }, { fabric: 'denim', stitch: 'felled-seam' })] },
  'chinos': { name: 'Chinos', group: 'Trousers & jeans', garments: [g('bottom', { fit: 'slim', inseam: 79, rise: 'mid', leg: 'tapered', waistband: 'button', pockets: 'slant' }, { fabric: 'cotton-twill', stitch: 'safety-516' })] },
  'suit-trousers': { name: 'Tailored trousers', group: 'Trousers & jeans', garments: [g('bottom', { inseam: 79, rise: 'high', leg: 'straight', waistband: 'hook-bar', pockets: 'slant', pleats: 'single', hem: 'turn-up' }, { fabric: 'wool-worsted-suiting', stitch: 'safety-516' })] },
  'cargo': { name: 'Cargo pants', group: 'Trousers & jeans', garments: [g('bottom', { fit: 'relaxed', inseam: 80, rise: 'mid', leg: 'straight', waistband: 'button', pockets: 'cargo' }, { fabric: 'cotton-ripstop', stitch: 'felled-seam' })] },
  'joggers': { name: 'Joggers', group: 'Trousers & jeans', garments: [g('bottom', { fit: 'relaxed', inseam: 74, leg: 'tapered', waistband: 'drawstring', fly: 'none', hem: 'rib-cuff', pockets: 'side-seam', beltLoops: 'no' }, { fabric: 'french-terry', stitch: 'overlock-514' })] },

  // ---------- Shorts ----------
  'shorts-5in': { name: 'Shorts (5" inseam)', group: 'Shorts', garments: [g('bottom', { inseam: 12.7, leg: 'straight', waistband: 'elastic', fly: 'none', pockets: 'side-seam', beltLoops: 'no' }, { fabric: 'cotton-twill', stitch: 'safety-516' })] },
  'shorts-7in': { name: 'Chino shorts (7" inseam)', group: 'Shorts', garments: [g('bottom', { inseam: 17.8, leg: 'straight', waistband: 'button', pockets: 'slant' }, { fabric: 'cotton-twill', stitch: 'safety-516' })] },
  'denim-shorts': { name: 'Denim shorts', group: 'Shorts', garments: [g('bottom', { inseam: 10, rise: 'high', leg: 'straight', waistband: 'button', pockets: 'five-pocket', hem: 'raw' }, { fabric: 'denim-distressed', stitch: 'felled-seam' })] },
  'running-shorts': { name: 'Running shorts', group: 'Shorts', garments: [g('bottom', { fit: 'relaxed', inseam: 9, leg: 'wide', waistband: 'drawstring', fly: 'none', hem: 'split', pockets: 'none', beltLoops: 'no' }, { fabric: 'polyester-woven-stretch', stitch: 'flatlock-607' })] },
  'sweat-shorts': { name: 'Sweat shorts', group: 'Shorts', garments: [g('bottom', { fit: 'relaxed', inseam: 18, leg: 'straight', waistband: 'drawstring', fly: 'none', pockets: 'side-seam', beltLoops: 'no' }, { fabric: 'french-terry', stitch: 'overlock-514' })] },

  // ---------- Skirts ----------
  'skirt-aline': { name: 'A-line skirt', group: 'Skirts', garments: [g('skirt', { length: 58, flare: 14, waistband: 'button' }, { fabric: 'denim', stitch: 'safety-516' })] },
  'skirt-pencil': { name: 'Pencil skirt', group: 'Skirts', garments: [g('skirt', { length: 62, flare: -3, waistband: 'facing', slit: 'back' }, { fabric: 'wool-worsted-suiting', stitch: 'lockstitch-301' })] },
  'skirt-mini-denim': { name: 'Denim mini skirt', group: 'Skirts', garments: [g('skirt', { length: 38, flare: 6, waistband: 'button', pockets: 'five-pocket' }, { fabric: 'denim', stitch: 'felled-seam' })] },
  'skirt-midi': { name: 'Midi skirt', group: 'Skirts', garments: [g('skirt', { length: 80, flare: 24, waistband: 'elastic' }, { fabric: 'viscose-challis', stitch: 'french-seam' })] },
  'skirt-maxi': { name: 'Maxi skirt', group: 'Skirts', garments: [g('skirt', { length: 100, flare: 32, waistband: 'elastic', slit: 'side' }, { fabric: 'chiffon', stitch: 'french-seam' })] },

  // ---------- Accessories ----------
  'scarf': { name: 'Wool scarf', group: 'Accessories', garments: [g('scarf', { length: 180, width: 30, ends: 'fringe' }, { fabric: 'wool-cashmere', stitch: 'blind-hem' })] },
  'silk-scarf': { name: 'Silk scarf', group: 'Accessories', garments: [g('scarf', { length: 110, width: 18, ends: 'hemmed' }, { fabric: 'silk-twill', stitch: 'rolled-hem' })] },
  'necktie': { name: 'Necktie', group: 'Accessories', garments: [g('tie', { width: 8, length: 48, tip: 'pointed', knot: 'four-in-hand' }, { fabric: 'silk-twill', stitch: 'hand-slipstitch' })], why: 'Silk twill shell cut on the bias, wool interlining, hand-slipstitched back seam and bar tack.' },
  'skinny-tie': { name: 'Skinny tie', group: 'Accessories', garments: [g('tie', { width: 5, length: 48, tip: 'square', knot: 'four-in-hand' }, { fabric: 'wool-knit-tie', stitch: 'hand-slipstitch' })] },
  'bow-tie': { name: 'Bow tie', group: 'Accessories', garments: [g('tie', { knot: 'bow' }, { fabric: 'silk-satin', stitch: 'hand-slipstitch' })] },
  // ---------- Hats ----------
  'beanie': { name: 'Cuffed beanie / tuque', group: 'Hats', garments: [g('hat', { style: 'cuffed-beanie', height: 22 }, { fabric: 'rib-knit-wool', stitch: 'linking' })], why: 'Merino or acrylic 2x2 rib, linked crown seams, double-layer cuff.' },
  'beanie-pom': { name: 'Pom-pom tuque', group: 'Hats', garments: [g('hat', { style: 'beanie', height: 23, topper: 'pompom' }, { fabric: 'rib-knit-wool', stitch: 'linking' })] },
  'slouch-beanie': { name: 'Slouch beanie', group: 'Hats', garments: [g('hat', { style: 'slouch-beanie', height: 24 }, { fabric: 'rib-knit-wool', stitch: 'linking' })] },
  'baseball-cap': { name: 'Baseball cap (6-panel, curved bill)', group: 'Hats', garments: [g('hat', { style: 'baseball', height: 16, brim: 7, stiffener: 'polyethylene', billShape: 'curved', closure: 'strapback' }, { fabric: 'cotton-twill', stitch: 'lockstitch-301' })], why: 'Cotton twill crown, buckram-fused front panels, polyethylene bill insert (washable), 8 rows of bill stitching, sewn eyelets, taped seams.' },
  'snapback': { name: 'Snapback (structured, flat bill)', group: 'Hats', garments: [g('hat', { style: 'snapback', height: 17, brim: 7.5, stiffener: 'polyethylene', billShape: 'flat', closure: 'snapback' }, { fabric: 'wool-melton', stitch: 'lockstitch-301' })] },
  'trucker-cap': { name: 'Trucker cap (foam front, mesh back)', group: 'Hats', garments: [g('hat', { style: 'trucker', height: 17, brim: 7, stiffener: 'polyethylene', billShape: 'curved', closure: 'snapback' }, { fabric: 'polyester-woven-stretch', stitch: 'lockstitch-301' })] },
  'dad-cap': { name: 'Dad cap (unstructured)', group: 'Hats', garments: [g('hat', { style: 'dad-cap', height: 15, brim: 7, stiffener: 'polyethylene', billShape: 'curved', closure: 'strapback' }, { fabric: 'cotton-twill-garmentdyed', stitch: 'lockstitch-301' })] },
  'five-panel': { name: '5-panel camp cap', group: 'Hats', garments: [g('hat', { style: 'five-panel', height: 14, brim: 6.5, stiffener: 'polyethylene', billShape: 'flat', closure: 'strapback' }, { fabric: 'nylon-ripstop', stitch: 'lockstitch-301' })] },
  'bucket-hat': { name: 'Bucket hat', group: 'Hats', garments: [g('hat', { style: 'bucket', brim: 6.5, stiffener: 'none' }, { fabric: 'canvas', stitch: 'topstitch' })], why: 'Brim stiffened only by rows of topstitching (8-10 rows), no insert.' },
  'fedora': { name: 'Fedora', group: 'Hats', garments: [g('hat', { style: 'fedora', height: 13, brim: 6.5, stiffener: 'felt-wire', band: 'grosgrain' }, { fabric: 'wool-felt', stitch: 'lockstitch-301' })], why: 'Blocked wool or fur felt, sized and steamed on a wooden block; grosgrain band; brim edge wire.' },
  'trilby': { name: 'Trilby', group: 'Hats', garments: [g('hat', { style: 'trilby', height: 12, brim: 4, stiffener: 'felt-wire', band: 'grosgrain' }, { fabric: 'wool-felt', stitch: 'lockstitch-301' })] },
  'panama': { name: 'Panama hat', group: 'Hats', garments: [g('hat', { style: 'panama', height: 12, brim: 7, stiffener: 'straw-sized', band: 'grosgrain' }, { fabric: 'straw', stitch: 'lockstitch-301' })] },
  'beret': { name: 'Beret', group: 'Hats', garments: [g('hat', { style: 'beret', height: 12, topper: 'stalk' }, { fabric: 'wool-felt', stitch: 'lockstitch-301' })] },
  'flat-cap': { name: 'Flat cap', group: 'Hats', garments: [g('hat', { style: 'flat-cap', height: 11, brim: 5, stiffener: 'cardboard' }, { fabric: 'tweed', stitch: 'lockstitch-301' })] },
  'visor': { name: 'Visor', group: 'Hats', garments: [g('hat', { style: 'visor', brim: 8, stiffener: 'eva-foam', billShape: 'curved' }, { fabric: 'polyester-woven-stretch', stitch: 'lockstitch-301' })] },

  // ---------- Bags ----------
  'tote': { name: 'Canvas tote', group: 'Bags', audience: 'Unisex', garments: [g('bag', { type: 'tote', width: 38, height: 40, depth: 12, handles: 'shoulder-straps', closure: 'open', shape: 'rectangle' }, { fabric: 'canvas-12oz', stitch: 'lockstitch-301' })], why: '12 oz cotton duck, French-seamed or bound inside, handles bar-tacked or box-X stitched for load.' },
  'shopper': { name: 'Leather shopper', group: 'Bags', audience: "Women's", garments: [g('bag', { type: 'shopper', width: 46, height: 36, depth: 16, handles: 'shoulder-straps', closure: 'magnetic-snap', shape: 'trapezoid', base: 'structured', hardware: 'gold' }, { fabric: 'leather-full-grain', stitch: 'lockstitch-301' })] },
  'duffel': { name: 'Duffel bag', group: 'Bags', audience: "Men's", garments: [g('bag', { type: 'duffel', width: 52, height: 28, depth: 28, handles: 'top-handles', closure: 'zip', shape: 'cylinder', hardware: 'antique-brass', feet: 'yes' }, { fabric: 'waxed-cotton', stitch: 'lockstitch-301' })] },
  'weekender': { name: 'Weekender', group: 'Bags', audience: 'Unisex', garments: [g('bag', { type: 'weekender', width: 55, height: 30, depth: 24, handles: 'top-handles', closure: 'zip', shape: 'trapezoid', base: 'structured', feet: 'yes' }, { fabric: 'leather-cowhide', stitch: 'lockstitch-301' })] },
  'handbag': { name: 'Top-handle handbag', group: 'Bags', audience: "Women's", garments: [g('bag', { type: 'handbag', width: 28, height: 21, depth: 11, handles: 'top-handles', closure: 'turn-lock', shape: 'trapezoid', base: 'structured', hardware: 'gold', feet: 'yes' }, { fabric: 'leather-full-grain', stitch: 'lockstitch-301' })], why: 'Edge-painted or turned leather, bonded nylon thread at 7-8 SPI, bag-board base, metal feet, turn-lock hardware.' },
  'clutch': { name: 'Clutch / purse', group: 'Bags', audience: "Women's", garments: [g('bag', { type: 'clutch', width: 26, height: 14, depth: 4, handles: 'wrist', closure: 'frame-clasp', shape: 'rounded', hardware: 'gold' }, { fabric: 'silk-satin', stitch: 'lockstitch-301' })] },
  'crossbody': { name: 'Crossbody bag', group: 'Bags', audience: "Women's", garments: [g('bag', { type: 'crossbody', width: 23, height: 17, depth: 7, handles: 'crossbody', closure: 'flap-magnet', shape: 'rectangle', hardware: 'silver' }, { fabric: 'vegan-leather', stitch: 'lockstitch-301' })] },
  'sling': { name: 'Sling bag', group: 'Bags', audience: "Men's", garments: [g('bag', { type: 'sling', width: 30, height: 18, depth: 8, handles: 'crossbody', closure: 'zip', shape: 'rounded', pockets: 'front-zip', hardware: 'matte-black' }, { fabric: 'nylon-ballistic', stitch: 'lockstitch-301' })] },
  'fanny-pack': { name: 'Fanny pack / belt bag', group: 'Bags', audience: 'Unisex', garments: [g('bag', { type: 'fanny-pack', width: 30, height: 14, depth: 8, handles: 'waist-belt', closure: 'zip', shape: 'crescent', hardware: 'matte-black' }, { fabric: 'nylon-ripstop', stitch: 'lockstitch-301' })] },
  'backpack': { name: 'Backpack', group: 'Bags', audience: 'Unisex', garments: [g('bag', { type: 'backpack', width: 30, height: 42, depth: 14, handles: 'backpack', closure: 'zip', shape: 'rounded', pockets: 'front-zip' }, { fabric: 'nylon-ballistic', stitch: 'lockstitch-301' })] },
  'messenger': { name: 'Messenger bag', group: 'Bags', audience: "Men's", garments: [g('bag', { type: 'messenger', width: 38, height: 28, depth: 10, handles: 'crossbody', closure: 'flap-buckle', shape: 'rectangle', hardware: 'antique-brass' }, { fabric: 'waxed-cotton', stitch: 'lockstitch-301' })] },
  'bucket-bag': { name: 'Bucket bag', group: 'Bags', audience: "Women's", garments: [g('bag', { type: 'bucket', width: 24, height: 26, depth: 22, handles: 'shoulder-straps', closure: 'drawstring', shape: 'cylinder', hardware: 'gold' }, { fabric: 'suede', stitch: 'lockstitch-301' })] },
  'baguette': { name: 'Baguette bag', group: 'Bags', audience: "Women's", garments: [g('bag', { type: 'baguette', width: 26, height: 13, depth: 6, handles: 'top-handles', closure: 'flap-magnet', shape: 'rectangle', hardware: 'gold' }, { fabric: 'leather-lambskin', stitch: 'lockstitch-301' })] },
  'hobo': { name: 'Hobo bag', group: 'Bags', audience: "Women's", garments: [g('bag', { type: 'hobo', width: 36, height: 28, depth: 10, handles: 'shoulder-straps', closure: 'zip', shape: 'crescent', hardware: 'silver' }, { fabric: 'leather-lambskin-washed', stitch: 'lockstitch-301' })] },
};

/** Expand a template into garment specs with full options. */
export function templateGarments(templateId) {
  const t = TEMPLATES[templateId] || TEMPLATES['crew-tee'];
  return t.garments.map((gm, i) => ({
    id: `g${i}`,
    generator: gm.generator,
    options: { ...defaultOptions(gm.generator), ...gm.options },
    fabric: gm.fabric,
    sleeveFabric: gm.sleeveFabric,
    stitch: gm.stitch,
    button: gm.button,
    prefix: gm.prefix || (t.garments.length > 1 ? `g${i}-` : ''),
  }));
}

/** Build panels/seams/trims/overlays for one garment spec. */
export function buildGarment(spec, body) {
  const gen = GENERATORS[spec.generator];
  const opts = { ...spec.options, __stitch: spec.stitch, __button: spec.button, __body: body };
  const out = gen.build(opts, spec.prefix, spec.fabric);
  if (spec.sleeveFabric) for (const p of out.panels) if (p.role === 'sleeve') p.fabric = spec.sleeveFabric;
  for (const p of out.panels) p.garment = spec.id;
  return out;
}
