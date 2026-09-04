import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fa from './locales/fa.json';

// Phase 1 language set — see docs/PROJECT.md §8 (adjustable based on install data).
export const SUPPORTED_LANGUAGES = ['en', 'fa', 'ar', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const RTL_LANGUAGES: SupportedLanguage[] = ['fa', 'ar'];

const resources = {
  en: { translation: en },
  fa: { translation: fa },
  ar: { translation: ar },
  es: { translation: es },
};

function detectDeviceLanguage(): SupportedLanguage {
  const deviceLanguage = getLocales()[0]?.languageCode;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(deviceLanguage ?? '')
    ? (deviceLanguage as SupportedLanguage)
    : 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
