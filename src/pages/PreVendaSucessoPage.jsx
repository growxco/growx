import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SEO } from '@/components/visual';
import { track } from '@/lib/analytics';

const BG = '#080b09';
const SURFACE = 'rgba(255,255,255,0.035)';
const LINE = 'rgba(255,255,255,0.09)';
const GREEN = '#4ade80';
const MUTED = '#9fb3a6';
const WHATSAPP = 'https://wa.me/5541995494343?text=Acabei%20de%20garantir%20meu%20M%C3%B3dulo%20Grow-X%20na%20pr%C3%A9-venda';

export default function PreVendaSucessoPage() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id') || '';
  const mpPaymentId = params.get('payment_id') || params.get('collection_id') || '';
  const [info, setInfo] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const referencia = sessionId || mpPaymentId;

  useEffect(() => {
    const ref = sessionId
      ? `session_id=${encodeURIComponent(sessionId)}`
      : mpPaymentId
        ? `payment_id=${encodeURIComponent(mpPaymentId)}`
        : null;
    if (!ref) return;
    const dedupeKey = `gx-purchase-${referencia}`;
    fetch(`/api/checkout?${ref}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setInfo(data);
        if (!sessionStorage.getItem(dedupeKey) && data.payment_status === 'paid') {
          sessionStorage.setItem(dedupeKey, '1');
          track('purchase', {
            value: (data.amount_total || 0) / 100,
            currency: (data.currency || 'brl').toUpperCase(),
            sku: data.sku || 'prevenda',
            page: '/prevenda/sucesso',
          });
        }
      })
      .catch(() => {});
  }, [sessionId, mpPaymentId, referencia]);

  const pago = info?.payment_status === 'paid';
  const pendente = info && !pago;

  const copiar = () => {
    navigator.clipboard?.writeText(referencia).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }).catch(() => {});
  };

  return (
    <div style={{ background: BG }} className="min-h-screen text-white">
      <SEO title="Pedido confirmado — pré-venda Módulo Grow-X" path="/prevenda/sucesso" noIndex />

      <div className="mx-auto w-full max-w-2xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="text-center">
          <span
            className="mx-auto flex size-14 items-center justify-center rounded-full text-2xl font-bold"
            style={{ background: 'rgba(74,222,128,0.14)', color: GREEN }}
          >
            ✓
          </span>
          <h1 className="mt-7 text-display-lg font-extrabold text-white">
            {pago ? 'Você está dentro.' : pendente ? 'Quase lá.' : 'Recebemos seu pedido.'}
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed" style={{ color: MUTED }}>
            {pago
              ? 'Sua unidade do Módulo Grow-X está reservada no lote de lançamento, com 3 meses de GXP Premium inclusos. O comprovante chega no seu e-mail.'
              : pendente
                ? 'Seu pagamento está sendo confirmado — o Pix pode levar alguns instantes. Assim que compensar, a reserva aparece na área do cliente.'
                : 'Se o pagamento foi concluído, o comprovante chega no seu e-mail em instantes.'}
          </p>
        </div>

        {referencia && (
          <div className="mt-9 rounded-2xl border p-5" style={{ borderColor: LINE, background: SURFACE }}>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
              Código do pedido — guarde
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="min-w-0 flex-1 break-all font-mono text-xs text-white/85">{referencia}</code>
              <button
                type="button" onClick={copiar}
                className="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/5"
                style={{ borderColor: LINE }}
              >
                {copiado ? 'Copiado ✓' : 'Copiar'}
              </button>
            </div>
            {info?.contract_version && (
              <p className="mt-3 text-xs" style={{ color: MUTED }}>
                Contrato <strong className="text-white">{info.contract_version}</strong>
                {info.contract_accepted ? ' · aceite registrado' : ''} ·{' '}
                <Link to="/prevenda/contrato" className="underline underline-offset-2" style={{ color: GREEN }}>ver contrato</Link>
              </p>
            )}
          </div>
        )}

        <div className="mt-6 rounded-2xl border p-6" style={{ borderColor: LINE, background: SURFACE }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Próximos passos</h2>
          <ol className="mt-4 space-y-3 text-sm leading-relaxed" style={{ color: MUTED }}>
            <li><strong className="text-white">1.</strong> O comprovante de pagamento chega no seu e-mail.</li>
            <li><strong className="text-white">2.</strong> Nosso time chama você no WhatsApp pra confirmar os dados de entrega.</li>
            <li><strong className="text-white">3.</strong> Em outubro o GXP lança e seus 3 meses de Premium são ativados.</li>
            <li><strong className="text-white">4.</strong> A partir de 20/11: entrega no seu endereço ou retirada na ExpoCannabis Brasil.</li>
          </ol>
        </div>

        <div className="mt-6 rounded-2xl border p-6" style={{ borderColor: 'rgba(74,222,128,0.26)', background: 'rgba(74,222,128,0.06)' }}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Acompanhe quando quiser</h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
            Consulte o status do pedido a qualquer momento com o e-mail e o CPF da compra. Pode cancelar
            com reembolso integral até o envio.
          </p>
          <Link
            to="/prevenda/pedido"
            className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-bold transition hover:brightness-110"
            style={{ background: GREEN, color: '#05130a' }}
          >
            Abrir área do cliente
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href={WHATSAPP} target="_blank" rel="noreferrer noopener"
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
