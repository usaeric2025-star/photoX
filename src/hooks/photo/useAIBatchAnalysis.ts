import { useCallback } from 'react';
import type { Photo } from '@/types';
import { useInvalidatePhotos } from '@/hooks/photo/useInvalidatePhotos';
import { showToast } from '@/lib/ui/toast';
import { useAppQueryClient as useQueryClient } from '@/lib/query';
import { queryKeys } from '@/lib/query/keys';
import { runBatchAnalysis } from '@/features/ai/orchestration';
import { scheduler } from '@/lib/task-queue';
import { generateId } from '@/lib/id';

export function useAIBatchAnalysis() {
  const invalidatePhotos = useInvalidatePhotos();
  const queryClient = useQueryClient();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: any[], groupId?: string) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      showToast.error('请先选择照片');
      return;
    }

    const taskTitle = groupId ? `智能合组分析 (${targetPhotos.length}张)` : `批量 AI 分析 (${targetPhotos.length}张)`;
    const taskId = `ai-analyze-${generateId()}`;

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
                queryClient.invalidateQueries({ queryKey: queryKeys.groups.detail(groupId, true) }),
                queryClient.invalidateQueries({ queryKey: queryKeys.groups.all })
              ]);
            }
            
            return { successCount, groupSuccess };
        }
    });

  }, [invalidatePhotos, queryClient]);

  return { handleBatchAiAnalyze };
}
