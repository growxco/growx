import { Radio, Cpu, Database, ShieldCheck, Network } from 'lucide-react';
import { Section, RingSensor, Reveal, GlassCard } from '@/components/visual';

const LAYERS = [
  { icon: Radio, title: 'Sensoriamento', desc: 'Sensores LoRa e mesh distribuídos. Microclima local, não estimativa de satélite.' },
  { icon: Cpu, title: 'Edge computing', desc: 'Processamento na ponta — decisão agronômica roda mesmo sem rede boa.' },
  { icon: Network, title: 'Orquestração', desc: 'Supply-X une SPI e SPP numa camada de dados comum, em tempo real.' },
  { icon: Database, title: 'Inteligência', desc: 'IA aplicada a dados reais da sua operação. Sem black box, sem promessa vaga.' },
  { icon: ShieldCheck, title: 'Rastreabilidade', desc: 'Trilha auditável por carga, talhão e ciclo. Compliance por contrato, não por planilha.' },
];

export default function SensorRingSection() {
  return (
    <Section
      eyebrow="Arquitetura"
      title={
        <>
          Cinco camadas. <span className="text-emerald-glow">Um sistema operando.</span>
        </>
      }
      intro="A Grow-X não é um produto avulso — é uma stack agro brasileira montada pra trabalhar em conjunto, de ponta a ponta."
    >
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="relative mx-auto lg:col-span-5">
          <Reveal>
            <div className="relative">
              <RingSensor size={420} />
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-emerald/15 blur-3xl" />
            </div>
          </Reveal>
        </div>
        <div className="lg:col-span-7">
          <ul className="space-y-3">
            {LAYERS.map((l, i) => {
              const Icon = l.icon;
              return (
                <Reveal key={l.title} delay={i * 0.06}>
                  <GlassCard variant="surface" className="flex items-start gap-4 p-5 lift hover:border-[oklch(0.700_0.180_145/45%)]">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{l.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{l.desc}</p>
                    </div>
                    <span className="ml-auto self-center font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      0{i + 1}
                    </span>
                  </GlassCard>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </div>
    </Section>
  );
}
