import { useState, useRef } from 'react';
import { Photo, Category, Tag, Manufacturer, User } from '../types';
import { analyzeProductPhoto, translateDescription, normalizeDimensions } from '../services/geminiService';
import { resolveTagIdsBatch } from '../utils/tagUtils';
import { cleanObject } from '../services/utils';
import { formatDate } from '../utils/dateFormat';
import { saveData } from '../utils/indexedDB';
import { savePhotoToCloud } from '../services/photoMutationService';
import { AI_CONFIG } from '../constants/config';

const shouldUpdateName = (name: string | null | undefined): boolean => {
  if (!name || name.trim() === '') return true;
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (/^[\d\s\-_]+$/.test(trimmed)) return true;
  if (
    lower === 'furniture' ||
    lower === '未命名产品' ||
    lower === 'furniture record' ||
    /\.(jpg|jpeg|png|heic|webp)$/i.test(trimmed) ||
    /^(img|image|photo|dsc|pic)[\s_-]?\d+/i.test(lower)
  ) return true;
  if (trimmed.length < 3) return true;
  return false;
};

const cleanAiName = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const trimmed = name.trim();
  const measurementPattern = /([hwdlt]\d+)|(\d+["”']|cm|inch|mm)|(\d+\s*x\s*\d+)/i;
  if (measurementPattern.test(trimmed)) return null;
  return trimmed;
};

export const usePhotoAI = (
  user: User | null,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>,
  setTags: React.Dispatch<React.SetStateAction<Tag[]>>,
  tagNameToIdMap: Map<string, string>,
  showToast: (msg: string, type?: any) => void,
  addTask: (task: any) => string,
  updateTask: (id: string, updates: any) => void,
  runWithLoading: <T>(state: any, fn: () => Promise<T>) => Promise<T>,
  photosRef: React.MutableRefObject<Photo[]>
) => {
  const [aiDebugInfo, setAiDebugInfo] = useState<{ step: string; message: string; error?: string } | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const currentAnalysisController = useRef<AbortController | null>(null);

  const abortAnalysis = (taskId?: string) => {
    if (currentAnalysisController.current) {
      currentAnalysisController.current.abort();
      currentAnalysisController.current = null;
      setAiDebugInfo({ step: '已取消', message: '用戶中斷了 AI 識別任务' });
      if (taskId) {
        updateTask(taskId, { status: 'cancelled', message: '用戶已取消任務' });
      }
      setTimeout(() => setAiDebugInfo(null), 3000);
    }
  };

  const handleBatchAiIdentify = async (photosToProcess: Photo[], existingTaskId?: string) => {
    const effectiveKey = geminiApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    const unProcessed = photosToProcess.filter(p => {
       const rawTagIds = Array.isArray(p.tagIds) ? p.tagIds : (typeof p.tagIds === 'string' ? [p.tagIds] : []);
       const hasAllTranslations = p.description_translations?.zh && p.description_translations?.en && p.description_translations?.ms;
       return (!p.categoryId || rawTagIds.length < 2 || !p.name || !hasAllTranslations) && !p.isAnalyzing;
    });
    
    if (unProcessed.length === 0) {
      if (existingTaskId) {
        updateTask(existingTaskId, { status: 'completed', progress: 100, message: '所有照片已識別完成' });
      } else {
        showToast('選中的照片已經包含完整的類別、標籤和翻譯，無需重新識別。', 'success');
      }
      return;
    }
    
    setBatchProgress({ current: 0, total: unProcessed.length });
    const taskId = existingTaskId || addTask({
      name: `批量 AI 識別 (${unProcessed.length} 張)`,
      onCancel: () => abortAnalysis()
    });

    const CONCURRENCY = AI_CONFIG.CONCURRENCY;
    let completedCount = 0;
    
    const processPhoto = async (photo: Photo): Promise<void> => {
        const controller = new AbortController();
        currentAnalysisController.current = controller;
        const signal = controller.signal;
        
        setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: true } : p));
        
        try {
            const resRaw = await analyzeProductPhoto(photo.uri!, categories, tags, manufacturers, effectiveKey!, aiProvider, customModel, photo.categoryId || null, photo.name, signal);
            const result = cleanObject(resRaw);
            
            if (result.name) {
              if (/[\d"']|cm|inch|H|W|D|\d+\s*x/i.test(result.name)) {
                result.name = '';
              }
              if (!result.modelNumber && result.name && /^[A-Z0-9]+$/.test(result.name)) {
                result.modelNumber = result.name;
                result.name = '';
              }
            }
            if (result.dimensions) {
               result.dimensions = normalizeDimensions(result.dimensions);
            }

            const aiName = cleanAiName(result.name);
            
            if (result.description) {
              try {
                const translations = await translateDescription(result.description, effectiveKey!, customModel, signal);
                result.description_translations = {
                  zh: result.description,
                  en: translations.en,
                  ms: translations.ms
                };
              } catch (e) {}
            }

            let finalCatId = result.categoryId || null;
            const allTagNamesOrIds = [...(result.tagIds || []), ...(result.newTags || [])];
            const finalTagIds = await resolveTagIdsBatch(allTagNamesOrIds, tags, tagNameToIdMap, setTags);
            const safeOldTagIds = Array.isArray(photo.tagIds) ? photo.tagIds : (typeof photo.tagIds === 'string' ? [photo.tagIds] : []);
            const mergedTagIds = Array.from(new Set([...safeOldTagIds, ...finalTagIds])).slice(0, 3);

            let updatedPhoto = { 
                ...photo, 
                categoryId: photo.categoryId && photo.categoryId !== 'uncategorized' ? photo.categoryId : finalCatId, 
                tagIds: mergedTagIds,
                name: shouldUpdateName(photo.name) ? (aiName || photo.name) : photo.name,
                description: (result.description && (!photo.description || !photo.description.trim())) ? result.description : photo.description,
                description_translations: result.description_translations || photo.description_translations,
                manual_code: photo.manual_code,
                model_number: (result.modelNumber && (!photo.model_number || !photo.model_number.trim())) ? result.modelNumber : photo.model_number,
                dimensions: (result.dimensions && Array.isArray(result.dimensions) && result.dimensions.length > 0) 
                    ? result.dimensions 
                    : (Array.isArray(photo.dimensions) ? photo.dimensions : []),
                updatedAt: formatDate(new Date()),
                isAnalyzing: false 
            };

            if (user) {
                const finalId = await savePhotoToCloud(user.id, updatedPhoto);
                updatedPhoto.id = finalId;
            }

            setPhotos(prev => {
                const next = prev.map(p => p.id === photo.id ? updatedPhoto : p);
                photosRef.current = next;
                saveData('product_photos', next);
                return next;
            });
        } catch (err: any) {
            setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: false } : p));
            if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
                throw new Error(`FATAL_AI_ERROR: ${err.message}`);
            }
            if (err instanceof Error && err.name !== 'AbortError') throw err;
        }
    };

    try {
        for (let i = 0; i < unProcessed.length; i += CONCURRENCY) {
            if (currentAnalysisController.current?.signal.aborted) break;
            const batch = unProcessed.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.allSettled(batch.map(p => processPhoto(p)));
            const fulfilledCount = batchResults.filter(r => r.status === 'fulfilled').length;
            completedCount += fulfilledCount;
            const currentProgress = Math.min(i + CONCURRENCY, unProcessed.length);
            const progressPercent = (currentProgress / unProcessed.length) * 100;
            setBatchProgress({ current: currentProgress, total: unProcessed.length });
            updateTask(taskId, { progress: progressPercent, message: `已處理 ${currentProgress}/${unProcessed.length} 張...` });
        }
        if (completedCount > 0) {
            updateTask(taskId, { status: 'completed', progress: 100, message: `完成！處理 ${completedCount} 張` });
            showToast(`AI 識別成功處理 ${completedCount} 張。`, 'success');
        } else {
            updateTask(taskId, { status: 'error', message: '任務執行失敗。' });
            showToast('AI 識別失敗。', 'error');
        }
    } catch (err) {
        updateTask(taskId, { status: 'error', message: `錯誤: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
        currentAnalysisController.current = null;
        setBatchProgress({ current: 0, total: 0 });
    }
  };

  const handleSingleAiAnalyze = async (imageData: string | null, catId?: string, editPhotoId?: string | null) => {
    if (!imageData) return;
    return runWithLoading('analyzing', async () => {
      setAiDebugInfo({ step: '准备中', message: '正在初始化...' });
      const controller = new AbortController();
      currentAnalysisController.current = controller;
      const signal = controller.signal;
      try {
        const apiKey = geminiApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
        if (!apiKey) throw new Error('API Key 为空');
        let originalName;
        if (editPhotoId) {
            const photo = photosRef.current.find(p => p.id === editPhotoId);
            originalName = photo?.name;
        }
        const resRaw = await analyzeProductPhoto(imageData, categories, tags, manufacturers, apiKey, aiProvider, customModel, catId, originalName, signal);
        const result = cleanObject(resRaw);
        if (result.name) {
          if (/[\d"']|cm|inch|H|W|D|\d+\s*x/i.test(result.name)) result.name = '';
          if (!result.modelNumber && result.name && /^[A-Z0-9]+$/.test(result.name)) {
            result.modelNumber = result.name;
            result.name = '';
          }
        }
        if (result.dimensions) result.dimensions = normalizeDimensions(result.dimensions);
        const aiName = cleanAiName(result.name);
        if (result.description) {
          try {
            const translations = await translateDescription(result.description, apiKey, customModel, signal);
            result.description_translations = { zh: result.description, en: translations.en, ms: translations.ms };
          } catch (e) {}
        }
        if (editPhotoId) {
          const photo = photosRef.current.find(p => p.id === editPhotoId);
          if (photo) {
            let updatedPhoto = { 
              ...photo, 
              categoryId: result.categoryId || photo.categoryId,
              tagIds: Array.from(new Set([...(Array.isArray(photo.tagIds) ? photo.tagIds : []), ...(await resolveTagIdsBatch([...(result.tagIds || []), ...(result.newTags || [])], tags, tagNameToIdMap, setTags))])).slice(0, 3),
              name: shouldUpdateName(photo.name) ? (aiName || photo.name) : photo.name,
              description: (result.description && (!photo.description || !photo.description.trim())) ? result.description : photo.description,
              description_translations: result.description_translations || photo.description_translations,
              model_number: (result.modelNumber && (!photo.model_number || !photo.model_number.trim())) ? result.modelNumber : photo.model_number,
              dimensions: (result.dimensions && result.dimensions.length > 0) ? result.dimensions : photo.dimensions,
              updatedAt: formatDate(new Date()),
              isAnalyzing: false 
            };
            if (user) {
              const finalId = await savePhotoToCloud(user.id, updatedPhoto);
              updatedPhoto.id = finalId;
            }
            const nextPhotos = photosRef.current.map(p => p.id === editPhotoId ? updatedPhoto : p);
            setPhotos(nextPhotos);
            photosRef.current = nextPhotos;
            await saveData('product_photos', nextPhotos);
          }
        }
        return result;
      } catch (err) {
        setAiDebugInfo({ step: '错误', message: '识别失败' });
        throw err;
      }
    });
  };

  const handleGroupAiIdentify = async (groupPhotos: Photo[]) => {
    if (groupPhotos.length === 0) return;
    const effectiveKey = geminiApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!effectiveKey) return;
    return runWithLoading('analyzing', async () => {
      setAiDebugInfo({ step: '群組識別', message: '正在分析第一張照片...' });
      const firstPhoto = groupPhotos.find(p => p.isGroupCover) || groupPhotos[0];
      const resRaw = await analyzeProductPhoto(firstPhoto.uri || firstPhoto.image_url, categories, tags, manufacturers, effectiveKey, aiProvider, customModel, firstPhoto.categoryId);
      const result = cleanObject(resRaw);
      if (result.name) {
        if (/[\d"']|cm|inch|H|W|D|\d+\s*x/i.test(result.name)) result.name = '';
        if (!result.modelNumber && result.name && /^[A-Z0-9]+$/.test(result.name)) {
          result.modelNumber = result.name;
          result.name = '';
        }
      }
      if (result.dimensions) result.dimensions = normalizeDimensions(result.dimensions);
      const aiName = cleanAiName(result.name);
      if (result.description) {
        const translations = await translateDescription(result.description, effectiveKey, customModel);
        result.description_translations = { zh: result.description, en: translations.en, ms: translations.ms };
      }
      const finalTagIds = await resolveTagIdsBatch([...(result.tagIds || []), ...(result.newTags || [])], tags, tagNameToIdMap, setTags);
      const groupIds = groupPhotos.map(p => p.id);
      setPhotos(prev => {
        const next = prev.map(p => groupIds.includes(p.id) ? {
          ...p,
          categoryId: result.categoryId || p.categoryId,
          tagIds: finalTagIds.slice(0, 3),
          name: shouldUpdateName(p.name) ? (aiName || p.name) : p.name,
          description: result.description,
          description_translations: result.description_translations,
          model_number: result.modelNumber || p.model_number,
          dimensions: (result.dimensions && result.dimensions.length > 0) ? result.dimensions : p.dimensions,
          updatedAt: formatDate(new Date()),
          isAnalyzing: false
        } : p);
        photosRef.current = next;
        return next;
      });
      return result;
    });
  };

  return { handleSingleAiAnalyze, handleBatchAiIdentify, handleGroupAiIdentify, aiDebugInfo, batchProgress, abortAnalysis };
};
