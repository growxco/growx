/**
 * POST /api/stripe-webhook — checkout.session.completed → notificação de venda.
 *
 * Autenticação por REFETCH: não confiamos no payload recebido — pegamos o
 * event.id e buscamos o evento direto na API da Stripe com a secret key.
 * Payload forjado sem evento real correspondente é ignorado.
 *
 * ATENÇÃO: a conta Stripe é compartilhada entre vários produtos da Grow-X
 * (growx, uapx, psicologx, gxp) e todos os endpoints recebem os MESMOS eventos
 * da conta. Por isso filtramos por metadata.source — sem isso, uma venda do
 * UAPx dispararia um aviso de "venda do Módulo Grow-X" aqui.
 */
import { notifySale } from './_lib/notify.js';

export const config = { runtime: 'nodejs' };

const FONTE = 'growx.com.br/prevenda';

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
    // Só 404 é "não existe". 401/429/5xx são falhas nossas ou da Stripe —
    // responder 200 nesses casos faria a Stripe marcar como entregue e a venda
    // sumiria em silêncio.
    if (r.status === 404) return res.status(200).json({ ok: true, ignored: 'event_not_found' });
    if (!r.ok) {
      console.error('[stripe-webhook] refetch falhou:', r.status, eventId);
      return res.status(500).json({ error: 'stripe_refetch_failed' }); // Stripe reenvia
    }
    event = await r.json();
  } catch {
    return res.status(500).json({ error: 'stripe_fetch_failed' }); // Stripe reenvia
  }

  const o = event.data?.object || {};

  // Dinheiro saindo também precisa de aviso — reembolso e chargeback não são
  // sessões de checkout, são cobranças, e vêm sem o nosso metadata.
  if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
    const ehNosso = o.metadata?.source === FONTE
      || String(o.description || '').includes('growx.com.br/prevenda')
      || String(o.charge_description || '').includes('Módulo Grow-X');
    if (!ehNosso) return res.status(200).json({ ok: true, ignored: 'outro_produto' });

    const avisouSaida = await notifySale({
      provider: 'stripe',
      method: 'cartão',
      amountCents: o.amount_refunded ?? o.amount,
      currency: o.currency,
      email: o.billing_details?.email || o.receipt_email,
      name: o.billing_details?.name,
      reference: o.id,
      status: event.type === 'charge.refunded' ? 'REEMBOLSADO' : 'CONTESTADO (chargeback)',
    });
    if (!avisouSaida) {
      console.error('[stripe-webhook] saída de dinheiro sem aviso:', o.id, event.type);
      return res.status(500).json({ error: 'notificacao_falhou' });
    }
    return res.status(200).json({ ok: true });
  }

  const VENDA = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];
  if (!VENDA.includes(event.type)) {
    return res.status(200).json({ ok: true, ignored: event.type });
  }

  const s = o;

  // Só a pré-venda do Módulo é nossa — o resto é de outro produto da conta.
  if (s.metadata?.source !== FONTE) {
    return res.status(200).json({ ok: true, ignored: 'outro_produto' });
  }

  const avisou = await notifySale({
    provider: 'stripe',
    method: 'cartão (até 12x)',
    amountCents: s.amount_total,
    currency: s.currency,
    email: s.customer_details?.email || s.customer_email,
    name: s.customer_details?.name || s.metadata?.nome,
    phone: s.customer_details?.phone,
    cpf: s.metadata?.cpf,
    reference: s.id,
    status: s.payment_status === 'paid' ? 'PAGO' : String(s.payment_status || 'pendente').toUpperCase(),
  });

  // Se o aviso não saiu, devolvemos erro pra Stripe reenviar. Responder 200 aqui
  // perderia a venda em silêncio — ninguém ficaria sabendo que alguém comprou.
  if (!avisou) {
    console.error('[stripe-webhook] venda sem aviso entregue:', s.id);
    return res.status(500).json({ error: 'notificacao_falhou' });
  }

  return res.status(200).json({ ok: true });
}
