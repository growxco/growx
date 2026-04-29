import { Container, Reveal } from '@/components/visual';

/**
 * Faixa de métricas premium (4 pilares com label técnico).
 * items: { value, label }
 */
export default function MetricStrip({ items = [], className = '' }) {
  return (
    <section className={`relative border-y border-border bg-surface/40 ${className}`}>
      <Container className="grid grid-cols-2 gap-y-8 py-12 sm:grid-cols-4">
        {items.map((m, i) => (
          <Reveal key={m.label} delay={i * 0.06} className="text-center">
            <div className="font-display text-2xl font-bold text-emerald-glow sm:text-3xl">{m.value}</div>
            <div className="mt-2 text-xs leading-snug text-muted-foreground sm:text-sm">{m.label}</div>
          </Reveal>
        ))}
      </Container>
    </section>
  );
}
