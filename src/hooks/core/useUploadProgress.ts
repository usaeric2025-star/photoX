import { useCallback } from 'react';
import { useTasks } from './useTasks';

export function useUploadProgress() {
  const { addTask, updateTask } = useTasks();

  const startUploadBatch = useCallback((totalFiles: number) => {
    return addTask({ 
      name: `批量上传 (${totalFiles}张)`,
      message: '正在初始化队列...'
    });
  }, [addTask]);

  const updateUploadProgress = useCallback((taskId: string, index: number, total: number, fileName: string) => {
    const progress = Math.round((index / total) * 100);
    updateTask(taskId, { 
      progress, 
      message: `正在处理第 ${index + 1}/${total} 张: ${fileName}`
    });
  }, [updateTask]);

  const completeUploadBatch = useCallback((taskId: string, successCount: number, skippedCount: number, failureCount: number, totalFiles: number) => {
    const summaryMsg = [
      successCount > 0 && `成功 ${successCount}`,
      skippedCount > 0 && `合并重复 ${skippedCount}`,
      failureCount > 0 && `失败 ${failureCount}`
    ].filter(Boolean).join(', ');

    updateTask(taskId, { 
      status: failureCount === 0 ? 'completed' : failureCount === totalFiles ? 'error' : 'completed',
      progress: 100, 
      message: summaryMsg || '上传完成'
    });
  }, [updateTask]);

  const errorUploadBatch = useCallback((taskId: string) => {
     updateTask(taskId, { 
        status: 'error', 
        message: '上传过程中断'
      });
  }, [updateTask]);

  return { startUploadBatch, updateUploadProgress, completeUploadBatch, errorUploadBatch };
}
