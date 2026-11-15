/**
 * Hats, described the way a hatter or cap factory makes them: a crown (cut-and-sewn gores, a
 * knitted tube, or a felt / straw body blocked over a wooden form), a bill or brim with its
 * stiffener, a sweatband, a band or closure, and the small parts (eyelets, top button, pom).
 * Each named part can take its own material and colour.
 *
 * kind: cap (gored crown + bill) | knit | block (blocked crown + brim) | bucket | beret | flat | visor
 */
const S = (name, kind, o) => ({ name, kind, H: 12, brim: 0, panels: 0, fabric: 'cotton-twill', taper: 0.1, top: 'round', brimSlope: 0, curl: [0, 0, 0], band: 'none', ...o });
export const HAT_STYLES = {
  // knitted
  'beanie': S('Beanie', 'knit', { H: 21, fabric: 'rib-knit-wool', why: '2x2 rib knitted in the round, crown shaped with four or six lines of decreases.' }),
  'cuffed-beanie': S('Cuffed beanie / tuque', 'knit', { H: 22, cuff: 7, fabric: 'rib-knit-wool' }),
  'slouch-beanie': S('Slouch beanie', 'knit', { H: 27, slouch: 1, fabric: 'rib-knit-wool' }),
  'watch-cap': S('Watch cap (fisherman)', 'knit', { H: 17, cuff: 6, fabric: 'rib-knit-wool', why: 'Short and close: the cuff sits above the ears.' }),
  // caps
  'baseball': S('Baseball cap (6-panel)', 'cap', { H: 16.5, brim: 7, panels: 6, structured: 0.5 }),
  'snapback': S('Snapback (structured, flat bill)', 'cap', { H: 17.5, brim: 7.5, panels: 6, structured: 1, flatBill: true }),
  'trucker': S('Trucker cap (foam front, mesh back)', 'cap', { H: 17.5, brim: 7, panels: 5, structured: 1, mesh: true }),
  'dad-cap': S('Dad cap (unstructured)', 'cap', { H: 15, brim: 7, panels: 6, structured: 0 }),
  'five-panel': S('5-panel camp cap', 'cap', { H: 14, brim: 6.5, panels: 5, structured: 0.2, flatBill: true, camp: true }),
  'fitted': S('Fitted cap (high crown)', 'cap', { H: 18, brim: 7.5, panels: 6, structured: 1, flatBill: true, fittedBack: true, fabric: 'wool-flannel' }),
  'cycling-cap': S('Cycling cap', 'cap', { H: 13, brim: 4.5, panels: 4, structured: 0, flipBill: true, fittedBack: true, fabric: 'cotton-poplin' }),
  // blocked felt and straw
  'fedora': S('Fedora', 'block', { H: 11.5, brim: 6.5, taper: 0.14, top: 'teardrop', brimSlope: 6, curl: [-0.6, 0.9, 0.25], band: 'grosgrain', fabric: 'wool-felt', why: 'Fur or wool felt body blocked with a pinched teardrop crown; snap brim, grosgrain band with a bow on the left.' }),
  'trilby': S('Trilby', 'block', { H: 11, brim: 4, taper: 0.17, top: 'teardrop', brimSlope: 14, curl: [-0.9, 1.6, 0.3], band: 'grosgrain', fabric: 'wool-felt' }),
  'panama': S('Panama hat', 'block', { H: 11, brim: 7, taper: 0.13, top: 'center-dent', brimSlope: 8, curl: [-0.3, 0.5, 0.2], band: 'grosgrain', fabric: 'straw', why: 'Hand-woven toquilla straw blocked and sized; black band.' }),
  'pork-pie': S('Pork pie', 'block', { H: 9, brim: 4.5, taper: 0.04, top: 'telescope', brimSlope: -4, curl: [1, 1, 1], band: 'grosgrain', fabric: 'wool-felt' }),
  'homburg': S('Homburg', 'block', { H: 12, brim: 5.5, taper: 0.1, top: 'center-dent', brimSlope: 0, curl: [1.2, 1.2, 1.6], band: 'grosgrain', fabric: 'wool-felt', bound: true }),
  'bowler': S('Bowler / derby', 'block', { H: 12, brim: 4.5, taper: 0.06, top: 'dome', brimSlope: 0, curl: [1, 1, 1.8], band: 'grosgrain', fabric: 'wool-felt', bound: true }),
  'top-hat': S('Top hat', 'block', { H: 15, brim: 5, taper: -0.05, top: 'flat', brimSlope: 0, curl: [0.3, 0.3, 1.8], band: 'grosgrain', fabric: 'wool-felt', bound: true }),
  'boater': S('Boater', 'block', { H: 8.5, brim: 7, taper: 0.0, top: 'flat', brimSlope: 0, curl: [0, 0, 0], band: 'grosgrain', fabric: 'straw', stiff: true }),
  'cowboy': S('Western / cowboy hat', 'block', { H: 12.5, brim: 10, taper: 0.1, top: 'cattleman', brimSlope: 4, curl: [-0.5, -0.3, 3.2], band: 'leather', fabric: 'wool-felt', why: 'Cattleman crease: a centre crease with a dent each side; brim rolled up at the sides.' }),
  'outback': S('Outback / safari hat', 'block', { H: 11, brim: 8, taper: 0.12, top: 'teardrop', brimSlope: 10, curl: [-0.8, -0.2, 1.2], band: 'leather', fabric: 'wool-felt', chin: true }),
  'cloche': S('Cloche', 'block', { H: 14, brim: 3.5, taper: 0.02, top: 'dome', brimSlope: 55, curl: [0, 0, 0], band: 'grosgrain', fabric: 'wool-felt', deep: true }),
  'sun-hat': S('Wide-brim sun hat', 'block', { H: 10.5, brim: 13, taper: 0.08, top: 'dome', brimSlope: 16, curl: [-0.6, -0.6, -0.6], band: 'grosgrain', fabric: 'straw', floppy: true }),
  // cut and sewn, soft
  'bucket': S('Bucket hat', 'bucket', { H: 9, brim: 6.5, taper: 0.1, brimSlope: 38, fabric: 'canvas', why: 'Two crown side pieces and an oval tip; the brim is stiffened only by rows of topstitching.' }),
  'boonie': S('Boonie / jungle hat', 'bucket', { H: 9, brim: 7, taper: 0.06, brimSlope: 24, fabric: 'cotton-ripstop', loops: true, chin: true }),
  'beret': S('Beret', 'beret', { H: 5, fabric: 'wool-felt', why: 'Knitted and felted wool, leather or self binding, the stalk (cabillou) at the centre.' }),
  'flat-cap': S('Flat cap', 'flat', { H: 9, brim: 5, panels: 1, fabric: 'tweed' }),
  'newsboy': S('Newsboy cap (8-panel)', 'flat', { H: 10.5, brim: 5, panels: 8, full: 1, fabric: 'tweed' }),
  'visor': S('Visor', 'visor', { H: 5.5, brim: 8, fabric: 'polyester-woven-stretch' }),
};

export const HAT_OPTIONS = {
  style: { label: 'Style', type: 'select', values: Object.keys(HAT_STYLES), default: 'cuffed-beanie' },
  height: { label: 'Crown height (cm, 0 = style default)', type: 'range', min: 0, max: 30, step: 0.5, default: 0 },
  brim: { label: 'Brim / bill length (cm, 0 = style default)', type: 'range', min: 0, max: 16, step: 0.5, default: 0 },
  stiffener: { label: 'Brim / bill insert', type: 'select', values: ['auto', 'polyethylene', 'cardboard', 'pvc', 'eva-foam', 'buckram', 'felt-wire', 'straw-sized', 'none'], default: 'auto' },
  billShape: { label: 'Bill shape (caps)', type: 'select', values: ['auto', 'curved', 'slight-curve', 'flat'], default: 'auto' },
  closure: { label: 'Back closure (caps)', type: 'select', values: ['strapback', 'snapback', 'velcro', 'leather-strap', 'fitted', 'elastic'], default: 'strapback' },
  topper: { label: 'Topper', type: 'select', values: ['auto', 'none', 'pompom', 'cap-button', 'stalk'], default: 'auto' },
  band: { label: 'Hat band', type: 'select', values: ['auto', 'none', 'grosgrain', 'leather', 'chain', 'rope', 'self'], default: 'auto' },
  bandColor: { label: 'Band colour', type: 'color', default: '#141414' },
  crease: { label: 'Crown shape (blocked hats)', type: 'select', values: ['auto', 'teardrop', 'center-dent', 'cattleman', 'telescope', 'dome', 'flat', 'diamond'], default: 'auto' },
  brimEdge: { label: 'Brim edge', type: 'select', values: ['auto', 'raw', 'bound', 'welted', 'rolled'], default: 'auto' },
  eyelets: { label: 'Eyelets', type: 'select', values: ['auto', 'embroidered', 'metal', 'none'], default: 'auto' },
  underbrim: { label: 'Under-bill colour', type: 'color', default: '#000001' },
  contrastFront: { label: 'Front panels colour (leave as is, or pick)', type: 'color', default: '#000001' },
  stitchColor: { label: 'Stitching colour', type: 'color', default: '#000001' },
  sweatband: { label: 'Sweatband', type: 'select', values: ['cotton-twill', 'leather', 'grosgrain', 'terry', 'moisture-wicking'], default: 'cotton-twill' },
  lining: { label: 'Lining', type: 'select', values: ['unlined', 'satin', 'cotton', 'mesh', 'fleece'], default: 'unlined' },
  wear: { label: 'How it is worn', type: 'select', values: ['level', 'tilted-back', 'low-on-brow', 'backwards', 'to-one-side'], default: 'level' },
  color: { label: 'Colour (leave as the material colour, or pick)', type: 'color', default: '#000000' },
};

const r1 = (v) => Math.round(v * 10) / 10;

export function hatSpec(o) {
  const st = HAT_STYLES[o.style] || HAT_STYLES['cuffed-beanie'];
  const s = { ...st, style: o.style };
  if (o.height > 0) s.H = o.height;
  if (o.brim > 0 && st.brim) s.brim = o.brim;
  if (o.crease && o.crease !== 'auto' && st.kind === 'block') s.top = o.crease;
  s.band = o.band && o.band !== 'auto' ? o.band : st.band;
  s.topper = o.topper && o.topper !== 'auto' ? o.topper : st.kind === 'cap' && st.panels >= 6 ? 'cap-button' : o.style === 'newsboy' ? 'cap-button' : st.kind === 'beret' ? 'stalk' : 'none';
  s.billShape = o.billShape && o.billShape !== 'auto' ? o.billShape : st.flatBill ? 'flat' : 'curved';
  s.stiffener = o.stiffener && o.stiffener !== 'auto' ? o.stiffener : st.kind === 'cap' || st.kind === 'visor' ? 'polyethylene' : st.kind === 'flat' ? 'cardboard' : st.kind === 'block' ? (st.fabric === 'straw' ? 'straw-sized' : 'felt-wire') : 'none';
  s.brimEdge = o.brimEdge && o.brimEdge !== 'auto' ? o.brimEdge : st.bound ? 'bound' : st.kind === 'block' ? (st.fabric === 'straw' ? 'rolled' : 'raw') : 'raw';
  s.eyelets = o.eyelets && o.eyelets !== 'auto' ? o.eyelets : st.kind === 'cap' && !st.camp ? 'embroidered' : st.kind === 'bucket' ? 'metal' : 'none';
  s.closure = st.fittedBack ? 'fitted' : o.closure || 'strapback';
  s.wear = o.wear || 'level';
  return s;
}

export function hatParts(s) {
  const P = []; const add = (id, name, fabric, note) => P.push({ id, name, fabric: fabric || null, note });
  add('crown', s.kind === 'knit' ? 'Knitted body' : s.kind === 'block' ? 'Body (blocked crown)' : 'Crown', null, '');
  if (s.kind === 'cap' && (s.mesh || s.panels >= 5)) add('front', s.mesh ? 'Front panel (foam backed)' : 'Front panels', s.mesh ? 'polyester-woven-stretch' : null, s.structured ? 'Fused to buckram so the front stands up.' : 'Unstructured: no buckram.');
  if (s.mesh) add('mesh', 'Mesh back panels', 'mesh', 'Polyester trucker mesh.');
  if (s.cuff) add('cuff', 'Cuff (turned up)', null, 'The same tube folded back on itself.');
  if (s.brim && (s.kind === 'cap' || s.kind === 'visor' || s.kind === 'flat')) { add('bill', 'Bill (top)', null, 'Covers the insert; 6 to 8 rows of stitching.'); add('underbill', 'Under-bill', null, 'Often a contrast colour (classic green or grey).'); }
  if (s.brim && (s.kind === 'block' || s.kind === 'bucket')) add('brim', 'Brim', null, s.kind === 'bucket' ? 'Two layers, rows of topstitching 6 mm apart.' : 'Flanged from the same body.');
  if (s.band && s.band !== 'none') add('band', 'Hat band', s.band === 'leather' ? 'leather-veg-thin' : s.band === 'grosgrain' ? 'silk-satin' : null, s.band === 'grosgrain' ? 'Grosgrain ribbon 38 mm, tailored bow on the wearer\'s left.' : '');
  if (s.brimEdge === 'bound') add('binding', 'Brim binding', 'silk-satin', 'Grosgrain 13 mm folded over the brim edge.');
  if (s.kind === 'cap' && s.closure !== 'fitted' && s.closure !== 'elastic') add('strap', 'Back strap', s.closure === 'leather-strap' ? 'leather-veg-thin' : null, '');
  if (s.topper === 'pompom') add('pom', 'Pom-pom', 'faux-fur-fox', 'Yarn or faux-fur pom, tied through the crown.');
  if (s.topper === 'cap-button' || s.topper === 'stalk') add('button', s.topper === 'stalk' ? 'Stalk' : 'Top button', null, 'Covered in the crown fabric.');
  if (s.kind !== 'knit') add('sweatband', 'Sweatband', 'cotton-twill', 'Stitched to the bottom edge of the crown and turned inside.');
  return P;
}

/** Flat pieces to cut (cm), from the head circumference. */
export function hatPieces(s, body, fabric) {
  const circ = (body?.head || 58) + (s.kind === 'knit' ? -6 : 1.2); const out = [];
  const fabOf = Object.fromEntries(hatParts(s).map((p) => [p.id, p.fabric || fabric]));
  const pc = (part, name, pts, cut, note) => out.push({ name, points: pts.map(([a, b]) => [r1(a), r1(b)]), fabric: fabOf[part] || fabric, cut, note, part });
  const gore = (w, h, pw = 0.8) => { const L = []; const R = []; for (let i = 0; i <= 14; i++) { const t = i / 14; const hw = (w / 2) * Math.pow(Math.cos(t * Math.PI / 2), pw); L.push([-hw, t * h]); R.push([hw, t * h]); } return [...L, ...R.reverse().slice(1)]; };
  const crescent = (w, len, curve = 0.32) => { const top = []; const bot = []; for (let i = 0; i <= 16; i++) { const t = i / 16; const x = -w / 2 + w * t; const k = 1 - Math.pow(2 * t - 1, 2); top.push([x, -w * curve * k]); bot.push([x, len * Math.pow(k, 0.55) + -w * curve * k * 0.15]); } return [...top, ...bot.reverse()]; };
  const strip = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]];
  const ring = (ri, ro, a0, a1, n = 18) => { const o1 = []; const o2 = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; o1.push([Math.cos(a) * ro, Math.sin(a) * ro]); o2.push([Math.cos(a) * ri, Math.sin(a) * ri]); } return [...o1, ...o2.reverse()]; };
  const Ri = circ / (2 * Math.PI);
  if (s.kind === 'cap') {
    const arc = s.H * 1.18; const n = s.panels === 5 ? 6 : s.panels || 6; const w = circ / n + 1.2;
    if (s.panels === 5) { pc(s.mesh ? 'front' : 'front', 'Front panel (one piece)', gore(w * 2 - 1.2, arc * 0.92, 0.55), 1, 'No centre seam: takes a patch or embroidery. Fuse to foam or buckram.'); pc(s.mesh ? 'mesh' : 'crown', 'Side / back panel', gore(w, arc), 4, '6 mm seam allowance included; seams are taped inside.'); } else { pc('front', 'Front panel', gore(w, arc), 2, 'Cut a mirrored pair. Fuse buckram for a structured front.'); pc('crown', 'Side panel', gore(w, arc), 2, 'Mirrored pair; one eyelet in the middle of each panel.'); pc('crown', 'Back panel', gore(w, arc), 2, s.closure === 'fitted' ? 'Mirrored pair.' : 'Mirrored pair; cut the arch for the closure 5.5 cm high across both.'); }
    pc('bill', 'Bill (top)', crescent(18.5, s.brim + 1), 1, '8 mm allowance on the outer edge.'); pc('underbill', 'Under-bill', crescent(18.5, s.brim + 1), 1, 'Same shape, mirrored.');
    out.push({ name: `Bill insert (${s.stiffener})`, points: crescent(17.5, s.brim).map(([a, b]) => [r1(a), r1(b)]), fabric: 'interfacing-stiffener', cut: 1, note: '2 mm polyethylene board; no allowance.', part: 'insert' });
    if (hatParts(s).some((p) => p.id === 'strap')) pc('strap', 'Back strap', strip(11, 4.4), 2, s.closure === 'snapback' ? 'Or a 7-post plastic snap strip.' : 'Folded in three; one side takes the buckle, the other the tip.');
    out.push({ name: 'Seam tape (inside)', points: strip(arc * (n / 2) * 2 + 6, 1.6).map(([a, b]) => [r1(a), r1(b)]), fabric: 'cotton-twill', cut: 1, note: 'Covers each crown seam inside.', part: 'tape' });
  } else if (s.kind === 'bucket') {
    const top = circ * (1 - s.taper); const d = 1;
    pc('crown', 'Crown side', [[0, 0], [circ / 2 + d, 0], [(circ + top) / 4 + (circ - top) / 4 * 0 + (top / 2 + d - (circ / 2 + d)) / 2 + (circ / 2 + d), s.H + d], [(circ / 2 + d - (top / 2 + d)) / 2, s.H + d]], 2, 'Two halves, seamed at the sides. Add two eyelets per side.');
    const tp = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; tp.push([Math.cos(a) * (top / (2 * Math.PI)) * 0.93, Math.sin(a) * (top / (2 * Math.PI)) * 1.07]); } pc('crown', 'Tip (top oval)', tp, 1, '');
    const sl = Math.cos((s.brimSlope * Math.PI) / 180); const Rb = Ri / Math.max(0.25, 1 - sl * 0.999 + 0.001) ; const ri = Math.max(Ri, Ri / Math.max(0.2, Math.sin((s.brimSlope * Math.PI) / 180) || 1)); const sweep = (circ / 2) / ri;
    pc('brim', 'Brim (half)', ring(ri, ri + s.brim + 1, Math.PI / 2 - sweep / 2, Math.PI / 2 + sweep / 2), 4, 'Two halves, top and under layer. Topstitch rows 6 mm apart after bagging out.'); void Rb;
  } else if (s.kind === 'block') {
    out.push({ name: `Body: ${s.fabric === 'straw' ? 'straw hood / capeline' : 'felt hood / capeline'} (blocked, not cut)`, points: ring(0.5, Ri + s.H * 0.9 + s.brim + 3, 0, Math.PI * 2, 40).map(([a, b]) => [r1(a), r1(b)]), fabric, cut: 1, note: `One ${s.fabric === 'straw' ? 'woven straw' : 'felt'} body at least ${r1((Ri + s.H * 0.9 + s.brim + 3) * 2)} cm across, steamed and pulled over the crown block, then flanged on the brim block and trimmed to ${s.brim} cm.`, part: 'crown' });
    if (s.band !== 'none') pc('band', 'Band', strip(circ + 3 + (s.band === 'grosgrain' ? 26 : 4), s.band === 'leather' ? 1.6 : 3.8), 1, s.band === 'grosgrain' ? 'Ribbon: once round the crown plus the bow (two loops and the knot).' : 'Joined with a keeper or buckle.');
    if (s.brimEdge === 'bound') pc('binding', 'Brim binding', strip((Ri + s.brim) * 2 * Math.PI + 3, 2.6), 1, 'Pressed in half, eased round the edge, stitched once.');
  } else if (s.kind === 'beret') {
    const Ro = Ri * 1.45; const circle = (r) => { const p = []; for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; p.push([Math.cos(a) * r, Math.sin(a) * r]); } return p; };
    pc('crown', 'Top (circle)', circle(Ro + 1), 1, ''); out.push({ name: 'Under piece (ring)', points: circle(Ro + 1).map(([a, b]) => [r1(a), r1(b)]), holes: [circle(Ri - 1).map(([a, b]) => [r1(a), r1(b)])], fabric, cut: 1, note: 'Head opening cut out; joined to the top round the outside.', part: 'crown' });
    pc('crown', 'Band / binding', strip(circ + 2, 3), 1, 'Bias strip or leather.');
  } else if (s.kind === 'flat') {
    if (s.panels >= 8) pc('crown', 'Crown gore', gore(circ * 1.35 / 8 + 1.2, Ri * 1.5 + 2, 1.1), 8, 'Eight gores meeting at the button.'); else { const p = []; for (let i = 0; i < 30; i++) { const a = (i / 30) * Math.PI * 2; p.push([Math.cos(a) * (Ri + 3.5), Math.sin(a) * (Ri * 1.25 + 4) + 2]); } pc('crown', 'Top', p, 1, 'One piece; the front is pulled down onto the bill and tacked.'); pc('crown', 'Side band', strip(circ + 2, 5.5), 1, ''); }
    pc('bill', 'Bill (top)', crescent(17, s.brim + 1, 0.2), 1, ''); pc('underbill', 'Under-bill', crescent(17, s.brim + 1, 0.2), 1, '');
    out.push({ name: `Bill insert (${s.stiffener})`, points: crescent(16, s.brim, 0.2).map(([a, b]) => [r1(a), r1(b)]), fabric: 'interfacing-stiffener', cut: 1, note: '', part: 'insert' });
  } else if (s.kind === 'visor') {
    pc('crown', 'Front band', strip(circ * 0.55, s.H * 2 + 1.5), 1, 'Folded double over foam.'); pc('bill', 'Bill (top)', crescent(18.5, s.brim + 1), 1, ''); pc('underbill', 'Under-bill', crescent(18.5, s.brim + 1), 1, '');
    out.push({ name: `Bill insert (${s.stiffener})`, points: crescent(17.5, s.brim).map(([a, b]) => [r1(a), r1(b)]), fabric: 'interfacing-stiffener', cut: 1, note: '', part: 'insert' });
  }
  if (s.kind !== 'knit') out.push({ name: 'Sweatband', points: strip(circ + 2, s.kind === 'block' ? 4.2 : 3.2).map(([a, b]) => [r1(a), r1(b)]), fabric: 'cotton-twill', cut: 1, note: s.kind === 'block' ? 'Leather or grosgrain with a reed; hand-stitched in, bow at the back.' : 'Folded and stitched to the crown edge, turned in.', part: 'sweatband' });
  return out;
}

export function hatSheet(s, body, fabricName, o) {
  const head = body?.head || 58; const rows = [
    ['Style', s.name], ['Head size', `${head} cm · US ${(head / 8 + 0.0).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} approx · ${head <= 55 ? 'S' : head <= 57 ? 'M' : head <= 59 ? 'L' : head <= 61 ? 'XL' : 'XXL'}`],
    ['Crown', `${r1(s.H)} cm high${s.kind === 'block' ? `, ${s.top} crown, blocked on a size ${head} block` : s.kind === 'cap' ? `, ${s.panels} panels, ${s.structured ? 'structured (buckram-backed front)' : 'unstructured'}` : ''}`],
  ];
  if (s.brim) rows.push([s.kind === 'cap' || s.kind === 'visor' || s.kind === 'flat' ? 'Bill' : 'Brim', `${r1(s.brim)} cm · insert: ${s.stiffener}${s.kind === 'cap' ? ` · ${s.billShape} · 6 to 8 rows of stitching` : ` · edge: ${s.brimEdge}`}`]);
  rows.push(['Material', fabricName]);
  if (s.kind === 'knit') { const g = 5.5; const st = Math.round(((head - 6) * g) / 10 / 4) * 4; rows.push(['Knitting', `Cast on ${st} stitches in 2x2 rib on 3.5 mm needles in the round (gauge ${g * 2} sts per 10 cm relaxed). Work ${r1(s.H + (s.cuff || 0) - 6)} cm, then decrease: (k2tog every ${Math.round(st / 8)} sts) every other round to ${Math.round(st / 8)} sts, draw the yarn through and fasten.${s.cuff ? ` Fold a ${s.cuff} cm cuff.` : ''}`]); }
  if (s.kind === 'cap') rows.push(['Closure', s.closure], ['Eyelets', s.eyelets], ['Inside', `${o?.sweatband || 'cotton-twill'} sweatband, taped seams${o?.lining && o.lining !== 'unlined' ? `, ${o.lining} lining` : ''}`]);
  if (s.kind === 'block') rows.push(['Band', s.band], ['Finish', 'Pounced (sanded) felt, stiffened with shellac or water-based sizing; brim cut, curled and set; sweatband and lining sewn in by hand']);
  rows.push(['Order of work', s.kind === 'cap' ? 'Cut → fuse front → embroider or patch on the flat → join panels, tape seams → eyelets → make and stitch the bill → attach bill and sweatband → closure → top button → steam on a form' : s.kind === 'block' ? 'Steam the body → block the crown → dry → flange and cut the brim → pounce → set the crease → sweatband, band and binding → final steam' : s.kind === 'knit' ? 'Knit → link or graft the crown → wash and block → attach pom or label' : 'Cut → sew crown → make brim / bill → join → sweatband → press']);
  return rows;
}

export function buildHat(o, prefix = '', fabric = 'rib-knit-wool') {
  const s = hatSpec(o); const body = o.__body; const parts = hatParts(s);
  const spec = { kind: 'hat', ...s, fabric, color: o.color && o.color !== '#000000' ? o.color : null, parts, bandColor: o.bandColor, underbrim: o.underbrim !== '#000001' ? o.underbrim : null, contrastFront: o.contrastFront !== '#000001' ? o.contrastFront : null, stitchColor: o.stitchColor !== '#000001' ? o.stitchColor : null, closureType: s.closure };
  return { panels: [], seams: [], trims: [], overlays: [], hats: [spec], pieces: body ? hatPieces(s, body, fabric) : [], colliders: [], meta: { sheet: body ? hatSheet(s, body, fabric, o) : [] } };
}
