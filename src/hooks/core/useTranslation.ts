import { useCallback } from 'react';
import { useAppLang } from '#lib/store/index.js';
import { translations as allTranslations, TranslationType } from '#src/locales/index.js';

type Translations = Record<string, string> | null | undefined;

/**
 * useTranslation
 * 
 * PhotoX 核心多語言 Hook。
 */
export function useTranslation() {
  const appLang = useAppLang();

  const resolveString = useCallback((translations: Translations, fallback?: string) => {
    if (!translations) return fallback || '';
    return translations[appLang] || translations.en || fallback || '';
  }, [appLang]);

  const uiTranslations = ((allTranslations || {})[appLang as keyof typeof allTranslations] || (allTranslations || {}).en || {}) as TranslationType;
  
  const t = useCallback((key: string, ...args: unknown[]): string => {
    const val = (uiTranslations as unknown as Record<string, unknown>)[key];
    if (val === undefined) return key;
    if (typeof val === 'function') {
      return val(...args);
    }
    return String(val);
  }, [uiTranslations]);

  return { resolveString, t, appLang, lang: appLang, uiTranslations };
}
