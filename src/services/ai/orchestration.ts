import { analyzePhoto } from './commands';
import { translateFields } from './translationService';
import { updatePhoto } from '../photo/commands';
import { syncPhotoTags, loadTagsFromCloud, batchCreateTags } from '../tag';
import { ok, fail } from '@/lib/utils/result';
import { AppResult } from '@/types/api';
import { analyzeGroup, analyzeSinglePhotoDetail as analyzeSinglePhoto } from './commands';
import { updateGroup } from '../group/commands';
import { withTimeout } from '@/lib/utils';
import { logger } from '@/lib/logger';

export * from './utils';
import { hasExistingInfo } from './utils';
import { supabase } from '@/lib/supabase';

export const analyzeAndSavePhoto = async (
  photo: any
): Promise<AppResult<unknown>> => {
  const analysis = await analyzePhoto(photo.id);
  if (!analysis.ok) return analysis;
  
  // Validate that we have something to update
  if (!(analysis.data as any).name && !(analysis.data as any).description && (!(analysis.data as any).tagNames || (analysis.data as any).tagNames.length === 0)) {
      return fail('AI 分析未返回有效结果');
  }

  const translation = await translateFields((analysis.data as any).name, (analysis.data as any).description);
  if (!translation.ok) return translation;

  const updateResult = await updatePhoto(photo.id, {
    name: {
      zh: (analysis.data as any).name,
      en: translation.data.name.en,
      ms: translation.data.name.ms
    },
    description: {
      zh: (analysis.data as any).description || '',
      en: translation.data.description.en,
      ms: translation.data.description.ms
    },
    category_id: (analysis.data as any).category_id ? String((analysis.data as any).category_id) : null,
    dimensions: (analysis.data as any).dimensions || [],
    metadata: {
      ...(photo.metadata || {}),
      ai_updated_at: new Date().toISOString()
    }
  });
  if (!updateResult.ok) {
    return fail(updateResult.message);
  }

  const tagNames = (analysis.data as any).tagNames || [];
  const tagIds = (analysis.data as any).tagIds || [];
  
  if (tagNames.length > 0 || tagIds.length > 0) {
    const { resolveTagNamesToIds } = await import('../tag/completion');
    const { syncPhotoTags } = await import('../tag/commands');
    
    let finalTagIds = [...tagIds];
    if (tagNames.length > 0) {
       const resolveResult = await resolveTagNamesToIds(tagNames, []);
       if (resolveResult.ok && resolveResult.data.length > 0) {
           finalTagIds = [...finalTagIds, ...resolveResult.data];
       }
    }
    
    finalTagIds = Array.from(new Set(finalTagIds.map(String)));
    
    if (finalTagIds.length > 0) {
        await syncPhotoTags(photo.id, finalTagIds);
    }
  }

  return ok(updateResult.data);
};

export const autoGroupPhotos = async (
  photoIds: string[]
): Promise<AppResult<unknown>> => {
  try {
    const { loadPhotosByIds } = await import('../photo/read');
    const photoRes = await loadPhotosByIds(photoIds);
    if (!photoRes.ok) return fail(photoRes.message);
    const photos = photoRes.data || [];
    
    for (let i = 0; i < photos.length; i++) {
      try {
        logger.info(`[autoGroupPhotos] Analyzing and saving single photo ${i+1}/${photos.length}: ${photos[i].id}`);
        await analyzeAndSavePhoto(photos[i]);
      } catch (err) {
        logger.error(`[autoGroupPhotos] Single photo analysis failed for ${photos[i].id}:`, err);
      }
    }

    const updatedPhotoRes = await loadPhotosByIds(photoIds);
    if (!updatedPhotoRes.ok) return fail(updatedPhotoRes.message);
    const updatedPhotos = updatedPhotoRes.data || [];

    const analysis = await analyzeGroup(updatedPhotos);
    const { name, description, colors, materials } = analysis;
    
    const translatedName = { zh: name, en: '', ms: '' };
    const translatedDesc = { zh: description, en: '', ms: '' };

    try {
      const pTranslations = await translateFields(name, description);
      if (pTranslations.ok) {
        translatedName.en = pTranslations.data.name.en;
        translatedName.ms = pTranslations.data.name.ms;
        translatedDesc.en = pTranslations.data.description.en;
        translatedDesc.ms = pTranslations.data.description.ms;
      }
    } catch (e) {
      logger.warn('[autoGroupPhotos] Translations failed:', e);
    }

    const { groupPhotos } = await import('../group/commands');
    const result = await groupPhotos(photoIds, undefined, {
      name: translatedName,
      description: translatedDesc
    });
    
    if (!result.ok) return fail(result.message);
    return ok(result.data);
  } catch (err) {
    return fail((err as Error).message || '自动合组失败');
  }
};

export const analyzeAndSaveGroup = async (
  groupId: string,
  photos: any[]
): Promise<AppResult<unknown>> => {
  try {
    const analysis = await withTimeout(analyzeGroup(photos), 120000); // 120s
    const { name, description, colors, materials } = analysis;

    let translatedName = { zh: name, en: '', ms: '' };
    let translatedDesc = { zh: description, en: '', ms: '' };
    
    try {
      const pTranslations = await translateFields(name, description);
      if (pTranslations.ok) {
        translatedName.en = pTranslations.data.name.en;
        translatedName.ms = pTranslations.data.name.ms;
        translatedDesc.en = pTranslations.data.description.en;
        translatedDesc.ms = pTranslations.data.description.ms;
      }
    } catch (transErr) {
      logger.warn('[AI Group] 翻譯跳過:', transErr);
    }

    const res = await updateGroup(groupId, {
      name: translatedName as any,
      description: translatedDesc as any,
      colors,
      materials
    });

    if (!res.ok) return fail(res.message);
    return ok(res.data);
  } catch (err) {
    return fail((err as Error).message || '合组分析失败');
  }
};

export async function runBatchAnalysis({
  targetPhotos,
  groupId,
  onProgress
}: {
  targetPhotos: any[];
  groupId?: string;
  onProgress: (progress: number, message?: string) => void;
}) {
  const totalPhotosToProcess = targetPhotos.length;
  let successCount = 0;

  for (let i = 0; i < targetPhotos.length; i++) {
    const p = targetPhotos[i];
    const currentProgress = ((i) / totalPhotosToProcess) * (groupId ? 70 : 100);

    try {
      onProgress(currentProgress, `正在分析照片 ${i + 1}/${totalPhotosToProcess}`);
      const result = await analyzeAndSavePhoto(p);
      if (result.ok) successCount++;
    } catch (err) {
      logger.error(`[AI Batch] Photo ${p.id} error:`, err);
    }
  }

  let groupSuccess = false;
  if (groupId) {
    onProgress(75, '正在總結整个合组...');
    try {
      const { loadPhotosByIds } = await import('../photo/read');
      const res = await loadPhotosByIds(targetPhotos.map(p => p.id));
      if (res.ok && res.data) {
        onProgress(85, '生成合组名称与描述...');
        const groupRes = await analyzeAndSaveGroup(groupId, res.data);
        if (groupRes.ok) groupSuccess = true;
      }
    } catch (e) {
      logger.warn('[AI Group] Batch summary failed', e);
    }
  }

  onProgress(100, '分析流程完成');
  return { successCount, groupSuccess };
}
