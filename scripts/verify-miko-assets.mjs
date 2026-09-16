import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import assert from 'node:assert/strict';

const png = readFileSync(new URL('../public/assets/characters/miko/miko-actions.png', import.meta.url));
assert.equal(png.subarray(1, 4).toString(), 'PNG', 'asset must be a PNG');

let offset = 8;
let width = 0;
let height = 0;
const compressed = [];
while (offset < png.length) {
  const length = png.readUInt32BE(offset);
  const type = png.subarray(offset + 4, offset + 8).toString();
  const data = png.subarray(offset + 8, offset + 8 + length);
  if (type === 'IHDR') {
    width = data.readUInt32BE(0);
    height = data.readUInt32BE(4);
    assert.equal(data[8], 8, 'sheet must use 8-bit channels');
    assert.equal(data[9], 6, 'sheet must be RGBA');
  } else if (type === 'IDAT') compressed.push(data);
  offset += length + 12;
}

assert.deepEqual([width, height], [24 * 32, 32], 'sheet must contain 24 grid-aligned frames');
const raw = inflateSync(Buffer.concat(compressed));
const alphaValues = new Set();
let transparentPixels = 0;
for (let y = 0; y < height; y += 1) {
  const row = y * (width * 4 + 1);
  assert.equal(raw[row], 0, 'validator expects unfiltered pixel rows');
  for (let x = 0; x < width; x += 1) {
    const alpha = raw[row + 1 + x * 4 + 3];
    alphaValues.add(alpha);
    if (alpha === 0) transparentPixels += 1;
  }
}
assert(alphaValues.has(0) && alphaValues.has(255), 'sheet needs transparent padding and opaque art');
assert(transparentPixels > width * height / 2, 'frames need generous transparent padding');
assert([...alphaValues].every((alpha) => alpha === 0 || alpha === 180 || alpha === 255),
  'only opaque pixels and the deliberate shield alpha band are allowed');

console.log(`Validated ${width / 32} Miko frames (${width}x${height}, alpha: ${[...alphaValues].sort()}).`);
