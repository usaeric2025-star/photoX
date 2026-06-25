import { useCallback } from 'react';
import type { Photo } from '@/types';
import { useInvalidatePhotos } from '@/hooks/photo/useInvalidatePhotos';
import { showToast } from '@/lib/ui/toast';
import { appQuery } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';
import { runBatchAnalysis } from '@/features/ai/orchestration';
import { scheduler } from '@/lib/task-queue';
import { generateId } from '@/lib/id';
import { isTaskDrawerOpen } from '@/lib/store';

export function useAIBatchAnalysis() {
  const invalidatePhotos = useInvalidatePhotos();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[], groupId?: string) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      showToast.error('请先选择照片');
      return;
    }
    
    showToast.info('已加入 AI 分析任務佇列...');

    const taskTitle = groupId ? `智能合组分析 (${targetPhotos.length}张)` : `批量 AI 分析 (${targetPhotos.length}张)`;
    const taskId = `ai-analyze-${generateId()}`;

    // Open Task Drawer automatically using Signal
    isTaskDrawerOpen.set(true);

    scheduler.enqueue({
        id: taskId,
        label: taskTitle,
        type: 'ai-analyze',
        state: { status: 'queued' },
        createdAt: Date.now(),
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
            
            showToast.success(groupId ? `智能合组完成` : `批量 AI 分析完成 (${successCount}张)`);
            
            return { successCount, groupSuccess };
        }
    });

  }, [invalidatePhotos]);

  return { handleBatchAiAnalyze };
}
