/**
 * GET /api/cron/financial-reconcile
 *
 * Scanner canônico de pedidos pagos. Recupera webhooks financeiros perdidos
 * sem confiar em estado parcial nem executar mais de dois pedidos por minuto.
 */
import { timingSafeEqual } from 'node:crypto';

import { reconcilePaidFinancials } from '../_lib/financial-reconcile.js';
import { claimFinancialReconciliationLease } from '../_lib/inventory.js';

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
    const lease = await claimFinancialReconciliationLease({ now });
    if (!lease.acquired) {
      return res.status(200).json({ ok: true, executado: false, motivo: 'lease_existente' });
    }
    const result = await reconcilePaidFinancials({
      now,
      // Mantém 15 s para Dynamo/outbox e serialização antes do teto da função.
      deadlineAt: Date.now() + 45_000,
    });
    return res.status(result.providerFailures ? 503 : 200).json({
      ok: result.providerFailures === 0,
      executado: true,
      tentativas: result.attempted,
      reconciliadas: result.succeeded,
      falhasProvider: result.providerFailures,
      adiadas: result.deferred,
      financeiroPendente: result.pending,
    });
  } catch (error) {
    console.error('[cron/financial-reconcile] falha:', error?.name || 'Error');
    res.setHeader('Retry-After', '60');
    return res.status(503).json({ error: 'reconciliacao_financeira_indisponivel' });
  }
}
