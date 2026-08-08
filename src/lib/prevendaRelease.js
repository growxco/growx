import { OFERTA } from './oferta.js';

/**
 * Manifesto versionado do release comercial.
 *
 * A versão v3 é deliberadamente não aprovada: ela documenta o contrato-base,
 * mas ainda não contém a ficha elétrica, dimensões, kit e custo total de
 * entrega. Nenhuma variável de ambiente pode transformar este manifesto em
 * um release aprovado; a abertura exige uma nova versão revisada em código.
 */
export const PREVENDA_RELEASE = Object.freeze({
  id: 'prevenda-v3-2026-08-08',
  approved: false,
  contractVersion: OFERTA.contratoVersao,
  contractPath: OFERTA.contratoPath,
  contractSha256: '7838c5de87fc462d3e4075b8f7c062334591b72dfb0a3cd75412e54566b9dc58',
  disclosuresPath: null,
  disclosuresSha256: null,
  technicalDecisionRef: 'argus:25bf6030-59d4-43dc-a18e-c1603494dee2',
  approvalRef: null,
  paymentMethods: Object.freeze(['cartao']),
  manifestSha256: '245214e2fcd0592cf658a1bcd55cf12ed1f4987cf0d93c83e3f364cda56ada16',
});

/** Representação canônica usada pelo teste de integridade do manifesto. */
export const canonicalReleaseManifest = (manifest = PREVENDA_RELEASE) => JSON.stringify({
  id: manifest.id,
  approved: manifest.approved,
  contractVersion: manifest.contractVersion,
  contractPath: manifest.contractPath,
  contractSha256: manifest.contractSha256,
  disclosuresPath: manifest.disclosuresPath,
  disclosuresSha256: manifest.disclosuresSha256,
  technicalDecisionRef: manifest.technicalDecisionRef,
  approvalRef: manifest.approvalRef,
  paymentMethods: [...manifest.paymentMethods],
});

export const releaseAllowsPaymentMethod = (method, manifest = PREVENDA_RELEASE) =>
  manifest.paymentMethods.includes(String(method || ''));
