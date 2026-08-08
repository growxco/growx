const MAX_CHECKOUT_URL_LENGTH = 2048;
const STRIPE_CHECKOUT_HOST = 'checkout.stripe.com';
const GROWX_CHECKOUT_HOSTS = new Set(['growx.com.br', 'www.growx.com.br']);

function httpsUrl(value) {
  if (typeof value !== 'string') return null;
  const raw = value;
  const hasControlCharacter = Array.from(raw).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
  if (!raw || raw !== raw.trim() || raw.length > MAX_CHECKOUT_URL_LENGTH
      || hasControlCharacter) {
    return null;
  }
  try {
    const url = new globalThis.URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

export function safeStripeCheckoutUrl(value) {
  const url = httpsUrl(value);
  if (!url || url.hostname.toLowerCase() !== STRIPE_CHECKOUT_HOST || url.pathname === '/') {
    return null;
  }
  return url.href;
}

export function safeGrowxCheckoutReturnUrl(value) {
  const url = httpsUrl(value);
  if (!url || !GROWX_CHECKOUT_HOSTS.has(url.hostname.toLowerCase())
      || url.pathname !== '/prevenda/sucesso' || url.search) {
    return null;
  }
  return url.href;
}

export function safeCheckoutRedirectUrl(value) {
  return safeStripeCheckoutUrl(value) || safeGrowxCheckoutReturnUrl(value);
}
