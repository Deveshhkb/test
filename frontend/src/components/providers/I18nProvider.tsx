'use client';

import { ReactNode, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n, { detectInitialLanguage } from '@/i18n/config';

/**
 * Wraps the app so every client component can call useTranslation().
 *
 * i18n is initialised with a fixed `lng: 'en'` (see config.ts) so SSR output and
 * the first client render match. After hydration we switch to the user's
 * preferred/browser language, and keep <html lang> in sync on every change.
 */
export default function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const apply = (lng: string) => {
      document.documentElement.lang = lng;
    };
    i18n.on('languageChanged', apply);

    // Applied post-mount to avoid a server/client hydration mismatch.
    const target = detectInitialLanguage();
    if (target !== i18n.language) {
      i18n.changeLanguage(target);
    } else {
      apply(target);
    }

    return () => {
      i18n.off('languageChanged', apply);
    };
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
