import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './locales/en';
import { hu } from './locales/hu';

const resources = {
  en: { translation: en },
  hu: { translation: hu },
};

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
