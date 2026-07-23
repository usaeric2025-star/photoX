import { analyzePhoto, analyzeSinglePhotoDetail as analyzeSinglePhoto } from './AICommands.js';
import { translateFields } from './translationService.js';
import { updatePhoto } from '#src/hooks/photo/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { resolveTagNamesToIds } from './tagCompletion.js';
import { withTimeout } from '#lib/utils.js';
import { logger } from '#lib/logger.js';
import { mapAiToMultilingual } from './mapping.js';
import { api } from '#lib/api.js';

export * from './utils.js';
import { hasExistingInfo } from './utils.js';
import { supabase } from '#lib/supabase.js';

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
    // Speed up by using thumbnail for AI analysis if available
    const analysisData = (await analyzePhoto(photo.id, photo.thumbnailUrl as string)) as PhotoAnalysisResponse;
    
    // Validate that we have something to update
    if (!analysisData.name && !analysisData.description && (!analysisData.tagNames || analysisData.tagNames.length === 0)) {
        throw new Error('AI 分析未返回有效結果');
    }

    const { name: nameObj, description: descObj } = await mapAiToMultilingual(
      analysisData.name,
      analysisData.description
    );

    const updateResult = await updatePhoto(photo.id, {
      name: (nameObj.en || nameObj.zh || '').substring(0, 200),
      description: descObj,
      categoryId: analysisData.category_id != null ? Number(analysisData.category_id) : (photo.categoryId ?? null),
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
      let finalTagIds: (string | number)[] = [...tagIds];
      if (tagNames.length > 0) {
         try {
             const resolveResult = await resolveTagNamesToIds(tagNames, []);
             if (resolveResult.length > 0) {
                 finalTagIds = [...finalTagIds, ...resolveResult];
             }
         } catch(e) {}
      }
      
      const stringifiedIds = Array.from(new Set(finalTagIds.map(String)));
      
      if (stringifiedIds.length > 0) {
          const tagSources: Record<string, "ai"> = {};
          stringifiedIds.forEach(id => {
              tagSources[id] = "ai";
          });
          await api.tags['sync-photo-tags'].$post({
              json: { photoId: photo.id, tagIds: stringifiedIds, tagSources }
          });
      }
    }

    return updateResult;
  } catch (err) {
    ErrorFactory.handle(err, { context: `[AI Orchestration] analyzeAndSavePhoto failed for ${photo.id}` });
    throw new Error((err as Error).message || '分析照片失敗');
  }
};

export async function runBatchAnalysis({
  targetPhotos,
  onProgress,
  signal
}: {
  targetPhotos: Photo[];
  onProgress: (progress: number, message?: string) => void;
  signal?: AbortSignal;
}) {
  const totalPhotosToProcess = targetPhotos.length;
  let finishedCount = 0;
  const CONCURRENCY = 3; // Process 3 photos at a time to avoid overwhelming the API/DB

  onProgress(0.05, `正在準備分析 ${totalPhotosToProcess} 張照片...`);

  // Simple concurrency pool
  const processPhoto = async (photo: Photo, index: number) => {
    if (signal?.aborted) return;
    
    try {
      await analyzeAndSavePhoto(photo);
    } catch (err) {
      ErrorFactory.handle(err, { context: `[AI Batch] Photo ${photo.id} error` });
    } finally {
      finishedCount++;
      const progress = Math.min(0.85, (finishedCount / totalPhotosToProcess) * 0.85);
      onProgress(progress, `已完成 ${finishedCount}/${totalPhotosToProcess} 張照片分析`);
    }
  };

  // Simple concurrency pool using a sliding window
  const queue = [...targetPhotos];
  const workers = Array(Math.min(CONCURRENCY, queue.length)).fill(null).map(async () => {
    while (queue.length > 0 && !signal?.aborted) {
      const photo = queue.shift();
      if (photo) {
        await processPhoto(photo, 0); // index doesn't matter here
      }
    }
  });

  await Promise.all(workers);

  if (signal?.aborted) {
    throw new Error('User cancelled AI analysis');
  }

  onProgress(0.92, '正在刷新相冊數據...');
  await queryClient.invalidateQueries({ queryKey: queryKeys.photos.all });
  onProgress(1, 'AI 識別流程完成');
  
  return { successCount: finishedCount, groupSuccess: false };
}
