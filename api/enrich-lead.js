/**
 * POST /api/enrich-lead
 * Body: { name, email, company, role, segment, message }
 * Returns: { score, intent, suggestedNextSteps, segmentRefined, confidence }
 *
 * Run AI on a fresh lead to:
 * - Refine segment classification
 * - Detect intent (demo / pricing / partner / patient / press / etc)
 * - Suggest next steps for SDR
 * - Compute a soft confidence score
 *
 * Called from LeadForm AFTER submit (non-blocking) — augments the CRM record.
 */
import { chatComplete, rateLimit, clientIp } from './_lib/ai.js';

export const config = { runtime: 'nodejs' };

const ENRICH_PROMPT = `Você é um SDR sênior B2B/B2C agro. Recebe um lead que acabou de chegar pelo site da Grow-X. Sua tarefa: classificar e priorizar.

Saída obrigatória em JSON válido (somente JSON, sem markdown), com campos:
{
  "intent": "demo" | "pricing" | "partner" | "patient" | "press" | "support" | "investor" | "other",
  "segment_refined": "industrial" | "cooperativa" | "producer" | "cultivo" | "cannabis_medicinal" | "integrator" | "other",
  "score": 0-100,
  "priority": "hot" | "warm" | "cold",
  "next_steps": ["string", "string"],
  "talking_points": ["string"],
  "red_flags": ["string"]
}

Critérios:
- score >= 70 = hot (decisor + dor clara + urgência)
- 40-69 = warm (relevante mas precisa qualificar)
- < 40 = cold (curioso, paciente individual, estudante, etc)
- Empresa grande + cargo C-level + dor específica = hot
- Cannabis medicinal individual = warm/cold (vira pra waitlist e comunidade, não pra demo B2B)
- Imprensa = redirecionar pra /imprensa
- Curioso sem empresa = cold + nutrir com newsletter`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.growx.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const ip = clientIp(req);
  if (!rateLimit(ip, 30)) return res.status(429).json({ error: 'rate_limited' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const lead = {
    name: String(body?.name || '').slice(0, 200),
    email: String(body?.email || '').slice(0, 200),
    company: String(body?.company || '').slice(0, 200),
    role: String(body?.role || '').slice(0, 200),
    segment: String(body?.segment || '').slice(0, 100),
    companySize: String(body?.companySize || '').slice(0, 100),
    urgency: String(body?.urgency || '').slice(0, 100),
    message: String(body?.message || '').slice(0, 1500),
    profile: String(body?.profile || '').slice(0, 100),
  };

  const userMsg = `Lead recebido:\n${JSON.stringify(lead, null, 2)}\n\nClassifique em JSON estrito.`;

  try {
    const r = await chatComplete({
      messages: [
        { role: 'system', content: ENRICH_PROMPT },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.2,
    });
    // Parse JSON robustly (model may wrap in fence)
    const jsonMatch = r.text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    if (!parsed) throw new Error('no_json');
    return res.status(200).json({ ok: true, ...parsed, _provider: r.provider, _model: r.model });
  } catch (e) {
    console.error('[/api/enrich-lead]', e?.message || e);
    // Fail-soft: lead já foi salvo no CRM pela LeadForm. Aqui só enriquece.
    return res.status(200).json({
      ok: false,
      score: 0,
      priority: 'warm',
      reason: 'enrichment_unavailable',
    });
  }
}
