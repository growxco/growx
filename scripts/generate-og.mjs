#!/usr/bin/env node
/**
 * Generate Open Graph PNG image (1200×630) for Grow-X social previews.
 * Strategy: render the existing SVG to PNG via sharp (deterministic, on-brand).
 * Faster + cheaper than AI gen and produces consistent output.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SVG_PATH = path.resolve('public/og-image.svg');
const PNG_PATH = path.resolve('public/og-image.png');

const svg = await readFile(SVG_PATH);
const buf = await sharp(svg, { density: 200 })
  .resize(1200, 630, { fit: 'contain', background: { r: 15, g: 26, b: 19 } })
  .png({ quality: 92, compressionLevel: 9 })
  .toBuffer();

await writeFile(PNG_PATH, buf);
console.log(`✓ ${path.basename(PNG_PATH)} — ${(buf.length/1024).toFixed(0)} KB`);
