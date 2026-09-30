import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('vídeo oficial do SPP aparece na página institucional do produto', async () => {
  const [page, video] = await Promise.all([
    read('../../src/pages/SPPPage.jsx'),
    read('../../src/components/sections/SPPVideo.jsx'),
  ]);

  assert.match(page, /<SPPVideo \/>/);
  assert.match(page, /href: '\/solucoes\/spp#video'/);
  assert.match(video, /id="video"/);
  assert.match(video, /cCfLhBZ_50I/);
  assert.match(video, /youtube-nocookie\.com\/embed/);
  assert.match(video, /allowFullScreen/);
});

test('cartão do SPP na home aponta para o vídeo na página institucional', async () => {
  const portals = await read('../../src/components/sections/AppPortals.jsx');
  assert.match(portals, /portal\.key === 'spp'/);
  assert.match(portals, /to="\/solucoes\/spp#video"/);
});

test('home não publica métricas de demonstração como se fossem telemetria ao vivo', async () => {
  const [home, hero] = await Promise.all([
    read('../../src/pages/HomePage.jsx'),
    read('../../src/components/sections/Hero.jsx'),
  ]);
  assert.doesNotMatch(home, /<LiveTicker \/>|<LiveTerminal \/>|<LogoCloud \/>/);
  assert.doesNotMatch(hero, /LiveKPIPanel|StatusDot/);
});
