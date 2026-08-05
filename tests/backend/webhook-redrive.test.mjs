import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import process from 'node:process';
import test from 'node:test';
import { setImmediate } from 'node:timers';

import {
  runWebhookEffect,
  WebhookDeliveryError,
  WebhookOutboxIntegrityError,
} from '../../api/_lib/webhook-outbox.js';
import { drainWebhookOutbox } from '../../api/_lib/webhook-redrive.js';
import {
  createWebhookRedriveDispatcher,
  WebhookRedriveUnsafeError,
} from '../../api/_lib/webhook-redrive-dispatch.js';
import webhookRedriveHandler, {
  config as webhookRedriveConfig,
  maxDuration as webhookRedriveMaxDuration,
} from '../../api/cron/webhook-redrive.js';
import { sendBuyerConfirmationEmail } from '../../api/_lib/webhook-delivery.js';
import { normalizeMercadoPagoOrderCanonical } from '../../api/mp-webhook.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const attr = (item, key) => item?.[key]?.S ?? item?.[key]?.N;
const putAttr = (item, key, value) => {
  if (value === undefined) return;
  item[key] = clone(value);
};

class RedriveMemoryDynamo {
  constructor() {
    this.items = new Map();
  }

  async send(command) {
    const input = command.input;
    if (command.constructor.name === 'GetItemCommand') {
      const item = this.items.get(attr(input.Key, 'pk'));
      return item ? { Item: clone(item) } : {};
    }
    if (command.constructor.name === 'QueryCommand') {
      const due = Number(attr(input.ExpressionAttributeValues, ':epoch'));
      const queue = attr(input.ExpressionAttributeValues, ':queue');
      const rows = [...this.items.values()]
        .filter((item) => attr(item, 'outbox_partition') === queue
          && Number(attr(item, 'next_attempt_at')) <= due)
        .sort((left, right) => Number(attr(left, 'next_attempt_at')) - Number(attr(right, 'next_attempt_at')))
        .slice(0, input.Limit)
        .map((item) => ({
          pk: clone(item.pk),
          outbox_partition: clone(item.outbox_partition),
          next_attempt_at: clone(item.next_attempt_at),
        }));
      return { Items: rows };
    }
    if (command.constructor.name !== 'TransactWriteItemsCommand') {
      throw new Error(`unsupported:${command.constructor.name}`);
    }
    const operation = input.TransactItems[0];
    try {
      if (operation.Put) this.#put(operation.Put);
      else if (operation.Update) this.#update(operation.Update);
      else throw new Error('unsupported_operation');
      return {};
    } catch (cause) {
      const error = new Error(cause.message);
      error.name = 'TransactionCanceledException';
      error.CancellationReasons = [{ Code: 'ConditionalCheckFailed' }];
      throw error;
    }
  }

  #put(put) {
    const pk = attr(put.Item, 'pk');
    if (this.items.has(pk)) throw new Error('exists');
    this.items.set(pk, clone(put.Item));
  }

  #update(update) {
    const pk = attr(update.Key, 'pk');
    const item = this.items.get(pk);
    if (!item) throw new Error('missing');
    const values = update.ExpressionAttributeValues;
    const expression = update.UpdateExpression;
    const state = attr(item, 'state');

    if (expression.includes('ADD alert_attempts')) {
      const epoch = Number(attr(values, ':epoch'));
      const lease = Number(attr(item, 'lease_until'));
      const alertState = attr(item, 'alert_state');
      const claimable = !alertState || alertState === 'pending' || alertState === 'failed'
        || (alertState === 'processing' && lease < epoch);
      if (state !== 'dead_letter' || !claimable
          || attr(item, 'outbox_partition') !== attr(values, ':queue')
          || Number(attr(item, 'next_attempt_at')) > epoch) throw new Error('alert_busy');
      putAttr(item, 'alert_state', values[':processing']);
      putAttr(item, 'lease_until', values[':lease']);
      putAttr(item, 'owner_token', values[':owner']);
      putAttr(item, 'updated_at', values[':now']);
      putAttr(item, 'next_attempt_at', values[':lease']);
      item.alert_attempts = { N: String(Number(attr(item, 'alert_attempts') || 0) + 1) };
    } else if (expression.includes('ADD attempts')) {
      const epoch = Number(attr(values, ':epoch'));
      const lease = Number(attr(item, 'lease_until'));
      const directClaim = !values[':max'];
      const claimable = state === 'pending' || state === 'failed'
        || (directClaim && state === 'dead_letter')
        || (state === 'processing' && lease < epoch);
      if (!claimable || attr(item, 'payload_digest') !== attr(values, ':digest')) {
        throw new Error('effect_busy');
      }
      if (values[':max'] && Number(attr(item, 'attempts')) >= Number(attr(values, ':max'))) {
        throw new Error('attempts_exhausted');
      }
      if (values[':queue'] && attr(item, 'outbox_partition') !== attr(values, ':queue')) {
        throw new Error('not_queued');
      }
      if (!directClaim && values[':epoch'] && Number(attr(item, 'next_attempt_at')) > epoch) {
        throw new Error('not_due');
      }
      putAttr(item, 'state', values[':processing']);
      putAttr(item, 'lease_until', values[':lease']);
      putAttr(item, 'owner_token', values[':owner']);
      putAttr(item, 'updated_at', values[':now']);
      putAttr(item, 'outbox_partition', values[':queue']);
      putAttr(item, 'next_attempt_at', values[':lease']);
      item.attempts = { N: String(Number(attr(item, 'attempts')) + 1) };
    } else if (values[':done']) {
      if (state !== 'processing' || attr(item, 'owner_token') !== attr(values, ':owner')) {
        throw new Error('not_owner');
      }
      putAttr(item, 'state', values[':done']);
      putAttr(item, 'done_at', values[':now']);
      putAttr(item, 'updated_at', values[':now']);
      putAttr(item, 'external_ref', values[':external']);
      for (const key of ['lease_until', 'owner_token', 'last_error', 'outbox_partition', 'next_attempt_at', 'alert_state', 'alert_last_error']) {
        delete item[key];
      }
    } else if (expression.includes('alert_state = :sent')) {
      if (state !== 'dead_letter' || attr(item, 'alert_state') !== 'processing'
          || attr(item, 'owner_token') !== attr(values, ':owner')) throw new Error('alert_not_owner');
      putAttr(item, 'alert_state', values[':sent']);
      putAttr(item, 'alerted_at', values[':now']);
      putAttr(item, 'updated_at', values[':now']);
      putAttr(item, 'alert_external_ref', values[':external']);
      for (const key of ['lease_until', 'owner_token', 'alert_last_error', 'outbox_partition', 'next_attempt_at']) {
        delete item[key];
      }
    } else if (expression.includes('alert_state = :failed')) {
      if (state !== 'dead_letter' || attr(item, 'alert_state') !== 'processing'
          || attr(item, 'owner_token') !== attr(values, ':owner')) throw new Error('alert_not_owner');
      putAttr(item, 'alert_state', values[':failed']);
      putAttr(item, 'alert_last_error', values[':error']);
      putAttr(item, 'updated_at', values[':now']);
      putAttr(item, 'outbox_partition', values[':queue']);
      putAttr(item, 'next_attempt_at', values[':next']);
      delete item.lease_until;
      delete item.owner_token;
    } else if (expression.includes('#state = :deadLetter')) {
      const owned = values[':owner'];
      if (owned && (state !== 'processing' || attr(item, 'owner_token') !== attr(values, ':owner'))) {
        throw new Error('not_owner');
      }
      putAttr(item, 'state', values[':deadLetter']);
      putAttr(item, 'alert_state', values[':alertPending']);
      putAttr(item, 'dead_lettered_at', values[':now']);
      putAttr(item, 'last_error', values[':error'] || values[':reason']);
      putAttr(item, 'updated_at', values[':now']);
      putAttr(item, 'outbox_partition', values[':queue']);
      putAttr(item, 'next_attempt_at', values[':epoch']);
      delete item.lease_until;
      delete item.owner_token;
    } else if (expression.includes('#state = :failed')) {
      if (state !== 'processing' || attr(item, 'owner_token') !== attr(values, ':owner')) {
        throw new Error('not_owner');
      }
      putAttr(item, 'state', values[':failed']);
      putAttr(item, 'last_error', values[':error']);
      putAttr(item, 'updated_at', values[':now']);
      putAttr(item, 'outbox_partition', values[':queue']);
      putAttr(item, 'next_attempt_at', values[':next']);
      delete item.lease_until;
      delete item.owner_token;
    } else {
      throw new Error(`unsupported_update:${expression}`);
    }
    this.items.set(pk, item);
  }
}

const baseNow = new Date('2026-08-05T12:00:00.000Z');

async function createFailedEffect(client, overrides = {}) {
  const args = {
    provider: 'stripe',
    eventId: 'evt_redrive_outage',
    channel: 'buyer_email',
    payload: {
      kind: 'stripe_buyer_confirmation_v1',
      sessionId: 'cs_test_redrive',
      paymentStatus: 'paid',
      offerAmountCents: 300000,
      offerCurrency: 'BRL',
      offerSku: 'prevenda_cartao',
      contractVersion: 'v2-2026-08-05',
      providerProtocol: 'stripe_checkout_v1',
    },
    tableName: 'growx-prevenda-test',
    client,
    now: baseNow,
    execute: async () => ({ ok: false }),
    ...overrides,
  };
  await assert.rejects(runWebhookEffect(args), WebhookDeliveryError);
}

test('outage além do retry do provider é recuperada uma vez pelo worker', async () => {
  const client = new RedriveMemoryDynamo();
  await createFailedEffect(client);
  let deliveries = 0;
  const now = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const dispatch = async () => {
    deliveries += 1;
    return { ok: true, id: 'email_redrive_1' };
  };
  const first = await drainWebhookOutbox({
    client,
    tableName: 'growx-prevenda-test',
    now,
    deadlineAt: Date.now() + 10_000,
    dispatch,
  });
  const replay = await drainWebhookOutbox({
    client,
    tableName: 'growx-prevenda-test',
    now,
    deadlineAt: Date.now() + 10_000,
    dispatch,
  });
  assert.equal(first.delivered, 1);
  assert.equal(replay.delivered, 0);
  assert.equal(deliveries, 1);
  const [record] = [...client.items.values()];
  assert.equal(attr(record, 'state'), 'done');
  assert.equal('outbox_partition' in record, false);
});

test('workers concorrentes obtêm uma única claim e uma única entrega', async () => {
  const client = new RedriveMemoryDynamo();
  await createFailedEffect(client, { eventId: 'evt_redrive_concurrent' });
  let deliveries = 0;
  const dispatch = async () => {
    deliveries += 1;
    await new Promise((resolve) => setImmediate(resolve));
    return { ok: true, id: 'email_concurrent_1' };
  };
  const options = {
    client,
    tableName: 'growx-prevenda-test',
    now: new Date(Date.now() + 2 * 60 * 60 * 1000),
    deadlineAt: Date.now() + 10_000,
    dispatch,
  };
  const [left, right] = await Promise.all([
    drainWebhookOutbox(options),
    drainWebhookOutbox(options),
  ]);
  assert.equal(deliveries, 1);
  assert.equal(left.delivered + right.delivered, 1);
});

test('contexto impossível vira dead-letter e alerta obrigatório, nunca done', async () => {
  const client = new RedriveMemoryDynamo();
  await createFailedEffect(client, { eventId: 'evt_redrive_unsafe' });
  let alerts = 0;
  const drained = await drainWebhookOutbox({
    client,
    tableName: 'growx-prevenda-test',
    now: new Date(Date.now() + 2 * 60 * 60 * 1000),
    deadlineAt: Date.now() + 10_000,
    dispatch: async () => { throw new WebhookRedriveUnsafeError('provider_context_missing'); },
    alert: async (record, { idempotencyKey }) => {
      alerts += 1;
      assert.match(idempotencyKey, /^growx-prevenda\/dead-letter\/[a-f0-9]{32}$/);
      assert.equal(record.provider, 'stripe');
      return { ok: true, id: 'alert_1' };
    },
  });
  assert.equal(drained.deadLettered, 1);
  assert.equal(drained.alerted, 1);
  assert.equal(alerts, 1);
  const [record] = [...client.items.values()];
  assert.equal(attr(record, 'state'), 'dead_letter');
  assert.equal(attr(record, 'alert_state'), 'sent');
  assert.equal('outbox_partition' in record, false);
});

test('falhas transitórias respeitam backoff, limite e terminam em dead-letter alertado', async () => {
  const client = new RedriveMemoryDynamo();
  await createFailedEffect(client, { eventId: 'evt_redrive_max_attempts' });
  let alerts = 0;
  let final;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    final = await drainWebhookOutbox({
      client,
      tableName: 'growx-prevenda-test',
      now: new Date(Date.now() + (attempt + 1) * 24 * 60 * 60 * 1000),
      deadlineAt: Date.now() + 10_000,
      dispatch: async () => { throw new Error('channel_outage'); },
      alert: async () => {
        alerts += 1;
        return { ok: true, id: 'alert_max_attempts' };
      },
    });
  }
  assert.equal(final.deadLettered, 1);
  assert.equal(final.alerted, 1);
  assert.equal(alerts, 1);
  const [record] = [...client.items.values()];
  assert.equal(Number(attr(record, 'attempts')), 6);
  assert.equal(attr(record, 'state'), 'dead_letter');
  assert.equal(attr(record, 'alert_state'), 'sent');
});

test('outbox rejeita payload com PII antes de persistir qualquer item', async () => {
  const client = new RedriveMemoryDynamo();
  await assert.rejects(runWebhookEffect({
    provider: 'stripe',
    eventId: 'evt_redrive_no_pii',
    channel: 'buyer_email',
    payload: {
      sessionId: 'cs_test_no_pii',
      paymentStatus: 'paid',
      email: 'ana.sensivel@example.com',
    },
    tableName: 'growx-prevenda-test',
    client,
    now: baseNow,
    execute: async () => ({ ok: true }),
  }), (error) => error instanceof WebhookOutboxIntegrityError
    && error.message === 'webhook_payload_contains_pii');
  assert.equal(client.items.size, 0);
});

test('registro operacional persiste oferta imutável e referência, nunca o payload', async () => {
  const client = new RedriveMemoryDynamo();
  await createFailedEffect(client, { eventId: 'evt_redrive_safe_record' });
  const [record] = [...client.items.values()];
  assert.equal('payload' in record, false);
  assert.equal(attr(record, 'provider_ref'), 'cs_test_redrive');
  assert.equal(Number(attr(record, 'expected_amount_cents')), 300000);
  assert.equal(attr(record, 'expected_currency'), 'BRL');
  assert.equal(attr(record, 'offer_sku'), 'prevenda_cartao');
  assert.equal(attr(record, 'contract_version'), 'v2-2026-08-05');
  assert.equal(attr(record, 'provider_protocol'), 'stripe_checkout_v1');
});

test('dispatcher relê objeto canônico antes de reconstruir mensagem do comprador', async (t) => {
  const previousToken = process.env.MP_ACCESS_TOKEN;
  process.env.MP_ACCESS_TOKEN = 'APP_USR_test_redrive';
  t.after(() => {
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
  });
  const calls = [];
  const payment = {
    id: 99887766,
    external_reference: 'gx-modulo-prevenda',
    metadata: {
      source: 'growx.com.br/prevenda',
      sku: 'prevenda_pix',
      contract_version: 'v2-2026-08-05',
      request_id: '123e4567-e89b-42d3-a456-426614174000',
      slot_id: 'SLOT#001',
      buyer_hash: 'a'.repeat(64),
    },
    transaction_amount: 2800,
    currency_id: 'BRL',
    status: 'approved',
    status_detail: 'accredited',
    date_created: '2026-08-05T12:00:00.000Z',
    payer: {
      email: 'comprador@example.com',
      first_name: 'Comprador',
      last_name: 'Teste',
    },
  };
  const fetchImpl = async (url) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => url.endsWith('/refunds') ? [] : payment,
    };
  };
  let delivered = 0;
  const dispatcher = createWebhookRedriveDispatcher({
    fetchImpl,
    delivery: {
      sendBuyer: async (data) => {
        delivered += 1;
        assert.equal(calls.length, 2);
        assert.equal(data.email, 'comprador@example.com');
        assert.equal(data.reference, 'mp_99887766');
        return { ok: true, id: 'email_provider_refetch' };
      },
    },
  });
  const emptyRefundDigest = createHash('sha256').update('').digest('hex');
  const revisionDigest = createHash('sha256')
    .update(`${emptyRefundDigest}|none|approved|0`)
    .digest('hex')
    .slice(0, 24);
  const canonicalEventId = `financial:99887766:${revisionDigest}`;
  const result = await dispatcher({
    record: {
      provider: 'mercadopago',
      providerReference: '99887766',
      channel: 'buyer_email',
      expectedStatus: 'approved',
      eventHash: createHash('sha256').update(canonicalEventId).digest('hex'),
    },
    idempotencyKey: 'growx-prevenda/test/buyer',
    deadlineAt: Date.now() + 10_000,
  });
  assert.equal(result.ok, true);
  assert.equal(delivered, 1);
  assert.ok(calls.every((url) => url.startsWith('https://api.mercadopago.com/')));
});

test('dispatcher Orders relê ORD e reconstrói confirmação sem tocar Payment legado', async (t) => {
  const previousToken = process.env.MP_ACCESS_TOKEN;
  process.env.MP_ACCESS_TOKEN = 'APP_USR_test_order_redrive';
  t.after(() => {
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
  });
  const requestId = '123e4567-e89b-42d3-a456-426614174000';
  const orderId = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';
  const amount = '2800.00';
  const reservation = {
    reservationId: requestId,
    requestId,
    slot: 'SLOT#002',
    provider: 'mercadopago',
    providerProtocol: 'mp_orders_v1',
    providerRef: orderId,
    buyerPk: `BUYER#${'b'.repeat(64)}`,
    offerAmountCents: 280000,
    offerCurrency: 'BRL',
    offerSku: 'prevenda_pix',
    contractVersion: 'v2-2026-08-05',
  };
  const order = {
    id: orderId,
    type: 'online',
    processing_mode: 'automatic',
    capture_mode: 'automatic',
    external_reference: `gx-modulo-prevenda-${requestId}`,
    total_amount: amount,
    total_paid_amount: amount,
    country_code: 'BRA',
    status: 'processed',
    status_detail: 'accredited',
    created_date: '2026-08-05T14:30:00.000Z',
    last_updated_date: '2026-08-05T14:31:00.000Z',
    payer: {
      email: 'order-redrive@example.com',
      first_name: 'Order',
      last_name: 'Redrive',
      identification: { type: 'CPF', number: '52998224725' },
    },
    transactions: {
      payments: [{
        id: 'PAY01JQ4S4KY8HWQ6NA5PXB65B3D3',
        amount,
        paid_amount: amount,
        status: 'processed',
        status_detail: 'accredited',
        payment_method: { id: 'pix', type: 'bank_transfer' },
      }],
      chargebacks: [],
    },
  };
  const canonical = normalizeMercadoPagoOrderCanonical(order, reservation);
  const calls = [];
  let delivered = 0;
  const dispatcher = createWebhookRedriveDispatcher({
    fetchImpl: async (url) => {
      calls.push(url);
      return { ok: true, status: 200, json: async () => order };
    },
    getReservationImpl: async (candidate) => {
      assert.equal(candidate, requestId);
      return reservation;
    },
    delivery: {
      sendBuyer: async (data) => {
        delivered += 1;
        assert.equal(data.email, 'order-redrive@example.com');
        assert.equal(data.reference, `mp_${orderId}`);
        assert.equal(data.reservationCode, 'GX-123E-4567-E89B');
        return { ok: true, id: 'email_order_redrive' };
      },
    },
  });
  const result = await dispatcher({
    record: {
      provider: 'mercadopago',
      providerProtocol: 'mp_orders_v1',
      providerReference: orderId,
      channel: 'buyer_email',
      expectedStatus: 'approved',
      expectedAmountCents: 280000,
      expectedCurrency: 'BRL',
      offerSku: 'prevenda_pix',
      contractVersion: 'v2-2026-08-05',
      eventHash: createHash('sha256')
        .update(canonical.snapshot.canonicalEventId)
        .digest('hex'),
    },
    idempotencyKey: 'growx-prevenda/test/order-redrive',
    deadlineAt: Date.now() + 10_000,
  });
  assert.equal(result.ok, true);
  assert.equal(delivered, 1);
  assert.deepEqual(calls, [`https://api.mercadopago.com/v1/orders/${orderId}`]);
});

test('redrive usa snapshot imutável de oferta antiga, não a oferta global atual', async (t) => {
  const previousToken = process.env.MP_ACCESS_TOKEN;
  process.env.MP_ACCESS_TOKEN = 'APP_USR_test_old_offer';
  t.after(() => {
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
  });
  const paymentId = '88776655';
  const payment = {
    id: Number(paymentId),
    external_reference: 'gx-modulo-prevenda',
    metadata: {
      source: 'growx.com.br/prevenda',
      sku: 'prevenda_pix_legacy',
      contract_version: 'v1-2026-07-01',
      request_id: '123e4567-e89b-42d3-a456-426614174001',
      slot_id: 'SLOT#002',
      buyer_hash: 'c'.repeat(64),
    },
    transaction_amount: 2500,
    currency_id: 'BRL',
    status: 'approved',
    status_detail: 'accredited',
    date_created: '2026-07-01T12:00:00.000Z',
    payer: { email: 'oferta-antiga@example.com', first_name: 'Oferta', last_name: 'Antiga' },
  };
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    json: async () => url.endsWith('/refunds') ? [] : payment,
  });
  const emptyRefundDigest = createHash('sha256').update('').digest('hex');
  const revisionDigest = createHash('sha256')
    .update(`${emptyRefundDigest}|none|approved|0`)
    .digest('hex')
    .slice(0, 24);
  const canonicalEventId = `financial:${paymentId}:${revisionDigest}`;
  let delivered = 0;
  const dispatcher = createWebhookRedriveDispatcher({
    fetchImpl,
    delivery: {
      sendBuyer: async (data) => {
        delivered += 1;
        assert.equal(data.amountCents, 250000);
        assert.equal(data.sku, 'prevenda_pix_legacy');
        assert.equal(data.contractVersion, 'v1-2026-07-01');
        return { ok: true, id: 'email_old_offer' };
      },
    },
  });
  const result = await dispatcher({
    record: {
      provider: 'mercadopago',
      providerReference: paymentId,
      channel: 'buyer_email',
      expectedStatus: 'approved',
      expectedAmountCents: 250000,
      expectedCurrency: 'BRL',
      offerSku: 'prevenda_pix_legacy',
      contractVersion: 'v1-2026-07-01',
      eventHash: createHash('sha256').update(canonicalEventId).digest('hex'),
    },
    idempotencyKey: 'growx-prevenda/test/old-offer',
    deadlineAt: Date.now() + 10_000,
  });
  assert.equal(result.ok, true);
  assert.equal(delivered, 1);
});

test('dispatcher Stripe refaz binding Session -> PaymentIntent -> Charge antes do comprador', async (t) => {
  const previousSecret = process.env.STRIPE_SECRET_KEY;
  process.env.STRIPE_SECRET_KEY = 'sk_test_redrive_binding';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousSecret;
  });
  const metadata = {
    source: 'growx.com.br/prevenda',
    sku: 'prevenda_cartao_legacy',
    contract_version: 'v1-2026-07-01',
    request_id: '123e4567-e89b-42d3-a456-426614174003',
    slot_id: 'SLOT#004',
    buyer_hash: 'e'.repeat(64),
  };
  const session = {
    id: 'cs_test_redrive_binding',
    object: 'checkout.session',
    amount_total: 275000,
    currency: 'brl',
    metadata,
    payment_intent: 'pi_test_redrive_binding',
    customer_details: { email: 'stripe-binding@example.com', name: 'Stripe Binding' },
  };
  const paymentIntent = {
    id: 'pi_test_redrive_binding',
    object: 'payment_intent',
    amount: 275000,
    amount_received: 275000,
    currency: 'brl',
    status: 'succeeded',
    metadata,
    latest_charge: 'ch_test_redrive_binding',
  };
  const charge = {
    id: 'ch_test_redrive_binding',
    object: 'charge',
    amount: 275000,
    amount_refunded: 0,
    currency: 'brl',
    paid: true,
    status: 'succeeded',
    created: 1785931200,
    metadata,
    payment_intent: paymentIntent.id,
    billing_details: { email: 'stripe-binding@example.com', name: 'Stripe Binding' },
  };
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    let body;
    if (url.includes('/checkout/sessions/')) body = session;
    else if (url.includes('/payment_intents/')) body = paymentIntent;
    else if (url.includes('/charges/')) body = charge;
    else body = { object: 'list', data: [], has_more: false };
    return { ok: true, status: 200, json: async () => body };
  };
  let delivered = 0;
  const dispatcher = createWebhookRedriveDispatcher({
    fetchImpl,
    delivery: {
      sendBuyer: async (data) => {
        delivered += 1;
        assert.equal(data.amountCents, 275000);
        assert.equal(data.contractVersion, 'v1-2026-07-01');
        assert.equal(data.email, 'stripe-binding@example.com');
        return { ok: true, id: 'email_stripe_binding' };
      },
    },
  });
  const result = await dispatcher({
    record: {
      provider: 'stripe',
      providerReference: session.id,
      channel: 'buyer_email',
      expectedStatus: 'paid',
      expectedAmountCents: 275000,
      expectedCurrency: 'BRL',
      offerSku: 'prevenda_cartao_legacy',
      contractVersion: 'v1-2026-07-01',
      eventHash: createHash('sha256')
        .update(`buyer-confirmation:${session.id}`)
        .digest('hex'),
    },
    idempotencyKey: 'growx-prevenda/test/stripe-binding',
    deadlineAt: Date.now() + 10_000,
  });
  assert.equal(result.ok, true);
  assert.equal(delivered, 1);
  assert.ok(calls.some((url) => url.includes('/checkout/sessions/')));
  assert.ok(calls.some((url) => url.includes('/payment_intents/')));
  assert.ok(calls.some((url) => url.includes('/charges/')));
  assert.ok(calls.some((url) => url.includes('/refunds?charge=')));
  assert.ok(calls.some((url) => url.includes('/disputes?charge=')));
});

test('redrive reconstrói payload Resend idêntico para preservar Idempotency-Key', async (t) => {
  const previousToken = process.env.MP_ACCESS_TOKEN;
  const previousResend = process.env.RESEND_API_KEY;
  process.env.MP_ACCESS_TOKEN = 'APP_USR_test_exact_payload';
  process.env.RESEND_API_KEY = 're_test_exact_payload';
  t.after(() => {
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
    if (previousResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousResend;
  });
  const paymentId = '77665544';
  const payment = {
    id: Number(paymentId),
    external_reference: 'gx-modulo-prevenda',
    metadata: {
      source: 'growx.com.br/prevenda',
      sku: 'prevenda_pix',
      contract_version: 'v2-2026-08-05',
      request_id: '123e4567-e89b-42d3-a456-426614174002',
      slot_id: 'SLOT#003',
      buyer_hash: 'd'.repeat(64),
    },
    transaction_amount: 2800,
    currency_id: 'BRL',
    status: 'approved',
    status_detail: 'accredited',
    date_created: '2026-08-05T12:00:00.000Z',
    payer: {
      email: 'payload-identico@example.com',
      first_name: 'Payload',
      last_name: 'Idêntico',
    },
  };
  const resendBodies = [];
  const resendKeys = [];
  const fetchImpl = async (url, options = {}) => {
    if (url === 'https://api.resend.com/emails') {
      resendBodies.push(options.body);
      resendKeys.push(options.headers['Idempotency-Key']);
      return { ok: true, status: 200, json: async () => ({ id: `email_${resendBodies.length}` }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => url.endsWith('/refunds') ? [] : payment,
    };
  };
  const idempotencyKey = 'growx-prevenda/mercadopago/exact/buyer_email';
  await sendBuyerConfirmationEmail({
    email: payment.payer.email,
    name: 'Payload Idêntico',
    reference: `mp_${paymentId}`,
    reservationCode: 'GX-123E-4567-E89B',
    amountCents: 280000,
    method: 'Pix',
    sku: 'prevenda_pix',
    contractVersion: 'v2-2026-08-05',
  }, { idempotencyKey, fetchImpl });

  const emptyRefundDigest = createHash('sha256').update('').digest('hex');
  const revisionDigest = createHash('sha256')
    .update(`${emptyRefundDigest}|none|approved|0`)
    .digest('hex')
    .slice(0, 24);
  const dispatcher = createWebhookRedriveDispatcher({ fetchImpl });
  await dispatcher({
    record: {
      provider: 'mercadopago',
      providerReference: paymentId,
      channel: 'buyer_email',
      expectedStatus: 'approved',
      expectedAmountCents: 280000,
      expectedCurrency: 'BRL',
      offerSku: 'prevenda_pix',
      contractVersion: 'v2-2026-08-05',
      eventHash: createHash('sha256')
        .update(`financial:${paymentId}:${revisionDigest}`)
        .digest('hex'),
    },
    idempotencyKey,
    deadlineAt: Date.now() + 10_000,
  });
  assert.equal(resendBodies.length, 2);
  assert.equal(resendBodies[0], resendBodies[1]);
  assert.deepEqual(resendKeys, [idempotencyKey, idempotencyKey]);
});

test('cron de redrive é bounded, falha fechado sem segredo e rejeita Bearer inválido', async (t) => {
  assert.equal(webhookRedriveMaxDuration, 30);
  assert.equal(webhookRedriveConfig.maxDuration, 30);
  const previousSecret = process.env.CRON_SECRET;
  t.after(() => {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  });
  const response = () => ({
    statusCode: null,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });

  delete process.env.CRON_SECRET;
  const missing = response();
  await webhookRedriveHandler({ method: 'GET', headers: {} }, missing);
  assert.equal(missing.statusCode, 503);
  assert.deepEqual(missing.body, { error: 'cron_not_configured' });

  process.env.CRON_SECRET = 'c'.repeat(32);
  const unauthorized = response();
  await webhookRedriveHandler({ method: 'GET', headers: { authorization: 'Bearer errado' } }, unauthorized);
  assert.equal(unauthorized.statusCode, 401);
  assert.deepEqual(unauthorized.body, { error: 'unauthorized' });
});
