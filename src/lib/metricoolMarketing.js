import { createMetricoolTracker } from './metricool';
import { hasAnalyticsConsent } from './consent';

export const startMetricool = createMetricoolTracker({
  hosts: ['growx.com.br', 'www.growx.com.br'],
  paths: [
    '/', '/contato', '/contato-corporativo-spi', '/demo', '/lista-espera-app',
    '/prevenda', '/modulo', '/solucoes/supply-x', '/solucoes/spi',
    '/solucoes/spp', '/solucoes/growx-app', '/produtos',
    '/produtos/estacao-meteorologica', '/produtos/modulo-sem-fio',
    '/produtos/estufa-automatizada', '/sobre/historia', '/sobre/executivo',
    '/sobre/filosofia', '/insights', '/casos', '/parceiros', '/imprensa',
    '/cannabis-medicinal', '/privacidade', '/termos', '/cookies',
  ],
  hasConsent: hasAnalyticsConsent,
});
