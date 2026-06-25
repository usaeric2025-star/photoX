import { useState } from 'react';
import { ISSUE_ACTIONS, PreviewResult } from "@/features/diagnostics/issueActions";
import { toast } from 'sonner';
import { handleError } from '@/lib/error';

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
      handleError(e, '预检工具');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleExecute = async () => {
    if (!action) return;
    setIsExecuting(true);
    setProgress(5);
    
    toast.loading(`正在执行: ${title}...`, { id: issueId });

    try {
      const { message } = await action.execute();
      setProgress(100);
      toast.success(message || "执行完成", { id: issueId });
      
      setPreview(null);
      if (onSuccess) onSuccess();
      setTimeout(() => setProgress(0), 1000);
    } catch (e: unknown) {
      handleError(e, title);
      toast.error(`执行失败: ${title}`, { id: issueId });
      setProgress(0);
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
