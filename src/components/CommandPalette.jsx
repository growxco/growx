import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, Globe, Factory, Tractor, Smartphone, CloudSun, Cpu, Sprout,
  Compass, Users, Lightbulb, Mail, Sun, Moon, Languages, Home, FileText,
} from 'lucide-react';
import { useTheme } from '@/components/visual/ThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang, t } = useI18n();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const items = useMemo(() => {
    return [
      { group: t('common.quickAccess'), icon: Home, label: t('common.home'), to: '/' },
      { group: t('common.solutions'), icon: Globe, label: 'Supply-X', to: '/solucoes/supply-x', desc: 'Plataforma SPI + SPP' },
      { group: t('common.solutions'), icon: Factory, label: 'SPI · Indústria', to: '/solucoes/spi', desc: 'Recebimento e governança' },
      { group: t('common.solutions'), icon: Tractor, label: 'SPP · Produtores', to: '/solucoes/spp', desc: 'App agronômico' },
      { group: t('common.solutions'), icon: Smartphone, label: 'Grow-X App', to: '/solucoes/growx-app', desc: 'Cannabis & cultivo controlado' },
      { group: t('common.products'), icon: Cpu, label: t('common.products'), to: '/produtos' },
      { group: t('common.products'), icon: CloudSun, label: 'Estação Meteorológica', to: '/produtos/estacao-meteorologica' },
      { group: t('common.products'), icon: Cpu, label: 'Módulo Sem Fio', to: '/produtos/modulo-sem-fio' },
      { group: t('common.products'), icon: Sprout, label: 'Estufa Automatizada', to: '/produtos/estufa-automatizada' },
      { group: t('common.about'), icon: Compass, label: t('common.history'), to: '/sobre/historia' },
      { group: t('common.about'), icon: Users, label: t('common.executive'), to: '/sobre/executivo' },
      { group: t('common.about'), icon: Lightbulb, label: t('common.philosophy'), to: '/sobre/filosofia' },
      { group: t('common.contact'), icon: Mail, label: t('common.contact'), to: '/contato' },
      // ações
      { group: 'Ações', icon: theme === 'dark' ? Sun : Moon, label: theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro', action: toggleTheme },
      { group: 'Ações', icon: Languages, label: lang === 'PT' ? 'Switch to English' : 'Mudar para Português', action: toggleLang },
    ];
  }, [t, theme, lang, toggleTheme, toggleLang]);

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const term = q.toLowerCase().trim();
    return items.filter((it) =>
      it.label.toLowerCase().includes(term) ||
      it.group?.toLowerCase().includes(term) ||
      it.desc?.toLowerCase().includes(term),
    );
  }, [q, items]);

  useEffect(() => {
    if (open) {
      setQ('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => Math.min(filtered.length - 1, a + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[active];
        if (!item) return;
        if (item.to) {
          navigate(item.to);
          onClose();
        } else if (item.action) {
          item.action();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, filtered, active, navigate, onClose]);

  // Auto-scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${active}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  // Group filtered items by group for display
  const grouped = filtered.reduce((acc, it, idx) => {
    const g = it.group ?? '';
    if (!acc[g]) acc[g] = [];
    acc[g].push({ ...it, idx });
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-background/70 backdrop-blur-md p-4 pt-[12vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl glass-strong shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-foreground/10 px-4 py-3">
          <Search className="size-4 text-emerald-glow" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('common.searchPlaceholder')}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <kbd className="rounded border border-foreground/10 bg-background/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto px-2 py-3">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <FileText className="mx-auto size-6 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">Nada encontrado pra "{q}".</p>
            </div>
          ) : (
            Object.entries(grouped).map(([group, list]) => (
              <div key={group} className="mb-1">
                <div className="px-3 py-1 text-eyebrow text-muted-foreground">{group}</div>
                <ul className="mt-1">
                  {list.map((it) => {
                    const Icon = it.icon;
                    const isActive = it.idx === active;
                    return (
                      <li key={`${group}-${it.idx}`} data-idx={it.idx}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(it.idx)}
                          onClick={() => {
                            if (it.to) {
                              navigate(it.to);
                              onClose();
                            } else if (it.action) {
                              it.action();
                            }
                          }}
                          className={
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ' +
                            (isActive ? 'bg-emerald/15 text-foreground' : 'text-foreground/85 hover:bg-foreground/5')
                          }
                        >
                          <Icon className="size-4 shrink-0 text-emerald-glow" />
                          <span className="flex-1 truncate text-sm font-medium">{it.label}</span>
                          {it.desc && (
                            <span className="hidden truncate text-xs text-muted-foreground sm:inline">{it.desc}</span>
                          )}
                          {it.to && <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-foreground/10 px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-foreground/10 bg-background/50 px-1.5 py-0.5">↑↓</kbd>
              navegar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-foreground/10 bg-background/50 px-1.5 py-0.5">↵</kbd>
              abrir
            </span>
          </div>
          <span className="hidden sm:inline">grow-x · ⌘K</span>
        </div>
      </div>
    </div>
  );
}
