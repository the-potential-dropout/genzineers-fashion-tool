// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Pockets: every common construction, outside and inside the garment.
 * Each type drafts its pieces (bag, welts, flap) relative to the placement
 * point (top centre of the pocket opening), in cm, y up.
 */
const R = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const rot = (pts, deg) => { const a = (deg * Math.PI) / 180; const c = Math.cos(a); const s = Math.sin(a); return pts.map(([x, y]) => [x * c - y * s, x * s + y * c]); };

const P = (name, where, w, h, draft, note, uses, extra = {}) => ({ name, where, w, h, draft, note, uses, ...extra });

export const POCKETS = {
  // ----- outside: patch family -----
  patch: P('Patch pocket (square)', 'outside', 13, 14, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, 0) }], 'Sewn on top; topstitched on three sides, bar-tacked at the corners.', 'Shirts, casual jackets, chore coats, aprons'),
  'patch-rounded': P('Patch pocket (rounded)', 'outside', 13, 14, (w, h) => [{ kind: 'pocket', style: 'patch', pts: [[-w / 2, 0], [-w / 2, -h + 2.5], [-w / 2 + 0.8, -h + 0.8], [-w / 2 + 2.5, -h], [w / 2 - 2.5, -h], [w / 2 - 0.8, -h + 0.8], [w / 2, -h + 2.5], [w / 2, 0]] }], 'Rounded lower corners; the classic blazer and Oxford shirt pocket.', 'Blazers, sport coats, shirts'),
  'patch-pointed': P('Patch pocket (pointed / spade)', 'outside', 12, 14, (w, h) => [{ kind: 'pocket', style: 'patch', pts: [[-w / 2, 0], [-w / 2, -h + 3], [0, -h], [w / 2, -h + 3], [w / 2, 0]] }], 'Pointed bottom; western and work shirts.', 'Western shirts, work shirts'),
  'patch-flap': P('Patch pocket with flap', 'outside', 14, 15, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, -1) }, { kind: 'flap', pts: [[-w / 2 - 0.4, 0.6], [w / 2 + 0.4, 0.6], [w / 2 + 0.4, -4.2], [0, -5.4], [-w / 2 - 0.4, -4.2]] }], 'Flap closes over the opening; button or snap.', 'Safari and field jackets, overshirts', { closure: [0, -3.6] }),
  'patch-pleated': P('Box-pleat patch pocket', 'outside', 14, 15, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, -1) }, { kind: 'pleat', pts: R(-1.4, -h, 1.4, -1) }, { kind: 'flap', pts: [[-w / 2 - 0.4, 0.6], [w / 2 + 0.4, 0.6], [w / 2 + 0.4, -4.4], [-w / 2 - 0.4, -4.4]] }], 'Centre box pleat gives volume without a gusset.', 'Military shirts, utility jackets', { closure: [0, -3] }),
  bellows: P('Bellows / cargo pocket', 'outside', 17, 19, (w, h) => [{ kind: 'pocket', style: 'bellows', pts: R(-w / 2, -h, w / 2, -1) }, { kind: 'pleat', pts: R(-w / 2 + 1.2, -h, -w / 2 + 2, -1) }, { kind: 'pleat', pts: R(w / 2 - 2, -h, w / 2 - 1.2, -1) }, { kind: 'flap', pts: R(-w / 2 - 0.5, -5, w / 2 + 0.5, 0.6) }], 'Gusseted sides expand to hold bulky items.', 'Cargo trousers, field jackets, workwear', { closure: [0, -3.4] }),
  kangaroo: P('Kangaroo / pouch pocket', 'outside', 34, 18, (w, h) => [{ kind: 'pocket', style: 'kangaroo', pts: [[-w / 2, -h], [w / 2, -h], [w / 2, -h * 0.45], [w / 2 - 6, 0], [-w / 2 + 6, 0], [-w / 2, -h * 0.45]] }], 'One pouch entered from both sides.', 'Hoodies, anoraks, sweatshirts'),
  // ----- outside: set-in (cut into the garment) -----
  'welt-single': P('Single welt pocket', 'outside', 13, 1.2, (w, h) => [{ kind: 'pocket', style: 'welt', pts: R(-w / 2, -h, w / 2, 0) }], 'A slit finished with one folded welt; the pocket bag hangs inside.', 'Trouser back pockets, waistcoats, coats'),
  'welt-double': P('Double welt (jetted) pocket', 'outside', 14.5, 1.3, (w, h) => [{ kind: 'pocket', style: 'welt', pts: R(-w / 2, -h, w / 2, -h / 2 - 0.05) }, { kind: 'pocket', style: 'welt', pts: R(-w / 2, -h / 2 + 0.05, w / 2, 0) }], 'Two narrow welts (jets) meeting edge to edge; the dressiest pocket.', 'Dinner jackets, suit jackets, tailored trousers'),
  'welt-flap': P('Flap pocket (jetted with flap)', 'outside', 15.5, 5.5, (w, h) => [{ kind: 'pocket', style: 'welt', pts: R(-w / 2, -0.6, w / 2, 0) }, { kind: 'flap', pts: [[-w / 2, -0.3], [w / 2, -0.3], [w / 2, -h + 0.8], [w / 2 - 0.8, -h], [-w / 2 + 0.8, -h], [-w / 2, -h + 0.8]] }], 'Jetted opening covered by a flap that can be tucked in.', 'Suit jackets, blazers, overcoats'),
  ticket: P('Ticket pocket', 'outside', 10, 4.5, (w, h) => [{ kind: 'pocket', style: 'welt', pts: R(-w / 2, -0.6, w / 2, 0) }, { kind: 'flap', pts: R(-w / 2, -h, w / 2, -0.3) }], 'Small extra pocket above the right hip pocket.', 'British-style suit jackets'),
  'breast-welt': P('Breast welt (barchetta)', 'outside', 10.5, 2.4, (w, h) => [{ kind: 'pocket', style: 'welt', pts: rot([[-w / 2, -h], [-w * 0.2, -h - 0.35], [w * 0.2, -h - 0.35], [w / 2, -h], [w / 2, 0], [w * 0.2, -0.35], [-w * 0.2, -0.35], [-w / 2, 0]], 7) }], 'Angled, gently curved "little boat" welt on the left chest.', 'Suit jackets, blazers, overcoats'),
  'slant-welt': P('Slanted hand-warmer welt', 'outside', 16, 2.2, (w, h) => [{ kind: 'pocket', style: 'welt', pts: rot(R(-w / 2, -h, w / 2, 0), 68) }], 'Angled welt for a natural hand position.', 'Coats, bombers, Harringtons, gilets'),
  zip: P('Zip pocket', 'outside', 15, 1.4, (w, h) => [{ kind: 'pocket', style: 'welt', pts: R(-w / 2, -h, w / 2, 0) }], 'Opening closed by a zip; bag bonded or stitched behind.', 'Sportswear, shells, bags, cargo', { zip: true }),
  'zip-vertical': P('Vertical chest zip pocket (Napoleon)', 'outside', 1.4, 16, (w, h) => [{ kind: 'pocket', style: 'welt', pts: R(-w / 2, -h, w / 2, 0) }], 'Vertical zip beside the front placket, reachable without unzipping the jacket.', 'Shells, ski and mountain jackets', { zip: true, vertical: true }),
  'side-seam': P('Side-seam (in-seam) pocket', 'outside', 1, 16, (w, h) => [{ kind: 'pocket', style: 'welt', pts: R(-w / 2, -h, w / 2, 0) }], 'Hidden in the side seam; invisible when closed.', 'Dresses, skirts, joggers, coats'),
  // ----- outside: jeans -----
  'jeans-scoop': P('Jeans scoop (front) pocket', 'outside', 13, 9, (w, h) => [{ kind: 'pocket', style: 'scoop', pts: [[-w / 2, 0], [-w / 2 + 0.6, -h * 0.55], [-w * 0.12, -h * 0.95], [w / 2, -h], [w / 2, 0]] }], 'Curved opening with a facing; riveted at both ends.', 'Five-pocket jeans, chinos', { rivets: (w, h) => [[-w / 2 + 0.5, -0.4], [w / 2 - 0.5, -h + 0.5]] }),
  coin: P('Coin / watch pocket', 'outside', 7.5, 7, (w, h) => [{ kind: 'pocket', style: 'coin', pts: R(-w / 2, -h, w / 2, 0) }], 'The fifth pocket, set inside the right front pocket.', 'Five-pocket jeans', { rivets: (w, h) => [[-w / 2 + 0.4, -0.4], [w / 2 - 0.4, -0.4]] }),
  'jeans-back': P('Jeans back pocket (five-point)', 'outside', 15, 16, (w, h) => [{ kind: 'pocket', style: 'patch', pts: [[-w / 2, 0], [-w / 2 + 0.7, -h + 3], [0, -h], [w / 2 - 0.7, -h + 3], [w / 2, 0]] }], 'Tapered patch with a pointed base, usually carrying a signature (arcuate) stitch.', 'Jeans, denim jackets', { arcuate: true }),
  'hammer-loop': P('Hammer loop', 'outside', 12, 3, (w, h) => [{ kind: 'belt', style: 'loop', pts: R(-w / 2, -h, w / 2, 0) }], 'Bar-tacked loop on the outseam.', 'Carpenter jeans, work trousers'),
  'tool-pocket': P('Tool / ruler pocket', 'outside', 8, 22, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, 0) }], 'Narrow deep pocket on the thigh.', 'Carpenter jeans, workwear'),
  'sleeve-utility': P('Sleeve utility pocket (MA-1)', 'outside', 9, 12, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, 0) }, { kind: 'pocket', style: 'welt', pts: R(-w / 2 + 2, -h + 1, -w / 2 + 3, -1) }, { kind: 'pocket', style: 'welt', pts: R(-w / 2 + 4, -h + 1, -w / 2 + 5, -1) }], 'Zip pocket with pen slots on the upper arm.', 'Bomber and flight jackets', { zip: true }),
  // ----- inside -----
  'inside-breast': P('Inside breast pocket (jetted)', 'inside', 13.5, 1.2, (w, h) => [{ kind: 'pocket', style: 'welt', pts: R(-w / 2, -h, w / 2, 0) }], 'Jetted into the lining or facing, often with a button loop.', 'Suit jackets, blazers, coats', { bag: [14, 16] }),
  'inside-patch': P('Inside patch pocket', 'inside', 13, 15, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, 0) }], 'Patch sewn to the lining or the inside of an unlined garment.', 'Unlined jackets, overshirts, coats'),
  'inside-phone': P('Inside phone pocket', 'inside', 9.5, 17, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, 0) }], 'Sized for a phone, low on the left front.', 'Jackets, coats'),
  'inside-pen': P('Inside pen pocket', 'inside', 3.5, 14, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, 0) }], 'Narrow slot beside the breast pocket.', 'Suit jackets, workwear'),
  poacher: P("Poacher's / game pocket", 'inside', 30, 26, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, 0) }], 'Very large lower inside pocket.', 'Field coats, waxed jackets, parkas'),
  'security-zip': P('Inside security zip pocket', 'inside', 15, 1.3, (w, h) => [{ kind: 'pocket', style: 'welt', pts: R(-w / 2, -h, w / 2, 0) }], 'Zipped pocket hidden in the lining for passport and wallet.', 'Travel jackets, coats, bags', { zip: true, bag: [16, 18] }),
  'waistband-coin': P('Hidden waistband pocket', 'inside', 8, 6, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, 0) }], 'Small pocket inside the waistband for a key or card.', 'Running shorts, tailored trousers, leggings'),
  'media-port': P('Media pocket with cord port', 'inside', 10, 15, (w, h) => [{ kind: 'pocket', style: 'patch', pts: R(-w / 2, -h, w / 2, 0) }], 'Inside pocket with an eyelet to route earphone cable.', 'Sports and ski jackets'),
};

export const POCKET_CLOSURES = { none: 'Open', button: 'Button', snap: 'Snap', zip: 'Zip', velcro: 'Hook & loop (Velcro-type)', magnet: 'Hidden magnet' };

/** Overlays + trims for a pocket placed at [x, y] on a panel. */
export function draftPocket(type, at, { width, height, angle = 0, closure, mirror = false } = {}) {
  const def = POCKETS[type];
  if (!def) throw new Error(`unknown pocket "${type}"`);
  const w = width || def.w; const h = height || def.h;
  const place = (pts) => rot(mirror ? pts.map(([x, y]) => [-x, y]).reverse() : pts, angle).map(([x, y]) => [Math.round((x + at[0]) * 10) / 10, Math.round((y + at[1]) * 10) / 10]);
  const overlays = def.draft(w, h).map((pc) => ({ kind: pc.kind, style: pc.style, points: place(pc.pts) }));
  const trims = [];
  const pt = (q) => place([q, q, q])[0];
  const cl = closure || (def.closure ? 'button' : def.zip ? 'zip' : 'none');
  if (def.closure && cl !== 'none' && cl !== 'zip') trims.push({ type: cl === 'snap' ? 'snap' : cl === 'velcro' ? 'velcro' : cl === 'magnet' ? 'magnetic-snap' : 'button-4hole', at: pt(def.closure), size: cl === 'button' ? 15 : undefined });
  if (def.zip || cl === 'zip') { const a = def.vertical ? [0, -h] : [-w / 2, -h / 2]; const b = def.vertical ? [0, 0] : [w / 2, -h / 2]; trims.push({ type: 'zipper', at: pt(a), to: pt(b), zip: { type: 'coil', size: '#3', end: 'closed', slider: 'auto-lock', puller: 'standard' } }); }
  for (const r of def.rivets ? def.rivets(w, h) : []) trims.push({ type: 'rivet', at: pt(r) });
  const stitches = def.arcuate ? [place([[-w / 2 + 1, -h * 0.3], [-w * 0.2, -h * 0.5], [0, -h * 0.36], [w * 0.2, -h * 0.5], [w / 2 - 1, -h * 0.3]])] : [];
  return { overlays, trims, stitches, def, w, h };
}
