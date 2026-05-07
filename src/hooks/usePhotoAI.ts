import { useState, useRef } from 'react';
import { Photo, Category, Tag, Manufacturer, User } from '../types';
import { analyzeProductPhoto, translateDescription, normalizeDimensions } from '../services/geminiService';
import { resolveTagIdsBatch } from '../utils/tagUtils';
import { safeArray } from '../lib/utils';
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
  setLoadingState: (s: any) => void,
  photosRef: React.MutableRefObject<Photo[]>
) => {
  const [aiDebugInfo, setAiDebugInfo] = useState<{ step: string; message: string; error?: string } | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const currentAnalysisController = useRef<AbortController | null>(null);

  const abortAnalysis = (taskId?: string) => {
    if (currentAnalysisController.current) {
        currentAnalysisController.current.abort();
        currentAnalysisController.current = null;
    }
    setBatchProgress({ current: 0, total: 0 });
    setLoadingState('idle'); // Safety: reset global state
    
    // Safety: ensure any stuck isAnalyzing flags are cleared
    setPhotos(prev => prev.map(p => p.isAnalyzing ? { ...p, isAnalyzing: false } : p));
    photosRef.current = photosRef.current.map(p => p.isAnalyzing ? { ...p, isAnalyzing: false } : p);
    
    if (taskId) {
        updateTask(taskId, { status: 'cancelled', message: '用户已取消任务' });
    }
    setAiDebugInfo({ step: '已取消', message: '用户中断了 AI 识别任务' });
    setTimeout(() => setAiDebugInfo(null), 3000);
    
    showToast('AI 识别已取消 / AI Analysis Cancelled', 'info');
  };

  const handleBatchAiIdentify = async (photosToProcess: Photo[], existingTaskId?: string) => {
    const effectiveKey = geminiApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    const sPhotosToProcess = safeArray(photosToProcess);
    const unProcessed = sPhotosToProcess.filter(p => {
       const rawTagIds = safeArray(p.tagIds);
       const hasAllTranslations = p.description_translations?.zh && p.description_translations?.en && p.description_translations?.ms;
       return (!p.categoryId || rawTagIds.length < 2 || !p.name || !hasAllTranslations) && !p.isAnalyzing;
    });
    
    const sUnProcessed = safeArray(unProcessed);
    if (sUnProcessed.length === 0) {
      if (existingTaskId) {
        updateTask(existingTaskId, { status: 'completed', progress: 100, message: '所有照片已识别完成' });
      } else {
        showToast('选中的照片已经包含完整的类别、标签和翻译，无需重新识别。', 'success');
      }
      return;
    }
    
    return runWithLoading('analyzing', async () => {
        setBatchProgress({ current: 0, total: sUnProcessed.length });
        const taskId = existingTaskId || addTask({
          name: `批量 AI 识别 (${sUnProcessed.length} 张)`,
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
            const allTagNamesOrIds = [...safeArray<string>(result.tagIds), ...safeArray<string>(result.newTags)];
            const finalTagIds = await resolveTagIdsBatch(allTagNamesOrIds, tags, tagNameToIdMap, setTags);
            const safeOldTagIds = safeArray(photo.tagIds);
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
                dimensions: (safeArray(result.dimensions).length > 0) 
                    ? result.dimensions 
                    : safeArray(photo.dimensions),
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
            setAiDebugInfo({ step: '图片识别', message: '识别发生错误', error: err.message });
            setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: false } : p));
            if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
                throw new Error(`FATAL_AI_ERROR: ${err.message}`);
            }
            if (err instanceof Error && err.name !== 'AbortError') throw err;
        }
    };

    try {
        for (let i = 0; i < sUnProcessed.length; i += CONCURRENCY) {
            if (currentAnalysisController.current?.signal.aborted) break;
            const batch = sUnProcessed.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.allSettled(safeArray(batch).map(p => processPhoto(p)));
            const fulfilledCount = safeArray(batchResults).filter(r => r.status === 'fulfilled').length;
            completedCount += fulfilledCount;
            const currentProgress = Math.min(i + CONCURRENCY, sUnProcessed.length);
            const progressPercent = (currentProgress / sUnProcessed.length) * 100;
            setBatchProgress({ current: currentProgress, total: sUnProcessed.length });
            updateTask(taskId, { progress: progressPercent, message: `已处理 ${currentProgress}/${sUnProcessed.length} 张...` });
        }
        if (completedCount > 0) {
            updateTask(taskId, { status: 'completed', progress: 100, message: `完成！处理 ${completedCount} 张` });
            showToast(`AI 识别成功处理 ${completedCount} 张。`, 'success');
        } else {
            updateTask(taskId, { status: 'error', message: '任务执行失败。' });
            showToast('AI 识别失败。', 'error');
        }
    } catch (err) {
        updateTask(taskId, { status: 'error', message: `錯誤: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
        currentAnalysisController.current = null;
        setBatchProgress({ current: 0, total: 0 });
    }
    });
  };

  const handleSingleAiAnalyze = async (imageData: string | null, catId?: string, editPhotoId?: string | null) => {
    if (!imageData) return;
    return runWithLoading('analyzing', async () => {
      if (editPhotoId) {
        setPhotos(prev => prev.map(p => p.id === editPhotoId ? { ...p, isAnalyzing: true } : p));
        // Also update local ref
        photosRef.current = photosRef.current.map(p => p.id === editPhotoId ? { ...p, isAnalyzing: true } : p);
      }
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
            const resolvedTags = await resolveTagIdsBatch([...safeArray<string>(result.tagIds), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap, setTags);
            let updatedPhoto = { 
              ...photo, 
              categoryId: result.categoryId || photo.categoryId,
              tagIds: Array.from(new Set([...safeArray(photo.tagIds), ...resolvedTags])).slice(0, 3),
              name: shouldUpdateName(photo.name) ? (aiName || photo.name) : photo.name,
              description: (result.description && (!photo.description || !photo.description.trim())) ? result.description : photo.description,
              description_translations: result.description_translations || photo.description_translations,
              model_number: (result.modelNumber && (!photo.model_number || !photo.model_number.trim())) ? result.modelNumber : photo.model_number,
              dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : photo.dimensions,
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
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setAiDebugInfo({ step: '已取消', message: '识别任务已由用户中断' });
        } else {
          setAiDebugInfo({ step: '错误', message: '识别失败' });
        }
        if (editPhotoId) {
          setPhotos(prev => prev.map(p => p.id === editPhotoId ? { ...p, isAnalyzing: false } : p));
          photosRef.current = photosRef.current.map(p => p.id === editPhotoId ? { ...p, isAnalyzing: false } : p);
        }
        throw err;
      }
    });
  };

  const handleGroupAiIdentify = async (groupPhotos: Photo[]) => {
    const sGroupPhotos = safeArray(groupPhotos);
    if (sGroupPhotos.length === 0) return;
    const effectiveKey = geminiApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!effectiveKey) return;
    return runWithLoading('analyzing', async () => {
      const photoIds = sGroupPhotos.map(p => p.id);
      setPhotos(prev => prev.map(p => photoIds.includes(p.id) ? { ...p, isAnalyzing: true } : p));
      photosRef.current = photosRef.current.map(p => photoIds.includes(p.id) ? { ...p, isAnalyzing: true } : p);

      setAiDebugInfo({ step: '群组识别', message: '正在分析第一张照片...' });
      try {
        const firstPhoto = sGroupPhotos.find(p => p.isGroupCover) || sGroupPhotos[0];
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
        const finalTagIds = await resolveTagIdsBatch([...safeArray<string>(result.tagIds), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap, setTags);
        const groupIds = sGroupPhotos.map(p => p.id);
        setPhotos(prev => {
          const next = prev.map(p => groupIds.includes(p.id) ? {
            ...p,
            categoryId: result.categoryId || p.categoryId,
            tagIds: finalTagIds.slice(0, 3),
            name: shouldUpdateName(p.name) ? (aiName || p.name) : p.name,
            description: result.description,
            description_translations: result.description_translations,
            model_number: result.modelNumber || p.model_number,
            dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : p.dimensions,
            updatedAt: formatDate(new Date()),
            isAnalyzing: false
          } : p);
          photosRef.current = next;
          return next;
        });
        return result;
      } catch (err) {
        setPhotos(prev => prev.map(p => photoIds.includes(p.id) ? { ...p, isAnalyzing: false } : p));
        photosRef.current = photosRef.current.map(p => photoIds.includes(p.id) ? { ...p, isAnalyzing: false } : p);
        throw err;
      }
    });
  };

  return { handleSingleAiAnalyze, handleBatchAiIdentify, handleGroupAiIdentify, aiDebugInfo, batchProgress, abortAnalysis };
};
