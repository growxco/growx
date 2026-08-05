#!/usr/bin/env node
/**
 * Guarda da oferta: garante que os arquivos que NÃO conseguem importar
 * src/lib/oferta.js (HTML estático, sitemap, imagem OG) não fiquem com preço ou
 * data antigos. Roda no build — publicar oferta divergente da cobrada é o pior
 * defeito possível numa pré-venda.
 */
import { readFile } from 'node:fs/promises';
import { OFERTA, brlCurto } from '../src/lib/oferta.js';

const pix = brlCurto(OFERTA.pixCentavos);        // "R$ 2.800"
const cartao = brlCurto(OFERTA.cartaoCentavos);  // "R$ 3.000"
const publico = brlCurto(OFERTA.publicoCentavos);// "R$ 5.500"

const ALVOS = [
  {
    arquivo: 'prevenda.html',
    precisa: [pix, publico, OFERTA.encerramentoBR.slice(0, 5), OFERTA.entregaBR.slice(0, 5)],
  },
];

// Valores que já foram usados e não podem reaparecer soltos.
const OBSOLETOS = ['R$ 2.997', 'R$ 3.200', 'R$ 3.500', 'R$ 497'];

let falhou = false;

for (const { arquivo, precisa } of ALVOS) {
  let txt;
  try {
    txt = await readFile(arquivo, 'utf8');
  } catch {
    console.error(`✗ ${arquivo}: não encontrado`);
    falhou = true;
    continue;
  }
  for (const termo of precisa) {
    if (!txt.includes(termo)) {
      console.error(`✗ ${arquivo}: não contém "${termo}" — oferta divergente do que é cobrado`);
      falhou = true;
    }
  }
  for (const velho of OBSOLETOS) {
    if (txt.includes(velho)) {
      console.error(`✗ ${arquivo}: ainda contém o valor antigo "${velho}"`);
      falhou = true;
    }
  }
}

if (falhou) {
  console.error('\nAtualize os arquivos acima para os valores de src/lib/oferta.js.');
  process.exit(1);
}
console.log(`✓ oferta consistente: ${pix} Pix · ${cartao} cartão · ${publico} público · encerra ${OFERTA.encerramentoBR} · entrega ${OFERTA.entregaBR} · lote ${OFERTA.loteTotal}`);
