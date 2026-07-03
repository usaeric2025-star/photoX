import { analyzePhoto } from './commands.js';
import { translateFields } from './translationService.js';
import { updatePhoto } from '#src/services/photo/index.js';
import { syncPhotoTags, loadTagsFromCloud, batchCreateTags } from '#src/services/tag/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { analyzeSinglePhotoDetail as analyzeSinglePhoto } from './commands.js';
import { resolveTagNamesToIds } from '#src/services/tag/completion.js';
import { withTimeout } from '#lib/utils.js';
import { logger } from '#lib/logger.js';
import { mapAiToMultilingual } from './mapping.js';

export * from './utils.js';
import { hasExistingInfo } from './utils.js';
import { supabase } from '#lib/supabase.js';
import { api } from '#lib/api.js';

import { Photo, Dimension, ProductGroup } from '#src/types/index.js';
import { queryClient } from '#src/lib/query/index.js';
import { queryKeys } from '#src/lib/query/keys.js';

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
      name: (nameObj.en || nameObj.zh || '').substring(0, 200),
      description: descObj,
      categoryId: analysisData.category_id ? String(analysisData.category_id) : (photo.categoryId || null),
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

export async function runBatchAnalysis({
  targetPhotos,
  onProgress
}: {
  targetPhotos: Photo[];
  onProgress: (progress: number, message?: string) => void;
}) {
  const totalPhotosToProcess = targetPhotos.length;
  let successCount = 0;

  for (let i = 0; i < targetPhotos.length; i++) {
    const p = targetPhotos[i];
    const currentProgress = ((i) / totalPhotosToProcess);

    try {
      onProgress(currentProgress, `正在分析照片 ${i + 1}/${totalPhotosToProcess}`);
      await analyzeAndSavePhoto(p);
      successCount++;
    } catch (err) {
      ErrorFactory.handle(err, { context: `[AI Batch] Photo ${p.id} error` });
    }
  }

  onProgress(0.9, '分析完成');
  await queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  onProgress(1, '分析流程完成');
  
  return { successCount, groupSuccess: false };
}
