import { GitBranch, ShieldOff, Layers } from 'lucide-react';
import { Section, GlassCard, Reveal } from '@/components/visual';

const ITEMS = [
  {
    icon: GitBranch,
    pain: 'Dados fragmentados entre campo, indústria e ERP.',
    answer:
      'Camada única que une sensoriamento, produção e cadeia em um modelo de dados auditável.',
  },
  {
    icon: ShieldOff,
    pain: 'Compliance e rastreabilidade dependem de planilha e boa-vontade.',
    answer:
      'Trilha digital end-to-end: cada lote, cada talhão, cada ciclo carrega seu próprio dossiê.',
  },
  {
    icon: Layers,
    pain: 'Tecnologia importada que não fala a língua da sua operação.',
    answer:
      'Hardware e software desenvolvidos no Brasil, prontos pra rede precária e clima real.',
  },
];

export default function ProblemSection() {
  return (
    <Section
      eyebrow="O que a Grow-X resolve"
      title={
        <>
          Você opera. <span className="text-emerald-glow">Nós automatizamos.</span>
        </>
      }
      intro="O agro brasileiro produz no limite. A tecnologia que sustenta essa produção precisa estar à altura — sem promessa vazia, sem dependência de terceiros."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            <Reveal key={i} delay={i * 0.08}>
              <GlassCard variant="surface" className="h-full p-7 lift hover:border-[oklch(0.700_0.180_145/45%)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                    <Icon className="size-5" />
                  </span>
                  <div className="text-eyebrow text-muted-foreground">Antes</div>
                </div>
                <p className="mt-4 text-base font-medium leading-snug text-foreground/85">{item.pain}</p>
                <div className="my-5 hairline-emerald" />
                <div className="text-eyebrow text-emerald-glow">Com a Grow-X</div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
              </GlassCard>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
