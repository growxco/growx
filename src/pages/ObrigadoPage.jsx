import { Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, Home, Sparkles } from 'lucide-react';
import { SEO, Container, Reveal, GlassCard, Aurora, GridPattern } from '@/components/visual';

export default function ObrigadoPage() {
  return (
    <>
      <SEO
        title="Mensagem recebida"
        description="Sua mensagem chegou. Em breve nosso time entra em contato."
        path="/obrigado"
      />

      <section className="relative isolate flex min-h-[80vh] items-center overflow-hidden">
        <Aurora intensity="lg" />
        <GridPattern mask="radial" />
        <Container narrow className="relative">
          <Reveal className="text-center">
            <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-emerald/20 text-emerald-glow ring-hairline shadow-glow-md">
              <CheckCircle2 className="size-8" strokeWidth={2.25} />
            </span>
            <h1 className="mt-8 text-display-xl text-foreground">
              Mensagem <span className="text-gradient-emerald">recebida.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Em até 1 dia útil, nosso time entra em contato. Pra urgências, prefira o WhatsApp.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link to="/" className="btn-primary">
                <Home className="size-4" />
                Voltar pra Home
              </Link>
              <Link to="/produtos" className="btn-ghost">
                Explorar produtos
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-12">
              <GlassCard variant="emerald" className="mx-auto max-w-md p-5">
                <div className="flex items-start gap-3 text-left">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-emerald-glow" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Enquanto isso: dá uma olhada na <Link to="/sobre/historia" className="text-emerald-glow hover:underline">história da Grow-X</Link> ou conheça os{' '}
                    <Link to="/sobre/executivo" className="text-emerald-glow hover:underline">sócios fundadores</Link>.
                  </p>
                </div>
              </GlassCard>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
