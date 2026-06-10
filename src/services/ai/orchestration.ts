import { analyzePhoto } from './analysisService';
import { translateFields } from './translationService';
import { updatePhoto } from '../photo/commands';
import { syncPhotoTags, loadTagsFromCloud, batchCreateTags } from '../tag';
import { ok, fail } from '@/lib/utils/result';
import { AppResult } from '@/types/api';
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
  if (!analysis.ok) return analysis;

  // 2. 補全翻譯 (Model B: Agnes)
  const translation = await translateFields(analysis.data.name, analysis.data.description);
  if (!translation.ok) return translation;

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
    const { resolveTagNamesToIds } = await import('../tag/completion');
    const { syncPhotoTags } = await import('../tag/commands');
    
    const resolveResult = await resolveTagNamesToIds(tagNames, existingTags);
    if (resolveResult.ok && resolveResult.data.length > 0) {
        await syncPhotoTags(photo.id, resolveResult.data);
    }
  }

  // 5. 保存原始識別源代碼到 photo_ai_results 數據表中 (非阻塞)
  if (photo.id && analysis.data) {
    const rawResultText = (analysis.data as any).raw_result || JSON.stringify(analysis.data);
    (async () => {
        try {
            const { error } = await supabase.from('photo_ai_results').upsert({
                photo_id: photo.id,
                raw_result: rawResultText,
                parsed_data: analysis.data,
                created_at: new Date().toISOString()
            }, { onConflict: 'photo_id' });
            if (error) {
                console.warn(`[photo_ai_results-save-failed]`, error.message);
            } else {
                console.log(`[photo_ai_results-save-success] Saved client-side raw output for photo ID: ${photo.id}`);
            }
        } catch (e: any) {
            console.warn(`[photo_ai_results-save-critical]`, e);
        }
    })();
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
    // 1. Prefetch metadata for single photo analysis
    let dbCategories: any[] = [];
    let dbTags: any[] = [];
    try {
      const [{ data: catsRes }, { data: tagsRes }] = await Promise.all([
        supabase.from('categories').select('*'),
        supabase.from('tags').select('*'),
      ]);
      if (catsRes) dbCategories = catsRes;
      if (tagsRes) dbTags = tagsRes;
    } catch (e) {
      console.warn("[autoGroupPhotos] Prefetch metadata failed", e);
    }

    // 2. Load and analyze each photo first to guarantee database has filled records
    const { loadPhotosByIds } = await import('../photo/read');
    const photoRes = await loadPhotosByIds(photoIds);
    if (!photoRes.ok) return fail(photoRes.message);
    const photos = photoRes.data || [];
    
    for (let i = 0; i < photos.length; i++) {
      try {
        console.log(`[autoGroupPhotos] Analyzing and saving single photo ${i+1}/${photos.length}: ${photos[i].id}`);
        await analyzeAndSavePhoto(photos[i], settingsData, dbTags, dbCategories);
      } catch (err) {
        console.error(`[autoGroupPhotos] Single photo analysis failed for ${photos[i].id}:`, err);
      }
    }

    // 3. Reload fully updated photo data with single details for high-fidelity group analysis
    const updatedPhotoRes = await loadPhotosByIds(photoIds);
    if (!updatedPhotoRes.ok) return fail(updatedPhotoRes.message);
    const updatedPhotos = updatedPhotoRes.data || [];

    // 4. AI Analysis for the group
    const analysis = await analyzeGroup(updatedPhotos);
    const { name, description, colors, materials } = analysis;
    
    // 5. Translations
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

    // 6. Create the group
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

/**
 * Batch Analysis Orchestration
 * Moves logic out of hooks for better testability and cleaner components.
 */
export async function runBatchAnalysis({
  targetPhotos,
  groupId,
  settings,
  onProgress
}: {
  targetPhotos: any[];
  groupId?: string;
  settings: any;
  onProgress: (progress: number, message?: string) => void;
}) {
  const totalPhotosToProcess = targetPhotos.length;
  let successCount = 0;

  // 1. Prefetch metadata once
  let dbCategories: any[] = [];
  let dbTags: any[] = [];
  try {
    const [{ data: catsRes }, { data: tagsRes }] = await Promise.all([
      supabase.from('categories').select('*'),
      supabase.from('tags').select('*'),
    ]);
    if (catsRes) dbCategories = catsRes;
    if (tagsRes) dbTags = tagsRes;
  } catch (e) {
    console.warn("[AI Batch] Prefetch metadata failed", e);
  }

  // 2. Process photos
  for (let i = 0; i < targetPhotos.length; i++) {
    const p = targetPhotos[i];
    const currentProgress = ((i) / totalPhotosToProcess) * (groupId ? 70 : 100);

    try {
      onProgress(currentProgress, `正在分析照片 ${i + 1}/${totalPhotosToProcess}`);
      // Pass a flag to force analysis if needed, or simply let it do its job. 
      // User says: "Even if it has info, re-analyze it" since they clicked the batch trigger.
      const result = await analyzeAndSavePhoto(p, settings, dbTags, dbCategories);
      if (result.ok) successCount++;
    } catch (err: any) {
      console.error(`[AI Batch] Photo ${p.id} error:`, err);
    }
  }

  // 3. Optional Group Analysis
  let groupSuccess = false;
  if (groupId) {
    onProgress(75, '正在總結整個合組...');
    try {
      const { loadPhotosByIds } = await import('../photo/read');
      const res = await loadPhotosByIds(targetPhotos.map(p => p.id));
      if (res.ok && res.data) {
        onProgress(85, '生成合組名稱與描述...');
        const groupRes = await analyzeAndSaveGroup(groupId, res.data, settings);
        if (groupRes.ok) groupSuccess = true;
      }
    } catch (e) {
      console.warn('[AI Group] Batch summary failed', e);
    }
  }

  onProgress(100, '分析流程完成');
  return { successCount, groupSuccess };
}
