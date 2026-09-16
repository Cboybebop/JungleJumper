import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import assert from 'node:assert/strict';

const characters = ['miko', 'pico', 'hoppy', 'tuki', 'zippy'];

function readPng(url) {
  const png = readFileSync(url);
  assert.equal(png.subarray(1, 4).toString(), 'PNG', `${url} must be a PNG`);
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
      assert.equal(data[8], 8, 'asset must use 8-bit channels');
      assert.equal(data[9], 6, 'asset must be RGBA');
    } else if (type === 'IDAT') compressed.push(data);
    offset += length + 12;
  }
  return { width, height, raw: inflateSync(Buffer.concat(compressed)) };
}

for (const character of characters) {
  const sheet = readPng(new URL(`../public/assets/characters/${character}/${character}-actions.png`, import.meta.url));
  assert.deepEqual([sheet.width, sheet.height], [24 * 32, 32], `${character} must contain 24 grid-aligned frames`);
  const alphaValues = new Set();
  let transparentPixels = 0;
  const occupiedPerFrame = Array.from({ length: 24 }, () => 0);
  for (let y = 0; y < sheet.height; y += 1) {
    const row = y * (sheet.width * 4 + 1);
    assert.equal(sheet.raw[row], 0, 'validator expects unfiltered pixel rows');
    for (let x = 0; x < sheet.width; x += 1) {
      const alpha = sheet.raw[row + 1 + x * 4 + 3];
      alphaValues.add(alpha);
      if (alpha === 0) transparentPixels += 1;
      else occupiedPerFrame[Math.floor(x / 32)] += 1;
    }
  }
  assert(occupiedPerFrame.every((pixels) => pixels >= 45), `${character} must have visible art in every state`);
  assert(alphaValues.has(0) && alphaValues.has(255), `${character} needs transparent padding and opaque art`);
  assert(transparentPixels > sheet.width * sheet.height / 2, `${character} frames need generous transparent padding`);
  assert([...alphaValues].every((alpha) => alpha === 0 || alpha === 180 || alpha === 255),
    `${character} may only use opaque pixels and the deliberate shield alpha band`);

  const portrait = readPng(new URL(`../public/assets/characters/${character}/${character}-portrait.png`, import.meta.url));
  assert.deepEqual([portrait.width, portrait.height], [64, 64], `${character} portrait must be 64x64`);
  console.log(`Validated ${character}: 24 action frames and 64px portrait.`);
}
