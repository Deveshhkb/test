import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { es } from './locales/es';

export const i18n = new I18n({ en, hi, es });

i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = Localization.getLocales()[0]?.languageCode ?? 'en';

export const setLocale = (locale: string) => {
  i18n.locale = locale;
};

export const t = (key: string, options?: Record<string, unknown>) => i18n.t(key, options);
