import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en/common.json';
import hi from './locales/hi/common.json';
import gu from './locales/gu/common.json';
import mr from './locales/mr/common.json';
import bn from './locales/bn/common.json';
import ta from './locales/ta/common.json';
import te from './locales/te/common.json';
import kn from './locales/kn/common.json';

export const resources = {
  en: { common: en },
  hi: { common: hi },
  gu: { common: gu },
  mr: { common: mr },
  bn: { common: bn },
  ta: { common: ta },
  te: { common: te },
  kn: { common: kn },
} as const;

export const SUPPORTED_LNGS = ['en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn'];
export const LANG_STORAGE_KEY = 'preferred_language';

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    // IMPORTANT: initialise with a fixed language so the server-rendered HTML and
    // the first client render are identical. Browser/localStorage detection is
    // applied *after* hydration in I18nProvider via detectInitialLanguage(), which
    // avoids "Text content does not match server-rendered HTML" hydration errors.
    lng: 'en',
    fallbackLng: 'en', // missing keys fall back to English
    defaultNS: 'common',
    supportedLngs: SUPPORTED_LNGS,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

/**
 * Resolves the preferred language from localStorage, then the browser, falling
 * back to English. Must only be called in the browser (after mount).
 */
export function detectInitialLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (stored && SUPPORTED_LNGS.includes(stored)) return stored;
  const browser = window.navigator.language?.split('-')[0];
  if (browser && SUPPORTED_LNGS.includes(browser)) return browser;
  return 'en';
}

export default i18n;
