const UTM = 'utm_source=growx-site&utm_medium=owned&utm_campaign=app_portal';

export const CORPORATE_CONTACT_PATH = '/contato-corporativo-spi';

export const APP_PORTAL_URLS = {
  spi: `https://spi.ia.br/?${UTM}&utm_content=spi`,
  spp: `https://spp.ia.br/?${UTM}&utm_content=spp`,
  gxp: `https://gxp.ia.br/?${UTM}&utm_content=gxp`,
};

export const APP_PORTALS = [
  {
    key: 'spi',
    name: 'SPI',
    label: 'Empresa',
    href: APP_PORTAL_URLS.spi,
    contactHref: CORPORATE_CONTACT_PATH,
    action: 'Solicitar acesso corporativo',
  },
  {
    key: 'spp',
    name: 'SPP',
    label: 'Produtor',
    href: APP_PORTAL_URLS.spp,
    action: 'Assinar SPP',
  },
  {
    key: 'gxp',
    name: 'GXP',
    label: 'Cultivo',
    href: APP_PORTAL_URLS.gxp,
    action: 'Assinar GXP',
  },
];
