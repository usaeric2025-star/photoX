import { useUIStore } from '@/store/useUIStore';

type Translations = Record<string, string> | null | undefined;

export function useTranslation() {
  const appLang = useUIStore((s) => s.appLang);

  const t = (translations: Translations, fallback?: string) => {
    if (!translations) return fallback || '';
    return translations[appLang] || translations.en || fallback || '';
  };

  return { t, appLang };
}
