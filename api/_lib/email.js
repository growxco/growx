/**
 * E-mail transacional ao COMPRADOR via Resend.
 *
 * Antes disso a Grow-X não enviava nada: quem pagava no Pix e fechava a aba
 * nunca via o código do pedido nem recibo nosso. Este é o único canal em que a
 * Grow-X fala diretamente com o comprador.
 */
import { OFERTA, brl } from '../../src/lib/oferta.js';

const SITE = 'https://www.growx.com.br';
const DE = 'Grow-X <no-reply@growx.com.br>';
const RESPONDE_PARA = 'growx@growx.com.br';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const mascara = (doc) => {
  const c = String(doc || '').replace(/\D/g, '');
  if (c.length === 11) return `***.***.${c.slice(6, 9)}-${c.slice(9)}`;
  if (c.length === 14) return `**.***.***/${c.slice(8, 12)}-${c.slice(12)}`;
  return '—';
};

function corpo({ nome, referencia, valorCentavos, forma, cpf, endereco }) {
  const primeiro = String(nome || '').trim().split(/\s+/)[0] || 'Olá';
  const linha = (k, v) => `<tr>
      <td style="padding:8px 0;color:#7d8f84;font-size:13px">${esc(k)}</td>
      <td style="padding:8px 0;color:#101512;font-size:13px;text-align:right;font-family:ui-monospace,monospace">${esc(v)}</td>
    </tr>`;

  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="background:#080b09;border-radius:16px;padding:28px 26px">
      <p style="margin:0;color:#4ade80;font-size:11px;letter-spacing:2px;font-weight:700">PEDIDO CONFIRMADO</p>
      <h1 style="margin:10px 0 0;color:#fff;font-size:26px;line-height:1.2">${esc(primeiro)}, sua unidade está reservada.</h1>
      <p style="margin:14px 0 0;color:#9fb3a6;font-size:15px;line-height:1.6">
        Recebemos seu pagamento do Módulo Grow-X. Guarde este e-mail: ele tem o código do seu pedido.
      </p>
    </div>

    <div style="background:#fff;border-radius:16px;padding:24px 26px;margin-top:14px">
      <table style="width:100%;border-collapse:collapse">
        ${linha('Código do pedido', referencia)}
        ${linha('Valor pago', brl(valorCentavos || 0))}
        ${linha('Forma', forma)}
        ${linha('Documento', mascara(cpf))}
        ${endereco ? linha('Entrega', endereco) : ''}
        ${linha('Entrega a partir de', OFERTA.entregaBR)}
        ${linha('Contrato', OFERTA.contratoVersao)}
      </table>
    </div>

    <div style="background:#fff;border-radius:16px;padding:24px 26px;margin-top:14px">
      <h2 style="margin:0;color:#101512;font-size:15px">O que acontece agora</h2>
      <ol style="margin:12px 0 0;padding-left:18px;color:#4a5952;font-size:14px;line-height:1.7">
        <li>Nosso time entra em contato para confirmar os dados de entrega.</li>
        <li>Em outubro o app GXP lança e seus 3 meses de Premium são ativados.</li>
        <li>A partir de ${esc(OFERTA.entregaBR)}: entrega no seu endereço ou retirada na ${esc(OFERTA.evento)}.</li>
      </ol>
      <p style="margin:18px 0 0">
        <a href="${SITE}/prevenda/pedido" style="display:inline-block;background:#4ade80;color:#05130a;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px">Acompanhar meu pedido</a>
      </p>
      <p style="margin:16px 0 0;color:#7d8f84;font-size:13px;line-height:1.6">
        Você pode cancelar com <strong>reembolso integral até o envio</strong>, sem justificativa.
        Depois da entrega, <strong>garantia de 12 meses</strong> conforme o contrato.
        <a href="${SITE}${esc(OFERTA.contratoPath)}" style="color:#1f9d55">Guardar contrato aceito (${esc(OFERTA.contratoVersao)})</a>.
      </p>
    </div>

    <p style="margin:18px 0 0;color:#8a9a91;font-size:12px;line-height:1.6;text-align:center">
      GROW-X CO. TECNOLOGIAS LTDA · CNPJ 59.183.820/0001-09 · Curitiba/PR<br>
      Dúvidas: WhatsApp +55 41 99549-4343 · growx@growx.com.br
    </p>
  </div></body></html>`;
}

/**
 * Envia a confirmação de pedido ao comprador.
 * @returns {Promise<boolean>} true se o Resend aceitou o envio.
 */
export async function enviarConfirmacaoPedido(dados) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error('[email] RESEND_API_KEY ausente — comprador não recebeu confirmação');
    return false;
  }
  if (!dados?.email) {
    console.error('[email] pedido sem e-mail do comprador');
    return false;
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(5_000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: DE,
        to: [dados.email],
        reply_to: RESPONDE_PARA,
        subject: `Pedido confirmado — Módulo Grow-X (${dados.referencia})`,
        html: corpo(dados),
      }),
    });
    if (!r.ok) {
      console.error('[email] Resend recusou confirmação:', r.status);
      return false;
    }
    return true;
  } catch {
    console.error('[email] falha ao enviar confirmação');
    return false;
  }
}

export const emailPedidoConfigurado = () => {
  const key = process.env.RESEND_API_KEY;
  return typeof key === 'string' && key.length >= 16;
};

/**
 * Envia o código de acesso à área do cliente. O código nunca aparece em log e
 * a resposta pública de /api/pedido não varia conforme a entrega do Resend.
 */
export async function enviarCodigoAcessoPedido({ email, codigo, validadeMinutos = 10 } = {}) {
  const key = process.env.RESEND_API_KEY;
  if (!emailPedidoConfigurado() || !email || !/^\d{6}$/.test(String(codigo || ''))) {
    console.error('[email] configuração de código de acesso indisponível');
    return false;
  }

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f4f7f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="background:#080b09;border-radius:16px;padding:28px 26px">
      <p style="margin:0;color:#4ade80;font-size:11px;letter-spacing:2px;font-weight:700">ÁREA DO CLIENTE</p>
      <h1 style="margin:10px 0 0;color:#fff;font-size:25px;line-height:1.25">Seu código de acesso</h1>
      <p style="margin:14px 0 0;color:#9fb3a6;font-size:15px;line-height:1.6">
        Use o código abaixo para consultar seu pedido do Módulo Grow-X.
      </p>
      <p style="margin:24px 0 0;color:#fff;font-size:34px;font-weight:800;letter-spacing:8px;font-family:ui-monospace,monospace">${esc(codigo)}</p>
      <p style="margin:16px 0 0;color:#9fb3a6;font-size:13px;line-height:1.6">
        Ele expira em ${esc(validadeMinutos)} minutos e só pode ser usado uma vez. Se você não pediu este código, ignore este e-mail.
      </p>
    </div>
    <p style="margin:18px 0 0;color:#8a9a91;font-size:12px;line-height:1.6;text-align:center">
      A Grow-X nunca pede este código por WhatsApp ou telefone.<br>
      Dúvidas: growx@growx.com.br
    </p>
  </div></body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(5_000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: DE,
        to: [email],
        reply_to: RESPONDE_PARA,
        subject: 'Código de acesso — pedido Módulo Grow-X',
        html,
      }),
    });
    if (!response.ok) {
      console.error('[email] Resend recusou código de acesso:', response.status);
      return false;
    }
    return true;
  } catch {
    console.error('[email] falha ao enviar código de acesso');
    return false;
  }
}
