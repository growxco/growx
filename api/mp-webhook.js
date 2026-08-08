/**
 * POST /api/mp-webhook — Pix da pré-venda.
 *
 * A assinatura x-signature é validada antes de qualquer chamada à API. O
 * manifest segue o contrato oficial do Mercado Pago e usa obrigatoriamente o
 * data.id da query. Depois do refetch autenticado, produto, SKU, valor, moeda e
 * método são comparados com a oferta do servidor antes de consumir inventário.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import {
  getReservation,
  InventoryLatePaymentReassignedError,
  markReservationPaid,
} from './_lib/inventory.js';
import {
  sendBuyerConfirmationEmail,
  sendBuyerFinancialUpdateEmail,
  sendBuyerLateRefundEmail,
  sendInternalSaleEmail,
  sendSlackSaleNotification,
} from './_lib/webhook-delivery.js';
import {
  runWebhookEffect,
  withWebhookReservationLock,
  WebhookOutboxBusyError,
} from './_lib/webhook-outbox.js';
import {
  MP_ORDER_EXTERNAL_REFERENCE_PATTERN,
  MP_ORDER_ID_PATTERN,
  MP_ORDER_PAYMENT_ID_PATTERN,
  REQUEST_ID_PATTERN,
} from '../shared/provider-identifiers.js';
import { reservationCode } from '../shared/reservation-code.js';
import { OFERTA, brl } from '../src/lib/oferta.js';

// A rota pode fazer uma cadeia canônica Payment -> Chargeback -> Refunds ->
// Merchant Order e, numa compensação tardia, ainda criar um refund. O teto de
// 60 s comporta essa cadeia, enquanto o deadline de provider abaixo preserva
// margem para outbox, notificações e serialização da resposta.
export const maxDuration = 60;
export const config = { runtime: 'nodejs', maxDuration: 60 };

const EXTERNAL_REFERENCE = 'gx-modulo-prevenda';
const SOURCE = 'growx.com.br/prevenda';
const SKU = 'prevenda_pix';
const PROVIDER_TIMEOUT_MS = 8_000;
const HANDLER_PROVIDER_BUDGET_MS = 45_000;
const MAX_LATE_REFUND_ATTEMPTS = 3;
const ORDER_REFUND_ID = /^REF[A-Z0-9]{20,64}$/;
const ORDER_CHARGEBACK_ID = /^CBK[A-Z0-9]{20,64}$/;
const SLOT = /^SLOT#(?:0(?:0[1-9]|[1-9]\d)|100)$/;
const BUYER_HASH = /^[a-f0-9]{64}$/;
const MP_REFUND_STATUSES = new Set([
  'approved',
  'pending',
  'in_process',
  'failed',
  'rejected',
  'canceled',
  'cancelled',
]);
const MP_REFUND_PENDING_STATUSES = new Set(['pending', 'in_process']);
const MP_REFUND_FAILED_STATUSES = new Set(['failed', 'rejected', 'canceled', 'cancelled']);
const FINANCIAL_STATUS = {
  approved: 'PAGO',
  refund_pending: 'REEMBOLSO EM PROCESSAMENTO',
  refund_failed: 'REEMBOLSO NÃO CONCLUÍDO',
  partially_refunded: 'REEMBOLSO PARCIAL CONFIRMADO',
  refunded: 'REEMBOLSADO',
  disputed: 'CONTESTAÇÃO EM ANÁLISE',
  charged_back: 'ESTORNADO (chargeback)',
};

export class MercadoPagoWebhookIntegrityError extends Error {
  constructor(code) {
    super(code);
    this.name = 'MercadoPagoWebhookIntegrityError';
    this.code = code;
  }
}

export class MercadoPagoProviderError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = 'MercadoPagoProviderError';
    this.status = status;
  }
}

function providerBudget(options = {}) {
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const deadlineAt = options.deadlineAt ?? Number.POSITIVE_INFINITY;
  const remainingMs = Number(deadlineAt) - Number(now());
  if (Number.isFinite(Number(deadlineAt))
      && (!Number.isFinite(remainingMs) || remainingMs <= 0)) {
    throw new MercadoPagoProviderError('mp_handler_deadline_reached');
  }
  return {
    fetchImpl: options.fetchImpl || globalThis.fetch,
    timeoutMs: Number.isFinite(remainingMs)
      ? Math.max(1, Math.min(PROVIDER_TIMEOUT_MS, remainingMs))
      : PROVIDER_TIMEOUT_MS,
    setTimeoutImpl: options.setTimeoutImpl || setTimeout,
    clearTimeoutImpl: options.clearTimeoutImpl || clearTimeout,
  };
}

async function withProviderBudget(options, fallbackCode, execute) {
  const budget = providerBudget(options);
  const controller = new AbortController();
  const timer = budget.setTimeoutImpl(() => controller.abort(), budget.timeoutMs);
  try {
    return await execute({ signal: controller.signal, fetchImpl: budget.fetchImpl });
  } catch (error) {
    if (error instanceof MercadoPagoProviderError) throw error;
    throw new MercadoPagoProviderError(fallbackCode);
  } finally {
    budget.clearTimeoutImpl(timer);
  }
}

const ignored = (reason) => ({ ok: true, ignored: reason });
const integrity = (condition, code) => {
  if (!condition) throw new MercadoPagoWebhookIntegrityError(code);
};

function transitionOutcome(result) {
  const outcome = result && typeof result === 'object' ? result.outcome : null;
  if (['applied', 'idempotent', 'stale'].includes(outcome)) return outcome;
  return result === false ? 'idempotent' : 'applied';
}

const scalar = (value) => Array.isArray(value) ? '' : String(value ?? '').trim();

/**
 * Manifest oficial: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * Aceita múltiplas assinaturas v1 durante rotação e compara em tempo constante.
 */
export function verifyMercadoPagoSignature({ xSignature, xRequestId, dataId, secret }) {
  const signature = scalar(xSignature);
  const requestId = scalar(xRequestId);
  // O formato canônico recebido continua sendo validado e preservado para o
  // refetch. O manifesto oficial, porém, normaliza data.id para lowercase.
  const normalizedDataId = scalar(dataId);
  if (!secret || !signature || signature.length > 1024
      || !requestId || requestId.length > 200
      || (!/^\d{5,}$/.test(normalizedDataId) && !MP_ORDER_ID_PATTERN.test(normalizedDataId))) return false;

  const parts = signature.split(',').map((part) => {
    const index = part.indexOf('=');
    if (index < 1) return ['', ''];
    return [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  });
  const timestamp = parts.find(([key]) => key === 'ts')?.[1] || '';
  const candidates = parts.filter(([key, value]) => key === 'v1' && /^[a-f0-9]{64}$/i.test(value))
    .map(([, value]) => value.toLowerCase());
  if (!/^\d{10,13}$/.test(timestamp) || !candidates.length) return false;

  const manifestDataId = normalizedDataId.toLowerCase();
  const manifest = `id:${manifestDataId};request-id:${requestId};ts:${timestamp};`;
  const expected = createHmac('sha256', secret).update(manifest).digest();
  return candidates.some((candidate) => {
    const received = Buffer.from(candidate, 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

function reservationMetadata(metadata) {
  const requestId = String(metadata?.request_id || '');
  const slot = String(metadata?.slot_id || '');
  const buyerHash = String(metadata?.buyer_hash || '').toLowerCase();
  integrity(REQUEST_ID_PATTERN.test(requestId), 'invalid_reservation_id');
  integrity(SLOT.test(slot), 'invalid_reservation_slot');
  integrity(BUYER_HASH.test(buyerHash), 'invalid_buyer_hash');
  return { requestId, slot, buyerHash };
}

function currentOffer() {
  return {
    amountCents: OFERTA.pixCentavos,
    currency: 'BRL',
    sku: SKU,
    // Produção sempre troca por inventoryOffer; mantém só o caminho de testes
    // injetáveis compatível com eventos antigos sem snapshot persistido.
    contractVersion: null,
  };
}

function inventoryOffer(record) {
  const offer = {
    amountCents: Number(record?.offerAmountCents),
    currency: String(record?.offerCurrency || '').toUpperCase(),
    sku: String(record?.offerSku || ''),
    contractVersion: String(record?.contractVersion || ''),
  };
  integrity(Number.isInteger(offer.amountCents) && offer.amountCents > 0
    && /^[A-Z]{3}$/.test(offer.currency)
    && /^[a-z0-9][a-z0-9._-]{0,63}$/.test(offer.sku)
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(offer.contractVersion),
  'payment_inventory_offer_snapshot_invalid');
  return offer;
}

function paymentAmountCents(payment) {
  const value = Number(payment?.transaction_amount);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}

const moneyCents = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
};

function aggregateRefundReference(ids) {
  const sorted = [...ids].map(String).sort();
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  return `agg_${createHash('sha256').update(sorted.join(':')).digest('hex').slice(0, 32)}`;
}

/** Normaliza a lista provider-side sem persistir payload ou dados do pagador. */
export function normalizeMercadoPagoRefundState(paymentId, body, expectedTotalCents = OFERTA.pixCentavos) {
  integrity(Number.isInteger(expectedTotalCents) && expectedTotalCents > 0,
    'invalid_expected_payment_amount');
  const refunds = Array.isArray(body) ? body : (body && typeof body === 'object' ? [body] : null);
  integrity(Boolean(refunds), 'invalid_refund_list');
  const seen = new Set();
  const normalized = refunds.map((refund) => {
    const id = String(refund?.id || '');
    const status = String(refund?.status || '');
    const amountCents = moneyCents(refund?.amount);
    const updatedAt = refund?.date_last_updated || refund?.date_created || null;
    integrity(/^\d+$/.test(id) && !seen.has(id), 'invalid_refund_id');
    integrity(String(refund?.payment_id) === String(paymentId), 'refund_payment_mismatch');
    integrity(MP_REFUND_STATUSES.has(status), 'invalid_refund_status');
    integrity(Number.isInteger(amountCents) && amountCents > 0 && amountCents <= expectedTotalCents,
      'invalid_refund_amount');
    integrity(Number.isFinite(Date.parse(updatedAt || '')), 'invalid_refund_event_created');
    seen.add(id);
    return { id, status, amountCents, updatedAt };
  }).sort((left, right) => left.id.localeCompare(right.id));
  const approved = normalized.filter((refund) => refund.status === 'approved');
  const pending = normalized.filter((refund) => MP_REFUND_PENDING_STATUSES.has(refund.status));
  const failed = normalized.filter((refund) => MP_REFUND_FAILED_STATUSES.has(refund.status));
  const confirmedCents = approved.reduce((sum, refund) => sum + refund.amountCents, 0);
  const pendingCents = pending.reduce((sum, refund) => sum + refund.amountCents, 0);
  const failedCents = failed.reduce((sum, refund) => sum + refund.amountCents, 0);
  const latestFailed = failed.reduce((latest, refund) => {
    if (!latest || Date.parse(refund.updatedAt) > Date.parse(latest.updatedAt)) return refund;
    if (Date.parse(refund.updatedAt) === Date.parse(latest.updatedAt)
        && refund.id.localeCompare(latest.id) > 0) return refund;
    return latest;
  }, null);
  integrity(confirmedCents <= expectedTotalCents, 'refund_total_exceeds_payment');
  integrity(confirmedCents + pendingCents <= expectedTotalCents, 'refund_pending_exceeds_payment');
  const approvedIds = approved.map((refund) => refund.id);
  const digest = createHash('sha256')
    .update(normalized.map((refund) => (
      `${refund.id}:${refund.status}:${refund.amountCents}:${refund.updatedAt}`
    )).join('|'))
    .digest('hex');
  return {
    refunds: normalized,
    confirmedCents,
    pendingCents,
    failedCents,
    latestFailedCents: latestFailed?.amountCents || 0,
    failedCount: failed.length,
    approvedIds,
    aggregateReference: aggregateRefundReference(approvedIds),
    digest,
    latestUpdatedAt: normalized.reduce((latest, refund) => (
      !latest || Date.parse(refund.updatedAt) > Date.parse(latest) ? refund.updatedAt : latest
    ), null),
  };
}

function mercadoPagoFinancialDetail(refundState, providerDetail) {
  const parts = [];
  if (refundState.confirmedCents > 0) {
    parts.push(`${brl(refundState.confirmedCents)} confirmado em reembolso`);
  }
  if (refundState.pendingCents > 0) {
    parts.push(`${brl(refundState.pendingCents)} ainda em processamento`);
  }
  if (refundState.latestFailedCents > 0) {
    parts.push(`${brl(refundState.latestFailedCents)} na última tentativa não concluída${refundState.failedCount > 1 ? ` (${refundState.failedCount} tentativas)` : ''}`);
  }
  const normalizedDetail = String(providerDetail || '').trim();
  if (normalizedDetail && !['partially_refunded', 'in_process'].includes(normalizedDetail)) {
    parts.push(`Mercado Pago: ${normalizedDetail}`);
  }
  return parts.join('; ') || normalizedDetail || null;
}

function normalizedCoverage(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  if (value === null || value === undefined) return null;
  throw new MercadoPagoWebhookIntegrityError('invalid_chargeback_coverage');
}

/** Deriva uma revisão financeira completa do Payment + refunds + chargeback. */
export function deriveMercadoPagoFinancialSnapshot(
  payment,
  refundState,
  chargeback = null,
  offer = currentOffer(),
) {
  const totalCents = paymentAmountCents(payment);
  integrity(totalCents === offer.amountCents, 'invalid_payment_amount');
  integrity(refundState
    && Number.isInteger(refundState.confirmedCents)
    && Number.isInteger(refundState.pendingCents)
    && Number.isInteger(refundState.failedCents), 'invalid_refund_state');
  const refundedCents = refundState.confirmedCents;
  const reportedRefund = payment.transaction_amount_refunded ?? payment.amount_refunded;
  if (reportedRefund !== undefined && reportedRefund !== null) {
    const reportedCents = moneyCents(reportedRefund);
    if (reportedCents !== refundedCents) {
      throw new MercadoPagoProviderError('mp_refund_state_inconsistent');
    }
  }

  const status = String(payment.status || '');
  const detail = String(payment.status_detail || '');
  let paymentStatus;
  let providerEventType;
  let label;
  let disputedCents = 0;
  let chargedBackCents = 0;
  let chargebackRevision = 'none';

  if (chargeback) {
    const chargebackId = String(chargeback.id || '');
    const chargebackAmount = moneyCents(chargeback.amount);
    integrity(/^\d{5,}$/.test(chargebackId), 'invalid_chargeback_id');
    integrity(String(chargeback.currency || '').toUpperCase() === offer.currency,
      'invalid_chargeback_currency');
    integrity(Number.isInteger(chargebackAmount) && chargebackAmount > 0 && chargebackAmount <= totalCents,
      'invalid_chargeback_amount');
    const coverage = normalizedCoverage(chargeback.coverage_applied);
    chargebackRevision = `${chargebackId}:${coverage === null ? 'open' : String(coverage)}:${chargebackAmount}`;
    if (coverage === null) {
      paymentStatus = 'disputed';
      providerEventType = 'chargeback.opened';
      label = 'CONTESTAÇÃO EM ANÁLISE';
      disputedCents = chargebackAmount;
    } else if (coverage === false) {
      paymentStatus = 'charged_back';
      providerEventType = 'chargeback.settled';
      label = 'CONTESTAÇÃO PERDIDA';
      chargedBackCents = chargebackAmount;
    } else {
      paymentStatus = refundedCents === totalCents
        ? 'refunded'
        : (refundedCents > 0 ? 'partially_refunded' : 'approved');
      providerEventType = 'chargeback.reimbursed';
      label = 'CONTESTAÇÃO VENCIDA — VALOR RECOMPOSTO';
    }
  } else if (status === 'in_mediation') {
    paymentStatus = 'disputed';
    providerEventType = 'payment.disputed';
    label = 'MEDIAÇÃO EM ANÁLISE';
    disputedCents = totalCents;
  } else if (status === 'charged_back') {
    integrity(['in_process', 'settled', 'reimbursed'].includes(detail), 'invalid_chargeback_status_detail');
    if (detail === 'in_process') {
      paymentStatus = 'disputed';
      providerEventType = 'chargeback.opened';
      label = 'CONTESTAÇÃO EM ANÁLISE';
      disputedCents = totalCents;
    } else if (detail === 'settled') {
      paymentStatus = 'charged_back';
      providerEventType = 'chargeback.settled';
      label = 'CONTESTAÇÃO PERDIDA';
      chargedBackCents = totalCents;
    } else {
      paymentStatus = refundedCents === totalCents
        ? 'refunded'
        : (refundedCents > 0 ? 'partially_refunded' : 'approved');
      providerEventType = 'chargeback.reimbursed';
      label = 'CONTESTAÇÃO VENCIDA — VALOR RECOMPOSTO';
    }
  } else if (status === 'refunded' || refundedCents === totalCents) {
    if (refundedCents !== totalCents) throw new MercadoPagoProviderError('mp_full_refund_not_reconciled');
    paymentStatus = 'refunded';
    providerEventType = 'payment.refunded';
    label = FINANCIAL_STATUS.refunded;
  } else if (status === 'approved') {
    if (detail === 'partially_refunded' && refundedCents === 0) {
      throw new MercadoPagoProviderError('mp_partial_refund_not_reconciled');
    }
    if (refundState.pendingCents > 0) paymentStatus = 'refund_pending';
    else if (refundedCents > 0) paymentStatus = 'partially_refunded';
    else if (refundState.failedCents > 0) paymentStatus = 'refund_failed';
    else paymentStatus = 'approved';
    providerEventType = `payment.${paymentStatus}`;
    label = FINANCIAL_STATUS[paymentStatus];
  } else {
    return null;
  }

  const eventDates = [
    chargeback?.date_last_updated,
    refundState.latestUpdatedAt,
    payment.date_last_updated,
    payment.date_approved,
    payment.date_created,
  ].filter((value) => Number.isFinite(Date.parse(value || '')));
  const providerEventCreated = eventDates.sort((left, right) => Date.parse(right) - Date.parse(left))[0];
  integrity(Number.isFinite(Date.parse(providerEventCreated || '')), 'invalid_payment_event_created');
  const revisionDigest = createHash('sha256')
    .update(`${refundState.digest}|${chargebackRevision}|${paymentStatus}|${refundedCents}`)
    .digest('hex').slice(0, 24);
  const canonicalEventId = `financial:${payment.id}:${revisionDigest}`;
  return {
    paymentStatus,
    providerEventType,
    // O pagamento/chargeback é estável entre revisões. O id canônico do
    // snapshot evita colisão quando o provider mantém o mesmo timestamp.
    providerEventId: canonicalEventId,
    providerEventCreated,
    canonicalEventId,
    label,
    refundedCents,
    pendingRefundCents: refundState.pendingCents,
    failedRefundCents: refundState.latestFailedCents,
    disputedCents,
    chargedBackCents,
    notificationAmountCents: paymentStatus === 'refund_pending'
      ? refundState.pendingCents
      : (paymentStatus === 'refund_failed'
        ? refundState.latestFailedCents
        : (refundedCents > 0 && ['partially_refunded', 'refunded'].includes(paymentStatus)
          ? refundedCents
          : (disputedCents || chargedBackCents || totalCents))),
    isInitialPayment: providerEventType === 'payment.approved',
    statusDetail: mercadoPagoFinancialDetail(refundState, detail),
  };
}

export async function isCurrentMercadoPagoRevision(requestId, snapshot, options = {}) {
  const current = await getReservation(requestId, options);
  if (!current || current.state !== 'paid') return false;
  return current.providerEventId === snapshot.providerEventId
    && current.providerEventType === snapshot.providerEventType
    && Date.parse(current.providerEventCreated || '') === Date.parse(snapshot.providerEventCreated)
    && current.paymentStatus === snapshot.paymentStatus
    && Number(current.refundedCents || 0) === snapshot.refundedCents
    && Number(current.disputedCents || 0) === snapshot.disputedCents
    && Number(current.chargedBackCents || 0) === snapshot.chargedBackCents;
}

function paymentContact(payment) {
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

function validateMercadoPagoPaymentIdentity(payment) {
  integrity(payment && /^\d{5,}$/.test(String(payment.id || '')), 'invalid_payment_object');
  integrity(payment.metadata?.source === SOURCE, 'invalid_product_source');
  integrity(payment.payment_method_id === 'pix' && payment.payment_type_id === 'bank_transfer',
    'invalid_payment_method');
  return reservationMetadata(payment.metadata);
}

function validateMercadoPagoPayment(payment, offer = currentOffer()) {
  const reservation = validateMercadoPagoPaymentIdentity(payment);
  integrity(payment.metadata?.sku === offer.sku, 'invalid_product_sku');
  integrity(!offer.contractVersion
    || payment.metadata?.contract_version === offer.contractVersion, 'invalid_contract_version');
  integrity(paymentAmountCents(payment) === offer.amountCents, 'invalid_payment_amount');
  integrity(String(payment.currency_id || '').toUpperCase() === offer.currency,
    'invalid_payment_currency');
  return reservation;
}

function orderRequestId(order) {
  const externalReference = scalar(order?.external_reference);
  const match = MP_ORDER_EXTERNAL_REFERENCE_PATTERN.exec(externalReference);
  integrity(Boolean(match), 'invalid_order_external_reference');
  const requestId = match[1].toLowerCase();
  integrity(externalReference.toLowerCase() === `${EXTERNAL_REFERENCE}-${requestId}`,
    'invalid_order_external_reference');
  return requestId;
}

function orderTransactions(order) {
  const payments = order?.transactions?.payments;
  if (payments === undefined || payments === null) return [];
  integrity(Array.isArray(payments), 'invalid_order_payments');
  return payments;
}

function orderFinancialEntries(order, field) {
  const entries = order?.transactions?.[field];
  if (entries === undefined || entries === null) return [];
  integrity(Array.isArray(entries), `invalid_order_${field}`);
  return entries;
}

function validateMercadoPagoOrderPayment(order, offer) {
  const payments = orderTransactions(order);
  integrity(payments.length === 1, 'invalid_order_payment_count');
  const payment = payments[0];
  integrity(MP_ORDER_PAYMENT_ID_PATTERN.test(String(payment?.id || '')), 'invalid_order_payment_id');
  integrity(payment?.payment_method?.id === 'pix'
    && payment?.payment_method?.type === 'bank_transfer', 'invalid_order_payment_method');
  integrity(moneyCents(payment.amount) === offer.amountCents, 'invalid_order_payment_amount');
  return payment;
}

/**
 * A Orders API não expõe um endpoint separado de listagem de refunds. A prova
 * financeira é, portanto, a própria Order canônica relida, cujo nó
 * transactions.refunds é devolvido pelo endpoint de refund e pelo GET da Order.
 */
export function normalizeMercadoPagoOrderRefundState(order, payment, offer) {
  const refunds = orderFinancialEntries(order, 'refunds');
  const seen = new Set();
  const normalized = refunds.map((refund) => {
    const id = String(refund?.id || '');
    const transactionId = String(refund?.transaction_id || '');
    const amountCents = moneyCents(refund?.amount);
    const status = String(refund?.status || '');
    integrity(ORDER_REFUND_ID.test(id) && !seen.has(id), 'invalid_order_refund_id');
    integrity(transactionId === String(payment.id), 'order_refund_payment_mismatch');
    // O contrato oficial atual documenta `processed` como confirmação do
    // refund. Qualquer estado intermediário/desconhecido permanece fail-closed.
    integrity(status === 'processed', 'invalid_order_refund_status');
    integrity(Number.isInteger(amountCents) && amountCents > 0
      && amountCents <= offer.amountCents, 'invalid_order_refund_amount');
    seen.add(id);
    return {
      id,
      transactionId,
      amountCents,
      status,
      referenceId: scalar(refund?.reference_id) || null,
      e2eId: scalar(refund?.e2e_id) || null,
    };
  }).sort((left, right) => left.id.localeCompare(right.id));
  const confirmedCents = normalized.reduce((sum, refund) => sum + refund.amountCents, 0);
  integrity(confirmedCents <= offer.amountCents, 'order_refund_total_exceeds_payment');
  const ids = normalized.map((refund) => refund.id);
  const digest = createHash('sha256').update(normalized.map((refund) => [
    refund.id,
    refund.transactionId,
    refund.amountCents,
    refund.status,
    refund.referenceId,
    refund.e2eId,
  ].join(':')).join('|')).digest('hex');
  return {
    refunds: normalized,
    confirmedCents,
    aggregateReference: aggregateRefundReference(ids),
    digest,
  };
}

function normalizeMercadoPagoOrderChargeback(order, payment) {
  const chargebacks = orderFinancialEntries(order, 'chargebacks');
  integrity(chargebacks.length <= 1, 'invalid_order_chargeback_count');
  if (!chargebacks.length) return null;
  const chargeback = chargebacks[0];
  const id = String(chargeback?.id || '');
  const transactionId = String(chargeback?.transaction_id || '');
  const status = String(chargeback?.status || '');
  integrity(ORDER_CHARGEBACK_ID.test(id), 'invalid_order_chargeback_id');
  integrity(transactionId === String(payment.id), 'order_chargeback_payment_mismatch');
  integrity(['in_process', 'settled', 'reimbursed'].includes(status),
    'invalid_order_chargeback_status');
  return { id, transactionId, status };
}

function validateMercadoPagoOrderEnvelope(order, offer) {
  integrity(order && MP_ORDER_ID_PATTERN.test(String(order.id || '')), 'invalid_order_object');
  integrity(order.type === 'online', 'invalid_order_type');
  integrity(order.processing_mode === 'automatic', 'invalid_order_processing_mode');
  if (order.capture_mode !== undefined && order.capture_mode !== null) {
    integrity(order.capture_mode === 'automatic', 'invalid_order_capture_mode');
  }
  const requestId = orderRequestId(order);
  integrity(moneyCents(order.total_amount) === offer.amountCents, 'invalid_order_amount');
  const countryCode = String(order.country_code || '').toUpperCase();
  if (countryCode) integrity(['BR', 'BRA'].includes(countryCode), 'invalid_order_country');
  return requestId;
}

function validateMercadoPagoOrderReservation(order, current) {
  const requestId = orderRequestId(order);
  integrity(current?.reservationId === requestId
    && current?.requestId === requestId
    && SLOT.test(String(current?.slot || ''))
    && current?.provider === 'mercadopago'
    && current?.providerProtocol === 'mp_orders_v1'
    && current?.providerRef === String(order.id || '')
    && /^BUYER#[a-f0-9]{64}$/.test(String(current?.buyerPk || '')),
  'order_inventory_binding_mismatch');
  return {
    requestId,
    slot: current.slot,
    buyerHash: current.buyerPk.slice('BUYER#'.length),
  };
}

/** Prova Order -> external_reference UUID -> reserva ORD anexada e versionada. */
export async function verifyMercadoPagoOrderBinding(order, {
  getReservationImpl = getReservation,
} = {}) {
  const requestId = orderRequestId(order);
  const current = await getReservationImpl(requestId);
  normalizeMercadoPagoOrderCanonical(order, current);
  return current;
}

/** Deriva a revisão financeira exclusivamente da Order canônica relida. */
export function deriveMercadoPagoOrderFinancialSnapshot(order, offer) {
  validateMercadoPagoOrderEnvelope(order, offer);
  const status = String(order.status || '');
  const detail = String(order.status_detail || '');
  const pending = new Set([
    'created:created',
    'processing:in_process',
    'action_required:waiting_payment',
    'action_required:waiting_capture',
    'action_required:waiting_transfer',
    'canceled:canceled',
    'expired:expired',
    'failed:failed',
  ]);
  if (pending.has(`${status}:${detail}`)) {
    integrity(orderFinancialEntries(order, 'refunds').length === 0
      && orderFinancialEntries(order, 'chargebacks').length === 0,
    'order_pending_with_financial_reversal');
    return null;
  }
  const payment = validateMercadoPagoOrderPayment(order, offer);
  const refundState = normalizeMercadoPagoOrderRefundState(order, payment, offer);
  const chargeback = normalizeMercadoPagoOrderChargeback(order, payment);

  integrity(moneyCents(order.total_paid_amount) === offer.amountCents,
    'invalid_order_total_paid_amount');
  integrity(moneyCents(payment.paid_amount) === offer.amountCents,
    'invalid_order_payment_paid_amount');

  let paymentStatus;
  let providerEventType;
  let label;
  let disputedCents = 0;
  let chargedBackCents = 0;
  let isInitialPayment = false;
  if (status === 'processed' && detail === 'accredited') {
    integrity(refundState.confirmedCents === 0 && !chargeback,
      'order_accredited_with_financial_reversal');
    integrity(payment.status === 'processed' && payment.status_detail === 'accredited',
      'invalid_order_payment_status');
    paymentStatus = 'approved';
    providerEventType = 'order.processed';
    label = FINANCIAL_STATUS.approved;
    isInitialPayment = true;
  } else if (status === 'processed' && detail === 'partially_refunded') {
    integrity(!chargeback && refundState.confirmedCents > 0
      && refundState.confirmedCents < offer.amountCents, 'invalid_order_partial_refund_total');
    integrity(payment.status === 'processed'
      && ['accredited', 'partially_refunded'].includes(payment.status_detail),
    'invalid_order_payment_status');
    paymentStatus = 'partially_refunded';
    providerEventType = 'payment.partially_refunded';
    label = FINANCIAL_STATUS.partially_refunded;
  } else if (status === 'refunded' && detail === 'refunded') {
    integrity(!chargeback && refundState.confirmedCents === offer.amountCents,
      'invalid_order_full_refund_total');
    integrity((payment.status === 'refunded' && payment.status_detail === 'refunded')
      || (payment.status === 'processed'
        && ['accredited', 'partially_refunded', 'refunded'].includes(payment.status_detail)),
    'invalid_order_payment_status');
    paymentStatus = 'refunded';
    providerEventType = 'payment.refunded';
    label = FINANCIAL_STATUS.refunded;
  } else if (status === 'charged_back'
      && ['in_process', 'settled', 'reimbursed'].includes(detail)) {
    // O contrato de Orders não publica valor no nó chargebacks. Misturar um
    // refund prévio exigiria adivinhar a base disputada; por isso é rejeitado.
    integrity(refundState.confirmedCents === 0 && chargeback?.status === detail,
      'invalid_order_chargeback_state');
    integrity(payment.status === 'charged_back' && payment.status_detail === detail,
      'invalid_order_payment_status');
    if (detail === 'in_process') {
      paymentStatus = 'disputed';
      providerEventType = 'chargeback.opened';
      label = 'CONTESTAÇÃO EM ANÁLISE';
      disputedCents = offer.amountCents;
    } else if (detail === 'settled') {
      paymentStatus = 'charged_back';
      providerEventType = 'chargeback.settled';
      label = 'CONTESTAÇÃO PERDIDA';
      chargedBackCents = offer.amountCents;
    } else {
      paymentStatus = 'approved';
      providerEventType = 'chargeback.reimbursed';
      label = 'CONTESTAÇÃO VENCIDA — VALOR RECOMPOSTO';
    }
  } else {
    throw new MercadoPagoWebhookIntegrityError('invalid_order_financial_status');
  }

  const providerEventCreated = order.last_updated_date || order.created_date || null;
  integrity(Number.isFinite(Date.parse(providerEventCreated || '')), 'invalid_order_event_created');
  const revisionDigest = createHash('sha256').update([
    order.id,
    status,
    detail,
    order.total_amount,
    order.total_paid_amount,
    payment.id,
    payment.status,
    payment.status_detail,
    payment.amount,
    payment.paid_amount,
    refundState.digest,
    chargeback ? `${chargeback.id}:${chargeback.transactionId}:${chargeback.status}` : 'none',
    providerEventCreated,
  ].join('|')).digest('hex').slice(0, 24);
  const canonicalEventId = `financial:${order.id}:${revisionDigest}`;
  return {
    paymentStatus,
    providerEventType,
    providerEventId: canonicalEventId,
    providerEventCreated,
    canonicalEventId,
    label,
    refundedCents: refundState.confirmedCents,
    pendingRefundCents: 0,
    failedRefundCents: 0,
    disputedCents,
    chargedBackCents,
    notificationAmountCents: refundState.confirmedCents || disputedCents
      || chargedBackCents || offer.amountCents,
    isInitialPayment,
    refundReference: refundState.aggregateReference,
    statusDetail: detail,
  };
}

/** Shape reutilizável por webhook, cron financeiro, lote e área do cliente. */
export function normalizeMercadoPagoOrderCanonical(order, boundReservation) {
  const reservation = validateMercadoPagoOrderReservation(order, boundReservation);
  const offer = inventoryOffer(boundReservation);
  const snapshot = deriveMercadoPagoOrderFinancialSnapshot(order, offer);
  const payments = orderTransactions(order);
  return {
    orderId: String(order.id),
    paymentId: payments.length === 1 && MP_ORDER_PAYMENT_ID_PATTERN.test(String(payments[0]?.id || ''))
      ? String(payments[0].id)
      : null,
    reservation,
    offer,
    snapshot,
    status: String(order.status || ''),
    statusDetail: String(order.status_detail || ''),
  };
}

const DEFAULT_DEPS = {
  runEffect: runWebhookEffect,
  markPaid: markReservationPaid,
  sendBuyer: sendBuyerConfirmationEmail,
  sendFinancialBuyer: sendBuyerFinancialUpdateEmail,
  sendInternal: sendInternalSaleEmail,
  sendSlack: sendSlackSaleNotification,
  sendLateRefundBuyer: sendBuyerLateRefundEmail,
  refundPayment: (paymentId, options) => refundMercadoPagoPayment(
    process.env.MP_ACCESS_TOKEN,
    paymentId,
    options,
  ),
  getRefundState: (paymentId, options) => fetchMercadoPagoRefundState(
    process.env.MP_ACCESS_TOKEN,
    paymentId,
    options,
  ),
  getOrder: (orderId, options) => fetchMercadoPagoOrder(
    process.env.MP_ACCESS_TOKEN,
    orderId,
    options,
  ),
  refundOrder: (orderId, options) => refundMercadoPagoOrder(
    process.env.MP_ACCESS_TOKEN,
    orderId,
    options,
  ),
  verifyPaymentBinding: async () => true,
  isCurrentRevision: async () => true,
  withReservationLock: ({ execute }) => execute(),
};

async function completeChannels(promises) {
  const results = await Promise.allSettled(promises);
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
}

function causedByLateReassignment(error) {
  let current = error;
  const seen = new Set();
  while (current && !seen.has(current)) {
    if (current instanceof InventoryLatePaymentReassignedError
        || current?.message === 'late_payment_slot_reassigned') return true;
    seen.add(current);
    current = current.cause;
  }
  return false;
}

function lateRefundRevision(refundState, totalCents = OFERTA.pixCentavos) {
  const digest = String(refundState?.digest || '');
  const failedCount = Number(refundState?.failedCount || 0);
  integrity(/^[a-f0-9]{64}$/.test(digest), 'invalid_late_refund_revision');
  integrity(Number.isInteger(failedCount) && failedCount >= 0, 'invalid_late_refund_attempts');
  integrity(Number.isInteger(refundState?.confirmedCents)
    && refundState.confirmedCents >= 0
    && refundState.confirmedCents <= totalCents, 'invalid_late_refund_confirmed');
  integrity(Number.isInteger(refundState?.pendingCents)
    && refundState.pendingCents >= 0, 'invalid_late_refund_pending');
  return { digest, failedCount, attemptNumber: failedCount + 1 };
}

async function notifyLateRefundFailure({
  payment, snapshot, compensationEventId, compensationPayload, contact, refundState, offer, deps,
}) {
  const revision = lateRefundRevision(refundState, offer.amountCents);
  if (revision.failedCount === 0 || refundState.confirmedCents === offer.amountCents) return false;
  const capped = revision.failedCount >= MAX_LATE_REFUND_ATTEMPTS;
  const failureEventId = `${compensationEventId}:failed:${revision.digest.slice(0, 24)}`;
  const failurePayload = {
    ...compensationPayload,
    compensation: capped ? 'refund_escalated' : 'refund_retry',
    failedAttempts: revision.failedCount,
    refundRevision: revision.digest,
  };
  const notification = {
    provider: 'mercadopago',
    method: 'Pix',
    amountCents: Number(refundState.latestFailedCents || 0) || offer.amountCents,
    currency: offer.currency,
    sku: offer.sku,
    contractVersion: offer.contractVersion,
    ...contact,
    reference: `mp_${payment.id}`,
    status: capped
      ? 'PAGAMENTO TARDIO — REEMBOLSO NÃO CONCLUÍDO; INTERVENÇÃO OBRIGATÓRIA'
      : `PAGAMENTO TARDIO — REEMBOLSO NÃO CONCLUÍDO; NOVA TENTATIVA ${revision.attemptNumber}/${MAX_LATE_REFUND_ATTEMPTS}`,
    statusDetail: `Mercado Pago registrou ${revision.failedCount} tentativa(s) não concluída(s).`,
    eventId: failureEventId,
    eventCreatedAt: refundState.latestUpdatedAt || snapshot.providerEventCreated,
  };
  // O próximo POST só acontece depois que os dois caminhos operacionais foram
  // aceitos pelo outbox. Se um canal falhar, o webhook retorna 5xx e não avança
  // silenciosamente para outra tentativa financeira.
  await completeChannels([
    deps.runEffect({
      provider: 'mercadopago',
      eventId: failureEventId,
      channel: 'late_refund_failure_internal',
      recordType: 'LATE_REFUND',
      providerReference: String(payment.id),
      payload: { ...failurePayload, channel: 'internal_email' },
      execute: ({ idempotencyKey }) => deps.sendInternal(notification, { idempotencyKey }),
    }),
    deps.runEffect({
      provider: 'mercadopago',
      eventId: failureEventId,
      channel: 'late_refund_failure_slack',
      recordType: 'LATE_REFUND',
      providerReference: String(payment.id),
      payload: { ...failurePayload, channel: 'slack' },
      execute: () => deps.sendSlack(notification),
    }),
  ]);
  return capped;
}

async function compensateLatePayment({
  payment, snapshot, basePayload, contact, refundState, offer, deps,
}) {
  // A compensação precisa sobreviver à mudança approved -> refunded. Se a
  // função cair depois do MP aceitar o POST e antes do outbox marcar `done`, o
  // redelivery usa esta mesma chave, reconcilia o refund e conclui os canais.
  const compensationEventId = `late-payment:${payment.id}`;
  const compensationPayload = {
    providerProtocol: 'mp_checkout_pro_v1',
    paymentId: String(payment.id),
    requestId: basePayload.requestId,
    slot: basePayload.slot,
    amountCents: basePayload.amountCents,
    currency: basePayload.currency,
    compensation: 'full_refund',
  };
  const reference = `mp_${payment.id}`;
  if (snapshot.paymentStatus === 'disputed' || snapshot.paymentStatus === 'charged_back') {
    const resolution = snapshot.paymentStatus === 'disputed' ? 'pending' : 'settled';
    const observationEventId = `${compensationEventId}:${resolution}`;
    await deps.runEffect({
      provider: 'mercadopago',
      eventId: observationEventId,
      channel: 'late_reversal_observed',
      recordType: 'LATE_REFUND',
      providerReference: String(payment.id),
      payload: { ...compensationPayload, compensation: `chargeback_${resolution}` },
      execute: () => ({ ok: true, id: String(payment.id) }),
    });
    const observation = {
      provider: 'mercadopago',
      method: 'Pix',
      amountCents: offer.amountCents,
      currency: offer.currency,
      sku: offer.sku,
      contractVersion: offer.contractVersion,
      ...contact,
      reference,
      status: snapshot.paymentStatus === 'disputed'
        ? 'PAGAMENTO TARDIO — CONTESTAÇÃO EM ANÁLISE'
        : 'PAGAMENTO TARDIO — CHARGEBACK LIQUIDADO',
      eventId: observationEventId,
      eventCreatedAt: snapshot.providerEventCreated,
    };
    await completeChannels([
      deps.runEffect({
        provider: 'mercadopago',
        eventId: observationEventId,
        channel: 'late_reversal_internal',
        payload: { ...compensationPayload, resolution, channel: 'internal_email' },
        execute: ({ idempotencyKey }) => deps.sendInternal(observation, { idempotencyKey }),
      }),
      deps.runEffect({
        provider: 'mercadopago',
        eventId: observationEventId,
        channel: 'late_reversal_slack',
        payload: { ...compensationPayload, resolution, channel: 'slack' },
        execute: () => deps.sendSlack(observation),
      }),
    ]);
    return snapshot.paymentStatus === 'disputed'
      ? { ok: true, latePaymentDisputed: true }
      : { ok: true, latePaymentReversed: true };
  }

  const observed = lateRefundRevision(refundState, offer.amountCents);
  if (refundState.pendingCents > 0) {
    throw new MercadoPagoProviderError('mp_late_refund_pending');
  }
  const capped = await notifyLateRefundFailure({
    payment,
    snapshot,
    compensationEventId,
    compensationPayload,
    contact,
    refundState,
    offer,
    deps,
  });
  if (capped) {
    return {
      ok: true,
      latePaymentRefundEscalated: true,
      failedAttempts: observed.failedCount,
    };
  }

  // A revisão canônica do provider faz parte da chave. Falha registrada gera
  // uma nova tentativa determinística; falha ambígua sem nova revisão conserva
  // a chave anterior e não arrisca um refund duplicado.
  const refundAttemptEventId = `${compensationEventId}:refund-attempt:${observed.attemptNumber}:${observed.digest.slice(0, 24)}`;
  const refundAttemptPayload = {
    ...compensationPayload,
    attemptNumber: observed.attemptNumber,
    refundRevision: observed.digest,
  };
  const refund = await deps.runEffect({
    provider: 'mercadopago',
    eventId: refundAttemptEventId,
    channel: 'late_refund',
    recordType: 'LATE_REFUND',
    providerReference: String(payment.id),
    payload: refundAttemptPayload,
    execute: async ({ idempotencyKey }) => {
      const existing = await deps.getRefundState(String(payment.id), {
        expectedTotalCents: offer.amountCents,
      });
      const current = lateRefundRevision(existing, offer.amountCents);
      if (current.digest !== observed.digest) {
        throw new MercadoPagoProviderError('mp_late_refund_state_changed');
      }
      if (existing.pendingCents > 0) throw new MercadoPagoProviderError('mp_late_refund_pending');
      if (existing.confirmedCents === offer.amountCents) {
        integrity(Boolean(existing.aggregateReference), 'late_refund_confirmation_missing');
        return { ok: true, id: existing.aggregateReference };
      }
      const remainingCents = offer.amountCents - existing.confirmedCents;
      integrity(remainingCents > 0, 'invalid_late_refund_remainder');
      const created = await deps.refundPayment(String(payment.id), {
        idempotencyKey,
        amountCents: remainingCents,
        expectedTotalCents: offer.amountCents,
      });
      integrity(/^\d+$/.test(String(created?.id || '')), 'late_refund_confirmation_missing');
      const finalCents = existing.confirmedCents + Number(created?.amountCents || 0);
      integrity(finalCents === offer.amountCents, 'late_refund_total_mismatch');
      const aggregateReference = aggregateRefundReference([
        ...existing.approvedIds,
        String(created.id),
      ]);
      integrity(Boolean(aggregateReference), 'late_refund_confirmation_missing');
      return { ok: true, id: aggregateReference };
    },
  });
  integrity(Boolean(refund.externalRef), 'late_refund_confirmation_missing');

  const notification = {
    provider: 'mercadopago',
    method: 'Pix',
    amountCents: offer.amountCents,
    currency: offer.currency,
    sku: offer.sku,
    contractVersion: offer.contractVersion,
    ...contact,
    reference,
    refundReference: refund.externalRef,
    status: 'REEMBOLSO AUTOMÁTICO — PAGAMENTO TARDIO',
    eventId: compensationEventId,
    // date_created não muda entre os estados do mesmo pagamento; isso mantém o
    // payload do Resend compatível com sua Idempotency-Key em reconciliações.
    eventCreatedAt: payment.date_created || null,
  };
  const refundPayload = {
    ...compensationPayload,
    refundReference: refund.externalRef,
  };
  const channels = [
    deps.runEffect({
      provider: 'mercadopago',
      eventId: compensationEventId,
      channel: 'late_refund_internal',
      payload: { ...refundPayload, channel: 'internal_email' },
      execute: ({ idempotencyKey }) => deps.sendInternal(notification, { idempotencyKey }),
    }),
    deps.runEffect({
      provider: 'mercadopago',
      eventId: compensationEventId,
      channel: 'late_refund_slack',
      payload: { ...refundPayload, channel: 'slack' },
      execute: () => deps.sendSlack(notification),
    }),
    deps.runEffect({
      provider: 'mercadopago',
      eventId: compensationEventId,
      channel: 'late_refund_buyer',
      payload: { ...refundPayload, channel: 'buyer_email' },
      execute: ({ idempotencyKey }) => deps.sendLateRefundBuyer({
        ...contact,
        reference,
        refundReference: refund.externalRef,
        amountCents: offer.amountCents,
        sku: offer.sku,
        contractVersion: offer.contractVersion,
      }, { idempotencyKey }),
    }),
  ];
  await completeChannels(channels);
  return { ok: true, latePaymentRefunded: true, refundReference: refund.externalRef };
}

/** Processa somente um pagamento já relido da API autenticada do MP. */
export async function processMercadoPagoPayment(payment, dependencies = {}) {
  const deps = { ...DEFAULT_DEPS, ...dependencies };
  integrity(payment && /^\d{5,}$/.test(String(payment.id || '')), 'invalid_payment_object');
  if (payment.external_reference !== EXTERNAL_REFERENCE) return ignored('outro_produto');
  const reservation = validateMercadoPagoPaymentIdentity(payment);
  const binding = dependencies.boundReservation
    || await deps.verifyPaymentBinding(payment, reservation);
  const offer = binding && typeof binding === 'object' ? inventoryOffer(binding) : currentOffer();
  validateMercadoPagoPayment(payment, offer);
  const amountCents = paymentAmountCents(payment);
  const refundState = dependencies.refundState
    || normalizeMercadoPagoRefundState(payment.id, [], offer.amountCents);
  const chargeback = dependencies.chargeback || null;
  const snapshot = deriveMercadoPagoFinancialSnapshot(payment, refundState, chargeback, offer);
  if (!snapshot) return ignored(payment.status || 'sem_status');
  const contact = paymentContact(payment);
  const basePayload = {
    providerProtocol: 'mp_checkout_pro_v1',
    paymentId: String(payment.id),
    requestId: reservation.requestId,
    slot: reservation.slot,
    paymentStatus: snapshot.paymentStatus,
    amountCents,
    refundedCents: snapshot.refundedCents,
    pendingRefundCents: snapshot.pendingRefundCents,
    failedRefundCents: snapshot.failedRefundCents,
    disputedCents: snapshot.disputedCents,
    chargedBackCents: snapshot.chargedBackCents,
    revision: snapshot.canonicalEventId,
    currency: offer.currency,
    offerSku: offer.sku,
    contractVersion: offer.contractVersion,
  };

  return deps.withReservationLock({
    provider: 'mercadopago',
    reservationKey: reservation.requestId,
    execute: async () => {
      let inventory;
      try {
        inventory = await deps.runEffect({
          provider: 'mercadopago',
          eventId: snapshot.canonicalEventId,
          channel: 'inventory',
          payload: basePayload,
          execute: async () => {
            const result = await deps.markPaid({
              ...reservation,
              provider: 'mercadopago',
              providerRef: String(payment.id),
              paymentStatus: snapshot.paymentStatus,
              providerEventId: snapshot.providerEventId,
              providerEventCreated: snapshot.providerEventCreated,
              providerEventType: snapshot.providerEventType,
              refundedCents: snapshot.refundedCents,
              disputedCents: snapshot.disputedCents,
              chargedBackCents: snapshot.chargedBackCents,
            });
            return { ok: true, id: transitionOutcome(result) };
          },
        });
      } catch (error) {
        if (!causedByLateReassignment(error)) throw error;
        return compensateLatePayment({
          payment, snapshot, basePayload, contact, refundState, offer, deps,
        });
      }
      if (inventory.externalRef === 'stale') return ignored('stale_financial_event');
      if (!await deps.isCurrentRevision(reservation.requestId, snapshot)) {
        return ignored('superseded_financial_event');
      }

      const notification = {
        provider: 'mercadopago',
        method: 'Pix',
        amountCents: snapshot.notificationAmountCents,
        currency: payment.currency_id,
        ...contact,
        reference: `mp_${payment.id}`,
        refundReference: refundState.aggregateReference,
        status: snapshot.label,
        statusCode: snapshot.paymentStatus,
        statusDetail: snapshot.statusDetail,
        sku: offer.sku,
        contractVersion: offer.contractVersion,
        // Precisa permanecer igual em redeliveries com x-request-id diferente:
        // a Idempotency-Key do Resend só aceita exatamente o mesmo payload.
        eventId: snapshot.canonicalEventId,
        eventCreatedAt: snapshot.providerEventCreated,
      };

      const channels = [
        deps.runEffect({
          provider: 'mercadopago',
          eventId: snapshot.canonicalEventId,
          channel: 'internal_email',
          payload: { ...basePayload, channel: 'internal_email' },
          execute: ({ idempotencyKey }) => deps.sendInternal(notification, { idempotencyKey }),
        }),
        deps.runEffect({
          provider: 'mercadopago',
          eventId: snapshot.canonicalEventId,
          channel: 'slack',
          payload: { ...basePayload, channel: 'slack' },
          execute: () => deps.sendSlack(notification),
        }),
      ];

      if (snapshot.isInitialPayment && contact.email) {
        channels.push(deps.runEffect({
          provider: 'mercadopago',
          eventId: snapshot.canonicalEventId,
          channel: 'buyer_email',
          payload: { ...basePayload, channel: 'buyer_email' },
          execute: ({ idempotencyKey }) => deps.sendBuyer({
            ...contact,
            reference: `mp_${payment.id}`,
            amountCents,
            method: 'Pix',
            sku: offer.sku,
            contractVersion: offer.contractVersion,
          }, { idempotencyKey }),
        }));
      } else if (contact.email
          && ['refund_pending', 'refund_failed', 'partially_refunded', 'refunded', 'disputed', 'charged_back']
            .includes(snapshot.paymentStatus)
          && typeof deps.sendFinancialBuyer === 'function') {
        channels.push(deps.runEffect({
          provider: 'mercadopago',
          eventId: snapshot.canonicalEventId,
          channel: 'buyer_financial_email',
          payload: { ...basePayload, channel: 'buyer_financial_email' },
          execute: ({ idempotencyKey }) => deps.sendFinancialBuyer(notification, { idempotencyKey }),
        }));
      }

      await completeChannels(channels);
      return { ok: true };
    },
  });
}

async function compensateLateMercadoPagoOrder({
  order, canonical, contact, binding, deps,
}) {
  const { reservation, offer, snapshot } = canonical;
  const compensationEventId = `late-order:${canonical.orderId}`;
  const compensationPayload = {
    kind: 'mercadopago_order_late_refund_v1',
    providerProtocol: 'mp_orders_v1',
    orderId: canonical.orderId,
    paymentId: canonical.paymentId,
    requestId: reservation.requestId,
    slot: reservation.slot,
    amountCents: offer.amountCents,
    currency: offer.currency,
    compensation: 'full_refund',
  };
  const reference = `mp_${canonical.orderId}`;

  if (snapshot.paymentStatus === 'disputed' || snapshot.paymentStatus === 'charged_back') {
    const resolution = snapshot.paymentStatus === 'disputed' ? 'pending' : 'settled';
    const observationEventId = `${compensationEventId}:chargeback:${resolution}`;
    await deps.runEffect({
      provider: 'mercadopago',
      eventId: observationEventId,
      channel: 'late_reversal_observed',
      recordType: 'LATE_REFUND',
      providerReference: canonical.orderId,
      payload: { ...compensationPayload, compensation: `chargeback_${resolution}` },
      execute: () => ({ ok: true, id: canonical.orderId }),
    });
    const notification = {
      provider: 'mercadopago',
      method: 'Pix',
      amountCents: offer.amountCents,
      currency: offer.currency,
      sku: offer.sku,
      contractVersion: offer.contractVersion,
      ...contact,
      reference,
      status: snapshot.paymentStatus === 'disputed'
        ? 'PAGAMENTO TARDIO — CONTESTAÇÃO EM ANÁLISE'
        : 'PAGAMENTO TARDIO — CHARGEBACK LIQUIDADO',
      eventId: observationEventId,
      eventCreatedAt: snapshot.providerEventCreated,
    };
    await completeChannels([
      deps.runEffect({
        provider: 'mercadopago',
        eventId: observationEventId,
        channel: 'late_reversal_internal',
        recordType: 'LATE_REFUND',
        providerReference: canonical.orderId,
        payload: { ...compensationPayload, resolution, channel: 'internal_email' },
        execute: ({ idempotencyKey }) => deps.sendInternal(notification, { idempotencyKey }),
      }),
      deps.runEffect({
        provider: 'mercadopago',
        eventId: observationEventId,
        channel: 'late_reversal_slack',
        recordType: 'LATE_REFUND',
        providerReference: canonical.orderId,
        payload: { ...compensationPayload, resolution, channel: 'slack' },
        execute: () => deps.sendSlack(notification),
      }),
    ]);
    return snapshot.paymentStatus === 'disputed'
      ? { ok: true, latePaymentDisputed: true }
      : { ok: true, latePaymentReversed: true };
  }

  const refund = await deps.runEffect({
    provider: 'mercadopago',
    eventId: compensationEventId,
    channel: 'late_refund',
    recordType: 'LATE_REFUND',
    providerReference: canonical.orderId,
    payload: compensationPayload,
    execute: async ({ idempotencyKey }) => {
      // Releitura imediatamente anterior ao POST fecha a corrida com refund ou
      // chargeback recebido depois do webhook que detectou o pagamento tardio.
      const currentOrder = await deps.getOrder(canonical.orderId);
      const current = normalizeMercadoPagoOrderCanonical(currentOrder, binding);
      if (current.snapshot?.paymentStatus === 'refunded') {
        integrity(Boolean(current.snapshot.refundReference), 'late_order_refund_confirmation_missing');
        return { ok: true, id: current.snapshot.refundReference };
      }
      integrity(current.snapshot
        && ['approved', 'partially_refunded'].includes(current.snapshot.paymentStatus),
      'late_order_not_refundable');
      integrity(current.status === 'processed'
        && ['accredited', 'partially_refunded'].includes(current.statusDetail),
      'late_order_not_refundable');
      const remainingCents = offer.amountCents - current.snapshot.refundedCents;
      integrity(Number.isInteger(remainingCents) && remainingCents > 0,
        'invalid_late_order_refund_remainder');
      const result = await deps.refundOrder(canonical.orderId, {
        idempotencyKey,
        amountCents: remainingCents,
        expectedTotalCents: offer.amountCents,
        paymentId: canonical.paymentId,
        requestId: reservation.requestId,
        offer,
      });
      const confirmedOrder = result?.order || result;
      const confirmed = normalizeMercadoPagoOrderCanonical(confirmedOrder, binding);
      integrity(confirmed.snapshot?.paymentStatus === 'refunded'
        && confirmed.snapshot.refundedCents === offer.amountCents
        && Boolean(confirmed.snapshot.refundReference),
      'late_order_refund_confirmation_missing');
      return { ok: true, id: confirmed.snapshot.refundReference };
    },
  });
  integrity(Boolean(refund.externalRef), 'late_order_refund_confirmation_missing');

  const notification = {
    provider: 'mercadopago',
    method: 'Pix',
    amountCents: offer.amountCents,
    currency: offer.currency,
    sku: offer.sku,
    contractVersion: offer.contractVersion,
    ...contact,
    reference,
    refundReference: refund.externalRef,
    status: 'REEMBOLSO AUTOMÁTICO — PAGAMENTO TARDIO',
    eventId: compensationEventId,
    eventCreatedAt: order.created_date || null,
  };
  const refundPayload = { ...compensationPayload, refundReference: refund.externalRef };
  const channels = [
    deps.runEffect({
      provider: 'mercadopago',
      eventId: compensationEventId,
      channel: 'late_refund_internal',
      recordType: 'LATE_REFUND',
      providerReference: canonical.orderId,
      payload: { ...refundPayload, channel: 'internal_email' },
      execute: ({ idempotencyKey }) => deps.sendInternal(notification, { idempotencyKey }),
    }),
    deps.runEffect({
      provider: 'mercadopago',
      eventId: compensationEventId,
      channel: 'late_refund_slack',
      recordType: 'LATE_REFUND',
      providerReference: canonical.orderId,
      payload: { ...refundPayload, channel: 'slack' },
      execute: () => deps.sendSlack(notification),
    }),
  ];
  if (contact.email) {
    channels.push(deps.runEffect({
      provider: 'mercadopago',
      eventId: compensationEventId,
      channel: 'late_refund_buyer',
      recordType: 'LATE_REFUND',
      providerReference: canonical.orderId,
      payload: { ...refundPayload, channel: 'buyer_email' },
      execute: ({ idempotencyKey }) => deps.sendLateRefundBuyer({
        ...contact,
        reference,
        refundReference: refund.externalRef,
        amountCents: offer.amountCents,
        sku: offer.sku,
        contractVersion: offer.contractVersion,
      }, { idempotencyKey }),
    }));
  }
  await completeChannels(channels);
  return { ok: true, latePaymentRefunded: true, refundReference: refund.externalRef };
}

/** Processa somente uma Order canônica já relida e diretamente vinculada. */
export async function processMercadoPagoOrder(order, dependencies = {}) {
  const deps = { ...DEFAULT_DEPS, ...dependencies };
  integrity(order && MP_ORDER_ID_PATTERN.test(String(order.id || '')), 'invalid_order_object');
  const binding = dependencies.boundReservation
    || await verifyMercadoPagoOrderBinding(order, {
      getReservationImpl: dependencies.getReservationImpl || getReservation,
    });
  const canonical = normalizeMercadoPagoOrderCanonical(order, binding);
  const { reservation, offer, snapshot } = canonical;
  if (!snapshot) return ignored(`order.${canonical.status}.${canonical.statusDetail}`);

  const payment = orderTransactions(order)[0];
  const payer = order.payer || payment?.payer || {};
  const contact = {
    email: typeof payer.email === 'string' ? payer.email : null,
    name: [payer.first_name, payer.last_name].filter(Boolean).join(' ') || null,
    phone: payer.phone?.number || null,
    document: payer.identification?.number || null,
    address: null,
  };
  const basePayload = {
    kind: 'mercadopago_order_financial_v1',
    providerProtocol: 'mp_orders_v1',
    objectId: canonical.orderId,
    requestId: reservation.requestId,
    slot: reservation.slot,
    paymentStatus: snapshot.paymentStatus,
    amountCents: offer.amountCents,
    refundedCents: snapshot.refundedCents,
    pendingRefundCents: 0,
    failedRefundCents: 0,
    disputedCents: snapshot.disputedCents,
    chargedBackCents: snapshot.chargedBackCents,
    revision: snapshot.canonicalEventId,
    currency: offer.currency,
    offerSku: offer.sku,
    contractVersion: offer.contractVersion,
  };

  return deps.withReservationLock({
    provider: 'mercadopago',
    reservationKey: reservation.requestId,
    execute: async () => {
      let inventory;
      try {
        inventory = await deps.runEffect({
          provider: 'mercadopago',
          eventId: snapshot.canonicalEventId,
          channel: 'inventory',
          providerReference: canonical.orderId,
          payload: basePayload,
          execute: async () => {
            const result = await deps.markPaid({
              ...reservation,
              provider: 'mercadopago',
              providerRef: canonical.orderId,
              paymentStatus: snapshot.paymentStatus,
              providerEventId: snapshot.providerEventId,
              providerEventCreated: snapshot.providerEventCreated,
              providerEventType: snapshot.providerEventType,
              refundedCents: snapshot.refundedCents,
              disputedCents: snapshot.disputedCents,
              chargedBackCents: snapshot.chargedBackCents,
            });
            return { ok: true, id: transitionOutcome(result) };
          },
        });
      } catch (error) {
        if (!causedByLateReassignment(error)) throw error;
        return compensateLateMercadoPagoOrder({
          order, canonical, contact, binding, deps,
        });
      }
      if (inventory.externalRef === 'stale') return ignored('stale_financial_event');
      if (!await deps.isCurrentRevision(reservation.requestId, snapshot)) {
        return ignored('superseded_financial_event');
      }

      const reference = `mp_${canonical.orderId}`;
      const notification = {
        provider: 'mercadopago',
        method: 'Pix',
        amountCents: snapshot.notificationAmountCents,
        currency: offer.currency,
        ...contact,
        reference,
        refundReference: snapshot.refundReference,
        status: snapshot.label,
        statusCode: snapshot.paymentStatus,
        statusDetail: snapshot.statusDetail,
        sku: offer.sku,
        contractVersion: offer.contractVersion,
        eventId: snapshot.canonicalEventId,
        eventCreatedAt: snapshot.providerEventCreated,
      };
      const channels = [
        deps.runEffect({
          provider: 'mercadopago',
          eventId: snapshot.canonicalEventId,
          channel: 'internal_email',
          providerReference: canonical.orderId,
          payload: { ...basePayload, channel: 'internal_email' },
          execute: ({ idempotencyKey }) => deps.sendInternal(notification, { idempotencyKey }),
        }),
        deps.runEffect({
          provider: 'mercadopago',
          eventId: snapshot.canonicalEventId,
          channel: 'slack',
          providerReference: canonical.orderId,
          payload: { ...basePayload, channel: 'slack' },
          execute: () => deps.sendSlack(notification),
        }),
      ];
      if (snapshot.isInitialPayment && contact.email) {
        channels.push(deps.runEffect({
          provider: 'mercadopago',
          eventId: snapshot.canonicalEventId,
          channel: 'buyer_email',
          providerReference: canonical.orderId,
          payload: { ...basePayload, channel: 'buyer_email' },
          execute: ({ idempotencyKey }) => deps.sendBuyer({
            ...contact,
            reference,
            reservationCode: reservationCode(reservation.requestId),
            amountCents: offer.amountCents,
            method: 'Pix',
            sku: offer.sku,
            contractVersion: offer.contractVersion,
          }, { idempotencyKey }),
        }));
      } else if (contact.email
          && ['partially_refunded', 'refunded', 'disputed', 'charged_back']
            .includes(snapshot.paymentStatus)
          && typeof deps.sendFinancialBuyer === 'function') {
        channels.push(deps.runEffect({
          provider: 'mercadopago',
          eventId: snapshot.canonicalEventId,
          channel: 'buyer_financial_email',
          providerReference: canonical.orderId,
          payload: { ...basePayload, channel: 'buyer_financial_email' },
          execute: ({ idempotencyKey }) => deps.sendFinancialBuyer(notification, { idempotencyKey }),
        }));
      }
      await completeChannels(channels);
      return { ok: true };
    },
  });
}

async function fetchPayment(token, paymentId, options = {}) {
  return withProviderBudget(options, 'mp_fetch_failed', async ({ signal, fetchImpl }) => {
    const response = await fetchImpl(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    // Um evento assinado pode chegar antes da leitura canônica propagar ou a
    // credencial pode apontar para a conta errada. Em ambos os casos 200
    // descartaria dinheiro; 5xx preserva o retry do Mercado Pago.
    if (response.status === 404) throw new MercadoPagoProviderError('mp_payment_not_found', 404);
    if (!response.ok) throw new MercadoPagoProviderError('mp_refetch_failed', response.status);
    return await response.json();
  });
}

export async function fetchMercadoPagoOrder(token, orderId, options = {}) {
  if (!token) throw new MercadoPagoProviderError('mp_order_not_configured');
  integrity(MP_ORDER_ID_PATTERN.test(String(orderId || '')), 'invalid_order_id');
  return withProviderBudget(options, 'mp_order_fetch_failed', async ({ signal, fetchImpl }) => {
    const response = await fetchImpl(`https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}`, {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) throw new MercadoPagoProviderError('mp_order_not_found', 404);
    if (!response.ok) throw new MercadoPagoProviderError('mp_order_refetch_failed', response.status);
    return await response.json();
  });
}

/**
 * Compensação exclusiva da Orders API. O POST nunca é considerado prova: a
 * confirmação financeira vem de um GET /v1/orders/{ORD} posterior, inclusive
 * quando a resposta do POST se perde depois de o provider aceitar a operação.
 */
export async function refundMercadoPagoOrder(token, orderId, options = {}) {
  const {
    idempotencyKey,
    amountCents,
    expectedTotalCents = OFERTA.pixCentavos,
    paymentId,
    requestId,
    offer = currentOffer(),
    fetchOrderImpl = fetchMercadoPagoOrder,
  } = options;
  if (!token || !idempotencyKey) {
    throw new MercadoPagoProviderError('mp_order_refund_not_configured');
  }
  integrity(MP_ORDER_ID_PATTERN.test(String(orderId || '')), 'invalid_order_id');
  const requestedCents = amountCents === undefined ? expectedTotalCents : Number(amountCents);
  if (!Number.isInteger(expectedTotalCents) || expectedTotalCents <= 0
      || !Number.isInteger(requestedCents) || requestedCents <= 0
      || requestedCents > expectedTotalCents
      || offer.amountCents !== expectedTotalCents) {
    throw new MercadoPagoProviderError('mp_order_refund_invalid_amount');
  }
  const partial = requestedCents !== expectedTotalCents;
  if (partial) integrity(MP_ORDER_PAYMENT_ID_PATTERN.test(String(paymentId || '')), 'invalid_order_payment_id');
  const providerIdempotencyKey = createHash('sha256').update(idempotencyKey).digest('hex');
  let requestFailure = null;
  let responseStatus = null;
  try {
    responseStatus = await withProviderBudget(
      options,
      'mp_order_late_refund_request_failed',
      async ({ signal, fetchImpl }) => {
        const headers = {
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': providerIdempotencyKey,
        };
        const init = { method: 'POST', signal, headers };
        if (partial) {
          headers['Content-Type'] = 'application/json';
          init.body = JSON.stringify({
            transactions: [{
              id: String(paymentId),
              amount: (requestedCents / 100).toFixed(2),
            }],
          });
        }
        const response = await fetchImpl(
          `https://api.mercadopago.com/v1/orders/${encodeURIComponent(orderId)}/refund`,
          init,
        );
        return response.status;
      },
    );
  } catch (error) {
    requestFailure = error;
  }

  let confirmedOrder;
  try {
    confirmedOrder = await fetchOrderImpl(token, String(orderId), options);
  } catch (error) {
    throw requestFailure || error;
  }
  integrity(String(confirmedOrder?.id || '') === String(orderId), 'order_id_mismatch');
  if (requestId) integrity(orderRequestId(confirmedOrder) === requestId,
    'order_inventory_binding_mismatch');
  const snapshot = deriveMercadoPagoOrderFinancialSnapshot(confirmedOrder, offer);
  const confirmed = snapshot?.paymentStatus === 'refunded'
    && snapshot.refundedCents === expectedTotalCents
    && Boolean(snapshot.refundReference);
  if (!confirmed) {
    if (requestFailure) throw requestFailure;
    if (responseStatus !== 201) {
      throw new MercadoPagoProviderError('mp_order_late_refund_failed', responseStatus);
    }
    throw new MercadoPagoProviderError('mp_order_late_refund_unconfirmed');
  }
  return {
    ok: true,
    id: snapshot.refundReference,
    amountCents: expectedTotalCents,
    order: confirmedOrder,
  };
}

export async function refundMercadoPagoPayment(token, paymentId, options = {}) {
  const { idempotencyKey, amountCents, expectedTotalCents = OFERTA.pixCentavos } = options;
  if (!token || !idempotencyKey) throw new MercadoPagoProviderError('mp_refund_not_configured');
  const requestedCents = amountCents === undefined ? expectedTotalCents : Number(amountCents);
  if (!Number.isInteger(expectedTotalCents) || expectedTotalCents <= 0
      || !Number.isInteger(requestedCents) || requestedCents <= 0
      || requestedCents > expectedTotalCents) {
    throw new MercadoPagoProviderError('mp_refund_invalid_amount');
  }
  // O MP limita chaves de idempotência a 64 caracteres em suas APIs de refund.
  const providerIdempotencyKey = createHash('sha256').update(idempotencyKey).digest('hex');
  return withProviderBudget(options, 'mp_late_refund_fetch_failed', async ({ signal, fetchImpl }) => {
    const response = await fetchImpl(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': providerIdempotencyKey,
      },
      // Ausência de amount é o contrato oficial para reembolso integral. Se já
      // houve parcial, devolvemos somente o saldo restante.
      body: JSON.stringify(requestedCents === expectedTotalCents
        ? {}
        : { amount: requestedCents / 100 }),
    });
    if (!response.ok) throw new MercadoPagoProviderError('mp_late_refund_failed', response.status);
    const refund = await response.json();
    const amountCents = Math.round(Number(refund?.amount) * 100);
    if (!/^\d+$/.test(String(refund?.id || ''))
        || String(refund?.payment_id) !== String(paymentId)
        || refund?.status !== 'approved'
        || amountCents !== requestedCents) {
      throw new MercadoPagoProviderError('mp_late_refund_unconfirmed');
    }
    return { ok: true, id: String(refund.id), amountCents };
  });
}

export async function fetchMercadoPagoRefundState(token, paymentId, options = {}) {
  if (!token) throw new MercadoPagoProviderError('mp_refund_not_configured');
  return withProviderBudget(options, 'mp_refund_reconciliation_fetch_failed', async ({ signal, fetchImpl }) => {
    const response = await fetchImpl(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}/refunds`, {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new MercadoPagoProviderError('mp_refund_reconciliation_failed', response.status);
    const body = await response.json();
    return normalizeMercadoPagoRefundState(
      paymentId,
      body,
      options.expectedTotalCents ?? OFERTA.pixCentavos,
    );
  });
}

/** Compatibilidade estreita para callers/testes: só retorna quando a soma é integral. */
export async function findMercadoPagoFullRefund(token, paymentId, expectedTotalCents = OFERTA.pixCentavos) {
  const state = await fetchMercadoPagoRefundState(token, paymentId, { expectedTotalCents });
  return state.confirmedCents === expectedTotalCents
    ? { ok: true, id: state.aggregateReference }
    : null;
}

async function fetchMerchantOrder(token, orderId, options = {}) {
  return withProviderBudget(options, 'mp_merchant_order_unavailable', async ({ signal, fetchImpl }) => {
    const response = await fetchImpl(`https://api.mercadopago.com/merchant_orders/${encodeURIComponent(orderId)}`, {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new MercadoPagoProviderError('mp_merchant_order_fetch_failed', response.status);
    return await response.json();
  });
}

/** Prova Payment -> merchant order -> preferência anexada à reserva. */
export async function verifyMercadoPagoPaymentBinding(
  token,
  payment,
  reservation,
  {
    getReservationImpl = getReservation,
    fetchMerchantOrderImpl = fetchMerchantOrder,
    deadlineAt = Number.POSITIVE_INFINITY,
    fetchImpl,
  } = {},
) {
  const orderId = String(payment?.order?.id || '');
  integrity(/^\d{5,}$/.test(orderId), 'invalid_payment_order');
  const [current, merchantOrder] = await Promise.all([
    getReservationImpl(reservation.requestId),
    fetchMerchantOrderImpl(token, orderId, { deadlineAt, fetchImpl }),
  ]);
  integrity(current?.reservationId === reservation.requestId
    && current?.slot === reservation.slot
    && current?.provider === 'mercadopago'
    && current?.buyerPk === `BUYER#${reservation.buyerHash}`,
  'payment_inventory_binding_mismatch');
  const offer = inventoryOffer(current);
  validateMercadoPagoPayment(payment, offer);
  integrity(Boolean(current.providerRef), 'payment_preference_not_attached');
  integrity(String(merchantOrder?.id) === orderId, 'merchant_order_id_mismatch');
  integrity(merchantOrder?.external_reference === EXTERNAL_REFERENCE, 'merchant_order_reference_mismatch');
  integrity(String(merchantOrder?.preference_id || '') === current.providerRef,
    'payment_preference_binding_mismatch');
  const orderPayments = Array.isArray(merchantOrder?.payments) ? merchantOrder.payments : [];
  integrity(orderPayments.some((candidate) => String(candidate?.id ?? candidate) === String(payment.id)),
    'merchant_order_payment_mismatch');
  return current;
}

async function fetchChargeback(token, chargebackId, options = {}) {
  return withProviderBudget(options, 'mp_chargeback_unavailable', async ({ signal, fetchImpl }) => {
    const response = await fetchImpl(`https://api.mercadopago.com/v1/chargebacks/${encodeURIComponent(chargebackId)}`, {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 404) throw new MercadoPagoProviderError('mp_chargeback_not_found', 404);
    if (!response.ok) throw new MercadoPagoProviderError('mp_chargeback_fetch_failed', response.status);
    return await response.json();
  });
}

function chargebackPaymentId(chargeback) {
  const candidates = Array.isArray(chargeback?.payments)
    ? chargeback.payments
    : [chargeback?.payments];
  const ids = [...new Set(candidates.flat().map((candidate) => String(candidate?.id ?? candidate ?? ''))
    .filter((candidate) => /^\d{5,}$/.test(candidate)))];
  integrity(ids.length === 1, 'invalid_chargeback_payments');
  return ids[0];
}

/**
 * Scanner financeiro autenticado para cron. Usa a mesma validação, snapshot,
 * cursor e outbox do webhook; 404 de chargeback significa apenas que não há
 * contestação para este pagamento, enquanto qualquer outra falha fecha o run.
 */
export async function reconcileMercadoPagoPaymentById(token, paymentId, {
  deadlineAt = Date.now() + HANDLER_PROVIDER_BUDGET_MS,
  fetchImpl,
  fetchPaymentImpl = fetchPayment,
  fetchChargebackImpl = fetchChargeback,
  fetchRefundStateImpl = fetchMercadoPagoRefundState,
  verifyBindingImpl = verifyMercadoPagoPaymentBinding,
  processPaymentImpl = processMercadoPagoPayment,
  processDependencies = {},
} = {}) {
  if (!token || !/^\d{5,}$/.test(String(paymentId || ''))) {
    throw new MercadoPagoProviderError('mp_reconciliation_not_configured');
  }
  const providerOptions = { deadlineAt, fetchImpl };
  const payment = await fetchPaymentImpl(token, String(paymentId), providerOptions);
  integrity(String(payment?.id) === String(paymentId), 'payment_id_mismatch');
  if (payment.external_reference !== EXTERNAL_REFERENCE) return ignored('outro_produto');
  const reservation = validateMercadoPagoPaymentIdentity(payment);
  const boundReservation = await verifyBindingImpl(token, payment, reservation, providerOptions);
  const offer = inventoryOffer(boundReservation);

  let chargeback = null;
  try {
    chargeback = await fetchChargebackImpl(token, String(paymentId), providerOptions);
  } catch (error) {
    if (!(error instanceof MercadoPagoProviderError) || error.status !== 404) throw error;
  }
  if (chargeback && chargebackPaymentId(chargeback) !== String(paymentId)) {
    throw new MercadoPagoWebhookIntegrityError('chargeback_payment_id_mismatch');
  }
  const refundState = await fetchRefundStateImpl(token, String(paymentId), {
    ...providerOptions,
    expectedTotalCents: offer.amountCents,
  });
  return processPaymentImpl(payment, {
    chargeback,
    refundState,
    boundReservation,
    getRefundState: (candidatePaymentId, options) => fetchMercadoPagoRefundState(
      token,
      candidatePaymentId,
      { ...options, deadlineAt, fetchImpl },
    ),
    refundPayment: (candidatePaymentId, options) => refundMercadoPagoPayment(
      token,
      candidatePaymentId,
      { ...options, deadlineAt, fetchImpl },
    ),
    withReservationLock: (args) => withWebhookReservationLock(args),
    isCurrentRevision: (reservationId, snapshot) => (
      isCurrentMercadoPagoRevision(reservationId, snapshot)
    ),
    ...processDependencies,
  });
}

/** Scanner/cron Orders: refetch, binding direto e mesma transação/outbox do webhook. */
export async function reconcileMercadoPagoOrderById(token, orderId, {
  deadlineAt = Date.now() + HANDLER_PROVIDER_BUDGET_MS,
  fetchImpl,
  fetchOrderImpl = fetchMercadoPagoOrder,
  verifyBindingImpl = verifyMercadoPagoOrderBinding,
  processOrderImpl = processMercadoPagoOrder,
  processDependencies = {},
} = {}) {
  if (!token || !MP_ORDER_ID_PATTERN.test(String(orderId || ''))) {
    throw new MercadoPagoProviderError('mp_order_reconciliation_not_configured');
  }
  const providerOptions = { deadlineAt, fetchImpl };
  const order = await fetchOrderImpl(token, String(orderId), providerOptions);
  integrity(String(order?.id) === String(orderId), 'order_id_mismatch');
  const boundReservation = await verifyBindingImpl(order, {
    getReservationImpl: processDependencies.getReservationImpl || getReservation,
  });
  return processOrderImpl(order, {
    boundReservation,
    getOrder: (candidateOrderId, options) => fetchMercadoPagoOrder(
      token,
      candidateOrderId,
      { ...options, deadlineAt, fetchImpl },
    ),
    refundOrder: (candidateOrderId, options) => refundMercadoPagoOrder(
      token,
      candidateOrderId,
      { ...options, deadlineAt, fetchImpl },
    ),
    withReservationLock: (args) => withWebhookReservationLock(args),
    isCurrentRevision: (reservationId, snapshot) => (
      isCurrentMercadoPagoRevision(reservationId, snapshot)
    ),
    ...processDependencies,
  });
}

function webhookTopic(req, body) {
  const query = req.query || {};
  const candidates = [query.type, query.topic, body?.type, String(body?.action || '').split('.')[0]]
    .map(scalar)
    .filter(Boolean);
  if (candidates.includes('order')) return 'order';
  if (candidates.includes('payment')) return 'payment';
  if (candidates.some((candidate) => ['topic_chargebacks_wh', 'chargebacks', 'chargeback'].includes(candidate))) {
    return 'chargeback';
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const providerDeadlineAt = Date.now() + HANDLER_PROVIDER_BUDGET_MS;

  const token = process.env.MP_ACCESS_TOKEN;
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!token) return res.status(503).json({ error: 'mercadopago_not_configured' });
  if (!secret) return res.status(503).json({ error: 'mp_webhook_not_configured' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { return res.status(400).json({ error: 'invalid_json' }); }
  const topic = webhookTopic(req, body);
  if (!topic) return res.status(200).json(ignored('outro_topico'));

  const resourceId = scalar(req.query?.['data.id']);
  const requestId = scalar(req.headers?.['x-request-id']);
  const signature = scalar(req.headers?.['x-signature']);
  const validResourceId = topic === 'order'
    ? MP_ORDER_ID_PATTERN.test(resourceId)
    : /^\d{5,}$/.test(resourceId);
  if (!validResourceId) return res.status(400).json({ error: 'invalid_data_id' });
  if (!verifyMercadoPagoSignature({
    xSignature: signature,
    xRequestId: requestId,
    dataId: resourceId,
    secret,
  })) return res.status(401).json({ error: 'invalid_signature' });

  try {
    if (topic === 'order') {
      integrity(scalar(req.query?.type) === 'order'
        && scalar(body?.type) === 'order'
        && scalar(body?.data?.id) === resourceId
        && scalar(body?.action).startsWith('order.'), 'invalid_order_notification');
      const result = await reconcileMercadoPagoOrderById(token, resourceId, {
        deadlineAt: providerDeadlineAt,
      });
      return res.status(200).json(result);
    }
    let chargeback = null;
    let paymentId = resourceId;
    if (topic === 'chargeback') {
      chargeback = await fetchChargeback(token, resourceId, { deadlineAt: providerDeadlineAt });
      if (String(chargeback.id) !== resourceId) {
        throw new MercadoPagoWebhookIntegrityError('chargeback_id_mismatch');
      }
      paymentId = chargebackPaymentId(chargeback);
      const notifiedPaymentId = scalar(body?.data?.payment_id);
      if (notifiedPaymentId && notifiedPaymentId !== paymentId) {
        throw new MercadoPagoWebhookIntegrityError('chargeback_payment_id_mismatch');
      }
    }
    const payment = await fetchPayment(token, paymentId, { deadlineAt: providerDeadlineAt });
    if (String(payment.id) !== paymentId) throw new MercadoPagoWebhookIntegrityError('payment_id_mismatch');
    if (payment.external_reference !== EXTERNAL_REFERENCE) {
      return res.status(200).json(ignored('outro_produto'));
    }
    const reservation = validateMercadoPagoPaymentIdentity(payment);
    const boundReservation = await verifyMercadoPagoPaymentBinding(
      token,
      payment,
      reservation,
      { deadlineAt: providerDeadlineAt },
    );
    const offer = inventoryOffer(boundReservation);
    if (!chargeback && payment.status === 'charged_back') {
      // O endpoint oficial também aceita o payment id; assim Payment e
      // Chargebacks convergem para a mesma revisão e não duplicam side effects.
      chargeback = await fetchChargeback(token, paymentId, { deadlineAt: providerDeadlineAt });
      if (chargebackPaymentId(chargeback) !== paymentId) {
        throw new MercadoPagoWebhookIntegrityError('chargeback_payment_id_mismatch');
      }
    }
    const refundState = await fetchMercadoPagoRefundState(token, paymentId, {
      deadlineAt: providerDeadlineAt,
      expectedTotalCents: offer.amountCents,
    });
    const result = await processMercadoPagoPayment(payment, {
      chargeback,
      refundState,
      boundReservation,
      getRefundState: (candidatePaymentId, options) => fetchMercadoPagoRefundState(
        token,
        candidatePaymentId,
        { ...options, deadlineAt: providerDeadlineAt },
      ),
      refundPayment: (candidatePaymentId, options) => refundMercadoPagoPayment(
        token,
        candidatePaymentId,
        { ...options, deadlineAt: providerDeadlineAt },
      ),
      withReservationLock: (args) => withWebhookReservationLock(args),
      isCurrentRevision: (reservationId, snapshot) => (
        isCurrentMercadoPagoRevision(reservationId, snapshot)
      ),
    });
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof MercadoPagoWebhookIntegrityError) {
      console.error('[mp-webhook] recurso rejeitado por integridade:', resourceId, error.code);
      return res.status(500).json({
        error: topic === 'order' ? 'mp_order_integrity_failed' : 'mp_payment_integrity_failed',
      });
    }
    if (error instanceof WebhookOutboxBusyError) {
      res.setHeader('Retry-After', '60');
      return res.status(503).json({ error: 'webhook_effect_in_progress' });
    }
    console.error('[mp-webhook] falha operacional:', resourceId, error?.name || 'Error');
    return res.status(500).json({ error: 'mp_webhook_processing_failed' });
  }
}
