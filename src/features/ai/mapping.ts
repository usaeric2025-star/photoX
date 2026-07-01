import { translateFields } from "./translationService";
import { ErrorFactory } from '#lib/error/ErrorFactory';
import { logger } from "#lib/logger";

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

  if (isNameObj && isDescObj) {
    const nameData = rawName as Record<string, string>;
    const descData = rawDesc as Record<string, string>;
    nameObj = {
      zh: nameData.zh || '',
      en: nameData.en || nameData.zh || '',
      ms: nameData.ms || nameData.zh || ''
    };
    descObj = {
      zh: descData.zh || '',
      en: descData.en || descData.zh || '',
      ms: descData.ms || descData.zh || ''
    };
  } else {
    const nameStr = isNameObj ? ((rawName as Record<string, string>).zh || '') : String(rawName || '');
    const descStr = isDescObj ? ((rawDesc as Record<string, string>).zh || '') : String(rawDesc || '');
    
    if (!nameStr && !descStr) {
        return { name: nameObj, description: descObj };
    }

    try {
      const translation = await translateFields(nameStr, descStr);
      nameObj = translation.name;
      descObj = translation.description;
    } catch(err) {
      ErrorFactory.capture(err);
      nameObj = { zh: nameStr, en: nameStr, ms: nameStr };
      descObj = { zh: descStr, en: descStr, ms: descStr };
    }
  }

  return { name: nameObj, description: descObj };
}
