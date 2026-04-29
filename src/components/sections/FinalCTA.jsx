import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { Aurora, Container, Reveal, StatusDot, GridPattern } from '@/components/visual';
import { useI18n } from '@/i18n/I18nProvider';

export default function FinalCTA() {
  const { t } = useI18n();
  const handleWhatsApp = () => window.open('https://wa.me/5541995494343', '_blank');

  return (
    <section className="relative isolate overflow-hidden section-y">
      <Aurora intensity="lg" />
      <GridPattern mask="radial" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-emerald/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-emerald/40 to-transparent" />

      <Container narrow className="relative">
        <Reveal className="text-center">
          <StatusDot label={t('common.teamAvailable')} className="mx-auto" />
          <h2 className="mt-6 text-display-xl text-foreground">
            {t('finalCta.title')} <span className="text-gradient-emerald">Grow-X?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t('finalCta.sub')}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to="/contato" className="btn-primary">
              {t('common.scheduleDemo')}
              <ArrowRight className="size-4" />
            </Link>
            <button type="button" onClick={handleWhatsApp} className="btn-ghost">
              <MessageCircle className="size-4" />
              {t('common.whatsapp')}
            </button>
          </div>
          <div className="mt-8 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span>{t('finalCta.note')}</span>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
