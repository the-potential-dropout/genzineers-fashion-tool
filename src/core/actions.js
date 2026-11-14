// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * The single action vocabulary shared by the UI, the in-app AI assistant,
 * the CLI and the MCP server. Every action is plain JSON: { type, ...params }.
 * applyAction never touches the DOM, so it runs in browsers and in Node.
 */
import { FABRICS, FABRIC_FAMILIES, PATTERNS, FX } from './fabrics.js';
import { ASSEMBLY, ASSEMBLY_GROUPS, THREADS } from './assembly.js';
import { TRIMS, STIFFENERS } from './trims.js';
import { TEMPLATES, templateGarments } from './templates.js';
import { GENERATORS } from './blocks.js';
import { DYES, PRINT_METHODS, PRINT_DESIGNS, PAINTS } from './color.js';
import { recommendFor } from './guidance.js';
import { BLENDS, FIBERS, INSULATION, QUILTING, WATERPROOF, blendFabric } from './materials.js';
import { createProject, mergeGarment, regradeProject, syncForms, uid, validateProject, summarizeProject } from './project.js';
import { SIZE_CHARTS } from './sizes.js';
import { JEWELRY_TEMPLATES, METALS, GEMS, CUTS, SETTINGS, LINKS, CLASPS, BAILS, EARRING_BACKS, RING_PROFILES, PLATINGS, goldAlloy, estimateMetal, caratEstimate, ringSize } from './jewelry.js';

export const ACTION_DOCS = {
  new_garment: '{ template } replace the project with a template (see catalog.templates)',
  add_garment: '{ template } add another garment (e.g. trousers to a jacket = suit)',
  remove_garment: '{ garment: "g0" }',
  set_option: '{ garment: "g0", key, value } or { garment, options: {key: value} } change a template option (fit, length, sleeve, cuff, collar, lapel, closure, inseam, leg, style, ...; see catalog.generators)',
  rename: '{ name }',
  set_fabric: '{ panel: "<panel id>"|"all", garment?: "g0", fabric: "<fabric id>", overrides?: { stretch?, bend?, weightGsm?, look?: { color?, roughness?, sheen?, pattern?, fx? } } }',
  create_fabric: '{ id, name, base?: "<fabric id>", fiber?, weightGsm?, stretch?, bend?, look?: {...} }',
  create_blend: '{ id, name?, base: "<fabric id>", composition: { cotton: 60, polyester: 40 } } or { id, blend: "<blend id>" } custom fibre blend (props computed)',
  set_insulation: '{ panel|"all", garment?, fill: "<insulation id>"|null, weight?: g/m², quilting? }',
  set_finish: '{ panel|"all", garment?, color?: "#rrggbb", dye?: "<dye id>", print?: { method, design, colors?: [..], scale?, image? } | null, paint?: { method, design, colors? } | null }',
  set_stitch: '{ seam: "<seam id>"|"all", garment?, stitch?: "<assembly id>", thread?: "<thread id>", threadColor? }',
  apply_recommendations: '{ garment? } set industry-default stitch + thread for each panel fabric',
  add_panel: '{ id?, name, points: [[x,y],...] cm, placement: { position: [x,y,z] m, rotationY, wrap? }, fabric? }',
  update_panel: '{ id, name?, points?, placement?, fabric?, rigid? }',
  move_point: '{ panel, index, to: [x,y] }',
  insert_point: '{ panel, edge, at: [x,y] }',
  delete_point: '{ panel, index }',
  remove_panel: '{ id }',
  add_seam: '{ a: { panel, edge, to? }, b: { panel, edge, to? }, stitch?, thread? }',
  remove_seam: '{ id }',
  add_trim: '{ trim: "<trim id>", panel, at: [x,y] cm, to?: [x,y] (line trims), size? mm, color? }',
  set_trim: '{ id|"all", match?: "<trim id>", trim?, color?, size? } swap or recolour trims',
  remove_trim: '{ id }',
  add_overlay: '{ kind: pocket|patch|flap|placket|yoke|band|cuff|collar|lapel|appliqué, panel, points: [[x,y]...], fabric?, color? }',
  remove_overlay: '{ id }',
  set_size: '{ size?: "XS".. "4XL", chart?: "unisex"|"mens"|"womens", custom?: { chest, waist, hip, height, inseam, head, neck } (cm) } re-drafts all patterns and the avatar',
  new_jewelry: '{ template } switch to jewelry mode with a template (see catalog.jewelryTemplates)',
  set_jewelry: '{ patch: { size?, profile?, bandWidth?, bandThickness?, link?, gauge?, length?, clasp?, metal?, plating?, pendant?: {...}, style?, back?, diameter?, ... } }',
  set_karat: '{ karat: 9..24, colour: "yellow"|"white"|"rose"|"green" } custom gold alloy (purity, density, colour, hallmark computed)',
  add_stone: '{ gem, cut, size (mm length), width? (mm), setting?, position?: "center"|"side"|"top"|"pave" }',
  update_stone: '{ index, gem?, cut?, size?, width?, setting? }',
  remove_stone: '{ index }',
  set_custom_shape: '{ target: "pendant"|"stone"|"link"|"signet", points: [[x,y],...] (mm) } your own outline',
  add_part: '{ name: "file.stl", data: "<data URL>", material?: "<metal or gem id>", size?: mm (fit longest side) } import a CAD part into the jewelry piece',
  update_part: '{ index, material?, size?, position?: [x,y,z] mm, rotation?: [x,y,z] deg, scale?: [x,y,z], distort?: { taper?, twist? (deg), bend? (deg) } }',
  remove_part: '{ index }',
  set_production: '{ quantity?, sizes?: ["S","M"], baseSize?, market?: "US"|"EU"|"UK"|"JP"|"CN"|"AU"|"CA", targetCost? }',
  set_sim: '{ gridSize? (cm 1..5), iterations? (2..30), gravity?, sewSpeed? }',
};

export function catalog() {
  const o = (obj, fn) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, fn(v)]));
  return {
    templates: o(TEMPLATES, (v) => `${v.name} [${v.group}${v.audience ? `, ${v.audience}` : ''}]`),
    generators: o(GENERATORS, (g) => o(g.options, (x) => (x.type === 'select' ? x.values : `${x.min}..${x.max}`))),
    fabrics: o(FABRICS, (v) => `${v.name} (${v.category}, ${v.fiber}, ${v.weightGsm}gsm)`),
    fabricFamilies: o(FABRIC_FAMILIES, (v) => v.variants),
    assembly: o(ASSEMBLY, (v) => `${v.name} [${v.method}] - ${v.use}`),
    assemblyGroups: ASSEMBLY_GROUPS,
    threads: o(THREADS, (v) => `${v.name} - ${v.use}`),
    trims: o(TRIMS, (v) => `${v.name} [${v.group}]`),
    stiffeners: o(STIFFENERS, (v) => v.name),
    sizeCharts: o(SIZE_CHARTS, (c) => Object.keys(c.sizes)),
    jewelryTemplates: o(JEWELRY_TEMPLATES, (v) => `${v.name} [${v.group}]`),
    metals: o(METALS, (v) => `${v.name} - ${v.note}`),
    platings: PLATINGS,
    gems: o(GEMS, (v) => `${v.name} (Mohs ${v.mohs}, RI ${v.ri})`),
    cuts: o(CUTS, (v) => `${v.name} - ${v.note}`),
    settings: o(SETTINGS, (v) => `${v.name} - ${v.note}`),
    links: o(LINKS, (v) => `${v.name} - ${v.note}`),
    clasps: o(CLASPS, (v) => `${v.name} - ${v.note}`),
    bails: BAILS, earringBacks: EARRING_BACKS, ringProfiles: RING_PROFILES,
    blends: o(BLENDS, (v) => `${v.name} ${JSON.stringify(v.composition)} - ${v.uses}`),
    fibers: o(FIBERS, (v) => v.note),
    insulation: o(INSULATION, (v) => `${v.name} - ${v.use}`),
    quilting: QUILTING,
    waterproof: o(WATERPROOF, (v) => `${v.name} (${v.hydro} mm / ${v.mvtr} g) - ${v.use}`),
    dyes: o(DYES, (v) => `${v.name} - ${v.use}`),
    printMethods: o(PRINT_METHODS, (v) => `${v.name} - ${v.use}`),
    printDesigns: PRINT_DESIGNS,
    paints: o(PAINTS, (v) => v.name),
    patterns: PATTERNS,
    fx: FX,
    actions: ACTION_DOCS,
  };
}

const clone = (o) => (typeof structuredClone === 'function' ? structuredClone(o) : JSON.parse(JSON.stringify(o)));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function panelOf(p, id) {
  const pan = p.panels.find((x) => x.id === id);
  if (!pan) throw new Error(`unknown panel "${id}" (have: ${p.panels.map((x) => x.id).join(', ')})`);
  return pan;
}
function garmentOf(p, id) {
  const g = (p.garments || []).find((x) => x.id === (id || p.garments?.[0]?.id));
  if (!g) throw new Error(`unknown garment "${id}" (have: ${(p.garments || []).map((x) => x.id).join(', ')})`);
  return g;
}
const fabricExists = (p, id) => Boolean(FABRICS[id] || p.customFabrics?.[id]);
function targetsPanels(p, a) {
  if (a.panel && a.panel !== 'all') return [panelOf(p, a.panel)];
  return a.garment ? p.panels.filter((x) => x.garment === a.garment) : p.panels;
}

/** Apply one action. Returns { project, result }. Input is not mutated. */
export function applyAction(project, action) {
  if (!action || typeof action.type !== 'string') throw new Error('action must have a string "type"');
  const p = clone(project);
  const a = action;
  let result = 'ok';

  switch (a.type) {
    case 'new_garment': {
      if (!TEMPLATES[a.template]) throw new Error(`unknown template "${a.template}"`);
      const np = createProject(a.template);
      np.mode = 'clothing';
      np.customFabrics = p.customFabrics || {};
      return { project: np, result: `created ${np.name}` };
    }
    case 'add_garment': {
      if (!TEMPLATES[a.template]) throw new Error(`unknown template "${a.template}"`);
      const n = (p.garments || []).length;
      for (const [i, g] of templateGarments(a.template).entries()) {
        const gid = `g${n + i}`;
        const spec = { ...g, id: gid, prefix: `${gid}-` };
        p.garments.push(spec);
        mergeGarment(p, spec);
      }
      p.name = `${p.name} + ${TEMPLATES[a.template].name}`;
      result = `added ${TEMPLATES[a.template].name}`;
      break;
    }
    case 'remove_garment': {
      const g = garmentOf(p, a.garment);
      const ids = new Set(p.panels.filter((x) => x.garment === g.id).map((x) => x.id));
      p.garments = p.garments.filter((x) => x.id !== g.id);
      p.panels = p.panels.filter((x) => !ids.has(x.id));
      p.seams = p.seams.filter((s) => !ids.has(s.a.panel) && !ids.has(s.b.panel));
      p.trims = p.trims.filter((t) => !ids.has(t.panel));
      p.overlays = p.overlays.filter((o) => !ids.has(o.panel));
      syncForms(p);
      break;
    }
    case 'set_option': {
      const g = garmentOf(p, a.garment);
      const schema = GENERATORS[g.generator].options;
      const changes = a.options || { [a.key]: a.value };
      for (const [k, v] of Object.entries(changes)) {
        const s = schema[k];
        if (!s) throw new Error(`unknown option "${k}" for ${g.generator}; options: ${Object.keys(schema).join(', ')}`);
        if (s.type === 'select' && !s.values.includes(v)) throw new Error(`option ${k} must be one of ${s.values.join(', ')}`);
        g.options[k] = s.type === 'range' ? clamp(Number(v), s.min, s.max) : v;
      }
      mergeGarment(p, g);
      result = `updated ${Object.keys(changes).join(', ')}`;
      break;
    }
    case 'rename':
      p.name = String(a.name || 'Untitled').slice(0, 120);
      break;
    case 'set_fabric': {
      const targets = targetsPanels(p, a);
      if (a.fabric && !fabricExists(p, a.fabric)) throw new Error(`unknown fabric "${a.fabric}"`);
      for (const pan of targets) {
        if (a.fabric) { pan.fabric = a.fabric; pan.fabricOverrides = {}; }
        if (a.overrides) {
          const prev = pan.fabricOverrides || {};
          pan.fabricOverrides = { ...prev, ...a.overrides, look: { ...(prev.look || {}), ...(a.overrides.look || {}) } };
        }
      }
      if (a.fabric && a.garment) garmentOf(p, a.garment).fabric = a.fabric;
      result = `fabric set on ${targets.length} panel(s)`;
      break;
    }
    case 'create_fabric': {
      if (!a.id || !/^[a-z0-9-_]+$/i.test(a.id)) throw new Error('create_fabric needs an id like "my-fabric"');
      const base = clone(FABRICS[a.base] || p.customFabrics?.[a.base] || FABRICS['cotton-poplin']);
      const { type, id, base: _b, look, ...props } = a;
      p.customFabrics = p.customFabrics || {};
      p.customFabrics[id] = { ...base, category: base.category, ...props, id, family: base.family, name: a.name || id, look: { ...base.look, ...(look || {}) } };
      result = `fabric ${id} created`;
      break;
    }
    case 'create_blend': {
      if (!a.id || !/^[a-z0-9-_]+$/i.test(a.id)) throw new Error('create_blend needs an id like "my-blend"');
      const preset = a.blend ? BLENDS[a.blend] : null;
      if (a.blend && !preset) throw new Error(`unknown blend "${a.blend}"`);
      const baseId = a.base || preset?.base || 'cotton-jersey';
      const base = clone(FABRICS[baseId] || p.customFabrics?.[baseId]);
      if (!base) throw new Error(`unknown base fabric "${baseId}"`);
      const comp = a.composition || preset.composition;
      const fab = blendFabric(base, comp);
      p.customFabrics = p.customFabrics || {};
      p.customFabrics[a.id] = { ...fab, id: a.id, category: base.category, name: a.name || preset?.name || `${base.name} (${fab.fiber})`, quality: fab.fiber, note: preset ? `${preset.uses}. Pros: ${preset.pros}. Cons: ${preset.cons}.` : '' };
      result = `blend ${a.id} = ${fab.fiber}`;
      break;
    }
    case 'set_insulation': {
      const targets = targetsPanels(p, a);
      if (a.fill && !INSULATION[a.fill]) throw new Error(`unknown insulation "${a.fill}"`);
      for (const pan of targets) {
        if (!a.fill) delete pan.insulation;
        else pan.insulation = { fill: a.fill, weight: clamp(a.weight || pan.insulation?.weight || 120, 20, 600), quilting: a.quilting || pan.insulation?.quilting || 'channel' };
      }
      result = `insulation set on ${targets.length} panel(s)`;
      break;
    }
    case 'set_finish': {
      const targets = targetsPanels(p, a);
      if (a.dye && !DYES[a.dye]) throw new Error(`unknown dye "${a.dye}"`);
      if (a.print && a.print.method && !PRINT_METHODS[a.print.method]) throw new Error(`unknown print method "${a.print.method}"`);
      if (a.paint && a.paint.method && !PAINTS[a.paint.method]) throw new Error(`unknown paint "${a.paint.method}"`);
      for (const pan of targets) {
        const f = { ...(pan.finish || {}) };
        for (const k of ['color', 'dye', 'print', 'paint']) if (k in a) { if (a[k] === null) delete f[k]; else f[k] = a[k]; }
        pan.finish = f;
      }
      result = `finish set on ${targets.length} panel(s)`;
      break;
    }
    case 'set_stitch': {
      let targets = a.seam && a.seam !== 'all' ? p.seams.filter((s) => s.id === a.seam) : p.seams;
      if (a.garment) { const ids = new Set(p.panels.filter((x) => x.garment === a.garment).map((x) => x.id)); targets = targets.filter((s) => ids.has(s.a.panel)); }
      if (!targets.length) throw new Error(`no matching seams for "${a.seam}"`);
      if (a.stitch && !ASSEMBLY[a.stitch]) throw new Error(`unknown assembly method "${a.stitch}"`);
      if (a.thread && !THREADS[a.thread]) throw new Error(`unknown thread "${a.thread}"`);
      for (const s of targets) {
        if (a.stitch) s.stitch = a.stitch;
        if (a.thread) s.thread = a.thread;
        if (a.threadColor) s.threadColor = a.threadColor;
      }
      result = `updated ${targets.length} seam(s)`;
      break;
    }
    case 'apply_recommendations': {
      let n = 0;
      for (const s of p.seams) {
        const pan = p.panels.find((x) => x.id === s.a.panel);
        if (!pan || (a.garment && pan.garment !== a.garment)) continue;
        const r = recommendFor(pan.fabric, p);
        s.stitch = r.stitch; s.thread = r.thread; n++;
      }
      result = `applied recommendations to ${n} seam(s)`;
      break;
    }
    case 'add_panel': {
      if (!Array.isArray(a.points) || a.points.length < 3) throw new Error('add_panel needs >= 3 points');
      const id = a.id || uid('panel');
      if (p.panels.some((x) => x.id === id)) throw new Error(`panel id "${id}" already exists`);
      p.panels.push({ id, name: a.name || id, role: a.role || 'custom', custom: true, points: a.points.map(([x, y]) => [Number(x), Number(y)]), placement: { position: a.placement?.position || [0, 1, 0.3], rotationY: a.placement?.rotationY || 0, ...(a.placement || {}) }, fabric: a.fabric && fabricExists(p, a.fabric) ? a.fabric : 'cotton-poplin', fabricOverrides: {} });
      result = `panel ${id} added`;
      break;
    }
    case 'update_panel': {
      const pan = panelOf(p, a.id);
      if (a.name) pan.name = a.name;
      if (a.points) {
        if (a.points.length !== pan.points.length) p.seams = p.seams.filter((s) => !['a', 'b'].some((k) => s[k].panel === pan.id && Math.max(s[k].edge, s[k].to ?? 0) >= a.points.length));
        pan.points = a.points.map(([x, y]) => [Number(x), Number(y)]);
      }
      if (a.placement) pan.placement = { ...pan.placement, ...a.placement };
      if (a.fabric) { if (!fabricExists(p, a.fabric)) throw new Error(`unknown fabric "${a.fabric}"`); pan.fabric = a.fabric; }
      if ('rigid' in a) pan.rigid = Boolean(a.rigid);
      break;
    }
    case 'move_point': {
      const pan = panelOf(p, a.panel);
      if (!pan.points[a.index]) throw new Error('point index out of range');
      if (!isNum(a.to?.[0]) || !isNum(a.to?.[1])) throw new Error('move_point needs to: [x, y]');
      pan.points[a.index] = [a.to[0], a.to[1]];
      break;
    }
    case 'insert_point': {
      const pan = panelOf(p, a.panel);
      const e = a.edge;
      if (e < 0 || e >= pan.points.length) throw new Error('edge out of range');
      pan.points.splice(e + 1, 0, [Number(a.at[0]), Number(a.at[1])]);
      for (const s of p.seams) for (const k of ['a', 'b']) if (s[k].panel === pan.id) {
        if (s[k].edge > e) s[k].edge += 1;
        if (s[k].to != null && s[k].to >= e) s[k].to += 1;
      }
      result = `point inserted at index ${e + 1}`;
      break;
    }
    case 'delete_point': {
      const pan = panelOf(p, a.panel);
      if (pan.points.length <= 3) throw new Error('a panel needs at least 3 points');
      const i = a.index;
      pan.points.splice(i, 1);
      const n = pan.points.length;
      p.seams = p.seams.filter((s) => !['a', 'b'].some((k) => s[k].panel === pan.id && s[k].edge === i && (s[k].to ?? i) === i));
      for (const s of p.seams) for (const k of ['a', 'b']) if (s[k].panel === pan.id) {
        if (s[k].edge > i) s[k].edge -= 1;
        if (s[k].to != null && s[k].to >= i) s[k].to = Math.max(s[k].edge, s[k].to - 1);
        s[k].edge = ((s[k].edge % n) + n) % n;
      }
      break;
    }
    case 'remove_panel': {
      panelOf(p, a.id);
      p.panels = p.panels.filter((x) => x.id !== a.id);
      p.seams = p.seams.filter((s) => s.a.panel !== a.id && s.b.panel !== a.id);
      p.trims = p.trims.filter((t) => t.panel !== a.id);
      p.overlays = p.overlays.filter((t) => t.panel !== a.id);
      break;
    }
    case 'add_seam': {
      for (const k of ['a', 'b']) {
        const pan = panelOf(p, a[k]?.panel);
        if (!(a[k].edge >= 0 && a[k].edge < pan.points.length)) throw new Error(`seam ${k}.edge out of range for ${pan.id}`);
      }
      if (a.stitch && !ASSEMBLY[a.stitch]) throw new Error(`unknown assembly method "${a.stitch}"`);
      const id = uid('seam');
      p.seams.push({ id, custom: true, a: { ...a.a }, b: { ...a.b }, stitch: a.stitch || 'lockstitch-301', thread: a.thread || 'poly-corespun', threadColor: a.threadColor || '#d8d2c4' });
      result = `seam ${id} added`;
      break;
    }
    case 'remove_seam':
      p.seams = p.seams.filter((s) => s.id !== a.id);
      break;
    case 'add_trim': {
      const trimType = a.trim || a.trimType || a.trim_type || a.kind;
      if (!TRIMS[trimType]) throw new Error(`add_trim needs trim: one of ${Object.keys(TRIMS).join(', ')}`);
      panelOf(p, a.panel);
      if (!isNum(a.at?.[0]) || !isNum(a.at?.[1])) throw new Error('add_trim needs at: [x, y] in panel cm');
      const id = uid('trim');
      p.trims.push({ id, custom: true, type: trimType, panel: a.panel, at: [a.at[0], a.at[1]], ...(a.to ? { to: a.to } : {}), ...(a.size ? { size: clamp(a.size, 1, 400) } : {}), ...(a.color ? { color: a.color } : {}), ...(a.arch ? { arch: a.arch } : {}) });
      result = `trim ${id} added`;
      break;
    }
    case 'set_trim': {
      const targets = p.trims.filter((t) => (a.id && a.id !== 'all' ? t.id === a.id : true) && (a.match ? t.type === a.match : true));
      if (a.trim && !TRIMS[a.trim]) throw new Error(`unknown trim "${a.trim}"`);
      for (const t of targets) { if (a.trim) t.type = a.trim; if (a.color) t.color = a.color; if (a.size) t.size = a.size; }
      result = `updated ${targets.length} trim(s)`;
      break;
    }
    case 'remove_trim':
      p.trims = p.trims.filter((t) => t.id !== a.id);
      break;
    case 'add_overlay': {
      panelOf(p, a.panel);
      if (!Array.isArray(a.points) || a.points.length < 3) throw new Error('add_overlay needs >= 3 points');
      const id = uid('ov');
      p.overlays.push({ id, custom: true, kind: a.kind || 'patch', style: a.style, panel: a.panel, points: a.points, ...(a.fabric ? { fabric: a.fabric } : {}), ...(a.color ? { color: a.color } : {}) });
      result = `overlay ${id} added`;
      break;
    }
    case 'remove_overlay':
      p.overlays = p.overlays.filter((o) => o.id !== a.id);
      break;
    case 'set_size': {
      if (a.chart) { if (!SIZE_CHARTS[a.chart]) throw new Error(`unknown size chart "${a.chart}"`); p.sizeChart = a.chart; }
      const chart = SIZE_CHARTS[p.sizeChart || 'unisex'];
      if (a.size) { if (!chart.sizes[a.size]) throw new Error(`size must be one of ${Object.keys(chart.sizes).join(', ')}`); p.size = a.size; delete p.customBody; }
      if (a.custom) p.customBody = { ...(chart.sizes[p.size] || chart.sizes.M), ...a.custom };
      regradeProject(p);
      result = `size ${p.customBody ? 'custom' : p.size} (${chart.label})`;
      break;
    }
    case 'new_jewelry': {
      const t = JEWELRY_TEMPLATES[a.template];
      if (!t) throw new Error(`unknown jewelry template "${a.template}"`);
      p.mode = 'jewelry';
      p.name = t.name;
      p.jewelry = clone(t.spec);
      p.jewelry.template = a.template;
      break;
    }
    case 'set_jewelry': {
      if (!p.jewelry) throw new Error('not in jewelry mode: use new_jewelry first');
      const patch = a.patch || {};
      if (patch.metal && !METALS[patch.metal]) throw new Error(`unknown metal "${patch.metal}"`);
      if (patch.link && !LINKS[patch.link]) throw new Error(`unknown link "${patch.link}"`);
      if (patch.clasp && !CLASPS[patch.clasp]) throw new Error(`unknown clasp "${patch.clasp}"`);
      if (patch.metal) delete p.jewelry.alloy;
      for (const [k, v] of Object.entries(patch)) p.jewelry[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(p.jewelry[k] || {}), ...v } : v;
      break;
    }
    case 'set_karat': {
      if (!p.jewelry) throw new Error('not in jewelry mode');
      const k = clamp(Number(a.karat), 8, 24);
      const al = goldAlloy(k, a.colour || 'yellow');
      p.jewelry.alloy = { name: `Gold ${k}k ${a.colour || 'yellow'} (${al.purity}%)`, family: 'gold', karat: k, colour: a.colour || 'yellow', ...al, roughness: 0.16 };
      result = `${p.jewelry.alloy.name}, ${al.density} g/cm³, hallmark ${al.hallmark}`;
      break;
    }
    case 'add_stone': case 'update_stone': {
      if (!p.jewelry) throw new Error('not in jewelry mode');
      if (a.gem && !GEMS[a.gem]) throw new Error(`unknown gem "${a.gem}"`);
      if (a.cut && !CUTS[a.cut]) throw new Error(`unknown cut "${a.cut}"`);
      if (a.setting && !SETTINGS[a.setting]) throw new Error(`unknown setting "${a.setting}"`);
      p.jewelry.stones = p.jewelry.stones || [];
      const { type, index, ...st } = a;
      if (a.type === 'add_stone') p.jewelry.stones.push({ gem: 'diamond', cut: 'round-brilliant', size: 5, setting: 'prong-4', position: 'side', ...st });
      else { if (!p.jewelry.stones[index]) throw new Error('stone index out of range'); Object.assign(p.jewelry.stones[index], st); }
      const last = a.type === 'add_stone' ? p.jewelry.stones[p.jewelry.stones.length - 1] : p.jewelry.stones[index];
      result = `~${caratEstimate(last.cut, last.size, last.width || last.size, last.gem)} ct ${GEMS[last.gem].name}`;
      break;
    }
    case 'remove_stone':
      if (!p.jewelry?.stones?.[a.index]) throw new Error('stone index out of range');
      p.jewelry.stones.splice(a.index, 1);
      break;
    case 'set_custom_shape': {
      if (!p.jewelry) throw new Error('not in jewelry mode');
      if (!Array.isArray(a.points) || a.points.length < 3) throw new Error('need >= 3 points');
      const pts = a.points.map(([x, y]) => [Number(x), Number(y)]);
      if (a.target === 'pendant') p.jewelry.pendant = { ...(p.jewelry.pendant || { thickness: 1.4, bail: 'jump-ring' }), shape: 'custom', points: pts };
      else if (a.target === 'link') { p.jewelry.link = 'custom'; p.jewelry.customLink = pts; }
      else if (a.target === 'signet') p.jewelry.signet = { ...(p.jewelry.signet || {}), shape: 'custom', points: pts };
      else if (a.target === 'stone') { p.jewelry.stones = p.jewelry.stones || [{ gem: 'diamond', setting: 'bezel', position: 'center', size: 8 }]; p.jewelry.stones[a.index || 0] = { ...p.jewelry.stones[a.index || 0], cut: 'custom', outline: pts }; }
      else throw new Error('target must be pendant | stone | link | signet');
      break;
    }
    case 'add_part': {
      if (!p.jewelry) throw new Error('not in jewelry mode');
      if (!a.data) throw new Error('add_part needs data (file contents as a data URL)');
      p.jewelry.parts = p.jewelry.parts || [];
      p.jewelry.parts.push({ id: uid('part'), name: a.name || 'part', data: a.data, material: a.material || p.jewelry.metal || 'silver-925', size: a.size || 15, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], distort: {} });
      result = `part added (#${p.jewelry.parts.length - 1})`;
      break;
    }
    case 'update_part': {
      const part = p.jewelry?.parts?.[a.index];
      if (!part) throw new Error('part index out of range');
      if (a.material && !METALS[a.material] && !GEMS[a.material]) throw new Error(`unknown material "${a.material}" (metal or gem id)`);
      for (const k of ['material', 'size', 'position', 'rotation', 'scale']) if (k in a) part[k] = a[k];
      if (a.distort) part.distort = { ...part.distort, ...a.distort };
      break;
    }
    case 'remove_part':
      if (!p.jewelry?.parts?.[a.index]) throw new Error('part index out of range');
      p.jewelry.parts.splice(a.index, 1);
      break;
    case 'set_production': {
      const pr = p.production;
      if (isNum(a.quantity)) pr.quantity = Math.max(1, Math.round(a.quantity));
      if (Array.isArray(a.sizes)) pr.sizes = a.sizes.map(String);
      if (a.baseSize) pr.baseSize = String(a.baseSize);
      if (a.market) pr.market = String(a.market);
      if ('targetCost' in a) pr.targetCost = a.targetCost;
      break;
    }
    case 'set_sim': {
      const s = p.sim;
      if (isNum(a.gridSize)) s.gridSize = clamp(a.gridSize, 1, 5);
      if (isNum(a.iterations)) s.iterations = Math.round(clamp(a.iterations, 2, 30));
      if (isNum(a.gravity)) s.gravity = clamp(a.gravity, 0, 30);
      if (isNum(a.sewSpeed)) s.sewSpeed = clamp(a.sewSpeed, 0.8, 0.99);
      break;
    }
    default:
      throw new Error(`unknown action type "${a.type}". Known: ${Object.keys(ACTION_DOCS).join(', ')}`);
  }

  const errs = validateProject(p);
  if (errs.length) throw new Error(`invalid result: ${errs.join('; ')}`);
  return { project: p, result };
}

/** Which actions only change looks (no physics rebuild needed). */
export function isLookOnly(type) {
  return ['rename', 'set_finish', 'set_trim', 'set_production', 'add_overlay', 'remove_overlay'].includes(type);
}

export function applyActions(project, actions) {
  let p = project;
  const results = [];
  for (const act of actions || []) {
    try {
      const r = applyAction(p, act);
      p = r.project;
      results.push({ type: act.type, ok: true, result: r.result });
    } catch (e) {
      results.push({ type: act?.type, ok: false, error: e.message });
    }
  }
  return { project: p, results };
}

export { summarizeProject };
