import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Aurora, Container, Eyebrow, GradientText, Reveal, GridPattern } from '@/components/visual';
import { useI18n } from '@/i18n/I18nProvider';
import spiScreen from '@/assets/real-spi-app.webp';
import sppScreen from '@/assets/real-spp-app.webp';
import gxpScreen from '@/assets/real-gxp-app.webp';

const EASE = [0.16, 1, 0.3, 1];
const PORTALS = [
  { name: 'SPI', image: spiScreen, href: '/solucoes/spi', description: 'Indústria' },
  { name: 'SPP', image: sppScreen, href: '/solucoes/spp', description: 'Produtores' },
  { name: 'GXP', image: gxpScreen, href: '/solucoes/growx-app', description: 'Cultivo' },
];

export default function Hero() {
  const { lang, t } = useI18n();
  return (
    <section className="relative isolate overflow-hidden pt-24 pb-20 sm:pt-28 lg:pt-20 lg:pb-24">
      <Aurora intensity="lg" />
      <GridPattern fine mask="bottom" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-emerald/40 to-transparent" />

      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-7">
            <Reveal>
              <Eyebrow>{t('home.eyebrow')}</Eyebrow>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mt-6 text-display-lg text-foreground">
                <span className="sm:hidden">
                  {lang === 'EN' ? (
                    <>
                      Field, factory<br />
                      and data<br />
                      <GradientText>running on a single system.</GradientText>
                    </>
                  ) : (
                    <>
                      Campo, indústria<br />
                      e dados<br />
                      <GradientText>operando no mesmo sistema.</GradientText>
                    </>
                  )}
                </span>
                <span className="hidden sm:inline">
                  {t('home.headline')}{' '}
                  <GradientText>{t('home.headlineAccent')}</GradientText>
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.14}>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                {t('home.sub')}
              </p>
            </Reveal>

            <Reveal delay={0.22}>
              <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <a href="/#portais" className="btn-primary justify-center sm:justify-start">
                  Escolher operação
                  <ArrowRight className="size-4" />
                </a>
                <Link to="/contato-corporativo-spi" className="btn-ghost justify-center sm:justify-start">
                  Contato corporativo SPI
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <p className="mt-10 text-sm text-muted-foreground">Conheça as plataformas e escolha a operação ideal para você.</p>
            </Reveal>
          </div>

          <div className="relative min-w-0 lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.2 }}
            >
              <div className="overflow-hidden rounded-3xl border border-border bg-surface/80 p-4 shadow-elevated sm:p-5">
                <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">Prévia dos nossos aplicativos</p>
                <div className="space-y-3">
                  {PORTALS.map((portal) => (
                    <Link key={portal.name} to={portal.href} className="group flex items-center gap-4 rounded-xl border border-border bg-background/60 p-2 transition-colors hover:border-emerald/50 focus-visible:outline-2 focus-visible:outline-emerald-glow">
                      <img src={portal.image} alt={`Tela do ${portal.name}`} className="h-20 w-28 shrink-0 rounded-lg object-cover object-top sm:h-24 sm:w-36" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-xl font-bold text-foreground">{portal.name}</span>
                        <span className="block text-sm text-muted-foreground">{portal.description}</span>
                      </span>
                      <ArrowRight className="mr-2 size-4 shrink-0 text-emerald-glow" aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-emerald/15 blur-3xl" />
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
