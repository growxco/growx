import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Aurora, Container, Eyebrow, GridPattern, Reveal, StatusDot, GlassCard } from '@/components/visual';

/**
 * Hero reutilizável para sub-pages (Soluções, Produtos, Sobre, etc).
 * Conteúdo + visual a partir de props. Layout 7/5 com framing premium.
 */
export default function PageHero({
  eyebrow,
  eyebrowIcon,
  title, // string ou node
  intro,
  primaryCta = { label: 'Agendar demo', href: '/contato' },
  secondaryCta,
  image,
  imageAlt = '',
  status = 'Operação ativa',
  badge,
}) {
  return (
    <section className="relative isolate overflow-hidden pt-16 pb-20 sm:pt-20 lg:pt-28 lg:pb-24">
      <Aurora intensity="md" />
      <GridPattern fine mask="bottom" />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            {eyebrow && (
              <Reveal>
                <Eyebrow icon={eyebrowIcon}>{eyebrow}</Eyebrow>
              </Reveal>
            )}
            <Reveal delay={0.06}>
              <h1 className="mt-6 text-display-xl text-foreground">{title}</h1>
            </Reveal>
            {intro && (
              <Reveal delay={0.14}>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">{intro}</p>
              </Reveal>
            )}
            <Reveal delay={0.22}>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                {primaryCta && (
                  <Link to={primaryCta.href} className="btn-primary">
                    {primaryCta.label}
                    <ArrowRight className="size-4" />
                  </Link>
                )}
                {secondaryCta && (
                  secondaryCta.href ? (
                    <Link to={secondaryCta.href} className="btn-ghost">{secondaryCta.label}</Link>
                  ) : (
                    <button type="button" onClick={secondaryCta.onClick} className="btn-ghost">
                      {secondaryCta.label}
                    </button>
                  )
                )}
                {status && <StatusDot label={status} className="ml-1 hidden sm:inline-flex" />}
              </div>
            </Reveal>
            {badge && (
              <Reveal delay={0.32} className="mt-10">
                {badge}
              </Reveal>
            )}
          </div>

          {image && (
            <div className="relative lg:col-span-5">
              <Reveal>
                <GlassCard variant="strong" className="border-gradient-emerald shadow-elevated overflow-hidden">
                  <div className="relative aspect-[4/3] w-full">
                    <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-tr from-background/70 via-transparent to-background/30" />
                    <div className="absolute left-4 top-4">
                      <StatusDot label="LIVE" />
                    </div>
                  </div>
                </GlassCard>
                <div className="absolute inset-0 -z-10 rounded-3xl bg-emerald/15 blur-3xl" />
              </Reveal>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
