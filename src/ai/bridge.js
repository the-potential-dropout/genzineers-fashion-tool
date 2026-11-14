// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * Live link to the local MCP server / CLI (ws://127.0.0.1:7821). Lets any
 * MCP client (Claude, Codex, Gemini CLI, Cursor, ...) or the gft CLI drive
 * the open app in real time. Messages are JSON:
 *   -> { id, type: 'actions', actions: [...] }   <- { id, results, project }
 *   -> { id, type: 'get_project' }               <- { id, project }
 *   -> { id, type: 'snapshot' }                  <- { id, image }
 *   -> { id, type: 'export', what }              <- { id, data }
 */
export function connectBridge({ url = 'ws://127.0.0.1:7821', store, viewer, exportFn, onStatus }) {
  let ws; let closed = false; let retry = 1000;
  const open = () => {
    try { ws = new WebSocket(url); } catch (e) { onStatus?.('error', e.message); return; }
    ws.onopen = () => { retry = 1000; onStatus?.('connected'); ws.send(JSON.stringify({ type: 'hello', app: 'genzineers-fashion-tool', project: store.get() })); };
    ws.onclose = () => { onStatus?.('disconnected'); if (!closed) setTimeout(open, (retry = Math.min(retry * 2, 15000))); };
    ws.onerror = () => onStatus?.('error');
    ws.onmessage = async (ev) => {
      let m; try { m = JSON.parse(ev.data); } catch { return; }
      const reply = (o) => ws.readyState === 1 && ws.send(JSON.stringify({ id: m.id, ...o }));
      try {
        if (m.type === 'actions') { const results = store.dispatch(m.actions, { source: 'mcp' }); reply({ results, project: store.get() }); }
        else if (m.type === 'get_project') reply({ project: store.get() });
        else if (m.type === 'snapshot') reply({ image: viewer.snapshot(m.width || 1024) });
        else if (m.type === 'export') reply({ data: await exportFn(m.what) });
        else reply({ error: `unknown message type ${m.type}` });
      } catch (e) { reply({ error: e.message }); }
    };
  };
  open();
  return { close() { closed = true; ws?.close(); }, get connected() { return ws?.readyState === 1; } };
}
