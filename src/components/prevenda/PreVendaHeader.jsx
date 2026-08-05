import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

import ThemeToggle from '@/components/visual/ThemeToggle';
import logoGrowX from '@/assets/logo-growx-oficial.png';

export default function PreVendaHeader({ showPurchase = true }) {
  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-xl"
      style={{ borderColor: 'var(--prevenda-line)', background: 'var(--prevenda-nav)' }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link to="/" aria-label="Grow-X — início">
          <img src={logoGrowX} alt="Grow-X" className="prevenda-logo h-7 w-auto" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/prevenda/pedido"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold sm:inline-flex"
            style={{ color: 'var(--prevenda-muted)' }}
          >
            Meu pedido
          </Link>
          {showPurchase && (
            <a
              href="/prevenda#reservar"
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition hover:brightness-110"
              style={{ background: 'var(--prevenda-green)', color: 'var(--prevenda-cta-foreground)' }}
            >
              <ShoppingCart aria-hidden="true" size={16} />
              Comprar módulo
            </a>
          )}
          <ThemeToggle className="prevenda-theme-toggle size-10 shrink-0" />
        </div>
      </div>
    </header>
  );
}
