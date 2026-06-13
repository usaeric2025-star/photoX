import { analyzePhoto } from './commands';
import { translateFields } from './translationService';
import { updatePhoto } from '../photo';
import { syncPhotoTags, loadTagsFromCloud, batchCreateTags } from '../tag';
import { ok, fail } from '@/lib/error/ErrorFactory';
import { AppResult } from '@/types/api';
import { analyzeGroup, analyzeSinglePhotoDetail as analyzeSinglePhoto } from './commands';
import { updateGroup } from '../group/commands';
import { withTimeout } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { mapAiToMultilingual } from './mapping';

export * from './utils';
import { hasExistingInfo } from './utils';
import { supabase } from '@/lib/supabase';

export const analyzeAndSavePhoto = async (
  photo: any
): Promise<AppResult<unknown>> => {
  try {
    const analysis = await analyzePhoto(photo.id);
    if (!analysis.ok) return analysis;
    
    // Validate that we have something to update
    const analysisData = analysis.data as any;
    if (!analysisData.name && !analysisData.description && (!analysisData.tagNames || analysisData.tagNames.length === 0)) {
        return fail('AI 分析未返回有效結果');
    }

    const { name: nameObj, description: descObj } = await mapAiToMultilingual(
      analysisData.name,
      analysisData.description
    );

    const updateResult = await updatePhoto(photo.id, {
      name: nameObj,
      description: descObj,
      category_id: analysisData.category_id ? String(analysisData.category_id) : null,
      dimensions: analysisData.dimensions || [],
      metadata: {
        ...(photo.metadata || {}),
        ai_updated_at: new Date().toISOString()
      }
    });

    const tagNames = analysisData.tagNames || [];
    const tagIds = analysisData.tagIds || [];
    
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
          const tagSources: Record<string, "ai"> = {};
          finalTagIds.forEach(id => {
              tagSources[id] = "ai";
          });
          await syncPhotoTags(photo.id, finalTagIds, undefined, tagSources);
      }
    }

    return ok(updateResult);
  } catch (err) {
    logger.error(`[AI Orchestration] analyzeAndSavePhoto failed for ${photo.id}:`, err);
    return fail((err as Error).message || '分析照片失敗');
  }
};

export const autoGroupPhotos = async (
  photoIds: string[]
): Promise<AppResult<unknown>> => {
  try {
    const { loadPhotosByIds } = await import('../photo');
    const photos = await loadPhotosByIds(photoIds);
    
    for (let i = 0; i < photos.length; i++) {
      try {
        logger.info(`[autoGroupPhotos] Analyzing and saving single photo ${i+1}/${photos.length}: ${photos[i].id}`);
        await analyzeAndSavePhoto(photos[i]);
      } catch (err) {
        logger.error(`[autoGroupPhotos] Single photo analysis failed for ${photos[i].id}:`, err);
      }
    }

    const updatedPhotos = await loadPhotosByIds(photoIds);

    const analysis = await analyzeGroup(updatedPhotos);
    const { name: nameObj, description: descObj } = await mapAiToMultilingual(
      analysis.name,
      analysis.description
    );

    const { groupPhotos } = await import('../group/commands');
    const result = await groupPhotos(photoIds, undefined, {
      name: nameObj,
      description: descObj
    });
    
    return ok(result);
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
    const { colors, materials } = analysis;

    const { name: nameObj, description: descObj } = await mapAiToMultilingual(
      analysis.name,
      analysis.description
    );

    const res = await updateGroup(groupId, {
      name: nameObj as any,
      description: descObj as any,
      colors,
      materials
    });

    return ok(res);
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
      const { loadPhotosByIds } = await import('../photo');
      const photos = await loadPhotosByIds(targetPhotos.map(p => p.id));
      if (photos) {
        onProgress(85, '生成合组名称与描述...');
        const groupRes = await analyzeAndSaveGroup(groupId, photos);
        if (groupRes.ok) groupSuccess = true;
      }
    } catch (e) {
      logger.warn('[AI Group] Batch summary failed', e);
    }
  }

  onProgress(100, '分析流程完成');
  return { successCount, groupSuccess };
}
