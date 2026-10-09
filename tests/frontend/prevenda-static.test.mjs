import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const html = await readFile(new URL('../../prevenda.html', import.meta.url), 'utf8');

test('fallback estático mantém pré-venda fechada sem oferta ou cronograma não aprovados', () => {
  assert.match(html, /Pré-venda do Módulo Grow-X fechada/i);
  assert.match(html, /Nenhum pagamento ou reserva está disponível/i);
  assert.match(html, /R\$ 5\.000 por unidade/);
  assert.match(html, /Não constitui oferta de compra nem promessa de entrega/i);
  assert.match(html, /href="\/prevenda#lista">Receber aviso da abertura<\/a>/i);
  assert.doesNotMatch(html, /R\$ (?:2\.800|3\.000|5\.500)|12x de|15\/11\/2026|20\/11\/2026|3 meses de Premium/i);
  assert.doesNotMatch(html, /Comprar no cartão|Compre o Módulo|Pr[eé]-venda aberta/i);
});

test('tema inicial falha com segurança e mantém theme-color coerente', () => {
  assert.match(html, /localStorage\.getItem\('growx-theme'\)/);
  assert.match(html, /stored === 'light' \|\| stored === 'dark'/);
  assert.match(html, /theme === 'light' \? '#f7f6ef' : '#080b09'/);
  assert.match(html, /catch\s*\{/);
});
