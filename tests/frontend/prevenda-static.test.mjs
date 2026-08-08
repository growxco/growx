import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const html = await readFile(new URL('../../prevenda.html', import.meta.url), 'utf8');

test('fallback estático comunica a oferta disponível sem anunciar Pix fechado', () => {
  assert.match(html, /R\$ 3\.000 no cartão/i);
  assert.match(html, /12x de R\$ 250/i);
  assert.match(html, /Pix permanece\s+indisponível enquanto passa pela homologação final/i);
  assert.match(html, /name="growx-offer-pix" content="R\$ 2\.800" data-enabled="false"/);
  assert.doesNotMatch(html, /R\$ 2\.800 no Pix/i);
  assert.doesNotMatch(html, /pagamento só será aberto/i);
});

test('tema inicial falha com segurança e mantém theme-color coerente', () => {
  assert.match(html, /localStorage\.getItem\('growx-theme'\)/);
  assert.match(html, /stored === 'light' \|\| stored === 'dark'/);
  assert.match(html, /theme === 'light' \? '#f7f6ef' : '#080b09'/);
  assert.match(html, /catch\s*\{/);
});
