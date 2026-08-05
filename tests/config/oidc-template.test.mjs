import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const template = await readFile(new URL('../../infra/prevenda-vercel-oidc.yml', import.meta.url), 'utf8');

test('role OIDC confia apenas no projeto growx em production e na audiencia STS', () => {
  assert.match(template, /oidc\.vercel\.com\/grow-xs-projects:aud: sts\.amazonaws\.com/);
  assert.match(template, /owner:grow-xs-projects:project:growx:environment:production/);
  assert.doesNotMatch(template, /project:\*/);
  assert.doesNotMatch(template, /environment:\*/);
});

test('role OIDC limita escrita ao ledger e Query ao GSI exato', () => {
  assert.match(template, /dynamodb:GetItem/);
  assert.match(template, /dynamodb:TransactWriteItems/);
  assert.match(template, /dynamodb:Query/);
  assert.match(template, /dynamodb:UpdateItem/);
  assert.match(template, /Resource: !Ref InventoryTableArn/);
  assert.match(template, /Resource: !Sub '\$\{InventoryTableArn\}\/index\/webhook-outbox-due'/);
  assert.doesNotMatch(template, /\/index\/\*/);
  assert.doesNotMatch(template, /dynamodb:\*/);
  assert.doesNotMatch(template, /Resource:\s+['"]?\*['"]?/);
});
