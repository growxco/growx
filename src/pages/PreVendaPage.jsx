import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarClock, CheckCircle2, Cpu, Gauge as GaugeIcon,
  LineChart, Loader2, MessageCircle, Power, ShieldCheck, Smartphone, Sun,
} from 'lucide-react';
import { SEO, Section, Container, Eyebrow, GlassCard, Reveal, StatusDot } from '@/components/visual';
import { FeatureGrid, SpecsTable, MetricStrip, FAQ } from '@/components/sections';
import { track } from '@/lib/analytics';
import fotoAberto from '../assets/modulo-real-1.webp';
import fotoAngulos from '../assets/modulo-real-2.webp';
import fotoApp from '../assets/modulo-real-3.webp';

const WHATSAPP = 'https://wa.me/5541995494343?text=Quero%20garantir%20um%20M%C3%B3dulo%20Grow-X%20na%20pr%C3%A9-venda%20Founder';
const LAUNCH = new Date('2026-11-20T09:00:00-03:00');

const PRODUCT_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Módulo Grow-X',
  description:
    'Central de automação indoor de precisão: 6 tomadas inteligentes com papéis configuráveis, dimmer de iluminação com sunrise/sunset, agenda com fuso horário, sensores ambientais e app Grow-X.',
  sku: 'GX-MODULO-FOUNDER',
  brand: { '@type': 'Brand', name: 'Grow-X' },
  manufacturer: { '@type': 'Organization', name: 'Grow-X Co.' },
  category: 'Automação de cultivo indoor',
  image: 'https://www.growx.com.br/og-image.png',
  offers: {
    '@type': 'Offer',
    price: '2997.00',
    priceCurrency: 'BRL',
    availability: 'https://schema.org/PreOrder',
    availabilityStarts: '2026-08-03',
    url: 'https://www.growx.com.br/prevenda',
    seller: { '@type': 'Organization', name: 'Grow-X Co.' },
  },
};

const METRICS = [
  { value: '6 tomadas', label: 'Saídas inteligentes com papéis configuráveis' },
  { value: '0–100%', label: 'Dimmer de iluminação com sunrise/sunset' },
  { value: '20/11/2026', label: 'Entrega Founder · ExpoCannabis Brasil' },
  { value: '30 unidades', label: 'Lote Founder a R$ 2.997' },
];

const FEATURES = [
  { icon: Power, title: '6 tomadas inteligentes', description: 'Cada saída assume um papel: exaustor, iluminação, umidificador, desumidificador, irrigação, circulação, aquecedor ou refrigeração.' },
  { icon: Sun, title: 'Iluminação com dimmer', description: 'Intensidade 0–100% com teto configurável, sunrise e sunset graduais pra simular fotoperíodo real.' },
  { icon: CalendarClock, title: 'Agenda com fuso horário', description: 'Schedule liga/desliga por horário, com fuso configurável e validação de relógio.' },
  { icon: GaugeIcon, title: 'Sensores ambientais', description: 'Leitura contínua do ambiente pra decisão automatizada — menos tentativa e erro, mais dado.' },
  { icon: ShieldCheck, title: 'Parada geral e auto-teste', description: 'Botão de parada geral, liberação controlada e auto-teste dos relés. Segurança em primeiro lugar.' },
  { icon: Smartphone, title: 'App Grow-X', description: 'Configuração, automações, cenários e logs no app. Acesso antecipado incluso no lote Founder.' },
  { icon: LineChart, title: 'Histórico e dados', description: 'Estado e eventos registrados — sua operação vira histórico auditável, não achismo.' },
  { icon: Cpu, title: 'Hardware real, testado', description: 'Eletrônica própria em produção, gabinete injetado e bancada de QA. O que você vê é o que será entregue.' },
];

const SPECS = {
  'Saídas': '6 tomadas inteligentes com papéis configuráveis',
  'Papéis disponíveis': 'Exaustor · Iluminação · Umidificador · Desumidificador · Irrigação · Circulação · Aquecedor · Refrigeração',
  'Iluminação': 'Dimmer 0–100%, teto configurável, sunrise/sunset em minutos',
  'Agenda': 'Liga/desliga por horário com fuso configurável',
  'Sensores': 'Ambiente monitorado (temperatura e umidade)',
  'Segurança': 'Parada geral, liberação de parada e auto-teste dos relés',
  'Controle': 'App Grow-X — automações, cenários e logs',
  'Alimentação': 'Fonte AC embutida, cabo padrão',
};

const FAQ_ITEMS = [
  {
    q: 'Quando recebo meu Módulo?',
    a: 'A entrega do lote Founder começa em 20/11/2026, data do lançamento oficial na ExpoCannabis Brasil 2026 (São Paulo Expo, 20 a 22 de novembro). Quem estiver no evento pode retirar em mãos; os demais recebem por envio logo após o lançamento.',
  },
  {
    q: 'Como funciona o pagamento?',
    a: 'Pelo checkout seguro da Stripe, em ambiente criptografado — a Grow-X não armazena dados de cartão. Cartão de crédito aceito; outras formas de pagamento aparecem no checkout quando disponíveis.',
  },
  {
    q: 'Posso cancelar a compra?',
    a: 'Sim. Vale o direito de arrependimento de 7 dias (art. 49 do CDC) a partir da compra, com reembolso integral. As condições completas da pré-venda acompanham o recibo de compra.',
  },
  {
    q: 'O que está incluso no lote Founder?',
    a: '1 Módulo Grow-X + acesso antecipado ao app Grow-X + onboarding remoto com o time. Lote limitado a 30 unidades a R$ 2.997 — depois, o preço público estimado é R$ 3.500.',
  },
  {
    q: 'Pra que serve e pra quem é?',
    a: 'É uma central de automação pra cultivo indoor de plantas de alto valor: controle ambiental, iluminação, irrigação e dados. Atende cultivadores técnicos, projetos legalmente autorizados, associações, pesquisa e grow shops.',
  },
  {
    q: 'É legalizado?',
    a: 'A Grow-X vende tecnologia de automação e monitoramento — não vende cannabis, sementes, derivados nem promessa terapêutica. O uso do equipamento é de responsabilidade do cliente, conforme a legislação aplicável ao seu projeto.',
  },
];

function useCheckout() {
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const start = async (sku) => {
    if (loading) return;
    setLoading(sku);
    setError(null);
    track('begin_checkout', { sku, value: sku === 'founder' ? 2997 : 497, currency: 'BRL', page: '/prevenda' });
    try {
      const r = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku }),
      });
      const data = await r.json().catch(() => null);
      if (r.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      track('checkout_error', { sku, code: data?.error || r.status, page: '/prevenda' });
      setError(
        data?.error === 'stripe_not_configured'
          ? 'O checkout está em ativação. Garanta sua unidade agora pelo WhatsApp — respondemos na hora.'
          : 'Não conseguimos abrir o checkout agora. Tente de novo ou garanta pelo WhatsApp.'
      );
    } catch {
      setError('Falha de conexão. Tente de novo ou garanta pelo WhatsApp.');
    }
    setLoading(null);
  };

  return { loading, error, start };
}

function Countdown() {
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
    <div className="flex flex-col items-center rounded-xl bg-foreground/[0.04] px-3 py-2 sm:px-4">
      <span className="font-mono text-xl font-bold text-emerald-glow sm:text-2xl">{String(v).padStart(2, '0')}</span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2">
      {cell(d, 'dias')}{cell(h, 'horas')}{cell(m, 'min')}{cell(s, 'seg')}
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

export default function PreVendaPage() {
  const { loading, error, start } = useCheckout();

  useEffect(() => { track('view_prevenda', { page: '/prevenda' }); }, []);

  return (
    <>
      <SEO
        title="Pré-venda Módulo Grow-X — Lote Founder R$ 2.997 · Lançamento ExpoCannabis 2026"
        description="Automação indoor de precisão: 6 tomadas inteligentes, dimmer de iluminação, agenda, sensores e app. Lote Founder limitado a 30 unidades por R$ 2.997. Entrega a partir de 20/11/2026, no lançamento da ExpoCannabis Brasil."
        path="/prevenda"
        jsonLd={PRODUCT_LD}
      />

      {/* HERO */}
      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-24 lg:pb-20">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <Reveal>
                <Eyebrow icon={Cpu}>Pré-venda · Lote Founder limitado a 30 unidades</Eyebrow>
              </Reveal>
              <Reveal delay={0.06}>
                <h1 className="mt-6 text-display-xl text-foreground">
                  Módulo Grow-X. <span className="text-gradient-emerald">Cultivo indoor operado por dados.</span>
                </h1>
              </Reveal>
              <Reveal delay={0.14}>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                  Central de automação de precisão: 6 tomadas inteligentes, dimmer de iluminação com
                  sunrise/sunset, agenda, sensores e app. Lançamento oficial na ExpoCannabis Brasil 2026 —
                  entrega do lote Founder a partir de <strong className="text-foreground">20 de novembro de 2026</strong>.
                </p>
              </Reveal>
              <Reveal delay={0.22}>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => start('founder')}
                    disabled={loading === 'founder'}
                    className="btn-primary"
                  >
                    {loading === 'founder' ? <Loader2 className="size-4 animate-spin" /> : null}
                    Garantir por R$ 2.997
                    <ArrowRight className="size-4" />
                  </button>
                  <a href="#oferta" className="btn-ghost">Ver a oferta completa</a>
                  <StatusDot label="Pré-venda aberta" className="ml-1 hidden sm:inline-flex" />
                </div>
              </Reveal>
              <Reveal delay={0.3}>
                <CheckoutError error={error} />
                <div className="mt-8">
                  <p className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">Lançamento na ExpoCannabis Brasil 2026 em</p>
                  <Countdown />
                </div>
              </Reveal>
            </div>
            <div className="relative lg:col-span-5">
              <Reveal>
                <GlassCard variant="strong" className="border-gradient-emerald shadow-elevated overflow-hidden">
                  <div className="relative aspect-[4/3] w-full">
                    <img src={fotoAberto} alt="Módulo Grow-X real com gabinete aberto mostrando a eletrônica" className="absolute inset-0 h-full w-full object-cover" loading="eager" />
                    <div className="absolute left-4 top-4"><StatusDot label="HARDWARE REAL" /></div>
                  </div>
                </GlassCard>
                <div className="absolute inset-0 -z-10 rounded-3xl bg-emerald/15 blur-3xl" />
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      <MetricStrip items={METRICS} />

      {/* DOR */}
      <Section
        eyebrow="O problema"
        title="Cultivo indoor sem dados vira tentativa e erro."
        intro="Timer analógico, régua de tomada e planilha não seguram uma operação séria. Variação ambiental, erro manual e falta de histórico custam colheita, energia e tempo. O Módulo Grow-X transforma o seu grow em operação controlada — cada equipamento com papel definido, cada decisão registrada."
        narrow
      />

      <FeatureGrid
        eyebrow="O que ele faz"
        title="Uma central. Toda a operação."
        items={FEATURES}
      />

      {/* OFERTA */}
      <section id="oferta" className="relative isolate overflow-hidden section-y">
        <Container>
          <Reveal className="text-center">
            <Eyebrow>Oferta de pré-venda</Eyebrow>
            <h2 className="mt-6 text-display-xl text-foreground">Lote Founder. <span className="text-gradient-emerald">30 unidades.</span></h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Preço público estimado após o lançamento: <span className="line-through">R$ 3.500</span>.
              Founder garante o menor preço que este produto vai ter.
            </p>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            <Reveal>
              <GlassCard variant="strong" className="border-gradient-emerald relative flex h-full flex-col p-8">
                <span className="absolute -top-3 left-8 rounded-full bg-emerald px-3 py-1 text-xs font-bold uppercase tracking-wider text-background">
                  Melhor oferta
                </span>
                <h3 className="text-lg font-bold uppercase tracking-wide text-foreground">Founder</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-emerald-glow">R$ 2.997</span>
                  <span className="text-sm text-muted-foreground">à vista no checkout</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    '1 Módulo Grow-X completo',
                    'Acesso antecipado ao app Grow-X',
                    'Onboarding remoto com o time',
                    'Entrega a partir de 20/11/2026',
                    'Retirada em mãos na ExpoCannabis (opcional)',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-glow" />{t}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => start('founder')}
                  disabled={loading === 'founder'}
                  className="btn-primary mt-8 w-full justify-center"
                >
                  {loading === 'founder' ? <Loader2 className="size-4 animate-spin" /> : null}
                  Garantir unidade Founder
                  <ArrowRight className="size-4" />
                </button>
              </GlassCard>
            </Reveal>

            <Reveal delay={0.08}>
              <GlassCard variant="surface" className="flex h-full flex-col p-8">
                <h3 className="text-lg font-bold uppercase tracking-wide text-foreground">Reserva com sinal</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-foreground">R$ 497</span>
                  <span className="text-sm text-muted-foreground">sinal · abate do valor final</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                  {[
                    'Garante sua posição no lote',
                    'Saldo apenas no marco de produção',
                    'Reembolsável conforme termos da pré-venda',
                    'Converte pra Founder enquanto houver lote',
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-glow" />{t}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => start('reserva')}
                  disabled={loading === 'reserva'}
                  className="btn-ghost mt-8 w-full justify-center"
                >
                  {loading === 'reserva' ? <Loader2 className="size-4 animate-spin" /> : null}
                  Reservar com R$ 497
                </button>
              </GlassCard>
            </Reveal>
          </div>

          <Reveal delay={0.15} className="mt-8 text-center">
            <CheckoutError error={error} />
            <p className="mt-6 text-sm text-muted-foreground">
              Pagamento processado pela Stripe em ambiente seguro · Direito de arrependimento de 7 dias (CDC art. 49)
            </p>
          </Reveal>
        </Container>
      </section>

      {/* PROVA TÉCNICA */}
      <Section
        eyebrow="Prova técnica"
        title="Hardware real. Não é render."
        intro="Eletrônica própria, gabinete injetado e software de bancada rodando em dispositivo real. O que está nas fotos é o produto que será entregue no lote Founder."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { img: fotoAberto, alt: 'Módulo Grow-X aberto — placa eletrônica e fonte AC', label: 'Eletrônica própria' },
            { img: fotoAngulos, alt: 'Módulo Grow-X — gabinete em vários ângulos', label: 'Gabinete final' },
            { img: fotoApp, alt: 'Software Grow-X QA controlando as 6 tomadas do módulo', label: 'Software rodando' },
          ].map(({ img, alt, label }, i) => (
            <Reveal key={label} delay={i * 0.07}>
              <GlassCard variant="surface" className="overflow-hidden">
                <div className="relative aspect-[4/3]">
                  <img src={img} alt={alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="px-5 py-4">
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                </div>
              </GlassCard>
            </Reveal>
          ))}
        </div>
      </Section>

      <SpecsTable
        eyebrow="Ficha técnica"
        title="O que vai na caixa preta."
        specs={SPECS}
      />

      {/* B2B */}
      <Section
        eyebrow="Grow shops · Consultores · Associações"
        title="Quer revender ou integrar o Módulo?"
        intro="Programa Parceiro Grow-X com condição por volume pra grow shops, instaladores, consultores técnicos, associações e pesquisa. Vamos estar na ExpoCannabis Brasil 2026 — agende uma conversa antes da feira."
        narrow
      >
        <Reveal className="flex flex-wrap justify-center gap-3">
          <Link to="/contato" className="btn-primary">
            Quero ser parceiro
            <ArrowRight className="size-4" />
          </Link>
          <a href={WHATSAPP} target="_blank" rel="noreferrer noopener" className="btn-ghost">
            <MessageCircle className="size-4" />
            Falar no WhatsApp
          </a>
        </Reveal>
      </Section>

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
    </>
  );
}
