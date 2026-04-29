import { Section, GlassCard, Reveal } from '@/components/visual';

/**
 * Tabela de specs premium pro produto.
 * specs: { [key: string]: string }
 */
export default function SpecsTable({ eyebrow, title, intro, specs = {} }) {
  const entries = Object.entries(specs);
  return (
    <Section eyebrow={eyebrow} title={title} intro={intro}>
      <Reveal>
        <GlassCard variant="strong" className="overflow-hidden">
          <dl className="divide-y divide-white/[0.06]">
            {entries.map(([k, v]) => (
              <div key={k} className="grid grid-cols-2 gap-6 px-6 py-4 sm:px-8 sm:py-5">
                <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
                <dd className="text-sm font-semibold text-foreground sm:text-base">{v}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>
      </Reveal>
    </Section>
  );
}
