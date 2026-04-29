import { Section, Marquee, Reveal } from '@/components/visual';

/**
 * Parceiros / segmentos — tipografia monospace premium como "logo placeholder" editorial.
 */
const MARKS = [
  'INDÚSTRIA · BENEFICIAMENTO',
  'COOPERATIVAS INTEGRADAS',
  'SOJICULTURA & GRÃOS',
  'CANNABIS MEDICINAL',
  'HORTIFRÚTI DE PRECISÃO',
  'PECUÁRIA DE PRECISÃO',
  'ARMAZENAGEM & LOGÍSTICA',
  'P&D AGRONÔMICO',
  'COMPLIANCE & RASTREABILIDADE',
  'FLORESTAL & CELULOSE',
];

export default function LogoCloud() {
  return (
    <Section size="tight">
      <Reveal className="mb-8 text-center">
        <div className="text-eyebrow text-muted-foreground">Onde a tecnologia Grow-X já opera</div>
      </Reveal>
      <Marquee speed="slow" className="opacity-90">
        {MARKS.map((m) => (
          <div key={m} className="inline-flex items-center gap-4 whitespace-nowrap">
            <span className="size-1.5 rounded-full bg-emerald" />
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-foreground/75 sm:text-sm">{m}</span>
            <span className="size-1.5 rounded-full bg-foreground/10" />
          </div>
        ))}
      </Marquee>
    </Section>
  );
}
