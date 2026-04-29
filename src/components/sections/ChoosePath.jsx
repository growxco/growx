import { Link } from 'react-router-dom';
import { Factory, Sprout, ArrowRight } from 'lucide-react';
import { Section, Reveal } from '@/components/visual';

const PATHS = [
  {
    key: 'industrial',
    icon: Factory,
    label: 'Sou indústria, cooperativa ou cadeia agroalimentar',
    title: 'Operação industrial',
    desc: 'Recebimento digital, governança, integração ERP, rastreabilidade ponta-a-ponta. Para quem precisa de stack robusta com contrato.',
    products: ['Supply-X', 'SPI', 'SPP'],
    cta: 'Ver soluções industriais',
    to: '/solucoes/supply-x',
    accent: 'emerald',
  },
  {
    key: 'cultivo',
    icon: Sprout,
    label: 'Cultivo, comunidade ou cannabis medicinal',
    title: 'Cultivo controlado',
    desc: 'Hardware, app, comunidade e marketplace. Padrão farmacêutico para cannabis medicinal e cultivadores estruturados.',
    products: ['Grow-X App', 'Estufa', 'Módulo SF'],
    cta: 'Conhecer o Grow-X App',
    to: '/solucoes/growx-app',
    accent: 'amber',
  },
];

export default function ChoosePath() {
  return (
    <Section
      eyebrow="Escolha seu caminho"
      title={<>Duas operações. <span className="text-emerald-glow">Uma stack.</span></>}
      intro="A Grow-X opera duas frentes complementares. Diga onde você está pra mostrar exatamente o que importa pra você."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        {PATHS.map((p, i) => {
          const Icon = p.icon;
          return (
            <Reveal key={p.key} delay={i * 0.08} className="h-full">
              <Link
                to={p.to}
                className="group relative block h-full overflow-hidden rounded-2xl glass-strong p-7 ring-hairline lift hover:border-[oklch(0.700_0.180_145/45%)] sm:p-9"
              >
                <div className="flex items-center gap-4">
                  <span className="inline-flex size-12 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                    <Icon className="size-5" />
                  </span>
                  <span className="text-eyebrow text-muted-foreground">{p.label}</span>
                </div>
                <h3 className="mt-6 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">{p.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">{p.desc}</p>
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {p.products.map((prod) => (
                    <span key={prod} className="rounded-full border border-foreground/10 bg-foreground/[0.03] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground/80">
                      {prod}
                    </span>
                  ))}
                </div>
                <div className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-glow">
                  {p.cta}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
