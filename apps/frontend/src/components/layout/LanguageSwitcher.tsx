'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

export default function LanguageSwitcher() {
  const { locale, setLocale, languages, t } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape (keyboard accessible).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const active = languages.find((l) => l.code === locale) || languages[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('common.language')}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t('common.language')}
        className="flex items-center gap-1 rounded-full p-2 text-sm font-medium transition hover:bg-ink/5"
      >
        <Globe className="h-5 w-5" />
        <span className="hidden text-xs sm:inline">{active.code.toUpperCase()}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t('common.language')}
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-ink/10 bg-surface p-1 shadow-xl"
        >
          {languages.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === locale}>
              <button
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-ink/5"
              >
                <span aria-hidden>{l.flag}</span>
                <span className="flex-1 text-left">{l.label}</span>
                {l.code === locale && <Check className="h-4 w-4 text-nova-600" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
