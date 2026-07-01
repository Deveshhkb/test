'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import en from '@/locales/en.json';

export type Messages = typeof en;

export interface Language {
  code: string;
  label: string;
  flag: string;
}

// Supported languages. English is bundled; the rest are lazy-loaded on demand.
export const LANGUAGES: Language[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'id', label: 'Indonesia', flag: '🇮🇩' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
];

const STORAGE_KEY = 'nova-lang';

// Lazy loaders — each returns a dynamic import so the JSON is a separate chunk.
const LOADERS: Record<string, () => Promise<{ default: Messages }>> = {
  hi: () => import('@/locales/hi.json'),
  mr: () => import('@/locales/mr.json'),
  bn: () => import('@/locales/bn.json'),
  kn: () => import('@/locales/kn.json'),
  id: () => import('@/locales/id.json'),
  es: () => import('@/locales/es.json'),
  fr: () => import('@/locales/fr.json'),
  de: () => import('@/locales/de.json'),
  pt: () => import('@/locales/pt.json'),
  ja: () => import('@/locales/ja.json'),
};

interface LocaleState {
  locale: string;
  setLocale: (code: string) => void;
  languages: Language[];
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleState | undefined>(undefined);

/** Resolve a dotted key path ("nav.men") against a nested messages object. */
function resolve(obj: unknown, path: string): string | undefined {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof value === 'string' ? value : undefined;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState('en');
  const [messages, setMessages] = useState<Messages>(en);

  const load = useCallback(async (code: string) => {
    if (code === 'en' || !LOADERS[code]) {
      setMessages(en);
      setLocaleState('en');
      return;
    }
    try {
      const mod = await LOADERS[code]();
      setMessages(mod.default);
      setLocaleState(code);
    } catch {
      setMessages(en);
      setLocaleState('en');
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const detected = navigator.language?.split('-')[0];
    const initial = saved || (LANGUAGES.some((l) => l.code === detected) ? detected : 'en');
    if (initial && initial !== 'en') load(initial);
  }, [load]);

  const setLocale = useCallback(
    (code: string) => {
      localStorage.setItem(STORAGE_KEY, code);
      load(code);
    },
    [load]
  );

  // Translate: current locale → English fallback → raw key. Supports {vars}.
  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => {
      let str = resolve(messages, path) ?? resolve(en, path) ?? path;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return str;
    },
    [messages]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, languages: LANGUAGES, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

/** Convenience hook returning just the translate function. */
export function useT() {
  return useLocale().t;
}
