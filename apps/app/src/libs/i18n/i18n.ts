// Every user-visible string comes from the `en` resources (TRD §4.2). Each
// call builds its own instance, so a test never shares language state.
import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en/translation.json';

export function createI18n(): i18n {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: en } },
    // Resources are bundled, so init is synchronous and the first render has copy.
    initAsync: false,
    interpolation: { escapeValue: false },
    showSupportNotice: false,
  });
  return instance;
}
