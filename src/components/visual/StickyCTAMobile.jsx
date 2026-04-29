import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { analytics } from '@/lib/analytics';

const ROUTE_CTA = [
  { match: /^\/solucoes\/(supply-x|spi|spp)/, label: 'Agendar demo', to: '/demo', kind: 'demo' },
  { match: /^\/solucoes\/growx-app/, label: 'Entrar na lista de espera', to: '/lista-espera-app', kind: 'waitlist' },
  { match: /^\/cannabis-medicinal/, label: 'Lista de espera medicinal', to: '/lista-espera-app', kind: 'waitlist' },
  { match: /^\/produtos/, label: 'Solicitar orçamento', to: '/contato', kind: 'demo' },
  { match: /^\/parceiros/, label: 'Quero ser parceiro', to: '/contato', kind: 'demo' },
  { match: /^\/demo/, label: null }, // skip on demo page (already there)
  { match: /^\/contato|^\/obrigado|^\/lista-espera-app/, label: null },
  { match: /.*/, label: 'Agendar demo', to: '/demo', kind: 'demo' },
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
    if (cfg.kind === 'demo') analytics.ctaDemo(location.pathname);
    else if (cfg.kind === 'waitlist') analytics.ctaWaitlist(location.pathname);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[51] p-3 sm:hidden">
      <Link
        to={cfg.to}
        onClick={onClick}
        className="pointer-events-auto btn-primary mx-auto flex w-full max-w-md items-center justify-center gap-2"
      >
        {cfg.label}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
