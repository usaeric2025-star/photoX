import { translations, LanguageCode } from './translations';

export function createTranslate(lang: LanguageCode) {
  const dict = translations[lang] || translations.en;
  return (key: keyof typeof translations.en) => {
    const value = (dict as any)[key];
    if (typeof value === 'function') return value;
    return value || key;
  };
}
