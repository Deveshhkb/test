import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

/**
 * i18next setup. Every user-visible string goes through `t()` — no
 * hardcoded copy in components. Additional languages are added as new
 * files under `locales/` (lazy-loaded via a backend plugin once the
 * language switcher lands); RTL layouts key off `i18n.dir()`.
 */
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    // React already escapes rendered strings.
    escapeValue: false,
  },
});

export default i18n;
