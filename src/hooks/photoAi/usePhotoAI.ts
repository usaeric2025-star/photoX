import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Photo, Category, Tag, Manufacturer, User, Task } from '../../types';
import { useSinglePhotoAI } from './useSinglePhotoAI';
import { useBatchPhotoAI } from './useBatchPhotoAI';
import { useGroupPhotoAI } from './useGroupPhotoAI';

export const usePhotoAI = (
  user: User | null,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  tagNameToIdMap: Map<string, string>,
  addTask: (task: Omit<Task, 'id'>) => string,
  updateTask: (id: string, updates: Partial<Task>) => void,
  removeTask: (id: string) => void,
  photosRef: React.MutableRefObject<Photo[]>,
  handleError: (error: unknown, context?: string) => void
) => {
  const queryClient = useQueryClient();
  const [aiDebugInfo, setAiDebugInfo] = useState<{ step: string; message: string; error?: string } | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const isAnalyzingRef = useRef(false);
  const currentAnalysisControllers = useRef<Map<string, { controller: AbortController, timeoutId: NodeJS.Timeout }>>(new Map());

  const abortAnalysis = (taskId?: string) => {
    currentAnalysisControllers.current.forEach(({ controller, timeoutId }) => {
        clearTimeout(timeoutId);
        controller.abort();
    });
    currentAnalysisControllers.current.clear();
    setBatchProgress({ current: 0, total: 0 });
    queryClient.invalidateQueries({ queryKey: ['photos'] });
    
    if (taskId) {
        updateTask(taskId, { status: 'cancelled', message: '已取消 AI 识别任务' });
        removeTask(taskId);
    }
    setAiDebugInfo({ step: '已取消', message: '用户中断了 AI 识别任务' });
    setTimeout(() => setAiDebugInfo(null), 3000);
  };

  const commonProps = {
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers,
    tagNameToIdMap, addTask, updateTask, removeTask, handleError,
    setAiDebugInfo, aiDebugInfo, currentAnalysisControllers, abortAnalysis,
    photosRef, setBatchProgress, isAnalyzingRef
  };

  const { handleSingleAiAnalyze } = useSinglePhotoAI(commonProps as any);
  const { handleBatchAiIdentify } = useBatchPhotoAI(commonProps as any);
  const { handleGroupAiIdentify } = useGroupPhotoAI(commonProps as any);

  return { 
    handleSingleAiAnalyze, 
    handleBatchAiIdentify, 
    handleGroupAiIdentify, 
    aiDebugInfo, 
    setAiDebugInfo, 
    batchProgress, 
    abortAnalysis
  };
};
