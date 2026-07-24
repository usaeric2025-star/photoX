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

/**
 * Maps AI raw response to photo update payload.
 * Unifies the parsing logic used in both single analysis and batch processing.
 */
export async function mapAnalysisToUpdates(
  result: any,
  allTags: any[] = [],
  categories: any[] = []
): Promise<Record<string, any>> {
  const { name: nameStr, description: descObj } = await mapAiToMultilingual(
    result.name || result.productName,
    result.description || result.productStory
  );

  const updates: Record<string, any> = {
    name: nameStr.substring(0, 200),
    description: descObj,
  };

  // 1. Group / Grouping
  const rawGroup = result.groupId || result.group_id;
  if (rawGroup && String(rawGroup) !== 'null') {
    updates.groupId = String(typeof rawGroup === 'object' ? (rawGroup as any).id : rawGroup);
  }

  // 2. Category
  const rawCatId = result.category_id || result.categoryId;
  const rawCatName = result.category_name || result.categoryName;
  let matchedCatId: number | null = null;
  
  if (rawCatId && categories.find(c => String(c.id) === String(rawCatId))) {
    matchedCatId = Number(rawCatId);
  } else if (rawCatName) {
    const found = categories.find(c => c.name.toLowerCase() === String(rawCatName).toLowerCase());
    if (found) matchedCatId = Number(found.id);
  }
  if (matchedCatId) updates.categoryId = matchedCatId;

  // 3. Tags
  const tagNames = Array.isArray(result.tagNames) ? result.tagNames : (Array.isArray(result.tag_names) ? result.tag_names : []);
  const tagIds = Array.isArray(result.tagIds) ? result.tagIds : (Array.isArray(result.tag_ids) ? result.tag_ids : []);
  
  if (tagNames.length > 0 || tagIds.length > 0) {
    const finalTagIds = await resolveTagNamesToIds([...tagIds, ...tagNames], allTags);
    if (finalTagIds.length > 0) {
      updates.resolvedTagIds = finalTagIds;
    }
  }

  // 4. Dimensions
  if (Array.isArray(result.dimensions)) {
    updates.dimensions = result.dimensions;
  }

  // 5. Codes
  if (result.itemCode || result.item_code) updates.itemCode = String(result.itemCode || result.item_code);
  if (result.manualCode || result.manual_code) updates.manualCode = String(result.manualCode || result.manual_code);
  if (result.modelNumber || result.model_number) updates.modelNumber = String(result.modelNumber || result.model_number);

  return updates;
}

const analyzeAndSavePhoto = async (
  photo: Photo
): Promise<unknown> => {
  try {
    const analysisData = (await analyzePhoto(photo.id, photo.thumbnailUrl as string)) as PhotoAnalysisResponse;
    
    if (!analysisData.name && !analysisData.description && (!analysisData.tagNames || analysisData.tagNames.length === 0)) {
        throw new Error('AI 分析未返回有效結果');
    }

    const updates = await mapAnalysisToUpdates(analysisData);

    const updateResult = await updatePhoto(photo.id, {
      ...updates,
      metadata: {
        ...(photo.metadata as Record<string, unknown> || {}),
        ai_updated_at: new Date().toISOString(),
        ai_raw: analysisData.raw_result || JSON.stringify(analysisData)
      }
    });

    if (updates.resolvedTagIds && updates.resolvedTagIds.length > 0) {
      const tagSources: Record<string, "ai"> = {};
      updates.resolvedTagIds.forEach((id: any) => {
          tagSources[String(id)] = "ai";
      });
      await api.tags['sync-photo-tags'].$post({
          json: { photoId: photo.id, tagIds: updates.resolvedTagIds.map(String), tagSources }
      });
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
