/**
 * POST /api/chat
 * Body: { messages: [{role:'user'|'assistant', content:string}], page?: string }
 * Returns: { text, provider, model }
 *
 * The Grow-X system prompt is injected server-side (never exposed to client).
 */
import { chatComplete, rateLimit, clientIp, GROWX_SYSTEM_PROMPT } from './_lib/ai.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // CORS — same-origin by default; allow site domain explicitly
  res.setHeader('Access-Control-Allow-Origin', 'https://www.growx.com.br');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  // Rate limit
  const ip = clientIp(req);
  const limit = parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '20', 10);
  if (!rateLimit(ip, limit)) {
    return res.status(429).json({ error: 'rate_limited', message: 'Muitas mensagens. Tenta de novo em 1 min.' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const userMessages = Array.isArray(body?.messages) ? body.messages : [];
  if (userMessages.length === 0) {
    return res.status(400).json({ error: 'no_messages' });
  }

  // Sanitize: only role/content, cap length
  const safeMessages = userMessages
    .filter((m) => m && typeof m.content === 'string')
    .slice(-12) // last 12 turns max
    .map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content.slice(0, 2000),
    }));

  // Inject context (current page) into the system prompt for relevance
  const pageHint = body?.page ? `\n\n[CONTEXTO DE NAVEGAÇÃO: o usuário está na página ${body.page}]` : '';

  const messages = [
    { role: 'system', content: GROWX_SYSTEM_PROMPT + pageHint },
    ...safeMessages,
  ];

  try {
    const r = await chatComplete({ messages, temperature: 0.4 });
    return res.status(200).json({
      text: r.text,
      provider: r.provider,
      model: r.model,
    });
  } catch (e) {
    console.error('[/api/chat] error:', e?.message || e);
    return res.status(500).json({
      error: 'ai_failed',
      message: 'Não consegui responder agora. Tenta o WhatsApp: +55 41 99549-4343',
    });
  }
}
