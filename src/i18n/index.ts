import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { FALLBACK_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from './const';
import enUS from './resources/en-US';
import zhCN from './resources/zh-CN';
import type { AppLanguage } from './types';

const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
} as const;

const normalizeLanguage = (language?: string | null): AppLanguage | undefined => {
  if (!language) return undefined;
  const normalized = language.toLowerCase();
  if (normalized.startsWith('zh')) return 'zh-CN';
  if (normalized.startsWith('en')) return 'en-US';
  return undefined;
};

const getStoredLanguage = (): AppLanguage | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return normalizeLanguage(stored);
  } catch {
    return undefined;
  }
};

const getInitialLanguage = (): AppLanguage => {
  const storedLanguage = getStoredLanguage();
  if (storedLanguage) return storedLanguage;

  const browserLanguage = typeof navigator !== 'undefined'
    ? normalizeLanguage(navigator.language)
    : undefined;

  return browserLanguage ?? FALLBACK_LANGUAGE;
};

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: {
      escapeValue: false,
    },
  });

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (language: string) => {
    const normalized = normalizeLanguage(language) ?? FALLBACK_LANGUAGE;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  });
}

export default i18n;
