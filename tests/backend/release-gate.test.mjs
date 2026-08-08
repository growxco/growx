import assert from 'node:assert/strict';
import test from 'node:test';

import {
  salesReleaseAllowsMethod,
  salesReleaseStatus,
} from '../../api/_lib/release-gate.js';
import { OFERTA } from '../../src/lib/oferta.js';
import { PREVENDA_RELEASE } from '../../src/lib/prevendaRelease.js';

const approvedManifest = {
  ...PREVENDA_RELEASE,
  approved: true,
  approvalRef: 'legal:parecer-prevenda-v4',
  disclosuresPath: '/ofertas/prevenda-v4.html',
  disclosuresSha256: 'b'.repeat(64),
};
const valid = {
  PREVENDA_RELEASE_VERSION: OFERTA.contratoVersao,
  PREVENDA_APPROVAL_REF: approvedManifest.approvalRef,
  PREVENDA_DISCLOSURES_SHA256: approvedManifest.disclosuresSha256,
};

test('gate de release exige versão, approval_ref e hash no mesmo release', () => {
  assert.deepEqual(salesReleaseStatus(valid, approvedManifest), {
    ready: true,
    checks: {
      manifestApproved: true,
      offer: true,
      manifest: true,
      contract: true,
      version: true,
      approvalRef: true,
      disclosuresArtifact: true,
      disclosures: true,
    },
  });

  for (const key of Object.keys(valid)) {
    const env = { ...valid };
    delete env[key];
    assert.equal(salesReleaseStatus(env, approvedManifest).ready, false, key);
  }
});

test('gate rejeita versão divergente, referência não auditável e hash inválido', () => {
  assert.equal(salesReleaseStatus({ ...valid, PREVENDA_RELEASE_VERSION: 'v2-2026-08-05' }, approvedManifest).ready, false);
  assert.equal(salesReleaseStatus({ ...valid, PREVENDA_APPROVAL_REF: 'legal:placeholder' }, approvedManifest).ready, false);
  assert.equal(salesReleaseStatus({ ...valid, PREVENDA_DISCLOSURES_SHA256: 'a'.repeat(64) }, approvedManifest).ready, false);
});

test('manifesto v3 pendente nunca abre por override de ambiente', () => {
  const env = {
    PREVENDA_RELEASE_VERSION: PREVENDA_RELEASE.contractVersion,
    PREVENDA_APPROVAL_REF: PREVENDA_RELEASE.technicalDecisionRef,
    PREVENDA_DISCLOSURES_SHA256: 'a'.repeat(64),
  };
  const status = salesReleaseStatus(env);
  assert.equal(PREVENDA_RELEASE.approved, false);
  assert.equal(PREVENDA_RELEASE.approvalRef, null);
  assert.equal(PREVENDA_RELEASE.disclosuresSha256, null);
  assert.equal(status.ready, false);
  assert.equal(status.checks.manifestApproved, false);
  assert.equal(status.checks.approvalRef, false);
  assert.equal(status.checks.disclosuresArtifact, false);
  assert.equal(status.checks.disclosures, false);
});

test('método fora do manifesto não abre mesmo com flags do provider', () => {
  assert.equal(salesReleaseAllowsMethod('cartao', valid, approvedManifest), true);
  assert.equal(salesReleaseAllowsMethod('pix', valid, approvedManifest), false);
});

test('hash sem artefato público não aprova release futuro', () => {
  const missingArtifact = { ...approvedManifest, disclosuresPath: null };
  assert.equal(salesReleaseStatus(valid, missingArtifact).ready, false);
  assert.equal(salesReleaseStatus(valid, missingArtifact).checks.disclosuresArtifact, false);
});
