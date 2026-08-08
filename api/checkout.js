/**
 * /api/checkout — pagamento da pré-venda do Módulo Grow-X.
 *
 * POST { method: 'cartao' | 'pix' }
 *   cartao → Stripe Checkout, R$ 3.000 em até 12x  → { url }
 *   pix    → Mercado Pago Orders API (Pix-only), R$ 2.800 → { url local }
 * POST { action: 'status', requestId } + Authorization Bearer (ou cookie HttpOnly)
 *   → status do pagamento para a página de confirmação, sem token na URL.
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
import { normalizaTelefoneBr, telefoneBrNacional, telefoneBrValido } from '../shared/br-phone.js';
import {
  MP_ORDER_ID_PATTERN,
  MP_ORDER_PAYMENT_ID_PATTERN,
  normalizeRequestId,
  REQUEST_ID_PATTERN,
} from '../shared/provider-identifiers.js';
import { checkoutAbertoEm, expiracaoDaReserva, OFERTA } from '../src/lib/oferta.js';

export const config = { runtime: 'nodejs' };

const SITE = 'https://www.growx.com.br';
const STRIPE_API = 'https://api.stripe.com/v1';
const MP_API = 'https://api.mercadopago.com';
const PROVIDER_TIMEOUT_MS = 8_000;
const STRIPE_MIN_EXPIRY_LEAD_MS = (30 * 60 * 1000) + 5_000;
const VALID_SLOT = /^SLOT#(?:0(?:0[1-9]|[1-9]\d)|100)$/;
const VALID_STATUS_TOKEN = /^[a-f0-9]{64}$/;
const MP_PIX_EXPIRATION_TIME = 'PT30M';
export const CHECKOUT_STATUS_TTL_MS = 48 * 60 * 60 * 1000;
const STATUS_COOKIE = '__Host-growx_prevenda_status';

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
      || !REQUEST_ID_PATTERN.test(String(requestId || ''))
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

export function statusReturnFragment(reservation, provider) {
  const token = reservation.statusToken;
  if (!['stripe', 'mercadopago'].includes(provider)
      || !REQUEST_ID_PATTERN.test(String(reservation.requestId || ''))
      || !VALID_SLOT.test(String(reservation.slot || ''))
      || !VALID_STATUS_TOKEN.test(String(token || ''))) {
    throw new Error('invalid_checkout_status_binding');
  }
  const fragment = new URLSearchParams({
    request_id: reservation.requestId,
    status_token: token,
  });
  return `#${fragment.toString()}`;
}

export function checkoutStatusDescriptor(provider) {
  if (provider === 'stripe') return { provider: 'stripe', payment_method: 'card' };
  if (provider === 'mercadopago') return { provider: 'mercadopago', payment_method: 'pix' };
  throw new Error('invalid_checkout_status_provider');
}

export function checkoutStatusTokenActive(reservation, now = new Date()) {
  const issuedAt = Date.parse(reservation?.createdAt || '');
  const current = new Date(now).getTime();
  return Number.isFinite(issuedAt)
    && Number.isFinite(current)
    && current >= issuedAt
    && current - issuedAt <= CHECKOUT_STATUS_TTL_MS;
}

export function statusCookieHeader(requestId, statusToken) {
  if (!REQUEST_ID_PATTERN.test(String(requestId || ''))
      || !VALID_STATUS_TOKEN.test(String(statusToken || ''))) return null;
  return [
    `${STATUS_COOKIE}=${requestId}.${statusToken}`,
    `Max-Age=${Math.floor(CHECKOUT_STATUS_TTL_MS / 1000)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

function setStatusCookie(res, requestId, statusToken) {
  const header = statusCookieHeader(requestId, statusToken);
  if (header) res.setHeader('Set-Cookie', header);
}

export function statusCredentials(req, body) {
  const authorization = String(req.headers?.authorization || req.headers?.Authorization || '').trim();
  const bodyRequestId = normalizeRequestId(body?.requestId || body?.request_id);
  if (authorization) {
    const match = /^Bearer ([a-f0-9]{64})$/i.exec(authorization);
    return match && bodyRequestId
      ? { requestId: bodyRequestId, statusToken: match[1].toLowerCase() }
      : null;
  }
  const cookieHeader = String(req.headers?.cookie || '');
  const encoded = cookieHeader.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${STATUS_COOKIE}=`))
    ?.slice(STATUS_COOKIE.length + 1);
  const match = /^([0-9a-f-]{36})\.([a-f0-9]{64})$/i.exec(String(encoded || ''));
  const cookieRequestId = normalizeRequestId(match?.[1]);
  if (!match || !cookieRequestId || (bodyRequestId && bodyRequestId !== cookieRequestId)) return null;
  return { requestId: cookieRequestId, statusToken: match[2].toLowerCase() };
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
  p.set('success_url', `${SITE}/prevenda/sucesso${statusReturnFragment(reservation, 'stripe')}`);
  p.set('cancel_url', `${SITE}/prevenda#checkout=cancelado`);
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
  const telefone = telefoneBrNacional(comprador.telefone);
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
      ...(telefoneBrValido(telefone) ? {
        phone: { area_code: telefone.slice(0, 2), number: telefone.slice(2) },
      } : {}),
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
      success: `${SITE}/prevenda/sucesso${statusReturnFragment(reservation, 'mercadopago')}`,
      pending: `${SITE}/prevenda/sucesso${statusReturnFragment(reservation, 'mercadopago')}`,
      failure: `${SITE}/prevenda#checkout=falhou`,
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
  const requestId = normalizeRequestId(reservation?.requestId);
  if (!requestId) throw new Error('invalid_mp_order_reservation');
  const expected = `gx-modulo-prevenda-${requestId}`;
  const persisted = String(reservation?.providerExternalReference || '').trim();
  if (persisted && persisted !== expected) throw new Error('invalid_mp_order_external_reference');
  return persisted || expected;
}

export function mpOrderIdempotencyKey(reservation) {
  const requestId = normalizeRequestId(reservation?.requestId);
  if (!requestId) throw new Error('invalid_mp_order_reservation');
  const persisted = String(reservation?.providerIdempotencyKey || '').trim();
  if (persisted && persisted !== requestId) throw new Error('invalid_mp_order_idempotency_key');
  return persisted || requestId;
}

export function canRetryUnattachedMpOrder(reservation, now = new Date()) {
  const expiration = Date.parse(reservation?.providerExpiresAt || '');
  if (reservation?.state !== 'held'
      || reservation?.provider !== 'mercadopago'
      || reservation?.providerProtocol !== 'mp_orders_v1'
      || reservation?.providerRef
      || reservation?.providerUrl
      || !Number.isFinite(expiration)
      || expiration <= new Date(now).getTime()) return false;
  try {
    return reservation.providerExternalReference === mpOrderExternalReference(reservation)
      && reservation.providerIdempotencyKey === mpOrderIdempotencyKey(reservation);
  } catch {
    return false;
  }
}

export function buildMpOrder(comprador, reservation) {
  const offer = reservationOffer(reservation);
  if (offer.currency !== 'BRL') throw new Error('invalid_mp_order_currency');
  const [firstName, ...lastNameParts] = String(comprador?.nome || '').trim().split(/\s+/).filter(Boolean);
  const documentType = tipoDocumento(comprador?.cpf);
  const documentNumber = digitos(comprador?.cpf);
  const email = String(comprador?.email || '').trim().toLowerCase();
  const telefone = telefoneBrNacional(comprador?.telefone);
  if (!firstName || !lastNameParts.length || !emailValido(email)
      || !documentType || !documentoValido(documentNumber) || !telefoneBrValido(telefone)) {
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
      phone: { area_code: telefone.slice(0, 2), number: telefone.slice(2) },
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
  const orderId = String(order?.id || '').trim();
  const paymentId = String(payment?.id || '').trim();
  if (!MP_ORDER_ID_PATTERN.test(orderId)
      || !MP_ORDER_PAYMENT_ID_PATTERN.test(paymentId)
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
    && String(order.id) === String(reservation?.providerRef || ''));
}

export function mpOrderStatusUrl(orderId, reservation) {
  const normalized = String(orderId || '').trim();
  if (!MP_ORDER_ID_PATTERN.test(normalized)) throw new Error('invalid_mp_order_id');
  return `${SITE}/prevenda/sucesso${statusReturnFragment(reservation, 'mercadopago')}`;
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
        'X-Idempotency-Key': mpOrderIdempotencyKey(reservation),
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

export function statusRequestAuthorized({
  provider,
  providerReference,
  requestId,
  statusToken,
  reservation,
  secret,
  now = new Date(),
}) {
  const storedReference = String(reservation?.providerRef || '');
  const storedMpProtocol = String(reservation?.providerProtocol || '')
    || (MP_ORDER_ID_PATTERN.test(storedReference) ? 'mp_orders_v1' : 'mp_checkout_pro_v1');
  const requestedReference = String(providerReference || '');
  const legacyPaymentReference = requestedReference || String(reservation?.lastProviderRef || '');
  if (!reservation
      || reservation.requestId !== requestId
      || reservation.provider !== provider
      || !VALID_SLOT.test(String(reservation.slot || ''))
      || !checkoutStatusTokenActive(reservation, now)
      || (provider === 'stripe' && (!/^cs_[A-Za-z0-9_]+$/.test(storedReference)
        || (requestedReference && requestedReference !== storedReference)))
      || (provider === 'mercadopago' && storedMpProtocol === 'mp_orders_v1'
        && (!MP_ORDER_ID_PATTERN.test(storedReference)
          || (requestedReference && requestedReference !== storedReference)))
      || (provider === 'mercadopago' && storedMpProtocol !== 'mp_orders_v1'
        && (!storedReference || !/^\d{5,}$/.test(legacyPaymentReference)))) return false;
  return verifyCheckoutStatusToken(secret, {
    provider,
    requestId,
    slot: reservation.slot,
  }, statusToken);
}

const LEDGER_PAID_STATUS = Object.freeze({
  stripe: 'paid',
  mercadopago: 'approved',
});

const LEDGER_REVERSAL_STATUSES = new Set([
  'refund_pending',
  'refund_failed',
  'partially_refunded',
  'refunded',
  'disputed',
  'charged_back',
]);

/**
 * O provider confirma o estado externo; o ledger confirma a titularidade da
 * unidade. A resposta pública só pode afirmar `paid` quando os dois convergem.
 */
export function checkoutPublicPaymentStatus(reservation, providerPaymentStatus) {
  const provider = String(reservation?.provider || '');
  const state = String(reservation?.state || '');
  const ledgerPaymentStatus = String(reservation?.paymentStatus || '').toLowerCase();
  const providerStatus = String(providerPaymentStatus || '').trim().toLowerCase();
  const compatiblePaidStatus = LEDGER_PAID_STATUS[provider];
  const ledgerPaid = state === 'paid'
    && compatiblePaidStatus
    && ledgerPaymentStatus === compatiblePaidStatus;

  if (ledgerPaid && providerStatus === 'paid') return 'paid';

  // Held sem revisão financeira pode expor somente um estado não pago do
  // provider. Qualquer pagamento visto antes do commit canônico fica pendente.
  if (state === 'held'
      && !ledgerPaymentStatus
      && providerStatus
      && providerStatus !== 'paid'
      && !LEDGER_REVERSAL_STATUSES.has(providerStatus)) return providerStatus;

  // released, reversões, estados corrompidos e divergência ledger/provider
  // nunca podem acionar UI ou analytics de compra confirmada.
  return 'reconciling';
}

async function handleCheckoutStatus(req, res, body) {
  const credentials = statusCredentials(req, body);
  const secret = reservationSecret();
  const notFound = () => res.status(404).json({ error: 'pedido_nao_encontrado' });
  if (!credentials) return notFound();
  if (!secret) return res.status(503).json({ error: 'checkout_status_not_configured' });

  let reservation;
  try { reservation = await getReservation(credentials.requestId); }
  catch (error) {
    console.error('[checkout-status] inventário indisponível:', error?.name || 'Error');
    return res.status(503).json({ error: 'checkout_status_unavailable' });
  }
  if (!reservation) return notFound();

  const provider = reservation.provider;
  const storedProtocol = String(reservation.providerProtocol || '')
    || (MP_ORDER_ID_PATTERN.test(String(reservation.providerRef || ''))
      ? 'mp_orders_v1'
      : 'mp_checkout_pro_v1');
  const sessionId = String(body?.sessionId || body?.session_id || reservation.providerRef || '');
  const orderId = String(body?.orderId || body?.order_id || reservation.providerRef || '');
  const paymentId = String(
    body?.paymentId || body?.payment_id || reservation.lastProviderRef || '',
  );
  const providerReference = provider === 'stripe'
    ? sessionId
    : (storedProtocol === 'mp_orders_v1' ? orderId : paymentId);

  if (!statusRequestAuthorized({
    provider,
    providerReference,
    requestId: credentials.requestId,
    statusToken: credentials.statusToken,
    reservation,
    secret,
  })) return notFound();

  if (provider === 'stripe') {
    if (!stripeKey()) return res.status(503).json({ error: 'stripe_not_configured' });
    try {
      const session = await stripeRequest('GET', `/checkout/sessions/${sessionId}`);
      if (!stripeStatusBelongsToReservation(session, reservation)) return notFound();
      return res.status(200).json({
        ...checkoutStatusDescriptor('stripe'),
        request_id: credentials.requestId,
        payment_status: checkoutPublicPaymentStatus(reservation, session.payment_status),
        amount_total: session.amount_total,
        currency: session.currency,
        sku: session.metadata.sku,
        reference: session.id,
        contract_accepted: session.consent?.terms_of_service === 'accepted',
        contract_version: session.metadata.contract_version,
      });
    } catch (error) {
      return error.status === 404 ? notFound() : res.status(502).json({ error: 'stripe_error' });
    }
  }

  if (provider !== 'mercadopago') return notFound();
  if (!mpToken()) return res.status(503).json({ error: 'mercadopago_not_configured' });
  if (storedProtocol === 'mp_orders_v1') {
    try {
      const order = await getMpOrder(orderId);
      if (!mpOrderStatusBelongsToReservation(order, reservation)) return notFound();
      const validated = mpOrderMatchesReservation(order, reservation, { requireTicketUrl: false });
      const paid = order.status === 'processed' && order.status_detail === 'accredited';
      return res.status(200).json({
        ...checkoutStatusDescriptor('mercadopago'),
        request_id: credentials.requestId,
        payment_status: checkoutPublicPaymentStatus(
          reservation,
          paid ? 'paid' : (order.status === 'action_required' ? 'pending' : order.status),
        ),
        amount_total: reservation.offerAmountCents,
        currency: String(reservation.offerCurrency).toLowerCase(),
        sku: reservation.offerSku,
        reference: String(order.id),
        payment_reference: validated.paymentId,
        contract_version: reservation.contractVersion,
        ticket_url: validated.ticketUrl,
      });
    } catch (error) {
      return error.status === 404 ? notFound() : res.status(502).json({ error: 'mp_error' });
    }
  }

  try {
    const payment = await getMpPayment(paymentId);
    const merchantOrderId = String(payment?.order?.id || '');
    if (!/^\d{5,}$/.test(merchantOrderId)) return notFound();
    const merchantOrder = await getMpMerchantOrder(merchantOrderId);
    if (!mpStatusBelongsToReservation(payment, merchantOrder, reservation)) return notFound();
    return res.status(200).json({
      ...checkoutStatusDescriptor('mercadopago'),
      request_id: credentials.requestId,
      payment_status: checkoutPublicPaymentStatus(
        reservation,
        payment.status === 'approved' ? 'paid' : payment.status,
      ),
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.growx.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  const isStatusRequest = body?.action === 'status';
  const ip = clientIp(req);
  if (!rateLimit(ip, isStatusRequest ? 30 : 20)) {
    return res.status(429).json({ error: 'rate_limited' });
  }
  if (isStatusRequest) return handleCheckoutStatus(req, res, body);

  // Fail closed: novas cobranças só podem ser abertas por uma decisão explícita
  // de operação. A consulta autenticada de status continua disponível mesmo
  // com o gate fechado para concluir pagamentos já iniciados.
  if (process.env.PREVENDA_SALES_ENABLED !== 'true') {
    res.setHeader('Retry-After', '300');
    return res.status(503).json({ error: 'vendas_pausadas' });
  }

  const requestedMethod = String(body?.method || body?.sku || '');
  const method = requestedMethod === 'prevenda' ? 'cartao' : requestedMethod;
  const requestId = normalizeRequestId(body?.requestId || body?.request_id);
  const now = new Date();

  if (!['cartao', 'pix'].includes(method)) {
    return res.status(400).json({ error: 'invalid_method', valid: ['cartao', 'pix'] });
  }
  if (!requestId) return res.status(400).json({ error: 'request_id_invalido' });
  if (!checkoutAbertoEm(now)) {
    return res.status(410).json({
      error: 'oferta_encerrada',
      encerramento: OFERTA.encerramentoBR,
    });
  }

  const provider = method === 'pix' ? 'mercadopago' : 'stripe';
  // A flag de Pix permanece independente para permitir homologação e rollback
  // sem afetar cartão nem pagamentos Pix já iniciados.
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

  // WhatsApp é obrigatório para confirmação operacional. O Dynamo recebe só
  // hashes; o número canônico é enviado ao provider financeiro quando necessário.
  const cep = digitos(body?.cep);
  const endereco = String(body?.endereco || '').trim().slice(0, 200);
  const cidadeUf = String(body?.cidadeUf || '').trim().slice(0, 120);
  const telefone = normalizaTelefoneBr(String(body?.telefone || '').slice(0, 40));
  if (!telefone) return res.status(400).json({ error: 'telefone_invalido' });

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
  const providerProtocolIntent = provider === 'mercadopago' ? 'mp_orders_v1' : undefined;
  const providerExternalReference = provider === 'mercadopago'
    ? mpOrderExternalReference({ requestId })
    : undefined;
  const providerIdempotencyKey = provider === 'mercadopago'
    ? mpOrderIdempotencyKey({ requestId })
    : undefined;
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
      providerProtocol: providerProtocolIntent,
      providerExternalReference,
      providerIdempotencyKey,
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

  const originalProviderExpiresAt = new Date(reservation.providerExpiresAt);
  if (!Number.isFinite(originalProviderExpiresAt.getTime())) {
    res.setHeader('Retry-After', '60');
    return res.status(503).json({ error: 'capacidade_indisponivel' });
  }
  const providerReservation = {
    ...reservation,
    requestId,
    buyerKey,
    createdAt: reservation.createdAt || reservationNow,
    providerExpiresAt: originalProviderExpiresAt,
    statusToken: checkoutStatusToken(guardSecret, {
      provider,
      requestId,
      slot: reservation.slot,
    }),
  };
  // Fallback curto para providers/browsers que não preservem o fragmento no
  // retorno. HttpOnly impede analytics e JavaScript de lerem a credencial.
  setStatusCookie(res, requestId, providerReservation.statusToken);

  // Orders pode ter sido criada antes de uma resposta/attach falhar. O retry
  // reutiliza o mesmo intent e a mesma chave idempotente; nunca adquire outro
  // slot nem inventa uma segunda referência.
  if (!reservation.created) {
    if (reservation.state === 'paid') return res.status(409).json({ error: 'pedido_ja_confirmado' });
    if (reservation.state === 'released') return res.status(409).json({ error: 'reserva_expirada' });
    if (provider === 'mercadopago'
        && reservation.providerProtocol === 'mp_orders_v1'
        && reservation.providerRef) {
      try {
        return res.status(200).json({
          url: mpOrderStatusUrl(reservation.providerRef, providerReservation),
          id: reservation.providerRef,
          provider,
        });
      } catch {
        res.setHeader('Retry-After', '60');
        return res.status(503).json({ error: 'provider_indisponivel' });
      }
    }
    if (reservation.providerUrl) {
      return res.status(200).json({
        url: reservation.providerUrl,
        id: reservation.providerRef,
        provider,
      });
    }
    const canRetryOrder = canRetryUnattachedMpOrder(reservation, reservationNow);
    if (!canRetryOrder) {
      res.setHeader('Retry-After', '2');
      return res.status(409).json({
        error: originalProviderExpiresAt.getTime() <= reservationNow.getTime()
          ? 'reserva_expirada'
          : 'reserva_em_processamento',
      });
    }
  }

  try {
    let providerRef;
    let providerUrl;
    let ledgerProviderUrl;
    let providerProtocol;
    if (provider === 'stripe') {
      const session = await createStripeSession(comprador, providerReservation);
      providerRef = session.id;
      providerUrl = session.url;
      ledgerProviderUrl = session.url;
    } else {
      const order = await createMpOrder(comprador, providerReservation);
      providerRef = String(order.id);
      providerUrl = mpOrderStatusUrl(providerRef, providerReservation);
      // Dynamo nunca persiste o status_token. O cookie HttpOnly permite
      // reconstruir o retorno em retries, e o primeiro redirect usa fragmento.
      ledgerProviderUrl = `${SITE}/prevenda/sucesso`;
      providerProtocol = 'mp_orders_v1';
    }
    if (!providerRef || !providerUrl || !ledgerProviderUrl) {
      throw new Error('provider_checkout_invalid');
    }

    await attachProvider({
      requestId,
      slot: reservation.slot,
      provider,
      providerProtocol,
      providerRef,
      providerUrl: ledgerProviderUrl,
      providerExpiresAt: originalProviderExpiresAt.toISOString(),
      now: reservationNow,
    });
    return res.status(200).json({ url: providerUrl, id: providerRef, provider });
  } catch (e) {
    if (reservation.created && isDefinitiveProviderCreationFailure(e)) {
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
