// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * "My collection": every design you save, kept on this device in IndexedDB
 * (large, fast, works offline in every modern browser and in the desktop app).
 * Falls back to memory if storage is blocked (private windows).
 * Item: { id, name, kind: 'garment'|'outfit'|'jewelry', thumb, project, tags, created, updated }
 */
const DB = 'gft';
const STORE = 'designs';
let dbp;
const mem = new Map();

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
      r.onblocked = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
async function tx(mode, fn) {
  const db = await open();
  if (!db) return fn(null);
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode);
    const s = t.objectStore(STORE);
    const out = fn(s);
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  });
}

export function kindOf(project) {
  if (project.mode === 'jewelry') return 'jewelry';
  return (project.garments || []).length > 1 ? 'outfit' : 'garment';
}

export const collection = {
  async list() {
    const all = await tx('readonly', (s) => (s ? s.getAll() : { result: [...mem.values()] }));
    return (all || []).sort((a, b) => b.updated - a.updated);
  },
  async get(id) { return tx('readonly', (s) => (s ? s.get(id) : { result: mem.get(id) })); },
  async put(item) {
    const now = Date.now();
    const it = { tags: [], created: now, ...item, updated: now };
    it.id = it.id || `d_${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await tx('readwrite', (s) => (s ? s.put(it) : mem.set(it.id, it)));
    return it;
  },
  async remove(id) { await tx('readwrite', (s) => (s ? s.delete(id) : mem.delete(id))); },
  async save(project, thumb, { id, name } = {}) {
    const prev = id ? await this.get(id) : null;
    return this.put({ ...(prev || {}), id, name: name || project.name, kind: kindOf(project), thumb, project: JSON.parse(JSON.stringify(project)) });
  },
  async duplicate(id) {
    const it = await this.get(id);
    if (!it) return null;
    const { id: _, created, ...rest } = it;
    return this.put({ ...rest, name: `${it.name} (copy)` });
  },
  async exportAll() { return JSON.stringify({ format: 'gft-collection', version: 1, items: await this.list() }); },
  async importAll(text) {
    const data = JSON.parse(text);
    const items = data.format === 'gft-collection' ? data.items : data.panels || data.jewelry ? [{ name: data.name, project: data, kind: kindOf(data) }] : [];
    if (!items.length) throw new Error('not a collection or project file');
    for (const it of items) { const { id, ...rest } = it; await this.put({ ...rest, id: (await this.get(id)) ? undefined : id }); }
    return items.length;
  },
};
