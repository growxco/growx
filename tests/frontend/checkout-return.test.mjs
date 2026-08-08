import assert from 'node:assert/strict';
import test from 'node:test';
import { URL } from 'node:url';

import {
  captureCheckoutReturnBeforeAnalytics,
  checkoutPurchaseWasTracked,
  checkoutReturnFromUrl,
  checkoutStatusIsTransient,
  clearCheckoutOutcome,
  clearCheckoutStatusToken,
  markCheckoutPurchaseTracked,
  readCheckoutOutcome,
  readCheckoutReturn,
} from '../../src/lib/checkoutReturn.js';

const TOKEN = 'a'.repeat(64);

function withWindow(href, state, run) {
  const originalWindow = globalThis.window;
  const location = new URL(href);
  const history = {
    state,
    replaceState(nextState, _title, nextUrl) {
      this.state = nextState;
      const next = new URL(nextUrl, location);
      location.href = next.href;
    },
  };
  globalThis.window = { location, history };
  try {
    return run({ location, history });
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
}

test('captura retorno atual do fragmento e o remove antes do analytics', () => {
  withWindow(
    `https://www.growx.com.br/prevenda/sucesso?utm_source=teste#session_id=cs_test_1&request_id=req-1&status_token=${TOKEN}`,
    { app: 'preservado' },
    ({ location, history }) => {
      const value = captureCheckoutReturnBeforeAnalytics();
      assert.deepEqual(value, {
        sessionId: 'cs_test_1', paymentId: '', orderId: '', requestId: 'req-1', statusToken: TOKEN,
      });
      assert.equal(location.hash, '');
      assert.equal(location.search, '?utm_source=teste');
      assert.equal(history.state.app, 'preservado');
      assert.deepEqual(readCheckoutReturn(), value);
    },
  );
});

test('retorno atual não precisa expor referência financeira na URL', () => {
  withWindow(
    `https://www.growx.com.br/prevenda/sucesso#request_id=7ed9e944-1d84-4c28-9ec8-0eb66294a735&status_token=${TOKEN}`,
    {},
    ({ location }) => {
      const value = captureCheckoutReturnBeforeAnalytics();
      assert.deepEqual(value, {
        sessionId: '',
        paymentId: '',
        orderId: '',
        requestId: '7ed9e944-1d84-4c28-9ec8-0eb66294a735',
        statusToken: TOKEN,
      });
      assert.equal(location.href, 'https://www.growx.com.br/prevenda/sucesso');
    },
  );
});

test('lê e limpa links antigos com credencial na query sem persistir em storage', () => {
  withWindow(
    `https://www.growx.com.br/prevenda/sucesso?payment_id=pay-1&request_id=req-2&status_token=${TOKEN}`,
    null,
    ({ location }) => {
      const value = captureCheckoutReturnBeforeAnalytics();
      assert.equal(value.paymentId, 'pay-1');
      assert.equal(location.search, '');
      assert.equal(location.hash, '');
      assert.equal(readCheckoutReturn().statusToken, TOKEN);
    },
  );
});

test('refresh recupera o retorno somente do history.state da aba', () => {
  const captured = checkoutReturnFromUrl(
    `https://www.growx.com.br/prevenda/sucesso#order_id=ord-1&request_id=req-3&status_token=${TOKEN}`,
  );
  withWindow(
    'https://www.growx.com.br/prevenda/sucesso',
    { growxCheckoutReturnV1: captured },
    () => assert.deepEqual(captureCheckoutReturnBeforeAnalytics(), captured),
  );
});

test('preserva parâmetros dos dois lados de interrogação inserida no fragmento', () => {
  const value = checkoutReturnFromUrl(
    `https://www.growx.com.br/prevenda/sucesso#request_id=req-append&status_token=${TOKEN}?order_id=ord-append`,
  );
  assert.equal(value.requestId, 'req-append');
  assert.equal(value.statusToken, TOKEN);
  assert.equal(value.orderId, 'ord-append');
});

test('marca analytics de compra no history da mesma aba sem apagar o retorno', () => {
  const value = checkoutReturnFromUrl(
    `https://www.growx.com.br/prevenda/sucesso#session_id=cs_1&request_id=req-4&status_token=${TOKEN}`,
  );
  withWindow(
    'https://www.growx.com.br/prevenda/sucesso',
    { growxCheckoutReturnV1: value },
    () => {
      assert.equal(checkoutPurchaseWasTracked('req-4'), false);
      markCheckoutPurchaseTracked('req-4');
      assert.equal(checkoutPurchaseWasTracked('req-4'), true);
      assert.equal(checkoutPurchaseWasTracked('outro-pedido'), false);
      assert.deepEqual(readCheckoutReturn(), value);
    },
  );
});

test('captura cancelamento do fragmento sem expor resultado ao analytics', () => {
  withWindow(
    'https://www.growx.com.br/prevenda?utm_source=checkout#checkout=cancelado',
    { app: 'preservado' },
    ({ location, history }) => {
      assert.equal(captureCheckoutReturnBeforeAnalytics(), null);
      assert.equal(location.search, '?utm_source=checkout');
      assert.equal(location.hash, '');
      assert.equal(readCheckoutOutcome(), 'cancelado');
      assert.equal(history.state.app, 'preservado');
      clearCheckoutOutcome();
      assert.equal(readCheckoutOutcome(), '');
      assert.equal(history.state.app, 'preservado');
    },
  );
});

test('remove somente o bearer após a primeira resposta e preserva estado não secreto', () => {
  const checkoutReturn = {
    sessionId: '',
    paymentId: '',
    orderId: '',
    requestId: 'req-5',
    statusToken: TOKEN,
  };
  withWindow(
    'https://www.growx.com.br/prevenda/sucesso?utm_source=teste',
    { growxCheckoutReturnV1: checkoutReturn, analytics: { campaign: 'teste' } },
    ({ location, history }) => {
      clearCheckoutStatusToken();
      assert.deepEqual(readCheckoutReturn(), { ...checkoutReturn, statusToken: '' });
      assert.deepEqual(history.state.analytics, { campaign: 'teste' });
      assert.equal(location.search, '?utm_source=teste');
    },
  );
});

test('retry de status fica restrito a falhas HTTP transitórias', () => {
  for (const status of [408, 425, 429, 500, 503, 599]) {
    assert.equal(checkoutStatusIsTransient(status), true, `esperava retry para ${status}`);
  }
  for (const status of [200, 400, 401, 403, 404, 409, 422, 600]) {
    assert.equal(checkoutStatusIsTransient(status), false, `não esperava retry para ${status}`);
  }
});
