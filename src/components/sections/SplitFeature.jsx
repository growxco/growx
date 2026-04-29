import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Section, GlassCard, Reveal } from '@/components/visual';

/**
 * Bloco split (texto + imagem ou mockup) com lista de bullets.
 * Pode alternar lado da imagem.
 */
export default function SplitFeature({
  eyebrow,
  title,
  intro,
  bullets = [],
  cta,
  image,
  imageAlt = '',
  imageOverlay,
  reversed = false,
}) {
  return (
    <Section size="tight">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
        <Reveal className={reversed ? 'order-1 lg:order-2' : 'order-1'}>
          {eyebrow && <div className="text-eyebrow text-emerald-glow">{eyebrow}</div>}
          <h2 className="mt-4 text-display-md text-foreground">{title}</h2>
          {intro && <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">{intro}</p>}
          {bullets.length > 0 && (
            <ul className="mt-7 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-foreground/85">
                  <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald/15 text-emerald-glow">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          )}
          {cta && (
            <Link to={cta.href} className="btn-primary mt-8">
              {cta.label}
              <ArrowRight className="size-4" />
            </Link>
          )}
        </Reveal>
        <Reveal delay={0.1} className={reversed ? 'order-2 lg:order-1' : 'order-2'}>
          <GlassCard variant="strong" className="border-gradient-emerald overflow-hidden shadow-elevated">
            <div className="relative aspect-[4/3] w-full">
              <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-tr from-background/70 via-transparent to-transparent" />
              {imageOverlay}
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </Section>
  );
}
