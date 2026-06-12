import { AppResult } from "@/types/api";
import { translateFields } from "./translationService";

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
  rawName: any,
  rawDesc: any
): Promise<{ name: TranslatedField; description: TranslatedField }> {
  let nameObj: TranslatedField = { zh: '', en: '', ms: '' };
  let descObj: TranslatedField = { zh: '', en: '', ms: '' };

  const isNameObj = rawName && typeof rawName === 'object';
  const isDescObj = rawDesc && typeof rawDesc === 'object';

  if (isNameObj && isDescObj) {
    nameObj = {
      zh: rawName.zh || '',
      en: rawName.en || rawName.zh || '',
      ms: rawName.ms || rawName.zh || ''
    };
    descObj = {
      zh: rawDesc.zh || '',
      en: rawDesc.en || rawDesc.zh || '',
      ms: rawDesc.ms || rawDesc.zh || ''
    };
  } else {
    const nameStr = isNameObj ? (rawName.zh || '') : String(rawName || '');
    const descStr = isDescObj ? (rawDesc.zh || '') : String(rawDesc || '');
    
    if (!nameStr && !descStr) {
        return { name: nameObj, description: descObj };
    }

    const translation = await translateFields(nameStr, descStr);
    if (translation.ok) {
      nameObj = translation.data.name;
      descObj = translation.data.description;
    } else {
      nameObj = { zh: nameStr, en: nameStr, ms: nameStr };
      descObj = { zh: descStr, en: descStr, ms: descStr };
    }
  }

  return { name: nameObj, description: descObj };
}
