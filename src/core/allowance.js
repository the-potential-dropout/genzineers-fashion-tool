/**
 * Seam allowance, edge by edge.
 *
 * Every edge of a piece gets the allowance its construction needs: the house seam allowance on
 * plain seams, more for French seams and fells, a deep turn-up on hems (taken from the
 * construction standard), a narrow 6 mm at necklines and collars, nothing on bound or raw edges.
 * Any edge can be set by hand. Corners can be mitred (the offset lines meet), squared, cut off,
 * or reversed (the allowance mirrored about a hem fold so it lies flat when the hem is turned up).
 *
 * Choices are stored on the panel by edge name where the edge has one (so they survive
 * re-drafting and grading) and by index otherwise.
 */
import { ASSEMBLY } from './assembly.js';
import { constructionOf } from './construction.js';

export const CORNERS = { mitre: 'Mitred (offset lines meet)', square: 'Squared', cut: 'Cut off (chamfered)', reverse: 'Reversed (mirrored about the hem fold)' };

const key = (p) => `${Math.round(p[0] * 10)},${Math.round(p[1] * 10)}`;

/** The name of each edge of a panel (from its drafted edge map), or null. */
export function edgeTags(panel) {
  const n = panel.points.length; const tags = new Array(n).fill(null); const E = panel.edges || {};
  const sets = Object.entries(E).map(([t, pts]) => [t, new Set((pts || []).map(key))]);
  for (let e = 0; e < n; e++) { const a = key(panel.points[e]); const b = key(panel.points[(e + 1) % n]); for (const [t, s] of sets) if (s.has(a) && s.has(b)) { tags[e] = t; break; } }
  return tags;
}

/** Hem allowance from the construction standard's hem text ("blind hem, 4 cm", "rolled hem, 5 mm"). */
function hemFrom(project) {
  const c = project.panels?.length ? constructionOf(project) : null; const h = c?.hem || '';
  const m = h.match(/(\d+(?:\.\d+)?)\s*(cm|mm)/); if (!m) return project.production?.hemAllowance ?? 2.5;
  let v = Number(m[1]) / (m[2] === 'mm' ? 10 : 1);
  if (/rolled|double|turn/.test(h)) v *= 2; // a double-turned hem uses twice its finished depth
  if (/rib|knitted on|bound|picot|elastic/.test(h)) v = 1;
  return Math.max(0.5, Math.min(8, v));
}

/** Allowance (cm) on every edge of a panel, and the corner style at every point. */
export function allowances(project, panel) {
  const n = panel.points.length; const SA = project.production?.seamAllowance ?? 1; const HEM = hemFrom(project);
  const tags = edgeTags(panel); const seamOn = new Array(n).fill(null);
  for (const s of project.seams || []) for (const side of ['a', 'b']) { const r = s[side]; if (r.panel !== panel.id) continue; const to = r.to ?? r.edge; for (let e = r.edge, k = 0; k < n; e++, k++) { seamOn[e % n] = s; if (e % n === to % n) break; } }
  const ys = panel.points.map((q) => q[1]); const minY = Math.min(...ys);
  const set = panel.sa || {};
  const d = new Array(n).fill(SA); const why = new Array(n).fill('seam');
  for (let e = 0; e < n; e++) {
    const t = tags[e] || ''; const s = seamOn[e]; const a = panel.points[e]; const b = panel.points[(e + 1) % n];
    const own = set[`tag:${t}`] ?? set[`i:${e}`];
    if (own != null && (t || set[`i:${e}`] != null)) { d[e] = own; why[e] = 'set'; continue; }
    if (s) {
      const m = ASSEMBLY[s.stitch] || {}; const id = s.stitch || '';
      if (/french/.test(id)) { d[e] = 1.5; why[e] = 'French seam'; } else if (/fell/.test(id)) { d[e] = 1.0; why[e] = 'felled seam'; } else if (/lap|abut|zigzag-308|flatlock|607/.test(id)) { d[e] = 0.6; why[e] = 'flat / lapped seam'; } else if (m.method === 'weld' || m.method === 'bond') { d[e] = 1.0; why[e] = 'bonded / welded'; } else if (/neck|collar|armhole|facing/.test(t)) { d[e] = 0.6; why[e] = 'neckline / collar (trimmed and clipped)'; } else { d[e] = SA; why[e] = 'seam'; }
      continue;
    }
    if (/hem/.test(t) || (!t && panel.role !== 'sleeve' && Math.abs(a[1] - minY) < 2.5 && Math.abs(b[1] - minY) < 2.5)) { d[e] = HEM; why[e] = 'hem'; continue; }
    if (/neck|armhole|front|edge|opening|top|waist|cuff|mouth/.test(t)) { d[e] = 0.6; why[e] = 'faced / bound edge'; continue; }
    d[e] = SA; why[e] = 'edge';
  }
  const corner = new Array(n).fill('mitre');
  const cset = panel.saCorner || {};
  for (let i = 0; i < n; i++) { const t0 = tags[(i - 1 + n) % n]; const t1 = tags[i]; const c = cset[`tags:${t0}|${t1}`] ?? cset[`i:${i}`]; if (c) corner[i] = c; else if (why[(i - 1 + n) % n] === 'hem' !== (why[i] === 'hem') && Math.abs(d[i] - d[(i - 1 + n) % n]) > 0.6) corner[i] = 'reverse'; }
  return { d, why, corner, tags };
}

/** The cut line of a panel: its stitch line offset edge by edge, corners treated as set. */
export function cutOutline(project, panel) {
  const A = allowances(project, panel); return offsetEdges(panel.points, A.d, A.corner);
}

/** Offset a closed outline outwards by d[e] per edge, with a corner style at every point. */
export function offsetEdges(pts, d, corner = []) {
  const n = pts.length; let S = 0; for (let i = 0; i < n; i++) { const a = pts[i]; const b = pts[(i + 1) % n]; S += a[0] * b[1] - b[0] * a[1]; }
  const sg = S > 0 ? 1 : -1; const out = [];
  const inter = (p, u, q, v) => { const cr = u[0] * v[1] - u[1] * v[0]; if (Math.abs(cr) < 1e-9) return null; const t = ((q[0] - p[0]) * v[1] - (q[1] - p[1]) * v[0]) / cr; return [p[0] + u[0] * t, p[1] + u[1] * t]; };
  for (let i = 0; i < n; i++) {
    const p = pts[(i - 1 + n) % n]; const c = pts[i]; const q = pts[(i + 1) % n]; const d0 = d[(i - 1 + n) % n]; const d1 = d[i];
    let a = [c[0] - p[0], c[1] - p[1]]; let b = [q[0] - c[0], q[1] - c[1]]; const la = Math.hypot(...a) || 1; const lb = Math.hypot(...b) || 1; a = [a[0] / la, a[1] / la]; b = [b[0] / lb, b[1] / lb];
    const n0 = [a[1] * sg, -a[0] * sg]; const n1 = [b[1] * sg, -b[0] * sg]; const P0 = [c[0] + n0[0] * d0, c[1] + n0[1] * d0]; const P1 = [c[0] + n1[0] * d1, c[1] + n1[1] * d1];
    const cross = a[0] * b[1] - a[1] * b[0]; const style = corner[i] || 'mitre';
    if (Math.abs(cross) < 0.08) { if (Math.abs(d0 - d1) < 0.01) out.push([c[0] + n1[0] * d1, c[1] + n1[1] * d1]); else out.push(P0, P1); continue; } // smooth curve: no corner to treat
    if (style === 'cut') { out.push(P0, P1); continue; }
    if (style === 'square') { out.push([P0[0] + a[0] * d1, P0[1] + a[1] * d1], [P1[0] - b[0] * d0, P1[1] - b[1] * d0]); continue; }
    if (style === 'reverse') {
      // the edge with the deeper allowance is the hem: mirror the other edge's offset line about the hem line,
      // so that when the hem is turned up along the stitch line the two allowances lie exactly over each other
      const hemIsNext = d1 >= d0; const hemDir = hemIsNext ? b : a; const sideN = hemIsNext ? n0 : n1; const sideD = hemIsNext ? d0 : d1; const hemN = hemIsNext ? n1 : n0; const hemD = hemIsNext ? d1 : d0; const sideDir = hemIsNext ? a : b;
      const sideP = [c[0] + sideN[0] * sideD, c[1] + sideN[1] * sideD];
      const Q = inter(sideP, sideDir, c, hemDir); // where the side allowance meets the hem fold line
      // reflect the side direction about the hem line
      const dot = sideDir[0] * hemDir[0] + sideDir[1] * hemDir[1]; const R = [2 * dot * hemDir[0] - sideDir[0], 2 * dot * hemDir[1] - sideDir[1]];
      const hemP = [c[0] + hemN[0] * hemD, c[1] + hemN[1] * hemD]; const P = Q ? inter(Q, R, hemP, hemDir) : null;
      if (Q && P && Math.hypot(P[0] - c[0], P[1] - c[1]) < (sideD + hemD) * 4) { if (hemIsNext) out.push(Q, P); else out.push(P, Q); continue; }
    }
    // mitre: the two offset lines meet (capped on very sharp points)
    const X = inter(P0, a, P1, b) || P1; const far = Math.hypot(X[0] - c[0], X[1] - c[1]); const lim = Math.max(d0, d1) * 3;
    if (far > lim) out.push(P0, [c[0] + ((X[0] - c[0]) / far) * lim, c[1] + ((X[1] - c[1]) / far) * lim], P1); else out.push(X);
  }
  return out;
}
