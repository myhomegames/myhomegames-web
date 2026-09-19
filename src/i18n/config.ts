import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from './locales/en.json';
import itTranslations from './locales/it.json';
import ptTranslations from './locales/pt.json';
import esTranslations from './locales/es.json';
import frTranslations from './locales/fr.json';
import deTranslations from './locales/de.json';
import zhTranslations from './locales/zh.json';
import jaTranslations from './locales/ja.json';
import { resolveInitialUiLanguage } from './resolveUiLanguage';

const initialLanguage = resolveInitialUiLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: enTranslations,
    },
    it: {
      translation: itTranslations,
    },
    pt: {
      translation: ptTranslations,
    },
    es: {
      translation: esTranslations,
    },
    fr: {
      translation: frTranslations,
    },
    de: {
      translation: deTranslations,
    },
    zh: {
      translation: zhTranslations,
    },
    ja: {
      translation: jaTranslations,
    },
  },
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  pluralSeparator: '_',
  contextSeparator: '_',
});

try {
  if (!localStorage.getItem('language')) {
    localStorage.setItem('language', initialLanguage);
  }
} catch {
  // ignore private mode / denied storage
}

export default i18n;
