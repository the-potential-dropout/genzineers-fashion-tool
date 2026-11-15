/**
 * What a factory needs beyond the pattern: shoulder pads, and the construction standard of a
 * garment (how it is interfaced, canvassed, lined, taped, finished, labelled, packed and
 * inspected). Presets are the industry's usual answer for each kind of garment; every field can
 * be changed. The choices flow into the cut list, bill of materials and tech pack.
 */
import { foldPlan, foldedSize } from './folding.js';

/** Shoulder pads. t = thickness at the shoulder point (cm), ext = how far it carries the shoulder past the bone (cm). */
export const SHOULDER_PADS = {
  none: { name: 'None (natural, unpadded)', t: 0, ext: 0, note: 'Shirts, knitwear, unstructured jackets.' },
  'spalla-camicia': { name: 'Shirt shoulder (spalla camicia)', t: 0, ext: 0, shirr: true, note: 'Neapolitan: no pad; the sleeve is eased in with small pleats like a shirt.' },
  natural: { name: 'Natural / soft (thin felt, 6 mm)', t: 0.6, ext: 0.3, note: 'Follows the body: soft tailoring, American sack jackets.' },
  structured: { name: 'Structured (12 mm)', t: 1.2, ext: 0.6, note: 'The classic business suit shoulder: clean and level.' },
  roped: { name: 'Roped (con rollino, 12 mm with a raised sleeve head)', t: 1.2, ext: 0.5, rope: 1.1, note: 'The sleeve head stands above the shoulder line on a roll of wadding.' },
  padded: { name: 'Strong / built-up (20 mm)', t: 2.0, ext: 1.0, note: 'British military and formal coats: squares the figure.' },
  power: { name: 'Power shoulder (30 mm, extended)', t: 3.0, ext: 2.6, note: '1980s and current oversized tailoring: wide and square.' },
  pagoda: { name: 'Pagoda (turned up at the end)', t: 1.4, ext: 1.2, lift: 1.3, note: 'The shoulder line dips then rises to the sleeve head.' },
  raglan: { name: 'Raglan pad (rounded cup)', t: 1.0, ext: 0, round: true, note: 'A cupped pad for raglan and dropped sleeves: rounds rather than squares.' },
  'knit-foam': { name: 'Soft foam (covered, for knits and blouses)', t: 0.9, ext: 0.4, note: 'Light covered foam, tacked or on hook-and-loop so it can come out for washing.' },
};

/** Capsules that hold the cloth up where the pad is (metres), and the pieces to cut. */
export function shoulderPadForms(type, body, halfShoulderCm) {
  const P = SHOULDER_PADS[type]; if (!P || (!P.t && !P.rope)) return { colliders: [], pieces: [] };
  const colliders = []; const xs = halfShoulderCm / 100; const yTip = body.armY + 0.05; const yIn = body.shoulderY - 0.012; const t = P.t / 100;
  for (const sd of [1, -1]) {
    if (P.t) { const r = 0.028; const ys = Math.max(0.3, (t + 0.012) / (2 * r)); const yc = (y0) => y0 + t - r * ys + 0.004;
      colliders.push({ a: [sd * Math.max(0.05, xs - 0.075), yc(yIn + (yTip - yIn) * 0.35) - t * 0.55, -0.012], b: [sd * (xs + P.ext / 100 + 0.004), yc(yTip) + (P.lift || 0) / 100, -0.012], r, zs: P.round ? 1.5 : 2.0, ys }); }
    if (P.rope) colliders.push({ a: [sd * (xs + 0.012), yTip + t + 0.002, -0.03], b: [sd * (xs + 0.012), yTip + t + 0.002, 0.012], r: 0.006 + P.rope / 100, zs: 1, ys: 1 });
  }
  const r1 = (v) => Math.round(v * 10) / 10; const L = 13 + P.ext; const D = 11;
  const crescent = (l, d) => { const o = []; for (let i = 0; i <= 14; i++) { const a = Math.PI * (i / 14); o.push([r1(-Math.cos(a) * l / 2), r1(Math.sin(a) * d)]); } for (let i = 13; i >= 1; i--) { const a = Math.PI * (i / 14); o.push([r1(-Math.cos(a) * l / 2), r1(-Math.sin(a) * d * 0.28)]); } return o; };
  const plies = Math.max(1, Math.round(P.t / 0.3)); const pieces = [];
  if (P.t) pieces.push({ name: `Shoulder pad (${P.name.split(' (')[0]})`, points: crescent(L + 2, D), fabric: 'interfacing-stiffener', cut: 2, part: 'pad', note: `One per shoulder, ${P.t * 10} mm at the sleeve edge tapering to nothing at the neck: ${plies} graduated plies of cotton wadding or felt between two covers${P.lift ? ', built up at the outer end' : ''}. Straight edge to the armhole, extending ${r1(1 + P.ext)} cm into the sleeve; tack to the shoulder seam and the armhole seam allowance.` });
  if (P.t) pieces.push({ name: 'Shoulder pad ply (largest; cut each next one 1.5 cm smaller)', points: crescent(L, D - 1), fabric: 'interfacing-stiffener', cut: plies * 2, part: 'pad', note: 'Wadding plies, stepped so the pad feathers out.' });
  if (P.rope || P.t >= 1.2) pieces.push({ name: 'Sleeve head roll', points: [[0, 0], [22, 0], [22, 4.5], [0, 4.5]], fabric: 'interfacing-stiffener', cut: 2, part: 'pad', note: `Bias strip of wadding and canvas sewn into the top of the armhole seam${P.rope ? `, doubled to lift the sleeve head ${P.rope} cm (the rope)` : ' to fill out the sleeve cap'}.` });
  return { colliders, pieces };
}

const C = (name, o) => ({ name, canvas: 'none', interfacing: [], interfacingType: 'woven fusible, 60 g/m²', lining: 'unlined', liningMaterial: 'none', pocketing: 'self fabric', tape: [], seamFinish: 'overlock 4-thread', hem: 'coverstitch, 2 cm', spi: 12, labels: 'neck', closureFinish: '', pressing: 'steam tunnel', packing: 'flat-fold, polybag', aql: '2.5', tolerance: 1.0, preShrink: 'fabric relaxed 24 h before cutting', extras: [], ...o });
export const CONSTRUCTION_PRESETS = {
  'tee-basic': C('T-shirt / jersey standard', { tape: ['back neck tape, shoulder to shoulder', 'shoulder seams (clear elastic or tape)'], hem: 'coverstitch twin needle, 2 cm', labels: 'neck print or woven label', extras: ['side seams or tubular body', '1x1 rib neck, cover-seamed'] }),
  sweats: C('Sweatshirt / fleece standard', { tape: ['back neck tape', 'shoulder seams'], seamFinish: 'overlock, with flatlock or coverstitch on top', hem: 'rib, 6 cm, double layer', interfacing: ['placket', 'pocket-mouth'], extras: ['drawcord with metal eyelets and tips', 'lined hood'] }),
  knitwear: C('Knitwear (fully fashioned)', { seamFinish: 'linked (loop to loop)', hem: 'rib, knitted on', spi: 0, tape: ['shoulder seams (stay tape)'], labels: 'neck, plus spare yarn card', pressing: 'steam and block to measurements', packing: 'flat-fold with tissue, polybag', extras: ['washed and tumbled to size', 'spare yarn supplied'] }),
  'shirt-casual': C('Casual shirt', { interfacing: ['collar', 'collar-stand', 'cuff', 'placket'], interfacingType: 'woven fusible, 80 g/m², top collar only', seamFinish: 'flat-felled side and armhole seams', hem: 'rolled shirt-tail hem, 6 mm', spi: 14, labels: 'yoke label, size at collar, care in side seam', pressing: 'pressed and folded on board', packing: 'folded on shirt board with collar support and clips, polybag', extras: ['split back yoke', 'gusset at side seams', 'spare button on placket'] }),
  'shirt-dress': C('Dress shirt', { interfacing: ['collar', 'collar-stand', 'cuff', 'placket'], interfacingType: 'woven fusible, 120 g/m² (collar), 80 g/m² (cuffs, placket)', seamFinish: 'single-needle felled seams', hem: 'rolled hem, 5 mm', spi: 18, labels: 'yoke label, size at collar, care in side seam', pressing: 'hand pressed', packing: 'folded on board, collar stays and support, tissue, box or polybag', extras: ['removable collar stays', 'mother-of-pearl buttons, shanked', 'split yoke', 'two spare buttons'] }),
  'tailored-fused': C('Tailored jacket, fused front', { canvas: 'fused', interfacing: ['front', 'lapel', 'collar', 'hem', 'sleeve-hem', 'pocket-mouth', 'vent', 'back-neck'], interfacingType: 'weft-insert fusible, 70-90 g/m²', lining: 'full', liningMaterial: 'viscose twill', pocketing: 'polycotton pocketing', tape: ['front edge', 'lapel roll line (bridle)', 'shoulder', 'armhole', 'pocket mouths'], seamFinish: 'pressed open, lined', hem: 'blind hem, 4 cm, interfaced', spi: 11, labels: 'inside chest pocket, size and care in pocket', pressing: 'form pressed, under-pressing at every stage', packing: 'hung, suit hanger, garment bag', extras: ['chest piece (felt and canvas)', 'sleeve head roll', 'inside chest and ticket pockets', 'working or false cuff buttons', 'lapel buttonhole', 'spare buttons'] }),
  'tailored-half-canvas': C('Tailored jacket, half canvas', { canvas: 'half-canvas', interfacing: ['skirt (below the chest)', 'hem', 'sleeve-hem', 'pocket-mouth', 'vent', 'back-neck'], interfacingType: 'light fusible below the canvas', lining: 'full', liningMaterial: 'cupro (Bemberg)', pocketing: 'cotton pocketing', tape: ['front edge', 'lapel roll line (bridle)', 'shoulder', 'armhole', 'pocket mouths'], seamFinish: 'pressed open, lined', hem: 'felled by hand or blind hem, 4 cm', spi: 11, labels: 'inside chest pocket, size and care in pocket', pressing: 'form pressed, hand finished', packing: 'hung, shaped hanger, garment bag', extras: ['floating hair-canvas chest and lapel, pad-stitched', 'felt under-collar', 'sleeve head roll', 'pick stitching', 'spare buttons'] }),
  'tailored-full-canvas': C('Tailored jacket, full canvas', { canvas: 'full-canvas', interfacing: ['hem', 'sleeve-hem', 'pocket-mouth'], interfacingType: 'linen or light fusible at hems only', lining: 'full', liningMaterial: 'cupro (Bemberg)', pocketing: 'cotton pocketing', tape: ['front edge (hand-felled linen tape)', 'lapel roll line (bridle, drawn in)', 'shoulder', 'armhole'], seamFinish: 'pressed open, lined', hem: 'felled by hand, 4 cm', spi: 10, labels: 'inside chest pocket, hand-sewn', pressing: 'hand pressed over a ham at every stage', packing: 'hung, shaped hanger, cloth garment bag', extras: ['full floating hair canvas, hand pad-stitched lapel and collar', 'hand-set collar and sleeves', 'hand-made buttonholes', 'working cuffs', 'felt under-collar, hand felled'] }),
  'trousers-tailored': C('Tailored trousers', { interfacing: ['waistband', 'fly', 'pocket-mouth'], interfacingType: 'waistband canvas and fusible', lining: 'half (to the knee, front)', liningMaterial: 'viscose or cupro', pocketing: 'cotton pocketing (silesia)', tape: ['pocket mouths', 'crotch seam (stay)'], seamFinish: 'overlocked and pressed open; seat seam left with inlay', hem: 'blind hem, 5 cm (left unfinished for alteration)', labels: 'inside waistband, care in pocket', pressing: 'crease pressed', packing: 'hung on clip hanger', extras: ['French bearer and inside button', 'split back waistband with 4 cm inlay', 'heel guard tape', 'curtain waistband lining', 'spare button'] }),
  'denim-5pocket': C('Five-pocket jeans', { interfacing: ['fly'], interfacingType: 'non-woven fusible on the fly', pocketing: 'cotton twill pocketing, 120 g/m²', seamFinish: 'felled inseam or outseam, safety stitch (516) on the other', hem: 'chain-stitched, 1.2 cm double turn', spi: 8, labels: 'leather or jacron patch on waistband, size tab, care in pocket bag', closureFinish: 'copper rivets at pocket corners, bar tacks at fly, belt loops and back pockets', pressing: 'wash, dry, press', packing: 'folded in three, size sticker, polybag', preShrink: 'sanforized, or rinse / enzyme / stone wash after sewing (allow 3-10% shrinkage in the pattern)', extras: ['coin pocket', 'back yoke', '5 or 7 belt loops', 'tack button and rivets set after washing'] }),
  outerwear: C('Coat / outerwear', { canvas: 'fused', interfacing: ['front', 'collar', 'hem', 'sleeve-hem', 'pocket-mouth', 'flaps', 'storm-flap', 'belt'], interfacingType: 'weft-insert fusible, 90-120 g/m²', lining: 'full', liningMaterial: 'viscose twill or quilted lining', pocketing: 'cotton flannel pocketing (warm hand)', tape: ['front edge', 'shoulder', 'armhole', 'pocket mouths', 'seams sealed (waterproof shells)'], seamFinish: 'pressed open and lined, or bound', hem: 'blind hem, 5 cm, lining jump pleat', spi: 10, labels: 'inside neck or facing, care in side seam', pressing: 'form pressed', packing: 'hung, garment bag', extras: ['hanging loop or chain', 'storm cuffs or inner rib', 'inside pocket', 'spare buttons'] }),
  'leather-jacket': C('Leather jacket', { interfacing: ['collar', 'front edge', 'hem', 'pocket-mouth', 'zip'], interfacingType: 'cold-fuse or sew-in tape (no steam on leather)', lining: 'full', liningMaterial: 'viscose twill or quilted', pocketing: 'cotton pocketing', tape: ['all stress seams (cold tape)', 'zip edges'], seamFinish: 'glued open and topstitched', hem: 'turned and glued, 3 cm', spi: 7, labels: 'inside neck, care: specialist leather clean', pressing: 'cold press or roller only', packing: 'hung, breathable bag (never plastic)', extras: ['edges skived', 'needle holes are permanent: no unpicking', 'hides matched for colour and grain'] }),
  'dress-lined': C('Lined dress', { interfacing: ['neckline facing', 'armhole facing', 'zip', 'waist-stay'], interfacingType: 'light woven fusible, 40 g/m²', lining: 'full', liningMaterial: 'viscose or stretch lining', tape: ['neckline', 'armholes', 'waist seam (stay tape)', 'zip'], seamFinish: 'overlocked and pressed open, or French seams on sheers', hem: 'blind hem, 3 cm; rolled hem on sheers', labels: 'centre back neck, care in side seam', pressing: 'steam, hand finished', packing: 'hung, garment bag', extras: ['invisible zip with hook and eye', 'hanger loops', 'lingerie strap keepers'] }),
  activewear: C('Activewear', { seamFinish: 'flatlock (607) or coverstitch, no raised seams', hem: 'coverstitch, 2 cm, or bonded', spi: 14, tape: ['elastic in waistband and leg openings', 'shoulder (clear elastic)'], labels: 'heat-transfer (no sewn label against the skin)', pressing: 'none (heat sensitive)', extras: ['gusset', 'bar tacks at stress points', 'stretch thread (woolly nylon) in loopers', 'reflective details'] }),
  lingerie: C('Lingerie', { seamFinish: 'narrow zigzag, flat seams, covered elastics', hem: 'picot or fold-over elastic', spi: 16, tape: ['elastics: plush-back, picot, fold-over', 'channelling for wires'], labels: 'printed or satin label, tagless option', pressing: 'none', packing: 'hanger or tissue fold', extras: ['cotton gusset lining', 'hook-and-eye tape, 2 or 3 rows', 'rings and sliders', 'power-mesh lining at wings'] }),
  'skirt-lined': C('Lined skirt', { interfacing: ['waistband', 'zip', 'vent'], lining: 'full', liningMaterial: 'viscose', tape: ['waist seam', 'zip'], seamFinish: 'overlocked and pressed open', hem: 'blind hem, 4 cm', labels: 'waistband, care in side seam', packing: 'hung on clip hanger', extras: ['invisible zip', 'hook and bar', 'hanger loops'] }),
};
export const CANVAS = { none: 'None', fused: 'Fused (fusible interlining on the whole front)', 'half-canvas': 'Half canvas (floating canvas in chest and lapel)', 'full-canvas': 'Full canvas (floating canvas to the hem)' };
export const LINING_TYPES = ['unlined', 'quarter (buggy back)', 'half', 'full', 'half (to the knee, front)'];
export const LINING_MATERIALS = ['none', 'cupro (Bemberg)', 'viscose twill', 'viscose', 'acetate satin', 'silk habotai', 'polyester taffeta', 'mesh', 'cotton lawn', 'quilted lining', 'stretch lining'];
export const SEAM_FINISHES = ['overlock 4-thread', 'overlock, with flatlock or coverstitch on top', 'flat-felled', 'single-needle felled seams', 'French seams', 'bound (Hong Kong) seams', 'pressed open, lined', 'pinked', 'flatlock (607) or coverstitch, no raised seams', 'linked (loop to loop)', 'glued open and topstitched'];
export const LABEL_SET = ['Brand label', 'Size label', 'Care and composition label (legally required)', 'Country of origin (legally required in most markets)', 'RN / CA / importer identity (USA, Canada)', 'Hangtag with barcode', 'Spare button / yarn bag'];

/** The preset that fits what is on the mannequin. */
export function suggestConstruction(project) {
  const gs = project.garments || []; const g = gs.find((x) => x.generator === 'top') || gs[0]; if (!g) return 'tee-basic';
  const o = g.options || {}; const fab = `${g.fabric || ''} ${project.panels?.[0]?.fabric || ''}`;
  if (g.generator === 'bottom') return /denim/.test(fab) ? 'denim-5pocket' : /fleece|terry|jersey/.test(fab) ? 'sweats' : 'trousers-tailored';
  if (g.generator === 'skirt') return 'skirt-lined';
  if (g.generator === 'bra' || g.generator === 'brief') return 'lingerie';
  if (g.generator !== 'top') return 'tee-basic';
  if (/leather|suede|shearling/.test(fab)) return 'leather-jacket';
  if (o.lapel && o.lapel !== 'none') return (o.length || 70) > 88 ? 'outerwear' : 'tailored-half-canvas';
  if (g.knit || /knit-|rib-knit|cashmere|merino/.test(fab)) return 'knitwear';
  if ((o.length || 70) > 95 && (!o.sleeve || o.sleeve === 'none' || /silk|crepe|chiffon|satin/.test(fab))) return 'dress-lined';
  if ((o.length || 70) > 88 || /gabardine|melton|ripstop|softshell|down/.test(fab) || (o.insulation && o.insulation !== 'none')) return 'outerwear';
  if (o.collar && /shirt|button|spread|point|cutaway|band/.test(o.collar)) return /poplin|broadcloth/.test(fab) ? 'shirt-dress' : 'shirt-casual';
  if (/fleece|french-terry|terry/.test(fab)) return 'sweats';
  if (/spandex|power|tricot|polyester-jersey|nylon/.test(fab)) return 'activewear';
  return 'tee-basic';
}

/** The construction standard in force: the chosen (or suggested) preset with the user's changes on top. */
export function constructionOf(project) {
  const c = project.construction || {}; const id = c.preset && CONSTRUCTION_PRESETS[c.preset] ? c.preset : suggestConstruction(project);
  return { preset: id, chosen: Boolean(c.preset), ...CONSTRUCTION_PRESETS[id], ...Object.fromEntries(Object.entries(c).filter(([k, v]) => k !== 'preset' && v !== undefined && v !== null)), labelSet: c.labelSet || LABEL_SET.slice(0, 6) };
}

const KIND_OF = { collar: /^collar/, 'collar-stand': /^collar/, cuff: /^cuff/, placket: /^placket/, waistband: /^waistband/, fly: /^fly/, lapel: /^lapel/, flaps: /^flap/, 'storm-flap': /storm/, belt: /^belt/ };
/** Interfacing pieces: a copy of every sewn-on piece the standard says is interfaced. */
export function interfacingPieces(project) {
  const c = constructionOf(project); const out = []; const seen = new Set();
  for (const part of c.interfacing) { const re = KIND_OF[part.split(' ')[0]]; if (!re) continue; for (const o of project.overlays || []) { if (!re.test(o.kind) || o.inside || seen.has(o.id)) continue; seen.add(o.id); out.push({ id: `if-${o.id}`, name: `Interfacing: ${o.kind}${o.style ? ` (${o.style})` : ''}`, points: o.points, qty: 1, panel: o.panel }); } }
  return out;
}

/** Bill-of-materials rows the construction standard adds. areaOf(points) gives cm². */
export function constructionBom(project, areaOf) {
  const c = constructionOf(project); const qty = project.production?.quantity || 1; const rows = []; const r2 = (v) => Math.round(v * 100) / 100;
  let ifA = 0; for (const p of interfacingPieces(project)) ifA += areaOf(p.points) * p.qty;
  const shell = (project.panels || []).reduce((a, p) => a + areaOf(p.points), 0);
  if (c.canvas === 'fused') ifA += shell * 0.34; if (/hem/.test(c.interfacing.join(' '))) ifA += shell * 0.05;
  if (ifA > 50) rows.push({ cat: 'Interfacing', item: c.interfacingType, spec: c.interfacing.join(', '), perUnit: `${r2((ifA / 1e4) * 1.15 / 0.9)} m @90cm`, total: `${r2((ifA / 1e4) * 1.15 / 0.9 * qty)} m`, note: 'Test the fuse on the shell first: temperature, pressure, time; check for strike-through and bubbling after a wash or dry-clean cycle' });
  if (c.canvas === 'half-canvas' || c.canvas === 'full-canvas') rows.push({ cat: 'Canvas', item: `Hair canvas, ${c.canvas === 'full-canvas' ? 'full front' : 'chest and lapel'}`, spec: 'wool / horsehair canvas, pre-shrunk; plus chest felt and linen collar canvas', perUnit: c.canvas === 'full-canvas' ? '0.9 m' : '0.5 m', total: `${r2((c.canvas === 'full-canvas' ? 0.9 : 0.5) * qty)} m`, note: 'Soak and press the canvas before cutting; body canvas on the straight grain, collar canvas on the bias' });
  if (c.lining !== 'unlined') { const f = /full/.test(c.lining) ? 0.95 : /half/.test(c.lining) ? 0.5 : 0.3; rows.push({ cat: 'Lining', item: c.liningMaterial, spec: `${c.lining} lining, cut from the shell pattern with a centre-back pleat and 2 cm ease`, perUnit: `${r2((shell * f / 1e4) * 1.15 / 1.4)} m @140cm`, total: `${r2((shell * f / 1e4) * 1.15 / 1.4 * qty)} m`, note: '' }); }
  const pk = (project.overlays || []).filter((o) => o.kind === 'pocket').length;
  if (c.pocketing && c.pocketing !== 'self fabric' && pk) rows.push({ cat: 'Pocketing', item: c.pocketing, spec: 'pocket bags', perUnit: `${r2(0.12 * pk)} m`, total: `${r2(0.12 * pk * qty)} m`, note: '' });
  if (c.tape.length) rows.push({ cat: 'Stay tape', item: 'Stay tape / clear elastic / bridle', spec: c.tape.join('; '), perUnit: `${r2(0.5 * c.tape.length)} m`, total: `${Math.ceil(0.5 * c.tape.length * qty)} m`, note: 'Stops necklines, shoulders and pocket mouths stretching out of shape' });
  const pg = (project.garments || []).find((x) => x.options?.shoulderPad && x.options.shoulderPad !== 'none' && (SHOULDER_PADS[x.options.shoulderPad]?.t || SHOULDER_PADS[x.options.shoulderPad]?.rope));
  if (pg) { const P = SHOULDER_PADS[pg.options.shoulderPad]; rows.push({ cat: 'Shoulder pads', item: P.name, spec: `pair${P.rope || P.t >= 1.2 ? ', plus a pair of sleeve head rolls' : ''}`, perUnit: '1 pair', total: `${qty} pairs`, note: P.note }); }
  rows.push({ cat: 'Labels', item: c.labelSet.join(' + '), spec: `placed: ${c.labels}`, perUnit: c.labelSet.length, total: qty * c.labelSet.length, note: 'Care label: fibre content by percentage, care symbols (ISO 3758 / ASTM D5489), country of origin, importer identity' });
  rows.push({ cat: 'Packing', item: c.packing, spec: `pressing: ${c.pressing}`, perUnit: 1, total: qty, note: 'Polybags over a set size need a suffocation warning; carton marks: style, colour, size ratio, quantity, weights' });
  return rows;
}

/** Rows for the tech pack. */
export function constructionSheet(project) {
  const c = constructionOf(project);
  return [
    ['Standard', `${c.name}${c.chosen ? '' : ' (suggested for this garment)'}`],
    ['Front construction', CANVAS[c.canvas] || c.canvas], ['Interfacing', c.interfacing.length ? `${c.interfacingType}: ${c.interfacing.join(', ')}` : 'none'],
    ['Lining', c.lining === 'unlined' ? 'unlined' : `${c.lining}, ${c.liningMaterial}`], ['Pocketing', c.pocketing],
    ['Stay tape', c.tape.join('; ') || 'none'], ['Seam finish', c.seamFinish], ['Hems', c.hem], ['Stitch density', c.spi ? `${c.spi} stitches per inch (${(c.spi / 2.54).toFixed(1)} per cm) on main seams` : 'knitted / linked'],
    ['Reinforcement', c.closureFinish || 'bar tacks at pocket corners, fly and belt loops'], ['Details included', c.extras.join('; ')],
    ['Fabric preparation', c.preShrink], ['Labels', `${c.labelSet.join('; ')}. Placement: ${c.labels}`], ['Pressing', c.pressing], ['Packing', c.packing],
    ['Quality', `AQL ${c.aql} (general inspection level II); measurement tolerance ±${c.tolerance} cm on body measurements, ±0.5 cm on small parts`],
    ...(() => { const fp = foldPlan(project, project.production?.fold || 'retail'); const fs = foldedSize(project, fp); return fp && fs ? [['Folding', `${fp.label}: ${fp.steps.map((s, i) => `${i + 1}. ${s.text}`).join(' ')} Folded size about ${fs.width} × ${fs.length} × ${fs.height} cm. ${fs.note}.`]] : []; })(),
  ];
}
