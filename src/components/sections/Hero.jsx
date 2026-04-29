import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Aurora, Container, Eyebrow, GradientText, Reveal, StatusDot, GridPattern } from '@/components/visual';
import { useI18n } from '@/i18n/I18nProvider';
import LiveKPIPanel from './LiveKPIPanel';

const EASE = [0.16, 1, 0.3, 1];

export default function Hero() {
  const { lang, t } = useI18n();
  return (
    <section className="relative isolate overflow-hidden pt-24 pb-20 sm:pt-32 lg:pt-40 lg:pb-28">
      <Aurora intensity="lg" />
      <GridPattern fine mask="bottom" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-emerald/40 to-transparent" />

      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow>{t('home.eyebrow')}</Eyebrow>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mt-6 text-display-2xl text-foreground">
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
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/contato" className="btn-primary">
                  {t('home.cta1')}
                  <ArrowRight className="size-4" />
                </Link>
                <Link to="/produtos" className="btn-ghost">
                  {t('home.cta2')}
                </Link>
                <StatusDot label={t('common.operationActive')} className="ml-1 hidden sm:inline-flex" />
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <dl className="mt-12 grid max-w-xl grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
                {[
                  { k: 'IoT', v: 'Sensores LoRa' },
                  { k: 'IA', v: 'Decisão em campo' },
                  { k: 'BR', v: 'Engenharia local' },
                  { k: '24/7', v: 'Operação ativa' },
                ].map((s) => (
                  <div key={s.k}>
                    <dt className="font-display text-2xl font-bold text-emerald-glow">{s.k}</dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          <div className="relative lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.2 }}
            >
              <LiveKPIPanel />
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-emerald/15 blur-3xl" />
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
