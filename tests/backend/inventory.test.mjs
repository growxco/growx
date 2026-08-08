import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import process from 'node:process';
import test from 'node:test';
import { URL } from 'node:url';

import {
  acquireReservation,
  attachProvider,
  claimReconciliationLease,
  InventoryBuyerConflictError,
  InventoryConflictError,
  InventoryLatePaymentReassignedError,
  InventoryRateLimitError,
  InventorySoldOutError,
  InventoryUnavailableError,
  financialEventCursor,
  inventorySummary,
  listSlots,
  markReservationPaid,
  releaseReservation,
  releaseUnattachedReservation,
} from '../../api/_lib/inventory.js';
import { estadoDoLote, reconcileExpiredHolds } from '../../api/_lib/lote.js';
import { verifyMercadoPagoOrderBinding } from '../../api/mp-webhook.js';
import { PREVENDA_RELEASE } from '../../src/lib/prevendaRelease.js';

const TABLE = 'growx-prevenda-test';
const clone = (input) => JSON.parse(JSON.stringify(input));

const value = (item, key) => item?.[key]?.S ?? item?.[key]?.N;
const hash = (label) => createHash('sha256').update(label).digest('hex');
const guards = (label) => ({ buyerKey: hash(`buyer:${label}`), riskKey: hash(`risk:${label}`) });
const mpOrderIntent = (requestId) => ({
  providerProtocol: 'mp_orders_v1',
  providerExternalReference: `gx-modulo-prevenda-${requestId}`,
  providerIdempotencyKey: requestId,
});
const providerMetadata = (reservation, overrides = {}) => ({
  source: 'growx.com.br/prevenda',
  request_id: reservation.requestId,
  slot_id: reservation.slot,
  buyer_hash: String(reservation.buyerPk || '').replace(/^BUYER#/, ''),
  sku: reservation.offerSku,
  contract_version: reservation.contractVersion,
  ...overrides,
});
const MP_ORDER_ID = 'ORD01HRYFWNYRE1MR1E60MW3X0T2P';
const MP_ORDER_PAYMENT_ID = 'PAY01HRYFWNYRE1MR1E60MW3X0T2P';
const providerOrder = (reservation, overrides = {}) => {
  const amount = (reservation.offerAmountCents / 100).toFixed(2);
  return {
    id: MP_ORDER_ID,
    type: 'online',
    processing_mode: 'automatic',
    capture_mode: 'automatic',
    external_reference: `gx-modulo-prevenda-${reservation.requestId}`,
    total_amount: amount,
    total_paid_amount: amount,
    country_code: 'BRA',
    status: 'processed',
    status_detail: 'accredited',
    created_date: '2026-08-05T12:00:10.000Z',
    last_updated_date: '2026-08-05T12:31:00.000Z',
    transactions: {
      payments: [{
        id: MP_ORDER_PAYMENT_ID,
        amount,
        paid_amount: amount,
        status: 'processed',
        status_detail: 'accredited',
        payment_method: { id: 'pix', type: 'bank_transfer' },
      }],
      chargebacks: [],
    },
    ...overrides,
  };
};

test('cursor financeiro aceita evento explícito de Orders sem mascará-lo como Payment', () => {
  const orderCursor = financialEventCursor({
    provider: 'mercadopago',
    providerEventCreated: '2026-08-05T12:00:00.000Z',
    providerEventId: 'ORD01HRYFWNYRE1MR1E60MW3X0T2P',
    providerEventType: 'order.processed',
    paymentStatus: 'approved',
  });
  const reconciliationCursor = financialEventCursor({
    provider: 'mercadopago',
    providerEventCreated: '2026-08-05T12:00:00.000Z',
    providerEventId: 'ORD01HRYFWNYRE1MR1E60MW3X0T2P',
    providerEventType: 'reconcile.order',
    paymentStatus: 'approved',
  });
  assert.match(orderCursor.cursor, /\|100\|ORD/);
  assert.match(reconciliationCursor.cursor, /\|100\|ORD/);
  assert.equal(orderCursor.eventType, 'order.processed');
  assert.equal(reconciliationCursor.eventType, 'reconcile.order');
});

class MemoryDynamo {
  constructor() {
    this.items = new Map();
  }

  async send(command) {
    const input = command.input;
    if (command.constructor.name === 'GetItemCommand') {
      const item = this.items.get(value(input.Key, 'pk'));
      return item ? { Item: clone(item) } : {};
    }
    if (command.constructor.name === 'BatchGetItemCommand') {
      const [table, request] = Object.entries(input.RequestItems)[0];
      const items = request.Keys
        .map((key) => this.items.get(value(key, 'pk')))
        .filter(Boolean)
        .map((item) => clone(item));
      return { Responses: { [table]: items }, UnprocessedKeys: {} };
    }
    if (command.constructor.name === 'TransactWriteItemsCommand') {
      const next = new Map([...this.items].map(([key, item]) => [key, clone(item)]));
      const reasons = input.TransactItems.map(() => ({ Code: 'None' }));
      try {
        for (let index = 0; index < input.TransactItems.length; index += 1) {
          const operation = input.TransactItems[index];
          try {
            if (operation.Put) this.#put(next, operation.Put);
            else if (operation.Update) this.#update(next, operation.Update);
            else throw new Error('unsupported_fake_operation');
          } catch (cause) {
            reasons[index] = { Code: 'ConditionalCheckFailed', Message: cause.message };
            throw cause;
          }
        }
      } catch (cause) {
        const error = new Error(cause.message);
        error.name = 'TransactionCanceledException';
        error.CancellationReasons = reasons;
        throw error;
      }
      this.items = next;
      return {};
    }
    throw new Error(`unsupported_fake_command:${command.constructor.name}`);
  }

  #put(items, put) {
    const pk = value(put.Item, 'pk');
    const current = items.get(pk);
    if (put.ConditionExpression === 'attribute_not_exists(pk)' && current) {
      throw new Error('request_exists');
    }
    if (put.ConditionExpression?.includes('#state = :released')
        && current && value(current, 'state') !== value(put.ExpressionAttributeValues, ':released')) {
      throw new Error('slot_occupied');
    }
    items.set(pk, clone(put.Item));
  }

  #update(items, update) {
    const pk = value(update.Key, 'pk');
    const values = update.ExpressionAttributeValues;
    if (update.ConditionExpression?.includes('attribute_not_exists(acquisitions)')) {
      const current = items.get(pk) || clone(update.Key);
      const acquisitions = Number(value(current, 'acquisitions') || 0);
      if (acquisitions >= Number(value(values, ':limit'))) throw new Error('rate_limited');
      current.updated_at = clone(values[':now']);
      current.ttl = clone(values[':ttl']);
      current.acquisitions = { N: String(acquisitions + Number(value(values, ':one'))) };
      items.set(pk, current);
      return;
    }

    const current = items.get(pk);
    if (!current) throw new Error('missing_item');
    const state = value(current, 'state');
    if (value(current, 'reservation_id') !== value(values, ':rid')) throw new Error('reservation_mismatch');
    if (value(current, 'provider') !== value(values, ':provider')) throw new Error('provider_mismatch');
    if (update.ConditionExpression.includes('contract_version = :contractVersion')
        && value(current, 'contract_version') !== value(values, ':contractVersion')) {
      throw new Error('contract_version_mismatch');
    }
    if (update.ConditionExpression.includes('release_manifest_sha256 = :releaseManifestSha256')
        && value(current, 'release_manifest_sha256') !== value(values, ':releaseManifestSha256')) {
      throw new Error('release_manifest_sha256_mismatch');
    }
    if (update.ConditionExpression.includes('attribute_not_exists(release_manifest_sha256)')
        && value(current, 'release_manifest_sha256') !== undefined) {
      throw new Error('legacy_release_manifest_present');
    }
    for (const [field, token] of [
      ['offer_amount_cents', ':offerAmountCents'],
      ['offer_currency', ':offerCurrency'],
      ['offer_sku', ':offerSku'],
    ]) {
      if (update.ConditionExpression.includes(`${field} = ${token}`)
          && value(current, field) !== value(values, token)) {
        throw new Error(`${field}_mismatch`);
      }
    }
    if (update.ConditionExpression.includes('provider_external_reference = :externalReference')) {
      for (const [field, token] of [
        ['provider_protocol', ':protocol'],
        ['provider_external_reference', ':externalReference'],
        ['provider_idempotency_key', ':idempotencyKey'],
      ]) {
        if (value(current, field) !== value(values, token)) {
          throw new Error(`${field}_mismatch`);
        }
      }
    }
    if (update.ConditionExpression.includes('provider_search_negative_count = :previousNegativeCount')) {
      const currentCount = Number(value(current, 'provider_search_negative_count') || 0);
      if (currentCount !== Number(value(values, ':previousNegativeCount'))) {
        throw new Error('provider_search_negative_count_mismatch');
      }
    }
    if (update.ConditionExpression.includes('OR #state = :released')) {
      const allowed = update.ConditionExpression.includes('OR #state = :paid')
        ? ['held', 'released', 'paid']
        : ['held', 'released'];
      if (!allowed.includes(state)) throw new Error('state_mismatch');
    } else if (update.ConditionExpression.includes('OR #state = :paid')) {
      if (!['held', 'paid'].includes(state)) throw new Error('state_mismatch');
    } else if (state !== 'held') {
      throw new Error('state_mismatch');
    }
    if (update.ConditionExpression.includes('provider_ref = :ref')) {
      const currentRef = value(current, 'provider_ref');
      if (currentRef && currentRef !== value(values, ':ref')) throw new Error('provider_ref_mismatch');
    }
    if (update.ConditionExpression.includes('attribute_not_exists(provider_ref) AND attribute_not_exists(provider_url)')) {
      if (value(current, 'provider_ref') || value(current, 'provider_url')) {
        throw new Error('provider_already_attached');
      }
    }
    if (update.ConditionExpression.includes('attribute_not_exists(provider_event_cursor)')) {
      const currentCursor = value(current, 'provider_event_cursor');
      const incomingCursor = value(values, ':eventCursor');
      if (currentCursor && currentCursor >= incomingCursor) {
        throw new Error('stale_provider_event');
      }
    }

    const names = update.ExpressionAttributeNames || {};
    const [, setExpression = '', removeExpression = ''] = update.UpdateExpression
      .match(/^SET\s+(.+?)(?:\s+REMOVE\s+(.+))?$/) || [];
    if (!setExpression) throw new Error('unsupported_fake_update_expression');
    const assignments = setExpression.split(/,\s*/);
    for (const assignment of assignments) {
      const [rawKey, rawValue] = assignment.split(/\s*=\s*/);
      const key = names[rawKey] || rawKey;
      current[key] = clone(values[rawValue]);
    }
    for (const rawKey of removeExpression.split(/,\s*/).filter(Boolean)) {
      delete current[names[rawKey] || rawKey];
    }
    items.set(pk, current);
  }
}

class UnprocessedOnceDynamo extends MemoryDynamo {
  constructor() {
    super();
    this.returnedUnprocessed = false;
  }

  async send(command) {
    if (command.constructor.name === 'BatchGetItemCommand' && !this.returnedUnprocessed) {
      this.returnedUnprocessed = true;
      const [table, request] = Object.entries(command.input.RequestItems)[0];
      return {
        Responses: { [table]: [] },
        UnprocessedKeys: { [table]: { Keys: clone(request.Keys) } },
      };
    }
    return super.send(command);
  }
}

class AlwaysUnprocessedDynamo extends MemoryDynamo {
  constructor() {
    super();
    this.readAttempts = 0;
  }

  async send(command) {
    if (command.constructor.name === 'BatchGetItemCommand') {
      this.readAttempts += 1;
      const [table, request] = Object.entries(command.input.RequestItems)[0];
      return {
        Responses: { [table]: [] },
        UnprocessedKeys: { [table]: { Keys: clone(request.Keys) } },
      };
    }
    return super.send(command);
  }
}

class ThrottledOnceDynamo extends MemoryDynamo {
  constructor() {
    super();
    this.throttled = false;
  }

  async send(command) {
    if (command.constructor.name === 'BatchGetItemCommand' && !this.throttled) {
      this.throttled = true;
      const error = new Error('throttled');
      error.name = 'ThrottlingException';
      error.$retryable = { throttling: true };
      throw error;
    }
    return super.send(command);
  }
}

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const orderSearchResponse = (data, {
  page = 1,
  total = data.length,
  pageSize = 50,
  totalPages = Math.ceil(total / pageSize),
  offset = (page - 1) * pageSize,
} = {}) => response({
  data,
  paging: {
    total: String(total),
    total_pages: String(totalPages),
    offset: String(offset),
    limit: String(pageSize),
  },
});

const reconcileAndRead = async (options) => {
  await reconcileExpiredHolds({
    ...options,
    reconcileStripePaidImpl: options.reconcileStripePaidImpl || (async ({
      reservation, session, now, inventoryOptions,
    }) => markReservationPaid({
      requestId: reservation.requestId,
      slot: reservation.slot,
      provider: 'stripe',
      providerRef: session.id,
      paymentStatus: 'paid',
      providerEventCreated: session.created,
      providerEventId: `evt_test_${session.id}`,
      providerEventType: 'reconcile.checkout.session',
      refundedCents: 0,
      disputedCents: 0,
      chargedBackCents: 0,
      now,
      ...inventoryOptions,
    })),
    reconcileMercadoPagoPaidImpl: options.reconcileMercadoPagoPaidImpl || (async ({
      reservation, payment, now, inventoryOptions,
    }) => {
      const paymentStatus = payment.status === 'in_mediation' ? 'disputed' : payment.status;
      const totalCents = Math.round(Number(payment.transaction_amount) * 100);
      return markReservationPaid({
        requestId: reservation.requestId,
        slot: reservation.slot,
        provider: 'mercadopago',
        providerRef: String(payment.id),
        paymentStatus,
        providerEventCreated: payment.date_last_updated || payment.date_approved || payment.date_created,
        providerEventId: String(payment.id),
        providerEventType: 'reconcile.payment',
        refundedCents: paymentStatus === 'refunded' ? totalCents : 0,
        disputedCents: paymentStatus === 'disputed' ? totalCents : 0,
        chargedBackCents: paymentStatus === 'charged_back' ? totalCents : 0,
        now,
        ...inventoryOptions,
      });
    }),
    reconcileMercadoPagoOrderPaidImpl: options.reconcileMercadoPagoOrderPaidImpl || (async ({
      reservation, order, canonical, now, inventoryOptions,
    }) => markReservationPaid({
      requestId: reservation.requestId,
      slot: reservation.slot,
      provider: 'mercadopago',
      providerRef: String(order.id),
      paymentStatus: canonical.snapshot.paymentStatus,
      providerEventCreated: canonical.snapshot.providerEventCreated,
      providerEventId: canonical.snapshot.canonicalEventId,
      providerEventType: 'reconcile.order',
      refundedCents: canonical.snapshot.refundedCents,
      disputedCents: canonical.snapshot.disputedCents,
      chargedBackCents: canonical.snapshot.chargedBackCents,
      now,
      ...inventoryOptions,
    })),
  });
  return estadoDoLote(options);
};

const acquireAttachedMpOrder = async (client, label) => {
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards(label),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    providerProtocol: 'mp_orders_v1',
    providerRef: MP_ORDER_ID,
    providerUrl: '/prevenda/sucesso',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });
  return reservation;
};

test('BatchGet repete somente chaves não processadas e preserva leitura forte completa', async () => {
  const client = new UnprocessedOnceDynamo();
  const slots = await listSlots({
    client,
    tableName: TABLE,
    readRetrySleep: async () => {},
  });

  assert.equal(client.returnedUnprocessed, true);
  assert.equal(slots.length, 100);
  assert.equal(slots.every((slot) => slot.state === 'released'), true);
});

test('BatchGet parcial além do limite continua falhando fechado', async () => {
  const client = new AlwaysUnprocessedDynamo();
  await assert.rejects(
    listSlots({ client, tableName: TABLE, readRetrySleep: async () => {} }),
    (error) => error instanceof InventoryUnavailableError
      && error.message === 'inventory_read_incomplete',
  );
  assert.equal(client.readAttempts, 10);
});

test('throttling transitório de leitura recebe backoff bounded e converge', async () => {
  const client = new ThrottledOnceDynamo();
  const slots = await listSlots({
    client,
    tableName: TABLE,
    readRetrySleep: async () => {},
    readRetryRandom: () => 0,
  });

  assert.equal(client.throttled, true);
  assert.equal(slots.length, 100);
  assert.equal(slots.every((slot) => slot.state === 'released'), true);
});

test('200 reservas concorrentes adquirem exatamente 100 slots', async () => {
  const client = new MemoryDynamo();
  const now = new Date('2026-08-05T12:00:00.000Z');
  const providerExpiresAt = new Date(now.getTime() + 30 * 60_000);
  const attempts = Array.from({ length: 200 }, (_, index) => {
    const requestId = randomUUID();
    return acquireReservation({
      requestId,
      provider: 'stripe',
      ...guards(`concurrent-${index}`),
      providerExpiresAt,
      now,
      client,
      tableName: TABLE,
    });
  });
  const results = await Promise.allSettled(attempts);
  const fulfilled = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');

  assert.equal(fulfilled.length, 100);
  assert.equal(new Set(fulfilled.map((result) => result.value.slot)).size, 100);
  assert.equal(rejected.length, 100);
  assert.ok(rejected.every((result) => result.reason instanceof InventorySoldOutError));
  assert.deepEqual(inventorySummary(await listSlots({ client, tableName: TABLE })), {
    total: 100,
    vendidas: 0,
    reservadas: 100,
    ocupadas: 100,
    restantes: 0,
    esgotado: true,
    confiavel: true,
  });
});

test('REQUEST uuid é idempotente e nunca ganha um segundo slot', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const args = {
    requestId,
    provider: 'stripe',
    ...guards(requestId),
    emailHash: hash(`email:${requestId}`),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  };
  const [first, second] = await Promise.all([acquireReservation(args), acquireReservation(args)]);
  assert.equal(first.slot, second.slot);
  assert.equal([first, second].filter((reservation) => reservation.created).length, 1);
  assert.equal((await listSlots({ client, tableName: TABLE })).filter((slot) => slot.state === 'held').length, 1);
  for (const pk of [first.slot, `REQUEST#${requestId}`, `BUYER#${guards(requestId).buyerKey}`]) {
    assert.equal(value(client.items.get(pk), 'contract_version'), 'v3-2026-08-08');
    assert.equal(value(client.items.get(pk), 'offer_amount_cents'), '300000');
    assert.equal(value(client.items.get(pk), 'offer_currency'), 'BRL');
    assert.equal(value(client.items.get(pk), 'offer_sku'), 'prevenda_cartao');
    assert.equal(
      value(client.items.get(pk), 'release_manifest_sha256'),
      PREVENDA_RELEASE.manifestSha256,
    );
    assert.equal(value(client.items.get(pk), 'terms_acknowledged_at'), '2026-08-05T12:00:00.000Z');
    assert.equal(value(client.items.get(pk), 'email_hash'), hash(`email:${requestId}`));
  }
  const afterGlobalOfferChange = await acquireReservation({
    ...args,
    offerAmountCents: 345_678,
    offerCurrency: 'USD',
    offerSku: 'prevenda_cartao_v3',
    contractVersion: 'v3-divergente',
  });
  assert.equal(afterGlobalOfferChange.slot, first.slot);
  assert.equal(afterGlobalOfferChange.offerAmountCents, 300_000);
  assert.equal(afterGlobalOfferChange.offerCurrency, 'BRL');
  assert.equal(afterGlobalOfferChange.offerSku, 'prevenda_cartao');
  assert.equal(afterGlobalOfferChange.contractVersion, 'v3-2026-08-08');

  await assert.rejects(
    acquireReservation({ ...args, emailHash: hash('email:outra-identidade') }),
    (error) => error instanceof InventoryConflictError
      && error.message === 'request_email_mismatch',
  );

  client.items.get(`BUYER#${guards(requestId).buyerKey}`).offer_amount_cents = { N: '1' };
  await assert.rejects(acquireReservation(args), (error) => (
    error instanceof InventoryUnavailableError
      && error.message === 'inventory_reservation_snapshot_mismatch'
  ));
});

test('intent MP Orders nasce atomicamente em REQUEST SLOT BUYER e replay exige a mesma chave', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const intent = mpOrderIntent(requestId);
  const args = {
    requestId,
    provider: 'mercadopago',
    ...guards('mp-order-intent'),
    emailHash: hash('email:mp-order-intent'),
    ...intent,
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  };
  const [first, replay] = await Promise.all([
    acquireReservation(args),
    acquireReservation(args),
  ]);
  assert.equal(first.slot, replay.slot);
  assert.equal([first, replay].filter((entry) => entry.created).length, 1);
  for (const pk of [first.slot, `REQUEST#${requestId}`, `BUYER#${args.buyerKey}`]) {
    const item = client.items.get(pk);
    assert.equal(value(item, 'provider_protocol'), 'mp_orders_v1');
    assert.equal(value(item, 'provider_external_reference'), intent.providerExternalReference);
    assert.equal(value(item, 'provider_idempotency_key'), requestId);
  }
  await assert.rejects(
    acquireReservation({
      ...args,
      providerExternalReference: `gx-modulo-prevenda-${randomUUID()}`,
    }),
    (error) => error instanceof InventoryConflictError
      && error.message === 'invalid_provider_intent',
  );
  await assert.rejects(
    acquireReservation({
      ...args,
      providerProtocol: undefined,
      providerExternalReference: undefined,
      providerIdempotencyKey: undefined,
    }),
    (error) => error instanceof InventoryConflictError
      && error.message === 'request_provider_intent_mismatch',
  );
});

test('claim do cron permite um único reconciliador por minuto', async () => {
  const client = new MemoryDynamo();
  const now = new Date('2026-08-05T12:00:10.000Z');
  const [first, second] = await Promise.all([
    claimReconciliationLease({ now, client, tableName: TABLE }),
    claimReconciliationLease({ now, client, tableName: TABLE }),
  ]);
  assert.equal([first, second].filter((lease) => lease.acquired).length, 1);
  assert.equal([first, second].filter((lease) => !lease.acquired).length, 1);
  const nextMinute = await claimReconciliationLease({
    now: new Date('2026-08-05T12:01:00.000Z'), client, tableName: TABLE,
  });
  assert.equal(nextMinute.acquired, true);
});

test('comprador só mantém uma reserva ativa mesmo com requests concorrentes', async () => {
  const client = new MemoryDynamo();
  const buyerKey = hash('buyer:shared');
  const base = {
    provider: 'stripe',
    buyerKey,
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  };
  const results = await Promise.allSettled([
    acquireReservation({ ...base, requestId: randomUUID(), riskKey: hash('risk:shared-a') }),
    acquireReservation({ ...base, requestId: randomUUID(), riskKey: hash('risk:shared-b') }),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.ok(rejected.reason instanceof InventoryBuyerConflictError);
  assert.equal((await listSlots({ client, tableName: TABLE })).filter((slot) => slot.state === 'held').length, 1);
});

test('IP pode adquirir no máximo três reservas bem-sucedidas por janela de 31 minutos', async () => {
  const client = new MemoryDynamo();
  const riskKey = hash('risk:shared-ip');
  const attempts = Array.from({ length: 4 }, (_, index) => acquireReservation({
    requestId: randomUUID(),
    provider: 'stripe',
    buyerKey: hash(`buyer:rate-${index}`),
    riskKey,
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  }));
  const results = await Promise.allSettled(attempts);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 3);
  const rejected = results.find((result) => result.status === 'rejected');
  assert.ok(rejected.reason instanceof InventoryRateLimitError);
  assert.equal((await listSlots({ client, tableName: TABLE })).filter((slot) => slot.state === 'held').length, 3);
  const rateItem = [...client.items.entries()].find(([pk]) => pk.startsWith(`RATE#${riskKey}#`))?.[1];
  assert.equal(Number(value(rateItem, 'acquisitions')), 3);
  assert.ok(Number(value(rateItem, 'ttl')) > 0);
});

test('liberação real solta BUYER atomicamente e permite nova reserva', async () => {
  const client = new MemoryDynamo();
  const buyerKey = hash('buyer:reusable');
  const firstRequest = randomUUID();
  const first = await acquireReservation({
    requestId: firstRequest,
    provider: 'stripe',
    buyerKey,
    riskKey: hash('risk:release-a'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId: firstRequest,
    slot: first.slot,
    provider: 'stripe',
    providerRef: 'cs_release_reuse',
    providerUrl: 'https://checkout.stripe.test/reuse',
    providerExpiresAt: '2026-08-05T12:31:00.000Z',
    client,
    tableName: TABLE,
  });
  assert.equal(value(client.items.get(first.slot), 'provider_url'), undefined);
  assert.equal(value(client.items.get(`REQUEST#${firstRequest}`), 'provider_url'),
    'https://checkout.stripe.test/reuse');
  assert.equal(value(client.items.get(first.slot), 'buyer_pk'), `BUYER#${buyerKey}`);
  assert.equal(await releaseReservation({
    requestId: firstRequest,
    slot: first.slot,
    provider: 'stripe',
    providerRef: 'cs_release_reuse',
    reason: 'test_release',
    now: new Date('2026-08-05T12:32:00.000Z'),
    client,
    tableName: TABLE,
  }), true);

  const buyerItem = client.items.get(`BUYER#${buyerKey}`);
  const requestItem = client.items.get(`REQUEST#${firstRequest}`);
  const slotItem = client.items.get(first.slot);
  assert.equal(value(buyerItem, 'state'), 'released');
  assert.ok(Number(value(buyerItem, 'ttl')) > 0);
  assert.ok(Number(value(requestItem, 'ttl')) > 0);
  assert.equal(value(slotItem, 'ttl'), undefined);
  assert.equal(value(slotItem, 'buyer_pk'), undefined);
  assert.equal(value(slotItem, 'provider_url'), undefined);
  assert.equal(value(requestItem, 'provider_url'), undefined);
  assert.equal(value(requestItem, 'buyer_pk'), `BUYER#${buyerKey}`);

  const secondRequest = randomUUID();
  const second = await acquireReservation({
    requestId: secondRequest,
    provider: 'stripe',
    buyerKey,
    riskKey: hash('risk:release-b'),
    now: new Date('2026-08-05T12:33:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T13:04:00.000Z'),
    client,
    tableName: TABLE,
  });
  assert.equal(second.created, true);
  assert.equal(value(client.items.get(`BUYER#${buyerKey}`), 'reservation_id'), secondRequest);
});

test('rejeição conclusiva libera somente reserva unattached com ownership exato', async () => {
  const client = new MemoryDynamo();
  const buyerKey = hash('buyer:definitive-rejection');
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'stripe',
    buyerKey,
    riskKey: hash('risk:definitive-rejection'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });
  assert.equal(await releaseUnattachedReservation({
    requestId,
    slot: reservation.slot,
    provider: 'stripe',
    reason: 'stripe_definitive_http_400',
    now: new Date('2026-08-05T12:00:05.000Z'),
    client,
    tableName: TABLE,
  }), true);
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'released');
  assert.equal(value(client.items.get(`REQUEST#${requestId}`), 'state'), 'released');
  assert.equal(value(client.items.get(`BUYER#${buyerKey}`), 'state'), 'released');
  assert.equal(value(client.items.get(reservation.slot), 'buyer_pk'), undefined);
  assert.equal(value(client.items.get(`REQUEST#${requestId}`), 'buyer_pk'), `BUYER#${buyerKey}`);

  const retry = await acquireReservation({
    requestId: randomUUID(),
    provider: 'stripe',
    buyerKey,
    riskKey: hash('risk:definitive-rejection-retry'),
    now: new Date('2026-08-05T12:01:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:32:00.000Z'),
    client,
    tableName: TABLE,
  });
  assert.equal(retry.created, true);
});

test('reserva attached nunca é liberada pelo caminho de rejeição pré-provider', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards('attached-not-releasable'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    providerRef: 'pref_attached_guard',
    providerUrl: 'https://mercadopago.test/attached',
    providerExpiresAt: '2026-08-05T12:31:00.000Z',
    client,
    tableName: TABLE,
  });
  await assert.rejects(releaseUnattachedReservation({
    requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    reason: 'must_not_release',
    client,
    tableName: TABLE,
  }), InventoryConflictError);
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'held');
  assert.equal(value(client.items.get(reservation.slot), 'provider_ref'), 'pref_attached_guard');
  assert.equal(value(client.items.get(reservation.slot), 'provider_protocol'), 'mp_checkout_pro_v1');
});

test('referência ORD persiste protocolo MP Orders em SLOT e REQUEST', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards('mp-orders-protocol'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });

  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    providerRef: 'ORD01TESTMPORDERS123456789',
    providerUrl: '/prevenda/sucesso',
    providerExpiresAt: '2026-08-05T12:31:00.000Z',
    client,
    tableName: TABLE,
  });

  for (const pk of [reservation.slot, `REQUEST#${requestId}`]) {
    assert.equal(value(client.items.get(pk), 'provider_protocol'), 'mp_orders_v1');
  }
  const decoded = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards('mp-orders-protocol'),
    now: new Date('2026-08-05T12:00:10.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });
  assert.equal(decoded.providerProtocol, 'mp_orders_v1');
});

test('reconciliação MP Orders relê somente a ORD canônica e entrega paid ao callback injetado', async () => {
  const client = new MemoryDynamo();
  const reservation = await acquireAttachedMpOrder(client, 'mp-order-paid-reconcile');
  process.env.MP_ACCESS_TOKEN = 'APP_USR_order_paid_reconcile';
  const urls = [];
  let callbackCalls = 0;

  const lote = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async (url) => {
      urls.push(String(url));
      return response(providerOrder(reservation));
    },
    reconcileMercadoPagoOrderPaidImpl: async ({
      reservation: boundReservation, order, canonical, now, inventoryOptions,
    }) => {
      callbackCalls += 1;
      return markReservationPaid({
        requestId: boundReservation.requestId,
        slot: boundReservation.slot,
        provider: 'mercadopago',
        providerRef: order.id,
        paymentStatus: canonical.snapshot.paymentStatus,
        providerEventCreated: canonical.snapshot.providerEventCreated,
        providerEventId: canonical.snapshot.canonicalEventId,
        providerEventType: 'reconcile.order',
        refundedCents: 0,
        disputedCents: 0,
        chargedBackCents: 0,
        now,
        ...inventoryOptions,
      });
    },
  });

  assert.deepEqual(urls, [`https://api.mercadopago.com/v1/orders/${MP_ORDER_ID}`]);
  assert.equal(callbackCalls, 1);
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'paid');
  assert.equal(value(client.items.get(`REQUEST#${reservation.requestId}`), 'last_provider_ref'), MP_ORDER_ID);
  assert.equal(lote.vendidas, 1);
  assert.equal(lote.restantes, 99);
});

for (const [status, statusDetail] of [
  ['created', 'created'],
  ['processing', 'in_process'],
  ['action_required', 'waiting_transfer'],
]) {
  test(`MP Orders ${status}/${statusDetail} preserva hold mesmo após a graça`, async () => {
    const client = new MemoryDynamo();
    const reservation = await acquireAttachedMpOrder(client, `mp-order-pending-${status}`);
    process.env.MP_ACCESS_TOKEN = `APP_USR_order_pending_${status}`;
    let callbackCalls = 0;

    const lote = await reconcileAndRead({
      now: new Date('2026-08-05T15:31:00.000Z'),
      client,
      tableName: TABLE,
      fetchImpl: async () => response(providerOrder(reservation, {
        status,
        status_detail: statusDetail,
        total_paid_amount: '0.00',
      })),
      reconcileMercadoPagoOrderPaidImpl: async () => { callbackCalls += 1; },
    });

    assert.equal(callbackCalls, 0);
    assert.equal(value(client.items.get(reservation.slot), 'state'), 'held');
    assert.equal(lote.reservadas, 1);
    assert.equal(lote.reconciliacaoPendente, true);
  });
}

for (const [status, statusDetail] of [
  ['canceled', 'canceled'],
  ['expired', 'expired'],
  ['failed', 'failed'],
]) {
  test(`MP Orders ${status}/${statusDetail} só libera após prova canônica e graça`, async () => {
    const client = new MemoryDynamo();
    const reservation = await acquireAttachedMpOrder(client, `mp-order-terminal-${status}`);
    process.env.MP_ACCESS_TOKEN = `APP_USR_order_terminal_${status}`;
    const fetchImpl = async () => response(providerOrder(reservation, {
      status,
      status_detail: statusDetail,
      total_paid_amount: '0.00',
    }));

    const duringGrace = await reconcileAndRead({
      now: new Date('2026-08-05T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
    });
    assert.equal(value(client.items.get(reservation.slot), 'state'), 'held');
    assert.equal(duringGrace.reservadas, 1);

    const afterGrace = await reconcileAndRead({
      now: new Date('2026-08-05T15:31:00.000Z'), client, tableName: TABLE, fetchImpl,
    });
    assert.equal(value(client.items.get(reservation.slot), 'state'), 'released');
    assert.equal(afterGrace.reservadas, 0);
    assert.equal(afterGrace.restantes, 100);
    assert.equal(
      value(client.items.get(`REQUEST#${reservation.requestId}`), 'release_reason'),
      `mp_order_${status}_after_settlement_grace`,
    );
  });
}

for (const [label, orderFor] of [
  ['partially_refunded', (reservation) => providerOrder(reservation, {
    status: 'processed', status_detail: 'partially_refunded',
  })],
  ['refunded', (reservation) => providerOrder(reservation, {
    status: 'refunded', status_detail: 'refunded',
  })],
  ['charged_back', (reservation) => providerOrder(reservation, {
    status: 'charged_back', status_detail: 'in_process',
  })],
  ['chargeback_entry', (reservation) => {
    const base = providerOrder(reservation);
    return {
      ...base,
      transactions: {
        ...base.transactions,
        chargebacks: [{ id: 'CBK01JQ4S4KY8HWQ6NA5PXB65B3D3' }],
      },
    };
  }],
]) {
  test(`MP Orders ${label} falha fechado e não libera inventário`, async () => {
    const client = new MemoryDynamo();
    const reservation = await acquireAttachedMpOrder(client, `mp-order-unsupported-${label}`);
    process.env.MP_ACCESS_TOKEN = `APP_USR_order_unsupported_${label}`;
    let callbackCalls = 0;

    const result = await reconcileExpiredHolds({
      now: new Date('2026-08-05T15:31:00.000Z'),
      client,
      tableName: TABLE,
      fetchImpl: async () => response(orderFor(reservation)),
      reconcileMercadoPagoOrderPaidImpl: async () => { callbackCalls += 1; },
    });

    assert.equal(result.providerFailures, 1);
    assert.equal(callbackCalls, 0);
    assert.equal(value(client.items.get(reservation.slot), 'state'), 'held');
  });
}

test('binding divergente da Order falha fechado sem chamar callback ou liberar slot', async () => {
  const client = new MemoryDynamo();
  const reservation = await acquireAttachedMpOrder(client, 'mp-order-binding-mismatch');
  process.env.MP_ACCESS_TOKEN = 'APP_USR_order_binding_mismatch';
  let callbackCalls = 0;

  const result = await reconcileExpiredHolds({
    now: new Date('2026-08-05T15:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async () => response(providerOrder(reservation, {
      external_reference: `gx-modulo-prevenda-${randomUUID()}`,
    })),
    reconcileMercadoPagoOrderPaidImpl: async () => { callbackCalls += 1; },
  });

  assert.equal(result.providerFailures, 1);
  assert.equal(callbackCalls, 0);
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'held');
});

test('cron recupera Order paga unattached por busca oficial e webhook anterior continua fail-closed', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards('mp-order-unattached-paid'),
    ...mpOrderIntent(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  const order = providerOrder(reservation);
  await assert.rejects(
    verifyMercadoPagoOrderBinding(order, { getReservationImpl: async () => reservation }),
    /order_inventory_binding_mismatch/,
  );
  process.env.MP_ACCESS_TOKEN = 'APP_USR_order_unattached_paid';
  const urls = [];
  const lote = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async (url) => {
      urls.push(String(url));
      const parsed = new URL(String(url));
      if (parsed.pathname === '/v1/orders') {
        assert.equal(parsed.searchParams.get('external_reference'),
          `gx-modulo-prevenda-${requestId}`);
        assert.equal(parsed.searchParams.get('type'), 'online');
        assert.equal(parsed.searchParams.get('page'), '1');
        assert.equal(parsed.searchParams.get('page_size'), '50');
        assert.ok(parsed.searchParams.get('begin_date'));
        assert.ok(parsed.searchParams.get('end_date'));
        return orderSearchResponse([{
          id: order.id,
          type: 'online',
          external_reference: order.external_reference,
        }]);
      }
      assert.equal(parsed.pathname, `/v1/orders/${order.id}`);
      return response(order);
    },
  });

  assert.equal(urls.length, 2);
  assert.equal(value(client.items.get(reservation.slot), 'provider_ref'), order.id);
  assert.equal(value(client.items.get(`REQUEST#${requestId}`), 'provider_ref'), order.id);
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'paid');
  assert.equal(lote.vendidas, 1);
  assert.equal(lote.restantes, 99);
});

test('reconciliações concorrentes recuperam a mesma Order sem duplicar slot ou transição financeira', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards('mp-order-concurrent-recovery'),
    ...mpOrderIntent(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  const order = providerOrder(reservation);
  process.env.MP_ACCESS_TOKEN = 'APP_USR_order_concurrent_recovery';
  const fetchImpl = async (url) => {
    const parsed = new URL(String(url));
    if (parsed.pathname === '/v1/orders') {
      return orderSearchResponse([{
        id: order.id,
        type: 'online',
        external_reference: order.external_reference,
      }]);
    }
    assert.equal(parsed.pathname, `/v1/orders/${order.id}`);
    return response(order);
  };

  const [first, second] = await Promise.all([
    reconcileAndRead({
      now: new Date('2026-08-05T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
    }),
    reconcileAndRead({
      now: new Date('2026-08-05T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
    }),
  ]);

  const slot = client.items.get(reservation.slot);
  const request = client.items.get(`REQUEST#${requestId}`);
  assert.equal(value(slot, 'provider_ref'), order.id);
  assert.equal(value(request, 'provider_ref'), order.id);
  assert.equal(value(slot, 'state'), 'paid');
  assert.equal(value(request, 'state'), 'paid');
  assert.equal(first.vendidas, 1);
  assert.equal(second.vendidas, 1);
  assert.equal(first.ocupadas, 1);
  assert.equal(second.ocupadas, 1);
});

test('zero Orders preserva hold e só libera após graça e duas buscas negativas duráveis', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const buyerKey = guards('mp-order-negative').buyerKey;
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    buyerKey,
    riskKey: guards('mp-order-negative').riskKey,
    ...mpOrderIntent(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  const fetchImpl = async () => orderSearchResponse([]);

  await reconcileExpiredHolds({
    now: new Date('2026-08-05T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  assert.equal(value(client.items.get(`REQUEST#${requestId}`), 'provider_search_negative_count'), '1');
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'held');

  await reconcileExpiredHolds({
    now: new Date('2026-08-05T12:32:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  for (const pk of [reservation.slot, `REQUEST#${requestId}`, `BUYER#${buyerKey}`]) {
    assert.equal(value(client.items.get(pk), 'provider_search_negative_count'), '2');
    assert.equal(value(client.items.get(pk), 'state'), 'held');
  }

  await reconcileExpiredHolds({
    now: new Date('2026-08-06T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'released');
  assert.equal(value(client.items.get(`REQUEST#${requestId}`), 'release_reason'),
    'mp_order_negative_after_recovery_grace');
});

test('busca Orders pagina completamente e múltiplas candidatas falham fechado', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards('mp-order-multiple'),
    ...mpOrderIntent(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  process.env.MP_ACCESS_TOKEN = 'APP_USR_order_multiple';
  const externalReference = `gx-modulo-prevenda-${requestId}`;
  const candidates = Array.from({ length: 51 }, (_, index) => ({
    id: `ORD${String(index).padStart(21, '0')}`,
    type: 'online',
    external_reference: externalReference,
  }));
  const pages = [];
  const result = await reconcileExpiredHolds({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async (url) => {
      const page = Number(new URL(String(url)).searchParams.get('page'));
      pages.push(page);
      return orderSearchResponse(page === 1 ? candidates.slice(0, 50) : candidates.slice(50), {
        page, total: candidates.length,
      });
    },
  });
  assert.deepEqual(pages, [1, 2]);
  assert.equal(result.providerFailures, 1);
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'held');
  assert.equal(value(client.items.get(reservation.slot), 'provider_ref'), undefined);
});

for (const [label, fetchImpl] of [
  ['pagina truncada', async () => orderSearchResponse([], { total: 1 })],
  ['paginação vazia ou não canônica', async () => response({
    data: [],
    paging: { total: null, total_pages: '', offset: ' ', limit: '5e1' },
  })],
  ['total de paginas divergente', async () => orderSearchResponse([], { total: 0, totalPages: 1 })],
  ['offset divergente', async () => orderSearchResponse([], { total: 0, offset: 50 })],
  ['limite divergente', async () => orderSearchResponse([], { total: 0, pageSize: 20 })],
  ['resultado divergente', async () => orderSearchResponse([{
    id: MP_ORDER_ID,
    type: 'online',
    external_reference: `gx-modulo-prevenda-${randomUUID()}`,
  }])],
  ['timeout', async () => { throw new Error('provider_timeout'); }],
]) {
  test(`recuperação Orders ${label} mantém hold sem attach`, async () => {
    const client = new MemoryDynamo();
    const requestId = randomUUID();
    const reservation = await acquireReservation({
      requestId,
      provider: 'mercadopago',
      ...guards(`mp-order-${label}`),
      ...mpOrderIntent(requestId),
      now: new Date('2026-08-05T12:00:00.000Z'),
      providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
      client,
      tableName: TABLE,
    });
    process.env.MP_ACCESS_TOKEN = `APP_USR_order_${label}`;
    const result = await reconcileExpiredHolds({
      now: new Date('2026-08-05T12:31:00.000Z'),
      client,
      tableName: TABLE,
      fetchImpl,
    });
    assert.equal(result.providerFailures, 1);
    assert.equal(value(client.items.get(reservation.slot), 'state'), 'held');
    assert.equal(value(client.items.get(reservation.slot), 'provider_ref'), undefined);
  });
}

test('provider_url existe só no REQUEST held e transição paid limpa URL e vínculo reverso do SLOT', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const buyerKey = hash('buyer:field-lifecycle-paid');
  const reservation = await acquireReservation({
    requestId,
    provider: 'stripe',
    buyerKey,
    riskKey: hash('risk:field-lifecycle-paid'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'stripe',
    providerRef: 'cs_field_lifecycle_paid',
    providerUrl: 'https://checkout.stripe.test/field-lifecycle-paid',
    providerExpiresAt: '2026-08-05T12:31:00.000Z',
    client,
    tableName: TABLE,
  });

  assert.equal(value(client.items.get(reservation.slot), 'provider_url'), undefined);
  assert.equal(value(client.items.get(reservation.slot), 'provider_protocol'), 'stripe_checkout_v1');
  assert.equal(value(client.items.get(`REQUEST#${requestId}`), 'provider_url'),
    'https://checkout.stripe.test/field-lifecycle-paid');

  await markReservationPaid({
    requestId,
    slot: reservation.slot,
    provider: 'stripe',
    providerRef: 'cs_field_lifecycle_paid',
    paymentStatus: 'paid',
    providerEventCreated: '2026-08-05T12:02:00.000Z',
    providerEventId: 'evt_field_lifecycle_paid',
    providerEventType: 'checkout.session.completed',
    refundedCents: 0,
    disputedCents: 0,
    chargedBackCents: 0,
    now: new Date('2026-08-05T12:02:01.000Z'),
    client,
    tableName: TABLE,
  });

  const slotItem = client.items.get(reservation.slot);
  const requestItem = client.items.get(`REQUEST#${requestId}`);
  assert.equal(value(slotItem, 'state'), 'paid');
  assert.equal(value(slotItem, 'buyer_pk'), undefined);
  assert.equal(value(slotItem, 'provider_url'), undefined);
  assert.equal(value(requestItem, 'provider_url'), undefined);
  assert.equal(value(requestItem, 'buyer_pk'), `BUYER#${buyerKey}`);
  assert.equal(value(client.items.get(`BUYER#${buyerKey}`), 'state'), 'paid');
});

test('cursor financeiro atualiza paid sem reabrir capacidade e replay é idempotente', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const { slot } = await acquireReservation({
    requestId,
    provider: 'stripe',
    ...guards('paid-status-update'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });
  assert.deepEqual(await markReservationPaid({
    requestId, slot, provider: 'stripe', providerRef: 'cs_paid_status', paymentStatus: 'paid',
    providerEventCreated: 1785931320,
    providerEventId: 'evt_paid_status',
    providerEventType: 'checkout.session.completed',
    refundedCents: 0, disputedCents: 0, chargedBackCents: 0,
    now: new Date('2026-08-05T12:02:00.000Z'), client, tableName: TABLE,
  }), { outcome: 'applied' });
  assert.deepEqual(await markReservationPaid({
    requestId, slot, provider: 'stripe', providerRef: 're_partial', paymentStatus: 'partially_refunded',
    providerEventCreated: 1785931380,
    providerEventId: 'evt_partial_status',
    providerEventType: 'charge.refunded',
    refundedCents: 50_000, disputedCents: 0, chargedBackCents: 0,
    now: new Date('2026-08-05T12:03:00.000Z'), client, tableName: TABLE,
  }), { outcome: 'applied' });
  for (const pk of [slot, `REQUEST#${requestId}`, `BUYER#${guards('paid-status-update').buyerKey}`]) {
    assert.equal(value(client.items.get(pk), 'state'), 'paid');
    assert.equal(value(client.items.get(pk), 'payment_status'), 'partially_refunded');
  }
  assert.deepEqual(await markReservationPaid({
    requestId, slot, provider: 'stripe', providerRef: 're_partial', paymentStatus: 'partially_refunded',
    providerEventCreated: 1785931380,
    providerEventId: 'evt_partial_status',
    providerEventType: 'charge.refunded',
    refundedCents: 50_000, disputedCents: 0, chargedBackCents: 0,
    now: new Date('2026-08-05T12:04:00.000Z'), client, tableName: TABLE,
  }), { outcome: 'idempotent' });
  const summary = inventorySummary(await listSlots({ client, tableName: TABLE }));
  assert.equal(summary.vendidas, 1);
  assert.equal(summary.restantes, 99);
});

test('cursor financeiro rejeita eventos inversos e preserva SLOT REQUEST BUYER em paid', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservationGuards = guards('financial-ordering');
  const { slot } = await acquireReservation({
    requestId,
    provider: 'stripe',
    ...reservationGuards,
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });
  const apply = (overrides) => markReservationPaid({
    requestId,
    slot,
    provider: 'stripe',
    providerRef: 'ch_financial_ordering',
    now: new Date('2026-08-05T13:00:00.000Z'),
    client,
    tableName: TABLE,
    refundedCents: 0,
    disputedCents: 0,
    chargedBackCents: 0,
    ...overrides,
  });

  assert.deepEqual(await apply({
    paymentStatus: 'paid',
    providerEventCreated: 1_785_931_200,
    providerEventId: 'evt_100_paid',
    providerEventType: 'checkout.session.completed',
  }), { outcome: 'applied' });
  assert.deepEqual(await apply({
    paymentStatus: 'partially_refunded',
    providerEventCreated: 1_785_931_300,
    providerEventId: 'evt_200_partial',
    providerEventType: 'charge.refunded',
    refundedCents: 50_000,
  }), { outcome: 'applied' });
  assert.deepEqual(await apply({
    paymentStatus: 'refunded',
    providerEventCreated: 1_785_931_400,
    providerEventId: 'evt_300_full',
    providerEventType: 'charge.refunded',
    refundedCents: 300_000,
  }), { outcome: 'applied' });
  assert.deepEqual(await apply({
    paymentStatus: 'partially_refunded',
    providerEventCreated: 1_785_931_300,
    providerEventId: 'evt_200_partial',
    providerEventType: 'charge.refunded',
    refundedCents: 50_000,
  }), { outcome: 'stale' });

  assert.deepEqual(await apply({
    paymentStatus: 'disputed',
    providerEventCreated: 1_785_931_500,
    providerEventId: 'evt_400_dispute_open',
    providerEventType: 'charge.dispute.created',
    disputedCents: 300_000,
  }), { outcome: 'applied' });
  assert.deepEqual(await apply({
    paymentStatus: 'paid',
    providerEventCreated: 1_785_931_600,
    providerEventId: 'evt_500_dispute_won',
    providerEventType: 'charge.dispute.closed',
  }), { outcome: 'applied' });
  assert.deepEqual(await apply({
    paymentStatus: 'disputed',
    providerEventCreated: 1_785_931_500,
    providerEventId: 'evt_400_dispute_open',
    providerEventType: 'charge.dispute.created',
    disputedCents: 300_000,
  }), { outcome: 'stale' });
  assert.deepEqual(await apply({
    paymentStatus: 'charged_back',
    providerEventCreated: 1_785_931_700,
    providerEventId: 'evt_600_dispute_lost',
    providerEventType: 'charge.dispute.closed',
    chargedBackCents: 300_000,
  }), { outcome: 'applied' });
  assert.deepEqual(await apply({
    paymentStatus: 'charged_back',
    providerEventCreated: 1_785_931_700,
    providerEventId: 'evt_600_dispute_lost',
    providerEventType: 'charge.dispute.closed',
    chargedBackCents: 300_000,
  }), { outcome: 'idempotent' });
  assert.deepEqual(await apply({
    paymentStatus: 'paid',
    providerEventCreated: 1_785_931_200,
    providerEventId: 'evt_100_paid',
    providerEventType: 'checkout.session.completed',
  }), { outcome: 'stale' });

  const keys = [slot, `REQUEST#${requestId}`, `BUYER#${reservationGuards.buyerKey}`];
  const cursors = new Set(keys.map((pk) => value(client.items.get(pk), 'provider_event_cursor')));
  assert.equal(cursors.size, 1);
  for (const pk of keys) {
    assert.equal(value(client.items.get(pk), 'state'), 'paid');
    assert.equal(value(client.items.get(pk), 'payment_status'), 'charged_back');
    assert.equal(value(client.items.get(pk), 'provider_event_id'), 'evt_600_dispute_lost');
    assert.equal(value(client.items.get(pk), 'refunded_cents'), '0');
    assert.equal(value(client.items.get(pk), 'disputed_cents'), '0');
    assert.equal(value(client.items.get(pk), 'charged_back_cents'), '300000');
  }
  assert.equal(inventorySummary(await listSlots({ client, tableName: TABLE })).vendidas, 1);
});

test('timestamp domina e prioridade de tipo/status resolve apenas empate antes do event id', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const { slot } = await acquireReservation({
    requestId,
    provider: 'stripe',
    ...guards('financial-tie'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });
  const common = {
    requestId, slot, provider: 'stripe', providerRef: 'ch_tie',
    providerEventCreated: 1_785_931_200,
    client, tableName: TABLE,
    refundedCents: 0, disputedCents: 0, chargedBackCents: 0,
  };
  assert.deepEqual(await markReservationPaid({
    ...common,
    paymentStatus: 'paid',
    providerEventId: 'evt_z_paid',
    providerEventType: 'checkout.session.completed',
  }), { outcome: 'applied' });
  assert.deepEqual(await markReservationPaid({
    ...common,
    paymentStatus: 'refunded',
    providerEventId: 'evt_a_full',
    providerEventType: 'charge.refunded',
    refundedCents: 300_000,
  }), { outcome: 'applied' });
  assert.deepEqual(await markReservationPaid({
    ...common,
    paymentStatus: 'paid',
    providerEventId: 'evt_zz_paid',
    providerEventType: 'checkout.session.completed',
  }), { outcome: 'stale' });
  assert.equal(value(client.items.get(slot), 'payment_status'), 'refunded');
});

test('MP preserva linguagem de reembolso pendente e falho sem reabrir o slot', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const { slot } = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards('mp-refund-language'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });
  const apply = (overrides) => markReservationPaid({
    requestId,
    slot,
    provider: 'mercadopago',
    providerRef: '99887766',
    client,
    tableName: TABLE,
    refundedCents: 0,
    disputedCents: 0,
    chargedBackCents: 0,
    ...overrides,
  });
  assert.deepEqual(await apply({
    paymentStatus: 'approved',
    providerEventCreated: '2026-08-05T12:01:00.000Z',
    providerEventId: '99887766',
    providerEventType: 'payment.approved',
  }), { outcome: 'applied' });
  assert.deepEqual(await apply({
    paymentStatus: 'refund_pending',
    providerEventCreated: '2026-08-05T12:02:00.000Z',
    providerEventId: 'refund_1001',
    providerEventType: 'payment.refund_pending',
  }), { outcome: 'applied' });
  assert.deepEqual(await apply({
    paymentStatus: 'approved',
    providerEventCreated: '2026-08-05T12:01:00.000Z',
    providerEventId: '99887766',
    providerEventType: 'payment.approved',
  }), { outcome: 'stale' });
  assert.deepEqual(await apply({
    paymentStatus: 'refund_failed',
    providerEventCreated: '2026-08-05T12:03:00.000Z',
    providerEventId: 'refund_1001',
    providerEventType: 'payment.refund_failed',
  }), { outcome: 'applied' });
  assert.equal(value(client.items.get(slot), 'state'), 'paid');
  assert.equal(value(client.items.get(slot), 'payment_status'), 'refund_failed');
  assert.equal(inventorySummary(await listSlots({ client, tableName: TABLE })).vendidas, 1);
});

test('snapshot financeiro fora do valor da oferta falha antes de tocar capacidade', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const { slot } = await acquireReservation({
    requestId,
    provider: 'stripe',
    ...guards('invalid-financial-snapshot'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
  });
  await assert.rejects(markReservationPaid({
    requestId,
    slot,
    provider: 'stripe',
    providerRef: 'ch_invalid_snapshot',
    paymentStatus: 'refunded',
    providerEventCreated: 1_785_931_200,
    providerEventId: 'evt_invalid_snapshot',
    providerEventType: 'charge.refunded',
    refundedCents: 300_001,
    disputedCents: 0,
    chargedBackCents: 0,
    client,
    tableName: TABLE,
  }), (error) => error instanceof InventoryConflictError
    && error.message === 'invalid_financial_snapshot');
  assert.equal(value(client.items.get(slot), 'state'), 'held');
});

test('tempo sozinho não libera um slot held', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  await acquireReservation({
    requestId,
    provider: 'stripe',
    ...guards(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  const summary = await estadoDoLote({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async () => { throw new Error('hot_path_nao_deve_chamar_provider'); },
  });
  assert.equal(summary.reservadas, 1);
  assert.equal(summary.restantes, 99);
  assert.equal(summary.reconciliacaoPendente, true);
  const bounded = await reconcileExpiredHolds({
    now: new Date('2026-08-05T12:31:00.000Z'),
    deadlineAt: 0,
    client,
    tableName: TABLE,
    fetchImpl: async () => { throw new Error('deadline_deveria_impedir_provider'); },
  });
  assert.equal(bounded.attempted, 0);
  assert.equal(bounded.deferred, 1);
});

test('aquisição Stripe commitada sem provider só é recuperada após busca negativa e graça de 24h', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const buyerKey = hash('buyer:stripe-unattached-recovery');
  const reservation = await acquireReservation({
    requestId,
    provider: 'stripe',
    buyerKey,
    riskKey: hash('risk:stripe-unattached-recovery'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  process.env.STRIPE_SECRET_KEY = 'sk_test_unattached_recovery';
  let searches = 0;
  const fetchImpl = async (url) => {
    assert.match(String(url), /\/checkout\/sessions\?/);
    searches += 1;
    return response({ data: [], has_more: false });
  };

  const duringGrace = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  assert.equal(duringGrace.reservadas, 1);
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'held');

  const afterGrace = await reconcileAndRead({
    now: new Date('2026-08-06T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  assert.equal(searches, 2);
  assert.equal(afterGrace.reservadas, 0);
  assert.equal(afterGrace.restantes, 100);
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'released');
  assert.equal(value(client.items.get(reservation.slot), 'buyer_pk'), undefined);
  assert.equal(value(client.items.get(`REQUEST#${requestId}`), 'buyer_pk'), `BUYER#${buyerKey}`);
  assert.equal(value(client.items.get(`BUYER#${buyerKey}`), 'state'), 'released');
});

test('graça vencida sem prova provider-side negativa preserva aquisição unattached', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'stripe',
    ...guards('unattached-provider-unavailable'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  process.env.STRIPE_SECRET_KEY = 'sk_test_unattached_unavailable';

  const lote = await reconcileAndRead({
    now: new Date('2026-08-06T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async () => response({ error: 'provider_down' }, 503),
  });
  assert.equal(lote.reservadas, 1);
  assert.equal(lote.reconciliacaoPendente, true);
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'held');
});

test('aquisição MP sem preferência nem pagamento exige as duas buscas negativas antes de recuperar', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards('mp-unattached-recovery'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  process.env.MP_ACCESS_TOKEN = 'APP_USR_unattached_recovery';
  let preferenceSearches = 0;
  let paymentSearches = 0;
  const fetchImpl = async (url) => {
    if (String(url).includes('/checkout/preferences/search?')) {
      preferenceSearches += 1;
      return response({ elements: [], total: 0 });
    }
    if (String(url).includes('/v1/payments/search?')) {
      paymentSearches += 1;
      return response({ results: [], paging: { total: 0 } });
    }
    throw new Error(`unexpected_url:${url}`);
  };

  const duringGrace = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  assert.equal(duringGrace.reservadas, 1);
  assert.equal(paymentSearches, 0);

  const afterGrace = await reconcileAndRead({
    now: new Date('2026-08-06T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  assert.equal(preferenceSearches, 2);
  assert.equal(paymentSearches, 1);
  assert.equal(afterGrace.reservadas, 0);
  assert.equal(afterGrace.restantes, 100);
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'released');
});

test('recuperação Stripe anexa ref mesmo com session.url null e preserva binding financeiro', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'stripe',
    ...guards('stripe-null-url-recovery'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  process.env.STRIPE_SECRET_KEY = 'sk_test_null_url_recovery';
  const sessionId = 'cs_completed_without_url';
  const lote = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async () => response({
      data: [{
        id: sessionId,
        url: null,
        expires_at: Date.parse('2026-08-05T12:30:00.000Z') / 1000,
        created: Date.parse('2026-08-05T12:00:05.000Z') / 1000,
        status: 'complete',
        payment_status: 'paid',
        amount_total: 300_000,
        currency: 'brl',
        metadata: providerMetadata(reservation),
      }],
      has_more: false,
    }),
  });

  const requestItem = client.items.get(`REQUEST#${requestId}`);
  const slotItem = client.items.get(reservation.slot);
  assert.equal(lote.vendidas, 1);
  assert.equal(value(requestItem, 'provider_ref'), sessionId);
  assert.equal(value(slotItem, 'provider_ref'), sessionId);
  assert.equal(value(requestItem, 'provider_url'), undefined);
  assert.equal(value(slotItem, 'provider_url'), undefined);
  assert.equal(value(requestItem, 'state'), 'paid');
  assert.equal(value(slotItem, 'state'), 'paid');
});

test('recuperação MP anexa preference_id sem init_point e preserva binding do pagamento', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards('mp-null-url-recovery'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  process.env.MP_ACCESS_TOKEN = 'APP_USR_null_url_recovery';
  const preferenceId = 'pref_completed_without_url';
  const lote = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async (url) => {
      if (String(url).includes('/checkout/preferences/search?')) {
        return response({ elements: [{ id: preferenceId }], total: 1 });
      }
      if (String(url).includes(`/checkout/preferences/${preferenceId}`)) {
        return response({
          id: preferenceId,
          init_point: null,
          expiration_date_to: '2026-08-05T12:30:00.000Z',
          metadata: providerMetadata(reservation),
        });
      }
      if (String(url).includes('/v1/payments/search?')) {
        return response({
          results: [{
            id: 778899,
            status: 'approved',
            date_last_updated: '2026-08-05T12:30:30.000Z',
            transaction_amount: 2800,
            currency_id: 'BRL',
            external_reference: 'gx-modulo-prevenda',
            payment_method_id: 'pix',
            payment_type_id: 'bank_transfer',
            metadata: providerMetadata(reservation),
          }],
          paging: { total: 1 },
        });
      }
      throw new Error(`unexpected_url:${url}`);
    },
  });

  const requestItem = client.items.get(`REQUEST#${requestId}`);
  const slotItem = client.items.get(reservation.slot);
  assert.equal(lote.vendidas, 1);
  assert.equal(value(requestItem, 'provider_ref'), preferenceId);
  assert.equal(value(slotItem, 'provider_ref'), preferenceId);
  assert.equal(value(requestItem, 'last_provider_ref'), '778899');
  assert.equal(value(requestItem, 'provider_url'), undefined);
  assert.equal(value(slotItem, 'provider_url'), undefined);
  assert.equal(value(requestItem, 'state'), 'paid');
});

test('Stripe só libera após provider confirmar expired e unpaid', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'stripe',
    ...guards(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'stripe',
    providerRef: 'cs_test_inventory',
    providerUrl: 'https://checkout.stripe.test/session',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });
  process.env.STRIPE_SECRET_KEY = 'sk_test_inventory';
  const lote = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async () => response({
      id: 'cs_test_inventory',
      status: 'expired',
      payment_status: 'unpaid',
      metadata: providerMetadata(reservation),
    }),
  });
  assert.equal(lote.reservadas, 0);
  assert.equal(lote.restantes, 100);
});

test('hold ativo preserva oferta antiga após mudança global e o drain libera só o checkout antigo expirado', async () => {
  const client = new MemoryDynamo();
  const oldOffer = {
    offerAmountCents: 245_000,
    offerCurrency: 'BRL',
    offerSku: 'prevenda_cartao_lote_zero',
    contractVersion: 'v1-lote-zero',
  };
  const paidRequestId = randomUUID();
  const paid = await acquireReservation({
    requestId: paidRequestId,
    provider: 'stripe',
    ...guards('old-offer-paid'),
    ...oldOffer,
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  for (const pk of [paid.slot, `REQUEST#${paidRequestId}`, paid.buyerPk]) {
    delete client.items.get(pk).release_manifest_sha256;
  }
  await attachProvider({
    requestId: paidRequestId,
    slot: paid.slot,
    provider: 'stripe',
    providerRef: 'cs_old_offer_paid',
    providerUrl: 'https://checkout.stripe.test/old-offer-paid',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });

  const releasedRequestId = randomUUID();
  const released = await acquireReservation({
    requestId: releasedRequestId,
    provider: 'stripe',
    ...guards('old-offer-released'),
    ...oldOffer,
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  for (const pk of [released.slot, `REQUEST#${releasedRequestId}`, released.buyerPk]) {
    delete client.items.get(pk).release_manifest_sha256;
  }
  await attachProvider({
    requestId: releasedRequestId,
    slot: released.slot,
    provider: 'stripe',
    providerRef: 'cs_old_offer_expired',
    providerUrl: 'https://checkout.stripe.test/old-offer-expired',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });

  process.env.STRIPE_SECRET_KEY = 'sk_test_old_offer';
  const lote = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async (url) => {
      const sessionId = String(url).split('/').at(-1);
      const reservation = sessionId === 'cs_old_offer_paid' ? paid : released;
      return response({
        id: sessionId,
        status: sessionId === 'cs_old_offer_paid' ? 'complete' : 'expired',
        payment_status: sessionId === 'cs_old_offer_paid' ? 'paid' : 'unpaid',
        created: Date.parse('2026-08-05T12:00:05.000Z') / 1000,
        amount_total: oldOffer.offerAmountCents,
        currency: oldOffer.offerCurrency.toLowerCase(),
        metadata: providerMetadata(reservation),
      });
    },
  });

  assert.equal(value(client.items.get(paid.slot), 'state'), 'paid');
  assert.equal(value(client.items.get(released.slot), 'state'), 'released');
  assert.equal(lote.vendidas, 1);
  assert.equal(lote.reservadas, 0);
  assert.equal(lote.restantes, 99);
});

test('MP expirado com pagamento refunded continua consumido', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    providerRef: 'pref_test_inventory',
    providerUrl: 'https://mercadopago.test/preference',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });
  process.env.MP_ACCESS_TOKEN = 'APP_USR_inventory';
  const lote = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async (url) => {
      if (String(url).includes('/checkout/preferences/')) {
        return response({
          id: 'pref_test_inventory',
          expiration_date_to: '2026-08-05T12:30:00.000Z',
          metadata: providerMetadata(reservation),
        });
      }
      return response({
        results: [{
          id: 12345,
          status: 'refunded',
          date_last_updated: '2026-08-05T15:30:00.000Z',
          transaction_amount: 2800,
          currency_id: 'BRL',
          external_reference: 'gx-modulo-prevenda',
          payment_method_id: 'pix',
          payment_type_id: 'bank_transfer',
          metadata: providerMetadata(reservation),
        }],
        paging: { total: 1 },
      });
    },
  });
  assert.equal(lote.vendidas, 1);
  assert.equal(lote.reservadas, 0);
  assert.equal(lote.restantes, 99);
});

test('MP sem pagamento continua held na graça e só libera após nova confirmação negativa', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    providerRef: 'pref_grace_negative',
    providerUrl: 'https://mercadopago.test/grace',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });
  process.env.MP_ACCESS_TOKEN = 'APP_USR_inventory';
  const fetchImpl = async (url) => {
    if (String(url).includes('/checkout/preferences/')) {
      return response({
        id: 'pref_grace_negative',
        expiration_date_to: '2026-08-05T12:30:00.000Z',
        metadata: providerMetadata(reservation),
      });
    }
    return response({ results: [], paging: { total: 0 } });
  };

  const duringGrace = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  assert.equal(duringGrace.reservadas, 1);
  assert.equal(duringGrace.reconciliacaoPendente, true);

  const afterGrace = await reconcileAndRead({
    now: new Date('2026-08-05T15:31:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  assert.equal(afterGrace.reservadas, 0);
  assert.equal(afterGrace.restantes, 100);
  assert.equal(afterGrace.reconciliacaoPendente, false);
});

test('aprovação MP dentro da graça vira paid e nunca reabre capacidade', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    providerRef: 'pref_grace_paid',
    providerUrl: 'https://mercadopago.test/grace-paid',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });
  process.env.MP_ACCESS_TOKEN = 'APP_USR_inventory';
  const lote = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async (url) => {
      if (String(url).includes('/checkout/preferences/')) {
        return response({
          id: 'pref_grace_paid',
          expiration_date_to: '2026-08-05T12:30:00.000Z',
          metadata: providerMetadata(reservation),
        });
      }
      return response({
        results: [{
          id: 9988,
          status: 'approved',
          date_last_updated: '2026-08-05T12:40:00.000Z',
          transaction_amount: 2800,
          currency_id: 'BRL',
          external_reference: 'gx-modulo-prevenda',
          payment_method_id: 'pix',
          payment_type_id: 'bank_transfer',
          metadata: providerMetadata(reservation),
        }],
        paging: { total: 1 },
      });
    },
  });
  assert.equal(lote.vendidas, 1);
  assert.equal(lote.restantes, 99);
});

test('webhook MP tardio após liberação recupera slot se ele ainda não foi reutilizado', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    providerRef: 'pref_late_paid',
    providerUrl: 'https://mercadopago.test/late',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });
  process.env.MP_ACCESS_TOKEN = 'APP_USR_inventory';
  const negativeFetch = async (url) => {
    if (String(url).includes('/checkout/preferences/')) {
      return response({
        id: 'pref_late_paid',
        expiration_date_to: '2026-08-05T12:30:00.000Z',
        metadata: providerMetadata(reservation),
      });
    }
    return response({ results: [], paging: { total: 0 } });
  };
  await reconcileAndRead({
    now: new Date('2026-08-05T15:31:00.000Z'), client, tableName: TABLE, fetchImpl: negativeFetch,
  });
  assert.equal(value(client.items.get(reservation.slot), 'state'), 'released');

  assert.deepEqual(await markReservationPaid({
    requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    providerRef: '998877',
    paymentStatus: 'approved',
    now: new Date('2026-08-05T15:32:00.000Z'),
    client,
    tableName: TABLE,
  }), { outcome: 'applied' });
  const summary = inventorySummary(await listSlots({ client, tableName: TABLE }));
  assert.equal(summary.vendidas, 1);
  assert.equal(summary.restantes, 99);
});

test('pagamento tardio após reuso sinaliza compensação sem alterar o novo slot', async () => {
  const client = new MemoryDynamo();
  const oldRequestId = randomUUID();
  const oldReservation = await acquireReservation({
    requestId: oldRequestId,
    provider: 'mercadopago',
    ...guards('late-reassigned-old'),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId: oldRequestId,
    slot: oldReservation.slot,
    provider: 'mercadopago',
    providerRef: 'pref_late_reassigned',
    providerUrl: 'https://mercadopago.test/late-reassigned',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });

  // Ocupa os outros 99 slots; depois da liberação, o slot antigo é o único
  // candidato possível para a nova reserva.
  await Promise.all(Array.from({ length: 99 }, (_, index) => acquireReservation({
    requestId: randomUUID(),
    provider: 'stripe',
    ...guards(`late-reassigned-fill-${index}`),
    now: new Date('2026-08-05T12:01:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:32:00.000Z'),
    client,
    tableName: TABLE,
  })));
  await releaseReservation({
    requestId: oldRequestId,
    slot: oldReservation.slot,
    provider: 'mercadopago',
    providerRef: 'pref_late_reassigned',
    reason: 'mp_expired_without_active_payment',
    now: new Date('2026-08-05T15:31:00.000Z'),
    client,
    tableName: TABLE,
  });

  const newRequestId = randomUUID();
  const replacement = await acquireReservation({
    requestId: newRequestId,
    provider: 'stripe',
    ...guards('late-reassigned-new'),
    now: new Date('2026-08-05T15:32:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T16:03:00.000Z'),
    client,
    tableName: TABLE,
  });
  assert.equal(replacement.slot, oldReservation.slot);

  await assert.rejects(markReservationPaid({
    requestId: oldRequestId,
    slot: oldReservation.slot,
    provider: 'mercadopago',
    providerRef: 'payment_late_reassigned',
    paymentStatus: 'approved',
    now: new Date('2026-08-05T15:33:00.000Z'),
    client,
    tableName: TABLE,
  }), InventoryLatePaymentReassignedError);
  assert.equal(value(client.items.get(oldReservation.slot), 'reservation_id'), newRequestId);
  assert.equal(value(client.items.get(oldReservation.slot), 'state'), 'held');
});

test('reconciliação processa no máximo oito holds e gira deterministicamente por minuto', async () => {
  const client = new MemoryDynamo();
  const byProviderRef = new Map();
  for (let index = 0; index < 10; index += 1) {
    const requestId = randomUUID();
    const reservation = await acquireReservation({
      requestId,
      provider: 'stripe',
      ...guards(`bounded-${index}`),
      now: new Date('2026-08-05T12:00:00.000Z'),
      providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
      client,
      tableName: TABLE,
    });
    const providerRef = `cs_bounded_${index}`;
    byProviderRef.set(providerRef, reservation);
    await attachProvider({
      requestId,
      slot: reservation.slot,
      provider: 'stripe',
      providerRef,
      providerUrl: `https://checkout.stripe.test/${providerRef}`,
      providerExpiresAt: '2026-08-05T12:30:00.000Z',
      client,
      tableName: TABLE,
    });
  }
  process.env.STRIPE_SECRET_KEY = 'sk_test_inventory';
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    const providerRef = String(url).split('/').at(-1);
    return response({
      id: providerRef,
      status: 'expired',
      payment_status: 'unpaid',
      metadata: providerMetadata(byProviderRef.get(providerRef)),
    });
  };
  const first = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  assert.equal(calls, 8);
  assert.equal(first.reservadas, 2);
  assert.equal(first.reconciliacaoPendente, true);

  const second = await reconcileAndRead({
    now: new Date('2026-08-05T12:32:00.000Z'), client, tableName: TABLE, fetchImpl,
  });
  assert.equal(calls, 10);
  assert.equal(second.reservadas, 0);
  assert.equal(second.reconciliacaoPendente, false);
});

test('falha de um provider mantém somente o slot ambíguo held', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'stripe',
    ...guards(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'stripe',
    providerRef: 'cs_test_failure',
    providerUrl: 'https://checkout.stripe.test/failure',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });
  const healthyRequestId = randomUUID();
  const healthy = await acquireReservation({
    requestId: healthyRequestId,
    provider: 'stripe',
    ...guards(healthyRequestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId: healthyRequestId,
    slot: healthy.slot,
    provider: 'stripe',
    providerRef: 'cs_test_healthy',
    providerUrl: 'https://checkout.stripe.test/healthy',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });
  process.env.STRIPE_SECRET_KEY = 'sk_test_inventory';
  const lote = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async (url) => (String(url).includes('cs_test_failure')
      ? response({ error: 'down' }, 503)
      : response({
        id: 'cs_test_healthy',
        status: 'expired',
        payment_status: 'unpaid',
        metadata: providerMetadata(healthy),
      })),
  });
  assert.equal(lote.reservadas, 1);
  assert.equal(lote.restantes, 99);
  assert.equal(lote.reconciliacaoPendente, true);
});

test('paginação provider truncada mantém o slot e sinaliza reconciliação', async () => {
  const client = new MemoryDynamo();
  const requestId = randomUUID();
  const reservation = await acquireReservation({
    requestId,
    provider: 'mercadopago',
    ...guards(requestId),
    now: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:30:00.000Z'),
    client,
    tableName: TABLE,
  });
  await attachProvider({
    requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    providerRef: 'pref_test_truncated',
    providerUrl: 'https://mercadopago.test/truncated',
    providerExpiresAt: '2026-08-05T12:30:00.000Z',
    client,
    tableName: TABLE,
  });
  process.env.MP_ACCESS_TOKEN = 'APP_USR_inventory';
  const lote = await reconcileAndRead({
    now: new Date('2026-08-05T12:31:00.000Z'),
    client,
    tableName: TABLE,
    fetchImpl: async (url) => {
      if (String(url).includes('/checkout/preferences/')) {
        return response({
          id: 'pref_test_truncated',
          expiration_date_to: '2026-08-05T12:30:00.000Z',
          metadata: providerMetadata(reservation),
        });
      }
      return response({
        results: Array.from({ length: 50 }, (_, index) => ({
          id: index,
          status: 'rejected',
          metadata: { request_id: requestId },
        })),
        paging: { total: 5_000 },
      });
    },
  });
  assert.equal(lote.reservadas, 1);
  assert.equal(lote.restantes, 99);
  assert.equal(lote.reconciliacaoPendente, true);
});

test('Dynamo ausente falha antes de anunciar qualquer parcial', async () => {
  const previous = process.env.PREVENDA_INVENTORY_TABLE;
  delete process.env.PREVENDA_INVENTORY_TABLE;
  try {
    await assert.rejects(listSlots({ client: new MemoryDynamo() }), InventoryUnavailableError);
  } finally {
    if (previous === undefined) delete process.env.PREVENDA_INVENTORY_TABLE;
    else process.env.PREVENDA_INVENTORY_TABLE = previous;
  }
});
