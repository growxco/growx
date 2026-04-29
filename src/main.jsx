import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from './components/visual/ThemeProvider'
import { I18nProvider } from './i18n/I18nProvider'
import { installAnalytics } from './lib/analytics'
import './index.css'
import App from './App.jsx'

installAnalytics()

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
