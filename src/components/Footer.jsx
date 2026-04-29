import { Link } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Linkedin, Instagram, Facebook, ArrowUpRight, Leaf,
} from 'lucide-react';
import { Container, GridPattern, StatusDot, NewsletterSignup } from '@/components/visual';
import logoGrowX from '../assets/logo-growx-oficial.png';

const SOLUTIONS = [
  { name: 'Supply-X', href: '/solucoes/supply-x' },
  { name: 'SPI — Indústria', href: '/solucoes/spi' },
  { name: 'SPP — Produtores', href: '/solucoes/spp' },
  { name: 'Grow-X App', href: '/solucoes/growx-app' },
  { name: 'Cannabis medicinal', href: '/cannabis-medicinal' },
];

const PRODUCTS = [
  { name: 'Estação Meteorológica', href: '/produtos/estacao-meteorologica' },
  { name: 'Módulo Sem Fio', href: '/produtos/modulo-sem-fio' },
  { name: 'Estufa Automatizada', href: '/produtos/estufa-automatizada' },
  { name: 'Catálogo completo', href: '/produtos' },
];

const COMPANY = [
  { name: 'História', href: '/sobre/historia' },
  { name: 'Executivo', href: '/sobre/executivo' },
  { name: 'Filosofia & Valores', href: '/sobre/filosofia' },
  { name: 'Casos', href: '/casos' },
  { name: 'Parceiros', href: '/parceiros' },
  { name: 'Imprensa', href: '/imprensa' },
];

const ACTION = [
  { name: 'Agendar demo', href: '/demo' },
  { name: 'Lista de espera App', href: '/lista-espera-app' },
  { name: 'Insights', href: '/insights' },
  { name: 'Contato', href: '/contato' },
];

const SOCIAL = [
  { name: 'LinkedIn', icon: Linkedin, href: 'https://br.linkedin.com/company/growxco' },
  { name: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/grow_x.co' },
  { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/growxco' },
];

export default function Footer() {
  const handleWhatsApp = () => window.open('https://wa.me/5541995494343', '_blank');
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden border-t border-foreground/[0.06] bg-background">
      <GridPattern fine mask="top" className="opacity-50" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald/40 to-transparent" />

      <Container className="relative pt-20 pb-10">
        {/* CTA strip */}
        <div className="mb-12 grid items-center gap-6 rounded-3xl glass-strong p-8 sm:p-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <StatusDot label="Atendimento ativo · Curitiba/PR" businessHour />
            <h3 className="mt-4 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
              Vamos conversar sobre a sua operação?
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Em 30 minutos a gente entende seu cenário e mostra onde a Grow-X encaixa.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <Link to="/demo" className="btn-primary">Agendar demo</Link>
            <button onClick={handleWhatsApp} className="btn-ghost">WhatsApp</button>
          </div>
        </div>

        {/* Newsletter signup */}
        <div className="mb-16">
          <NewsletterSignup source="footer" />
        </div>

        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand */}
          <div className="lg:col-span-3">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src={logoGrowX} alt="Grow-X" className="h-9 w-auto" />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Inteligência operacional para o agro brasileiro. Hardware, software e dados conectados de ponta a ponta.
            </p>

            <ul className="mt-7 space-y-3 text-sm">
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-glow" />
                <span>Av. Sete de Setembro 4923, sala 1203 · Batel · Curitiba/PR</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <Phone className="mt-0.5 size-4 shrink-0 text-emerald-glow" />
                <a href="tel:+5541995494343" className="hover:text-foreground">+55 (41) 99549-4343</a>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <Mail className="mt-0.5 size-4 shrink-0 text-emerald-glow" />
                <div className="flex flex-col gap-0.5">
                  <a href="mailto:growx@growx.com.br" className="hover:text-foreground">growx@growx.com.br <span className="text-[10px] text-muted-foreground/70">· geral</span></a>
                  <a href="mailto:mkt@growx.com.br" className="hover:text-foreground">mkt@growx.com.br <span className="text-[10px] text-muted-foreground/70">· marketing & imprensa</span></a>
                </div>
              </li>
            </ul>
          </div>

          {/* Link cols */}
          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-9 lg:grid-cols-4">
            <FooterCol title="Soluções" links={SOLUTIONS} />
            <FooterCol title="Produtos" links={PRODUCTS} />
            <FooterCol title="Empresa" links={COMPANY} />
            <FooterCol title="Ações" links={ACTION} />
          </div>
        </div>

        {/* legal row */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-foreground/[0.06] pt-6 text-xs text-muted-foreground">
          <Link to="/privacidade" className="hover:text-emerald-glow">Privacidade</Link>
          <Link to="/termos" className="hover:text-emerald-glow">Termos de uso</Link>
          <Link to="/cookies" className="hover:text-emerald-glow">Cookies</Link>
          <Link to="/imprensa" className="hover:text-emerald-glow">Imprensa</Link>
          <Link to="/parceiros" className="hover:text-emerald-glow">Parceiros</Link>
        </div>

        {/* bottom bar */}
        <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-foreground/[0.06] pt-6 sm:flex-row sm:items-center">
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <Leaf className="size-3.5 text-emerald-glow" />
            © {year} Grow-X Co. · Engenharia agro brasileira · CNPJ a publicar.
          </p>
          <div className="flex items-center gap-2">
            {SOCIAL.map((s) => {
              const Icon = s.icon;
              return (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={s.name}
                  className="inline-flex size-9 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 text-foreground/70 transition-colors hover:border-emerald/40 hover:text-emerald-glow"
                >
                  <Icon className="size-4" />
                </a>
              );
            })}
          </div>
        </div>
      </Container>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald/30 to-transparent" />
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-eyebrow text-foreground/60">{title}</h4>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              to={l.href}
              className="group inline-flex items-center gap-1.5 text-sm text-foreground/80 transition-colors hover:text-emerald-glow"
            >
              {l.name}
              <ArrowUpRight className="size-3.5 -translate-y-px opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
