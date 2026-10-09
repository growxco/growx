import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';

test('partner catalogue preserves the validated 12-page lightweight artifact', () => {
  const bytes = readFileSync(new URL('../../public/catalogos/gxp-parceiros-visual.pdf', import.meta.url));
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.equal(bytes.length, 3108621);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '1353a3c37d2c4f9cee4266ca2048ed1116fdc9c17d739814f347412697903705');
});

test('partner catalogue can be opened and downloaded without replacing public offers', () => {
  const page = readFileSync(new URL('../../src/pages/ParceirosPage.jsx', import.meta.url), 'utf8');
  assert.match(page, /12 páginas — PDF 2,96 MiB/);
  assert.match(page, /href="\/catalogos\/gxp-parceiros-visual.pdf" target="_blank" rel="noopener noreferrer"/);
  assert.match(page, /href="\/catalogos\/gxp-parceiros-visual.pdf" download=/);
  assert.match(page, /R\$ 5\.000/);
  assert.match(page, /R\$ 3\.500/);
});

