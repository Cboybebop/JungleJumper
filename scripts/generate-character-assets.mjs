import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const FRAME = 32;
const FRAME_COUNT = 24;

const C = {
  outline: '#211936', warm: '#3D2440', highlight: '#FFE6A3', white: '#FFFFFF',
  blue: '#4A90D9', green: '#2ECC71', orange: '#F39C12', red: '#E74C3C',
  frog: '#27AE60', belly: '#82E0AA', navy: '#2C3E50', cool: '#334B68',
  teal: '#1ABC9C', tealDark: '#16A085', shield: '#00BFFF',
};

const rgba = (hex, alpha = 255) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255, alpha];
};

class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }
  pixel(x, y, color) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.data.set(color, (y * this.width + x) * 4);
  }
  blit(source, dx, dy, scale = 1) {
    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
      const p = (y * source.width + x) * 4;
      if (!source.data[p + 3]) continue;
      const color = source.data.slice(p, p + 4);
      for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
        this.pixel(dx + x * scale + sx, dy + y * scale + sy, color);
      }
    }
  }
}

const mask = () => new Set();
const key = (x, y) => `${Math.round(x)},${Math.round(y)}`;
const dot = (m, x, y) => m.add(key(x, y));
function ellipse(m, cx, cy, rx, ry) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) dot(m, x, y);
    }
  }
}
function rect(m, x, y, w, h) {
  for (let py = y; py < y + h; py++) for (let px = x; px < x + w; px++) dot(m, px, py);
}
function line(m, x0, y0, x1, y1, thickness = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const x = x0 + (x1 - x0) * (i / Math.max(1, steps));
    const y = y0 + (y1 - y0) * (i / Math.max(1, steps));
    ellipse(m, x, y, thickness / 2, thickness / 2);
  }
}
function triangle(m, ax, ay, bx, by, cx, cy) {
  const minX = Math.floor(Math.min(ax, bx, cx)); const maxX = Math.ceil(Math.max(ax, bx, cx));
  const minY = Math.floor(Math.min(ay, by, cy)); const maxY = Math.ceil(Math.max(ay, by, cy));
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const s = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / area;
    const t = ((x - ax) * (cy - ay) - (y - ay) * (cx - ax)) / area;
    if (s >= 0 && t >= 0 && s + t <= 1) dot(m, x, y);
  }
}
function paint(canvas, m, color) {
  for (const p of m) { const [x, y] = p.split(',').map(Number); canvas.pixel(x, y, color); }
}
function silhouette(canvas, m, fill) {
  const border = mask();
  for (const p of m) {
    const [x, y] = p.split(',').map(Number);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) dot(border, x + ox, y + oy);
  }
  paint(canvas, border, rgba(C.outline));
  paint(canvas, m, rgba(fill));
}

const POSES = [
  { bob: 0 }, { bob: 1, secondary: 1 }, { bob: 3, squash: 2 },
  { bob: -1, stretch: 2, secondary: 2 }, { bob: -2, stretch: 1, secondary: -2 },
  { bob: -2, secondary: 1 }, { bob: -1, secondary: -1 }, { bob: 0, secondary: 2 },
  { bob: 3, squash: 3 }, { bob: 1, squash: 1 },
  { run: -3, secondary: -2 }, { run: 3, bob: 1, secondary: 2 },
  { run: -2, secondary: 1 }, { run: 2, bob: 1, secondary: -1 },
  { bob: -1, stretch: 1, secondary: 3 }, { bob: -2, secondary: -3 },
  { bob: -3, stretch: 3, secondary: 2 }, { shield: true, secondary: -1 },
  { shield: true, bob: 1, secondary: 1 }, { hit: true, bob: -1 },
  { defeat: true, bob: 2 }, { defeat: true, bob: 3, secondary: 1 },
  { celebrate: true, bob: -1, secondary: -3 }, { celebrate: true, secondary: 3 },
];

function eyes(canvas, x, y, defeated = false, large = false) {
  if (defeated) {
    const m = mask(); line(m, x - 1, y - 1, x + 1, y + 1); line(m, x + 1, y - 1, x - 1, y + 1);
    paint(canvas, m, rgba(C.outline)); return;
  }
  const white = mask(); ellipse(white, x, y, large ? 2 : 1.5, large ? 2.5 : 2); paint(canvas, white, rgba(C.white));
  canvas.pixel(x + 1, y, rgba(C.outline));
}

function shield(canvas) {
  const ring = rgba(C.shield, 180);
  for (let a = 0; a < Math.PI * 2; a += 0.08) canvas.pixel(16 + Math.cos(a) * 14, 16 + Math.sin(a) * 14, ring);
}

function pico(p) {
  const c = new Canvas(FRAME, FRAME); const y = p.bob ?? 0; const body = mask();
  const stretch = p.stretch ?? 0; const squash = p.squash ?? 0; const wing = p.secondary ?? 0;
  ellipse(body, 15, 17 + y, 5 + squash, 7 - Math.min(2, squash) + stretch);
  ellipse(body, 16, 9 + y, 7, 6 - Math.min(1, squash));
  line(body, 12, 21 + y, 11 + (p.run ?? 0), 27, 2); line(body, 18, 21 + y, 19 - (p.run ?? 0), 27, 2);
  line(body, 11, 18 + y, 8 - wing, 24 + wing, 2); line(body, 12, 18 + y, 12 + wing, 27, 2);
  if (p.celebrate) { line(body, 12, 15 + y, 6, 8, 3); line(body, 18, 15 + y, 24, 8, 3); }
  else { line(body, 11, 14 + y, 7 - Math.abs(wing), 18 + wing, 3); line(body, 19, 14 + y, 23 + Math.abs(wing), 18 - wing, 3); }
  triangle(body, 12, 4 + y, 15, 0 + y + wing, 17, 5 + y); silhouette(c, body, C.blue);
  const wings = mask(); line(wings, 9, 14 + y, 7 - Math.abs(wing), 18 + wing, 2); line(wings, 20, 14 + y, 23 + Math.abs(wing), 18 - wing, 2); paint(c, wings, rgba(C.green));
  const beak = mask(); triangle(beak, 21, 8 + y, 28, 11 + y, 21, 13 + y); paint(c, beak, rgba(C.orange));
  eyes(c, 18, 8 + y, p.defeat, true); c.pixel(8, 23 + wing, rgba(C.red));
  if (p.hit) paint(c, beak, rgba(C.red)); if (p.shield) shield(c); return c;
}

function hoppy(p) {
  const c = new Canvas(FRAME, FRAME); const y = p.bob ?? 0; const body = mask();
  const squash = p.squash ?? 0; const stretch = p.stretch ?? 0; const run = p.run ?? 0;
  ellipse(body, 16, 11 + y, 8 + squash, 6 - Math.min(2, squash)); ellipse(body, 16, 19 + y, 6 + squash, 6 - Math.min(2, squash) + stretch);
  const footY = stretch ? 29 : 27; line(body, 12, 20 + y, 7 + run, footY, 3); line(body, 20, 20 + y, 25 - run, footY, 3);
  line(body, 8 + run, footY, 4 + run, footY, 2); line(body, 24 - run, footY, 28 - run, footY, 2);
  if (p.celebrate) { line(body, 11, 16 + y, 5, 8, 2); line(body, 21, 16 + y, 27, 8, 2); }
  else { line(body, 11, 17 + y, 6, 20 + (p.secondary ?? 0), 2); line(body, 21, 17 + y, 26, 20 - (p.secondary ?? 0), 2); }
  silhouette(c, body, C.frog);
  const belly = mask(); ellipse(belly, 16, 18 + y, 4 + squash, 4 - Math.min(1, squash) + stretch); paint(c, belly, rgba(C.belly));
  const eyeBases = mask(); ellipse(eyeBases, 11, 6 + y, 3, 3); ellipse(eyeBases, 21, 6 + y, 3, 3); paint(c, eyeBases, rgba(C.frog));
  eyes(c, 11, 6 + y, p.defeat, true); eyes(c, 21, 6 + y, p.defeat, true);
  if (!p.defeat) { const mouth = mask(); line(mouth, 13, 13 + y, 19, 13 + y); paint(c, mouth, rgba(C.outline)); }
  if (p.hit) { const blush = mask(); rect(blush, 7, 12 + y, 3, 2); rect(blush, 22, 12 + y, 3, 2); paint(c, blush, rgba(C.red)); }
  if (p.shield) shield(c); return c;
}

function tuki(p) {
  const c = new Canvas(FRAME, FRAME); const y = p.bob ?? 0; const body = mask(); const feather = p.secondary ?? 0;
  const squash = p.squash ?? 0; const stretch = p.stretch ?? 0;
  ellipse(body, 14, 17 + y, 5 + squash, 7 - Math.min(2, squash) + stretch); ellipse(body, 15, 9 + y, 6, 6);
  line(body, 11, 21 + y, 10 + (p.run ?? 0), 27, 2); line(body, 17, 21 + y, 19 - (p.run ?? 0), 27, 2);
  line(body, 10, 18 + y, 6 - feather, 25 + feather, 3); line(body, 9, 18 + y, 8 + feather, 27, 2);
  if (p.celebrate) { line(body, 11, 15 + y, 5, 8, 3); line(body, 17, 15 + y, 22, 8, 3); }
  else line(body, 11, 15 + y, 7 - Math.abs(feather), 18 + feather, 3);
  triangle(body, 11, 4 + y, 8, 0 + y + feather, 15, 4 + y); silhouette(c, body, C.navy);
  const throat = mask(); ellipse(throat, 16, 14 + y, 3, 5); paint(c, throat, rgba(C.white));
  const beak = mask(); triangle(beak, 19, 7 + y, 30, 9 + y, 19, 14 + y); paint(c, beak, rgba(C.orange));
  const tip = mask(); triangle(tip, 27, 9 + y, 30, 9 + y, 28, 11 + y); paint(c, tip, rgba(C.outline));
  eyes(c, 17, 8 + y, p.defeat, true); c.pixel(6 - feather, 25 + feather, rgba(C.orange));
  if (p.hit) paint(c, throat, rgba(C.red)); if (p.shield) shield(c); return c;
}

function zippy(p) {
  const c = new Canvas(FRAME, FRAME); const y = p.bob ?? 0; const body = mask(); const tail = p.secondary ?? 0;
  const squash = p.squash ?? 0; const stretch = p.stretch ?? 0; const run = p.run ?? 0;
  ellipse(body, 16, 15 + y, 5 + squash, 7 - Math.min(2, squash) + stretch); ellipse(body, 17, 8 + y, 6, 5);
  line(body, 12, 13 + y, 5 - run, 10 + tail, 2); line(body, 20, 13 + y, 27 + run, 10 - tail, 2);
  line(body, 12, 19 + y, 6 + run, 25 - tail, 2); line(body, 20, 19 + y, 26 - run, 25 + tail, 2);
  ellipse(body, 4 - run, 10 + tail, 2, 1); ellipse(body, 28 + run, 10 - tail, 2, 1); ellipse(body, 5 + run, 26 - tail, 2, 1); ellipse(body, 27 - run, 26 + tail, 2, 1);
  line(body, 15, 21 + y, 11 - tail, 26, 3); line(body, 11 - tail, 26, 6 + tail, 27 - Math.abs(tail), 2); line(body, 6 + tail, 27 - Math.abs(tail), 4 + tail, 23, 2);
  if (p.celebrate) { line(body, 12, 13 + y, 5, 5, 2); line(body, 21, 13 + y, 28, 5, 2); }
  silhouette(c, body, C.teal);
  const spots = mask(); ellipse(spots, 14, 13 + y, 2, 2); ellipse(spots, 19, 18 + y, 2, 2); ellipse(spots, 17, 7 + y, 1, 1); paint(c, spots, rgba(C.tealDark));
  const eyeBases = mask(); ellipse(eyeBases, 14, 6 + y, 3, 3); ellipse(eyeBases, 20, 6 + y, 3, 3); paint(c, eyeBases, rgba(C.highlight));
  eyes(c, 14, 6 + y, p.defeat, true); eyes(c, 20, 6 + y, p.defeat, true);
  if (p.hit) { const mark = mask(); rect(mark, 14, 10 + y, 6, 2); paint(c, mark, rgba(C.red)); }
  if (p.shield) shield(c); return c;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
});
function crc32(buffer) { let c = 0xFFFFFFFF; for (const b of buffer) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) {
  const name = Buffer.from(type); const out = Buffer.alloc(data.length + 12); out.writeUInt32BE(data.length, 0); name.copy(out, 4); data.copy(out, 8); out.writeUInt32BE(crc32(Buffer.concat([name, data])), data.length + 8); return out;
}
function encodePng(canvas) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(canvas.width, 0); ihdr.writeUInt32BE(canvas.height, 4); ihdr.set([8, 6, 0, 0, 0], 8);
  const raw = Buffer.alloc((canvas.width * 4 + 1) * canvas.height);
  for (let y = 0; y < canvas.height; y++) Buffer.from(canvas.data.subarray(y * canvas.width * 4, (y + 1) * canvas.width * 4)).copy(raw, y * (canvas.width * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function decodePng(path) {
  const png = readFileSync(path); let offset = 8; let width = 0; let height = 0; const compressed = [];
  while (offset < png.length) { const len = png.readUInt32BE(offset); const type = png.subarray(offset + 4, offset + 8).toString(); const data = png.subarray(offset + 8, offset + 8 + len); if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); } if (type === 'IDAT') compressed.push(data); offset += len + 12; }
  const raw = inflateSync(Buffer.concat(compressed)); const canvas = new Canvas(width, height);
  for (let y = 0; y < height; y++) canvas.data.set(raw.subarray(y * (width * 4 + 1) + 1, y * (width * 4 + 1) + 1 + width * 4), y * width * 4);
  return canvas;
}
function write(path, canvas) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, encodePng(canvas)); }

const renderers = { pico, hoppy, tuki, zippy };
for (const [character, renderer] of Object.entries(renderers)) {
  const sheet = new Canvas(FRAME * FRAME_COUNT, FRAME);
  POSES.forEach((pose, index) => sheet.blit(renderer(pose), index * FRAME, 0));
  const directory = join(ROOT, 'public', 'assets', 'characters', character);
  write(join(directory, `${character}-actions.png`), sheet);
  const portrait = new Canvas(64, 64); portrait.blit(renderer(POSES[22]), 0, 0, 2);
  write(join(directory, `${character}-portrait.png`), portrait);
}

const mikoSheet = decodePng(join(ROOT, 'public', 'assets', 'characters', 'miko', 'miko-actions.png'));
const mikoFrame = new Canvas(32, 32);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  const source = (y * mikoSheet.width + 22 * 32 + x) * 4; mikoFrame.data.set(mikoSheet.data.slice(source, source + 4), (y * 32 + x) * 4);
}
const mikoPortrait = new Canvas(64, 64); mikoPortrait.blit(mikoFrame, 0, 0, 2);
write(join(ROOT, 'public', 'assets', 'characters', 'miko', 'miko-portrait.png'), mikoPortrait);

console.log('Generated four 24-frame action sheets and five 64px portraits.');
