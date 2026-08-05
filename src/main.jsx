import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from './components/visual/ThemeProvider'
import { I18nProvider } from './i18n/I18nProvider'
import { installAnalytics } from './lib/analytics'
import { hasAnalyticsConsent } from './lib/consent'
import { captureCheckoutReturnBeforeAnalytics } from './lib/checkoutReturn'
import './index.css'
import App from './App.jsx'

// Credenciais do redirect de pagamento saem da URL antes de qualquer script
// opcional observar page_location/referrer.
captureCheckoutReturnBeforeAnalytics()

// Visitantes que já consentiram não perdem o primeiro page view. Para uma
// primeira visita, o gate em App.jsx instala os provedores após a decisão.
if (hasAnalyticsConsent()) installAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider defaultTheme="dark">
        <I18nProvider defaultLang="PT">
          <App />
        </I18nProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>,
)
