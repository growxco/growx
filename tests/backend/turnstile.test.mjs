import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TurnstileRejectedError,
  TurnstileUnavailableError,
  verifyCheckoutChallenge,
} from '../../api/_lib/turnstile.js';

const validToken = 'token-valid-with-enough-characters-1234567890';
const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

test('Turnstile aceita somente sucesso com action e hostname esperados', async () => {
  let request;
  const result = await verifyCheckoutChallenge({
    token: validToken,
    requestId: '10000000-0000-4000-8000-000000000001',
    remoteIp: '203.0.113.10',
    secret: 'test-secret',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response({
        success: true,
        action: 'prevenda_checkout',
        hostname: 'www.growx.com.br',
      });
    },
  });

  assert.deepEqual(result, {
    action: 'prevenda_checkout',
    hostname: 'www.growx.com.br',
  });
  assert.equal(request.url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(request.options.body.get('response'), validToken);
  assert.equal(request.options.body.get('remoteip'), '203.0.113.10');
  assert.equal(request.options.body.get('idempotency_key'), '10000000-0000-4000-8000-000000000001');
});

for (const [name, body] of [
  ['falha do provedor', { success: false, action: 'prevenda_checkout', hostname: 'www.growx.com.br' }],
  ['action diferente', { success: true, action: 'newsletter', hostname: 'www.growx.com.br' }],
  ['hostname diferente', { success: true, action: 'prevenda_checkout', hostname: 'evil.example' }],
]) {
  test(`Turnstile rejeita ${name}`, async () => {
    await assert.rejects(
      verifyCheckoutChallenge({
        token: validToken,
        secret: 'test-secret',
        fetchImpl: async () => response(body),
      }),
      TurnstileRejectedError,
    );
  });
}

test('Turnstile falha fechado sem segredo, token valido ou resposta confiavel', async () => {
  await assert.rejects(
    verifyCheckoutChallenge({ token: validToken, secret: '' }),
    TurnstileUnavailableError,
  );
  await assert.rejects(
    verifyCheckoutChallenge({ token: 'curto', secret: 'test-secret' }),
    TurnstileRejectedError,
  );
  await assert.rejects(
    verifyCheckoutChallenge({
      token: validToken,
      secret: 'test-secret',
      fetchImpl: async () => response({}, 503),
    }),
    TurnstileUnavailableError,
  );
});
