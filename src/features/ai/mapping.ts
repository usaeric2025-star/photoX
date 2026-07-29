import { translateFields } from "./translationService.js";
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { logger } from "#lib/logger.js";

export interface TranslatedField {
  zh: string;
  en: string;
  ms: string;
}

/**
 * Maps AI raw output to structured multilingual objects.
 * Handles both pre-translated objects and raw strings that need translation.
 */
export async function mapAiToMultilingual(
  rawName: unknown,
  rawDesc: unknown
): Promise<{ name: string; description: TranslatedField }> {
  let nameStr = '';
  let descObj: TranslatedField = { zh: '', en: '', ms: '' };

  const isNameObj = rawName && typeof rawName === 'object';
  const isDescObj = rawDesc && typeof rawDesc === 'object';

  // Extract name string
  if (isNameObj) {
    const nameData = rawName as Record<string, string>;
    nameStr = nameData.en || nameData.zh || nameData.ms || '';
  } else {
    nameStr = String(rawName || '');
  }

  // Extract description object
  if (isDescObj) {
    const descData = rawDesc as Record<string, string>;
    descObj = {
      zh: descData.zh || descData.en || descData.ms || '',
      en: descData.en || descData.zh || '',
      ms: descData.ms || descData.zh || ''
    };
  } else {
    const descStr = String(rawDesc || '');
    descObj = { zh: descStr, en: descStr, ms: descStr };
  }

  return { name: nameStr, description: descObj };
}
