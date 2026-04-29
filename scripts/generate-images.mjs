#!/usr/bin/env node
/**
 * Generate hero/banner images for Grow-X via Gemini Image API.
 * Uses gemini-3-pro-image-preview (premium quality) with fallback to gemini-2.5-flash-image.
 *
 * Usage: node scripts/generate-images.mjs
 *
 * Loads GEMINI_API_KEY from .env.local.
 * Saves PNGs to src/assets/ and converts to optimized WebP.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

// load .env.local
const envFile = await readFile('.env.local', 'utf8').catch(() => '');
for (const line of envFile.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error('GEMINI_API_KEY missing in .env.local'); process.exit(1); }

const PRIMARY_MODEL = 'gemini-3-pro-image-preview';
const FALLBACK_MODEL = 'gemini-2.5-flash-image';

const OUT_DIR = path.resolve('src/assets');

const TARGETS = [
  {
    name: 'spi-hero-v2',
    aspect: '4:3',
    width: 1400,
    prompt: `Cinematic aerial twilight shot of a Brazilian agroindustrial complex — large grain silos with warm amber industrial lights, conveyor belts, processing plants, queued trucks at the receiving station.
Floating in foreground: a glassmorphic holographic dashboard with live receiving metrics — truck queue, weighbridge throughput, ERP sync status — all rendered in crisp emerald green data lines (#3DB55A).
Atmospheric dark green-black sky, premium industrial documentary photography, depth of field, cinematic composition. No text, no logos, no people visible. Style: Linear/Stripe meets industrial drone photography.`,
  },
  {
    name: 'spp-hero-v2',
    aspect: '4:3',
    width: 1400,
    prompt: `Editorial photograph of a Brazilian farmer's weathered hand (no face, only hand visible) inspecting a rich soybean leaf at golden hour, holding a modern smartphone in the other hand showing a dark-themed agronomic app interface with Kc irrigation curve, soil moisture, and crop health metrics in emerald green data lines.
Soft holographic data overlay floating above the field with subtle sensor pulses. Vast Brazilian farmland horizon blurred in background.
Documentary realism meets earth-tech aesthetic. Color palette: deep greens, golden amber sunlight, emerald data accents. No text/logos visible on phone screen. Style: National Geographic meets premium SaaS.`,
  },
  {
    name: 'growx-app-hero-v2',
    aspect: '4:3',
    width: 1400,
    prompt: `Premium pharmaceutical-grade indoor cultivation room with cannabis medicinal plants in clean rows under full-spectrum LED lighting (purple-pink-white glow casting on plants).
A modern tablet floats in mid-air showing a dark-themed cultivation app dashboard with VPD, PPFD, growth cycle metrics in emerald green.
Stainless steel and white surfaces, sterile yet organic, professional medical-grade aesthetic — NOT recreational/amateur. Subtle holographic data overlays above plants showing sensor readings.
Color palette: deep emerald green plants, white-purple LED glow, dark elegant background, emerald data accents. No text/logos visible. Style: clinical product photography meets atmospheric tech.`,
  },
  {
    name: 'estacao-meteorologica-hero-v2',
    aspect: '4:3',
    width: 1400,
    prompt: `Cinematic close-up of a modern industrial weather station mounted on a slim metal tower in a vast Brazilian soybean field at golden hour.
Visible: anemometer (3-cup spinning sensor), small solar panel, integrated environmental sensors (temperature, humidity, rain gauge), small LoRa antenna, weatherproof IP67 enclosure with subtle emerald green LED indicator pulsing.
Background: rolling soybean field stretching to horizon, soft sunset light, dewdrops on nearby leaves.
Premium product photography editorial, sharp focus on station, atmospheric depth of field. No text/logos. Style: Apple product photography meets agricultural documentary.`,
  },
  {
    name: 'modulo-sem-fio-hero-v2',
    aspect: '4:3',
    width: 1400,
    prompt: `Hero product shot of a modern industrial electronic control module mounted on a metallic wall inside a greenhouse — sleek black-grey enclosure with small OLED display showing real-time temperature/humidity readings in emerald green, status LEDs, antenna, multiple cable connectors going to relays.
Subtle background: blurred greenhouse interior with green plants and irrigation lines.
Dramatic dark cinematic lighting with emerald green accent highlights catching the module edges and connectors.
Premium tech product photography, depth of field, professional industrial aesthetic. No text/logos visible. Style: Apple/Nest product photography.`,
  },
  {
    name: 'estufa-automatizada-hero-v2',
    aspect: '4:3',
    width: 1400,
    prompt: `Wide interior shot of a modern automated greenhouse: clean aluminum frame structure, healthy young plants in neat rows on raised beds, full-spectrum LED grow lights overhead casting purple-pink-white glow with subtle emerald green status lights.
Visible: drip irrigation system tubes, climate sensors mounted on walls, automated ventilation flaps, sleek control panel on side wall.
Atmospheric high-tech pharmaceutical greenhouse, professional cultivation operation, dark moody cinematic lighting with vibrant plant greens and warm grow light glow. Premium architectural photography, depth of field. No text/logos. Style: BIG architecture meets agtech editorial.`,
  },
];

async function generateOne({ name, prompt, aspect, width }) {
  const tryModel = async (model) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: aspect },
      },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`${model}: ${res.status} ${JSON.stringify(data?.error || data).slice(0, 300)}`);
    }
    const inline = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    if (!inline?.data) {
      throw new Error(`${model}: no inline image returned. payload: ${JSON.stringify(data).slice(0, 400)}`);
    }
    return Buffer.from(inline.data, 'base64');
  };

  let buf;
  try {
    console.log(`→ generating "${name}" with ${PRIMARY_MODEL}…`);
    buf = await tryModel(PRIMARY_MODEL);
    console.log(`  ✓ primary OK (${(buf.length/1024).toFixed(0)} KB raw)`);
  } catch (e) {
    console.log(`  × primary failed: ${e.message}`);
    console.log(`  → trying fallback ${FALLBACK_MODEL}…`);
    buf = await tryModel(FALLBACK_MODEL);
    console.log(`  ✓ fallback OK (${(buf.length/1024).toFixed(0)} KB raw)`);
  }

  // Save raw PNG (for debug/backup)
  const rawPath = path.join(OUT_DIR, `${name}.raw.png`);
  await writeFile(rawPath, buf);

  // Resize + WebP optimize
  const webpPath = path.join(OUT_DIR, `${name}.webp`);
  const optimized = await sharp(buf)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
  await writeFile(webpPath, optimized);
  console.log(`  ✓ saved ${path.basename(webpPath)} (${(optimized.length/1024).toFixed(0)} KB)`);
  return webpPath;
}

if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });

console.log(`\n=== Grow-X image generation ===`);
console.log(`Output: ${OUT_DIR}\n`);

for (const t of TARGETS) {
  try {
    await generateOne(t);
  } catch (e) {
    console.error(`✗ ${t.name} FAILED: ${e.message}`);
  }
  console.log('');
}

console.log('Done.');
