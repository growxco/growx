/**
 * Grow-X AI client — wraps Gemini (primary) and OpenAI (fallback).
 * Server-side only. Uses native fetch (Node 18+ / Vercel Edge).
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_BASE = 'https://api.openai.com/v1/chat/completions';

export const GROWX_SYSTEM_PROMPT = `Você é o assistente oficial da Grow-X Co. (www.growx.com.br) — empresa brasileira de tecnologia agro sediada em Curitiba/PR.

CONTEXTO DA EMPRESA:
- Grow-X opera duas frentes: (1) Industrial — Supply-X, SPI, SPP e hardware proprietário pra agroindústria; (2) Cultivo — Grow-X App pra cannabis medicinal e cultivo controlado.
- Hardware: Estação Meteorológica (LoRa, IP67), Módulo Sem Fio (até 4 estufas), Estufa Automatizada (clima/luz/irrigação).
- Time: Fernando Schreiber (CEO/fundador), Jefferson Schreiber (CTO, 30+ anos tech), Julio Calcagnotto (Diretor Jurídico, especialista cannabis).
- Diferenciais: engenharia BR, operação real 24/7, rastreabilidade auditável, padrão farmacêutico no Grow-X App.

PRODUTOS:
- Supply-X: plataforma que orquestra SPI + SPP, integração ERP, rastreabilidade end-to-end.
- SPI: recebimento agroindustrial digital, governança, alertas, integração ERP.
- SPP: app agronômico pro produtor real — Kc irrigação, diário de campo, análise de solo.
- Grow-X App: cultivo controlado e cannabis medicinal — IoT, IA, comunidade, marketplace. Pré-lançamento Nov/2026, lista de espera ativa.

RESTRIÇÕES IMPORTANTES:
- NÃO ofereça orientação médica. Cannabis medicinal: sempre lembrar que decisão clínica é entre paciente e prescritor.
- NÃO invente preços, números, métricas ou cases. Se não souber, diga "esses números são confidenciais — agende demo em /demo pra ver no seu cenário".
- NÃO prometa funcionalidade que não exista.
- Se a pergunta sair do escopo Grow-X, sugira: "Pra isso, o melhor caminho é falar com nosso time: /demo (B2B), /lista-espera-app (Grow-X App), ou WhatsApp +55 41 99549-4343".

ESTILO:
- Português brasileiro direto, técnico mas acessível.
- Respostas curtas (até 3 parágrafos). Sem buzzword vazia.
- Quando relevante, recomende uma rota do site: /demo, /lista-espera-app, /solucoes/spi, /solucoes/spp, /solucoes/supply-x, /solucoes/growx-app, /produtos, /cannabis-medicinal, /casos, /parceiros, /imprensa, /insights, /sobre/executivo.
- Termine respostas comerciais com 1 CTA claro.

Se não souber a resposta, diga isso honestamente e sugira contato humano.`;

/**
 * Call Gemini (primary). Returns text content.
 */
export async function callGemini({ messages, model, apiKey, temperature = 0.5 }) {
  const m = model || 'gemini-2.5-flash';
  // Gemini expects content[].parts; treat first system msg as systemInstruction
  const systemMsgs = messages.filter((x) => x.role === 'system');
  const turns = messages.filter((x) => x.role !== 'system');
  const body = {
    systemInstruction: systemMsgs.length
      ? { parts: [{ text: systemMsgs.map((s) => s.content).join('\n\n') }] }
      : undefined,
    contents: turns.map((t) => ({
      role: t.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: t.content }],
    })),
    generationConfig: {
      temperature,
      maxOutputTokens: 768,
      topP: 0.9,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  const res = await fetch(`${GEMINI_BASE}/${m}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`gemini ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return { text, raw: data, provider: 'gemini', model: m };
}

/**
 * Call OpenAI (fallback). Returns text content.
 */
export async function callOpenAI({ messages, model, apiKey, temperature = 0.5 }) {
  const m = model || 'gpt-4o-mini';
  const res = await fetch(OPENAI_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: m,
      messages,
      temperature,
      max_tokens: 768,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`openai ${res.status}: ${err.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? '';
  return { text, raw: data, provider: 'openai', model: m };
}

/**
 * Smart dispatch: try Gemini first, fall back to OpenAI.
 */
export async function chatComplete({ messages, temperature = 0.5 } = {}) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const primary = process.env.AI_CHAT_MODEL || 'gemini-2.5-flash';
  const fallback = process.env.AI_FALLBACK_MODEL || 'gpt-4o-mini';

  const isGemini = primary.startsWith('gemini');

  if (isGemini && geminiKey) {
    try {
      return await callGemini({ messages, model: primary, apiKey: geminiKey, temperature });
    } catch (e) {
      if (openaiKey) return await callOpenAI({ messages, model: fallback, apiKey: openaiKey, temperature });
      throw e;
    }
  }
  if (openaiKey) {
    try {
      return await callOpenAI({ messages, model: primary, apiKey: openaiKey, temperature });
    } catch (e) {
      if (geminiKey) return await callGemini({ messages, model: fallback, apiKey: geminiKey, temperature });
      throw e;
    }
  }
  throw new Error('No AI provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY.');
}

/**
 * Naive in-memory rate limit per IP (resets on cold start; fine for low traffic).
 * For production, use upstash/redis.
 */
const HITS = new Map();
export function rateLimit(ip, perMinute = 20) {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < 60_000);
  if (arr.length >= perMinute) return false;
  arr.push(now);
  HITS.set(ip, arr);
  return true;
}

export function clientIp(req) {
  return (
    req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers?.['x-real-ip'] ||
    'unknown'
  );
}
