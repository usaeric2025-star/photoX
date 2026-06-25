import { useState } from 'react';
import { ISSUE_ACTIONS, PreviewResult } from "@/features/diagnostics/issueActions";
import { useTaskExecutor } from '@/hooks';

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
      console.error(e);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecute = async () => {
    if (!action) return;
    setIsExecuting(true);
    
    try {
      await runTask(
        title,
        async ({ updateProgress }) => {
          updateProgress(10, '正在初始化...');
          const result = await action.execute();
          updateProgress(100, '完成');
          return result;
        },
        {
          showProgress: false,
          showSuccessToast: true,
          onSuccess: () => {
            setPreview(null);
            if (onSuccess) onSuccess();
          }
        }
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    preview, setPreview,
    showPreviewDialog, setShowPreviewDialog,
    isExecuting, isPreviewing, progress,
    handlePreview, handleExecute, action
  };
}
