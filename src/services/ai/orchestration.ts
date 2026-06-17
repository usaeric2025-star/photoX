import { analyzePhoto } from './commands';
import { translateFields } from './translationService';
import { updatePhoto } from '../photo';
import { syncPhotoTags, loadTagsFromCloud, batchCreateTags } from '../tag';
import { ErrorFactory } from '@/lib/error/ErrorFactory';
import { analyzeGroup, analyzeSinglePhotoDetail as analyzeSinglePhoto } from './commands';
import { updateGroup } from '../group/commands';
import { withTimeout } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { mapAiToMultilingual } from './mapping';

export * from './utils';
import { hasExistingInfo } from './utils';
import { supabase } from '@/lib/supabase';

import { Photo, Dimension, ProductGroup } from '@/types';

interface PhotoAnalysisResponse {
  name?: unknown;
  description?: unknown;
  category_id?: string | number | null;
  group_id?: string | number | null;
  dimensions?: Dimension[];
  tagNames?: string[];
  tagIds?: string[];
}

export const analyzeAndSavePhoto = async (
  photo: Photo
): Promise<unknown> => {
  try {
    const analysisData = (await analyzePhoto(photo.id)) as PhotoAnalysisResponse;
    
    // Validate that we have something to update
    if (!analysisData.name && !analysisData.description && (!analysisData.tagNames || analysisData.tagNames.length === 0)) {
        throw ErrorFactory.fatal('AI 分析未返回有效結果', { context: 'analyzeAndSavePhoto' });
    }

    const { name: nameObj, description: descObj } = await mapAiToMultilingual(
      analysisData.name,
      analysisData.description
    );

    const updateResult = await updatePhoto(photo.id, {
      name: nameObj,
      description: descObj,
      category_id: analysisData.category_id ? String(analysisData.category_id) : null,
      group_id: analysisData.group_id ? String(analysisData.group_id) : null,
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
         try {
             const resolveResult = await resolveTagNamesToIds(tagNames, []);
             if (resolveResult.length > 0) {
                 finalTagIds = [...finalTagIds, ...resolveResult];
             }
         } catch(e) {}
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

    return updateResult;
  } catch (err) {
    logger.error(`[AI Orchestration] analyzeAndSavePhoto failed for ${photo.id}:`, err);
    throw ErrorFactory.fatal((err as Error).message || '分析照片失敗', { context: 'analyzeAndSavePhoto' });
  }
};

export const autoGroupPhotos = async (
  photoIds: string[]
): Promise<unknown> => {
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
      name: nameObj as unknown as Record<string, string>,
      description: descObj as unknown as Record<string, string>
    });
    
    return result;
  } catch (err) {
    throw ErrorFactory.fatal((err as Error).message || '自动合组失败', { context: 'autoGroupPhotos' });
  }
};

interface GroupAnalysisResponse {
  name?: unknown;
  description?: unknown;
  colors?: string[];
  materials?: string[];
}

export const analyzeAndSaveGroup = async (
  groupId: string,
  photos: Photo[]
): Promise<unknown> => {
  try {
    const analysis = (await withTimeout(analyzeGroup(photos), 120000)) as GroupAnalysisResponse; // 120s
    const { colors, materials } = analysis;

    const { name: nameObj, description: descObj } = await mapAiToMultilingual(
      analysis.name,
      analysis.description
    );

    const res = await updateGroup(groupId, {
      name: nameObj as unknown as string,
      colors,
      materials
    } as unknown as Partial<ProductGroup>);

    return res;
  } catch (err) {
    throw ErrorFactory.fatal((err as Error).message || '合组分析失败', { context: 'analyzeAndSaveGroup' });
  }
};

export async function runBatchAnalysis({
  targetPhotos,
  groupId,
  onProgress
}: {
  targetPhotos: Photo[];
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
      await analyzeAndSavePhoto(p);
      successCount++;
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
        await analyzeAndSaveGroup(groupId, photos);
        groupSuccess = true;
      }
    } catch (e) {
      logger.warn('[AI Group] Batch summary failed', e);
    }
  }

  onProgress(100, '分析流程完成');
  return { successCount, groupSuccess };
}
