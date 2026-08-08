import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, Clock3 } from 'lucide-react';
import { SEO } from '@/components/visual';
import { track } from '@/lib/analytics';
import {
  checkoutPurchaseWasTracked,
  checkoutStatusIsTransient,
  clearCheckoutStatusToken,
  markCheckoutPurchaseTracked,
  readCheckoutReturn,
} from '@/lib/checkoutReturn';
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
  // A captura síncrona em main.jsx remove fragmento/query antes do analytics.
  // O estado permanece apenas no history desta aba, inclusive após refresh.
  const [checkoutReturn] = useState(() => readCheckoutReturn());
  const sessionId = checkoutReturn?.sessionId || '';
  const mpPaymentId = checkoutReturn?.paymentId || '';
  const mpOrderId = checkoutReturn?.orderId || '';
  const requestId = checkoutReturn?.requestId || '';
  const statusToken = checkoutReturn?.statusToken || '';
  const [info, setInfo] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [copiaFalhou, setCopiaFalhou] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [consultaEstado, setConsultaEstado] = useState('loading');

  const requestIdConfirmado = requestId || info?.request_id || '';
  const referencia = sessionId || mpOrderId || mpPaymentId || info?.reference || requestIdConfirmado;
  const codigoReserva = reservationCode(requestIdConfirmado);

  useEffect(() => {
    const statusBody = {
      action: 'status',
      ...(requestId ? { requestId } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(mpOrderId ? { orderId: mpOrderId } : {}),
      ...(mpPaymentId ? { paymentId: mpPaymentId } : {}),
    };
    let parado = false;
    let timer;
    let controller;
    let tentativas = 0;
    const MAX_TENTATIVAS = 40;

    const agendar = (delay) => {
      if (parado) return;
      if (tentativas >= MAX_TENTATIVAS) {
        setConsultaEstado('timeout');
        return;
      }
      timer = window.setTimeout(consultar, delay);
    };

    const consultar = async () => {
      if (parado) return;
      tentativas += 1;
      controller = new AbortController();
      setConsultaEstado(tentativas === 1 ? 'loading' : 'polling');

      try {
        const response = await fetch('/api/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(statusToken ? { Authorization: `Bearer ${statusToken}` } : {}),
          },
          body: JSON.stringify(statusBody),
          cache: 'no-store',
          credentials: 'same-origin',
          referrerPolicy: 'no-referrer',
          signal: controller.signal,
        });

        // A credencial já cumpriu sua função assim que o servidor respondeu.
        // O snapshot local permanece nesta execução para retries; no refresh,
        // o fallback HttpOnly continua disponível sem reter o bearer no history.
        if (statusToken) clearCheckoutStatusToken();
        if (parado) return;

        if (!response.ok) {
          if (checkoutStatusIsTransient(response.status)) {
            const retryAfterHeader = response.headers.get('Retry-After');
            const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
            const delay = Number.isFinite(retryAfter)
              ? Math.min(Math.max(retryAfter * 1000, 3000), 15_000)
              : 5000;
            setConsultaEstado('retrying');
            agendar(delay);
          } else {
            setConsultaEstado('error');
          }
          return;
        }

        const data = await response.json().catch(() => null);
        if (!data || typeof data !== 'object') {
          setConsultaEstado('retrying');
          agendar(5000);
          return;
        }

        setInfo(data);
        if (data.payment_status === 'paid') {
          parado = true;
          setConsultaEstado('confirmed');
          const confirmedRequestId = data.request_id || requestId;
          if (!checkoutPurchaseWasTracked(confirmedRequestId)) {
            markCheckoutPurchaseTracked(confirmedRequestId);
            track('purchase', {
              value: (data.amount_total || 0) / 100,
              currency: (data.currency || 'brl').toUpperCase(),
              sku: data.sku || 'prevenda',
              page: '/prevenda/sucesso',
            });
          }
          return;
        }

        setConsultaEstado('polling');
        agendar(3000);
      } catch (error) {
        if (parado || error?.name === 'AbortError') return;
        setConsultaEstado('retrying');
        agendar(5000);
      }
    };

    consultar();
    return () => {
      parado = true;
      window.clearTimeout(timer);
      controller?.abort();
    };
  }, [sessionId, mpPaymentId, mpOrderId, requestId, statusToken, refreshNonce]);

  const pago = info?.payment_status === 'paid';
  const pendente = info && !pago;
  // Sem referência ou sem resposta da consulta a gente NÃO afirma que deu certo.
  const indefinido = !referencia || !info;
  const paymentUrl = safeMercadoPagoUrl(info?.payment_url || info?.ticket_url);
  const pagamentoPix = info?.payment_method === 'pix'
    || info?.provider === 'mercadopago'
    || Boolean(mpPaymentId || mpOrderId || paymentUrl);
  const formaPagamento = pagamentoPix
    ? 'Pix via Mercado Pago'
    : info?.payment_method === 'card' || info?.provider === 'stripe'
      ? 'Cartão via Stripe'
      : '';
  const seoTitle = pago
    ? 'Pedido confirmado — pré-venda Módulo Grow-X'
    : pendente
      ? 'Pagamento em confirmação — Módulo Grow-X'
      : 'Confirme seu pagamento — Módulo Grow-X';
  const whatsapp = pago ? WHATSAPP_PAGO : WHATSAPP_CONFIRMACAO;
  const consultaCarregando = consultaEstado === 'loading';
  const consultaMensagem = consultaEstado === 'retrying'
    ? 'O serviço de confirmação oscilou. Vamos tentar novamente automaticamente.'
    : consultaEstado === 'polling'
      ? 'Consulta ativa. O estado será atualizado automaticamente.'
      : consultaEstado === 'timeout'
        ? 'A confirmação demorou mais que o esperado. Consulte a área do cliente antes de tentar comprar novamente.'
        : consultaEstado === 'error'
          ? 'Não foi possível autorizar esta consulta. Confira o pedido na área do cliente ou fale com o time.'
          : consultaEstado === 'loading'
            ? 'Consultando o estado do pagamento…'
            : '';

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
        <div className="text-center" role="status" aria-live="polite" aria-atomic="true">
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
                ? pagamentoPix
                  ? 'Seu Pix está sendo confirmado e pode levar alguns instantes. Assim que compensar, a reserva aparece na área do cliente.'
                  : 'Seu pagamento no cartão está sendo confirmado. Assim que o provedor concluir, a reserva aparece na área do cliente.'
                : 'Ainda não conseguimos confirmar o pagamento por aqui. Se você concluiu o pagamento, consulte a área do cliente em instantes ou fale com a gente — não refaça a compra.'}
          </p>
          {indefinido && !['loading', 'retrying'].includes(consultaEstado) && (
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
              <code className="min-w-0 break-all whitespace-normal font-mono text-base font-bold text-white sm:flex-1 sm:text-lg">{codigoReserva || referencia}</code>
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
            {formaPagamento && (
              <p className="mt-2 text-xs" style={{ color: MUTED }}>
                Forma consultada: <strong className="text-white">{formaPagamento}</strong>
              </p>
            )}
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
            {consultaMensagem && (
              <p
                className="mt-3 text-sm leading-relaxed"
                role={['error', 'timeout'].includes(consultaEstado) ? 'alert' : 'status'}
                aria-live="polite"
                style={{ color: ['error', 'timeout'].includes(consultaEstado) ? 'var(--prevenda-warning-text)' : MUTED }}
              >
                {consultaMensagem}
              </p>
            )}
            <button
              type="button"
              disabled={consultaCarregando}
              onClick={() => {
                track('refresh_checkout_status', { page: '/prevenda/sucesso' });
                setConsultaEstado('loading');
                setRefreshNonce((value) => value + 1);
              }}
              className="mt-4 rounded-xl border px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-60"
              style={{ borderColor: LINE }}
            >
              {consultaCarregando ? 'Consultando…' : 'Atualizar status'}
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
