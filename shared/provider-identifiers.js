/** Contrato único dos identificadores financeiros da pré-venda. */
export const REQUEST_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const MP_ORDER_ID_PATTERN = /^ORD[A-Z0-9]{20,64}$/;
export const MP_ORDER_PAYMENT_ID_PATTERN = /^PAY[A-Z0-9]{20,64}$/;
export const MP_ORDER_EXTERNAL_REFERENCE_PATTERN = /^gx-modulo-prevenda-([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function normalizeRequestId(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return REQUEST_ID_PATTERN.test(normalized) ? normalized : null;
}

export function createRequestId(cryptoImpl = globalThis.crypto) {
  if (typeof cryptoImpl?.randomUUID === 'function') {
    return normalizeRequestId(cryptoImpl.randomUUID());
  }
  if (typeof cryptoImpl?.getRandomValues !== 'function') return null;
  const bytes = new Uint8Array(16);
  cryptoImpl.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ORD/PAY permanecem referências case-sensitive. A conversão para lowercase
// existe somente na composição do manifesto HMAC exigido pelo Mercado Pago.
export function normalizeMpOrderId(value) {
  const normalized = String(value || '').trim();
  return MP_ORDER_ID_PATTERN.test(normalized) ? normalized : null;
}

export function normalizeMpOrderPaymentId(value) {
  const normalized = String(value || '').trim();
  return MP_ORDER_PAYMENT_ID_PATTERN.test(normalized) ? normalized : null;
}
