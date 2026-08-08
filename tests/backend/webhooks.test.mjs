import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import process from 'node:process';
import test from 'node:test';

import mpHandler, {
  findMercadoPagoFullRefund,
  MercadoPagoWebhookIntegrityError,
  normalizeMercadoPagoRefundState,
  processMercadoPagoPayment,
  refundMercadoPagoPayment,
  verifyMercadoPagoSignature,
} from '../../api/mp-webhook.js';
import stripeHandler, {
  processStripeEvent,
  StripeWebhookIntegrityError,
  verifyStripeSignature,
} from '../../api/stripe-webhook.js';
import { OFERTA } from '../../src/lib/oferta.js';
import { InventoryLatePaymentReassignedError } from '../../api/_lib/inventory.js';

const reservationId = '123e4567-e89b-42d3-a456-426614174000';

function responseMock() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function durableHarness() {
  const done = new Map();
  const calls = new Map();
  return {
    calls,
    runEffect: async ({ provider, eventId, channel, execute }) => {
      const key = `${provider}:${eventId}:${channel}`;
      if (done.has(key)) return { delivered: true, replay: true, externalRef: done.get(key) };
      calls.set(channel, (calls.get(channel) || 0) + 1);
      const result = await execute({ idempotencyKey: `test/${key}` });
      if (result === false || result?.ok === false) throw new Error(`delivery_failed:${channel}`);
      const externalRef = typeof result === 'object' ? result?.id || null : null;
      done.set(key, externalRef);
      return { delivered: true, replay: false, externalRef };
    },
  };
}

function stripeSession(overrides = {}) {
  return {
    id: 'evt_checkout123',
    object: 'event',
    type: 'checkout.session.completed',
    created: 1_786_000_000,
    data: {
      object: {
        id: 'cs_test_checkout123',
        object: 'checkout.session',
        mode: 'payment',
        status: 'complete',
        payment_status: 'paid',
        amount_total: OFERTA.cartaoCentavos,
        currency: 'brl',
        metadata: {
          source: 'growx.com.br/prevenda',
          sku: 'prevenda_cartao',
          request_id: reservationId,
          slot_id: 'SLOT#001',
          buyer_hash: 'a'.repeat(64),
        },
        customer_details: {
          email: 'pessoa@example.com',
          name: 'Pessoa Teste',
          phone: '+5541999999999',
        },
        ...overrides,
      },
    },
  };
}

function mpPayment(overrides = {}) {
  return {
    id: 99887766,
    status: 'approved',
    external_reference: 'gx-modulo-prevenda',
    transaction_amount: OFERTA.pixCentavos / 100,
    currency_id: 'BRL',
    payment_method_id: 'pix',
    payment_type_id: 'bank_transfer',
    date_last_updated: '2026-08-05T15:00:00.000Z',
    date_created: '2026-08-05T14:30:00.000Z',
    metadata: {
      source: 'growx.com.br/prevenda',
      sku: 'prevenda_pix',
      request_id: reservationId,
      slot_id: 'SLOT#002',
      buyer_hash: 'b'.repeat(64),
    },
    payer: {
      email: 'pessoa@example.com',
      first_name: 'Pessoa',
      last_name: 'Teste',
      identification: { type: 'CPF', number: '52998224725' },
    },
    ...overrides,
  };
}

function mpRefundState(overrides = {}) {
  return {
    refunds: [],
    confirmedCents: 0,
    pendingCents: 0,
    failedCents: 0,
    latestFailedCents: 0,
    failedCount: 0,
    approvedIds: [],
    aggregateReference: null,
    digest: '0'.repeat(64),
    latestUpdatedAt: null,
    ...overrides,
  };
}

test('replay Stripe retoma só o notify pendente sem duplicar inventário ou e-mail', async () => {
  const durable = durableHarness();
  let inventoryCalls = 0;
  let buyerCalls = 0;
  let internalCalls = 0;
  const deps = {
    runEffect: durable.runEffect,
    markPaid: async () => { inventoryCalls += 1; return true; },
    sendBuyer: async () => { buyerCalls += 1; return { ok: true, id: 'email_buyer' }; },
    sendInternal: async () => {
      internalCalls += 1;
      return { ok: internalCalls > 1, id: internalCalls > 1 ? 'email_internal' : null };
    },
    sendSlack: async () => ({ ok: true }),
  };

  await assert.rejects(processStripeEvent(stripeSession(), deps), /internal_email/);
  await processStripeEvent(stripeSession(), deps);

  assert.equal(inventoryCalls, 1);
  assert.equal(buyerCalls, 1);
  assert.equal(internalCalls, 2);
  assert.equal(durable.calls.get('inventory'), 1);
  assert.equal(durable.calls.get('buyer_email'), 1);
  assert.equal(durable.calls.get('internal_email'), 2);
});

test('Stripe rejeita valor e moeda divergentes antes de qualquer efeito', async () => {
  let effects = 0;
  const deps = { runEffect: async () => { effects += 1; } };
  await assert.rejects(
    processStripeEvent(stripeSession({ amount_total: OFERTA.cartaoCentavos - 1 }), deps),
    (error) => error instanceof StripeWebhookIntegrityError && error.code === 'invalid_payment_amount',
  );
  await assert.rejects(
    processStripeEvent(stripeSession({ currency: 'usd' }), deps),
    (error) => error instanceof StripeWebhookIntegrityError && error.code === 'invalid_payment_currency',
  );
  assert.equal(effects, 0);
});

test('Stripe responde 500 para evento próprio com dinheiro divergente', async () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const previousFetch = globalThis.fetch;
  const webhookSecret = 'whsec_test_webhook';
  const timestamp = Math.floor(Date.now() / 1000);
  const rawBody = JSON.stringify({ id: 'evt_checkout123' });
  const signature = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${rawBody}`).digest('hex');
  process.env.STRIPE_SECRET_KEY = 'sk_test_webhook';
  process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => stripeSession({ amount_total: OFERTA.cartaoCentavos - 1 }),
  });
  try {
    const res = responseMock();
    await stripeHandler({
      method: 'POST',
      body: rawBody,
      headers: { 'stripe-signature': `t=${timestamp},v1=${signature}` },
    }, res);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: 'stripe_event_integrity_failed' });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
  }
});

test('Stripe-Signature inválida é rejeitada antes de consumir quota da API', async () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const previousFetch = globalThis.fetch;
  let fetchCalls = 0;
  process.env.STRIPE_SECRET_KEY = 'sk_test_webhook';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook';
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error('não deveria buscar'); };
  try {
    const rawBody = JSON.stringify({ id: 'evt_checkout123' });
    const res = responseMock();
    await stripeHandler({
      method: 'POST',
      body: rawBody,
      headers: { 'stripe-signature': 't=1786000000,v1=00' },
    }, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'invalid_signature' });
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhookSecret;
  }
});

test('verificação Stripe inclui corpo bruto e janela antirreplay', () => {
  const secret = 'whsec_test_webhook';
  const rawBody = JSON.stringify({ id: 'evt_checkout123', whitespace: 'preservado' });
  const timestamp = 1_786_000_000;
  const digest = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  assert.equal(verifyStripeSignature({
    rawBody,
    signature: `t=${timestamp},v1=${digest}`,
    secret,
    nowSeconds: timestamp + 60,
  }), true);
  assert.equal(verifyStripeSignature({
    rawBody: `${rawBody} `,
    signature: `t=${timestamp},v1=${digest}`,
    secret,
    nowSeconds: timestamp + 60,
  }), false);
  assert.equal(verifyStripeSignature({
    rawBody,
    signature: `t=${timestamp},v1=${digest}`,
    secret,
    nowSeconds: timestamp + 301,
  }), false);
});

test('Stripe dispute usa a Charge autenticada para metadata, valor e inventário', async () => {
  const durable = durableHarness();
  let transition;
  const charge = {
    id: 'ch_testdispute123',
    object: 'charge',
    amount: OFERTA.cartaoCentavos,
    currency: 'brl',
    paid: true,
    status: 'succeeded',
    metadata: {
      source: 'growx.com.br/prevenda',
      sku: 'prevenda_cartao',
      request_id: reservationId,
      slot_id: 'SLOT#003',
      buyer_hash: 'c'.repeat(64),
    },
    billing_details: { email: 'pessoa@example.com' },
  };
  const event = {
    id: 'evt_dispute123',
    object: 'event',
    type: 'charge.dispute.created',
    created: 1_786_000_000,
    data: { object: {
      id: 'dp_testdispute123',
      object: 'dispute',
      charge: charge.id,
      amount: 150000,
      currency: 'brl',
      metadata: { source: 'forjado-no-dispute' },
    } },
  };

  await processStripeEvent(event, {
    runEffect: durable.runEffect,
    fetchCharge: async (id) => { assert.equal(id, charge.id); return charge; },
    markPaid: async (args) => { transition = args; return true; },
    sendInternal: async () => ({ ok: true }),
    sendSlack: async () => ({ ok: true }),
  });
  assert.deepEqual(transition, {
    requestId: reservationId,
    slot: 'SLOT#003',
    provider: 'stripe',
    providerRef: 'dp_testdispute123',
    paymentStatus: 'disputed',
    providerEventId: 'evt_dispute123',
    providerEventCreated: 1_786_000_000,
    providerEventType: 'charge.dispute.created',
  });
});

test('Stripe preserva reembolso parcial ao resolver disputa fechada won/lost', async () => {
  const charge = {
    id: 'ch_teststates123',
    object: 'charge',
    amount: OFERTA.cartaoCentavos,
    amount_refunded: 100000,
    currency: 'brl',
    paid: true,
    status: 'succeeded',
    metadata: {
      source: 'growx.com.br/prevenda',
      sku: 'prevenda_cartao',
      request_id: reservationId,
      slot_id: 'SLOT#004',
      buyer_hash: 'd'.repeat(64),
    },
    billing_details: { email: 'pessoa@example.com' },
  };
  const statuses = [];
  const depsFor = (eventId) => {
    const durable = durableHarness();
    return {
      runEffect: durable.runEffect,
      fetchCharge: async () => charge,
      markPaid: async (args) => { statuses.push([eventId, args.paymentStatus]); return true; },
      sendInternal: async () => ({ ok: true }),
      sendSlack: async () => ({ ok: true }),
    };
  };
  await processStripeEvent({
    id: 'evt_partialrefund123',
    object: 'event',
    type: 'charge.refunded',
    created: 1_786_000_000,
    data: { object: charge },
  }, depsFor('partial'));

  for (const status of ['won', 'lost']) {
    await processStripeEvent({
      id: `evt_disputeclosed${status}123`,
      object: 'event',
      type: 'charge.dispute.closed',
      created: 1_786_000_000,
      data: { object: {
        id: `dp_closed${status}123`,
        object: 'dispute',
        charge: charge.id,
        amount: OFERTA.cartaoCentavos,
        currency: 'brl',
        status,
      } },
    }, depsFor(status));
  }
  assert.deepEqual(statuses, [
    ['partial', 'partially_refunded'],
    // A disputa vencida não desfaz um reembolso parcial já confirmado.
    ['won', 'partially_refunded'],
    ['lost', 'charged_back'],
  ]);
});

test('pagamento sem e-mail escritura inventário e notifica internamente sem retry infinito', async () => {
  const stripeDurable = durableHarness();
  const stripeCalls = { inventory: 0, buyer: 0, internal: 0 };
  const stripeEvent = stripeSession({
    customer_email: null,
    customer_details: { email: null, name: 'Pessoa Sem Email' },
  });
  await processStripeEvent(stripeEvent, {
    runEffect: stripeDurable.runEffect,
    markPaid: async () => { stripeCalls.inventory += 1; return true; },
    sendBuyer: async () => { stripeCalls.buyer += 1; return { ok: true }; },
    sendInternal: async () => { stripeCalls.internal += 1; return { ok: true }; },
    sendSlack: async () => ({ ok: true }),
  });

  const mpDurable = durableHarness();
  const mpCalls = { inventory: 0, buyer: 0, internal: 0 };
  await processMercadoPagoPayment(mpPayment({ payer: { first_name: 'Pessoa', last_name: 'Sem Email' } }), {
    runEffect: mpDurable.runEffect,
    markPaid: async () => { mpCalls.inventory += 1; return true; },
    sendBuyer: async () => { mpCalls.buyer += 1; return { ok: true }; },
    sendInternal: async () => { mpCalls.internal += 1; return { ok: true }; },
    sendSlack: async () => ({ ok: true }),
  });
  assert.deepEqual(stripeCalls, { inventory: 1, buyer: 0, internal: 1 });
  assert.deepEqual(mpCalls, { inventory: 1, buyer: 0, internal: 1 });
});

test('no-op idempotente false em inventário/release conclui o canal sem 500', async () => {
  const stripePaid = durableHarness();
  await assert.doesNotReject(processStripeEvent(stripeSession(), {
    runEffect: stripePaid.runEffect,
    markPaid: async () => false,
    sendBuyer: async () => ({ ok: true }),
    sendInternal: async () => ({ ok: true }),
    sendSlack: async () => ({ ok: true }),
  }));

  const stripeExpired = durableHarness();
  const expiredEvent = stripeSession({
    status: 'expired',
    payment_status: 'unpaid',
  });
  expiredEvent.type = 'checkout.session.expired';
  await assert.doesNotReject(processStripeEvent(expiredEvent, {
    runEffect: stripeExpired.runEffect,
    release: async () => false,
  }));

  const mp = durableHarness();
  await assert.doesNotReject(processMercadoPagoPayment(mpPayment(), {
    runEffect: mp.runEffect,
    markPaid: async () => false,
    sendBuyer: async () => ({ ok: true }),
    sendInternal: async () => ({ ok: true }),
    sendSlack: async () => ({ ok: true }),
  }));
  assert.equal(stripePaid.calls.get('inventory'), 1);
  assert.equal(stripeExpired.calls.get('inventory_release'), 1);
  assert.equal(mp.calls.get('inventory'), 1);
});

test('assinatura MP usa data.id, x-request-id e comparação HMAC', () => {
  const secret = 'segredo-webhook-teste';
  const dataId = '99887766';
  const requestId = randomUUID();
  const timestamp = '1786000000';
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const digest = createHmac('sha256', secret).update(manifest).digest('hex');
  assert.equal(verifyMercadoPagoSignature({
    xSignature: `ts=${timestamp},v1=${digest}`,
    xRequestId: requestId,
    dataId,
    secret,
  }), true);
  assert.equal(verifyMercadoPagoSignature({
    xSignature: `ts=${timestamp},v1=${digest}`,
    xRequestId: requestId,
    dataId: '99887767',
    secret,
  }), false);

  const orderDataId = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';
  const orderDigest = createHmac('sha256', secret)
    .update(`id:${orderDataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`)
    .digest('hex');
  assert.equal(verifyMercadoPagoSignature({
    xSignature: `ts=${timestamp},v1=${orderDigest}`,
    xRequestId: requestId,
    dataId: orderDataId,
    secret,
  }), true);
  const uppercaseOrderDigest = createHmac('sha256', secret)
    .update(`id:${orderDataId};request-id:${requestId};ts:${timestamp};`)
    .digest('hex');
  assert.equal(verifyMercadoPagoSignature({
    xSignature: `ts=${timestamp},v1=${uppercaseOrderDigest}`,
    xRequestId: requestId,
    dataId: orderDataId,
    secret,
  }), false);
  assert.equal(verifyMercadoPagoSignature({
    xSignature: `ts=${timestamp},v1=${orderDigest}`,
    xRequestId: requestId,
    dataId: orderDataId,
    secret: 'segredo-incorreto',
  }), false);
  assert.equal(verifyMercadoPagoSignature({
    xSignature: '',
    xRequestId: requestId,
    dataId: orderDataId,
    secret,
  }), false);
});

test('MP inválido não amplifica: assinatura falha antes do refetch', async () => {
  const previousToken = process.env.MP_ACCESS_TOKEN;
  const previousSecret = process.env.MP_WEBHOOK_SECRET;
  const previousFetch = globalThis.fetch;
  let fetchCalls = 0;
  process.env.MP_ACCESS_TOKEN = 'APP_USR_test';
  process.env.MP_WEBHOOK_SECRET = 'webhook-secret';
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error('não deveria buscar'); };
  try {
    const req = {
      method: 'POST',
      query: { type: 'payment', 'data.id': '99887766' },
      headers: { 'x-request-id': randomUUID(), 'x-signature': 'ts=1786000000,v1=00' },
      body: { type: 'payment', data: { id: '99887766' } },
    };
    const res = responseMock();
    await mpHandler(req, res);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: 'invalid_signature' });
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
    if (previousSecret === undefined) delete process.env.MP_WEBHOOK_SECRET;
    else process.env.MP_WEBHOOK_SECRET = previousSecret;
  }
});

test('Order inválida é reconhecida como tópico financeiro e falha assinatura antes do GET', async () => {
  const previousToken = process.env.MP_ACCESS_TOKEN;
  const previousSecret = process.env.MP_WEBHOOK_SECRET;
  const previousFetch = globalThis.fetch;
  let fetchCalls = 0;
  process.env.MP_ACCESS_TOKEN = 'APP_USR_test';
  process.env.MP_WEBHOOK_SECRET = 'webhook-secret';
  globalThis.fetch = async () => { fetchCalls += 1; throw new Error('não deveria buscar'); };
  try {
    const orderDataId = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';
    const req = {
      method: 'POST',
      query: { type: 'order', 'data.id': orderDataId },
      headers: { 'x-request-id': randomUUID(), 'x-signature': 'ts=1786000000,v1=00' },
      body: { action: 'order.processed', type: 'order', data: { id: orderDataId } },
    };
    const res = responseMock();
    await mpHandler(req, res);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: 'invalid_signature' });
    assert.equal(fetchCalls, 0);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
    if (previousSecret === undefined) delete process.env.MP_WEBHOOK_SECRET;
    else process.env.MP_WEBHOOK_SECRET = previousSecret;
  }
});

test('MP assinado responde 500 para pagamento próprio com valor divergente', async () => {
  const previousToken = process.env.MP_ACCESS_TOKEN;
  const previousSecret = process.env.MP_WEBHOOK_SECRET;
  const previousFetch = globalThis.fetch;
  const secret = 'webhook-secret';
  const paymentId = '99887766';
  const requestId = randomUUID();
  const timestamp = '1786000000';
  const digest = createHmac('sha256', secret)
    .update(`id:${paymentId};request-id:${requestId};ts:${timestamp};`)
    .digest('hex');
  process.env.MP_ACCESS_TOKEN = 'APP_USR_test';
  process.env.MP_WEBHOOK_SECRET = secret;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => mpPayment({ transaction_amount: (OFERTA.pixCentavos - 1) / 100 }),
  });
  try {
    const req = {
      method: 'POST',
      query: { type: 'payment', 'data.id': paymentId },
      headers: {
        'x-request-id': requestId,
        'x-signature': `ts=${timestamp},v1=${digest}`,
      },
      body: { type: 'payment', data: { id: paymentId } },
    };
    const res = responseMock();
    await mpHandler(req, res);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: 'mp_payment_integrity_failed' });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
    if (previousSecret === undefined) delete process.env.MP_WEBHOOK_SECRET;
    else process.env.MP_WEBHOOK_SECRET = previousSecret;
  }
});

test('MP exige source, sku, preço, moeda e método coerentes antes dos efeitos', async () => {
  let effects = 0;
  const deps = { runEffect: async () => { effects += 1; } };
  const cases = [
    [mpPayment({ transaction_amount: (OFERTA.pixCentavos - 1) / 100 }), 'invalid_payment_amount'],
    [mpPayment({ currency_id: 'USD' }), 'invalid_payment_currency'],
    [mpPayment({ payment_method_id: 'visa', payment_type_id: 'credit_card' }), 'invalid_payment_method'],
    [mpPayment({ metadata: { ...mpPayment().metadata, source: 'outro' } }), 'invalid_product_source'],
    [mpPayment({ metadata: { ...mpPayment().metadata, sku: 'outro' } }), 'invalid_product_sku'],
  ];
  for (const [payment, code] of cases) {
    await assert.rejects(
      processMercadoPagoPayment(payment, deps),
      (error) => error instanceof MercadoPagoWebhookIntegrityError && error.code === code,
    );
  }
  assert.equal(effects, 0);
});

test('duas entregas MP do mesmo payment/status executam cada canal uma vez', async () => {
  const durable = durableHarness();
  const counts = { inventory: 0, buyer: 0, internal: 0, slack: 0 };
  const deps = {
    runEffect: durable.runEffect,
    markPaid: async () => { counts.inventory += 1; return true; },
    sendBuyer: async () => { counts.buyer += 1; return { ok: true }; },
    sendInternal: async () => { counts.internal += 1; return { ok: true }; },
    sendSlack: async () => { counts.slack += 1; return { ok: true }; },
  };
  await processMercadoPagoPayment(mpPayment(), { deliveryEventId: 'delivery-a', ...deps });
  await processMercadoPagoPayment(mpPayment(), { deliveryEventId: 'delivery-b', ...deps });
  assert.deepEqual(counts, { inventory: 1, buyer: 1, internal: 1, slack: 1 });
});

test('pagamento MP tardio após reuso confirma reembolso integral uma vez e não conta venda', async () => {
  const durable = durableHarness();
  const providerRefundState = normalizeMercadoPagoRefundState(99887766, []);
  const calls = { markPaid: 0, findRefund: 0, refund: 0, buyer: 0, internal: 0, slack: 0 };
  const seen = [];
  const deps = {
    runEffect: async (args) => {
      seen.push({
        channel: args.channel,
        recordType: args.recordType,
        providerReference: args.providerReference,
      });
      return durable.runEffect(args);
    },
    markPaid: async () => {
      calls.markPaid += 1;
      throw new InventoryLatePaymentReassignedError();
    },
    getRefundState: async () => { calls.findRefund += 1; return providerRefundState; },
    refundPayment: async (paymentId, { idempotencyKey }) => {
      calls.refund += 1;
      assert.equal(paymentId, '99887766');
      assert.match(idempotencyKey,
        /^test\/mercadopago:late-payment:99887766:refund-attempt:1:[a-f0-9]{24}:late_refund$/);
      return { ok: true, id: '55443322', amountCents: OFERTA.pixCentavos };
    },
    sendLateRefundBuyer: async (data) => {
      calls.buyer += 1;
      assert.equal(data.refundReference, '55443322');
      return { ok: true };
    },
    sendInternal: async () => { calls.internal += 1; return { ok: true }; },
    sendSlack: async () => { calls.slack += 1; return { ok: true }; },
  };

  const first = await processMercadoPagoPayment(mpPayment(), deps);
  const replay = await processMercadoPagoPayment(mpPayment(), deps);
  assert.equal(first.latePaymentRefunded, true);
  assert.equal(replay.latePaymentRefunded, true);
  assert.equal(first.refundReference, '55443322');
  assert.deepEqual(calls, {
    markPaid: 2, findRefund: 1, refund: 1, buyer: 1, internal: 1, slack: 1,
  });
  assert.ok(seen.some((entry) => entry.channel === 'late_refund'
    && entry.recordType === 'LATE_REFUND'
    && entry.providerReference === '99887766'));
  assert.equal(durable.calls.get('inventory'), 2);
  assert.equal(durable.calls.get('late_refund'), 1);
});

test('late refund retoma o mesmo ledger após POST aceito e markDone perdido', async () => {
  const done = new Map();
  const payloads = new Map();
  let failCompletionOnce = true;
  let providerRefund = mpRefundState();
  const calls = { markPaid: 0, findRefund: 0, refund: 0, buyer: 0, internal: 0, slack: 0 };
  const runEffect = async (args) => {
    const key = `${args.provider}:${args.eventId}:${args.channel}`;
    if (payloads.has(key)) assert.deepEqual(args.payload, payloads.get(key));
    else payloads.set(key, JSON.parse(JSON.stringify(args.payload)));
    if (done.has(key)) return { delivered: true, replay: true, externalRef: done.get(key) };
    const result = await args.execute({ idempotencyKey: `test/${key}` });
    if (args.channel === 'late_refund' && failCompletionOnce) {
      failCompletionOnce = false;
      throw new Error('dynamo_mark_done_failed_after_provider_accept');
    }
    if (result === false || result?.ok === false) throw new Error(`delivery_failed:${args.channel}`);
    const externalRef = typeof result === 'object' ? result?.id || null : null;
    done.set(key, externalRef);
    return { delivered: true, replay: false, externalRef };
  };
  const deps = {
    runEffect,
    markPaid: async () => {
      calls.markPaid += 1;
      throw new InventoryLatePaymentReassignedError();
    },
    getRefundState: async () => {
      calls.findRefund += 1;
      return providerRefund;
    },
    refundPayment: async () => {
      calls.refund += 1;
      providerRefund = mpRefundState({
        confirmedCents: OFERTA.pixCentavos,
        approvedIds: ['55443322'],
        aggregateReference: '55443322',
      });
      return { ok: true, id: '55443322', amountCents: OFERTA.pixCentavos };
    },
    sendLateRefundBuyer: async () => { calls.buyer += 1; return { ok: true }; },
    sendInternal: async () => { calls.internal += 1; return { ok: true }; },
    sendSlack: async () => { calls.slack += 1; return { ok: true }; },
  };

  await assert.rejects(
    processMercadoPagoPayment(mpPayment({ status: 'approved' }), {
      ...deps,
      refundState: providerRefund,
    }),
    /dynamo_mark_done_failed_after_provider_accept/,
  );
  const recovered = await processMercadoPagoPayment(mpPayment({
    status: 'refunded',
    transaction_amount_refunded: OFERTA.pixCentavos / 100,
    date_last_updated: '2026-08-05T15:05:00.000Z',
  }), { ...deps, refundState: providerRefund });

  assert.equal(recovered.latePaymentRefunded, true);
  assert.equal(recovered.refundReference, '55443322');
  assert.deepEqual(calls, {
    markPaid: 2, findRefund: 2, refund: 1, buyer: 1, internal: 1, slack: 1,
  });
  assert.equal(done.get('mercadopago:late-payment:99887766:refund-attempt:1:000000000000000000000000:late_refund'), '55443322');
  assert.ok(done.has('mercadopago:late-payment:99887766:late_refund_buyer'));
  assert.ok(done.has('mercadopago:late-payment:99887766:late_refund_internal'));
  assert.ok(done.has('mercadopago:late-payment:99887766:late_refund_slack'));
});

test('reembolso MP tardio usa POST integral e X-Idempotency-Key derivada de 64 chars', async () => {
  const previousFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 201,
      json: async () => ({
        id: 55443322,
        payment_id: 99887766,
        amount: OFERTA.pixCentavos / 100,
        status: 'approved',
      }),
    };
  };
  try {
    const result = await refundMercadoPagoPayment('APP_USR_test', '99887766', {
      idempotencyKey: 'growx-prevenda/mercadopago/event/late_refund',
    });
    assert.deepEqual(result, { ok: true, id: '55443322', amountCents: OFERTA.pixCentavos });
    assert.equal(request.url, 'https://api.mercadopago.com/v1/payments/99887766/refunds');
    assert.equal(request.options.method, 'POST');
    assert.match(request.options.headers['X-Idempotency-Key'], /^[a-f0-9]{64}$/);
    assert.equal(request.options.body, '{}');
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('reconciliação MP recupera somente refund integral aprovado do pagamento', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => [
      {
        id: 111,
        payment_id: 99887766,
        amount: 1,
        status: 'rejected',
        date_created: '2026-08-05T14:59:00.000Z',
      },
      {
        id: 55443322,
        payment_id: 99887766,
        amount: OFERTA.pixCentavos / 100,
        status: 'approved',
        date_created: '2026-08-05T15:00:00.000Z',
      },
    ],
  });
  try {
    const refund = await findMercadoPagoFullRefund('APP_USR_test', '99887766');
    assert.deepEqual(refund, { ok: true, id: '55443322' });
  } finally {
    globalThis.fetch = previousFetch;
  }
});
