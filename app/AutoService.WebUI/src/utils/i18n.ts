/**
 * i18next internationalization configuration.
 *
 * Initializes {@code i18next} with English and Hungarian translations,
 * browser language detection via {@code localStorage} key {@code 'preferred-language'},
 * and the React i18next integration. Default/fallback language is Hungarian.
 * @module utils/i18n
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './locales/en';
import { hu } from './locales/hu';

/** Translation resources keyed by language code. */
const resources = {
  en: { translation: en },
  hu: { translation: hu },
};

/** Restored language preference, defaulting to Hungarian. */
const savedLang = localStorage.getItem('preferred-language') || 'hu';

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'hu',
    lng: savedLang,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'preferred-language',
      caches: ['localStorage'],
      excludeCacheFor: ['cimode'],
    },
  });

export default i18next;
