// Renders the app icon (1024x1024 PNG) without dependencies: gradient tile + needle + thread.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
const S = 1024; const px = Buffer.alloc(S * S * 4);
const lerp = (a, b, t) => a + (b - a) * t;
const R = 220; // corner radius
function inRounded(x, y) { const m = 40; const x0 = m, y0 = m, x1 = S - m, y1 = S - m; if (x < x0 || x > x1 || y < y0 || y > y1) return false; const cx = Math.min(Math.max(x, x0 + R), x1 - R); const cy = Math.min(Math.max(y, y0 + R), y1 - R); return (x - cx) ** 2 + (y - cy) ** 2 <= R * R; }
const segDist = (x, y, ax, ay, bx, by) => { const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2))); return Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t)); };
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const i = (y * S + x) * 4;
  // 4x supersample edge
  let cov = 0; for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) cov += inRounded(x + sx * 0.5, y + sy * 0.5) ? 1 : 0;
  if (!cov) continue;
  const t = (x + y) / (2 * S);
  let r = lerp(255, 255, t), g = lerp(90, 45, t), b = lerp(31, 135, t);
  // needle: diagonal bar + eye
  const dn = segDist(x, y, 290, 734, 724, 300);
  const eye = Math.abs(Math.hypot(x - 704, y - 320) - 52);
  // thread: dashed arc
  const ang = Math.atan2(y - 520, x - 360); const dArc = Math.abs(Math.hypot(x - 360, y - 520) - 190);
  const thread = dArc < 14 && ang > -2.6 && ang < -0.3 && Math.floor((ang + 4) * 9) % 2 === 0;
  if (dn < 34 || eye < 16 || thread) { r = 255; g = 255; b = 255; }
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = Math.round((cov / 4) * 255);
}
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) { raw[y * (S * 4 + 1)] = 0; px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4); }
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = (b) => { let c = -1; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4); ihdr[8] = 8; ihdr[9] = 6;
writeFileSync(process.argv[2] || 'app-icon.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
