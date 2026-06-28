import { useCallback } from 'react';
import type { Photo } from '@/types';
import { useInvalidatePhotos } from '@/hooks/photo/useInvalidatePhotos';
import { showToast } from '@/lib/ui/toast';
import { appQuery } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';
import { runBatchAnalysis } from '@/features/ai/orchestration';
import { createTask } from '@/lib/task-queue';
import { generateId } from '@/lib/id';
import { useAuth } from '@/lib/store';
import { ErrorFactory } from '@/lib/error/ErrorFactory';

export function useAIBatchAnalysis() {
  const { user } = useAuth();
  const invalidatePhotos = useInvalidatePhotos();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[], groupId?: string) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      ErrorFactory.handle('请先选择照片', { context: '批量分析' });
      return;
    }
    
    showToast.info('已加入 AI 分析任務佇列...');

    const taskTitle = groupId ? `智能合组分析 (${targetPhotos.length}张)` : `批量 AI 分析 (${targetPhotos.length}张)`;

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
            showToast.success(groupId ? `智能合组完成` : `批量 AI 分析完成 (${result.successCount}张)`);
        }
    });

  }, [invalidatePhotos]);

  return { handleBatchAiAnalyze };
}
