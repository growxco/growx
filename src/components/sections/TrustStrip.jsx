import { Container, Marquee, Reveal } from '@/components/visual';
import PartnerLogos from '@/components/visual/PartnerLogos';
import { Award, ShieldCheck, FileCheck2, MapPin, AlertCircle } from 'lucide-react';

/**
 * Trust strip — sinais de confiança para abaixo do hero.
 * - Por padrão mostra placeholders dignos (monogramas SVG) com badge "em validação editorial"
 *   pra deixar claro que NÃO são logos reais autorizados ainda.
 * - Quando logos reais forem autorizadas: passar prop `logos={[{name, src}]}`.
 */
const DEFAULT_BADGES = [
  { icon: MapPin, text: 'Engenharia BR · Curitiba/PR' },
  { icon: ShieldCheck, text: 'Diretor jurídico interno · cannabis & agro' },
  { icon: FileCheck2, text: 'Compliance LGPD por padrão' },
  { icon: Award, text: 'Hardware proprietário · firmware OTA' },
];

export default function TrustStrip({ logos, badges = DEFAULT_BADGES, mode = 'auto' }) {
  // mode auto: badges + linha discreta de monogramas com aviso
  // mode logos: só logos (passar prop)
  // mode badges: só badges
  const showLogos = (mode === 'logos' && logos?.length) || (mode === 'auto' && false);
  const showMonograms = mode === 'auto' && (!logos || logos.length === 0);

  return (
    <section className="relative border-y border-border bg-surface/40">
      <Container className="py-8">
        <Reveal>
          <div className="grid items-center gap-6 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <div className="text-eyebrow text-muted-foreground">Confiança</div>
              <div className="mt-2 font-display text-base font-semibold text-foreground">
                Empresa séria, operação real.
              </div>
            </div>

            <div className="lg:col-span-9">
              {showLogos ? (
                <Marquee speed="slow" className="opacity-90">
                  {logos.map((l, i) => (
                    <div key={i} className="inline-flex h-10 items-center gap-3 whitespace-nowrap px-2 text-foreground/60 grayscale transition hover:grayscale-0 hover:text-foreground">
                      {l.src ? (
                        <img src={l.src} alt={l.name} className="h-7 w-auto opacity-70" />
                      ) : (
                        <span className="font-display text-sm font-semibold tracking-wide">{l.name}</span>
                      )}
                    </div>
                  ))}
                </Marquee>
              ) : (
                <ul className="flex flex-wrap items-center gap-x-8 gap-y-3">
                  {badges.map((b) => {
                    const Icon = b.icon;
                    return (
                      <li key={b.text} className="inline-flex items-center gap-2 text-sm text-foreground/70">
                        <Icon className="size-4 text-emerald-glow" />
                        {b.text}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {showMonograms && (
            <div className="mt-8 border-t border-foreground/[0.06] pt-6">
              <div className="mb-3 inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
                <AlertCircle className="size-3" />
                segmentos atendidos · logos reais em validação editorial
              </div>
              <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                <div className="flex w-max marquee-track gap-12" style={{ animationDuration: '50s' }}>
                  <PartnerLogos />
                  <PartnerLogos />
                </div>
              </div>
            </div>
          )}
        </Reveal>
      </Container>
    </section>
  );
}
