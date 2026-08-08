import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));

test('vercel.json fixa as Functions em Sao Paulo e declara o schema oficial', () => {
  assert.equal(config.$schema, 'https://openapi.vercel.sh/vercel.json');
  assert.deepEqual(config.regions, ['gru1']);
});

test('CSP permite somente o host exato do beacon Cloudflare injetado em produção', () => {
  const header = config.headers
    ?.flatMap((entry) => entry.headers || [])
    .find((entry) => entry.key.toLowerCase() === 'content-security-policy');

  assert.ok(header?.value.includes('script-src'));
  assert.ok(header.value.includes('https://static.cloudflareinsights.com'));
  assert.ok(!header.value.includes('https://*.cloudflareinsights.com'));
});

test('cron de reconciliacao permanece configurado a cada minuto', () => {
  assert.ok(config.crons?.some((cron) => (
    cron.path === '/api/cron/reconcile' && cron.schedule === '* * * * *'
  )));
});

test('cron de redrive do outbox permanece configurado a cada minuto', () => {
  assert.ok(config.crons?.some((cron) => (
    cron.path === '/api/cron/webhook-redrive' && cron.schedule === '* * * * *'
  )));
});

test('cron de reconciliação financeira permanece configurado a cada minuto', () => {
  assert.ok(config.crons?.some((cron) => (
    cron.path === '/api/cron/financial-reconcile' && cron.schedule === '* * * * *'
  )));
});
