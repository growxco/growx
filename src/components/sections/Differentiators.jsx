import { ServerCog, FileCheck2, Network, MapPinned } from 'lucide-react';
import { Section, GlassCard, Reveal } from '@/components/visual';

const PILLARS = [
  {
    icon: ServerCog,
    title: 'Operação real, não slide.',
    body:
      'Nosso software roda em produção 24/7 — em estufas, fábricas e fazendas — antes de virar feature pública.',
  },
  {
    icon: FileCheck2,
    title: 'Tecnologia auditável.',
    body:
      'Trilha de dados rastreável, contratos e logs imutáveis. O que você mede pode ser provado a um regulador, banco ou cliente.',
  },
  {
    icon: Network,
    title: 'Integração end-to-end.',
    body:
      'Sensor, gateway, plataforma, ERP, banco de dados e relatórios — uma stack só, falando a mesma língua.',
  },
  {
    icon: MapPinned,
    title: 'Atendimento brasileiro.',
    body:
      'Time em Curitiba/PR. Suporte humano, deploy assistido e adaptação ao seu cenário — em português e na velocidade do agro.',
  },
];

export default function Differentiators() {
  return (
    <Section
      eyebrow="Diferenciais"
      title={
        <>
          Por que <span className="text-emerald-glow">a Grow-X.</span>
        </>
      }
      intro="Quatro princípios não-negociáveis que sustentam cada decisão de produto."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((p, i) => {
          const Icon = p.icon;
          return (
            <Reveal key={p.title} delay={i * 0.06} className="h-full">
              <GlassCard variant="surface" className="h-full p-7 lift hover:border-[oklch(0.700_0.180_145/45%)]">
                <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">{p.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </GlassCard>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
