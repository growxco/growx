import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/visual';
import { track } from '@/lib/analytics';
import { documentoValido, emailValido, formataDocumento, nomeCompleto } from '@/lib/cpf';
import { OFERTA, brlCurto, economiaCentavos, parcelaCurta } from '@/lib/oferta';
import ControllerShowcase from '@/components/prevenda/ControllerShowcase';
import ImageLightbox from '@/components/prevenda/ImageLightbox';

import logoGrowX from '../assets/logo-growx-oficial.png';
import fotoHero from '../assets/modulo-hero.webp';
import fotoTomadas from '../assets/modulo-tomadas.webp';
import fotoAberto from '../assets/modulo-aberto.webp';
import fotoContexto from '../assets/modulo-contexto.webp';

const WHATSAPP = 'https://wa.me/5541995494343?text=Quero%20garantir%20meu%20M%C3%B3dulo%20Grow-X%20na%20pr%C3%A9-venda';
const ENCERRAMENTO = new Date(OFERTA.checkoutFechamentoISO);
const PRECO_PIX = brlCurto(OFERTA.pixCentavos);
const PRECO_CARTAO = brlCurto(OFERTA.cartaoCentavos);
const PRECO_PUBLICO = brlCurto(OFERTA.publicoCentavos);
const PARCELA = parcelaCurta();
const ECONOMIA = brlCurto(economiaCentavos);

/* Paleta da landing — dark premium, mais fechada que o resto do site */
const BG = '#080b09';
const SURFACE = 'rgba(255,255,255,0.035)';
const LINE = 'rgba(255,255,255,0.09)';
const GREEN = '#4ade80';
const MUTED = '#9fb3a6';
const INPUT_CLASS = 'mt-2 w-full rounded-xl border bg-transparent px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus-visible:border-[#4ade80] focus-visible:ring-2 focus-visible:ring-[#4ade80]/30';

const NAV = [
  ['O módulo', '#modulo'],
  ['Controlador', '#controlador'],
  ['GXP real', '#gxp-real'],
  ['Como funciona', '#como'],
  ['FAQ', '#faq'],
];

const RECURSOS = [
  ['01', 'Seis tomadas inteligentes', 'Luz, exaustor, umidificador e bomba — cada tomada liga e desliga por rotina ou leitura compatível.'],
  ['02', 'Fotoperíodo verificável', 'Liga/desliga por horário e, com driver DIM/PWM compatível, transições graduais de nascer e pôr do sol.'],
  ['03', 'Rega por umidade', 'Limiar do solo, validade da leitura, intervalo e limite da bomba ficam explícitos antes de ativar. Boia de nível é opcional.'],
  ['04', 'Sensores + alertas no painel', 'Temperatura, umidade e sensores de vaso aparecem com status e idade da leitura; alertas trazem causa e efeito.'],
  ['05', 'GXP Premium incluso', 'A pré-venda inclui 3 meses de GXP Premium, sem renovação automática, conforme o contrato.'],
  ['06', 'Rotina local', 'Se a nuvem cair, a central mantém a última configuração local e o app marca o estado como não confirmado.'],
];

const PASSOS = [
  ['PASSO 1', 'Você reserva hoje', `${PRECO_PIX} no Pix ou ${PARCELA} no cartão (${PRECO_CARTAO}). Pagamento processado por Stripe e Mercado Pago.`],
  ['PASSO 2', 'Recebe tudo por escrito', 'Aceite do contrato registrado junto ao pedido, comprovante no seu e-mail e área do cliente vinculada ao seu CPF, com status de produção e envio.'],
  ['PASSO 3', 'Acompanha o lote', `Produção, montagem, QA e expedição aparecem na área do cliente. Entregas a partir de ${OFERTA.entregaBR}, por envio ou retirada no evento.`],
];

const MARCOS = [
  ['Hoje', 'Reserva confirmada', 'Pagamento aprovado e unidade registrada no lote de lançamento.'],
  ['15/09', 'Produção do lote', 'Fabricação das placas e dos gabinetes.'],
  ['20/10', 'Montagem e testes', 'Montagem final e QA unidade por unidade.'],
  ['10/11', 'Expedição', 'Embalagem e emissão da nota fiscal.'],
  [OFERTA.entregaBR.slice(0, 5), 'Entregas', 'Envio ao endereço cadastrado ou retirada no evento.'],
];

const ESPECIFICACOES = [
  ['Saídas', '6 tomadas automatizadas'],
  ['Rede', 'Wi‑Fi 2,4 GHz'],
  ['Sensores previstos', 'Solo, temperatura e umidade do ar'],
  ['Iluminação', 'Liga/desliga e DIM/PWM com driver compatível'],
  ['Sem nuvem', 'Executa localmente a última configuração'],
  ['Antes do envio', 'Tensão, corrente, dimensões e composição final do kit serão confirmadas no manual'],
];

const INCLUSO = [
  'Módulo Grow-X com 6 tomadas e entradas para sensores',
  '3 meses de GXP Premium inclusos',
  'Contrato de pré-venda + área do cliente com CPF',
  'Reembolso integral até o envio · garantia de 12 meses conforme o contrato',
];

const FAQ = [
  ['Quando eu recebo o módulo?', `As entregas começam em ${OFERTA.entregaBR}, data do lançamento oficial na ${OFERTA.evento}. Você acompanha a etapa confirmada do lote na área do cliente.`],
  ['E se eu me arrepender?', 'Você pode cancelar a qualquer momento até o envio. O reembolso integral é processado pelo mesmo meio em até 10 dias úteis da solicitação, além do prazo da instituição financeira. Depois da entrega, vale a garantia total de 12 meses.'],
  ['Como sei que meu pedido tá garantido?', 'O aceite do contrato de pré-venda fica registrado junto ao pedido, com data e versão, e o comprovante de pagamento chega no seu e-mail. A qualquer momento você consulta o pedido em growx.com.br/prevenda/pedido com o e-mail e o CPF da compra. Nada fica no fiado.'],
  ['Quais as formas de pagamento?', `Pix (${PRECO_PIX}) ou cartão em até ${PARCELA} (${PRECO_CARTAO}), processados por Stripe e Mercado Pago.`],
  ['Como funciona o frete?', 'O contrato permite envio ao endereço cadastrado ou retirada presencial na ExpoCannabis. Como custo e cobertura de frete não estão definidos nesta página, confirme as condições do seu CEP com o time antes de comprar.'],
  ['Preciso entender de eletrônica e automação?', 'A configuração prevista é guiada e termina com as saídas desligadas. A instalação elétrica, a tensão e a carga de cada equipamento precisam respeitar o manual final.'],
  ['O que está pronto e o que é protótipo?', 'As capturas identificadas como GXP hoje são do sistema real. As telas do controlador vêm do protótipo UX/UI baseado no firmware v0.6.0; irrigação por agenda, push e atualização OTA aparecem no PDF como recursos futuros.'],
  ['Serve para o meu setup?', 'A central prevê 6 tomadas, entradas para sensores e Wi‑Fi 2,4 GHz. Tensão, carga máxima por tomada, dimensões e composição final do kit ainda precisam ser conferidas no manual antes do envio; fale com o time para validar o seu equipamento.'],
];

const PRODUCT_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Módulo Grow-X',
  description:
    'Central de automação para cultivo indoor: 6 tomadas inteligentes, fotoperíodo, irrigação por umidade do solo, sensores, alertas e app GXP. Transições graduais exigem driver DIM/PWM compatível.',
  sku: 'GX-MODULO-PREVENDA',
  brand: { '@type': 'Brand', name: 'Grow-X' },
  manufacturer: { '@type': 'Organization', name: 'Grow-X Co.' },
  image: 'https://www.growx.com.br/og-prevenda-v2.jpg',
  offers: [
    { '@type': 'Offer', name: 'Pré-venda · Pix', price: (OFERTA.pixCentavos / 100).toFixed(2), priceCurrency: 'BRL', availability: 'https://schema.org/PreOrder', priceValidUntil: OFERTA.encerramentoISO, url: 'https://www.growx.com.br/prevenda', seller: { '@type': 'Organization', name: 'Grow-X Co.' } },
    { '@type': 'Offer', name: 'Pré-venda · cartão em até 12x', price: (OFERTA.cartaoCentavos / 100).toFixed(2), priceCurrency: 'BRL', availability: 'https://schema.org/PreOrder', priceValidUntil: OFERTA.encerramentoISO, url: 'https://www.growx.com.br/prevenda', seller: { '@type': 'Organization', name: 'Grow-X Co.' } },
  ],
  additionalProperty: [
    { '@type': 'PropertyValue', name: 'Dimming', value: 'Requer driver DIM/PWM compatível' },
  ],
};

function useDiasRestantes() {
  const [dias, setDias] = useState(() => Math.ceil((ENCERRAMENTO - Date.now()) / 86400000));
  useEffect(() => {
    const t = setInterval(() => setDias(Math.ceil((ENCERRAMENTO - Date.now()) / 86400000)), 60000);
    return () => clearInterval(t);
  }, []);
  return dias > 0 ? dias : 0;
}

function useCheckout() {
  const [loading, setLoading] = useState(null);
  const [erro, setErro] = useState(null);
  const requestIds = useRef({});

  // Ao mandar o comprador pro provedor a gente deixa o botão em "Abrindo…".
  // Se ele voltar (botão voltar do navegador), a página volta do bfcache com
  // esse estado congelado e os dois botões ficam travados pra sempre.
  useEffect(() => {
    const destravar = () => { setLoading(null); setErro(null); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') destravar();
    };
    window.addEventListener('pageshow', destravar);
    window.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', destravar);
      window.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const pagar = async (metodo, comprador) => {
    if (loading) return;
    const requestId = requestIds.current[metodo]
      || globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    requestIds.current[metodo] = requestId;
    setLoading(metodo);
    setErro(null);
    track('begin_checkout', { method: metodo, value: metodo === 'pix' ? 2800 : 3000, currency: 'BRL', page: '/prevenda' });
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: metodo, requestId, ...comprador }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      track('checkout_error', { method: metodo, code: data?.error || r.status, page: '/prevenda' });
      const mensagens = {
        lote_esgotado: `As ${data?.total || OFERTA.loteTotal} unidades da pré-venda acabaram. Entre na lista do próximo lote.`,
        oferta_encerrada: `A pré-venda encerrou em ${OFERTA.encerramentoBR}. Entre na lista para o próximo lote.`,
        capacidade_indisponivel: 'Reservas pausadas por segurança enquanto confirmamos a capacidade do lote. Tente novamente em alguns minutos.',
        inventory_not_configured: 'Reservas temporariamente indisponíveis. O time já foi avisado.',
        reserva_em_processamento: 'Sua tentativa anterior ainda está sendo processada. Aguarde alguns segundos e tente de novo.',
        reserva_expirada: 'Sua reserva anterior expirou. Tente novamente para abrir uma nova janela de pagamento.',
        pedido_ja_confirmado: 'Este pedido já foi confirmado. Consulte o status na área do cliente.',
        comprador_ja_reservado: 'Já existe uma reserva ativa ou paga para este CPF/CNPJ. Consulte a área do cliente ou fale com o atendimento.',
        muitas_reservas: 'O limite de reservas deste acesso foi atingido. Aguarde a janela atual terminar ou fale com o atendimento.',
        vendas_pausadas: 'A cobrança está pausada até a publicação da ficha elétrica, composição do kit e condições de frete.',
        provider_indisponivel: 'O provedor de pagamento não respondeu com segurança. Nenhuma nova vaga será aberta até a reconciliação.',
      };
      if (data?.error === 'reserva_expirada') delete requestIds.current[metodo];
      setErro(mensagens[data?.error] || 'Não conseguimos abrir o checkout agora. Tenta de novo — ou fecha direto no WhatsApp.');
    } catch {
      setErro('Falha de conexão. Tenta de novo — ou fecha direto no WhatsApp.');
    }
    setLoading(null);
  };

  return { loading, erro, pagar };
}

/* ---------------- blocos reutilizados ---------------- */

function Pill({ children, tone = 'line' }) {
  const styles = {
    green: { background: 'rgba(74,222,128,0.10)', borderColor: 'rgba(74,222,128,0.30)', color: GREEN },
    line: { background: 'transparent', borderColor: LINE, color: MUTED },
    amber: { background: 'rgba(245,181,68,0.08)', borderColor: 'rgba(245,181,68,0.32)', color: '#f5b544' },
  }[tone];
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[0.7rem] uppercase tracking-[0.14em]"
      style={styles}
    >
      {children}
    </span>
  );
}

function Erro({ erro }) {
  if (!erro) return null;
  return (
    <p role="alert" aria-live="assertive" className="mt-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(245,181,68,0.32)', background: 'rgba(245,181,68,0.08)', color: '#f6e3bd' }}>
      {erro}{' '}
      <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="font-semibold underline underline-offset-2" style={{ color: GREEN }}>
        Chamar no WhatsApp
      </a>
    </p>
  );
}

function BotoesPagamento({ loading, full = false, disabled = false }) {
  return (
    <div className={`flex flex-wrap gap-3 ${full ? 'sm:flex-nowrap' : ''}`}>
      <button
        type="submit"
        name="metodo"
        value="pix"
        disabled={!!loading || disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-[0.95rem] font-bold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080b09] disabled:cursor-not-allowed disabled:opacity-60 ${full ? 'w-full sm:flex-1' : ''}`}
        style={{ background: GREEN, color: '#05130a' }}
      >
        {loading === 'pix' ? 'Abrindo…' : `Pagar no Pix — ${PRECO_PIX}`}
      </button>
      <button
        type="submit"
        name="metodo"
        value="cartao"
        disabled={!!loading || disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-4 text-[0.95rem] font-semibold text-white transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080b09] disabled:cursor-not-allowed disabled:opacity-60 ${full ? 'w-full sm:flex-1' : ''}`}
        style={{ borderColor: LINE }}
      >
        {loading === 'cartao' ? 'Abrindo…' : `Cartão — ${PARCELA}`}
      </button>
    </div>
  );
}

function Nav({ reservaPausada = false }) {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav
      className="fixed inset-x-0 top-0 z-50 transition-colors duration-300"
      style={solid ? { background: 'rgba(8,11,9,0.88)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${LINE}` } : { background: 'transparent' }}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2" aria-label="Grow-X — início">
          <img src={logoGrowX} alt="Grow-X" className="h-7 w-auto" />
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} className="text-sm text-white/70 transition hover:text-white">{label}</a>
          ))}
        </div>
        <a
          href="#reservar"
          onClick={() => track('click_cta_prevenda', { placement: 'nav', page: '/prevenda' })}
          className="rounded-full px-5 py-2.5 text-sm font-bold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
          style={{ background: GREEN, color: '#05130a' }}
        >
          {reservaPausada ? 'Ver status do lote' : `Reservar — ${PRECO_PIX}`}
        </a>
      </div>
    </nav>
  );
}

function BarraFixa({ reservaPausada = false }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 760);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 px-4 py-3"
      style={{
        bottom: 'var(--growx-cookie-offset, 0px)',
        background: 'rgba(8,11,9,0.94)',
        backdropFilter: 'blur(14px)',
        borderTop: `1px solid ${LINE}`,
        paddingBottom: 'max(.75rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] whitespace-nowrap" style={{ color: MUTED }}>Entrega {OFERTA.entregaBR.slice(0, 5)}</p>
          <p className="text-sm font-bold text-white">
            <span style={{ color: GREEN }}>{PRECO_PIX}</span> no Pix <span className="hidden sm:inline" style={{ color: MUTED }}>· ou {PARCELA}</span>
          </p>
        </div>
        <a
          href="#reservar"
          onClick={() => track('click_cta_prevenda', { placement: 'sticky', page: '/prevenda' })}
          className="shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
          style={{ background: GREEN, color: '#05130a' }}
        >
          {reservaPausada ? 'Ver status' : 'Garantir a minha'}
        </a>
      </div>
    </div>
  );
}

function ListaEspera() {
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [estado, setEstado] = useState('idle'); // idle | enviando | ok | erro

  const enviar = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !contato.trim() || estado === 'enviando') return;
    setEstado('enviando');
    const ehEmail = contato.includes('@');
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nome.trim(),
          email: ehEmail ? contato.trim() : 'sem-email@growx.com.br',
          phone: ehEmail ? '' : contato.trim(),
          message: `Lista de espera da pré-venda do Módulo. Contato informado: ${contato.trim()}`,
          _form: 'prevenda-lista',
          _segment: 'cultivo',
          _source: 'prevenda',
          _path: '/prevenda',
        }),
      });
      if (!r.ok) throw new Error('falhou');
      track('lead', { segment: 'cultivo', source: 'prevenda-lista', page: '/prevenda' });
      setEstado('ok');
    } catch {
      setEstado('erro');
    }
  };

  if (estado === 'ok') {
    return (
      <div className="rounded-2xl border p-6" style={{ borderColor: 'rgba(74,222,128,0.30)', background: 'rgba(74,222,128,0.07)' }}>
        <p className="text-lg font-bold text-white">Fechou! 🤙 Você tá na lista.</p>
        <p className="mt-1 text-sm" style={{ color: MUTED }}>Te chamamos antes do preço subir.</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="text" value={nome} onChange={(e) => setNome(e.target.value)}
        placeholder="Seu nome" required aria-label="Seu nome"
        className="min-w-0 flex-1 rounded-xl border bg-transparent px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
        style={{ borderColor: LINE }}
      />
      <input
        type="text" value={contato} onChange={(e) => setContato(e.target.value)}
        placeholder="WhatsApp ou e-mail" required aria-label="WhatsApp ou e-mail"
        className="min-w-0 flex-1 rounded-xl border bg-transparent px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
        style={{ borderColor: LINE }}
      />
      <button
        type="submit" disabled={estado === 'enviando'}
        className="shrink-0 rounded-xl px-6 py-3.5 text-sm font-bold transition hover:brightness-110 disabled:opacity-60"
        style={{ background: GREEN, color: '#05130a' }}
      >
        {estado === 'enviando' ? 'Enviando…' : 'Quero ser avisado'}
      </button>
      {estado === 'erro' && (
        <p className="text-sm sm:absolute sm:mt-16" style={{ color: '#f5b544' }}>Não rolou agora. Tenta de novo ou chama no WhatsApp.</p>
      )}
    </form>
  );
}

/* ---------------- página ---------------- */

export default function PreVendaPage() {
  const { loading, erro, pagar } = useCheckout();
  const dias = useDiasRestantes();
  const eyebrow = useMemo(() => 'font-mono text-[0.7rem] uppercase tracking-[0.18em]', []);
  const fieldRefs = useRef({});
  const formStarted = useRef(false);
  const cepRequest = useRef(0);
  const [form, setForm] = useState({
    nome: '', email: '', cpf: '', aceite: false, ciencia: false,
    telefone: '', cep: '', endereco: '', cidadeUf: '',
  });
  const [erroCampo, setErroCampo] = useState({});
  const [avisoForm, setAvisoForm] = useState(null);
  const [precisaEntrega, setPrecisaEntrega] = useState(false);
  const [cepStatus, setCepStatus] = useState('idle');
  const [lightbox, setLightbox] = useState(null);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const campo = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (erroCampo[k]) setErroCampo((current) => ({ ...current, [k]: false }));
  };

  const registrarInicioForm = () => {
    if (formStarted.current) return;
    formStarted.current = true;
    track('form_start', { form: 'prevenda-reserva', page: '/prevenda' });
  };

  /** CEP preenche cidade/UF sozinho — menos campo pro comprador digitar. */
  const buscarCep = async (valor) => {
    const c = valor.replace(/\D/g, '');
    const requestNumber = ++cepRequest.current;
    setForm((f) => ({ ...f, cep: c.replace(/^(\d{5})(\d)/, '$1-$2') }));
    setErroCampo((current) => ({ ...current, cep: false }));
    if (c.length !== 8) {
      setCepStatus('idle');
      return;
    }
    setCepStatus('loading');
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      if (!r.ok) throw new Error(`viacep_${r.status}`);
      const d = await r.json();
      if (requestNumber !== cepRequest.current) return;
      if (d?.erro) {
        setCepStatus('not-found');
        return;
      }
      setForm((f) => ({
        ...f,
        cidadeUf: [d.localidade, d.uf].filter(Boolean).join('/'),
        endereco: f.endereco || [d.logradouro, d.bairro].filter(Boolean).join(', '),
      }));
      setCepStatus('found');
    } catch {
      if (requestNumber !== cepRequest.current) return;
      setCepStatus('unavailable');
    }
  };

  /** Identificação e aceite são exigidos antes de sair da nossa página. */
  const pagarComDados = (metodo) => {
    // No Pix o Mercado Pago não coleta endereço; sem ele não há entrega.
    const ehPix = metodo === 'pix';
    if (ehPix) setPrecisaEntrega(true);

    const falhas = {
      nome: !nomeCompleto(form.nome),
      email: !emailValido(form.email),
      cpf: !documentoValido(form.cpf),
      telefone: ehPix && form.telefone.replace(/\D/g, '').length < 10,
      cep: ehPix && form.cep.replace(/\D/g, '').length !== 8,
      endereco: ehPix && form.endereco.trim().length < 6,
      cidadeUf: ehPix && !form.cidadeUf.trim(),
      ciencia: !form.ciencia,
      aceite: !form.aceite,
    };
    setErroCampo(falhas);

    const primeiraFalha = Object.entries(falhas).find(([, ruim]) => ruim)?.[0];
    if (primeiraFalha) {
      setAvisoForm({
        nome: 'Informe seu nome completo (nome e sobrenome).',
        email: 'Confere o e-mail — é nele que chega a confirmação do pedido.',
        cpf: 'Documento inválido. Confere o CPF — ou informe o CNPJ, se a compra for pela empresa.',
        telefone: 'Informe um WhatsApp com DDD pra combinarmos a entrega.',
        cep: 'Informe um CEP válido (8 dígitos).',
        endereco: 'Informe o endereço com número.',
        cidadeUf: 'Informe cidade e estado.',
        ciencia: 'Confirme que você leu quais especificações ainda serão formalizadas antes do envio.',
        aceite: 'Marque o aceite do contrato pra seguir pro pagamento.',
      }[primeiraFalha]);
      track('checkout_dados_invalidos', { campo: primeiraFalha, method: metodo, page: '/prevenda' });
      requestAnimationFrame(() => requestAnimationFrame(() => fieldRefs.current[primeiraFalha]?.focus()));
      return;
    }

    setAvisoForm(null);
    pagar(metodo, {
      nome: form.nome, email: form.email, cpf: form.cpf, aceite: true,
      cienciaEspecificacoes: form.ciencia,
      telefone: form.telefone, cep: form.cep, endereco: form.endereco, cidadeUf: form.cidadeUf,
    });
  };

  const [lote, setLote] = useState(null);
  const [loteCarregando, setLoteCarregando] = useState(true);
  const encerrada = Date.now() > ENCERRAMENTO.getTime();

  useEffect(() => { track('view_prevenda', { page: '/prevenda' }); }, []);

  // Capacidade real vem do ledger transacional; sem confirmação, a UI falha fechada.
  useEffect(() => {
    fetch('/api/lote')
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) throw new Error(data?.error || `lote_${r.status}`);
        return data;
      })
      .then((d) => setLote(d?.confiavel === true ? d : { ...d, confiavel: false }))
      .catch(() => setLote({ confiavel: false }))
      .finally(() => setLoteCarregando(false));
  }, []);

  const reservaPausada = loteCarregando || encerrada || lote?.esgotado || lote?.confiavel === false;
  const productLd = useMemo(() => {
    const availability = encerrada
      ? 'https://schema.org/Discontinued'
      : reservaPausada
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/PreOrder';
    return {
      ...PRODUCT_LD,
      offers: PRODUCT_LD.offers.map((offer) => ({ ...offer, availability })),
    };
  }, [encerrada, reservaPausada]);
  const aguardandoValidacao = lote?.motivo === 'validacao_produto';
  const seoTitle = aguardandoValidacao
    ? 'Módulo Grow-X — controlador, GXP e abertura da pré-venda'
    : `Módulo Grow-X — Pré-venda: ${PRECO_PIX} no Pix ou ${PARCELA} · entrega ${OFERTA.entregaBR.slice(0, 5)}`;
  const seoDescription = aguardandoValidacao
    ? 'Conheça o conceito do Módulo Grow-X, o controlador baseado no protótipo v0.6.0 e telas reais do GXP. Pagamento após validação final de Hardware e frete.'
    : `O cérebro do seu grow: 6 tomadas, fotoperíodo, rega por umidade do solo e controlador documentado. Pré-venda ${PRECO_PIX} no Pix; preço público previsto de ${PRECO_PUBLICO}. Com 3 meses de GXP Premium.`;
  const ocupadas = (Number(lote?.vendidas) || 0) + (Number(lote?.reservadas) || 0);
  const loteLabel = loteCarregando
    ? 'Verificando capacidade do lote'
    : encerrada
      ? 'Pré-venda encerrada'
      : lote?.confiavel === false
        ? lote?.motivo === 'validacao_produto'
          ? 'Pagamento aguardando validação final'
          : 'Reservas temporariamente pausadas'
        : lote?.esgotado
          ? 'Lote esgotado'
          : ocupadas > 0
            ? `${lote.restantes} de ${lote.total} unidades disponíveis`
            : `Pré-venda aberta · lote limitado a ${OFERTA.loteTotal}`;
  const loteEmAtencao = encerrada || (!loteCarregando && (lote?.esgotado || lote?.confiavel === false));

  return (
    <div style={{ background: BG }} className="min-h-screen text-white">
      <SEO
        title={seoTitle}
        description={seoDescription}
        path="/prevenda"
        type="product"
        image="https://www.growx.com.br/og-prevenda-v2.jpg"
        jsonLd={productLd}
      />

      <Nav reservaPausada={reservaPausada} />

      {/* ---------- HERO ---------- */}
      <header id="topo" className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={fotoHero} alt="" aria-hidden className="h-full w-full object-cover object-[70%_center]" fetchPriority="high" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${BG} 0%, ${BG}f2 34%, ${BG}b3 56%, transparent 88%)` }} />
          {/* no mobile o texto passa por cima da foto — reforça o contraste */}
          <div className="absolute inset-0 lg:hidden" style={{ background: `linear-gradient(180deg, ${BG}e6 0%, ${BG}cc 55%, ${BG} 100%)` }} />
          <div className="absolute inset-x-0 bottom-0 h-48" style={{ background: `linear-gradient(180deg, transparent, ${BG})` }} />
        </div>

        <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-32 sm:px-8 sm:pb-28 sm:pt-44">
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone={loteEmAtencao ? 'amber' : 'green'}>
              <span className="inline-block size-1.5 rounded-full" style={{ background: GREEN }} />
              {loteLabel}
            </Pill>
            {dias > 0 && <Pill>Faltam {dias} dias para a pré-venda fechar</Pill>}
          </div>

          <h1 className="mt-8 max-w-2xl text-display-xl font-extrabold leading-[0.98] text-white">
            O cérebro<br />do seu grow.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: MUTED }}>
            Uma central para luz, clima e rega, com seis tomadas, sensores compatíveis e rotina local.
            Você define as regras e acompanha o estado pelo GXP.
          </p>

          <div className="mt-9 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="text-5xl font-extrabold text-white sm:text-6xl">{PRECO_PIX}</span>
            <span className="font-mono text-lg font-bold uppercase tracking-wide" style={{ color: GREEN }}>no Pix</span>
            <span className="text-sm" style={{ color: MUTED }}>ou {PARCELA} no cartão</span>
          </div>
          <div className="mt-4">
            <Pill tone="amber">preço público previsto: {PRECO_PUBLICO}</Pill>
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#reservar"
              onClick={() => track('click_cta_prevenda', { placement: 'hero', page: '/prevenda' })}
              className="rounded-xl px-7 py-4 text-[0.95rem] font-bold transition hover:brightness-110"
              style={{ background: GREEN, color: '#05130a' }}
            >
              {reservaPausada ? 'Ver status da reserva' : 'Garantir minha unidade'}
            </a>
            <a
              href={WHATSAPP} target="_blank" rel="noreferrer noopener"
              onClick={() => track('click_whatsapp', { page: '/prevenda', intent: 'hero' })}
              className="rounded-xl border px-7 py-4 text-[0.95rem] font-semibold text-white transition hover:bg-white/5"
              style={{ borderColor: LINE }}
            >
              Chamar no WhatsApp
            </a>
            <button
              type="button"
              onClick={() => {
                track('image_open', { image: 'modulo-hero', page: '/prevenda' });
                setLightbox({
                  src: fotoHero,
                  alt: 'Render conceitual do Módulo Grow-X ao lado de um cultivo indoor',
                  title: 'Conceito visual do Módulo Grow-X',
                  caption: 'Render conceitual do produto; gabinete, acabamento e conexões da unidade final ainda dependem da validação de Hardware.',
                });
              }}
              className="rounded-xl px-2 py-4 text-sm font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
              style={{ color: MUTED }}
            >
              Ver módulo em detalhe
            </button>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-2 text-sm" style={{ color: MUTED }}>
            {['Reembolso integral até o envio', 'Garantia de 12 meses conforme o contrato', `Entrega a partir de ${OFERTA.entregaBR}`].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <span style={{ color: GREEN }}>✓</span>{t}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* ---------- FAIXA ---------- */}
      <section style={{ borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span className={eyebrow} style={{ color: GREEN }}>Lançamento oficial → ExpoCannabis Brasil 2026</span>
          <span className="text-sm" style={{ color: MUTED }}>Pré-venda até {OFERTA.encerramentoBR}; preço público previsto de {PRECO_PUBLICO} após o lançamento.</span>
        </div>
      </section>

      {/* ---------- O MÓDULO ---------- */}
      <section id="modulo" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className={eyebrow} style={{ color: GREEN }}>O módulo — 6 tomadas, 1 central</p>
        <h2 className="mt-5 max-w-2xl text-display-lg font-extrabold text-white">Aposenta a gambiarra de timers.</h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed" style={{ color: MUTED }}>
          Uma central única no lugar de réguas, timers analógicos e controladores avulsos.
          Depois da instalação e da configuração, a central aplica localmente as rotinas que você definiu.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <figure className="lg:sticky lg:top-28">
            <button
              type="button"
              onClick={() => {
                track('image_open', { image: 'modulo-tomadas', page: '/prevenda' });
                setLightbox({
                  src: fotoTomadas,
                  alt: 'Render conceitual do painel do Módulo Grow-X com seis tomadas',
                  title: 'Conceito de seis saídas em uma central',
                  caption: 'Render conceitual; formato das tomadas, gabinete e acabamento ainda dependem da validação de Hardware.',
                });
              }}
              className="w-full cursor-zoom-in overflow-hidden rounded-3xl border text-left transition hover:border-[#4ade80]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
              style={{ borderColor: LINE }}
              aria-label="Ampliar render conceitual do painel com seis tomadas"
            >
              <img src={fotoTomadas} alt="Render conceitual do painel do Módulo Grow-X com seis tomadas" className="w-full" loading="lazy" />
            </button>
            <figcaption className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
              Render conceitual; formato das tomadas, gabinete e acabamento ainda dependem da validação de Hardware.
            </figcaption>
          </figure>

          <div className="grid gap-4 sm:grid-cols-2">
            {RECURSOS.map(([n, titulo, texto]) => (
              <div key={n} className="rounded-2xl border p-6" style={{ borderColor: LINE, background: SURFACE }}>
                <p className="font-mono text-xs font-bold" style={{ color: GREEN }}>{n}</p>
                <h3 className="mt-3 text-base font-bold text-white">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- POR DENTRO ---------- */}
      <section id="dentro" style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:items-center">
          <figure>
            <button
              type="button"
              onClick={() => {
                track('image_open', { image: 'modulo-aberto', page: '/prevenda' });
                setLightbox({
                  src: fotoAberto,
                  alt: 'Render conceitual do interior projetado para o Módulo Grow-X',
                  title: 'Projeto interno conceitual',
                  caption: 'Render conceitual do projeto interno; não representa uma unidade final validada pela equipe de Hardware.',
                });
              }}
              className="w-full cursor-zoom-in overflow-hidden rounded-3xl border text-left transition hover:border-[#4ade80]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
              style={{ borderColor: LINE }}
              aria-label="Ampliar render conceitual do interior do módulo"
            >
              <img src={fotoAberto} alt="Render conceitual do interior projetado para o Módulo Grow-X" className="w-full" loading="lazy" />
            </button>
            <figcaption className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
              Render conceitual do projeto interno; não representa uma unidade final validada pela equipe de Hardware.
            </figcaption>
          </figure>
          <div>
            <p className={eyebrow} style={{ color: GREEN }}>Por dentro</p>
            <h2 className="mt-5 text-display-lg font-extrabold text-white">Coisa séria, sem caixa-preta.</h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: MUTED }}>
              O render conceitual mostra a arquitetura pretendida de placa, fonte embarcada e conexões para sensores.
              A unidade final terá garantia de 12 meses conforme o contrato; os limites elétricos serão formalizados antes da abertura da cobrança.
            </p>
            <div className="mt-8 space-y-4">
              {[
                'Central dedicada ao fluxo de automação do cultivo.',
                'Entradas previstas para solo, temperatura e umidade do ar.',
                'Defeitos de fabricação têm cobertura de 12 meses, conforme o contrato.',
              ].map((t) => (
                <div key={t} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 font-bold" style={{ color: GREEN }}>✓</span>
                  <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ControllerShowcase
        eyebrowClass={eyebrow}
        colors={{ green: GREEN, muted: MUTED, line: LINE, surface: SURFACE }}
        onOpen={(item) => {
          track('image_open', { image: item.id || item.title, page: '/prevenda' });
          setLightbox(item);
        }}
      />

      {/* ---------- COMPATIBILIDADE ---------- */}
      <section id="compatibilidade" style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
            <div>
              <p className={eyebrow} style={{ color: GREEN }}>Compatibilidade sem chute</p>
              <h2 className="mt-5 text-display-lg font-extrabold text-white">O que já está definido — e o que ainda falta confirmar.</h2>
              <p className="mt-5 text-lg leading-relaxed" style={{ color: MUTED }}>
                O protótipo do controlador define a experiência e os recursos centrais. O PDF não fixa limites elétricos,
                dimensões nem a composição final do kit; por isso esses dados não são tratados aqui como especificação pronta.
              </p>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => track('click_whatsapp', { page: '/prevenda', intent: 'compatibilidade' })}
                className="mt-7 inline-flex rounded-xl border px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
                style={{ borderColor: LINE }}
              >
                Validar meu setup com o time
              </a>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2">
              {ESPECIFICACOES.map(([term, value], index) => (
                <div key={term} className="rounded-2xl border p-5" style={{ borderColor: index === ESPECIFICACOES.length - 1 ? 'rgba(245,181,68,.34)' : LINE, background: BG }}>
                  <dt className="font-mono text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: index === ESPECIFICACOES.length - 1 ? '#f5b544' : GREEN }}>{term}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-white/85">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-4 max-w-xl text-xs leading-relaxed" style={{ color: MUTED }}>
            Imagens do produto são renders conceituais. Gabinete, acabamento, conexões e limites elétricos da unidade final ainda dependem da validação de Hardware.
          </p>
        </div>
      </section>

      {/* ---------- COMO FUNCIONA ---------- */}
      <section id="como" style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
          <p className={eyebrow} style={{ color: GREEN }}>Pré-venda sem mistério</p>
          <h2 className="mt-5 max-w-2xl text-display-lg font-extrabold text-white">Do Pix até a sua porta, tudo por escrito.</h2>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PASSOS.map(([passo, titulo, texto]) => (
              <div key={passo} className="rounded-2xl border p-7" style={{ borderColor: LINE, background: BG }}>
                <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em]" style={{ color: GREEN }}>{passo}</p>
                <h3 className="mt-4 text-lg font-bold text-white">{titulo}</h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>{texto}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <p className="rounded-2xl border px-6 py-5 text-sm" style={{ borderColor: 'rgba(74,222,128,0.24)', background: 'rgba(74,222,128,0.06)', color: '#d6f5e0' }}>
              Mudou de ideia? <strong className="text-white">Reembolso integral até o envio.</strong> Sem letra miúda.
            </p>
            <p className="rounded-2xl border px-6 py-5 text-sm" style={{ borderColor: 'rgba(74,222,128,0.24)', background: 'rgba(74,222,128,0.06)', color: '#d6f5e0' }}>
              Depois da entrega, <strong className="text-white">garantia de 12 meses</strong> conforme o contrato.
            </p>
          </div>

          <div className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={eyebrow} style={{ color: GREEN }}>Cronograma previsto do lote</p>
                <h3 className="mt-3 text-2xl font-extrabold text-white">Cada marco aparece na área do cliente.</h3>
              </div>
              <p className="max-w-md text-xs leading-relaxed" style={{ color: MUTED }}>
                Datas são planejamento. O status confirmado é atualizado pelo time e não avança sozinho só porque o calendário virou.
              </p>
            </div>
            <ol className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {MARCOS.map(([date, title, detail], index) => (
                <li key={title} className="relative rounded-2xl border p-5" style={{ borderColor: index === 0 ? 'rgba(74,222,128,.35)' : LINE, background: BG }}>
                  <p className="font-mono text-xs font-bold" style={{ color: GREEN }}>{date}</p>
                  <h4 className="mt-3 text-sm font-bold text-white">{title}</h4>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: MUTED }}>{detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------- RESERVAR ---------- */}
      <section id="reservar" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28">
        <p className={eyebrow} style={{ color: GREEN }}>
          {lote?.motivo === 'validacao_produto' ? 'Abertura responsável da pré-venda' : 'Garanta o preço de pré-venda'}
        </p>
        <h2 className="mt-5 max-w-2xl text-display-lg font-extrabold text-white">
          {lote?.motivo === 'validacao_produto'
            ? 'O pagamento abre depois da ficha elétrica e do frete estarem confirmados.'
            : `${ECONOMIA} abaixo do preço público previsto.`}
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* card principal */}
          <div className="flex flex-col rounded-3xl border p-7 sm:p-9" style={{ borderColor: 'rgba(74,222,128,0.35)', background: 'linear-gradient(180deg, rgba(74,222,128,0.07), rgba(74,222,128,0.02))' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em]" style={{ color: GREEN }}>Pré-venda · até {OFERTA.encerramentoBR}</p>
              {dias > 0 && <Pill tone="green">Faltam {dias} dias para fechar</Pill>}
            </div>

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="text-5xl font-extrabold text-white sm:text-6xl">{PRECO_PIX}</span>
              <span className="text-sm" style={{ color: MUTED }}>no Pix · ou {PARCELA} ({PRECO_CARTAO})</span>
            </div>

            <div className="mt-8 space-y-3.5">
              {INCLUSO.map((t) => (
                <div key={t} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 font-bold" style={{ color: GREEN }}>✓</span>
                  <p className="text-sm leading-relaxed text-white/85">{t}</p>
                </div>
              ))}
            </div>

            {reservaPausada ? (
              <div className="mt-9 rounded-2xl border p-6" style={{ borderColor: 'rgba(245,181,68,0.35)', background: 'rgba(245,181,68,0.08)' }}>
                <p className="text-lg font-bold text-white">
                  {loteCarregando && 'Verificando a capacidade do lote…'}
                  {!loteCarregando && encerrada && 'Esta pré-venda foi encerrada.'}
                  {!loteCarregando && !encerrada && lote?.esgotado && `As ${lote.total || OFERTA.loteTotal} unidades da pré-venda acabaram.`}
                   {!loteCarregando && !encerrada && !lote?.esgotado && lote?.confiavel === false && (
                     lote?.motivo === 'validacao_produto'
                       ? 'O pagamento ainda não foi aberto.'
                       : 'Reservas temporariamente pausadas por segurança.'
                   )}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: '#f6e3bd' }}>
                  {loteCarregando
                    ? 'A compra é liberada somente depois que o servidor confirma uma vaga real.'
                    : lote?.confiavel === false && !encerrada
                      ? lote?.motivo === 'validacao_produto'
                        ? 'Tensão, carga máxima, composição do kit e condições de frete precisam ser publicadas e aprovadas antes de qualquer cobrança. Entre na lista para receber a abertura.'
                        : 'Não conseguimos confirmar o inventário agora. Nenhuma cobrança será aberta enquanto essa verificação falhar.'
                      : 'Entre na lista do próximo lote e receba o aviso antes da divulgação.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {!loteCarregando && (
                    <a href="#lista" className="rounded-xl px-5 py-3 text-sm font-bold" style={{ background: GREEN, color: '#05130a' }}>
                      Entrar na lista
                    </a>
                  )}
                  <a
                    href={WHATSAPP} target="_blank" rel="noreferrer noopener"
                    onClick={() => track('click_whatsapp', { page: '/prevenda', intent: 'reserva-pausada' })}
                    className="rounded-xl border px-5 py-3 text-sm font-semibold text-white"
                    style={{ borderColor: LINE }}
                  >
                    Falar com o time
                  </a>
                </div>
              </div>
            ) : (
              <form
                className="mt-9"
                noValidate
                onFocusCapture={registrarInicioForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  const metodo = event.nativeEvent.submitter?.value;
                  if (metodo === 'pix' || metodo === 'cartao') pagarComDados(metodo);
                }}
              >
                <fieldset>
                  <legend className="font-mono text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
                    Seus dados — usados no contrato e na nota fiscal
                  </legend>
                  <div className="mt-4 space-y-4">
                    <label className="block text-sm font-semibold text-white" htmlFor="reserva-nome">
                      Nome completo
                      <input
                        ref={(node) => { fieldRefs.current.nome = node; }}
                        id="reserva-nome" type="text" value={form.nome} onChange={campo('nome')}
                        placeholder="Nome e sobrenome" autoComplete="name" required
                        aria-invalid={erroCampo.nome || undefined} aria-describedby="reserva-erro"
                        className={INPUT_CLASS}
                        style={{ borderColor: erroCampo.nome ? 'rgba(245,181,68,0.6)' : LINE }}
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold text-white" htmlFor="reserva-email">
                        E-mail
                        <input
                          ref={(node) => { fieldRefs.current.email = node; }}
                          id="reserva-email" type="email" value={form.email} onChange={campo('email')}
                          placeholder="voce@exemplo.com" autoComplete="email" required
                          aria-invalid={erroCampo.email || undefined} aria-describedby="reserva-erro"
                          className={INPUT_CLASS}
                          style={{ borderColor: erroCampo.email ? 'rgba(245,181,68,0.6)' : LINE }}
                        />
                      </label>
                      <label className="block text-sm font-semibold text-white" htmlFor="reserva-cpf">
                        CPF ou CNPJ
                        <input
                          ref={(node) => { fieldRefs.current.cpf = node; }}
                          id="reserva-cpf" type="text" inputMode="numeric" value={form.cpf}
                          onChange={(event) => {
                            setForm((current) => ({ ...current, cpf: formataDocumento(event.target.value) }));
                            setErroCampo((current) => ({ ...current, cpf: false }));
                          }}
                          placeholder="Somente números" required
                          aria-invalid={erroCampo.cpf || undefined} aria-describedby="reserva-erro"
                          className={`${INPUT_CLASS} font-mono`}
                          style={{ borderColor: erroCampo.cpf ? 'rgba(245,181,68,0.6)' : LINE }}
                        />
                      </label>
                    </div>
                  </div>
                </fieldset>

                <p className="mt-4 text-xs leading-relaxed" style={{ color: MUTED }}>
                  No cartão, o endereço é coletado pela Stripe. No Pix, os campos de entrega aparecem antes da cobrança.
                </p>

                {precisaEntrega && (
                  <fieldset className="mt-5 rounded-2xl border p-4 sm:p-5" style={{ borderColor: LINE }}>
                    <legend className="px-2 font-mono text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: GREEN }}>
                      Dados de entrega para o Pix
                    </legend>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block text-sm font-semibold text-white" htmlFor="reserva-telefone">
                        WhatsApp com DDD
                        <input
                          ref={(node) => { fieldRefs.current.telefone = node; }}
                          id="reserva-telefone" type="tel" value={form.telefone} onChange={campo('telefone')}
                          placeholder="(41) 99999-9999" autoComplete="tel" required
                          aria-invalid={erroCampo.telefone || undefined} aria-describedby="reserva-erro"
                          className={INPUT_CLASS}
                          style={{ borderColor: erroCampo.telefone ? 'rgba(245,181,68,0.6)' : LINE }}
                        />
                      </label>
                      <label className="block text-sm font-semibold text-white" htmlFor="reserva-cep">
                        CEP
                        <input
                          ref={(node) => { fieldRefs.current.cep = node; }}
                          id="reserva-cep" type="text" inputMode="numeric" value={form.cep}
                          onChange={(event) => buscarCep(event.target.value)}
                          placeholder="00000-000" autoComplete="postal-code" required
                          aria-invalid={erroCampo.cep || undefined} aria-describedby="reserva-cep-status reserva-erro"
                          className={`${INPUT_CLASS} font-mono`}
                          style={{ borderColor: erroCampo.cep ? 'rgba(245,181,68,0.6)' : LINE }}
                        />
                      </label>
                    </div>
                    <p id="reserva-cep-status" aria-live="polite" className="mt-2 text-xs" style={{ color: cepStatus === 'not-found' || cepStatus === 'unavailable' ? '#f5b544' : MUTED }}>
                      {cepStatus === 'loading' && 'Consultando CEP…'}
                      {cepStatus === 'found' && 'CEP localizado. Confirme o número e o complemento.'}
                      {cepStatus === 'not-found' && 'CEP não encontrado. Confira os 8 dígitos.'}
                      {cepStatus === 'unavailable' && 'Consulta indisponível; preencha o endereço manualmente.'}
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,.75fr)]">
                      <label className="block text-sm font-semibold text-white" htmlFor="reserva-endereco">
                        Endereço, número e complemento
                        <input
                          ref={(node) => { fieldRefs.current.endereco = node; }}
                          id="reserva-endereco" type="text" value={form.endereco} onChange={campo('endereco')}
                          placeholder="Rua, número e complemento" autoComplete="street-address" required
                          aria-invalid={erroCampo.endereco || undefined} aria-describedby="reserva-erro"
                          className={INPUT_CLASS}
                          style={{ borderColor: erroCampo.endereco ? 'rgba(245,181,68,0.6)' : LINE }}
                        />
                      </label>
                      <label className="block text-sm font-semibold text-white" htmlFor="reserva-cidade">
                        Cidade/UF
                        <input
                          ref={(node) => { fieldRefs.current.cidadeUf = node; }}
                          id="reserva-cidade" type="text" value={form.cidadeUf} onChange={campo('cidadeUf')}
                          placeholder="Curitiba/PR" required
                          aria-invalid={erroCampo.cidadeUf || undefined} aria-describedby="reserva-erro"
                          className={INPUT_CLASS}
                          style={{ borderColor: erroCampo.cidadeUf ? 'rgba(245,181,68,0.6)' : LINE }}
                        />
                      </label>
                    </div>
                  </fieldset>
                )}

                <label
                  htmlFor="ciencia-especificacoes"
                  className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition"
                  style={{ borderColor: erroCampo.ciencia ? 'rgba(245,181,68,0.6)' : LINE, background: erroCampo.ciencia ? 'rgba(245,181,68,0.07)' : 'transparent' }}
                >
                  <input
                    ref={(node) => { fieldRefs.current.ciencia = node; }}
                    id="ciencia-especificacoes" type="checkbox" checked={form.ciencia} required
                    aria-invalid={erroCampo.ciencia || undefined} aria-describedby="reserva-erro"
                    onChange={(event) => {
                      setForm((current) => ({ ...current, ciencia: event.target.checked }));
                      setErroCampo((current) => ({ ...current, ciencia: false }));
                    }}
                    className="mt-0.5 size-4 shrink-0 accent-[#4ade80] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
                  />
                  <span className="text-xs leading-relaxed text-white/85">
                    Li a ficha elétrica e dimensional, a composição final do kit e as condições de frete publicadas
                    nesta oferta. Posso cancelar com reembolso integral até o envio.
                  </span>
                </label>

                <label
                  htmlFor="aceite-contrato"
                  className="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition"
                  style={{ borderColor: erroCampo.aceite ? 'rgba(245,181,68,0.6)' : LINE, background: erroCampo.aceite ? 'rgba(245,181,68,0.07)' : 'transparent' }}
                >
                  <input
                    ref={(node) => { fieldRefs.current.aceite = node; }}
                    id="aceite-contrato" type="checkbox" checked={form.aceite} required
                    aria-invalid={erroCampo.aceite || undefined} aria-describedby="reserva-erro"
                    onChange={(event) => {
                      setForm((current) => ({ ...current, aceite: event.target.checked }));
                      setErroCampo((current) => ({ ...current, aceite: false }));
                    }}
                    className="mt-0.5 size-4 shrink-0 accent-[#4ade80] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
                  />
                  <span className="text-xs leading-relaxed text-white/85">
                    Li e aceito o{' '}
                    <Link
                      to="/prevenda/contrato" target="_blank"
                      onClick={() => track('contract_open', { page: '/prevenda', version: OFERTA.contratoVersao })}
                      className="font-semibold underline underline-offset-2" style={{ color: GREEN }}
                    >
                      contrato de pré-venda
                    </Link>{' '}
                    — entrega a partir de {OFERTA.entregaBR}, reembolso integral até o envio e garantia de 12 meses conforme o contrato.
                  </span>
                </label>

                <p id="reserva-erro" role="alert" aria-live="assertive" className="mt-3 min-h-4 text-xs font-semibold" style={{ color: '#f5b544' }}>
                  {avisoForm || ''}
                </p>
                <div className="mt-3">
                  <BotoesPagamento loading={loading} full disabled={reservaPausada} />
                </div>
                <Erro erro={erro} />
              </form>
            )}

            <p className="mt-auto pt-5 text-xs leading-relaxed" style={{ color: MUTED }}>
              Pagamento processado por Stripe e Mercado Pago. O aceite do contrato fica registrado junto ao
              pedido e você acompanha tudo na{' '}
              <Link to="/prevenda/pedido" className="underline underline-offset-2" style={{ color: GREEN }}>área do cliente</Link>.
            </p>
          </div>

          {/* card comparativo */}
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border p-7" style={{ borderColor: LINE, background: SURFACE }}>
              <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em]" style={{ color: MUTED }}>Depois do lançamento</p>
              <div className="mt-5 flex flex-wrap items-baseline gap-3">
                <span className="text-4xl font-extrabold text-white/70">{PRECO_PUBLICO}</span>
                <span className="text-sm" style={{ color: MUTED }}>preço público previsto</span>
              </div>
              <p className="mt-5 text-sm leading-relaxed" style={{ color: MUTED }}>
                Mesmo módulo, sem o bônus de Premium da pré-venda. Essa é a referência comercial planejada para depois do lançamento.
              </p>
            </div>
            <figure>
              <button
                type="button"
                onClick={() => {
                  track('image_open', { image: 'modulo-contexto', page: '/prevenda' });
                  setLightbox({
                    src: fotoContexto,
                    alt: 'Render conceitual do Módulo Grow-X em uma bancada de cultivo indoor',
                    title: 'Conceito do módulo no ambiente de cultivo',
                    caption: 'Composição conceitual de uso; não é uma instalação real nem prova de unidade final fabricada.',
                  });
                }}
                className="w-full cursor-zoom-in overflow-hidden rounded-3xl border text-left transition hover:border-[#4ade80]/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]"
                style={{ borderColor: LINE }}
                aria-label="Ampliar render conceitual do módulo no ambiente de cultivo"
              >
                <img src={fotoContexto} alt="Render conceitual do Módulo Grow-X em uma bancada de cultivo indoor" className="w-full" loading="lazy" />
              </button>
              <figcaption className="mt-3 text-xs leading-relaxed" style={{ color: MUTED }}>
                Composição conceitual de uso; não é uma instalação real nem prova de unidade final fabricada.
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ---------- LISTA DE ESPERA ---------- */}
      <section id="lista" style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-display-md font-extrabold text-white">Ainda não é a hora? Fica na lista.</h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
              Te avisamos quando o lote estiver acabando e no dia do lançamento na ExpoCannabis. Sem spam, prometido.
            </p>
          </div>
          <ListaEspera />
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className={eyebrow} style={{ color: GREEN }}>Perguntas diretas, respostas diretas</p>
        <h2 className="mt-5 text-display-lg font-extrabold text-white">FAQ</h2>

        <div className="mt-10 max-w-3xl space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border px-6 py-5" style={{ borderColor: LINE, background: SURFACE }}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[0.95rem] font-semibold text-white marker:hidden">
                {q}
                <span className="shrink-0 text-xl transition-transform group-open:rotate-45" style={{ color: GREEN }}>+</span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: MUTED }}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- CTA FINAL ---------- */}
      <section style={{ borderTop: `1px solid ${LINE}`, background: SURFACE }}>
        <div className="mx-auto w-full max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-24">
          <h2 className="text-display-lg font-extrabold text-white">Regras claras. Estado visível. Menos gambiarra.</h2>
          <p className="mt-5 text-lg" style={{ color: MUTED }}>
            {PRECO_PIX} no Pix durante a pré-venda; preço público previsto de {PRECO_PUBLICO} depois do lançamento.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#reservar"
              onClick={() => track('click_cta_prevenda', { placement: 'final', page: '/prevenda' })}
              className="rounded-xl px-7 py-4 text-[0.95rem] font-bold transition hover:brightness-110"
              style={{ background: GREEN, color: '#05130a' }}
            >
              {reservaPausada ? 'Ver status da reserva' : 'Garantir minha unidade'}
            </a>
            <a
              href={WHATSAPP} target="_blank" rel="noreferrer noopener"
              onClick={() => track('click_whatsapp', { page: '/prevenda', intent: 'cta-final' })}
              className="rounded-xl border px-7 py-4 text-[0.95rem] font-semibold text-white transition hover:bg-white/5"
              style={{ borderColor: LINE }}
            >
              Tirar dúvida no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* ---------- RODAPÉ ---------- */}
      <footer style={{ borderTop: `1px solid ${LINE}` }}>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link to="/"><img src={logoGrowX} alt="Grow-X" className="h-7 w-auto" /></Link>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm" style={{ color: MUTED }}>
            <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="transition hover:text-white">WhatsApp +55 41 99549-4343</a>
            <Link to="/" className="transition hover:text-white">growx.com.br</Link>
            <Link to="/prevenda/contrato" className="transition hover:text-white">Contrato</Link>
            <Link to="/prevenda/pedido" className="transition hover:text-white">Meu pedido</Link>
            <span>© 2026 Grow-X Co.</span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl px-5 pb-12 sm:px-8">
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(159,179,166,0.65)' }}>
            A Grow-X Co. desenvolve e vende tecnologia de automação e monitoramento para cultivo indoor de plantas
            de alto valor. Não comercializamos cannabis, sementes, derivados nem fazemos promessa terapêutica.
            O uso do equipamento é de responsabilidade do cliente, conforme a legislação aplicável ao seu projeto.
            Condições da pré-venda: entrega a partir de {OFERTA.entregaBR}, reembolso integral até o envio e
            garantia de 12 meses conforme o contrato.
          </p>
        </div>
      </footer>

      <BarraFixa reservaPausada={reservaPausada} />
      <ImageLightbox item={lightbox} onClose={closeLightbox} />
    </div>
  );
}
