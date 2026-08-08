import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const html = await readFile(new URL('../../prevenda.html', import.meta.url), 'utf8');

test('fallback estático comunica cobrança pausada e direciona para o aviso de abertura', () => {
  assert.match(html, /R\$ 3\.000 no cartão/i);
  assert.match(html, /12x de R\$ 250/i);
  assert.match(html, /A cobrança está pausada enquanto a oferta final e o checkout são validados/i);
  assert.match(html, /nenhum pagamento será solicitado agora/i);
  assert.match(html, /Janela prevista da pré-venda: até 15\/11\/2026/i);
  assert.match(html, /href="\/prevenda#lista">Receber aviso da abertura<\/a>/i);
  assert.match(html, /Pix permanece indisponível\s+enquanto passa pela homologação final/i);
  assert.match(html, /name="growx-offer-pix" content="R\$ 2\.800" data-enabled="false"/);
  assert.doesNotMatch(html, /R\$ 2\.800 no Pix/i);
  assert.doesNotMatch(html, /A compra no cartão está disponível|Comprar no cartão|Compre o Módulo|O checkout usa JavaScript/i);
});

test('tema inicial falha com segurança e mantém theme-color coerente', () => {
  assert.match(html, /localStorage\.getItem\('growx-theme'\)/);
  assert.match(html, /stored === 'light' \|\| stored === 'dark'/);
  assert.match(html, /theme === 'light' \? '#f7f6ef' : '#080b09'/);
  assert.match(html, /catch\s*\{/);
});
