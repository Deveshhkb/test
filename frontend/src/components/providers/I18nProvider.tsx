'use client';

import { ReactNode, useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';

/**
 * Wraps the app so every client component can call useTranslation().
 * Keeps the <html lang> attribute in sync with the active language.
 */
export default function I18nProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(i18n.isInitialized);

  useEffect(() => {
    const apply = (lng: string) => {
      if (typeof document !== 'undefined') document.documentElement.lang = lng;
    };
    apply(i18n.language || 'en');
    i18n.on('languageChanged', apply);
    if (!ready) i18n.on('initialized', () => setReady(true));
    setReady(true);
    return () => {
      i18n.off('languageChanged', apply);
    };
  }, [ready]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
