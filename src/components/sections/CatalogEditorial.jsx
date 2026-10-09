import { Download, FileText } from 'lucide-react';
import { Container, Eyebrow } from '@/components/visual';
import { useI18n } from '@/i18n/I18nProvider';

export default function CatalogEditorial({ universe = false }) {
  const { lang } = useI18n();
  const english = lang === 'EN';
  const sectionId = universe ? 'catalog-gxp-universe-title' : 'catalog-editorial-title';
  const href = universe ? '/catalogos/gxp-universo-canabico-completo.pdf' : '/catalogos/gxp-editorial-a4.pdf';
  const fileName = universe ? 'GXP_Universo_Canabico_Completo.pdf' : 'GXP-Modulo-Catalogo-editorial-A4.pdf';
  const title = universe ? (english ? 'GXP catalog — Cannabis universe' : 'Catálogo GXP — Universo canábico') : (english ? 'Editorial catalog' : 'Catálogo editorial');
  const description = universe
    ? (english ? 'App, diary and compatible hardware for an adult audience. Portuguese PDF · 7 pages · 4.9 MB.' : 'Aplicativo, diário e hardware compatível para o público adulto. PDF · 7 páginas · 4,9 MB.')
    : (english ? 'Explore the app and module in the Portuguese A4 presentation. PDF · 8 pages · 2 MB.' : 'Conheça o aplicativo e o módulo na apresentação A4. PDF · 8 páginas · 2 MB.');
  return (
    <section aria-labelledby={sectionId} className="py-12 sm:py-16">
      <Container>
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <Eyebrow>{english ? 'GXP + Module' : 'GXP + Módulo'}</Eyebrow>
          <h2 id={sectionId} className="mt-3 text-2xl font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-5 py-3 font-medium text-foreground hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={`${english ? 'View' : 'Ver'} ${title} (${english ? 'Portuguese PDF, new tab' : 'PDF, nova aba'})`}>
              <FileText size={18} aria-hidden="true" />{english ? 'View catalog' : 'Ver catálogo'}
            </a>
            <a href={href} download={fileName} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" aria-label={`${english ? 'Download' : 'Baixar'} ${title} (${english ? 'Portuguese PDF' : 'PDF'})`}>
              <Download size={18} aria-hidden="true" />{english ? 'Download PDF' : 'Baixar PDF'}
            </a>
          </div>
        </div>
      </Container>
    </section>
  );
}
