/**
 * /api/checkout — pagamento da pré-venda do Módulo Grow-X.
 *
 * POST { method: 'cartao' | 'pix' }
 *   cartao → Stripe Checkout, R$ 3.000 em até 12x  → { url }
 *   pix    → Mercado Pago Checkout Pro, R$ 2.800   → { url }
 * GET ?session_id=cs_...  ou  ?payment_id=123
 *   → status do pagamento pra página de confirmação.
 *
 * No cartão coletamos CPF, exigimos aceite do contrato de pré-venda e pedimos
 * pra Stripe emitir a fatura (que ela envia por e-mail ao comprador). Recursos
 * que a conta não suportar são desligados um a um em vez de derrubar a venda.
 *
 * Requer STRIPE_SECRET_KEY e MP_ACCESS_TOKEN. Sem a env do provider pedido
 * responde 503 — nunca simula pagamento.
 */
import { rateLimit, clientIp } from './_lib/ai.js';
import { documentoValido, tipoDocumento, digitos, emailValido } from './_lib/cpf.js';

export const config = { runtime: 'nodejs' };

const SITE = 'https://www.growx.com.br';
const STRIPE_API = 'https://api.stripe.com/v1';
const MP_API = 'https://api.mercadopago.com';

export const CONTRACT_VERSION = 'v1-2026-08-04';
const CONTRACT_URL = `${SITE}/prevenda/contrato`;
const ENTREGA = '20/11/2026';

const OFFER = {
  cartao: {
    amount: 300000, // R$ 3.000,00 em até 12x
    title: 'Módulo Grow-X — Pré-venda',
    description:
      'Central de automação indoor: 6 tomadas inteligentes, fotoperíodo com nascer e pôr do sol, ' +
      'rega por umidade do solo, sensores e app GXP (3 meses de Premium inclusos). ' +
      `Entrega a partir de ${ENTREGA}. Reembolso integral até o envio · 1 ano de garantia.`,
  },
  pix: {
    amount: 280000, // R$ 2.800,00 à vista
    title: 'Módulo Grow-X — Pré-venda (Pix)',
    description:
      'Central de automação indoor: 6 tomadas inteligentes, fotoperíodo com nascer e pôr do sol, ' +
      'rega por umidade do solo, sensores e app GXP (3 meses de Premium inclusos). ' +
      `Entrega a partir de ${ENTREGA}. Reembolso integral até o envio · 1 ano de garantia.`,
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
    err.param = data?.error?.param || '';
    throw err;
  }
  return data;
}

/** Recursos opcionais da sessão — desligados individualmente se a conta recusar. */
const OPTIONAL = ['installments', 'consent', 'invoice'];

function stripeParams(on, comprador) {
  const o = OFFER.cartao;
  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('success_url', `${SITE}/prevenda/sucesso?session_id={CHECKOUT_SESSION_ID}`);
  p.set('cancel_url', `${SITE}/prevenda?checkout=cancelado`);
  p.set('locale', 'pt-BR');
  p.set('allow_promotion_codes', 'true');
  p.set('customer_creation', 'always');
  p.set('phone_number_collection[enabled]', 'true');
  p.set('shipping_address_collection[allowed_countries][0]', 'BR');
  p.set('customer_email', comprador.email);

  p.set('line_items[0][quantity]', '1');
  p.set('line_items[0][price_data][currency]', 'brl');
  p.set('line_items[0][price_data][unit_amount]', String(o.amount));
  p.set('line_items[0][price_data][product_data][name]', o.title);
  p.set('line_items[0][price_data][product_data][description]', o.description);

  p.set('payment_intent_data[description]', `${o.title} · contrato ${CONTRACT_VERSION} · ${CONTRACT_URL}`);
  p.set('metadata[sku]', 'prevenda_cartao');
  p.set('metadata[source]', 'growx.com.br/prevenda');
  p.set('metadata[contract_version]', CONTRACT_VERSION);
  p.set('metadata[delivery]', ENTREGA);
  // Identificação do comprador: a Stripe não renderiza campo de CPF no Checkout,
  // então coletamos na nossa página. É o que autentica a área do cliente e o que
  // vai na nota fiscal.
  p.set('metadata[cpf]', comprador.cpf);
  p.set('metadata[nome]', comprador.nome);
  p.set('metadata[aceite_contrato]', 'true');
  p.set('metadata[aceite_em]', comprador.aceiteEm);

  p.set('custom_text[submit][message]',
    `Você reserva 1 Módulo Grow-X com entrega a partir de ${ENTREGA}, ` +
    `reembolso integral até o envio e 1 ano de garantia.`);

  // Aceite explícito do contrato, registrado pela Stripe na sessão
  if (on.consent) {
    p.set('consent_collection[terms_of_service]', 'required');
    // markdown é suportado aqui — vira link clicável pro nosso contrato
    p.set('custom_text[terms_of_service_acceptance][message]',
      `Li e aceito o [contrato de pré-venda do Módulo Grow-X](${CONTRACT_URL}) (${CONTRACT_VERSION}).`);
  }

  // Fatura hospedada — a Stripe envia o PDF por e-mail ao comprador.
  // invoice_data é aninhado dentro de invoice_creation (top-level é recusado).
  if (on.invoice) {
    p.set('invoice_creation[enabled]', 'true');
    p.set('invoice_creation[invoice_data][description]',
      `Pré-venda do Módulo Grow-X. Entrega a partir de ${ENTREGA}. ` +
      `Reembolso integral até o envio; 1 ano de garantia de fábrica.`);
    p.set('invoice_creation[invoice_data][footer]',
      `Grow-X Co. Tecnologias LTDA · growx.com.br · Contrato de pré-venda ${CONTRACT_VERSION}: ${CONTRACT_URL}`);
    p.set('invoice_creation[invoice_data][custom_fields][0][name]', 'Entrega a partir de');
    p.set('invoice_creation[invoice_data][custom_fields][0][value]', ENTREGA);
    p.set('invoice_creation[invoice_data][custom_fields][1][name]', 'Contrato');
    p.set('invoice_creation[invoice_data][custom_fields][1][value]', CONTRACT_VERSION);
  }

  if (on.installments) p.set('payment_method_options[card][installments][enabled]', 'true');
  return p;
}

/** Mapeia a mensagem de erro da Stripe para o recurso que precisa ser desligado. */
function featureFromError(msg, param) {
  const t = `${msg} ${param}`.toLowerCase();
  if (t.includes('installment')) return 'installments';
  if (t.includes('terms_of_service') || t.includes('consent')) return 'consent';
  if (t.includes('invoice')) return 'invoice';
  return null;
}

async function createStripeSession(comprador) {
  const on = Object.fromEntries(OPTIONAL.map((f) => [f, true]));
  const desligados = [];

  for (let i = 0; i <= OPTIONAL.length; i++) {
    try {
      const session = await stripeRequest('POST', '/checkout/sessions', stripeParams(on, comprador));
      if (desligados.length) {
        console.warn('[checkout] recursos desligados pela conta Stripe:', desligados.join(', '));
      }
      return session;
    } catch (e) {
      const f = featureFromError(e.message, e.param);
      if (!f || !on[f]) throw e; // erro que não sabemos contornar → falha honesta
      on[f] = false;
      desligados.push(f);
    }
  }
  throw new Error('stripe_session_unavailable');
}

async function createMpPreference(comprador) {
  const o = OFFER.pix;
  const [primeiro, ...resto] = comprador.nome.split(/\s+/);
  const r = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${mpToken()}`, 'Content-Type': 'application/json' },
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
      payer: {
        name: primeiro,
        surname: resto.join(' ') || primeiro,
        email: comprador.email,
        identification: { type: tipoDocumento(comprador.cpf) || 'CPF', number: comprador.cpf },
      },
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
      notification_url: `${SITE}/api/mp-webhook?source=ipn`,
      statement_descriptor: 'GROWX MODULO',
      external_reference: 'gx-modulo-prevenda',
      metadata: {
        sku: 'prevenda_pix',
        source: 'growx.com.br/prevenda',
        contract_version: CONTRACT_VERSION,
        delivery: ENTREGA,
        cpf: comprador.cpf,
        nome: comprador.nome,
        // O payer.email só sugere; o pagamento fica com o e-mail da CONTA do
        // Mercado Pago do comprador. Sem gravar aqui o e-mail que ele digitou,
        // a área do cliente nunca casaria o pedido dele.
        email: comprador.email,
        aceite_contrato: 'true',
        aceite_em: comprador.aceiteEm,
      },
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
          payment_status: s.payment_status,
          amount_total: s.amount_total,
          currency: s.currency,
          sku: s.metadata?.sku || 'prevenda_cartao',
          reference: s.id,
          email: s.customer_details?.email || null,
          contract_accepted: s.consent?.terms_of_service === 'accepted',
          contract_version: s.metadata?.contract_version || null,
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
          reference: String(pmt.id),
          email: pmt.payer?.email || null,
          contract_version: pmt.metadata?.contract_version || null,
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

  // Identificação do comprador — exigida pelo contrato, pela nota fiscal e pela
  // área do cliente. Validada aqui de novo, nunca só no browser.
  const nome = String(body?.nome || '').trim().replace(/\s+/g, ' ').slice(0, 120);
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 160);
  const cpf = digitos(body?.cpf);

  if (nome.split(' ').filter(Boolean).length < 2) return res.status(400).json({ error: 'nome_incompleto' });
  if (!emailValido(email)) return res.status(400).json({ error: 'email_invalido' });
  if (!documentoValido(cpf)) return res.status(400).json({ error: 'documento_invalido' });
  if (body?.aceite !== true) return res.status(400).json({ error: 'aceite_obrigatorio' });

  const comprador = { nome, email, cpf, aceiteEm: new Date().toISOString() };

  try {
    if (method === 'cartao' || method === 'prevenda') {
      if (!stripeKey()) {
        return res.status(503).json({ error: 'stripe_not_configured', hint: 'Defina STRIPE_SECRET_KEY no Vercel.' });
      }
      const session = await createStripeSession(comprador);
      return res.status(200).json({ url: session.url, id: session.id, provider: 'stripe' });
    }
    if (method === 'pix') {
      if (!mpToken()) {
        return res.status(503).json({ error: 'mercadopago_not_configured', hint: 'Defina MP_ACCESS_TOKEN no Vercel.' });
      }
      const pref = await createMpPreference(comprador);
      return res.status(200).json({ url: pref.init_point, id: pref.id, provider: 'mercadopago' });
    }
    return res.status(400).json({ error: 'invalid_method', valid: ['cartao', 'pix'] });
  } catch (e) {
    console.error('[checkout] provider error:', e.message);
    return res.status(502).json({ error: 'provider_error', message: String(e.message).slice(0, 200) });
  }
}
