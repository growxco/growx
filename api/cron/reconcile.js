/**
 * GET /api/cron/reconcile
 *
 * Worker bounded da pré-venda. Vercel Cron envia `Authorization: Bearer
 * $CRON_SECRET`; nenhuma rota pública chama providers no hot path.
 */
import { timingSafeEqual } from 'node:crypto';

import { claimReconciliationLease } from '../_lib/inventory.js';
import { estadoDoLote, reconcileExpiredHolds } from '../_lib/lote.js';
import { reconcileMercadoPagoPaymentById } from '../mp-webhook.js';
import { reconcileStripeCanonicalSession } from '../stripe-webhook.js';

export const maxDuration = 60;
export const config = { runtime: 'nodejs', maxDuration: 60 };

const authorized = (req, secret) => {
  const received = String(req.headers?.authorization || '');
  const expected = `Bearer ${secret}`;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const secret = process.env.CRON_SECRET;
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    return res.status(503).json({ error: 'cron_not_configured' });
  }
  if (!authorized(req, secret)) return res.status(401).json({ error: 'unauthorized' });

  const now = new Date();
  try {
    const lease = await claimReconciliationLease({ now });
    if (!lease.acquired) {
      return res.status(200).json({ ok: true, executado: false, motivo: 'lease_existente' });
    }

    const reconciliation = await reconcileExpiredHolds({
      now,
      // Reserva margem para Dynamo/outbox/serialização dentro de maxDuration.
      deadlineAt: Date.now() + 45_000,
      reconcileStripePaidImpl: ({ session, fetchImpl, deadlineAt }) => (
        reconcileStripeCanonicalSession(process.env.STRIPE_SECRET_KEY, session, {
          fetchImpl,
          deadlineAt,
        })
      ),
      reconcileMercadoPagoPaidImpl: ({ payment, fetchImpl, deadlineAt }) => (
        reconcileMercadoPagoPaymentById(process.env.MP_ACCESS_TOKEN, String(payment.id), {
          fetchImpl,
          deadlineAt,
        })
      ),
    });
    const lote = await estadoDoLote({ now });
    return res.status(200).json({
      ok: true,
      executado: true,
      tentativas: reconciliation.attempted,
      falhasProvider: reconciliation.providerFailures,
      adiadas: reconciliation.deferred,
      reconciliacaoPendente: lote.reconciliacaoPendente,
    });
  } catch (error) {
    console.error('[cron/reconcile] falha:', error.message);
    res.setHeader('Retry-After', '60');
    return res.status(503).json({ error: 'reconciliacao_indisponivel' });
  }
}
