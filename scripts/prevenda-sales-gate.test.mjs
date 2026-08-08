import assert from 'node:assert/strict';
import test from 'node:test';

import checkout from '../api/checkout.js';
import lote from '../api/lote.js';

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

test('sales gate defaults closed without breaking authenticated payment status', async () => {
  const previous = process.env.PREVENDA_SALES_ENABLED;
  delete process.env.PREVENDA_SALES_ENABLED;

  try {
    let res = mockRes();
    await checkout({ method: 'POST', headers: {}, body: {} }, res);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.error, 'vendas_pausadas');

    res = mockRes();
    await checkout({ method: 'POST', headers: {}, body: { action: 'status' } }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.error, 'pedido_nao_encontrado');

    res = mockRes();
    await checkout({ method: 'OPTIONS', headers: {} }, res);
    assert.equal(res.statusCode, 204);

    res = mockRes();
    await lote({ method: 'GET', headers: {} }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.confiavel, false);
    assert.equal(res.body.motivo, 'validacao_produto');
    assert.equal(res.body.restantes, 0);
    assert.equal(res.headers['Cache-Control'], 'no-store, max-age=0');
  } finally {
    if (previous === undefined) delete process.env.PREVENDA_SALES_ENABLED;
    else process.env.PREVENDA_SALES_ENABLED = previous;
  }
});
