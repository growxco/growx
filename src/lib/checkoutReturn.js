const RETURN_STATE_KEY = 'growxCheckoutReturnV1';
const PURCHASE_TRACKED_STATE_KEY = 'growxCheckoutPurchaseTrackedV1';
const CHECKOUT_OUTCOME_STATE_KEY = 'growxCheckoutOutcomeV1';
const RETURN_PARAM_KEYS = ['session_id', 'payment_id', 'collection_id', 'order_id', 'request_id', 'status_token'];
const CHECKOUT_OUTCOMES = new Set(['cancelado', 'falhou']);

function fragmentParams(url) {
  let value = url.hash.slice(1);
  if (value.startsWith('?')) value = value.slice(1);
  const merged = new URLSearchParams();
  for (const part of value.split('?')) {
    for (const [key, entryValue] of new URLSearchParams(part)) {
      if (!merged.has(key)) merged.set(key, entryValue);
    }
  }
  return merged;
}

/** Fragmento é o contrato atual; query serve apenas para limpar links antigos. */
export function checkoutReturnFromUrl(input) {
  const url = input instanceof URL ? input : new URL(input);
  const fragment = fragmentParams(url);
  const get = (key) => fragment.get(key) || url.searchParams.get(key) || '';
  return {
    sessionId: get('session_id'),
    paymentId: get('payment_id') || get('collection_id'),
    orderId: get('order_id'),
    requestId: get('request_id'),
    statusToken: get('status_token'),
  };
}

function currentHistoryState() {
  return window.history.state && typeof window.history.state === 'object'
    ? window.history.state
    : {};
}

/**
 * Remove credenciais de confirmação da URL antes que qualquer analytics seja
 * instalado. O estado fica apenas no history da própria aba, nunca em storage.
 */
export function captureCheckoutReturnBeforeAnalytics() {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const url = new URL(window.location.href);
  const fragment = fragmentParams(url);
  if (pathname === '/prevenda' || pathname === '/modulo') {
    const checkoutOutcome = fragment.get('checkout') || url.searchParams.get('checkout');
    if (!CHECKOUT_OUTCOMES.has(checkoutOutcome)) return null;
    const nextState = {
      ...currentHistoryState(),
      [CHECKOUT_OUTCOME_STATE_KEY]: checkoutOutcome,
    };
    url.searchParams.delete('checkout');
    url.hash = '';
    window.history.replaceState(nextState, '', `${url.pathname}${url.search}`);
    return null;
  }
  if (pathname !== '/prevenda/sucesso') return null;
  const value = checkoutReturnFromUrl(url);
  const hasSensitiveReturn = RETURN_PARAM_KEYS.some((key) => (
    fragment.has(key) || url.searchParams.has(key)
  ));
  if (!hasSensitiveReturn && !url.hash) return currentHistoryState()[RETURN_STATE_KEY] || null;

  const complete = value.requestId
    && /^[a-f0-9]{64}$/i.test(value.statusToken);
  const previous = currentHistoryState();
  const nextState = complete
    ? { ...previous, [RETURN_STATE_KEY]: value }
    : previous;

  RETURN_PARAM_KEYS.forEach((key) => url.searchParams.delete(key));
  url.hash = '';
  window.history.replaceState(nextState, '', `${url.pathname}${url.search}`);
  return complete ? value : nextState[RETURN_STATE_KEY] || null;
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

export function clearCheckoutStatusToken() {
  if (typeof window === 'undefined') return;
  const current = currentHistoryState();
  const checkoutReturn = current[RETURN_STATE_KEY];
  if (!checkoutReturn || typeof checkoutReturn !== 'object' || !checkoutReturn.statusToken) return;
  window.history.replaceState(
    {
      ...current,
      [RETURN_STATE_KEY]: { ...checkoutReturn, statusToken: '' },
    },
    '',
    `${window.location.pathname}${window.location.search}`,
  );
}

export function readCheckoutOutcome() {
  if (typeof window === 'undefined') return '';
  const value = currentHistoryState()[CHECKOUT_OUTCOME_STATE_KEY];
  return CHECKOUT_OUTCOMES.has(value) ? value : '';
}

export function clearCheckoutOutcome() {
  if (typeof window === 'undefined') return;
  const current = currentHistoryState();
  if (!(CHECKOUT_OUTCOME_STATE_KEY in current)) return;
  const { [CHECKOUT_OUTCOME_STATE_KEY]: _removed, ...rest } = current;
  window.history.replaceState(rest, '', `${window.location.pathname}${window.location.search}`);
}

export function checkoutStatusIsTransient(status) {
  const code = Number(status);
  return [408, 425, 429].includes(code) || (code >= 500 && code <= 599);
}

export function checkoutPurchaseWasTracked(requestId) {
  if (typeof window === 'undefined') return false;
  return currentHistoryState()[PURCHASE_TRACKED_STATE_KEY] === String(requestId || '');
}

export function markCheckoutPurchaseTracked(requestId) {
  if (typeof window === 'undefined') return;
  window.history.replaceState(
    { ...currentHistoryState(), [PURCHASE_TRACKED_STATE_KEY]: String(requestId || '') },
    '',
    `${window.location.pathname}${window.location.search}`,
  );
}
