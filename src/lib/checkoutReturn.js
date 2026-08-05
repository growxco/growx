const RETURN_STATE_KEY = 'growxCheckoutReturnV1';

const checkoutReturnFrom = (url) => ({
  sessionId: url.searchParams.get('session_id') || '',
  paymentId: url.searchParams.get('payment_id') || url.searchParams.get('collection_id') || '',
  orderId: url.searchParams.get('order_id') || '',
  requestId: url.searchParams.get('request_id') || '',
  statusToken: url.searchParams.get('status_token') || '',
});

/**
 * Remove credenciais de confirmação da URL antes que qualquer analytics seja
 * instalado. O estado fica apenas no history da própria aba, nunca em storage.
 */
export function captureCheckoutReturnBeforeAnalytics() {
  if (typeof window === 'undefined' || window.location.pathname !== '/prevenda/sucesso') return null;
  const url = new URL(window.location.href);
  const value = checkoutReturnFrom(url);
  const hasSensitiveQuery = ['session_id', 'payment_id', 'collection_id', 'order_id', 'request_id', 'status_token']
    .some((key) => url.searchParams.has(key));
  if (!hasSensitiveQuery) return window.history.state?.[RETURN_STATE_KEY] || null;

  const complete = (value.sessionId || value.paymentId || value.orderId)
    && value.requestId
    && /^[a-f0-9]{64}$/i.test(value.statusToken);
  const previous = window.history.state && typeof window.history.state === 'object'
    ? window.history.state
    : {};
  const nextState = complete
    ? { ...previous, [RETURN_STATE_KEY]: value }
    : previous;
  window.history.replaceState(nextState, '', window.location.pathname);
  return complete ? value : null;
}

export function readCheckoutReturn() {
  if (typeof window === 'undefined') return null;
  const value = window.history.state?.[RETURN_STATE_KEY];
  return value && typeof value === 'object' ? value : null;
}

export function clearCheckoutReturn() {
  if (typeof window === 'undefined') return;
  const current = window.history.state;
  if (!current || typeof current !== 'object' || !(RETURN_STATE_KEY in current)) return;
  const { [RETURN_STATE_KEY]: _removed, ...rest } = current;
  window.history.replaceState(rest, '', window.location.pathname);
}
