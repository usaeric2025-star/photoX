import { Photo, Tag } from '#src/types/index.js';
import { PhotoEditFormData } from '#lib/valibot/schemas/photo.js';
import { toSingleString, toMultiObject } from '#lib/forms/utils.js';
import { logger } from '#lib/logger.js';
import { PhotoAIAdapterRegistry } from '#src/features/ai/types.js';
import { generateItemCode } from '#src/utils/photo.js';
import { photoEditAdapter } from '#lib/forms/index.js';
import { REGEX, PLACEHOLDERS } from '#src/constants/config.js';

/**
 * PhotoEditFormService
 * 
 * 處理照片編輯表單的數據轉換與業務邏輯。
 */
export const PhotoEditFormService = {
  /**
   * 將原始照片數據轉換為表單初始值
   */
  getInitialValues: (photo: Partial<Photo> | null): PhotoEditFormData => {
    if (!photo) return {} as PhotoEditFormData;
    const p = photo;
    const metadata = (p.metadata || {}) as Record<string, any>;
    
    let name = toSingleString(p.name);
    let description = toMultiObject(p.description);
    let categoryId = p.categoryId ?? null;
    let groupId = p.groupId ?? null;
    let tags = p.tags ?? null;
    let dimensions = p.dimensions ?? null;
    let itemCode = p.itemCode ?? null;

    // AI 數據回填邏輯
    if (metadata.ai_raw) {
      try {
        let rawJson = metadata.ai_raw;
        if (typeof rawJson === 'string') {
          const cleanRaw = rawJson.replace(REGEX.MD_JSON_CODE_BLOCK, '').trim();
          rawJson = JSON.parse(cleanRaw);
        }
        
        if (rawJson) {
          const adapter = PhotoAIAdapterRegistry.getAdapter('gemini');
          const normalized = adapter.normalize(rawJson, JSON.stringify(rawJson));
          
          const isGenericName = !name || name === PLACEHOLDERS.EMPTY_VAL || name === '' || REGEX.GENERIC_PHOTO_NAME.test(name) || REGEX.IMAGE_EXTENSIONS.test(name);
          if (normalized.name && isGenericName) {
            name = normalized.name.replace(REGEX.IMAGE_EXTENSIONS, '').trim();
          }

          const isDescEmpty = !description.zh || description.zh === PLACEHOLDERS.EMPTY_VAL || description.zh === '';
          if (normalized.description && isDescEmpty) {
            description = {
              zh: normalized.description.zh || '',
              en: normalized.description.en || normalized.description.zh || '',
              ms: normalized.description.ms || normalized.description.zh || '',
            };
          }

          if (normalized.categoryId && !categoryId) categoryId = Number(normalized.categoryId);
          if (normalized.groupId && !groupId) groupId = normalized.groupId;

          const isDimsEmpty = !dimensions || dimensions.length === 0 || (dimensions.length === 1 && dimensions[0].label === PLACEHOLDERS.EMPTY_VAL);
          if (normalized.dimensions && normalized.dimensions.length > 0 && isDimsEmpty) {
            dimensions = normalized.dimensions.map(d => ({
              ...d,
              id: d.id || crypto.randomUUID(),
              isAi: true,
              isAiEstimated: true
            }));
          }
        }
      } catch (e) {
        logger.warn('[PhotoEditFormService] Failed to parse ai_raw into initial values:', e);
      }
    }

    return {
      name,
      description,
      categoryId,
      manufacturerId: p.manufacturerId ?? null,
      groupId,
      isGroupCover: p.isGroupCover ?? false,
      price: p.price ?? null,
      note: p.note ?? null,
      manualCode: p.manualCode ?? null,
      modelNumber: p.modelNumber ?? null,
      dimensions,
      isHidden: p.isHidden ?? false,
      tags,
      itemCode,
    } as unknown as PhotoEditFormData;
  },

  /**
   * 將表單提交數據轉換為後端保存格式
   */
  prepareSaveData: (values: PhotoEditFormData, photoId: string, originalPhoto: Partial<Photo> | null) => {
    const finalValues = { ...values };
    if (!finalValues.itemCode) {
      finalValues.itemCode = generateItemCode();
    }

    return photoEditAdapter(finalValues, photoId, {
      tags: Array.isArray(finalValues.tags) 
        ? (finalValues.tags as (Tag | string)[]).map((t) => typeof t === 'object' ? String(t.id ?? '') : String(t)).filter(Boolean) 
        : null,
      createdAt: originalPhoto?.createdAt,
      updatedAt: new Date().toISOString(),
    } as Record<string, unknown>);
  }
};
