import { Download, FileText } from 'lucide-react';
import { Container, Eyebrow } from '@/components/visual';
import { useI18n } from '@/i18n/I18nProvider';

export default function CatalogEditorial() {
  const { lang } = useI18n();
  const english = lang === 'EN';
  return (
    <section aria-labelledby="catalog-editorial-title" className="py-12 sm:py-16">
      <Container>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <Eyebrow>{english ? 'GXP + Module' : 'GXP + Módulo'}</Eyebrow>
          <h2 id="catalog-editorial-title" className="mt-3 text-2xl font-semibold text-foreground">
            {english ? 'Editorial catalog' : 'Catálogo editorial'}
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {english ? 'Explore the app and module in the Portuguese A4 presentation. PDF · 8 pages · 2 MB.' : 'Conheça o aplicativo e o módulo na apresentação A4. PDF · 8 páginas · 2 MB.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/catalogos/gxp-editorial-a4.pdf" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-5 py-3 font-medium text-foreground hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={english ? 'View GXP + Module editorial catalog (Portuguese PDF, new tab)' : 'Ver catálogo editorial GXP + Módulo (PDF, nova aba)'}>
              <FileText size={18} aria-hidden="true" />{english ? 'View catalog' : 'Ver catálogo'}
            </a>
            <a href="/catalogos/gxp-editorial-a4.pdf" download="GXP-Modulo-Catalogo-editorial-A4.pdf" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={english ? 'Download GXP + Module editorial catalog (Portuguese PDF)' : 'Baixar catálogo editorial GXP + Módulo (PDF)'}>
              <Download size={18} aria-hidden="true" />{english ? 'Download PDF' : 'Baixar PDF'}
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
