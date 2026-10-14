// Every user-visible string comes from locales/, keyed by module
// (`owner.dashboard.title`). English is bundled, so initialisation is
// synchronous and the first render already has its copy.
import { createInstance } from 'i18next';
import type { i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

import auth from '@/locales/en/auth.json';
import common from '@/locales/en/common.json';
import owner from '@/locales/en/owner.json';
import platform from '@/locales/en/platform.json';

export const EN_TRANSLATION = { common, auth, owner, platform };

export function createI18n(): i18n {
  const instance = createInstance();
  void instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en: { translation: EN_TRANSLATION } },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}
