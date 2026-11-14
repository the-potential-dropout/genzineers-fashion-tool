// Digitise a synthetic two-colour design and prove the .DST file reproduces every stitch.
import { digitize, writeDST, readDST, PX_PER_MM, STITCH_TYPES } from '../src/make/embroidery.js';
const w = 60 * PX_PER_MM; const h = 40 * PX_PER_MM; const data = new Uint8Array(w * h).fill(255);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = x - w * 0.3; const dy = y - h / 2; if (dx * dx + dy * dy < (h * 0.4) ** 2) data[y * w + x] = 0; else if (x > w * 0.62 && x < w * 0.95 && y > h * 0.2 && y < h * 0.8) data[y * w + x] = 1; }
const bmp = { w, h, data, colors: ['#d0202e', '#152447'], widthMm: 60, heightMm: 40 };
let bad = 0;
for (const type of Object.keys(STITCH_TYPES)) {
  const { cmds, stats } = digitize(bmp, { type });
  const dst = writeDST(cmds, 'TEST');
  const back = readDST(dst);
  // walk both and compare the needle positions
  const want = cmds.filter((c) => c.x != null);
  let err = 0; let i = 0; let longest = 0; let px = 0; let py = 0;
  for (const p of back) { const d = Math.hypot(p.x - px, p.y - py); if (!p.jump) longest = Math.max(longest, d); px = p.x; py = p.y; }
  const ends = back.filter((p, k) => { const c = want[i]; if (c && Math.hypot(p.x - c.x, p.y - c.y) < 0.11) { i++; return true; } return false; }).length;
  if (ends !== want.length) err++;
  const head = String.fromCharCode(...dst.slice(0, 40));
  const ok = !err && stats.stitches > 50 && longest <= 12.2 && head.startsWith('LA:TEST') && back.filter((p) => p.color).length === stats.colorChanges;
  if (!ok) bad++;
  console.log(`${type.padEnd(9)} ${String(stats.stitches).padStart(6)} stitches, ${stats.colors.length} colours, ${stats.threadM.toFixed(1)} m, longest stitch ${longest.toFixed(1)} mm, DST ${dst.length} bytes, round-trip ${ends}/${want.length}${ok ? '' : '  <-- CHECK'}`);
}
console.log(`${bad} embroidery failure(s)`);
process.exit(bad ? 1 : 0);
