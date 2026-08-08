import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

import {
  PREVENDA_RELEASE,
  canonicalReleaseManifest,
} from '../../src/lib/prevendaRelease.js';
import { contratoPath, contratoSnapshotDisponivel } from '../../src/lib/oferta.js';

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

test('manifesto está ligado ao snapshot publicado e à decisão técnica aceita', async () => {
  const snapshotUrl = new URL(`../../public${PREVENDA_RELEASE.contractPath}`, import.meta.url);
  const snapshot = await readFile(fileURLToPath(snapshotUrl));
  assert.equal(sha256(snapshot), PREVENDA_RELEASE.contractSha256);
  assert.equal(sha256(canonicalReleaseManifest()), PREVENDA_RELEASE.manifestSha256);
  assert.equal(
    PREVENDA_RELEASE.technicalDecisionRef,
    'argus:25bf6030-59d4-43dc-a18e-c1603494dee2',
  );
});

test('v3 é não aprovável por env e exige nova versão com pacote final', () => {
  assert.equal(PREVENDA_RELEASE.approved, false);
  assert.equal(PREVENDA_RELEASE.approvalRef, null);
  assert.equal(PREVENDA_RELEASE.disclosuresPath, null);
  assert.equal(PREVENDA_RELEASE.disclosuresSha256, null);
  assert.deepEqual(PREVENDA_RELEASE.paymentMethods, ['cartao']);
});

test('versão histórica sem snapshot cai em página explícita, nunca em 404 fabricado', async () => {
  assert.equal(contratoSnapshotDisponivel('v2-2026-08-05'), false);
  assert.equal(contratoPath('v2-2026-08-05'), '/contratos/indisponivel.html');
  const fallback = await readFile(new URL('../../public/contratos/indisponivel.html', import.meta.url));
  assert.ok(fallback.length > 0);
});
