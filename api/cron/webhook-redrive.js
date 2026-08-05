/**
 * GET /api/cron/webhook-redrive
 *
 * Vercel Cron autenticado. Recupera efeitos que sobreviveram à janela de retry
 * do provider sem tornar o endpoint público nem varrer a tabela inteira.
 */
import { timingSafeEqual } from 'node:crypto';

import { drainWebhookOutbox } from '../_lib/webhook-redrive.js';

export const config = { runtime: 'nodejs', maxDuration: 30 };
export const maxDuration = 30;

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

  try {
    const drained = await drainWebhookOutbox({
      now: new Date(),
      deadlineAt: Date.now() + 22_000,
      limit: 8,
    });
    if (drained.mandatoryAlertFailures > 0) {
      res.setHeader('Retry-After', '60');
      return res.status(503).json({
        error: 'dead_letter_alert_pending',
        deadLetters: drained.deadLettered,
        alertasPendentes: drained.mandatoryAlertFailures,
      });
    }
    return res.status(200).json({
      ok: true,
      consultados: drained.scanned,
      processados: drained.claimed,
      entregues: drained.delivered,
      reprogramados: drained.retried,
      deadLetters: drained.deadLettered,
      alertados: drained.alerted,
      ignorados: drained.skipped,
      prazoAtingido: drained.deadlineReached,
    });
  } catch (error) {
    console.error('[cron/webhook-redrive] falha operacional:', error?.name || 'Error');
    res.setHeader('Retry-After', '60');
    return res.status(503).json({ error: 'webhook_redrive_unavailable' });
  }
}
