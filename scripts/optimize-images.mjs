#!/usr/bin/env node
/**
 * Optimize hero/product images in src/assets to WebP under MAX_WIDTH px.
 * Skips logos/icons. Originals backed up to .bak.
 * Run: `npm run optimize:images`
 */
import { readdir, stat, copyFile, writeFile, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ASSETS = path.resolve('src/assets');
const MAX_WIDTH = 1920;
const QUALITY = 80;
const SIZE_THRESHOLD = 200 * 1024; // 200 KB
const SKIP = /^(logo-|icon-|react\.svg|chip)/i;
const FORMATS = /\.(jpg|jpeg|png|webp)$/i;

async function main() {
  const files = await readdir(ASSETS);
  const candidates = files.filter((f) => FORMATS.test(f) && !SKIP.test(f) && !f.endsWith('.bak'));
  let totalIn = 0, totalOut = 0, processed = 0;

  for (const f of candidates) {
    const src = path.join(ASSETS, f);
    const s = await stat(src);
    if (s.size < SIZE_THRESHOLD) continue;

    const base = f.replace(FORMATS, '');
    const out = path.join(ASSETS, `${base}.webp`);
    const bak = src + '.bak';

    try { await stat(bak); } catch { await copyFile(src, bak); }

    // Read source fully into memory first (sharp internally locks files on Windows)
    const inputBuf = await readFile(src);
    const buf = await sharp(inputBuf)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY, effort: 5 })
      .toBuffer();

    // Now safe to overwrite (handle on src is closed)
    if (out === src) {
      // overwriting same path; force unlink first to release any lingering handle on Windows
      try { await unlink(src); } catch {}
    }
    await writeFile(out, buf);

    totalIn += s.size;
    totalOut += buf.byteLength;
    processed++;
    console.log(`✓ ${f}  →  ${path.basename(out)}  (${(s.size/1024).toFixed(0)}KB → ${(buf.byteLength/1024).toFixed(0)}KB)`);
  }

  if (processed === 0) {
    console.log('Nothing to optimize (all under threshold).');
    return;
  }
  const saved = ((1 - totalOut / totalIn) * 100).toFixed(1);
  console.log(`\nDone. ${processed} files. Saved ${saved}% (${((totalIn - totalOut)/1024/1024).toFixed(1)} MB).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
