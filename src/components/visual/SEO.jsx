import { Helmet } from 'react-helmet-async';
import { breadcrumbSchemaForPath } from './StructuredData';

const BASE = 'https://www.growx.com.br';
const DEFAULT_OG = `${BASE}/og-image.png`;

const ORG_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Grow-X',
  legalName: 'Grow-X Co.',
  url: BASE,
  logo: `${BASE}/og-image.svg`,
  description: 'Inteligência operacional para o agro brasileiro. Hardware, software e dados conectados de ponta a ponta.',
  email: 'growx@growx.com.br',
  telephone: '+55-41-99549-4343',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Av. Sete de Setembro 4923, sala 1203',
    addressLocality: 'Curitiba',
    addressRegion: 'PR',
    postalCode: '80250-210',
    addressCountry: 'BR',
  },
  sameAs: [
    'https://br.linkedin.com/company/growxco',
    'https://www.instagram.com/grow_x.co',
    'https://facebook.com/growxco',
  ],
};

const WEBSITE_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Grow-X',
  url: BASE,
  inLanguage: ['pt-BR', 'en'],
};

export default function SEO({
  title,
  description,
  path = '/',
  image = DEFAULT_OG,
  type = 'website',
  noIndex = false,
  jsonLd,
}) {
  const fullTitle = title ? `${title} — Grow-X` : 'Grow-X — Inteligência operacional para o agro brasileiro';
  const url = `${BASE}${path}`;
  const breadcrumb = breadcrumbSchemaForPath(path);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:site_name" content="Grow-X" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />

      <script type="application/ld+json">{JSON.stringify(ORG_LD)}</script>
      <script type="application/ld+json">{JSON.stringify(WEBSITE_LD)}</script>
      {breadcrumb && <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>}
      {jsonLd && (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((d, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(d)}</script>
      ))}
    </Helmet>
  );
}
