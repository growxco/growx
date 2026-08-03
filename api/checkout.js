/**
 * /api/checkout — pagamento da pré-venda do Módulo Grow-X.
 *
 * POST { method: 'cartao' | 'pix' }
 *   cartao → Stripe Checkout Session, R$ 3.000 em até 12x  → { url }
 *   pix    → Mercado Pago Checkout Pro (Pix), R$ 2.800     → { url }
 * GET ?session_id=cs_...  (Stripe)  ou  ?payment_id=123 (Mercado Pago)
 *   → { payment_status, amount_total, currency, sku } pra página de confirmação.
 *
 * Requer STRIPE_SECRET_KEY e MP_ACCESS_TOKEN no ambiente. Sem a env do
 * provider pedido → 503 {provider}_not_configured. Nunca simula pagamento.
 */
import { rateLimit, clientIp } from './_lib/ai.js';

export const config = { runtime: 'nodejs' };

const SITE = 'https://www.growx.com.br';
const STRIPE_API = 'https://api.stripe.com/v1';
const MP_API = 'https://api.mercadopago.com';

const OFFER = {
  cartao: {
    amount: 300000, // R$ 3.000,00 em até 12x
    title: 'Módulo Grow-X — Pré-venda',
    description:
      'Central de automação indoor: 6 tomadas inteligentes, dimmer com nascer/pôr do sol, sensores e app. ' +
      'Entrega a partir de 20/11/2026 + 3 meses de GXP Premium inclusos.',
  },
  pix: {
    amount: 280000, // R$ 2.800,00 no Pix
    title: 'Módulo Grow-X — Pré-venda (Pix)',
    description:
      'Central de automação indoor: 6 tomadas inteligentes, dimmer com nascer/pôr do sol, sensores e app. ' +
      'Entrega a partir de 20/11/2026 + 3 meses de GXP Premium inclusos. Preço especial Pix.',
  },
};

const stripeKey = () => {
  const k = process.env.STRIPE_SECRET_KEY;
  return k && k.startsWith('sk_') ? k : null;
};
const mpToken = () => process.env.MP_ACCESS_TOKEN || null;

async function stripeRequest(method, path, params) {
  const r = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${stripeKey()}`,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: params ? params.toString() : undefined,
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const err = new Error(data?.error?.message || `stripe_http_${r.status}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

function stripeParams(withInstallments) {
  const o = OFFER.cartao;
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('success_url', `${SITE}/prevenda/sucesso?session_id={CHECKOUT_SESSION_ID}`);
  p.set('cancel_url', `${SITE}/prevenda?checkout=cancelado`);
  p.set('locale', 'pt-BR');
  p.set('allow_promotion_codes', 'true');
  p.set('phone_number_collection[enabled]', 'true');
  p.set('shipping_address_collection[allowed_countries][0]', 'BR');
  p.set('line_items[0][quantity]', '1');
  p.set('line_items[0][price_data][currency]', 'brl');
  p.set('line_items[0][price_data][unit_amount]', String(o.amount));
  p.set('line_items[0][price_data][product_data][name]', o.title);
  p.set('line_items[0][price_data][product_data][description]', o.description);
  p.set('payment_intent_data[description]', `${o.title} · growx.com.br/prevenda`);
  p.set('metadata[sku]', 'prevenda_cartao');
  p.set('metadata[source]', 'growx.com.br/prevenda');
  if (withInstallments) p.set('payment_method_options[card][installments][enabled]', 'true');
  return p;
}

async function createStripeSession() {
  try {
    return await stripeRequest('POST', '/checkout/sessions', stripeParams(true));
  } catch (e) {
    // Conta sem parcelamento habilitado — cai pra sessão sem installments em vez de perder a venda
    if (/installment/i.test(e.message)) {
      return stripeRequest('POST', '/checkout/sessions', stripeParams(false));
    }
    throw e;
  }
}

async function createMpPreference() {
  const o = OFFER.pix;
  const r = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${mpToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items: [{
        id: 'gx-modulo-prevenda-pix',
        title: o.title,
        description: o.description,
        category_id: 'electronics',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: o.amount / 100,
      }],
      payment_methods: {
        excluded_payment_types: [
          { id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }, { id: 'atm' },
        ],
        installments: 1,
      },
      back_urls: {
        success: `${SITE}/prevenda/sucesso`,
        pending: `${SITE}/prevenda/sucesso`,
        failure: `${SITE}/prevenda?checkout=falhou`,
      },
      auto_return: 'approved',
      statement_descriptor: 'GROWX MODULO',
      external_reference: 'gx-modulo-prevenda',
      metadata: { sku: 'prevenda_pix', source: 'growx.com.br/prevenda' },
    }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const err = new Error(data?.message || `mp_http_${r.status}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

async function getMpPayment(id) {
  const r = await fetch(`${MP_API}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${mpToken()}` },
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const err = new Error(`mp_http_${r.status}`);
    err.status = r.status;
    throw err;
  }
  return data;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.growx.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const ip = clientIp(req);
  if (!rateLimit(ip, 20)) return res.status(429).json({ error: 'rate_limited' });

  if (req.method === 'GET') {
    const sessionId = String(req.query?.session_id || '');
    const paymentId = String(req.query?.payment_id || '');

    if (/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      if (!stripeKey()) return res.status(503).json({ error: 'stripe_not_configured' });
      try {
        const s = await stripeRequest('GET', `/checkout/sessions/${sessionId}`);
        return res.status(200).json({
          payment_status: s.payment_status === 'paid' ? 'paid' : s.payment_status,
          amount_total: s.amount_total,
          currency: s.currency,
          sku: s.metadata?.sku || 'prevenda_cartao',
        });
      } catch (e) {
        return res.status(e.status === 404 ? 404 : 502).json({ error: 'stripe_error' });
      }
    }

    if (/^\d{5,}$/.test(paymentId)) {
      if (!mpToken()) return res.status(503).json({ error: 'mercadopago_not_configured' });
      try {
        const pmt = await getMpPayment(paymentId);
        return res.status(200).json({
          payment_status: pmt.status === 'approved' ? 'paid' : pmt.status,
          amount_total: Math.round((pmt.transaction_amount || 0) * 100),
          currency: (pmt.currency_id || 'BRL').toLowerCase(),
          sku: pmt.metadata?.sku || 'prevenda_pix',
        });
      } catch (e) {
        return res.status(e.status === 404 ? 404 : 502).json({ error: 'mp_error' });
      }
    }

    return res.status(400).json({ error: 'invalid_reference' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  const method = String(body?.method || body?.sku || '');

  try {
    if (method === 'cartao' || method === 'founder' || method === 'prevenda') {
      if (!stripeKey()) {
        return res.status(503).json({ error: 'stripe_not_configured', hint: 'Defina STRIPE_SECRET_KEY no Vercel.' });
      }
      const session = await createStripeSession();
      return res.status(200).json({ url: session.url, id: session.id, provider: 'stripe' });
    }
    if (method === 'pix') {
      if (!mpToken()) {
        return res.status(503).json({ error: 'mercadopago_not_configured', hint: 'Defina MP_ACCESS_TOKEN no Vercel.' });
      }
      const pref = await createMpPreference();
      return res.status(200).json({ url: pref.init_point, id: pref.id, provider: 'mercadopago' });
    }
    return res.status(400).json({ error: 'invalid_method', valid: ['cartao', 'pix'] });
  } catch (e) {
    console.error('[checkout] provider error:', e.message);
    return res.status(502).json({ error: 'provider_error', message: String(e.message).slice(0, 200) });
  }
}
