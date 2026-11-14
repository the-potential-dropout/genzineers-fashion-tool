// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

import { TEMPLATES, templateGarments, buildGarment } from './templates.js';
import { bodyFor } from './sizes.js';

export const PROJECT_VERSION = 2;

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
  for (const pan of out.panels) {
    const old = keep[pan.id];
    p.panels.push({
      fabricOverrides: {},
      ...pan,
      ...(old ? { fabric: old.fabric, fabricOverrides: old.fabricOverrides, finish: old.finish } : {}),
    });
  }
  for (const s of out.seams) p.seams.push({ id: uid('seam'), threadColor: '#d8d2c4', thread: 'poly-corespun', ...s });
  for (const t of out.trims) p.trims.push({ id: uid('trim'), ...t });
  for (const o of out.overlays) p.overlays.push({ id: uid('ov'), ...o });
  p.garmentForms = { ...(p.garmentForms || {}), [g.id]: { colliders: out.colliders || [], display: out.display || {}, meta: out.meta || {} } };
  syncForms(p);
}

/** Combine per-garment collision forms (bag stuffing etc.) and display flags. */
export function syncForms(p) {
  const forms = Object.entries(p.garmentForms || {}).filter(([gid]) => (p.garments || []).some((g) => g.id === gid)).map(([, v]) => v);
  p.colliders = forms.flatMap((f) => f.colliders);
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
