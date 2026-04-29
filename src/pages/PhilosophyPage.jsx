import { Heart, Target, Eye, Award, TrendingUp, Globe } from 'lucide-react';
import { SEO, Container, Section, Eyebrow, Reveal, GlassCard, Aurora, GridPattern } from '@/components/visual';
import { FeatureGrid, FinalCTA, UseCases } from '@/components/sections';

const PILLARS = [
  { icon: Target, title: 'Missão', description: 'Democratizar tecnologia agrícola de ponta — produtividade, custo menor, prática sustentável.' },
  { icon: Eye, title: 'Visão', description: 'Ser referência nacional em tecnologia agro: inovação, qualidade e impacto positivo.' },
  { icon: Heart, title: 'Filosofia', description: 'Tecnologia acessível, sustentável e centrada nas pessoas. Solução real pra dor real.' },
];

const VALUES = [
  {
    title: 'Inovação',
    description: 'Buscamos tecnologias e soluções que mudam a régua do agro brasileiro.',
    points: ['Pesquisa contínua', 'Adoção de tech emergente', 'Criatividade com método', 'Iteração rápida'],
  },
  {
    title: 'Colaboração',
    description: 'Trabalhamos em parceria com clientes, fornecedores e comunidade.',
    points: ['Relação de longo prazo', 'Comunicação transparente', 'Time conjunto', 'Conhecimento aberto'],
  },
  {
    title: 'Sustentabilidade',
    description: 'Tecnologia que promove agricultura responsável e regenerativa.',
    points: ['Preservação ambiental', 'Eficiência de recursos', 'Práticas eco-friendly', 'Responsabilidade social'],
  },
  {
    title: 'Excelência',
    description: 'Compromisso com qualidade superior em todos os aspectos.',
    points: ['Padrão técnico alto', 'Atendimento humano', 'Produto confiável', 'Melhoria contínua'],
  },
];

const PHILOSOPHY_PILLARS = [
  { icon: Target, title: 'Foco no cliente', description: 'Necessidade real do cliente no centro de cada decisão.' },
  { icon: TrendingUp, title: 'Crescimento sustentável', description: 'Crescer de forma equilibrada — pra todos os stakeholders.' },
  { icon: Globe, title: 'Impacto positivo', description: 'Trabalho que gera impacto na sociedade e meio ambiente.' },
  { icon: Award, title: 'Reconhecimento', description: 'Valorização de cada contribuição da equipe e parceiros.' },
];

export default function PhilosophyPage() {
  return (
    <>
      <SEO
        title="Filosofia, Missão & Valores — Grow-X"
        description="O que sustenta cada decisão da Grow-X: missão, visão e valores que pautam tecnologia agro com propósito."
        path="/sobre/filosofia"
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <Reveal className="max-w-3xl">
            <Eyebrow icon={Heart}>Princípios</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              O que pauta cada <span className="text-emerald-glow">decisão.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Tecnologia agro com propósito. Missão, visão e valores escritos pra orientar — não pra decorar parede.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* Mission · Vision · Philosophy */}
      <Section size="tight">
        <div className="grid gap-5 lg:grid-cols-3">
          {PILLARS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={i * 0.06} className="h-full">
                <GlassCard variant="emerald" className="h-full p-8 lift">
                  <span className="inline-flex size-12 items-center justify-center rounded-xl bg-emerald/20 text-emerald-glow ring-hairline">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-foreground">{p.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
                </GlassCard>
              </Reveal>
            );
          })}
        </div>
      </Section>

      <UseCases
        eyebrow="Valores em prática"
        title="Quatro princípios — quatro práticas."
        intro="Cada valor traduzido em comportamento concreto do time."
        items={VALUES}
      />

      <FeatureGrid
        eyebrow="Pilares da filosofia"
        title="Como traduzimos isso em rotina."
        items={PHILOSOPHY_PILLARS}
        columns={4}
      />

      <FinalCTA />
    </>
  );
}
