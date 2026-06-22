import { useState } from 'react';
import { ISSUE_ACTIONS, PreviewResult } from "@/features/diagnostics/issueActions";
import { useTaskExecutor } from '@/hooks';
import { handleError } from '@/lib/error/errorHandler';

export function useMaintenanceExecution(issueId: string, title: string, onSuccess?: () => void) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);

  const { runTask } = useTaskExecutor();
  const action = ISSUE_ACTIONS[issueId];

  const handlePreview = async () => {
    if (!action) return;
    setIsPreviewing(true);
    try {
      const result = await action.preview?.();
      setPreview(result || null);
      if (result && result.affectedPhotos && result.affectedPhotos.length > 0) {
        setShowPreviewDialog(true);
      }
    } catch (e: unknown) {
      handleError(e, '预检工具');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecute = async () => {
    if (!action) return;
    setIsExecuting(true);
    setProgress(5);
    
    await runTask(
      title,
      async ({ updateProgress, taskId }) => {
        const { jobId, message } = await action.execute();
        
        if (!jobId || jobId === 'sync' || jobId === 'cleanup') {
          updateProgress(100, message || "已完成");
          setProgress(100);
          return true;
        }

        return new Promise((resolve, reject) => {
          const interval = setInterval(async () => {
            try {
              const status = (await action.getStatus?.(jobId)) as { progress?: number; message?: string; status?: string; error?: string } | undefined | null;
              if (!status) return;

              setProgress(status.progress || 0);
              updateProgress(status.progress || 0, status.message);
              
              if (status.status === 'completed') {
                clearInterval(interval);
                resolve(true);
              } else if (status.status === 'failed') {
                clearInterval(interval);
                reject(new Error(status.error || status.message || "执行失败"));
              }
            } catch (e) {
              clearInterval(interval);
              reject(e);
            }
          }, 2000);
        });
      },
      {
        issueId,
        showProgress: false,
        onSuccess: () => {
          setIsExecuting(false);
          setPreview(null);
          if (onSuccess) onSuccess();
          setTimeout(() => setProgress(0), 1000);
        },
        onError: () => {
          setIsExecuting(false);
          setProgress(0);
        },
        showSuccessToast: true
      }
    );
  };

  return {
    preview, setPreview,
    showPreviewDialog, setShowPreviewDialog,
    isExecuting, isPreviewing, progress,
    handlePreview, handleExecute, action
  };
}
