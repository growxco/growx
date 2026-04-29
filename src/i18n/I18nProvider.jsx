import { createContext, useContext, useEffect, useState } from 'react';
import { DICTIONARIES, PT } from './dictionary';

const I18nCtx = createContext({ lang: 'PT', setLang: () => {}, t: (k) => k });

function getByPath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
}

export function I18nProvider({ children, defaultLang = 'PT' }) {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return defaultLang;
    return localStorage.getItem('growx-lang') ?? defaultLang;
  });

  useEffect(() => {
    localStorage.setItem('growx-lang', lang);
    document.documentElement.lang = lang === 'EN' ? 'en' : 'pt-BR';
  }, [lang]);

  const dict = DICTIONARIES[lang] ?? PT;
  const t = (key, fallback) => {
    const value = getByPath(dict, key);
    if (value != null) return value;
    const fb = getByPath(PT, key);
    return fb ?? fallback ?? key;
  };

  return (
    <I18nCtx.Provider value={{ lang, setLang, t, toggle: () => setLang(lang === 'PT' ? 'EN' : 'PT') }}>
      {children}
    </I18nCtx.Provider>
  );
}

export function useI18n() {
  return useContext(I18nCtx);
}
