import { randomUUID } from 'node:crypto';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TOKEN_PATTERN = /^[A-Za-z0-9._~+/=-]{20,4096}$/;
const DEFAULT_ACTION = 'prevenda_checkout';
const DEFAULT_HOSTNAME = 'www.growx.com.br';

export class TurnstileUnavailableError extends Error {
  constructor(message = 'turnstile_unavailable', cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'TurnstileUnavailableError';
  }
}

export class TurnstileRejectedError extends Error {
  constructor(message = 'turnstile_rejected') {
    super(message);
    this.name = 'TurnstileRejectedError';
  }
}

const expectedHostnames = (raw) => new Set(
  String(raw || DEFAULT_HOSTNAME)
    .split(',')
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean),
);

/**
 * Valida o token no servidor antes de tocar no inventario. Tokens Turnstile
 * sao single-use e expiram rapidamente; requestId vira a chave idempotente da
 * verificacao sem armazenar o token nem envia-lo para logs/analytics.
 */
export async function verifyCheckoutChallenge({
  token,
  requestId,
  remoteIp,
  secret = process.env.TURNSTILE_SECRET_KEY,
  expectedAction = process.env.TURNSTILE_EXPECTED_ACTION || DEFAULT_ACTION,
  allowedHostnames = process.env.TURNSTILE_EXPECTED_HOSTNAMES,
  fetchImpl = fetch,
  timeoutMs = 5_000,
} = {}) {
  if (!secret) throw new TurnstileUnavailableError('turnstile_not_configured');
  if (!TOKEN_PATTERN.test(String(token || ''))) throw new TurnstileRejectedError();

  const body = new URLSearchParams({
    secret,
    response: token,
    idempotency_key: requestId || randomUUID(),
  });
  if (remoteIp) body.set('remoteip', remoteIp);

  let response;
  try {
    response = await fetchImpl(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new TurnstileUnavailableError('turnstile_provider_unavailable', error);
  }

  if (!response.ok) {
    throw new TurnstileUnavailableError(`turnstile_http_${response.status}`);
  }

  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new TurnstileUnavailableError('turnstile_invalid_response', error);
  }

  const hostname = String(result?.hostname || '').toLowerCase();
  const action = String(result?.action || '');
  if (result?.success !== true
      || action !== expectedAction
      || !expectedHostnames(allowedHostnames).has(hostname)) {
    throw new TurnstileRejectedError();
  }

  return { hostname, action };
}

export const turnstileRequired = () => process.env.PREVENDA_TURNSTILE_ENABLED === 'true';
