import { Link } from 'react-router-dom';
import { ArrowRight, Quote } from 'lucide-react';
import { Section, GlassCard, Reveal, GridPattern } from '@/components/visual';
import schreiber from '../../assets/fernando_schreiber_ceo.webp';

export default function StorySection() {
  return (
    <Section
      eyebrow="Quem constrói"
      title={
        <>
          Construído por quem <span className="text-emerald-glow">entende o campo.</span>
        </>
      }
    >
      <Reveal>
        <GlassCard variant="strong" className="relative overflow-hidden">
          <GridPattern fine mask="radial" className="opacity-40" />
          <div className="grid items-stretch gap-0 lg:grid-cols-12">
            {/* Foto */}
            <div className="relative lg:col-span-5">
              <div className="relative aspect-[4/5] overflow-hidden lg:h-full">
                <img
                  src={schreiber}
                  alt="Fernando Schreiber, CEO da Grow-X"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-background/80 via-background/10 to-transparent" />
                <div className="absolute bottom-5 left-5">
                  <div className="text-eyebrow text-emerald-glow">CEO · Fundador</div>
                  <div className="mt-1 font-display text-xl font-bold text-foreground">Fernando Schreiber</div>
                </div>
              </div>
            </div>
            {/* Quote */}
            <div className="relative flex flex-col justify-center p-8 sm:p-10 lg:col-span-7 lg:p-14">
              <Quote className="size-8 text-emerald-glow/40" strokeWidth={1.5} />
              <blockquote className="mt-5 font-display text-2xl font-medium leading-snug text-foreground sm:text-3xl">
                Tecnologia agro só importa quando aguenta poeira, sinal ruim e o ritmo de quem está com a bota suja.
                A Grow-X nasceu pra ser essa camada — invisível pro produtor, decisiva pro negócio.
              </blockquote>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/sobre/historia" className="btn-ghost">
                  Nossa história
                  <ArrowRight className="size-4" />
                </Link>
                <Link to="/sobre/executivo" className="btn-link">
                  Conhecer o time
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </GlassCard>
      </Reveal>
    </Section>
  );
}
