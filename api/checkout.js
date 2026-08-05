/**
 * /api/checkout — pagamento da pré-venda do Módulo Grow-X.
 *
 * POST { method: 'cartao' | 'pix' }
 *   cartao → Stripe Checkout, R$ 3.000 em até 12x  → { url }
 *   pix    → Mercado Pago Orders API (Pix-only), R$ 2.800 → { url local }
 * GET ?session_id=cs_...  ou  ?order_id=ORD...  ou  ?payment_id=123 (legado)
 *   → status do pagamento pra página de confirmação.
 *
 * No cartão coletamos CPF, exigimos aceite do contrato de pré-venda e pedimos
 * pra Stripe emitir a fatura (que ela envia por e-mail ao comprador). Recursos
 * que a conta não suportar são desligados um a um em vez de derrubar a venda.
 *
 * Requer STRIPE_SECRET_KEY e MP_ACCESS_TOKEN. Sem a env do provider pedido
 * responde 503 — nunca simula pagamento.
 */
import { timingSafeEqual } from 'node:crypto';

import { rateLimit, clientIp } from './_lib/ai.js';
import { documentoValido, tipoDocumento, digitos, emailValido } from './_lib/cpf.js';
import { estadoDoLote } from './_lib/lote.js';
import {
  acquireReservation,
  attachProvider,
  deriveReservationKey,
  getReservation,
  InventoryBuyerConflictError,
  InventoryConflictError,
  InventoryRateLimitError,
  InventorySoldOutError,
  InventoryUnavailableError,
  releaseUnattachedReservation,
} from './_lib/inventory.js';
import {
  TurnstileRejectedError,
  TurnstileUnavailableError,
  verifyCheckoutChallenge,
} from './_lib/turnstile.js';
import { checkoutAbertoEm, expiracaoDaReserva, OFERTA } from '../src/lib/oferta.js';

export const config = { runtime: 'nodejs' };

const SITE = 'https://www.growx.com.br';
const STRIPE_API = 'https://api.stripe.com/v1';
const MP_API = 'https://api.mercadopago.com';
const PROVIDER_TIMEOUT_MS = 8_000;
const STRIPE_MIN_EXPIRY_LEAD_MS = (30 * 60 * 1000) + 5_000;
const VALID_REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_SLOT = /^SLOT#(?:0(?:0[1-9]|[1-9]\d)|100)$/;
const VALID_STATUS_TOKEN = /^[a-f0-9]{64}$/;
const VALID_MP_ORDER_ID = /^ORD[A-Z0-9]{10,80}$/;
const VALID_MP_ORDER_PAYMENT_ID = /^PAY[A-Z0-9]{10,80}$/;
const MP_PIX_EXPIRATION_TIME = 'PT30M';

export const CONTRACT_VERSION = OFERTA.contratoVersao;
const CONTRACT_URL = `${SITE}/prevenda/contrato`;
const ENTREGA = OFERTA.entregaBR;

const OFFER = {
  cartao: {
    amount: OFERTA.cartaoCentavos,
    currency: 'BRL',
    sku: 'prevenda_cartao',
    title: 'Módulo Grow-X — Pré-venda',
    description:
      'Central de automação indoor: 6 tomadas inteligentes, fotoperíodo e transições com driver DIM/PWM compatível, ' +
      'rega por umidade do solo, sensores e app GXP (3 meses de Premium inclusos). ' +
      `Entrega a partir de ${ENTREGA}. Reembolso integral até o envio · garantia de 12 meses conforme o contrato.`,
  },
  pix: {
    amount: OFERTA.pixCentavos,
    currency: 'BRL',
    sku: 'prevenda_pix',
    title: 'Módulo Grow-X — Pré-venda (Pix)',
    description:
      'Central de automação indoor: 6 tomadas inteligentes, fotoperíodo e transições com driver DIM/PWM compatível, ' +
      'rega por umidade do solo, sensores e app GXP (3 meses de Premium inclusos). ' +
      `Entrega a partir de ${ENTREGA}. Reembolso integral até o envio · garantia de 12 meses conforme o contrato.`,
  },
};

const stripeKey = () => {
  const k = process.env.STRIPE_SECRET_KEY;
  return k && k.startsWith('sk_') ? k : null;
};
const mpToken = () => process.env.MP_ACCESS_TOKEN || null;

const reservationSecret = () => {
  const secret = process.env.PREVENDA_RESERVATION_SECRET;
  return typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32 ? secret : null;
};

function reservationOffer(reservation) {
  const amount = Number(reservation?.offerAmountCents);
  const currency = String(reservation?.offerCurrency || '').toUpperCase();
  const sku = String(reservation?.offerSku || '');
  const contractVersion = String(reservation?.contractVersion || '');
  if (!Number.isInteger(amount) || amount <= 0
      || !/^[A-Z]{3}$/.test(currency)
      || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(sku)
      || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(contractVersion)) {
    throw new Error('invalid_reservation_offer_snapshot');
  }
  return { amount, currency, sku, contractVersion };
}

export function checkoutStatusToken(secret, { provider, requestId, slot }) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32
      || !['stripe', 'mercadopago'].includes(provider)
      || !VALID_REQUEST_ID.test(String(requestId || ''))
      || !VALID_SLOT.test(String(slot || ''))) {
    throw new Error('invalid_checkout_status_binding');
  }
  return deriveReservationKey(secret, 'status-v1', `${provider}\0${requestId}\0${slot}`);
}

export function verifyCheckoutStatusToken(secret, binding, candidate) {
  if (!VALID_STATUS_TOKEN.test(String(candidate || ''))) return false;
  let expected;
  try { expected = checkoutStatusToken(secret, binding); }
  catch { return false; }
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(String(candidate), 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

function statusReturnQuery(reservation, provider) {
  const token = reservation.statusToken;
  if (!['stripe', 'mercadopago'].includes(provider)
      || !VALID_REQUEST_ID.test(String(reservation.requestId || ''))
      || !VALID_SLOT.test(String(reservation.slot || ''))
      || !VALID_STATUS_TOKEN.test(String(token || ''))) {
    throw new Error('invalid_checkout_status_binding');
  }
  return `request_id=${encodeURIComponent(reservation.requestId)}&status_token=${encodeURIComponent(token)}`;
}

export const isDefinitiveProviderCreationFailure = (error) => {
  if (error?.code === 'OFFER_CLOSED') return true;
  const status = Number(error?.status);
  return Number.isInteger(status)
    && status >= 400
    && status < 500
    && ![408, 409, 425, 429].includes(status);
};

const safeProviderField = (value) => {
  const normalized = String(value || '');
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(normalized) ? normalized : null;
};

export function providerErrorLogFields(provider, error) {
  const status = Number(error?.status);
  return {
    provider: ['stripe', 'mercadopago'].includes(provider) ? provider : 'unknown',
    error: safeProviderField(error?.name) || 'Error',
    status: Number.isInteger(status) && status >= 400 && status <= 599 ? status : null,
    code: safeProviderField(error?.providerCode || error?.code),
    param: safeProviderField(error?.param),
  };
}

async function stripeRequest(method, path, params, { idempotencyKey } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const r = await fetch(`${STRIPE_API}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${stripeKey()}`,
        ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: params ? params.toString() : undefined,
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const err = new Error(data?.error?.message || `stripe_http_${r.status}`);
      err.status = r.status;
      err.param = data?.error?.param || '';
      err.providerCode = data?.error?.code || '';
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/** Recursos não financeiros opcionais — desligados individualmente se a conta recusar. */
const OPTIONAL = ['consent', 'invoice'];

export const stripeCheckoutIdempotencyKey = (requestId, enabled) => {
  const featureMask = OPTIONAL.filter((feature) => enabled[feature]).join('-') || 'base';
  return `prevenda:${requestId}:${featureMask}`;
};

export function stripeParams(on, comprador, reservation) {
  const o = OFFER.cartao;
  const offer = reservationOffer(reservation);
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('success_url', `${SITE}/prevenda/sucesso?session_id={CHECKOUT_SESSION_ID}&${statusReturnQuery(reservation, 'stripe')}`);
  p.set('cancel_url', `${SITE}/prevenda?checkout=cancelado`);
  p.set('locale', 'pt-BR');
  // Restringe a cartão síncrono. Métodos assíncronos podem concluir a sessão
  // sem pagamento e deixariam o hold sem uma transição final inequívoca.
  p.set('payment_method_types[0]', 'card');
  // Parcelamento em até 12x é termo material da oferta. Se a conta recusar
  // este parâmetro, a criação falha fechada; nunca convertemos silenciosamente
  // a promessa de 12x em pagamento à vista.
  p.set('payment_method_options[card][installments][enabled]', 'true');
  p.set('customer_creation', 'always');
  p.set('phone_number_collection[enabled]', 'true');
  p.set('billing_address_collection', 'required');
  p.set('tax_id_collection[enabled]', 'true');
  p.set('shipping_address_collection[allowed_countries][0]', 'BR');
  p.set('customer_email', comprador.email);
  p.set('expires_at', String(Math.floor(reservation.providerExpiresAt.getTime() / 1000)));

  p.set('line_items[0][quantity]', '1');
  p.set('line_items[0][price_data][currency]', offer.currency.toLowerCase());
  p.set('line_items[0][price_data][unit_amount]', String(offer.amount));
  p.set('line_items[0][price_data][product_data][name]', o.title);
  p.set('line_items[0][price_data][product_data][description]', o.description);

  p.set('payment_intent_data[description]', `${o.title} · contrato ${offer.contractVersion} · ${CONTRACT_URL}`);
  // A cobrança (charge) NÃO herda o metadata da sessão. Sem isto, um reembolso
  // ou chargeback do Módulo chegaria ao webhook sem marca de produto e seria
  // descartado como "de outro produto" — dinheiro saindo sem ninguém saber.
  // A conta atende vários produtos da Grow-X e o extrato do cartão mostra só o
  // prefixo da conta ("GROW-X CO."). O sufixo identifica o produto na fatura
  // ("GROW-X CO.* MODULO") e reduz contestação por não reconhecimento.
  p.set('payment_intent_data[statement_descriptor_suffix]', 'MODULO');
  p.set('payment_intent_data[metadata][source]', 'growx.com.br/prevenda');
  p.set('payment_intent_data[metadata][sku]', offer.sku);
  p.set('payment_intent_data[metadata][contract_version]', offer.contractVersion);
  p.set('payment_intent_data[metadata][request_id]', reservation.requestId);
  p.set('payment_intent_data[metadata][slot_id]', reservation.slot);
  p.set('payment_intent_data[metadata][buyer_hash]', reservation.buyerKey);
  p.set('metadata[sku]', offer.sku);
  p.set('metadata[source]', 'growx.com.br/prevenda');
  p.set('metadata[contract_version]', offer.contractVersion);
  p.set('metadata[request_id]', reservation.requestId);
  p.set('metadata[slot_id]', reservation.slot);
  p.set('metadata[buyer_hash]', reservation.buyerKey);

  p.set('custom_text[submit][message]',
    `Você reserva 1 Módulo Grow-X com entrega a partir de ${ENTREGA}, ` +
    `reembolso integral até o envio e garantia de 12 meses conforme o contrato.`);

  // Aceite explícito do contrato, registrado pela Stripe na sessão
  if (on.consent) {
    p.set('consent_collection[terms_of_service]', 'required');
    // markdown é suportado aqui — vira link clicável pro nosso contrato
    p.set('custom_text[terms_of_service_acceptance][message]',
      `Li e aceito o [contrato de pré-venda do Módulo Grow-X](${CONTRACT_URL}) (${offer.contractVersion}).`);
  }

  // Fatura hospedada — a Stripe envia o PDF por e-mail ao comprador.
  // invoice_data é aninhado dentro de invoice_creation (top-level é recusado).
  if (on.invoice) {
    p.set('invoice_creation[enabled]', 'true');
    p.set('invoice_creation[invoice_data][description]',
      `Pré-venda do Módulo Grow-X. Entrega a partir de ${ENTREGA}. ` +
      `Reembolso integral até o envio; garantia de 12 meses conforme o contrato.`);
    p.set('invoice_creation[invoice_data][footer]',
      `Grow-X Co. Tecnologias LTDA · growx.com.br · Contrato de pré-venda ${offer.contractVersion}: ${CONTRACT_URL}`);
    p.set('invoice_creation[invoice_data][custom_fields][0][name]', 'Entrega a partir de');
    p.set('invoice_creation[invoice_data][custom_fields][0][value]', ENTREGA);
    p.set('invoice_creation[invoice_data][custom_fields][1][name]', 'Contrato');
    p.set('invoice_creation[invoice_data][custom_fields][1][value]', offer.contractVersion);
  }

  return p;
}

/** Mapeia a mensagem de erro da Stripe para o recurso que precisa ser desligado. */
function featureFromError(msg, param) {
  const t = `${msg} ${param}`.toLowerCase();
  if (t.includes('installment')) return 'installments';
  if (t.includes('terms_of_service') || t.includes('consent')) return 'consent';
  if (t.includes('invoice')) return 'invoice';
  return null;
}

async function createStripeSession(comprador, reservation) {
  const on = Object.fromEntries(OPTIONAL.map((f) => [f, true]));
  const desligados = [];

  for (let i = 0; i <= OPTIONAL.length; i++) {
    try {
      if (reservation.providerExpiresAt.getTime() - Date.now() < STRIPE_MIN_EXPIRY_LEAD_MS) {
        const error = new Error('stripe_expiry_window_closed');
        error.code = 'OFFER_CLOSED';
        throw error;
      }
      const session = await stripeRequest(
        'POST',
        '/checkout/sessions',
        stripeParams(on, comprador, reservation),
        { idempotencyKey: stripeCheckoutIdempotencyKey(reservation.requestId, on) },
      );
      if (desligados.length) {
        console.warn('[checkout] recursos desligados pela conta Stripe:', desligados.join(', '));
      }
      return session;
    } catch (e) {
      const f = featureFromError(e.message, e.param);
      if (!f || !on[f]) throw e; // erro que não sabemos contornar → falha honesta
      on[f] = false;
      desligados.push(f);
    }
  }
  throw new Error('stripe_session_unavailable');
}

/**
 * Contrato legado do Checkout Pro. Mantido exportado enquanto testes e rotinas
 * de reconciliação antigas ainda o conhecem; o hot path Pix-only não o utiliza.
 */
export function buildMpPreference(comprador, reservation) {
  const o = OFFER.pix;
  const offer = reservationOffer(reservation);
  const [primeiro, ...resto] = comprador.nome.split(/\s+/);
  const [cidade = '', uf = ''] = comprador.cidadeUf.split(/\s*[-/]\s*/, 2);
  return {
    items: [{
      id: 'gx-modulo-prevenda-pix',
      title: o.title,
      description: o.description,
      category_id: 'electronics',
      quantity: 1,
      currency_id: offer.currency,
      unit_price: offer.amount / 100,
    }],
    payer: {
      name: primeiro,
      surname: resto.join(' ') || primeiro,
      email: comprador.email,
      identification: { type: tipoDocumento(comprador.cpf) || 'CPF', number: comprador.cpf },
      ...(comprador.telefone ? { phone: { number: digitos(comprador.telefone) } } : {}),
    },
    ...(comprador.cep ? {
      shipments: {
        receiver_address: {
          zip_code: comprador.cep,
          street_name: comprador.endereco,
          city_name: cidade,
          state_name: uf,
          country_name: 'Brasil',
        },
      },
    } : {}),
    payment_methods: {
      excluded_payment_types: [
        { id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'atm' },
      ],
      installments: 1,
    },
    back_urls: {
      success: `${SITE}/prevenda/sucesso?${statusReturnQuery(reservation, 'mercadopago')}`,
      pending: `${SITE}/prevenda/sucesso?${statusReturnQuery(reservation, 'mercadopago')}`,
      failure: `${SITE}/prevenda?checkout=falhou`,
    },
    auto_return: 'approved',
    expires: true,
    expiration_date_from: reservation.createdAt.toISOString(),
    expiration_date_to: reservation.providerExpiresAt.toISOString(),
    date_of_expiration: reservation.providerExpiresAt.toISOString(),
    notification_url: `${SITE}/api/mp-webhook?source=ipn`,
    statement_descriptor: 'GROWX MODULO',
    external_reference: 'gx-modulo-prevenda',
    metadata: {
      sku: offer.sku,
      source: 'growx.com.br/prevenda',
      contract_version: offer.contractVersion,
      request_id: reservation.requestId,
      slot_id: reservation.slot,
      buyer_hash: reservation.buyerKey,
    },
  };
}

/** Compatibilidade estrita; não usar para novas cobranças Pix-only. */
export async function createMpPreference(comprador, reservation) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  let r;
  try {
    r = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${mpToken()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': reservation.requestId,
      },
      body: JSON.stringify(buildMpPreference(comprador, reservation)),
    });
  } finally {
    clearTimeout(timer);
  }
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const err = new Error(data?.message || `mp_http_${r.status}`);
    err.status = r.status;
    err.providerCode = data?.error || data?.code || '';
    throw err;
  }
  return data;
}

const mpAmountString = (amountCents) => (amountCents / 100).toFixed(2);

const mpDecimalCents = (value) => {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fractional = ''] = normalized.split('.');
  const cents = (Number(whole) * 100) + Number(fractional.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
};

export function mpOrderExternalReference(reservation) {
  const requestId = String(reservation?.requestId || '').toLowerCase();
  if (!VALID_REQUEST_ID.test(requestId)) throw new Error('invalid_mp_order_reservation');
  return `gx-modulo-prevenda-${requestId}`;
}

export function buildMpOrder(comprador, reservation) {
  const offer = reservationOffer(reservation);
  if (offer.currency !== 'BRL') throw new Error('invalid_mp_order_currency');
  const [firstName, ...lastNameParts] = String(comprador?.nome || '').trim().split(/\s+/).filter(Boolean);
  const documentType = tipoDocumento(comprador?.cpf);
  const documentNumber = digitos(comprador?.cpf);
  const email = String(comprador?.email || '').trim().toLowerCase();
  if (!firstName || !lastNameParts.length || !emailValido(email)
      || !documentType || !documentoValido(documentNumber)) {
    throw new Error('invalid_mp_order_payer');
  }
  const amount = mpAmountString(offer.amount);
  return {
    type: 'online',
    total_amount: amount,
    external_reference: mpOrderExternalReference(reservation),
    processing_mode: 'automatic',
    statement_descriptor: 'GROWX MODULO',
    transactions: {
      payments: [{
        amount,
        payment_method: { id: 'pix', type: 'bank_transfer' },
        expiration_time: MP_PIX_EXPIRATION_TIME,
      }],
    },
    payer: {
      email,
      first_name: firstName,
      last_name: lastNameParts.join(' '),
      identification: { type: documentType, number: documentNumber },
    },
  };
}

const safeMpTicketUrl = (value) => {
  try {
    const url = new URL(String(value || ''));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password
        || (url.port && url.port !== '443')
        || !(host === 'mercadopago.com.br' || host.endsWith('.mercadopago.com.br'))) return null;
    return url.toString();
  } catch {
    return null;
  }
};

function mpOrderPayment(order) {
  const payments = order?.transactions?.payments;
  return Array.isArray(payments) && payments.length === 1 ? payments[0] : null;
}

function mpOrderMatchesReservation(order, reservation, { requireTicketUrl }) {
  let offer;
  let externalReference;
  try {
    offer = reservationOffer(reservation);
    externalReference = mpOrderExternalReference(reservation);
  }
  catch { return null; }
  if (offer.currency !== 'BRL') return null;
  const payment = mpOrderPayment(order);
  const ticketUrl = safeMpTicketUrl(payment?.payment_method?.ticket_url);
  const orderId = String(order?.id || '').toUpperCase();
  const paymentId = String(payment?.id || '').toUpperCase();
  if (!VALID_MP_ORDER_ID.test(orderId)
      || !VALID_MP_ORDER_PAYMENT_ID.test(paymentId)
      || order?.type !== 'online'
      || order?.processing_mode !== 'automatic'
      || order?.external_reference !== externalReference
      || mpDecimalCents(order?.total_amount) !== offer.amount
      || mpDecimalCents(payment?.amount) !== offer.amount
      || payment?.payment_method?.id !== 'pix'
      || payment?.payment_method?.type !== 'bank_transfer'
      || (requireTicketUrl && !ticketUrl)
      || (payment?.payment_method?.ticket_url && !ticketUrl)) return null;
  if (order.status === 'processed' && order.status_detail === 'accredited') {
    if (mpDecimalCents(order.total_paid_amount) !== offer.amount
        || mpDecimalCents(payment.paid_amount) !== offer.amount) return null;
  }
  return { orderId, paymentId, payment, ticketUrl };
}

export function validateMpPixOrderResponse(order, reservation) {
  const validated = mpOrderMatchesReservation(order, reservation, { requireTicketUrl: true });
  if (!validated) {
    const error = new Error('mp_order_response_invalid');
    error.code = 'mp_order_response_invalid';
    throw error;
  }
  return validated;
}

export function mpOrderStatusBelongsToReservation(order, reservation) {
  return Boolean(mpOrderMatchesReservation(order, reservation, { requireTicketUrl: false })
    && String(order.id).toUpperCase() === String(reservation?.providerRef || '').toUpperCase());
}

export function mpOrderStatusUrl(orderId, reservation) {
  const normalized = String(orderId || '').toUpperCase();
  if (!VALID_MP_ORDER_ID.test(normalized)) throw new Error('invalid_mp_order_id');
  return `${SITE}/prevenda/sucesso?order_id=${encodeURIComponent(normalized)}&${statusReturnQuery(reservation, 'mercadopago')}`;
}

export async function createMpOrder(comprador, reservation, { fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  let response;
  try {
    response = await fetchImpl(`${MP_API}/v1/orders`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${mpToken()}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': reservation.requestId,
      },
      body: JSON.stringify(buildMpOrder(comprador, reservation)),
    });
  } finally {
    clearTimeout(timer);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(data?.message || `mp_http_${response.status}`);
    error.status = response.status;
    error.providerCode = data?.error || data?.code || '';
    throw error;
  }
  validateMpPixOrderResponse(data, reservation);
  return data;
}

async function getMpResource(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  let r;
  try {
    r = await fetch(`${MP_API}${path}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${mpToken()}` },
    });
  } finally {
    clearTimeout(timer);
  }
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const err = new Error(`mp_http_${r.status}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

const getMpPayment = (id) => getMpResource(`/v1/payments/${encodeURIComponent(id)}`);
const getMpMerchantOrder = (id) => getMpResource(`/merchant_orders/${encodeURIComponent(id)}`);
const getMpOrder = (id) => getMpResource(`/v1/orders/${encodeURIComponent(id)}`);

function expectedStatusOffer(reservation) {
  const offer = reservationOffer(reservation);
  return { ...offer, currency: offer.currency.toLowerCase() };
}

export function stripeStatusBelongsToReservation(session, reservation) {
  const offer = expectedStatusOffer(reservation);
  return Boolean(session
    && session.id === reservation?.providerRef
    && session.mode === 'payment'
    && session.metadata?.source === 'growx.com.br/prevenda'
    && session.metadata?.sku === offer.sku
    && session.metadata?.request_id === reservation?.requestId
    && session.metadata?.slot_id === reservation?.slot
    && session.metadata?.contract_version === reservation?.contractVersion
    && session.amount_total === offer.amount
    && String(session.currency || '').toLowerCase() === offer.currency);
}

export function mpStatusBelongsToReservation(payment, merchantOrder, reservation) {
  const offer = expectedStatusOffer(reservation);
  const paymentId = String(payment?.id || '');
  return Boolean(payment
    && merchantOrder
    && payment.external_reference === 'gx-modulo-prevenda'
    && payment.metadata?.source === 'growx.com.br/prevenda'
    && payment.metadata?.sku === offer.sku
    && payment.metadata?.request_id === reservation?.requestId
    && payment.metadata?.slot_id === reservation?.slot
    && payment.metadata?.contract_version === reservation?.contractVersion
    && Math.round(Number(payment.transaction_amount) * 100) === offer.amount
    && String(payment.currency_id || '').toLowerCase() === offer.currency
    && String(merchantOrder.preference_id || '') === reservation?.providerRef
    && merchantOrder.external_reference === 'gx-modulo-prevenda'
    && Array.isArray(merchantOrder.payments)
    && merchantOrder.payments.some((candidate) => String(candidate?.id) === paymentId));
}

export function statusRequestAuthorized({ provider, providerReference, requestId, statusToken, reservation, secret }) {
  const storedMpReference = String(reservation?.providerRef || '').toUpperCase();
  const storedMpProtocol = String(reservation?.providerProtocol || '')
    || (VALID_MP_ORDER_ID.test(storedMpReference) ? 'mp_orders_v1' : 'mp_checkout_pro_v1');
  const requestedMpReference = String(providerReference || '').toUpperCase();
  if (!reservation
      || reservation.requestId !== requestId
      || reservation.provider !== provider
      || !VALID_SLOT.test(String(reservation.slot || ''))
      || (provider === 'stripe' && reservation.providerRef !== providerReference)
      || (provider === 'mercadopago' && storedMpProtocol === 'mp_orders_v1'
        && (!VALID_MP_ORDER_ID.test(requestedMpReference) || requestedMpReference !== storedMpReference))
      || (provider === 'mercadopago' && storedMpProtocol !== 'mp_orders_v1'
        && (!reservation.providerRef || !/^\d{5,}$/.test(String(providerReference || ''))))) return false;
  return verifyCheckoutStatusToken(secret, {
    provider,
    requestId,
    slot: reservation.slot,
  }, statusToken);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.growx.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const ip = clientIp(req);
  if (!rateLimit(ip, 20)) return res.status(429).json({ error: 'rate_limited' });

  if (req.method === 'GET') {
    const sessionId = String(req.query?.session_id || '');
    const paymentId = String(req.query?.payment_id || '');
    const orderId = String(req.query?.order_id || '').toUpperCase();
    const requestId = String(req.query?.request_id || '').trim().toLowerCase();
    const statusToken = String(req.query?.status_token || '').trim().toLowerCase();
    const provider = /^cs_[a-zA-Z0-9_]+$/.test(sessionId)
      ? 'stripe'
      : (VALID_MP_ORDER_ID.test(orderId) || /^\d{5,}$/.test(paymentId) ? 'mercadopago' : null);
    const providerReference = provider === 'stripe' ? sessionId : (orderId || paymentId);
    const secret = reservationSecret();
    const notFound = () => res.status(404).json({ error: 'pedido_nao_encontrado' });

    // A referência do provider é compartilhável e, no MP, enumerável. Exigimos
    // um token HMAC opaco emitido no redirect e uma reserva forte correspondente
    // antes de consultar a conta financeira compartilhada.
    if (!provider || !VALID_REQUEST_ID.test(requestId) || !VALID_STATUS_TOKEN.test(statusToken)) {
      return notFound();
    }
    if (!secret) return res.status(503).json({ error: 'checkout_status_not_configured' });
    let reservation;
    try { reservation = await getReservation(requestId); }
    catch (error) {
      console.error('[checkout-status] inventário indisponível:', error?.name || 'Error');
      return res.status(503).json({ error: 'checkout_status_unavailable' });
    }
    if (!statusRequestAuthorized({
      provider, providerReference, requestId, statusToken, reservation, secret,
    })) return notFound();

    if (provider === 'stripe') {
      if (!stripeKey()) return res.status(503).json({ error: 'stripe_not_configured' });
      try {
        const session = await stripeRequest('GET', `/checkout/sessions/${sessionId}`);
        if (!stripeStatusBelongsToReservation(session, reservation)) return notFound();
        return res.status(200).json({
          payment_status: session.payment_status,
          amount_total: session.amount_total,
          currency: session.currency,
          sku: session.metadata.sku,
          reference: session.id,
          // O token autoriza apenas este status pseudônimo; PII continua na
          // área do cliente, autenticada por e-mail + documento.
          contract_accepted: session.consent?.terms_of_service === 'accepted',
          contract_version: session.metadata.contract_version,
        });
      } catch (error) {
        return error.status === 404 ? notFound() : res.status(502).json({ error: 'stripe_error' });
      }
    }

    if (!mpToken()) return res.status(503).json({ error: 'mercadopago_not_configured' });
    if (VALID_MP_ORDER_ID.test(orderId)) {
      try {
        const order = await getMpOrder(orderId);
        if (!mpOrderStatusBelongsToReservation(order, reservation)) return notFound();
        const validated = mpOrderMatchesReservation(order, reservation, { requireTicketUrl: false });
        const paid = order.status === 'processed' && order.status_detail === 'accredited';
        return res.status(200).json({
          payment_status: paid ? 'paid' : (order.status === 'action_required' ? 'pending' : order.status),
          amount_total: reservation.offerAmountCents,
          currency: String(reservation.offerCurrency).toLowerCase(),
          sku: reservation.offerSku,
          reference: String(order.id),
          payment_reference: validated.paymentId,
          contract_version: reservation.contractVersion,
          // A URL financeira nunca é persistida nem devolvida no POST. Só este
          // GET autenticado pelo status_token pode entregá-la ao frontend.
          ticket_url: validated.ticketUrl,
        });
      } catch (error) {
        return error.status === 404 ? notFound() : res.status(502).json({ error: 'mp_error' });
      }
    }

    // Compatibilidade Checkout Pro: payment_id numérico e merchant_order.
    // mp-webhook, cron, pedido e pós-venda ainda dependem deste protocolo e
    // precisam migrar para Orders antes de PREVENDA_PIX_ENABLED ser ativada.
    try {
      const payment = await getMpPayment(paymentId);
      const merchantOrderId = String(payment?.order?.id || '');
      if (!/^\d{5,}$/.test(merchantOrderId)) return notFound();
      const merchantOrder = await getMpMerchantOrder(merchantOrderId);
      if (!mpStatusBelongsToReservation(payment, merchantOrder, reservation)) return notFound();
      return res.status(200).json({
        payment_status: payment.status === 'approved' ? 'paid' : payment.status,
        amount_total: Math.round(Number(payment.transaction_amount) * 100),
        currency: String(payment.currency_id).toLowerCase(),
        sku: payment.metadata.sku,
        reference: String(payment.id),
        contract_version: payment.metadata.contract_version,
      });
    } catch (error) {
      return error.status === 404 ? notFound() : res.status(502).json({ error: 'mp_error' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  // Fail closed: novas cobranças só podem ser abertas por uma decisão explícita
  // de operação. O GET continua disponível para as sessões legadas concluírem
  // o retorno enquanto Hardware/Jurídico aprovam datasheet, kit e frete.
  // Ausência da env nunca abre vendas por acidente.
  if (process.env.PREVENDA_SALES_ENABLED !== 'true') {
    res.setHeader('Retry-After', '300');
    return res.status(503).json({ error: 'vendas_pausadas' });
  }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  const requestedMethod = String(body?.method || body?.sku || '');
  const method = requestedMethod === 'prevenda' ? 'cartao' : requestedMethod;
  const requestId = String(body?.requestId || body?.request_id || '').trim().toLowerCase();
  const now = new Date();

  if (!['cartao', 'pix'].includes(method)) {
    return res.status(400).json({ error: 'invalid_method', valid: ['cartao', 'pix'] });
  }
  if (!VALID_REQUEST_ID.test(requestId)) return res.status(400).json({ error: 'request_id_invalido' });
  if (!checkoutAbertoEm(now)) {
    return res.status(410).json({
      error: 'oferta_encerrada',
      encerramento: OFERTA.encerramentoBR,
    });
  }

  const provider = method === 'pix' ? 'mercadopago' : 'stripe';
  // Orders já restringe a criação a Pix, mas webhook/cron/pedido/pós-venda
  // ainda estão no protocolo legado. Até a migração ponta a ponta, a flag fecha.
  if (provider === 'mercadopago' && process.env.PREVENDA_PIX_ENABLED !== 'true') {
    return res.status(503).json({ error: 'pix_em_homologacao' });
  }
  if (provider === 'stripe' && !stripeKey()) {
    return res.status(503).json({ error: 'stripe_not_configured' });
  }
  if (provider === 'mercadopago' && !mpToken()) {
    return res.status(503).json({ error: 'mercadopago_not_configured' });
  }

  // Abrir um hold consome capacidade escassa. A venda só pode ser habilitada
  // junto com a prova anti-bot validada no servidor; ausência de env, falha do
  // provedor ou token reutilizado nunca chegam ao DynamoDB.
  if (process.env.PREVENDA_TURNSTILE_ENABLED !== 'true') {
    res.setHeader('Retry-After', '300');
    return res.status(503).json({ error: 'verificacao_seguranca_indisponivel' });
  }
  try {
    await verifyCheckoutChallenge({
      token: body?.turnstileToken || body?.turnstile_token,
      requestId,
      remoteIp: ip,
    });
  } catch (error) {
    if (error instanceof TurnstileRejectedError) {
      return res.status(403).json({ error: 'verificacao_seguranca_invalida' });
    }
    if (error instanceof TurnstileUnavailableError) {
      res.setHeader('Retry-After', '60');
      return res.status(503).json({ error: 'verificacao_seguranca_indisponivel' });
    }
    throw error;
  }

  // Identificação do comprador — exigida pelo contrato, pela nota fiscal e pela
  // área do cliente. Validada aqui de novo, nunca só no browser.
  const nome = String(body?.nome || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 160);
  const cpf = digitos(body?.cpf);

  if (nome.split(' ').filter(Boolean).length < 2) return res.status(400).json({ error: 'nome_incompleto' });
  if (!emailValido(email)) return res.status(400).json({ error: 'email_invalido' });
  if (!documentoValido(cpf)) return res.status(400).json({ error: 'documento_invalido' });
  if (body?.aceite !== true) return res.status(400).json({ error: 'aceite_obrigatorio' });
  if (body?.cienciaEspecificacoes !== true) {
    return res.status(400).json({ error: 'ciencia_especificacoes_obrigatoria' });
  }

  // O cadastro de compra termina aqui: nome, e-mail e CPF/CNPJ. A Stripe pode
  // coletar endereço no checkout do cartão; no Pix, a entrega é confirmada
  // depois do pagamento pela área do cliente/time, sem aumentar abandono.
  const cep = digitos(body?.cep);
  const endereco = String(body?.endereco || '').trim().slice(0, 200);
  const cidadeUf = String(body?.cidadeUf || '').trim().slice(0, 120);
  const telefone = String(body?.telefone || '').trim().slice(0, 40);

  const comprador = {
    nome, email, cpf, cep, endereco, cidadeUf, telefone,
    aceiteEm: now.toISOString(),
  };
  const guardSecret = reservationSecret();
  if (!guardSecret) {
    console.error('[checkout] guarda de reserva não configurada');
    res.setHeader('Retry-After', '300');
    return res.status(503).json({ error: 'capacidade_indisponivel' });
  }
  // HMACs com domínios separados: Dynamo recebe apenas hashes irreversíveis,
  // nunca CPF nem IP. A chave secreta também nunca é persistida ou registrada.
  const buyerKey = deriveReservationKey(guardSecret, 'buyer', cpf);
  const emailHash = deriveReservationKey(guardSecret, 'email', email);
  const riskKey = deriveReservationKey(guardSecret, 'risk', ip);

  // Hot path lê apenas os 100 slots com consistência forte. Reconciliação com
  // providers roda no cron autenticado; qualquer hold ambíguo segue ocupado.
  try {
    const lote = await estadoDoLote();
    if (lote.financeiroPendente || lote.confiavel === false) {
      res.setHeader('Retry-After', '60');
      return res.status(503).json({ error: 'reconciliacao_financeira_pendente' });
    }
    if (lote.esgotado) {
      return res.status(409).json({
        error: 'lote_esgotado',
        vendidas: lote.vendidas,
        total: lote.total,
        hint: `As ${lote.total} unidades da pré-venda foram vendidas.`,
      });
    }
  } catch (e) {
    console.error('[checkout] inventário indisponível:', e.message);
    res.setHeader('Retry-After', '60');
    return res.status(503).json({ error: 'capacidade_indisponivel' });
  }

  // Recalcula imediatamente antes da aquisição. A Stripe rejeita expires_at
  // abaixo de 30 minutos após a criação da sessão.
  const reservationNow = new Date();
  if (!checkoutAbertoEm(reservationNow)) {
    return res.status(410).json({ error: 'oferta_encerrada', encerramento: OFERTA.encerramentoBR });
  }
  const providerExpiresAt = expiracaoDaReserva(reservationNow);
  if (provider === 'stripe'
      && providerExpiresAt.getTime() - Date.now() < STRIPE_MIN_EXPIRY_LEAD_MS) {
    return res.status(410).json({ error: 'oferta_encerrada', encerramento: OFERTA.encerramentoBR });
  }

  let reservation;
  try {
    reservation = await acquireReservation({
      requestId,
      provider,
      buyerKey,
      emailHash,
      riskKey,
      offerAmountCents: OFFER[method].amount,
      offerCurrency: OFFER[method].currency,
      offerSku: OFFER[method].sku,
      contractVersion: CONTRACT_VERSION,
      providerExpiresAt,
      now: reservationNow,
    });
  } catch (e) {
    if (e instanceof InventorySoldOutError) {
      return res.status(409).json({ error: 'lote_esgotado', total: OFERTA.loteTotal });
    }
    if (e instanceof InventoryBuyerConflictError) {
      return res.status(409).json({ error: 'comprador_ja_reservado' });
    }
    if (e instanceof InventoryRateLimitError) {
      res.setHeader('Retry-After', String(31 * 60));
      return res.status(429).json({ error: 'muitas_reservas' });
    }
    if (e instanceof InventoryConflictError) {
      return res.status(409).json({ error: e.message });
    }
    if (e instanceof InventoryUnavailableError) {
      console.error('[checkout] DynamoDB indisponível:', e.message);
      res.setHeader('Retry-After', '60');
      return res.status(503).json({ error: 'capacidade_indisponivel' });
    }
    throw e;
  }

  // Só o request que criou REQUEST#uuid pode criar o objeto financeiro. Um
  // concorrente recebe a URL já anexada ou espera o primeiro terminar.
  if (!reservation.created) {
    if (reservation.state === 'paid') return res.status(409).json({ error: 'pedido_ja_confirmado' });
    if (reservation.state === 'released') return res.status(409).json({ error: 'reserva_expirada' });
    if (reservation.providerUrl) {
      return res.status(200).json({
        url: reservation.providerUrl,
        id: reservation.providerRef,
        provider,
      });
    }
    res.setHeader('Retry-After', '2');
    return res.status(409).json({ error: 'reserva_em_processamento' });
  }

  const providerReservation = {
    ...reservation,
    requestId,
    buyerKey,
    createdAt: reservationNow,
    providerExpiresAt,
    statusToken: checkoutStatusToken(guardSecret, {
      provider,
      requestId,
      slot: reservation.slot,
    }),
  };

  try {
    let providerRef;
    let providerUrl;
    let providerProtocol;
    if (provider === 'stripe') {
      const session = await createStripeSession(comprador, providerReservation);
      providerRef = session.id;
      providerUrl = session.url;
    } else {
      const order = await createMpOrder(comprador, providerReservation);
      providerRef = String(order.id).toUpperCase();
      providerUrl = mpOrderStatusUrl(providerRef, providerReservation);
      providerProtocol = 'mp_orders_v1';
      // Primeira fatia apenas: a URL local, o frontend e o GET autenticado já
      // entendem Orders. Webhook, cron, pedido e pós-venda ainda precisam
      // migrar antes de a flag Pix poder ser ligada com segurança.
    }
    if (!providerRef || !providerUrl) throw new Error('provider_checkout_invalid');

    await attachProvider({
      requestId,
      slot: reservation.slot,
      provider,
      providerProtocol,
      providerRef,
      providerUrl,
      providerExpiresAt: providerExpiresAt.toISOString(),
      now: reservationNow,
    });
    return res.status(200).json({ url: providerUrl, id: providerRef, provider });
  } catch (e) {
    if (isDefinitiveProviderCreationFailure(e)) {
      try {
        await releaseUnattachedReservation({
          requestId,
          slot: reservation.slot,
          provider,
          reason: e.code === 'OFFER_CLOSED'
            ? 'checkout_window_closed_before_provider'
            : `${provider}_definitive_http_${e.status}`,
          now: new Date(),
        });
      } catch (releaseError) {
        console.error('[checkout] falha ao liberar rejeição definitiva:', releaseError.message);
        res.setHeader('Retry-After', '60');
        return res.status(503).json({ error: 'capacidade_indisponivel' });
      }
      if (e.code === 'OFFER_CLOSED') {
        return res.status(410).json({ error: 'oferta_encerrada', encerramento: OFERTA.encerramentoBR });
      }
    }
    // A reserva fica held. Em timeout não sabemos se o provider criou o objeto;
    // liberar aqui poderia vender o mesmo slot duas vezes.
    console.error('[checkout] provider/attach indisponível:', providerErrorLogFields(provider, e));
    res.setHeader('Retry-After', '60');
    return res.status(503).json({ error: 'provider_indisponivel' });
  }
}
