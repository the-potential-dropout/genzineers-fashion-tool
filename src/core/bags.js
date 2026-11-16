/**
 * Bags, described as a bag maker assembles them: front and back panels, gussets, a base, a flap
 * or zip, lining, handles or straps with their tabs, rings and adjusters, piping, feet and locks.
 * Each named part can take its own material and colour.
 */
const T = (name, o) => ({ name, width: 30, height: 25, depth: 10, shape: 'rectangle', handles: 'shoulder-straps', closure: 'zip', base: 'soft', fabric: 'leather-cowhide', flare: 0, soft: 0.3, ...o });
export const BAG_TYPES = {
  tote: T('Tote', { width: 38, height: 40, depth: 12, closure: 'open', fabric: 'canvas', flare: 0.16, soft: 0.5, strapsDown: true }),
  shopper: T('Shopper', { width: 46, height: 36, depth: 16, closure: 'magnetic-snap', flare: 0.2, soft: 0.4 }),
  duffel: T('Duffel', { width: 52, height: 28, depth: 28, shape: 'cylinder', handles: 'top-handles', barrel: true, fabric: 'nylon-ballistic', soft: 0.5, wrap: true }),
  weekender: T('Weekender', { width: 55, height: 30, depth: 24, shape: 'trapezoid', handles: 'top-handles', flare: -0.14, soft: 0.4, wrap: true, feet: 'yes' }),
  handbag: T('Top-handle handbag', { width: 28, height: 21, depth: 11, handles: 'top-handles', closure: 'turn-lock', base: 'structured', flare: -0.08, soft: 0, flap: 0.45, feet: 'yes' }),
  satchel: T('Satchel', { width: 34, height: 25, depth: 10, handles: 'top-handles', closure: 'flap-buckle', base: 'structured', soft: 0.05, flap: 0.8, fabric: 'leather-veg-tan' }),
  clutch: T('Clutch / purse', { width: 26, height: 14, depth: 4, handles: 'wrist', closure: 'frame-clasp', shape: 'rounded', soft: 0.2 }),
  'envelope-clutch': T('Envelope clutch', { width: 28, height: 17, depth: 2.5, handles: 'none', closure: 'flap-magnet', base: 'structured', soft: 0, flap: 0.62, flapShape: 'point' }),
  crossbody: T('Crossbody bag', { width: 23, height: 17, depth: 7, handles: 'crossbody', closure: 'flap-magnet', base: 'structured', soft: 0.05, flap: 0.6, flapShape: 'curve' }),
  'camera-bag': T('Camera bag', { width: 22, height: 15, depth: 8, handles: 'crossbody', closure: 'zip', shape: 'rounded', soft: 0.1, pockets: 'front-zip' }),
  'saddle-bag': T('Saddle bag', { width: 22, height: 20, depth: 7, handles: 'crossbody', closure: 'flap-buckle', shape: 'rounded', soft: 0.05, flap: 0.85, flapShape: 'curve', fabric: 'leather-veg-tan' }),
  sling: T('Sling bag', { width: 30, height: 18, depth: 8, handles: 'crossbody', shape: 'rounded', soft: 0.4, fabric: 'nylon-ballistic', pockets: 'front-zip' }),
  'fanny-pack': T('Fanny pack / belt bag', { width: 30, height: 14, depth: 8, handles: 'waist-belt', shape: 'rounded', soft: 0.4, fabric: 'nylon-ballistic', pockets: 'front-zip' }),
  backpack: T('Backpack', { width: 30, height: 44, depth: 15, handles: 'backpack', shape: 'rounded', soft: 0.35, fabric: 'nylon-ballistic', pockets: 'front-zip', archZip: true, pack: true }),
  rucksack: T('Rucksack (flap and drawstring)', { width: 30, height: 44, depth: 16, handles: 'backpack', closure: 'drawstring', soft: 0.45, fabric: 'canvas', flap: 0.42, flapStraps: true, pockets: 'side', pack: true, style: 'rucksack' }),
  messenger: T('Messenger bag', { width: 38, height: 28, depth: 10, handles: 'crossbody', closure: 'flap-buckle', soft: 0.3, fabric: 'canvas', flap: 0.82 }),
  briefcase: T('Briefcase', { width: 40, height: 29, depth: 9, handles: 'top-handles', closure: 'flap-buckle', base: 'structured', soft: 0, flap: 0.6, fabric: 'leather-veg-tan', oneHandle: true, feet: 'yes' }),
  'laptop-bag': T('Laptop bag', { width: 40, height: 29, depth: 8, handles: 'top-handles', closure: 'zip', soft: 0.15, fabric: 'nylon-ballistic', pockets: 'front-zip', extraStrap: 'crossbody' }),
  bucket: T('Bucket bag', { width: 24, height: 26, depth: 22, shape: 'cylinder', closure: 'drawstring', soft: 0.35, flare: 0.08 }),
  baguette: T('Baguette bag', { width: 26, height: 13, depth: 6, handles: 'top-handles', closure: 'flap-magnet', base: 'structured', soft: 0.05, flap: 0.7, oneHandle: true, shortHandle: true }),
  hobo: T('Hobo bag', { width: 36, height: 28, depth: 10, shape: 'crescent', soft: 0.7, oneHandle: true }),
  'doctor-bag': T('Doctor / frame bag', { width: 34, height: 24, depth: 16, handles: 'top-handles', closure: 'frame-clasp', base: 'structured', flare: -0.1, soft: 0.1, feet: 'yes' }),
  'bowling-bag': T('Bowling bag', { width: 32, height: 22, depth: 15, handles: 'top-handles', shape: 'rounded', base: 'structured', soft: 0.1, archZip: true, feet: 'yes' }),
  'box-bag': T('Box bag / vanity', { width: 18, height: 14, depth: 10, handles: 'top-handles', base: 'structured', soft: 0, oneHandle: true, shortHandle: true, zipRound: true }),
  'chain-flap': T('Quilted chain flap bag', { width: 25, height: 16, depth: 7, handles: 'chain', closure: 'turn-lock', base: 'structured', soft: 0.05, flap: 0.62, quilt: true, fabric: 'leather-lambskin' }),
  'drawstring-pouch': T('Drawstring pouch', { width: 20, height: 24, depth: 14, shape: 'cylinder', handles: 'none', closure: 'drawstring', soft: 0.8, fabric: 'canvas' }),
  'gym-sack': T('Gym sack', { width: 34, height: 44, depth: 3, handles: 'backpack', closure: 'drawstring', soft: 0.9, fabric: 'nylon-ripstop', cordStraps: true }),
  'garment-duffel': T('Barrel gym bag', { width: 46, height: 24, depth: 24, shape: 'cylinder', handles: 'top-handles', barrel: true, fabric: 'nylon-ballistic', soft: 0.5, wrap: true, extraStrap: 'crossbody', pockets: 'side' }),
  'wallet': T('Bifold wallet', { width: 11.5, height: 9.5, depth: 1.6, handles: 'none', closure: 'open', base: 'structured', soft: 0, fold: true, fabric: 'leather-veg-thin' }),
  'card-holder': T('Card holder', { width: 10.2, height: 7.6, depth: 0.6, handles: 'none', closure: 'open', base: 'structured', soft: 0, cards: true, fabric: 'leather-veg-thin' }),
  'holster': T('Belt holster (pancake)', { width: 15, height: 16, depth: 3.4, handles: 'none', closure: 'open', base: 'structured', soft: 0, holster: true, fabric: 'leather-veg-holster' }),
};

export const BAG_OPTIONS = {
  type: { label: 'Bag type', type: 'select', values: Object.keys(BAG_TYPES), default: 'tote' },
  width: { label: 'Width (cm)', type: 'range', min: 8, max: 70, step: 0.5, default: 38 },
  height: { label: 'Height (cm)', type: 'range', min: 6, max: 60, step: 0.5, default: 40 },
  depth: { label: 'Depth / gusset (cm)', type: 'range', min: 0.5, max: 35, step: 0.5, default: 12 },
  shape: { label: 'Shape', type: 'select', values: ['rectangle', 'rounded', 'crescent', 'trapezoid', 'cylinder'], default: 'rectangle' },
  handles: { label: 'Handles / straps', type: 'select', values: ['top-handles', 'shoulder-straps', 'crossbody', 'chain', 'backpack', 'waist-belt', 'wrist', 'none'], default: 'shoulder-straps' },
  handleStyle: { label: 'Handle make', type: 'select', values: ['auto', 'rolled', 'flat', 'webbing', 'braided'], default: 'auto' },
  handleDrop: { label: 'Handle drop (cm above the bag, 0 = auto)', type: 'range', min: 0, max: 70, step: 1, default: 0 },
  attach: { label: 'Handle attachment', type: 'select', values: ['auto', 'stitched-tabs', 'rings', 'rivets', 'stitched-through'], default: 'auto' },
  closure: { label: 'Closure', type: 'select', values: ['open', 'zip', 'magnetic-snap', 'flap-magnet', 'flap-buckle', 'drawstring', 'frame-clasp', 'turn-lock'], default: 'magnetic-snap' },
  base: { label: 'Base', type: 'select', values: ['soft', 'structured'], default: 'soft' },
  hardware: { label: 'Hardware finish', type: 'select', values: ['silver', 'gold', 'gunmetal', 'antique-brass', 'matte-black'], default: 'silver' },
  pockets: { label: 'Outer pockets', type: 'select', values: ['none', 'front-zip', 'front-slip', 'side'], default: 'none' },
  feet: { label: 'Base studs / feet', type: 'select', values: ['no', 'yes'], default: 'no' },
  piping: { label: 'Seams', type: 'select', values: ['auto', 'piped', 'turned (seam inside)', 'raw edge, painted', 'bound'], default: 'auto' },
  corners: { label: 'Corner patches', type: 'select', values: ['no', 'yes'], default: 'no' },
  quilt: { label: 'Quilting', type: 'select', values: ['auto', 'none', 'diamond', 'channels'], default: 'auto' },
  lining: { label: 'Lining', type: 'select', values: ['cotton-twill', 'suede', 'satin', 'nylon', 'unlined'], default: 'cotton-twill' },
  liningColor: { label: 'Lining colour', type: 'color', default: '#b9a98f' },
  stitchColor: { label: 'Stitching colour', type: 'color', default: '#000001' },
  edgeColor: { label: 'Edge paint colour', type: 'color', default: '#000001' },
  color: { label: 'Colour (leave as the material colour, or pick)', type: 'color', default: '#000000' },
  lifters: { label: 'Backpack: load lifters', type: 'select', values: ['auto', 'yes', 'no'], default: 'auto' },
  sternum: { label: 'Backpack: sternum strap', type: 'select', values: ['yes', 'no'], default: 'yes' },
  bottlePockets: { label: 'Backpack: side bottle pockets', type: 'select', values: ['yes', 'no'], default: 'yes' },
  compression: { label: 'Backpack: side compression straps', type: 'select', values: ['yes', 'no'], default: 'yes' },
};
export const BAG_HW = { silver: '#c8c8c8', gold: '#d4af37', gunmetal: '#4a4d52', 'antique-brass': '#a07c3a', 'matte-black': '#1a1a1a' };

const r1 = (v) => Math.round(v * 10) / 10;

export function bagSpec(o) {
  const t = BAG_TYPES[o.type] || BAG_TYPES.tote;
  const s = { ...t, type: o.type, width: o.width, height: o.height, depth: o.depth, shape: o.shape || t.shape, handles: o.handles || t.handles, closure: o.closure || t.closure, base: o.base || t.base, hardware: o.hardware || 'silver', pockets: o.pockets && o.pockets !== 'none' ? o.pockets : 'none', feet: o.feet === 'yes' };
  if (s.shape !== 'cylinder') s.barrel = false;
  if (!/^flap/.test(s.closure) && s.closure !== 'turn-lock' && !(s.closure === 'drawstring' && t.flap)) s.flap = 0;
  if ((/^flap/.test(s.closure) || s.closure === 'turn-lock') && !s.flap) s.flap = 0.55;
  const leather = /leather|suede|faux|croc|python/.test(o.__fabric || t.fabric);
  s.handleStyle = o.handleStyle && o.handleStyle !== 'auto' ? o.handleStyle : s.handles === 'top-handles' && leather && !s.strapsDown ? 'rolled' : /nylon|canvas|ripstop/.test(o.__fabric || t.fabric) && s.handles !== 'top-handles' ? 'webbing' : 'flat';
  s.attach = o.attach && o.attach !== 'auto' ? o.attach : s.strapsDown || s.wrap ? 'stitched-through' : s.handles === 'crossbody' || s.handles === 'chain' ? 'rings' : s.handleStyle === 'rolled' ? 'rings' : 'stitched-tabs';
  s.drop = o.handleDrop > 0 ? o.handleDrop : s.handles === 'top-handles' ? (s.shortHandle ? 7 : 12) : s.handles === 'shoulder-straps' ? 25 : s.handles === 'crossbody' || s.handles === 'chain' ? 52 : 0;
  s.piping = o.piping && o.piping !== 'auto' ? o.piping : s.base === 'structured' && leather ? 'raw edge, painted' : s.soft > 0.6 ? 'turned (seam inside)' : leather ? 'piped' : 'bound';
  s.quiltStyle = o.quilt && o.quilt !== 'auto' ? o.quilt : t.quilt ? 'diamond' : 'none';
  s.corners = o.corners === 'yes';
  // a flap bag carries one top handle behind the flap's hinge, so the flap closes freely under it (satchel, briefcase, top-handle bag)
  if (s.flap && s.handles === 'top-handles') s.oneHandle = true;
  s.pack = !!t.pack && s.handles === 'backpack';
  if (s.pack) { s.lifters = o.lifters === 'yes' || (o.lifters !== 'no' && s.height >= 46); s.sternum = o.sternum !== 'no'; s.bottle = o.bottlePockets !== 'no'; s.compress = o.compression !== 'no'; if (!o.pockets) s.pockets = 'front-zip'; }
  return s;
}

export function bagParts(s) {
  const P = []; const add = (id, name, fabric, note) => P.push({ id, name, fabric: fabric || null, note });
  if (s.pack) {
    add('body', 'Front panel and zip panel', null, 'The zip panel is two strips with the main zip set between them.');
    add('gusset', 'Side gussets', null, 'One strip each side, from the base up to the zip panel.');
    add('base', 'Base and anchor triangles', 'cordura-500d', 'Double layer; takes the wear when the pack is set down.');
    add('back', 'Back panel (3D air mesh over foam)', 'mesh', 'Two 10 mm EVA pads with a spine channel, a lumbar pad below.');
    add('handle', 'Shoulder straps (shell)', null, 'Shell over 10 mm foam, S-curved.');
    add('webbing', 'Webbing (straps, haul loop, anchors, compression)', 'nylon-webbing', '25 mm and 20 mm polypropylene or nylon.');
    if (s.pockets !== 'none') add('pocket', s.style === 'rucksack' ? 'Bellows side pockets' : 'Front pocket', null, s.style === 'rucksack' ? 'Box pockets on the side gussets, each with a flap, strap and buckle.' : 'Panel and its own gusset, with a zip over the top.');
    if (s.bottle && s.style !== 'rucksack') add('mesh', 'Side bottle pockets (stretch mesh)', 'mesh', 'Elastic bound at the top, sewn into the base seam.');
    add('piping', 'Binding tape (seams, strap and back-panel edges)', 'nylon-webbing', '25 mm grosgrain folded over every inside seam and the strap edges.');
    if (s.style === 'rucksack') { add('flap', 'Lid', null, 'Sewn along the top of the back panel; bound edge; two straps to buckles on the front.'); add('throat', 'Throat (extension collar)', 'nylon-ripstop', 'Gathered by a drawcord in a channel at the top, cord lock at the front.'); }
    add('lining', s.style === 'rucksack' ? 'Lining' : 'Lining and laptop sleeve', 'nylon-ripstop', s.style === 'rucksack' ? '210D ripstop.' : '210D ripstop lining; padded sleeve on the back panel inside.');
    return P;
  }
  add('body', s.fold || s.cards || s.holster ? 'Outer' : 'Front and back panels', null, '');
  if (!s.fold && !s.cards && !s.holster && s.depth > 3) add('gusset', s.barrel ? 'End panels' : 'Gussets (sides)', null, '');
  if (!s.fold && !s.cards && !s.holster) add('base', 'Base', s.base === 'structured' ? null : null, s.base === 'structured' ? 'Stiffened with a base board.' : '');
  if (s.flap) add('flap', 'Flap', null, 'Lined; edge turned or painted.');
  if (s.handles !== 'none') add('handle', s.handles === 'backpack' ? 'Shoulder straps' : s.handles === 'waist-belt' ? 'Belt' : s.handles === 'crossbody' ? 'Strap' : s.handles === 'chain' ? 'Chain shoulder pad' : 'Handles', s.handleStyle === 'webbing' ? 'nylon-webbing' : null, '');
  if (s.attach !== 'stitched-through' && s.handles !== 'none') add('tab', 'Handle tabs (chapes)', null, 'Folded round the ring or handle end, stitched and riveted.');
  if (s.pockets !== 'none') add('pocket', 'Outer pocket', null, '');
  if (s.piping === 'piped') add('piping', 'Piping', null, 'Bias strip round a 3 mm cord, sewn into the seams.');
  if (s.piping === 'bound') add('piping', 'Seam binding', 'nylon-webbing', 'Grosgrain or webbing folded over the seam.');
  if (s.corners) add('corner', 'Corner patches', 'leather-cowhide', '');
  if (s.wrap) add('wrap', 'Wrap straps', s.handleStyle === 'webbing' ? 'nylon-webbing' : null, 'The handles run right round under the bag and carry the load.');
  if (s.fold || s.cards) add('pockets-in', 'Card pockets', null, 'Skived and stepped 1 cm apart.');
  add('lining', 'Lining', 'cotton-twill', '');
  return P;
}

export function bagPieces(s, fabric, o) {
  const W = s.width; const H = s.height; const D = s.depth; const SA = 1; const out = [];
  const fabOf = Object.fromEntries(bagParts(s).map((p) => [p.id, p.fabric || fabric]));
  const pc = (part, name, pts, cut, note, extra = {}) => out.push({ name, points: pts.map(([a, b]) => [r1(a), r1(b)]), fabric: fabOf[part] || fabric, cut, note, part, ...extra });
  const rect = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
  const rrect = (w, h, r) => { const p = []; for (const [cx, cy, a0] of [[w - r, r, -90], [w - r, h - r, 0], [r, h - r, 90], [r, r, 180]]) for (let i = 0; i <= 5; i++) { const a = ((a0 + i * 18) * Math.PI) / 180; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; };
  if (s.pack) { packPieces(s, W, H, D, SA, pc, rect, o, rrect); return out; }
  if (s.fold) { pc('body', 'Outer', rrect(W * 2 + 0.6, H, 0.6), 1, 'Skive the fold line and all edges to 0.6 mm.'); pc('pockets-in', 'Card pocket', rect(W - 0.6, 5.2), 6, 'Three each side, stepped 1 cm; T-shaped or straight.'); pc('lining', 'Note compartment lining', rect(W * 2, H - 0.8), 1, ''); return out; }
  if (s.cards) { pc('body', 'Back and front', rrect(W, H, 0.5), 2, ''); pc('pockets-in', 'Pocket', rect(W, H - 2), 2, 'One each side; a centre slot is left between.'); return out; }
  if (s.holster) { pc('body', 'Front (moulded)', rrect(W + 3, H, 2.5), 1, 'Wet-moulded over the form, 3 to 3.5 mm vegetable-tanned leather; stitch line 6 mm from the form.'); pc('body', 'Back', rrect(W + 3, H, 2.5), 1, 'Two belt slots 4 x 0.8 cm.', { holes: [[[1, H * 0.35], [1.8, H * 0.35], [1.8, H * 0.35 + 4.2], [1, H * 0.35 + 4.2]], [[W + 1.2, H * 0.35], [W + 2, H * 0.35], [W + 2, H * 0.35 + 4.2], [W + 1.2, H * 0.35 + 4.2]]] }); return out; }
  const fl = s.flare || 0; const top = W * (1 + fl); const bot = W * (1 - fl * 0.2);
  if (s.barrel) { pc('body', 'Body (wraps round)', rect(W + 2 * SA, Math.PI * D + 2 * SA), 1, `The zip is set across the middle of this piece, ${r1(W - 6)} cm long.`); const c = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; c.push([Math.cos(a) * (D / 2 + SA), Math.sin(a) * (D / 2 + SA)]); } pc('gusset', 'End panel (circle)', c, 2, 'Notch the quarters to match the body.'); } else {
    pc('body', 'Front / back panel', s.shape === 'rounded' || s.shape === 'crescent' ? rrect(W + 2 * SA, H + 2 * SA, Math.min(W, H) * 0.22) : [[(top - bot) / 2, 0], [(top - bot) / 2 + bot + 2 * SA, 0], [top + 2 * SA, H + 2 * SA], [0, H + 2 * SA]], 2, `${SA} cm seam allowance included.${s.quiltStyle !== 'none' ? ` Quilt (${s.quiltStyle}, 2.5 cm) on 3 mm foam before cutting to size.` : ''}`);
    if (D > 3) { if (s.base === 'structured' || s.shape === 'rectangle' || s.shape === 'trapezoid') { pc('gusset', 'Side gusset', [[0, 0], [D + 2 * SA, 0], [D * (s.closure === 'zip' ? 0.35 : 1) + 2 * SA + (D * (s.closure === 'zip' ? 0.325 : 0)), H + 2 * SA], [D * (s.closure === 'zip' ? 0.325 : 0), H + 2 * SA]], 2, s.closure === 'zip' ? 'Tapers to the zip at the top.' : ''); pc('base', 'Base', rrect(bot + 2 * SA, D + 2 * SA, 1), 1, s.base === 'structured' ? 'Backed with a 2 mm base board, 5 mm smaller all round.' : ''); } else pc('gusset', 'Gusset (one strip, sides and base)', rect(D + 2 * SA, 2 * H + W + 2 * SA), 1, 'Runs down one side, across the bottom and up the other.'); }
  }
  if (s.flap) pc('flap', 'Flap', s.flapShape === 'point' ? [[0, 0], [W, 0], [W, H * s.flap * 0.45], [W / 2, H * s.flap + 1], [0, H * s.flap * 0.45]] : rrect(W + (s.base === 'structured' ? 0 : 1), H * s.flap + D + 2, s.flapShape === 'curve' ? Math.min(W / 2 - 0.2, H * s.flap * 0.7) : 2), 2, 'Outside and lining; includes the part that crosses the top of the bag.');
  const hw = s.handleStyle === 'rolled' ? 3.6 : s.handleStyle === 'webbing' ? 3.8 : 2.5;
  if (s.handles === 'top-handles' || s.handles === 'shoulder-straps') { const len = (s.wrap || s.strapsDown ? 2 * H + (s.wrap ? D : 0) : 0) + 2 * s.drop + W * 0.4 + 6; pc('handle', s.handleStyle === 'rolled' ? 'Handle (rolled round a cord)' : 'Handle strap', rect(len, s.handleStyle === 'rolled' ? hw : hw * 2), s.oneHandle ? 1 : 2, s.handleStyle === 'rolled' ? 'Rolled round a 8 mm cotton cord and stitched; flat ends 5 cm for the tabs.' : 'Folded edge to edge and stitched both sides.'); }
  if (s.handles === 'crossbody' || s.extraStrap) pc('handle', 'Shoulder strap (adjustable)', rect(130, hw * 2), 1, 'Finished 110 to 130 cm with a slide adjuster and two trigger hooks.');
  if (s.handles === 'backpack' && !s.cordStraps) { pc('handle', 'Shoulder strap (padded part)', [[0, 0], [6.5, 0], [5, 44], [1.5, 44]], 4, 'Outside and lining round 8 mm foam; S-curved.'); pc('handle', 'Strap webbing', rect(45, 2.5), 2, 'Through a ladder-lock adjuster at the bottom corner.'); pc('handle', 'Grab handle', rect(22, 5), 1, ''); }
  if (s.handles === 'waist-belt') pc('handle', 'Belt webbing', rect(120, 3.8), 1, 'With a side-release buckle and slide.');
  if (bagParts(s).some((p) => p.id === 'tab')) pc('tab', 'Handle tab', [[0, 0], [3.2, 0], [3.2, 7], [1.6, 8.2], [0, 7]], s.handles === 'crossbody' || s.handles === 'chain' || s.oneHandle ? 2 : 4, 'Folded through the ring; two rivets or a box stitch.');
  if (s.pockets === 'front-zip' || s.pockets === 'front-slip') pc('pocket', 'Front pocket', rrect(W * 0.72, H * 0.5, 1.5), 1, s.pockets === 'front-zip' ? `With a ${r1(W * 0.6)} cm zip.` : 'Top edge turned and stitched.');
  if (s.pockets === 'side') pc('pocket', 'Side pocket', rect(D + 4, H * 0.5), 2, 'Elastic in the top hem.');
  if (s.piping === 'piped') pc('piping', 'Piping strip (bias)', rect((W + H) * 4 + 10, 3), 1, 'Wrapped round 3 mm piping cord.');
  if (o?.lining !== 'unlined') { pc('lining', 'Lining: front / back', rect(W + 2 * SA, H + 2 * SA - 1), 2, 'With an inside zip pocket and a slip pocket.'); if (D > 3) pc('lining', 'Lining: gusset and base', rect(D + 2 * SA, 2 * H + W), 1, ''); }
  if (s.base === 'structured') out.push({ name: 'Base board', points: rect(W - 1, Math.max(1, D - 1)).map(([a, b]) => [r1(a), r1(b)]), fabric: 'interfacing-stiffener', cut: 1, note: '2 mm board or polyethylene sheet.', part: 'board' });
  return out;
}

/** The tombstone outline of a backpack panel (cm), the same curve the 3D body is built on. */
function tomb(w, h, rb, ht) {
  const p = []; const n = 2.7;
  p.push([rb, 0], [w - rb, 0]); for (let i = 1; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2); p.push([w - rb + Math.cos(a) * rb, rb + Math.sin(a) * rb]); }
  for (let i = 0; i <= 12; i++) { const t = (i / 12) * Math.PI; const c = Math.cos(t); const sn = Math.sin(t); p.push([w / 2 + (w / 2) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n), h - ht + ht * Math.pow(sn, 2 / n)]); }
  for (let i = 0; i <= 6; i++) { const a = Math.PI + (i / 6) * (Math.PI / 2); p.push([rb + Math.cos(a) * rb, rb + Math.sin(a) * rb]); }
  return p;
}
function packPieces(s, W, H, D, SA, pc, rect, o, rrect) {
  const rb = Math.min(4.5, W * 0.15); const ht = Math.min(H * 0.38, W * 0.52); const per = 2 * (H - ht) + (W - 2 * rb) + Math.PI * rb + 0.5 * Math.PI * (W / 2 + ht);
  const zipLen = Math.round(per * 0.62); const yZip = H * 0.34;
  pc('body', 'Front panel', tomb(W + 2 * SA, H + 2 * SA, rb, ht), 1, `${SA} cm seam allowance. Front pocket placement and logo marked.`);
  pc('back', 'Back panel (outer, 3D air mesh)', tomb(W + 2 * SA, H + 2 * SA, rb, ht), 1, 'Quilted down the spine channel; edge bound.');
  pc('back', 'Back panel foam pad', rect(W / 2 - 2.5, H * 0.66), 2, '10 mm closed-cell EVA, left and right of a 5 cm spine channel.');
  pc('back', 'Lumbar pad foam', rect(W - 6, H * 0.18), 1, '6 mm EVA, low on the back panel.');
  const ruck = s.style === 'rucksack';
  if (ruck) { pc('throat', 'Throat (extension collar)', rect(2 * W + 2 * D + 2 * SA, 15), 1, 'Drawcord channel folded at the top edge, two 10 mm eyelets at the front.'); pc('flap', 'Lid (outer and lining)', rrect(W + 2 * SA, H * (s.flap || 0.42) + D + 16, 3), 2, 'Bound edge; sewn along the top of the back panel.'); pc('webbing', 'Lid strap webbing 20 mm', rect(30, 2), 2, ''); pc('webbing', 'Lid buckle tab webbing 20 mm', rect(10, 2), 2, ''); }
  else pc('body', 'Zip panel (two strips)', rect(zipLen + 2 * SA, (D * 0.58) / 2 + 1.5), 2, `A ${zipLen} cm two-way No. 8 coil zip is set between the two strips; zip garages at each end.`);
  pc('gusset', ruck ? 'Side gusset (base to top edge)' : 'Side gusset', rect(D + 2 * SA, (ruck ? H : yZip) + 2 * SA), 2, 'Bottle-pocket and compression-strap tabs sewn into its edges.');
  pc('base', 'Base', rect(W * 2 - 2 * rb + Math.PI * rb + 2 * SA, D + 2 * SA), 2, 'Two layers; the shoulder-strap anchor tabs are caught in the back seam at each corner.');
  pc('base', 'Anchor reinforcement triangle', [[0, 0], [7, 0], [0, 7]], 2, 'Folded twice round the 25 mm anchor webbing, bar-tacked.');
  pc('handle', 'Shoulder strap shell', [[0, 0], [7.2, 0], [6.6, 14], [5.2, 30], [4.6, 44], [0.8, 44], [0.2, 30], [0.6, 14]], 2, 'S-curve: the left and right straps are mirror images.');
  pc('back', 'Shoulder strap underside (air mesh)', [[0, 0], [7.2, 0], [6.6, 14], [5.2, 30], [4.6, 44], [0.8, 44], [0.2, 30], [0.6, 14]], 2, '');
  pc('handle', 'Shoulder strap foam', [[0.5, 0], [6.7, 0], [6.1, 14], [4.7, 30], [4.1, 43], [1.3, 43], [0.7, 30], [1.1, 14]], 2, '10 mm EVA, 1 cm in from the edge so the binding has room.');
  pc('body', 'Yoke (strap reinforcement)', [[0, 0], [15, 0], [11, 7.5], [4, 7.5]], 1, 'Over the strap tops and the haul loop; box-stitched.');
  if (ruck && s.pockets !== 'none') { pc('pocket', 'Side pocket front', rect(D * 0.8 + 2 * SA, H * 0.42 + 2 * SA), 2, ''); pc('pocket', 'Side pocket bellows gusset', rect(H * 0.84 + D * 0.8 + 2 * SA, 3.4 + 2 * SA), 2, ''); pc('pocket', 'Side pocket flap', rrect(D * 0.84 + 2 * SA, 8, 1.5), 4, 'Outer and lining.'); }
  else if (s.pockets !== 'none') { pc('pocket', 'Front pocket panel', tomb(W * 0.74 + 2 * SA, H * 0.5 + 2 * SA, Math.min(3, rb), Math.min(H * 0.5 * 0.42, W * 0.37)), 1, ''); pc('pocket', 'Front pocket gusset', rect(Math.round(per * 0.62), 3 + 2 * SA), 1, `With a ${Math.round(per * 0.42)} cm No. 5 coil zip over the top.`); }
  if (s.bottle && !ruck) pc('mesh', 'Bottle pocket (stretch mesh)', rect(D + 6, H * 0.42 + 2 * SA), 2, 'Gathered into the base seam; 15 mm elastic bound into the top edge.');
  const web = [['Shoulder strap adjusting webbing 25 mm', 2, 70], ['Anchor tab webbing 25 mm', 2, 10], ['Haul loop webbing 25 mm', 1, 22]];
  if (s.sternum) web.push(['Sternum strap webbing 20 mm', 2, 16]);
  if (s.compress && !ruck) web.push(['Compression strap webbing 20 mm', 2, D + 18]);
  if (s.lifters) web.push(['Load lifter webbing 20 mm', 2, 30]);
  for (const [n, c, l] of web) pc('webbing', n, rect(l, /20 mm/.test(n) ? 2 : 2.5), c, 'Ends heat-sealed; folded end on every tail.');
  pc('piping', 'Binding tape 25 mm', rect(Math.round(per * 2 + 2 * 50 * 2 + 40), 2.5), 1, 'Every inside seam, both edges of each shoulder strap, the back-panel edge.');
  if (o?.lining !== 'unlined') { pc('lining', 'Lining: front and back', tomb(W + 2 * SA, H + 2 * SA, rb, ht), 2, ''); if (!ruck) pc('lining', 'Laptop sleeve (padded)', rect(W - 4, H * 0.82), 2, '6 mm foam between; hook-and-loop or elastic closure.'); }
  return [];
}

export function bagVolumeL(s) { const w = s.width - 1; const h = s.height - 1; const d = s.depth - 0.6; const k = { rectangle: 1, rounded: 0.9, trapezoid: 0.85, crescent: 0.62 }[s.shape] ?? 1; return Math.max(0, (s.barrel ? Math.PI * (d / 2) * (h / 2) * w : s.shape === 'cylinder' ? Math.PI * (w / 2) * (d / 2) * h : w * h * d * k * (s.base === 'soft' ? 0.9 : 1)) / 1000); }

export function bagSheet(s, fabricName, o) {
  const hwN = []; const n = s.oneHandle ? 2 : 4;
  if (s.attach === 'rings' && (s.handles === 'top-handles' || s.handles === 'shoulder-straps')) hwN.push(`${n} rings (D or rectangular, 25 mm)`);
  if (s.handles === 'crossbody' || s.extraStrap) hwN.push('2 D-rings 20 mm, 2 trigger snap hooks, 1 slide adjuster');
  if (s.handles === 'chain') hwN.push('110 cm curb chain, 2 jump rings, 2 eyelets or D-rings');
  if (s.pack) { hwN.push('2 ladder-lock adjusters 25 mm (shoulder straps)'); if (s.sternum) hwN.push('1 side-release buckle 20 mm and 2 sternum sliders on rails'); if (s.compress && s.style !== 'rucksack') hwN.push('2 side-release buckles 20 mm (compression)'); if (s.lifters) hwN.push('2 ladder-locks 20 mm (load lifters)'); if (s.style === 'rucksack') hwN.push(`2 side-release buckles 20 mm (lid straps); 1 cord lock, 2 eyelets 10 mm, 130 cm drawcord 4 mm${s.pockets !== 'none' ? '; 2 side-release buckles 16 mm (side pocket flaps)' : ''}`); else hwN.push(`1 two-way No. 8 coil zip with 2 sliders and cord pullers${s.pockets !== 'none' ? '; 1 No. 5 coil zip with 1 slider (front pocket)' : ''}`); }
  else if (s.handles === 'backpack' && !s.cordStraps) hwN.push('2 ladder-lock adjusters 25 mm');
  if (s.handles === 'waist-belt') hwN.push('1 side-release buckle 38 mm, 1 slide');
  if (s.closure === 'zip' && !s.pack) hwN.push(`1 zip No. 5, ${r1(s.width - (s.barrel ? 6 : 2))} cm, ${s.barrel || s.archZip ? 'two sliders' : 'one slider'}`);
  if (s.closure === 'magnetic-snap' || s.closure === 'flap-magnet') hwN.push('1 magnetic snap 18 mm with backing plates');
  if (s.closure === 'turn-lock') hwN.push('1 turn lock with eyelet plate');
  if (s.closure === 'flap-buckle') hwN.push('2 roller buckles 20 mm (or 2 concealed push locks)');
  if (s.closure === 'frame-clasp') hwN.push(`1 kiss-lock frame ${r1(s.width - 2)} cm`);
  if (s.closure === 'drawstring' && !s.pack) hwN.push('8 to 12 eyelets 10 mm, 120 cm cord, 1 cord stop');
  if (s.feet) hwN.push('4 or 5 base studs 12 mm');
  if (!s.pack && (s.attach === 'rivets' || s.attach === 'rings' || s.attach === 'stitched-tabs')) hwN.push(`${n * 2} double-cap rivets 9 mm`);
  return [
    ['Style', s.name], ['Size', `${s.width} x ${s.height} x ${s.depth} cm (W x H x D) · about ${bagVolumeL(s).toFixed(1)} litres`],
    ['Outer', fabricName], ['Construction', `${s.base === 'structured' ? 'Structured: panels backed with bag stiffener, base board' : 'Soft: unstiffened or foam-backed panels'} · seams: ${s.piping}`],
    ['Handles', s.handles === 'none' ? 'none' : `${s.handles}, ${s.handleStyle}, ${s.drop ? `${s.drop} cm drop, ` : ''}attached by ${s.attach}`],
    ['Closure', s.closure], ['Lining', o?.lining || 'cotton-twill'], ['Hardware', `${s.pack ? (s.style === 'rucksack' ? 'moulded acetal (buckles, ladder-locks, cord lock), eyelets in ' : 'moulded acetal (buckles, ladder-locks, sliders), zip sliders in ') + s.hardware : s.hardware}: ${hwN.join('; ') || 'none'}`],
    ['Thread and edges', 'Bonded nylon Tex 135 (No. 20) for leather at 3 stitches per cm, Tex 70 for fabric; leather edges bevelled, sanded and painted in 2 to 3 coats or turned'],
    ['Order of work', s.pack ? 'Cut → make the shoulder straps (shell, foam, mesh, bind the edges, ladder-lock tab bar-tacked) → make anchor triangles and webbing tabs → front pocket and bottle pockets onto their panels → set the main zip between the zip-panel strips, garages on → join zip panel, gussets and base into one strip (tabs caught in the seams) → sew the strip to the front panel → quilt and pad the back panel, sew the strap tops and haul loop on under the yoke → sew the strip to the back panel → bind every inside seam → sternum strap and buckles → inspection' : 'Cut and skive → prepare pockets and lining → make handles and tabs → attach hardware to panels on the flat → close gussets to panels (piping or binding in the seam) → set base → drop in lining and close the top edge / zip → edge finish → final inspection'],
  ];
}

export function buildBag(o, prefix = '', fabric = 'canvas') {
  const s = bagSpec({ ...o, __fabric: fabric }); const parts = bagParts(s);
  const col = (k) => (o[k] && o[k] !== '#000001' ? o[k] : null);
  const spec = { kind: 'bag', ...s, fabric, color: o.color && o.color !== '#000000' ? o.color : null, parts, liningColor: o.liningColor, stitchColor: col('stitchColor'), edgeColor: col('edgeColor') };
  return { panels: [], seams: [], trims: [], overlays: [], bags: [spec], pieces: bagPieces(s, fabric, o), colliders: [], display: { avatar: false }, meta: { sheet: bagSheet(s, fabric, o), base: s.base } };
}
