import assert from 'node:assert/strict';
import test from 'node:test';

import {
  config,
  maxDuration,
  StripeProviderError,
  stripeGet,
} from '../../api/stripe-webhook.js';

test('Stripe webhook reserva 60s de runtime e 45s no máximo para I/O do provider', () => {
  assert.equal(maxDuration, 60);
  assert.equal(config.maxDuration, 60);
});

test('Stripe não inicia nova chamada quando o deadline global acabou', async () => {
  let fetches = 0;
  await assert.rejects(
    stripeGet('sk_test_never_logged', '/events/evt_deadline', {
      deadlineAt: 10_000,
      now: () => 10_000,
      fetchImpl: async () => {
        fetches += 1;
        throw new Error('não deveria chamar');
      },
    }),
    (error) => error instanceof StripeProviderError
      && error.message === 'stripe_handler_deadline_reached',
  );
  assert.equal(fetches, 0);
});
