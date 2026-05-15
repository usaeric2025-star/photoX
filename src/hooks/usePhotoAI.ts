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
import { showSystemError } from '../context/ErrorContext';

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
  // Only reject if it's ONLY measurements. If it has other text (like a code), keep it.
  const measurementOnlyPattern = /^(\d+(\.\d+)?\s*(cm|inch|mm|["'”]))+$/i;
  if (measurementOnlyPattern.test(trimmed)) return null;
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
  removeTask: (id: string) => void,
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
        updateTask(taskId, { status: 'cancelled', message: '已取消 AI 识别任务' });
        removeTask(taskId); // Immediate removal
    }
    setAiDebugInfo({ step: '已取消', message: '用户中断了 AI 识别任务' });
    setTimeout(() => setAiDebugInfo(null), 3000);
    
    showToast('AI 识别已取消 / AI Analysis Cancelled', 'info');
  };

  const handleBatchAiIdentify = async (photosToProcess: Photo[], existingTaskId?: string) => {
    setAiDebugInfo(null);
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
    
    // Background task: avoid setting global loading state
    setAiDebugInfo({ step: '准备中', message: '批量分析初始化...' });
    setBatchProgress({ current: 0, total: sUnProcessed.length });
    const taskId = existingTaskId || addTask({
      name: `批量 AI 识别 (${sUnProcessed.length} 张)`,
      onCancel: () => abortAnalysis(taskId)
    });

    const CONCURRENCY = AI_CONFIG.CONCURRENCY;
    let completedCount = 0;
    
    const processPhoto = async (photo: Photo): Promise<void> => {
        // ... (rest of processPhoto is same)
            const controller = new AbortController();
            currentAnalysisController.current = controller;
            const signal = controller.signal;
            
            setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, isAnalyzing: true } : p));
            
            try {
                const resRaw = await analyzeProductPhoto(photo.uri!, categories, tags, manufacturers, effectiveKey!, aiProvider, customModel, photo.categoryId || null, photo.name, signal);
            const result = cleanObject(resRaw);
            
    // Clean name logic - be less aggressive
    if (result.name) {
      // Only clear if it actually looks like a measurement, not just any numbers
      const measurementOnlyPattern = /^(\d+(\.\d+)?\s*(cm|inch|mm|["'”]))+$/i;
      if (measurementOnlyPattern.test(result.name)) {
        result.name = '';
      }
      
      // If AI put code in name and modelNumber is empty, keep it in name for consistency with "manual code" usage
      if (!result.modelNumber && /^[A-Z0-9\-]+$/.test(result.name) && result.name.length > 2) {
        result.modelNumber = result.name;
        // Optimization: if it's a code, we might want it in name too if displayed as name
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
            setAiDebugInfo({ step: '图片识别', message: '识别发生错误', error: err.message || String(err) });
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
            // Before starting a batch, clear global error if any
            setAiDebugInfo(prev => prev?.error ? { ...prev, error: undefined } : prev);

            const batchResults = await Promise.allSettled(safeArray(batch).map(p => processPhoto(p)));
            
            const batchFailures: string[] = [];
            batchResults.forEach((result, idx) => {
              if (result.status === 'fulfilled') {
                completedCount++;
              } else {
                const photo = batch[idx];
                const errorMsg = result.reason?.message || '未知錯誤';
                batchFailures.push(photo.name || photo.id.slice(0, 8));
                console.error(`[AI Batch Fail] ID: ${photo.id}, Title: ${photo.name}, Err: ${errorMsg}`);
                showToast(`识别失败: ${photo.name?.slice(0, 10)}...`, 'error');
              }
            });

            const currentProgress = Math.min(i + CONCURRENCY, sUnProcessed.length);
            const progressPercent = (currentProgress / sUnProcessed.length) * 100;
            setBatchProgress({ current: currentProgress, total: sUnProcessed.length });
            
            const statusMsg = batchFailures.length > 0 
              ? `已處理 ${currentProgress}/${sUnProcessed.length} (失敗: ${batchFailures.join(', ')})`
              : `已處理 ${currentProgress}/${sUnProcessed.length}...`;
            
            updateTask(taskId, { progress: progressPercent, message: statusMsg });
        }
        if (completedCount > 0 || sUnProcessed.length > 0) {
            const isAllSuccess = completedCount === sUnProcessed.length;
            updateTask(taskId, { 
              status: isAllSuccess ? 'completed' : 'warning', 
              progress: 100, 
              message: isAllSuccess ? `全數完成！共 ${completedCount} 張` : `完成，但有部分失敗 (${completedCount} 成功)` 
            });
            
            if (isAllSuccess) {
              showToast(`AI 識別成功處理 ${completedCount} 張。`, 'success');
              setAiDebugInfo(null);
            } else {
              showToast(`AI 識別完成，但有部分圖片失敗。請檢查任務日誌。`, 'warning');
            }
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
  };

  const handleSingleAiAnalyze = async (imageData: string | null, catId?: string, editPhotoId?: string | null) => {
    if (!imageData) return;
    setAiDebugInfo(null);
    
    const taskId = addTask({
      name: `AI 单图识别 ${editPhotoId ? '(编辑中)' : ''}`,
      onCancel: () => abortAnalysis(taskId)
    });

    if (editPhotoId) {
      setPhotos(prev => prev.map(p => p.id === editPhotoId ? { ...p, isAnalyzing: true } : p));
      photosRef.current = photosRef.current.map(p => p.id === editPhotoId ? { ...p, isAnalyzing: true } : p);
    }
    
    setAiDebugInfo({ step: '准备中', message: '正在初始化...' });
    updateTask(taskId, { progress: 10, message: '分析图片中...' });

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
      
      // Clean name logic
      if (result.name) {
        const measurementOnly = /^(\d+(\.\d+)?\s*(cm|inch|mm|["'”]))+$/i;
        if (measurementOnly.test(result.name)) result.name = '';
        
        if (!result.modelNumber && /^[A-Z0-9\-]+$/.test(result.name) && result.name.length > 2) {
          result.modelNumber = result.name;
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
          updateTask(taskId, { progress: 80, message: '正在保存结果...' });
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
      
      updateTask(taskId, { status: 'completed', progress: 100, message: '识别成功' });
      setAiDebugInfo(null);
      return result;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        removeTask(taskId);
        setAiDebugInfo({ step: '已取消', message: '识别任务已由用户中断' });
      } else {
        const errorMsg = err.message || String(err);
        setAiDebugInfo({ step: '错误', message: '识别失败', error: errorMsg });
        updateTask(taskId, { status: 'error', message: `失败: ${errorMsg.slice(0, 30)}` });
        showToast(`AI 識別失敗 / Analysis Failed`, 'error');
      }
      if (editPhotoId) {
        setPhotos(prev => prev.map(p => p.id === editPhotoId ? { ...p, isAnalyzing: false } : p));
        photosRef.current = photosRef.current.map(p => p.id === editPhotoId ? { ...p, isAnalyzing: false } : p);
      }
      throw err;
    } finally {
      currentAnalysisController.current = null;
    }
  };

  const handleGroupAiIdentify = async (groupPhotos: Photo[]) => {
    const sGroupPhotos = safeArray(groupPhotos);
    if (sGroupPhotos.length === 0) return;
    setAiDebugInfo(null);
    const effectiveKey = geminiApiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
    if (!effectiveKey) throw new Error('请先在管理设置中设定 AI 密钥');

    const taskId = addTask({
      name: `群组 AI 识别 (${sGroupPhotos.length} 张)`,
      onCancel: () => abortAnalysis(taskId)
    });

    const photoIds = sGroupPhotos.map(p => p.id);
    setPhotos(prev => prev.map(p => photoIds.includes(p.id) ? { ...p, isAnalyzing: true } : p));
    photosRef.current = photosRef.current.map(p => photoIds.includes(p.id) ? { ...p, isAnalyzing: true } : p);

    setAiDebugInfo({ step: '群组识别', message: '正在分析封面/首张照片...' });
    updateTask(taskId, { progress: 10, message: '分析产品特征中...' });

    try {
      const controller = new AbortController();
      currentAnalysisController.current = controller;
      const signal = controller.signal;

      const firstPhoto = sGroupPhotos.find(p => p.isGroupCover) || sGroupPhotos[0];
      const resRaw = await analyzeProductPhoto(firstPhoto.uri || firstPhoto.image_url!, categories, tags, manufacturers, effectiveKey, aiProvider, customModel, firstPhoto.categoryId, firstPhoto.name, signal);
      
      if (signal?.aborted) return;
      
      const result = cleanObject(resRaw);

      if (result.name) {
        const measurementOnly = /^(\d+(\.\d+)?\s*(cm|inch|mm|["'”]|x|X))(\s*(x|X)\s*(\d+(\.\d+)?\s*(cm|inch|mm|["'”]|x|X)))*$/i;
        if (measurementOnly.test(result.name)) result.name = '';
      }
      
      if (result.dimensions) result.dimensions = normalizeDimensions(result.dimensions);
      const aiName = cleanAiName(result.name);
      
      if (result.description) {
        try {
          const translations = await translateDescription(result.description, effectiveKey, customModel, signal);
          result.description_translations = { zh: result.description, en: translations.en, ms: translations.ms };
        } catch (e) {}
      }

      const finalTagIds = await resolveTagIdsBatch([...safeArray<string>(result.tagIds), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap, setTags);
      
      setAiDebugInfo({ step: '保存中', message: '同步识别结果到所有照片...' });
      updateTask(taskId, { progress: 80, message: '正在同步及保存结果...' });

      const updatedPhotosList: Photo[] = sGroupPhotos.map(p => ({
        ...p,
        categoryId: result.categoryId || p.categoryId,
        tagIds: Array.from(new Set([...safeArray(p.tagIds), ...finalTagIds])).slice(0, 3),
        name: shouldUpdateName(p.name) ? (aiName || p.name) : p.name,
        description: (result.description && (!p.description || !p.description.trim())) ? result.description : p.description,
        description_translations: result.description_translations || p.description_translations,
        model_number: (result.modelNumber && (!p.model_number || !p.model_number.trim())) ? result.modelNumber : p.model_number,
        dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : safeArray(p.dimensions),
        updatedAt: formatDate(new Date()),
        isAnalyzing: false
      }));
      
      if (user) {
        try {
          const { savePhotosToCloudBatch } = await import('../services/photoMutationService');
          await savePhotosToCloudBatch(user.id, updatedPhotosList);
        } catch (e) {
          console.error("Group sync cloud batch failed:", e);
          // Fallback to individual if batch fails
          for (const up of updatedPhotosList) {
             await savePhotoToCloud(user.id, up).catch(() => {});
          }
        }
      }

      setPhotos(prev => {
        const next = prev.map(p => {
           const found = updatedPhotosList.find(up => up.id === p.id);
           return found || p;
        });
        photosRef.current = next;
        saveData('product_photos', next);
        return next;
      });

      updateTask(taskId, { status: 'completed', progress: 100, message: '识别成功' });
      setAiDebugInfo(null);
      showToast('群组 AI 识别成功并已保存。', 'success');
      return result;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        removeTask(taskId);
      } else {
        setAiDebugInfo({ step: '错误', message: '群组识别失败', error: err.message || String(err) });
        updateTask(taskId, { status: 'error', message: `失败: ${err.message?.slice(0, 30) || '未知错误'}` });
        showToast('群组 AI 识别失败 / Failed', 'error');
      }
      setPhotos(prev => prev.map(p => photoIds.includes(p.id) ? { ...p, isAnalyzing: false } : p));
      photosRef.current = photosRef.current.map(p => photoIds.includes(p.id) ? { ...p, isAnalyzing: false } : p);
      throw err;
    } finally {
      currentAnalysisController.current = null;
    }
  };

  return { handleSingleAiAnalyze, handleBatchAiIdentify, handleGroupAiIdentify, aiDebugInfo, setAiDebugInfo, batchProgress, abortAnalysis };
};
