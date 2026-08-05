import assert from 'node:assert/strict';
import test from 'node:test';

import {
  financialReconciliationPending,
  MAX_PAID_RECONCILIATIONS_PER_REQUEST,
  reconcilePaidFinancials,
} from '../../api/_lib/financial-reconcile.js';

const TABLE = 'growx-prevenda-financial-test';
const s = (value) => ({ S: String(value) });
const n = (value) => ({ N: String(value) });

function slot(index, provider, providerRef, lastProviderRef, providerProtocol) {
  const pk = `SLOT#${String(index).padStart(3, '0')}`;
  return {
    pk: s(pk),
    slot: s(pk),
    request_id: s(`123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`),
    reservation_id: s(`123e4567-e89b-42d3-a456-${String(index).padStart(12, '0')}`),
    provider: s(provider),
    provider_ref: s(providerRef),
    ...(providerProtocol ? { provider_protocol: s(providerProtocol) } : {}),
    ...(lastProviderRef ? { last_provider_ref: s(lastProviderRef) } : {}),
    state: s('paid'),
    offer_amount_cents: n(provider === 'stripe' ? 300_000 : 280_000),
    offer_currency: s('BRL'),
    offer_sku: s(provider === 'stripe' ? 'prevenda_cartao' : 'prevenda_pix'),
    contract_version: s('v1'),
  };
}

test('scanner financeiro roteia Orders pela ORD anexada, nunca pelo endpoint Payment legado', async () => {
  const calls = [];
  const orderId = 'ORD01HRYFWNYRE1MR1E60MW3X0T2P';
  const result = await reconcilePaidFinancials({
    now: new Date('2026-08-05T12:00:00.000Z'),
    client: new ReadClient([
      slot(1, 'mercadopago', orderId, null, 'mp_orders_v1'),
    ]),
    tableName: TABLE,
    mpToken: 'APP_USR_scan',
    mpReconcileImpl: async () => { throw new Error('legacy_payment_must_not_run'); },
    mpOrderReconcileImpl: async (token, reference) => calls.push([token, reference]),
    recordImpl: async () => true,
  });

  assert.deepEqual(calls, [['APP_USR_scan', orderId]]);
  assert.equal(result.attempted, 1);
  assert.equal(result.succeeded, 1);
  assert.equal(result.providerFailures, 0);
  assert.equal(result.pending, false);
});

class ReadClient {
  constructor(items) { this.items = items; }

  async send(command) {
    assert.equal(command.constructor.name, 'BatchGetItemCommand');
    return { Responses: { [TABLE]: this.items } };
  }
}

test('scanner pago usa Session Stripe e Payment MP, limitado e com registro de sucesso', async () => {
  const records = [];
  const calls = [];
  const items = [
    slot(1, 'stripe', 'cs_paid_scan_1'),
    slot(2, 'mercadopago', 'pref_paid_scan_2', '99887766'),
    slot(3, 'stripe', 'cs_paid_scan_3'),
  ];
  const result = await reconcilePaidFinancials({
    now: new Date('2026-08-05T12:00:00.000Z'),
    client: new ReadClient(items),
    tableName: TABLE,
    stripeKey: 'sk_test_scan',
    mpToken: 'APP_USR_scan',
    stripeReconcileImpl: async (key, reference) => calls.push(['stripe', key, reference]),
    mpReconcileImpl: async (token, reference) => calls.push(['mp', token, reference]),
    recordImpl: async (record) => records.push(record),
  });

  assert.equal(MAX_PAID_RECONCILIATIONS_PER_REQUEST, 2);
  assert.equal(result.attempted, 2);
  assert.equal(result.succeeded, 2);
  assert.equal(result.providerFailures, 0);
  assert.equal(result.deferred, 1);
  assert.equal(result.pending, true, 'o terceiro slot ainda não possui prova canônica');
  assert.equal(calls.length, 2);
  assert.ok(calls.some(([provider, , reference]) => provider === 'stripe' && /^cs_/.test(reference)));
  assert.ok(calls.some(([provider, , reference]) => provider === 'mp' && reference === '99887766'));
  assert.ok(records.every((record) => record.ok === true));
});

test('ciclo integral bem-sucedido projeta o timestamp pós-scan e limpa pending', async () => {
  const result = await reconcilePaidFinancials({
    now: new Date('2026-08-05T12:00:00.000Z'),
    client: new ReadClient([
      slot(1, 'stripe', 'cs_paid_complete_1'),
      slot(2, 'mercadopago', 'pref_paid_complete_2', '99887767'),
    ]),
    tableName: TABLE,
    stripeKey: 'sk_test_scan',
    mpToken: 'APP_USR_scan',
    stripeReconcileImpl: async () => {},
    mpReconcileImpl: async () => {},
    recordImpl: async () => true,
  });

  assert.deepEqual(result, {
    attempted: 2,
    succeeded: 2,
    providerFailures: 0,
    deferred: 0,
    pending: false,
  });
});

test('anel físico bounded cobre os 100 slots pagos uma vez em 50 ciclos, dentro do SLA', async () => {
  const items = Array.from(
    { length: 100 },
    (_, index) => slot(index + 1, 'stripe', `cs_paid_rotation_${index + 1}`),
  );
  const seen = new Map();
  const base = Date.parse('2026-08-05T12:00:00.000Z');

  for (let minute = 0; minute < 50; minute += 1) {
    const result = await reconcilePaidFinancials({
      now: new Date(base + (minute * 60_000)),
      client: new ReadClient(items),
      tableName: TABLE,
      stripeKey: 'sk_test_scan',
      stripeReconcileImpl: async (key, reference) => {
        assert.equal(key, 'sk_test_scan');
        seen.set(reference, (seen.get(reference) || 0) + 1);
      },
      recordImpl: async () => true,
    });
    assert.equal(result.attempted, MAX_PAID_RECONCILIATIONS_PER_REQUEST);
    assert.equal(result.succeeded, MAX_PAID_RECONCILIATIONS_PER_REQUEST);
    assert.equal(result.providerFailures, 0);
  }

  assert.equal(seen.size, 100);
  assert.ok([...seen.values()].every((count) => count === 1));
  assert.ok(50 * 60_000 < 60 * 60 * 1000, 'a volta completa deve caber no SLA');
});

test('crescimento do lote não desloca um pago antigo para além do SLA', async () => {
  const targetReference = 'cs_paid_rotation_target_100';
  let targetMinute = null;
  const base = 3 * 60_000;

  for (let minute = 0; minute < 60; minute += 1) {
    const lowerPaidCount = Math.min(99, 2 + minute);
    const items = [
      ...Array.from(
        { length: lowerPaidCount },
        (_, index) => slot(index + 1, 'stripe', `cs_paid_growth_${index + 1}`),
      ),
      slot(100, 'stripe', targetReference),
    ];
    let calls = 0;
    await reconcilePaidFinancials({
      now: new Date(base + (minute * 60_000)),
      client: new ReadClient(items),
      tableName: TABLE,
      stripeKey: 'sk_test_scan',
      stripeReconcileImpl: async (key, reference) => {
        assert.equal(key, 'sk_test_scan');
        calls += 1;
        if (reference === targetReference && targetMinute === null) targetMinute = minute;
      },
      recordImpl: async () => true,
    });
    assert.ok(calls <= MAX_PAID_RECONCILIATIONS_PER_REQUEST);
  }

  assert.notEqual(targetMinute, null);
  assert.ok(targetMinute < 50, `slot antigo esperou ${targetMinute} minutos`);
});

test('falha provider fica pendente, sanitizada e não vira sucesso silencioso', async () => {
  const records = [];
  const result = await reconcilePaidFinancials({
    now: new Date('2026-08-05T12:00:00.000Z'),
    client: new ReadClient([slot(1, 'stripe', 'cs_paid_failure')]),
    tableName: TABLE,
    stripeKey: 'sk_test_scan',
    stripeReconcileImpl: async () => { throw new Error('stripe_refetch_failed'); },
    recordImpl: async (record) => records.push(record),
  });

  assert.equal(result.succeeded, 0);
  assert.equal(result.providerFailures, 1);
  assert.equal(result.pending, true);
  assert.equal(records[0].ok, false);
  assert.equal(records[0].errorCode, 'stripe_refetch_failed');
});

test('SLA financeiro considera ausência, falha e idade da última prova canônica', () => {
  const now = new Date('2026-08-05T13:00:00.000Z');
  assert.equal(financialReconciliationPending([{ state: 'released' }], now), false);
  assert.equal(financialReconciliationPending([{ state: 'paid' }], now), true);
  assert.equal(financialReconciliationPending([{
    state: 'paid',
    financialReconciliationStatus: 'failed',
    financialReconciledAt: '2026-08-05T12:59:00.000Z',
  }], now), true);
  assert.equal(financialReconciliationPending([{
    state: 'paid',
    financialReconciliationStatus: 'ok',
    financialReconciledAt: '2026-08-05T12:30:00.000Z',
  }], now), false);
  assert.equal(financialReconciliationPending([{
    state: 'paid',
    financialReconciliationStatus: 'ok',
    financialReconciledAt: '2026-08-05T12:00:00.000Z',
  }], now), false, 'exatamente no limite ainda satisfaz o SLA');
  assert.equal(financialReconciliationPending([{
    state: 'paid',
    financialReconciliationStatus: 'ok',
    financialReconciledAt: '2026-08-05T11:59:59.999Z',
  }], now), true, 'qualquer idade acima do SLA deve ficar pendente');
});
