// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * App state: one project, undo/redo, autosave. Every change (UI, AI chat,
 * CLI, MCP live link) goes through dispatch() so it is undoable.
 */
import { applyActions, isLookOnly } from '../core/actions.js';
import { createProject, migrateProject } from '../core/project.js';

const KEY = 'gft.project.v2';
const safe = (fn, fb) => { try { return fn(); } catch { return fb; } };

export function createStore() {
  let project = safe(() => { const s = localStorage.getItem(KEY); return s ? migrateProject(JSON.parse(s)) : null; }, null) || createProject('crew-tee');
  project.mode = project.mode || 'clothing';
  const undo = [];
  const redo = [];
  const subs = new Set();
  let saveTimer;
  const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => safe(() => localStorage.setItem(KEY, JSON.stringify(project))), 400); };
  const emit = (info) => { for (const s of subs) s(project, info); };
  return {
    get: () => project,
    subscribe: (fn) => (subs.add(fn), () => subs.delete(fn)),
    /** Apply actions; returns per-action results. */
    dispatch(actions, { source = 'ui' } = {}) {
      const list = Array.isArray(actions) ? actions : [actions];
      const r = applyActions(project, list);
      if (r.results.some((x) => x.ok)) {
        undo.push(project); if (undo.length > 80) undo.shift();
        redo.length = 0;
        project = r.project;
        save();
        emit({ lookOnly: list.every((a) => isLookOnly(a.type)), source, results: r.results });
      }
      return r.results;
    },
    replace(p, source = 'import') { undo.push(project); project = migrateProject(p); project.mode = project.mode || 'clothing'; save(); emit({ source }); },
    undo() { if (!undo.length) return; redo.push(project); project = undo.pop(); save(); emit({ source: 'undo' }); },
    redo() { if (!redo.length) return; undo.push(project); project = redo.pop(); save(); emit({ source: 'redo' }); },
    canUndo: () => undo.length > 0,
    canRedo: () => redo.length > 0,
  };
}

/** Small persistent settings bag (API keys stay on this device only). */
export const settings = {
  get(k, d) { return safe(() => { const v = localStorage.getItem(`gft.s.${k}`); return v == null ? d : JSON.parse(v); }, d); },
  set(k, v) { safe(() => localStorage.setItem(`gft.s.${k}`, JSON.stringify(v))); },
};
