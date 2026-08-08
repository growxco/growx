import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

import {
  createRequestId,
  MP_ORDER_ID_PATTERN,
  MP_ORDER_PAYMENT_ID_PATTERN,
  normalizeMpOrderId,
  normalizeMpOrderPaymentId,
  normalizeRequestId,
  REQUEST_ID_PATTERN,
} from '../../shared/provider-identifiers.js';
import { providerProtocolFor } from '../../api/_lib/inventory.js';

test('UUID de reserva é exclusivamente v4 e normalizado em lowercase', () => {
  const valid = '7ED9E944-1D84-4C28-9EC8-0EB66294A735';
  assert.equal(REQUEST_ID_PATTERN.test(valid), true);
  assert.equal(normalizeRequestId(` ${valid} `), valid.toLowerCase());
  assert.equal(normalizeRequestId('7ed9e944-1d84-1c28-9ec8-0eb66294a735'), null);
  assert.equal(normalizeRequestId('7ed9e944-1d84-5c28-9ec8-0eb66294a735'), null);
  assert.equal(normalizeRequestId('not-a-request-id'), null);
  assert.equal(createRequestId({
    randomUUID: () => '7ED9E944-1D84-4C28-9EC8-0EB66294A735',
  }), valid.toLowerCase());
  assert.equal(createRequestId({
    getRandomValues: (bytes) => bytes.fill(0),
  }), '00000000-0000-4000-8000-000000000000');
  assert.equal(createRequestId({}), null);
});

test('ORD e PAY aceitam os limites 20..64 e preservam case canônico', () => {
  for (const [prefix, pattern, normalize] of [
    ['ORD', MP_ORDER_ID_PATTERN, normalizeMpOrderId],
    ['PAY', MP_ORDER_PAYMENT_ID_PATTERN, normalizeMpOrderPaymentId],
  ]) {
    const minimum = `${prefix}${'A'.repeat(20)}`;
    const maximum = `${prefix}${'Z9'.repeat(32)}`;
    assert.equal(pattern.test(minimum), true);
    assert.equal(pattern.test(maximum), true);
    assert.equal(normalize(minimum), minimum);
    assert.equal(normalize(`${prefix}${'A'.repeat(19)}`), null);
    assert.equal(normalize(`${prefix}${'A'.repeat(65)}`), null);
    assert.equal(normalize(minimum.toLowerCase()), null);
    assert.equal(normalize(`${prefix}${'A'.repeat(19)}-`), null);
  }

  assert.equal(normalizeMpOrderId('ORD01JQ4S4KY8HWQ6NA5PXB65B3D3'),
    'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3');
  assert.equal(normalizeMpOrderPaymentId('PAY01JQ4S4KY8HWQ6NA5PXB65B3D3'),
    'PAY01JQ4S4KY8HWQ6NA5PXB65B3D3');
  assert.equal(providerProtocolFor({
    provider: 'mercadopago',
    providerProtocol: 'mp_orders_v1',
    providerRef: 'ORD01JQ4S4KY8HWQ6NA5PXB65B3D3',
  }), 'mp_orders_v1');
  assert.throws(() => providerProtocolFor({
    provider: 'mercadopago',
    providerProtocol: 'mp_orders_v1',
    providerRef: 'ord01jq4s4ky8hwq6na5pxb65b3d3',
  }), /invalid_provider_reference/);
});

test('checkout, webhooks, cron, pedido e pós-venda importam o mesmo contrato', async () => {
  const orderConsumers = [
    '../../api/checkout.js',
    '../../api/mp-webhook.js',
    '../../api/pedido.js',
    '../../api/_lib/inventory.js',
    '../../api/_lib/lote.js',
    '../../api/_lib/financial-reconcile.js',
    '../../api/_lib/webhook-redrive-dispatch.js',
  ];
  for (const relative of orderConsumers) {
    const source = await readFile(new URL(relative, import.meta.url), 'utf8');
    assert.match(source, /MP_ORDER_ID_PATTERN/);
    assert.doesNotMatch(source, /\^ORD\[A-Z0-9\]\{/);
  }

  const requestConsumers = [
    '../../api/checkout.js',
    '../../api/mp-webhook.js',
    '../../api/pedido.js',
    '../../api/stripe-webhook.js',
    '../../api/_lib/inventory.js',
    '../../api/_lib/webhook-redrive-dispatch.js',
  ];
  for (const relative of requestConsumers) {
    const source = await readFile(new URL(relative, import.meta.url), 'utf8');
    assert.match(source, /REQUEST_ID_PATTERN/);
  }
});
