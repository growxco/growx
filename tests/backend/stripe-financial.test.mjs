import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import process from 'node:process';
import test from 'node:test';

import stripeHandler, {
  buildStripeFinancialSnapshot,
  processStripeEvent,
  reconcileStripeCheckoutSession,
  StripeWebhookIntegrityError,
} from '../../api/stripe-webhook.js';
import { sendBuyerFinancialUpdateEmail } from '../../api/_lib/webhook-delivery.js';
import { financialEventCursor } from '../../api/_lib/inventory.js';
import { OFERTA } from '../../src/lib/oferta.js';

const requestId = '123e4567-e89b-42d3-a456-426614174111';
const clone = (value) => JSON.parse(JSON.stringify(value));
const metadata = Object.freeze({
  source: 'growx.com.br/prevenda',
  sku: 'prevenda_cartao',
  contract_version: OFERTA.contratoVersao,
  request_id: requestId,
  slot_id: 'SLOT#011',
  buyer_hash: 'a'.repeat(64),
});

function providerFixture() {
  const session = {
    id: 'cs_test_financial111',
    object: 'checkout.session',
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    amount_total: OFERTA.cartaoCentavos,
    currency: 'brl',
    payment_intent: 'pi_financial111',
    metadata,
    customer_details: {
      email: 'comprador@example.com',
      name: 'Comprador Teste',
      phone: '+5541999999999',
    },
  };
  const paymentIntent = {
    id: 'pi_financial111',
    object: 'payment_intent',
    amount: OFERTA.cartaoCentavos,
    amount_received: OFERTA.cartaoCentavos,
    currency: 'brl',
    status: 'succeeded',
    latest_charge: 'ch_financial111',
    metadata,
  };
  const charge = {
    id: 'ch_financial111',
    object: 'charge',
    amount: OFERTA.cartaoCentavos,
    amount_refunded: 0,
    currency: 'brl',
    paid: true,
    status: 'succeeded',
    created: 1_786_000_000,
    payment_intent: paymentIntent.id,
    metadata,
    billing_details: {
      email: 'comprador@example.com',
      name: 'Comprador Teste',
    },
  };
  return {
    session,
    paymentIntent,
    charge,
    refunds: [],
    disputes: [],
  };
}

function durableHarness() {
  const effects = new Map();
  const calls = new Map();
  return {
    effects,
    calls,
    runEffect: async ({ provider, eventId, channel, payload, execute }) => {
      const key = `${provider}:${eventId}:${channel}`;
      const previous = effects.get(key);
      if (previous) assert.deepEqual(payload, previous.payload, `payload mudou no replay de ${key}`);
      if (previous?.done) {
        return { delivered: true, replay: true, externalRef: previous.externalRef };
      }
      calls.set(channel, (calls.get(channel) || 0) + 1);
      effects.set(key, { payload: clone(payload), done: false, externalRef: null });
      const result = await execute({ idempotencyKey: `test/${key}` });
      if (result === false || result?.ok === false) throw new Error(`delivery_failed:${channel}`);
      const externalRef = typeof result === 'object' ? result.id || null : null;
      effects.set(key, { payload: clone(payload), done: true, externalRef });
      return { delivered: true, replay: false, externalRef };
    },
  };
}

function event(type, object, sequence = 1) {
  return {
    id: `evt_financial${sequence}`,
    object: 'event',
    type,
    created: 1_786_000_000 + sequence,
    data: { object },
  };
}

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function refund(overrides = {}) {
  return {
    id: 're_financial111',
    object: 'refund',
    charge: 'ch_financial111',
    payment_intent: 'pi_financial111',
    amount: 100_000,
    currency: 'brl',
    status: 'succeeded',
    created: 1_786_000_010,
    ...overrides,
  };
}

function dispute(overrides = {}) {
  return {
    id: 'dp_financial111',
    object: 'dispute',
    charge: 'ch_financial111',
    amount: 150_000,
    currency: 'brl',
    status: 'needs_response',
    reason: 'unrecognized',
    created: 1_786_000_020,
    balance_transactions: [],
    ...overrides,
  };
}

function productionHarness(provider = providerFixture()) {
  const durable = durableHarness();
  const calls = {
    mark: [],
    release: [],
    buyer: [],
    buyerFinancial: [],
    internal: [],
    slack: [],
    locks: 0,
  };
  let reservation = {
    requestId,
    slot: metadata.slot_id,
    provider: 'stripe',
    providerRef: provider.session.id,
    buyerPk: `BUYER#${metadata.buyer_hash}`,
    offerAmountCents: OFERTA.cartaoCentavos,
    offerCurrency: 'BRL',
    offerSku: metadata.sku,
    contractVersion: metadata.contract_version,
    state: 'held',
    paymentStatus: null,
    providerEventId: null,
    providerEventCursor: null,
    refundedCents: null,
    disputedCents: null,
    chargedBackCents: null,
  };
  let failInternal = false;
  const deps = {
    enforceProviderBinding: true,
    runEffect: durable.runEffect,
    withReservationLock: async ({ provider: lockProvider, reservationKey, execute }) => {
      assert.equal(lockProvider, 'stripe');
      assert.equal(reservationKey, requestId);
      calls.locks += 1;
      return execute();
    },
    getReservation: async () => clone(reservation),
    fetchPaymentIntent: async (id) => {
      assert.equal(id, provider.paymentIntent.id);
      return provider.paymentIntent;
    },
    fetchCharge: async (id) => {
      assert.equal(id, provider.charge.id);
      return provider.charge;
    },
    fetchSessionForPaymentIntent: async (id) => {
      assert.equal(id, provider.paymentIntent.id);
      return provider.session;
    },
    listRefunds: async (id) => {
      assert.equal(id, provider.charge.id);
      return provider.refunds;
    },
    listDisputes: async (id) => {
      assert.equal(id, provider.charge.id);
      return provider.disputes;
    },
    markPaid: async (args) => {
      calls.mark.push(clone(args));
      const providerEventCursor = financialEventCursor(args).cursor;
      reservation = {
        ...reservation,
        state: 'paid',
        paymentStatus: args.paymentStatus,
        providerEventId: args.providerEventId,
        providerEventType: args.providerEventType,
        providerEventCursor,
        refundedCents: args.refundedCents,
        disputedCents: args.disputedCents,
        chargedBackCents: args.chargedBackCents,
      };
      return { outcome: 'applied' };
    },
    release: async (args) => {
      calls.release.push(clone(args));
      if (reservation.state !== 'held') return false;
      reservation = { ...reservation, state: 'released' };
      return true;
    },
    sendBuyer: async (data, options) => {
      calls.buyer.push({ data: clone(data), options });
      return { ok: true, id: 'email_buyer' };
    },
    sendBuyerFinancial: async (data, options) => {
      calls.buyerFinancial.push({ data: clone(data), options });
      return { ok: true, id: 'email_financial' };
    },
    sendInternal: async (data, options) => {
      calls.internal.push({ data: clone(data), options });
      return failInternal ? { ok: false } : { ok: true, id: 'email_internal' };
    },
    sendSlack: async (data) => {
      calls.slack.push(clone(data));
      return { ok: true };
    },
  };
  return {
    provider,
    durable,
    calls,
    deps,
    get reservation() { return reservation; },
    set reservation(next) { reservation = next; },
    setFailInternal(value) { failInternal = value; },
  };
}

test('produção prova Session -> PaymentIntent -> Charge e provider_ref anexado antes de aplicar', async () => {
  const harness = productionHarness();
  const result = await processStripeEvent(event(
    'checkout.session.completed',
    harness.provider.session,
    1,
  ), harness.deps);

  assert.equal(result.ok, true);
  assert.equal(harness.calls.locks, 1);
  assert.equal(harness.calls.mark.length, 1);
  assert.equal(harness.calls.mark[0].providerEventId, 'evt_financial1');
  assert.equal(harness.calls.mark[0].providerEventCreated, 1_786_000_001);
  assert.equal(harness.calls.mark[0].providerEventType, 'checkout.session.completed');
  assert.equal(harness.calls.mark[0].providerRef, harness.provider.session.id);
  assert.deepEqual({
    refundedCents: harness.calls.mark[0].refundedCents,
    disputedCents: harness.calls.mark[0].disputedCents,
    chargedBackCents: harness.calls.mark[0].chargedBackCents,
  }, { refundedCents: 0, disputedCents: 0, chargedBackCents: 0 });
  assert.equal(harness.calls.buyer.length, 1);
});

test('cron canônico recupera held já integralmente reembolsado e usa o mesmo outbox uma vez', async () => {
  const provider = providerFixture();
  provider.session.created = 1_786_000_000;
  provider.refunds = [refund({ amount: OFERTA.cartaoCentavos })];
  provider.charge.amount_refunded = OFERTA.cartaoCentavos;
  const harness = productionHarness(provider);

  const first = await reconcileStripeCheckoutSession(provider.session, harness.deps);
  const replay = await reconcileStripeCheckoutSession(provider.session, harness.deps);

  assert.equal(first.ok, true);
  assert.equal(replay.ok, true);
  assert.equal(harness.reservation.state, 'paid');
  assert.equal(harness.reservation.paymentStatus, 'refunded');
  assert.equal(harness.reservation.refundedCents, OFERTA.cartaoCentavos);
  assert.equal(harness.calls.mark.length, 1);
  assert.equal(harness.calls.buyer.length, 0);
  assert.equal(harness.calls.buyerFinancial.length, 1);
  assert.equal(harness.calls.internal.length, 1);
  assert.equal(harness.calls.slack.length, 1);
});

test('webhook Stripe honra snapshot de hold antigo após preço, SKU e contrato globais mudarem', async () => {
  const oldOffer = {
    amountCents: 245_000,
    currency: 'brl',
    sku: 'prevenda_cartao_lote_zero',
    contractVersion: 'v1-lote-zero',
  };
  const provider = providerFixture();
  const oldMetadata = {
    ...metadata,
    sku: oldOffer.sku,
    contract_version: oldOffer.contractVersion,
  };
  provider.session = {
    ...provider.session,
    amount_total: oldOffer.amountCents,
    currency: oldOffer.currency,
    metadata: oldMetadata,
  };
  provider.paymentIntent = {
    ...provider.paymentIntent,
    amount: oldOffer.amountCents,
    amount_received: oldOffer.amountCents,
    currency: oldOffer.currency,
    metadata: oldMetadata,
  };
  provider.charge = {
    ...provider.charge,
    amount: oldOffer.amountCents,
    currency: oldOffer.currency,
    metadata: oldMetadata,
  };
  const harness = productionHarness(provider);
  harness.reservation = {
    ...harness.reservation,
    offerAmountCents: oldOffer.amountCents,
    offerCurrency: oldOffer.currency.toUpperCase(),
    offerSku: oldOffer.sku,
    contractVersion: oldOffer.contractVersion,
  };

  const result = await processStripeEvent(event(
    'checkout.session.completed',
    provider.session,
    4,
  ), harness.deps);

  assert.equal(result.ok, true);
  assert.equal(harness.calls.mark.length, 1);
  assert.equal(harness.calls.buyer[0].data.amountCents, oldOffer.amountCents);
  assert.equal(harness.calls.buyer[0].data.contractVersion, oldOffer.contractVersion);
  assert.equal(harness.calls.internal[0].data.amountCents, oldOffer.amountCents);
  assert.equal(harness.calls.internal[0].data.contractVersion, oldOffer.contractVersion);
});

test('binding recusa reserva cujo provider_ref não é a Checkout Session autenticada', async () => {
  const harness = productionHarness();
  harness.reservation = { ...harness.reservation, providerRef: 'cs_test_outro' };
  await assert.rejects(
    processStripeEvent(event('checkout.session.completed', harness.provider.session, 2), harness.deps),
    (error) => error instanceof StripeWebhookIntegrityError
      && error.code === 'stripe_inventory_binding_mismatch',
  );
  assert.equal(harness.durable.effects.size, 0);
});

test('metadata legado sem request_id/slot_id/buyer_hash não entra no inventário', async () => {
  const harness = productionHarness();
  const legacy = {
    ...harness.provider.session,
    metadata: {
      source: metadata.source,
      sku: metadata.sku,
      reservation_id: requestId,
      slot: metadata.slot_id,
    },
  };
  await assert.rejects(
    processStripeEvent(event('checkout.session.completed', legacy, 3), harness.deps),
    (error) => error instanceof StripeWebhookIntegrityError
      && error.code === 'invalid_reservation_id',
  );
  assert.equal(harness.durable.effects.size, 0);
});

test('refund.created e charge.refunded do mesmo estado compartilham uma revisão e um envio', async () => {
  const harness = productionHarness();
  const currentRefund = refund();
  harness.provider.refunds = [currentRefund];
  harness.provider.charge.amount_refunded = currentRefund.amount;

  await processStripeEvent(event('refund.created', currentRefund, 10), harness.deps);
  await processStripeEvent(event('charge.refunded', harness.provider.charge, 11), harness.deps);

  assert.equal(harness.calls.mark.length, 1);
  assert.equal(harness.calls.mark[0].paymentStatus, 'partially_refunded');
  assert.equal(harness.calls.mark[0].refundedCents, currentRefund.amount);
  assert.equal(harness.calls.internal.length, 1);
  assert.equal(harness.calls.slack.length, 1);
  assert.equal(harness.calls.buyerFinancial.length, 1);
  assert.equal(harness.calls.buyerFinancial[0].data.statusCode, 'partially_refunded');
  assert.equal(harness.durable.calls.get('inventory'), 1);
  const revisionIds = new Set([...harness.durable.effects.keys()]
    .filter((key) => !key.endsWith(':buyer_financial'))
    .map((key) => key.split(':').slice(1, -1).join(':')));
  assert.equal(revisionIds.size, 1);
});

test('duas revisões Stripe no mesmo segundo usam event.id e não colidem no cursor', async () => {
  const harness = productionHarness();
  const first = refund({ id: 're_same_second_a', amount: 50_000, created: 1_786_000_070 });
  harness.provider.refunds = [first];
  harness.provider.charge.amount_refunded = 50_000;
  const firstEvent = {
    ...event('refund.updated', first, 70),
    id: 'evt_sameSecondA',
    created: 1_786_000_070,
  };
  await processStripeEvent(firstEvent, harness.deps);

  const second = refund({ id: 're_same_second_b', amount: 50_000, created: 1_786_000_070 });
  harness.provider.refunds = [first, second];
  harness.provider.charge.amount_refunded = 100_000;
  const secondEvent = {
    ...event('refund.updated', second, 71),
    id: 'evt_sameSecondZ',
    created: firstEvent.created,
  };
  await processStripeEvent(secondEvent, harness.deps);

  assert.deepEqual(harness.calls.mark.map((call) => call.providerEventId), [
    firstEvent.id,
    secondEvent.id,
  ]);
  assert.notEqual(
    financialEventCursor(harness.calls.mark[0]).cursor,
    financialEventCursor(harness.calls.mark[1]).cursor,
  );
  assert.equal(harness.reservation.refundedCents, 100_000);
});

test('snapshot agrega estados de refund e preserva linguagem financeira correta', () => {
  const provider = providerFixture();
  const cases = [
    [[refund({ status: 'pending' })], 0, 'refund_pending'],
    [[refund({ amount: OFERTA.cartaoCentavos })], OFERTA.cartaoCentavos, 'refunded'],
    [[refund()], 100_000, 'partially_refunded'],
    [[refund({ status: 'failed', failure_reason: 'declined' })], 0, 'refund_failed'],
  ];
  for (const [refunds, amountRefunded, expected] of cases) {
    provider.charge.amount_refunded = amountRefunded;
    const snapshot = buildStripeFinancialSnapshot({ charge: provider.charge, refunds });
    assert.equal(snapshot.paymentStatus, expected);
  }

  const full = refund({ amount: OFERTA.cartaoCentavos });
  provider.charge.amount_refunded = OFERTA.cartaoCentavos;
  const fullyRefundedThenLost = buildStripeFinancialSnapshot({
    charge: provider.charge,
    refunds: [full],
    disputes: [dispute({ status: 'lost', balance_transactions: [] })],
  });
  assert.equal(fullyRefundedThenLost.disputeTotals.chargedBackCents, 0);
  assert.equal(fullyRefundedThenLost.paymentStatus, 'refunded');

  provider.charge.amount_refunded = 0;
  const repeatedFailures = buildStripeFinancialSnapshot({
    charge: provider.charge,
    refunds: [
      refund({ id: 're_failed_a', status: 'failed', amount: OFERTA.cartaoCentavos, created: 1_786_000_060 }),
      refund({ id: 're_failed_b', status: 'failed', amount: OFERTA.cartaoCentavos, created: 1_786_000_061 }),
    ],
  });
  assert.equal(repeatedFailures.refundTotals.failedCents, OFERTA.cartaoCentavos * 2);
  assert.equal(repeatedFailures.refundTotals.latestFailedCents, OFERTA.cartaoCentavos);
});

test('aviso de refund falho usa só a última tentativa, não uma soma acima da compra', async () => {
  const harness = productionHarness();
  const failures = [
    refund({ id: 're_failed_notify_a', status: 'failed', amount: OFERTA.cartaoCentavos, created: 1_786_000_080 }),
    refund({ id: 're_failed_notify_b', status: 'failed', amount: OFERTA.cartaoCentavos, created: 1_786_000_081 }),
  ];
  harness.provider.refunds = failures;
  harness.provider.charge.amount_refunded = 0;
  await processStripeEvent(event('refund.updated', failures[1], 81), harness.deps);
  const notice = harness.calls.buyerFinancial[0].data;
  assert.equal(notice.amountCents, OFERTA.cartaoCentavos);
  assert.match(notice.statusDetail, /2 tentativas/);
});

test('dispute created/updated/funds e warning_closed compõem dimensões sem liberar capacidade', async () => {
  const harness = productionHarness();
  const withdrawal = {
    id: 'txn_withdraw111',
    object: 'balance_transaction',
    amount: -150_000,
    net: -150_000,
    currency: 'brl',
    reporting_category: 'dispute',
    created: 1_786_000_021,
  };
  const open = dispute({ balance_transactions: [withdrawal] });
  harness.provider.disputes = [open];

  for (const [type, sequence] of [
    ['charge.dispute.created', 20],
    ['charge.dispute.updated', 21],
    ['charge.dispute.funds_withdrawn', 22],
  ]) {
    await processStripeEvent(event(type, open, sequence), harness.deps);
  }
  assert.equal(harness.calls.mark.length, 1);
  assert.equal(harness.calls.mark[0].paymentStatus, 'disputed');
  assert.equal(harness.calls.mark[0].disputedCents, 150_000);
  assert.equal(harness.reservation.state, 'paid');

  const reinstatement = {
    id: 'txn_reinstate111',
    object: 'balance_transaction',
    amount: 150_000,
    net: 150_000,
    currency: 'brl',
    reporting_category: 'dispute_reversal',
    created: 1_786_000_030,
  };
  const warningClosed = dispute({
    status: 'warning_closed',
    balance_transactions: [withdrawal, reinstatement],
  });
  harness.provider.disputes = [warningClosed];
  await processStripeEvent(event('charge.dispute.funds_reinstated', warningClosed, 30), harness.deps);
  assert.equal(harness.calls.mark.at(-1).paymentStatus, 'paid');
  assert.equal(harness.calls.mark.at(-1).providerEventType, 'charge.dispute.funds_reinstated');

  const lost = dispute({ status: 'lost', balance_transactions: [withdrawal] });
  harness.provider.disputes = [lost];
  await processStripeEvent(event('charge.dispute.closed', lost, 31), harness.deps);
  assert.equal(harness.calls.mark.at(-1).paymentStatus, 'charged_back');
  assert.equal(harness.calls.mark.at(-1).chargedBackCents, 150_000);
  assert.equal(harness.reservation.state, 'paid');
  assert.equal(harness.calls.buyerFinancial.length, 2);
  assert.deepEqual(harness.calls.buyerFinancial.map(({ data }) => data.statusCode), [
    'disputed',
    'charged_back',
  ]);
});

test('stale persistido no canal inventory suprime todos os canais de notificação', async () => {
  const harness = productionHarness();
  harness.deps.markPaid = async () => ({ outcome: 'stale' });
  const result = await processStripeEvent(event(
    'checkout.session.completed',
    harness.provider.session,
    40,
  ), harness.deps);
  assert.equal(result.ignored, 'stale_financial_revision');
  assert.equal(harness.calls.internal.length, 0);
  assert.equal(harness.calls.slack.length, 0);
  assert.equal(harness.calls.buyer.length, 0);
});

test('retry da revisão A não envia aviso velho depois que B já está persistida', async () => {
  const harness = productionHarness();
  const partial = refund({ id: 're_partial111', amount: 100_000, status: 'succeeded' });
  harness.provider.refunds = [partial];
  harness.provider.charge.amount_refunded = partial.amount;
  harness.setFailInternal(true);
  const eventA = event('refund.updated', partial, 50);
  await assert.rejects(processStripeEvent(eventA, harness.deps), /delivery_failed:internal_email/);

  const full = refund({ id: 're_full111', amount: 200_000, status: 'succeeded', created: 1_786_000_051 });
  harness.provider.refunds = [partial, full];
  harness.provider.charge.amount_refunded = OFERTA.cartaoCentavos;
  harness.setFailInternal(false);
  await processStripeEvent(event('refund.updated', full, 51), harness.deps);
  const revisionCursorB = harness.reservation.providerEventCursor;

  // Simula uma leitura do provedor atrasada no retry A. O outbox de inventory
  // de A já está done/applied, mas a leitura forte local aponta para B.
  harness.provider.refunds = [partial];
  harness.provider.charge.amount_refunded = partial.amount;
  const retry = await processStripeEvent(eventA, harness.deps);
  assert.equal(retry.ignored, 'superseded_financial_revision');
  assert.equal(harness.reservation.providerEventCursor, revisionCursorB);
  assert.equal(harness.calls.mark.length, 2);
  assert.equal(harness.calls.internal.length, 2, 'retry A não pode tentar o internal antigo novamente');
});

test('async_payment_failed e expired serializam e só liberam hold próprio não pago', async () => {
  const harness = productionHarness();
  const failed = {
    ...harness.provider.session,
    status: 'complete',
    payment_status: 'unpaid',
  };
  const first = await processStripeEvent(event('checkout.session.async_payment_failed', failed, 60), harness.deps);
  assert.equal(first.released, true);
  assert.equal(harness.calls.release.length, 1);
  assert.equal(harness.calls.release[0].providerRef, harness.provider.session.id);

  const expired = { ...failed, status: 'expired' };
  const second = await processStripeEvent(event('checkout.session.expired', expired, 61), harness.deps);
  assert.equal(second.ignored, 'reservation_not_released');
  assert.equal(harness.calls.release.length, 2);
  assert.equal(harness.reservation.state, 'released');
  assert.equal(harness.calls.locks, 2);
});

test('e-mail financeiro usa idempotency key e não chama pending/failed de concluído', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_financial';
  try {
    for (const statusCode of [
      'refund_pending',
      'refunded',
      'partially_refunded',
      'refund_failed',
      'disputed',
      'charged_back',
    ]) {
      let request;
      const result = await sendBuyerFinancialUpdateEmail({
        email: 'comprador@example.com',
        provider: 'stripe',
        statusCode,
        status: statusCode,
        statusDetail: 'Detalhe financeiro sem PII',
        amountCents: 100_000,
        reference: 'ch_financial111',
      }, {
        idempotencyKey: `financial/${statusCode}`,
        fetchImpl: async (url, options) => {
          request = { url, options };
          return { ok: true, status: 200, json: async () => ({ id: `email_${statusCode}` }) };
        },
      });
      assert.equal(result.ok, true);
      assert.equal(request.options.headers['Idempotency-Key'], `financial/${statusCode}`);
      const body = JSON.parse(request.options.body);
      assert.match(body.html, /Detalhe financeiro sem PII/);
      if (['refund_pending', 'refund_failed'].includes(statusCode)) {
        assert.doesNotMatch(body.html, /O provedor concluiu seu reembolso/);
      }
    }
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  }
});

test('evento assinado que retorna 404 no refetch responde 500 para a Stripe tentar novamente', async () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const previousFetch = globalThis.fetch;
  const webhookSecret = 'whsec_test_missing_event';
  const timestamp = Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify({ id: 'evt_missing404' });
  const signature = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`).digest('hex');
  process.env.STRIPE_SECRET_KEY = 'sk_test_missing_event';
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  try {
    const response = responseMock();
    await stripeHandler({
      method: 'POST',
      body: rawBody,
      headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
    }, response);
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, { error: 'stripe_webhook_processing_failed' });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
  }
});
