import { ArrowUpRight, Compass, CircuitBoard, Flower2 } from 'lucide-react';
import { Section, GlassCard, Reveal } from '@/components/visual';

/**
 * Teses estratégicas da Grow-X — pensamento, não blog vazio.
 */
const THESES = [
  {
    icon: Compass,
    label: 'Tese 01 · Soberania',
    title: 'O agro brasileiro precisa de stack brasileira.',
    excerpt:
      'Importar tecnologia sem tropicalização é herdar dívida técnica. A Grow-X foi construída pensando rede precária, clima real e cultura operacional de produtor, cooperativa e indústria do Brasil.',
  },
  {
    icon: CircuitBoard,
    label: 'Tese 02 · Operação',
    title: 'Software agro só vale quando opera 24/7 — não em slide.',
    excerpt:
      'Cada produto Grow-X passa meses em campo antes de virar feature pública. Indicador de maturidade pra nós é tempo de uptime em produção real, não pitch deck bonito.',
  },
  {
    icon: Flower2,
    label: 'Tese 03 · Cannabis',
    title: 'Cultivo medicinal exige padrão farmacêutico.',
    excerpt:
      'Pacientes merecem rastreabilidade clínica, não adaptação de ferramenta genérica. O Grow-X App nasceu pra dar ao cultivo controlado o mesmo nível de governança que se exige de qualquer ativo regulado.',
  },
];

export default function Insights() {
  return (
    <Section
      eyebrow="Teses"
      title={
        <>
          O que pensamos <span className="text-emerald-glow">— em voz alta.</span>
        </>
      }
      intro="Não é blog. São as teses que orientam cada linha de código, cada sensor e cada decisão comercial."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {THESES.map((t, i) => {
          const Icon = t.icon;
          return (
            <Reveal key={t.title} delay={i * 0.08} className="h-full">
              <GlassCard variant="surface" className="group relative h-full overflow-hidden p-7 lift hover:border-[oklch(0.700_0.180_145/45%)]">
                <div className="flex items-start justify-between">
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                    <Icon className="size-5" />
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
                </div>
                <div className="mt-6 text-eyebrow text-emerald-glow">{t.label}</div>
                <h3 className="mt-3 font-display text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">{t.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t.excerpt}</p>
                <div className="mt-6 hairline-emerald opacity-40" />
                <div className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Grow-X · teses & operação
                </div>
              </GlassCard>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
