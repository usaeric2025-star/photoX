import { useCallback } from 'react';
import type { Photo } from '#src/types/index.js';
import { useInvalidatePhotos } from './useInvalidatePhotos.js';
import { showToast } from '#lib/ui/toast.js';
import { appQuery } from '#lib/query/index.js';
import { queryKeys } from '#lib/query/keys.js';
import { runBatchAnalysis } from '#src/features/ai/orchestration.js';
import { createTask } from '#lib/task-queue/index.js';
import { generateId } from '#lib/id.js';
import { useAuth } from '#lib/store/index.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useTranslation } from '#src/hooks/index.js';

export function useAIBatchAnalysis() {
  const { user } = useAuth();
  const invalidatePhotos = useInvalidatePhotos();
  const { uiTranslations: t } = useTranslation();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[], groupId?: string) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      ErrorFactory.handle(t.selectPhotoFirst, { context: t.batchAi });
      return;
    }
    
    showToast.info(t.aiAnalyzing);

    const taskTitle = groupId ? t.aiGroupTask(targetPhotos.length) : t.aiBatchTask(targetPhotos.length);

    createTask<{ successCount: number; groupSuccess: boolean }>({
        label: taskTitle,
        type: 'ai-analyze',
        userId: user?.id,
        meta: { photoCount: targetPhotos.length, groupId },
        execute: async (signal, onProgress) => {
            const { successCount, groupSuccess } = await runBatchAnalysis({
                targetPhotos,
                groupId,
                onProgress
            });

            // Final Sync
            await invalidatePhotos();
            if (groupId) {
              await Promise.all([
                appQuery.mutate(queryKeys.groups.detail(groupId, true)),
                appQuery.mutate(queryKeys.groups.all)
              ]);
            }
            
            return { successCount, groupSuccess };
        },
        onComplete: (result) => {
            showToast.success(groupId ? t.taskCompleted(t.aiGroupTask(1).split('(')[0]) : t.aiAnalyzeSuccess(result.successCount));
        }
    });

  }, [invalidatePhotos]);

  return { handleBatchAiAnalyze };
}
