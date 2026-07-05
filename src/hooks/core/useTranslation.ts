import { useAppLang } from '#lib/store/index.js';
import { translations as allTranslations, TranslationType } from '#src/locales/index.js';

type Translations = Record<string, string> | null | undefined;

export function useTranslation() {
  const appLang = useAppLang();

  /** 
   * resolveString - Function to resolve localized strings from a data object (e.g. photo.name)
   */
  const resolveString = (translations: Translations, fallback?: string) => {
    if (!translations) return fallback || '';
    return translations[appLang] || translations.en || fallback || '';
  };

  /**
   * t - Function to resolve UI strings from the current language translation object
   */
  const uiTranslations = (allTranslations[appLang as keyof typeof allTranslations] || allTranslations.en) as TranslationType;
  const t = (key: string, ...args: any[]): string => {
    const val = (uiTranslations as any)[key];
    if (val === undefined) return key;
    if (typeof val === 'function') {
      return val(...args);
    }
    return val;
  };

  return { resolveString, t, appLang, lang: appLang, uiTranslations };
}
