import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';

import { createReconcileHandler } from '../../api/cron/reconcile.js';

const ORDER_ID = 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3';

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

test('cron real injeta reconciliador canônico de MP Orders com token, ORD e deadline', async () => {
  const previousSecret = process.env.CRON_SECRET;
  const previousToken = process.env.MP_ACCESS_TOKEN;
  const secret = 'cron-secret-with-at-least-thirty-two-characters';
  const token = 'APP_USR_orders_cron_test';
  process.env.CRON_SECRET = secret;
  process.env.MP_ACCESS_TOKEN = token;

  const providerFetch = async () => ({ ok: true });
  let canonicalCall;
  let receivedDeadline;
  const handler = createReconcileHandler({
    claimReconciliationLeaseImpl: async () => ({ acquired: true }),
    reconcileExpiredHoldsImpl: async (options) => {
      assert.equal(typeof options.reconcileMercadoPagoOrderPaidImpl, 'function');
      receivedDeadline = options.deadlineAt;
      await options.reconcileMercadoPagoOrderPaidImpl({
        order: { id: ORDER_ID },
        fetchImpl: providerFetch,
        deadlineAt: options.deadlineAt,
      });
      return { attempted: 1, providerFailures: 0, deferred: 0 };
    },
    reconcileMercadoPagoOrderByIdImpl: async (...args) => {
      canonicalCall = args;
      return { ok: true };
    },
    estadoDoLoteImpl: async () => ({ reconciliacaoPendente: false }),
  });

  try {
    const res = responseMock();
    await handler({
      method: 'GET',
      headers: { authorization: `Bearer ${secret}` },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, {
      ok: true,
      executado: true,
      tentativas: 1,
      falhasProvider: 0,
      adiadas: 0,
      reconciliacaoPendente: false,
    });
    assert.equal(canonicalCall[0], token);
    assert.equal(canonicalCall[1], ORDER_ID);
    assert.equal(canonicalCall[2].fetchImpl, providerFetch);
    assert.equal(canonicalCall[2].deadlineAt, receivedDeadline);
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previousSecret;
    if (previousToken === undefined) delete process.env.MP_ACCESS_TOKEN;
    else process.env.MP_ACCESS_TOKEN = previousToken;
  }
});
