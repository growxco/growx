/**
 * Notificação interna de venda da pré-venda do Módulo.
 * Envia pra inbox (FormSubmit → LEAD_INBOX_EMAIL) e, se configurado, Slack.
 */

export async function notifySale({ provider, method, amountCents, currency, email, name, phone, reference, status }) {
  const valor = `R$ ${((amountCents || 0) / 100).toFixed(2).replace('.', ',')}`;
  const subject = `💰 VENDA Módulo Grow-X — ${valor} · ${method} · ${status}`;

  const payload = {
    _subject: subject,
    _template: 'table',
    _captcha: 'false',
    tipo: 'VENDA PRÉ-VENDA MÓDULO',
    provedor: provider,
    forma: method,
    valor,
    moeda: (currency || 'BRL').toUpperCase(),
    status,
    cliente_nome: name || '—',
    cliente_email: email || '—',
    cliente_fone: phone || '—',
    referencia: reference || '—',
    _ts: new Date().toISOString(),
  };

  const results = await Promise.allSettled([
    sendFormsubmit(payload),
    sendSlack(subject, payload),
  ]);
  return results.some((r) => r.status === 'fulfilled' && r.value === true);
}

async function sendFormsubmit(payload) {
  const email = process.env.LEAD_INBOX_EMAIL || 'growx@growx.com.br';
  try {
    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // FormSubmit exige headers de origem de browser (ver api/contact.js)
        Origin: 'https://www.growx.com.br',
        Referer: 'https://www.growx.com.br/prevenda',
        'User-Agent': 'Grow-X-Site/1.0 (+https://www.growx.com.br)',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) return false;
    try {
      const data = await r.json();
      return data?.success === true || data?.success === 'true';
    } catch { return true; }
  } catch { return false; }
}

async function sendSlack(text, payload) {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return false;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        blocks: [
          { type: 'header', text: { type: 'plain_text', text } },
          {
            type: 'section',
            fields: Object.entries(payload)
              .filter(([k]) => !k.startsWith('_'))
              .slice(0, 10)
              .map(([k, v]) => ({ type: 'mrkdwn', text: `*${k}:*\n${v}` })),
          },
        ],
      }),
    });
    return r.ok;
  } catch { return false; }
}
