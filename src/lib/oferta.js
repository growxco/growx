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
  // No último dia paramos de criar checkouts às 23:30 BRT. A janela restante
  // permite que Stripe/MP mantenham a cobrança aberta por 30 minutos e a
  // encerrem no fim do dia, sem aceitar uma nova reserva depois do prazo.
  checkoutFechamentoISO: '2026-11-15T23:30:00-03:00',
  providerExpiracaoISO: '2026-11-16T00:00:00-03:00',
  // 31 min deixam a sessão ainda >=30 min quando a Stripe recebe a chamada;
  // usar exatamente 30 min falha por latência e arredondamento de epoch.
  reservaMinutos: 31,

  loteTotal: 100,           // teto de unidades da pré-venda

  contratoVersao: 'v2-2026-08-05',
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

/** Cutoff exclusivo: no instante das 23:30 BRT o checkout já está fechado. */
export const checkoutAbertoEm = (agora = new Date()) => {
  const instante = agora instanceof Date ? agora.getTime() : new Date(agora).getTime();
  return Number.isFinite(instante) && instante < Date.parse(OFERTA.checkoutFechamentoISO);
};

/**
 * Cada reserva dura 30 minutos, limitada ao fim de 15/11 em São Paulo.
 * Retorna ISO UTC para compartilhar exatamente o mesmo instante com os
 * providers e com o item DynamoDB.
 */
export const expiracaoDaReserva = (agora = new Date()) => {
  const instante = agora instanceof Date ? agora.getTime() : new Date(agora).getTime();
  if (!Number.isFinite(instante)) throw new TypeError('invalid_reservation_clock');
  // Arredonda para cima ao segundo porque Stripe valida mínimo de 30 minutos
  // em epoch seconds; truncar milissegundos poderia produzir 29m59s.
  const normal = Math.ceil(instante / 1000) * 1000 + OFERTA.reservaMinutos * 60_000;
  const final = Date.parse(OFERTA.providerExpiracaoISO);
  return new Date(Math.min(normal, final));
};
