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

import { Photo, Dimension, ProductGroup, Tag, Category } from '#src/types/index.js';
import { queryClient } from '#src/lib/query/index.js';
import { queryKeys } from '#src/lib/query/keys.js';

export interface PhotoAnalysisResponse {
  name?: unknown;
  description?: unknown;
  productName?: string;
  productStory?: string;
  category_id?: string | number | null;
  categoryId?: string | number | null;
  category_name?: string;
  categoryName?: string;
  category?: string;
  groupId?: string | number | null;
  group_id?: string | number | null;
  dimensions?: Dimension[];
  tagNames?: string[];
  tag_names?: string[];
  tagIds?: string[];
  tag_ids?: string[];
  raw_result?: string;
  itemCode?: string;
  item_code?: string;
  manualCode?: string;
  manual_code?: string;
  modelNumber?: string;
  model_number?: string;
}

/**
 * Intelligent helper to match raw AI category response against available system categories.
 * Supports ID, code, name, description translations (zh, en, ms), aliases, and partial matches.
 */
export function matchCategory(rawInput: unknown, categories: Category[]): number | null {
  if (!rawInput || !categories || categories.length === 0) return null;

  let targetVal = '';
  if (typeof rawInput === 'object' && rawInput !== null) {
    const obj = rawInput as Record<string, unknown>;
    targetVal = String(obj.id || obj.code || obj.name || obj.zh || obj.en || '').trim();
  } else {
    targetVal = String(rawInput).trim();
  }

  if (!targetVal || targetVal.toLowerCase() === 'null' || targetVal.toLowerCase() === 'undefined') return null;

  const targetLower = targetVal.toLowerCase();

  // 1. Direct ID match
  const byId = categories.find(c => String(c.id) === targetVal);
  if (byId) return Number(byId.id);

  // 2. Exact match against code, name, description (zh, en, ms), or aliases
  for (const cat of categories) {
    const code = String(cat.code || '').toLowerCase();
    const name = String(cat.name || '').toLowerCase();
    const descZh = String(cat.description?.zh || '').toLowerCase();
    const descEn = String(cat.description?.en || '').toLowerCase();
    const descMs = String(cat.description?.ms || '').toLowerCase();
    const aliases = Array.isArray(cat.aliases) ? cat.aliases.map((a) => String(a).toLowerCase()) : [];

    if (
      (code && code === targetLower) ||
      (name && name === targetLower) ||
      (descZh && descZh === targetLower) ||
      (descEn && descEn === targetLower) ||
      (descMs && descMs === targetLower) ||
      aliases.includes(targetLower)
    ) {
      return Number(cat.id);
    }
  }

  // 3. Substring / Fuzzy match
  for (const cat of categories) {
    const code = String(cat.code || '').toLowerCase();
    const name = String(cat.name || '').toLowerCase();
    const descZh = String(cat.description?.zh || '').toLowerCase();
    const descEn = String(cat.description?.en || '').toLowerCase();
    const aliases = Array.isArray(cat.aliases) ? cat.aliases.map((a) => String(a).toLowerCase()) : [];

    if (
      (code && code.length > 2 && (targetLower.includes(code) || code.includes(targetLower))) ||
      (name && name.length > 1 && (targetLower.includes(name) || name.includes(targetLower))) ||
      (descZh && descZh.length > 1 && (targetLower.includes(descZh) || descZh.includes(targetLower))) ||
      (descEn && descEn.length > 2 && (targetLower.includes(descEn) || descEn.includes(targetLower))) ||
      aliases.some(a => a.length > 2 && (targetLower.includes(a) || a.includes(targetLower)))
    ) {
      return Number(cat.id);
    }
  }

  return null;
}

/**
 * Maps AI raw response to photo update payload.
 * Unifies the parsing logic used in both single analysis and batch processing.
 */
export async function mapAnalysisToUpdates(
  result: PhotoAnalysisResponse,
  allTags: Tag[] = [],
  categories: Category[] = []
): Promise<Record<string, unknown>> {
  const { name: nameStr, description: descObj } = await mapAiToMultilingual(
    (result.name as string) || result.productName,
    (result.description as string) || result.productStory
  );

  const updates: Record<string, unknown> = {
    name: nameStr.substring(0, 200),
    description: descObj,
  };

  // 1. Group / Grouping
  const rawGroup = result.groupId || result.group_id;
  if (rawGroup && String(rawGroup) !== 'null') {
    updates.groupId = String((typeof rawGroup === 'object' && rawGroup !== null && 'id' in (rawGroup as object)) ? (rawGroup as { id: string | number }).id : (rawGroup ?? ''));
  }

  // 2. Category - Try explicit category fields or fallback properties
  const availableCats = categories.length > 0 
    ? categories 
    : (queryClient.getQueryData<Category[]>(queryKeys.categories.all) || []);

  const rawCat = result.category_id ?? result.categoryId ?? result.category_name ?? result.categoryName ?? result.category;
  const matchedCatId = matchCategory(rawCat, availableCats);
  if (matchedCatId !== null) {
    updates.categoryId = matchedCatId;
  }

  // 3. Tags
  const rawTagNames = Array.isArray(result.tagNames) 
    ? result.tagNames 
    : (Array.isArray(result.tag_names) 
      ? result.tag_names 
      : (Array.isArray((result as Record<string, unknown>).tags) 
        ? ((result as Record<string, unknown>).tags as unknown[]) 
        : (Array.isArray((result as Record<string, unknown>).keywords) 
          ? ((result as Record<string, unknown>).keywords as unknown[]) 
          : (Array.isArray((result as Record<string, unknown>).labels) 
            ? ((result as Record<string, unknown>).labels as unknown[]) 
            : []))));

  const tagNames: string[] = rawTagNames.map(t => {
    if (!t) return '';
    if (typeof t === 'object' && t !== null) {
      const obj = t as Record<string, unknown>;
      return String(obj.name || obj.zh || obj.en || obj.label || '').trim();
    }
    return String(t).trim();
  }).filter(Boolean);

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
  photo: Photo,
  allTags: Tag[] = [],
  categories: Category[] = [],
  signal?: AbortSignal
): Promise<unknown> => {
  try {
    const analysisData = (await analyzePhoto(photo.id, photo.thumbnailUrl as string, signal)) as PhotoAnalysisResponse;
    
    if (!analysisData.name && !analysisData.description && (!analysisData.tagNames || analysisData.tagNames.length === 0)) {
        throw new Error('AI 分析未返回有效結果');
    }

    const updates = await mapAnalysisToUpdates(analysisData, allTags, categories);

    const updateResult = await updatePhoto(photo.id, {
      ...updates,
      tags: updates.resolvedTagIds,
      metadata: {
        ...(photo.metadata as Record<string, unknown> || {}),
        ai_updated_at: new Date().toISOString(),
        ai_raw: analysisData.raw_result || JSON.stringify(analysisData)
      }
    });

    return updateResult;
  } catch (err) {
    const isAborted = signal?.aborted || (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted') || err.message.includes('取消')));
    if (isAborted) {
      const cancelErr = new Error('请求已取消');
      cancelErr.name = 'AbortError';
      throw cancelErr;
    }
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
  const CONCURRENCY = 2; // Process 2 photos at a time to prevent rate limits and server overload

  onProgress(0.05, `正在準備分析 ${totalPhotosToProcess} 張照片...`);

  let allTags: Tag[] = [];
  let categories: Category[] = [];
  try {
    const [tagsRes, catsRes] = await Promise.all([
      api.tags.$get(),
      api.categories.$get()
    ]);
    if (tagsRes.ok) { const json = await tagsRes.json() as any; allTags = (json.data || json) as Tag[]; }
    if (catsRes.ok) { const json = await catsRes.json() as any; categories = (json.data || json) as Category[]; }
  } catch (err) {
    ErrorFactory.handle(err, { context: "[AI Batch] Failed to prefetch reference data", silent: true });
  }

  // Simple concurrency pool
  const processPhoto = async (photo: Photo, index: number) => {
    if (signal?.aborted) return;
        
    try {
      await analyzeAndSavePhoto(photo, allTags, categories, signal);
    } catch (err) {
      if (signal?.aborted || (err instanceof Error && (err.name === 'AbortError' || err.message.includes('aborted') || err.message.includes('取消')))) {
        return;
      }
      ErrorFactory.handle(err, { context: `[AI Batch] Photo ${photo.id} error` });
    } finally {
      finishedCount++;
      const progress = Math.min(0.85, (finishedCount / totalPhotosToProcess) * 0.85);
      onProgress(progress, `已完成 ${finishedCount}/${totalPhotosToProcess} 張照片分析`);
    }
  };

  // Simple concurrency pool using a sliding window with pacing
  const queue = [...targetPhotos];
  const workers = Array(Math.min(CONCURRENCY, queue.length)).fill(null).map(async () => {
    while (queue.length > 0 && !signal?.aborted) {
      const photo = queue.shift();
      if (photo) {
        await processPhoto(photo, 0);
        if (queue.length > 0 && !signal?.aborted) {
          await new Promise(r => setTimeout(r, 250)); // Pacing delay between batch tasks
        }
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
