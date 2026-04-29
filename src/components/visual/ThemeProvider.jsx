import { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext({ theme: 'dark', setTheme: () => {} });

export function ThemeProvider({ children, defaultTheme = 'dark' }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return localStorage.getItem('growx-theme') ?? defaultTheme;
  });

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    html.classList.add(theme);
    html.style.colorScheme = theme;
    localStorage.setItem('growx-theme', theme);
  }, [theme]);

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeCtx);
}
