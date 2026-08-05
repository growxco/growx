import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const template = await readFile(
  new URL('../../infra/prevenda-inventory.yml', import.meta.url),
  'utf8',
);
const oidcTemplate = await readFile(
  new URL('../../infra/prevenda-vercel-oidc.yml', import.meta.url),
  'utf8',
);

test('infra declara GSI due por status/tempo sem Scan', () => {
  assert.match(template, /IndexName:\s*webhook-outbox-due/);
  assert.match(template, /AttributeName:\s*outbox_partition[\s\S]*KeyType:\s*HASH/);
  assert.match(template, /AttributeName:\s*next_attempt_at[\s\S]*KeyType:\s*RANGE/);
  assert.match(template, /ProjectionType:\s*KEYS_ONLY/);
});

test('IAM permite Query somente no ARN do GSI e não concede Scan', () => {
  assert.match(oidcTemplate, /Action:\s*[\s\S]*- dynamodb:Query[\s\S]*Resource:\s*!Sub '\$\{InventoryTableArn\}\/index\/webhook-outbox-due'/);
  assert.doesNotMatch(oidcTemplate, /\/index\/\*/);
  assert.doesNotMatch(oidcTemplate, /dynamodb:Scan/);
  assert.doesNotMatch(oidcTemplate, /Resource:\s*['"]?\*['"]?/);
  assert.doesNotMatch(template, /AWS::IAM::User/);
});
