import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const preVenda = await readFile(new URL('../../src/pages/PreVendaPage.jsx', import.meta.url), 'utf8');
const contrato = await readFile(new URL('../../src/pages/ContratoPage.jsx', import.meta.url), 'utf8');
const snapshot = await readFile(new URL('../../public/contratos/prevenda-v3-2026-08-08.html', import.meta.url), 'utf8');
const checkout = await readFile(new URL('../../api/checkout.js', import.meta.url), 'utf8');
const release = await readFile(new URL('../../src/lib/prevendaRelease.js', import.meta.url), 'utf8');

test('pré-venda mantém características essenciais e custo total como gate de pagamento', () => {
  assert.match(preVenda, /tensão, corrente, carga máxima, composição do kit e custo total da entrega/i);
  assert.match(preVenda, /precisam estar publicados e aprovados antes de qualquer cobrança/i);
  assert.doesNotMatch(preVenda, /(?:publicad|confirmad|formalizad)[^\n]{0,80}antes do envio/i);
});

test('contrato exige oferta final antes da cobrança e preserva arrependimento após recebimento', () => {
  assert.match(contrato, /deverão estar disponíveis antes de qualquer aceite e pagamento/i);
  assert.match(contrato, /custo total, a cobertura e eventual gratuidade do frete serão informados antes da abertura da cobrança/i);
  assert.match(contrato, /assinatura ou do recebimento do produto, o que ocorrer por último/i);
  assert.doesNotMatch(contrato, /permanecem em validação e serão publicadas no manual/i);
});

test('v3 é snapshot imutável não liberado e checkout persiste o manifesto', () => {
  assert.match(snapshot, /VERSÃO IMUTÁVEL v3-2026-08-08/i);
  assert.match(snapshot, /NÃO LIBERADA PARA PAGAMENTO/i);
  assert.match(snapshot, /a versão v3 nunca poderá ser usada para abrir uma cobrança/i);
  assert.match(snapshot, /assinatura ou do recebimento do produto, o que ocorrer por último/i);
  assert.match(snapshot, /Esses dados deverão estar disponíveis antes de qualquer aceite e pagamento/i);
  assert.match(snapshot, /O Pix não integra esta versão/i);
  assert.match(checkout, /OFERTA\.contratoPath/);
  assert.match(checkout, /releaseManifestSha256: releaseManifest\.manifestSha256/);
  assert.match(release, /approved: false/);
  assert.match(release, /approvalRef: null/);
  assert.match(release, /disclosuresSha256: null/);
});
