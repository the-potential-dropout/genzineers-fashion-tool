/**
 * Folding for packing and display: the fold a factory uses for each kind of garment, the steps
 * written out for the packing line, and the size it ends up (which sets the polybag and carton).
 * The 3D view plays the same plan on the draped garment.
 *
 * A step is { axis: 'x' (a line across the width, at cm from the centre) | 'd' (a line across
 * the length, at a fraction of it from the top), side: which part moves (-1 / +1), dir: 'under'
 * (folded behind) | 'over' (folded on top), text }.
 */
import { resolveFabric } from './fabrics.js';

export const FOLD_STYLES = {
  retail: 'Retail fold (folded to a board width)',
  half: 'Folded in half',
  thirds: 'Folded in thirds',
  flat: 'Laid flat (no folds)',
};

const garmentToFold = (project) => (project.garments || []).find((g) => ['top', 'bottom', 'skirt'].includes(g.generator) && project.panels.some((p) => p.garment === g.id));

/** The plan for the garment on the mannequin. */
export function foldPlan(project, style = 'retail') {
  const g = garmentToFold(project); if (!g) return null;
  const o = g.options || {}; const kind = g.generator; const len = o.length || (kind === 'bottom' ? 100 : 70);
  const tailored = o.lapel && o.lapel !== 'none'; const shirt = o.collar && /shirt|button|spread|point|cutaway|band/.test(o.collar);
  const knitBulky = /fleece|terry|knit|wool|cashmere/.test(g.fabric || '');
  const board = kind === 'bottom' ? 0 : tailored ? 34 : shirt ? 22 : knitBulky ? 30 : 25; // folded width, cm
  const target = kind === 'bottom' ? 36 : tailored ? 42 : shirt ? 33 : knitBulky ? 36 : 32; // folded length, cm
  const steps = [];
  if (style === 'flat') return { garment: g.id, kind, style, board, steps, label: FOLD_STYLES.flat };
  if (kind === 'bottom') {
    steps.push({ axis: 'x', at: 0, side: -1, dir: 'over', text: 'Lay the trousers face up, fly closed and buttoned. Fold the left leg over the right along the centre crease so the legs lie exactly on top of each other, back rise sticking out.' });
    const k = style === 'half' ? 1 : style === 'thirds' ? 2 : Math.max(1, Math.min(3, Math.ceil(len / target) - 1));
    for (let i = k; i >= 1; i--) steps.push({ axis: 'd', at: i / (k + 1), side: 1, dir: 'over', text: k === 1 ? 'Fold the legs up so the hems meet the waistband.' : i === k ? `Fold the bottom ${Math.round(len / (k + 1))} cm of the legs up over the knees.` : 'Fold up again so the folded legs lie over the seat.' });
  } else {
    if (style !== 'half' && style !== 'thirds') {
      steps.push({ axis: 'x', at: -board / 2, side: -1, dir: 'under', text: `Lay it face down${shirt ? ', buttoned (top, third and bottom buttons), collar stand up, on a ' + board + ' cm folding board' : ''}. Fold the left side and sleeve behind along a line ${board / 2} cm from the centre${tailored ? ', the sleeve folded straight down the back' : ', the sleeve angled down along the side'}.` });
      steps.push({ axis: 'x', at: board / 2, side: 1, dir: 'under', text: 'Fold the right side and sleeve behind the same way, so both sides meet in the middle of the back.' });
    } else steps.push({ axis: 'x', at: 0, side: -1, dir: 'under', text: 'Fold it in half down the centre front, sleeves together.' });
    const k = style === 'half' ? 1 : style === 'thirds' ? 2 : Math.max(1, Math.min(3, Math.ceil(len / target) - 1));
    for (let i = k; i >= 1; i--) steps.push({ axis: 'd', at: i / (k + 1), side: 1, dir: 'under', text: k === 1 ? 'Fold the bottom half up behind, hem to shoulders.' : i === k ? `Fold the bottom ${Math.round(len / (k + 1))} cm up behind.` : 'Fold up behind again so the folded part sits under the chest.' });
  }
  return { garment: g.id, kind, style, board, target, steps, label: FOLD_STYLES[style] };
}

/** Folded size (cm), thickness and the packaging it needs, worked out from the plan and the garment. */
export function foldedSize(project, plan) {
  if (!plan) return null; const g = (project.garments || []).find((x) => x.id === plan.garment); const o = g?.options || {};
  const pans = project.panels.filter((p) => p.garment === plan.garment); const f = resolveFabric(project, pans[0]?.fabric || g?.fabric);
  const len = o.length || (plan.kind === 'bottom' ? 100 : 70); const k = plan.steps.filter((s) => s.axis === 'd').length;
  const xs = pans.flatMap((p) => p.points.map((q) => q[0])); const halfW = xs.length ? (Math.max(...xs) - Math.min(...xs)) : 50;
  const width = plan.kind === 'bottom' ? Math.round(halfW * 0.55 + 6) : plan.style === 'half' || plan.style === 'thirds' ? Math.round(halfW / 2 + 4) : plan.board;
  const length = Math.round(len / (k + 1) + (plan.kind === 'bottom' ? 4 : 2));
  const layersX = plan.kind === 'bottom' ? 2 : plan.style === 'half' || plan.style === 'thirds' ? 2 : 2; // front and back, plus sides folded in at the middle
  const layers = 2 * layersX * 2 ** k; const th = (f?.thicknessMm || 0.6) / 10 + 0.04; // each layer plus the air between layers
  const height = Math.round((layers * th + (o.insulation && o.insulation !== 'none' ? 3 : 0) + 0.4) * 10) / 10;
  const bag = [Math.ceil((width + 4) / 1) , Math.ceil((length + 8) / 1)];
  return { width, length, height, layers, bag, note: `Polybag ${bag[0]} × ${bag[1]} cm with a ${height > 3 ? '5' : '4'} cm lip; ${Math.max(1, Math.floor(56 / Math.max(height, 1)))} per layer stack in a 60 × 40 × 40 cm carton` };
}
