/** Entregas externas usadas exclusivamente pelo outbox dos webhooks. */
import { OFERTA, brl, contratoPath } from '../../src/lib/oferta.js';

const SITE = 'https://www.growx.com.br';
const FROM = 'Grow-X <no-reply@growx.com.br>';
const REPLY_TO = 'growx@growx.com.br';
const DELIVERY_TIMEOUT_MS = 8_000;

const esc = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const maskDocument = (document) => {
  const digits = String(document || '').replace(/\D/g, '');
  if (digits.length === 11) return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`;
  if (digits.length === 14) return `**.***.***/${digits.slice(8, 12)}-${digits.slice(12)}`;
  return '—';
};

async function fetchTimed(url, options, fetchImpl) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function sendResend({ to, subject, html, idempotencyKey, fetchImpl = fetch }) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !idempotencyKey || !to) return { ok: false };
  try {
    const response = await fetchTimed('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: REPLY_TO,
        subject,
        html,
      }),
    }, fetchImpl);
    if (!response.ok) {
      console.error('[webhook-delivery] Resend recusou:', response.status);
      return { ok: false };
    }
    try {
      const data = await response.json();
      return { ok: true, id: data?.id || null };
    } catch {
      return { ok: true };
    }
  } catch (error) {
    console.error('[webhook-delivery] Resend indisponível:', error?.name || 'Error');
    return { ok: false };
  }
}

const row = (label, value) => `<tr>
  <td style="padding:8px 0;color:#75837b;font-size:13px">${esc(label)}</td>
  <td style="padding:8px 0;color:#101512;font-size:13px;text-align:right">${esc(value || '—')}</td>
</tr>`;

export async function sendBuyerConfirmationEmail(data, { idempotencyKey, fetchImpl } = {}) {
  if (!data?.email) return { ok: false };
  const firstName = String(data.name || '').trim().split(/\s+/)[0] || 'Olá';
  const customerCode = data.reservationCode || data.reference;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:30px 18px">
    <div style="background:#080b09;border-radius:16px;padding:26px">
      <p style="margin:0;color:#4ade80;font-size:11px;letter-spacing:2px;font-weight:700">PEDIDO CONFIRMADO</p>
      <h1 style="margin:10px 0 0;color:#fff;font-size:25px">${esc(firstName)}, sua unidade está reservada.</h1>
      <p style="color:#a7b6ad;line-height:1.6">Recebemos o pagamento do Módulo Grow-X. Guarde o código abaixo.</p>
    </div>
    <div style="background:#fff;border-radius:16px;padding:22px 26px;margin-top:14px">
      <table style="width:100%;border-collapse:collapse">
        ${row('Código da reserva', customerCode)}
        ${customerCode !== data.reference ? row('Referência do pagamento', data.reference) : ''}
        ${row('Valor pago', brl(data.amountCents || 0))}
        ${row('Forma', data.method)}
        ${row('Documento', maskDocument(data.document))}
        ${data.address ? row('Entrega', data.address) : ''}
        ${row('Entrega a partir de', OFERTA.entregaBR)}
        ${row('Contrato', data.contractVersion || OFERTA.contratoVersao)}
      </table>
      <p style="margin:18px 0 0"><a href="${SITE}/prevenda/pedido" style="display:inline-block;background:#4ade80;color:#05130a;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">Acompanhar pedido</a></p>
      <p style="color:#75837b;font-size:13px;line-height:1.6">Reembolso integral até o envio. Defeitos de fabricação têm cobertura de 12 meses, conforme o contrato. <a href="${SITE}${esc(contratoPath(data.contractVersion || OFERTA.contratoVersao))}" style="color:#17843d;font-weight:700">Guardar a cópia contratual vinculada ao pedido</a>.</p>
    </div>
    <p style="color:#8a9a91;font-size:12px;text-align:center">GROW-X CO. TECNOLOGIAS LTDA · CNPJ 59.183.820/0001-09<br>Dúvidas: growx@growx.com.br</p>
  </div></body></html>`;

  return sendResend({
    to: data.email,
    subject: `Pedido confirmado — Módulo Grow-X (${customerCode})`,
    html,
    idempotencyKey,
    fetchImpl,
  });
}

export async function sendBuyerLateRefundEmail(data, { idempotencyKey, fetchImpl } = {}) {
  if (!data?.email) return { ok: true, skipped: true };
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:30px 18px">
    <div style="background:#080b09;border-radius:16px;padding:26px">
      <p style="margin:0;color:#fbbf24;font-size:11px;letter-spacing:2px;font-weight:700">REEMBOLSO INTEGRAL</p>
      <h1 style="margin:10px 0 0;color:#fff;font-size:25px">Seu Pix chegou após a reserva expirar.</h1>
      <p style="color:#a7b6ad;line-height:1.6">A unidade já havia sido atribuída a outra reserva. Para preservar o teto do lote, confirmamos o reembolso integral de ${esc(brl(data.amountCents || 0))} no Mercado Pago.</p>
    </div>
    <div style="background:#fff;border-radius:16px;padding:22px 26px;margin-top:14px">
      <table style="width:100%;border-collapse:collapse">
        ${row('Pagamento', data.reference)}
        ${row('Reembolso', data.refundReference)}
        ${row('Valor devolvido', brl(data.amountCents || 0))}
      </table>
      <p style="color:#75837b;font-size:13px;line-height:1.6">O prazo de crédito na conta do pagador é definido pelo Mercado Pago. Se precisar de ajuda, responda este e-mail.</p>
    </div>
  </div></body></html>`;
  return sendResend({
    to: data.email,
    subject: `Reembolso integral confirmado — Módulo Grow-X (${data.reference})`,
    html,
    idempotencyKey,
    fetchImpl,
  });
}

const FINANCIAL_COPY = Object.freeze({
  refund_pending: {
    eyebrow: 'REEMBOLSO EM PROCESSAMENTO',
    headline: 'Seu reembolso foi iniciado.',
    body: 'A solicitação foi registrada pelo provedor, mas o crédito ainda não está confirmado. O prazo depende do meio de pagamento e da instituição financeira.',
    subject: 'Reembolso iniciado',
  },
  refunded: {
    eyebrow: 'REEMBOLSO CONFIRMADO',
    headline: 'O provedor concluiu seu reembolso.',
    body: 'O valor foi devolvido pelo provedor ao meio de pagamento original. A data em que ele aparece na conta ou fatura depende da instituição financeira.',
    subject: 'Reembolso confirmado',
  },
  partially_refunded: {
    eyebrow: 'REEMBOLSO PARCIAL CONFIRMADO',
    headline: 'Parte do pagamento foi reembolsada.',
    body: 'O provedor confirmou a devolução parcial indicada abaixo. Qualquer saldo restante continua separado deste reembolso.',
    subject: 'Reembolso parcial confirmado',
  },
  refund_failed: {
    eyebrow: 'REEMBOLSO NÃO CONCLUÍDO',
    headline: 'O provedor não concluiu o reembolso.',
    body: 'Nenhum crédito é tratado como confirmado por este aviso. Nossa equipe recebeu a atualização para acompanhar uma alternativa segura.',
    subject: 'Atualização necessária no reembolso',
  },
  disputed: {
    eyebrow: 'CONTESTAÇÃO EM ANDAMENTO',
    headline: 'A contestação do pagamento está em análise.',
    body: 'Este aviso registra o estado informado pelo provedor. Ele não representa decisão final nem confirmação de reembolso.',
    subject: 'Contestação em andamento',
  },
  charged_back: {
    eyebrow: 'CONTESTAÇÃO CONCLUÍDA',
    headline: 'O provedor concluiu a contestação com retirada dos fundos.',
    body: 'Este estado financeiro não libera nem cancela automaticamente a unidade física. Fale com a Grow-X se precisar conciliar o pedido.',
    subject: 'Contestação concluída',
  },
});

function financialStatusCode(data) {
  const direct = String(data?.statusCode || data?.status || '').trim().toLowerCase();
  if (FINANCIAL_COPY[direct]) return direct;
  if (direct.includes('parcial')) return 'partially_refunded';
  if (direct.includes('não conclu') || direct.includes('falh')) return 'refund_failed';
  if (direct.includes('iniciado') || direct.includes('process')) return 'refund_pending';
  if (direct.includes('reembols')) return 'refunded';
  if (direct.includes('chargeback') || direct.includes('perdida')) return 'charged_back';
  if (direct.includes('contest')) return 'disputed';
  return null;
}

/** Atualização financeira genérica e honesta para Stripe/MP. */
export async function sendBuyerFinancialUpdateEmail(data, { idempotencyKey, fetchImpl } = {}) {
  if (!data?.email) return { ok: true, skipped: true };
  const statusCode = financialStatusCode(data);
  const copy = FINANCIAL_COPY[statusCode];
  if (!copy) return { ok: false };
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7f5;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:30px 18px">
    <div style="background:#080b09;border-radius:16px;padding:26px">
      <p style="margin:0;color:#fbbf24;font-size:11px;letter-spacing:2px;font-weight:700">${esc(copy.eyebrow)}</p>
      <h1 style="margin:10px 0 0;color:#fff;font-size:25px">${esc(copy.headline)}</h1>
      <p style="color:#a7b6ad;line-height:1.6">${esc(copy.body)}</p>
    </div>
    <div style="background:#fff;border-radius:16px;padding:22px 26px;margin-top:14px">
      <table style="width:100%;border-collapse:collapse">
        ${row('Provedor', data.provider)}
        ${row('Referência', data.reference)}
        ${row('Valor desta atualização', brl(data.amountCents || 0))}
        ${row('Situação', data.status)}
        ${data.contractVersion ? row('Contrato', data.contractVersion) : ''}
        ${data.statusDetail ? row('Detalhe', data.statusDetail) : ''}
      </table>
      <p style="color:#75837b;font-size:13px;line-height:1.6">Se precisar de ajuda, responda este e-mail. Não envie dados de cartão por e-mail.</p>
    </div>
  </div></body></html>`;
  return sendResend({
    to: data.email,
    subject: `${copy.subject} — Módulo Grow-X (${data.reference})`,
    html,
    idempotencyKey,
    fetchImpl,
  });
}

export async function sendInternalSaleEmail(data, { idempotencyKey, fetchImpl } = {}) {
  const inbox = process.env.LEAD_INBOX_EMAIL || 'growx@growx.com.br';
  const status = String(data.status || 'ATUALIZAÇÃO').toUpperCase();
  const html = `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#101512">
    <h1 style="font-size:20px">${esc(status)} · Módulo Grow-X</h1>
    <table style="width:100%;max-width:560px;border-collapse:collapse">
      ${row('Provedor', data.provider)}
      ${row('Forma', data.method)}
      ${row('Valor', brl(data.amountCents || 0))}
      ${row('Moeda', String(data.currency || 'BRL').toUpperCase())}
      ${data.sku ? row('SKU', data.sku) : ''}
      ${data.contractVersion ? row('Contrato', data.contractVersion) : ''}
      ${row('Referência', data.reference)}
      ${row('Nome', data.name)}
      ${row('E-mail', data.email)}
      ${row('Telefone', data.phone)}
      ${row('Documento', maskDocument(data.document))}
      ${data.statusDetail ? row('Detalhe financeiro', data.statusDetail) : ''}
      ${row('Evento', data.eventId)}
      ${row('Criado em', data.eventCreatedAt)}
    </table>
  </body></html>`;
  return sendResend({
    to: inbox,
    subject: `${status} Módulo Grow-X · ${brl(data.amountCents || 0)} · ${data.reference}`,
    html,
    idempotencyKey,
    fetchImpl,
  });
}

/** Slack é opcional; o outbox faz a deduplicação no nosso lado. */
export async function sendSlackSaleNotification(data, { fetchImpl = fetch } = {}) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { ok: true, skipped: true };
  const detail = data.statusDetail ? ` · ${data.statusDetail}` : '';
  const text = `${data.status} Módulo Grow-X · ${brl(data.amountCents || 0)} · ${data.reference}${detail} · evento ${data.eventId}`;
  try {
    const response = await fetchTimed(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }, fetchImpl);
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

/**
 * Alerta obrigatório de dead-letter. Recebe somente metadados técnicos já
 * pseudonimizados pelo outbox; nunca recebe payload, nome, e-mail, documento,
 * telefone ou endereço do comprador.
 */
export async function sendWebhookDeadLetterAlert(record, { idempotencyKey, fetchImpl } = {}) {
  const inbox = process.env.PREVENDA_ALERT_EMAIL
    || process.env.LEAD_INBOX_EMAIL
    || 'growx@growx.com.br';
  if (!record?.pk || !record?.provider || !record?.channel || !idempotencyKey) {
    return { ok: false };
  }
  const html = `<!doctype html><html lang="pt-BR"><body style="font-family:Arial,sans-serif;color:#101512">
    <h1 style="font-size:20px;color:#b91c1c">Dead-letter na pré-venda Grow-X</h1>
    <p>Um efeito de webhook não pôde ser reexecutado com segurança e exige intervenção operacional.</p>
    <table style="width:100%;max-width:620px;border-collapse:collapse">
      ${row('Provedor', record.provider)}
      ${row('Canal', record.channel)}
      ${row('Tipo', record.recordType)}
      ${row('Referência técnica', record.providerReference || 'ausente')}
      ${row('Hash do evento', record.eventHash)}
      ${row('Tentativas', record.attempts)}
      ${row('Motivo seguro', record.lastError || 'redrive não seguro')}
    </table>
    <p>Não marque o efeito como concluído sem reconciliar o objeto canônico no provedor e o ledger DynamoDB.</p>
  </body></html>`;
  return sendResend({
    to: inbox,
    subject: `AÇÃO OBRIGATÓRIA · webhook ${record.provider}/${record.channel}`,
    html,
    idempotencyKey,
    fetchImpl,
  });
}
