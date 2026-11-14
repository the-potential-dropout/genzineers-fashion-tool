// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.

/**
 * File viewer: open any export inside the app before (or instead of)
 * downloading it. Documents, tables and code are editable, with undo / redo
 * (Ctrl+Z / Ctrl+Y and on-screen arrows), "Reset edits" and "Save edits"
 * (saved edits are what gets downloaded and what goes into the
 * manufacturing pack). Downloads ask where to save and confirm on screen.
 */
import { readDST } from '../make/embroidery.js';

const edits = new Map(); // file name -> edited text (this session)
export const editedText = (name) => edits.get(name);

const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v); } for (const k of kids.flat()) if (k != null && k !== false) e.append(k); return e; };
const toast = (msg, ms = 3200) => { const t = el('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), ms); };

/** Save a file: asks for the folder where the browser allows it, and says so when it is done. */
export async function saveAs(name, data, type = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  if (window.showSaveFilePicker) {
    try {
      const ext = (name.match(/\.[\w.-]+$/) || ['.bin'])[0].split('.').pop();
      const handle = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: `${ext.toUpperCase()} file`, accept: { [blob.type && !blob.type.includes(';') ? blob.type : 'application/octet-stream']: [`.${ext}`] } }] });
      const w = await handle.createWritable(); await w.write(blob); await w.close();
      toast(`Downloaded: ${handle.name}`);
      return true;
    } catch (e) { if (e?.name === 'AbortError') { toast('Download cancelled'); return false; } /* fall through to a normal download */ }
  }
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`Downloaded: ${name} (in your Downloads folder)`);
  return true;
}

const csvParse = (t) => { const rows = []; let row = []; let cur = ''; let q = false; for (let i = 0; i < t.length; i++) { const c = t[i]; if (q) { if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c; } if (cur || row.length) { row.push(cur); rows.push(row); } return rows; };
const csvText = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\r\n');

/**
 * Open the viewer. data: string, Blob or Uint8Array (or a function returning one, possibly async).
 */
export async function viewFile(name, type, data) {
  let src = typeof data === 'function' ? await data() : data;
  const lower = name.toLowerCase();
  const kind = /\.html?$/.test(lower) ? 'html' : /\.csv$/.test(lower) ? 'csv' : /\.svg$/.test(lower) ? 'svg' : /\.(txt|k|dxf|json|md)$/.test(lower) ? 'text' : /\.(png|jpe?g|webp)$/.test(lower) ? 'image' : /\.dst$/.test(lower) ? 'dst' : 'binary';
  const textual = ['html', 'csv', 'svg', 'text'].includes(kind);
  if (textual && typeof src !== 'string') src = src instanceof Blob ? await src.text() : new TextDecoder().decode(src);
  const original = src;
  let current = textual ? edits.get(name) ?? original : original;
  const undo = []; const redo = [];
  let apply = () => {}; // push `current` into the view
  let read = () => current; // pull the view into text
  const back = el('div', { class: 'modal-back' });
  const badge = el('span', { class: 's', style: 'color:var(--accent);font-size:12px' });
  const mark = () => { badge.textContent = textual && current !== original ? (edits.get(name) === current ? 'edited · saved' : 'edited · not saved') : ''; bUndo.disabled = !undo.length; bRedo.disabled = !redo.length; };
  const commit = () => { const now = read(); if (now === current) return; undo.push(current); if (undo.length > 200) undo.shift(); redo.length = 0; current = now; mark(); };
  const doUndo = () => { commit(); if (!undo.length) return; redo.push(current); current = undo.pop(); apply(); mark(); };
  const doRedo = () => { if (!redo.length) return; undo.push(current); current = redo.pop(); apply(); mark(); };
  const bUndo = el('button', { class: 'btn ghost icon', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', onclick: doUndo }, '↶');
  const bRedo = el('button', { class: 'btn ghost icon', title: 'Redo (Ctrl+Y)', 'aria-label': 'Redo', onclick: doRedo }, '↷');
  const close = () => { removeEventListener('keydown', keys, true); back.remove(); };
  const keys = (e) => { const mod = e.ctrlKey || e.metaKey; if (e.key === 'Escape') { e.stopPropagation(); close(); } else if (textual && mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); e.shiftKey ? doRedo() : doUndo(); } else if (textual && mod && e.key.toLowerCase() === 'y') { e.preventDefault(); e.stopPropagation(); doRedo(); } else if (textual && mod && e.key.toLowerCase() === 's') { e.preventDefault(); e.stopPropagation(); save(); } };
  const save = () => { commit(); if (current === original) edits.delete(name); else edits.set(name, current); mark(); toast(current === original ? 'No edits to save' : 'Edits saved: downloads and the manufacturing pack will use your version'); };
  const body = el('div', { class: 'fv-body' });
  const blobOf = () => (textual ? new Blob([read()], { type: type || 'text/plain' }) : src instanceof Blob ? src : new Blob([src], { type }));

  if (kind === 'html') {
    const fr = el('iframe', { class: 'fv-frame', title: name });
    body.append(fr);
    apply = () => { fr.srcdoc = current; fr.onload = () => { try { const d = fr.contentDocument; d.designMode = 'on'; d.addEventListener('input', () => { clearTimeout(fr._t); fr._t = setTimeout(commit, 500); }); d.addEventListener('keydown', keys, true); } catch { /* read-only */ } }; };
    read = () => { try { const d = fr.contentDocument; return d && d.body && d.body.childNodes.length ? `<!doctype html>\n${d.documentElement.outerHTML}` : current; } catch { return current; } };
  } else if (kind === 'csv') {
    const wrap = el('div', { class: 'fv-table' });
    body.append(wrap);
    apply = () => { const rows = csvParse(current); const w = Math.max(...rows.map((r) => r.length)); wrap.replaceChildren(el('table', {}, rows.map((r, i) => el('tr', {}, Array.from({ length: w }, (_, c) => el(i ? 'td' : 'th', { contenteditable: 'true', oninput: () => { clearTimeout(wrap._t); wrap._t = setTimeout(commit, 500); } }, r[c] ?? '')))))); };
    read = () => { const t = wrap.querySelector('table'); return t ? csvText([...t.rows].map((r) => [...r.cells].map((c) => c.textContent))) : current; };
  } else if (textual) {
    const ta = el('textarea', { class: 'fv-text', spellcheck: 'false' });
    const pv = kind === 'svg' ? el('div', { class: 'fv-svg' }) : null;
    const show = () => { if (pv) { const u = URL.createObjectURL(new Blob([ta.value], { type: 'image/svg+xml' })); pv.replaceChildren(el('img', { src: u, alt: name })); setTimeout(() => URL.revokeObjectURL(u), 5000); } };
    ta.addEventListener('input', () => { clearTimeout(ta._t); ta._t = setTimeout(() => { commit(); show(); }, 400); });
    if (pv) body.append(pv); body.append(ta);
    apply = () => { ta.value = current; show(); };
    read = () => ta.value;
  } else if (kind === 'image') {
    body.append(el('img', { class: 'fv-img', alt: name, src: URL.createObjectURL(blobOf()) }));
  } else if (kind === 'dst') {
    // plot the stitches the machine will sew
    const bytes = src instanceof Blob ? new Uint8Array(await src.arrayBuffer()) : src;
    const pts = readDST(bytes); const cv = el('canvas', { class: 'fv-img', width: 900, height: 600 }); const g = cv.getContext('2d');
    const xs = pts.map((p) => p.x); const ys = pts.map((p) => p.y); const minX = Math.min(...xs, 0); const maxX = Math.max(...xs, 1); const minY = Math.min(...ys, 0); const maxY = Math.max(...ys, 1);
    const k = Math.min(860 / (maxX - minX || 1), 560 / (maxY - minY || 1)); const X = (x) => 20 + (x - minX) * k; const Y = (y) => 580 - (y - minY) * k;
    g.fillStyle = '#f6f4ef'; g.fillRect(0, 0, 900, 600);
    const cols = ['#c0202e', '#152447', '#1f9d4d', '#e5b12d', '#6f3fa0', '#0f7c82', '#f08a24', '#111111']; let ci = 0; let px = 0; let py = 0; let n = 0;
    for (const p of pts) { if (p.color) ci++; if (!p.jump && !p.color) { g.strokeStyle = cols[ci % cols.length]; g.lineWidth = 0.7; g.beginPath(); g.moveTo(X(px), Y(py)); g.lineTo(X(p.x), Y(p.y)); g.stroke(); n++; } px = p.x; py = p.y; }
    body.append(cv, el('div', { class: 's', style: 'color:var(--muted);margin-top:6px' }, `${n.toLocaleString()} stitches · ${(maxX - minX).toFixed(1)} × ${(maxY - minY).toFixed(1)} mm · ${ci + 1} thread colour(s) (plot colours are only to tell the threads apart; see the run sheet for the real sequence). Tajima .DST is a machine file and is not edited here.`));
  } else {
    const size = src instanceof Blob ? src.size : src.length;
    body.append(el('div', { class: 'empty' }, `${name}: binary file, ${(size / 1024).toFixed(0)} KB. Download it to open it in its own program${/\.glb$/.test(lower) ? ' (Blender, Windows 3D Viewer, any GLB viewer)' : /\.zip$/.test(lower) ? ' (it contains every file for the manufacturer)' : ''}.`));
  }
  back.append(el('div', { class: 'modal wide fv', role: 'dialog', 'aria-modal': 'true', 'aria-label': `File viewer: ${name}` },
    el('div', { class: 'fv-head' },
      el('b', { class: 'fv-name', title: name }, name), badge, el('div', { class: 'spacer' }),
      textual ? bUndo : null, textual ? bRedo : null,
      textual ? el('button', { class: 'btn sm', title: 'Throw away every edit and go back to the generated file', onclick: () => { commit(); if (current === original) return toast('Nothing to reset'); undo.push(current); redo.length = 0; current = original; edits.delete(name); apply(); mark(); toast('Edits reset'); } }, 'Reset edits') : null,
      textual ? el('button', { class: 'btn sm', title: 'Keep these edits (Ctrl+S)', onclick: save }, 'Save edits') : null,
      kind === 'html' ? el('button', { class: 'btn sm', title: 'Print or save as PDF', onclick: () => { const w = window.open('', '_blank'); if (w) { w.document.open(); w.document.write(read()); w.document.close(); setTimeout(() => w.print(), 400); } } }, 'Print / PDF') : null,
      el('button', { class: 'btn sm primary', onclick: () => { if (textual) commit(); saveAs(name, blobOf(), type); } }, 'Download…'),
      el('button', { class: 'btn ghost icon', 'aria-label': 'Close', onclick: close }, '✕')),
    textual ? el('div', { class: 's', style: 'font-size:12px;color:var(--muted);margin:2px 0 8px' }, kind === 'html' ? 'Click anywhere in the document to edit the text.' : kind === 'csv' ? 'Click a cell to edit it.' : 'Edit the file directly.', ' Undo: Ctrl+Z or ↶ · Redo: Ctrl+Y or ↷.') : null,
    body));
  back.addEventListener('click', (e) => { if (e.target === back) close(); });
  document.body.append(back);
  addEventListener('keydown', keys, true);
  apply(); mark();
}
