import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';
import { URL } from 'node:url';

import {
  buildMpOrder,
  buildMpPreference,
  checkoutStatusToken,
  createMpOrder,
  isDefinitiveProviderCreationFailure,
  mpOrderExternalReference,
  mpOrderStatusBelongsToReservation,
  mpOrderStatusUrl,
  mpStatusBelongsToReservation,
  providerErrorLogFields,
  statusRequestAuthorized,
  stripeStatusBelongsToReservation,
  stripeCheckoutIdempotencyKey,
  stripeParams,
  validateMpPixOrderResponse,
  verifyCheckoutStatusToken,
} from '../../api/checkout.js';
import { checkoutAbertoEm, expiracaoDaReserva, OFERTA } from '../../src/lib/oferta.js';
import {
  captureCheckoutReturnBeforeAnalytics,
  clearCheckoutReturn,
  readCheckoutReturn,
} from '../../src/lib/checkoutReturn.js';

test('checkout fecha exatamente às 23:30 BRT de 15/11', () => {
  assert.equal(checkoutAbertoEm('2026-11-15T23:29:59.999-03:00'), true);
  assert.equal(checkoutAbertoEm(OFERTA.checkoutFechamentoISO), false);
  assert.equal(checkoutAbertoEm('2026-11-15T23:30:00.001-03:00'), false);
});

test('provider expira em 31 minutos e nunca passa do fim de 15/11 BRT', () => {
  assert.equal(
    expiracaoDaReserva('2026-08-05T12:00:00.000Z').toISOString(),
    '2026-08-05T12:31:00.000Z',
  );
  assert.equal(
    expiracaoDaReserva('2026-11-15T23:29:59.999-03:00').toISOString(),
    '2026-11-16T03:00:00.000Z',
  );
});

test('Stripe usa chave estável por request e máscara de recursos sem PII', () => {
  const requestId = '7ed9e944-1d84-4c28-9ec8-0eb66294a735';
  const full = stripeCheckoutIdempotencyKey(requestId, {
    installments: true, consent: true, invoice: true,
  });
  assert.equal(full, stripeCheckoutIdempotencyKey(requestId, {
    installments: true, consent: true, invoice: true,
  }));
  assert.notEqual(full, stripeCheckoutIdempotencyKey(requestId, {
    installments: true, consent: true, invoice: false,
  }));
  assert.match(full, new RegExp(requestId));
  assert.doesNotMatch(full, /@|\d{11}/);
});

test('PII vai em campos padrão dos providers e nunca em metadata nova', () => {
  const statusSecret = 'status-secret-with-at-least-thirty-two-characters';
  const comprador = {
    nome: 'Pessoa Teste',
    email: 'pessoa@example.com',
    cpf: '52998224725',
    telefone: '41999999999',
    cep: '80000000',
    endereco: 'Rua Exemplo 123',
    cidadeUf: 'Curitiba - PR',
  };
  const reservation = {
    requestId: '7ed9e944-1d84-4c28-9ec8-0eb66294a735',
    slot: 'SLOT#001',
    buyerKey: 'a'.repeat(64),
    createdAt: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    offerAmountCents: OFERTA.cartaoCentavos,
    offerCurrency: 'BRL',
    offerSku: 'prevenda_cartao',
    contractVersion: OFERTA.contratoVersao,
  };
  reservation.statusToken = checkoutStatusToken(statusSecret, {
    provider: 'stripe', requestId: reservation.requestId, slot: reservation.slot,
  });
  const allowedMetadata = new Set([
    'source', 'sku', 'contract_version', 'request_id', 'slot_id', 'buyer_hash',
  ]);

  const stripe = stripeParams({ installments: true, consent: true, invoice: true }, comprador, reservation);
  assert.equal(stripe.get('customer_email'), comprador.email);
  assert.equal(stripe.get('payment_method_types[0]'), 'card');
  assert.equal(stripe.get('tax_id_collection[enabled]'), 'true');
  assert.equal(stripe.get('payment_method_options[card][installments][enabled]'), 'true');
  assert.equal(
    stripeParams({ consent: false, invoice: false }, comprador, reservation)
      .get('payment_method_options[card][installments][enabled]'),
    'true',
    'fallback de recursos cosméticos não pode remover o parcelamento prometido',
  );
  assert.equal(stripe.has('allow_promotion_codes'), false);
  for (const [key, metadataValue] of stripe.entries()) {
    if (!key.includes('metadata')) continue;
    const field = key.match(/metadata\]?\[([^\]]+)\]$/)?.[1];
    assert.ok(allowedMetadata.has(field), `metadata Stripe inesperada: ${key}`);
    assert.doesNotMatch(metadataValue, /Pessoa Teste|pessoa@example\.com|52998224725|Rua Exemplo/);
  }

  reservation.statusToken = checkoutStatusToken(statusSecret, {
    provider: 'mercadopago', requestId: reservation.requestId, slot: reservation.slot,
  });
  const mp = buildMpPreference(comprador, reservation);
  assert.deepEqual(new Set(Object.keys(mp.metadata)), allowedMetadata);
  assert.equal(mp.payer.email, comprador.email);
  assert.equal(mp.payer.identification.number, comprador.cpf);
  assert.equal(mp.shipments.receiver_address.zip_code, comprador.cep);
  assert.doesNotMatch(JSON.stringify(mp.metadata), /Pessoa Teste|pessoa@example\.com|52998224725|Rua Exemplo/);
  assert.match(mp.back_urls.success, /request_id=/);
  assert.match(mp.back_urls.success, /status_token=[a-f0-9]{64}/);

  const orderReservation = {
    ...reservation,
    offerAmountCents: OFERTA.pixCentavos,
    offerSku: 'prevenda_pix',
  };
  const order = buildMpOrder(comprador, orderReservation);
  assert.equal(order.payer.email, comprador.email);
  assert.equal(order.payer.first_name, 'Pessoa');
  assert.equal(order.payer.last_name, 'Teste');
  assert.equal(order.payer.identification.number, comprador.cpf);
  assert.equal('metadata' in order, false);
  assert.equal('shipments' in order, false);
});

test('checkout do provider deriva preço, moeda, SKU e contrato do snapshot antigo da reserva', () => {
  const comprador = {
    nome: 'Pessoa Teste',
    email: 'pessoa@example.com',
    cpf: '52998224725',
    telefone: '41999999999',
    cep: '80000000',
    endereco: 'Rua Exemplo 123',
    cidadeUf: 'Curitiba - PR',
  };
  const base = {
    requestId: '7ed9e944-1d84-4c28-9ec8-0eb66294a735',
    slot: 'SLOT#001',
    buyerKey: 'a'.repeat(64),
    createdAt: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    offerCurrency: 'BRL',
    contractVersion: 'v1-lote-zero',
  };
  const secret = 'status-secret-with-at-least-thirty-two-characters';
  const stripeReservation = {
    ...base,
    offerAmountCents: 245_000,
    offerSku: 'prevenda_cartao_lote_zero',
  };
  stripeReservation.statusToken = checkoutStatusToken(secret, {
    provider: 'stripe', requestId: base.requestId, slot: base.slot,
  });
  const stripe = stripeParams({ consent: true, invoice: true }, comprador, stripeReservation);
  assert.equal(stripe.get('line_items[0][price_data][unit_amount]'), '245000');
  assert.equal(stripe.get('line_items[0][price_data][currency]'), 'brl');
  assert.equal(stripe.get('metadata[sku]'), 'prevenda_cartao_lote_zero');
  assert.equal(stripe.get('metadata[contract_version]'), 'v1-lote-zero');
  assert.equal(stripe.get('payment_intent_data[metadata][sku]'), 'prevenda_cartao_lote_zero');

  const mpReservation = {
    ...base,
    offerAmountCents: 235_000,
    offerSku: 'prevenda_pix_lote_zero',
  };
  mpReservation.statusToken = checkoutStatusToken(secret, {
    provider: 'mercadopago', requestId: base.requestId, slot: base.slot,
  });
  const preference = buildMpPreference(comprador, mpReservation);
  assert.equal(preference.items[0].unit_price, 2350);
  assert.equal(preference.items[0].currency_id, 'BRL');
  assert.equal(preference.metadata.sku, 'prevenda_pix_lote_zero');
  assert.equal(preference.metadata.contract_version, 'v1-lote-zero');

  const order = buildMpOrder(comprador, mpReservation);
  assert.equal(order.total_amount, '2350.00');
  assert.equal(order.transactions.payments[0].amount, '2350.00');
  assert.deepEqual(order.transactions.payments[0].payment_method, {
    id: 'pix', type: 'bank_transfer',
  });
  assert.equal(order.transactions.payments[0].expiration_time, 'PT30M');
  assert.equal(order.processing_mode, 'automatic');
  assert.equal(order.external_reference, mpOrderExternalReference(mpReservation));
});

test('Orders API cria somente Pix com R$ do snapshot, idempotência e retorno local autenticado', async () => {
  const previousToken = process.env.MP_ACCESS_TOKEN;
  process.env.MP_ACCESS_TOKEN = 'APP_USR_test_orders';
  const comprador = {
    nome: 'Pessoa Teste da Silva',
    email: 'Pessoa@Example.com',
    cpf: '52998224725',
  };
  const reservation = {
    requestId: '7ed9e944-1d84-4c28-9ec8-0eb66294a735',
    slot: 'SLOT#001',
    buyerKey: 'a'.repeat(64),
    createdAt: new Date('2026-08-05T12:00:00.000Z'),
    providerExpiresAt: new Date('2026-08-05T12:31:00.000Z'),
    offerAmountCents: OFERTA.pixCentavos,
    offerCurrency: 'BRL',
    offerSku: 'prevenda_pix',
    contractVersion: OFERTA.contratoVersao,
  };
  reservation.statusToken = checkoutStatusToken(
    'status-secret-with-at-least-thirty-two-characters',
    { provider: 'mercadopago', requestId: reservation.requestId, slot: reservation.slot },
  );
  const orderResponse = {
    id: 'ORD01HRYFWNYRE1MR1E60MW3X0T2P',
    type: 'online',
    total_amount: '2800.00',
    external_reference: mpOrderExternalReference(reservation),
    processing_mode: 'automatic',
    status: 'action_required',
    status_detail: 'waiting_transfer',
    transactions: {
      payments: [{
        id: 'PAY01HRYFXQ53Q3JPEC48MYWMR0TE',
        amount: '2800.00',
        status: 'action_required',
        status_detail: 'waiting_transfer',
        payment_method: {
          id: 'pix',
          type: 'bank_transfer',
          ticket_url: 'https://www.mercadopago.com.br/payments/123456789/ticket?hash=abc123',
          qr_code: '00020126',
          qr_code_base64: 'aW1hZ2U=',
        },
      }],
    },
  };
  try {
    const created = await createMpOrder(comprador, reservation, {
      fetchImpl: async (url, options) => {
        assert.equal(url, 'https://api.mercadopago.com/v1/orders');
        assert.equal(options.method, 'POST');
        assert.equal(options.headers.Authorization, 'Bearer APP_USR_test_orders');
        assert.equal(options.headers['X-Idempotency-Key'], reservation.requestId);
        const body = JSON.parse(options.body);
        assert.equal(body.total_amount, '2800.00');
        assert.equal(body.transactions.payments.length, 1);
        assert.equal(body.transactions.payments[0].amount, '2800.00');
        assert.deepEqual(body.transactions.payments[0].payment_method, {
          id: 'pix', type: 'bank_transfer',
        });
        assert.equal(body.transactions.payments[0].expiration_time, 'PT30M');
        assert.equal(body.processing_mode, 'automatic');
        assert.equal(body.statement_descriptor, 'GROWX MODULO');
        assert.equal(body.external_reference, `gx-modulo-prevenda-${reservation.requestId}`);
        assert.deepEqual(body.payer, {
          email: 'pessoa@example.com',
          first_name: 'Pessoa',
          last_name: 'Teste da Silva',
          identification: { type: 'CPF', number: comprador.cpf },
        });
        return { ok: true, status: 201, json: async () => orderResponse };
      },
    });
    assert.equal(created.id, orderResponse.id);
    assert.equal(validateMpPixOrderResponse(created, reservation).paymentId,
      'PAY01HRYFXQ53Q3JPEC48MYWMR0TE');

    const providerUrl = new URL(mpOrderStatusUrl(created.id, reservation));
    assert.equal(providerUrl.origin, 'https://www.growx.com.br');
    assert.equal(providerUrl.pathname, '/prevenda/sucesso');
    assert.equal(providerUrl.searchParams.get('order_id'), created.id);
    assert.equal(providerUrl.searchParams.get('request_id'), reservation.requestId);
    assert.equal(providerUrl.searchParams.get('status_token'), reservation.statusToken);

    const attached = { ...reservation, providerRef: created.id, providerProtocol: 'mp_orders_v1' };
    assert.equal(mpOrderStatusBelongsToReservation(created, attached), true);
    assert.throws(() => validateMpPixOrderResponse({
      ...created,
      transactions: {
        payments: [{
          ...created.transactions.payments[0],
          payment_method: { ...created.transactions.payments[0].payment_method, id: 'account_money' },
        }],
      },
    }, reservation), /mp_order_response_invalid/);
    assert.throws(() => validateMpPixOrderResponse({
      ...created,
      transactions: {
        payments: [{
          ...created.transactions.payments[0],
          payment_method: {
            ...created.transactions.payments[0].payment_method,
            ticket_url: 'https://mercadopago.com.br.evil.example/ticket',
          },
        }],
      },
    }, reservation), /mp_order_response_invalid/);
  } finally {
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
  }
});

test('status de checkout exige HMAC e binding exato da reserva e do produto', () => {
  const secret = 'status-secret-with-at-least-thirty-two-characters';
  const reservation = {
    requestId: '7ed9e944-1d84-4c28-9ec8-0eb66294a735',
    slot: 'SLOT#001',
    provider: 'stripe',
    providerRef: 'cs_test_status123',
    offerAmountCents: OFERTA.cartaoCentavos,
    offerCurrency: 'BRL',
    offerSku: 'prevenda_cartao',
    contractVersion: OFERTA.contratoVersao,
  };
  const token = checkoutStatusToken(secret, {
    provider: reservation.provider,
    requestId: reservation.requestId,
    slot: reservation.slot,
  });
  assert.equal(verifyCheckoutStatusToken(secret, {
    provider: reservation.provider, requestId: reservation.requestId, slot: reservation.slot,
  }, token), true);
  assert.equal(statusRequestAuthorized({
    provider: 'stripe',
    providerReference: reservation.providerRef,
    requestId: reservation.requestId,
    statusToken: token,
    reservation,
    secret,
  }), true);
  assert.equal(statusRequestAuthorized({
    provider: 'stripe',
    providerReference: reservation.providerRef,
    requestId: reservation.requestId,
    statusToken: '',
    reservation,
    secret,
  }), false, 'provider id sozinho nunca autoriza consulta');

  const stripeSession = {
    id: reservation.providerRef,
    mode: 'payment',
    amount_total: OFERTA.cartaoCentavos,
    currency: 'brl',
    metadata: {
      source: 'growx.com.br/prevenda',
      sku: 'prevenda_cartao',
      request_id: reservation.requestId,
      slot_id: reservation.slot,
      contract_version: reservation.contractVersion,
    },
  };
  assert.equal(stripeStatusBelongsToReservation(stripeSession, reservation), true);
  assert.equal(stripeStatusBelongsToReservation({
    ...stripeSession, metadata: { ...stripeSession.metadata, source: 'outro-produto' },
  }, reservation), false);

  const mpReservation = {
    ...reservation,
    provider: 'mercadopago',
    providerRef: 'pref_status123',
    offerAmountCents: OFERTA.pixCentavos,
    offerSku: 'prevenda_pix',
  };
  const mpPayment = {
    id: 99887766,
    external_reference: 'gx-modulo-prevenda',
    transaction_amount: OFERTA.pixCentavos / 100,
    currency_id: 'BRL',
    metadata: {
      source: 'growx.com.br/prevenda',
      sku: 'prevenda_pix',
      request_id: reservation.requestId,
      slot_id: reservation.slot,
      contract_version: reservation.contractVersion,
    },
  };
  const merchantOrder = {
    preference_id: mpReservation.providerRef,
    external_reference: 'gx-modulo-prevenda',
    payments: [{ id: mpPayment.id }],
  };
  assert.equal(mpStatusBelongsToReservation(mpPayment, merchantOrder, mpReservation), true);
  assert.equal(mpStatusBelongsToReservation({
    ...mpPayment, metadata: { ...mpPayment.metadata, sku: 'outro-produto' },
  }, merchantOrder, mpReservation), false);

  const orderReservation = {
    ...mpReservation,
    providerRef: 'ORD01HRYFWNYRE1MR1E60MW3X0T2P',
    providerProtocol: 'mp_orders_v1',
  };
  const orderToken = checkoutStatusToken(secret, {
    provider: 'mercadopago', requestId: orderReservation.requestId, slot: orderReservation.slot,
  });
  assert.equal(statusRequestAuthorized({
    provider: 'mercadopago',
    providerReference: orderReservation.providerRef,
    requestId: orderReservation.requestId,
    statusToken: orderToken,
    reservation: orderReservation,
    secret,
  }), true);
  assert.equal(statusRequestAuthorized({
    provider: 'mercadopago',
    providerReference: 'ORD01HRYFWNYRE1MR1E60MW3X0BAD',
    requestId: orderReservation.requestId,
    statusToken: orderToken,
    reservation: orderReservation,
    secret,
  }), false, 'order_id diferente nunca autoriza refetch da reserva');
});

test('somente rejeição conclusiva pré-criação autoriza liberar hold unattached', () => {
  assert.equal(isDefinitiveProviderCreationFailure({ status: 400 }), true);
  assert.equal(isDefinitiveProviderCreationFailure({ status: 401 }), true);
  assert.equal(isDefinitiveProviderCreationFailure({ status: 422 }), true);
  assert.equal(isDefinitiveProviderCreationFailure({ code: 'OFFER_CLOSED' }), true);
  assert.equal(isDefinitiveProviderCreationFailure({ status: 408 }), false);
  assert.equal(isDefinitiveProviderCreationFailure({ status: 409 }), false);
  assert.equal(isDefinitiveProviderCreationFailure({ status: 429 }), false);
  assert.equal(isDefinitiveProviderCreationFailure({ status: 500 }), false);
  assert.equal(isDefinitiveProviderCreationFailure(new Error('timeout')), false);
});

test('log de erro do provider nunca inclui mensagem ou PII devolvida', () => {
  const error = new Error('email pessoa@example.com cpf 52998224725 endereço Rua Exemplo');
  error.status = 422;
  error.providerCode = 'parameter_invalid';
  error.param = 'payer[email]';
  const logged = providerErrorLogFields('mercadopago', error);
  assert.deepEqual(logged, {
    provider: 'mercadopago',
    error: 'Error',
    status: 422,
    code: 'parameter_invalid',
    param: null,
  });
  assert.doesNotMatch(JSON.stringify(logged), /pessoa@|52998224725|Rua Exemplo/);
});

test('redirect financeiro é removido da URL antes do analytics sem perder o binding', () => {
  const previousWindow = globalThis.window;
  const token = 'a'.repeat(64);
  const location = {
    pathname: '/prevenda/sucesso',
    href: `https://www.growx.com.br/prevenda/sucesso?session_id=cs_test_secure&request_id=7ed9e944-1d84-4c28-9ec8-0eb66294a735&status_token=${token}`,
  };
  const history = {
    state: {},
    replaceState(state, _title, path) {
      this.state = state;
      location.href = `https://www.growx.com.br${path}`;
      location.pathname = path;
    },
  };
  globalThis.window = { location, history };
  try {
    captureCheckoutReturnBeforeAnalytics();
    assert.equal(location.href, 'https://www.growx.com.br/prevenda/sucesso');
    assert.deepEqual(readCheckoutReturn(), {
      sessionId: 'cs_test_secure',
      paymentId: '',
      orderId: '',
      requestId: '7ed9e944-1d84-4c28-9ec8-0eb66294a735',
      statusToken: token,
    });
    clearCheckoutReturn();
    assert.equal(readCheckoutReturn(), null);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
