import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector) // auto-detect browser language
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'en', // missing keys fall back to English
      defaultNS: 'common',
      supportedLngs: ['en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn'],
      interpolation: { escapeValue: false },
      detection: {
        order: ['localStorage', 'navigator', 'htmlTag'],
        caches: ['localStorage'],
        lookupLocalStorage: 'preferred_language',
      },
      react: { useSuspense: false },
    });
}

export default i18n;
