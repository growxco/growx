import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle, Bell, CalendarClock, CheckCircle2, ChevronLeft,
  ChevronRight, CreditCard, Cpu, Droplets, Loader2, Maximize2, MessageCircle,
  Power, QrCode, ShieldCheck, Smartphone, Sun, X,
} from 'lucide-react';
import { SEO, Section, Container, Eyebrow, GlassCard, Reveal, StatusDot } from '@/components/visual';
import { FAQ } from '@/components/sections';
import { track } from '@/lib/analytics';

import fotoProduto from '../assets/modulo-produto.webp';
import qaTomadas from '../assets/modulo-app-tomadas.webp';
import qaIluminacao from '../assets/modulo-app-iluminacao.webp';
import gxpPainel from '../assets/gxp-painel.webp';
import gxpFases from '../assets/gxp-fases.webp';
import gxpIluminacao from '../assets/gxp-iluminacao.webp';
import gxpIrrigacao from '../assets/gxp-irrigacao.webp';
import gxpSensores from '../assets/gxp-sensores.webp';
import gxpAlertas from '../assets/gxp-alertas.webp';

const WHATSAPP = 'https://wa.me/5541995494343?text=Quero%20garantir%20um%20M%C3%B3dulo%20Grow-X%20na%20pr%C3%A9-venda';
const LAUNCH = new Date('2026-11-20T09:00:00-03:00');

// Galeria única — tudo que é clicável abre aqui
const GALLERY = [
  { src: fotoProduto, alt: 'Módulo Grow-X — produto real em 6 ângulos', caption: 'Módulo Grow-X — fotos reais do produto' },
  { src: gxpPainel, alt: 'App GXP — painel com temperatura, umidade, vasos e tomadas', caption: 'Painel: clima, vasos e tomadas em tempo real' },
  { src: gxpFases, alt: 'App GXP — perfis por fase: mudas, vegetativo 18/6 e floração 12/12', caption: 'Perfis por fase: Mudas · Vegetativo 18/6 · Floração 12/12' },
  { src: gxpIluminacao, alt: 'App GXP — ciclo de luz com nascer e pôr do sol graduais', caption: 'Fotoperíodo com nascer e pôr do sol graduais' },
  { src: gxpIrrigacao, alt: 'App GXP — irrigação automática por umidade do solo', caption: 'Irrigação por umidade do solo, com travas de segurança' },
  { src: gxpSensores, alt: 'App GXP — sensores por vaso com histórico', caption: 'Sensores por vaso, com histórico 24h/7d' },
  { src: gxpAlertas, alt: 'App GXP — alertas de risco de mofo, umidade e temperatura', caption: 'Alertas: risco de mofo, umidade, temperatura, reservatório' },
  { src: qaTomadas, alt: 'Software Grow-X controlando as 6 tomadas em dispositivo real', caption: 'Bancada de QA: 6 tomadas rodando em dispositivo real' },
  { src: qaIluminacao, alt: 'Software Grow-X — dimmer, sunrise/sunset e agenda', caption: 'Bancada de QA: dimmer, sunrise/sunset e agenda' },
];

const APP_SHOTS = [1, 2, 3, 4, 5, 6]; // índices da GALLERY (telas do GXP)

const FAQ_ITEMS = [
  {
    q: 'Quanto custa e como pago?',
    a: 'Na pré-venda: R$ 3.000 em até 12x no cartão (checkout Stripe) ou R$ 2.800 à vista no Pix (Mercado Pago). Depois do lançamento, o preço público vai a R$ 5.500. Ambos os checkouts são criptografados — a Grow-X não vê nem armazena dados de pagamento.',
  },
  {
    q: 'Por que o Pix é mais barato?',
    a: 'Sem taxa de parcelamento e sem intermediário de cartão, a gente repassa a diferença: R$ 200 de desconto pra quem paga à vista no Pix.',
  },
  {
    q: 'Quando recebo meu Módulo?',
    a: 'A entrega começa em 20/11/2026, dia do lançamento oficial na ExpoCannabis Brasil 2026 (São Paulo Expo, 20–22/11). Quem estiver no evento pode retirar em mãos; os demais recebem por envio logo após o lançamento.',
  },
  {
    q: 'O que é o GXP Premium que vem junto?',
    a: 'O GXP é o app da Grow-X que controla a central: perfis por fase (mudas, vegetativo, floração), fotoperíodo com nascer/pôr do sol, irrigação por umidade do solo, sensores por vaso e alertas. Lança em outubro — e quem está na pré-venda ganha 3 meses de Premium, ativados no lançamento do app, antes mesmo do módulo chegar.',
  },
  {
    q: 'E se eu me arrepender?',
    a: 'Você tem 7 dias de arrependimento com reembolso integral (art. 49 do CDC), além das condições da pré-venda que acompanham o recibo. Sem letra miúda.',
  },
  {
    q: 'Pra quem é o Módulo?',
    a: 'Pra quem cultiva indoor plantas de alto valor e quer parar de operar no improviso: cultivadores técnicos, projetos legalmente autorizados, associações, pesquisa e grow shops. Se você já perdeu ciclo por mofo, luz fora de hora ou rega esquecida — é pra você.',
  },
  {
    q: 'É legalizado?',
    a: 'A Grow-X vende tecnologia de automação e monitoramento — não vende cannabis, sementes, derivados nem promessa terapêutica. O uso do equipamento é de responsabilidade do cliente, conforme a legislação aplicável ao seu projeto.',
  },
];

function useCheckout() {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const start = async (method) => {
    if (loading) return;
    setLoading(method);
    setError(null);
    track('begin_checkout', { method, value: method === 'pix' ? 2800 : 3000, currency: 'BRL', page: '/prevenda' });
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      track('checkout_error', { method, code: data?.error || r.status, page: '/prevenda' });
      setError('Não conseguimos abrir o checkout agora. Tenta de novo — ou garante direto pelo WhatsApp.');
    } catch {
      setError('Falha de conexão. Tenta de novo — ou garante direto pelo WhatsApp.');
    }
    setLoading(null);
  };

  return { loading, error, start };
}

function Countdown({ compact = false }) {
  const [left, setLeft] = useState(() => LAUNCH - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(LAUNCH - Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (left <= 0) return null;
  const d = Math.floor(left / 86400000);
  const h = Math.floor((left % 86400000) / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const cell = (v, l) => (
    <div className={`flex flex-col items-center rounded-xl bg-foreground/[0.05] ${compact ? 'px-2 py-1' : 'px-3 py-2 sm:px-4'}`}>
      <span className={`font-mono font-bold text-emerald-glow ${compact ? 'text-base' : 'text-xl sm:text-2xl'}`}>{String(v).padStart(2, '0')}</span>
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{l}</span>
    </div>
  );
  return <div className="flex items-center gap-2">{cell(d, 'dias')}{cell(h, 'horas')}{cell(m, 'min')}{cell(s, 'seg')}</div>;
}

function Lightbox({ idx, onClose, onNav }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNav(1);
      if (e.key === 'ArrowLeft') onNav(-1);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onNav]);

  const item = GALLERY[idx];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-label={item.caption}
    >
      <button
        type="button" onClick={onClose} aria-label="Fechar"
        className="absolute right-4 top-4 rounded-full bg-foreground/10 p-2.5 text-foreground transition hover:bg-foreground/20"
      >
        <X className="size-5" />
      </button>
      <button
        type="button" aria-label="Anterior"
        onClick={(e) => { e.stopPropagation(); onNav(-1); }}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-foreground/10 p-2.5 text-foreground transition hover:bg-foreground/20 sm:left-6"
      >
        <ChevronLeft className="size-6" />
      </button>
      <button
        type="button" aria-label="Próxima"
        onClick={(e) => { e.stopPropagation(); onNav(1); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-foreground/10 p-2.5 text-foreground transition hover:bg-foreground/20 sm:right-6"
      >
        <ChevronRight className="size-6" />
      </button>
      <motion.img
        key={idx}
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        src={item.src} alt={item.alt}
        className="max-h-[82vh] max-w-full rounded-2xl object-contain shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="mt-4 max-w-xl text-center text-sm text-muted-foreground">{item.caption} · {idx + 1}/{GALLERY.length}</p>
    </motion.div>
  );
}

function PayButtons({ loading, start, size = 'lg', context }) {
  const base = size === 'lg' ? '' : 'text-sm px-4 py-2.5';
  return (
    <div className={`flex flex-wrap items-center gap-3 ${size === 'lg' ? '' : 'gap-2'}`}>
      <button
        type="button"
        onClick={() => start('pix')}
        disabled={!!loading}
        className={`btn-primary ${base}`}
        data-context={context}
      >
        {loading === 'pix' ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
        R$ 2.800 no Pix
      </button>
      <button
        type="button"
        onClick={() => start('cartao')}
        disabled={!!loading}
        className={`btn-ghost ${base}`}
        data-context={context}
      >
        {loading === 'cartao' ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        12x no cartão · R$ 3.000
      </button>
    </div>
  );
}

function CheckoutError({ error }) {
  if (!error) return null;
  return (
    <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
      {error}{' '}
      <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="font-semibold text-emerald-glow underline underline-offset-2">
        Chamar no WhatsApp
      </a>
    </div>
  );
}

function StickyBuyBar({ loading, start }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[51] border-t border-foreground/10 bg-background/90 p-3 backdrop-blur-xl sm:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Pré-venda · entrega 20/11</p>
          <p className="text-sm font-bold text-foreground">
            <span className="text-emerald-glow">R$ 2.800</span> Pix · 12x R$ 3.000
          </p>
        </div>
        <button
          type="button"
          onClick={() => start('pix')}
          disabled={!!loading}
          className="btn-primary shrink-0 px-4 py-2.5 text-sm"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Garantir
        </button>
      </div>
    </div>
  );
}

const PRODUCT_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Módulo Grow-X',
  description:
    'Central de automação indoor: 6 tomadas inteligentes, fotoperíodo com nascer/pôr do sol, irrigação por umidade do solo, sensores por vaso, alertas e app GXP. Pré-venda com 3 meses de GXP Premium.',
  sku: 'GX-MODULO-PREVENDA',
  brand: { '@type': 'Brand', name: 'Grow-X' },
  manufacturer: { '@type': 'Organization', name: 'Grow-X Co.' },
  category: 'Automação de cultivo indoor',
  image: 'https://www.growx.com.br/og-image.png',
  offers: [
    {
      '@type': 'Offer', name: 'Pré-venda · Pix', price: '2800.00', priceCurrency: 'BRL',
      availability: 'https://schema.org/PreOrder', priceValidUntil: '2026-11-20',
      url: 'https://www.growx.com.br/prevenda', seller: { '@type': 'Organization', name: 'Grow-X Co.' },
    },
    {
      '@type': 'Offer', name: 'Pré-venda · cartão em até 12x', price: '3000.00', priceCurrency: 'BRL',
      availability: 'https://schema.org/PreOrder', priceValidUntil: '2026-11-20',
      url: 'https://www.growx.com.br/prevenda', seller: { '@type': 'Organization', name: 'Grow-X Co.' },
    },
  ],
};

const FEATURES = [
  { icon: Power, title: '6 tomadas inteligentes', description: 'Exaustor, iluminação, umidificador, desumidificador, irrigação, circulação, aquecedor ou refrigeração — cada tomada com papel e automação próprios.' },
  { icon: Sun, title: 'Fotoperíodo cravado', description: 'Dimmer 0–100% com nascer e pôr do sol graduais. 18/6, 12/12 ou o ciclo que seu cultivo pedir — sem depender de timer de padaria.' },
  { icon: Droplets, title: 'Rega por umidade do solo', description: 'O módulo rega quando o vaso pede, com trava de segurança de bomba e boia de reservatório. Chega de esquecer (ou afogar).' },
  { icon: Bell, title: 'Alertas que salvam ciclo', description: 'Risco de mofo, umidade fora da faixa, temperatura, reservatório vazio, sensor mudo. Você fica sabendo antes do prejuízo.' },
  { icon: Smartphone, title: 'App GXP incluso', description: 'Painel em tempo real, perfis por fase, histórico por vaso. 3 meses de Premium por nossa conta — ativa já no lançamento em outubro.' },
  { icon: ShieldCheck, title: 'Segurança de verdade', description: 'Parada geral física e por software, auto-teste dos relés e estado seguro por padrão. Eletrônica própria, feita no Brasil.' },
];

export default function PreVendaPage() {
  const { loading, error, start } = useCheckout();
  const [lb, setLb] = useState(-1);

  const openLb = useCallback((i) => {
    setLb(i);
    track('view_gallery', { image: GALLERY[i]?.caption, page: '/prevenda' });
  }, []);
  const navLb = useCallback((dir) => {
    setLb((cur) => (cur + dir + GALLERY.length) % GALLERY.length);
  }, []);

  useEffect(() => { track('view_prevenda', { page: '/prevenda' }); }, []);

  return (
    <>
      <SEO
        title="Módulo Grow-X — Pré-venda: R$ 2.800 no Pix ou 12x no cartão · Entrega 20/11 + 3 meses de GXP Premium"
        description="Central de automação indoor com 6 tomadas inteligentes, fotoperíodo com nascer/pôr do sol, rega por umidade do solo, sensores e alertas. Pré-venda: R$ 2.800 no Pix ou R$ 3.000 em até 12x — depois do lançamento vai a R$ 5.500."
        path="/prevenda"
        jsonLd={PRODUCT_LD}
      />

      {/* HERO */}
      <section className="relative isolate overflow-hidden pt-14 pb-14 sm:pt-18 lg:pt-20 lg:pb-18">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <Reveal>
                <Eyebrow icon={Cpu}>Pré-venda aberta · entrega a partir de 20/11</Eyebrow>
              </Reveal>
              <Reveal delay={0.06}>
                <h1 className="mt-5 text-display-xl text-foreground">
                  O cérebro do seu <span className="text-gradient-emerald">grow.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
                  Luz com nascer e pôr do sol, rega por umidade do solo, clima sob controle e alertas
                  antes do prejuízo. Você planta. <strong className="text-foreground">O Módulo Grow-X opera.</strong>
                </p>
              </Reveal>

              <Reveal delay={0.18}>
                <GlassCard variant="strong" className="border-gradient-emerald mt-7 inline-block p-5 sm:p-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Preço após o lançamento: <span className="line-through">R$ 5.500</span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="text-4xl font-bold text-emerald-glow sm:text-5xl">R$ 2.800</span>
                    <span className="text-sm text-muted-foreground">à vista no Pix</span>
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    ou <strong className="text-foreground">R$ 3.000 em até 12x</strong> no cartão
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald/15 px-3 py-1.5 text-xs font-semibold text-emerald-glow">
                    <CheckCircle2 className="size-3.5" />
                    + 3 meses de GXP Premium inclusos
                  </div>
                </GlassCard>
              </Reveal>

              <Reveal delay={0.24}>
                <div className="mt-6">
                  <PayButtons loading={loading} start={start} context="hero" />
                  <CheckoutError error={error} />
                </div>
              </Reveal>

              <Reveal delay={0.3}>
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-emerald-glow" /> Stripe · Mercado Pago</span>
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-emerald-glow" /> 7 dias de arrependimento</span>
                  <span className="inline-flex items-center gap-1.5"><CalendarClock className="size-3.5 text-emerald-glow" /> Lançamento na ExpoCannabis 2026</span>
                </div>
                <div className="mt-6">
                  <p className="mb-2.5 text-xs uppercase tracking-wider text-muted-foreground">Preço de pré-venda acaba em</p>
                  <Countdown />
                </div>
              </Reveal>
            </div>

            <div className="relative lg:col-span-6">
              <Reveal>
                <button
                  type="button"
                  onClick={() => openLb(0)}
                  className="group relative block w-full cursor-zoom-in overflow-hidden rounded-3xl border border-foreground/10 shadow-elevated"
                  aria-label="Ampliar fotos do Módulo Grow-X"
                >
                  <img
                    src={fotoProduto}
                    alt="Módulo Grow-X — produto real em 6 ângulos"
                    className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    loading="eager"
                    fetchPriority="high"
                  />
                  <div className="absolute left-4 top-4"><StatusDot label="FOTOS REAIS DO PRODUTO" /></div>
                  <div className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-background/80 px-3.5 py-2 text-xs font-semibold text-foreground backdrop-blur transition group-hover:bg-emerald group-hover:text-background">
                    <Maximize2 className="size-3.5" />
                    Clique pra ampliar
                  </div>
                </button>
                <div className="absolute inset-0 -z-10 rounded-3xl bg-emerald/15 blur-3xl" />
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      {/* FAIXA DE VALOR */}
      <section className="border-y border-foreground/[0.06] bg-foreground/[0.02] py-6">
        <Container>
          <div className="grid grid-cols-2 gap-6 text-center md:grid-cols-4">
            {[
              ['R$ 2.800', 'no Pix · depois R$ 5.500'],
              ['até 12x', 'no cartão · R$ 3.000'],
              ['20/11', 'entrega · retirada na Expo'],
              ['3 meses', 'de GXP Premium grátis'],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="font-mono text-2xl font-bold text-emerald-glow">{v}</p>
                <p className="mt-1 text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* DOR */}
      <Section
        eyebrow="Real talk"
        title="Você não perde colheita por falta de capricho. Perde por falta de dado."
        intro="Timer que atrasa, luz que vira no horário errado, umidade que passa da faixa de madrugada, rega esquecida na correria. Quem cultiva sabe: é o descuido bobo que mata um ciclo inteiro de dedicação. O Módulo Grow-X existe pra isso nunca mais acontecer."
        narrow
      />

      {/* FEATURES */}
      <Section eyebrow="O que ele faz" title="Uma central. Toda a operação.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={i * 0.05}>
              <GlassCard variant="surface" className="h-full p-6">
                <div className="inline-flex rounded-xl bg-emerald/12 p-2.5">
                  <Icon className="size-5 text-emerald-glow" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* APP GXP */}
      <Section
        eyebrow="App GXP · 3 meses de Premium inclusos"
        title="Seu cultivo no bolso. De qualquer lugar."
        intro="Perfis prontos por fase — Mudas, Vegetativo 18/6, Floração 12/12 — sugeridos pelo app e confirmados por você. Painel em tempo real, histórico por vaso e alertas que avisam antes do prejuízo. O GXP lança em outubro: quem tá na pré-venda entra com Premium ativo um mês antes do módulo chegar."
      >
        <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          {APP_SHOTS.map((gi, i) => (
            <Reveal key={gi} delay={i * 0.04} className="shrink-0 snap-center">
              <button
                type="button"
                onClick={() => openLb(gi)}
                className="group relative block w-[220px] cursor-zoom-in overflow-hidden rounded-2xl border border-foreground/10 transition hover:border-emerald/40 sm:w-[240px]"
                aria-label={`Ampliar: ${GALLERY[gi].caption}`}
              >
                <img src={GALLERY[gi].src} alt={GALLERY[gi].alt} className="w-full" loading="lazy" />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-background/85 via-transparent to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Maximize2 className="size-3" /> Ampliar
                  </span>
                </div>
              </button>
              <p className="mt-2 w-[220px] text-center text-xs text-muted-foreground sm:w-[240px]">{GALLERY[gi].caption}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* PROVA TÉCNICA */}
      <Section
        eyebrow="Prova técnica"
        title="Hardware real. Não é render, não é promessa."
        intro="Eletrônica própria projetada no Brasil, gabinete injetado e software rodando em dispositivo real na bancada de QA. Clique em qualquer imagem pra ver de perto."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 7, 8].map((gi, i) => (
            <Reveal key={gi} delay={i * 0.07}>
              <button
                type="button"
                onClick={() => openLb(gi)}
                className="group block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-foreground/10 text-left transition hover:border-emerald/40"
                aria-label={`Ampliar: ${GALLERY[gi].caption}`}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={GALLERY[gi].src}
                    alt={GALLERY[gi].alt}
                    className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm font-semibold text-foreground">{GALLERY[gi].caption}</span>
                  <Maximize2 className="size-4 shrink-0 text-muted-foreground transition group-hover:text-emerald-glow" />
                </div>
              </button>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* LINHA DO TEMPO */}
      <Section eyebrow="Cronograma" title="Do clique à colheita." narrow={false}>
        <div className="grid gap-5 md:grid-cols-4">
          {[
            { k: 'Hoje', t: 'Você garante o preço de pré-venda', d: 'R$ 2.800 no Pix ou 12x de R$ 3.000. Posição confirmada na hora, recibo no email.' },
            { k: 'Outubro', t: 'GXP lança — seu Premium ativa', d: '3 meses de GXP Premium por nossa conta. Você já configura seu cultivo antes do hardware chegar.' },
            { k: '20/11', t: 'Módulo na sua mão', d: 'Entrega a partir do lançamento na ExpoCannabis Brasil 2026 — ou retirada em mãos no evento.' },
            { k: 'Depois', t: 'Preço vai a R$ 5.500', d: 'O valor de pré-venda não volta. Quem entrou, economizou até R$ 2.700.' },
          ].map(({ k, t, d }, i) => (
            <Reveal key={k} delay={i * 0.06}>
              <GlassCard variant={i === 0 ? 'strong' : 'surface'} className={`h-full p-6 ${i === 0 ? 'border-gradient-emerald' : ''}`}>
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-glow">{k}</p>
                <h3 className="mt-2 text-base font-bold text-foreground">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* OFERTA FINAL */}
      <section id="oferta" className="relative isolate overflow-hidden section-y">
        <Container narrow>
          <Reveal>
            <GlassCard variant="strong" className="border-gradient-emerald p-8 text-center sm:p-10">
              <Eyebrow>Pré-venda · lote limitado</Eyebrow>
              <h2 className="mt-5 text-display-lg text-foreground">
                Módulo Grow-X + 3 meses de <span className="text-gradient-emerald">GXP Premium.</span>
              </h2>
              <div className="mt-6 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
                <span className="text-lg text-muted-foreground line-through">R$ 5.500</span>
                <span className="text-5xl font-bold text-emerald-glow">R$ 2.800</span>
                <span className="text-sm text-muted-foreground">no Pix · ou 12x no cartão (R$ 3.000)</span>
              </div>

              <ul className="mx-auto mt-7 grid max-w-md gap-2.5 text-left text-sm text-muted-foreground">
                {[
                  '1 Módulo Grow-X — 6 tomadas inteligentes, sensores e dimmer',
                  '3 meses de GXP Premium (ativa no lançamento do app, em outubro)',
                  'Onboarding remoto com o time Grow-X',
                  'Entrega a partir de 20/11 — ou retirada na ExpoCannabis',
                  '7 dias de arrependimento com reembolso integral (CDC art. 49)',
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-glow" />{t}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex justify-center">
                <PayButtons loading={loading} start={start} context="oferta" />
              </div>
              <CheckoutError error={error} />

              <p className="mt-6 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="size-3.5 text-amber-500" />
                Depois do lançamento o preço público vai a R$ 5.500 — o valor de pré-venda não volta.
              </p>
            </GlassCard>
          </Reveal>

          <Reveal delay={0.1} className="mt-8 text-center">
            <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="btn-ghost">
              <MessageCircle className="size-4" />
              Prefere fechar pelo WhatsApp? Chama a gente
            </a>
          </Reveal>
        </Container>
      </section>

      <FAQ
        eyebrow="Dúvidas da pré-venda"
        title="Perguntas diretas, respostas diretas."
        items={FAQ_ITEMS}
      />

      {/* LEGAL */}
      <Section narrow>
        <Reveal>
          <GlassCard variant="surface" className="p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <ShieldCheck className="mt-1 size-5 shrink-0 text-emerald-glow" />
              <div className="text-sm leading-relaxed text-muted-foreground">
                <strong className="text-foreground">Nota legal.</strong> A Grow-X desenvolve e vende tecnologia de
                automação e monitoramento pra cultivo indoor de plantas de alto valor. Não comercializamos cannabis,
                sementes, derivados nem fazemos promessa terapêutica. O uso do equipamento é de responsabilidade do
                cliente, conforme a legislação aplicável ao seu projeto. Condições da pré-venda: lote limitado,
                entrega a partir de 20/11/2026, direito de arrependimento de 7 dias (CDC art. 49).{' '}
                <Link to="/termos" className="text-emerald-glow underline underline-offset-2">Termos de uso</Link>.
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </Section>

      <StickyBuyBar loading={loading} start={start} />

      <AnimatePresence>
        {lb >= 0 && <Lightbox idx={lb} onClose={() => setLb(-1)} onNav={navLb} />}
      </AnimatePresence>
    </>
  );
}
