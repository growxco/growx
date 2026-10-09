import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
const source = readFileSync(new URL('../../src/lib/metricool.js', import.meta.url), 'utf8');
const { createMetricoolTracker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
function fixture(href = 'https://www.growx.com.br/', referrer = '') {
  let consent = false;
  const scripts = [];
  const calls = [];
  const win = { location: { href } };
  const doc = { referrer, querySelector: () => null, createElement: () => ({ remove() {} }), head: { appendChild: (s) => scripts.push(s) } };
  const start = createMetricoolTracker({ hosts: ['growx.com.br', 'www.growx.com.br'], paths: ['/', '/contato'], hasConsent: () => consent, win, doc });
  return { win, doc, start, scripts, calls, accept: () => { consent = true; }, decline: () => { consent = false; }, load: () => { win.beTracker = { t: (data) => calls.push(data) }; scripts[0].onload(); } };
}
test('no load before consent; one load and exact hash after acceptance, including repeated effects', () => {
  const f = fixture(); f.start(); assert.equal(f.scripts.length, 0);
  f.accept(); f.start(); f.start(); assert.equal(f.scripts.length, 1);
  f.load(); f.scripts[0].onload(); f.start();
  assert.deepEqual(f.calls, [{ hash: '900d4a87c72b86f89fd9ee35a9438508' }]);
});
test('withdrawal and route change while script loads prevent the visit', () => {
  for (const mutate of [f => f.decline(), f => { f.win.location.href = 'https://www.growx.com.br/admin'; }]) {
    const f = fixture(); f.accept(); f.start(); mutate(f); f.load(); assert.equal(f.calls.length, 0);
  }
});
test('private hosts/routes, QA, query strings, fragments and sensitive referrers never load', () => {
  for (const href of ['https://agenda.growx.com.br/', 'https://gxp.ia.br/', 'http://localhost/', 'https://growx-preview.vercel.app/', 'https://www.growx.com.br/admin', 'https://www.growx.com.br/prevenda/pedido', 'https://www.growx.com.br/?email=private', 'https://www.growx.com.br/#cpf']) {
    const f = fixture(href); f.accept(); f.start(); assert.equal(f.scripts.length, 0, href);
  }
  for (const ref of ['https://other.test/?email=private', 'https://other.test/cultivation/123', 'https://growx.com.br/admin', 'https://growx.com.br/contato?cpf=private']) {
    const f = fixture(undefined, ref); f.accept(); f.start(); assert.equal(f.scripts.length, 0, ref);
  }
});
test('existing installation is not duplicated; load failure permits an explicit retry', () => {
  const f = fixture(); f.accept(); f.win.beTracker = {}; f.start(); assert.equal(f.scripts.length, 0);
  delete f.win.beTracker; f.start(); f.scripts[0].onerror(); f.start(); assert.equal(f.scripts.length, 2);
});
test('official tracker request contains only exact hash, safe URL, dimensions and safe referrer', () => {
  const f = fixture(undefined, 'https://search.test/'); f.accept(); f.start();
  const pixels = [];
  const context = { document: { location: { href: f.win.location.href }, referrer: f.doc.referrer }, window: { innerWidth: 1280, innerHeight: 720 }, Image: class { set src(value) { pixels.push(value); } } };
  // Official resources/be.js inspected 2026-10-09; no browser storage or form access.
  vm.runInNewContext("beTracker={t:function(a){\"undefined\"==typeof a&&(a={}),a.u=document.location.href,a.bw=window.innerWidth,a.bh=window.innerHeight,document.referrer&&\"\"!=document.referrer&&(a.ref=document.referrer);var b=[];for(var c in a)a.hasOwnProperty(c)&&b.push(encodeURIComponent(c)+\"=\"+encodeURIComponent(a[c]));var d=new Image;d.src=\"https://tracker.metricool.com/c3po.jpg?\"+b.join(\"&\")}};", context);
  f.win.beTracker = context.beTracker; f.scripts[0].onload();
  const request = new URL(pixels[0]);
  assert.equal(request.origin, 'https://tracker.metricool.com');
  assert.deepEqual([...request.searchParams.keys()], ['hash', 'u', 'bw', 'bh', 'ref']);
  assert.equal(request.searchParams.get('u'), f.win.location.href);
});
