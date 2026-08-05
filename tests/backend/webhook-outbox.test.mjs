import assert from 'node:assert/strict';
import test from 'node:test';

import {
  runWebhookEffect,
  withWebhookReservationLock,
  WEBHOOK_OUTBOX_RETENTION_SECONDS,
  WebhookDeliveryError,
  WebhookOutboxIntegrityError,
} from '../../api/_lib/webhook-outbox.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
const attr = (item, key) => item?.[key]?.S ?? item?.[key]?.N;

class OutboxMemoryDynamo {
  constructor() {
    this.items = new Map();
  }

  async send(command) {
    const input = command.input;
    if (command.constructor.name === 'GetItemCommand') {
      const item = this.items.get(attr(input.Key, 'pk'));
      return item ? { Item: clone(item) } : {};
    }
    if (command.constructor.name !== 'TransactWriteItemsCommand') {
      throw new Error(`unsupported:${command.constructor.name}`);
    }
    const operation = input.TransactItems[0];
    try {
      if (operation.Put) this.#put(operation.Put);
      else if (operation.Update) this.#update(operation.Update);
      else this.#delete(operation.Delete);
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
    const current = this.items.get(pk);
    if (current) {
      const epoch = Number(attr(put.ExpressionAttributeValues, ':epoch'));
      const lease = Number(attr(current, 'lease_until'));
      if (!Number.isFinite(epoch) || !Number.isFinite(lease) || lease >= epoch) {
        throw new Error('exists');
      }
    }
    this.items.set(pk, clone(put.Item));
  }

  #delete(del) {
    const pk = attr(del.Key, 'pk');
    const item = this.items.get(pk);
    if (!item || attr(item, 'owner_token') !== attr(del.ExpressionAttributeValues, ':owner')) {
      throw new Error('not_owner');
    }
    this.items.delete(pk);
  }

  #update(update) {
    const pk = attr(update.Key, 'pk');
    const item = this.items.get(pk);
    if (!item) throw new Error('missing');
    const values = update.ExpressionAttributeValues;
    const state = attr(item, 'state');

    if (values[':pending']) {
      const now = Number(attr(values, ':epoch'));
      const lease = Number(attr(item, 'lease_until'));
      const canClaim = state === 'pending' || state === 'failed'
        || (state === 'processing' && lease < now);
      if (!canClaim || attr(item, 'payload_digest') !== attr(values, ':digest')) {
        throw new Error('not_claimable');
      }
      item.state = clone(values[':processing']);
      item.lease_until = clone(values[':lease']);
      item.owner_token = clone(values[':owner']);
      item.updated_at = clone(values[':now']);
      item.attempts = { N: String(Number(attr(item, 'attempts')) + 1) };
    } else if (values[':done']) {
      if (state !== 'processing' || attr(item, 'owner_token') !== attr(values, ':owner')) {
        throw new Error('not_owner');
      }
      item.state = clone(values[':done']);
      item.done_at = clone(values[':now']);
      item.updated_at = clone(values[':now']);
      if (values[':external']) item.external_ref = clone(values[':external']);
      delete item.lease_until;
      delete item.owner_token;
      delete item.last_error;
    } else if (values[':failed']) {
      if (state !== 'processing' || attr(item, 'owner_token') !== attr(values, ':owner')) {
        throw new Error('not_owner');
      }
      item.state = clone(values[':failed']);
      item.last_error = clone(values[':error']);
      item.updated_at = clone(values[':now']);
      delete item.lease_until;
      delete item.owner_token;
    } else {
      throw new Error('unsupported_update');
    }
    this.items.set(pk, item);
  }
}

const base = {
  provider: 'stripe',
  eventId: 'evt_outbox123',
  channel: 'buyer_email',
  payload: { objectId: 'cs_test_123', status: 'paid' },
  tableName: 'growx-prevenda-test',
  now: new Date('2026-08-05T12:00:00.000Z'),
};

test('outbox persiste TTL 400 dias e replay não repete efeito concluído', async () => {
  const client = new OutboxMemoryDynamo();
  let calls = 0;
  const execute = async ({ idempotencyKey }) => {
    calls += 1;
    assert.match(idempotencyKey, /^growx-prevenda\/stripe\/[a-f0-9]{32}\/buyer_email$/);
    return { ok: true, id: 're_test_email' };
  };
  const first = await runWebhookEffect({ ...base, client, execute });
  const replay = await runWebhookEffect({ ...base, client, execute });
  assert.equal(first.replay, false);
  assert.equal(replay.replay, true);
  assert.equal(calls, 1);

  const [record] = [...client.items.values()];
  const expectedTtl = Math.floor(base.now.getTime() / 1000) + WEBHOOK_OUTBOX_RETENTION_SECONDS;
  assert.equal(Number(attr(record, 'ttl')), expectedTtl);
  assert.equal(attr(record, 'state'), 'done');
  assert.equal(attr(record, 'record_type'), 'WEBHOOK_EFFECT');
  assert.equal('payload' in record, false);
  assert.equal('email' in record, false);
});

test('ledger LATE_REFUND persiste só referência operacional e TTL', async () => {
  const client = new OutboxMemoryDynamo();
  await runWebhookEffect({
    ...base,
    provider: 'mercadopago',
    eventId: 'payment:99887766:approved',
    channel: 'late_refund',
    recordType: 'LATE_REFUND',
    providerReference: '99887766',
    payload: { paymentId: '99887766', status: 'approved', compensation: 'full_refund' },
    client,
    execute: async () => ({ ok: true, id: '55443322' }),
  });
  const [record] = [...client.items.values()];
  assert.equal(attr(record, 'record_type'), 'LATE_REFUND');
  assert.equal(attr(record, 'provider_ref'), '99887766');
  assert.equal(attr(record, 'external_ref'), '55443322');
  assert.equal('payload' in record, false);
  assert.equal('payer' in record, false);
});

test('efeito rejeitado fica failed, retenta e depois deduplica', async () => {
  const client = new OutboxMemoryDynamo();
  let calls = 0;
  const execute = async () => {
    calls += 1;
    return { ok: calls > 1 };
  };
  await assert.rejects(
    runWebhookEffect({ ...base, eventId: 'evt_retry123', client, execute }),
    WebhookDeliveryError,
  );
  await runWebhookEffect({ ...base, eventId: 'evt_retry123', client, execute });
  await runWebhookEffect({ ...base, eventId: 'evt_retry123', client, execute });
  assert.equal(calls, 2);
});

test('mesma chave com payload divergente falha por integridade', async () => {
  const client = new OutboxMemoryDynamo();
  await runWebhookEffect({ ...base, client, execute: async () => ({ ok: true }) });
  await assert.rejects(
    runWebhookEffect({
      ...base,
      payload: { objectId: 'cs_test_123', status: 'refunded' },
      client,
      execute: async () => ({ ok: true }),
    }),
    WebhookOutboxIntegrityError,
  );
});

test('lease por reserva bloqueia concorrência e é liberada após o ciclo', async () => {
  const client = new OutboxMemoryDynamo();
  const args = {
    provider: 'stripe',
    reservationKey: 'reservation-test-lease-001',
    tableName: 'growx-prevenda-test',
    client,
    now: new Date('2026-08-05T12:00:00.000Z'),
  };
  let nestedBlocked = false;
  const result = await withWebhookReservationLock({
    ...args,
    execute: async () => {
      try {
        await withWebhookReservationLock({ ...args, execute: async () => 'concorrente' });
      } catch (error) {
        nestedBlocked = error?.name === 'WebhookOutboxBusyError';
      }
      return 'serializado';
    },
  });
  assert.equal(result, 'serializado');
  assert.equal(nestedBlocked, true);
  assert.equal(client.items.size, 0);

  const replay = await withWebhookReservationLock({ ...args, execute: async () => 'liberado' });
  assert.equal(replay, 'liberado');
});
