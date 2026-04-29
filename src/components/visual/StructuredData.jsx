import { Helmet } from 'react-helmet-async';

const BASE = 'https://www.growx.com.br';

/**
 * Inject extra Schema.org JSON-LD on a page.
 * Common helpers below.
 */
export default function StructuredData({ data }) {
  const arr = Array.isArray(data) ? data : [data];
  return (
    <Helmet>
      {arr.map((d, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(d)}</script>
      ))}
    </Helmet>
  );
}

export function productSchema({ name, description, image, sku, category }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: image ? `${BASE}${image}` : undefined,
    sku,
    brand: { '@type': 'Brand', name: 'Grow-X' },
    manufacturer: { '@type': 'Organization', name: 'Grow-X Co.' },
    category,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'BRL',
      seller: { '@type': 'Organization', name: 'Grow-X Co.' },
      url: `${BASE}/contato`,
    },
  };
}

export function softwareSchema({ name, description, applicationCategory = 'BusinessApplication', os = 'Web' }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    applicationCategory,
    operatingSystem: os,
    offers: { '@type': 'Offer', priceCurrency: 'BRL' },
    publisher: { '@type': 'Organization', name: 'Grow-X Co.' },
  };
}

const ROUTE_NAMES = {
  '': 'Início',
  solucoes: 'Soluções',
  'supply-x': 'Supply-X',
  spi: 'SPI · Indústria',
  spp: 'SPP · Produtores',
  'growx-app': 'Grow-X App',
  produtos: 'Produtos',
  'estacao-meteorologica': 'Estação Meteorológica',
  'modulo-sem-fio': 'Módulo Sem Fio',
  'estufa-automatizada': 'Estufa Automatizada',
  sobre: 'Sobre',
  historia: 'História',
  executivo: 'Executivo',
  filosofia: 'Filosofia & Valores',
  contato: 'Contato',
  obrigado: 'Obrigado',
  demo: 'Agendar demo',
  'lista-espera-app': 'Lista de espera App',
  insights: 'Insights',
  casos: 'Casos',
  parceiros: 'Parceiros',
  imprensa: 'Imprensa',
  'cannabis-medicinal': 'Cannabis medicinal',
  privacidade: 'Privacidade',
  termos: 'Termos de uso',
  cookies: 'Cookies',
};

export function breadcrumbSchemaForPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  let current = '';
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Início', item: BASE + '/' },
    ...parts.map((p, i) => {
      current += `/${p}`;
      return {
        '@type': 'ListItem',
        position: i + 2,
        name: ROUTE_NAMES[p] ?? p,
        item: BASE + current,
      };
    }),
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}
