import { useAppLang } from '@/lib/store';
import { translations as allTranslations, TranslationType } from '@/locales';

type Translations = Record<string, string> | null | undefined;

export function useTranslation() {
  const appLang = useAppLang();

  /** 
   * t - Function to resolve localized strings from a data object (e.g. photo.name)
   */
  const t = (translations: Translations, fallback?: string) => {
    if (!translations) return fallback || '';
    return translations[appLang] || translations.en || fallback || '';
  };

  /**
   * uiTranslations - The full translation object for the current language
   */
  const uiTranslations = (allTranslations[appLang as keyof typeof allTranslations] || allTranslations.en) as TranslationType;

  return { t, appLang, lang: appLang, uiTranslations };
}
