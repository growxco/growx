import { Link } from 'react-router-dom';
import { ArrowRight, Gamepad2, Film, Cpu, Users, Sparkles } from 'lucide-react';
import { Section, GlassCard, Reveal, GridPattern } from '@/components/visual';

const PILLARS = [
  { icon: Gamepad2, title: 'Jogo cinematográfico', description: 'Uma experiência narrativa com ambição AAA, construída como IP própria.' },
  { icon: Film, title: 'Universo de marca', description: 'Storytelling, estética, comunidade e mídia em torno de um mundo autoral.' },
  { icon: Cpu, title: 'Tecnologia criativa', description: 'Pipeline 3D, simulação, IA aplicada e engenharia visual dentro da Grow-X Co.' },
  { icon: Users, title: 'Comunidade global', description: 'Entrada para público gamer, criadores, parceiros culturais e novos talentos.' },
];

export default function GreenVeilSection() {
  return (
    <Section
      id="greenveil"
      eyebrow="GreenVeil"
      eyebrowIcon={Sparkles}
      title={<>O braço imersivo da <span className="text-emerald-glow">Grow-X Co.</span></>}
      intro="GreenVeil não é uma solução agro. É o universo de entretenimento, tecnologia visual e comunidade que expande a Grow-X para cultura, games e mídia."
      background={<GridPattern fine mask="radial" className="opacity-60" />}
      size="tight"
    >
      <GlassCard variant="strong" className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-12">
          <div className="relative min-h-[360px] overflow-hidden border-b border-foreground/10 bg-[radial-gradient(circle_at_20%_20%,oklch(0.820_0.200_145/22%),transparent_32%),linear-gradient(135deg,oklch(0.110_0.020_150),oklch(0.165_0.030_155)_48%,oklch(0.090_0.018_135))] lg:col-span-5 lg:border-b-0 lg:border-r">
            <div className="absolute inset-0 bg-grid-fine opacity-25" />
            <div className="absolute left-6 top-6 inline-flex items-center gap-2 rounded-full border border-emerald/25 bg-background/45 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-glow backdrop-blur">
              GreenVeil Universe
            </div>
            <div className="absolute inset-x-6 bottom-6">
              <div className="font-display text-5xl font-bold leading-none text-foreground sm:text-6xl">
                Green<br />
                <span className="text-emerald-glow">Veil</span>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Um mundo autoral para provar que a Grow-X também constrói imaginação, não só infraestrutura.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:col-span-7 lg:p-10">
            <Reveal>
              <h3 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                A marca cresce quando vira operação, produto e universo.
              </h3>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                A Grow-X Co. nasce no agro, mas não fica presa ao agro. GreenVeil posiciona a companhia em tecnologia imersiva:
                arte, software, narrativa e comunidade trabalhando juntos para abrir uma frente cultural de alto alcance.
              </p>
            </Reveal>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {PILLARS.map((pillar, index) => {
                const Icon = pillar.icon;
                return (
                  <Reveal key={pillar.title} delay={0.08 + index * 0.04}>
                    <div className="rounded-xl border border-foreground/10 bg-foreground/[0.03] p-4">
                      <span className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald/15 text-emerald-glow ring-hairline">
                        <Icon className="size-4" />
                      </span>
                      <h4 className="mt-4 text-sm font-semibold text-foreground">{pillar.title}</h4>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{pillar.description}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>

            <Reveal delay={0.28}>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/contato" className="btn-primary">
                  Falar sobre GreenVeil
                  <ArrowRight className="size-4" />
                </Link>
                <a href="/#main" className="btn-ghost">Voltar para Grow-X</a>
              </div>
            </Reveal>
          </div>
        </div>
      </GlassCard>
    </Section>
  );
}
