// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * AI design assistant: turns a prompt into actions, limited to the parts of
 * the design the user allows (granular scope). Works with any provider.
 */
import { ACTION_DOCS, catalog, summarizeProject } from '../core/actions.js';

export const SCOPES = {
  shape: { label: 'Shape & pattern', actions: ['new_garment', 'add_garment', 'remove_garment', 'set_option', 'set_size', 'add_panel', 'update_panel', 'move_point', 'insert_point', 'delete_point', 'remove_panel'] },
  construction: { label: 'Stitching & assembly', actions: ['set_stitch', 'apply_recommendations', 'add_seam', 'remove_seam'] },
  materials: { label: 'Fabrics, knits, blends & fill', actions: ['set_fabric', 'create_fabric', 'create_blend', 'set_insulation', 'set_knit'] },
  color: { label: 'Colour & dyeing', actions: ['set_finish:color', 'set_finish:dye'] },
  prints: { label: 'Prints & paint', actions: ['set_finish:print', 'set_finish:paint'] },
  trims: { label: 'Buttons, zips, edges, lacing & trims', actions: ['add_trim', 'set_trim', 'remove_trim', 'add_overlay', 'remove_overlay', 'set_zipper', 'add_zipper', 'set_edge', 'add_lacing'] },
  jewelry: { label: 'Jewelry', actions: ['new_jewelry', 'set_jewelry', 'set_karat', 'add_stone', 'update_stone', 'remove_stone', 'set_custom_shape'] },
  production: { label: 'Production settings', actions: ['set_production'] },
};

function allowed(scope) {
  const set = new Set();
  for (const [k, on] of Object.entries(scope)) if (on) for (const a of SCOPES[k].actions) set.add(a);
  return set;
}

export function systemPrompt(project, scope) {
  const ok = allowed(scope);
  const types = [...new Set([...ok].map((a) => a.split(':')[0]))];
  const cat = catalog();
  const ids = (o) => Object.keys(o).join(', ');
  const parts = [
    'You are the design assistant inside Genzineers Fashion Tool, a clothing, hat, bag and jewelry design + simulation + production app.',
    'Help the user design. Be concise and practical; mention industry-standard choices and why. When you change the design, reply with a short explanation and ONE fenced ```json block: {"actions": [ ... ]}.',
    `ONLY use these action types (the user limited what you may change): ${types.join(', ') || '(none: just give advice, no actions)'}.`,
    ok.has('set_finish:color') || ok.has('set_finish:print') ? `For set_finish you may only set: ${[...ok].filter((a) => a.startsWith('set_finish:')).map((a) => a.split(':')[1]).join(', ')}.` : '',
    'Action formats:',
    ...types.map((t) => `- ${t}: ${ACTION_DOCS[t]}`),
    'Catalog ids:',
    ok.has('new_garment') || ok.has('add_garment') ? `templates: ${ids(cat.templates)}` : '',
    ok.has('set_option') ? `template options by generator: ${JSON.stringify(cat.generators)}` : '',
    ok.has('set_fabric') ? `fabrics: ${ids(cat.fabrics)}\nblends: ${ids(cat.blends)}\ninsulation: ${ids(cat.insulation)}\nknit methods: ${ids(cat.knitMethods)}\ngauges: ${ids(cat.gauges)}\nyarns: ${ids(cat.yarns)}\nknit structures: ${ids(cat.knitStructures)}\nmotifs: ${ids(cat.motifs)}` : '',
    ok.has('set_stitch') ? `assembly methods: ${ids(cat.assembly)}\nthreads: ${ids(cat.threads)}` : '',
    ok.has('set_finish:dye') ? `dyes: ${ids(cat.dyes)}` : '',
    ok.has('set_finish:print') ? `print methods: ${ids(cat.printMethods)}; designs: ${cat.printDesigns.join(', ')}; paints: ${ids(cat.paints)}` : '',
    ok.has('add_trim') ? `trims: ${ids(cat.trims)}\nzipper types: ${ids(cat.zipperTypes)}; sizes ${cat.zipperSizes.join(', ')}; ends ${ids(cat.zipperEnds)}; sliders ${ids(cat.zipperSliders)}; pullers ${ids(cat.zipperPullers)}\nedge treatments: ${ids(cat.edgeTreatments)}\nlacing styles: ${ids(cat.lacingStyles)}` : '',
    ok.has('new_jewelry') ? `jewelry templates: ${ids(cat.jewelryTemplates)}\nmetals: ${ids(cat.metals)}\ngems: ${ids(cat.gems)}\ncuts: ${ids(cat.cuts)}\nsettings: ${ids(cat.settings)}\nlinks: ${ids(cat.links)}\nclasps: ${ids(cat.clasps)}` : '',
    ok.has('set_size') ? `size charts: ${JSON.stringify(cat.sizeCharts)}` : '',
    'Current project:',
    JSON.stringify(project.mode === 'jewelry' ? { mode: 'jewelry', jewelry: { ...project.jewelry, parts: (project.jewelry.parts || []).map(({ data, ...rest }) => rest) } } : summarizeProject(project)),
  ];
  return parts.filter(Boolean).join('\n');
}

/** Extract {actions:[...]} from a model reply (fenced or bare JSON). */
export function parseActions(text) {
  const blocks = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  if (!blocks.length) { const i = text.indexOf('{"actions"'); if (i >= 0) blocks.push(text.slice(i)); }
  for (const b of blocks) {
    try {
      const j = JSON.parse(b.trim());
      if (Array.isArray(j)) return j;
      if (Array.isArray(j.actions)) return j.actions;
    } catch { /* try next */ }
  }
  return [];
}

/** Drop actions outside the allowed scope; strip disallowed finish fields. */
export function filterActions(actions, scope) {
  const ok = allowed(scope);
  const kept = []; const dropped = [];
  for (const a of actions) {
    if (a.type === 'set_finish') {
      const b = { type: 'set_finish', panel: a.panel, garment: a.garment };
      let any = false;
      for (const k of ['color', 'dye', 'print', 'paint']) if (k in a) { if (ok.has(`set_finish:${k}`)) { b[k] = a[k]; any = true; } else dropped.push(`set_finish.${k}`); }
      if (any) kept.push(b);
    } else if (ok.has(a.type)) kept.push(a);
    else dropped.push(a.type);
  }
  return { kept, dropped };
}
