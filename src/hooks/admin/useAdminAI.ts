import { useCallback, useMemo, useState } from 'react';
import { User, Photo, Manufacturer, Category, Tag } from '../../types';
import { translateDescription } from '../../services/geminiService';
import { usePhotoAI as useOriginalPhotoAI } from '../photoAi/usePhotoAI';
import { useTaskExecutor } from '../';

/**
 * Admin AI Hook - Wraps original AI hook with TaskExecutor.
 */
export const useAdminAI = (
  user: User | null,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  tagNameToIdMap: Map<string, string>,
  photosRef: React.MutableRefObject<Photo[]>
) => {
  const [aiDebugInfo, setAiDebugInfo] = useState<any>(null);
  const { runTask } = useTaskExecutor();
  
  const originalAiHook = useOriginalPhotoAI(
    user, geminiApiKey, aiProvider, customModel, 
    categories, tags, manufacturers, 
    tagNameToIdMap, photosRef
  );

  const handleTranslate = useCallback(async (zhText: string) => {
    const apiKey = geminiApiKey;
    if (!apiKey) throw new Error('请先在设置中设定 AI 密钥');
    return await translateDescription(zhText, apiKey, customModel);
  }, [geminiApiKey, customModel]);

  return useMemo(() => ({
    analyzeSingle: originalAiHook.analyzeSingle,
    analyzeBatch: originalAiHook.analyzeBatch,
    analyzeGroup: originalAiHook.analyzeGroup,
    aiDebugInfo,
    setAiDebugInfo,
    abortAnalysis: originalAiHook.abortAnalysis,
    handleTranslate
  }), [
    originalAiHook.analyzeSingle, 
    originalAiHook.analyzeBatch, 
    originalAiHook.analyzeGroup,
    aiDebugInfo,
    originalAiHook.abortAnalysis,
    handleTranslate
  ]);
};
