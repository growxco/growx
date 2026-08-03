/**
 * POST /api/mp-webhook — notificações do Mercado Pago (Pix da pré-venda).
 *
 * MP envia formatos variados (?type=payment&data.id=X, ?topic=payment&id=X,
 * body {action, data:{id}}). Extraímos o payment id e REFETCHAMOS o pagamento
 * autenticado na API do MP — payload forjado sem pagamento real é ignorado.
 */
import { notifySale } from './_lib/notify.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method === 'GET') return res.status(200).json({ ok: true }); // ping de verificação do MP
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return res.status(503).json({ error: 'mercadopago_not_configured' });

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch { body = {}; }

  const q = req.query || {};
  const topic = String(q.type || q.topic || body?.type || body?.action || '');
  const paymentId = String(q['data.id'] || q.id || body?.data?.id || '');

  if (!/payment/.test(topic) || !/^\d{5,}$/.test(paymentId)) {
    return res.status(200).json({ ok: true, ignored: topic || 'no_payment_id' });
  }

  let pmt;
  try {
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return res.status(200).json({ ok: true, ignored: 'payment_not_found' });
    pmt = await r.json();
  } catch {
    return res.status(500).json({ error: 'mp_fetch_failed' }); // MP reenvia
  }

  // Notifica só em transição relevante (aprovado ou pendente de pix gerado)
  if (!['approved', 'pending', 'in_process'].includes(pmt.status)) {
    return res.status(200).json({ ok: true, ignored: pmt.status });
  }

  await notifySale({
    provider: 'mercadopago',
    method: pmt.payment_type_id === 'bank_transfer' ? 'Pix' : (pmt.payment_type_id || 'Pix'),
    amountCents: Math.round((pmt.transaction_amount || 0) * 100),
    currency: pmt.currency_id,
    email: pmt.payer?.email,
    name: [pmt.payer?.first_name, pmt.payer?.last_name].filter(Boolean).join(' '),
    phone: pmt.payer?.phone?.number,
    reference: `mp_${pmt.id}`,
    status: pmt.status === 'approved' ? 'PAGO' : 'PENDENTE (aguardando Pix)',
  });

  return res.status(200).json({ ok: true });
}
