/**
 * POST /api/pedido  { email, cpf }
 * Área do cliente da pré-venda: consulta o pedido direto na Stripe e no
 * Mercado Pago (eles são a fonte da verdade — não há cópia em banco).
 *
 * É POST de propósito: CPF nunca trafega em query string.
 * Dupla checagem e-mail + CPF quando o CPF foi coletado no checkout.
 * Rate limit apertado — evita varredura de e-mails.
 */
import { rateLimit, clientIp } from './_lib/ai.js';

export const config = { runtime: 'nodejs' };

const STRIPE_API = 'https://api.stripe.com/v1';
const MP_API = 'https://api.mercadopago.com';
const MP_REF = 'gx-modulo-prevenda';

/** Marcos de produção — iguais pra todo o lote, que embarca junto em 20/11. */
export const ETAPAS = [
  { id: 'confirmado', titulo: 'Pedido confirmado', desde: '2026-08-04', detalhe: 'Pagamento aprovado e reserva registrada no lote de lançamento.' },
  { id: 'producao', titulo: 'Produção do lote', desde: '2026-09-15', detalhe: 'Fabricação das placas e injeção dos gabinetes.' },
  { id: 'montagem', titulo: 'Montagem e testes', desde: '2026-10-20', detalhe: 'Montagem final e bancada de QA unidade a unidade.' },
  { id: 'expedicao', titulo: 'Expedição', desde: '2026-11-10', detalhe: 'Embalagem e emissão da nota fiscal.' },
  { id: 'entrega', titulo: 'Entrega', desde: '2026-11-20', detalhe: 'Envio ao endereço cadastrado ou retirada na ExpoCannabis Brasil.' },
];

export function etapaAtual(agora = Date.now()) {
  let atual = ETAPAS[0].id;
  for (const e of ETAPAS) {
    if (agora >= Date.parse(`${e.desde}T00:00:00-03:00`)) atual = e.id;
  }
  return atual;
}

const digitos = (v) => String(v || '').replace(/\D/g, '');

/** Status dos provedores em português — nunca vaza rótulo cru pra tela. */
const STATUS = {
  paid: 'pago', approved: 'pago',
  unpaid: 'aguardando pagamento', pending: 'aguardando pagamento',
  in_process: 'em análise', in_mediation: 'em análise', authorized: 'em análise',
  no_payment_required: 'pago',
  rejected: 'recusado', cancelled: 'cancelado', canceled: 'cancelado',
  refunded: 'reembolsado', charged_back: 'estornado',
};
const traduzStatus = (s) => STATUS[String(s || '').toLowerCase()] || 'em processamento';

/** Valida CPF pelos dígitos verificadores — barra lixo antes de bater na API. */
function cpfValido(cpf) {
  const c = digitos(cpf);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (const [len, pos] of [[9, 10], [10, 11]]) {
    let soma = 0;
    for (let i = 0; i < len; i++) soma += Number(c[i]) * (pos - i);
    let dv = (soma * 10) % 11;
    if (dv === 10) dv = 0;
    if (dv !== Number(c[len])) return false;
  }
  return true;
}

const mascaraCpf = (cpf) => {
  const c = digitos(cpf);
  return c.length === 11 ? `***.***.${c.slice(6, 9)}-${c.slice(9)}` : null;
};

async function stripeGet(path) {
  const r = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

/** Pedidos no cartão: clientes com aquele e-mail → sessões de checkout deles. */
async function buscarStripe(email, cpf) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !key.startsWith('sk_')) return { ok: false, pedidos: [] };

  const clientes = await stripeGet(`/customers?email=${encodeURIComponent(email)}&limit=10`);
  if (!clientes) return { ok: false, pedidos: [] };
  const encontrados = [];

  for (const c of clientes?.data || []) {
    // CPF fica em customer_details da sessão e/ou no cadastro do cliente
    const taxIds = await stripeGet(`/customers/${c.id}/tax_ids?limit=10`);
    const cpfCliente = digitos((taxIds?.data || []).find((t) => t.type === 'br_cpf')?.value);

    const sessoes = await stripeGet(`/checkout/sessions?customer=${c.id}&limit=20`);
    for (const s of sessoes?.data || []) {
      if (s.metadata?.source !== 'growx.com.br/prevenda') continue;

      // ordem de confiança: o que nós coletamos > tax id da sessão > cadastro do cliente
      const cpfSessao = digitos((s.customer_details?.tax_ids || []).find((t) => t.type === 'br_cpf')?.value);
      const cpfPedido = digitos(s.metadata?.cpf) || cpfSessao || cpfCliente;
      if (cpfPedido && cpfPedido !== cpf) continue; // CPF registrado e diferente → não é dele

      encontrados.push({
        provedor: 'stripe',
        referencia: s.id,
        criado_em: new Date((s.created || 0) * 1000).toISOString(),
        status: traduzStatus(s.payment_status),
        valor_centavos: s.amount_total,
        moeda: (s.currency || 'brl').toUpperCase(),
        forma: 'Cartão (até 12x)',
        nome: s.customer_details?.name || s.metadata?.nome || c.name || null,
        cpf_mascarado: cpfPedido ? mascaraCpf(cpfPedido) : null,
        cpf_verificado: Boolean(cpfPedido),
        contrato_aceito: s.consent?.terms_of_service === 'accepted' || s.metadata?.aceite_contrato === 'true',
        contrato_versao: s.metadata?.contract_version || null,
        fatura_url: s.invoice ? null : null,
      });
    }
  }
  return { ok: true, pedidos: encontrados };
}

/** Pedidos no Pix: busca pelos pagamentos da pré-venda e filtra por e-mail/CPF. */
async function buscarMercadoPago(email, cpf) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return { ok: false, pedidos: [] };

  const r = await fetch(
    `${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(MP_REF)}&sort=date_created&criteria=desc&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) {
    // Falha aqui esconderia pedidos Pix do cliente — precisa ser visível, não silenciosa.
    console.error('[pedido] busca Mercado Pago falhou:', r.status);
    return { ok: false, pedidos: [] };
  }
  const data = await r.json().catch(() => null);

  const pedidos = (data?.results || [])
    .filter((p) => {
      const mailOk = String(p.payer?.email || '').toLowerCase() === email;
      const cpfPedido = digitos(p.metadata?.cpf) || digitos(p.payer?.identification?.number);
      return mailOk && (!cpfPedido || cpfPedido === cpf);
    })
    .map((p) => {
      const cpfPedido = digitos(p.metadata?.cpf) || digitos(p.payer?.identification?.number);
      return {
        provedor: 'mercadopago',
        referencia: String(p.id),
        criado_em: p.date_created || null,
        status: traduzStatus(p.status),
        valor_centavos: Math.round((p.transaction_amount || 0) * 100),
        moeda: (p.currency_id || 'BRL').toUpperCase(),
        forma: 'Pix',
        nome: p.metadata?.nome || [p.payer?.first_name, p.payer?.last_name].filter(Boolean).join(' ') || null,
        cpf_mascarado: cpfPedido ? mascaraCpf(cpfPedido) : null,
        cpf_verificado: Boolean(cpfPedido),
        contrato_aceito: true, // aceite obrigatório na página antes de abrir o checkout Pix
        contrato_versao: p.metadata?.contract_version || null,
        fatura_url: null,
      };
    });

  return { ok: true, pedidos };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.growx.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  // limite baixo: consulta de dados pessoais
  if (!rateLimit(`pedido:${clientIp(req)}`, 10)) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  const email = String(body?.email || '').trim().toLowerCase();
  const cpf = digitos(body?.cpf);

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'email_invalido' });
  }
  if (!cpfValido(cpf)) {
    return res.status(400).json({ error: 'cpf_invalido' });
  }

  try {
    const vazio = { ok: false, pedidos: [] };
    const [cartao, pix] = await Promise.all([
      buscarStripe(email, cpf).catch(() => vazio),
      buscarMercadoPago(email, cpf).catch(() => vazio),
    ]);

    const pedidos = [...cartao.pedidos, ...pix.pedidos]
      .sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));

    return res.status(200).json({
      encontrados: pedidos.length,
      pedidos,
      etapas: ETAPAS,
      etapa_atual: etapaAtual(),
      entrega_prevista: '2026-11-20',
      // Se um provedor não respondeu, o cliente precisa saber que a busca foi
      // parcial — em vez de ver "nenhum pedido" e achar que a compra sumiu.
      fontes: { cartao: cartao.ok, pix: pix.ok },
      busca_parcial: !cartao.ok || !pix.ok,
    });
  } catch (e) {
    console.error('[pedido] erro:', e.message);
    return res.status(502).json({ error: 'consulta_indisponivel' });
  }
}
