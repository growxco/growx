/**
 * POST /api/stripe-webhook
 *
 * O endpoint valida a assinatura no corpo bruto e relê o evento na Stripe.
 * Eventos financeiros nunca são aplicados a partir do objeto recebido: a
 * cadeia Checkout Session -> PaymentIntent -> Charge, a reserva anexada e o
 * snapshot atual de refunds/disputes são validados antes de qualquer efeito.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import {
  financialEventCursor,
  getReservation,
  markReservationPaid,
  releaseReservation,
} from './_lib/inventory.js';
import {
  sendBuyerConfirmationEmail,
  sendBuyerFinancialUpdateEmail,
  sendInternalSaleEmail,
  sendSlackSaleNotification,
} from './_lib/webhook-delivery.js';
import {
  runWebhookEffect,
  withWebhookReservationLock,
  WebhookOutboxBusyError,
} from './_lib/webhook-outbox.js';
import { REQUEST_ID_PATTERN } from '../shared/provider-identifiers.js';
import { OFERTA, brl } from '../src/lib/oferta.js';
import { reservationCode } from '../shared/reservation-code.js';

export const maxDuration = 60;
export const config = { runtime: 'nodejs', maxDuration: 60, api: { bodyParser: false } };

const SOURCE = 'growx.com.br/prevenda';
const SKU = 'prevenda_cartao';
const PROVIDER_TIMEOUT_MS = 5_000;
const PROVIDER_DEADLINE_MS = 45_000;
const MAX_WEBHOOK_BYTES = 64 * 1024;
const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const HASH = /^[0-9a-f]{64}$/i;
const SLOT = /^SLOT#(?:0(?:0[1-9]|[1-9]\d)|100)$/;
const REFUND_STATUSES = new Set(['pending', 'requires_action', 'succeeded', 'failed', 'canceled']);
const DISPUTE_STATUSES = new Set([
  'warning_needs_response',
  'warning_under_review',
  'warning_closed',
  'needs_response',
  'under_review',
  'won',
  'lost',
]);
const OPEN_DISPUTE_STATUSES = new Set([
  'warning_needs_response',
  'warning_under_review',
  'needs_response',
  'under_review',
]);
const REFUND_EVENT_TYPES = new Set([
  'refund.created',
  'refund.updated',
  'refund.failed',
  'charge.refunded',
]);
const DISPUTE_EVENT_TYPES = new Set([
  'charge.dispute.created',
  'charge.dispute.updated',
  'charge.dispute.closed',
  'charge.dispute.funds_withdrawn',
  'charge.dispute.funds_reinstated',
]);
const SESSION_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
]);
const BUYER_FINANCIAL_STATUSES = new Set([
  'refund_pending',
  'refunded',
  'partially_refunded',
  'refund_failed',
  'disputed',
  'charged_back',
]);

export class StripeWebhookIntegrityError extends Error {
  constructor(code) {
    super(code);
    this.name = 'StripeWebhookIntegrityError';
    this.code = code;
  }
}

export class StripeProviderError extends Error {
  constructor(code, status = null) {
    super(code);
    this.name = 'StripeProviderError';
    this.status = status;
  }
}

const ignored = (reason) => ({ ok: true, ignored: reason });
const integrity = (condition, code) => {
  if (!condition) throw new StripeWebhookIntegrityError(code);
};
const idOf = (value) => (typeof value === 'string' ? value : value?.id);

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(',')}}`;
}

export const stripeFinancialDigest = (snapshot) => createHash('sha256')
  .update(canonical(snapshot))
  .digest('hex');

function transitionOutcome(result) {
  const outcome = result && typeof result === 'object' ? result.outcome : null;
  if (['applied', 'idempotent', 'stale'].includes(outcome)) return outcome;
  return result === false ? 'idempotent' : 'applied';
}

export function verifyStripeSignature({ rawBody, signature, secret, nowSeconds = Math.floor(Date.now() / 1000) }) {
  if (typeof rawBody !== 'string' || !rawBody || Buffer.byteLength(rawBody) > MAX_WEBHOOK_BYTES
      || typeof signature !== 'string' || !signature || signature.length > 2048
      || typeof secret !== 'string' || !secret.startsWith('whsec_')) return false;
  const parts = signature.split(',').map((part) => {
    const index = part.indexOf('=');
    return index > 0
      ? [part.slice(0, index).trim(), part.slice(index + 1).trim()]
      : ['', ''];
  });
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1]);
  const candidates = parts
    .filter(([key, value]) => key === 'v1' && /^[a-f0-9]{64}$/i.test(value))
    .map(([, value]) => value.toLowerCase());
  if (!Number.isInteger(timestamp) || Math.abs(nowSeconds - timestamp) > STRIPE_SIGNATURE_TOLERANCE_SECONDS
      || !candidates.length) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  return candidates.some((candidate) => {
    const received = Buffer.from(candidate, 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

async function readRawBody(req) {
  const direct = req.rawBody ?? req.body;
  if (typeof direct === 'string') {
    if (Buffer.byteLength(direct) > MAX_WEBHOOK_BYTES) throw new Error('payload_too_large');
    return direct;
  }
  if (Buffer.isBuffer(direct)) {
    if (direct.length > MAX_WEBHOOK_BYTES) throw new Error('payload_too_large');
    return direct.toString('utf8');
  }
  // Um objeto já parseado não preserva os bytes usados por Stripe-Signature.
  if (direct && typeof direct === 'object') return null;
  if (!req || typeof req[Symbol.asyncIterator] !== 'function') return null;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_WEBHOOK_BYTES) throw new Error('payload_too_large');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function reservationMetadata(metadata) {
  const requestId = String(metadata?.request_id || '');
  const slot = String(metadata?.slot_id || '');
  const buyerHash = String(metadata?.buyer_hash || '');
  integrity(REQUEST_ID_PATTERN.test(requestId), 'invalid_reservation_id');
  integrity(SLOT.test(slot), 'invalid_reservation_slot');
  integrity(HASH.test(buyerHash), 'invalid_buyer_hash');
  return { requestId, slot, buyerHash: buyerHash.toLowerCase() };
}

function ownedReservation(metadata) {
  if (metadata?.source !== SOURCE) return null;
  return reservationMetadata(metadata);
}

function currentOffer() {
  return {
    amountCents: OFERTA.cartaoCentavos,
    currency: 'brl',
    sku: SKU,
    // Compatibilidade dos processadores injetáveis/testes. Produção sempre
    // substitui isto pelo snapshot estrito lido do inventário.
    contractVersion: null,
  };
}

function inventoryOffer(record) {
  const offer = {
    amountCents: Number(record?.offerAmountCents),
    currency: String(record?.offerCurrency || '').toLowerCase(),
    sku: String(record?.offerSku || ''),
    contractVersion: String(record?.contractVersion || ''),
  };
  integrity(Number.isInteger(offer.amountCents) && offer.amountCents > 0
    && /^[a-z]{3}$/.test(offer.currency)
    && /^[a-z0-9][a-z0-9._-]{0,63}$/.test(offer.sku)
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(offer.contractVersion),
  'stripe_inventory_offer_snapshot_invalid');
  return offer;
}

function validateOfferMetadata(metadata, offer, code = 'stripe_offer_metadata_mismatch') {
  integrity(metadata?.sku === offer.sku
    && (!offer.contractVersion || metadata?.contract_version === offer.contractVersion), code);
}

function sameReservationMetadata(metadata, expected, code, offer = null) {
  const actual = ownedReservation(metadata);
  integrity(actual, code);
  integrity(actual.requestId === expected.requestId
    && actual.slot === expected.slot
    && actual.buyerHash === expected.buyerHash, code);
  if (offer) validateOfferMetadata(metadata, offer, code);
}

function validateMoney(amount, currency, offer) {
  integrity(Number.isInteger(amount) && amount === offer.amountCents, 'invalid_payment_amount');
  integrity(String(currency || '').toLowerCase() === offer.currency, 'invalid_payment_currency');
}

function validateSession(session, offer = null) {
  integrity(session?.object === 'checkout.session'
    && /^cs_[A-Za-z0-9_]+$/.test(String(session?.id || '')), 'invalid_checkout_session');
  const reservation = ownedReservation(session.metadata);
  if (!reservation) return null;
  integrity(session.mode === 'payment', 'invalid_checkout_mode');
  if (offer) {
    validateOfferMetadata(session.metadata, offer);
    validateMoney(session.amount_total, session.currency, offer);
  }
  return reservation;
}

function validatePaymentIntent(paymentIntent, reservation, offer) {
  integrity(paymentIntent?.object === 'payment_intent'
    && /^pi_[A-Za-z0-9_]+$/.test(String(paymentIntent?.id || '')), 'invalid_payment_intent');
  sameReservationMetadata(paymentIntent.metadata, reservation, 'payment_intent_metadata_mismatch', offer);
  validateMoney(paymentIntent.amount, paymentIntent.currency, offer);
  integrity(paymentIntent.status === 'succeeded'
    && paymentIntent.amount_received === offer.amountCents, 'invalid_payment_intent_state');
}

function validateCharge(charge, reservation = null, offer = null) {
  integrity(charge?.object === 'charge'
    && /^ch_[A-Za-z0-9_]+$/.test(String(charge?.id || '')), 'invalid_charge_object');
  const chargeReservation = ownedReservation(charge.metadata);
  if (!chargeReservation) return null;
  if (reservation) {
    sameReservationMetadata(charge.metadata, reservation, 'charge_metadata_mismatch', offer);
  }
  if (offer) validateMoney(charge.amount, charge.currency, offer);
  integrity(charge.paid === true && charge.status === 'succeeded', 'invalid_charge_state');
  return chargeReservation;
}

function checkoutContact(session, charge = null) {
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

function normalizeRefund(refund, charge) {
  integrity(refund?.object === 'refund'
    && /^re_[A-Za-z0-9_]+$/.test(String(refund?.id || '')), 'invalid_refund_object');
  const chargeId = idOf(refund.charge);
  const paymentIntentId = idOf(refund.payment_intent);
  if (chargeId) integrity(chargeId === charge.id, 'refund_charge_mismatch');
  if (paymentIntentId && idOf(charge.payment_intent)) {
    integrity(paymentIntentId === idOf(charge.payment_intent), 'refund_payment_intent_mismatch');
  }
  integrity(REFUND_STATUSES.has(refund.status), 'invalid_refund_status');
  integrity(Number.isInteger(refund.amount) && refund.amount > 0
    && refund.amount <= charge.amount, 'invalid_refund_amount');
  integrity(String(refund.currency || '').toLowerCase() === String(charge.currency).toLowerCase(),
    'refund_currency_mismatch');
  return {
    id: refund.id,
    status: refund.status,
    amountCents: refund.amount,
    created: Number.isInteger(refund.created) ? refund.created : 0,
    failureReason: refund.status === 'failed' ? String(refund.failure_reason || 'unknown') : null,
    pendingReason: ['pending', 'requires_action'].includes(refund.status)
      ? String(refund.pending_reason || refund.status)
      : null,
  };
}

function normalizeBalanceTransaction(transaction, dispute) {
  integrity(transaction?.object === 'balance_transaction'
    && /^txn_[A-Za-z0-9_]+$/.test(String(transaction?.id || '')), 'invalid_dispute_balance_transaction');
  integrity(Number.isInteger(transaction.amount)
    && Number.isInteger(transaction.net), 'invalid_dispute_balance_amount');
  integrity(String(transaction.currency || '').toLowerCase() === String(dispute.currency).toLowerCase(),
    'invalid_dispute_balance_currency');
  return {
    id: transaction.id,
    amountCents: transaction.amount,
    netCents: transaction.net,
    reportingCategory: String(transaction.reporting_category || ''),
    created: Number.isInteger(transaction.created) ? transaction.created : 0,
  };
}

function normalizeDispute(dispute, charge) {
  integrity(dispute?.object === 'dispute'
    && /^(?:dp|du)_[A-Za-z0-9_]+$/.test(String(dispute?.id || '')), 'invalid_dispute_object');
  integrity(idOf(dispute.charge) === charge.id, 'dispute_charge_mismatch');
  integrity(DISPUTE_STATUSES.has(dispute.status), 'invalid_dispute_status');
  integrity(Number.isInteger(dispute.amount) && dispute.amount > 0
    && dispute.amount <= charge.amount, 'invalid_dispute_amount');
  integrity(String(dispute.currency || '').toLowerCase() === String(charge.currency).toLowerCase(),
    'dispute_currency_mismatch');
  const balanceTransactions = (Array.isArray(dispute.balance_transactions)
    ? dispute.balance_transactions
    : [])
    .map((transaction) => normalizeBalanceTransaction(transaction, dispute))
    .sort((left, right) => left.id.localeCompare(right.id));
  return {
    id: dispute.id,
    status: dispute.status,
    amountCents: dispute.amount,
    created: Number.isInteger(dispute.created) ? dispute.created : 0,
    reason: String(dispute.reason || ''),
    balanceTransactions,
  };
}

function uniqueSorted(records, code) {
  const byId = new Map();
  for (const record of records) {
    if (byId.has(record.id)) {
      integrity(canonical(byId.get(record.id)) === canonical(record), code);
    } else {
      byId.set(record.id, record);
    }
  }
  return [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
}

/** Snapshot financeiro sem PII, estável independentemente do evento que o revelou. */
export function buildStripeFinancialSnapshot({
  charge,
  refunds = [],
  disputes = [],
  checkoutSessionId = null,
  offer = currentOffer(),
}) {
  const reservation = validateCharge(charge, null, offer);
  integrity(reservation, 'financial_charge_not_owned');
  const normalizedRefunds = uniqueSorted(
    refunds.map((refund) => normalizeRefund(refund, charge)),
    'duplicate_refund_state_mismatch',
  );
  const normalizedDisputes = uniqueSorted(
    disputes.map((dispute) => normalizeDispute(dispute, charge)),
    'duplicate_dispute_state_mismatch',
  );

  const refundTotals = normalizedRefunds.reduce((totals, refund) => {
    if (refund.status === 'succeeded') totals.succeededCents += refund.amountCents;
    else if (['pending', 'requires_action'].includes(refund.status)) totals.pendingCents += refund.amountCents;
    else totals.failedCents += refund.amountCents;
    totals.counts[refund.status] = (totals.counts[refund.status] || 0) + 1;
    return totals;
  }, {
    succeededCents: 0,
    pendingCents: 0,
    failedCents: 0,
    counts: {},
  });
  const latestFailedRefund = normalizedRefunds
    .filter((refund) => !['succeeded', 'pending', 'requires_action'].includes(refund.status))
    .reduce((latest, refund) => {
      if (!latest || refund.created > latest.created) return refund;
      if (refund.created === latest.created && refund.id.localeCompare(latest.id) > 0) return refund;
      return latest;
    }, null);
  // Falhas são tentativas, não dinheiro movimentado. Somá-las pode exceder o
  // valor da compra quando o comprador tenta o mesmo reembolso mais de uma vez.
  refundTotals.latestFailedCents = latestFailedRefund?.amountCents || 0;
  integrity(refundTotals.succeededCents <= charge.amount
    && refundTotals.succeededCents + refundTotals.pendingCents <= charge.amount,
  'invalid_refund_aggregate');
  if (Number.isInteger(charge.amount_refunded)) {
    integrity(charge.amount_refunded === refundTotals.succeededCents, 'refund_aggregate_mismatch');
  }

  const disputeTotals = normalizedDisputes.reduce((totals, dispute) => {
    if (OPEN_DISPUTE_STATUSES.has(dispute.status)) totals.disputedCents += dispute.amountCents;
    let withdrawnForDispute = 0;
    let reinstatedForDispute = 0;
    for (const transaction of dispute.balanceTransactions) {
      if (transaction.reportingCategory === 'dispute' || transaction.netCents < 0) {
        const withdrawn = Math.abs(Math.min(0, transaction.netCents));
        withdrawnForDispute += withdrawn;
        totals.fundsWithdrawnCents += withdrawn;
      }
      if (transaction.reportingCategory === 'dispute_reversal' || transaction.netCents > 0) {
        const reinstated = Math.max(0, transaction.netCents);
        reinstatedForDispute += reinstated;
        totals.fundsReinstatedCents += reinstated;
      }
    }
    if (dispute.status === 'lost') {
      // Stripe não retira fundos novamente quando a charge já foi totalmente
      // reembolsada. Havendo balance_transactions, o net real prevalece;
      // sem elas, usamos apenas o saldo ainda não reembolsado como fallback.
      const residual = Math.max(0, charge.amount - refundTotals.succeededCents);
      const financialLoss = dispute.balanceTransactions.length
        ? Math.max(0, withdrawnForDispute - reinstatedForDispute)
        : residual;
      totals.chargedBackCents += Math.min(dispute.amountCents, financialLoss);
    }
    totals.counts[dispute.status] = (totals.counts[dispute.status] || 0) + 1;
    return totals;
  }, {
    disputedCents: 0,
    chargedBackCents: 0,
    fundsWithdrawnCents: 0,
    fundsReinstatedCents: 0,
    counts: {},
  });
  integrity(disputeTotals.disputedCents <= charge.amount
    && disputeTotals.chargedBackCents <= charge.amount, 'invalid_dispute_aggregate');

  let paymentStatus = 'paid';
  if (disputeTotals.disputedCents > 0) paymentStatus = 'disputed';
  else if (disputeTotals.chargedBackCents > 0) paymentStatus = 'charged_back';
  else if (refundTotals.pendingCents > 0) paymentStatus = 'refund_pending';
  else if (refundTotals.succeededCents === charge.amount) paymentStatus = 'refunded';
  else if (refundTotals.succeededCents > 0) paymentStatus = 'partially_refunded';
  else if (refundTotals.failedCents > 0) paymentStatus = 'refund_failed';

  const providerStateCreated = Math.max(
    Number.isInteger(charge.created) ? charge.created : 0,
    ...normalizedRefunds.map((refund) => refund.created),
    ...normalizedDisputes.flatMap((dispute) => [
      dispute.created,
      ...dispute.balanceTransactions.map((transaction) => transaction.created),
    ]),
  );
  return {
    version: 1,
    checkoutSessionId,
    charge: {
      id: charge.id,
      paymentIntentId: idOf(charge.payment_intent) || null,
      amountCents: charge.amount,
      currency: String(charge.currency).toLowerCase(),
    },
    refunds: normalizedRefunds,
    refundTotals,
    disputes: normalizedDisputes,
    disputeTotals,
    paymentStatus,
    providerStateCreated,
  };
}

function statusFor(paymentStatus) {
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

function amountFor(snapshot) {
  if (snapshot.paymentStatus === 'refund_pending') return snapshot.refundTotals.pendingCents;
  if (snapshot.paymentStatus === 'refund_failed') return snapshot.refundTotals.latestFailedCents;
  if (['refunded', 'partially_refunded'].includes(snapshot.paymentStatus)) {
    return snapshot.refundTotals.succeededCents;
  }
  if (snapshot.paymentStatus === 'disputed') return snapshot.disputeTotals.disputedCents;
  if (snapshot.paymentStatus === 'charged_back') return snapshot.disputeTotals.chargedBackCents;
  return snapshot.charge.amountCents;
}

function statusDetail(snapshot) {
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
  if (snapshot.disputeTotals.counts.won) {
    parts.push('contestação vencida');
  }
  if (snapshot.disputeTotals.counts.lost && !snapshot.disputeTotals.chargedBackCents) {
    parts.push('contestação perdida sem nova retirada além do estado já consolidado');
  }
  return parts.join('; ') || 'Sem saída financeira registrada.';
}

function buyerFinancialState(snapshot) {
  return {
    version: 1,
    chargeId: snapshot.charge.id,
    paymentStatus: snapshot.paymentStatus,
    amountCents: amountFor(snapshot),
    refundedCents: snapshot.refundTotals.succeededCents,
    refundPendingCents: snapshot.refundTotals.pendingCents,
    refundFailedCents: snapshot.refundTotals.failedCents,
    disputedCents: snapshot.disputeTotals.disputedCents,
    chargedBackCents: snapshot.disputeTotals.chargedBackCents,
  };
}

function fallbackRefunds(event, charge) {
  const object = event.data?.object;
  if (REFUND_EVENT_TYPES.has(event.type) && object?.object === 'refund') return [object];
  if (Array.isArray(charge.refunds?.data)) return charge.refunds.data;
  if (Number.isInteger(charge.amount_refunded) && charge.amount_refunded > 0) {
    return [{
      id: `re_fallback${String(charge.id).replace(/[^A-Za-z0-9]/g, '')}`,
      object: 'refund',
      amount: charge.amount_refunded,
      currency: charge.currency,
      charge: charge.id,
      payment_intent: idOf(charge.payment_intent) || null,
      status: 'succeeded',
      created: event.created,
    }];
  }
  return [];
}

function fallbackDisputes(event) {
  const object = event.data?.object;
  if (!DISPUTE_EVENT_TYPES.has(event.type) || object?.object !== 'dispute') return [];
  if (object.status) return [object];
  const status = event.type === 'charge.dispute.funds_reinstated'
    ? 'won'
    : 'needs_response';
  return [{ ...object, status }];
}

const DEFAULT_DEPS = {
  runEffect: runWebhookEffect,
  markPaid: markReservationPaid,
  release: releaseReservation,
  sendBuyer: sendBuyerConfirmationEmail,
  sendBuyerFinancial: sendBuyerFinancialUpdateEmail,
  sendInternal: sendInternalSaleEmail,
  sendSlack: sendSlackSaleNotification,
  withReservationLock: ({ execute }) => execute(),
  getReservation: null,
  fetchCharge: null,
  fetchPaymentIntent: null,
  fetchSessionForPaymentIntent: null,
  listRefunds: null,
  listDisputes: null,
  enforceProviderBinding: false,
};

async function completeChannels(promises) {
  const results = await Promise.allSettled(promises);
  const failed = results.find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
}

function assertInventoryBinding(record, reservation, session) {
  const offer = inventoryOffer(record);
  integrity(record
    && record.requestId === reservation.requestId
    && record.slot === reservation.slot
    && record.provider === 'stripe'
    && record.providerRef === session.id
    && record.buyerPk === `BUYER#${reservation.buyerHash}`,
  'stripe_inventory_binding_mismatch');
  sameReservationMetadata(session.metadata, reservation, 'stripe_inventory_binding_mismatch', offer);
  validateMoney(session.amount_total, session.currency, offer);
  return offer;
}

async function fetchCollections(charge, event, deps) {
  const [refunds, disputes] = await Promise.all([
    deps.listRefunds ? deps.listRefunds(charge.id) : fallbackRefunds(event, charge),
    deps.listDisputes ? deps.listDisputes(charge.id) : fallbackDisputes(event),
  ]);
  integrity(Array.isArray(refunds), 'invalid_refund_list');
  integrity(Array.isArray(disputes), 'invalid_dispute_list');
  if (deps.enforceProviderBinding && event.data?.object?.object === 'refund') {
    integrity(refunds.some((refund) => refund?.id === event.data.object.id), 'refund_trigger_not_canonical');
  }
  if (deps.enforceProviderBinding && event.data?.object?.object === 'dispute') {
    integrity(disputes.some((dispute) => dispute?.id === event.data.object.id), 'dispute_trigger_not_canonical');
  }
  return { refunds, disputes };
}

async function resolvePaidSession(event, session, reservation, deps) {
  if (!deps.enforceProviderBinding) {
    const offer = currentOffer();
    validateSession(session, offer);
    const charge = {
      id: session.id.replace(/^cs_/, 'ch_compat'),
      object: 'charge',
      amount: session.amount_total,
      amount_refunded: 0,
      currency: session.currency,
      paid: true,
      status: 'succeeded',
      created: event.created,
      metadata: session.metadata,
      billing_details: session.customer_details,
    };
    return {
      reservation,
      session,
      charge,
      contact: checkoutContact(session),
      providerRef: session.id,
      offer,
      snapshot: buildStripeFinancialSnapshot({ charge, checkoutSessionId: session.id, offer }),
    };
  }

  integrity(typeof deps.fetchPaymentIntent === 'function'
    && typeof deps.fetchCharge === 'function'
    && typeof deps.getReservation === 'function', 'stripe_binding_dependencies_missing');
  const paymentIntentId = idOf(session.payment_intent);
  integrity(/^pi_[A-Za-z0-9_]+$/.test(String(paymentIntentId || '')), 'session_payment_intent_missing');
  const paymentIntent = await deps.fetchPaymentIntent(paymentIntentId);
  integrity(paymentIntent?.id === paymentIntentId, 'payment_intent_id_mismatch');
  const chargeId = idOf(paymentIntent.latest_charge);
  integrity(/^ch_[A-Za-z0-9_]+$/.test(String(chargeId || '')), 'payment_intent_charge_missing');
  const charge = await deps.fetchCharge(chargeId);
  integrity(charge?.id === chargeId, 'charge_id_mismatch');
  integrity(idOf(charge.payment_intent) === paymentIntent.id, 'charge_payment_intent_mismatch');
  const attached = await deps.getReservation(reservation.requestId);
  const offer = assertInventoryBinding(attached, reservation, session);
  validatePaymentIntent(paymentIntent, reservation, offer);
  validateCharge(charge, reservation, offer);
  const { refunds, disputes } = await fetchCollections(charge, event, deps);
  return {
    reservation,
    session,
    charge,
    contact: checkoutContact(session, charge),
    providerRef: session.id,
    offer,
    snapshot: buildStripeFinancialSnapshot({
      charge,
      refunds,
      disputes,
      checkoutSessionId: session.id,
      offer,
    }),
  };
}

async function chargeIdFromTrigger(event, deps) {
  const object = event.data?.object;
  if (event.type === 'charge.refunded') {
    integrity(object?.object === 'charge' && /^ch_[A-Za-z0-9_]+$/.test(String(object?.id || '')),
      'invalid_charge_object');
    return object.id;
  }
  if (REFUND_EVENT_TYPES.has(event.type)) {
    integrity(object?.object === 'refund' && /^re_[A-Za-z0-9_]+$/.test(String(object?.id || '')),
      'invalid_refund_object');
    const direct = idOf(object.charge);
    if (direct) return direct;
    const paymentIntentId = idOf(object.payment_intent);
    integrity(paymentIntentId && typeof deps.fetchPaymentIntent === 'function', 'refund_charge_missing');
    const paymentIntent = await deps.fetchPaymentIntent(paymentIntentId);
    integrity(paymentIntent?.id === paymentIntentId, 'refund_payment_intent_mismatch');
    const chargeId = idOf(paymentIntent.latest_charge);
    integrity(chargeId, 'refund_charge_missing');
    return chargeId;
  }
  integrity(DISPUTE_EVENT_TYPES.has(event.type)
    && object?.object === 'dispute'
    && /^(?:dp|du)_[A-Za-z0-9_]+$/.test(String(object?.id || '')), 'invalid_dispute_object');
  const chargeId = idOf(object.charge);
  integrity(/^ch_[A-Za-z0-9_]+$/.test(String(chargeId || '')), 'invalid_dispute_charge');
  return chargeId;
}

async function resolveFinancialTrigger(event, deps) {
  const chargeId = await chargeIdFromTrigger(event, deps);
  let charge;
  if (typeof deps.fetchCharge === 'function') charge = await deps.fetchCharge(chargeId);
  else if (event.data?.object?.object === 'charge') charge = event.data.object;
  integrity(charge?.id === chargeId, 'charge_id_mismatch');
  const reservation = validateCharge(charge);
  if (!reservation) return null;

  let session = null;
  let providerRef = event.data.object.id;
  let bundleOffer = null;
  if (deps.enforceProviderBinding) {
    integrity(typeof deps.fetchPaymentIntent === 'function'
      && typeof deps.fetchSessionForPaymentIntent === 'function'
      && typeof deps.getReservation === 'function', 'stripe_binding_dependencies_missing');
    const paymentIntentId = idOf(charge.payment_intent);
    integrity(/^pi_[A-Za-z0-9_]+$/.test(String(paymentIntentId || '')), 'charge_payment_intent_missing');
    const paymentIntent = await deps.fetchPaymentIntent(paymentIntentId);
    integrity(paymentIntent?.id === paymentIntentId, 'payment_intent_id_mismatch');
    integrity(idOf(paymentIntent.latest_charge) === charge.id, 'payment_intent_charge_mismatch');
    session = await deps.fetchSessionForPaymentIntent(paymentIntent.id);
    const sessionReservation = validateSession(session);
    integrity(sessionReservation
      && sessionReservation.requestId === reservation.requestId
      && sessionReservation.slot === reservation.slot
      && sessionReservation.buyerHash === reservation.buyerHash,
    'session_charge_metadata_mismatch');
    integrity(idOf(session.payment_intent) === paymentIntent.id, 'session_payment_intent_mismatch');
    const attached = await deps.getReservation(reservation.requestId);
    const offer = assertInventoryBinding(attached, reservation, session);
    validatePaymentIntent(paymentIntent, reservation, offer);
    validateCharge(charge, reservation, offer);
    providerRef = session.id;
    bundleOffer = offer;
  } else {
    bundleOffer = currentOffer();
    validateCharge(charge, reservation, bundleOffer);
  }

  const { refunds, disputes } = await fetchCollections(charge, event, deps);
  const snapshot = buildStripeFinancialSnapshot({
    charge,
    refunds,
    disputes,
    checkoutSessionId: session?.id || null,
    offer: bundleOffer || currentOffer(),
  });
  return {
    reservation,
    session,
    charge,
    contact: checkoutContact(session, charge),
    providerRef,
    offer: bundleOffer || currentOffer(),
    snapshot,
  };
}

function cursorType(eventType, snapshot) {
  if (snapshot.paymentStatus === 'disputed') {
    return ['charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.funds_withdrawn']
      .includes(eventType) ? eventType : 'charge.dispute.updated';
  }
  if (eventType === 'charge.dispute.funds_reinstated'
      && ['paid', 'charged_back', 'partially_refunded', 'refunded'].includes(snapshot.paymentStatus)) {
    return eventType;
  }
  if (snapshot.paymentStatus === 'charged_back') return 'charge.dispute.closed';
  if (snapshot.disputes.length && snapshot.paymentStatus === 'paid') {
    return eventType === 'charge.dispute.funds_reinstated'
      ? eventType
      : 'charge.dispute.closed';
  }
  if (['refunded', 'partially_refunded', 'refund_pending', 'refund_failed']
    .includes(snapshot.paymentStatus)) {
    if (eventType === 'refund.failed' && snapshot.paymentStatus === 'refund_failed') return eventType;
    if (['refund.created', 'refund.updated', 'charge.refunded'].includes(eventType)) return eventType;
    return 'refund.updated';
  }
  return eventType === 'checkout.session.async_payment_succeeded'
    ? eventType
    : 'checkout.session.completed';
}

function persistedRevisionMatches(record, snapshot, expectedCursor, providerEventType, providerEventId) {
  return record?.state === 'paid'
    && record.providerEventId === providerEventId
    && record.providerEventCursor === expectedCursor
    && record.providerEventType === providerEventType
    && record.paymentStatus === snapshot.paymentStatus
    && record.refundedCents === snapshot.refundTotals.succeededCents
    && record.disputedCents === snapshot.disputeTotals.disputedCents
    && record.chargedBackCents === snapshot.disputeTotals.chargedBackCents;
}

async function deliverFinancialRevision({ event, bundle, deps, buyerConfirmation = false }) {
  integrity(Number.isInteger(event.created) && event.created > 0, 'invalid_event_created');
  const { reservation, snapshot, offer } = bundle;
  integrity(offer && snapshot.charge.amountCents === offer.amountCents
    && String(snapshot.charge.currency || '').toLowerCase() === offer.currency,
  'stripe_offer_snapshot_missing');
  const digest = stripeFinancialDigest(snapshot);
  const revision = {
    digest,
    key: `financial:${bundle.charge.id}:${digest}`,
  };
  const providerEventType = cursorType(event.type, snapshot);
  const cursor = deps.enforceProviderBinding
    ? financialEventCursor({
      provider: 'stripe',
      providerEventCreated: event.created,
      providerEventId: event.id,
      providerEventType,
      paymentStatus: snapshot.paymentStatus,
    })
    : null;

  return deps.withReservationLock({
    provider: 'stripe',
    reservationKey: reservation.requestId,
    execute: async () => {
      const basePayload = {
        kind: 'stripe_financial_v1',
        providerProtocol: 'stripe_checkout_v1',
        revisionDigest: revision.digest,
        requestId: reservation.requestId,
        slot: reservation.slot,
        offerAmountCents: offer.amountCents,
        offerCurrency: offer.currency,
        offerSku: offer.sku,
        contractVersion: offer.contractVersion,
        snapshot,
      };
      const inventory = await deps.runEffect({
        provider: 'stripe',
        eventId: revision.key,
        channel: 'inventory',
        payload: basePayload,
        execute: async () => {
          const markArgs = {
            requestId: reservation.requestId,
            slot: reservation.slot,
            provider: 'stripe',
            providerRef: bundle.providerRef,
            paymentStatus: snapshot.paymentStatus,
          };
          if (deps.enforceProviderBinding) {
            Object.assign(markArgs, {
              // Stripe só oferece precisão de segundos em `created`. Eventos
              // distintos no mesmo segundo precisam do event.id como último
              // desempate; a charge é estável e colidiria entre revisões.
              providerEventId: event.id,
              providerEventCreated: event.created,
              providerEventType,
              refundedCents: snapshot.refundTotals.succeededCents,
              disputedCents: snapshot.disputeTotals.disputedCents,
              chargedBackCents: snapshot.disputeTotals.chargedBackCents,
            });
          } else if (REFUND_EVENT_TYPES.has(event.type) || DISPUTE_EVENT_TYPES.has(event.type)) {
            Object.assign(markArgs, {
              providerEventId: event.id,
              providerEventCreated: event.created,
              providerEventType: event.type,
            });
          }
          const result = await deps.markPaid(markArgs);
          return { ok: true, id: transitionOutcome(result) };
        },
      });
      if (inventory.externalRef === 'stale') return ignored('stale_financial_revision');

      // Fecha a janela A-aplica/falha-notify, B-aplica, retry-A-notifica velho.
      // getReservation é consistente; o suffix aceita outro gatilho que tenha
      // revelado exatamente o mesmo snapshot/revision key.
      if (deps.enforceProviderBinding) {
        const current = await deps.getReservation(reservation.requestId);
        if (!persistedRevisionMatches(current, snapshot, cursor.cursor, providerEventType, event.id)) {
          return ignored('superseded_financial_revision');
        }
      }

      const notification = {
        provider: 'stripe',
        method: 'cartão (até 12x)',
        amountCents: amountFor(snapshot),
        currency: snapshot.charge.currency,
        ...bundle.contact,
        reference: bundle.charge.id,
        status: statusFor(snapshot.paymentStatus),
        statusCode: snapshot.paymentStatus,
        statusDetail: statusDetail(snapshot),
        sku: offer.sku,
        contractVersion: offer.contractVersion,
        eventId: revision.key,
        eventCreatedAt: snapshot.providerStateCreated
          ? new Date(snapshot.providerStateCreated * 1000).toISOString()
          : null,
      };
      const channels = [
        deps.runEffect({
          provider: 'stripe',
          eventId: revision.key,
          channel: 'internal_email',
          payload: { ...basePayload, channel: 'internal_email' },
          execute: ({ idempotencyKey }) => deps.sendInternal(notification, { idempotencyKey }),
        }),
        deps.runEffect({
          provider: 'stripe',
          eventId: revision.key,
          channel: 'slack',
          payload: { ...basePayload, channel: 'slack' },
          execute: () => deps.sendSlack(notification),
        }),
      ];

      if (buyerConfirmation && snapshot.paymentStatus === 'paid' && bundle.contact.email) {
        const buyerEventId = `buyer-confirmation:${bundle.session?.id || bundle.charge.id}`;
        channels.push(deps.runEffect({
          provider: 'stripe',
          eventId: buyerEventId,
          channel: 'buyer_email',
          payload: {
            kind: 'stripe_buyer_confirmation_v1',
            providerProtocol: 'stripe_checkout_v1',
            requestId: reservation.requestId,
            slot: reservation.slot,
            sessionId: bundle.session?.id || null,
            chargeId: bundle.charge.id,
            amountCents: snapshot.charge.amountCents,
            currency: snapshot.charge.currency,
            sku: offer.sku,
            contractVersion: offer.contractVersion,
          },
          execute: ({ idempotencyKey }) => deps.sendBuyer({
            ...bundle.contact,
            reference: bundle.session?.id || bundle.charge.id,
            reservationCode: reservationCode(reservation.requestId),
            amountCents: snapshot.charge.amountCents,
            method: 'Cartão (até 12x)',
            sku: offer.sku,
            contractVersion: offer.contractVersion,
          }, { idempotencyKey }),
        }));
      } else if (deps.enforceProviderBinding
        && BUYER_FINANCIAL_STATUSES.has(snapshot.paymentStatus)
        && bundle.contact.email) {
        const buyerState = buyerFinancialState(snapshot);
        const buyerEventId = `buyer-financial:${bundle.charge.id}:${stripeFinancialDigest(buyerState)}`;
        channels.push(deps.runEffect({
          provider: 'stripe',
          eventId: buyerEventId,
          channel: 'buyer_financial',
          payload: { kind: 'stripe_buyer_financial_v1', ...buyerState },
          execute: ({ idempotencyKey }) => deps.sendBuyerFinancial({
            ...notification,
            reference: bundle.session?.id || bundle.charge.id,
          }, { idempotencyKey }),
        }));
      }

      await completeChannels(channels);
      return {
        ok: true,
        revision: revision.digest,
        correlationEventId: event.id,
      };
    },
  });
}

async function releaseTerminalSession({ event, session, reservation, deps }) {
  return deps.withReservationLock({
    provider: 'stripe',
    reservationKey: reservation.requestId,
    execute: async () => {
      if (deps.enforceProviderBinding) {
        integrity(typeof deps.getReservation === 'function', 'stripe_binding_dependencies_missing');
        const attached = await deps.getReservation(reservation.requestId);
        assertInventoryBinding(attached, reservation, session);
      } else {
        validateSession(session, currentOffer());
      }
      const release = await deps.runEffect({
        provider: 'stripe',
        eventId: `terminal:${session.id}:${event.type}`,
        channel: 'inventory_release',
        payload: {
          eventType: event.type,
          objectId: session.id,
          requestId: reservation.requestId,
          slot: reservation.slot,
          paymentStatus: session.payment_status,
        },
        execute: async () => {
          const applied = await deps.release({
            requestId: reservation.requestId,
            slot: reservation.slot,
            provider: 'stripe',
            providerRef: session.id,
            reason: event.type === 'checkout.session.expired'
              ? 'stripe_expired_webhook'
              : 'stripe_async_payment_failed',
          });
          return { ok: true, id: applied === false ? 'unchanged' : 'released' };
        },
      });
      return release.externalRef === 'released'
        ? { ok: true, released: true }
        : ignored('reservation_not_released');
    },
  });
}

/** Processador com I/O injetável; produção ativa enforceProviderBinding. */
export async function processStripeEvent(event, dependencies = {}) {
  const deps = { ...DEFAULT_DEPS, ...dependencies };
  integrity(event?.object === 'event', 'invalid_event_object');
  integrity(/^evt_[A-Za-z0-9]+$/.test(String(event?.id || '')), 'invalid_event_id');
  if (!SESSION_EVENT_TYPES.has(event.type)
      && !REFUND_EVENT_TYPES.has(event.type)
      && !DISPUTE_EVENT_TYPES.has(event.type)) return ignored(event.type);
  integrity(Number.isInteger(event.created) && event.created > 0, 'invalid_event_created');

  if (SESSION_EVENT_TYPES.has(event.type)) {
    const session = event.data?.object;
    const reservation = validateSession(session);
    if (!reservation) return ignored('outro_produto');
    if (event.type === 'checkout.session.expired') {
      integrity(session.status === 'expired' && session.payment_status !== 'paid', 'invalid_expiration_state');
      return releaseTerminalSession({ event, session, reservation, deps });
    }
    if (event.type === 'checkout.session.async_payment_failed') {
      integrity(['complete', 'expired'].includes(session.status)
        && session.payment_status !== 'paid', 'invalid_async_failure_state');
      return releaseTerminalSession({ event, session, reservation, deps });
    }
    if (event.type === 'checkout.session.completed' && session.payment_status !== 'paid') {
      return ignored('pagamento_pendente');
    }
    integrity(session.payment_status === 'paid' && session.status === 'complete', 'invalid_paid_session_state');
    const bundle = await resolvePaidSession(event, session, reservation, deps);
    return deliverFinancialRevision({ event, bundle, deps, buyerConfirmation: true });
  }

  const bundle = await resolveFinancialTrigger(event, deps);
  if (!bundle) return ignored('outro_produto');
  return deliverFinancialRevision({ event, bundle, deps });
}

function reconciliationEventId(snapshot) {
  const rank = {
    paid: 10,
    refund_pending: 20,
    refund_failed: 25,
    partially_refunded: 30,
    refunded: 40,
    disputed: 50,
    charged_back: 60,
  }[snapshot.paymentStatus] || 0;
  const cents = (value) => String(Math.max(0, Number(value) || 0)).padStart(12, '0');
  return `evt_reconcile${String(rank).padStart(2, '0')}`
    + `${cents(snapshot.refundTotals.succeededCents)}`
    + `${cents(snapshot.disputeTotals.disputedCents)}`
    + `${cents(snapshot.disputeTotals.chargedBackCents)}`
    + stripeFinancialDigest(snapshot).slice(0, 24);
}

/**
 * Reprocessa uma Session paga pela mesma cadeia canônica e pelo mesmo outbox
 * do webhook. Assim o cron recupera webhook perdido sem inventar um snapshot
 * financeiro parcial nem duplicar e-mail/Slack.
 */
export async function reconcileStripeCheckoutSession(session, dependencies = {}) {
  const deps = { ...DEFAULT_DEPS, ...dependencies };
  const reservation = validateSession(session);
  if (!reservation) return ignored('outro_produto');
  integrity(session.status === 'complete' && session.payment_status === 'paid',
    'stripe_reconciliation_session_not_paid');

  const seedEvent = {
    object: 'event',
    id: 'evt_reconcileSeed',
    created: Number(session.created),
    type: 'checkout.session.completed',
    data: { object: session },
  };
  integrity(Number.isInteger(seedEvent.created) && seedEvent.created > 0,
    'invalid_event_created');
  const bundle = await resolvePaidSession(seedEvent, session, reservation, deps);
  const event = {
    ...seedEvent,
    id: reconciliationEventId(bundle.snapshot),
    created: bundle.snapshot.providerStateCreated,
    type: cursorType('checkout.session.completed', bundle.snapshot),
  };
  return deliverFinancialRevision({
    event,
    bundle,
    deps,
    buyerConfirmation: bundle.snapshot.paymentStatus === 'paid',
  });
}

export async function stripeGet(key, path, {
  deadlineAt = Number.POSITIVE_INFINITY,
  fetchImpl = fetch,
  now = Date.now,
} = {}) {
  const remainingMs = Number(deadlineAt) - Number(now());
  if (Number.isFinite(Number(deadlineAt)) && remainingMs < 250) {
    throw new StripeProviderError('stripe_handler_deadline_reached');
  }
  const controller = new AbortController();
  const timeoutMs = Number.isFinite(remainingMs)
    ? Math.min(PROVIDER_TIMEOUT_MS, remainingMs)
    : PROVIDER_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`https://api.stripe.com/v1${path}`, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new StripeProviderError('stripe_refetch_failed', response.status);
    return await response.json();
  } catch (error) {
    if (error instanceof StripeProviderError) throw error;
    throw new StripeProviderError('stripe_fetch_failed');
  } finally {
    clearTimeout(timer);
  }
}

function stripeList(list, code) {
  integrity(list?.object === 'list' && Array.isArray(list.data), code);
  integrity(list.has_more === false, `${code}_incomplete`);
  return list.data;
}

function stripeProviderDependencies(key, deadlineAt, fetchImpl) {
  return {
    enforceProviderBinding: true,
    withReservationLock: (args) => withWebhookReservationLock(args),
    getReservation: (requestId) => getReservation(requestId),
    fetchCharge: async (chargeId) => {
      const charge = await stripeGet(key, `/charges/${encodeURIComponent(chargeId)}`, {
        deadlineAt, fetchImpl,
      });
      if (!charge) throw new StripeProviderError('stripe_charge_not_found', 404);
      return charge;
    },
    fetchPaymentIntent: async (paymentIntentId) => {
      const paymentIntent = await stripeGet(
        key,
        `/payment_intents/${encodeURIComponent(paymentIntentId)}`,
        { deadlineAt, fetchImpl },
      );
      if (!paymentIntent) throw new StripeProviderError('stripe_payment_intent_not_found', 404);
      return paymentIntent;
    },
    fetchSessionForPaymentIntent: async (paymentIntentId) => {
      const list = await stripeGet(
        key,
        `/checkout/sessions?payment_intent=${encodeURIComponent(paymentIntentId)}&limit=2`,
        { deadlineAt, fetchImpl },
      );
      const sessions = stripeList(list, 'invalid_checkout_session_list');
      integrity(sessions.length === 1, 'checkout_session_binding_ambiguous');
      return sessions[0];
    },
    listRefunds: async (chargeId) => {
      const list = await stripeGet(key, `/refunds?charge=${encodeURIComponent(chargeId)}&limit=100`, {
        deadlineAt, fetchImpl,
      });
      return stripeList(list, 'invalid_refund_list');
    },
    listDisputes: async (chargeId) => {
      const list = await stripeGet(key, `/disputes?charge=${encodeURIComponent(chargeId)}&limit=100`, {
        deadlineAt, fetchImpl,
      });
      return stripeList(list, 'invalid_dispute_list');
    },
  };
}

export async function reconcileStripeSessionById(key, sessionId, {
  deadlineAt = Date.now() + PROVIDER_DEADLINE_MS,
  fetchImpl,
} = {}) {
  if (!key?.startsWith('sk_') || !/^cs_[A-Za-z0-9_]+$/.test(String(sessionId || ''))) {
    throw new StripeProviderError('stripe_reconciliation_not_configured');
  }
  const session = await stripeGet(key, `/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    deadlineAt, fetchImpl,
  });
  if (!session) throw new StripeProviderError('stripe_session_not_found', 404);
  return reconcileStripeCheckoutSession(
    session,
    stripeProviderDependencies(key, deadlineAt, fetchImpl),
  );
}

export const reconcileStripeCanonicalSession = (key, session, {
  deadlineAt = Date.now() + PROVIDER_DEADLINE_MS,
  fetchImpl,
} = {}) => reconcileStripeCheckoutSession(
  session,
  stripeProviderDependencies(key, deadlineAt, fetchImpl),
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !key.startsWith('sk_')) return res.status(503).json({ error: 'stripe_not_configured' });
  if (!webhookSecret || !webhookSecret.startsWith('whsec_')) {
    return res.status(503).json({ error: 'stripe_webhook_not_configured' });
  }

  let rawBody;
  try { rawBody = await readRawBody(req); }
  catch (error) {
    return res.status(error?.message === 'payload_too_large' ? 413 : 400).json({ error: 'invalid_payload' });
  }
  if (!rawBody) return res.status(400).json({ error: 'raw_body_required' });
  const signature = String(req.headers?.['stripe-signature'] || '');
  if (!verifyStripeSignature({ rawBody, signature, secret: webhookSecret })) {
    return res.status(400).json({ error: 'invalid_signature' });
  }
  let body;
  try { body = JSON.parse(rawBody); }
  catch { return res.status(400).json({ error: 'invalid_json' }); }
  const eventId = String(body?.id || '');
  if (!/^evt_[A-Za-z0-9]+$/.test(eventId)) return res.status(400).json({ error: 'invalid_event_id' });
  const providerDeadlineAt = Date.now() + PROVIDER_DEADLINE_MS;

  try {
    const event = await stripeGet(key, `/events/${encodeURIComponent(eventId)}`, {
      deadlineAt: providerDeadlineAt,
    });
    // Um evento assinado ainda deve existir durante toda a janela de retry da
    // Stripe. 404 aqui pode ser consistência/conta/chave incorreta; confirmar
    // entrega com 200 perderia o evento definitivamente.
    if (!event) throw new StripeProviderError('stripe_event_not_found', 404);
    if (event.id !== eventId) throw new StripeWebhookIntegrityError('event_id_mismatch');
    const result = await processStripeEvent(
      event,
      stripeProviderDependencies(key, providerDeadlineAt),
    );
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof StripeWebhookIntegrityError) {
      console.error('[stripe-webhook] evento rejeitado por integridade:', eventId, error.code);
      return res.status(500).json({ error: 'stripe_event_integrity_failed' });
    }
    if (error instanceof WebhookOutboxBusyError) {
      res.setHeader('Retry-After', '60');
      return res.status(503).json({ error: 'webhook_effect_in_progress' });
    }
    console.error('[stripe-webhook] falha operacional:', eventId, error?.name || 'Error');
    return res.status(500).json({ error: 'stripe_webhook_processing_failed' });
  }
}
