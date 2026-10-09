
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { MARKETING_METADATA } from '../src/lib/marketingMetadata.js';

const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
function metadataHtml(html, route, metadata) {
  const title = `${metadata.title} - Grow-X`;
  const url = `https://www.growx.com.br${route}`;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`);
  for (const [attribute, name, value] of [['name','description',metadata.description],['name','twitter:title',title],['name','twitter:description',metadata.description],['property','og:title',title],['property','og:description',metadata.description],['property','og:url',url]]) {
    const regex = new RegExp(`<meta\\s+${attribute}="${name}"[^>]*>`, 'g');
    html = html.replace(regex, `<meta ${attribute}="${name}" content="${escape(value)}" />`);
  }
  html = html.replace(/<link rel="canonical"[^>]*>/g, `<link rel="canonical" href="${url}" />`);
  if (route !== '/prevenda') html = html.replace(/<main class="static-fallback"[\s\S]*?<\/main>/, `<main class="static-fallback"><h1>${escape(metadata.title)}</h1><p>${escape(metadata.description)}</p><p><a href="/solucoes/growx-app">GXP</a> · <a href="/produtos/modulo-sem-fio">Módulo Grow-X</a> · <a href="/parceiros">Parceiros</a> · <a href="https://www.supplyx.com.br/">Supply-X</a> · <a href="/contato">Contato</a></p></main>`);
  return html;
}
export function marketingHtml() {
  let outDir;
  return { name: 'growx-public-marketing-html', configResolved(config) { outDir = path.resolve(config.root, config.build.outDir); }, async closeBundle() {
    const main = await readFile(path.join(outDir, 'index.html'), 'utf8');
    const preSale = await readFile(path.join(outDir, 'prevenda.html'), 'utf8');
    for (const [route, metadata] of Object.entries(MARKETING_METADATA)) {
      const file = path.join(outDir, metadata.file); await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, metadataHtml(route === '/prevenda' ? preSale : main, route, metadata));
    }
  } };
}
