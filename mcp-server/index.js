#!/usr/bin/env node
// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Genzineers Fashion Tool MCP server (stdio).
 * Lets Claude, Codex, Gemini CLI, Cursor, Windsurf, VS Code agents, or any
 * MCP client design clothing, hats, bags and jewelry, live in the open app
 * or headless on a project file.
 *
 *   claude mcp add genzineers-fashion -- node /path/to/repo/mcp-server/index.js
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Hub } from './hub.mjs';
import { catalog, summarizeProject, ACTION_DOCS } from '../src/core/actions.js';
import { checkProject, recommendFor } from '../src/core/guidance.js';
import { migrateProject } from '../src/core/project.js';
import { techPackHTML, patternDXF, patternSVG, bomCSV, tiledPrintHTML, GUIDE, rfqTemplates } from '../src/make/production.js';

const hub = new Hub();
const mode = await hub.start();

const server = new McpServer({ name: 'genzineers-fashion-tool', version: '0.1.0' }, {
  instructions: 'Design garments, hats, bags and jewelry with the Genzineers Fashion Tool. Typical flow: get_catalog → new_design → apply_actions (fabric, stitches, finish, trims, size) → check_design → export (tech pack, DXF pattern, BOM). Use industry-default choices unless the user asks otherwise and explain them briefly. If the app is open with Live link on, changes appear instantly and snapshot returns the 3D view.',
});

const text = (t) => ({ content: [{ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t, null, 1) }] });

server.registerTool('get_catalog', {
  description: 'List available ids. section: templates | generators | fabrics | fabricFamilies | blends | fibers | insulation | waterproof | assembly | threads | trims | stiffeners | dyes | printMethods | printDesigns | paints | sizeCharts | jewelryTemplates | metals | gems | cuts | settings | links | clasps | actions. Omit section for the list of sections.',
  inputSchema: { section: z.string().optional() },
}, async ({ section }) => {
  const c = catalog();
  if (!section) return text({ sections: Object.keys(c), actions: ACTION_DOCS });
  if (!c[section]) return text(`Unknown section. Use one of: ${Object.keys(c).join(', ')}`);
  return text(c[section]);
});

server.registerTool('get_project', { description: 'Summary of the current design (or full JSON with full=true).', inputSchema: { full: z.boolean().optional() } }, async ({ full }) => {
  const p = await hub.getProject();
  if (full) return text(p.mode === 'jewelry' ? { ...p, jewelry: { ...p.jewelry, parts: (p.jewelry.parts || []).map(({ data, ...r }) => r) } } : p);
  return text(p.mode === 'jewelry' ? { mode: 'jewelry', name: p.name, jewelry: { ...p.jewelry, parts: (p.jewelry.parts || []).map(({ data, ...r }) => r) } } : summarizeProject(p));
});

server.registerTool('new_design', {
  description: 'Start a new design from a template (clothing / hats / bags templates, or a jewelry template with jewelry=true). See get_catalog templates / jewelryTemplates.',
  inputSchema: { template: z.string(), jewelry: z.boolean().optional() },
}, async ({ template, jewelry }) => text(await hub.apply([{ type: jewelry ? 'new_jewelry' : 'new_garment', template }])));

server.registerTool('apply_actions', {
  description: `Apply one or more design actions. Each action is {type, ...params}. Types: ${Object.entries(ACTION_DOCS).map(([k, v]) => `${k} ${v}`).join(' | ')}`,
  inputSchema: { actions: z.array(z.record(z.any())) },
}, async ({ actions }) => text(await hub.apply(actions)));

server.registerTool('recommend', { description: 'Industry-default construction for a fabric id (stitch, thread, needle, SPI, dye, print, care) with reasons.', inputSchema: { fabric: z.string() } }, async ({ fabric }) => text(recommendFor(fabric)));

server.registerTool('check_design', { description: 'Run factory-style checks (wrong dye for fibre, weak thread on leather, untaped waterproof seams, missing care label...).', inputSchema: {} }, async () => {
  const p = await hub.getProject();
  return text(p.mode === 'jewelry' ? 'Jewelry checks: see export spec.' : checkProject(p));
});

server.registerTool('export', {
  description: 'Write production files. what: techpack (HTML, print to PDF) | dxf | svg | tiled-a4 | tiled-letter | bom (CSV) | json. Returns the file path.',
  inputSchema: { what: z.enum(['techpack', 'dxf', 'svg', 'tiled-a4', 'tiled-letter', 'bom', 'json']), path: z.string().optional() },
}, async ({ what, path }) => {
  const p = await hub.getProject();
  const ext = { techpack: 'html', dxf: 'dxf', svg: 'svg', 'tiled-a4': 'html', 'tiled-letter': 'html', bom: 'csv', json: 'json' }[what];
  let image;
  if (what === 'techpack' && hub.appConnected) { try { image = (await hub.request({ type: 'snapshot', width: 1000 })).image; } catch { /* no image */ } }
  const data = { techpack: () => techPackHTML(p, { image }), dxf: () => patternDXF(p), svg: () => patternSVG(p), 'tiled-a4': () => tiledPrintHTML(p, 'A4'), 'tiled-letter': () => tiledPrintHTML(p, 'Letter'), bom: () => bomCSV(p), json: () => JSON.stringify(p, null, 1) }[what]();
  const out = resolve(path || `${p.name.replace(/[^\w-]+/g, '_')}-${what}.${ext}`);
  writeFileSync(out, data);
  return text(`Wrote ${out}`);
});

server.registerTool('snapshot', { description: 'PNG of the current 3D view (needs the app open with Live link on).', inputSchema: { width: z.number().optional() } }, async ({ width }) => {
  const r = await hub.request({ type: 'snapshot', width: width || 1024 });
  return { content: [{ type: 'image', data: r.image.split(',')[1], mimeType: 'image/png' }] };
});

server.registerTool('production_guide', { description: 'Step-by-step guide to manufacturing, plus ready-to-send RFQ emails for this design.', inputSchema: {} }, async () => text({ steps: GUIDE, rfq: rfqTemplates(await hub.getProject()) }));

server.registerTool('load_project', { description: 'Load a project JSON file from disk (headless mode, or pushes it to the app).', inputSchema: { path: z.string() } }, async ({ path }) => {
  const p = migrateProject(JSON.parse(readFileSync(resolve(path), 'utf8')));
  hub.project = p; hub.save();
  return text(`Loaded ${p.name}${hub.appConnected ? ' (open it in the app with File → Open to see it there)' : ''}`);
});

server.registerTool('status', { description: 'Is the app live-linked?', inputSchema: {} }, async () => text({ hub: mode, appConnected: hub.appConnected, projectFile: resolve(hub.file) }));

await server.connect(new StdioServerTransport());
