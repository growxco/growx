import { Link } from 'react-router-dom';
import { FileText, Construction } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern } from '@/components/visual';
import { FinalCTA } from '@/components/sections';

/**
 * Casos / cases — placeholder estruturado.
 * MOCK explícito: cards marcados como "case em construção" até o time aprovar publicação real.
 */
const CASES = [
  {
    slug: 'cooperativa-grao',
    sector: 'Cooperativa de grãos',
    teaser: 'Recebimento digital + integração ERP em 90 dias',
    metric: 'Filas reduzidas em 40%',
    status: 'Em validação editorial',
  },
  {
    slug: 'producao-batata',
    sector: 'Sojicultura · 1.200 ha',
    teaser: 'Cálculo de irrigação por Kc trocou caderno e planilha',
    metric: 'Economia de água de 28%',
    status: 'Em validação editorial',
  },
  {
    slug: 'estufa-medicinal',
    sector: 'Cultivo medicinal · associação',
    teaser: 'Estufa automatizada + diário clínico documentado',
    metric: 'Padrão farmacêutico atingido em 6 meses',
    status: 'Em validação editorial',
  },
];

export default function CasosPage() {
  return (
    <>
      <SEO
        title="Casos · Grow-X em operação real"
        description="Histórias reais de operação Grow-X em cooperativas, produtores e cultivo medicinal. Sem promessa vazia."
        path="/casos"
      />

      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <Reveal className="max-w-3xl">
            <Eyebrow icon={FileText}>Casos · operação real</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              O que muda quando a Grow-X <span className="text-emerald-glow">entra em produção.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Histórias reais (em validação editorial pra publicação) de quem está rodando hoje.
              Quando autorizadas, viram conteúdo aberto. Quer participar? <Link to="/contato" className="text-emerald-glow hover:underline">Fale com a gente</Link>.
            </p>
          </Reveal>
        </Container>
      </section>

      <section className="section-y">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">
            {CASES.map((c, i) => (
              <Reveal key={c.slug} delay={i * 0.06} className="h-full">
                <GlassCard variant="surface" className="group flex h-full flex-col gap-5 p-7">
                  <div className="flex items-start justify-between">
                    <div className="text-eyebrow text-emerald-glow">{c.sector}</div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/[0.03] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      <Construction className="size-3" />
                      {c.status}
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl">
                    {c.teaser}
                  </h3>
                  <div className="rounded-xl bg-emerald/10 p-4 ring-hairline">
                    <div className="text-eyebrow text-emerald-glow">Indicador</div>
                    <div className="mt-1 font-display text-2xl font-bold text-foreground">{c.metric}</div>
                  </div>
                  <p className="mt-auto text-xs text-muted-foreground">
                    Detalhamento sob NDA até liberação. Quer ver dados completos? Agende demo.
                  </p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <FinalCTA />
    </>
  );
}
