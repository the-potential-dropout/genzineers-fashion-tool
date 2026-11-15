/**
 * Belts: a strap (one or two layers, lined or reversible), its buckle, keepers, tip and holes,
 * sized the way belts are sold: the belt size is the distance from the buckle's fold to the
 * middle hole. Buckles can carry your own artwork (engraved, embossed or enamelled).
 */
const T = (name, o) => ({ name, width: 35, buckle: 'frame-pin', holes: 5, spacing: 25, tip: 'round', keepers: 1, fabric: 'leather-veg-belt', edge: 'painted', stitch: 'single', ...o });
export const BELT_TYPES = {
  dress: T('Dress belt', { width: 32, tip: 'english-point', fabric: 'leather-calfskin', why: 'Calf over a firm filler, feathered edge, single keeper, slim frame buckle.' }),
  casual: T('Casual / jeans belt', { width: 38, tip: 'round', stitch: 'none', edge: 'raw-burnished', why: 'One thick layer of bridle or harness leather, burnished edges.' }),
  western: T('Western belt', { width: 38, buckle: 'plate', buckleShape: 'oval', tip: 'pointed', keepers: 1, tooling: 'floral', stitch: 'double', why: 'Tooled strap, large trophy buckle held by snaps so it can be swapped.' }),
  ranger: T('Ranger belt (four piece)', { width: 38, buckle: 'frame-pin', tip: 'metal-tip', keepers: 2, keeperType: 'metal', billet: true, tooling: 'stamped-border', why: 'A wide body with a narrow billet strap on top carrying the buckle, two keepers and a tip.' }),
  reversible: T('Reversible belt (two sides)', { width: 35, buckle: 'twist-reversible', tip: 'square', fabric: 'leather-calfskin', twoSided: true, why: 'Black one side, brown the other: pull and turn the buckle to flip it.' }),
  ratchet: T('Ratchet / click belt (no holes)', { width: 35, buckle: 'ratchet', holes: 0, tip: 'square', keepers: 0, fabric: 'leather-calfskin', why: 'A hidden toothed track on the back; the buckle clicks every 6 mm and releases with a lever. Cut to length.' }),
  'clip-on': T('Clamp buckle belt (clip-on, cut to fit)', { width: 35, buckle: 'clamp', holes: 5, tip: 'square', why: 'The buckle clamps onto the cut end with teeth: trim the strap to size and clip the buckle back on.' }),
  military: T('Web belt (military, friction buckle)', { width: 32, buckle: 'friction-slide', holes: 0, tip: 'metal-tip', keepers: 0, fabric: 'nylon-webbing', stitch: 'none', edge: 'woven' }),
  'd-ring': T('D-ring belt', { width: 38, buckle: 'double-d', holes: 0, tip: 'pointed', keepers: 0, fabric: 'canvas', stitch: 'double' }),
  'o-ring': T('O-ring belt', { width: 40, buckle: 'o-ring', holes: 0, tip: 'pointed', keepers: 0, fabric: 'leather-cowhide' }),
  braided: T('Braided belt', { width: 32, buckle: 'frame-pin', holes: 0, tip: 'round', braided: true, stitch: 'none', why: 'The prong goes through the weave anywhere: fits every size in between.' }),
  studded: T('Studded belt', { width: 40, buckle: 'frame-pin', decor: 'pyramid-studs', stitch: 'none' }),
  grommet: T('Double-grommet belt', { width: 40, buckle: 'double-pin', decor: 'grommets', holes: 9, stitch: 'none' }),
  garrison: T('Garrison / work belt', { width: 44, buckle: 'box-frame', tip: 'square', keepers: 1, stitch: 'none', edge: 'raw-burnished' }),
  skinny: T('Skinny belt', { width: 18, tip: 'pointed', fabric: 'leather-calfskin', holes: 5 }),
  'wide-waist': T('Wide waist belt', { width: 75, buckle: 'frame-pin', tip: 'round', position: 'waist', fabric: 'leather-lambskin', holes: 5, stitch: 'double' }),
  obi: T('Obi / wrap belt', { width: 90, buckle: 'tie', holes: 0, tip: 'pointed', keepers: 0, position: 'waist', fabric: 'leather-lambskin', stitch: 'none' }),
  concho: T('Concho belt', { width: 32, buckle: 'plate', buckleShape: 'oval', decor: 'conchos', tip: 'pointed', stitch: 'none' }),
  chain: T('Chain belt', { width: 14, buckle: 'hook', holes: 0, keepers: 0, chain: true, position: 'waist', stitch: 'none' }),
  tactical: T('Tactical belt (quick release)', { width: 44, buckle: 'side-release', holes: 0, tip: 'square', keepers: 1, fabric: 'nylon-webbing', stitch: 'double', edge: 'woven' }),
};

export const BUCKLES = {
  'frame-pin': 'Frame with a pin (the standard)', 'double-pin': 'Double pin', 'plate': 'Plate / trophy (western)', 'box-frame': 'Box frame (military plate)', 'ratchet': 'Ratchet / automatic (clip-on)', 'clamp': 'Clamp (clip-on, cut to fit)', 'twist-reversible': 'Twist (reversible)', 'double-d': 'Double D-ring', 'o-ring': 'O-ring', 'side-release': 'Side release (quick release)', 'friction-slide': 'Friction slide (web belt)', 'hook': 'Hook and ring', 'tie': 'Tied (no buckle)',
};
export const BELT_METALS = { silver: '#c9c9c9', 'brushed-nickel': '#a9abad', gold: '#d4af37', 'antique-brass': '#8c6f33', brass: '#b08d3c', gunmetal: '#45484d', 'matte-black': '#18181a', copper: '#a8623a', 'rose-gold': '#c98f7a' };

export const BELT_OPTIONS = {
  type: { label: 'Type', type: 'select', values: Object.keys(BELT_TYPES), default: 'casual' },
  size: { label: 'Belt size (cm from the buckle fold to the middle hole, 0 = fit the mannequin)', type: 'range', min: 0, max: 160, step: 1, default: 0 },
  width: { label: 'Width (mm, 0 = type default)', type: 'range', min: 0, max: 110, step: 1, default: 0 },
  position: { label: 'Worn', type: 'select', values: ['auto', 'hips (through trouser loops)', 'waist'], default: 'auto' },
  holes: { label: 'Holes (-1 = type default)', type: 'range', min: -1, max: 11, step: 1, default: -1 },
  spacing: { label: 'Hole spacing (mm)', type: 'range', min: 12, max: 40, step: 1, default: 25 },
  wornHole: { label: 'Fastened on hole (0 = the middle one)', type: 'range', min: 0, max: 11, step: 1, default: 0 },
  buckle: { label: 'Buckle', type: 'select', values: ['type-default', ...Object.keys(BUCKLES)], default: 'type-default' },
  buckleShape: { label: 'Buckle shape', type: 'select', values: ['auto', 'rectangle', 'rounded', 'square', 'oval', 'horseshoe', 'shield'], default: 'auto' },
  buckleSize: { label: 'Buckle size (% of standard)', type: 'range', min: 60, max: 180, step: 5, default: 100 },
  buckleFinish: { label: 'Buckle metal', type: 'select', values: Object.keys(BELT_METALS), default: 'silver' },
  buckleArt: { label: 'Buckle artwork (your own image: logo, pattern, engraving)', type: 'image', default: '' },
  buckleArtMode: { label: 'Artwork is', type: 'select', values: ['engraved', 'embossed (raised)', 'enamel (colour)', 'two-tone plating'], default: 'engraved' },
  tip: { label: 'Tip', type: 'select', values: ['type-default', 'round', 'pointed', 'english-point', 'square', 'metal-tip'], default: 'type-default' },
  keepers: { label: 'Keepers (loops, -1 = type default)', type: 'range', min: -1, max: 3, step: 1, default: -1 },
  keeperType: { label: 'Keeper', type: 'select', values: ['auto', 'leather (fixed)', 'leather (sliding)', 'metal'], default: 'auto' },
  tooling: { label: 'Tooling / embossing', type: 'select', values: ['type-default', 'none', 'stamped-border', 'basketweave', 'floral', 'crease-line'], default: 'type-default' },
  decor: { label: 'Studs and conchos', type: 'select', values: ['type-default', 'none', 'pyramid-studs', 'dome-studs', 'conchos', 'grommets', 'rivets'], default: 'type-default' },
  stitch: { label: 'Stitching', type: 'select', values: ['type-default', 'none', 'single', 'double'], default: 'type-default' },
  stitchColor: { label: 'Stitching colour', type: 'color', default: '#000001' },
  edge: { label: 'Edges', type: 'select', values: ['type-default', 'painted', 'raw-burnished', 'turned', 'woven'], default: 'type-default' },
  edgeColor: { label: 'Edge colour', type: 'color', default: '#000001' },
  lining: { label: 'Lining / second side', type: 'select', values: ['auto', 'none (single layer)', 'leather', 'nubuck', 'suede', 'bonded leather'], default: 'auto' },
  sideB: { label: 'Second side colour (reversible, lining)', type: 'color', default: '#5a3a22' },
  showSide: { label: 'Side showing', type: 'select', values: ['A', 'B'], default: 'A' },
  attach: { label: 'Buckle attachment', type: 'select', values: ['stitched', 'snaps (swap buckles)', 'chicago screws', 'clamp'], default: 'snaps (swap buckles)' },
  color: { label: 'Colour (leave as the material colour, or pick)', type: 'color', default: '#000000' },
};

const r1 = (v) => Math.round(v * 10) / 10;

export function beltSpec(o, body) {
  const t = BELT_TYPES[o.type] || BELT_TYPES.casual; const pick = (k) => (o[k] === undefined || o[k] === 'type-default' || o[k] === 'auto' ? t[k] : o[k]);
  const s = { ...t, type: o.type };
  for (const k of ['buckle', 'tip', 'tooling', 'decor', 'stitch', 'edge']) s[k] = pick(k) || (k === 'tooling' || k === 'decor' ? 'none' : s[k]);
  s.width = o.width > 0 ? o.width : t.width; s.holes = o.holes >= 0 ? o.holes : t.holes; s.spacing = o.spacing || 25; s.keepers = o.keepers >= 0 ? o.keepers : t.keepers;
  s.keeperType = o.keeperType && o.keeperType !== 'auto' ? o.keeperType : t.keeperType === 'metal' ? 'metal' : 'leather (fixed)';
  s.buckleShape = o.buckleShape && o.buckleShape !== 'auto' ? o.buckleShape : t.buckleShape || (s.buckle === 'plate' ? 'oval' : 'rounded');
  s.position = o.position && o.position !== 'auto' ? (o.position === 'waist' ? 'waist' : 'hips') : t.position || 'hips';
  const waist = body ? (s.position === 'waist' ? body.waist : (body.waist * 0.55 + body.hip * 0.45)) : 86; // where it is worn, over the clothes
  s.fit = r1(waist + 4); s.size = o.size > 0 ? o.size : Math.round(s.fit / 5) * 5;
  s.worn = o.wornHole > 0 ? Math.min(Math.max(1, s.holes), o.wornHole) : Math.ceil(Math.max(1, s.holes) / 2);
  s.tail = s.holes ? 15 : s.buckle === 'ratchet' ? 12 : 18; // strap beyond the middle hole
  s.total = r1(s.size + s.tail + (s.buckle === 'ratchet' || s.buckle === 'clamp' ? 0 : 5)); // blank length incl. the fold round the buckle
  s.lining = o.lining && o.lining !== 'auto' ? o.lining : t.twoSided ? 'leather' : /dress|skinny|wide|reversible/.test(o.type) ? 'leather' : 'none (single layer)';
  s.thick = /none/.test(s.lining) ? (/(webbing|canvas)/.test(t.fabric) ? 2 : 4) : 3.6;
  return s;
}

export function beltParts(s) {
  const P = []; const add = (id, name, fabric, note) => P.push({ id, name, fabric: fabric || null, note });
  add('strap', s.chain ? 'Chain' : 'Strap (side A)', null, '');
  if (!/none/.test(s.lining)) add('lining', s.twoSided ? 'Side B' : 'Lining', s.lining === 'nubuck' ? 'leather-cowhide-nubuck' : s.lining === 'suede' ? 'suede' : null, s.twoSided ? 'The second face of a reversible belt.' : 'Glued and stitched to the back.');
  if (s.billet) add('billet', 'Billets (buckle and tip straps)', null, 'Narrow straps stitched on top of the body.');
  if (s.keepers && !/metal/.test(s.keeperType)) add('keeper', 'Keeper', null, '');
  return P;
}

export function beltPieces(s, fabric) {
  const out = []; const W = s.width / 10; const L = s.total; const fabOf = Object.fromEntries(beltParts(s).map((p) => [p.id, p.fabric || fabric]));
  const tipPts = (w, tip) => (tip === 'pointed' ? [[L - w * 0.9, 0], [L, w / 2], [L - w * 0.9, w]] : tip === 'english-point' ? [[L - w * 0.7, 0], [L - w * 0.2, w * 0.22], [L, w / 2], [L - w * 0.2, w * 0.78], [L - w * 0.7, w]] : tip === 'round' ? Array.from({ length: 9 }, (_, i) => { const a = -Math.PI / 2 + (i / 8) * Math.PI; return [L - w / 2 + Math.cos(a) * w / 2, w / 2 + Math.sin(a) * w / 2]; }) : [[L, 0], [L, w]]);
  const hole = (x, r = 0.25) => Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return [r1(x + Math.cos(a) * r), r1(W / 2 + Math.sin(a) * r)]; });
  const holes = []; const mid = s.size + (s.buckle === 'ratchet' || s.buckle === 'clamp' ? 0 : 5); for (let k = 0; k < s.holes; k++) holes.push(hole(mid + (k - (s.holes - 1) / 2) * (s.spacing / 10)));
  if (!['ratchet', 'clamp', 'friction-slide', 'double-d', 'o-ring', 'tie'].includes(s.buckle)) holes.push([[3.2, W / 2 - 0.25], [5.4, W / 2 - 0.25], [5.4, W / 2 + 0.25], [3.2, W / 2 + 0.25]]); // slot for the prong at the fold
  if (!s.chain) out.push({ name: 'Strap', points: [[0, 0], ...tipPts(W, s.tip === 'metal-tip' ? 'square' : s.tip), [0, W]].map(([a, b]) => [r1(a), r1(b)]), holes, fabric: fabOf.strap || fabric, cut: 1, part: 'strap', note: `${r1(L)} cm long x ${s.width} mm. Belt size ${s.size} cm = fold line (5 cm from the square end) to the middle hole. ${s.holes ? `${s.holes} holes at ${s.spacing} mm, oval 4 x 6 mm or round 5 mm.` : s.buckle === 'ratchet' ? 'No holes: a 20 cm toothed track is stitched to the back of the tip end. Sold long and cut to length at the buckle end.' : 'No holes.'} Skive the last 6 cm at the buckle end to half thickness for the fold.` });
  if (!/none/.test(s.lining)) out.push({ name: s.twoSided ? 'Side B strap' : 'Lining strap', points: [[0, 0], ...tipPts(W, s.tip === 'metal-tip' ? 'square' : s.tip), [0, W]].map(([a, b]) => [r1(a), r1(b)]), fabric: fabOf.lining || fabric, cut: 1, part: 'lining', note: 'Cut 2 mm over size, glue, trim flush with the strap, then stitch 3 mm from the edge.' });
  if (s.billet) out.push({ name: 'Billet', points: [[0, 0], [24, 0], [25.5, 1], [24, 2], [0, 2]], fabric: fabOf.billet || fabric, cut: 2, part: 'billet', note: 'One carries the buckle, the other the holes and tip; stitched to the body in a point.' });
  if (s.keepers && !/metal/.test(s.keeperType)) out.push({ name: 'Keeper', points: [[0, 0], [W * 2 + 2.4, 0], [W * 2 + 2.4, 1.1], [0, 1.1]].map(([a, b]) => [r1(a), r1(b)]), fabric: fabOf.keeper || fabric, cut: s.keepers, part: 'keeper', note: 'Skive the ends, overlap 1 cm and stitch or staple; fixed keepers are caught in the fold stitching.' });
  return out;
}

export function beltSheet(s, fabricName, o) {
  const sizes = [-10, -5, 0, 5, 10].map((d) => s.size + d);
  return [
    ['Style', s.name], ['Width', `${s.width} mm (fits ${s.width <= 32 ? 'dress trouser loops' : s.width <= 40 ? 'jeans loops (max 40 mm)' : 'wide loops or worn over clothes'})`],
    ['Size', `${s.size} cm (${Math.round(s.size / 2.54)} in): the wearer measures ${r1(s.fit)} cm where the belt is worn. Rule: belt size = trouser waist + 5 cm (2 in). Fastens from ${r1(s.size - ((s.holes - 1) / 2) * s.spacing / 10)} to ${r1(s.size + ((s.holes - 1) / 2) * s.spacing / 10)} cm.`],
    ['Size run', sizes.map((v) => `${v} cm / ${Math.round(v / 2.54)} in`).join(' · ')],
    ['Strap', `${fabricName}, ${s.thick} mm finished${/none/.test(s.lining) ? ', single layer' : `, lined with ${s.lining}`} · total blank ${s.total} cm · tip: ${s.tip}`],
    ['Holes', s.holes ? `${s.holes} at ${s.spacing} mm, the middle one ${s.size} cm from the fold` : 'none'],
    ['Buckle', `${BUCKLES[s.buckle]} · ${s.buckleShape} · ${o?.buckleFinish || 'silver'}${o?.buckleArt ? ` · your artwork, ${o.buckleArtMode || 'engraved'} (supply vector art; minimum line 0.3 mm)` : ''} · inside width ${s.width + 2} mm · attached by ${o?.attach || 'snaps'}`],
    ['Keepers', s.keepers ? `${s.keepers} x ${s.keeperType}, 10 to 12 mm wide` : 'none'],
    ['Edges and stitching', `${s.edge}${s.stitch !== 'none' ? ` · ${s.stitch} row, 3 mm from the edge, 2.5 to 3 stitches per cm, bonded nylon Tex 135 to 210` : ''}${s.tooling && s.tooling !== 'none' ? ` · tooling: ${s.tooling}` : ''}${s.decor && s.decor !== 'none' ? ` · ${s.decor} every ${s.decor === 'conchos' ? 9 : 2.5} cm` : ''}`],
    ['Order of work', 'Cut the strap along the back of the hide (least stretch) → skive the fold and ends → tool or emboss on the flat → glue lining, trim → stitch → shape the tip → punch holes and the prong slot → bevel, dye and burnish or paint the edges (2 to 3 coats) → set snaps or screws, keeper, buckle'],
  ];
}

export function buildBelt(o, prefix = '', fabric = 'leather-veg-belt') {
  const body = o.__body; const s = beltSpec(o, body); const parts = beltParts(s);
  const col = (k) => (o[k] && o[k] !== '#000001' ? o[k] : null);
  const spec = { kind: 'belt', ...s, fabric, color: o.color && o.color !== '#000000' ? o.color : null, parts, buckleFinish: o.buckleFinish || 'silver', buckleArt: o.buckleArt || '', buckleArtMode: o.buckleArtMode || 'engraved', buckleSize: (o.buckleSize || 100) / 100, stitchColor: col('stitchColor'), edgeColor: col('edgeColor'), sideB: o.sideB, showSide: o.showSide || 'A' };
  return { panels: [], seams: [], trims: [], overlays: [], belts: [spec], pieces: beltPieces(s, fabric), colliders: [], meta: { sheet: beltSheet(s, fabric, o) } };
}
