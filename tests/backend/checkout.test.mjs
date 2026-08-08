import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import test from 'node:test';

import checkoutHandler from '../../api/checkout.js';
import reconcileCronHandler from '../../api/cron/reconcile.js';
import loteHandler from '../../api/lote.js';

function responseMock() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

test('checkout sem Dynamo falha fechado com 503', async () => {
  const previousTable = process.env.PREVENDA_INVENTORY_TABLE;
  const previousStripe = process.env.STRIPE_SECRET_KEY;
  const previousSales = process.env.PREVENDA_SALES_ENABLED;
  const previousSecret = process.env.PREVENDA_RESERVATION_SECRET;
  const previousTurnstileEnabled = process.env.PREVENDA_TURNSTILE_ENABLED;
  const previousTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousFetch = globalThis.fetch;
  delete process.env.PREVENDA_INVENTORY_TABLE;
  process.env.STRIPE_SECRET_KEY = 'sk_test_checkout';
  process.env.PREVENDA_SALES_ENABLED = 'true';
  process.env.PREVENDA_RESERVATION_SECRET = 'test-reservation-secret-with-32-chars-minimum';
  process.env.PREVENDA_TURNSTILE_ENABLED = 'true';
  process.env.TURNSTILE_SECRET_KEY = 'turnstile-test-secret';
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        action: 'prevenda_checkout',
        hostname: 'www.growx.com.br',
      }),
    };
  };
  try {
    const req = {
      method: 'POST',
      headers: { 'x-forwarded-for': `test-${randomUUID()}` },
      body: {
        method: 'cartao',
        requestId: randomUUID(),
        nome: 'Pessoa Teste',
        email: 'pessoa@example.com',
        cpf: '52998224725',
        telefone: '+5541999999999',
        aceite: true,
        cienciaEspecificacoes: true,
        turnstileToken: 'valid-turnstile-token-with-enough-characters',
      },
    };
    const res = responseMock();
    await checkoutHandler(req, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { error: 'capacidade_indisponivel' });
    assert.equal(res.headers['Retry-After'], '60');
  } finally {
    if (previousTable === undefined) delete process.env.PREVENDA_INVENTORY_TABLE;
    else process.env.PREVENDA_INVENTORY_TABLE = previousTable;
    if (previousStripe === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousStripe;
    if (previousSales === undefined) delete process.env.PREVENDA_SALES_ENABLED;
    else process.env.PREVENDA_SALES_ENABLED = previousSales;
    if (previousSecret === undefined) delete process.env.PREVENDA_RESERVATION_SECRET;
    else process.env.PREVENDA_RESERVATION_SECRET = previousSecret;
    if (previousTurnstileEnabled === undefined) delete process.env.PREVENDA_TURNSTILE_ENABLED;
    else process.env.PREVENDA_TURNSTILE_ENABLED = previousTurnstileEnabled;
    if (previousTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousTurnstileSecret;
    globalThis.fetch = previousFetch;
  }
});

test('checkout exige WhatsApp brasileiro válido antes de tocar o inventário', async () => {
  const previousTable = process.env.PREVENDA_INVENTORY_TABLE;
  const previousStripe = process.env.STRIPE_SECRET_KEY;
  const previousSales = process.env.PREVENDA_SALES_ENABLED;
  const previousTurnstileEnabled = process.env.PREVENDA_TURNSTILE_ENABLED;
  const previousTurnstileSecret = process.env.TURNSTILE_SECRET_KEY;
  const previousFetch = globalThis.fetch;
  delete process.env.PREVENDA_INVENTORY_TABLE;
  process.env.STRIPE_SECRET_KEY = 'sk_test_checkout';
  process.env.PREVENDA_SALES_ENABLED = 'true';
  process.env.PREVENDA_TURNSTILE_ENABLED = 'true';
  process.env.TURNSTILE_SECRET_KEY = 'turnstile-test-secret';
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      action: 'prevenda_checkout',
      hostname: 'www.growx.com.br',
    }),
  });
  try {
    for (const telefone of ['', '+5520999999999']) {
      const res = responseMock();
      await checkoutHandler({
        method: 'POST',
        headers: { 'x-forwarded-for': `phone-${randomUUID()}` },
        body: {
          method: 'cartao',
          requestId: randomUUID(),
          nome: 'Pessoa Teste',
          email: 'pessoa@example.com',
          cpf: '52998224725',
          telefone,
          aceite: true,
          cienciaEspecificacoes: true,
          turnstileToken: 'valid-turnstile-token-with-enough-characters',
        },
      }, res);
      assert.equal(res.statusCode, 400);
      assert.deepEqual(res.body, { error: 'telefone_invalido' });
    }
  } finally {
    if (previousTable === undefined) delete process.env.PREVENDA_INVENTORY_TABLE;
    else process.env.PREVENDA_INVENTORY_TABLE = previousTable;
    if (previousStripe === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousStripe;
    if (previousSales === undefined) delete process.env.PREVENDA_SALES_ENABLED;
    else process.env.PREVENDA_SALES_ENABLED = previousSales;
    if (previousTurnstileEnabled === undefined) delete process.env.PREVENDA_TURNSTILE_ENABLED;
    else process.env.PREVENDA_TURNSTILE_ENABLED = previousTurnstileEnabled;
    if (previousTurnstileSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = previousTurnstileSecret;
    globalThis.fetch = previousFetch;
  }
});

test('checkout habilitado sem Turnstile falha antes de inventário ou provedor', async () => {
  const previousSales = process.env.PREVENDA_SALES_ENABLED;
  const previousStripe = process.env.STRIPE_SECRET_KEY;
  const previousTurnstile = process.env.PREVENDA_TURNSTILE_ENABLED;
  process.env.PREVENDA_SALES_ENABLED = 'true';
  process.env.STRIPE_SECRET_KEY = 'sk_test_checkout';
  delete process.env.PREVENDA_TURNSTILE_ENABLED;
  try {
    const res = responseMock();
    await checkoutHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': `test-${randomUUID()}` },
      body: { method: 'cartao', requestId: randomUUID() },
    }, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { error: 'verificacao_seguranca_indisponivel' });
    assert.equal(res.headers['Retry-After'], '300');
  } finally {
    if (previousSales === undefined) delete process.env.PREVENDA_SALES_ENABLED;
    else process.env.PREVENDA_SALES_ENABLED = previousSales;
    if (previousStripe === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousStripe;
    if (previousTurnstile === undefined) delete process.env.PREVENDA_TURNSTILE_ENABLED;
    else process.env.PREVENDA_TURNSTILE_ENABLED = previousTurnstile;
  }
});

test('/api/lote sem Dynamo retorna 503 sem números parciais', async () => {
  const previousTable = process.env.PREVENDA_INVENTORY_TABLE;
  const previousSales = process.env.PREVENDA_SALES_ENABLED;
  delete process.env.PREVENDA_INVENTORY_TABLE;
  process.env.PREVENDA_SALES_ENABLED = 'true';
  try {
    const req = { method: 'GET', headers: { 'x-forwarded-for': `test-${randomUUID()}` } };
    const res = responseMock();
    await loteHandler(req, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { error: 'contagem_indisponivel', confiavel: false });
    assert.equal('vendidas' in res.body, false);
    assert.equal('restantes' in res.body, false);
  } finally {
    if (previousTable === undefined) delete process.env.PREVENDA_INVENTORY_TABLE;
    else process.env.PREVENDA_INVENTORY_TABLE = previousTable;
    if (previousSales === undefined) delete process.env.PREVENDA_SALES_ENABLED;
    else process.env.PREVENDA_SALES_ENABLED = previousSales;
  }
});

test('gate desligado pausa checkout e mantém /api/lote acessível sem contagem falsa', async () => {
  const previousSales = process.env.PREVENDA_SALES_ENABLED;
  delete process.env.PREVENDA_SALES_ENABLED;
  try {
    const checkoutRes = responseMock();
    await checkoutHandler({ method: 'POST', headers: {}, body: {} }, checkoutRes);
    assert.equal(checkoutRes.statusCode, 503);
    assert.deepEqual(checkoutRes.body, { error: 'vendas_pausadas' });

    const loteRes = responseMock();
    await loteHandler({ method: 'GET', headers: {} }, loteRes);
    assert.equal(loteRes.statusCode, 200);
    assert.equal(loteRes.body.confiavel, false);
    assert.equal(loteRes.body.motivo, 'validacao_produto');
    assert.equal(loteRes.body.restantes, 0);
    assert.equal('vendidas' in loteRes.body, false);
    assert.equal('reservadas' in loteRes.body, false);
  } finally {
    if (previousSales === undefined) delete process.env.PREVENDA_SALES_ENABLED;
    else process.env.PREVENDA_SALES_ENABLED = previousSales;
  }
});

test('status não aceita GET/query e POST autenticável permanece fora do gate de vendas', async () => {
  const previousSales = process.env.PREVENDA_SALES_ENABLED;
  delete process.env.PREVENDA_SALES_ENABLED;
  try {
    const getRes = responseMock();
    await checkoutHandler({
      method: 'GET',
      headers: { 'x-forwarded-for': `status-get-${randomUUID()}` },
      query: {
        request_id: randomUUID(),
        status_token: 'a'.repeat(64),
      },
    }, getRes);
    assert.equal(getRes.statusCode, 405);
    assert.deepEqual(getRes.body, { error: 'method_not_allowed' });

    const postRes = responseMock();
    await checkoutHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': `status-post-${randomUUID()}` },
      body: { action: 'status' },
    }, postRes);
    assert.equal(postRes.statusCode, 404);
    assert.deepEqual(postRes.body, { error: 'pedido_nao_encontrado' });
    assert.equal(postRes.headers['Cache-Control'], 'no-store');
    assert.equal(postRes.headers['Referrer-Policy'], 'no-referrer');
    assert.match(postRes.headers['Access-Control-Allow-Headers'], /Authorization/);
  } finally {
    if (previousSales === undefined) delete process.env.PREVENDA_SALES_ENABLED;
    else process.env.PREVENDA_SALES_ENABLED = previousSales;
  }
});

test('Pix falha fechado enquanto o fluxo exclusivo não está homologado', async () => {
  const previousSales = process.env.PREVENDA_SALES_ENABLED;
  const previousPix = process.env.PREVENDA_PIX_ENABLED;
  process.env.PREVENDA_SALES_ENABLED = 'true';
  delete process.env.PREVENDA_PIX_ENABLED;
  try {
    const res = responseMock();
    await checkoutHandler({
      method: 'POST',
      headers: { 'x-forwarded-for': `test-${randomUUID()}` },
      body: { method: 'pix', requestId: randomUUID() },
    }, res);
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { error: 'pix_em_homologacao' });
  } finally {
    if (previousSales === undefined) delete process.env.PREVENDA_SALES_ENABLED;
    else process.env.PREVENDA_SALES_ENABLED = previousSales;
    if (previousPix === undefined) delete process.env.PREVENDA_PIX_ENABLED;
    else process.env.PREVENDA_PIX_ENABLED = previousPix;
  }
});

test('cron de reconciliação falha fechado sem segredo e rejeita Bearer inválido', async () => {
  const previousSecret = process.env.CRON_SECRET;
  try {
    delete process.env.CRON_SECRET;
    const missing = responseMock();
    await reconcileCronHandler({ method: 'GET', headers: {} }, missing);
    assert.equal(missing.statusCode, 503);
    assert.deepEqual(missing.body, { error: 'cron_not_configured' });

    process.env.CRON_SECRET = 'cron-secret-with-at-least-thirty-two-characters';
    const unauthorized = responseMock();
    await reconcileCronHandler({
      method: 'GET', headers: { authorization: 'Bearer incorreto' },
    }, unauthorized);
    assert.equal(unauthorized.statusCode, 401);
    assert.deepEqual(unauthorized.body, { error: 'unauthorized' });
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
  }
});
