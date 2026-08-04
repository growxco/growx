/**
 * Contagem de unidades vendidas e teto do lote da pré-venda.
 *
 * Não existe banco: a contagem vem da Stripe e do Mercado Pago, que são a fonte
 * da verdade. Sem isso a Grow-X só descobriria overselling em 20/11, com cada
 * contrato excedente dando direito a rescisão pela cláusula 4.
 */
import { OFERTA } from '../../src/lib/oferta.js';

const STRIPE_API = 'https://api.stripe.com/v1';
const MP_API = 'https://api.mercadopago.com';
const FONTE = 'growx.com.br/prevenda';
const MP_REF = 'gx-modulo-prevenda';
/** Nenhuma venda da pré-venda existe antes disto — recorta a varredura. */
const INICIO_PREVENDA = '2026-08-01';

/** Sessões de checkout pagas da pré-venda. */
async function contarStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith('sk_')) return { ok: false, total: 0 };

  // A conta Stripe é compartilhada com outros produtos da Grow-X (uapx,
  // psicologx, gxp). Sem recortar pela janela da pré-venda, a contagem teria
  // que varrer as sessões de todos eles e acabaria estourando o tempo da função.
  const desde = Math.floor(Date.parse(`${INICIO_PREVENDA}T00:00:00-03:00`) / 1000);

  let total = 0;
  let startingAfter = null;
  for (let pagina = 0; pagina < 20; pagina++) {
    const url = `${STRIPE_API}/checkout/sessions?limit=100&created[gte]=${desde}`
      + (startingAfter ? `&starting_after=${startingAfter}` : '');
    const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) return { ok: false, total: 0 };
    const d = await r.json();
    const lote = d.data || [];
    for (const s of lote) {
      if (s.metadata?.source === FONTE && s.payment_status === 'paid') total += 1;
    }
    if (!d.has_more || !lote.length) break;
    startingAfter = lote[lote.length - 1].id;
  }
  return { ok: true, total };
}

/** Pagamentos aprovados da pré-venda no Mercado Pago. */
async function contarMercadoPago() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return { ok: false, total: 0 };

  let total = 0;
  const PAGINA = 50;
  for (let offset = 0; offset < 2000; offset += PAGINA) {
    const r = await fetch(
      `${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(MP_REF)}`
      + `&sort=date_created&criteria=desc&limit=${PAGINA}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!r.ok) return { ok: false, total: 0 };
    const d = await r.json();
    const lote = d.results || [];
    total += lote.filter((p) => p.status === 'approved').length;
    const totalApi = d.paging?.total ?? lote.length;
    if (lote.length < PAGINA || offset + PAGINA >= totalApi) break;
  }
  return { ok: true, total };
}

/**
 * @returns {{vendidas:number, restantes:number, esgotado:boolean, confiavel:boolean, total:number}}
 * `confiavel` é false se algum provedor não respondeu — nesse caso NÃO bloqueamos
 * a venda (não dá pra recusar dinheiro com base em contagem incompleta), mas o
 * log registra para conferência manual.
 */
export async function estadoDoLote() {
  const [stripe, mp] = await Promise.all([
    contarStripe().catch(() => ({ ok: false, total: 0 })),
    contarMercadoPago().catch(() => ({ ok: false, total: 0 })),
  ]);

  const vendidas = stripe.total + mp.total;
  const confiavel = stripe.ok && mp.ok;
  const restantes = Math.max(0, OFERTA.loteTotal - vendidas);

  return {
    total: OFERTA.loteTotal,
    vendidas,
    restantes,
    esgotado: confiavel && vendidas >= OFERTA.loteTotal,
    confiavel,
  };
}
