import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/visual';
import { track } from '@/lib/analytics';
import { documentoValido, emailValido, formataDocumento, nomeCompleto } from '@/lib/cpf';

import logoGrowX from '../assets/logo-growx-oficial.png';
import fotoHero from '../assets/modulo-hero.webp';
import fotoTomadas from '../assets/modulo-tomadas.webp';
import fotoAberto from '../assets/modulo-aberto.webp';
import fotoContexto from '../assets/modulo-contexto.webp';
import telaGxp from '../assets/gxp-site.webp';

const WHATSAPP = 'https://wa.me/5541995494343?text=Quero%20garantir%20meu%20M%C3%B3dulo%20Grow-X%20na%20pr%C3%A9-venda';
const ENTREGA = new Date('2026-11-20T09:00:00-03:00');

/* Paleta da landing — dark premium, mais fechada que o resto do site */
const BG = '#080b09';
const SURFACE = 'rgba(255,255,255,0.035)';
const LINE = 'rgba(255,255,255,0.09)';
const GREEN = '#4ade80';
const MUTED = '#9fb3a6';

const NAV = [
  ['O módulo', '#modulo'],
  ['Como funciona', '#como'],
  ['App GXP', '#app'],
  ['FAQ', '#faq'],
];

const RECURSOS = [
  ['01', 'Seis tomadas inteligentes', 'Luz, exaustor, umidificador, bomba — cada tomada liga e desliga sozinha, por horário ou por sensor.'],
  ['02', 'Fotoperíodo de verdade', 'Nascer e pôr do sol graduais, todo dia no mesmo ritmo. Sem clique de timer, sem susto pra planta.'],
  ['03', 'Rega no ponto', 'Irrigação por umidade do solo, com trava de segurança na bomba e leitura de reservatório.'],
  ['04', 'Sensores + alertas', 'Temperatura e umidade monitoradas 24/7, com alerta de risco de mofo direto no seu celular.'],
  ['05', 'App GXP incluso', 'Controle e histórico de qualquer lugar — com 3 meses de GXP Premium de brinde na pré-venda.'],
  ['06', 'Do armário à associação', 'Primeira automação ou upgrade de setup grande: as 6 tomadas cobrem luz, clima e rega do espaço.'],
];

const PASSOS = [
  ['PASSO 1', 'Você reserva hoje', 'R$ 2.800 no Pix ou 12x de R$ 250 no cartão. Pagamento seguro processado por Stripe e Mercado Pago.'],
  ['PASSO 2', 'Recebe tudo por escrito', 'Aceite do contrato registrado junto ao pedido, comprovante no seu e-mail e área do cliente vinculada ao seu CPF, com status de produção e envio.'],
  ['PASSO 3', 'Módulo na sua porta', 'Entregas a partir de 20/11/2026, junto do lançamento oficial na ExpoCannabis Brasil 2026.'],
];

const INCLUSO = [
  'Módulo Grow-X com 6 tomadas inteligentes + sensores',
  '3 meses de GXP Premium inclusos',
  'Contrato de pré-venda + área do cliente com CPF',
  'Reembolso integral até o envio · 1 ano de garantia',
];

const FAQ = [
  ['Quando eu recebo o módulo?', 'As entregas começam em 20/11/2026, data do lançamento oficial na ExpoCannabis Brasil 2026. Você acompanha o status do seu pedido na área do cliente.'],
  ['E se eu me arrepender?', 'Reembolso integral a qualquer momento até o envio do produto — basta pedir. Depois da entrega, você segue coberto por 1 ano de garantia.'],
  ['Como sei que meu pedido tá garantido?', 'O aceite do contrato de pré-venda fica registrado junto ao pedido, com data e versão, e o comprovante de pagamento chega no seu e-mail. A qualquer momento você consulta o pedido em growx.com.br/prevenda/pedido com o e-mail e o CPF da compra. Nada fica no fiado.'],
  ['Quais as formas de pagamento?', 'Pix (R$ 2.800) ou cartão em até 12x de R$ 250 (R$ 3.000), processados por Stripe e Mercado Pago.'],
  ['Preciso entender de eletrônica e automação?', 'Não. Você pluga os equipamentos nas tomadas, conecta o módulo no app GXP e escolhe a rotina. A configuração é guiada.'],
  ['E depois dos 3 meses de Premium?', 'O módulo e o app continuam funcionando normalmente. O Premium é opcional — você decide se quer os recursos avançados.'],
  ['Serve pro meu tamanho de grow?', 'Do armário à estufa de associação: são 6 tomadas pra luz, exaustão, clima e rega. Se ficar na dúvida sobre o seu setup, chama a gente no WhatsApp.'],
];

const PRODUCT_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Módulo Grow-X',
  description:
    'Central de automação para cultivo indoor: 6 tomadas inteligentes, fotoperíodo com nascer e pôr do sol graduais, irrigação por umidade do solo, sensores, alertas e app GXP.',
  sku: 'GX-MODULO-PREVENDA',
  brand: { '@type': 'Brand', name: 'Grow-X' },
  manufacturer: { '@type': 'Organization', name: 'Grow-X Co.' },
  image: 'https://www.growx.com.br/og-prevenda.jpg',
  offers: [
    { '@type': 'Offer', name: 'Pré-venda · Pix', price: '2800.00', priceCurrency: 'BRL', availability: 'https://schema.org/PreOrder', priceValidUntil: '2026-11-20', url: 'https://www.growx.com.br/prevenda', seller: { '@type': 'Organization', name: 'Grow-X Co.' } },
    { '@type': 'Offer', name: 'Pré-venda · cartão em até 12x', price: '3000.00', priceCurrency: 'BRL', availability: 'https://schema.org/PreOrder', priceValidUntil: '2026-11-20', url: 'https://www.growx.com.br/prevenda', seller: { '@type': 'Organization', name: 'Grow-X Co.' } },
  ],
};

function useDiasRestantes() {
  const [dias, setDias] = useState(() => Math.ceil((ENTREGA - Date.now()) / 86400000));
  useEffect(() => {
    const t = setInterval(() => setDias(Math.ceil((ENTREGA - Date.now()) / 86400000)), 60000);
    return () => clearInterval(t);
  }, []);
  return dias > 0 ? dias : 0;
}

function useCheckout() {
  const [loading, setLoading] = useState(null);
  const [erro, setErro] = useState(null);

  // Ao mandar o comprador pro provedor a gente deixa o botão em "Abrindo…".
  // Se ele voltar (botão voltar do navegador), a página volta do bfcache com
  // esse estado congelado e os dois botões ficam travados pra sempre.
  useEffect(() => {
    const destravar = () => { setLoading(null); setErro(null); };
    window.addEventListener('pageshow', destravar);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') destravar();
    });
    return () => window.removeEventListener('pageshow', destravar);
  }, []);

  const pagar = async (metodo, comprador) => {
    if (loading) return;
    setLoading(metodo);
    setErro(null);
    track('begin_checkout', { method: metodo, value: metodo === 'pix' ? 2800 : 3000, currency: 'BRL', page: '/prevenda' });
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: metodo, ...comprador }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      track('checkout_error', { method: metodo, code: data?.error || r.status, page: '/prevenda' });
      setErro('Não conseguimos abrir o checkout agora. Tenta de novo — ou fecha direto no WhatsApp.');
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
    <p className="mt-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: 'rgba(245,181,68,0.32)', background: 'rgba(245,181,68,0.08)', color: '#f6e3bd' }}>
      {erro}{' '}
      <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="font-semibold underline underline-offset-2" style={{ color: GREEN }}>
        Chamar no WhatsApp
      </a>
    </p>
  );
}

function BotoesPagamento({ loading, pagar, full = false }) {
  return (
    <div className={`flex flex-wrap gap-3 ${full ? 'sm:flex-nowrap' : ''}`}>
      <button
        type="button"
        onClick={() => pagar('pix')}
        disabled={!!loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-[0.95rem] font-bold transition hover:brightness-110 disabled:opacity-60 ${full ? 'w-full sm:flex-1' : ''}`}
        style={{ background: GREEN, color: '#05130a' }}
      >
        {loading === 'pix' ? 'Abrindo…' : 'Pagar no Pix — R$ 2.800'}
      </button>
      <button
        type="button"
        onClick={() => pagar('cartao')}
        disabled={!!loading}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-4 text-[0.95rem] font-semibold text-white transition hover:bg-white/5 disabled:opacity-60 ${full ? 'w-full sm:flex-1' : ''}`}
        style={{ borderColor: LINE }}
      >
        {loading === 'cartao' ? 'Abrindo…' : 'Cartão — 12x de R$ 250'}
      </button>
    </div>
  );
}

function Nav() {
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
          className="rounded-full px-5 py-2.5 text-sm font-bold transition hover:brightness-110"
          style={{ background: GREEN, color: '#05130a' }}
        >
          Reservar — R$ 2.800
        </a>
      </div>
    </nav>
  );
}

function BarraFixa() {
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
      style={{ background: 'rgba(8,11,9,0.94)', backdropFilter: 'blur(14px)', borderTop: `1px solid ${LINE}` }}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] whitespace-nowrap" style={{ color: MUTED }}>Entrega 20/11</p>
          <p className="text-sm font-bold text-white">
            <span style={{ color: GREEN }}>R$ 2.800</span> no Pix <span className="hidden sm:inline" style={{ color: MUTED }}>· ou 12x de R$ 250</span>
          </p>
        </div>
        <a
          href="#reservar"
          className="shrink-0 rounded-xl px-5 py-3 text-sm font-bold transition hover:brightness-110"
          style={{ background: GREEN, color: '#05130a' }}
        >
          Garantir a minha
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
  const [form, setForm] = useState({ nome: '', email: '', cpf: '', aceite: false });
  const [erroCampo, setErroCampo] = useState({});
  const [avisoForm, setAvisoForm] = useState(null);

  const campo = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /** Identificação e aceite são exigidos antes de sair da nossa página. */
  const pagarComDados = (metodo) => {
    const falhas = {
      nome: !nomeCompleto(form.nome),
      email: !emailValido(form.email),
      cpf: !documentoValido(form.cpf),
      aceite: !form.aceite,
    };
    setErroCampo(falhas);

    const primeiraFalha = Object.entries(falhas).find(([, ruim]) => ruim)?.[0];
    if (primeiraFalha) {
      setAvisoForm({
        nome: 'Informe seu nome completo (nome e sobrenome).',
        email: 'Confere o e-mail — é nele que chega o comprovante.',
        cpf: 'Documento inválido. Confere o CPF — ou informe o CNPJ, se a compra for pela empresa.',
        aceite: 'Marque o aceite do contrato pra seguir pro pagamento.',
      }[primeiraFalha]);
      track('checkout_dados_invalidos', { campo: primeiraFalha, method: metodo, page: '/prevenda' });
      return;
    }

    setAvisoForm(null);
    pagar(metodo, { nome: form.nome, email: form.email, cpf: form.cpf, aceite: true });
  };

  useEffect(() => { track('view_prevenda', { page: '/prevenda' }); }, []);

  return (
    <div style={{ background: BG }} className="min-h-screen text-white">
      <SEO
        title="Módulo Grow-X — Pré-venda: R$ 2.800 no Pix ou 12x de R$ 250 · entrega 20/11"
        description="O cérebro do seu grow: 6 tomadas inteligentes, fotoperíodo com nascer e pôr do sol, rega por umidade do solo e alertas no celular. Pré-venda R$ 2.800 no Pix — no lançamento vai a R$ 5.500. Com 3 meses de GXP Premium."
        path="/prevenda"
        jsonLd={PRODUCT_LD}
      />

      <Nav />

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
            <Pill tone="green">
              <span className="inline-block size-1.5 rounded-full" style={{ background: GREEN }} />
              Pré-venda aberta · lote de lançamento
            </Pill>
            {dias > 0 && <Pill>Faltam {dias} dias pra entrega</Pill>}
          </div>

          <h1 className="mt-8 max-w-2xl text-display-xl font-extrabold leading-[0.98] text-white">
            O cérebro<br />do seu grow.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: MUTED }}>
            O Módulo Grow-X cuida da luz, do clima e da rega — 24/7, sem timer de tomada,
            sem gambiarra. Você só acompanha pelo app.
          </p>

          <div className="mt-9 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="text-5xl font-extrabold text-white sm:text-6xl">R$ 2.800</span>
            <span className="font-mono text-lg font-bold uppercase tracking-wide" style={{ color: GREEN }}>no Pix</span>
            <span className="text-sm" style={{ color: MUTED }}>ou 12x de R$ 250 no cartão</span>
          </div>
          <div className="mt-4">
            <Pill tone="amber">no lançamento: R$ 5.500</Pill>
          </div>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#reservar"
              className="rounded-xl px-7 py-4 text-[0.95rem] font-bold transition hover:brightness-110"
              style={{ background: GREEN, color: '#05130a' }}
            >
              Garantir minha unidade
            </a>
            <a
              href={WHATSAPP} target="_blank" rel="noreferrer noopener"
              onClick={() => track('click_whatsapp', { page: '/prevenda', intent: 'hero' })}
              className="rounded-xl border px-7 py-4 text-[0.95rem] font-semibold text-white transition hover:bg-white/5"
              style={{ borderColor: LINE }}
            >
              Chamar no WhatsApp
            </a>
          </div>

          <div className="mt-9 flex flex-wrap gap-x-7 gap-y-2 text-sm" style={{ color: MUTED }}>
            {['Reembolso integral até o envio', '1 ano de garantia', 'Entrega a partir de 20/11/2026'].map((t) => (
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
          <span className="text-sm" style={{ color: MUTED }}>Quem entra na pré-venda recebe antes do preço subir pra R$ 5.500.</span>
        </div>
      </section>

      {/* ---------- O MÓDULO ---------- */}
      <section id="modulo" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className={eyebrow} style={{ color: GREEN }}>O módulo — 6 tomadas, 1 central</p>
        <h2 className="mt-5 max-w-2xl text-display-lg font-extrabold text-white">Aposenta a gambiarra de timers.</h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed" style={{ color: MUTED }}>
          Uma central única no lugar de réguas, timers analógicos e controladores avulsos.
          Plugou, conectou no GXP, o grow roda sozinho.
        </p>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="overflow-hidden rounded-3xl border lg:sticky lg:top-28" style={{ borderColor: LINE }}>
            <img src={fotoTomadas} alt="Painel do Módulo Grow-X com seis tomadas inteligentes" className="w-full" loading="lazy" />
          </div>

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
          <div className="overflow-hidden rounded-3xl border" style={{ borderColor: LINE }}>
            <img src={fotoAberto} alt="Módulo Grow-X aberto mostrando a placa eletrônica e a fonte" className="w-full" loading="lazy" />
          </div>
          <div>
            <p className={eyebrow} style={{ color: GREEN }}>Por dentro</p>
            <h2 className="mt-5 text-display-lg font-extrabold text-white">Coisa séria, sem caixa-preta.</h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: MUTED }}>
              Abrimos o módulo pra você ver: placa dedicada, fonte embarcada e bornes pra sensores.
              Hardware projetado pra ficar ligado 24/7 do lado das suas plantas — e coberto por 1 ano de garantia.
            </p>
            <div className="mt-8 space-y-4">
              {[
                'Eletrônica própria, desenhada pro cultivo — não é adaptação de tomada wi-fi.',
                'Entradas de sensor dedicadas: solo, temperatura e umidade do ar.',
                'Se algo falhar no primeiro ano, a gente resolve. Garantia de fábrica.',
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

      {/* ---------- APP GXP ---------- */}
      <section id="app" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={eyebrow} style={{ color: GREEN }}>App GXP · 3 meses de Premium inclusos</p>
            <h2 className="mt-5 text-display-lg font-extrabold text-white">O grow no seu bolso.</h2>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: MUTED }}>
              Rotinas de luz e rega, leitura dos sensores em tempo real e alerta no celular quando algo
              sai do trilho. Configura uma vez, acompanha de onde estiver.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              {['Rotinas por fase do cultivo', 'Histórico dos sensores', 'Alertas no celular', 'Diário do cultivo'].map((t) => (
                <span key={t} className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: LINE, color: MUTED }}>{t}</span>
              ))}
            </div>
            <a
              href="https://www.gxp.ia.br" target="_blank" rel="noreferrer noopener"
              onClick={() => track('external_app_open', { app: 'gxp', page: '/prevenda' })}
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
              style={{ color: GREEN }}
            >
              Conhecer o GXP em gxp.ia.br →
            </a>
          </div>

          {/* janela de navegador com o GXP real */}
          <div className="overflow-hidden rounded-2xl border shadow-2xl" style={{ borderColor: LINE, background: '#0d120f' }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${LINE}` }}>
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="size-2.5 rounded-full bg-white/15" />
              <span className="ml-3 truncate rounded-md px-3 py-1 font-mono text-[0.7rem]" style={{ background: 'rgba(255,255,255,0.05)', color: MUTED }}>
                gxp.ia.br
              </span>
            </div>
            <img src={telaGxp} alt="App GXP em gxp.ia.br — diário de cultivo, ambiente monitorado e clube técnico" className="w-full" loading="lazy" />
          </div>
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
              Depois da entrega, <strong className="text-white">1 ano de garantia</strong> de fábrica.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- RESERVAR ---------- */}
      <section id="reservar" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className={eyebrow} style={{ color: GREEN }}>Garanta o preço de pré-venda</p>
        <h2 className="mt-5 max-w-2xl text-display-lg font-extrabold text-white">R$ 2.700 mais barato do que vai custar.</h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* card principal */}
          <div className="flex flex-col rounded-3xl border p-7 sm:p-9" style={{ borderColor: 'rgba(74,222,128,0.35)', background: 'linear-gradient(180deg, rgba(74,222,128,0.07), rgba(74,222,128,0.02))' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em]" style={{ color: GREEN }}>Pré-venda · até o lançamento</p>
              {dias > 0 && <Pill tone="green">Faltam {dias} dias</Pill>}
            </div>

            <div className="mt-6 flex flex-wrap items-baseline gap-3">
              <span className="text-5xl font-extrabold text-white sm:text-6xl">R$ 2.800</span>
              <span className="text-sm" style={{ color: MUTED }}>no Pix · ou 12x de R$ 250 (R$ 3.000)</span>
            </div>

            <div className="mt-8 space-y-3.5">
              {INCLUSO.map((t) => (
                <div key={t} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 font-bold" style={{ color: GREEN }}>✓</span>
                  <p className="text-sm leading-relaxed text-white/85">{t}</p>
                </div>
              ))}
            </div>

            <div className="mt-9 space-y-3">
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: MUTED }}>
                Seus dados — vão no contrato e na nota fiscal
              </p>
              <input
                type="text" value={form.nome} onChange={campo('nome')}
                placeholder="Nome completo" aria-label="Nome completo" autoComplete="name"
                className="w-full rounded-xl border bg-transparent px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                style={{ borderColor: erroCampo.nome ? 'rgba(245,181,68,0.6)' : LINE }}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="email" value={form.email} onChange={campo('email')}
                  placeholder="Seu melhor e-mail" aria-label="E-mail" autoComplete="email"
                  className="w-full rounded-xl border bg-transparent px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                  style={{ borderColor: erroCampo.email ? 'rgba(245,181,68,0.6)' : LINE }}
                />
                <input
                  type="text" inputMode="numeric" value={form.cpf}
                  onChange={(e) => setForm((f) => ({ ...f, cpf: formataDocumento(e.target.value) }))}
                  placeholder="CPF ou CNPJ" aria-label="CPF ou CNPJ"
                  className="w-full rounded-xl border bg-transparent px-4 py-3.5 font-mono text-sm text-white outline-none transition placeholder:text-white/35 focus:border-white/30"
                  style={{ borderColor: erroCampo.cpf ? 'rgba(245,181,68,0.6)' : LINE }}
                />
              </div>
            </div>

            <label
              htmlFor="aceite-contrato"
              className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition"
              style={{ borderColor: erroCampo.aceite ? 'rgba(245,181,68,0.6)' : LINE, background: erroCampo.aceite ? 'rgba(245,181,68,0.07)' : 'transparent' }}
            >
              <input
                id="aceite-contrato" type="checkbox" checked={form.aceite}
                onChange={(e) => setForm((f) => ({ ...f, aceite: e.target.checked }))}
                className="mt-0.5 size-4 shrink-0 accent-[#4ade80]"
              />
              <span className="text-xs leading-relaxed text-white/85">
                Li e aceito o{' '}
                <Link to="/prevenda/contrato" target="_blank" className="font-semibold underline underline-offset-2" style={{ color: GREEN }}>
                  contrato de pré-venda
                </Link>{' '}
                — entrega a partir de 20/11/2026, reembolso integral até o envio e 1 ano de garantia.
              </span>
            </label>
            {avisoForm && (
              <p className="mt-2 text-xs font-semibold" style={{ color: '#f5b544' }}>{avisoForm}</p>
            )}

            <div className="mt-5">
              <BotoesPagamento loading={loading} pagar={pagarComDados} full />
            </div>
            <Erro erro={erro} />

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
                <span className="text-4xl font-extrabold text-white/45 line-through">R$ 5.500</span>
                <span className="text-sm" style={{ color: MUTED }}>preço de tabela</span>
              </div>
              <p className="mt-5 text-sm leading-relaxed" style={{ color: MUTED }}>
                Mesmo módulo, sem o bônus de Premium da pré-venda. O preço sobe quando o lote de lançamento acabar.
              </p>
            </div>
            <div className="overflow-hidden rounded-3xl border" style={{ borderColor: LINE }}>
              <img src={fotoContexto} alt="Módulo Grow-X na bancada de um cultivo indoor" className="w-full" loading="lazy" />
            </div>
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
          <h2 className="text-display-lg font-extrabold text-white">Planta cuidada 24/7. Grower tranquilo.</h2>
          <p className="mt-5 text-lg" style={{ color: MUTED }}>
            R$ 2.800 agora ou R$ 5.500 depois do lançamento. A conta é sua.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a
              href="#reservar"
              className="rounded-xl px-7 py-4 text-[0.95rem] font-bold transition hover:brightness-110"
              style={{ background: GREEN, color: '#05130a' }}
            >
              Garantir minha unidade
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
            Condições da pré-venda: entrega a partir de 20/11/2026, reembolso integral até o envio e 1 ano de
            garantia de fábrica.
          </p>
        </div>
      </footer>

      <BarraFixa />
    </div>
  );
}
