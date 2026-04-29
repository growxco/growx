import { ArrowRight, BookOpenText, Construction } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, NewsletterSignup, Aurora, GridPattern } from '@/components/visual';
import { FinalCTA } from '@/components/sections';

/**
 * Insights — hub editorial.
 * Estado atual: estrutura pronta, conteúdo será publicado pelo time.
 * Cada item está MARCADO como "em produção" até ter slug + conteúdo real.
 */
const INSIGHTS = [
  {
    category: 'Indústria',
    title: 'Por que ERP agroindustrial não basta — e o que vem depois',
    teaser: 'Sistemas legacy resolvem o financeiro, mas não tocam a operação. Onde a camada de orquestração entra.',
    readTime: '8 min',
    status: 'em produção',
  },
  {
    category: 'Produtor',
    title: 'O que é Kc na prática — e como aplicar sem ser agrônomo',
    teaser: 'Coeficiente de cultura explicado pra produtor. Tabela e regra de bolso pra soja, milho e trigo.',
    readTime: '6 min',
    status: 'em produção',
  },
  {
    category: 'Cultivo',
    title: 'Padrão farmacêutico em cultivo medicinal: o que muda na prática',
    teaser: 'VPD, DLI, fotoperíodo e documentação clínica. O que separa amador de operação séria.',
    readTime: '10 min',
    status: 'em produção',
  },
  {
    category: 'Tese',
    title: 'O agro brasileiro precisa de stack brasileira',
    teaser: 'Por que importar tecnologia sem tropicalização é herdar dívida técnica.',
    readTime: '5 min',
    status: 'em produção',
  },
  {
    category: 'Indústria',
    title: 'Rastreabilidade end-to-end virou exigência (não diferencial)',
    teaser: 'O que muda com originação digital, contratos e auditoria automatizada.',
    readTime: '7 min',
    status: 'em produção',
  },
  {
    category: 'Produtor',
    title: 'Conectividade rural: o que funciona quando o sinal é ruim',
    teaser: 'LoRa, mesh, edge computing — o que efetivamente roda em campo brasileiro.',
    readTime: '9 min',
    status: 'em produção',
  },
];

const CATS = ['Todos', 'Indústria', 'Produtor', 'Cultivo', 'Tese'];

export default function InsightsPage() {
  return (
    <>
      <SEO
        title="Insights · Teses, casos e técnico Grow-X"
        description="Insights estratégicos da Grow-X: indústria, produtor, cultivo controlado e teses fundadoras. Sem blog vazio."
        path="/insights"
      />

      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <Reveal className="max-w-3xl">
            <Eyebrow icon={BookOpenText}>Insights</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              Pensamento, casos e técnico — <span className="text-emerald-glow">em voz alta.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Não é blog de SEO. São teses, capacidades técnicas e casos reais — material que orienta nossa operação
              e pode orientar a sua.
            </p>
          </Reveal>

          <Reveal delay={0.12} className="mt-10">
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/[0.04] px-4 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:border-emerald/40 hover:text-foreground"
                >
                  {c}
                </button>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="section-y-tight">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">
            {INSIGHTS.map((i, idx) => (
              <Reveal key={i.title} delay={idx * 0.05} className="h-full">
                <article className="group flex h-full flex-col overflow-hidden rounded-2xl surface lift hover:border-[oklch(0.700_0.180_145/45%)]">
                  <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-gradient-to-br from-[oklch(0.18_0.025_150)] to-[oklch(0.14_0.02_150)]">
                    <div className="absolute inset-0 bg-grid-fine opacity-40 mask-radial-fade" />
                    <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-emerald/30 bg-emerald/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-glow">
                      {i.category}
                    </div>
                    <div className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-background/70 px-2 py-0.5 text-[10px] font-mono text-muted-foreground backdrop-blur">
                      <Construction className="size-3" />
                      {i.status}
                    </div>
                    <div className="absolute bottom-4 left-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {i.readTime} de leitura
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="font-display text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">{i.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{i.teaser}</p>
                    <div className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-glow">
                      Em breve
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-y-tight">
        <Container narrow>
          <Reveal>
            <NewsletterSignup source="insights" />
          </Reveal>
        </Container>
      </section>

      <FinalCTA />
    </>
  );
}
