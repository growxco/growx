/**
 * Estado e reconciliação do inventário da pré-venda.
 *
 * DynamoDB é a fonte do teto. Providers só autorizam uma transição explícita:
 * tempo/TTL, isoladamente, nunca libera slot. Um `held` vencido continua
 * ocupado se não for possível provar no provider que ele não pode mais virar
 * pagamento.
 */
import {
  attachProvider,
  getReservation,
  inventorySummary,
  listSlots,
  releaseReservation,
  releaseUnattachedReservation,
} from './inventory.js';
import {
  normalizeMercadoPagoOrderCanonical,
  verifyMercadoPagoOrderBinding,
} from '../mp-webhook.js';
const STRIPE_API = 'https://api.stripe.com/v1';
const MP_API = 'https://api.mercadopago.com';
const MP_REF = 'gx-modulo-prevenda';
const FETCH_TIMEOUT_MS = 5_000;
const FINANCIAL_RECONCILIATION_SLA_MS = 60 * 60 * 1000;
export const MAX_RECONCILIATIONS_PER_REQUEST = 8;
export const DEFAULT_MP_SETTLEMENT_GRACE_MINUTES = 180;
// Uma aquisição Dynamo pode ter sido commitada antes de o processo morrer ou
// antes de uma resposta ambígua do provider. Só uma busca completa negativa,
// depois desta janela adicional fixa, autoriza o caminho unattached.
export const UNATTACHED_RECOVERY_GRACE_MINUTES = 24 * 60;
const MIN_MP_SETTLEMENT_GRACE_MINUTES = 120;
const MAX_MP_SETTLEMENT_GRACE_MINUTES = 24 * 60;
const CONSUMED_MP = new Set(['approved', 'refunded', 'charged_back', 'in_mediation']);
const PENDING_MP = new Set(['pending', 'in_process', 'authorized']);
const MP_ORDER_ID = /^ORD[A-Z0-9]{20,64}$/;
const MP_ORDER_PENDING = new Set(['created', 'processing', 'action_required']);
const MP_ORDER_RELEASABLE = new Set(['canceled', 'expired', 'failed']);
const MP_ORDER_UNSUPPORTED_FINANCIAL = new Set(['refunded', 'charged_back', 'partially_refunded']);

export class ProviderUnavailableError extends Error {
  constructor(message = 'provider_unavailable', cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ProviderUnavailableError';
  }
}

const stripeKey = () => {
  const key = process.env.STRIPE_SECRET_KEY;
  return key && key.startsWith('sk_') ? key : null;
};
const mpToken = () => process.env.MP_ACCESS_TOKEN || null;
const reservationFromMetadata = (metadata) => metadata?.request_id || metadata?.reservation_id || '';

function reservationOffer(reservation) {
  const amount = Number(reservation?.offerAmountCents);
  const currency = String(reservation?.offerCurrency || '').toUpperCase();
  const sku = String(reservation?.offerSku || '');
  const contractVersion = String(reservation?.contractVersion || '');
  if (!Number.isInteger(amount) || amount <= 0
      || !/^[A-Z]{3}$/.test(currency)
      || !/^[a-z0-9][a-z0-9._-]{0,63}$/.test(sku)
      || !contractVersion) {
    throw new ProviderUnavailableError('reservation_offer_snapshot_invalid');
  }
  return { amount, currency, sku, contractVersion };
}

function assertProviderMetadata(reservation, metadata, code) {
  const offer = reservationOffer(reservation);
  const buyerHash = String(reservation.buyerPk || '').replace(/^BUYER#/, '');
  if (metadata?.source !== 'growx.com.br/prevenda'
      || reservationFromMetadata(metadata) !== reservation.reservationId
      || metadata?.slot_id !== reservation.slot
      || metadata?.buyer_hash !== buyerHash
      || metadata?.sku !== offer.sku
      || metadata?.contract_version !== offer.contractVersion) {
    throw new ProviderUnavailableError(code);
  }
  return offer;
}

const unattachedRecoveryGraceElapsed = (reservation, now) => Number.isFinite(reservation.holdExpiresAt)
  && now.getTime() >= (reservation.holdExpiresAt * 1000)
    + (UNATTACHED_RECOVERY_GRACE_MINUTES * 60_000);

function mpSettlementGraceMs() {
  const raw = process.env.PREVENDA_MP_SETTLEMENT_GRACE_MINUTES;
  if (raw === undefined || raw === '') return DEFAULT_MP_SETTLEMENT_GRACE_MINUTES * 60_000;
  const minutes = Number(raw);
  if (!Number.isInteger(minutes)
      || minutes < MIN_MP_SETTLEMENT_GRACE_MINUTES
      || minutes > MAX_MP_SETTLEMENT_GRACE_MINUTES) {
    throw new ProviderUnavailableError('mp_settlement_grace_invalid');
  }
  return minutes * 60_000;
}

async function fetchJson(fetchImpl, provider, url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      throw new ProviderUnavailableError(`${provider}_http_${response.status}`);
    }
    return data;
  } catch (error) {
    if (error instanceof ProviderUnavailableError) throw error;
    throw new ProviderUnavailableError(`${provider}_request_failed`, error);
  } finally {
    clearTimeout(timer);
  }
}

async function stripeGet(path, fetchImpl) {
  const key = stripeKey();
  if (!key) throw new ProviderUnavailableError('stripe_not_configured');
  return fetchJson(fetchImpl, 'stripe', `${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
}

async function mpGet(path, fetchImpl) {
  const token = mpToken();
  if (!token) throw new ProviderUnavailableError('mercadopago_not_configured');
  return fetchJson(fetchImpl, 'mercadopago', `${MP_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Busca rara de recuperação: provider criou a sessão, mas o attach no Dynamo falhou. */
async function findStripeSession(reservation, fetchImpl) {
  const created = Date.parse(reservation.createdAt || '');
  if (!Number.isFinite(created)) throw new ProviderUnavailableError('stripe_reservation_without_timestamp');
  const since = Math.max(0, Math.floor(created / 1000) - 60);
  let startingAfter = '';

  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ limit: '100', 'created[gte]': String(since) });
    if (startingAfter) query.set('starting_after', startingAfter);
    const data = await stripeGet(`/checkout/sessions?${query}`, fetchImpl);
    const sessions = Array.isArray(data.data) ? data.data : null;
    if (!sessions) throw new ProviderUnavailableError('stripe_sessions_invalid');
    const found = sessions.find((session) => reservationFromMetadata(session.metadata) === reservation.reservationId);
    if (found) return found;
    if (!data.has_more) return null;
    if (!sessions.length) throw new ProviderUnavailableError('stripe_sessions_truncated');
    startingAfter = sessions.at(-1).id;
  }
  throw new ProviderUnavailableError('stripe_sessions_truncated');
}

async function listMpPreferences(fetchImpl) {
  const found = [];
  let offset = 0;
  const limit = 50;
  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({ external_reference: MP_REF, limit: String(limit), offset: String(offset) });
    const data = await mpGet(`/checkout/preferences/search?${query}`, fetchImpl);
    const elements = Array.isArray(data.elements) ? data.elements : null;
    if (!elements) throw new ProviderUnavailableError('mp_preferences_invalid');
    found.push(...elements);
    const hasTotal = data.total !== undefined && Number.isFinite(Number(data.total));
    const total = hasTotal ? Number(data.total) : null;
    if ((hasTotal && found.length >= total) || (!hasTotal && elements.length < limit)) return found;
    if (!elements.length) throw new ProviderUnavailableError('mp_preferences_truncated');
    offset += elements.length;
  }
  throw new ProviderUnavailableError('mp_preferences_truncated');
}

async function findMpPreference(reservation, fetchImpl) {
  const candidates = await listMpPreferences(fetchImpl);
  // Search não garante metadata no elemento; o GET individual é a prova.
  for (const candidate of candidates) {
    if (!candidate?.id) throw new ProviderUnavailableError('mp_preference_without_id');
    const preference = await mpGet(`/checkout/preferences/${encodeURIComponent(candidate.id)}`, fetchImpl);
    if (reservationFromMetadata(preference.metadata) === reservation.reservationId) return preference;
  }
  return null;
}

async function mpPaymentsFor(reservationId, fetchImpl) {
  const payments = [];
  const limit = 50;
  let offset = 0;
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({
      external_reference: MP_REF,
      sort: 'date_created',
      criteria: 'desc',
      limit: String(limit),
      offset: String(offset),
    });
    const data = await mpGet(`/v1/payments/search?${query}`, fetchImpl);
    const results = Array.isArray(data.results) ? data.results : null;
    if (!results) throw new ProviderUnavailableError('mp_payments_invalid');
    payments.push(...results.filter((payment) => reservationFromMetadata(payment.metadata) === reservationId));
    const hasTotal = data.paging?.total !== undefined && Number.isFinite(Number(data.paging.total));
    const total = hasTotal ? Number(data.paging.total) : null;
    if ((hasTotal && offset + results.length >= total) || (!hasTotal && results.length < limit)) return payments;
    if (!results.length) throw new ProviderUnavailableError('mp_payments_truncated');
    offset += results.length;
  }
  throw new ProviderUnavailableError('mp_payments_truncated');
}

async function reconcileStripe(reservation, context) {
  const {
    fetchImpl, now, inventoryOptions, deadlineAt, reconcileStripePaidImpl,
  } = context;
  const session = reservation.providerRef
    ? await stripeGet(`/checkout/sessions/${encodeURIComponent(reservation.providerRef)}`, fetchImpl)
    : await findStripeSession(reservation, fetchImpl);

  if (!session) {
    // `findStripeSession` só retorna null após paginação completa. Ainda assim,
    // mantemos uma graça conservadora para absorver propagação/timeout ambíguo.
    // A transação unattached impede liberar se um attach concorrente venceu.
    if (!reservation.providerRef && unattachedRecoveryGraceElapsed(reservation, now)) {
      await releaseUnattachedReservation({
        requestId: reservation.requestId,
        slot: reservation.slot,
        provider: 'stripe',
        reason: 'stripe_provider_negative_after_recovery_grace',
        now,
        ...inventoryOptions,
      });
    }
    return;
  }
  const offer = assertProviderMetadata(reservation, session.metadata, 'stripe_reservation_mismatch');
  if (!session.id) throw new ProviderUnavailableError('stripe_session_without_id');

  if (!reservation.providerRef) {
    const sessionExpiresAt = Number(session.expires_at);
    if (!session.id || !Number.isFinite(sessionExpiresAt)) {
      throw new ProviderUnavailableError('stripe_session_attachment_invalid');
    }
    await attachProvider({
      requestId: reservation.requestId,
      slot: reservation.slot,
      provider: 'stripe',
      providerRef: session.id,
      providerUrl: typeof session.url === 'string' ? session.url : undefined,
      providerExpiresAt: new Date(sessionExpiresAt * 1000).toISOString(),
      now,
      ...inventoryOptions,
    });
  }

  if (session.payment_status === 'paid') {
    if (Number(session.amount_total) !== offer.amount
        || String(session.currency || '').toUpperCase() !== offer.currency) {
      throw new ProviderUnavailableError('stripe_paid_session_offer_mismatch');
    }
    if (typeof reconcileStripePaidImpl !== 'function') {
      throw new ProviderUnavailableError('stripe_canonical_reconciliation_missing');
    }
    await reconcileStripePaidImpl({
      reservation, session, now, inventoryOptions, fetchImpl, deadlineAt,
    });
    return;
  }
  if (session.status === 'expired' && session.payment_status !== 'paid') {
    await releaseReservation({
      requestId: reservation.requestId,
      slot: reservation.slot,
      provider: 'stripe',
      providerRef: session.id,
      reason: 'stripe_expired_unpaid',
      now,
      ...inventoryOptions,
    });
  }
}

async function reconcileMercadoPago(reservation, context) {
  const {
    fetchImpl, now, inventoryOptions, deadlineAt, reconcileMercadoPagoPaidImpl,
  } = context;
  const preference = reservation.providerRef
    ? await mpGet(`/checkout/preferences/${encodeURIComponent(reservation.providerRef)}`, fetchImpl)
    : await findMpPreference(reservation, fetchImpl);

  if (!preference) {
    // A preferência e os pagamentos são paginados exaustivamente. Qualquer
    // truncamento/timeout sobe erro e preserva o hold; tempo isolado nunca solta.
    if (!reservation.providerRef && unattachedRecoveryGraceElapsed(reservation, now)) {
      const payments = await mpPaymentsFor(reservation.reservationId, fetchImpl);
      if (payments.some((payment) => CONSUMED_MP.has(payment.status)
          || PENDING_MP.has(payment.status))) {
        throw new ProviderUnavailableError('mp_payment_without_attached_preference');
      }
      await releaseUnattachedReservation({
        requestId: reservation.requestId,
        slot: reservation.slot,
        provider: 'mercadopago',
        reason: 'mp_provider_negative_after_recovery_grace',
        now,
        ...inventoryOptions,
      });
    }
    return;
  }
  const offer = assertProviderMetadata(reservation, preference.metadata, 'mp_reservation_mismatch');
  if (!preference.id) throw new ProviderUnavailableError('mp_preference_without_id');

  const expiration = Date.parse(preference.expiration_date_to || '');
  if (!Number.isFinite(expiration)) throw new ProviderUnavailableError('mp_preference_without_expiration');

  if (!reservation.providerRef) {
    if (!preference.id) throw new ProviderUnavailableError('mp_preference_attachment_invalid');
    await attachProvider({
      requestId: reservation.requestId,
      slot: reservation.slot,
      provider: 'mercadopago',
      providerRef: preference.id,
      providerUrl: typeof preference.init_point === 'string' ? preference.init_point : undefined,
      providerExpiresAt: new Date(expiration).toISOString(),
      now,
      ...inventoryOptions,
    });
  }
  if (expiration > now.getTime()) return;

  const payments = await mpPaymentsFor(reservation.reservationId, fetchImpl);
  const consumed = payments.find((payment) => CONSUMED_MP.has(payment.status));
  if (consumed) {
    assertProviderMetadata(reservation, consumed.metadata, 'mp_paid_payment_offer_mismatch');
    if (Math.round(Number(consumed.transaction_amount) * 100) !== offer.amount
        || String(consumed.currency_id || '').toUpperCase() !== offer.currency
        || consumed.external_reference !== MP_REF
        || consumed.payment_method_id !== 'pix'
        || consumed.payment_type_id !== 'bank_transfer') {
      throw new ProviderUnavailableError('mp_paid_payment_offer_mismatch');
    }
    if (typeof reconcileMercadoPagoPaidImpl !== 'function') {
      throw new ProviderUnavailableError('mp_canonical_reconciliation_missing');
    }
    await reconcileMercadoPagoPaidImpl({
      reservation, payment: consumed, now, inventoryOptions, fetchImpl, deadlineAt,
    });
    return;
  }
  if (payments.some((payment) => PENDING_MP.has(payment.status))) return;

  // O Mercado Pago pode liquidar de forma assíncrona depois do horário nominal
  // da preferência. Durante a graça o slot e o BUYER continuam held. Após a
  // graça, uma nova busca completa negativa é necessária antes de liberar.
  if (now.getTime() < expiration + mpSettlementGraceMs()) return;

  await releaseReservation({
    requestId: reservation.requestId,
    slot: reservation.slot,
    provider: 'mercadopago',
    providerRef: preference.id,
    reason: 'mp_expired_without_active_payment',
    now,
    ...inventoryOptions,
  });
}

/**
 * Orders é um protocolo separado do Checkout Pro. A referência ORD anexada é
 * a única chave canônica aceita; uma reserva Orders sem essa referência não é
 * pesquisada nem liberada por inferência.
 */
async function reconcileMercadoPagoOrder(reservation, context) {
  const {
    fetchImpl, now, inventoryOptions, deadlineAt, reconcileMercadoPagoOrderPaidImpl,
  } = context;
  if (!reservation.providerRef) return;
  if (!MP_ORDER_ID.test(String(reservation.providerRef))) {
    throw new ProviderUnavailableError('mp_order_attachment_invalid');
  }

  const order = await mpGet(`/v1/orders/${encodeURIComponent(reservation.providerRef)}`, fetchImpl);
  const orderPayments = Array.isArray(order?.transactions?.payments)
    ? order.transactions.payments
    : [];
  const hasUnsupportedFinancialState = MP_ORDER_UNSUPPORTED_FINANCIAL.has(String(order?.status || ''))
    || MP_ORDER_UNSUPPORTED_FINANCIAL.has(String(order?.status_detail || ''))
    || orderPayments.some((payment) => (
      MP_ORDER_UNSUPPORTED_FINANCIAL.has(String(payment?.status || ''))
      || MP_ORDER_UNSUPPORTED_FINANCIAL.has(String(payment?.status_detail || ''))
    ))
    || (Array.isArray(order?.transactions?.refunds) && order.transactions.refunds.length > 0)
    || (Array.isArray(order?.transactions?.chargebacks) && order.transactions.chargebacks.length > 0);
  if (hasUnsupportedFinancialState) {
    throw new ProviderUnavailableError('mp_order_financial_state_unsupported');
  }
  let boundReservation;
  let canonical;
  try {
    boundReservation = await verifyMercadoPagoOrderBinding(order, {
      getReservationImpl: (requestId) => getReservation(requestId, inventoryOptions),
    });
    canonical = normalizeMercadoPagoOrderCanonical(order, boundReservation);
  } catch (error) {
    throw new ProviderUnavailableError('mp_order_canonical_validation_failed', error);
  }

  if (canonical.snapshot) {
    if (typeof reconcileMercadoPagoOrderPaidImpl !== 'function') {
      throw new ProviderUnavailableError('mp_order_canonical_reconciliation_missing');
    }
    await reconcileMercadoPagoOrderPaidImpl({
      reservation: boundReservation,
      order,
      canonical,
      now,
      inventoryOptions,
      fetchImpl,
      deadlineAt,
    });
    return;
  }

  if (MP_ORDER_PENDING.has(canonical.status)) return;
  if (!MP_ORDER_RELEASABLE.has(canonical.status)) {
    throw new ProviderUnavailableError('mp_order_financial_state_unsupported');
  }

  const expiration = Date.parse(boundReservation.providerExpiresAt || '');
  if (!Number.isFinite(expiration)) {
    throw new ProviderUnavailableError('mp_order_without_expiration');
  }
  // Mesmo terminal, o provider pode propagar estados de forma assíncrona. Só
  // soltamos após a mesma graça conservadora do Pix legado e uma nova leitura
  // canônica, estritamente vinculada à reserva ORD anexada.
  if (now.getTime() < expiration + mpSettlementGraceMs()) return;

  await releaseReservation({
    requestId: boundReservation.requestId,
    slot: boundReservation.slot,
    provider: 'mercadopago',
    providerRef: canonical.orderId,
    reason: `mp_order_${canonical.status}_after_settlement_grace`,
    now,
    ...inventoryOptions,
  });
}

async function mapWithConcurrency(values, concurrency, fn) {
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      await fn(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
}

export async function reconcileExpiredHolds({
  now = new Date(),
  fetchImpl = fetch,
  client,
  tableName,
  deadlineAt = Number.POSITIVE_INFINITY,
  reconcileStripePaidImpl,
  reconcileMercadoPagoPaidImpl,
  reconcileMercadoPagoOrderPaidImpl,
} = {}) {
  const inventoryOptions = { client, tableName };
  const slots = await listSlots(inventoryOptions);
  const nowEpoch = Math.floor(now.getTime() / 1000);
  const expired = slots.filter((slot) => slot.state === 'held'
    && Number.isFinite(slot.holdExpiresAt)
    && slot.holdExpiresAt <= nowEpoch)
    .sort((a, b) => a.pk.localeCompare(b.pk));

  if (!expired.length) return { attempted: 0, providerFailures: 0, deferred: 0 };

  // A mesma janela de minuto escolhe os mesmos slots; no minuto seguinte o
  // cursor gira. Assim cada request faz no máximo oito chamadas provider-side
  // e cada execução faz no máximo oito chamadas provider-side.
  const minute = Math.floor(now.getTime() / 60_000);
  const start = (minute * MAX_RECONCILIATIONS_PER_REQUEST) % expired.length;
  const selected = Array.from(
    { length: Math.min(MAX_RECONCILIATIONS_PER_REQUEST, expired.length) },
    (_, offset) => expired[(start + offset) % expired.length],
  );
  let providerFailures = 0;
  let deadlineDeferred = 0;

  await mapWithConcurrency(selected, 4, async (reservation) => {
    if (Date.now() >= deadlineAt) {
      deadlineDeferred += 1;
      return undefined;
    }
    const boundedFetch = (...args) => {
      if (Date.now() >= deadlineAt) {
        throw new ProviderUnavailableError('reconciliation_deadline_reached');
      }
      return fetchImpl(...args);
    };
    const context = {
      fetchImpl: boundedFetch,
      now,
      inventoryOptions,
      deadlineAt,
      reconcileStripePaidImpl,
      reconcileMercadoPagoPaidImpl,
      reconcileMercadoPagoOrderPaidImpl,
    };
    try {
      if (reservation.provider === 'stripe') return await reconcileStripe(reservation, context);
      if (reservation.provider === 'mercadopago') {
        if (reservation.providerProtocol === 'mp_orders_v1') {
          return await reconcileMercadoPagoOrder(reservation, context);
        }
        return await reconcileMercadoPago(reservation, context);
      }
      throw new ProviderUnavailableError('reservation_provider_invalid');
    } catch (error) {
      if (!(error instanceof ProviderUnavailableError)) throw error;
      providerFailures += 1;
      // Slot, provider e código técnico não contêm PII. O slot fica held.
      console.warn('[lote] reconciliação pendente:', reservation.pk, reservation.provider, error.message);
      return undefined;
    }
  });
  return {
    attempted: selected.length - deadlineDeferred,
    providerFailures,
    deferred: Math.max(0, expired.length - selected.length) + deadlineDeferred,
  };
}

export async function estadoDoLote(options = {}) {
  const slots = await listSlots(options);
  const summary = inventorySummary(slots);
  const now = options.now instanceof Date ? options.now : new Date();
  const nowEpoch = Math.floor(now.getTime() / 1000);
  const expiredStillHeld = slots.some((slot) => slot.state === 'held'
    && Number.isFinite(slot.holdExpiresAt)
    && slot.holdExpiresAt <= nowEpoch);
  const financialStaleBefore = now.getTime() - FINANCIAL_RECONCILIATION_SLA_MS;
  const financialPending = slots.some((slot) => {
    if (slot.state !== 'paid') return false;
    const reconciledAt = Date.parse(slot.financialReconciledAt || '');
    return slot.financialReconciliationStatus === 'failed'
      || !Number.isFinite(reconciledAt)
      || reconciledAt < financialStaleBefore;
  });
  return {
    ...summary,
    confiavel: summary.confiavel && !financialPending,
    reconciliacaoPendente: expiredStillHeld,
    financeiroPendente: financialPending,
  };
}
