'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FaGlobe, FaChevronDown } from 'react-icons/fa';
import { LANGUAGES } from '@/i18n/languages';

export default function LanguageSelector({ light = false }: { light?: boolean }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const change = (code: string) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
          light
            ? 'border-white/30 text-white hover:bg-white/10'
            : 'border-gray-200 text-ink hover:border-primary hover:text-primary'
        }`}
        aria-label="Select language"
      >
        <FaGlobe className="h-3.5 w-3.5" />
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.nativeName}</span>
        <FaChevronDown className="h-3 w-3 opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-card">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => change(lang.code)}
              className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-primary-50 ${
                lang.code === current.code ? 'font-semibold text-primary' : 'text-gray-700'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.nativeName}</span>
              <span className="ml-auto text-xs text-gray-400">{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
