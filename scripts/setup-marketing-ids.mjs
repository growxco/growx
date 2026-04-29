#!/usr/bin/env node
/**
 * Configura/atualiza env vars de marketing no Vercel via REST API.
 * Uso:
 *   node scripts/setup-marketing-ids.mjs \
 *     --ga4=G-XXXXXXX \
 *     --pixel=118629574671054 \
 *     --linkedin=1234567 \
 *     --clarity=wg34yg52s0
 *
 * Aceita os 4 args, qualquer subconjunto. Pulará os ausentes.
 * Faz redeploy automático no fim.
 */
import { spawn } from 'node:child_process';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJ = 'growx';
const TEAM = 'grow-xs-projects';

if (!VERCEL_TOKEN) {
  console.error('Defina VERCEL_TOKEN no ambiente antes de atualizar IDs de marketing.');
  process.exit(1);
}

const args = Object.fromEntries(
  process.argv.slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...v] = a.replace(/^--/, '').split('=');
      return [k, v.join('=')];
    }),
);

const MAP = {
  ga4: 'VITE_GA_ID',
  pixel: 'VITE_META_PIXEL_ID',
  linkedin: 'VITE_LINKEDIN_PARTNER_ID',
  clarity: 'VITE_CLARITY_ID',
  calendly: 'VITE_CALENDLY_URL',
  crm: 'VITE_CRM_WEBHOOK_URL',
};

const auth = { 'Authorization': `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' };
const base = `https://api.vercel.com/v10/projects/${PROJ}/env?teamSlug=${TEAM}`;

async function listEnvs() {
  const res = await fetch(`https://api.vercel.com/v9/projects/${PROJ}/env?teamSlug=${TEAM}`, { headers: auth });
  const data = await res.json();
  return data.envs || [];
}

async function deleteEnv(id) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${PROJ}/env/${id}?teamSlug=${TEAM}`, {
    method: 'DELETE',
    headers: auth,
  });
  return res.ok;
}

async function addEnv(key, value) {
  const res = await fetch(base, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      key,
      value,
      type: 'plain',
      target: ['production', 'preview', 'development'],
    }),
  });
  return res.json();
}

async function upsert(key, value) {
  const existing = await listEnvs();
  const found = existing.find((e) => e.key === key);
  if (found) {
    await deleteEnv(found.id);
    console.log(`  · removed old ${key}`);
  }
  const r = await addEnv(key, value);
  if (r.error) {
    console.log(`  ✗ ${key}: ${r.error?.message || JSON.stringify(r.error)}`);
    return false;
  }
  console.log(`  ✓ ${key} = ${value.length > 30 ? value.slice(0, 27) + '…' : value}`);
  return true;
}

console.log('\n=== Grow-X marketing IDs setup ===\n');

const inputs = Object.entries(args)
  .filter(([k, v]) => MAP[k] && v)
  .map(([k, v]) => [MAP[k], v]);

if (inputs.length === 0) {
  console.log('Nenhum ID passado. Uso:');
  console.log('  node scripts/setup-marketing-ids.mjs --ga4=G-XXX --pixel=123 --linkedin=456 --clarity=wg34yg52s0\n');
  process.exit(0);
}

let okCount = 0;
for (const [k, v] of inputs) {
  console.log(`→ ${k}`);
  if (await upsert(k, v)) okCount++;
}

console.log(`\n${okCount}/${inputs.length} variáveis configuradas.`);

if (okCount > 0 && !args['skip-deploy']) {
  console.log('\n→ Disparando redeploy production…');
  const child = spawn('npx', ['vercel', '--prod', '--yes', '--scope', TEAM], {
    env: { ...process.env, VERCEL_TOKEN },
    stdio: 'inherit',
    shell: true,
  });
  child.on('close', (code) => process.exit(code));
} else {
  console.log('\nPasse --skip-deploy se quiser deployar manualmente depois.');
}
