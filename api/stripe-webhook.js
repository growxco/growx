/**
 * POST /api/stripe-webhook — checkout.session.completed → notificação de venda.
 *
 * Autenticação por REFETCH: não confiamos no payload recebido — pegamos o
 * event.id e buscamos o evento direto na API da Stripe com a secret key.
 * Payload forjado sem evento real correspondente é ignorado.
 */
import { notifySale } from './_lib/notify.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith('sk_')) return res.status(503).json({ error: 'stripe_not_configured' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  const eventId = String(body?.id || '');
  if (!/^evt_[a-zA-Z0-9]+$/.test(eventId)) return res.status(400).json({ error: 'invalid_event_id' });

  // Refetch autenticado — fonte de verdade é a API, não o POST recebido
  let event;
  try {
    const r = await fetch(`https://api.stripe.com/v1/events/${eventId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return res.status(200).json({ ok: true, ignored: 'event_not_found' });
    event = await r.json();
  } catch {
    return res.status(500).json({ error: 'stripe_fetch_failed' }); // Stripe reenvia
  }

  if (event.type !== 'checkout.session.completed') {
    return res.status(200).json({ ok: true, ignored: event.type });
  }

  const s = event.data?.object || {};
  await notifySale({
    provider: 'stripe',
    method: s.metadata?.sku === 'prevenda_cartao' ? 'cartão (até 12x)' : (s.metadata?.sku || 'cartão'),
    amountCents: s.amount_total,
    currency: s.currency,
    email: s.customer_details?.email,
    name: s.customer_details?.name,
    phone: s.customer_details?.phone,
    reference: s.id,
    status: s.payment_status === 'paid' ? 'PAGO' : String(s.payment_status || 'pendente').toUpperCase(),
  });

  return res.status(200).json({ ok: true });
}
