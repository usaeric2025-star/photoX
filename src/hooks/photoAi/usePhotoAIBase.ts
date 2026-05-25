
import { useState, useRef, useCallback } from 'react';
import { useFeedback, useInvalidatePhotos, useTasks } from '@/hooks';
import { reportError } from '@/lib/errorReporter';

export const usePhotoAIBase = () => {
  const [aiDebugInfo, setAiDebugInfo] = useState<{ step: string; message: string; error?: string } | null>(null);
  const isAnalyzingRef = useRef(false);
  const currentControllers = useRef<Map<string, { controller: AbortController, timeoutId: NodeJS.Timeout }>>(new Map());
  const activeTaskIds = useRef<Set<string>>(new Set());
  
  const { cancelTask } = useTasks();
  const invalidatePhotos = useInvalidatePhotos();

  const abortAnalysis = useCallback((taskId?: string) => {
    if (!taskId) {
      if (activeTaskIds.current.size > 0) {
        const idsToCancel = Array.from(activeTaskIds.current);
        activeTaskIds.current.clear();
        idsToCancel.forEach(id => {
          try { cancelTask(id); } catch (e) { reportError(e, '取消任务', 'warn'); }
        });
        return;
      }
    }
    
    currentControllers.current.forEach(({ controller, timeoutId }) => {
      clearTimeout(timeoutId);
      controller.abort();
    });
    currentControllers.current.clear();
    invalidatePhotos();
    
    if (taskId) {
      activeTaskIds.current.delete(taskId);
      cancelTask(taskId);
    }
    setAiDebugInfo({ step: '已取消', message: '用户中断了 AI 识别任务' });
    setTimeout(() => setAiDebugInfo(null), 3000);
  }, [cancelTask, invalidatePhotos]);

  return {
    aiDebugInfo,
    setAiDebugInfo,
    isAnalyzingRef,
    currentControllers,
    activeTaskIds,
    abortAnalysis
  };
};
