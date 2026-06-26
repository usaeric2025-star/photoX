import { zh } from './zh';
import { en } from './en';
import { ms } from './ms';

export const translations = {
  en,
  zh,
  ms
};

export type LanguageCode = 'zh' | 'en' | 'ms';
export type TranslationType = typeof translations.en;

export function createTranslate(lang: LanguageCode) {
  const dict = translations[lang] || translations.en;
  return (key: keyof typeof translations.en) => {
    const value = dict[key];
    if (typeof value === 'function') return value;
    return value || key;
  };
}
