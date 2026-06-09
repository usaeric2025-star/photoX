import { translateText } from './agnes';
import { ok, fail } from '@/lib/utils/result';
import { AppResult } from '@/types/api';
import type { TranslationResult } from './types';

export const translateFields = async (
  name: string,
  description: string
): Promise<AppResult<TranslationResult>> => {
  try {
    const nameTranslated = await translateText(name);
    const descTranslated = await translateText(description);

    return ok({
      name: { zh: name, en: nameTranslated.en, ms: nameTranslated.ms },
      description: { zh: description, en: descTranslated.en, ms: descTranslated.ms }
    });
  } catch (err: any) {
    console.error('Translation failed', err);
    return fail(err.message || 'Translation failed');
  }
};
