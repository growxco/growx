import { OFERTA } from '../../src/lib/oferta.js';
import {
  PREVENDA_RELEASE,
  releaseAllowsPaymentMethod,
} from '../../src/lib/prevendaRelease.js';

const SHA256 = /^[a-f0-9]{64}$/;
const APPROVAL_REF = /^(?:argus|legal|release):[A-Za-z0-9][A-Za-z0-9._:/-]{7,159}$/;

/**
 * Torna a aprovação executável: a flag de vendas isolada nunca basta.
 * A versão aprovada, a referência auditável e o hash das divulgações finais
 * precisam pertencer ao mesmo release implantado.
 */
export function salesReleaseStatus(env = process.env, manifest = PREVENDA_RELEASE) {
  const version = String(env.PREVENDA_RELEASE_VERSION || '').trim();
  const approvalRef = String(env.PREVENDA_APPROVAL_REF || '').trim();
  const disclosuresSha256 = String(env.PREVENDA_DISCLOSURES_SHA256 || '').trim().toLowerCase();

  const checks = {
    manifestApproved: manifest.approved === true,
    offer: manifest.contractVersion === OFERTA.contratoVersao
      && manifest.contractPath === OFERTA.contratoPath,
    manifest: SHA256.test(String(manifest.manifestSha256 || '')),
    contract: SHA256.test(String(manifest.contractSha256 || '')),
    version: version === manifest.contractVersion,
    approvalRef: APPROVAL_REF.test(approvalRef) && approvalRef === manifest.approvalRef,
    disclosuresArtifact: /^\/[A-Za-z0-9._/-]+\.html$/.test(
      String(manifest.disclosuresPath || ''),
    ),
    disclosures: SHA256.test(disclosuresSha256)
      && disclosuresSha256 === manifest.disclosuresSha256,
  };

  return {
    ready: Object.values(checks).every(Boolean),
    checks,
  };
}

export const salesReleaseReady = (
  env = process.env,
  manifest = PREVENDA_RELEASE,
) => salesReleaseStatus(env, manifest).ready;

export const salesReleaseAllowsMethod = (
  method,
  env = process.env,
  manifest = PREVENDA_RELEASE,
) => salesReleaseStatus(env, manifest).ready && releaseAllowsPaymentMethod(method, manifest);
