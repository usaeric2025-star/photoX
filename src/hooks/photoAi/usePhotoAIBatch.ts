
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Photo, Category, Tag, Manufacturer, User } from '@/types';
import { groupKeys } from '@/lib/queryKeys';
import { useTaskExecutor } from '@/hooks';
import { AI_CONFIG } from '@/constants/config';
import { analyzeProductPhoto, translateDescription } from '@/services/geminiService';
import { resolveTagIdsBatch } from '@/utils/tagUtils';
import { cleanObject } from '@/services/utils';
import { formatDate } from '@/utils/dateFormat';
import { savePhotoToCloud } from '@/services/photoService';
import { shouldUpdateName, cleanAiName } from './photoAiUtils';
import { safeArray } from '@/lib/utils';
import { reportError } from '@/lib/errorReporter';

export const usePhotoAIBatch = (
  user: User | null,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  tagNameToIdMap: Map<string, string>,
  base: any
) => {
  const queryClient = useQueryClient();
  const { runTask } = useTaskExecutor();
  const { currentControllers } = base;

  const analyzeBatch = useCallback(async (photos: Photo[], forceAll = false) => {
    if (!geminiApiKey) throw new Error('未配置 API Key');
    
    const unProcessed = forceAll ? photos : photos.filter(p => {
       const hasAllTranslations = p.description_translations?.zh && p.description_translations?.en && p.description_translations?.ms;
       return !p.category_id || safeArray(p.tag_ids).length < 2 || shouldUpdateName(p.name) || !hasAllTranslations;
    });
    
    if (unProcessed.length === 0) return;
        
    await runTask(`批量识别 (${unProcessed.length} 张)`, async ({ updateProgress }) => {
      let currentConcurrency = AI_CONFIG.CONCURRENCY;
      let consecutive429Count = 0;
      let downgradeCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let duplicateCount = 0;
      let activeWorkers = 0;
      let nextIndex = 0;

      const processWithRetry = async (photo: Photo): Promise<{ success: boolean; duplicate?: boolean; error?: any }> => {
        let attempt = 0;
        const maxRetries = 3;

        while (attempt <= maxRetries) {
          const controller = new AbortController();
          currentControllers.current.set(photo.id, { controller });

          try {
            const resRaw = await analyzeProductPhoto(
              photo.uri || photo.image_url!,
              categories,
              tags,
              manufacturers,
              geminiApiKey,
              aiProvider,
              customModel,
              photo.category_id,
              photo.name,
              controller.signal
            );
            const result = cleanObject(resRaw);
            const aiName = cleanAiName(result.name);
            if (result.description) {
              try {
                const tr = await translateDescription(result.description, geminiApiKey, customModel, controller.signal);
                result.description_translations = { zh: result.description, en: tr.en, ms: tr.ms };
              } catch (e) {}
            }
            const tagIds = (await resolveTagIdsBatch([...safeArray<string>(result.tag_ids), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap)) as string[];
            const updated = {
              ...photo,
              category_id: (photo.category_id && photo.category_id !== 'uncategorized') ? photo.category_id : result.category_id,
              tag_ids: Array.from(new Set([...safeArray(photo.tag_ids), ...tagIds])).slice(0, 3),
              name: shouldUpdateName(photo.name) ? (aiName || photo.name) : photo.name,
              description: result.description || photo.description,
              description_translations: result.description_translations || photo.description_translations,
              updated_at: formatDate(new Date()),
              is_analyzing: false
            };
            if (user) await savePhotoToCloud(user.id, updated);
            
            consecutive429Count = 0; // Reset consecutive error count on successful query
            return { success: true };
          } catch (err: any) {
            const isRateLimit = err?.status === 429 || String(err?.message || '').includes('429');
            
            if (isRateLimit) {
              consecutive429Count++;
              if (consecutive429Count > 2 && currentConcurrency > 1) {
                currentConcurrency = Math.max(1, currentConcurrency - 1);
                downgradeCount++;
              }
            } else if (err?.name === 'DuplicatePhotoError') {
              return { success: true, duplicate: true };
            }

            attempt++;
            if (attempt > maxRetries) {
              // Try to mark photo as ai_failed so that consecutive attempts are skipped or marked transparently
              const failedUpdate = {
                ...photo,
                is_analyzing: false,
                ai_failed: true,
                metadata: {
                  ...photo.metadata,
                  ai_error: err instanceof Error ? err.message : String(err)
                }
              };
              if (user) {
                try {
                  await savePhotoToCloud(user.id, failedUpdate);
                } catch (saveErr) {}
              }
              return { success: false, error: err };
            }

            // Exponential backoff delay with ±500ms random jitter (Base 1000ms * 2^attempt)
            const baseDelay = 1000 * Math.pow(2, attempt - 1);
            const jitter = (Math.random() - 0.5) * 1000;
            const delay = Math.max(100, baseDelay + jitter);
            await new Promise(resolve => setTimeout(resolve, delay));
          } finally {
            currentControllers.current.delete(photo.id);
          }
        }
        return { success: false, error: new Error('Exhausted retries') };
      };

      const executeWorker = async (): Promise<void> => {
        if (nextIndex >= unProcessed.length) return;

        // Drain workers down dynamically if concurrency has been throttled down
        if (activeWorkers >= currentConcurrency) {
          return;
        }

        activeWorkers++;
        const currentPhoto = unProcessed[nextIndex++];

        try {
          const res = await processWithRetry(currentPhoto);
          if (res.success) {
            if (res.duplicate) duplicateCount++;
            else successCount++;
          } else {
            failedCount++;
          }

          const pct = ((successCount + failedCount + duplicateCount) / unProcessed.length) * 100;
          const statusMsg = `正在识别: 成功 ${successCount} / 失败 ${failedCount}${downgradeCount > 0 ? ` (降级 ${downgradeCount}次)` : ''}`;
          updateProgress(pct, statusMsg);
        } finally {
          activeWorkers--;

          // Dynamically refill worker capacity up to the throttled concurrency setting
          const fillCount = currentConcurrency - activeWorkers;
          const nextPromises: Promise<any>[] = [];
          for (let i = 0; i < fillCount; i++) {
            nextPromises.push(executeWorker());
          }
          await Promise.all(nextPromises);
        }
      };

      // Launch and manage initial workers
      const initialPromises: Promise<any>[] = [];
      const startCount = Math.min(currentConcurrency, unProcessed.length);
      for (let i = 0; i < startCount; i++) {
        initialPromises.push(executeWorker());
      }
      await Promise.all(initialPromises);
      
      // Post-run statistics report
      if (failedCount > 0) {
        throw new Error(`批量识别完成：成功 ${successCount} 张，失败 ${failedCount} 张 ${downgradeCount > 0 ? `(因429降级併發 ${downgradeCount} 次)` : ''}`);
      }
    }, { showSuccessToast: true, showErrorToast: true });

    // Invalidate queries
    const groupIds = Array.from(new Set(unProcessed.map(p => p.group_id)));
    groupIds.forEach(gid => {
      if (gid) queryClient.invalidateQueries({ queryKey: groupKeys.detail(gid) });
    });
  }, [user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, tagNameToIdMap, currentControllers, queryClient, runTask]);

  return { analyzeBatch };
};