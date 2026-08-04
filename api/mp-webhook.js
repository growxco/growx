/**
 * POST /api/mp-webhook — notificações do Mercado Pago (Pix da pré-venda).
 *
 * MP envia formatos variados (?type=payment&data.id=X, ?topic=payment&id=X,
 * body {action, data:{id}}). Extraímos o payment id e REFETCHAMOS o pagamento
 * autenticado na API do MP — payload forjado sem pagamento real é ignorado.
 *
 * Só avisamos em transição que mexe em dinheiro de verdade: pagamento aprovado,
 * reembolsado ou estornado. Pix apenas GERADO (pending/in_process) não é venda —
 * avisar nesse momento encheria a caixa de entrada de alarme falso a cada QR
 * abandonado, e o MP reenvia a mesma notificação várias vezes.
 */
import { notifySale } from './_lib/notify.js';
import { enviarConfirmacaoPedido } from './_lib/email.js';

export const config = { runtime: 'nodejs' };

const REF = 'gx-modulo-prevenda';

const AVISA = {
  approved: 'PAGO',
  refunded: 'REEMBOLSADO',
  charged_back: 'ESTORNADO (chargeback)',
};

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
    if (r.status === 404) return res.status(200).json({ ok: true, ignored: 'payment_not_found' });
    if (!r.ok) {
      console.error('[mp-webhook] refetch falhou:', r.status, paymentId);
      return res.status(500).json({ error: 'mp_refetch_failed' }); // MP reenvia
    }
    pmt = await r.json();
  } catch {
    return res.status(500).json({ error: 'mp_fetch_failed' }); // MP reenvia
  }

  // A conta do MP pode atender outros produtos — só a pré-venda é nossa.
  if (pmt.external_reference && pmt.external_reference !== REF) {
    return res.status(200).json({ ok: true, ignored: 'outro_produto' });
  }

  const rotulo = AVISA[pmt.status];
  if (!rotulo) return res.status(200).json({ ok: true, ignored: pmt.status });

  // Confirmação ao COMPRADOR. No Pix isso é essencial: se ele fechou a aba e
  // pagou depois, nunca chegou na página de sucesso e este e-mail é a única
  // coisa que a Grow-X entrega a ele — inclusive o código do pedido.
  if (pmt.status === 'approved') {
    const m = pmt.metadata || {};
    await enviarConfirmacaoPedido({
      email: m.email || pmt.payer?.email,
      nome: m.nome || [pmt.payer?.first_name, pmt.payer?.last_name].filter(Boolean).join(' '),
      referencia: `mp_${pmt.id}`,
      valorCentavos: Math.round((pmt.transaction_amount || 0) * 100),
      forma: 'Pix',
      cpf: m.cpf || pmt.payer?.identification?.number,
      endereco: [m.endereco, m.cidade_uf, m.cep].filter(Boolean).join(', ') || null,
    });
  }

  const avisou = await notifySale({
    provider: 'mercadopago',
    method: pmt.payment_type_id === 'bank_transfer' ? 'Pix' : (pmt.payment_type_id || 'Pix'),
    amountCents: Math.round((pmt.transaction_amount || 0) * 100),
    currency: pmt.currency_id,
    email: pmt.payer?.email,
    name: pmt.metadata?.nome || [pmt.payer?.first_name, pmt.payer?.last_name].filter(Boolean).join(' '),
    phone: pmt.payer?.phone?.number,
    cpf: pmt.metadata?.cpf || pmt.payer?.identification?.number,
    reference: `mp_${pmt.id}`,
    status: rotulo,
  });

  // Sem aviso entregue, devolvemos erro pro MP reenviar — 200 aqui perderia a
  // venda em silêncio.
  if (!avisou) {
    console.error('[mp-webhook] pagamento sem aviso entregue:', pmt.id, pmt.status);
    return res.status(500).json({ error: 'notificacao_falhou' });
  }

  return res.status(200).json({ ok: true });
}
