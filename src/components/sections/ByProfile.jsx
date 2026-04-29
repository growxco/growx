import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Factory, Tractor, Building2, Sprout, ArrowRight } from 'lucide-react';
import { Section, GlassCard, Reveal } from '@/components/visual';
import spiImg from '../../assets/spi-dashboard-industrial.webp';
import sppImg from '../../assets/spp-dashboard-irrigation.webp';
import supplyImg from '../../assets/Supply-X.jpg';
import gxAppImg from '../../assets/growx-app-hero-cannabis.webp';

const PROFILES = [
  {
    key: 'industria',
    icon: Factory,
    label: 'Indústria',
    title: 'Para indústrias agroalimentares',
    desc: 'Dashboards de chão de fábrica, integração ERP e governança de cadeia. SPI conecta processo, qualidade e originação numa só leitura.',
    href: '/solucoes/spi',
    cta: 'Ver SPI',
    image: spiImg,
  },
  {
    key: 'produtor',
    icon: Tractor,
    label: 'Produtor',
    title: 'Para produtores rurais',
    desc: 'O app que organiza talhão, custo, irrigação e KC. SPP transforma decisão agronômica em rotina simples — feito pro produtor real.',
    href: '/solucoes/spp',
    cta: 'Ver SPP',
    image: sppImg,
  },
  {
    key: 'cadeia',
    icon: Building2,
    label: 'Cooperativa & cadeia',
    title: 'Para cooperativas e cadeias integradas',
    desc: 'Supply-X amarra indústria, produtores e logística numa cadeia rastreável de ponta a ponta. Compliance e originação em tempo real.',
    href: '/solucoes/supply-x',
    cta: 'Ver Supply-X',
    image: supplyImg,
  },
  {
    key: 'cultivo',
    icon: Sprout,
    label: 'Cultivo controlado',
    title: 'Para cultivo controlado e cannabis medicinal',
    desc: 'Grow-X App orquestra estufas, sensores e ciclos. Marketplace integrado e comunidade — pra quem opera no padrão farmacêutico.',
    href: '/solucoes/growx-app',
    cta: 'Ver Grow-X App',
    image: gxAppImg,
  },
];

export default function ByProfile() {
  const [active, setActive] = useState(PROFILES[0].key);
  const current = PROFILES.find((p) => p.key === active) ?? PROFILES[0];
  const Icon = current.icon;

  return (
    <Section
      eyebrow="Para quem é"
      title={
        <>
          Cabe na sua <span className="text-emerald-glow">operação.</span>
        </>
      }
      intro="Quatro perfis, quatro caminhos. Escolha o seu pra ver como a Grow-X se encaixa."
    >
      <Reveal>
        <GlassCard variant="strong" className="overflow-hidden">
          {/* tabs */}
          <div className="flex flex-wrap gap-1 border-b border-white/10 p-2 sm:p-3">
            {PROFILES.map((p) => {
              const I = p.icon;
              const isActive = p.key === active;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setActive(p.key)}
                  className={
                    'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ' +
                    (isActive
                      ? 'bg-emerald/15 text-emerald-glow ring-hairline'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-foreground')
                  }
                >
                  <I className="size-4" />
                  {p.label}
                </button>
              );
            })}
          </div>
          {/* panel */}
          <div className="grid gap-0 lg:grid-cols-2">
            <div className="order-2 p-7 sm:p-10 lg:order-1">
              <div className="text-eyebrow text-emerald-glow">Perfil · {current.label}</div>
              <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">{current.title}</h3>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground">{current.desc}</p>
              <Link to={current.href} className="btn-primary mt-7">
                {current.cta}
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="relative order-1 min-h-[280px] overflow-hidden border-b border-white/10 lg:order-2 lg:border-b-0 lg:border-l">
              <img src={current.image} alt={current.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-background/80 via-background/30 to-transparent" />
              <div className="absolute left-5 top-5 inline-flex size-12 items-center justify-center rounded-xl bg-background/70 text-emerald-glow ring-hairline backdrop-blur">
                <Icon className="size-5" />
              </div>
            </div>
          </div>
        </GlassCard>
      </Reveal>
    </Section>
  );
}
