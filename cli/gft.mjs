#!/usr/bin/env node
// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * gft: command line for Genzineers Fashion Tool.
 *
 *   gft "a cropped boxy hoodie in sage french terry"     prompt an AI (uses env keys)
 *   gft do set_option '{"key":"cuff","value":"rib"}'     run an action directly
 *   gft new waxed-field-jacket | gft new --jewelry cuban-chain
 *   gft list templates|fabrics|...                       catalog
 *   gft check | gft export techpack|dxf|svg|bom|json [file]
 *
 * AI options: --provider anthropic|openai|gemini|openrouter|ollama|lmstudio|... --model <id>
 *             --scope shape,construction,materials,color,prints,trims,jewelry,production
 * Keys from env: ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY, DEEPSEEK_API_KEY, XAI_API_KEY, TOGETHER_API_KEY
 * Drives the open app live when its Live link is on; otherwise edits ./gft-project.json
 */
import { writeFileSync } from 'node:fs';
import { Hub } from '../mcp-server/hub.mjs';
import { catalog, summarizeProject } from '../src/core/actions.js';
import { checkProject } from '../src/core/guidance.js';
import { PROVIDERS, chat } from '../src/ai/providers.js';
import { SCOPES, systemPrompt, parseActions, filterActions } from '../src/ai/assistant.js';
import { techPackHTML, patternDXF, patternSVG, bomCSV } from '../src/make/production.js';

const args = process.argv.slice(2);
const flag = (name, d) => { const i = args.indexOf(`--${name}`); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const bool = (name) => { const i = args.indexOf(`--${name}`); if (i < 0) return false; args.splice(i, 1); return true; };

const ENV = { anthropic: 'ANTHROPIC_API_KEY', openai: 'OPENAI_API_KEY', gemini: 'GEMINI_API_KEY', openrouter: 'OPENROUTER_API_KEY', groq: 'GROQ_API_KEY', mistral: 'MISTRAL_API_KEY', deepseek: 'DEEPSEEK_API_KEY', xai: 'XAI_API_KEY', together: 'TOGETHER_API_KEY' };
const autoProvider = () => Object.keys(ENV).find((k) => process.env[ENV[k]]) || 'ollama';

const provider = flag('provider', process.env.GFT_PROVIDER || autoProvider());
const model = flag('model', process.env.GFT_MODEL);
const scopeArg = flag('scope', Object.keys(SCOPES).join(','));
const jewelry = bool('jewelry');
const cmd = args[0];

const hub = new Hub();
await hub.start();
const out = (o) => console.log(typeof o === 'string' ? o : JSON.stringify(o, null, 2));

try {
  if (!cmd || cmd === 'help' || cmd === '--help') {
    out(`gft - Genzineers Fashion Tool CLI\n\n  gft "<prompt>"                 design with AI (provider: ${provider})\n  gft do <action> '<json>'       apply an action\n  gft new <template> [--jewelry] start a design\n  gft list <section>             catalog (${Object.keys(catalog()).join(', ')})\n  gft show | check | export <techpack|dxf|svg|bom|json> [file]\n\nLive app: ${hub.appConnected ? 'connected' : 'not connected (editing gft-project.json)'}`);
  } else if (cmd === 'list') {
    out(catalog()[args[1]] || Object.keys(catalog()));
  } else if (cmd === 'show') {
    const p = await hub.getProject(); out(p.mode === 'jewelry' ? p.jewelry : summarizeProject(p));
  } else if (cmd === 'new') {
    out(await hub.apply([{ type: jewelry ? 'new_jewelry' : 'new_garment', template: args[1] }]));
  } else if (cmd === 'do') {
    out(await hub.apply([{ type: args[1], ...(args[2] ? JSON.parse(args[2]) : {}) }]));
  } else if (cmd === 'check') {
    out(checkProject(await hub.getProject()));
  } else if (cmd === 'export') {
    const p = await hub.getProject();
    const what = args[1] || 'techpack';
    const data = { techpack: () => techPackHTML(p), dxf: () => patternDXF(p), svg: () => patternSVG(p), bom: () => bomCSV(p), json: () => JSON.stringify(p, null, 1) }[what]();
    const file = args[2] || `${p.name.replace(/[^\w-]+/g, '_')}.${{ techpack: 'html', dxf: 'dxf', svg: 'svg', bom: 'csv', json: 'json' }[what]}`;
    writeFileSync(file, data); out(`Wrote ${file}`);
  } else {
    // prompt mode
    const prompt = args.join(' ');
    const P = PROVIDERS[provider];
    if (!P) throw new Error(`Unknown provider ${provider}. Options: ${Object.keys(PROVIDERS).join(', ')}`);
    const key = process.env[ENV[provider]] || '';
    if (P.needsKey && !key) throw new Error(`Set ${ENV[provider]} (or use --provider ollama for a local model)`);
    const scope = Object.fromEntries(Object.keys(SCOPES).map((k) => [k, scopeArg.split(',').includes(k)]));
    const p = await hub.getProject();
    const reply = await chat({ provider, model: model || P.models[0], key }, systemPrompt(p, scope), [{ role: 'user', content: prompt }]);
    const { kept, dropped } = filterActions(parseActions(reply), scope);
    console.log(reply.replace(/```(?:json)?[\s\S]*?```/g, '').trim());
    if (kept.length) { const r = await hub.apply(kept); out(`\nApplied ${r.results.filter((x) => x.ok).length}/${r.results.length} change(s) ${r.live ? 'in the open app' : 'to gft-project.json'}`); for (const x of r.results.filter((y) => !y.ok)) out(`  skipped ${x.type}: ${x.error}`); }
    if (dropped.length) out(`Not applied (outside --scope): ${[...new Set(dropped)].join(', ')}`);
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exitCode = 1;
}
process.exit();
