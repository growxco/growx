/**
 * POST /api/pedido
 *   { action: 'request_code', email, cpf }
 *   { action: 'verify_code', challengeId, code, email, cpf }
 *
 * Área do cliente da pré-venda com prova de posse do e-mail antes de qualquer
 * referência, valor ou status. O Dynamo mantém desafios HMAC/TTL, limites
 * distribuídos e o livro técnico pseudonimizado; nunca guarda código, CPF ou
 * e-mail em claro.
 *
 * É POST de propósito: CPF nunca trafega em query string. A resposta da
 * solicitação do código não revela se há conta ou pedido para a identidade.
 */
import { GetItemCommand } from '@aws-sdk/client-dynamodb';

import { clientIp } from './_lib/ai.js';
import { documentoValido, mascaraCpf, digitos } from './_lib/cpf.js';
import { getDynamoClient } from './_lib/dynamo-client.js';
import { emailPedidoConfigurado, enviarCodigoAcessoPedido } from './_lib/email.js';
import { deriveReservationKey, getReservation } from './_lib/inventory.js';
import {
  consumePedidoChallenge,
  createPedidoChallenge,
  PEDIDO_CODE_TTL_SECONDS,
  PedidoAuthUnavailableError,
} from './_lib/pedido-auth.js';
import {
  MP_ORDER_ID_PATTERN,
  MP_ORDER_PAYMENT_ID_PATTERN,
  REQUEST_ID_PATTERN,
} from '../shared/provider-identifiers.js';
import { OFERTA } from '../src/lib/oferta.js';
import { reservationCode } from '../shared/reservation-code.js';

export const config = { runtime: 'nodejs' };

const STRIPE_API = 'https://api.stripe.com/v1';
const MP_API = 'https://api.mercadopago.com';
const MP_REF = 'gx-modulo-prevenda';
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SLOT = /^SLOT#(?:0(?:0[1-9]|[1-9]\d)|100)$/;
const HASH = /^[a-f0-9]{64}$/;
const LEDGER_STATES = new Set(['held', 'paid', 'released']);
export const PEDIDO_PROVIDER_DEADLINE_MS = 8_000;

const reservationSecret = () => {
  const secret = process.env.PREVENDA_RESERVATION_SECRET;
  return typeof secret === 'string' && Buffer.byteLength(secret, 'utf8') >= 32 ? secret : null;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase().slice(0, 320);

class ProviderDeadlineError extends Error {
  constructor() {
    super('provider_deadline_exceeded');
    this.name = 'ProviderDeadlineError';
  }
}

async function boundedFetch(url, options, { fetchImpl, deadlineAt, clockMs }) {
  const remaining = Math.floor(deadlineAt - clockMs());
  if (remaining <= 0) throw new ProviderDeadlineError();
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new ProviderDeadlineError());
    }, remaining);
  });
  try {
    return await Promise.race([
      fetchImpl(url, { ...options, signal: controller.signal }),
      timeout,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function boundedJson(response, { deadlineAt, clockMs }) {
  const remaining = Math.floor(deadlineAt - clockMs());
  if (remaining <= 0) throw new ProviderDeadlineError();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      try { Promise.resolve(response.body?.cancel?.()).catch(() => {}); }
      catch { /* o prazo continua valendo mesmo se o stream não aceitar cancelamento */ }
      reject(new ProviderDeadlineError());
    }, remaining);
  });
  try {
    return await Promise.race([response.json(), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function boundedDynamoGet(pk, context) {
  const remaining = Math.floor(context.deadlineAt - context.clockMs());
  if (remaining <= 0) throw new ProviderDeadlineError();
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new ProviderDeadlineError());
    }, remaining);
  });
  try {
    const client = context.client || getDynamoClient();
    const response = await Promise.race([
      client.send(new GetItemCommand({
        TableName: context.tableName,
        Key: { pk: { S: pk } },
        ConsistentRead: true,
      }), { abortSignal: controller.signal }),
      timeout,
    ]);
    return response?.Item || null;
  } finally {
    clearTimeout(timeoutId);
  }
}

const attrS = (item, key) => item?.[key]?.S || '';
const attrN = (item, key) => {
  const value = Number(item?.[key]?.N);
  return Number.isFinite(value) ? value : null;
};

function decodePedidoLedger(item) {
  if (!item) return null;
  return {
    pk: attrS(item, 'pk'),
    requestId: attrS(item, 'request_id'),
    reservationId: attrS(item, 'reservation_id'),
    slot: attrS(item, 'slot'),
    provider: attrS(item, 'provider'),
    providerProtocol: attrS(item, 'provider_protocol') || null,
    providerRef: attrS(item, 'provider_ref') || null,
    state: attrS(item, 'state'),
    paymentStatus: attrS(item, 'payment_status') || null,
    buyerPk: attrS(item, 'buyer_pk') || null,
    emailHash: attrS(item, 'email_hash') || null,
    offerAmountCents: attrN(item, 'offer_amount_cents'),
    offerCurrency: attrS(item, 'offer_currency') || null,
    offerSku: attrS(item, 'offer_sku') || null,
    contractVersion: attrS(item, 'contract_version') || null,
    termsAcknowledgedAt: attrS(item, 'terms_acknowledged_at') || null,
    providerEventCreatedAt: attrS(item, 'provider_event_created_at') || null,
    updatedAt: attrS(item, 'updated_at') || null,
  };
}

const sameOrderLedgerSnapshot = (candidate, expected) => Boolean(candidate
  && candidate.requestId === expected.requestId
  && candidate.reservationId === expected.reservationId
  && candidate.slot === expected.slot
  && candidate.provider === expected.provider
  && candidate.state === expected.state
  && candidate.emailHash === expected.emailHash
  && candidate.offerAmountCents === expected.offerAmountCents
  && candidate.offerCurrency === expected.offerCurrency
  && candidate.offerSku === expected.offerSku
  && candidate.contractVersion === expected.contractVersion);

/**
 * Localiza no máximo uma Order pelo guarda pseudonimizado do comprador. O
 * endpoint de busca massiva do MP exige janela de datas e paginação; ele não é
 * necessário nem desejável na área autenticada quando o ledger já contém o
 * ORD canônico.
 */
async function localizarReservaMpOrders(buyerHash, context) {
  if (!HASH.test(String(buyerHash || ''))) throw new Error('invalid_buyer_hash');
  const buyerPk = `BUYER#${buyerHash}`;
  const buyer = decodePedidoLedger(await boundedDynamoGet(buyerPk, context));
  if (!buyer) return { applicable: false, reservation: null };
  if (!REQUEST_ID_PATTERN.test(buyer.requestId)
      || buyer.reservationId !== buyer.requestId
      || !SLOT.test(buyer.slot)
      || !LEDGER_STATES.has(buyer.state)) {
    throw new Error('pedido_buyer_guard_corrupt');
  }
  if (buyer.provider !== 'mercadopago') {
    return { applicable: false, reservation: null };
  }

  const [requestItem, slotItem] = await Promise.all([
    boundedDynamoGet(`REQUEST#${buyer.requestId}`, context),
    boundedDynamoGet(buyer.slot, context),
  ]);
  const reservation = decodePedidoLedger(requestItem);
  const slot = decodePedidoLedger(slotItem);
  // O SLOT minimiza o vínculo reverso ao sair de held. REQUEST e BUYER
  // continuam provando a identidade; se um registro legado ainda trouxer o
  // campo, ele só é aceito quando aponta para o mesmo guarda.
  const slotBuyerBindingValid = slot?.state === 'held'
    ? slot.buyerPk === buyerPk
    : (!slot?.buyerPk || slot.buyerPk === buyerPk);
  if (!sameOrderLedgerSnapshot(reservation, buyer)
      || !sameOrderLedgerSnapshot(slot, buyer)
      || reservation?.buyerPk !== buyerPk
      || !slotBuyerBindingValid) {
    throw new Error('pedido_order_ledger_binding_mismatch');
  }

  if (reservation.providerProtocol !== 'mp_orders_v1') {
    if (reservation.providerProtocol === 'mp_checkout_pro_v1'
        || (!reservation.providerProtocol && !MP_ORDER_ID_PATTERN.test(String(reservation.providerRef || '')))) {
      return { applicable: false, reservation: null };
    }
    throw new Error('pedido_order_protocol_mismatch');
  }
  if (slot.providerProtocol !== 'mp_orders_v1'
      || !MP_ORDER_ID_PATTERN.test(String(reservation.providerRef || ''))
      || slot.providerRef !== reservation.providerRef
      || reservation.offerCurrency !== 'BRL'
      || !Number.isInteger(reservation.offerAmountCents)
      || reservation.offerAmountCents <= 0) {
    throw new Error('pedido_order_attachment_invalid');
  }
  return { applicable: true, reservation };
}

function decimalCents(value) {
  const normalized = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fractional = ''] = normalized.split('.');
  const cents = (Number(whole) * 100) + Number(fractional.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

function orderPayer(order, payment) {
  const primary = order?.payer && typeof order.payer === 'object' ? order.payer : {};
  const fallback = payment?.payer && typeof payment.payer === 'object' ? payment.payer : {};
  return {
    ...fallback,
    ...primary,
    identification: primary.identification || fallback.identification || null,
  };
}

/** Validação pura e fail-closed do envelope Orders antes de exibir PII/status. */
export function validarMercadoPagoOrderPedido(
  order,
  reservation,
  { email, cpf, buyerHash, emailHash } = {},
) {
  const orderId = String(order?.id || '').toUpperCase();
  const requestId = String(reservation?.requestId || '').toLowerCase();
  const payments = order?.transactions?.payments;
  const payment = Array.isArray(payments) && payments.length === 1 ? payments[0] : null;
  const paymentId = String(payment?.id || '');
  const expectedCurrency = String(reservation?.offerCurrency || '').toUpperCase();
  const currencyValues = [order?.currency, order?.currency_id, payment?.currency, payment?.currency_id]
    .filter((value) => value !== undefined && value !== null && String(value).trim())
    .map((value) => String(value).trim().toUpperCase());
  const normalizedCpf = digitos(cpf);
  const expectedDocumentType = normalizedCpf.length === 11 ? 'CPF' : 'CNPJ';
  const payer = orderPayer(order, payment);
  const payerEmail = normalizeEmail(payer.email);
  const payerDocument = digitos(payer.identification?.number);
  const payerDocumentType = String(payer.identification?.type || '').trim().toUpperCase();

  if (!REQUEST_ID_PATTERN.test(requestId)
      || reservation?.reservationId !== requestId
      || reservation?.provider !== 'mercadopago'
      || reservation?.providerProtocol !== 'mp_orders_v1'
      || reservation?.providerRef !== orderId
      || reservation?.buyerPk !== `BUYER#${buyerHash}`
      || !HASH.test(String(emailHash || ''))
      || reservation?.emailHash !== emailHash
      || !SLOT.test(String(reservation?.slot || ''))
      || !LEDGER_STATES.has(reservation?.state)
      || orderId !== String(order?.id || '')
      || !MP_ORDER_ID_PATTERN.test(orderId)
      || !MP_ORDER_PAYMENT_ID_PATTERN.test(paymentId)
      || order?.type !== 'online'
      || order?.processing_mode !== 'automatic'
      || (order?.capture_mode != null && order.capture_mode !== 'automatic')
      || order?.external_reference !== `${MP_REF}-${requestId}`
      || payment?.payment_method?.id !== 'pix'
      || payment?.payment_method?.type !== 'bank_transfer'
      || decimalCents(order?.total_amount) !== reservation?.offerAmountCents
      || decimalCents(payment?.amount) !== reservation?.offerAmountCents
      || expectedCurrency !== 'BRL'
      || currencyValues.some((currency) => currency !== expectedCurrency)
      || (payerEmail && payerEmail !== normalizeEmail(email))
      || (payerDocument && payerDocument !== normalizedCpf)
      || (payerDocument && !documentoValido(payerDocument))
      || (payerDocumentType && payerDocumentType !== expectedDocumentType)) {
    return null;
  }

  const processed = order.status === 'processed' && order.status_detail === 'accredited';
  if (processed && (decimalCents(order.total_paid_amount) !== reservation.offerAmountCents
      || decimalCents(payment.paid_amount) !== reservation.offerAmountCents
      || payment.status !== 'processed'
      || payment.status_detail !== 'accredited')) return null;

  return {
    orderId,
    paymentId,
    payer,
    providerPaymentStatus: processed ? 'processed' : String(payment.status || order.status || ''),
  };
}

/** Marcos de produção — iguais pra todo o lote, que embarca junto em 20/11. */
export const ETAPAS = [
  { id: 'confirmado', titulo: 'Pedido confirmado', desde: '2026-08-04', detalhe: 'Pagamento aprovado e reserva registrada no lote de lançamento.' },
  { id: 'producao', titulo: 'Produção do lote', desde: '2026-09-15', detalhe: 'Fabricação das placas e injeção dos gabinetes.' },
  { id: 'montagem', titulo: 'Montagem e testes', desde: '2026-10-20', detalhe: 'Montagem final e bancada de QA unidade a unidade.' },
  { id: 'expedicao', titulo: 'Expedição', desde: '2026-11-10', detalhe: 'Embalagem e emissão da nota fiscal.' },
  { id: 'entrega', titulo: 'Entrega', desde: '2026-11-20', detalhe: 'Envio ao endereço cadastrado ou retirada na ExpoCannabis Brasil.' },
];

/**
 * A etapa real do lote é informada pelo time via env `LOTE_ETAPA` (um dos ids
 * de ETAPAS). Sem isso a régua seria só um calendário: se a produção atrasar,
 * ela anunciaria "Expedição" sem nada ter sido expedido — mentindo sozinha.
 * O fallback por data existe só para não quebrar caso a env não esteja setada,
 * e nesse caso a resposta marca `etapa_estimada: true`.
 */
export function etapaAtual(agora = Date.now()) {
  const informada = String(process.env.LOTE_ETAPA || '').trim();
  if (ETAPAS.some((e) => e.id === informada)) {
    return { id: informada, estimada: false };
  }
  let atual = ETAPAS[0].id;
  for (const e of ETAPAS) {
    if (agora >= Date.parse(`${e.desde}T00:00:00-03:00`)) atual = e.id;
  }
  return { id: atual, estimada: true };
}

/** Status dos provedores em português — nunca vaza rótulo cru pra tela. */
const STATUS = {
  paid: 'pago', approved: 'pago',
  unpaid: 'aguardando pagamento', pending: 'aguardando pagamento',
  created: 'aguardando pagamento', action_required: 'aguardando pagamento',
  waiting_payment: 'aguardando pagamento', waiting_transfer: 'aguardando pagamento',
  processed: 'pago', processing: 'em análise',
  in_process: 'em análise', in_mediation: 'em análise', authorized: 'em análise',
  no_payment_required: 'pago',
  rejected: 'recusado', failed: 'recusado', expired: 'expirado',
  cancelled: 'cancelado', canceled: 'cancelado',
  partially_refunded: 'reembolso parcial', refunded: 'reembolsado',
  refund_pending: 'reembolso em processamento', refund_failed: 'falha no reembolso',
  disputed: 'em contestação', charged_back: 'estornado',
};
const traduzStatus = (s) => STATUS[String(s || '').toLowerCase()] || 'em processamento';

/**
 * Resolve o estado financeiro exclusivamente do ledger transacional. O
 * provider continua fonte dos dados do comprador, mas não do status exibido:
 * Checkout Session permanece `paid` depois de refund/chargeback.
 */
export function resolverStatusFinanceiroLedger(record, {
  requestId,
  slot,
  provider,
  buyerHash,
  providerPaymentStatus,
} = {}) {
  if (!record) return { ok: false, reason: 'ledger_missing' };
  const ownershipOk = record.requestId === requestId
    && record.reservationId === requestId
    && record.slot === slot
    && record.provider === provider
    && record.buyerPk === `BUYER#${buyerHash}`;
  if (!ownershipOk) return { ok: false, reason: 'ledger_ownership_mismatch' };
  if (record.state === 'paid' && record.paymentStatus) {
    const fulfillmentActive = new Set([
      'paid', 'approved', 'partially_refunded', 'refund_failed',
    ]).has(record.paymentStatus);
    return {
      ok: true,
      status: traduzStatus(record.paymentStatus),
      rawStatus: record.paymentStatus,
      updatedAt: record.providerEventCreatedAt || record.updatedAt || null,
      contractVersion: record.contractVersion || null,
      termsAcknowledgedAt: record.termsAcknowledgedAt || null,
      fulfillmentActive,
    };
  }
  const providerClaimsConsumed = new Set([
    'paid', 'no_payment_required', 'approved', 'processed', 'partially_refunded',
    'refunded', 'in_mediation', 'charged_back',
  ]).has(String(providerPaymentStatus || '').toLowerCase());
  if (providerClaimsConsumed) {
    return { ok: false, reason: 'ledger_provider_divergence' };
  }
  if (record.state === 'held') {
    return {
      ok: true,
      status: 'confirmação em processamento',
      rawStatus: 'held',
      updatedAt: record.updatedAt || null,
      contractVersion: record.contractVersion || null,
      termsAcknowledgedAt: record.termsAcknowledgedAt || null,
      fulfillmentActive: false,
    };
  }
  if (record.state === 'released') {
    return {
      ok: true,
      status: 'reserva expirada',
      rawStatus: 'released',
      updatedAt: record.updatedAt || null,
      contractVersion: record.contractVersion || null,
      termsAcknowledgedAt: record.termsAcknowledgedAt || null,
      fulfillmentActive: false,
    };
  }
  return { ok: false, reason: 'ledger_state_invalid' };
}

async function consultarLedger({
  metadata,
  provider,
  buyerHash,
  providerPaymentStatus,
  client,
  tableName,
}) {
  const requestId = String(metadata?.request_id || metadata?.reservation_id || '');
  const slot = String(metadata?.slot_id || metadata?.slot || '');
  if (!REQUEST_ID_PATTERN.test(requestId) || !SLOT.test(slot)) {
    return { ok: false, reason: 'legacy_without_ledger' };
  }
  try {
    const record = await getReservation(requestId, { client, tableName });
    const resolved = resolverStatusFinanceiroLedger(record, {
      requestId, slot, provider, buyerHash, providerPaymentStatus,
    });
    return resolved.ok
      ? { ...resolved, reservationCode: reservationCode(requestId) }
      : resolved;
  } catch {
    return { ok: false, reason: 'ledger_unavailable' };
  }
}

async function stripeGet(path, context) {
  const r = await boundedFetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${context.stripeKey}` },
  }, context);
  if (!r.ok) return null;
  return boundedJson(r, context).catch(() => null);
}

/** Pedidos no cartão: clientes com aquele e-mail → sessões de checkout deles. */
async function buscarStripe(email, cpf, buyerHash, context) {
  const key = context.stripeKey;
  if (!key || !key.startsWith('sk_')) return { ok: false, pedidos: [] };

  const clientes = await stripeGet(`/customers?email=${encodeURIComponent(email)}&limit=10`, context);
  if (!clientes) return { ok: false, pedidos: [] };
  const encontrados = [];
  let ledgerOk = true;

  for (const c of clientes?.data || []) {
    // CPF fica em customer_details da sessão e/ou no cadastro do cliente
    const taxIds = await stripeGet(`/customers/${c.id}/tax_ids?limit=10`, context);
    const cpfCliente = digitos((taxIds?.data || []).find((t) => t.type === 'br_cpf')?.value);

    const sessoes = await stripeGet(`/checkout/sessions?customer=${c.id}&limit=20`, context);
    for (const s of sessoes?.data || []) {
      if (s.metadata?.source !== 'growx.com.br/prevenda') continue;

      const standardEmails = [s.customer_details?.email, s.customer_email, c.email]
        .filter(Boolean)
        .map((candidate) => String(candidate).trim().toLowerCase());
      if (!standardEmails.includes(email)) continue;

      const cpfSessao = digitos((s.customer_details?.tax_ids || []).find((t) => t.type === 'br_cpf')?.value);
      const cpfPadrao = cpfSessao || cpfCliente;
      const metadataHash = String(s.metadata?.buyer_hash || '');
      // Pedidos novos usam HMAC do CPF e e-mail dos campos padrão. O fallback
      // de metadata PII existe apenas para pedidos legados já emitidos.
      const cpfLegado = digitos(s.metadata?.cpf);
      if (metadataHash ? metadataHash !== buyerHash : cpfLegado !== cpf) continue;
      if (cpfPadrao && cpfPadrao !== cpf) continue;
      const cpfPedido = cpfPadrao || cpf;
      const ledger = await consultarLedger({
        metadata: s.metadata,
        provider: 'stripe',
        buyerHash,
        providerPaymentStatus: s.payment_status,
        client: context.client,
        tableName: context.tableName,
      });
      ledgerOk &&= ledger.ok;

      encontrados.push({
        provedor: 'stripe',
        referencia: s.id,
        codigo_reserva: ledger.ok ? ledger.reservationCode : null,
        criado_em: new Date((s.created || 0) * 1000).toISOString(),
        status: ledger.ok ? ledger.status : 'status financeiro a confirmar',
        status_provedor: traduzStatus(s.payment_status),
        status_confiavel: ledger.ok,
        status_atualizado_em: ledger.ok ? ledger.updatedAt : null,
        fulfillment_ativo: Boolean(ledger.ok && ledger.fulfillmentActive),
        valor_centavos: s.amount_total,
        moeda: (s.currency || 'brl').toUpperCase(),
        forma: 'Cartão (até 12x)',
        nome: s.customer_details?.name || c.name || null,
        cpf_mascarado: cpfPedido ? mascaraCpf(cpfPedido) : null,
        cpf_verificado: Boolean(cpfPedido),
        contrato_aceito: Boolean(ledger.ok && ledger.termsAcknowledgedAt)
          || s.consent?.terms_of_service === 'accepted'
          || (!metadataHash && s.metadata?.aceite_contrato === 'true'),
        contrato_versao: ledger.ok
          ? ledger.contractVersion
          : s.metadata?.contract_version || null,
        fatura_url: s.invoice ? null : null,
      });
    }
  }
  return { ok: true, ledgerOk, pedidos: encontrados };
}

/** Orders API: um guarda do comprador, uma reserva e um GET canônico por ORD. */
export async function buscarMercadoPagoOrders(email, cpf, buyerHash, emailHash, context) {
  const located = await localizarReservaMpOrders(buyerHash, context);
  if (!located.applicable) {
    return { ok: true, applicable: false, ledgerOk: true, pedidos: [] };
  }

  const reservation = located.reservation;
  const response = await boundedFetch(
    `${MP_API}/v1/orders/${encodeURIComponent(reservation.providerRef)}`,
    { headers: { Authorization: `Bearer ${context.mpToken}` } },
    context,
  );
  if (!response.ok) return { ok: false, applicable: true, ledgerOk: false, pedidos: [] };
  const order = await boundedJson(response, context).catch(() => null);
  const validated = validarMercadoPagoOrderPedido(order, reservation, {
    email, cpf, buyerHash, emailHash,
  });
  if (!validated) return { ok: false, applicable: true, ledgerOk: false, pedidos: [] };

  const ledger = resolverStatusFinanceiroLedger(reservation, {
    requestId: reservation.requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    buyerHash,
    providerPaymentStatus: validated.providerPaymentStatus,
  });
  const payerName = [validated.payer.first_name, validated.payer.last_name]
    .filter(Boolean).join(' ') || null;
  return {
    ok: true,
    applicable: true,
    ledgerOk: ledger.ok,
    pedidos: [{
      provedor: 'mercadopago',
      referencia: validated.orderId,
      referencia_pagamento: validated.paymentId,
      // É referência de atendimento, não credencial. Vem do requestId já
      // provado pelo OTP + tripla do ledger mesmo quando o financeiro diverge.
      codigo_reserva: reservationCode(reservation.requestId),
      criado_em: order.created_date || null,
      status: ledger.ok ? ledger.status : 'status financeiro a confirmar',
      status_provedor: traduzStatus(validated.providerPaymentStatus),
      status_confiavel: ledger.ok,
      status_atualizado_em: ledger.ok ? ledger.updatedAt : null,
      fulfillment_ativo: Boolean(ledger.ok && ledger.fulfillmentActive),
      valor_centavos: reservation.offerAmountCents,
      moeda: reservation.offerCurrency,
      forma: 'Pix',
      nome: payerName,
      cpf_mascarado: mascaraCpf(cpf),
      cpf_verificado: true,
      contrato_aceito: Boolean(ledger.ok && ledger.termsAcknowledgedAt),
      contrato_versao: ledger.ok ? ledger.contractVersion : null,
      fatura_url: null,
    }],
  };
}

/** Checkout Pro legado: busca pagamentos e filtra por e-mail/CPF. */
export async function buscarMercadoPagoCheckoutPro(email, cpf, buyerHash, context) {
  const token = context.mpToken;
  if (!token) return { ok: false, pedidos: [] };

  // Paginado: com limite fixo de 50 o comprador nº 51 sumiria da área do cliente.
  const resultados = [];
  const PAGINA = 50;
  for (let offset = 0; offset < 1000; offset += PAGINA) {
    const r = await boundedFetch(
      `${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(MP_REF)}` +
      `&sort=date_created&criteria=desc&limit=${PAGINA}&offset=${offset}`,
      { headers: { Authorization: `Bearer ${token}` } },
      context,
    );
    if (!r.ok) {
      // Falha aqui esconderia pedidos Pix do cliente — precisa ser visível, não silenciosa.
      console.error('[pedido] busca Mercado Pago falhou:', r.status, 'offset', offset);
      return { ok: false, pedidos: [] };
    }
    const data = await boundedJson(r, context).catch(() => null);
    if (!data) return { ok: false, pedidos: [] };
    const lote = data?.results || [];
    resultados.push(...lote);
    const total = data?.paging?.total ?? lote.length;
    if (lote.length < PAGINA || resultados.length >= total) break;
  }

  const correspondentes = resultados.filter((p) => {
      const payerEmail = String(p.payer?.email || '').trim().toLowerCase();
      const cpfPadrao = digitos(p.payer?.identification?.number);
      const metadataHash = String(p.metadata?.buyer_hash || '');
      if (metadataHash) {
        return metadataHash === buyerHash && cpfPadrao === cpf && payerEmail === email;
      }
      // Compatibilidade somente de leitura para pagamentos antigos.
      const legacyEmail = String(p.metadata?.email || '').trim().toLowerCase();
      const legacyCpf = digitos(p.metadata?.cpf);
      return legacyCpf === cpf && [payerEmail, legacyEmail].includes(email);
    });
  const pedidos = [];
  let ledgerOk = true;
  for (const p of correspondentes) {
    const cpfPedido = digitos(p.payer?.identification?.number) || cpf;
    const ledger = await consultarLedger({
      metadata: p.metadata,
      provider: 'mercadopago',
      buyerHash,
      providerPaymentStatus: p.status,
      client: context.client,
      tableName: context.tableName,
    });
    ledgerOk &&= ledger.ok;
    pedidos.push({
        provedor: 'mercadopago',
        referencia: String(p.id),
        codigo_reserva: ledger.ok ? ledger.reservationCode : null,
        criado_em: p.date_created || null,
        status: ledger.ok ? ledger.status : 'status financeiro a confirmar',
        status_provedor: traduzStatus(p.status),
        status_confiavel: ledger.ok,
        status_atualizado_em: ledger.ok ? ledger.updatedAt : null,
        fulfillment_ativo: Boolean(ledger.ok && ledger.fulfillmentActive),
        valor_centavos: Math.round((p.transaction_amount || 0) * 100),
        moeda: (p.currency_id || 'BRL').toUpperCase(),
        forma: 'Pix',
        nome: [p.payer?.first_name, p.payer?.last_name].filter(Boolean).join(' ') || null,
        cpf_mascarado: cpfPedido ? mascaraCpf(cpfPedido) : null,
        cpf_verificado: Boolean(cpfPedido),
        contrato_aceito: Boolean(ledger.ok && ledger.termsAcknowledgedAt),
        contrato_versao: ledger.ok
          ? ledger.contractVersion
          : p.metadata?.contract_version || null,
        fatura_url: null,
      });
  }

  return { ok: true, ledgerOk, pedidos };
}

/**
 * Orders novas são resolvidas exclusivamente pelo ledger. A busca ampla abaixo
 * fica restrita à compatibilidade de leitura do Checkout Pro já emitido.
 */
async function buscarMercadoPago(email, cpf, buyerHash, emailHash, context) {
  if (!context.mpToken) return { ok: false, ledgerOk: false, pedidos: [] };
  let orders;
  try {
    orders = await buscarMercadoPagoOrders(email, cpf, buyerHash, emailHash, context);
  } catch {
    return { ok: false, ledgerOk: false, pedidos: [] };
  }
  if (orders.applicable) return orders;
  return buscarMercadoPagoCheckoutPro(email, cpf, buyerHash, context);
}

const genericCodeResponse = (challengeId) => ({
  ok: true,
  challenge_id: challengeId,
  proxima_etapa: 'verificar_codigo',
  expira_em_segundos: PEDIDO_CODE_TTL_SECONDS,
  mensagem: 'Se os dados informados forem válidos, enviaremos um código ao e-mail informado.',
});

const authError = (res) => res.status(401).json({ error: 'codigo_invalido' });

/** Factory exportada para provar concorrência entre instâncias nos testes. */
export function createPedidoHandler(dependencies = {}) {
  const now = dependencies.now || (() => new Date());
  const clockMs = dependencies.clockMs || (() => Date.now());
  const fetchImpl = dependencies.fetchImpl || globalThis.fetch;
  const sendCode = dependencies.sendCode || enviarCodigoAcessoPedido;
  const providerDeadlineMs = Number.isFinite(dependencies.providerDeadlineMs)
    && dependencies.providerDeadlineMs > 0
    ? dependencies.providerDeadlineMs
    : PEDIDO_PROVIDER_DEADLINE_MS;

  return async function pedidoHandler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', 'https://www.growx.com.br');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch { return res.status(400).json({ error: 'invalid_json' }); }

    const action = String(body?.action || '');
    // O contrato antigo de e-mail+CPF jamais consulta provedores.
    if (!['request_code', 'verify_code'].includes(action)) {
      return res.status(400).json({ error: 'acao_invalida' });
    }

    const tableName = dependencies.tableName ?? process.env.PREVENDA_INVENTORY_TABLE ?? '';
    const guardSecret = dependencies.secret ?? reservationSecret();
    const emailConfigured = dependencies.emailConfigured
      ?? emailPedidoConfigurado();
    if (!tableName
        || typeof guardSecret !== 'string'
        || Buffer.byteLength(guardSecret, 'utf8') < 32
        || !emailConfigured) {
      return res.status(503).json({ error: 'consulta_indisponivel' });
    }

    const email = normalizeEmail(body?.email);
    const cpf = digitos(body?.cpf);
    const identityValid = EMAIL.test(email) && documentoValido(cpf);

    if (action === 'request_code') {
      let challenge;
      try {
        challenge = await createPedidoChallenge({
          email,
          document: cpf,
          ip: clientIp(req),
          identityValid,
          now: now(),
          challengeId: dependencies.challengeId?.(),
          code: dependencies.code?.(),
          client: dependencies.client,
          tableName,
          secret: guardSecret,
        });
      } catch (error) {
        console.error(error instanceof PedidoAuthUnavailableError
          ? '[pedido] autenticação indisponível'
          : '[pedido] falha interna na autenticação');
        return res.status(503).json({ error: 'consulta_indisponivel' });
      }

      if (challenge.deliver) {
        try {
          await sendCode({
            email,
            codigo: challenge.code,
            validadeMinutos: PEDIDO_CODE_TTL_SECONDS / 60,
          });
        } catch {
          // A forma pública não vira um oráculo de existência/entrega.
          console.error('[pedido] entrega do código não confirmada');
        }
      }
      return res.status(202).json(genericCodeResponse(challenge.challengeId));
    }

    const code = String(body?.code || '').trim();
    const challengeId = String(body?.challengeId || body?.challenge_id || '').trim();
    if (!identityValid) return authError(res);

    try {
      const auth = await consumePedidoChallenge({
        challengeId,
        code,
        email,
        document: cpf,
        now: now(),
        client: dependencies.client,
        tableName,
        secret: guardSecret,
      });
      if (!auth.verified) return authError(res);
    } catch (error) {
      console.error(error instanceof PedidoAuthUnavailableError
        ? '[pedido] verificação indisponível'
        : '[pedido] falha interna na verificação');
      return res.status(503).json({ error: 'consulta_indisponivel' });
    }

    const buyerHash = deriveReservationKey(guardSecret, 'buyer', cpf);
    const emailHash = deriveReservationKey(guardSecret, 'email', email);
    const vazio = { ok: false, ledgerOk: false, pedidos: [] };
    const context = {
      client: dependencies.client,
      tableName,
      stripeKey: dependencies.stripeKey ?? process.env.STRIPE_SECRET_KEY,
      mpToken: dependencies.mpToken ?? process.env.MP_ACCESS_TOKEN,
      fetchImpl,
      clockMs,
      deadlineAt: clockMs() + providerDeadlineMs,
    };

    let cartao;
    let pix;
    try {
      if (dependencies.lookupProviders) {
        [cartao, pix] = await dependencies.lookupProviders({
          email, cpf, buyerHash, emailHash, context,
        });
      } else {
        [cartao, pix] = await Promise.all([
          buscarStripe(email, cpf, buyerHash, context).catch(() => vazio),
          buscarMercadoPago(email, cpf, buyerHash, emailHash, context).catch(() => vazio),
        ]);
      }
    } catch {
      cartao = vazio;
      pix = vazio;
    }
    cartao ||= vazio;
    pix ||= vazio;

    const pedidos = [...(cartao.pedidos || []), ...(pix.pedidos || [])]
      .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
    const ledgerOk = cartao.ledgerOk !== false && pix.ledgerOk !== false;
    const etapa = etapaAtual(now().getTime());

    return res.status(200).json({
      encontrados: pedidos.length,
      pedidos,
      etapas: ETAPAS,
      etapa_atual: etapa.id,
      etapa_estimada: etapa.estimada,
      entrega_prevista: OFERTA.entregaISO,
      // Se um provedor não respondeu, o cliente precisa saber que a busca foi
      // parcial — em vez de ver "nenhum pedido" e achar que a compra sumiu.
      fontes: { cartao: Boolean(cartao.ok), pix: Boolean(pix.ok), ledger: ledgerOk },
      busca_parcial: !cartao.ok || !pix.ok || !ledgerOk,
    });
  };
}

const handler = createPedidoHandler();
export default handler;
