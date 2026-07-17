import { zh } from './zh.js';
import { en } from './en.js';
import { ms } from './ms.js';

export const translations = {
  en,
  zh,
  ms
};

export type LanguageCode = 'zh' | 'en' | 'ms';
export type TranslationType = typeof translations.en;
