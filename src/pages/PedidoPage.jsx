import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { SEO } from '@/components/visual';
import { track } from '@/lib/analytics';
import { documentoValido, emailValido, formataDocumento } from '@/lib/cpf';

const BG = '#080b09';
const SURFACE = 'rgba(255,255,255,0.035)';
const LINE = 'rgba(255,255,255,0.09)';
const GREEN = '#4ade80';
const MUTED = '#9fb3a6';
const WHATSAPP = 'https://wa.me/5541995494343?text=Preciso%20de%20ajuda%20com%20meu%20pedido%20da%20pr%C3%A9-venda%20do%20M%C3%B3dulo%20Grow-X';

const brl = (centavos) => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBr = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR');
};


function Etapas({ etapas, atual }) {
  const idx = etapas.findIndex((e) => e.id === atual);
  return (
    <ol className="mt-6 space-y-4">
      {etapas.map((e, i) => {
        const feito = i <= idx;
        return (
          <li key={e.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-bold"
                style={feito
                  ? { background: GREEN, color: '#05130a' }
                  : { border: `1px solid ${LINE}`, color: MUTED }}
              >
                {feito ? <Check aria-hidden="true" size={12} strokeWidth={3} /> : i + 1}
              </span>
              {i < etapas.length - 1 && (
                <span className="mt-1 w-px flex-1" style={{ background: i < idx ? GREEN : LINE }} />
              )}
            </div>
            <div className="pb-2">
              <p className="text-sm font-semibold" style={{ color: feito ? '#fff' : MUTED }}>
                {e.titulo}
                {i === idx && (
                  <span className="ml-2 rounded-full px-2 py-0.5 font-mono text-[0.6rem] uppercase" style={{ background: 'rgba(74,222,128,0.14)', color: GREEN }}>
                    agora
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: MUTED }}>{e.detalhe}</p>
              <p className="mt-1 font-mono text-[0.65rem]" style={{ color: 'rgba(159,179,166,0.6)' }}>
                previsto para {dataBr(`${e.desde}T12:00:00-03:00`)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function CardPedido({ p }) {
  const pago = p.status === 'pago';
  return (
    <div className="rounded-2xl border p-6" style={{ borderColor: pago ? 'rgba(74,222,128,0.3)' : LINE, background: pago ? 'rgba(74,222,128,0.05)' : SURFACE }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className="rounded-full px-3 py-1 font-mono text-[0.65rem] font-bold uppercase tracking-wide"
          style={pago
            ? { background: 'rgba(74,222,128,0.16)', color: GREEN }
            : { background: 'rgba(245,181,68,0.12)', color: '#f5b544' }}
        >
          {pago ? 'Pagamento confirmado' : `Pagamento ${p.status}`}
        </span>
        <span className="font-mono text-[0.65rem]" style={{ color: MUTED }}>{dataBr(p.criado_em)}</span>
      </div>

      <p className="mt-4 text-2xl font-extrabold text-white">{brl(p.valor_centavos)}</p>
      <p className="text-sm" style={{ color: MUTED }}>{p.forma}</p>

      <dl className="mt-5 space-y-2 text-sm">
        {[
          ['Titular', p.nome],
          ['CPF', p.cpf_mascarado],
          ['Código da reserva', p.codigo_reserva],
          ['Referência', p.referencia],
          ['Contrato', p.contrato_versao ? `${p.contrato_versao}${p.contrato_aceito ? ' · aceito' : ''}` : null],
        ].filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex flex-wrap justify-between gap-2">
            <dt style={{ color: MUTED }}>{k}</dt>
            <dd className="max-w-[60%] break-all text-right font-mono text-xs text-white/85">{v}</dd>
          </div>
        ))}
      </dl>

      {!p.cpf_verificado && (
        <p className="mt-4 text-xs leading-relaxed" style={{ color: '#f5b544' }}>
          Este pedido foi feito antes da coleta de CPF no checkout, então não deu pra conferir o CPF
          automaticamente. Chama a gente no WhatsApp pra vincular.
        </p>
      )}
      {p.status_confiavel === false && (
        <p className="mt-4 text-xs leading-relaxed" style={{ color: '#f5b544' }}>
          O status financeiro está temporariamente indisponível. O pedido foi localizado,
          mas a confirmação precisa ser refeita antes de qualquer decisão sobre produção ou envio.
        </p>
      )}
    </div>
  );
}

export default function PedidoPage() {
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [codigo, setCodigo] = useState('');
  const [challengeId, setChallengeId] = useState(null);
  const [etapaAcesso, setEtapaAcesso] = useState('dados'); // dados | codigo
  const [estado, setEstado] = useState('idle'); // idle | enviando | verificando | ok | erro
  const [erro, setErro] = useState(null);
  const [dados, setDados] = useState(null);
  const possuiPedidoAtivo = Boolean(dados?.pedidos?.some((p) => p.fulfillment_ativo));

  const solicitarCodigo = async (e) => {
    e.preventDefault();
    if (estado === 'enviando') return;
    if (!emailValido(email) || !documentoValido(cpf)) {
      setErro('Confira o formato do e-mail e do CPF/CNPJ usados na compra.');
      setEstado('erro');
      return;
    }
    setEstado('enviando');
    setErro(null);
    setDados(null);
    track('solicitacao_codigo_pedido', { page: '/prevenda/pedido' });

    try {
      const r = await fetch('/api/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request_code', email: email.trim(), cpf }),
      });
      const data = await r.json().catch(() => null);

      if (!r.ok) {
        setErro(data?.error === 'consulta_indisponivel'
          ? 'O acesso está indisponível agora. Tenta em instantes ou chama no WhatsApp.'
          : 'Não deu pra solicitar o código agora. Tenta de novo ou chama no WhatsApp.');
        setEstado('erro');
        return;
      }
      setChallengeId(data?.challenge_id || null);
      setCodigo('');
      setEtapaAcesso('codigo');
      setEstado('idle');
    } catch {
      setErro('Falha de conexão. Tenta de novo ou chama no WhatsApp.');
      setEstado('erro');
    }
  };

  const verificarCodigo = async (e) => {
    e.preventDefault();
    if (estado === 'verificando' || !challengeId) return;
    setEstado('verificando');
    setErro(null);
    setDados(null);
    track('verificacao_codigo_pedido', { page: '/prevenda/pedido' });

    try {
      const r = await fetch('/api/pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_code',
          challengeId,
          code: codigo,
          email: email.trim(),
          cpf,
        }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok) {
        setErro(data?.error === 'codigo_invalido'
          ? 'Código inválido, expirado ou já utilizado. Confira o e-mail ou solicite outro código.'
          : 'A consulta está indisponível agora. Tenta em instantes ou chama no WhatsApp.');
        setEstado('erro');
        return;
      }
      setDados(data);
      setEstado('ok');
    } catch {
      setErro('Falha de conexão. Tenta de novo ou chama no WhatsApp.');
      setEstado('erro');
    }
  };

  const alterarDados = () => {
    setEtapaAcesso('dados');
    setChallengeId(null);
    setCodigo('');
    setDados(null);
    setErro(null);
    setEstado('idle');
  };

  return (
    <div style={{ background: BG }} className="min-h-screen text-white">
      <SEO
        title="Meu pedido — pré-venda Módulo Grow-X"
        description="Acompanhe o pedido da pré-venda do Módulo Grow-X com um código seguro enviado ao e-mail da compra."
        path="/prevenda/pedido"
        noIndex
      />

      <div className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <Link to="/prevenda" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em]" style={{ color: GREEN }}>
          <ArrowLeft aria-hidden="true" size={14} />
          voltar pra pré-venda
        </Link>

        <h1 className="mt-8 text-display-lg font-extrabold text-white">Área do cliente</h1>
        <p className="mt-4 text-lg" style={{ color: MUTED }}>
          Informe os dados da compra. Antes de mostrar qualquer pedido, enviaremos um código de uso único ao e-mail informado.
        </p>

        {estado !== 'ok' && (etapaAcesso === 'dados' ? (
          <form onSubmit={solicitarCodigo} className="mt-10 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="email" value={email} onChange={(ev) => setEmail(ev.target.value)}
                placeholder="E-mail da compra" required aria-label="E-mail da compra" autoComplete="email"
                className="rounded-xl border bg-transparent px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                style={{ borderColor: LINE }}
              />
              <input
                type="text" inputMode="numeric" value={cpf}
                onChange={(ev) => setCpf(formataDocumento(ev.target.value))}
                placeholder="CPF ou CNPJ" required aria-label="CPF ou CNPJ" autoComplete="off"
                className="rounded-xl border bg-transparent px-4 py-3.5 font-mono text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                style={{ borderColor: LINE }}
              />
            </div>
            <button
              type="submit" disabled={estado === 'enviando'}
              className="rounded-xl px-6 py-3.5 text-sm font-bold transition hover:brightness-110 disabled:opacity-60"
              style={{ background: GREEN, color: '#05130a' }}
            >
              {estado === 'enviando' ? 'Enviando…' : 'Enviar código'}
            </button>
          </form>
        ) : (
          <form onSubmit={verificarCodigo} className="mt-10 rounded-2xl border p-5 sm:p-6" style={{ borderColor: LINE, background: SURFACE }}>
            <p className="text-sm font-semibold text-white">Confira seu e-mail</p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>
              Se os dados informados forem válidos, você receberá um código de 6 dígitos. Ele expira em 10 minutos e funciona uma única vez.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                type="text" inputMode="numeric" value={codigo}
                onChange={(ev) => setCodigo(ev.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000" required minLength={6} maxLength={6}
                pattern="[0-9]{6}" aria-label="Código de acesso de 6 dígitos"
                autoComplete="one-time-code" autoFocus
                className="min-w-0 flex-1 rounded-xl border bg-transparent px-4 py-3.5 text-center font-mono text-xl tracking-[0.35em] text-white outline-none transition placeholder:text-white/25 focus:border-white/30"
                style={{ borderColor: LINE }}
              />
              <button
                type="submit" disabled={estado === 'verificando' || codigo.length !== 6}
                className="rounded-xl px-6 py-3.5 text-sm font-bold transition hover:brightness-110 disabled:opacity-60"
                style={{ background: GREEN, color: '#05130a' }}
              >
                {estado === 'verificando' ? 'Verificando…' : 'Acessar pedido'}
              </button>
            </div>
            <button type="button" onClick={alterarDados} className="mt-4 text-xs font-semibold underline underline-offset-4" style={{ color: MUTED }}>
              Corrigir dados ou solicitar outro código
            </button>
          </form>
        ))}

        {erro && (
          <p className="mt-5 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(245,181,68,0.32)', background: 'rgba(245,181,68,0.08)', color: '#f6e3bd' }}>
            {erro}{' '}
            <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="font-semibold underline underline-offset-2" style={{ color: GREEN }}>
              Chamar no WhatsApp
            </a>
          </p>
        )}

        {estado === 'ok' && dados?.busca_parcial && (
          <p className="mt-5 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(245,181,68,0.32)', background: 'rgba(245,181,68,0.08)', color: '#f6e3bd' }}>
            {dados.fontes?.ledger === false
              ? 'O status financeiro técnico não respondeu agora, então nenhum estado de pagamento foi presumido'
              : 'Um dos meios de pagamento não respondeu agora, então esta consulta pode estar incompleta'}
            {dados.fontes?.pix === false ? ' (pedidos no Pix)' : ''}
            {dados.fontes?.cartao === false ? ' (pedidos no cartão)' : ''}.
            Se você não encontrar seu pedido aqui,{' '}
            <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="font-semibold underline underline-offset-2" style={{ color: GREEN }}>
              chama a gente no WhatsApp
            </a>{' '}
            que a gente confirma na hora.
          </p>
        )}

        {estado === 'ok' && dados?.encontrados === 0 && (
          <div className="mt-8 rounded-2xl border p-6" style={{ borderColor: LINE, background: SURFACE }}>
            <p className="text-base font-semibold text-white">Nenhum pedido encontrado com esses dados.</p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>
              Confere se o e-mail e o CPF são exatamente os que você usou no pagamento. Se o pagamento
              acabou de ser feito, pode levar alguns minutos até aparecer aqui.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={alterarDados} className="rounded-xl border px-5 py-3 text-sm font-semibold text-white" style={{ borderColor: LINE }}>
                Consultar outros dados
              </button>
              <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="rounded-xl px-5 py-3 text-sm font-bold" style={{ background: GREEN, color: '#05130a' }}>
                Falar com o time
              </a>
              <Link to="/prevenda" className="rounded-xl border px-5 py-3 text-sm font-semibold text-white" style={{ borderColor: LINE }}>
                Ver a pré-venda
              </Link>
            </div>
          </div>
        )}

        {estado === 'ok' && dados?.encontrados > 0 && (
          <div className="mt-10 space-y-8">
            <button type="button" onClick={alterarDados} className="text-xs font-semibold underline underline-offset-4" style={{ color: MUTED }}>
              Consultar outro pedido
            </button>
            <div className="space-y-4">
              {dados.pedidos.map((p) => <CardPedido key={`${p.provedor}-${p.referencia}`} p={p} />)}
            </div>

            {/* A régua de produção só faz sentido pra quem tem pagamento confirmado.
                Mostrar "Pedido confirmado ✓" pra pagamento recusado seria mentira. */}
            {possuiPedidoAtivo ? (
              <div className="rounded-2xl border p-6" style={{ borderColor: LINE, background: SURFACE }}>
                <h2 className="text-base font-bold text-white">Status de produção e envio</h2>
                <p className="mt-1 text-xs" style={{ color: MUTED }}>
                  {dados.etapa_estimada
                    ? 'O lote é produzido em conjunto. As etapas abaixo seguem o cronograma previsto — ainda não confirmadas pelo time de produção.'
                    : 'O lote é produzido em conjunto. A etapa marcada como atual foi confirmada pelo time de produção.'}
                </p>
                <Etapas etapas={dados.etapas} atual={dados.etapa_atual} />
              </div>
            ) : (
              <div className="rounded-2xl border p-6" style={{ borderColor: 'rgba(245,181,68,0.32)', background: 'rgba(245,181,68,0.07)' }}>
                <h2 className="text-base font-bold text-white">Produção e envio não confirmados</h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: '#f6e3bd' }}>
                  Encontramos seu pedido, mas o estado financeiro atual não autoriza confirmar produção
                  ou envio. Se o pagamento acabou de ser feito, a conciliação pode levar alguns minutos.{' '}
                  <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="font-semibold underline underline-offset-2" style={{ color: GREEN }}>
                    chama a gente no WhatsApp
                  </a>{' '}
                  com o comprovante que a gente resolve.
                </p>
              </div>
            )}

            <div className="rounded-2xl border p-6" style={{ borderColor: LINE, background: SURFACE }}>
              <h2 className="text-base font-bold text-white">Cancelamento e garantia</h2>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
                Você pode cancelar a qualquer momento <strong className="text-white">até o envio</strong>, com
                reembolso integral e sem justificativa — é só pedir pelo WhatsApp ou por e-mail. Depois da
                entrega, o produto tem <strong className="text-white">garantia de 12 meses</strong> conforme o contrato.
                Detalhes no{' '}
                <Link to="/prevenda/contrato" className="underline underline-offset-2" style={{ color: GREEN }}>
                  contrato de pré-venda
                </Link>.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="rounded-xl border px-5 py-3 text-sm font-semibold text-white" style={{ borderColor: LINE }}>
                  Pedir cancelamento
                </a>
                <a href="mailto:growx@growx.com.br?subject=Pedido%20de%20cancelamento%20-%20pr%C3%A9-venda%20M%C3%B3dulo" className="rounded-xl border px-5 py-3 text-sm font-semibold text-white" style={{ borderColor: LINE }}>
                  Enviar e-mail
                </a>
              </div>
            </div>
          </div>
        )}

        <p className="mt-12 text-xs leading-relaxed" style={{ color: 'rgba(159,179,166,0.6)' }}>
          Só consultamos Stripe ou Mercado Pago depois que o código enviado ao e-mail é validado. O status
          financeiro é confirmado no ledger técnico pseudonimizado da pré-venda, e a Grow-X não armazena
          dados de cartão. O CPF/CNPJ autentica a consulta e apoia a emissão fiscal — veja a{' '}
          <Link to="/privacidade" className="underline underline-offset-2">política de privacidade</Link>.
        </p>
      </div>
    </div>
  );
}
