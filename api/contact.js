/**
 * POST /api/contact
 * Endpoint dedicado de captura de lead (substitui formsubmit.co quando configurado).
 * Body: payload do LeadForm (name, email, phone, company, segment, message,
 * _form, _segment e consent para prevenda-lista)
 *
 * Comportamento:
 *  1. Valida e normaliza dados
 *  2. Faz lead enrichment via IA (Gemini → fallback OpenAI)
 *  3. Encaminha em paralelo para os destinos configurados. Resend é o canal
 *     primário quando RESEND_API_KEY existe; CRM, Slack, FormSubmit e SPI são
 *     redundâncias independentes.
 *  4. Retorna apenas aceitação síncrona do destino. Não afirma entrega nem
 *     persistência que a rota não consegue comprovar.
 */
import { randomUUID } from 'node:crypto';

import { chatComplete, rateLimit, clientIp } from './_lib/ai.js';
import { buildInterestConsent, matchesInterestConsent } from '../shared/interest-consent.js';

export const config = { runtime: 'nodejs' };

const LOGGABLE_FORMS = new Set([
  'contact',
  'demo-b2b',
  'newsletter',
  'partner-application',
  'prevenda-lista',
  'spi-enterprise-contact',
  'waitlist-app',
]);

const INTEREST_FORM = 'prevenda-lista';
const POST_TIMEOUT_MS = 5_000;
const DEFAULT_INBOX = 'growx@growx.com.br';
const RESEND_FROM = 'Grow-X <no-reply@growx.com.br>';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const safeFormForLog = (value) => {
  const candidate = String(value || '').trim().toLowerCase();
  return LOGGABLE_FORMS.has(candidate) ? candidate : 'unknown';
};

const ENRICH_PROMPT = `Você é SDR sênior B2B/B2C agro. Recebe lead via formulário site Grow-X.
Retorne SOMENTE JSON válido (sem markdown, sem fences):
{
  "intent": "demo"|"pricing"|"partner"|"patient"|"press"|"support"|"investor"|"other",
  "segment_refined": "industrial"|"cooperativa"|"producer"|"cultivo"|"cannabis_medicinal"|"integrator"|"other",
  "score": 0-100,
  "priority": "hot"|"warm"|"cold",
  "summary": "1 frase pt-BR sobre o lead",
  "next_steps": ["string"],
  "talking_points": ["string"],
  "route_to": "demo-team"|"app-waitlist"|"partner-team"|"press-team"|"support"|"investor"|"general"
}
Critérios: score>=70=hot (decisor + dor + urgência); 40-69=warm; <40=cold.`;

async function enrichLead(lead) {
  try {
    const r = await chatComplete({
      messages: [
        { role: 'system', content: ENRICH_PROMPT },
        { role: 'user', content: `Lead:\n${JSON.stringify(lead, null, 2)}\n\nClassifique em JSON estrito.` },
      ],
      temperature: 0.2,
    });
    const m = r.text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch {}
  return null;
}

async function forwardToWebhook(url, payload) {
  if (!url) return false;
  try {
    const r = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return r.ok;
  } catch { return false; }
}

async function forwardToFormsubmit(email, payload) {
  if (!email) return false;
  try {
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
      method: 'POST',
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // FormSubmit blocks calls without browser-origin headers ("Make sure you
        // open this page through a web server"). When called server-side from a
        // Vercel function, we must spoof the Origin/Referer so it accepts.
        Origin: 'https://www.growx.com.br',
        Referer: 'https://www.growx.com.br/contato',
        'User-Agent': 'Grow-X-Site/1.0 (+https://www.growx.com.br)',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return false;
    // FormSubmit returns 200 even on logical failures — verify success flag
    try {
      const data = await r.json();
      return data?.success === true || data?.success === 'true';
    } catch {
      return true;  // 200 + non-JSON → assume OK
    }
  } catch { return false; }
}

const line = (label, value) => `${label}: ${String(value || '—').replace(/[\r\n]+/g, ' ').trim()}`;

function leadInboxText(lead) {
  return [
    line('Formulário', lead._form),
    line('Nome', lead.name),
    line('E-mail', lead.email),
    line('WhatsApp', lead.phone),
    line('Empresa', lead.company),
    line('Segmento', lead.segment || lead._segment),
    line('Mensagem', lead.message),
    line('Origem', lead._path || lead._source),
    line('Correlação', lead._correlation_id),
    lead.consent && line('Consentimento', [
      lead.consent.status,
      lead.consent.purpose,
      lead.consent.scope,
      lead.consent.channels.join('+'),
      lead.consent.notice_version,
      lead.consent.captured_at,
    ].join(' | ')),
  ].filter(Boolean).join('\n');
}

/**
 * Aceitação HTTP do Resend prova apenas que o provedor recebeu a solicitação.
 * Entrega na caixa postal e persistência em CRM continuam fora desta resposta.
 */
async function forwardToResend(payload) {
  const key = process.env.RESEND_API_KEY;
  const inbox = String(
    process.env.LEAD_INBOX_EMAIL || process.env.PREVENDA_ALERT_EMAIL || DEFAULT_INBOX,
  ).trim();
  if (!key || !EMAIL.test(inbox)) return false;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [inbox],
        reply_to: payload.email,
        subject: String(payload._subject || 'Novo interesse Grow-X').replace(/[\r\n]+/g, ' '),
        text: leadInboxText(payload),
      }),
    });
    return r.ok;
  } catch { return false; }
}

/**
 * SPI é uma redundância opt-in. Não existe fallback hardcoded: um endpoint
 * legado ou não autenticado não pode ser tratado como captura confiável.
 */
async function forwardToBackend(payload) {
  const url = process.env.SPI_BACKEND_URL;
  if (!url) return false;
  try {
    const r = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return r.ok || r.status === 202;
  } catch { return false; }
}

function buildSlackBlock(lead, enrichment) {
  const flag = enrichment?.priority === 'hot' ? '🔥' : enrichment?.priority === 'warm' ? '⚡' : '🌱';
  return {
    text: `${flag} Novo lead Grow-X · ${enrichment?.priority?.toUpperCase() ?? 'NEW'} · score ${enrichment?.score ?? '?'}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${flag} Novo lead · ${lead._form ?? 'site'}` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Nome:*\n${lead.name ?? '—'}` },
          { type: 'mrkdwn', text: `*Email:*\n${lead.email ?? '—'}` },
          { type: 'mrkdwn', text: `*Empresa:*\n${lead.company ?? '—'}` },
          { type: 'mrkdwn', text: `*Cargo:*\n${lead.role ?? '—'}` },
          { type: 'mrkdwn', text: `*Segmento:*\n${enrichment?.segment_refined ?? lead._segment ?? '—'}` },
          { type: 'mrkdwn', text: `*Score:*\n${enrichment?.score ?? '?'} (${enrichment?.priority ?? 'new'})` },
        ],
      },
      enrichment?.summary && {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Resumo IA:*\n${enrichment.summary}` },
      },
      enrichment?.talking_points?.length && {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Pontos de conversa:*\n• ${enrichment.talking_points.join('\n• ')}` },
      },
      enrichment?.next_steps?.length && {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Próximos passos:*\n• ${enrichment.next_steps.join('\n• ')}` },
      },
      lead.message && {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Mensagem original:*\n>${lead.message.slice(0, 500)}` },
      },
    ].filter(Boolean),
  };
}

export default async function handler(req, res) {
  const correlationId = randomUUID();
  res.setHeader('X-Correlation-Id', correlationId);
  res.setHeader('Access-Control-Allow-Origin', 'https://www.growx.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const ip = clientIp(req);
  if (!rateLimit(ip, 30)) return res.status(429).json({ error: 'rate_limited' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'invalid_json' }); }

  if (!body?.email || !body?.name) {
    return res.status(400).json({ error: 'missing_required_fields', required: ['name', 'email'] });
  }

  const form = String(body._form || 'contact').slice(0, 50);
  const normalizedEmail = String(body.email).trim().toLowerCase().slice(0, 200);
  if (!EMAIL.test(normalizedEmail)) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (form === INTEREST_FORM && !matchesInterestConsent(body.consent)) {
    return res.status(400).json({ error: 'invalid_interest_consent' });
  }

  const capturedAt = new Date().toISOString();

  const lead = {
    name: String(body.name).trim().slice(0, 200),
    email: normalizedEmail,
    phone: String(body.phone || '').slice(0, 50),
    company: String(body.company || '').slice(0, 200),
    role: String(body.role || '').slice(0, 200),
    segment: String(body.segment || body._segment || '').slice(0, 100),
    companySize: String(body.companySize || '').slice(0, 100),
    urgency: String(body.urgency || '').slice(0, 100),
    profile: String(body.profile || '').slice(0, 100),
    subject: String(body.subject || '').slice(0, 200),
    message: String(body.message || '').slice(0, 2000),
    _form: form,
    _segment: String(body._segment || '').slice(0, 50),
    _source: String(body._source || 'site').slice(0, 50),
    _path: String(body._path || '').slice(0, 200),
    _referrer: String(body._referrer || '').slice(0, 500),
    utm_source: String(body.utm_source || '').slice(0, 100),
    utm_medium: String(body.utm_medium || '').slice(0, 100),
    utm_campaign: String(body.utm_campaign || '').slice(0, 100),
    _ts: capturedAt,
    _correlation_id: correlationId,
    ...(form === INTEREST_FORM ? {
      consent: { ...buildInterestConsent(), captured_at: capturedAt },
    } : {}),
  };

  // Enrichment AI (não-bloqueante visualmente, mas await pra incluir no payload final)
  const enrichment = await enrichLead(lead);

  // Build email subject with priority flag + form type + company — identificável na inbox
  const flag = enrichment?.priority === 'hot' ? '🔥'
             : enrichment?.priority === 'warm' ? '⚡'
             : '🌱';
  const formLabel = ['demo-b2b', 'spi-enterprise-contact'].includes(lead._form) ? 'SPI-CORP'
                  : lead._form === 'contact'  ? 'CONTATO'
                  : lead._form === 'waitlist-app' ? 'LISTA-APP'
                  : (lead._form || 'lead').toUpperCase();
  const score = enrichment?.score != null ? ` · score ${enrichment.score}` : '';
  const subjectLine = `${flag} [${formLabel}] ${lead.name}${lead.company ? ' · ' + lead.company : ''}${score}`;

  const enriched = {
    ...lead,
    _enrichment: enrichment,
    // FormSubmit-specific overrides for human-readable inbox
    _subject: subjectLine,
    _replyto: lead.email,
    _template: 'table',
    _captcha: 'false',
  };

  // Routing destinations (todos paralelos e aguardados até o timeout curto).
  // ORDER MATTERS in `results` array — used for the `forwarded_to` count.
  const destinations = [
    forwardToResend(enriched),
    forwardToWebhook(process.env.CRM_WEBHOOK_URL, enriched),
    forwardToWebhook(process.env.SLACK_WEBHOOK_URL, buildSlackBlock(lead, enrichment)),
    forwardToFormsubmit(process.env.LEAD_INBOX_EMAIL || DEFAULT_INBOX, enriched),
    forwardToBackend(enriched),
  ];
  const results = await Promise.allSettled(destinations);
  const okCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  const channels = {
    resend_inbox: results[0]?.status === 'fulfilled' && results[0].value === true,
    crm_webhook: results[1]?.status === 'fulfilled' && results[1].value === true,
    slack: results[2]?.status === 'fulfilled' && results[2].value === true,
    formsubmit: results[3]?.status === 'fulfilled' && results[3].value === true,
    spi_backend: results[4]?.status === 'fulfilled' && results[4].value === true,
  };

  // Se NENHUM destino aceitou, o lead não existe em lugar nenhum. Responder 200
  // aqui faria o site dizer "recebemos" pra alguém que sumiu — o formulário
  // precisa saber pra pedir o WhatsApp como alternativa.
  if (okCount === 0) {
    console.error('[contact] nenhum destino aceitou:', {
      form: safeFormForLog(lead._form),
      correlation_id: correlationId,
      status: 'all_destinations_failed',
    });
    return res.status(502).json({
      ok: false,
      accepted: false,
      persistence_verified: false,
      forwarded_to: 0,
      channels,
      error: 'nenhum_destino_aceitou',
    });
  }

  return res.status(200).json({
    ok: true,
    accepted: true,
    persistence_verified: false,
    forwarded_to: okCount,
    channels,
    enrichment: enrichment ? {
      priority: enrichment.priority,
      score: enrichment.score,
      route: enrichment.route_to,
    } : null,
  });
}
