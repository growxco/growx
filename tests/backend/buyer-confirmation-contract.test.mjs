import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';

import { sendBuyerConfirmationEmail } from '../../api/_lib/webhook-delivery.js';
import { OFERTA } from '../../src/lib/oferta.js';

test('e-mail real do webhook entrega link conservável da versão registrada', async (t) => {
  const previousKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = 're_test_only';
  t.after(() => {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
  });

  let request;
  const result = await sendBuyerConfirmationEmail({
    email: 'comprador@example.com',
    name: 'Comprador Teste',
    reference: 'cs_test_reference',
    reservationCode: 'GX-TEST-0001',
    amountCents: 300_000,
    method: 'Cartão',
    contractVersion: OFERTA.contratoVersao,
  }, {
    idempotencyKey: 'growx-prevenda/test/buyer-email',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 200, json: async () => ({ id: 'email_test' }) };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(request.url, 'https://api.resend.com/emails');
  const payload = JSON.parse(request.options.body);
  assert.match(payload.html, new RegExp(`https://www\\.growx\\.com\\.br${OFERTA.contratoPath}`));
  assert.match(payload.html, /Guardar a cópia contratual vinculada ao pedido/);
});
