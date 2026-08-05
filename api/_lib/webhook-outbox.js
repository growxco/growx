/**
 * Outbox durável dos webhooks da pré-venda.
 *
 * Cada efeito externo ocupa um item independente na mesma tabela do inventário:
 *   WEBHOOK#<provider>#<sha256(eventId)>#<channel>
 *
 * O item guarda somente hashes, referência técnica e snapshot não pessoal da
 * oferta — nunca PII nem payload do comprador. Cada item recebe `ttl` de 400
 * dias para idempotência/auditoria operacional com retenção limitada. O GSI
 * por `outbox_partition/next_attempt_at` permite redrive sem Scan. O provider
 * pode reenviar o mesmo evento:
 * efeitos concluídos são ignorados, falhas voltam a `failed`, e uma lease
 * impede duas invocações concorrentes de executarem o mesmo canal ao mesmo tempo.
 *
 * E-mails também recebem uma Idempotency-Key determinística no Resend. Isso
 * fecha a janela entre "provider aceitou" e "Dynamo marcou done". Para efeitos
 * sem idempotência nativa, a lease + estado durável fornece at-least-once com
 * deduplicação no nosso lado.
 */
import {
  GetItemCommand,
  QueryCommand,
  TransactWriteItemsCommand,
} from '@aws-sdk/client-dynamodb';
import { createHash, randomUUID } from 'node:crypto';

import { getDynamoClient } from './dynamo-client.js';

const LEASE_SECONDS = 60;
const INITIAL_REDRIVE_DELAY_SECONDS = 60;
const OUTBOX_QUEUE_PARTITION = 'WEBHOOK_DUE';
export const WEBHOOK_OUTBOX_INDEX = 'webhook-outbox-due';
export const WEBHOOK_REDRIVE_MAX_ATTEMPTS = 6;
export const WEBHOOK_OUTBOX_RETENTION_SECONDS = 400 * 24 * 60 * 60;
const VALID_PROVIDER = /^[a-z][a-z0-9_-]{1,31}$/;
const VALID_CHANNEL = /^[a-z][a-z0-9_-]{1,47}$/;
const VALID_PROVIDER_REFERENCE = /^[a-zA-Z0-9:_-]{1,200}$/;
const VALID_EFFECT_KIND = /^[a-z0-9_-]{1,64}$/;
const VALID_PROVIDER_PROTOCOLS = new Set([
  'stripe_checkout_v1',
  'mp_checkout_pro_v1',
  'mp_orders_v1',
]);
const PII_FIELD = /(^|_)(email|e_mail|name|nome|phone|telefone|document|documento|cpf|cnpj|address|endereco|payer|customer|shipping|billing)(_|$)/i;
const VALID_EXPECTED_STATUS = new Set([
  'approved',
  'paid',
  'refund_pending',
  'refund_failed',
  'partially_refunded',
  'refunded',
  'disputed',
  'charged_back',
]);

const s = (value) => ({ S: String(value) });
const n = (value) => ({ N: String(value) });
const attrS = (item, key) => item?.[key]?.S || '';
const attrN = (item, key) => {
  const value = Number(item?.[key]?.N);
  return Number.isFinite(value) ? value : null;
};

export class WebhookOutboxUnavailableError extends Error {
  constructor(message = 'webhook_outbox_unavailable', cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'WebhookOutboxUnavailableError';
  }
}

export class WebhookOutboxBusyError extends Error {
  constructor() {
    super('webhook_effect_in_progress');
    this.name = 'WebhookOutboxBusyError';
  }
}

export class WebhookOutboxIntegrityError extends Error {
  constructor(message = 'webhook_effect_integrity_mismatch') {
    super(message);
    this.name = 'WebhookOutboxIntegrityError';
  }
}

export class WebhookDeliveryError extends Error {
  constructor(channel, cause) {
    super(`webhook_delivery_failed:${channel}`, cause ? { cause } : undefined);
    this.name = 'WebhookDeliveryError';
    this.channel = channel;
  }
}

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const entries = Object.entries(value)
    .filter(([, child]) => child !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(',')}}`;
}

export const webhookPayloadDigest = (payload) => createHash('sha256')
  .update(canonical(payload))
  .digest('hex');

const eventDigest = (eventId) => createHash('sha256').update(eventId).digest('hex');

/**
 * Extrai apenas a referência técnica necessária para reler o objeto no
 * provider. O payload completo continua existindo somente em memória e nunca é
 * gravado no DynamoDB.
 */
export function inferWebhookProviderReference(provider, payload, explicitReference = null) {
  const candidates = provider === 'stripe'
    ? [
      explicitReference,
      payload?.sessionId,
      payload?.checkoutSessionId,
      payload?.snapshot?.checkoutSessionId,
      payload?.chargeId,
      payload?.snapshot?.charge?.id,
      payload?.objectId,
    ]
    : [explicitReference, payload?.orderId, payload?.paymentId, payload?.objectId];
  const reference = candidates
    .map((candidate) => String(candidate || '').trim())
    .find((candidate) => VALID_PROVIDER_REFERENCE.test(candidate));
  return reference || null;
}

function safeEffectContext(payload) {
  const kindCandidate = String(payload?.kind || '').trim().toLowerCase();
  const statusCandidate = String(
    payload?.paymentStatus || payload?.snapshot?.paymentStatus || payload?.status || '',
  ).trim().toLowerCase();
  const amountCandidate = Number(
    payload?.offerAmountCents
      ?? (kindCandidate === 'stripe_buyer_financial_v1' ? null : payload?.amountCents)
      ?? payload?.snapshot?.charge?.amountCents,
  );
  const currencyCandidate = String(
    payload?.offerCurrency ?? payload?.currency ?? payload?.snapshot?.charge?.currency ?? '',
  ).trim().toUpperCase();
  const skuCandidate = String(payload?.offerSku ?? payload?.sku ?? '').trim();
  const contractCandidate = String(payload?.contractVersion ?? '').trim();
  const providerProtocolCandidate = String(payload?.providerProtocol ?? '').trim();
  return {
    effectKind: VALID_EFFECT_KIND.test(kindCandidate) ? kindCandidate : null,
    expectedStatus: VALID_EXPECTED_STATUS.has(statusCandidate) ? statusCandidate : null,
    expectedAmountCents: Number.isInteger(amountCandidate) && amountCandidate > 0
      ? amountCandidate
      : null,
    expectedCurrency: /^[A-Z]{3}$/.test(currencyCandidate) ? currencyCandidate : null,
    offerSku: /^[a-z0-9_-]{1,64}$/.test(skuCandidate) ? skuCandidate : null,
    contractVersion: /^[a-zA-Z0-9._-]{1,80}$/.test(contractCandidate) ? contractCandidate : null,
    providerProtocol: VALID_PROVIDER_PROTOCOLS.has(providerProtocolCandidate)
      ? providerProtocolCandidate
      : null,
  };
}

const retryDelaySeconds = (attempts) => Math.min(30 * 60, 60 * (2 ** Math.max(0, attempts - 1)));
const alertRetryDelaySeconds = (attempts) => Math.min(60 * 60, 60 * (2 ** Math.max(0, attempts - 1)));

function assertPiiFreePayload(value, depth = 0) {
  if (value === null || typeof value !== 'object') return;
  if (depth > 12) throw new WebhookOutboxIntegrityError('webhook_payload_too_deep');
  if (Array.isArray(value)) {
    for (const child of value) assertPiiFreePayload(child, depth + 1);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (PII_FIELD.test(key)) {
      throw new WebhookOutboxIntegrityError('webhook_payload_contains_pii');
    }
    assertPiiFreePayload(child, depth + 1);
  }
}

function conditionalFailure(error) {
  if (error?.name === 'ConditionalCheckFailedException') return true;
  if (error?.name !== 'TransactionCanceledException') return false;
  const reasons = error.CancellationReasons;
  return !Array.isArray(reasons)
    || reasons.some((reason) => reason?.Code === 'ConditionalCheckFailed');
}

function requireConfig({ provider, eventId, channel, tableName, client, recordType, providerReference }) {
  const table = tableName || process.env.PREVENDA_INVENTORY_TABLE || '';
  if (!table) throw new WebhookOutboxUnavailableError('webhook_outbox_not_configured');
  if (!VALID_PROVIDER.test(provider) || !VALID_CHANNEL.test(channel)) {
    throw new WebhookOutboxIntegrityError('invalid_webhook_effect_key');
  }
  const normalizedEventId = String(eventId || '').trim();
  if (!normalizedEventId || normalizedEventId.length > 256) {
    throw new WebhookOutboxIntegrityError('invalid_webhook_event_id');
  }
  if (recordType && !['WEBHOOK_EFFECT', 'LATE_REFUND'].includes(recordType)) {
    throw new WebhookOutboxIntegrityError('invalid_webhook_record_type');
  }
  if (providerReference && !VALID_PROVIDER_REFERENCE.test(providerReference)) {
    throw new WebhookOutboxIntegrityError('invalid_webhook_provider_reference');
  }
  const hash = eventDigest(normalizedEventId);
  return {
    client: client || getDynamoClient(),
    table,
    hash,
    pk: `WEBHOOK#${provider}#${hash}#${channel}`,
    idempotencyKey: `growx-prevenda/${provider}/${hash.slice(0, 32)}/${channel}`,
  };
}

function requireLockConfig({ provider, reservationKey, tableName, client }) {
  const table = tableName || process.env.PREVENDA_INVENTORY_TABLE || '';
  if (!table) throw new WebhookOutboxUnavailableError('webhook_outbox_not_configured');
  if (!VALID_PROVIDER.test(provider)) throw new WebhookOutboxIntegrityError('invalid_webhook_lock_provider');
  const normalized = String(reservationKey || '').trim();
  if (!normalized || normalized.length > 256) {
    throw new WebhookOutboxIntegrityError('invalid_webhook_lock_key');
  }
  const hash = eventDigest(normalized);
  return {
    client: client || getDynamoClient(),
    table,
    hash,
    pk: `WEBHOOK_LOCK#${provider}#${hash}`,
  };
}

async function transact(db, input) {
  return db.send(new TransactWriteItemsCommand({ TransactItems: [input] }));
}

async function readRecord(db, table, pk) {
  try {
    const response = await db.send(new GetItemCommand({
      TableName: table,
      Key: { pk: s(pk) },
      ConsistentRead: true,
    }));
    return response.Item || null;
  } catch (error) {
    throw new WebhookOutboxUnavailableError('webhook_outbox_read_failed', error);
  }
}

async function ensureRecord({
  db, table, pk, provider, hash, channel, digest, nowIso, recordType, providerReference,
  effectKind, expectedStatus, expectedAmountCents, expectedCurrency, offerSku, contractVersion,
  providerProtocol,
}) {
  const nowSeconds = Math.floor(Date.parse(nowIso) / 1000);
  const item = {
    pk: s(pk),
    provider: s(provider),
    event_hash: s(hash),
    channel: s(channel),
    record_type: s(recordType || 'WEBHOOK_EFFECT'),
    payload_digest: s(digest),
    state: s('pending'),
    attempts: n(0),
    outbox_partition: s(OUTBOX_QUEUE_PARTITION),
    next_attempt_at: n(nowSeconds + INITIAL_REDRIVE_DELAY_SECONDS),
    ttl: n(nowSeconds + WEBHOOK_OUTBOX_RETENTION_SECONDS),
    created_at: s(nowIso),
    updated_at: s(nowIso),
  };
  if (providerReference) item.provider_ref = s(providerReference);
  if (effectKind) item.effect_kind = s(effectKind);
  if (expectedStatus) item.expected_status = s(expectedStatus);
  if (expectedAmountCents) item.expected_amount_cents = n(expectedAmountCents);
  if (expectedCurrency) item.expected_currency = s(expectedCurrency);
  if (offerSku) item.offer_sku = s(offerSku);
  if (contractVersion) item.contract_version = s(contractVersion);
  if (providerProtocol) item.provider_protocol = s(providerProtocol);
  try {
    await transact(db, {
      Put: {
        TableName: table,
        Item: item,
        ConditionExpression: 'attribute_not_exists(pk)',
      },
    });
  } catch (error) {
    if (!conditionalFailure(error)) {
      throw new WebhookOutboxUnavailableError('webhook_outbox_create_failed', error);
    }
  }
}

function assertRecord(record, digest) {
  if (!record) throw new WebhookOutboxUnavailableError('webhook_outbox_record_missing');
  if (attrS(record, 'payload_digest') !== digest) {
    throw new WebhookOutboxIntegrityError();
  }
}

async function claimRecord({ db, table, pk, digest, owner, nowSeconds, nowIso }) {
  try {
    await transact(db, {
      Update: {
        TableName: table,
        Key: { pk: s(pk) },
        UpdateExpression: 'SET #state = :processing, lease_until = :lease, owner_token = :owner, updated_at = :now, outbox_partition = :queue, next_attempt_at = :lease ADD attempts :one',
        ConditionExpression: 'payload_digest = :digest AND (#state = :pending OR #state = :failed OR (#state = :deadLetter AND (attribute_not_exists(alert_state) OR alert_state <> :processing OR lease_until < :epoch)) OR (#state = :processing AND lease_until < :epoch))',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':digest': s(digest),
          ':pending': s('pending'),
          ':failed': s('failed'),
          ':deadLetter': s('dead_letter'),
          ':processing': s('processing'),
          ':lease': n(nowSeconds + LEASE_SECONDS),
          ':epoch': n(nowSeconds),
          ':owner': s(owner),
          ':now': s(nowIso),
          ':queue': s(OUTBOX_QUEUE_PARTITION),
          ':one': n(1),
        },
      },
    });
    return true;
  } catch (error) {
    if (!conditionalFailure(error)) {
      throw new WebhookOutboxUnavailableError('webhook_outbox_claim_failed', error);
    }
    return false;
  }
}

async function markDone({ db, table, pk, owner, nowIso, externalRef }) {
  const values = {
    ':processing': s('processing'), ':done': s('done'), ':owner': s(owner), ':now': s(nowIso),
  };
  let update = 'SET #state = :done, done_at = :now, updated_at = :now';
  if (externalRef) {
    values[':external'] = s(String(externalRef).slice(0, 200));
    update += ', external_ref = :external';
  }
  update += ' REMOVE lease_until, owner_token, last_error, outbox_partition, next_attempt_at, alert_state, alert_last_error';
  try {
    await transact(db, {
      Update: {
        TableName: table,
        Key: { pk: s(pk) },
        UpdateExpression: update,
        ConditionExpression: '#state = :processing AND owner_token = :owner',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: values,
      },
    });
  } catch (error) {
    throw new WebhookOutboxUnavailableError('webhook_outbox_complete_failed', error);
  }
}

async function markFailed({ db, table, pk, owner, nowIso, attempts = 1, error }) {
  const safeError = error instanceof WebhookDeliveryError
    ? 'delivery_rejected'
    : String(error?.name || 'delivery_error').slice(0, 80);
  const nowSeconds = Math.floor(Date.parse(nowIso) / 1000);
  try {
    await transact(db, {
      Update: {
        TableName: table,
        Key: { pk: s(pk) },
        UpdateExpression: 'SET #state = :failed, last_error = :error, updated_at = :now, outbox_partition = :queue, next_attempt_at = :next REMOVE lease_until, owner_token',
        ConditionExpression: '#state = :processing AND owner_token = :owner',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':processing': s('processing'), ':failed': s('failed'), ':owner': s(owner),
          ':error': s(safeError), ':now': s(nowIso), ':queue': s(OUTBOX_QUEUE_PARTITION),
          ':next': n(nowSeconds + retryDelaySeconds(attempts)),
        },
      },
    });
  } catch {
    // O provider receberá erro e reenviará. A lease expira mesmo se esta escrita
    // falhar, mantendo o efeito recuperável sem aceitar o evento prematuramente.
  }
}

/**
 * Executa um único canal de um evento com estado durável e deduplicação.
 * `payload` deve conter somente campos de integridade sem PII; o outbox
 * persiste seu hash e deriva apenas status/oferta técnicos validados. `execute`
 * recebe a chave determinística do provider externo.
 */
export async function runWebhookEffect({
  provider,
  eventId,
  channel,
  payload,
  execute,
  client,
  tableName,
  now = new Date(),
  recordType = 'WEBHOOK_EFFECT',
  providerReference = null,
}) {
  if (typeof execute !== 'function') throw new TypeError('webhook_effect_execute_required');
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError('invalid_webhook_effect_clock');
  }
  assertPiiFreePayload(payload);

  const resolvedProviderReference = inferWebhookProviderReference(
    provider,
    payload,
    providerReference,
  );
  const context = safeEffectContext(payload);
  const config = requireConfig({
    provider,
    eventId,
    channel,
    tableName,
    client,
    recordType,
    providerReference: resolvedProviderReference,
  });
  const digest = webhookPayloadDigest(payload);
  const nowIso = now.toISOString();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const db = config.client;

  await ensureRecord({
    db,
    table: config.table,
    pk: config.pk,
    provider,
    hash: config.hash,
    channel,
    digest,
    nowIso,
    recordType,
    providerReference: resolvedProviderReference,
    effectKind: context.effectKind,
    expectedStatus: context.expectedStatus,
    expectedAmountCents: context.expectedAmountCents,
    expectedCurrency: context.expectedCurrency,
    offerSku: context.offerSku,
    contractVersion: context.contractVersion,
    providerProtocol: context.providerProtocol,
  });

  let record = await readRecord(db, config.table, config.pk);
  assertRecord(record, digest);
  if (attrS(record, 'state') === 'done') {
    return {
      delivered: true,
      replay: true,
      attempts: attrN(record, 'attempts') || 0,
      externalRef: attrS(record, 'external_ref') || null,
    };
  }

  const owner = randomUUID();
  const claimed = await claimRecord({
    db,
    table: config.table,
    pk: config.pk,
    digest,
    owner,
    nowSeconds,
    nowIso,
  });
  if (!claimed) {
    record = await readRecord(db, config.table, config.pk);
    assertRecord(record, digest);
    if (attrS(record, 'state') === 'done') {
      return {
        delivered: true,
        replay: true,
        attempts: attrN(record, 'attempts') || 0,
        externalRef: attrS(record, 'external_ref') || null,
      };
    }
    throw new WebhookOutboxBusyError();
  }

  try {
    const result = await execute({ idempotencyKey: config.idempotencyKey });
    if (result === false || result?.ok === false) throw new WebhookDeliveryError(channel);
    const externalRef = typeof result === 'object' ? result?.id : null;
    await markDone({
      db,
      table: config.table,
      pk: config.pk,
      owner,
      nowIso: new Date().toISOString(),
      externalRef,
    });
    return {
      delivered: true,
      replay: false,
      attempts: (attrN(record, 'attempts') || 0) + 1,
      externalRef: externalRef || null,
    };
  } catch (error) {
    await markFailed({
      db,
      table: config.table,
      pk: config.pk,
      owner,
      nowIso: new Date().toISOString(),
      attempts: (attrN(record, 'attempts') || 0) + 1,
      error,
    });
    if (error instanceof WebhookDeliveryError) throw error;
    throw new WebhookDeliveryError(channel, error);
  }
}

function queueConfig({ tableName, client }) {
  const table = tableName || process.env.PREVENDA_INVENTORY_TABLE || '';
  if (!table) throw new WebhookOutboxUnavailableError('webhook_outbox_not_configured');
  return { client: client || getDynamoClient(), table };
}

function safeOperationalError(error, fallback = 'delivery_error') {
  const candidate = String(error?.code || error?.name || fallback).slice(0, 80).toLowerCase();
  return /^[a-z0-9_:-]+$/.test(candidate) ? candidate : fallback;
}

export function webhookOutboxRecordFromItem(item) {
  if (!item || !attrS(item, 'pk')) return null;
  return {
    pk: attrS(item, 'pk'),
    provider: attrS(item, 'provider'),
    providerReference: attrS(item, 'provider_ref') || null,
    channel: attrS(item, 'channel'),
    recordType: attrS(item, 'record_type'),
    eventHash: attrS(item, 'event_hash'),
    payloadDigest: attrS(item, 'payload_digest'),
    effectKind: attrS(item, 'effect_kind') || null,
    expectedStatus: attrS(item, 'expected_status') || null,
    expectedAmountCents: attrN(item, 'expected_amount_cents'),
    expectedCurrency: attrS(item, 'expected_currency') || null,
    offerSku: attrS(item, 'offer_sku') || null,
    contractVersion: attrS(item, 'contract_version') || null,
    providerProtocol: attrS(item, 'provider_protocol') || null,
    state: attrS(item, 'state'),
    lastError: attrS(item, 'last_error') || null,
    attempts: attrN(item, 'attempts') || 0,
    alertState: attrS(item, 'alert_state') || null,
    alertAttempts: attrN(item, 'alert_attempts') || 0,
    nextAttemptAt: attrN(item, 'next_attempt_at'),
  };
}

export function webhookOutboxIdempotencyKey(record) {
  const provider = String(record?.provider || '');
  const eventHash = String(record?.eventHash || '');
  const channel = String(record?.channel || '');
  if (!VALID_PROVIDER.test(provider) || !/^[a-f0-9]{64}$/.test(eventHash)
      || !VALID_CHANNEL.test(channel)) {
    throw new WebhookOutboxIntegrityError('invalid_webhook_effect_record');
  }
  return `growx-prevenda/${provider}/${eventHash.slice(0, 32)}/${channel}`;
}

/** Lista apenas chaves vencidas do GSI; cada item ainda precisa de claim forte. */
export async function listDueWebhookEffects({
  client,
  tableName,
  now = new Date(),
  limit = 8,
}) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError('invalid_webhook_effect_clock');
  }
  const config = queueConfig({ tableName, client });
  const boundedLimit = Math.max(1, Math.min(25, Number(limit) || 8));
  try {
    const response = await config.client.send(new QueryCommand({
      TableName: config.table,
      IndexName: WEBHOOK_OUTBOX_INDEX,
      KeyConditionExpression: '#partition = :queue AND #due <= :epoch',
      ExpressionAttributeNames: {
        '#partition': 'outbox_partition',
        '#due': 'next_attempt_at',
      },
      ExpressionAttributeValues: {
        ':queue': s(OUTBOX_QUEUE_PARTITION),
        ':epoch': n(Math.floor(now.getTime() / 1000)),
      },
      ScanIndexForward: true,
      Limit: boundedLimit,
      ProjectionExpression: 'pk, outbox_partition, next_attempt_at',
    }));
    return (response.Items || []).map((item) => attrS(item, 'pk')).filter(Boolean);
  } catch (error) {
    throw new WebhookOutboxUnavailableError('webhook_outbox_query_failed', error);
  }
}

async function transitionExhaustedToDeadLetter({
  db, table, record, nowSeconds, nowIso, maxAttempts,
}) {
  try {
    await transact(db, {
      Update: {
        TableName: table,
        Key: { pk: s(record.pk) },
        UpdateExpression: 'SET #state = :deadLetter, alert_state = :alertPending, dead_lettered_at = :now, last_error = :reason, updated_at = :now, outbox_partition = :queue, next_attempt_at = :epoch REMOVE lease_until, owner_token',
        ConditionExpression: 'payload_digest = :digest AND attempts >= :max AND outbox_partition = :queue AND next_attempt_at <= :epoch AND (#state = :pending OR #state = :failed OR (#state = :processing AND lease_until < :epoch))',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':digest': s(record.payloadDigest),
          ':max': n(maxAttempts),
          ':queue': s(OUTBOX_QUEUE_PARTITION),
          ':epoch': n(nowSeconds),
          ':pending': s('pending'),
          ':failed': s('failed'),
          ':processing': s('processing'),
          ':deadLetter': s('dead_letter'),
          ':alertPending': s('pending'),
          ':reason': s('max_attempts_exhausted'),
          ':now': s(nowIso),
        },
      },
    });
    return true;
  } catch (error) {
    if (conditionalFailure(error)) return false;
    throw new WebhookOutboxUnavailableError('webhook_outbox_dead_letter_failed', error);
  }
}

async function claimDeadLetterAlert({ db, table, record, owner, nowSeconds, nowIso }) {
  try {
    await transact(db, {
      Update: {
        TableName: table,
        Key: { pk: s(record.pk) },
        UpdateExpression: 'SET alert_state = :processing, lease_until = :lease, owner_token = :owner, updated_at = :now, next_attempt_at = :lease ADD alert_attempts :one',
        ConditionExpression: '#state = :deadLetter AND outbox_partition = :queue AND next_attempt_at <= :epoch AND (attribute_not_exists(alert_state) OR alert_state = :pending OR alert_state = :failed OR (alert_state = :processing AND lease_until < :epoch))',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':deadLetter': s('dead_letter'),
          ':queue': s(OUTBOX_QUEUE_PARTITION),
          ':epoch': n(nowSeconds),
          ':pending': s('pending'),
          ':failed': s('failed'),
          ':processing': s('processing'),
          ':lease': n(nowSeconds + LEASE_SECONDS),
          ':owner': s(owner),
          ':now': s(nowIso),
          ':one': n(1),
        },
      },
    });
    return true;
  } catch (error) {
    if (conditionalFailure(error)) return false;
    throw new WebhookOutboxUnavailableError('webhook_outbox_alert_claim_failed', error);
  }
}

/**
 * Claim atômica por item. Invocações duplicadas do Vercel Cron podem consultar
 * a mesma chave, mas somente uma recebe o token da lease.
 */
export async function claimWebhookOutboxRecord({
  pk,
  client,
  tableName,
  now = new Date(),
  maxAttempts = WEBHOOK_REDRIVE_MAX_ATTEMPTS,
}) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError('invalid_webhook_effect_clock');
  }
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 50) {
    throw new TypeError('invalid_webhook_redrive_max_attempts');
  }
  const normalizedPk = String(pk || '');
  if (!/^WEBHOOK#[a-z][a-z0-9_-]{1,31}#[a-f0-9]{64}#[a-z][a-z0-9_-]{1,47}$/.test(normalizedPk)) {
    throw new WebhookOutboxIntegrityError('invalid_webhook_effect_record');
  }
  const config = queueConfig({ tableName, client });
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const nowIso = now.toISOString();
  let item = await readRecord(config.client, config.table, normalizedPk);
  let record = webhookOutboxRecordFromItem(item);
  if (!record || record.nextAttemptAt === null || record.nextAttemptAt > nowSeconds) return null;

  if (record.state !== 'dead_letter' && record.attempts >= maxAttempts) {
    await transitionExhaustedToDeadLetter({
      db: config.client,
      table: config.table,
      record,
      nowSeconds,
      nowIso,
      maxAttempts,
    });
    item = await readRecord(config.client, config.table, normalizedPk);
    record = webhookOutboxRecordFromItem(item);
    if (!record || record.state !== 'dead_letter') return null;
  }

  const owner = randomUUID();
  if (record.state === 'dead_letter') {
    const claimed = await claimDeadLetterAlert({
      db: config.client,
      table: config.table,
      record,
      owner,
      nowSeconds,
      nowIso,
    });
    if (!claimed) return null;
    return {
      kind: 'alert',
      owner,
      record: { ...record, alertState: 'processing', alertAttempts: record.alertAttempts + 1 },
    };
  }

  try {
    await transact(config.client, {
      Update: {
        TableName: config.table,
        Key: { pk: s(normalizedPk) },
        UpdateExpression: 'SET #state = :processing, lease_until = :lease, owner_token = :owner, updated_at = :now, next_attempt_at = :lease ADD attempts :one',
        ConditionExpression: 'payload_digest = :digest AND outbox_partition = :queue AND next_attempt_at <= :epoch AND attempts < :max AND (#state = :pending OR #state = :failed OR (#state = :processing AND lease_until < :epoch))',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':digest': s(record.payloadDigest),
          ':queue': s(OUTBOX_QUEUE_PARTITION),
          ':epoch': n(nowSeconds),
          ':max': n(maxAttempts),
          ':pending': s('pending'),
          ':failed': s('failed'),
          ':processing': s('processing'),
          ':lease': n(nowSeconds + LEASE_SECONDS),
          ':owner': s(owner),
          ':now': s(nowIso),
          ':one': n(1),
        },
      },
    });
    return {
      kind: 'effect',
      owner,
      record: { ...record, state: 'processing', attempts: record.attempts + 1 },
    };
  } catch (error) {
    if (conditionalFailure(error)) return null;
    throw new WebhookOutboxUnavailableError('webhook_outbox_redrive_claim_failed', error);
  }
}

export async function completeClaimedWebhookEffect({
  pk,
  owner,
  externalRef = null,
  client,
  tableName,
  now = new Date(),
}) {
  const config = queueConfig({ tableName, client });
  await markDone({
    db: config.client,
    table: config.table,
    pk,
    owner,
    nowIso: now.toISOString(),
    externalRef,
  });
}

export async function failClaimedWebhookEffect({
  pk,
  owner,
  attempts,
  error,
  forceDeadLetter = false,
  client,
  tableName,
  now = new Date(),
  maxAttempts = WEBHOOK_REDRIVE_MAX_ATTEMPTS,
}) {
  const config = queueConfig({ tableName, client });
  const deadLetter = forceDeadLetter || attempts >= maxAttempts;
  const nowIso = now.toISOString();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const safeError = safeOperationalError(error, forceDeadLetter ? 'unsafe_redrive' : 'delivery_error');
  const expressionValues = deadLetter
    ? {
      ':processing': s('processing'),
      ':deadLetter': s('dead_letter'),
      ':alertPending': s('pending'),
      ':owner': s(owner),
      ':error': s(safeError),
      ':now': s(nowIso),
      ':queue': s(OUTBOX_QUEUE_PARTITION),
      ':epoch': n(nowSeconds),
    }
    : {
      ':processing': s('processing'),
      ':failed': s('failed'),
      ':owner': s(owner),
      ':error': s(safeError),
      ':now': s(nowIso),
      ':queue': s(OUTBOX_QUEUE_PARTITION),
      ':next': n(nowSeconds + retryDelaySeconds(attempts)),
    };
  try {
    await transact(config.client, {
      Update: {
        TableName: config.table,
        Key: { pk: s(pk) },
        UpdateExpression: deadLetter
          ? 'SET #state = :deadLetter, alert_state = :alertPending, dead_lettered_at = :now, last_error = :error, updated_at = :now, outbox_partition = :queue, next_attempt_at = :epoch REMOVE lease_until, owner_token'
          : 'SET #state = :failed, last_error = :error, updated_at = :now, outbox_partition = :queue, next_attempt_at = :next REMOVE lease_until, owner_token',
        ConditionExpression: '#state = :processing AND owner_token = :owner',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: expressionValues,
      },
    });
    return { deadLetter, nextAttemptAt: deadLetter ? nowSeconds : nowSeconds + retryDelaySeconds(attempts) };
  } catch (cause) {
    throw new WebhookOutboxUnavailableError('webhook_outbox_redrive_fail_failed', cause);
  }
}

export async function completeClaimedDeadLetterAlert({
  pk,
  owner,
  externalRef = null,
  client,
  tableName,
  now = new Date(),
}) {
  const config = queueConfig({ tableName, client });
  const values = {
    ':deadLetter': s('dead_letter'),
    ':processing': s('processing'),
    ':sent': s('sent'),
    ':owner': s(owner),
    ':now': s(now.toISOString()),
  };
  let update = 'SET alert_state = :sent, alerted_at = :now, updated_at = :now';
  if (externalRef) {
    values[':external'] = s(String(externalRef).slice(0, 200));
    update += ', alert_external_ref = :external';
  }
  update += ' REMOVE lease_until, owner_token, alert_last_error, outbox_partition, next_attempt_at';
  try {
    await transact(config.client, {
      Update: {
        TableName: config.table,
        Key: { pk: s(pk) },
        UpdateExpression: update,
        ConditionExpression: '#state = :deadLetter AND alert_state = :processing AND owner_token = :owner',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: values,
      },
    });
  } catch (error) {
    throw new WebhookOutboxUnavailableError('webhook_outbox_alert_complete_failed', error);
  }
}

export async function failClaimedDeadLetterAlert({
  pk,
  owner,
  alertAttempts,
  error,
  client,
  tableName,
  now = new Date(),
}) {
  const config = queueConfig({ tableName, client });
  const nowSeconds = Math.floor(now.getTime() / 1000);
  try {
    await transact(config.client, {
      Update: {
        TableName: config.table,
        Key: { pk: s(pk) },
        UpdateExpression: 'SET alert_state = :failed, alert_last_error = :error, updated_at = :now, outbox_partition = :queue, next_attempt_at = :next REMOVE lease_until, owner_token',
        ConditionExpression: '#state = :deadLetter AND alert_state = :processing AND owner_token = :owner',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':deadLetter': s('dead_letter'),
          ':processing': s('processing'),
          ':failed': s('failed'),
          ':owner': s(owner),
          ':error': s(safeOperationalError(error, 'alert_delivery_error')),
          ':now': s(now.toISOString()),
          ':queue': s(OUTBOX_QUEUE_PARTITION),
          ':next': n(nowSeconds + alertRetryDelaySeconds(alertAttempts)),
        },
      },
    });
  } catch (cause) {
    throw new WebhookOutboxUnavailableError('webhook_outbox_alert_fail_failed', cause);
  }
}

/**
 * Serializa o ciclo inventário -> notificações de uma reserva. Sem esta lease,
 * um evento antigo pode aplicar primeiro, pausar, e enviar "PAGO" depois que
 * outro worker já processou e notificou um reembolso mais novo.
 */
export async function withWebhookReservationLock({
  provider,
  reservationKey,
  execute,
  client,
  tableName,
  now = new Date(),
}) {
  if (typeof execute !== 'function') throw new TypeError('webhook_lock_execute_required');
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError('invalid_webhook_lock_clock');
  }
  const config = requireLockConfig({ provider, reservationKey, tableName, client });
  const owner = randomUUID();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  try {
    await transact(config.client, {
      Put: {
        TableName: config.table,
        Item: {
          pk: s(config.pk),
          provider: s(provider),
          reservation_hash: s(config.hash),
          record_type: s('WEBHOOK_LOCK'),
          owner_token: s(owner),
          lease_until: n(nowSeconds + LEASE_SECONDS),
          ttl: n(nowSeconds + WEBHOOK_OUTBOX_RETENTION_SECONDS),
          created_at: s(now.toISOString()),
        },
        ConditionExpression: 'attribute_not_exists(pk) OR lease_until < :epoch',
        ExpressionAttributeValues: { ':epoch': n(nowSeconds) },
      },
    });
  } catch (error) {
    if (conditionalFailure(error)) throw new WebhookOutboxBusyError();
    throw new WebhookOutboxUnavailableError('webhook_lock_acquire_failed', error);
  }

  try {
    return await execute();
  } finally {
    try {
      await transact(config.client, {
        Delete: {
          TableName: config.table,
          Key: { pk: s(config.pk) },
          ConditionExpression: 'owner_token = :owner',
          ExpressionAttributeValues: { ':owner': s(owner) },
        },
      });
    } catch {
      // Lease curta garante recuperação mesmo se a remoção pós-efeito falhar.
    }
  }
}
