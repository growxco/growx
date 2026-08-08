/**
 * Inventário transacional da pré-venda.
 *
 * A tabela DynamoDB tem somente uma partition key string chamada `pk`.
 * SLOT não recebe TTL: um slot `held` continua ocupado até reconciliação
 * explícita com o provedor. Guardas pseudonimizados e registros de risco têm
 * TTL limitado. Isso evita que um pagamento lento seja aceito depois de o
 * mesmo slot ter sido entregue a outra pessoa.
 */
import {
  BatchGetItemCommand,
  GetItemCommand,
  TransactWriteItemsCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { createHmac, randomUUID } from 'node:crypto';

import {
  MP_ORDER_EXTERNAL_REFERENCE_PATTERN,
  MP_ORDER_ID_PATTERN,
  REQUEST_ID_PATTERN,
} from '../../shared/provider-identifiers.js';
import { OFERTA } from '../../src/lib/oferta.js';
import { getDynamoClient } from './dynamo-client.js';

const VALID_HASH = /^[0-9a-f]{64}$/i;
const VALID_CONTRACT_VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const VALID_OFFER_CURRENCY = /^[A-Z]{3}$/;
const VALID_OFFER_SKU = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const VALID_PROVIDER_EVENT_ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const VALID_PROVIDER_EVENT_TYPE = /^[a-z0-9][a-z0-9._:-]{0,99}$/;
const VALID_PROVIDER = new Set(['stripe', 'mercadopago']);
const VALID_PROVIDER_PROTOCOL = new Set([
  'stripe_checkout_v1',
  'mp_checkout_pro_v1',
  'mp_orders_v1',
]);
const VALID_STATES = new Set(['held', 'paid', 'released']);
export const RESERVATION_RATE_LIMIT = 3;
export const RESERVATION_RATE_BUCKET_MS = 31 * 60 * 1000;
export const RATE_RETENTION_SECONDS = 48 * 60 * 60;
export const RELEASED_GUARD_RETENTION_SECONDS = 30 * 24 * 60 * 60;
export const PAID_GUARD_RETENTION_SECONDS = 5 * 365 * 24 * 60 * 60;
export const INVENTORY_READ_MAX_ATTEMPTS = 10;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const inventoryReadBackoffMs = (attempt, random = Math.random) => Math.floor(
  random() * Math.min(1000, 50 * (2 ** attempt)),
);
const retryableDynamoRead = (error) => Boolean(error?.$retryable) || new Set([
  'ThrottlingException',
  'ProvisionedThroughputExceededException',
  'RequestLimitExceeded',
  'InternalServerError',
]).has(error?.name);

export class InventoryUnavailableError extends Error {
  constructor(message = 'inventory_unavailable', cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'InventoryUnavailableError';
  }
}

export class InventorySoldOutError extends Error {
  constructor() {
    super('inventory_sold_out');
    this.name = 'InventorySoldOutError';
  }
}

export class InventoryConflictError extends Error {
  constructor(message = 'inventory_conflict') {
    super(message);
    this.name = 'InventoryConflictError';
  }
}

export class InventoryBuyerConflictError extends Error {
  constructor() {
    super('comprador_ja_reservado');
    this.name = 'InventoryBuyerConflictError';
  }
}

export class InventoryRateLimitError extends Error {
  constructor() {
    super('muitas_reservas');
    this.name = 'InventoryRateLimitError';
  }
}

export class InventoryLatePaymentReassignedError extends Error {
  constructor() {
    super('late_payment_slot_reassigned');
    this.name = 'InventoryLatePaymentReassignedError';
  }
}

const tableFrom = (tableName) => tableName || process.env.PREVENDA_INVENTORY_TABLE || '';
const clientFrom = (client) => client || getDynamoClient();
const requestPk = (requestId) => `REQUEST#${requestId}`;
const buyerPk = (buyerKey) => `BUYER#${buyerKey}`;
export const rateBucketFor = (now) => Math.floor(now.getTime() / RESERVATION_RATE_BUCKET_MS);
const ratePk = (riskKey, bucket) => `RATE#${riskKey}#${bucket}`;
const reconciliationLeasePk = (minute) => `LEASE#RECONCILE#${minute}`;
const financialReconciliationLeasePk = (minute) => `LEASE#FINANCIAL#${minute}`;
export const slotPk = (index) => `SLOT#${String(index).padStart(3, '0')}`;
export const SLOT_KEYS = Object.freeze(
  Array.from({ length: OFERTA.loteTotal }, (_, index) => slotPk(index + 1)),
);

const s = (value) => ({ S: String(value) });
const n = (value) => ({ N: String(value) });

export function providerProtocolFor({ provider, providerRef, providerProtocol } = {}) {
  const explicit = String(providerProtocol || '').trim();
  const inferred = provider === 'stripe'
    ? 'stripe_checkout_v1'
    : (MP_ORDER_ID_PATTERN.test(String(providerRef || ''))
        ? 'mp_orders_v1'
        : 'mp_checkout_pro_v1');
  const protocol = explicit || inferred;
  if (!VALID_PROVIDER_PROTOCOL.has(protocol)) {
    throw new InventoryConflictError('invalid_provider_protocol');
  }
  if (provider === 'stripe' && protocol !== 'stripe_checkout_v1') {
    throw new InventoryConflictError('invalid_provider_protocol');
  }
  if (provider === 'mercadopago' && protocol === 'stripe_checkout_v1') {
    throw new InventoryConflictError('invalid_provider_protocol');
  }
  if (provider === 'mercadopago' && protocol === 'mp_orders_v1'
      && !MP_ORDER_ID_PATTERN.test(String(providerRef || ''))) {
    throw new InventoryConflictError('invalid_provider_reference');
  }
  return protocol;
}

export const deriveReservationKey = (secret, purpose, value) => createHmac('sha256', secret)
  .update(`growx-prevenda:${purpose}\0${String(value)}`, 'utf8')
  .digest('hex');

function requireConfig({ client, tableName } = {}) {
  const table = tableFrom(tableName);
  if (!table) throw new InventoryUnavailableError('inventory_not_configured');
  return { client: clientFrom(client), table };
}

function attrS(item, key) {
  return item?.[key]?.S || '';
}

function attrN(item, key) {
  const value = Number(item?.[key]?.N);
  return Number.isFinite(value) ? value : null;
}

function decode(item) {
  if (!item) return null;
  return {
    pk: attrS(item, 'pk'),
    requestId: attrS(item, 'request_id'),
    reservationId: attrS(item, 'reservation_id'),
    slot: attrS(item, 'slot'),
    provider: attrS(item, 'provider'),
    providerProtocol: attrS(item, 'provider_protocol') || null,
    providerExternalReference: attrS(item, 'provider_external_reference') || null,
    providerIdempotencyKey: attrS(item, 'provider_idempotency_key') || null,
    state: attrS(item, 'state'),
    providerRef: attrS(item, 'provider_ref') || null,
    lastProviderRef: attrS(item, 'last_provider_ref') || null,
    providerUrl: attrS(item, 'provider_url') || null,
    providerExpiresAt: attrS(item, 'provider_expires_at') || null,
    holdExpiresAt: attrN(item, 'hold_expires_at'),
    createdAt: attrS(item, 'created_at') || null,
    updatedAt: attrS(item, 'updated_at') || null,
    paymentStatus: attrS(item, 'payment_status') || null,
    refundedCents: attrN(item, 'refunded_cents'),
    disputedCents: attrN(item, 'disputed_cents'),
    chargedBackCents: attrN(item, 'charged_back_cents'),
    offerAmountCents: attrN(item, 'offer_amount_cents'),
    offerCurrency: attrS(item, 'offer_currency') || null,
    offerSku: attrS(item, 'offer_sku') || null,
    contractVersion: attrS(item, 'contract_version') || null,
    termsAcknowledgedAt: attrS(item, 'terms_acknowledged_at') || null,
    providerEventCursor: attrS(item, 'provider_event_cursor') || null,
    providerEventCreated: attrS(item, 'provider_event_created_at') || null,
    providerEventCreatedAt: attrS(item, 'provider_event_created_at') || null,
    providerEventId: attrS(item, 'provider_event_id') || null,
    providerEventType: attrS(item, 'provider_event_type') || null,
    financialReconciledAt: attrS(item, 'financial_reconciled_at') || null,
    financialReconciliationAttemptedAt: attrS(item, 'financial_reconciliation_attempted_at') || null,
    financialReconciliationStatus: attrS(item, 'financial_reconciliation_status') || null,
    financialReconciliationError: attrS(item, 'financial_reconciliation_error') || null,
    ownerToken: attrS(item, 'owner_token') || null,
    buyerPk: attrS(item, 'buyer_pk') || null,
    emailHash: attrS(item, 'email_hash') || null,
    ratePk: attrS(item, 'rate_pk') || null,
    providerSearchNegativeCount: attrN(item, 'provider_search_negative_count') || 0,
    providerSearchFirstAt: attrS(item, 'provider_search_first_at') || null,
    providerSearchLastAt: attrS(item, 'provider_search_last_at') || null,
  };
}

function normalizeProviderIntent({
  requestId,
  provider,
  providerProtocol,
  providerExternalReference,
  providerIdempotencyKey,
} = {}, errorClass = InventoryConflictError) {
  const protocol = String(providerProtocol || '').trim();
  const externalReference = String(providerExternalReference || '').trim();
  const idempotencyKey = String(providerIdempotencyKey || '').trim();
  const hasIntent = Boolean(protocol || externalReference || idempotencyKey);
  if (!hasIntent) return null;
  const match = externalReference.match(MP_ORDER_EXTERNAL_REFERENCE_PATTERN);
  if (provider !== 'mercadopago'
      || protocol !== 'mp_orders_v1'
      || !match
      || match[1].toLowerCase() !== String(requestId || '').toLowerCase()
      || idempotencyKey !== String(requestId || '')) {
    throw new errorClass('invalid_provider_intent');
  }
  return {
    requestId: String(requestId),
    provider,
    providerProtocol: protocol,
    providerExternalReference: externalReference,
    providerIdempotencyKey: idempotencyKey,
  };
}

function providerIntentFromRecord(record, errorClass = InventoryUnavailableError) {
  const hasDurableIntent = Boolean(
    record?.providerExternalReference || record?.providerIdempotencyKey,
  );
  if (!hasDurableIntent) return null;
  return normalizeProviderIntent(record, errorClass);
}

function sameProviderIntent(left, right) {
  const leftIntent = providerIntentFromRecord(left);
  const rightIntent = providerIntentFromRecord(right);
  if (!leftIntent || !rightIntent) return leftIntent === rightIntent;
  return leftIntent.providerProtocol === rightIntent.providerProtocol
    && leftIntent.providerExternalReference === rightIntent.providerExternalReference
    && leftIntent.providerIdempotencyKey === rightIntent.providerIdempotencyKey;
}

function currentOfferSnapshot(provider) {
  return {
    offerAmountCents: provider === 'stripe' ? OFERTA.cartaoCentavos : OFERTA.pixCentavos,
    offerCurrency: 'BRL',
    offerSku: provider === 'stripe' ? 'prevenda_cartao' : 'prevenda_pix',
    contractVersion: OFERTA.contratoVersao,
  };
}

function validateOfferSnapshot(snapshot, errorClass = InventoryConflictError) {
  if (!Number.isInteger(snapshot?.offerAmountCents)
      || snapshot.offerAmountCents <= 0
      || snapshot.offerAmountCents > 100_000_000) {
    throw new errorClass('invalid_offer_amount');
  }
  if (!VALID_OFFER_CURRENCY.test(String(snapshot?.offerCurrency || ''))) {
    throw new errorClass('invalid_offer_currency');
  }
  if (!VALID_OFFER_SKU.test(String(snapshot?.offerSku || ''))) {
    throw new errorClass('invalid_offer_sku');
  }
  if (!VALID_CONTRACT_VERSION.test(String(snapshot?.contractVersion || ''))) {
    throw new errorClass('invalid_contract_version');
  }
  return {
    offerAmountCents: snapshot.offerAmountCents,
    offerCurrency: snapshot.offerCurrency,
    offerSku: snapshot.offerSku,
    contractVersion: snapshot.contractVersion,
  };
}

function sameOfferSnapshot(left, right) {
  return left?.offerAmountCents === right?.offerAmountCents
    && left?.offerCurrency === right?.offerCurrency
    && left?.offerSku === right?.offerSku
    && left?.contractVersion === right?.contractVersion;
}

function providerEventTimeMs(value) {
  let millis;
  if (value instanceof Date) millis = value.getTime();
  else if (typeof value === 'number' && Number.isFinite(value)) {
    millis = value < 1_000_000_000_000 ? value * 1000 : value;
  } else if (typeof value === 'string' && value.trim()) millis = Date.parse(value);
  if (!Number.isInteger(millis) || millis < 946_684_800_000 || millis > 9_999_999_999_999) {
    throw new InventoryConflictError('invalid_provider_event_created');
  }
  return millis;
}

/*
 * O timestamp do provedor sempre domina. A prioridade abaixo existe somente
 * para eventos distintos criados no mesmo milissegundo/segundo (Stripe tem
 * precisão de segundos), evitando que um checkout sobrescreva refund/disputa.
 * Ela não transforma estados financeiros em um enum monotônico: um evento
 * mais novo pode legitimamente voltar de `disputed` para `paid` (disputa ganha).
 */
function providerEventTiePriority(provider, eventType, paymentStatus) {
  if (provider === 'stripe') {
    if (eventType === 'checkout.session.completed'
        || eventType === 'checkout.session.async_payment_succeeded'
        || eventType === 'reconcile.checkout.session') return paymentStatus === 'paid' ? 100 : null;
    if (eventType === 'charge.refunded'
        || eventType === 'refund.created'
        || eventType === 'refund.updated') {
      if (paymentStatus === 'refund_pending') return 200;
      if (paymentStatus === 'refund_failed') return 250;
      if (paymentStatus === 'partially_refunded') return 300;
      if (paymentStatus === 'refunded') return 400;
      return null;
    }
    if (eventType === 'refund.failed') return paymentStatus === 'refund_failed' ? 250 : null;
    if (eventType === 'charge.dispute.created'
        || eventType === 'charge.dispute.updated'
        || eventType === 'charge.dispute.funds_withdrawn') {
      return paymentStatus === 'disputed' ? 500 : null;
    }
    if (eventType === 'charge.dispute.closed') {
      return paymentStatus === 'paid' || paymentStatus === 'charged_back' ? 600 : null;
    }
    if (eventType === 'charge.dispute.funds_reinstated') {
      return ['paid', 'charged_back', 'partially_refunded', 'refunded'].includes(paymentStatus)
        ? 700
        : null;
    }
  }
  if (provider === 'mercadopago') {
    const reconciledPayment = eventType === 'reconcile.payment';
    const reconciledOrder = eventType === 'reconcile.order';
    if ((eventType === 'payment.approved'
        || eventType === 'order.processed'
        || reconciledPayment
        || reconciledOrder)
        && paymentStatus === 'approved') return 100;
    if (eventType === 'payment.refund_pending' && paymentStatus === 'refund_pending') return 200;
    if (eventType === 'payment.refund_failed' && paymentStatus === 'refund_failed') return 250;
    if ((eventType === 'payment.partially_refunded' || reconciledPayment)
        && paymentStatus === 'partially_refunded') return 300;
    if ((eventType === 'payment.refunded' || reconciledPayment) && paymentStatus === 'refunded') return 400;
    if ((eventType === 'payment.disputed' || eventType === 'chargeback.opened' || reconciledPayment)
        && paymentStatus === 'disputed') return 500;
    if ((eventType === 'chargeback.settled' || reconciledPayment) && paymentStatus === 'charged_back') return 600;
    if (eventType === 'chargeback.reimbursed'
        && ['approved', 'partially_refunded', 'refunded'].includes(paymentStatus)) return 700;
  }
  return null;
}

export function financialEventCursor({
  provider,
  providerEventCreated,
  providerEventId,
  providerEventType,
  paymentStatus,
}) {
  if (!VALID_PROVIDER.has(provider)
      || !VALID_PROVIDER_EVENT_ID.test(String(providerEventId || ''))
      || !VALID_PROVIDER_EVENT_TYPE.test(String(providerEventType || ''))) {
    throw new InventoryConflictError('invalid_provider_event');
  }
  const priority = providerEventTiePriority(provider, providerEventType, paymentStatus);
  if (priority === null) throw new InventoryConflictError('invalid_provider_event_transition');
  const millis = providerEventTimeMs(providerEventCreated);
  const cursor = [
    'v1',
    provider,
    String(millis).padStart(13, '0'),
    String(priority).padStart(3, '0'),
    providerEventId,
  ].join('|');
  return {
    cursor,
    createdAt: new Date(millis).toISOString(),
    eventId: String(providerEventId),
    eventType: String(providerEventType),
  };
}

function validateRequest(requestId, provider) {
  if (!REQUEST_ID_PATTERN.test(String(requestId || ''))) {
    throw new InventoryConflictError('invalid_request_id');
  }
  if (!VALID_PROVIDER.has(provider)) {
    throw new InventoryConflictError('invalid_provider');
  }
}

function validateReservationKeys(buyerKey, riskKey, emailHash = null) {
  if (!VALID_HASH.test(String(buyerKey || ''))) {
    throw new InventoryConflictError('invalid_buyer_key');
  }
  if (!VALID_HASH.test(String(riskKey || ''))) {
    throw new InventoryConflictError('invalid_risk_key');
  }
  if (emailHash !== null && !VALID_HASH.test(String(emailHash || ''))) {
    throw new InventoryConflictError('invalid_email_hash');
  }
}

function conditionalFailure(error) {
  if (error?.name === 'ConditionalCheckFailedException') return true;
  if (error?.name !== 'TransactionCanceledException') return false;
  const reasons = error.CancellationReasons;
  if (!Array.isArray(reasons) || !reasons.length) return false;
  const retryable = new Set(['None', 'ConditionalCheckFailed', 'TransactionConflict']);
  return reasons.some((reason) => reason.Code !== 'None')
    && reasons.every((reason) => retryable.has(reason.Code));
}

function wrapUnavailable(error) {
  if (error instanceof InventoryUnavailableError
      || error instanceof InventorySoldOutError
      || error instanceof InventoryConflictError
      || error instanceof InventoryBuyerConflictError
      || error instanceof InventoryRateLimitError
      || error instanceof InventoryLatePaymentReassignedError) return error;
  return new InventoryUnavailableError('inventory_request_failed', error);
}

async function sameRequestOrThrow(
  record,
  provider,
  buyerKey,
  options = {},
  ownerToken = null,
  emailHash = null,
  expectedIntent = undefined,
) {
  if (!record) return null;
  if (!VALID_STATES.has(record.state) || !record.slot || !record.reservationId) {
    throw new InventoryUnavailableError('inventory_request_corrupt');
  }
  if (record.provider !== provider) {
    throw new InventoryConflictError('request_provider_mismatch');
  }
  if (record.buyerPk !== buyerPk(buyerKey)) {
    throw new InventoryConflictError('request_buyer_mismatch');
  }
  if (emailHash && record.emailHash !== emailHash) {
    throw new InventoryConflictError('request_email_mismatch');
  }
  const durableIntent = providerIntentFromRecord(record);
  if (expectedIntent !== undefined
      && (Boolean(expectedIntent) !== Boolean(durableIntent)
        || (expectedIntent && !sameProviderIntent(record, expectedIntent)))) {
    throw new InventoryConflictError('request_provider_intent_mismatch');
  }
  validateOfferSnapshot(record, InventoryUnavailableError);

  // REQUEST é o guarda durável depois da liberação. Enquanto a reserva ainda
  // pode cobrar/produzir efeitos financeiros, SLOT e BUYER precisam provar a
  // mesma identidade e o mesmo snapshot imutável em leituras fortes.
  if (record.state !== 'released') {
    const [slotItem, buyerItem] = await Promise.all([
      getItem(record.slot, options),
      getItem(buyerPk(buyerKey), options),
    ]);
    const records = [decode(slotItem), decode(buyerItem)];
    if (!records.every((candidate) => candidate
        && candidate.reservationId === record.reservationId
        && candidate.requestId === record.requestId
        && candidate.slot === record.slot
        && candidate.provider === record.provider
        && candidate.state === record.state
        && (!emailHash || candidate.emailHash === emailHash)
        && sameProviderIntent(candidate, record)
        && candidate.providerSearchNegativeCount === record.providerSearchNegativeCount
        && candidate.providerSearchFirstAt === record.providerSearchFirstAt
        && candidate.providerSearchLastAt === record.providerSearchLastAt
        && sameOfferSnapshot(candidate, record))) {
      throw new InventoryUnavailableError('inventory_reservation_snapshot_mismatch');
    }
  }
  return {
    ...record,
    ...(durableIntent || {}),
    created: Boolean(ownerToken && record.ownerToken === ownerToken),
  };
}

async function getItem(pk, options = {}) {
  const { client, table } = requireConfig(options);
  try {
    const response = await client.send(new GetItemCommand({
      TableName: table,
      Key: { pk: s(pk) },
      ConsistentRead: true,
    }));
    return response.Item || null;
  } catch (error) {
    throw wrapUnavailable(error);
  }
}

export async function getReservation(requestId, options = {}) {
  return decode(await getItem(requestPk(requestId), options));
}

/**
 * Claim distribuída por minuto para impedir dois crons de reconciliar o mesmo
 * conjunto. Não é liberada: se o worker cair, o minuto seguinte usa outra key.
 */
export async function claimReconciliationLease({
  now = new Date(),
  client,
  tableName,
} = {}) {
  const { client: db, table } = requireConfig({ client, tableName });
  const minute = Math.floor(now.getTime() / 60_000);
  const pk = reconciliationLeasePk(minute);
  try {
    await db.send(new TransactWriteItemsCommand({
      ClientRequestToken: randomUUID(),
      TransactItems: [{
        Put: {
          TableName: table,
          Item: {
            pk: s(pk),
            claimed_at: s(now.toISOString()),
            ttl: n(Math.floor(now.getTime() / 1000) + RATE_RETENTION_SECONDS),
          },
          ConditionExpression: 'attribute_not_exists(pk)',
        },
      }],
    }));
    return { acquired: true, minute };
  } catch (error) {
    if (conditionalFailure(error)) return { acquired: false, minute };
    throw wrapUnavailable(error);
  }
}

export async function claimFinancialReconciliationLease({
  now = new Date(),
  client,
  tableName,
} = {}) {
  const { client: db, table } = requireConfig({ client, tableName });
  const minute = Math.floor(now.getTime() / 60_000);
  const pk = financialReconciliationLeasePk(minute);
  try {
    await db.send(new TransactWriteItemsCommand({
      ClientRequestToken: randomUUID(),
      TransactItems: [{
        Put: {
          TableName: table,
          Item: {
            pk: s(pk),
            claimed_at: s(now.toISOString()),
            ttl: n(Math.floor(now.getTime() / 1000) + RATE_RETENTION_SECONDS),
          },
          ConditionExpression: 'attribute_not_exists(pk)',
        },
      }],
    }));
    return { acquired: true, minute };
  } catch (error) {
    if (conditionalFailure(error)) return { acquired: false, minute };
    throw wrapUnavailable(error);
  }
}

/** Lê todos os 100 slots com consistência forte. Qualquer resposta parcial falha fechada. */
export async function listSlots(options = {}) {
  const { client, table } = requireConfig(options);
  const sleep = options.readRetrySleep || wait;
  const random = options.readRetryRandom || Math.random;
  const byPk = new Map();
  let pending = SLOT_KEYS.map((pk) => ({ pk: s(pk) }));
  try {
    for (let attempt = 0; attempt < INVENTORY_READ_MAX_ATTEMPTS; attempt += 1) {
      let response;
      try {
        response = await client.send(new BatchGetItemCommand({
          RequestItems: {
            [table]: {
              Keys: pending,
              ConsistentRead: true,
            },
          },
        }));
      } catch (error) {
        if (!retryableDynamoRead(error) || attempt + 1 >= INVENTORY_READ_MAX_ATTEMPTS) throw error;
        await sleep(inventoryReadBackoffMs(attempt, random));
        continue;
      }

      for (const item of response.Responses?.[table] || []) {
        const record = decode(item);
        byPk.set(record.pk, record);
      }

      pending = response.UnprocessedKeys?.[table]?.Keys || [];
      if (!pending.length) {
        return SLOT_KEYS.map((pk) => byPk.get(pk) || { pk, state: 'released' });
      }
      if (attempt + 1 < INVENTORY_READ_MAX_ATTEMPTS) {
        await sleep(inventoryReadBackoffMs(attempt, random));
      }
    }

    throw new InventoryUnavailableError('inventory_read_incomplete');
  } catch (error) {
    throw wrapUnavailable(error);
  }
}

export async function recordFinancialReconciliation({
  reservation,
  ok,
  errorCode,
  now = new Date(),
  client,
  tableName,
}) {
  if (!reservation?.reservationId || !SLOT_KEYS.includes(reservation.slot)
      || !VALID_PROVIDER.has(reservation.provider) || typeof ok !== 'boolean') {
    throw new InventoryConflictError('invalid_financial_reconciliation_record');
  }
  const { client: db, table } = requireConfig({ client, tableName });
  const names = {
    '#state': 'state',
    '#status': 'financial_reconciliation_status',
    '#provider': 'provider',
  };
  const values = {
    ':paid': s('paid'),
    ':rid': s(reservation.reservationId),
    ':provider': s(reservation.provider),
    ':now': s(now.toISOString()),
    ':status': s(ok ? 'ok' : 'failed'),
  };
  let updateExpression = 'SET financial_reconciliation_attempted_at = :now, #status = :status';
  if (ok) {
    updateExpression += ', financial_reconciled_at = :now REMOVE financial_reconciliation_error';
  } else {
    const safeCode = /^[A-Za-z0-9_.:-]{1,80}$/.test(String(errorCode || ''))
      ? String(errorCode)
      : 'provider_failure';
    values[':error'] = s(safeCode);
    updateExpression += ', financial_reconciliation_error = :error';
  }
  try {
    await db.send(new UpdateItemCommand({
      TableName: table,
      Key: { pk: s(reservation.slot) },
      UpdateExpression: updateExpression,
      ConditionExpression: 'reservation_id = :rid AND #state = :paid AND #provider = :provider',
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }));
  } catch (error) {
    if (conditionalFailure(error)) return false;
    throw wrapUnavailable(error);
  }
  return true;
}

function startIndex(requestId) {
  let hash = 2166136261;
  for (const char of requestId) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % SLOT_KEYS.length;
}

function orderedFreeSlots(slots, requestId) {
  for (const slot of slots) {
    if (!VALID_STATES.has(slot.state)) {
      throw new InventoryUnavailableError('inventory_slot_corrupt');
    }
  }
  const free = new Set(slots.filter((slot) => slot.state === 'released').map((slot) => slot.pk));
  const start = startIndex(requestId);
  return SLOT_KEYS
    .map((_, offset) => SLOT_KEYS[(start + offset) % SLOT_KEYS.length])
    .filter((pk) => free.has(pk));
}

/**
 * Adquire exatamente um slot e cria o item REQUEST na mesma TransactWrite.
 * Requests repetidos nunca recebem outro slot.
 */
export async function acquireReservation({
  requestId,
  provider,
  buyerKey,
  emailHash,
  riskKey,
  offerAmountCents,
  offerCurrency,
  offerSku,
  contractVersion,
  providerProtocol,
  providerExternalReference,
  providerIdempotencyKey,
  providerExpiresAt,
  now = new Date(),
  client,
  tableName,
}) {
  validateRequest(requestId, provider);
  const providerIntent = normalizeProviderIntent({
    requestId,
    provider,
    providerProtocol,
    providerExternalReference,
    providerIdempotencyKey,
  });
  const normalizedEmailHash = emailHash == null ? null : String(emailHash).toLowerCase();
  validateReservationKeys(buyerKey, riskKey, normalizedEmailHash);
  const options = { client, tableName };
  const { client: db, table } = requireConfig(options);

  const existing = await getReservation(requestId, options);
  if (existing) {
    return sameRequestOrThrow(
      existing,
      provider,
      buyerKey,
      options,
      null,
      normalizedEmailHash,
      providerIntent,
    );
  }

  const defaults = currentOfferSnapshot(provider);
  const offer = validateOfferSnapshot({
    offerAmountCents: offerAmountCents ?? defaults.offerAmountCents,
    offerCurrency: String(offerCurrency ?? defaults.offerCurrency).toUpperCase(),
    offerSku: offerSku ?? defaults.offerSku,
    contractVersion: contractVersion ?? defaults.contractVersion,
  });

  const expiresAt = new Date(providerExpiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) {
    throw new InventoryConflictError('invalid_reservation_expiry');
  }

  let candidates = orderedFreeSlots(await listSlots(options), requestId);
  if (!candidates.length) throw new InventorySoldOutError();

  const createdAt = now.toISOString();
  const holdExpiresAt = Math.floor(expiresAt.getTime() / 1000);
  const reservationId = requestId;
  const ownerToken = randomUUID();
  const reservationBuyerPk = buyerPk(buyerKey);
  const reservationRatePk = ratePk(riskKey, rateBucketFor(now));
  const rateTtl = Math.floor(now.getTime() / 1000) + RATE_RETENTION_SECONDS;

  for (let attempt = 0; attempt < SLOT_KEYS.length; attempt += 1) {
    const slot = candidates[0];
    if (!slot) throw new InventorySoldOutError();
    const requestItem = {
      pk: s(requestPk(requestId)),
      request_id: s(requestId),
      reservation_id: s(reservationId),
      slot: s(slot),
      provider: s(provider),
      ...(providerIntent ? {
        provider_protocol: s(providerIntent.providerProtocol),
        provider_external_reference: s(providerIntent.providerExternalReference),
        provider_idempotency_key: s(providerIntent.providerIdempotencyKey),
      } : {}),
      state: s('held'),
      provider_expires_at: s(expiresAt.toISOString()),
      hold_expires_at: n(holdExpiresAt),
      created_at: s(createdAt),
      updated_at: s(createdAt),
      offer_amount_cents: n(offer.offerAmountCents),
      offer_currency: s(offer.offerCurrency),
      offer_sku: s(offer.offerSku),
      contract_version: s(offer.contractVersion),
      terms_acknowledged_at: s(createdAt),
      owner_token: s(ownerToken),
      buyer_pk: s(reservationBuyerPk),
      ...(normalizedEmailHash ? { email_hash: s(normalizedEmailHash) } : {}),
      rate_pk: s(reservationRatePk),
    };
    const slotItem = {
      pk: s(slot),
      request_id: s(requestId),
      reservation_id: s(reservationId),
      slot: s(slot),
      provider: s(provider),
      ...(providerIntent ? {
        provider_protocol: s(providerIntent.providerProtocol),
        provider_external_reference: s(providerIntent.providerExternalReference),
        provider_idempotency_key: s(providerIntent.providerIdempotencyKey),
      } : {}),
      state: s('held'),
      provider_expires_at: s(expiresAt.toISOString()),
      hold_expires_at: n(holdExpiresAt),
      created_at: s(createdAt),
      updated_at: s(createdAt),
      offer_amount_cents: n(offer.offerAmountCents),
      offer_currency: s(offer.offerCurrency),
      offer_sku: s(offer.offerSku),
      contract_version: s(offer.contractVersion),
      terms_acknowledged_at: s(createdAt),
      buyer_pk: s(reservationBuyerPk),
      ...(normalizedEmailHash ? { email_hash: s(normalizedEmailHash) } : {}),
    };
    const buyerItem = {
      pk: s(reservationBuyerPk),
      request_id: s(requestId),
      reservation_id: s(reservationId),
      slot: s(slot),
      provider: s(provider),
      ...(providerIntent ? {
        provider_protocol: s(providerIntent.providerProtocol),
        provider_external_reference: s(providerIntent.providerExternalReference),
        provider_idempotency_key: s(providerIntent.providerIdempotencyKey),
      } : {}),
      state: s('held'),
      created_at: s(createdAt),
      updated_at: s(createdAt),
      offer_amount_cents: n(offer.offerAmountCents),
      offer_currency: s(offer.offerCurrency),
      offer_sku: s(offer.offerSku),
      contract_version: s(offer.contractVersion),
      terms_acknowledged_at: s(createdAt),
      ...(normalizedEmailHash ? { email_hash: s(normalizedEmailHash) } : {}),
    };

    try {
      await db.send(new TransactWriteItemsCommand({
        // Cada tentativa pode apontar para outro slot. Reutilizar o mesmo token
        // com outro payload causa IdempotentParameterMismatch no DynamoDB.
        ClientRequestToken: randomUUID(),
        TransactItems: [
          {
            Put: {
              TableName: table,
              Item: requestItem,
              ConditionExpression: 'attribute_not_exists(pk)',
            },
          },
          {
            Put: {
              TableName: table,
              Item: buyerItem,
              ConditionExpression: 'attribute_not_exists(pk) OR #state = :released',
              ExpressionAttributeNames: { '#state': 'state' },
              ExpressionAttributeValues: { ':released': s('released') },
            },
          },
          {
            Update: {
              TableName: table,
              Key: { pk: s(reservationRatePk) },
              UpdateExpression: 'SET updated_at = :now, #ttl = :ttl ADD acquisitions :one',
              ConditionExpression: 'attribute_not_exists(acquisitions) OR acquisitions < :limit',
              ExpressionAttributeNames: { '#ttl': 'ttl' },
              ExpressionAttributeValues: {
                ':now': s(createdAt),
                ':one': n(1),
                ':limit': n(RESERVATION_RATE_LIMIT),
                ':ttl': n(rateTtl),
              },
            },
          },
          {
            Put: {
              TableName: table,
              Item: slotItem,
              ConditionExpression: 'attribute_not_exists(pk) OR #state = :released',
              ExpressionAttributeNames: { '#state': 'state' },
              ExpressionAttributeValues: { ':released': s('released') },
            },
          },
        ],
      }));
      return { ...decode(requestItem), created: true };
    } catch (error) {
      if (!conditionalFailure(error)) {
        // Timeout de rede pode acontecer depois do commit. O owner_token prova
        // se esta invocação foi a vencedora sem deixar um segundo handler criar
        // o mesmo checkout financeiro.
        try {
          const committed = await getReservation(requestId, options);
          if (committed) {
            return await sameRequestOrThrow(
              committed,
              provider,
              buyerKey,
              options,
              ownerToken,
              normalizedEmailHash,
              providerIntent,
            );
          }
        } catch {
          // Mantém o erro original; qualquer dúvida continua fail-closed.
        }
        throw wrapUnavailable(error);
      }

      // A mesma request pode ter vencido a corrida; nesse caso ela é idempotente.
      const concurrent = await getReservation(requestId, options);
      if (concurrent) {
        return await sameRequestOrThrow(
          concurrent,
          provider,
          buyerKey,
          options,
          ownerToken,
          normalizedEmailHash,
          providerIntent,
        );
      }

      // CancellationReasons preserva a posição dos quatro itens da transação.
      // Só classificamos buyer/rate quando a condição daquele item falhou;
      // colisão do SLOT continua sendo retry e não vira falso positivo de abuso.
      const reasons = Array.isArray(error.CancellationReasons) ? error.CancellationReasons : [];
      if (reasons[1]?.Code === 'ConditionalCheckFailed') {
        throw new InventoryBuyerConflictError();
      }
      if (reasons[2]?.Code === 'ConditionalCheckFailed') {
        throw new InventoryRateLimitError();
      }

      // Alguns emuladores/proxies omitem CancellationReasons. Leituras fortes
      // dos guardas permitem diferenciar a causa sem sacrificar a colisão normal.
      if (!reasons.length) {
        const [buyerGuard, rateGuard] = await Promise.all([
          getItem(reservationBuyerPk, options),
          getItem(reservationRatePk, options),
        ]);
        if (buyerGuard && attrS(buyerGuard, 'state') !== 'released'
            && attrS(buyerGuard, 'reservation_id') !== requestId) {
          throw new InventoryBuyerConflictError();
        }
        if ((attrN(rateGuard, 'acquisitions') || 0) >= RESERVATION_RATE_LIMIT) {
          throw new InventoryRateLimitError();
        }
      }
      // Outro comprador ficou com este slot. Refaz a leitura consistente para
      // não disparar dezenas de transações contra uma fotografia já obsoleta.
      candidates = orderedFreeSlots(await listSlots(options), requestId);
    }
  }

  throw new InventorySoldOutError();
}

export async function attachProvider({
  requestId,
  slot,
  provider,
  providerProtocol,
  providerRef,
  providerUrl,
  providerExpiresAt,
  now = new Date(),
  client,
  tableName,
}) {
  validateRequest(requestId, provider);
  const expiresAt = new Date(providerExpiresAt);
  const redirectUrl = typeof providerUrl === 'string' && providerUrl.trim()
    ? providerUrl.trim()
    : null;
  if (!SLOT_KEYS.includes(slot) || !providerRef || !providerExpiresAt
      || !Number.isFinite(expiresAt.getTime())) {
    throw new InventoryConflictError('invalid_provider_attachment');
  }
  const protocol = providerProtocolFor({ provider, providerRef, providerProtocol });
  const options = { client, tableName };
  const current = await getReservation(requestId, options);
  if (!current || current.slot !== slot || current.provider !== provider
      || !current.buyerPk?.startsWith('BUYER#')) {
    throw new InventoryConflictError('invalid_provider_attachment');
  }
  const verified = await sameRequestOrThrow(
    current,
    provider,
    current.buyerPk.slice('BUYER#'.length),
    options,
  );
  const providerIntent = providerIntentFromRecord(verified);
  if (providerIntent && providerIntent.providerProtocol !== protocol) {
    throw new InventoryConflictError('provider_intent_protocol_mismatch');
  }
  const offer = validateOfferSnapshot(verified, InventoryUnavailableError);
  const { client: db, table } = requireConfig({ client, tableName });
  const commonValues = {
    ':held': s('held'), ':rid': s(requestId), ':provider': s(provider),
    ':protocol': s(protocol),
    ':ref': s(providerRef), ':expires': s(expiresAt.toISOString()),
    ':now': s(now.toISOString()),
    ':offerAmountCents': n(offer.offerAmountCents),
    ':offerCurrency': s(offer.offerCurrency),
    ':offerSku': s(offer.offerSku),
    ':contractVersion': s(offer.contractVersion),
    ...(providerIntent ? {
      ':externalReference': s(providerIntent.providerExternalReference),
      ':idempotencyKey': s(providerIntent.providerIdempotencyKey),
    } : {}),
  };
  const requestValues = redirectUrl
    ? { ...commonValues, ':url': s(redirectUrl) }
    : commonValues;
  const ownership = 'reservation_id = :rid AND #state = :held AND #provider = :provider AND offer_amount_cents = :offerAmountCents AND offer_currency = :offerCurrency AND offer_sku = :offerSku AND contract_version = :contractVersion';
  const sameReference = ' AND (attribute_not_exists(provider_ref) OR provider_ref = :ref) AND (attribute_not_exists(provider_protocol) OR provider_protocol = :protocol)';
  const sameIntent = providerIntent
    ? ' AND provider_protocol = :protocol AND provider_external_reference = :externalReference AND provider_idempotency_key = :idempotencyKey'
    : '';
  const requestSet = redirectUrl
    ? 'SET provider_ref = :ref, provider_protocol = :protocol, provider_url = :url, provider_expires_at = :expires, updated_at = :now'
    : 'SET provider_ref = :ref, provider_protocol = :protocol, provider_expires_at = :expires, updated_at = :now';
  try {
    await db.send(new TransactWriteItemsCommand({
      TransactItems: [
        {
          Update: {
            TableName: table,
            Key: { pk: s(slot) },
            // URL de redirecionamento pertence apenas ao REQUEST enquanto held.
            // O SLOT guarda a referência canônica necessária para binding, sem
            // reter um bearer-like checkout URL nem mesmo em dados legados.
            UpdateExpression: 'SET provider_ref = :ref, provider_protocol = :protocol, provider_expires_at = :expires, updated_at = :now REMOVE provider_url',
            ConditionExpression: `${ownership}${sameReference}${sameIntent}`,
            ExpressionAttributeNames: { '#state': 'state', '#provider': 'provider' },
            ExpressionAttributeValues: commonValues,
          },
        },
        {
          Update: {
            TableName: table,
            Key: { pk: s(requestPk(requestId)) },
            UpdateExpression: requestSet,
            ConditionExpression: `${ownership}${sameReference}${sameIntent}`,
            ExpressionAttributeNames: { '#state': 'state', '#provider': 'provider' },
            ExpressionAttributeValues: requestValues,
          },
        },
      ],
    }));
  } catch (error) {
    if (conditionalFailure(error)) throw new InventoryConflictError('reservation_not_held');
    throw wrapUnavailable(error);
  }
}

/**
 * Registra uma busca Orders completa e negativa sem abrir uma janela de
 * liberação contra um attach concorrente. O contador vive nos três guardas e
 * só avança se o intent original continuar exatamente igual e unattached.
 */
export async function recordUnattachedProviderSearchNegative({
  requestId,
  slot,
  now = new Date(),
  client,
  tableName,
}) {
  validateRequest(requestId, 'mercadopago');
  if (!SLOT_KEYS.includes(slot) || !Number.isFinite(now.getTime())) {
    throw new InventoryConflictError('invalid_provider_search_record');
  }
  const options = { client, tableName };
  const current = await getReservation(requestId, options);
  if (!current || current.slot !== slot || current.provider !== 'mercadopago'
      || current.state !== 'held' || !current.buyerPk?.startsWith('BUYER#')) {
    throw new InventoryConflictError('provider_search_reservation_mismatch');
  }
  if (current.providerRef) return current;
  const verified = await sameRequestOrThrow(
    current,
    'mercadopago',
    current.buyerPk.slice('BUYER#'.length),
    options,
  );
  const providerIntent = providerIntentFromRecord(verified);
  if (!providerIntent || providerIntent.providerProtocol !== 'mp_orders_v1') {
    throw new InventoryConflictError('provider_search_intent_missing');
  }
  const previousCount = Number(verified.providerSearchNegativeCount || 0);
  if (!Number.isInteger(previousCount) || previousCount < 0 || previousCount > 10_000) {
    throw new InventoryUnavailableError('provider_search_counter_corrupt');
  }
  const nowIso = now.toISOString();
  const firstAt = previousCount === 0 ? nowIso : verified.providerSearchFirstAt;
  if (!firstAt || !Number.isFinite(Date.parse(firstAt))) {
    throw new InventoryUnavailableError('provider_search_history_corrupt');
  }
  const nextCount = previousCount + 1;
  const { client: db, table } = requireConfig(options);
  const values = {
    ':held': s('held'),
    ':rid': s(requestId),
    ':provider': s('mercadopago'),
    ':protocol': s(providerIntent.providerProtocol),
    ':externalReference': s(providerIntent.providerExternalReference),
    ':idempotencyKey': s(providerIntent.providerIdempotencyKey),
    ':offerAmountCents': n(verified.offerAmountCents),
    ':offerCurrency': s(verified.offerCurrency),
    ':offerSku': s(verified.offerSku),
    ':contractVersion': s(verified.contractVersion),
    ':previousNegativeCount': n(previousCount),
    ':nextNegativeCount': n(nextCount),
    ':firstAt': s(firstAt),
    ':now': s(nowIso),
  };
  const names = { '#state': 'state', '#provider': 'provider' };
  const ownership = 'reservation_id = :rid AND #state = :held AND #provider = :provider AND provider_protocol = :protocol AND provider_external_reference = :externalReference AND provider_idempotency_key = :idempotencyKey AND offer_amount_cents = :offerAmountCents AND offer_currency = :offerCurrency AND offer_sku = :offerSku AND contract_version = :contractVersion';
  const unattached = ' AND attribute_not_exists(provider_ref) AND attribute_not_exists(provider_url)';
  const sameCounter = ' AND (attribute_not_exists(provider_search_negative_count) OR provider_search_negative_count = :previousNegativeCount)';
  const updateExpression = 'SET provider_search_negative_count = :nextNegativeCount, provider_search_first_at = :firstAt, provider_search_last_at = :now, updated_at = :now';
  try {
    await db.send(new TransactWriteItemsCommand({
      TransactItems: [slot, requestPk(requestId), current.buyerPk].map((pk) => ({
        Update: {
          TableName: table,
          Key: { pk: s(pk) },
          UpdateExpression: updateExpression,
          ConditionExpression: `${ownership}${unattached}${sameCounter}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        },
      })),
    }));
  } catch (error) {
    if (!conditionalFailure(error)) throw wrapUnavailable(error);
    const after = await getReservation(requestId, options);
    if (after?.providerRef || after?.state !== 'held'
        || Number(after?.providerSearchNegativeCount || 0) > previousCount) return after;
    throw new InventoryConflictError('provider_search_negative_conflict');
  }
  return {
    ...verified,
    providerSearchNegativeCount: nextCount,
    providerSearchFirstAt: firstAt,
    providerSearchLastAt: nowIso,
  };
}

/**
 * Libera uma aquisição que o provider rejeitou antes de criar qualquer objeto.
 * SLOT e REQUEST exigem ausência de provider_ref/url na mesma transação; se um
 * attach concorrente venceu, a liberação falha fechada e o hold é preservado.
 */
export async function releaseUnattachedReservation({
  requestId,
  slot,
  provider,
  reason,
  now = new Date(),
  client,
  tableName,
}) {
  validateRequest(requestId, provider);
  if (!SLOT_KEYS.includes(slot)) throw new InventoryConflictError('invalid_inventory_transition');
  const current = await getReservation(requestId, { client, tableName });
  if (!current || current.slot !== slot || current.provider !== provider) {
    throw new InventoryConflictError('inventory_transition_mismatch');
  }
  if (current.state === 'released') return false;
  if (current.state !== 'held' || !current.buyerPk?.startsWith('BUYER#')) {
    throw new InventoryConflictError('reservation_not_unattached_held');
  }
  const verified = await sameRequestOrThrow(
    current,
    provider,
    current.buyerPk.slice('BUYER#'.length),
    { client, tableName },
  );
  const offer = validateOfferSnapshot(verified, InventoryUnavailableError);
  const providerIntent = providerIntentFromRecord(verified);

  const { client: db, table } = requireConfig({ client, tableName });
  const slotValues = {
    ':held': s('held'),
    ':released': s('released'),
    ':rid': s(requestId),
    ':provider': s(provider),
    ':offerAmountCents': n(offer.offerAmountCents),
    ':offerCurrency': s(offer.offerCurrency),
    ':offerSku': s(offer.offerSku),
    ':contractVersion': s(offer.contractVersion),
    ':now': s(now.toISOString()),
    ':reason': s(reason || 'provider_rejected_before_creation'),
    ...(providerIntent ? {
      ':protocol': s(providerIntent.providerProtocol),
      ':externalReference': s(providerIntent.providerExternalReference),
      ':idempotencyKey': s(providerIntent.providerIdempotencyKey),
    } : {}),
  };
  const guardValues = {
    ...slotValues,
    ':ttl': n(Math.floor(now.getTime() / 1000) + RELEASED_GUARD_RETENTION_SECONDS),
  };
  const names = { '#state': 'state', '#provider': 'provider', '#ttl': 'ttl' };
  const ownership = `reservation_id = :rid AND #provider = :provider AND #state = :held AND offer_amount_cents = :offerAmountCents AND offer_currency = :offerCurrency AND offer_sku = :offerSku AND contract_version = :contractVersion${providerIntent ? ' AND provider_protocol = :protocol AND provider_external_reference = :externalReference AND provider_idempotency_key = :idempotencyKey' : ''}`;
  const unattached = ' AND attribute_not_exists(provider_ref) AND attribute_not_exists(provider_url)';
  const slotSet = 'SET #state = :released, updated_at = :now, release_reason = :reason REMOVE buyer_pk, provider_url';
  const requestSet = 'SET #state = :released, updated_at = :now, release_reason = :reason, #ttl = :ttl REMOVE provider_url';
  const buyerSet = 'SET #state = :released, updated_at = :now, release_reason = :reason, #ttl = :ttl';

  try {
    await db.send(new TransactWriteItemsCommand({
      TransactItems: [
        {
          Update: {
            TableName: table,
            Key: { pk: s(slot) },
            UpdateExpression: slotSet,
            ConditionExpression: `${ownership}${unattached}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: slotValues,
          },
        },
        {
          Update: {
            TableName: table,
            Key: { pk: s(requestPk(requestId)) },
            UpdateExpression: requestSet,
            ConditionExpression: `${ownership}${unattached}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: guardValues,
          },
        },
        {
          Update: {
            TableName: table,
            Key: { pk: s(current.buyerPk) },
            UpdateExpression: buyerSet,
            ConditionExpression: ownership,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: guardValues,
          },
        },
      ],
    }));
    return true;
  } catch (error) {
    if (!conditionalFailure(error)) throw wrapUnavailable(error);
    const after = await getReservation(requestId, { client, tableName });
    if (after?.state === 'released') return false;
    throw new InventoryConflictError('unattached_release_conflict');
  }
}

async function transitionReservation({
  requestId,
  slot,
  provider,
  state,
  providerRef,
  paymentStatus,
  providerEventCreated,
  providerEventId,
  providerEventType,
  refundedCents,
  disputedCents,
  chargedBackCents,
  reason,
  requireProviderRefMatch = false,
  now = new Date(),
  client,
  tableName,
}) {
  validateRequest(requestId, provider);
  if (!SLOT_KEYS.includes(slot) || !['paid', 'released'].includes(state)) {
    throw new InventoryConflictError('invalid_inventory_transition');
  }
  const options = { client, tableName };
  const currentBefore = await getReservation(requestId, options);
  if (!currentBefore || currentBefore.slot !== slot || currentBefore.provider !== provider) {
    throw new InventoryConflictError('inventory_transition_mismatch');
  }
  if (!currentBefore.buyerPk?.startsWith('BUYER#')) {
    throw new InventoryUnavailableError('inventory_buyer_guard_missing');
  }
  const offer = validateOfferSnapshot(currentBefore, InventoryUnavailableError);
  if (currentBefore.state !== 'released') {
    await sameRequestOrThrow(currentBefore, provider, currentBefore.buyerPk.slice('BUYER#'.length), options);
  }
  if (state === 'released' && ['released', 'paid'].includes(currentBefore.state)) {
    return false;
  }
  const hasProviderEvent = [providerEventCreated, providerEventId, providerEventType]
    .some((value) => value !== undefined && value !== null && value !== '');
  if (state !== 'paid' && hasProviderEvent) {
    throw new InventoryConflictError('provider_event_on_non_financial_transition');
  }
  if (state === 'paid' && hasProviderEvent
      && [providerEventCreated, providerEventId, providerEventType]
        .some((value) => value === undefined || value === null || value === '')) {
    throw new InventoryConflictError('incomplete_provider_event');
  }
  const providerEvent = state === 'paid' && hasProviderEvent
    ? financialEventCursor({
      provider, providerEventCreated, providerEventId, providerEventType, paymentStatus,
    })
    : null;
  if (providerEvent) {
    const totalCents = offer.offerAmountCents;
    for (const amount of [refundedCents, disputedCents, chargedBackCents]) {
      if (!Number.isInteger(amount) || amount < 0 || amount > totalCents) {
        throw new InventoryConflictError('invalid_financial_snapshot');
      }
    }
  }
  // Reconciliação sem cursor pode consumir held/released, mas nunca regride um
  // status já governado (ou já consumido) por evento financeiro.
  if (state === 'paid' && currentBefore.state === 'paid' && !providerEvent) {
    return { outcome: 'idempotent' };
  }
  const { client: db, table } = requireConfig({ client, tableName });
  const names = { '#state': 'state', '#provider': 'provider', '#ttl': 'ttl' };
  const values = {
    ':held': s('held'), ':next': s(state), ':rid': s(requestId),
    ':provider': s(provider), ':now': s(now.toISOString()),
    ':offerAmountCents': n(offer.offerAmountCents),
    ':offerCurrency': s(offer.offerCurrency),
    ':offerSku': s(offer.offerSku),
    ':contractVersion': s(offer.contractVersion),
  };
  const set = ['#state = :next', 'updated_at = :now'];
  if (providerRef) { values[':ref'] = s(providerRef); set.push('last_provider_ref = :ref'); }
  if (paymentStatus) { values[':payment'] = s(paymentStatus); set.push('payment_status = :payment'); }
  if (providerEvent) {
    values[':eventCursor'] = s(providerEvent.cursor);
    values[':eventCreatedAt'] = s(providerEvent.createdAt);
    values[':eventId'] = s(providerEvent.eventId);
    values[':eventType'] = s(providerEvent.eventType);
    values[':refundedCents'] = n(refundedCents);
    values[':disputedCents'] = n(disputedCents);
    values[':chargedBackCents'] = n(chargedBackCents);
    set.push(
      'provider_event_cursor = :eventCursor',
      'provider_event_created_at = :eventCreatedAt',
      'provider_event_id = :eventId',
      'provider_event_type = :eventType',
      'refunded_cents = :refundedCents',
      'disputed_cents = :disputedCents',
      'charged_back_cents = :chargedBackCents',
    );
  }
  if (reason) { values[':reason'] = s(reason); set.push('release_reason = :reason'); }
  // `paid` também pode recuperar atomicamente uma reserva já liberada, desde
  // que SLOT/REQUEST/BUYER ainda pertençam a ela. Isso cobre webhook MP tardio
  // antes do reuso; depois do reuso a condição do slot bloqueia o oversell.
  const allowed = state === 'paid'
    ? '(#state = :held OR #state = :released OR #state = :paid)'
    : '#state = :held';
  if (state === 'paid') {
    values[':released'] = s('released');
    values[':paid'] = s('paid');
  }
  const refCondition = requireProviderRefMatch
    ? ' AND (attribute_not_exists(provider_ref) OR provider_ref = :ref)'
    : '';
  if (requireProviderRefMatch && !providerRef) {
    throw new InventoryConflictError('provider_reference_required');
  }
  const baseCondition = `reservation_id = :rid AND #provider = :provider AND offer_amount_cents = :offerAmountCents AND offer_currency = :offerCurrency AND offer_sku = :offerSku AND contract_version = :contractVersion AND ${allowed}`;
  const eventCondition = providerEvent
    ? ' AND (attribute_not_exists(provider_event_cursor) OR provider_event_cursor < :eventCursor)'
    : '';
  const guardTtl = Math.floor(now.getTime() / 1000) + (state === 'paid'
    ? PAID_GUARD_RETENTION_SECONDS
    : RELEASED_GUARD_RETENTION_SECONDS);
  const guardSet = [...set, '#ttl = :ttl'];
  const guardValues = { ...values, ':ttl': n(guardTtl) };

  try {
    await db.send(new TransactWriteItemsCommand({
      TransactItems: [
        {
          Update: {
            TableName: table,
            Key: { pk: s(slot) },
            UpdateExpression: `SET ${set.join(', ')} REMOVE buyer_pk, provider_url`,
            ConditionExpression: `${baseCondition}${refCondition}${eventCondition}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
          },
        },
        {
          Update: {
            TableName: table,
            Key: { pk: s(requestPk(requestId)) },
            UpdateExpression: `SET ${guardSet.join(', ')} REMOVE provider_url`,
            ConditionExpression: `${baseCondition}${refCondition}${eventCondition}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: guardValues,
          },
        },
        {
          Update: {
            TableName: table,
            Key: { pk: s(currentBefore.buyerPk) },
            UpdateExpression: `SET ${guardSet.join(', ')}`,
            ConditionExpression: `${baseCondition}${eventCondition}`,
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: guardValues,
          },
        },
      ],
    }));
    return state === 'paid' ? { outcome: 'applied' } : true;
  } catch (error) {
    if (!conditionalFailure(error)) throw wrapUnavailable(error);
    const current = await getReservation(requestId, { client, tableName });
    if (state === 'released' && ['released', 'paid'].includes(current?.state)) return false;
    if (state === 'paid' && currentBefore.state === 'released') {
      const [slotAfter, buyerAfter] = await Promise.all([
        getItem(slot, { client, tableName }),
        getItem(currentBefore.buyerPk, { client, tableName }),
      ]);
      if (attrS(slotAfter, 'reservation_id') !== requestId
          || attrS(buyerAfter, 'reservation_id') !== requestId) {
        // O caller (webhook) deve compensar: não contar/fulfill a venda tardia
        // e iniciar reembolso idempotente. Nunca converte isso em slot pago.
        throw new InventoryLatePaymentReassignedError();
      }
    }
    if (state === 'paid' && providerEvent && current?.state === 'paid') {
      const [slotAfter, buyerAfter] = await Promise.all([
        getItem(slot, { client, tableName }),
        getItem(currentBefore.buyerPk, { client, tableName }),
      ]);
      const records = [decode(slotAfter), current, decode(buyerAfter)];
      const owned = records.every((record) => record
        && record.reservationId === requestId
        && record.provider === provider
        && sameOfferSnapshot(record, offer)
        && record.state === 'paid');
      if (owned && records.every((record) => record.providerEventCursor === providerEvent.cursor
          && record.paymentStatus === paymentStatus
          && record.refundedCents === refundedCents
          && record.disputedCents === disputedCents
          && record.chargedBackCents === chargedBackCents)) {
        return { outcome: 'idempotent' };
      }
      if (owned && records.every((record) => record.providerEventCursor
          && record.providerEventCursor > providerEvent.cursor)) {
        return { outcome: 'stale' };
      }
    }
    throw new InventoryConflictError('inventory_transition_conflict');
  }
}

export const markReservationPaid = (args) => transitionReservation({ ...args, state: 'paid' });
export const releaseReservation = (args) => transitionReservation({
  ...args,
  state: 'released',
  requireProviderRefMatch: true,
});

export function inventorySummary(slots) {
  let paid = 0;
  let held = 0;
  for (const slot of slots) {
    if (!VALID_STATES.has(slot.state)) throw new InventoryUnavailableError('inventory_slot_corrupt');
    if (slot.state === 'paid') paid += 1;
    if (slot.state === 'held') held += 1;
  }
  const occupied = paid + held;
  return {
    total: OFERTA.loteTotal,
    vendidas: paid,
    reservadas: held,
    ocupadas: occupied,
    restantes: Math.max(0, OFERTA.loteTotal - occupied),
    esgotado: occupied >= OFERTA.loteTotal,
    confiavel: true,
  };
}
