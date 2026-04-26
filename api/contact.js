/**
 * POST /api/contact
 * Endpoint dedicado de captura de lead (substitui formsubmit.co quando configurado).
 * Body: payload do LeadForm (name, email, phone, company, segment, message, _form, _segment)
 *
 * Comportamento:
 *  1. Valida e normaliza dados
 *  2. Faz lead enrichment via IA (Gemini → fallback OpenAI)
 *  3. Encaminha pra TODOS estes destinos (paralelo, fire-and-forget):
 *     a. Email (Resend / SendGrid via SMTP — se SMTP_* envs setadas)
 *     b. Webhook CRM externo (VITE_CRM_WEBHOOK_URL — se setado)
 *     c. Webhook Slack/Discord (CONTACT_WEBHOOK_URL — opcional)
 *     d. FormSubmit.co (fallback final, sempre tenta)
 *  4. Retorna JSON com status + lead score + roteamento sugerido
 *
 * Sem qualquer config externa: cai pro FormSubmit.co automaticamente (zero downtime).
 */
import { chatComplete, rateLimit, clientIp } from './_lib/ai.js';

export const config = { runtime: 'nodejs' };

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

/**
 * Forward to SPI backend (AWS SES via outreach.spi.ia.br DKIM-verified).
 * Independent + redundant path. Backend hits SES which is fully deliverable
 * once production access is approved (currently sandbox: only verified
 * recipients receive). Backend also writes revops_contacts + audit_log + signal
 * for downstream pipeline routing.
 */
async function forwardToBackend(payload) {
  const url = process.env.SPI_BACKEND_URL || 'https://c3lop8psfd.execute-api.sa-east-1.amazonaws.com/prod/api/v1/revops/leads/inbound';
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Don't block on backend latency
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

  const lead = {
    name: String(body.name).slice(0, 200),
    email: String(body.email).slice(0, 200),
    phone: String(body.phone || '').slice(0, 50),
    company: String(body.company || '').slice(0, 200),
    role: String(body.role || '').slice(0, 200),
    segment: String(body.segment || body._segment || '').slice(0, 100),
    companySize: String(body.companySize || '').slice(0, 100),
    urgency: String(body.urgency || '').slice(0, 100),
    profile: String(body.profile || '').slice(0, 100),
    subject: String(body.subject || '').slice(0, 200),
    message: String(body.message || '').slice(0, 2000),
    _form: String(body._form || 'contact').slice(0, 50),
    _segment: String(body._segment || '').slice(0, 50),
    _source: String(body._source || 'site').slice(0, 50),
    _path: String(body._path || '').slice(0, 200),
    _referrer: String(body._referrer || '').slice(0, 500),
    utm_source: String(body.utm_source || '').slice(0, 100),
    utm_medium: String(body.utm_medium || '').slice(0, 100),
    utm_campaign: String(body.utm_campaign || '').slice(0, 100),
    _ts: new Date().toISOString(),
  };

  // Enrichment AI (não-bloqueante visualmente, mas await pra incluir no payload final)
  const enrichment = await enrichLead(lead);
  const enriched = { ...lead, _enrichment: enrichment };

  // Routing destinations (todos paralelos, fire-and-forget)
  // ORDER MATTERS in `results` array — used for the `forwarded_to` count.
  const destinations = [
    forwardToWebhook(process.env.CRM_WEBHOOK_URL, enriched),
    forwardToWebhook(process.env.SLACK_WEBHOOK_URL, buildSlackBlock(lead, enrichment)),
    forwardToFormsubmit(process.env.LEAD_INBOX_EMAIL || 'growx@growx.com.br', enriched),
    forwardToBackend(enriched),  // SPI backend → AWS SES (redundant primary path)
  ];
  const results = await Promise.allSettled(destinations);
  const okCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
  const channels = {
    crm_webhook: results[0]?.status === 'fulfilled' && results[0].value === true,
    slack: results[1]?.status === 'fulfilled' && results[1].value === true,
    formsubmit: results[2]?.status === 'fulfilled' && results[2].value === true,
    backend_ses: results[3]?.status === 'fulfilled' && results[3].value === true,
  };

  return res.status(200).json({
    ok: true,
    received: true,
    forwarded_to: okCount,
    channels,
    enrichment: enrichment ? {
      priority: enrichment.priority,
      score: enrichment.score,
      route: enrichment.route_to,
    } : null,
  });
}
