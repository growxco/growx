/**
 * FONTE ÚNICA da oferta da pré-venda do Módulo Grow-X.
 *
 * Preço, datas, teto de lote e versão do contrato moram aqui e em nenhum outro
 * lugar. As funções da API (api/*.js) importam este mesmo arquivo, então uma
 * alteração aqui vale para a página, para a cobrança e para o contrato ao
 * mesmo tempo.
 *
 * Ao mudar preço ou data, rode `npm run verifica:oferta` — o script varre os
 * arquivos que NÃO conseguem importar daqui (prevenda.html, sitemap, imagem OG)
 * e falha se algum ficou com o valor antigo.
 */

export const OFERTA = {
  pixCentavos: 280000,      // R$ 2.800,00
  cartaoCentavos: 300000,   // R$ 3.000,00
  parcelas: 12,
  publicoCentavos: 550000,  // R$ 5.500,00 — preço depois do lançamento

  entregaISO: '2026-11-20',
  entregaBR: '20/11/2026',
  // A pré-venda fecha antes do lançamento: sem data de encerramento, quem
  // comprasse em dezembro já nasceria com direito a rescindir pela cláusula 4.
  encerramentoISO: '2026-11-15',
  encerramentoBR: '15/11/2026',

  loteTotal: 100,           // teto de unidades da pré-venda

  contratoVersao: 'v1-2026-08-04',
  evento: 'ExpoCannabis Brasil 2026',
};

export const brl = (centavos) =>
  (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "R$ 2.800" — sem centavos, para títulos e botões. */
export const brlCurto = (centavos) =>
  `R$ ${(centavos / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;

export const parcelaCurta = () =>
  `${OFERTA.parcelas}x de ${brlCurto(OFERTA.cartaoCentavos / OFERTA.parcelas)}`;

export const economiaCentavos = OFERTA.publicoCentavos - OFERTA.pixCentavos;
