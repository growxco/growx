import { Link } from 'react-router-dom';
import { ArrowRight, Home, Search } from 'lucide-react';
import { SEO, Container, Reveal, GlassCard, Aurora, GridPattern } from '@/components/visual';

export default function NotFoundPage() {
  return (
    <>
      <SEO
        title="Página não encontrada"
        description="O endereço acessado não existe ou foi movido."
        path="/404"
      />
      <section className="relative isolate flex min-h-[80vh] items-center overflow-hidden">
        <Aurora intensity="lg" />
        <GridPattern mask="radial" />
        <Container narrow className="relative">
          <Reveal className="text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-emerald-glow">
              error · 404
            </div>
            <h1 className="mt-6 text-display-2xl text-foreground">
              Esse caminho ainda <span className="text-gradient-emerald">não existe.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              O endereço acessado não foi encontrado no sistema. Pode ter sido removido, renomeado
              ou simplesmente nunca ter existido.
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
                  <Search className="mt-0.5 size-4 shrink-0 text-emerald-glow" />
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Procurando algo específico? Use <kbd className="mx-1 rounded border border-foreground/10 bg-background/50 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd> pra abrir a busca rápida.
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
