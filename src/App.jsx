import { useEffect, lazy, Suspense, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import Header from './components/Header';
import Footer from './components/Footer';
import Breadcrumbs from './components/Breadcrumbs';
import SkipLink from './components/SkipLink';
import CookieBanner from './components/CookieBanner';
import PageLoader from './components/PageLoader';
import { SoundLab, ScrollProgress, PageTransition, WhatsAppFloat, StickyCTAMobile } from './components/visual';
import { analytics, installAnalytics } from './lib/analytics';
import { COOKIE_CONSENT, getCookieConsent, subscribeCookieConsent } from './lib/consent';

// Eager: Home (LCP)
import HomePage from './pages/HomePage';

// Lazy: secondary routes
const ContactPage = lazy(() => import('./pages/ContactPage'));
const SupplyXPage = lazy(() => import('./pages/SupplyXPage'));
const SPIPage = lazy(() => import('./pages/SPIPage'));
const SPPPage = lazy(() => import('./pages/SPPPage'));
const GrowXAppPage = lazy(() => import('./pages/GrowXAppPage'));
const ProductsPage = lazy(() => import('./pages/ProductsPage'));
const EstacaoMeteorologicaPage = lazy(() => import('./pages/EstacaoMeteorologicaPage'));
const ModuloSemFioPage = lazy(() => import('./pages/ModuloSemFioPage'));
const EstufaAutomatizadaPage = lazy(() => import('./pages/EstufaAutomatizadaPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ExecutivePage = lazy(() => import('./pages/ExecutivePage'));
const PhilosophyPage = lazy(() => import('./pages/PhilosophyPage'));
const ObrigadoPage = lazy(() => import('./pages/ObrigadoPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
// New routes (wave 4)
const DemoPage = lazy(() => import('./pages/DemoPage'));
const PreVendaPage = lazy(() => import('./pages/PreVendaPage'));
const PreVendaSucessoPage = lazy(() => import('./pages/PreVendaSucessoPage'));
const ContratoPage = lazy(() => import('./pages/ContratoPage'));
const PedidoPage = lazy(() => import('./pages/PedidoPage'));
const WaitlistAppPage = lazy(() => import('./pages/WaitlistAppPage'));
const CasosPage = lazy(() => import('./pages/CasosPage'));
const ParceirosPage = lazy(() => import('./pages/ParceirosPage'));
const ImprensaPage = lazy(() => import('./pages/ImprensaPage'));
const CannabisMedicinalPage = lazy(() => import('./pages/CannabisMedicinalPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const PrivacidadePage = lazy(() => import('./pages/PrivacidadePage'));
const TermosPage = lazy(() => import('./pages/TermosPage'));
const CookiesPage = lazy(() => import('./pages/CookiesPage'));

function useCookieConsentState() {
  const [consent, setConsent] = useState(() => getCookieConsent());

  useEffect(() => subscribeCookieConsent(setConsent), []);

  return consent;
}

function AnalyticsGate({ consent }) {
  const previousConsent = useRef(consent);

  useEffect(() => {
    if (
      previousConsent.current === COOKIE_CONSENT.ACCEPTED
      && consent !== COOKIE_CONSENT.ACCEPTED
    ) {
      // Scripts de terceiros já carregados não podem ser "descarregados" com
      // segurança. O reload remove a sessão deles assim que o usuário revoga.
      window.location.reload();
      return;
    }

    if (consent === COOKIE_CONSENT.ACCEPTED) {
      installAnalytics();

      // O efeito de rota já cuidou de visitantes que chegaram consentidos. Se
      // o aceite aconteceu agora, registra a página atual depois da instalação.
      if (previousConsent.current !== COOKIE_CONSENT.ACCEPTED) {
        analytics.pageView(window.location.pathname);
      }
    }
    previousConsent.current = consent;
  }, [consent]);

  if (consent !== COOKIE_CONSENT.ACCEPTED) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

function ScrollToTopAndTrack() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    analytics.pageView(pathname);
  }, [pathname]);
  return null;
}

/** Rotas que rodam como landing page própria (nav, rodapé e CTA próprios). */
const BARE_ROUTES = [/^\/prevenda/, /^\/modulo$/];

function Shell() {
  const { pathname } = useLocation();
  const bare = BARE_ROUTES.some((r) => r.test(pathname));
  const consent = useCookieConsentState();

  return (
    <>
      <ScrollToTopAndTrack />
      <SkipLink />
      <ScrollProgress />
      <div className="relative min-h-screen bg-background text-foreground">
        {!bare && <Header />}
        <main id="main" className={bare ? '' : 'pt-16 lg:pt-[72px]'}>
          {!bare && <Breadcrumbs />}
          <Suspense fallback={<PageLoader />}>
            <PageTransition>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/contato" element={<ContactPage />} />
                <Route path="/obrigado" element={<ObrigadoPage />} />
                <Route path="/contato-corporativo-spi" element={<DemoPage />} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/lista-espera-app" element={<WaitlistAppPage />} />

                <Route path="/prevenda" element={<PreVendaPage />} />
                <Route path="/prevenda/sucesso" element={<PreVendaSucessoPage />} />
                <Route path="/prevenda/contrato" element={<ContratoPage />} />
                <Route path="/prevenda/pedido" element={<PedidoPage />} />
                <Route path="/modulo" element={<PreVendaPage />} />

                <Route path="/solucoes/supply-x" element={<SupplyXPage />} />
                <Route path="/solucoes/spi" element={<SPIPage />} />
                <Route path="/solucoes/spp" element={<SPPPage />} />
                <Route path="/solucoes/growx-app" element={<GrowXAppPage />} />

                <Route path="/produtos" element={<ProductsPage />} />
                <Route path="/produtos/estacao-meteorologica" element={<EstacaoMeteorologicaPage />} />
                <Route path="/produtos/modulo-sem-fio" element={<ModuloSemFioPage />} />
                <Route path="/produtos/estufa-automatizada" element={<EstufaAutomatizadaPage />} />

                <Route path="/sobre/historia" element={<HistoryPage />} />
                <Route path="/sobre/executivo" element={<ExecutivePage />} />
                <Route path="/sobre/filosofia" element={<PhilosophyPage />} />

                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/casos" element={<CasosPage />} />
                <Route path="/parceiros" element={<ParceirosPage />} />
                <Route path="/imprensa" element={<ImprensaPage />} />
                <Route path="/cannabis-medicinal" element={<CannabisMedicinalPage />} />

                <Route path="/privacidade" element={<PrivacidadePage />} />
                <Route path="/termos" element={<TermosPage />} />
                <Route path="/cookies" element={<CookiesPage />} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </PageTransition>
          </Suspense>
        </main>
        {!bare && <Footer />}
        <CookieBanner />
        {!bare && <WhatsAppFloat />}
        {!bare && <StickyCTAMobile />}
        {!bare && <SoundLab />}
        <AnalyticsGate consent={consent} />
      </div>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <Shell />
    </Router>
  );
}
