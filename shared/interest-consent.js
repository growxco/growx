export const INTEREST_CONSENT = Object.freeze({
  status: 'granted',
  legal_basis: 'consent',
  purpose: 'prevenda_modulo_growx_interest',
  scope: 'presale_and_launch_updates_only',
  channels: Object.freeze(['email', 'whatsapp']),
  notice_version: 'prevenda-lista-2026-08-08',
});

export const buildInterestConsent = () => ({
  ...INTEREST_CONSENT,
  channels: [...INTEREST_CONSENT.channels],
});

export const matchesInterestConsent = (value) => Boolean(
  value
  && value.status === INTEREST_CONSENT.status
  && value.legal_basis === INTEREST_CONSENT.legal_basis
  && value.purpose === INTEREST_CONSENT.purpose
  && value.scope === INTEREST_CONSENT.scope
  && value.notice_version === INTEREST_CONSENT.notice_version
  && Array.isArray(value.channels)
  && value.channels.length === INTEREST_CONSENT.channels.length
  && INTEREST_CONSENT.channels.every((channel) => value.channels.includes(channel)),
);
