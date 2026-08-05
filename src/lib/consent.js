/**
 * Fonte única para o consentimento de cookies opcionais.
 *
 * Mantém compatibilidade com os valores legados `accepted`/`declined`, mas
 * persiste novas decisões com versão e validade de 12 meses. O evento próprio
 * sincroniza componentes na mesma aba; `storage` cobre alterações em outra aba.
 */
export const COOKIE_CONSENT_KEY = 'growx-cookie-consent';
export const COOKIE_CONSENT_EVENT = 'growx:cookie-consent';

export const COOKIE_CONSENT = Object.freeze({
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
});

const STORAGE_VERSION = 1;
const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const VALID_CHOICES = new Set(Object.values(COOKIE_CONSENT));
const OPTIONAL_COOKIE_PREFIXES = [
  '_ga', '_gid', '_gat', '_clck', '_clsk', '_fbp', '_fbc', '_gcl_',
  '_li_', 'li_gc', 'lidc', 'AnalyticsSyncHistory', 'UserMatchHistory',
  'bcookie', 'bscookie', '_ttp',
];
const OPTIONAL_STORAGE_PREFIXES = ['_ga', '_cl', 'clarity', 'li_', 'linkedin', 'fb_'];
let inMemoryChoice = null;

const canUseStorage = () => typeof window !== 'undefined';

function recordFor(choice, decidedAt = Date.now()) {
  return {
    version: STORAGE_VERSION,
    choice,
    decidedAt,
    expiresAt: decidedAt + CONSENT_TTL_MS,
  };
}

function writeRecord(record) {
  if (!canUseStorage()) return false;
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

function removeStoredConsent() {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(COOKIE_CONSENT_KEY);
  } catch {
    // Ambientes com storage bloqueado continuam no estado sem decisão.
  }
}

function parseStoredConsent(raw) {
  if (!raw) return null;

  // Migração transparente do formato usado antes do consent gate.
  if (VALID_CHOICES.has(raw)) {
    const migrated = recordFor(raw);
    writeRecord(migrated);
    return migrated.choice;
  }

  try {
    const record = JSON.parse(raw);
    if (
      record?.version !== STORAGE_VERSION
      || !VALID_CHOICES.has(record?.choice)
      || !Number.isFinite(record?.expiresAt)
    ) {
      return null;
    }
    if (record.expiresAt <= Date.now()) {
      removeStoredConsent();
      return null;
    }
    return record.choice;
  } catch {
    return null;
  }
}

function isOptionalTrackingKey(name, prefixes) {
  return prefixes.some((prefix) => name === prefix || name.startsWith(prefix));
}

/**
 * Remove, no melhor esforço possível pelo navegador, identificadores opcionais
 * gravados no domínio da Grow-X. Cookies HttpOnly ou de domínios terceiros não
 * são acessíveis ao JavaScript e expiram de acordo com a política do fornecedor.
 */
export function clearOptionalTrackingData() {
  if (!canUseStorage()) return;

  const cookieNames = document.cookie
    .split(';')
    .map((part) => part.split('=')[0]?.trim())
    .filter(Boolean)
    .filter((name) => isOptionalTrackingKey(name, OPTIONAL_COOKIE_PREFIXES));

  const host = window.location.hostname;
  const labels = host.split('.');
  const registrableDomain = host === 'growx.com.br' || host.endsWith('.growx.com.br')
    ? '.growx.com.br'
    : labels.length >= 2
      ? `.${labels.slice(-2).join('.')}`
      : null;
  const domains = [null, host, `.${host}`, registrableDomain].filter((value, index, all) => value !== undefined && all.indexOf(value) === index);

  for (const name of cookieNames) {
    for (const domain of domains) {
      const domainPart = domain ? `; Domain=${domain}` : '';
      document.cookie = `${name}=; Max-Age=0; Path=/${domainPart}; SameSite=Lax`;
    }
  }

  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(Boolean);
      for (const key of keys) {
        if (key !== COOKIE_CONSENT_KEY && isOptionalTrackingKey(key.toLowerCase(), OPTIONAL_STORAGE_PREFIXES)) {
          storage.removeItem(key);
        }
      }
    } catch {
      // Storage bloqueado: a decisão ainda é mantida em memória nesta sessão.
    }
  }
}

export function getCookieConsent() {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    const storedChoice = parseStoredConsent(raw);
    if (storedChoice) inMemoryChoice = storedChoice;
    else if (raw) inMemoryChoice = null;
    return storedChoice ?? inMemoryChoice;
  } catch {
    return inMemoryChoice;
  }
}

export function hasAnalyticsConsent() {
  return getCookieConsent() === COOKIE_CONSENT.ACCEPTED;
}

export function setCookieConsent(choice) {
  if (!VALID_CHOICES.has(choice)) {
    throw new TypeError(`Invalid cookie consent choice: ${choice}`);
  }

  inMemoryChoice = choice;
  if (choice === COOKIE_CONSENT.DECLINED) clearOptionalTrackingData();
  writeRecord(recordFor(choice));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, {
      detail: { choice },
    }));
  }

  return choice;
}

export function subscribeCookieConsent(listener) {
  if (typeof window === 'undefined') return () => {};

  const onConsent = (event) => {
    listener(event?.detail?.choice ?? getCookieConsent());
  };
  const onStorage = (event) => {
    if (event.key === COOKIE_CONSENT_KEY) {
      inMemoryChoice = null;
      listener(getCookieConsent());
    }
  };

  window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
    window.removeEventListener('storage', onStorage);
  };
}
