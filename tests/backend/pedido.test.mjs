import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buscarMercadoPagoCheckoutPro,
  buscarMercadoPagoOrders,
  resolverStatusFinanceiroLedger,
  validarMercadoPagoOrderPedido,
} from '../../api/pedido.js';
import { reservationCode } from '../../shared/reservation-code.js';
import { OFERTA } from '../../src/lib/oferta.js';

const requestId = '018f6f20-f18f-4fef-8d6d-42a9f1846fa1';
const buyerHash = 'a'.repeat(64);
const expected = {
  requestId,
  slot: 'SLOT#007',
  provider: 'stripe',
  buyerHash,
};
const base = {
  requestId,
  reservationId: requestId,
  slot: 'SLOT#007',
  provider: 'stripe',
  buyerPk: `BUYER#${buyerHash}`,
  state: 'paid',
  providerEventCreatedAt: '2026-08-05T12:30:00.000Z',
  contractVersion: 'v2-2026-08-05',
  termsAcknowledgedAt: '2026-08-05T12:00:00.000Z',
};

test('área do cliente usa status do ledger após refund parcial, total, disputa e chargeback', () => {
  const cases = [
    ['partially_refunded', 'reembolso parcial'],
    ['refunded', 'reembolsado'],
    ['refund_pending', 'reembolso em processamento'],
    ['refund_failed', 'falha no reembolso'],
    ['disputed', 'em contestação'],
    ['charged_back', 'estornado'],
    ['paid', 'pago'],
  ];
  for (const [paymentStatus, status] of cases) {
    assert.deepEqual(resolverStatusFinanceiroLedger({ ...base, paymentStatus }, expected), {
      ok: true,
      status,
      rawStatus: paymentStatus,
      updatedAt: '2026-08-05T12:30:00.000Z',
      contractVersion: 'v2-2026-08-05',
      termsAcknowledgedAt: '2026-08-05T12:00:00.000Z',
      fulfillmentActive: ['partially_refunded', 'refund_failed', 'paid'].includes(paymentStatus),
    });
  }
});

test('ledger divergente ou ausente nunca confirma status do provider', () => {
  assert.deepEqual(resolverStatusFinanceiroLedger(null, expected), {
    ok: false,
    reason: 'ledger_missing',
  });
  assert.deepEqual(resolverStatusFinanceiroLedger({
    ...base,
    paymentStatus: 'paid',
    buyerPk: `BUYER#${'b'.repeat(64)}`,
  }, expected), {
    ok: false,
    reason: 'ledger_ownership_mismatch',
  });
});

test('ledger held e released são exibidos sem fabricar pagamento aprovado', () => {
  const held = resolverStatusFinanceiroLedger({ ...base, state: 'held' }, expected);
  const released = resolverStatusFinanceiroLedger({ ...base, state: 'released' }, expected);
  assert.equal(held.status, 'confirmação em processamento');
  assert.equal(held.fulfillmentActive, false);
  assert.equal(released.status, 'reserva expirada');
  assert.equal(released.fulfillmentActive, false);
  assert.deepEqual(resolverStatusFinanceiroLedger({ ...base, state: 'held' }, {
    ...expected,
    providerPaymentStatus: 'paid',
  }), {
    ok: false,
    reason: 'ledger_provider_divergence',
  });
});

const cpf = '52998224725';
const email = 'cliente@example.com';
const mpBuyerHash = 'c'.repeat(64);
const mpEmailHash = 'e'.repeat(64);
const mpRequestId = '123e4567-e89b-42d3-a456-426614174000';
const mpOrderId = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';
const mpPaymentId = 'PAY01JQ4S4KY8HWQ6NA5PXB65B3D3';

function mpReservation(overrides = {}) {
  return {
    requestId: mpRequestId,
    reservationId: mpRequestId,
    slot: 'SLOT#002',
    provider: 'mercadopago',
    providerProtocol: 'mp_orders_v1',
    providerRef: mpOrderId,
    buyerPk: `BUYER#${mpBuyerHash}`,
    emailHash: mpEmailHash,
    state: 'paid',
    paymentStatus: 'approved',
    offerAmountCents: OFERTA.pixCentavos,
    offerCurrency: 'BRL',
    offerSku: 'prevenda_pix',
    contractVersion: OFERTA.contratoVersao,
    termsAcknowledgedAt: '2026-08-05T14:00:00.000Z',
    providerEventCreatedAt: '2026-08-05T14:31:00.000Z',
    updatedAt: '2026-08-05T14:31:00.000Z',
    ...overrides,
  };
}

function mpOrder(overrides = {}) {
  const amount = (OFERTA.pixCentavos / 100).toFixed(2);
  return {
    id: mpOrderId,
    type: 'online',
    processing_mode: 'automatic',
    capture_mode: 'automatic',
    external_reference: `gx-modulo-prevenda-${mpRequestId}`,
    total_amount: amount,
    total_paid_amount: amount,
    currency: 'BRL',
    status: 'processed',
    status_detail: 'accredited',
    created_date: '2026-08-05T14:30:00.000Z',
    payer: {
      email,
      first_name: 'Cliente',
      last_name: 'Grow-X',
      identification: { type: 'CPF', number: cpf },
    },
    transactions: {
      payments: [{
        id: mpPaymentId,
        amount,
        paid_amount: amount,
        status: 'processed',
        status_detail: 'accredited',
        payment_method: { id: 'pix', type: 'bank_transfer' },
      }],
    },
    ...overrides,
  };
}

const s = (value) => ({ S: String(value) });
const n = (value) => ({ N: String(value) });
const clone = (value) => JSON.parse(JSON.stringify(value));

function ledgerItem(record, pk, { buyerGuard = false, slot = false } = {}) {
  const item = {
    pk: s(pk),
    request_id: s(record.requestId),
    reservation_id: s(record.reservationId),
    slot: s(record.slot),
    provider: s(record.provider),
    state: s(record.state),
    offer_amount_cents: n(record.offerAmountCents),
    offer_currency: s(record.offerCurrency),
    offer_sku: s(record.offerSku),
    contract_version: s(record.contractVersion),
    updated_at: s(record.updatedAt),
    terms_acknowledged_at: s(record.termsAcknowledgedAt),
    email_hash: s(record.emailHash),
  };
  if (!buyerGuard) {
    item.provider_protocol = s(record.providerProtocol);
    item.provider_ref = s(record.providerRef);
    // transitionReservation remove buyer_pk do SLOT ao marcar paid/released.
    if (!slot || record.state === 'held') item.buyer_pk = s(record.buyerPk);
    item.payment_status = s(record.paymentStatus);
    item.provider_event_created_at = s(record.providerEventCreatedAt);
  }
  return item;
}

function orderLookupContext(record = mpReservation(), order = mpOrder()) {
  const items = new Map([
    [record.buyerPk, ledgerItem(record, record.buyerPk, { buyerGuard: true })],
    [`REQUEST#${record.requestId}`, ledgerItem(record, `REQUEST#${record.requestId}`)],
    [record.slot, ledgerItem(record, record.slot, { slot: true })],
  ]);
  const reads = [];
  const calls = [];
  return {
    items,
    reads,
    calls,
    context: {
      tableName: 'growx-prevenda-test',
      mpToken: 'APP_USR-test',
      clockMs: () => Date.now(),
      deadlineAt: Date.now() + 1_000,
      client: {
        async send(command) {
          assert.equal(command.constructor.name, 'GetItemCommand');
          assert.equal(command.input.ConsistentRead, true);
          const pk = command.input.Key.pk.S;
          reads.push(pk);
          return { Item: items.get(pk) };
        },
      },
      fetchImpl: async (url, options) => {
        calls.push({ url: String(url), options });
        return { ok: true, json: async () => order };
      },
    },
  };
}

test('Orders valida envelope, ORD/PAY, Pix, valor, moeda, pagador e binding do ledger', () => {
  const valid = validarMercadoPagoOrderPedido(mpOrder(), mpReservation(), {
    email, cpf, buyerHash: mpBuyerHash, emailHash: mpEmailHash,
  });
  assert.equal(valid.orderId, mpOrderId);
  assert.equal(valid.paymentId, mpPaymentId);
  assert.equal(valid.providerPaymentStatus, 'processed');

  const cases = [
    ['external_reference', (order) => { order.external_reference = `gx-modulo-prevenda-${requestId}`; }],
    ['order_id', (order) => { order.id = 'ORDINVALID'; }],
    ['payment_id', (order) => { order.transactions.payments[0].id = '12345'; }],
    ['payment_id_case', (order) => { order.transactions.payments[0].id = mpPaymentId.toLowerCase(); }],
    ['method', (order) => { order.transactions.payments[0].payment_method.id = 'visa'; }],
    ['amount', (order) => { order.total_amount = '2799.99'; }],
    ['currency', (order) => { order.currency = 'USD'; }],
    ['email', (order) => { order.payer.email = 'outra@example.com'; }],
    ['document', (order) => { order.payer.identification.number = '11144477735'; }],
  ];
  for (const [label, mutate] of cases) {
    const candidate = clone(mpOrder());
    mutate(candidate);
    assert.equal(validarMercadoPagoOrderPedido(candidate, mpReservation(), {
      email, cpf, buyerHash: mpBuyerHash, emailHash: mpEmailHash,
    }), null, label);
  }

  for (const [label, reservation] of [
    ['protocol', mpReservation({ providerProtocol: 'mp_checkout_pro_v1' })],
    ['provider_ref', mpReservation({ providerRef: 'ORD01JXXXXXXXXXXXXXXXXXXXXXXXXX' })],
    ['request_id', mpReservation({ requestId })],
    ['buyer', mpReservation({ buyerPk: `BUYER#${'d'.repeat(64)}` })],
    ['email', mpReservation({ emailHash: 'f'.repeat(64) })],
  ]) {
    assert.equal(validarMercadoPagoOrderPedido(mpOrder(), reservation, {
      email, cpf, buyerHash: mpBuyerHash, emailHash: mpEmailHash,
    }), null, `ledger_${label}`);
  }
});

test('Orders aceita GET oficial sem payer/moeda porque e-mail e CPF já estão vinculados por HMAC no ledger', () => {
  const candidate = clone(mpOrder());
  delete candidate.payer;
  delete candidate.currency;
  delete candidate.currency_id;
  delete candidate.transactions.payments[0].currency;
  delete candidate.transactions.payments[0].currency_id;
  const valid = validarMercadoPagoOrderPedido(candidate, mpReservation(), {
    email, cpf, buyerHash: mpBuyerHash, emailHash: mpEmailHash,
  });
  assert.equal(valid.orderId, mpOrderId);
  assert.equal(valid.paymentId, mpPaymentId);
});

test('Orders usa três leituras fortes e um GET por ORD; status e código vêm do ledger', async () => {
  const harness = orderLookupContext();
  assert.equal(harness.items.get('SLOT#002').buyer_pk, undefined);
  const result = await buscarMercadoPagoOrders(
    email,
    cpf,
    mpBuyerHash,
    mpEmailHash,
    harness.context,
  );

  assert.equal(result.ok, true);
  assert.equal(result.applicable, true);
  assert.equal(result.ledgerOk, true);
  assert.deepEqual(harness.reads.sort(), [
    `BUYER#${mpBuyerHash}`,
    `REQUEST#${mpRequestId}`,
    'SLOT#002',
  ].sort());
  assert.equal(harness.calls.length, 1);
  assert.equal(harness.calls[0].url, `https://api.mercadopago.com/v1/orders/${mpOrderId}`);
  assert.match(harness.calls[0].options.headers.Authorization, /^Bearer /);
  assert.equal(result.pedidos[0].status, 'pago');
  assert.equal(result.pedidos[0].status_confiavel, true);
  assert.equal(result.pedidos[0].referencia, mpOrderId);
  assert.equal(result.pedidos[0].referencia_pagamento, mpPaymentId);
  assert.equal(result.pedidos[0].codigo_reserva, reservationCode(mpRequestId));
});

test('Order processed com ledger held nunca confirma pagamento', async () => {
  const harness = orderLookupContext(mpReservation({
    state: 'held',
    paymentStatus: null,
    providerEventCreatedAt: null,
  }));
  const result = await buscarMercadoPagoOrders(
    email,
    cpf,
    mpBuyerHash,
    mpEmailHash,
    harness.context,
  );
  assert.equal(result.ok, true);
  assert.equal(result.ledgerOk, false);
  assert.equal(result.pedidos[0].status, 'status financeiro a confirmar');
  assert.equal(result.pedidos[0].status_provedor, 'pago');
  assert.equal(result.pedidos[0].status_confiavel, false);
  assert.equal(result.pedidos[0].codigo_reserva, reservationCode(mpRequestId));
});

test('Orders falha fechada antes do provider quando SLOT diverge do REQUEST', async () => {
  const harness = orderLookupContext();
  const originalSend = harness.context.client.send;
  harness.context.client.send = async (command, options) => {
    const response = await originalSend.call(harness.context.client, command, options);
    if (command.input.Key.pk.S === 'SLOT#002') {
      response.Item = clone(response.Item);
      response.Item.request_id = s(requestId);
    }
    return response;
  };
  await assert.rejects(
    buscarMercadoPagoOrders(email, cpf, mpBuyerHash, mpEmailHash, harness.context),
    /pedido_order_ledger_binding_mismatch/,
  );
  assert.equal(harness.calls.length, 0);
});

test('Orders paid rejeita buyer_pk divergente quando um SLOT legado ainda o contém', async () => {
  const harness = orderLookupContext();
  harness.items.get('SLOT#002').buyer_pk = s(`BUYER#${'d'.repeat(64)}`);

  await assert.rejects(
    buscarMercadoPagoOrders(email, cpf, mpBuyerHash, mpEmailHash, harness.context),
    /pedido_order_ledger_binding_mismatch/,
  );
  assert.equal(harness.calls.length, 0);
});

test('GET da Order respeita o deadline global e não entra em loop de retry', async () => {
  const harness = orderLookupContext();
  let providerCalls = 0;
  harness.context.deadlineAt = Date.now() + 25;
  harness.context.fetchImpl = async () => {
    providerCalls += 1;
    return new Promise(() => {});
  };
  const started = Date.now();
  await assert.rejects(
    buscarMercadoPagoOrders(email, cpf, mpBuyerHash, mpEmailHash, harness.context),
    /provider_deadline_exceeded/,
  );
  assert.equal(providerCalls, 1);
  assert.ok(Date.now() - started < 500);
});

test('Checkout Pro legado continua consultável e usa o mesmo ledger autoritativo', async () => {
  const legacyPaymentId = 99887766;
  const record = mpReservation({
    providerProtocol: 'mp_checkout_pro_v1',
    providerRef: 'pref_legacy',
  });
  const legacyPayment = {
    id: legacyPaymentId,
    status: 'approved',
    transaction_amount: OFERTA.pixCentavos / 100,
    currency_id: 'BRL',
    date_created: '2026-08-04T12:00:00.000Z',
    metadata: {
      request_id: mpRequestId,
      slot_id: record.slot,
      buyer_hash: mpBuyerHash,
      contract_version: OFERTA.contratoVersao,
    },
    payer: {
      email,
      first_name: 'Cliente',
      identification: { type: 'CPF', number: cpf },
    },
  };
  let providerCalls = 0;
  const context = {
    tableName: 'growx-prevenda-test',
    mpToken: 'APP_USR-test',
    clockMs: () => Date.now(),
    deadlineAt: Date.now() + 1_000,
    client: {
      async send(command) {
        assert.equal(command.constructor.name, 'GetItemCommand');
        return { Item: ledgerItem(record, `REQUEST#${mpRequestId}`) };
      },
    },
    fetchImpl: async (url) => {
      providerCalls += 1;
      assert.match(String(url), /\/v1\/payments\/search\?/);
      return {
        ok: true,
        json: async () => ({ results: [legacyPayment], paging: { total: 1 } }),
      };
    },
  };
  const result = await buscarMercadoPagoCheckoutPro(email, cpf, mpBuyerHash, context);
  assert.equal(providerCalls, 1);
  assert.equal(result.ok, true);
  assert.equal(result.ledgerOk, true);
  assert.equal(result.pedidos[0].referencia, String(legacyPaymentId));
  assert.equal(result.pedidos[0].status, 'pago');
  assert.equal(result.pedidos[0].codigo_reserva, reservationCode(mpRequestId));
});
