// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

import { TEMPLATES, templateGarments, buildGarment } from './templates.js';
import { bodyFor } from './sizes.js';
import { knitFabric } from './knit.js';

export const PROJECT_VERSION = 3;

let counter = 0;
export function uid(prefix = 'id') {
  counter = (counter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
}

/**
 * Project = garments (generator + options, the editable "recipe") plus the
 * derived pattern: panels, seams, trims, overlays. Per-panel material and
 * finish choices survive option changes because they are keyed by panel id.
 */
export function createProject(templateId = 'crew-tee') {
  const t = TEMPLATES[templateId] || TEMPLATES['crew-tee'];
  const p = {
    version: PROJECT_VERSION,
    name: t.name,
    template: TEMPLATES[templateId] ? templateId : 'crew-tee',
    garments: templateGarments(templateId),
    panels: [], seams: [], trims: [], overlays: [],
    customFabrics: {},
    colorways: [{ id: 'main', name: 'Main' }],
    sizeChart: 'unisex',
    size: 'M',
    production: { quantity: 100, sizes: ['XS', 'S', 'M', 'L', 'XL'], baseSize: 'M', market: 'US', targetCost: null },
    sim: { gridSize: 2.0, iterations: 10, gravity: 9.81, sewSpeed: 0.92 },
  };
  for (const g of p.garments) mergeGarment(p, g);
  return p;
}

/** Re-draft every garment for the current size (keeps materials). */
export function regradeProject(p) {
  for (const g of p.garments || []) mergeGarment(p, g);
  return p;
}

/** (Re)generate one garment's derived pieces, preserving per-panel choices. */
export function mergeGarment(p, g) {
  const keep = {};
  for (const pan of p.panels) if (pan.garment === g.id) keep[pan.id] = pan;
  p.panels = p.panels.filter((x) => x.garment !== g.id);
  const ids = new Set(Object.keys(keep));
  p.seams = p.seams.filter((s) => !(ids.has(s.a.panel) || ids.has(s.b.panel)) || s.custom);
  p.trims = p.trims.filter((t) => !ids.has(t.panel) || t.custom);
  p.overlays = p.overlays.filter((o) => !ids.has(o.panel) || o.custom);
  const out = buildGarment(g, bodyFor(p));
  if (g.knit) {
    const fid = `knit-${g.id}`;
    p.customFabrics = { ...(p.customFabrics || {}), [fid]: { ...knitFabric(g.knit), id: fid } };
    g.fabric = fid;
    for (const pan of out.panels) pan.fabric = fid;
  }
  for (const pan of out.panels) {
    const old = keep[pan.id] || keep[pan.id.replace(/front-[rl]$/, 'front')] || keep[pan.id.replace(/front$/, 'front-r')];
    p.panels.push({
      fabricOverrides: {},
      ...pan,
      ...(old ? { fabric: g.knit ? pan.fabric : old.fabric, fabricOverrides: old.fabricOverrides, finish: old.finish } : {}),
    });
  }
  for (const s of out.seams) p.seams.push({ id: uid('seam'), threadColor: '#d8d2c4', thread: 'poly-corespun', ...s });
  for (const t of out.trims) p.trims.push({ id: uid('trim'), ...t });
  for (const o of out.overlays) p.overlays.push({ id: uid('ov'), ...o });
  p.garmentForms = { ...(p.garmentForms || {}), [g.id]: { colliders: out.colliders || [], display: out.display || {}, meta: out.meta || {}, shells: out.shells || [], collars: out.collars || [], props: (out.props || []).map((x) => ({ ...x, garment: g.id })) } };
  syncForms(p);
}

/** Combine per-garment collision forms (bag stuffing etc.) and display flags. */
export function syncForms(p) {
  const forms = Object.entries(p.garmentForms || {}).filter(([gid]) => (p.garments || []).some((g) => g.id === gid)).map(([, v]) => v);
  p.colliders = forms.flatMap((f) => f.colliders);
  p.shells = forms.flatMap((f) => f.shells || []);
  p.collars = forms.flatMap((f) => f.collars || []);
  p.props = forms.flatMap((f) => f.props || []); // tied / moulded pieces drawn as solid forms (tie knots, bow ties)
  // show the body if any garment is worn; bags-only projects show a product stand
  p.display = { avatar: !forms.length || forms.some((f) => f.display.avatar !== false) };
}

/** Minimal structural validation; returns list of problems (empty = ok). */
export function validateProject(p) {
  const errs = [];
  if (!p || typeof p !== 'object') return ['project is not an object'];
  if (!Array.isArray(p.panels)) errs.push('panels must be an array');
  const ids = new Set();
  for (const pan of p.panels || []) {
    if (!pan.id) errs.push('panel without id');
    if (ids.has(pan.id)) errs.push(`duplicate panel id ${pan.id}`);
    ids.add(pan.id);
    if (!Array.isArray(pan.points) || pan.points.length < 3) errs.push(`panel ${pan.id} needs >= 3 points`);
  }
  for (const s of p.seams || []) {
    for (const side of ['a', 'b']) {
      const pan = (p.panels || []).find((x) => x.id === s[side]?.panel);
      if (!pan) errs.push(`seam ${s.id}: unknown panel ${s[side]?.panel}`);
      else if (s[side].edge < 0 || s[side].edge >= pan.points.length) errs.push(`seam ${s.id}: edge ${s[side].edge} out of range`);
    }
  }
  return errs;
}

/** Upgrade older project files. */
export function migrateProject(p) {
  if (!p.version || p.version < 2) {
    p.garments = p.garments || [];
    p.overlays = p.overlays || [];
    p.colorways = p.colorways || [{ id: 'main', name: 'Main' }];
    p.production = p.production || { quantity: 100, sizes: ['XS', 'S', 'M', 'L', 'XL'], baseSize: 'M', market: 'US', targetCost: null };
    p.version = 2;
  }
  p.sizeChart = p.sizeChart || 'unisex';
  p.size = p.size || 'M';
  if (p.version < 3) {
    // v3: patterns are re-drafted (true curves, separate overlapping fronts, 45 degree arm pose); materials are kept
    if (p.mode !== 'jewelry') { try { regradeProject(p); } catch { /* keep the old draft */ } }
    p.version = 3;
  }
  return p;
}

/** Compact human/LLM-readable summary of a project. */
export function summarizeProject(p) {
  return {
    name: p.name,
    template: p.template,
    garments: (p.garments || []).map((g) => ({ id: g.id, generator: g.generator, options: g.options, fabric: g.fabric, stitch: g.stitch })),
    panels: p.panels.map((x) => ({ id: x.id, name: x.name, role: x.role, fabric: x.fabric, finish: x.finish || null, points: x.points.length })),
    seams: p.seams.map((s) => ({ id: s.id, a: `${s.a.panel}#${s.a.edge}${s.a.to != null && s.a.to !== s.a.edge ? `-${s.a.to}` : ''}`, b: `${s.b.panel}#${s.b.edge}`, stitch: s.stitch, thread: s.thread, threadColor: s.threadColor })),
    trims: p.trims.map((t) => ({ id: t.id, type: t.type, panel: t.panel, at: t.at })),
    overlays: p.overlays.map((o) => ({ id: o.id, kind: o.kind, style: o.style, panel: o.panel })),
    customFabrics: Object.keys(p.customFabrics || {}),
    production: p.production,
  };
}

const LAYER_NAMES = ['Underwear', 'Base layer', 'Mid layer (knits)', 'Jacket', 'Coat', 'Accessory'];
export { LAYER_NAMES };

/**
 * Add the garments of a saved design (from the collection) to this project,
 * keeping everything that was designed: edited points, fabrics, knits,
 * colours, prints, trims, zippers, edges and lacing. Ids are remapped so
 * nothing collides. If the saved design was made for another size/body it is
 * re-drafted for this project's body (materials are kept).
 */
export function addDesign(p, src) {
  if (!src || src.mode === 'jewelry') throw new Error('only clothing designs can be added to an outfit');
  const clone = (o) => JSON.parse(JSON.stringify(o));
  src = migrateProject(clone(src));
  p.garments = p.garments || [];
  const used = new Set(p.garments.map((g) => g.id));
  const next = () => { let i = 0; while (used.has(`g${i}`)) i++; used.add(`g${i}`); return `g${i}`; };
  const pmap = {};
  const added = [];
  const bodyKey = (x) => JSON.stringify([x.sizeChart || 'unisex', x.size || 'M', x.customBody || null, x.mannequin || 'auto', x.bodyShape || null]);
  const regrade = bodyKey(src) !== bodyKey(p);
  for (const g of src.garments || []) {
    const n = next();
    const oldPre = g.prefix || `${g.id}-`;
    const newPre = `${n}-`;
    for (const pan of src.panels.filter((x) => x.garment === g.id)) {
      const nid = pan.id.startsWith(oldPre) ? newPre + pan.id.slice(oldPre.length) : newPre + pan.id;
      pmap[pan.id] = nid;
      const fab = pan.fabric === `knit-${g.id}` ? `knit-${n}` : pan.fabric;
      p.panels.push({ ...pan, id: nid, garment: n, fabric: fab });
    }
    if (src.customFabrics?.[`knit-${g.id}`]) p.customFabrics = { ...(p.customFabrics || {}), [`knit-${n}`]: { ...src.customFabrics[`knit-${g.id}`], id: `knit-${n}` } };
    const spec = { ...g, id: n, prefix: newPre, name: g.name || ((src.garments || []).length === 1 ? src.name : undefined), ...(g.fabric === `knit-${g.id}` ? { fabric: `knit-${n}` } : {}) };
    p.garments.push(spec);
    p.garmentForms = { ...(p.garmentForms || {}), [n]: src.garmentForms?.[g.id] || { colliders: [], display: {}, meta: {}, shells: [] } };
    added.push(spec);
  }
  for (const [id, f] of Object.entries(src.customFabrics || {})) if (!id.startsWith('knit-') && !p.customFabrics?.[id]) p.customFabrics = { ...(p.customFabrics || {}), [id]: f };
  for (const s of src.seams || []) if (pmap[s.a.panel] && pmap[s.b.panel]) p.seams.push({ ...s, id: uid('seam'), a: { ...s.a, panel: pmap[s.a.panel] }, b: { ...s.b, panel: pmap[s.b.panel] } });
  for (const t of src.trims || []) if (pmap[t.panel]) p.trims.push({ ...t, id: uid('trim'), panel: pmap[t.panel] });
  for (const o of src.overlays || []) if (pmap[o.panel]) p.overlays.push({ ...o, id: uid('ov'), panel: pmap[o.panel] });
  if (regrade) for (const g of added) mergeGarment(p, g);
  syncForms(p);
  return added;
}
