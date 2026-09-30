import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

test('categorias sem rota própria não viram links quebrados no breadcrumb', async () => {
  const source = await readFile(new URL('../../src/components/Breadcrumbs.jsx', import.meta.url), 'utf8');
  assert.match(source, /NON_LINKABLE_PARENTS = new Set\(\['\/solucoes', '\/sobre'\]\)/);
  assert.match(source, /item\.isLast \|\| item\.isLinkable === false/);
  assert.match(source, /aria-label="Navegação estrutural"/);
});
