import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CircleCheck, Clock3 } from 'lucide-react';
import { SEO } from '@/components/visual';
import { track } from '@/lib/analytics';
import { clearCheckoutReturn, readCheckoutReturn } from '@/lib/checkoutReturn';
import { reservationCode } from '../../shared/reservation-code.js';
import PreVendaHeader from '@/components/prevenda/PreVendaHeader';

const BG = 'var(--prevenda-bg)';
const SURFACE = 'var(--prevenda-surface)';
const LINE = 'var(--prevenda-line)';
const GREEN = 'var(--prevenda-green)';
const MUTED = 'var(--prevenda-muted)';
const CTA_TEXT = 'var(--prevenda-cta-foreground)';
const WHATSAPP_PAGO = 'https://wa.me/5541995494343?text=Acabei%20de%20garantir%20meu%20M%C3%B3dulo%20Grow-X%20na%20pr%C3%A9-venda';
const WHATSAPP_CONFIRMACAO = 'https://wa.me/5541995494343?text=Preciso%20confirmar%20o%20pagamento%20da%20pr%C3%A9-venda%20do%20M%C3%B3dulo%20Grow-X';

function safeMercadoPagoUrl(value) {
  try {
    const url = new URL(String(value || ''));
    const host = url.hostname.toLowerCase();
    const mercadoPagoHost = host === 'mercadopago.com'
      || host.endsWith('.mercadopago.com')
      || host === 'mercadopago.com.br'
      || host.endsWith('.mercadopago.com.br');
    return url.protocol === 'https:' && mercadoPagoHost ? url.href : '';
  } catch {
    return '';
  }
}

export default function PreVendaSucessoPage() {
  const [params] = useSearchParams();
  // O estado técnico sai do history assim que o pagamento é confirmado, mas
  // precisa continuar vivo nesta montagem para mostrar código e referência.
  // Sem o snapshot local, o re-render pós-`setInfo` apagava justamente os
  // dados que o comprador precisava guardar.
  const [checkoutReturn] = useState(() => readCheckoutReturn());
  const sessionId = checkoutReturn?.sessionId || params.get('session_id') || '';
  const mpPaymentId = checkoutReturn?.paymentId
    || params.get('payment_id') || params.get('collection_id') || '';
  const mpOrderId = checkoutReturn?.orderId || params.get('order_id') || '';
  const requestId = checkoutReturn?.requestId || params.get('request_id') || '';
  const statusToken = checkoutReturn?.statusToken || params.get('status_token') || '';
  const [info, setInfo] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [copiaFalhou, setCopiaFalhou] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const referencia = sessionId || mpOrderId || mpPaymentId;
  const codigoReserva = reservationCode(requestId);

  useEffect(() => {
    const providerRef = sessionId
      ? `session_id=${encodeURIComponent(sessionId)}`
      : mpOrderId
        ? `order_id=${encodeURIComponent(mpOrderId)}`
        : mpPaymentId
        ? `payment_id=${encodeURIComponent(mpPaymentId)}`
        : null;
    if (!providerRef || !requestId || !statusToken) return;
    const ref = `${providerRef}&request_id=${encodeURIComponent(requestId)}&status_token=${encodeURIComponent(statusToken)}`;

    // A referência do pedido some da URL: ela vaza pro GA4/Meta/Clarity como
    // page_location e é a chave que abre os dados do pedido.
    try {
      if (window.location.search) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch { /* sem history: segue */ }

    const dedupeKey = `gx-purchase-${referencia}`;
    let parado = false;
    let tentativas = 0;

    const consultar = () => {
      fetch(`/api/checkout?${ref}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (parado || !data) return;
          setInfo(data);
          if (data.payment_status === 'paid') {
            parado = true;
            clearCheckoutReturn();
            if (!sessionStorage.getItem(dedupeKey)) {
              sessionStorage.setItem(dedupeKey, '1');
              track('purchase', {
                value: (data.amount_total || 0) / 100,
                currency: (data.currency || 'brl').toUpperCase(),
                sku: data.sku || 'prevenda',
                page: '/prevenda/sucesso',
              });
            }
            return;
          }
          // Alguns pagamentos, especialmente Pix legado, confirmam depois do
          // redirect. Sem reconsultar, a tela ficaria travada em "Quase lá".
          if (++tentativas < 40) setTimeout(consultar, 3000);
        })
        .catch(() => { if (!parado && ++tentativas < 40) setTimeout(consultar, 5000); });
    };

    consultar();
    return () => { parado = true; };
  }, [sessionId, mpPaymentId, mpOrderId, requestId, statusToken, referencia, refreshNonce]);

  const pago = info?.payment_status === 'paid';
  const pendente = info && !pago;
  // Sem referência ou sem resposta da consulta a gente NÃO afirma que deu certo.
  const indefinido = !referencia || !info;
  const paymentUrl = safeMercadoPagoUrl(info?.payment_url || info?.ticket_url);
  const seoTitle = pago
    ? 'Pedido confirmado — pré-venda Módulo Grow-X'
    : pendente
      ? 'Pagamento em confirmação — Módulo Grow-X'
      : 'Confirme seu pagamento — Módulo Grow-X';
  const whatsapp = pago ? WHATSAPP_PAGO : WHATSAPP_CONFIRMACAO;

  const copiar = () => {
    setCopiaFalhou(false);
    if (!navigator.clipboard?.writeText) {
      setCopiaFalhou(true);
      return;
    }
    navigator.clipboard.writeText(codigoReserva || referencia).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }).catch(() => setCopiaFalhou(true));
  };

  return (
    <div style={{ background: BG }} className="prevenda-shell min-h-screen text-white">
      <SEO title={seoTitle} path="/prevenda/sucesso" noIndex />

      <PreVendaHeader showPurchase={false} />

      <div className="mx-auto w-full max-w-2xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="text-center">
          <span
            className="mx-auto flex size-14 items-center justify-center rounded-full text-2xl font-bold"
            style={pago
              ? { background: 'rgba(74,222,128,0.14)', color: GREEN }
              : { background: 'rgba(245,181,68,0.12)', color: 'var(--prevenda-warning)' }}
          >
            {pago ? <CircleCheck aria-hidden="true" size={28} /> : <Clock3 aria-hidden="true" size={28} />}
          </span>
          <h1 className="mt-7 text-display-lg font-extrabold text-white">
            {pago ? 'Você está dentro.' : pendente ? 'Quase lá.' : 'Vamos confirmar seu pagamento.'}
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed" style={{ color: MUTED }}>
            {pago
              ? 'Sua unidade do Módulo Grow-X está reservada no lote de lançamento, com 3 meses de GXP Premium inclusos. O comprovante chega no seu e-mail.'
              : pendente
                ? (mpPaymentId || mpOrderId)
                  ? 'Seu Pix está sendo confirmado e pode levar alguns instantes. Assim que compensar, a reserva aparece na área do cliente.'
                  : 'Seu pagamento no cartão está sendo confirmado. Assim que o provedor concluir, a reserva aparece na área do cliente.'
                : 'Ainda não conseguimos confirmar o pagamento por aqui. Se você concluiu o pagamento, consulte a área do cliente em instantes ou fale com a gente — não refaça a compra.'}
          </p>
          {indefinido && (
            <p className="mx-auto mt-4 max-w-lg rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(245,181,68,0.32)', background: 'rgba(245,181,68,0.08)', color: 'var(--prevenda-warning-text)' }}>
              Esta página não recebeu a confirmação do provedor. Isso <strong>não</strong> significa que
              o pagamento falhou — confira na{' '}
              <Link to="/prevenda/pedido" className="font-semibold underline underline-offset-2" style={{ color: GREEN }}>área do cliente</Link>{' '}
              antes de tentar pagar de novo.
            </p>
          )}
        </div>

        {referencia && (
          <div className="mt-9 rounded-2xl border p-5" style={{ borderColor: LINE, background: SURFACE }}>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
              {pago ? 'Referência da reserva — guarde' : 'Referência da tentativa de pagamento'}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
              <code className="whitespace-nowrap font-mono text-base font-bold text-white sm:min-w-0 sm:flex-1 sm:text-lg">{codigoReserva || referencia}</code>
              <button
                type="button" onClick={copiar}
                className="self-start rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/5 sm:shrink-0"
                style={{ borderColor: LINE }}
              >
                {copiado ? 'Copiado' : 'Copiar código'}
              </button>
            </div>
            {copiaFalhou && (
              <p role="alert" className="mt-2 text-xs" style={{ color: 'var(--prevenda-warning)' }}>Não foi possível copiar automaticamente. Selecione e copie a referência acima.</p>
            )}
            <p className="mt-3 break-all text-xs" style={{ color: MUTED }}>
              Referência técnica do pagamento: <span className="font-mono text-white/75">{referencia}</span>
            </p>
            <p className="mt-2 text-xs" style={{ color: MUTED }}>
              Esta é a referência da compra. Para entrar na área do cliente, você receberá outro código de uso único com 6 dígitos por e-mail.
            </p>
            {info?.contract_version && (
              <p className="mt-3 text-xs" style={{ color: MUTED }}>
                Contrato <strong className="text-white">{info.contract_version}</strong>
                {info.contract_accepted ? ' · aceite registrado' : ''} ·{' '}
                <Link to="/prevenda/contrato" className="underline underline-offset-2" style={{ color: GREEN }}>ver contrato</Link>
              </p>
            )}
          </div>
        )}

        {paymentUrl && !pago && (
          <div className="mt-6 rounded-2xl border p-5" style={{ borderColor: 'rgba(74,222,128,0.30)', background: 'rgba(74,222,128,0.06)' }}>
            <h2 className="text-base font-bold text-white">Seu Pix está pronto</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>
              Abra o ambiente seguro do Mercado Pago para ver o QR Code ou copiar o código Pix. Esta página continuará consultando a confirmação.
            </p>
            <a
              href={paymentUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-4 inline-flex rounded-xl px-5 py-3 text-sm font-bold transition hover:brightness-110"
              style={{ background: GREEN, color: CTA_TEXT }}
            >
              Abrir Pix no Mercado Pago
            </a>
          </div>
        )}

        {pago ? (
          <div className="mt-6 rounded-2xl border p-6" style={{ borderColor: LINE, background: SURFACE }}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Próximos passos</h2>
            <ol className="mt-4 space-y-3 text-sm leading-relaxed" style={{ color: MUTED }}>
              <li><strong className="text-white">1.</strong> O comprovante de pagamento chega no seu e-mail.</li>
              <li><strong className="text-white">2.</strong> Nosso time chama você no WhatsApp pra confirmar os dados de entrega.</li>
              <li><strong className="text-white">3.</strong> Em outubro o GXP lança e seus 3 meses de Premium são ativados.</li>
              <li><strong className="text-white">4.</strong> A partir de 20/11: entrega no seu endereço ou retirada na ExpoCannabis Brasil.</li>
            </ol>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border p-6" style={{ borderColor: LINE, background: SURFACE }}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">Enquanto confirmamos</h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
              Não faça uma nova compra. Atualize o estado aqui ou consulte a área do cliente antes de qualquer nova tentativa.
            </p>
            <button
              type="button"
              onClick={() => {
                track('refresh_checkout_status', { page: '/prevenda/sucesso' });
                setRefreshNonce((value) => value + 1);
              }}
              className="mt-4 rounded-xl border px-5 py-3 text-sm font-semibold text-white"
              style={{ borderColor: LINE }}
            >
              Atualizar status
            </button>
          </div>
        )}

        <div className="mt-6 rounded-2xl border p-6" style={{ borderColor: 'rgba(74,222,128,0.26)', background: 'rgba(74,222,128,0.06)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Acompanhe quando quiser</h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
            Consulte o status com o e-mail e o CPF/CNPJ da compra. Antes de mostrar o pedido, enviaremos
            um código de uso único para esse e-mail. Você pode cancelar com reembolso integral até o envio.
          </p>
          <Link
            to="/prevenda/pedido"
            className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-bold transition hover:brightness-110"
            style={{ background: GREEN, color: CTA_TEXT }}
          >
            Abrir área do cliente
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={whatsapp} target="_blank" rel="noreferrer noopener"
            className="rounded-xl border px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            style={{ borderColor: LINE }}
          >
            Falar com o time
          </a>
          <Link
            to="/"
            className="rounded-xl border px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
            style={{ borderColor: LINE }}
          >
            Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}
