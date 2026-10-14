// One i18next instance per call, so each test renders with fresh, real translations.
import { createInstance, type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../locales/en/translation.json';

export function createI18n(): i18n {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}
