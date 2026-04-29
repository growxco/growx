import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown, Menu, X, ArrowRight, Globe, Factory, Tractor, Smartphone,
  CloudSun, Cpu, Sprout, Compass, Users, Lightbulb, Search, Languages,
} from 'lucide-react';
import { Container, ThemeToggle, AIAssistant } from '@/components/visual';
import { useI18n } from '@/i18n/I18nProvider';
import CommandPalette from './CommandPalette';
import logoGrowX from '../assets/logo-growx-oficial.png';
import { cn } from '@/lib/utils';

const NAV = [
  { name: 'Início', href: '/', type: 'link' },
  {
    name: 'Soluções',
    type: 'mega',
    items: [
      { name: 'Supply-X', href: '/solucoes/supply-x', icon: Globe, desc: 'Plataforma completa SPI + SPP' },
      { name: 'SPI — Indústria', href: '/solucoes/spi', icon: Factory, desc: 'Para grandes indústrias agroalimentares' },
      { name: 'SPP — Produtores', href: '/solucoes/spp', icon: Tractor, desc: 'O app que organiza o produtor real' },
      { name: 'Grow-X App', href: '/solucoes/growx-app', icon: Smartphone, desc: 'Cannabis medicinal & cultivo controlado' },
    ],
  },
  {
    name: 'Produtos',
    type: 'mega',
    href: '/produtos',
    items: [
      { name: 'Estação Meteorológica', href: '/produtos/estacao-meteorologica', icon: CloudSun, desc: 'Sensores LoRa de alta precisão' },
      { name: 'Módulo Sem Fio', href: '/produtos/modulo-sem-fio', icon: Cpu, desc: 'Controle de até 4 estufas' },
      { name: 'Estufa Automatizada', href: '/produtos/estufa-automatizada', icon: Sprout, desc: 'Cultivo controlado completo' },
    ],
  },
  {
    name: 'Sobre',
    type: 'mega',
    items: [
      { name: 'História', href: '/sobre/historia', icon: Compass, desc: 'Nossa trajetória' },
      { name: 'Executivo', href: '/sobre/executivo', icon: Users, desc: 'Liderança e equipe' },
      { name: 'Filosofia & Valores', href: '/sobre/filosofia', icon: Lightbulb, desc: 'Nossos princípios' },
    ],
  },
  { name: 'Insights', href: '/insights', type: 'link' },
  { name: 'Contato', href: '/contato', type: 'link' },
];

export default function Header() {
  const [open, setOpen] = useState(null);
  const [mobile, setMobile] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [search, setSearch] = useState(false);
  const { lang, toggle: toggleLang, t } = useI18n();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
    setSearch(false);
  }, [location.pathname]);

  // ⌘K / Ctrl+K opens search
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch((s) => !s);
      }
      if (e.key === 'Escape') setSearch(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isActive = (href) => href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          scrolled
            ? 'border-b border-[oklch(1_0_0/8%)] bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55'
            : 'bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-[100vw] items-center justify-between gap-3 px-5 sm:px-6 lg:h-[72px] lg:max-w-7xl lg:gap-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoGrowX} alt="Grow-X" className="h-7 w-auto sm:h-8" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              if (item.type === 'link') {
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.href) ? 'text-emerald-glow' : 'text-foreground/70 hover:text-foreground',
                    )}
                  >
                    {item.name}
                  </Link>
                );
              }
              const isOpen = open === item.name;
              return (
                <div key={item.name} className="relative">
                  <button
                    type="button"
                    onMouseEnter={() => setOpen(item.name)}
                    onClick={() => setOpen(isOpen ? null : item.name)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isOpen ? 'text-foreground' : 'text-foreground/70 hover:text-foreground',
                    )}
                  >
                    {item.name}
                    <ChevronDown className={cn('size-3.5 transition-transform', isOpen && 'rotate-180')} />
                  </button>

                  {isOpen && (
                    <div
                      onMouseLeave={() => setOpen(null)}
                      className="absolute left-1/2 top-full z-50 mt-2 w-[460px] -translate-x-1/2 overflow-hidden rounded-2xl glass-strong shadow-elevated"
                    >
                      <div className="grid gap-1 p-3">
                        {item.items.map((sub) => {
                          const Icon = sub.icon;
                          return (
                            <Link
                              key={sub.href}
                              to={sub.href}
                              className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-foreground/5"
                            >
                              <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald/15 text-emerald-glow ring-hairline">
                                <Icon className="size-4" />
                              </span>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-foreground">{sub.name}</div>
                                <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{sub.desc}</div>
                              </div>
                              <ArrowRight className="ml-auto mt-1 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                            </Link>
                          );
                        })}
                      </div>
                      {item.href && (
                        <div className="border-t border-foreground/10 px-4 py-3">
                          <Link to={item.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-glow">
                            Ver todos os {item.name.toLowerCase()}
                            <ArrowRight className="size-3.5" />
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Buscar (⌘K)"
              onClick={() => setSearch(true)}
              className="hidden h-9 items-center gap-2 rounded-lg border border-foreground/10 bg-foreground/[0.04] px-3 text-xs text-muted-foreground transition-colors hover:border-emerald/40 hover:text-foreground sm:inline-flex"
            >
              <Search className="size-3.5" />
              <span>{t('common.search')}</span>
              <kbd className="hidden rounded border border-foreground/10 bg-background/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">⌘K</kbd>
            </button>

            <button
              type="button"
              onClick={toggleLang}
              aria-label="Trocar idioma"
              className="hidden h-9 items-center gap-1.5 rounded-lg border border-foreground/10 bg-foreground/[0.04] px-2.5 text-xs font-mono uppercase tracking-wider text-foreground/70 transition-colors hover:border-emerald/40 hover:text-foreground sm:inline-flex"
            >
              <Languages className="size-3.5" />
              {lang}
            </button>

            <AIAssistant />

            <ThemeToggle className="hidden sm:inline-flex" />

            <div className="hidden lg:block">
              <Link to="/demo" className="btn-primary text-xs sm:text-sm">
                {t('common.scheduleDemo')}
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobile(!mobile)}
              className="fixed left-[min(calc(100dvw-56px),330px)] top-3.5 z-[60] inline-flex size-9 items-center justify-center rounded-lg border border-foreground/10 bg-foreground/5 text-foreground lg:static lg:hidden"
              aria-label="Menu"
            >
              {mobile ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* mobile drawer */}
        {mobile && (
          <div className="lg:hidden">
            <div className="border-t border-foreground/[0.08] bg-background/95 backdrop-blur-xl">
              <Container className="py-5">
                <nav className="flex flex-col gap-1">
                  {NAV.map((item) => {
                    if (item.type === 'link') {
                      return (
                        <Link
                          key={item.name}
                          to={item.href}
                          className={cn(
                            'rounded-lg px-3 py-3 text-sm font-medium',
                            isActive(item.href) ? 'bg-emerald/10 text-emerald-glow' : 'text-foreground',
                          )}
                        >
                          {item.name}
                        </Link>
                      );
                    }
                    return (
                      <details key={item.name} className="group rounded-lg">
                        <summary className="flex cursor-pointer items-center justify-between px-3 py-3 text-sm font-medium text-foreground">
                          {item.name}
                          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="ml-3 flex flex-col gap-1 border-l border-foreground/10 pl-3 pb-2">
                          {item.items.map((sub) => (
                            <Link
                              key={sub.href}
                              to={sub.href}
                              className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                            >
                              {sub.name}
                            </Link>
                          ))}
                          {item.href && (
                            <Link to={item.href} className="rounded-lg px-3 py-2 text-sm font-semibold text-emerald-glow">
                              Ver todos →
                            </Link>
                          )}
                        </div>
                      </details>
                    );
                  })}
                  <Link to="/demo" className="btn-primary mt-3 w-full">
                    Agendar demo
                    <ArrowRight className="size-4" />
                  </Link>
                </nav>
              </Container>
            </div>
          </div>
        )}
      </header>

      <CommandPalette open={search} onClose={() => setSearch(false)} />
    </>
  );
}
