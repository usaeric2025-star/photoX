import { analyzePhoto } from './commands.js';
import { translateFields } from './translationService.js';
import { updatePhoto } from '#src/services/photo/index.js';
import { syncPhotoTags, loadTagsFromCloud, batchCreateTags } from '#src/services/tag/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { analyzeGroup, analyzeSinglePhotoDetail as analyzeSinglePhoto } from './commands.js';
import { updateGroup, groupPhotos } from '#src/services/group/commands.js';
import { resolveTagNamesToIds } from '#src/services/tag/completion.js';
import { withTimeout } from '#lib/utils.js';
import { logger } from '#lib/logger.js';
import { mapAiToMultilingual } from './mapping.js';

export * from './utils.js';
import { hasExistingInfo } from './utils.js';
import { supabase } from '#lib/supabase.js';
import { api } from '#lib/api.js';

import { Photo, Dimension, ProductGroup } from '#src/types/index.js';

interface PhotoAnalysisResponse {
  name?: unknown;
  description?: unknown;
  category_id?: string | number | null;
  group_id?: string | number | null;
  dimensions?: Dimension[];
  tagNames?: string[];
  tagIds?: string[];
  raw_result?: string;
}

const analyzeAndSavePhoto = async (
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
      name: nameObj.en || nameObj.zh || '',
      description: descObj,
      categoryId: analysisData.category_id ? String(analysisData.category_id) : (photo.categoryId || null),
      groupId: analysisData.group_id ? String(analysisData.group_id) : (photo.groupId || null),
      dimensions: analysisData.dimensions || [],
      metadata: {
        ...(photo.metadata as Record<string, unknown> || {}),
        ai_updated_at: new Date().toISOString(),
        ai_raw: analysisData.raw_result || null
      }
    });

    const tagNames = analysisData.tagNames || [];
    const tagIds = analysisData.tagIds || [];
    
    if (tagNames.length > 0 || tagIds.length > 0) {
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
    ErrorFactory.handle(err, { context: `[AI Orchestration] analyzeAndSavePhoto failed for ${photo.id}` });
    throw ErrorFactory.fatal((err as Error).message || '分析照片失敗', { context: 'analyzeAndSavePhoto' });
  }
};

export const autoGroupPhotos = async (
  photoIds: string[]
): Promise<unknown> => {
  try {
    const response = await api.photos['by-ids'].$post({ json: { ids: photoIds } });
    const body = await response.json();
    const photos = body.success ? body.data || [] : [];
    
    for (let i = 0; i < photos.length; i++) {
      try {
        const p = photos[i] as Photo;
        logger.info(`[autoGroupPhotos] Analyzing and saving single photo ${i+1}/${photos.length}: ${p.id}`);
        await analyzeAndSavePhoto(p);
      } catch (err) {
        ErrorFactory.handle(err, { context: '[autoGroupPhotos] Single photo analysis failed' });
      }
    }

    const refreshResponse = await api.photos['by-ids'].$post({ json: { ids: photoIds } });
    const refreshBody = await refreshResponse.json();
    const updatedPhotos = (refreshBody.success ? refreshBody.data || [] : []) as Photo[];

    const analysis = await analyzeGroup(updatedPhotos);

    const { name: nameObj, description: descObj } = await mapAiToMultilingual(
      analysis.name,
      analysis.description
    );

    const result = await groupPhotos(photoIds, undefined, {
      name: nameObj.en || nameObj.zh || '',
      description: descObj.en || descObj.zh || ''
    });
    
    return result;
  } catch (err) {
    throw ErrorFactory.fatal((err as Error).message || '自动合组失败', { context: 'autoGroupPhotos' });
  }
};

interface GroupAnalysisResponse {
  name?: unknown;
  description?: unknown;
}

const analyzeAndSaveGroup = async (
  groupId: string,
  photos: Photo[]
): Promise<unknown> => {
  try {
    const analysis = (await withTimeout(analyzeGroup(photos), 120000, 'AI Analyze Group Materials & Colors')) as GroupAnalysisResponse; // 120s
    const { name: nameObj, description: descObj } = await mapAiToMultilingual(
      analysis.name,
      analysis.description
    );

    const res = await updateGroup(groupId, {
      name: nameObj.en || nameObj.zh || ''
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
    const currentProgress = ((i) / totalPhotosToProcess) * (groupId ? 0.7 : 1);

    try {
      onProgress(currentProgress, `正在分析照片 ${i + 1}/${totalPhotosToProcess}`);
      await analyzeAndSavePhoto(p);
      successCount++;
    } catch (err) {
      ErrorFactory.handle(err, { context: `[AI Batch] Photo ${p.id} error` });
    }
  }

  let groupSuccess = false;
  if (groupId) {
    onProgress(0.75, '正在總結整个合组...');
    try {
      const response = await api.photos['by-ids'].$post({ json: { ids: targetPhotos.map(p => p.id) } });
      const body = await response.json();
      const photos = (body.success ? body.data || [] : []) as Photo[];
      
      if (photos.length > 0) {
        onProgress(0.85, '生成合组名称与描述...');
        await analyzeAndSaveGroup(groupId, photos);
        groupSuccess = true;
      }
    } catch (e) {
      logger.warn('[AI Group] Batch summary failed', e);
    }
  } else {
    onProgress(0.75, '正在將照片自動合組...');
    try {
      const response = await api.photos['by-ids'].$post({ json: { ids: targetPhotos.map(p => p.id) } });
      const body = await response.json();
      const photos = (body.success ? body.data || [] : []) as Photo[];
      
      if (photos.length > 0) {
        onProgress(0.85, '生成合组名称与描述...');
        const analysis = await analyzeGroup(photos);
        const { name: nameObj, description: descObj } = await mapAiToMultilingual(
          analysis.name,
          analysis.description
        );
        await groupPhotos(targetPhotos.map(p => p.id), undefined, {
          name: nameObj.en || nameObj.zh || '',
          description: descObj.en || descObj.zh || ''
        });
        groupSuccess = true;
      }
    } catch (e) {
      logger.warn('[AI Group] Auto grouping failed', e);
    }
  }

  onProgress(1, '分析流程完成');
  return { successCount, groupSuccess };
}
