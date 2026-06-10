import { useCallback } from 'react';
import type { Photo } from '@/types';
import { useTaskExecutor, useInvalidatePhotos } from '@/hooks';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { groupKeys } from '@/lib/queryKeys';
import { runBatchAnalysis } from '@/services/ai/orchestration';

export function useAIBatchAnalysis() {
  const { runTask } = useTaskExecutor();
  const invalidatePhotos = useInvalidatePhotos();
  const queryClient = useQueryClient();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[], groupId?: string) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      toast.error('请先选择照片');
      return;
    }

    const taskTitle = groupId ? `智能合组分析 (${targetPhotos.length}张)` : `批量 AI 分析 (${targetPhotos.length}张)`;

    await runTask(taskTitle, async ({ updateProgress, taskId }) => {
        const { successCount, groupSuccess } = await runBatchAnalysis({
            targetPhotos,
            groupId,
            onProgress: (progress, message) => updateProgress(progress, message)
        });

        // Final Sync
        await invalidatePhotos();
        if (groupId) {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
            queryClient.invalidateQueries({ queryKey: groupKeys.all })
          ]);
        }
        
        let finalMessage = "暂无数据更新";
        if (groupId && groupSuccess) {
          finalMessage = successCount > 0 
            ? `已更新合组，并识别出 ${successCount} 张照片`
            : "已更新合组信息";
          toast.success(finalMessage);
        } else if (successCount > 0) {
          finalMessage = `已识别 ${successCount} 张照片`;
          toast.success(finalMessage);
        } else {
          toast.info("已是最新，无需更新");
        }

        if (taskId) updateProgress(100, finalMessage);
        return successCount;
    }, { showProgress: true, showSuccessToast: false });
  }, [runTask, invalidatePhotos, queryClient]);

  return { handleBatchAiAnalyze };
}
