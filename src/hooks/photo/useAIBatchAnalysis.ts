import { useCallback } from 'react';
import type { Photo } from '@/types';
import { useTaskExecutor, useInvalidatePhotos, useSettings } from '@/hooks';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { groupKeys } from '@/lib/queryKeys';
import { runBatchAnalysis } from '@/services/ai/orchestration';

export function useAIBatchAnalysis() {
  const { runTask } = useTaskExecutor();
  const invalidatePhotos = useInvalidatePhotos();
  const queryClient = useQueryClient();
  const { settings } = useSettings();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[], groupId?: string) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      toast.error('请先选择照片 / Please select photos first');
      return;
    }

    const taskTitle = groupId ? `智能合组分析 (${targetPhotos.length}张)` : `批量 AI 分析 (${targetPhotos.length}张)`;

    await runTask(taskTitle, async ({ updateProgress, taskId }) => {
        const { successCount, groupSuccess } = await runBatchAnalysis({
            targetPhotos,
            groupId,
            settings,
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
        
        let finalMessage = "分析完成 (无更新)";
        if (groupId && groupSuccess) {
          finalMessage = successCount > 0 
            ? `成功分析並更新合組信息，且更新了 ${successCount} 張照片 / Succeeded in updating group details and analyzing ${successCount} photos!`
            : "成功分析並更新合組信息 / Succeeded in analyzing and updating group details!";
          toast.success(finalMessage);
        } else if (successCount > 0) {
          finalMessage = `成功分析 ${successCount} 張照片 / Successfully analyzed ${successCount} photos!`;
          toast.success(finalMessage);
        } else {
          toast.info("分析完成，沒有發現需要更新的數據 / Analysis complete, no fields required updating.");
        }

        if (taskId) updateProgress(100, finalMessage);
        return successCount;
    }, { showProgress: true, showSuccessToast: false });
  }, [runTask, invalidatePhotos, queryClient, settings]);

  return { handleBatchAiAnalyze };
}
