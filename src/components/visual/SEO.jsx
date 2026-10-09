import { useEffect } from 'react';
import { MARKETING_METADATA } from '@/lib/marketingMetadata';
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


function upsert(selector, tag, attributes) {
  const nodes = [...document.head.querySelectorAll(selector)];
  const node = nodes.shift() || document.createElement(tag);
  nodes.forEach(duplicate => duplicate.remove());
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  document.head.appendChild(node);
}

export default function SEO({ title, description, path = '/', image, type, noIndex = false, jsonLd }) {
  const published = MARKETING_METADATA[path];
  const fullTitle = `${published?.title || title || 'Grow-X Co.'} - Grow-X`;
  const resolvedDescription = published?.description || description || 'Tecnologia e projetos Grow-X.';
  const url = `${BASE}${path}`;
  const resolvedImage = image || DEFAULT_OG;
  const resolvedType = type || 'website';
  const breadcrumb = breadcrumbSchemaForPath(path);
  const schemas = [ORG_LD, WEBSITE_LD, breadcrumb, ...(Array.isArray(jsonLd) ? jsonLd : [jsonLd])].filter(Boolean);
  const schemaText = JSON.stringify(schemas);
  useEffect(() => {
    document.title = fullTitle;
    upsert('link[rel="canonical"]', 'link', { rel: 'canonical', href: url });
    const named = { description: resolvedDescription, robots: noIndex ? 'noindex, nofollow' : 'index, follow', 'twitter:card': 'summary_large_image', 'twitter:title': fullTitle, 'twitter:description': resolvedDescription, 'twitter:image': resolvedImage };
    const properties = { 'og:type': resolvedType, 'og:title': fullTitle, 'og:description': resolvedDescription, 'og:url': url, 'og:image': resolvedImage, 'og:locale': 'pt_BR', 'og:site_name': 'Grow-X' };
    Object.entries(named).forEach(([name, content]) => upsert(`meta[name="${name}"]`, 'meta', { name, content }));
    Object.entries(properties).forEach(([property, content]) => upsert(`meta[property="${property}"]`, 'meta', { property, content }));
    document.head.querySelectorAll('script[data-growx-seo]').forEach(node => node.remove());
    const script = document.createElement('script');
    script.type = 'application/ld+json'; script.dataset.growxSeo = 'true'; script.textContent = schemaText;
    document.head.appendChild(script);
  }, [fullTitle, resolvedDescription, url, resolvedImage, resolvedType, noIndex, schemaText]);
  return null;
}
