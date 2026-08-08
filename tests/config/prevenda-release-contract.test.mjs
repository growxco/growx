import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const read = (relative) => readFile(new URL(relative, import.meta.url), 'utf8');

test('release fixa Node 24 e executa todos os gates locais no Verify', async () => {
  const packageJson = JSON.parse(await read('../../package.json'));
  const workflow = await read('../../.github/workflows/verify.yml');

  assert.equal(packageJson.engines?.node, '24.x');
  for (const command of [
    'npm ci --legacy-peer-deps',
    'npm audit --package-lock-only --audit-level=high',
    'node --test tests/config/*.test.mjs',
    'npm run lint',
    'npm run test:backend',
    'npm run test:frontend',
    'npm run test:sales-gate',
    'npm run build',
  ]) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('React Router permanece na primeira versão corrigida da série 7', async () => {
  const packageJson = JSON.parse(await read('../../package.json'));

  assert.equal(packageJson.dependencies?.['react-router'], '7.18.2');
  assert.equal(packageJson.dependencies?.['react-router-dom'], '7.18.2');
});

test('Aikido permite rescan manual limitado sem enfraquecer o baseline', async () => {
  const workflow = await read('../../.github/workflows/aikido.yml');

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /repositories\/code/);
  assert.match(workflow, /external_repo_numeric_id/);
  assert.match(workflow, /if status != 204:/);
  assert.match(workflow, /group: aikido-\$\{\{ github\.repository \}\}-\$\{\{ github\.ref \}\}/);
  assert.match(workflow, /cancel-in-progress: false/);
  assert.match(workflow, /deadline = time\.monotonic\(\) \+ 600/);
  assert.match(workflow, /for _ in range\(40\):/);
  assert.match(workflow, /time\.sleep\(min\(15, remaining\)\)/);
  assert.match(workflow, /timeout_seconds=max\(1, min\(15, remaining\)\)/);
  assert.match(workflow, /AIKIDO_GATE_BASELINE_COUNT: "0"/);
  assert.match(workflow, /AIKIDO_GATE_HIGH_BASELINE: "0"/);
  assert.doesNotMatch(workflow, /status\s*==\s*429|retries\s*=/);
});

test('.env.example mantém pré-venda fechada e documenta o contrato operacional', async () => {
  const example = await read('../../.env.example');
  const salesFlags = example.match(/^PREVENDA_SALES_ENABLED=/gm) || [];

  assert.equal(salesFlags.length, 1);
  assert.match(example, /^PREVENDA_SALES_ENABLED=false$/m);
  assert.match(example, /^PREVENDA_PIX_ENABLED=false$/m);
  assert.match(example, /^VITE_PREVENDA_PIX_ENABLED=false\b/m);
  assert.match(example, /^TURNSTILE_EXPECTED_HOSTNAMES=growx\.com\.br,www\.growx\.com\.br$/m);
  assert.match(example, /^PREVENDA_ALERT_EMAIL=$/m);
});

test('checkout de produção não consulta status por query string', async () => {
  const checkout = await read('../../api/checkout.js');
  const successPage = await read('../../src/pages/PreVendaSucessoPage.jsx');

  assert.doesNotMatch(checkout, /req\.query/);
  assert.doesNotMatch(checkout, /prevenda\/sucesso\?/);
  assert.match(checkout, /statusReturnFragment/);
  assert.match(successPage, /method:\s*'POST'/);
  assert.match(successPage, /Authorization:\s*`Bearer/);
  assert.match(successPage, /referrerPolicy:\s*'no-referrer'/);
});
