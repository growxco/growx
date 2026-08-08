import {
  listSlots,
  recordFinancialReconciliation,
} from './inventory.js';
import { reconcileMercadoPagoPaymentById } from '../mp-webhook.js';
import { reconcileMercadoPagoOrderById } from '../mp-webhook.js';
import { reconcileStripeSessionById } from '../stripe-webhook.js';
import { MP_ORDER_ID_PATTERN } from '../../shared/provider-identifiers.js';

export const MAX_PAID_RECONCILIATIONS_PER_REQUEST = 2;
export const FINANCIAL_RECONCILIATION_SLA_MS = 60 * 60 * 1000;

const safeErrorCode = (error) => {
  const candidate = String(error?.code || error?.message || error?.name || 'provider_failure');
  return /^[A-Za-z0-9_.:-]{1,80}$/.test(candidate) ? candidate : 'provider_failure';
};

function paymentReference(reservation) {
  if (reservation.provider === 'mercadopago'
      && reservation.providerProtocol === 'mp_orders_v1'
      && MP_ORDER_ID_PATTERN.test(String(reservation.providerRef || ''))) {
    return { reference: reservation.providerRef, protocol: 'mp_orders_v1' };
  }
  if (reservation.provider === 'mercadopago'
      && /^\d{5,}$/.test(String(reservation.lastProviderRef || ''))) {
    return { reference: reservation.lastProviderRef, protocol: 'mp_checkout_pro_v1' };
  }
  if (reservation.provider === 'stripe'
      && /^cs_[A-Za-z0-9_]+$/.test(String(reservation.providerRef || ''))) {
    return { reference: reservation.providerRef, protocol: 'stripe_checkout_v1' };
  }
  return null;
}

export function financialReconciliationPending(
  slots,
  now = new Date(),
  slaMs = FINANCIAL_RECONCILIATION_SLA_MS,
) {
  const staleBefore = now.getTime() - slaMs;
  return slots.some((slot) => {
    if (slot.state !== 'paid') return false;
    const reconciledAt = Date.parse(slot.financialReconciledAt || '');
    return slot.financialReconciliationStatus === 'failed'
      || !Number.isFinite(reconciledAt)
      || reconciledAt < staleBefore;
  });
}

export async function reconcilePaidFinancials({
  now = new Date(),
  deadlineAt = Number.POSITIVE_INFINITY,
  fetchImpl,
  client,
  tableName,
  stripeKey = process.env.STRIPE_SECRET_KEY,
  mpToken = process.env.MP_ACCESS_TOKEN,
  stripeReconcileImpl = reconcileStripeSessionById,
  mpReconcileImpl = reconcileMercadoPagoPaymentById,
  mpOrderReconcileImpl = reconcileMercadoPagoOrderById,
  recordImpl = recordFinancialReconciliation,
} = {}) {
  const inventoryOptions = { client, tableName };
  const slots = await listSlots(inventoryOptions);
  const paid = slots
    .filter((slot) => slot.state === 'paid')
    .sort((left, right) => left.pk.localeCompare(right.pk));
  if (!paid.length) {
    return { attempted: 0, succeeded: 0, providerFailures: 0, deferred: 0, pending: false };
  }

  const minute = Math.floor(now.getTime() / 60_000);
  // O anel usa os 100 SLOTs físicos, não a lista comprimida de pagos. Se o
  // número de vendas crescer entre execuções, índices da lista `paid` mudam e
  // uma rotação baseada nela pode postergar indefinidamente um slot antigo.
  // Duas posições físicas por minuto garantem uma volta em 50 minutos, abaixo
  // do SLA de 60, independentemente de novas vendas. Capacidade ociosa é
  // preenchida pelos pagos há mais tempo sem tentativa para acelerar lotes
  // esparsos sem sacrificar a garantia do anel.
  const orderedSlots = [...slots].sort((left, right) => left.pk.localeCompare(right.pk));
  const start = (minute * MAX_PAID_RECONCILIATIONS_PER_REQUEST) % orderedSlots.length;
  const ringWindow = Array.from(
    { length: Math.min(MAX_PAID_RECONCILIATIONS_PER_REQUEST, orderedSlots.length) },
    (_, offset) => orderedSlots[(start + offset) % orderedSlots.length],
  );
  const selected = ringWindow.filter((slot) => slot.state === 'paid');
  const selectedKeys = new Set(selected.map((slot) => slot.pk));
  const fallback = paid
    .filter((slot) => !selectedKeys.has(slot.pk))
    .sort((left, right) => {
      const leftAttempt = Date.parse(left.financialReconciliationAttemptedAt || '');
      const rightAttempt = Date.parse(right.financialReconciliationAttemptedAt || '');
      const leftRank = Number.isFinite(leftAttempt) ? leftAttempt : Number.NEGATIVE_INFINITY;
      const rightRank = Number.isFinite(rightAttempt) ? rightAttempt : Number.NEGATIVE_INFINITY;
      return leftRank - rightRank || left.pk.localeCompare(right.pk);
    });
  selected.push(...fallback.slice(
    0,
    Math.max(0, MAX_PAID_RECONCILIATIONS_PER_REQUEST - selected.length),
  ));
  let succeeded = 0;
  let providerFailures = 0;
  let deadlineDeferred = 0;
  const postScanState = new Map();

  await Promise.all(selected.map(async (reservation) => {
    if (Date.now() >= deadlineAt) {
      deadlineDeferred += 1;
      return;
    }
    try {
      const providerBinding = paymentReference(reservation);
      if (!providerBinding) throw new Error('financial_provider_reference_missing');
      const { reference, protocol } = providerBinding;
      if (reservation.provider === 'stripe') {
        await stripeReconcileImpl(stripeKey, reference, { deadlineAt, fetchImpl });
      } else if (reservation.provider === 'mercadopago') {
        if (protocol === 'mp_orders_v1') {
          await mpOrderReconcileImpl(mpToken, reference, { deadlineAt, fetchImpl });
        } else {
          await mpReconcileImpl(mpToken, reference, { deadlineAt, fetchImpl });
        }
      } else {
        throw new Error('financial_provider_invalid');
      }
      const recorded = await recordImpl({ reservation, ok: true, now, ...inventoryOptions });
      if (recorded === false) throw new Error('financial_reconciliation_record_conflict');
      postScanState.set(reservation.pk, {
        financialReconciliationStatus: 'ok',
        financialReconciledAt: now.toISOString(),
      });
      succeeded += 1;
    } catch (error) {
      providerFailures += 1;
      const errorCode = safeErrorCode(error);
      try {
        const recorded = await recordImpl({
          reservation, ok: false, errorCode, now, ...inventoryOptions,
        });
        if (recorded !== false) {
          postScanState.set(reservation.pk, {
            financialReconciliationStatus: 'failed',
          });
        }
      } catch (recordError) {
        // Falha de observabilidade deve manter o cron vermelho, sem vazar o
        // erro do SDK ou credenciais em logs.
        throw new Error('financial_reconciliation_record_failed', { cause: recordError });
      }
      console.warn('[financial-reconcile] pendente:', reservation.pk, reservation.provider, errorCode);
    }
  }));

  const completed = selected.length - deadlineDeferred;
  // `slots` é a fotografia anterior ao scan. Projetar apenas os registros cuja
  // gravação foi confirmada evita manter `pending` depois de um ciclo integral
  // bem-sucedido, sem pagar outra leitura DynamoDB dentro do deadline do cron.
  const postScanSlots = slots.map((slot) => {
    const state = postScanState.get(slot.pk);
    return state ? { ...slot, ...state } : slot;
  });
  return {
    attempted: completed,
    succeeded,
    providerFailures,
    deferred: Math.max(0, paid.length - selected.length) + deadlineDeferred,
    pending: providerFailures > 0
      || deadlineDeferred > 0
      || financialReconciliationPending(postScanSlots, now),
  };
}
