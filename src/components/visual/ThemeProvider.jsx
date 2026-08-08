import { createContext, useContext, useLayoutEffect, useState } from 'react';

const ThemeCtx = createContext({ theme: 'dark', setTheme: () => {} });
const VALID_THEMES = new Set(['dark', 'light']);

function normalizedTheme(value, fallback = 'dark') {
  if (VALID_THEMES.has(value)) return value;
  return VALID_THEMES.has(fallback) ? fallback : 'dark';
}

function storedTheme(fallback) {
  if (typeof window === 'undefined') return normalizedTheme(fallback);
  try {
    return normalizedTheme(window.localStorage.getItem('growx-theme'), fallback);
  } catch {
    return normalizedTheme(fallback);
  }
}

export function ThemeProvider({ children, defaultTheme = 'dark' }) {
  const [theme, setTheme] = useState(() => storedTheme(defaultTheme));

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    html.classList.add(theme);
    html.style.colorScheme = theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    const isPreVenda = window.location.pathname === '/modulo'
      || window.location.pathname.startsWith('/prevenda');
    themeColor?.setAttribute(
      'content',
      theme === 'light' ? '#f7f6ef' : isPreVenda ? '#080b09' : '#102017',
    );
    try {
      window.localStorage.setItem('growx-theme', theme);
    } catch {
      // Storage pode ser bloqueado por política/privacidade; o tema da aba segue funcional.
    }
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{
      theme,
      setTheme: (value) => setTheme(normalizedTheme(value, theme)),
      toggle: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
