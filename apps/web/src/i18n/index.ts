import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { LanguageCode } from '@vida/shared';
import en from './locales/en.json';
import ptBR from './locales/pt-BR.json';

/**
 * i18n setup.
 *
 * All UI strings live in JSON files (never inline in components) so the game can
 * be translated without touching code. `resources` is bundled on purpose: the
 * two files are tiny and pre-loaded text avoids a flash of untranslated UI.
 */
export const SUPPORTED_LANGUAGES = ['pt-BR', 'en'] as const;
export type Language = LanguageCode;

export const resources = {
  'pt-BR': { translation: ptBR },
  en: { translation: en },
} as const;

/** Picks the closest supported language from a browser tag ("en-US" -> "en"). */
export function resolveLanguage(candidate?: string | null): Language {
  if (!candidate) return 'pt-BR';
  const lower = candidate.toLowerCase();
  if (lower.startsWith('pt')) return 'pt-BR';
  if (lower.startsWith('en')) return 'en';
  return 'pt-BR';
}

export function initI18n(language: Language): typeof i18n {
  void i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'pt-BR',
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
  });
  return i18n;
}

export async function setLanguage(language: Language): Promise<void> {
  await i18n.changeLanguage(language);
  document.documentElement.lang = language;
}

export default i18n;
