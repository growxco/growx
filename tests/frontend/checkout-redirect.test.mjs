import assert from 'node:assert/strict';
import test from 'node:test';

import {
  safeCheckoutRedirectUrl,
  safeGrowxCheckoutReturnUrl,
  safeStripeCheckoutUrl,
} from '../../shared/checkout-redirect.js';

test('aceita somente Checkout Stripe HTTPS no host exato', () => {
  assert.equal(
    safeStripeCheckoutUrl('https://checkout.stripe.com/c/pay/cs_test_safe#fidkdWxOYHwnPyd1blpxYHZxWjA0'),
    'https://checkout.stripe.com/c/pay/cs_test_safe#fidkdWxOYHwnPyd1blpxYHZxWjA0',
  );
  for (const value of [
    'javascript:alert(1)',
    'https://checkout.stripe.com.evil.test/c/pay/cs_test_safe',
    'https://checkout.stripe.com@evil.test/c/pay/cs_test_safe',
    'http://checkout.stripe.com/c/pay/cs_test_safe',
    'https://checkout.stripe.com:444/c/pay/cs_test_safe',
    'https://checkout.stripe.com/',
  ]) {
    assert.equal(safeStripeCheckoutUrl(value), null, value);
  }
});

test('retorno local aceita apenas a confirmação Grow-X sem query', () => {
  const safe = 'https://www.growx.com.br/prevenda/sucesso#provider=mercadopago&request_id=ok';
  assert.equal(safeGrowxCheckoutReturnUrl(safe), safe);
  assert.equal(safeCheckoutRedirectUrl(safe), safe);
  for (const value of [
    'https://www.growx.com.br/prevenda',
    'https://www.growx.com.br/prevenda/sucesso?status_token=segredo',
    'https://growx.com.br.evil.test/prevenda/sucesso',
    '//www.growx.com.br/prevenda/sucesso',
    ' https://www.growx.com.br/prevenda/sucesso\n',
  ]) {
    assert.equal(safeGrowxCheckoutReturnUrl(value), null, value);
  }
});
