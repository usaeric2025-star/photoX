import { analyzePhoto } from './analysisService';
import { translateFields } from './translationService';
import { updatePhoto } from '../photo/commands';
import { syncPhotoTags, loadTagsFromCloud, batchCreateTags } from '../tag';
import { ok, fail } from '@/lib/utils/result';
import type { AppResult } from '@/lib/types/result';
import { analyzeGroup, analyzeSinglePhoto } from '../gemini/groupAnalysis';
import { translateProductFields } from '../gemini/translationCore';
import { updateGroup } from '../group/commands';
import { withTimeout } from '@/lib/utils';

// Newly added utility imports
export * from './utils';
import { hasExistingInfo } from './utils';
import { supabase } from '@/lib/supabase';

/**
 * Single Photo Orchestration: AI Analysis + Translation + Persistence
 */
export const analyzeAndSavePhoto = async (
  photo: any, 
  settingsData: any, 
  existingTags?: any[], 
  existingCategories?: any[]
): Promise<AppResult<any>> => {
  const analysis = await analyzePhoto(
      photo.image_url, 
      existingCategories || [], 
      existingTags || [], 
      settingsData?.custom_model || 'gemini-1.5-flash', 
      settingsData?.gemini_api_key || ''
  );
  if (!analysis.success) return analysis;

  // 2. 補全翻譯 (Model B: Agnes)
  const translation = await translateFields(analysis.data.name, analysis.data.description);
  if (!translation.success) return translation;

  // 3. 保存照片基礎信息
  const updateResult = await updatePhoto(photo.id, {
    name: {
      zh: analysis.data.name,
      en: translation.data.name.en,
      ms: translation.data.name.ms
    },
    description: {
      zh: analysis.data.description || '',
      en: translation.data.description.en,
      ms: translation.data.description.ms
    },
    category_id: analysis.data.category_id
  });
  if (!updateResult.ok) {
    return fail(updateResult.message);
  }

  // 4. 標籤處理 (解決名稱到 ID 的轉換)
  const tagNames = analysis.data.tagNames;
  if (tagNames && tagNames.length > 0) {
    try {
      const dbTags = existingTags && existingTags.length > 0 ? existingTags : await loadTagsFromCloud();
      const tagIds: string[] = [];
      const missingNames: string[] = [];

      tagNames.forEach((name: string) => {
        const normalized = name.toUpperCase().trim();
        const existing = dbTags.find(t => 
           (t.name && t.name.toUpperCase() === normalized) || 
           (t.aliases && Array.isArray(t.aliases) && t.aliases.some((a: string) => a.toUpperCase() === normalized))
        );
        if (existing) {
          tagIds.push(String(existing.id));
        } else {
          missingNames.push(normalized);
        }
      });

      if (missingNames.length > 0) {
        const createResult = await batchCreateTags(missingNames);
        if (createResult.ok && createResult.data) {
          createResult.data.forEach((id: string) => tagIds.push(id));
        }
      }

      if (tagIds.length > 0) {
        const tagSyncResult = await syncPhotoTags(photo.id, tagIds);
        if (!tagSyncResult.ok) {
          console.error(`[AI] 標籤同步失敗: ${photo.id}`, tagSyncResult.message);
        }
      }
    } catch (tagErr) {
      console.warn(`[AI] 標籤解析流程非致命失敗: ${photo.id}`, tagErr);
    }
  }

  return ok(updateResult.data);
};

/**
 * High-level orchestration for AI-powered auto grouping.
 * Combines photo analysis, group creation, and translations.
 */
export const autoGroupPhotos = async (
  photoIds: string[],
  settingsData: any
): Promise<AppResult<any>> => {
  try {
    // 1. Load photo data
    const { loadPhotosByIds } = await import('../photo/read');
    const photoRes = await loadPhotosByIds(photoIds);
    if (!photoRes.ok) return fail(photoRes.message);
    const photos = photoRes.data || [];
    
    // 2. AI Analysis for the group
    const analysis = await analyzeGroup(photos);
    const { name, description, colors, materials } = analysis;
    
    // 3. Translations
    const translatedName = { ...name };
    const translatedDesc = { zh: description, en: description, ms: description };

    try {
      const pTranslations = await translateProductFields({
        name: name.zh,
        description,
        colors,
        materials
      }, settingsData?.gemini_api_key || '', settingsData?.custom_model || '');

      translatedName.en = pTranslations.name_en || name.en || name.zh;
      translatedName.ms = pTranslations.name_ms || name.ms || name.zh;
      translatedDesc.en = pTranslations.description_en || description;
      translatedDesc.ms = pTranslations.description_ms || description;
    } catch (e) {
      console.warn('[autoGroupPhotos] Translations failed:', e);
    }

    // 4. Create the group
    const { groupPhotos } = await import('../group/commands');
    const result = await groupPhotos(photoIds, undefined, {
      name: translatedName,
      description: translatedDesc
    });
    
    if (!result.ok) return fail(result.message);
    return ok(result.data);
  } catch (err: any) {
    return fail(err.message || '自动合组失败');
  }
};

/**
 * Group Orchestration: Analysis + Translation + Persistence
 */
export const analyzeAndSaveGroup = async (
  groupId: string,
  photos: any[],
  settingsData: any
): Promise<AppResult<any>> => {
  // 1. Group Summary Analysis
  try {
    const analysis = await withTimeout(analyzeGroup(photos), 120000); // 120s
    const { name, description, colors, materials } = analysis;

    const finalName = typeof name === 'object' ? name : { zh: name, en: '', ms: '' };
    const finalDescription = typeof description === 'object' ? description : { zh: description, en: '', ms: '' };

    // 2. Translation
    let translatedName = { ...finalName };
    let translatedDesc = { ...finalDescription };
    
    try {
      const pTranslations = await translateProductFields({
        name: String(finalName.zh || finalName || ''),
        description: String(finalDescription.zh || finalDescription || ''),
        colors,
        materials
      }, settingsData?.gemini_api_key || '', settingsData?.custom_model || '');

      translatedName.en = pTranslations.name_en || translatedName.en || translatedName.zh;
      translatedName.ms = pTranslations.name_ms || translatedName.ms || translatedName.zh;
      translatedDesc.en = pTranslations.description_en || translatedDesc.en || translatedDesc.zh;
      translatedDesc.ms = pTranslations.description_ms || translatedDesc.ms || translatedDesc.zh;
    } catch (transErr) {
      console.warn('[AI Group] 翻譯跳過:', transErr);
    }

    // 3. Persist
    const res = await updateGroup(groupId, {
      name: translatedName as any,
      description: translatedDesc as any,
      colors,
      materials
    });

    if (!res.ok) return fail(res.message);
    return ok(res.data);
  } catch (err: any) {
    return fail(err.message || '合组分析失败');
  }
};
