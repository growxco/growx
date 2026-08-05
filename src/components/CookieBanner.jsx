import { useEffect, useRef, useState } from 'react';
import { Cookie } from 'lucide-react';
import {
  COOKIE_CONSENT,
  getCookieConsent,
  setCookieConsent,
  subscribeCookieConsent,
} from '@/lib/consent';

const OFFSET_VAR = '--growx-cookie-offset';

function publishOffset(height) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(OFFSET_VAR, `${Math.max(0, Math.ceil(height))}px`);
}

export default function CookieBanner() {
  const [show, setShow] = useState(false);
  const bannerRef = useRef(null);

  useEffect(() => {
    const sync = (choice) => setShow(!choice);
    sync(getCookieConsent());
    return subscribeCookieConsent(sync);
  }, []);

  useEffect(() => {
    if (!show || !bannerRef.current) {
      publishOffset(0);
      return undefined;
    }

    const banner = bannerRef.current;
    const measure = () => publishOffset(banner.getBoundingClientRect().height + 8);
    measure();

    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(measure)
      : null;
    observer?.observe(banner);
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
      publishOffset(0);
    };
  }, [show]);

  const decide = (choice) => {
    setCookieConsent(choice);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      ref={bannerRef}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] px-3 pt-3 sm:px-6"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      role="region"
      aria-label="Preferências de cookies"
      aria-describedby="growx-cookie-description"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl overflow-hidden rounded-2xl glass-strong shadow-elevated">
        <div className="flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
          <span className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-emerald/15 text-emerald-glow ring-hairline sm:inline-flex">
            <Cookie className="size-4" aria-hidden="true" />
          </span>

          <p id="growx-cookie-description" className="flex-1 text-[0.72rem] leading-4 text-foreground/85 sm:text-sm sm:leading-relaxed">
            Cookies opcionais de análise e marketing só são ativados com seu aceite.{' '}
            <a href="/cookies" className="whitespace-nowrap font-semibold text-emerald-glow hover:underline">
              Ver detalhes
            </a>
          </p>

          <div className="flex w-full shrink-0 gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => decide(COOKIE_CONSENT.DECLINED)}
              className="btn-ghost min-h-11 flex-1 px-3 py-2 text-xs sm:flex-initial sm:px-4"
            >
              Apenas essenciais
            </button>
            <button
              type="button"
              onClick={() => decide(COOKIE_CONSENT.ACCEPTED)}
              className="btn-primary min-h-11 flex-1 px-3 py-2 text-xs sm:flex-initial sm:px-4"
            >
              Aceitar opcionais
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
