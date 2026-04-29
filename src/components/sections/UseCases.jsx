import { Check } from 'lucide-react';
import { Section, GlassCard, Reveal } from '@/components/visual';

/**
 * Cases / segmentos cards.
 * items: { title, description, points: string[] }
 */
export default function UseCases({ eyebrow, title, intro, items = [] }) {
  return (
    <Section eyebrow={eyebrow} title={title} intro={intro}>
      <div className="grid gap-5 lg:grid-cols-3">
        {items.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.06} className="h-full">
            <GlassCard variant="surface" className="h-full p-7 lift hover:border-[oklch(0.700_0.180_145/45%)]">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
              {c.points?.length > 0 && (
                <ul className="mt-5 space-y-2.5">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm text-foreground/85">
                      <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded bg-emerald/15 text-emerald-glow">
                        <Check className="size-2.5" strokeWidth={3.5} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
