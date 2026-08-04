/**
 * Notificação interna de venda da pré-venda do Módulo.
 * Envia pra inbox (FormSubmit → LEAD_INBOX_EMAIL) e, se configurado, Slack.
 */

const mascaraCpf = (v) => {
  const c = String(v || '').replace(/\D/g, '');
  return c.length === 11 ? `***.***.${c.slice(6, 9)}-${c.slice(9)}` : null;
};

export async function notifySale({ provider, method, amountCents, currency, email, name, phone, cpf, reference, status }) {
  const valor = `R$ ${((amountCents || 0) / 100).toFixed(2).replace('.', ',')}`;
  // referência no assunto: o provedor reenvia notificações, e assim as repetidas
  // caem na mesma thread do e-mail em vez de parecerem vendas diferentes.
  const subject = `💰 VENDA Módulo Grow-X — ${valor} · ${method} · ${status} · ${reference || 's/ref'}`;

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
    cliente_cpf: mascaraCpf(cpf) || '—',
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
    if (!r.ok) {
      console.error('[notify] formsubmit HTTP', r.status);
      return false;
    }
    try {
      const data = await r.json();
      const ok = data?.success === true || data?.success === 'true';
      // Modo de falha mais provável: 200 com success=false quando o e-mail de
      // destino não está ativado no FormSubmit. Sem log, some sem deixar rastro.
      if (!ok) console.error('[notify] formsubmit recusou:', JSON.stringify(data).slice(0, 200));
      return ok;
    } catch { return true; }
  } catch (e) {
    console.error('[notify] formsubmit falhou:', e.message);
    return false;
  }
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
