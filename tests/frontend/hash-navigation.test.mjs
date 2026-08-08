import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const app = await readFile(new URL('../../src/App.jsx', import.meta.url), 'utf8');
const prevenda = await readFile(new URL('../../src/pages/PreVendaPage.jsx', import.meta.url), 'utf8');

test('/prevenda#como preserva o hash, espera a rota lazy e posiciona a seção', () => {
  assert.match(app, /const \{ pathname, hash \} = useLocation\(\)/);
  assert.match(app, /if \(!hash\) \{[\s\S]*window\.scrollTo/);
  assert.match(app, /document\.getElementById\(targetId\)/);
  assert.match(app, /target\.scrollIntoView\(\{ block: 'start', behavior: 'auto' \}\)/);
  assert.match(app, /new MutationObserver/);
  assert.match(prevenda, /<section id="como" className="scroll-mt-20"/);
});
