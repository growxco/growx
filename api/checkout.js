/**
 * /api/checkout — Stripe Checkout da pré-venda do Módulo Grow-X.
 *
 * POST { sku: 'founder' | 'reserva', quantity? }
 *   → cria Checkout Session hospedada na Stripe e retorna { url }.
 * GET ?session_id=cs_...
 *   → retorna status/valor da sessão pra página de confirmação.
 *
 * Requer STRIPE_SECRET_KEY no ambiente (Vercel env). Sem a key o endpoint
 * responde 503 stripe_not_configured — nunca simula pagamento.
 */
import { rateLimit, clientIp } from './_lib/ai.js';

export const config = { runtime: 'nodejs' };

const SITE = 'https://www.growx.com.br';
const STRIPE_API = 'https://api.stripe.com/v1';

const SKUS = {
  founder: {
    name: 'Módulo Grow-X — Lote Founder (pré-venda)',
    description:
      'Automação indoor de precisão: 6 tomadas inteligentes, dimmer de iluminação, sensores e app. ' +
      'Entrega a partir de 20/11/2026 — lançamento na ExpoCannabis Brasil 2026. ' +
      'Inclui acesso antecipado ao app e onboarding remoto.',
    amount: 299700, // R$ 2.997,00
    maxQty: 5,
  },
  reserva: {
    name: 'Reserva Módulo Grow-X — sinal de pré-venda',
    description:
      'Sinal de reserva de unidade do Módulo Grow-X (abate do valor final). ' +
      'Saldo cobrado no marco de produção. Reembolsável conforme termos da pré-venda.',
    amount: 49700, // R$ 497,00
    maxQty: 5,
  },
};

function stripeKey() {
  const k = process.env.STRIPE_SECRET_KEY;
  return k && k.startsWith('sk_') ? k : null;
}

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
    const msg = data?.error?.message || `stripe_http_${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    throw err;
  }
  return data;
}

async function createSession(sku, quantity) {
  const item = SKUS[sku];
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('success_url', `${SITE}/prevenda/sucesso?session_id={CHECKOUT_SESSION_ID}`);
  p.set('cancel_url', `${SITE}/prevenda?checkout=cancelado`);
  p.set('locale', 'pt-BR');
  p.set('allow_promotion_codes', 'true');
  p.set('phone_number_collection[enabled]', 'true');
  p.set('shipping_address_collection[allowed_countries][0]', 'BR');
  p.set('line_items[0][quantity]', String(quantity));
  p.set('line_items[0][price_data][currency]', 'brl');
  p.set('line_items[0][price_data][unit_amount]', String(item.amount));
  p.set('line_items[0][price_data][product_data][name]', item.name);
  p.set('line_items[0][price_data][product_data][description]', item.description);
  p.set('payment_intent_data[description]', `${item.name} · growx.com.br/prevenda`);
  p.set('metadata[sku]', sku);
  p.set('metadata[source]', 'growx.com.br/prevenda');
  p.set('metadata[delivery]', '2026-11-20 · ExpoCannabis Brasil 2026');
  return stripeRequest('POST', '/checkout/sessions', p);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.growx.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const ip = clientIp(req);
  if (!rateLimit(ip, 20)) return res.status(429).json({ error: 'rate_limited' });

  if (!stripeKey()) {
    return res.status(503).json({
      error: 'stripe_not_configured',
      hint: 'Defina STRIPE_SECRET_KEY no ambiente do projeto Vercel.',
    });
  }

  if (req.method === 'GET') {
    const sessionId = String(req.query?.session_id || '');
    if (!/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
      return res.status(400).json({ error: 'invalid_session_id' });
    }
    try {
      const s = await stripeRequest('GET', `/checkout/sessions/${sessionId}`);
      return res.status(200).json({
        payment_status: s.payment_status,
        amount_total: s.amount_total,
        currency: s.currency,
        sku: s.metadata?.sku || null,
      });
    } catch (e) {
      return res.status(e.status === 404 ? 404 : 502).json({ error: 'stripe_error' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  const sku = String(body?.sku || '');
  const item = SKUS[sku];
  if (!item) return res.status(400).json({ error: 'invalid_sku', valid: Object.keys(SKUS) });

  const quantity = Math.min(Math.max(parseInt(body?.quantity, 10) || 1, 1), item.maxQty);

  try {
    const session = await createSession(sku, quantity);
    return res.status(200).json({ url: session.url, id: session.id });
  } catch (e) {
    console.error('[checkout] stripe error:', e.message);
    return res.status(502).json({ error: 'stripe_error', message: String(e.message).slice(0, 200) });
  }
}
