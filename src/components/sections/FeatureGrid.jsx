import { Section, GlassCard, Reveal } from '@/components/visual';

/**
 * Grid genérico de features (3 ou 4 colunas).
 * items: { icon, title, description }
 */
export default function FeatureGrid({
  eyebrow,
  title,
  intro,
  items = [],
  columns = 3,
}) {
  const cols = columns === 4 ? 'lg:grid-cols-4' : columns === 2 ? 'lg:grid-cols-2' : 'lg:grid-cols-3';
  return (
    <Section eyebrow={eyebrow} title={title} intro={intro}>
      <div className={`grid gap-4 sm:grid-cols-2 ${cols}`}>
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <Reveal key={it.title} delay={i * 0.05} className="h-full">
              <GlassCard variant="surface" className="h-full p-7 lift hover:border-[oklch(0.700_0.180_145/45%)]">
                {Icon && (
                  <span className="inline-flex size-11 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline">
                    <Icon className="size-5" />
                  </span>
                )}
                <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">{it.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{it.description}</p>
              </GlassCard>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
