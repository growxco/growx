import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Container } from '@/components/visual';

const ROUTE_NAMES = {
  solucoes: 'Soluções',
  'supply-x': 'Supply-X',
  spi: 'SPI · Indústria',
  spp: 'SPP · Produtores',
  'growx-app': 'Grow-X App',
  produtos: 'Produtos',
  'estacao-meteorologica': 'Estação Meteorológica',
  'modulo-sem-fio': 'Módulo Sem Fio',
  'estufa-automatizada': 'Estufa Automatizada',
  sobre: 'Sobre nós',
  historia: 'História',
  executivo: 'Executivo',
  filosofia: 'Filosofia & Valores',
  contato: 'Contato',
  obrigado: 'Obrigado',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const items = [{ name: 'Início', href: '/', icon: Home }];
  let path = '';
  parts.forEach((p, i) => {
    path += `/${p}`;
    items.push({
      name: ROUTE_NAMES[p] ?? decodeURIComponent(p),
      href: path,
      isLast: i === parts.length - 1,
    });
  });

  return (
    <div className="border-b border-white/[0.06] bg-background/40">
      <Container>
        <nav className="flex flex-wrap items-center gap-2 py-4 text-xs text-muted-foreground">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <span key={item.href} className="flex items-center gap-2">
                {idx > 0 && <ChevronRight className="size-3 text-foreground/30" />}
                {item.isLast ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-glow">
                    {Icon && <Icon className="size-3.5" />}
                    {item.name}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
                  >
                    {Icon && <Icon className="size-3.5" />}
                    {item.name}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </Container>
    </div>
  );
}
