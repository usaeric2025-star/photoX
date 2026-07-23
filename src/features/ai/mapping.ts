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
): Promise<{ name: TranslatedField; description: TranslatedField }> {
  let nameObj: TranslatedField = { zh: '', en: '', ms: '' };
  let descObj: TranslatedField = { zh: '', en: '', ms: '' };

  const isNameObj = rawName && typeof rawName === 'object';
  const isDescObj = rawDesc && typeof rawDesc === 'object';

  // Optimization: If AI already returned objects for both, just use them
  if (isNameObj && isDescObj) {
    const nameData = rawName as Record<string, string>;
    const descData = rawDesc as Record<string, string>;
    return {
      name: {
        zh: nameData.zh || nameData.en || '',
        en: nameData.en || nameData.zh || '',
        ms: nameData.ms || nameData.zh || ''
      },
      description: {
        zh: descData.zh || descData.en || '',
        en: descData.en || descData.zh || '',
        ms: descData.ms || descData.zh || ''
      }
    };
  }

  // Handle case where name is string but description is object (very common with current prompt)
  if (!isNameObj && isDescObj) {
    const nameStr = String(rawName || '');
    const descData = rawDesc as Record<string, string>;
    return {
      name: { zh: nameStr, en: nameStr, ms: nameStr },
      description: {
        zh: descData.zh || descData.en || '',
        en: descData.en || descData.zh || '',
        ms: descData.ms || descData.zh || ''
      }
    };
  }

  // Fallback to translation service only if necessary
  const nameStr = isNameObj ? ((rawName as Record<string, string>).zh || (rawName as Record<string, string>).en || '') : String(rawName || '');
  const descStr = isDescObj ? ((rawDesc as Record<string, string>).zh || (rawDesc as Record<string, string>).en || '') : String(rawDesc || '');
  
  if (!nameStr && !descStr) {
    return { name: nameObj, description: descObj };
  }

  try {
    const translation = await translateFields(nameStr, descStr);
    return translation;
  } catch(err) {
    ErrorFactory.capture(err);
    return {
      name: { zh: nameStr, en: nameStr, ms: nameStr },
      description: { zh: descStr, en: descStr, ms: descStr }
    };
  }
}
