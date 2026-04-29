import { Newspaper, Mail, ArrowRight, Image, FileText, Quote } from 'lucide-react';
import { SEO, Container, Eyebrow, Reveal, GlassCard, Aurora, GridPattern } from '@/components/visual';
import { FinalCTA } from '@/components/sections';

const ASSETS = [
  { icon: Image, title: 'Logo Grow-X (SVG + PNG)', desc: 'Versões claras e escuras, alta resolução.', href: '/og-image.svg', cta: 'Visualizar OG' },
  { icon: FileText, title: 'Boilerplate institucional', desc: '1 frase + 1 parágrafo + bio dos sócios. Pronto pra copiar.', href: '#boilerplate', cta: 'Ver boilerplate' },
  { icon: Quote, title: 'Citações dos fundadores', desc: '5 citações pré-aprovadas pra reportagem.', href: '#quotes', cta: 'Ver citações' },
];

const QUOTES = [
  {
    who: 'Fernando Schreiber, CEO',
    text: 'Tecnologia agro só importa quando aguenta poeira, sinal ruim e o ritmo de quem está com a bota suja.',
  },
  {
    who: 'Fernando Schreiber, CEO',
    text: 'O agro brasileiro precisa de stack brasileira. Importar tecnologia sem tropicalização é herdar dívida técnica.',
  },
  {
    who: 'Jefferson Schreiber, CTO',
    text: 'Cada produto Grow-X passa meses em campo antes de virar feature pública. Indicador de maturidade é uptime, não pitch deck.',
  },
];

export default function ImprensaPage() {
  return (
    <>
      <SEO
        title="Imprensa · Kit oficial Grow-X"
        description="Kit oficial de imprensa Grow-X: logos, boilerplate, citações pré-aprovadas e contato direto da assessoria."
        path="/imprensa"
      />

      <section className="relative isolate overflow-hidden pt-16 pb-16 sm:pt-20 lg:pt-28">
        <Aurora intensity="md" />
        <GridPattern fine mask="bottom" />
        <Container>
          <Reveal className="max-w-3xl">
            <Eyebrow icon={Newspaper}>Imprensa</Eyebrow>
            <h1 className="mt-6 text-display-xl text-foreground">
              Kit oficial <span className="text-emerald-glow">Grow-X.</span>
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Tudo que jornalistas, podcasters e veículos setoriais precisam pra falar sobre a Grow-X com precisão.
              Pra entrevista ou comentário, contato direto abaixo.
            </p>
            <div className="mt-8">
              <a
                href="mailto:mkt@growx.com.br?cc=imprensa@growx.com.br&subject=Pauta%20Grow-X"
                className="btn-primary"
              >
                <Mail className="size-4" />
                mkt@growx.com.br
              </a>
              <a
                href="mailto:imprensa@growx.com.br?subject=Pauta%20Grow-X"
                className="btn-ghost ml-3"
              >
                imprensa@growx.com.br
              </a>
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="section-y-tight">
        <Container>
          <div className="grid gap-5 lg:grid-cols-3">
            {ASSETS.map((a, i) => {
              const Icon = a.icon;
              return (
                <Reveal key={a.title} delay={i * 0.06} className="h-full">
                  <GlassCard variant="surface" className="flex h-full flex-col gap-4 p-7">
                    <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="text-lg font-semibold text-foreground">{a.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{a.desc}</p>
                    <a href={a.href} className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-glow">
                      {a.cta}
                      <ArrowRight className="size-3.5" />
                    </a>
                  </GlassCard>
                </Reveal>
              );
            })}
          </div>
        </Container>
      </section>

      <section id="boilerplate" className="section-y-tight">
        <Container narrow>
          <Reveal>
            <GlassCard variant="strong" className="p-8 sm:p-10">
              <Eyebrow>Boilerplate</Eyebrow>
              <h2 className="mt-4 font-display text-2xl font-bold text-foreground sm:text-3xl">Sobre a Grow-X (texto pronto)</h2>

              <div className="mt-6 space-y-5 text-foreground/85">
                <BoilerBlock label="1 frase" copy="A Grow-X é a stack agro brasileira: hardware, software e dados conectados de ponta a ponta." />
                <BoilerBlock
                  label="1 parágrafo"
                  copy="A Grow-X Co. é uma empresa brasileira de tecnologia aplicada ao agronegócio e ao cultivo controlado. Sediada em Curitiba (PR), opera duas frentes: (1) Grow-X Industrial, com Supply-X, SPI e SPP — plataforma de orquestração que conecta indústria, produtor e cadeia logística com rastreabilidade auditável; e (2) Grow-X Cultivo, com o Grow-X App — solução de cultivo controlado e cannabis medicinal com hardware proprietário, comunidade e marketplace. Fundada por Fernando e Jefferson Schreiber, com Julio Calcagnotto como diretor jurídico."
                />
                <BoilerBlock label="Endereço institucional" copy="Av. Sete de Setembro 4923, sala 1203 · Batel · Curitiba/PR · Brasil" />
              </div>
            </GlassCard>
          </Reveal>
        </Container>
      </section>

      <section id="quotes" className="section-y-tight">
        <Container narrow>
          <Reveal>
            <Eyebrow>Citações pré-aprovadas</Eyebrow>
            <h2 className="mt-4 text-display-md text-foreground">Use livremente.</h2>
          </Reveal>
          <div className="mt-8 grid gap-5 lg:grid-cols-1">
            {QUOTES.map((q, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <GlassCard variant="surface" className="p-7 sm:p-8">
                  <Quote className="size-7 text-emerald-glow/40" strokeWidth={1.5} />
                  <p className="mt-4 font-display text-lg leading-snug text-foreground/90 sm:text-xl">"{q.text}"</p>
                  <div className="mt-5 text-sm font-semibold text-emerald-glow">— {q.who}</div>
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

function BoilerBlock({ label, copy }) {
  return (
    <div>
      <div className="text-eyebrow text-emerald-glow">{label}</div>
      <p className="mt-2 text-sm leading-relaxed text-foreground/85 sm:text-base">{copy}</p>
    </div>
  );
}
