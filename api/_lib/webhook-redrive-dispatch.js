import { createHash } from 'node:crypto';

import { brl } from '../../src/lib/oferta.js';
import { MP_ORDER_ID_PATTERN, REQUEST_ID_PATTERN } from '../../shared/provider-identifiers.js';
import { reservationCode } from '../../shared/reservation-code.js';
import {
  buildStripeFinancialSnapshot,
  stripeFinancialDigest,
} from '../stripe-webhook.js';
import {
  deriveMercadoPagoFinancialSnapshot,
  fetchMercadoPagoOrder,
  normalizeMercadoPagoOrderCanonical,
  normalizeMercadoPagoRefundState,
  verifyMercadoPagoOrderBinding,
} from '../mp-webhook.js';
import {
  sendBuyerConfirmationEmail,
  sendBuyerFinancialUpdateEmail,
  sendBuyerLateRefundEmail,
  sendInternalSaleEmail,
  sendSlackSaleNotification,
} from './webhook-delivery.js';

const SOURCE = 'growx.com.br/prevenda';
const PROVIDER_TIMEOUT_MS = 7_000;
const SLOT = /^SLOT#(?:0(?:0[1-9]|[1-9]\d)|100)$/;
const HASH = /^[a-f0-9]{64}$/;

const INTERNAL_CHANNELS = new Set([
  'internal_email',
  'late_refund_internal',
  'late_refund_failure_internal',
  'late_reversal_internal',
]);
const SLACK_CHANNELS = new Set([
  'slack',
  'late_refund_slack',
  'late_refund_failure_slack',
  'late_reversal_slack',
]);
const BUYER_FINANCIAL_CHANNELS = new Set(['buyer_financial', 'buyer_financial_email']);
const SAFELY_REDRIVEABLE_CHANNELS = new Set([
  ...INTERNAL_CHANNELS,
  ...SLACK_CHANNELS,
  ...BUYER_FINANCIAL_CHANNELS,
  'buyer_email',
  'late_refund_buyer',
]);
const FINANCIAL_BUYER_STATES = new Set([
  'refund_pending',
  'refund_failed',
  'partially_refunded',
  'refunded',
  'disputed',
  'charged_back',
]);

export class WebhookRedriveUnsafeError extends Error {
  constructor(code) {
    super(code);
    this.name = 'WebhookRedriveUnsafeError';
    this.code = code;
  }
}

export class WebhookRedriveProviderError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = 'WebhookRedriveProviderError';
    this.code = code;
    this.status = status;
  }
}

const unsafe = (condition, code) => {
  if (!condition) throw new WebhookRedriveUnsafeError(code);
};

const idOf = (value) => typeof value === 'string' ? value : value?.id;

async function fetchProviderJson(url, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const remaining = Number(options.deadlineAt ?? Number.POSITIVE_INFINITY) - Date.now();
  if (Number.isFinite(remaining) && remaining <= 0) {
    throw new WebhookRedriveProviderError('redrive_deadline_reached');
  }
  const controller = new AbortController();
  const timeoutMs = Number.isFinite(remaining)
    ? Math.max(1, Math.min(PROVIDER_TIMEOUT_MS, remaining))
    : PROVIDER_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...options.request, signal: controller.signal });
    if (response.status === 404 && options.allowNotFound) return null;
    if (response.status === 404) throw new WebhookRedriveUnsafeError('provider_reference_not_found');
    if (!response.ok) throw new WebhookRedriveProviderError('provider_refetch_failed', response.status);
    const body = await response.json();
    if (!body || typeof body !== 'object') {
      throw new WebhookRedriveProviderError('provider_refetch_invalid_json');
    }
    return body;
  } catch (error) {
    if (error instanceof WebhookRedriveUnsafeError
        || error instanceof WebhookRedriveProviderError) throw error;
    throw new WebhookRedriveProviderError('provider_refetch_unavailable');
  } finally {
    clearTimeout(timer);
  }
}

function reservationMetadata(metadata, expected = {}) {
  unsafe(metadata?.source === SOURCE, 'provider_product_source_mismatch');
  unsafe(/^[a-z0-9_-]{1,64}$/.test(String(metadata?.sku || '')),
    'provider_product_sku_missing');
  unsafe(/^[a-zA-Z0-9._-]{1,80}$/.test(String(metadata?.contract_version || '')),
    'provider_contract_missing');
  if (expected.offerSku) {
    unsafe(metadata.sku === expected.offerSku, 'provider_product_sku_mismatch');
  }
  if (expected.contractVersion) {
    unsafe(metadata.contract_version === expected.contractVersion, 'provider_contract_mismatch');
  }
  unsafe(REQUEST_ID_PATTERN.test(String(metadata?.request_id || '')), 'provider_request_id_missing');
  unsafe(SLOT.test(String(metadata?.slot_id || '')), 'provider_slot_missing');
  unsafe(HASH.test(String(metadata?.buyer_hash || '')), 'provider_buyer_hash_missing');
  return {
    requestId: metadata.request_id,
    slot: metadata.slot_id,
    buyerHash: metadata.buyer_hash,
    sku: metadata.sku,
    contractVersion: metadata.contract_version,
  };
}

const stripeGet = (path, secret, options) => fetchProviderJson(`https://api.stripe.com/v1${path}`, {
  ...options,
  request: { headers: { Authorization: `Bearer ${secret}` } },
});

function stripeContact(session, charge) {
  const shipping = session?.collected_information?.shipping_details?.address
    || session?.shipping_details?.address
    || session?.customer_details?.address
    || charge?.shipping?.address;
  const taxId = session?.customer_details?.tax_ids?.find((candidate) => candidate?.value)?.value;
  return {
    email: session?.customer_details?.email
      || session?.customer_email
      || charge?.billing_details?.email
      || charge?.receipt_email,
    name: session?.customer_details?.name || charge?.billing_details?.name,
    phone: session?.customer_details?.phone || charge?.billing_details?.phone,
    document: taxId,
    address: shipping
      ? [shipping.line1, shipping.line2, shipping.city, shipping.state, shipping.postal_code]
        .filter(Boolean).join(', ')
      : null,
  };
}

function stripeStatusFor(paymentStatus) {
  return {
    paid: 'PAGO',
    refund_pending: 'REEMBOLSO INICIADO',
    refunded: 'REEMBOLSO CONFIRMADO',
    partially_refunded: 'REEMBOLSO PARCIAL CONFIRMADO',
    refund_failed: 'REEMBOLSO NÃO CONCLUÍDO',
    disputed: 'CONTESTAÇÃO EM ANDAMENTO',
    charged_back: 'CONTESTAÇÃO PERDIDA',
  }[paymentStatus] || 'ATUALIZAÇÃO FINANCEIRA';
}

function stripeAmountFor(snapshot) {
  if (snapshot.paymentStatus === 'refund_pending') return snapshot.refundTotals.pendingCents;
  if (snapshot.paymentStatus === 'refund_failed') return snapshot.refundTotals.latestFailedCents;
  if (['refunded', 'partially_refunded'].includes(snapshot.paymentStatus)) {
    return snapshot.refundTotals.succeededCents;
  }
  if (snapshot.paymentStatus === 'disputed') return snapshot.disputeTotals.disputedCents;
  if (snapshot.paymentStatus === 'charged_back') return snapshot.disputeTotals.chargedBackCents;
  return snapshot.charge.amountCents;
}

function stripeStatusDetail(snapshot) {
  const parts = [];
  if (snapshot.refundTotals.succeededCents) {
    parts.push(`${brl(snapshot.refundTotals.succeededCents)} confirmado em reembolso`);
  }
  if (snapshot.refundTotals.pendingCents) {
    parts.push(`${brl(snapshot.refundTotals.pendingCents)} ainda em processamento`);
  }
  if (snapshot.refundTotals.latestFailedCents) {
    const failedCount = Object.entries(snapshot.refundTotals.counts)
      .filter(([status]) => !['succeeded', 'pending', 'requires_action'].includes(status))
      .reduce((sum, [, count]) => sum + count, 0);
    parts.push(`${brl(snapshot.refundTotals.latestFailedCents)} na última tentativa não concluída${failedCount > 1 ? ` (${failedCount} tentativas)` : ''}`);
  }
  if (snapshot.disputeTotals.disputedCents) {
    parts.push(`${brl(snapshot.disputeTotals.disputedCents)} em contestação`);
  }
  if (snapshot.disputeTotals.chargedBackCents) {
    parts.push(`${brl(snapshot.disputeTotals.chargedBackCents)} em chargeback perdido`);
  }
  if (snapshot.disputeTotals.fundsWithdrawnCents) {
    parts.push(`${brl(snapshot.disputeTotals.fundsWithdrawnCents)} retirado do saldo`);
  }
  if (snapshot.disputeTotals.fundsReinstatedCents) {
    parts.push(`${brl(snapshot.disputeTotals.fundsReinstatedCents)} reintegrado ao saldo`);
  }
  if (snapshot.disputeTotals.counts.warning_closed) {
    parts.push('consulta encerrada sem chargeback');
  }
  if (snapshot.disputeTotals.counts.won) parts.push('contestação vencida');
  if (snapshot.disputeTotals.counts.lost && !snapshot.disputeTotals.chargedBackCents) {
    parts.push('contestação perdida sem nova retirada além do estado já consolidado');
  }
  return parts.join('; ') || 'Sem saída financeira registrada.';
}

function stripeBuyerFinancialState(snapshot) {
  return {
    version: 1,
    chargeId: snapshot.charge.id,
    paymentStatus: snapshot.paymentStatus,
    amountCents: stripeAmountFor(snapshot),
    refundedCents: snapshot.refundTotals.succeededCents,
    refundPendingCents: snapshot.refundTotals.pendingCents,
    refundFailedCents: snapshot.refundTotals.failedCents,
    disputedCents: snapshot.disputeTotals.disputedCents,
    chargedBackCents: snapshot.disputeTotals.chargedBackCents,
  };
}

async function fetchStripeCanonical(reference, record, options) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !secret.startsWith('sk_')) {
    throw new WebhookRedriveProviderError('stripe_not_configured');
  }
  let session = null;
  let paymentIntent = null;
  let charge = null;

  if (/^cs_[A-Za-z0-9_]+$/.test(reference)) {
    session = await stripeGet(`/checkout/sessions/${encodeURIComponent(reference)}`, secret, options);
    unsafe(session?.object === 'checkout.session' && session.id === reference,
      'stripe_session_mismatch');
    const paymentIntentId = idOf(session.payment_intent);
    unsafe(/^pi_[A-Za-z0-9_]+$/.test(String(paymentIntentId || '')),
      'stripe_payment_intent_missing');
    paymentIntent = typeof session.payment_intent === 'object'
      ? session.payment_intent
      : await stripeGet(`/payment_intents/${encodeURIComponent(paymentIntentId)}`, secret, options);
  } else if (/^pi_[A-Za-z0-9_]+$/.test(reference)) {
    paymentIntent = await stripeGet(`/payment_intents/${encodeURIComponent(reference)}`, secret, options);
  } else if (/^ch_[A-Za-z0-9_]+$/.test(reference)) {
    charge = await stripeGet(`/charges/${encodeURIComponent(reference)}`, secret, options);
  } else {
    throw new WebhookRedriveUnsafeError('stripe_reference_unsupported');
  }

  if (paymentIntent) {
    unsafe(paymentIntent.object === 'payment_intent', 'stripe_payment_intent_mismatch');
    const chargeId = idOf(paymentIntent.latest_charge);
    unsafe(/^ch_[A-Za-z0-9_]+$/.test(String(chargeId || '')), 'stripe_charge_missing');
    charge = typeof paymentIntent.latest_charge === 'object'
      ? paymentIntent.latest_charge
      : await stripeGet(`/charges/${encodeURIComponent(chargeId)}`, secret, options);
  }
  unsafe(charge?.object === 'charge' && /^ch_[A-Za-z0-9_]+$/.test(String(charge.id || '')),
    'stripe_charge_mismatch');

  const paymentIntentId = idOf(charge.payment_intent);
  if (!paymentIntent && paymentIntentId) {
    paymentIntent = await stripeGet(`/payment_intents/${encodeURIComponent(paymentIntentId)}`, secret, options);
  }
  if (!session && paymentIntentId) {
    const sessions = await stripeGet(`/checkout/sessions?payment_intent=${encodeURIComponent(paymentIntentId)}&limit=1`, secret, options);
    unsafe(sessions?.object === 'list' && Array.isArray(sessions.data)
      && sessions.has_more === false, 'stripe_session_list_incomplete');
    session = Array.isArray(sessions.data) ? sessions.data[0] || null : null;
    if (session) {
      unsafe(session.object === 'checkout.session'
        && /^cs_[A-Za-z0-9_]+$/.test(String(session.id || ''))
        && idOf(session.payment_intent) === paymentIntentId,
      'stripe_session_binding_mismatch');
    }
  }

  const metadata = session?.metadata || paymentIntent?.metadata || charge.metadata;
  const reservation = reservationMetadata(metadata, record);
  for (const candidate of [session?.metadata, paymentIntent?.metadata, charge.metadata].filter(Boolean)) {
    reservationMetadata(candidate, record);
    unsafe(candidate.request_id === metadata.request_id
      && candidate.slot_id === metadata.slot_id
      && candidate.buyer_hash === metadata.buyer_hash
      && candidate.sku === metadata.sku
      && candidate.contract_version === metadata.contract_version,
    'stripe_metadata_binding_mismatch');
  }
  const amountCents = Number(charge.amount);
  const currency = String(charge.currency || '').toLowerCase();
  if (record.expectedAmountCents !== null && record.expectedAmountCents !== undefined) {
    unsafe(amountCents === record.expectedAmountCents, 'provider_offer_amount_changed');
  }
  if (record.expectedCurrency) {
    unsafe(currency === record.expectedCurrency.toLowerCase(), 'provider_offer_currency_changed');
  }
  const offer = {
    amountCents,
    currency,
    sku: reservation.sku,
    contractVersion: reservation.contractVersion,
  };
  unsafe(Number.isInteger(amountCents) && amountCents > 0
    && /^[a-z]{3}$/.test(currency)
    && charge.paid === true
    && charge.status === 'succeeded', 'stripe_payment_state_invalid');
  if (paymentIntent) {
    unsafe(Number(paymentIntent.amount) === amountCents
      && String(paymentIntent.currency || '').toLowerCase() === currency
      && paymentIntent.status === 'succeeded'
      && Number(paymentIntent.amount_received) === amountCents,
    'stripe_payment_intent_state_invalid');
  }
  if (session) {
    unsafe(Number(session.amount_total) === amountCents
      && String(session.currency || '').toLowerCase() === currency,
    'stripe_session_amount_invalid');
  }

  const [refundList, disputeList] = await Promise.all([
    stripeGet(`/refunds?charge=${encodeURIComponent(charge.id)}&limit=100`, secret, options),
    stripeGet(`/disputes?charge=${encodeURIComponent(charge.id)}&limit=100`, secret, options),
  ]);
  unsafe(refundList?.object === 'list' && refundList.has_more === false
    && disputeList?.object === 'list' && disputeList.has_more === false
    && Array.isArray(refundList.data) && Array.isArray(disputeList.data),
    'stripe_financial_collections_invalid');
  let snapshot;
  try {
    snapshot = buildStripeFinancialSnapshot({
      charge,
      refunds: refundList.data,
      disputes: disputeList.data,
      checkoutSessionId: session?.id || null,
      offer,
    });
  } catch {
    throw new WebhookRedriveUnsafeError('stripe_canonical_snapshot_invalid');
  }
  return {
    provider: 'stripe',
    method: 'cartão (até 12x)',
    currency: currency.toUpperCase(),
    reference: session?.id || charge.id,
    providerReference: reference,
    contact: stripeContact(session, charge),
    reservation,
    session,
    charge,
    offer,
    snapshot,
  };
}

const mpGet = (path, token, options) => fetchProviderJson(`https://api.mercadopago.com${path}`, {
  ...options,
  request: { headers: { Authorization: `Bearer ${token}` } },
});

function mpContact(payment) {
  const payer = payment.payer || {};
  const shipping = payment.shipments?.receiver_address
    || payment.additional_info?.shipments?.receiver_address;
  return {
    email: payer.email,
    name: [payer.first_name, payer.last_name].filter(Boolean).join(' ') || null,
    phone: payer.phone?.number,
    document: payer.identification?.number,
    address: shipping
      ? [shipping.street_name, shipping.street_number, shipping.city_name, shipping.state_name, shipping.zip_code]
        .filter(Boolean).join(', ')
      : null,
  };
}

async function fetchMercadoPagoCanonical(reference, record, options) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new WebhookRedriveProviderError('mp_not_configured');
  unsafe(/^\d{5,}$/.test(reference), 'mp_reference_unsupported');
  const [payment, refundBody] = await Promise.all([
    mpGet(`/v1/payments/${encodeURIComponent(reference)}`, token, options),
    mpGet(`/v1/payments/${encodeURIComponent(reference)}/refunds`, token, options),
  ]);
  unsafe(String(payment.id) === reference, 'mp_payment_mismatch');
  unsafe(payment.external_reference === 'gx-modulo-prevenda', 'mp_external_reference_mismatch');
  const reservation = reservationMetadata(payment.metadata, record);
  const amountCents = Math.round(Number(payment.transaction_amount) * 100);
  const currency = String(payment.currency_id || '').toUpperCase();
  if (record.expectedAmountCents !== null && record.expectedAmountCents !== undefined) {
    unsafe(amountCents === record.expectedAmountCents, 'provider_offer_amount_changed');
  }
  if (record.expectedCurrency) {
    unsafe(currency === record.expectedCurrency, 'provider_offer_currency_changed');
  }
  unsafe(Number.isInteger(amountCents) && amountCents > 0 && /^[A-Z]{3}$/.test(currency),
    'mp_payment_amount_invalid');
  const offer = {
    amountCents,
    currency,
    sku: reservation.sku,
    contractVersion: reservation.contractVersion,
  };
  let refundState;
  try {
    refundState = normalizeMercadoPagoRefundState(reference, refundBody, amountCents);
  } catch {
    throw new WebhookRedriveUnsafeError('mp_refund_snapshot_invalid');
  }
  let chargeback = null;
  if (['in_mediation', 'charged_back'].includes(String(payment.status || ''))) {
    chargeback = await mpGet(`/v1/chargebacks/${encodeURIComponent(reference)}`, token, {
      ...options,
      allowNotFound: true,
    });
  }
  let snapshot;
  try {
    snapshot = deriveMercadoPagoFinancialSnapshot(payment, refundState, chargeback, offer);
  } catch {
    throw new WebhookRedriveUnsafeError('mp_canonical_snapshot_invalid');
  }
  unsafe(Boolean(snapshot), 'mp_canonical_snapshot_missing');
  return {
    provider: 'mercadopago',
    method: 'Pix',
    currency,
    reference: `mp_${payment.id}`,
    providerReference: reference,
    contact: mpContact(payment),
    reservation,
    payment,
    refundState,
    chargeback,
    offer,
    snapshot,
  };
}

async function fetchMercadoPagoOrderCanonical(reference, record, options) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new WebhookRedriveProviderError('mp_not_configured');
  unsafe(MP_ORDER_ID_PATTERN.test(reference), 'mp_order_reference_unsupported');
  let order;
  let boundReservation;
  let normalized;
  try {
    order = await fetchMercadoPagoOrder(token, reference, options);
    unsafe(String(order?.id) === reference, 'mp_order_mismatch');
    boundReservation = await verifyMercadoPagoOrderBinding(order, {
      getReservationImpl: options.getReservationImpl,
    });
    normalized = normalizeMercadoPagoOrderCanonical(order, boundReservation);
  } catch (error) {
    if (error instanceof WebhookRedriveUnsafeError
        || error instanceof WebhookRedriveProviderError) throw error;
    const code = String(error?.code || error?.message || 'mp_order_canonical_invalid');
    if (/fetch|refetch|not_found|deadline|unavailable/i.test(code)) {
      throw new WebhookRedriveProviderError('mp_order_refetch_failed');
    }
    throw new WebhookRedriveUnsafeError('mp_order_canonical_invalid');
  }
  unsafe(Boolean(normalized.snapshot), 'mp_order_financial_state_unsupported');
  if (record.expectedAmountCents !== null && record.expectedAmountCents !== undefined) {
    unsafe(normalized.offer.amountCents === record.expectedAmountCents,
      'provider_offer_amount_changed');
  }
  if (record.expectedCurrency) {
    unsafe(normalized.offer.currency === record.expectedCurrency,
      'provider_offer_currency_changed');
  }
  if (record.offerSku) unsafe(normalized.offer.sku === record.offerSku, 'provider_product_sku_mismatch');
  if (record.contractVersion) {
    unsafe(normalized.offer.contractVersion === record.contractVersion,
      'provider_contract_mismatch');
  }
  const payment = Array.isArray(order?.transactions?.payments)
    ? order.transactions.payments[0]
    : null;
  const payer = order?.payer || payment?.payer || {};
  const contact = {
    email: payer.email,
    name: [payer.first_name, payer.last_name].filter(Boolean).join(' ') || null,
    phone: payer.phone?.number,
    document: payer.identification?.number,
    address: null,
  };
  return {
    provider: 'mercadopago',
    providerProtocol: 'mp_orders_v1',
    method: 'Pix',
    currency: normalized.offer.currency,
    reference: `mp_${normalized.orderId}`,
    providerReference: reference,
    contact,
    order,
    payment,
    reservation: normalized.reservation,
    offer: normalized.offer,
    snapshot: normalized.snapshot,
  };
}

const MAX_LATE_REFUND_ATTEMPTS = 3;

function sameExpectedStatus(expected, actual) {
  if (!expected) return true;
  if (expected === actual) return true;
  return (expected === 'paid' && actual === 'approved')
    || (expected === 'approved' && actual === 'paid');
}

function assertCanonicalEvent(record, eventId) {
  const digest = createHash('sha256').update(eventId).digest('hex');
  unsafe(digest === record.eventHash, 'canonical_event_changed');
  return eventId;
}

function stripeDispatchData(canonical, record) {
  const { snapshot, offer, charge, session, contact, reservation } = canonical;
  const statusCode = snapshot.paymentStatus;
  unsafe(sameExpectedStatus(record.expectedStatus, statusCode), 'canonical_state_changed');
  if (record.channel === 'buyer_email') {
    unsafe(statusCode === 'paid', 'buyer_confirmation_not_canonical');
    const reference = session?.id || charge.id;
    assertCanonicalEvent(record, `buyer-confirmation:${reference}`);
    return {
      statusCode,
      buyer: {
        ...contact,
        reference,
        reservationCode: reservationCode(reservation.requestId),
        amountCents: snapshot.charge.amountCents,
        method: 'Cartão (até 12x)',
        sku: offer.sku,
        contractVersion: offer.contractVersion,
      },
    };
  }

  const financialEventId = `financial:${charge.id}:${stripeFinancialDigest(snapshot)}`;
  const notification = {
    provider: 'stripe',
    method: 'cartão (até 12x)',
    amountCents: stripeAmountFor(snapshot),
    currency: snapshot.charge.currency,
    ...contact,
    reference: charge.id,
    status: stripeStatusFor(statusCode),
    statusCode,
    statusDetail: stripeStatusDetail(snapshot),
    sku: offer.sku,
    contractVersion: offer.contractVersion,
    eventId: financialEventId,
    eventCreatedAt: snapshot.providerStateCreated
      ? new Date(snapshot.providerStateCreated * 1000).toISOString()
      : null,
  };
  if (BUYER_FINANCIAL_CHANNELS.has(record.channel)) {
    unsafe(FINANCIAL_BUYER_STATES.has(statusCode), 'buyer_financial_state_missing');
    const buyerState = stripeBuyerFinancialState(snapshot);
    assertCanonicalEvent(
      record,
      `buyer-financial:${charge.id}:${stripeFinancialDigest(buyerState)}`,
    );
    return {
      statusCode,
      buyerFinancial: { ...notification, reference: session?.id || charge.id },
    };
  }
  assertCanonicalEvent(record, financialEventId);
  return { statusCode, notification };
}

function mpDispatchData(canonical, record) {
  const {
    payment, refundState, snapshot, offer, contact, reservation,
  } = canonical;
  const statusCode = snapshot.paymentStatus;
  unsafe(sameExpectedStatus(record.expectedStatus, statusCode), 'canonical_state_changed');
  const base = {
    provider: 'mercadopago',
    method: 'Pix',
    currency: offer.currency,
    sku: offer.sku,
    contractVersion: offer.contractVersion,
    ...contact,
    reference: `mp_${payment.id}`,
  };

  if (record.channel === 'late_refund_buyer'
      || record.channel === 'late_refund_internal'
      || record.channel === 'late_refund_slack') {
    unsafe(refundState.confirmedCents === offer.amountCents
      && Boolean(refundState.aggregateReference), 'late_refund_not_canonical');
    const eventId = assertCanonicalEvent(record, `late-payment:${payment.id}`);
    return {
      statusCode,
      buyerLateRefund: {
        ...contact,
        reference: `mp_${payment.id}`,
        reservationCode: reservationCode(reservation.requestId),
        refundReference: refundState.aggregateReference,
        amountCents: offer.amountCents,
        sku: offer.sku,
        contractVersion: offer.contractVersion,
      },
      notification: {
        ...base,
        amountCents: offer.amountCents,
        refundReference: refundState.aggregateReference,
        status: 'REEMBOLSO AUTOMÁTICO — PAGAMENTO TARDIO',
        eventId,
        eventCreatedAt: payment.date_created || null,
      },
    };
  }

  if (record.channel === 'late_refund_failure_internal'
      || record.channel === 'late_refund_failure_slack') {
    unsafe(refundState.failedCount > 0, 'late_refund_failure_not_canonical');
    const capped = refundState.failedCount >= MAX_LATE_REFUND_ATTEMPTS;
    const eventId = assertCanonicalEvent(
      record,
      `late-payment:${payment.id}:failed:${refundState.digest.slice(0, 24)}`,
    );
    return {
      statusCode,
      notification: {
        ...base,
        amountCents: Number(refundState.latestFailedCents || 0) || offer.amountCents,
        status: capped
          ? 'PAGAMENTO TARDIO — REEMBOLSO NÃO CONCLUÍDO; INTERVENÇÃO OBRIGATÓRIA'
          : `PAGAMENTO TARDIO — REEMBOLSO NÃO CONCLUÍDO; NOVA TENTATIVA ${refundState.failedCount + 1}/${MAX_LATE_REFUND_ATTEMPTS}`,
        statusDetail: `Mercado Pago registrou ${refundState.failedCount} tentativa(s) não concluída(s).`,
        eventId,
        eventCreatedAt: refundState.latestUpdatedAt || snapshot.providerEventCreated,
      },
    };
  }

  if (record.channel === 'late_reversal_internal' || record.channel === 'late_reversal_slack') {
    unsafe(['disputed', 'charged_back'].includes(statusCode), 'late_reversal_not_canonical');
    const resolution = statusCode === 'disputed' ? 'pending' : 'settled';
    const eventId = assertCanonicalEvent(record, `late-payment:${payment.id}:${resolution}`);
    return {
      statusCode,
      notification: {
        ...base,
        amountCents: offer.amountCents,
        status: statusCode === 'disputed'
          ? 'PAGAMENTO TARDIO — CONTESTAÇÃO EM ANÁLISE'
          : 'PAGAMENTO TARDIO — CHARGEBACK LIQUIDADO',
        eventId,
        eventCreatedAt: snapshot.providerEventCreated,
      },
    };
  }

  const eventId = assertCanonicalEvent(record, snapshot.canonicalEventId);
  const notification = {
    ...base,
    amountCents: snapshot.notificationAmountCents,
    refundReference: refundState.aggregateReference,
    status: snapshot.label,
    statusCode,
    statusDetail: snapshot.statusDetail,
    eventId,
    eventCreatedAt: snapshot.providerEventCreated,
  };
  if (record.channel === 'buyer_email') {
    unsafe(snapshot.isInitialPayment && statusCode === 'approved',
      'buyer_confirmation_not_canonical');
    return {
      statusCode,
      buyer: {
        ...contact,
        reference: `mp_${payment.id}`,
        reservationCode: reservationCode(reservation.requestId),
        amountCents: offer.amountCents,
        method: 'Pix',
        sku: offer.sku,
        contractVersion: offer.contractVersion,
      },
    };
  }
  if (BUYER_FINANCIAL_CHANNELS.has(record.channel)) {
    unsafe(FINANCIAL_BUYER_STATES.has(statusCode), 'buyer_financial_state_missing');
    return { statusCode, buyerFinancial: notification };
  }
  return { statusCode, notification };
}

function mpOrderDispatchData(canonical, record) {
  const {
    snapshot, offer, contact, reservation, order,
  } = canonical;
  unsafe(sameExpectedStatus(record.expectedStatus, snapshot.paymentStatus),
    'canonical_state_changed');
  const eventId = assertCanonicalEvent(record, snapshot.canonicalEventId);
  const reference = `mp_${order.id}`;
  const notification = {
    provider: 'mercadopago',
    method: 'Pix',
    amountCents: offer.amountCents,
    currency: offer.currency,
    ...contact,
    reference,
    refundReference: null,
    status: snapshot.label,
    statusCode: snapshot.paymentStatus,
    statusDetail: snapshot.statusDetail,
    sku: offer.sku,
    contractVersion: offer.contractVersion,
    eventId,
    eventCreatedAt: snapshot.providerEventCreated,
  };
  if (record.channel === 'buyer_email') {
    unsafe(snapshot.isInitialPayment && snapshot.paymentStatus === 'approved',
      'buyer_confirmation_not_canonical');
    return {
      statusCode: snapshot.paymentStatus,
      buyer: {
        ...contact,
        reference,
        reservationCode: reservationCode(reservation.requestId),
        amountCents: offer.amountCents,
        method: 'Pix',
        sku: offer.sku,
        contractVersion: offer.contractVersion,
      },
    };
  }
  unsafe(INTERNAL_CHANNELS.has(record.channel) || SLACK_CHANNELS.has(record.channel),
    'mp_order_channel_unsupported');
  return { statusCode: snapshot.paymentStatus, notification };
}

/**
 * Refaz somente canais de mensagem. A referência técnica é relida no provider
 * antes de reconstruir PII em memória. Mutações financeiras/inventário ou
 * contexto canônico divergente viram dead-letter, nunca falso `done`.
 */
export function createWebhookRedriveDispatcher({
  fetchImpl = globalThis.fetch,
  getReservationImpl,
  delivery = {},
} = {}) {
  const sendInternal = delivery.sendInternal || sendInternalSaleEmail;
  const sendSlack = delivery.sendSlack || sendSlackSaleNotification;
  const sendBuyer = delivery.sendBuyer || sendBuyerConfirmationEmail;
  const sendBuyerFinancial = delivery.sendBuyerFinancial || sendBuyerFinancialUpdateEmail;
  const sendLateRefundBuyer = delivery.sendLateRefundBuyer || sendBuyerLateRefundEmail;

  return async function dispatchWebhookRedrive({ record, idempotencyKey, deadlineAt }) {
    unsafe(SAFELY_REDRIVEABLE_CHANNELS.has(record?.channel), 'channel_not_safely_redriveable');
    unsafe(record?.providerReference, 'provider_reference_missing');
    const options = { fetchImpl, deadlineAt, getReservationImpl };
    const mercadoPagoOrder = record.provider === 'mercadopago'
      && (record.providerProtocol === 'mp_orders_v1'
        || MP_ORDER_ID_PATTERN.test(String(record.providerReference || '')));
    const canonical = record.provider === 'stripe'
      ? await fetchStripeCanonical(record.providerReference, record, options)
      : (record.provider === 'mercadopago'
        ? (mercadoPagoOrder
          ? await fetchMercadoPagoOrderCanonical(record.providerReference, record, options)
          : await fetchMercadoPagoCanonical(record.providerReference, record, options))
        : (() => { throw new WebhookRedriveUnsafeError('provider_unsupported'); })());
    const data = record.provider === 'stripe'
      ? stripeDispatchData(canonical, record)
      : (mercadoPagoOrder
        ? mpOrderDispatchData(canonical, record)
        : mpDispatchData(canonical, record));

    if (INTERNAL_CHANNELS.has(record.channel)) {
      unsafe(Boolean(data.notification), 'internal_message_context_missing');
      return sendInternal(data.notification, { idempotencyKey, fetchImpl });
    }
    if (SLACK_CHANNELS.has(record.channel)) {
      unsafe(Boolean(data.notification), 'internal_message_context_missing');
      return sendSlack(data.notification, { fetchImpl });
    }
    if (record.channel === 'buyer_email') {
      unsafe(Boolean(canonical.contact.email), 'buyer_contact_missing');
      return sendBuyer(data.buyer, { idempotencyKey, fetchImpl });
    }
    if (BUYER_FINANCIAL_CHANNELS.has(record.channel)) {
      unsafe(Boolean(canonical.contact.email), 'buyer_contact_missing');
      return sendBuyerFinancial(data.buyerFinancial, { idempotencyKey, fetchImpl });
    }
    if (record.channel === 'late_refund_buyer') {
      unsafe(Boolean(canonical.contact.email), 'buyer_contact_missing');
      return sendLateRefundBuyer(data.buyerLateRefund, { idempotencyKey, fetchImpl });
    }
    throw new WebhookRedriveUnsafeError('channel_not_safely_redriveable');
  };
}

export const dispatchWebhookRedrive = createWebhookRedriveDispatcher();
