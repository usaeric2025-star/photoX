import { useState } from 'react';
import { ISSUE_ACTIONS, PreviewResult } from "@/features/diagnostics/issueActions";
import { useTaskExecutor } from '@/hooks';
import { handleError } from '@/lib/error';

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
      async ({ updateProgress }) => {
        const { message } = await action.execute();
        updateProgress(100, message || "已完成");
        setProgress(100);
        return true;
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
