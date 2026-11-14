// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Live-link hub (ws://127.0.0.1:7821). The open app connects as "app";
 * MCP servers / the CLI talk to it through here. When no app is connected,
 * actions are applied to a project file instead (headless mode).
 * Binds to localhost only.
 */
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { applyActions } from '../src/core/actions.js';
import { createProject, migrateProject } from '../src/core/project.js';

export const PORT = Number(process.env.GFT_PORT || 7821);

export class Hub {
  constructor(file = process.env.GFT_PROJECT || 'gft-project.json') {
    this.file = file;
    this.project = existsSync(file) ? migrateProject(JSON.parse(readFileSync(file, 'utf8'))) : createProject('crew-tee');
    this.app = null;
    this.pending = new Map();
    this.seq = 0;
    this.remote = null; // when another process already hosts the hub
  }

  async start() {
    try {
      await new Promise((res, rej) => {
        this.wss = new WebSocketServer({ host: '127.0.0.1', port: PORT });
        this.wss.once('listening', res);
        this.wss.once('error', rej);
      });
      this.wss.on('connection', (ws) => this.onConn(ws));
      return 'hosting';
    } catch {
      // someone else hosts it: connect as a controller
      this.remote = await new Promise((res, rej) => { const ws = new WebSocket(`ws://127.0.0.1:${PORT}`); ws.once('open', () => res(ws)); ws.once('error', rej); });
      this.remote.send(JSON.stringify({ type: 'controller' }));
      this.remote.on('message', (d) => this.onReply(JSON.parse(d)));
      return 'client';
    }
  }

  onConn(ws) {
    ws.on('message', (d) => {
      let m; try { m = JSON.parse(d); } catch { return; }
      if (m.type === 'hello') { this.app = ws; if (m.project) this.project = m.project; ws.on('close', () => { if (this.app === ws) this.app = null; }); return; }
      if (m.type === 'controller') { ws.isController = true; return; }
      if (ws.isController) { this.request(m).then((r) => ws.send(JSON.stringify({ ...r, id: m.id }))).catch((e) => ws.send(JSON.stringify({ id: m.id, error: e.message }))); return; }
      this.onReply(m);
    });
  }

  onReply(m) {
    const p = this.pending.get(m.id);
    if (!p) return;
    this.pending.delete(m.id);
    if (m.project) this.project = m.project;
    m.error ? p.rej(new Error(m.error)) : p.res(m);
  }

  get appConnected() { return Boolean(this.app && this.app.readyState === 1) || Boolean(this.remote); }

  /** Send a message to the live app (directly or via the remote hub). */
  request(msg, timeout = 20000) {
    const target = this.remote || (this.app?.readyState === 1 ? this.app : null);
    if (!target) return Promise.reject(new Error('The app is not connected. Open Genzineers Fashion Tool and enable AI → Connect → Live link.'));
    const id = `r${++this.seq}`;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      target.send(JSON.stringify({ ...msg, id }));
      setTimeout(() => { if (this.pending.delete(id)) rej(new Error('Timed out waiting for the app')); }, timeout);
    });
  }

  /** Apply actions live if possible, else to the project file. */
  async apply(actions) {
    if (this.appConnected) {
      try { const r = await this.request({ type: 'actions', actions }); return { results: r.results, live: true }; } catch (e) { if (!/not connected/.test(e.message)) throw e; }
    }
    const r = applyActions(this.project, actions);
    this.project = r.project;
    this.save();
    return { results: r.results, live: false };
  }

  async getProject() {
    if (this.appConnected) { try { return (await this.request({ type: 'get_project' })).project; } catch { /* fall back */ } }
    return this.project;
  }

  save() { try { writeFileSync(this.file, JSON.stringify(this.project, null, 1)); } catch { /* read-only */ } }
}
