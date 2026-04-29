import { Quote } from 'lucide-react';
import { Section, GlassCard, Reveal } from '@/components/visual';

/**
 * Testimonials grid (1-2 cols).
 * items: { quote, name, role, location }
 */
export default function Testimonials({ eyebrow, title, intro, items = [] }) {
  return (
    <Section eyebrow={eyebrow} title={title} intro={intro}>
      <div className="grid gap-5 lg:grid-cols-2">
        {items.map((t, i) => (
          <Reveal key={t.name} delay={i * 0.08} className="h-full">
            <GlassCard variant="surface" className="h-full p-8 lift">
              <Quote className="size-7 text-emerald-glow/40" strokeWidth={1.5} />
              <p className="mt-4 font-display text-lg leading-snug text-foreground/90 sm:text-xl">
                {t.quote}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-emerald/15 text-emerald-glow ring-hairline font-display text-sm font-semibold">
                  {t.name?.[0]}
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-semibold text-foreground">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}{t.location ? ` · ${t.location}` : ''}</div>
                </div>
              </div>
            </GlassCard>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
