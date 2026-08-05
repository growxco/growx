import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import process from 'node:process';
import test from 'node:test';

import mpHandler, {
  config as mpConfig,
  deriveMercadoPagoFinancialSnapshot,
  deriveMercadoPagoOrderFinancialSnapshot,
  fetchMercadoPagoRefundState,
  maxDuration as mpMaxDuration,
  normalizeMercadoPagoOrderCanonical,
  normalizeMercadoPagoOrderRefundState,
  normalizeMercadoPagoRefundState,
  processMercadoPagoOrder,
  processMercadoPagoPayment,
  reconcileMercadoPagoOrderById,
  reconcileMercadoPagoPaymentById,
  refundMercadoPagoOrder,
  verifyMercadoPagoOrderBinding,
  verifyMercadoPagoPaymentBinding,
} from '../../api/mp-webhook.js';
import { InventoryLatePaymentReassignedError } from '../../api/_lib/inventory.js';
import { reservationCode } from '../../shared/reservation-code.js';
import { OFERTA } from '../../src/lib/oferta.js';

const requestId = '123e4567-e89b-42d3-a456-426614174000';
const orderId = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';
const orderPaymentId = 'PAY01JQ4S4KY8HWQ6NA5PXB65B3D3';
const orderRefundId = 'REF01JQ4S4KY8HWQ6NA5PXB65B3D3';
const orderRefundId2 = 'REF01JQ4S4KY8HWQ6NA5PXB65B3D4';
const orderChargebackId = 'CBK01JQ4S4KY8HWQ6NA5PXB65B3D3';

function responseMock() {
  return {
    headers: {}, statusCode: 200, body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function payment(overrides = {}) {
  return {
    id: 99887766,
    status: 'approved',
    status_detail: 'accredited',
    external_reference: 'gx-modulo-prevenda',
    transaction_amount: OFERTA.pixCentavos / 100,
    transaction_amount_refunded: 0,
    currency_id: 'BRL',
    payment_method_id: 'pix',
    payment_type_id: 'bank_transfer',
    date_created: '2026-08-05T14:30:00.000Z',
    date_approved: '2026-08-05T14:31:00.000Z',
    date_last_updated: '2026-08-05T15:00:00.000Z',
    order: { id: 88776655 },
    metadata: {
      source: 'growx.com.br/prevenda',
      sku: 'prevenda_pix',
      contract_version: OFERTA.contratoVersao,
      request_id: requestId,
      slot_id: 'SLOT#002',
      buyer_hash: 'b'.repeat(64),
    },
    payer: { email: 'pessoa@example.com', first_name: 'Pessoa' },
    ...overrides,
  };
}

function order(overrides = {}) {
  const amount = (OFERTA.pixCentavos / 100).toFixed(2);
  return {
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
    payer: { email: 'pessoa@example.com', first_name: 'Pessoa' },
    transactions: {
      payments: [{
        id: orderPaymentId,
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
}

function orderReservation(overrides = {}) {
  return {
    reservationId: requestId,
    requestId,
    slot: 'SLOT#002',
    provider: 'mercadopago',
    providerProtocol: 'mp_orders_v1',
    providerRef: orderId,
    buyerPk: `BUYER#${'b'.repeat(64)}`,
    offerAmountCents: OFERTA.pixCentavos,
    offerCurrency: 'BRL',
    offerSku: 'prevenda_pix',
    contractVersion: OFERTA.contratoVersao,
    ...overrides,
  };
}

function orderRefund(id, amountCents, overrides = {}) {
  return {
    id,
    transaction_id: orderPaymentId,
    reference_id: `reference-${id}`,
    amount: (amountCents / 100).toFixed(2),
    status: 'processed',
    e2e_id: `e2e-${id}`,
    ...overrides,
  };
}

function orderWithFinancialState({ status, statusDetail, refunds = [], chargeback = null }) {
  const paymentStatus = status === 'charged_back' ? 'charged_back'
    : (status === 'refunded' ? 'refunded' : 'processed');
  const paymentDetail = status === 'charged_back' ? statusDetail
    : (status === 'refunded' ? 'refunded' : statusDetail);
  return order({
    status,
    status_detail: statusDetail,
    last_updated_date: '2026-08-05T16:00:00.000Z',
    transactions: {
      payments: [{
        ...order().transactions.payments[0],
        status: paymentStatus,
        status_detail: paymentDetail,
      }],
      refunds,
      chargebacks: chargeback ? [chargeback] : [],
    },
  });
}

function refund(id, amountCents, overrides = {}) {
  return {
    id,
    payment_id: 99887766,
    amount: amountCents / 100,
    status: 'approved',
    date_created: `2026-08-05T15:${String(Number(id) % 60).padStart(2, '0')}:00.000Z`,
    ...overrides,
  };
}

function durableHarness() {
  const done = new Map();
  return {
    runEffect: async ({ provider, eventId, channel, execute }) => {
      const key = `${provider}:${eventId}:${channel}`;
      if (done.has(key)) return { delivered: true, replay: true, externalRef: done.get(key) };
      const result = await execute({ idempotencyKey: `test/${key}` });
      if (result === false || result?.ok === false) throw new Error(`failed:${channel}`);
      const externalRef = result?.id || null;
      done.set(key, externalRef);
      return { delivered: true, replay: false, externalRef };
    },
  };
}

test('snapshot MP agrega reembolsos parciais e usa a revisão provider-side mais nova', () => {
  const refunds = normalizeMercadoPagoRefundState(99887766, [
    refund(10001, 40_000),
    refund(10002, 60_000),
  ]);
  const snapshot = deriveMercadoPagoFinancialSnapshot(payment({
    status_detail: 'partially_refunded',
    transaction_amount_refunded: 1_000,
  }), refunds);
  assert.equal(snapshot.paymentStatus, 'partially_refunded');
  assert.equal(snapshot.providerEventType, 'payment.partially_refunded');
  assert.equal(snapshot.refundedCents, 100_000);
  assert.equal(snapshot.providerEventCreated, '2026-08-05T15:42:00.000Z');
  assert.match(snapshot.canonicalEventId, /^financial:99887766:[a-f0-9]{24}$/);
  assert.equal(snapshot.providerEventId, snapshot.canonicalEventId);
});

test('cron canônico recupera held parcialmente reembolsado e deduplica todos os efeitos', async () => {
  const durable = durableHarness();
  const refundState = normalizeMercadoPagoRefundState(99887766, [refund(10001, 100_000)]);
  const candidate = payment({
    status_detail: 'partially_refunded',
    transaction_amount_refunded: 1_000,
  });
  const boundReservation = {
    requestId,
    reservationId: requestId,
    slot: 'SLOT#002',
    provider: 'mercadopago',
    providerRef: 'pref_reconcile',
    buyerPk: `BUYER#${'b'.repeat(64)}`,
    offerAmountCents: OFERTA.pixCentavos,
    offerCurrency: 'BRL',
    offerSku: 'prevenda_pix',
    contractVersion: OFERTA.contratoVersao,
    state: 'held',
  };
  const marks = [];
  const channels = { buyer: 0, buyerFinancial: 0, internal: 0, slack: 0 };
  const options = {
    fetchPaymentImpl: async () => candidate,
    fetchChargebackImpl: async () => null,
    fetchRefundStateImpl: async () => refundState,
    verifyBindingImpl: async () => boundReservation,
    processDependencies: {
      runEffect: durable.runEffect,
      withReservationLock: ({ execute }) => execute(),
      markPaid: async (args) => { marks.push(args); return { outcome: 'applied' }; },
      isCurrentRevision: async () => true,
      sendBuyer: async () => { channels.buyer += 1; return { ok: true }; },
      sendFinancialBuyer: async () => { channels.buyerFinancial += 1; return { ok: true }; },
      sendInternal: async () => { channels.internal += 1; return { ok: true }; },
      sendSlack: async () => { channels.slack += 1; return { ok: true }; },
    },
  };

  await reconcileMercadoPagoPaymentById('APP_USR_test', '99887766', options);
  await reconcileMercadoPagoPaymentById('APP_USR_test', '99887766', options);

  assert.equal(marks.length, 1);
  assert.equal(marks[0].paymentStatus, 'partially_refunded');
  assert.equal(marks[0].refundedCents, 100_000);
  assert.deepEqual(channels, { buyer: 0, buyerFinancial: 1, internal: 1, slack: 1 });
});

test('snapshot MP não chama refund pendente ou rejeitado de pagamento aprovado', () => {
  const pendingAmount = 70_000;
  const pending = deriveMercadoPagoFinancialSnapshot(payment(), normalizeMercadoPagoRefundState(
    99887766,
    [refund(10003, pendingAmount, { status: 'pending' })],
  ));
  assert.equal(pending.paymentStatus, 'refund_pending');
  assert.equal(pending.providerEventType, 'payment.refund_pending');
  assert.equal(pending.notificationAmountCents, pendingAmount);
  assert.equal(pending.refundedCents, 0);
  assert.match(pending.statusDetail, /ainda em processamento/);

  const failedAmount = 90_000;
  const failed = deriveMercadoPagoFinancialSnapshot(payment(), normalizeMercadoPagoRefundState(
    99887766,
    [refund(10004, failedAmount, { status: 'rejected' })],
  ));
  assert.equal(failed.paymentStatus, 'refund_failed');
  assert.equal(failed.providerEventType, 'payment.refund_failed');
  assert.equal(failed.notificationAmountCents, failedAmount);
  assert.equal(failed.refundedCents, 0);
  assert.match(failed.statusDetail, /não concluíd/);
});

test('falhas repetidas MP não somam um valor fictício acima da compra', () => {
  const failedState = normalizeMercadoPagoRefundState(99887766, [
    refund(10101, OFERTA.pixCentavos, {
      status: 'rejected', date_last_updated: '2026-08-05T16:00:00.000Z',
    }),
    refund(10102, OFERTA.pixCentavos, {
      status: 'rejected', date_last_updated: '2026-08-05T16:01:00.000Z',
    }),
  ]);
  const snapshot = deriveMercadoPagoFinancialSnapshot(payment(), failedState);
  assert.equal(failedState.failedCents, OFERTA.pixCentavos * 2);
  assert.equal(failedState.latestFailedCents, OFERTA.pixCentavos);
  assert.equal(snapshot.failedRefundCents, OFERTA.pixCentavos);
  assert.equal(snapshot.notificationAmountCents, OFERTA.pixCentavos);
  assert.match(snapshot.statusDetail, /2 tentativas/);
});

test('revisões MP simultâneas usam o id canônico do snapshot como desempate', () => {
  const observedAt = '2026-08-05T16:10:00.000Z';
  const first = deriveMercadoPagoFinancialSnapshot(payment({ transaction_amount_refunded: 400 }), normalizeMercadoPagoRefundState(
    99887766,
    [refund(10201, 40_000, { date_last_updated: observedAt })],
  ));
  const second = deriveMercadoPagoFinancialSnapshot(payment({ transaction_amount_refunded: 800 }),
    normalizeMercadoPagoRefundState(99887766, [
      refund(10201, 40_000, { date_last_updated: observedAt }),
      refund(10202, 40_000, { date_last_updated: observedAt }),
    ]));
  assert.equal(first.providerEventCreated, second.providerEventCreated);
  assert.notEqual(first.providerEventId, second.providerEventId);
});

test('snapshot MP distingue chargeback aberto, perdido e reembolsado ao vendedor', () => {
  const empty = normalizeMercadoPagoRefundState(99887766, []);
  const opened = deriveMercadoPagoFinancialSnapshot(payment({
    status: 'charged_back', status_detail: 'in_process',
  }), empty);
  const settled = deriveMercadoPagoFinancialSnapshot(payment({
    status: 'charged_back', status_detail: 'settled',
  }), empty);
  const reimbursed = deriveMercadoPagoFinancialSnapshot(payment({
    status: 'charged_back', status_detail: 'reimbursed',
  }), empty);
  assert.equal(opened.paymentStatus, 'disputed');
  assert.equal(opened.providerEventType, 'chargeback.opened');
  assert.equal(settled.paymentStatus, 'charged_back');
  assert.equal(settled.providerEventType, 'chargeback.settled');
  assert.equal(reimbursed.paymentStatus, 'approved');
  assert.equal(reimbursed.providerEventType, 'chargeback.reimbursed');
});

test('binding MP exige merchant order e preferência anexada exatas', async () => {
  await assert.doesNotReject(verifyMercadoPagoPaymentBinding(
    'APP_USR_test',
    payment(),
    { requestId, slot: 'SLOT#002', buyerHash: 'b'.repeat(64) },
    {
      getReservationImpl: async () => ({
        reservationId: requestId,
        requestId,
        slot: 'SLOT#002',
        provider: 'mercadopago',
        providerRef: 'pref_growx_123',
        buyerPk: `BUYER#${'b'.repeat(64)}`,
        offerAmountCents: OFERTA.pixCentavos,
        offerCurrency: 'BRL',
        offerSku: 'prevenda_pix',
        contractVersion: OFERTA.contratoVersao,
      }),
      fetchMerchantOrderImpl: async () => ({
        id: 88776655,
        external_reference: 'gx-modulo-prevenda',
        preference_id: 'pref_growx_123',
        payments: [{ id: 99887766 }],
      }),
    },
  ));
  await assert.rejects(verifyMercadoPagoPaymentBinding(
    'APP_USR_test',
    payment(),
    { requestId, slot: 'SLOT#002', buyerHash: 'b'.repeat(64) },
    {
      getReservationImpl: async () => ({
        reservationId: requestId,
        requestId,
        slot: 'SLOT#002',
        provider: 'mercadopago',
        providerRef: 'pref_growx_123',
        buyerPk: `BUYER#${'b'.repeat(64)}`,
        offerAmountCents: OFERTA.pixCentavos,
        offerCurrency: 'BRL',
        offerSku: 'prevenda_pix',
        contractVersion: OFERTA.contratoVersao,
      }),
      fetchMerchantOrderImpl: async () => ({
        id: 88776655,
        external_reference: 'gx-modulo-prevenda',
        preference_id: 'pref_outro',
        payments: [{ id: 99887766 }],
      }),
    },
  ), /payment_preference_binding_mismatch/);
});

test('Orders exige ORD anexada, protocolo explícito, referência UUID e Pix liquidado exatos', async () => {
  const current = orderReservation();
  assert.equal(await verifyMercadoPagoOrderBinding(order(), {
    getReservationImpl: async () => current,
  }), current);
  const canonical = normalizeMercadoPagoOrderCanonical(order(), current);
  assert.equal(canonical.orderId, orderId);
  assert.equal(canonical.paymentId, orderPaymentId);
  assert.equal(canonical.snapshot.paymentStatus, 'approved');
  assert.equal(canonical.snapshot.providerEventType, 'order.processed');

  await assert.rejects(verifyMercadoPagoOrderBinding(order(), {
    getReservationImpl: async () => orderReservation({ providerProtocol: 'mp_checkout_pro_v1' }),
  }), /order_inventory_binding_mismatch/);
  await assert.rejects(verifyMercadoPagoOrderBinding(order(), {
    getReservationImpl: async () => orderReservation({ providerRef: `${orderId}X` }),
  }), /order_inventory_binding_mismatch/);
  await assert.rejects(verifyMercadoPagoOrderBinding(order({
    external_reference: `gx-modulo-prevenda-${requestId.replace('-42d3-', '-12d3-')}`,
  }), {
    getReservationImpl: async () => current,
  }), /invalid_order_external_reference/);
  await assert.rejects(verifyMercadoPagoOrderBinding(order({ total_amount: '1.00' }), {
    getReservationImpl: async () => current,
  }), /invalid_order_amount/);
  await assert.rejects(verifyMercadoPagoOrderBinding(order({
    transactions: {
      payments: [{
        ...order().transactions.payments[0],
        payment_method: { id: 'visa', type: 'credit_card' },
      }],
      chargebacks: [],
    },
  }), {
    getReservationImpl: async () => current,
  }), /invalid_order_payment_method/);
});

test('Order paid converge uma vez no mesmo inventory/outbox com ORD e protocolo versionado', async () => {
  const done = new Map();
  const effects = [];
  const marks = [];
  const buyers = [];
  const counts = { internal: 0, slack: 0 };
  const runEffect = async (args) => {
    const key = `${args.eventId}:${args.channel}`;
    effects.push(args);
    if (done.has(key)) return { delivered: true, replay: true, externalRef: done.get(key) };
    const result = await args.execute({ idempotencyKey: `test/${key}` });
    const externalRef = result?.id || null;
    done.set(key, externalRef);
    return { delivered: true, replay: false, externalRef };
  };
  const dependencies = {
    boundReservation: orderReservation(),
    runEffect,
    markPaid: async (args) => { marks.push(args); return { outcome: 'applied' }; },
    withReservationLock: ({ execute }) => execute(),
    isCurrentRevision: async () => true,
    sendBuyer: async (data) => { buyers.push(data); return { ok: true }; },
    sendInternal: async () => { counts.internal += 1; return { ok: true }; },
    sendSlack: async () => { counts.slack += 1; return { ok: true }; },
  };

  await processMercadoPagoOrder(order(), dependencies);
  await processMercadoPagoOrder(order(), dependencies);
  assert.equal(marks.length, 1);
  assert.equal(marks[0].providerRef, orderId);
  assert.equal(marks[0].providerEventType, 'order.processed');
  assert.equal(buyers.length, 1);
  assert.equal(buyers[0].reservationCode, reservationCode(requestId));
  assert.deepEqual(counts, { internal: 1, slack: 1 });
  assert.ok(effects.every((entry) => entry.providerReference === orderId));
  assert.ok(effects.every((entry) => entry.payload.providerProtocol === 'mp_orders_v1'));
  assert.ok(effects.every((entry) => entry.payload.kind === 'mercadopago_order_financial_v1'));
});

test('Orders deriva refunds e chargebacks somente do objeto canônico e falha fechado em mismatch', () => {
  const offer = {
    amountCents: OFERTA.pixCentavos,
    currency: 'BRL',
    sku: 'prevenda_pix',
    contractVersion: OFERTA.contratoVersao,
  };
  const partialRefund = orderRefund(orderRefundId, 100_000);
  const partialOrder = orderWithFinancialState({
    status: 'processed',
    statusDetail: 'partially_refunded',
    refunds: [partialRefund],
  });
  const refundState = normalizeMercadoPagoOrderRefundState(
    partialOrder,
    partialOrder.transactions.payments[0],
    offer,
  );
  assert.equal(refundState.confirmedCents, 100_000);
  assert.equal(refundState.aggregateReference, orderRefundId);
  const partial = deriveMercadoPagoOrderFinancialSnapshot(partialOrder, offer);
  assert.equal(partial.paymentStatus, 'partially_refunded');
  assert.equal(partial.providerEventType, 'payment.partially_refunded');
  assert.equal(partial.refundedCents, 100_000);

  const fullOrder = orderWithFinancialState({
    status: 'refunded',
    statusDetail: 'refunded',
    refunds: [
      partialRefund,
      orderRefund(orderRefundId2, OFERTA.pixCentavos - 100_000),
    ],
  });
  const full = deriveMercadoPagoOrderFinancialSnapshot(fullOrder, offer);
  assert.equal(full.paymentStatus, 'refunded');
  assert.equal(full.refundedCents, OFERTA.pixCentavos);
  assert.match(full.refundReference, /^agg_[a-f0-9]{32}$/);

  for (const [statusDetail, paymentStatus, eventType] of [
    ['in_process', 'disputed', 'chargeback.opened'],
    ['settled', 'charged_back', 'chargeback.settled'],
    ['reimbursed', 'approved', 'chargeback.reimbursed'],
  ]) {
    const chargebackOrder = orderWithFinancialState({
      status: 'charged_back',
      statusDetail,
      chargeback: {
        id: orderChargebackId,
        transaction_id: orderPaymentId,
        status: statusDetail,
      },
    });
    const snapshot = deriveMercadoPagoOrderFinancialSnapshot(chargebackOrder, offer);
    assert.equal(snapshot.paymentStatus, paymentStatus);
    assert.equal(snapshot.providerEventType, eventType);
  }

  assert.throws(() => deriveMercadoPagoOrderFinancialSnapshot(orderWithFinancialState({
    status: 'refunded',
    statusDetail: 'refunded',
    refunds: [orderRefund(orderRefundId, OFERTA.pixCentavos, {
      transaction_id: `${orderPaymentId}X`,
    })],
  }), offer), /order_refund_payment_mismatch/);
  assert.throws(() => deriveMercadoPagoOrderFinancialSnapshot(orderWithFinancialState({
    status: 'charged_back',
    statusDetail: 'settled',
    chargeback: {
      id: orderChargebackId,
      transaction_id: orderPaymentId,
      status: 'in_process',
    },
  }), offer), /invalid_order_chargeback_state/);
});

test('refund total de Order usa chave idempotente, body vazio e só confirma após refetch ORD', async () => {
  const confirmed = orderWithFinancialState({
    status: 'refunded',
    statusDetail: 'refunded',
    refunds: [orderRefund(orderRefundId, OFERTA.pixCentavos)],
  });
  const calls = [];
  const result = await refundMercadoPagoOrder('APP_USR_test', orderId, {
    idempotencyKey: 'outbox/late-order/refund',
    expectedTotalCents: OFERTA.pixCentavos,
    requestId,
    offer: {
      amountCents: OFERTA.pixCentavos,
      currency: 'BRL',
      sku: 'prevenda_pix',
      contractVersion: OFERTA.contratoVersao,
    },
    fetchImpl: async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/refund')) return { status: 201 };
      return { ok: true, status: 200, json: async () => confirmed };
    },
  });
  assert.equal(result.id, orderRefundId);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `https://api.mercadopago.com/v1/orders/${orderId}/refund`);
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(Object.hasOwn(calls[0].init, 'body'), false);
  assert.match(calls[0].init.headers['X-Idempotency-Key'], /^[a-f0-9]{64}$/);
  assert.equal(calls[1].url, `https://api.mercadopago.com/v1/orders/${orderId}`);
  assert.ok(calls.every(({ url }) => !url.includes('/v1/payments/')));

  calls.length = 0;
  const partialCompletion = orderWithFinancialState({
    status: 'refunded',
    statusDetail: 'refunded',
    refunds: [
      orderRefund(orderRefundId, 100_000),
      orderRefund(orderRefundId2, OFERTA.pixCentavos - 100_000),
    ],
  });
  await refundMercadoPagoOrder('APP_USR_test', orderId, {
    idempotencyKey: 'outbox/late-order/refund-partial-remainder',
    amountCents: OFERTA.pixCentavos - 100_000,
    expectedTotalCents: OFERTA.pixCentavos,
    paymentId: orderPaymentId,
    requestId,
    offer: {
      amountCents: OFERTA.pixCentavos,
      currency: 'BRL',
      sku: 'prevenda_pix',
      contractVersion: OFERTA.contratoVersao,
    },
    fetchImpl: async (url, init = {}) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/refund')) return { status: 201 };
      return { ok: true, status: 200, json: async () => partialCompletion };
    },
  });
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    transactions: [{
      id: orderPaymentId,
      amount: ((OFERTA.pixCentavos - 100_000) / 100).toFixed(2),
    }],
  });
  assert.ok(calls.every(({ url }) => !url.includes('/v1/payments/')));
});

test('compensação tardia Order devolve apenas o restante e converge uma vez pelo outbox', async () => {
  const partial = orderWithFinancialState({
    status: 'processed',
    statusDetail: 'partially_refunded',
    refunds: [orderRefund(orderRefundId, 100_000)],
  });
  const confirmed = orderWithFinancialState({
    status: 'refunded',
    statusDetail: 'refunded',
    refunds: [
      orderRefund(orderRefundId, 100_000),
      orderRefund(orderRefundId2, OFERTA.pixCentavos - 100_000),
    ],
  });
  const durable = durableHarness();
  let refundCalls = 0;
  let requested = null;
  const dependencies = {
    boundReservation: orderReservation(),
    runEffect: durable.runEffect,
    markPaid: async () => { throw new InventoryLatePaymentReassignedError(); },
    withReservationLock: ({ execute }) => execute(),
    getOrder: async () => partial,
    refundOrder: async (id, options) => {
      refundCalls += 1;
      requested = { id, ...options };
      return { ok: true, id: orderRefundId2, order: confirmed };
    },
    sendLateRefundBuyer: async () => ({ ok: true }),
    sendInternal: async () => ({ ok: true }),
    sendSlack: async () => ({ ok: true }),
  };
  const first = await processMercadoPagoOrder(partial, dependencies);
  const replay = await processMercadoPagoOrder(partial, dependencies);
  assert.equal(first.latePaymentRefunded, true);
  assert.equal(replay.latePaymentRefunded, true);
  assert.equal(refundCalls, 1);
  assert.equal(requested.id, orderId);
  assert.equal(requested.paymentId, orderPaymentId);
  assert.equal(requested.amountCents, OFERTA.pixCentavos - 100_000);
  assert.match(first.refundReference, /^agg_[a-f0-9]{32}$/);
});

test('reconcile Orders relê somente /v1/orders/ORD e reutiliza binding/outbox canônicos', async () => {
  const urls = [];
  const done = new Map();
  const result = await reconcileMercadoPagoOrderById('APP_USR_test', orderId, {
    fetchImpl: async (url) => {
      urls.push(String(url));
      return { ok: true, status: 200, json: async () => order() };
    },
    processDependencies: {
      getReservationImpl: async () => orderReservation(),
      runEffect: async (args) => {
        const key = `${args.eventId}:${args.channel}`;
        if (done.has(key)) return { delivered: true, replay: true, externalRef: done.get(key) };
        const value = await args.execute({ idempotencyKey: `test/${key}` });
        done.set(key, value?.id || null);
        return { delivered: true, replay: false, externalRef: value?.id || null };
      },
      markPaid: async () => ({ outcome: 'applied' }),
      withReservationLock: ({ execute }) => execute(),
      isCurrentRevision: async () => true,
      sendBuyer: async () => ({ ok: true }),
      sendInternal: async () => ({ ok: true }),
      sendSlack: async () => ({ ok: true }),
    },
  });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(urls, [`https://api.mercadopago.com/v1/orders/${orderId}`]);
});

test('revisão stale ou já superseded nunca dispara canais de comunicação', async () => {
  for (const mode of ['stale', 'superseded']) {
    const durable = durableHarness();
    const calls = { internal: 0, buyer: 0, slack: 0 };
    const result = await processMercadoPagoPayment(payment(), {
      refundState: normalizeMercadoPagoRefundState(99887766, []),
      runEffect: durable.runEffect,
      markPaid: async () => ({ outcome: mode === 'stale' ? 'stale' : 'applied' }),
      isCurrentRevision: async () => mode !== 'superseded',
      sendInternal: async () => { calls.internal += 1; return { ok: true }; },
      sendBuyer: async () => { calls.buyer += 1; return { ok: true }; },
      sendSlack: async () => { calls.slack += 1; return { ok: true }; },
    });
    assert.match(result.ignored, /stale|superseded/);
    assert.deepEqual(calls, { internal: 0, buyer: 0, slack: 0 });
  }
});

test('webhook MP honra snapshot de hold antigo após preço, SKU e contrato globais mudarem', async () => {
  const oldOffer = {
    amountCents: 235_000,
    currency: 'BRL',
    sku: 'prevenda_pix_lote_zero',
    contractVersion: 'v1-lote-zero',
  };
  const candidate = payment({
    transaction_amount: oldOffer.amountCents / 100,
    currency_id: oldOffer.currency,
    metadata: {
      ...payment().metadata,
      sku: oldOffer.sku,
      contract_version: oldOffer.contractVersion,
    },
  });
  const boundReservation = {
    requestId,
    reservationId: requestId,
    slot: 'SLOT#002',
    provider: 'mercadopago',
    providerRef: 'pref_old_offer',
    buyerPk: `BUYER#${'b'.repeat(64)}`,
    offerAmountCents: oldOffer.amountCents,
    offerCurrency: oldOffer.currency,
    offerSku: oldOffer.sku,
    contractVersion: oldOffer.contractVersion,
  };
  const durable = durableHarness();
  const buyer = [];
  const internal = [];
  let marked = 0;
  const result = await processMercadoPagoPayment(candidate, {
    boundReservation,
    refundState: normalizeMercadoPagoRefundState(candidate.id, [], oldOffer.amountCents),
    runEffect: durable.runEffect,
    markPaid: async () => { marked += 1; return { outcome: 'applied' }; },
    sendBuyer: async (data) => { buyer.push(data); return { ok: true, id: 'buyer-old' }; },
    sendInternal: async (data) => { internal.push(data); return { ok: true, id: 'internal-old' }; },
    sendSlack: async () => ({ ok: true }),
  });

  assert.equal(result.ok, true);
  assert.equal(marked, 1);
  assert.equal(buyer[0].amountCents, oldOffer.amountCents);
  assert.equal(buyer[0].contractVersion, oldOffer.contractVersion);
  assert.equal(internal[0].amountCents, oldOffer.amountCents);
  assert.equal(internal[0].contractVersion, oldOffer.contractVersion);
});

test('compensação tardia completa apenas o restante após refund parcial', async () => {
  const durable = durableHarness();
  const partial = normalizeMercadoPagoRefundState(99887766, [refund(10001, 100_000)]);
  let requested;
  const result = await processMercadoPagoPayment(payment({
    status_detail: 'partially_refunded',
    transaction_amount_refunded: 1_000,
  }), {
    refundState: partial,
    runEffect: durable.runEffect,
    markPaid: async () => { throw new InventoryLatePaymentReassignedError(); },
    getRefundState: async () => partial,
    refundPayment: async (id, options) => {
      requested = { id, ...options };
      return { ok: true, id: '10002', amountCents: 180_000 };
    },
    sendLateRefundBuyer: async () => ({ ok: true }),
    sendInternal: async () => ({ ok: true }),
    sendSlack: async () => ({ ok: true }),
  });
  assert.equal(requested.id, '99887766');
  assert.equal(requested.amountCents, 180_000);
  assert.equal(result.latePaymentRefunded, true);
  assert.match(result.refundReference, /^agg_[a-f0-9]{32}$/);
});

test('refund tardio falho usa nova chave canônica, avisa ops e converge sem refund duplo', async () => {
  const durable = durableHarness();
  const initial = normalizeMercadoPagoRefundState(99887766, []);
  const rejected = refund(11001, OFERTA.pixCentavos, {
    status: 'rejected',
    date_last_updated: '2026-08-05T16:20:00.000Z',
  });
  const approved = refund(11002, OFERTA.pixCentavos, {
    date_last_updated: '2026-08-05T16:21:00.000Z',
  });
  let providerState = initial;
  const refundKeys = [];
  const sequence = [];
  let refundCalls = 0;
  const deps = {
    runEffect: durable.runEffect,
    markPaid: async () => { throw new InventoryLatePaymentReassignedError(); },
    getRefundState: async () => providerState,
    refundPayment: async (id, { idempotencyKey, amountCents }) => {
      assert.equal(id, '99887766');
      assert.equal(amountCents, OFERTA.pixCentavos);
      refundCalls += 1;
      refundKeys.push(idempotencyKey);
      sequence.push(`refund-${refundCalls}`);
      if (refundCalls === 1) {
        providerState = normalizeMercadoPagoRefundState(99887766, [rejected]);
        throw new Error('provider_recorded_failed_refund');
      }
      providerState = normalizeMercadoPagoRefundState(99887766, [rejected, approved]);
      return { ok: true, id: String(approved.id), amountCents: OFERTA.pixCentavos };
    },
    sendInternal: async (data) => {
      if (data.status.includes('REEMBOLSO NÃO CONCLUÍDO')) sequence.push('ops-internal');
      return { ok: true };
    },
    sendSlack: async (data) => {
      if (data.status.includes('REEMBOLSO NÃO CONCLUÍDO')) sequence.push('ops-slack');
      return { ok: true };
    },
    sendLateRefundBuyer: async () => ({ ok: true }),
  };

  await assert.rejects(processMercadoPagoPayment(payment(), {
    ...deps,
    refundState: initial,
  }), /provider_recorded_failed_refund/);

  const recovered = await processMercadoPagoPayment(payment(), {
    ...deps,
    refundState: providerState,
  });
  assert.equal(recovered.latePaymentRefunded, true);
  assert.equal(recovered.refundReference, String(approved.id));
  assert.equal(refundCalls, 2);
  assert.notEqual(refundKeys[0], refundKeys[1]);
  assert.match(refundKeys[0], /refund-attempt:1:[a-f0-9]{24}:late_refund$/);
  assert.match(refundKeys[1], /refund-attempt:2:[a-f0-9]{24}:late_refund$/);
  assert.ok(sequence.indexOf('ops-internal') < sequence.indexOf('refund-2'));
  assert.ok(sequence.indexOf('ops-slack') < sequence.indexOf('refund-2'));

  const confirmed = await processMercadoPagoPayment(payment({
    status: 'refunded',
    status_detail: 'refunded',
    transaction_amount_refunded: OFERTA.pixCentavos / 100,
    date_last_updated: '2026-08-05T16:22:00.000Z',
  }), { ...deps, refundState: providerState });
  assert.equal(confirmed.latePaymentRefunded, true);
  assert.equal(confirmed.refundReference, String(approved.id));
  assert.equal(refundCalls, 2, 'reentrega confirmada não pode criar um terceiro refund');
  assert.equal(providerState.confirmedCents, OFERTA.pixCentavos);
  assert.deepEqual(providerState.approvedIds, [String(approved.id)]);
});

test('compensação tardia limita três falhas e só encerra após alerta operacional durável', async () => {
  const durable = durableHarness();
  const failed = normalizeMercadoPagoRefundState(99887766, [
    refund(12001, OFERTA.pixCentavos, {
      status: 'rejected', date_last_updated: '2026-08-05T16:30:00.000Z',
    }),
    refund(12002, OFERTA.pixCentavos, {
      status: 'failed', date_last_updated: '2026-08-05T16:31:00.000Z',
    }),
    refund(12003, OFERTA.pixCentavos, {
      status: 'canceled', date_last_updated: '2026-08-05T16:32:00.000Z',
    }),
  ]);
  const notifications = [];
  let refunds = 0;
  const result = await processMercadoPagoPayment(payment(), {
    refundState: failed,
    runEffect: durable.runEffect,
    markPaid: async () => { throw new InventoryLatePaymentReassignedError(); },
    getRefundState: async () => { throw new Error('cap_deveria_impedir_refetch_e_post'); },
    refundPayment: async () => { refunds += 1; },
    sendInternal: async (data) => { notifications.push(`internal:${data.status}`); return { ok: true }; },
    sendSlack: async (data) => { notifications.push(`slack:${data.status}`); return { ok: true }; },
  });
  assert.equal(result.latePaymentRefundEscalated, true);
  assert.equal(result.failedAttempts, 3);
  assert.equal(refunds, 0);
  assert.equal(notifications.length, 2);
  assert.ok(notifications.every((entry) => entry.includes('INTERVENÇÃO OBRIGATÓRIA')));
});

test('deadline global de provider falha antes do fetch e maxDuration mantém margem de saída', async () => {
  let fetches = 0;
  await assert.rejects(fetchMercadoPagoRefundState('APP_USR_test', '99887766', {
    deadlineAt: 1_000,
    now: () => 1_000,
    fetchImpl: async () => { fetches += 1; },
  }), /mp_handler_deadline_reached/);
  assert.equal(fetches, 0);
  assert.equal(mpMaxDuration, 60);
  assert.equal(mpConfig.maxDuration, 60);
});

test('tópico chargebacks é assinado pelo resource id e relido antes do Payment', async () => {
  const previousToken = process.env.MP_ACCESS_TOKEN;
  const previousSecret = process.env.MP_WEBHOOK_SECRET;
  const previousFetch = globalThis.fetch;
  const secret = 'webhook-secret';
  const chargebackId = '233000061680860000';
  const deliveryId = randomUUID();
  const timestamp = '1786000000';
  const digest = createHmac('sha256', secret)
    .update(`id:${chargebackId};request-id:${deliveryId};ts:${timestamp};`)
    .digest('hex');
  const urls = [];
  process.env.MP_ACCESS_TOKEN = 'APP_USR_test';
  process.env.MP_WEBHOOK_SECRET = secret;
  globalThis.fetch = async (url) => {
    urls.push(url);
    if (url.includes('/v1/chargebacks/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: chargebackId, payments: [99887766] }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 99887766, external_reference: 'conta-compartilhada-outro-produto' }),
    };
  };
  try {
    const res = responseMock();
    await mpHandler({
      method: 'POST',
      query: { type: 'topic_chargebacks_wh', 'data.id': chargebackId },
      headers: {
        'x-request-id': deliveryId,
        'x-signature': `ts=${timestamp},v1=${digest}`,
      },
      body: {
        type: 'topic_chargebacks_wh',
        data: { id: chargebackId, payment_id: 99887766 },
      },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.ignored, 'outro_produto');
    assert.deepEqual(urls, [
      `https://api.mercadopago.com/v1/chargebacks/${chargebackId}`,
      'https://api.mercadopago.com/v1/payments/99887766',
    ]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
    if (previousSecret === undefined) delete process.env.MP_WEBHOOK_SECRET;
    else process.env.MP_WEBHOOK_SECRET = previousSecret;
  }
});

test('evento MP assinado com Payment ou Chargeback 404 responde 500 para retry do provider', async () => {
  const previousToken = process.env.MP_ACCESS_TOKEN;
  const previousSecret = process.env.MP_WEBHOOK_SECRET;
  const previousFetch = globalThis.fetch;
  const secret = 'webhook-secret-missing-resource';
  process.env.MP_ACCESS_TOKEN = 'APP_USR_test';
  process.env.MP_WEBHOOK_SECRET = secret;
  try {
    for (const current of [
      { id: '99887766', type: 'payment' },
      { id: '233000061680860000', type: 'topic_chargebacks_wh' },
    ]) {
      const deliveryId = randomUUID();
      const timestamp = '1786000100';
      const digest = createHmac('sha256', secret)
        .update(`id:${current.id};request-id:${deliveryId};ts:${timestamp};`)
        .digest('hex');
      let fetches = 0;
      globalThis.fetch = async () => {
        fetches += 1;
        return { ok: false, status: 404 };
      };
      const res = responseMock();
      await mpHandler({
        method: 'POST',
        query: { type: current.type, 'data.id': current.id },
        headers: {
          'x-request-id': deliveryId,
          'x-signature': `ts=${timestamp},v1=${digest}`,
        },
        body: { type: current.type, data: { id: current.id } },
      }, res);
      assert.equal(res.statusCode, 500);
      assert.deepEqual(res.body, { error: 'mp_webhook_processing_failed' });
      assert.equal(fetches, 1);
    }
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
    if (previousSecret === undefined) delete process.env.MP_WEBHOOK_SECRET;
    else process.env.MP_WEBHOOK_SECRET = previousSecret;
  }
});

test('pagamento tardio só reembolsa chargeback quando o valor volta ao vendedor', async () => {
  const empty = normalizeMercadoPagoRefundState(99887766, []);
  const chargebackBase = {
    id: '233000061680860000',
    payments: [99887766],
    currency: 'BRL',
    amount: OFERTA.pixCentavos / 100,
    date_last_updated: '2026-08-05T16:00:00.000Z',
  };

  for (const [coverage, expectedField, expectedRefunds] of [
    [null, 'latePaymentDisputed', 0],
    [false, 'latePaymentReversed', 0],
    [true, 'latePaymentRefunded', 1],
  ]) {
    const durable = durableHarness();
    let refunds = 0;
    const result = await processMercadoPagoPayment(payment({
      status: 'charged_back',
      status_detail: coverage === null ? 'in_process' : (coverage ? 'reimbursed' : 'settled'),
      date_last_updated: '2026-08-05T16:00:00.000Z',
    }), {
      chargeback: { ...chargebackBase, coverage_applied: coverage },
      refundState: empty,
      runEffect: durable.runEffect,
      markPaid: async () => { throw new InventoryLatePaymentReassignedError(); },
      getRefundState: async () => empty,
      refundPayment: async () => {
        refunds += 1;
        return { ok: true, id: '55443322', amountCents: OFERTA.pixCentavos };
      },
      sendLateRefundBuyer: async () => ({ ok: true }),
      sendInternal: async () => ({ ok: true }),
      sendSlack: async () => ({ ok: true }),
    });
    assert.equal(result[expectedField], true);
    assert.equal(refunds, expectedRefunds);
  }
});
