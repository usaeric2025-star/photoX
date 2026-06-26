import { useState } from 'react';
import { ISSUE_ACTIONS, PreviewResult } from "@/features/diagnostics/issueActions";
import { createTask } from '@/lib/task-queue';

export function useMaintenanceExecution(issueId: string, title: string, onSuccess?: () => void) {
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);

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

  const handleExecute = () => {
    if (!action) return;
    setIsExecuting(true);
    setProgress(0);
    
    createTask({
      type: 'repair',
      label: title,
      execute: async (signal, onProgress) => {
        onProgress(0.1, '正在初始化...');
        const result = await action.execute();
        onProgress(1, '完成');
        return result;
      },
      onComplete: () => {
        setIsExecuting(false);
        setPreview(null);
        setProgress(0);
        if (onSuccess) onSuccess();
      },
      onError: () => {
        setIsExecuting(false);
        setProgress(0);
      }
    });
  };

  return {
    preview, setPreview,
    showPreviewDialog, setShowPreviewDialog,
    isExecuting, isPreviewing, progress,
    handlePreview, handleExecute, action
  };
}
