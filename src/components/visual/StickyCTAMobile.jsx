import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { analytics } from '@/lib/analytics';
import { APP_PORTAL_URLS, CORPORATE_CONTACT_PATH } from '@/lib/portalLinks';

const ROUTE_CTA = [
  { match: /^\/solucoes\/(supply-x|spi)/, label: 'Contato corporativo SPI', to: CORPORATE_CONTACT_PATH, kind: 'spi' },
  { match: /^\/solucoes\/spp/, label: 'Assinar SPP', to: APP_PORTAL_URLS.spp, kind: 'spp', external: true },
  { match: /^\/solucoes\/growx-app/, label: 'Assinar GXP', to: APP_PORTAL_URLS.gxp, kind: 'gxp', external: true },
  { match: /^\/cannabis-medicinal/, label: 'Assinar GXP', to: APP_PORTAL_URLS.gxp, kind: 'gxp', external: true },
  { match: /^\/produtos/, label: 'Solicitar orçamento', to: '/contato', kind: 'contact' },
  { match: /^\/parceiros/, label: 'Quero ser parceiro', to: '/contato', kind: 'contact' },
  { match: /^\/prevenda|^\/modulo/, label: null }, // página tem buy-bar própria
  { match: /^\/(demo|contato-corporativo-spi)/, label: null },
  { match: /^\/contato|^\/obrigado|^\/lista-espera-app/, label: null },
  { match: /.*/, label: 'Escolher operação', to: '/#portais', kind: 'portals' },
];

export default function StickyCTAMobile() {
  const [show, setShow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const cfg = ROUTE_CTA.find((r) => r.match.test(location.pathname)) ?? ROUTE_CTA[ROUTE_CTA.length - 1];
  if (!cfg.label || !show) return null;

  const onClick = () => {
    if (cfg.kind === 'spi') analytics.ctaSpiEnterpriseContact(location.pathname);
    else if (cfg.kind === 'spp') analytics.ctaSppSubscription(location.pathname);
    else if (cfg.kind === 'gxp') analytics.ctaGxpSubscription(location.pathname);
    if (cfg.external) analytics.externalAppOpen(cfg.kind, location.pathname);
  };

  const className = 'pointer-events-auto btn-primary mx-auto flex w-full max-w-md items-center justify-center gap-2';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[51] p-3 sm:hidden"
      style={{ bottom: 'var(--growx-cookie-offset, 0px)' }}
    >
      {cfg.external ? (
        <a href={cfg.to} target="_blank" rel="noreferrer noopener" onClick={onClick} className={className}>
          {cfg.label}
          <ArrowRight className="size-4" />
        </a>
      ) : (
        <Link to={cfg.to} onClick={onClick} className={className}>
          {cfg.label}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
