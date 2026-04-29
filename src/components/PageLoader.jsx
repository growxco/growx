import { Container, Aurora } from '@/components/visual';

export default function PageLoader() {
  return (
    <section className="relative isolate flex min-h-[60vh] items-center justify-center overflow-hidden">
      <Aurora intensity="sm" />
      <Container narrow>
        <div className="flex items-center justify-center gap-3 text-muted-foreground">
          <span className="relative flex size-2.5">
            <span className="absolute inset-0 rounded-full bg-emerald opacity-60 pulse-dot" />
            <span className="relative size-2.5 rounded-full bg-emerald-glow shadow-[0_0_14px_3px_oklch(0.78_0.20_145/55%)]" />
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.22em]">Carregando</span>
        </div>
      </Container>
    </section>
  );
}
