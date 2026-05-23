import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Photo, Category, Tag, Manufacturer, User, Task } from '../../types';
import { useInvalidatePhotos } from '../queries/useInvalidatePhotos';
import { useTasks } from '../useTasks';
import { useFeedback } from '../uiFeedback';
import { AI_CONFIG } from '../../constants/config';
import { QUERY_KEYS } from '../queries/keys';
import { analyzeProductPhoto, translateDescription, normalizeDimensions } from '../../services/geminiService';
import { resolveTagIdsBatch } from '../../utils/tagUtils';
import { safeArray } from '../../lib/utils';
import { cleanObject } from '../../services/utils';
import { formatDate } from '../../utils/dateFormat';
import { savePhotoToCloud } from '../../services/photoService';
import { shouldUpdateName, cleanAiName, isMeasurementOnly } from './photoAiUtils';
import { QueryClient } from '@tanstack/react-query';

export interface ImportWorkflowProps {
  user: User | null;
  geminiApiKey: string | undefined;
  aiProvider: string;
  customModel: string;
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  tagNameToIdMap: Map<string, string>;
  photosRef: React.MutableRefObject<Photo[]>;
  queryClient: QueryClient;
}

export const processSinglePhoto = async (
  initialPhoto: Photo,
  props: ImportWorkflowProps,
  signal: AbortSignal,
  useAi: boolean,
  onProgressUpdate: () => void,
  invalidatePhotos: () => void
) => {
  const { 
    user, geminiApiKey, aiProvider, customModel, categories, 
    tags, manufacturers, tagNameToIdMap, photosRef, queryClient
  } = props;

  try {
    let updated = { ...initialPhoto };

    if (useAi) {
      const apiKey = geminiApiKey;
      const resRaw = await analyzeProductPhoto(initialPhoto.uri || '', categories, tags, manufacturers, apiKey || '', aiProvider, customModel, null, null, signal);
      
      const result = cleanObject(resRaw);
      const aiName = cleanAiName(result.name);
      
      if (result.description && apiKey) {
        try {
          const translations = await translateDescription(result.description, apiKey, customModel, signal);
          result.description_translations = {
            zh: result.description,
            en: translations.en,
            ms: translations.ms
          };
        } catch (e) {}
      }

      const finalTagIds = await resolveTagIdsBatch(
        Array.from(new Set([...safeArray<string>(result.tag_ids), ...safeArray<string>(result.newTags)])),
        tags, tagNameToIdMap
      );

      updated = {
        ...initialPhoto,
        is_analyzing: false,
        name: shouldUpdateName(initialPhoto.name) ? (aiName || initialPhoto.name) : initialPhoto.name,
        category_id: result.category_id || initialPhoto.category_id,
        tag_ids: finalTagIds.slice(0, 3),
        description: (result.description && (!initialPhoto.description || !initialPhoto.description.trim())) ? result.description : initialPhoto.description,
        description_translations: result.description_translations || initialPhoto.description_translations,
        model_number: initialPhoto.model_number || result.model_number || '',
        dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : initialPhoto.dimensions
      };
      
      const index = photosRef.current.findIndex(p => p.id === initialPhoto.id);
      if (index !== -1) {
         photosRef.current[index] = updated;
      }
    }

    if (user) {
      const finalPhotoId = await savePhotoToCloud(user.id, updated);
      const index = photosRef.current.findIndex(p => p.id === initialPhoto.id);
      if (index !== -1) {
        photosRef.current[index].id = finalPhotoId;
      }
      if (useAi) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
      }
    }
  } catch (err) {
    const idx = photosRef.current.findIndex(p => p.id === initialPhoto.id);
    if (idx !== -1) {
      photosRef.current[idx].is_analyzing = false;
    }
    throw err;
  } finally {
    onProgressUpdate();
  }
};

export const usePhotoAI = (
  user: User | null,
  geminiApiKey: string | undefined,
  aiProvider: string,
  customModel: string,
  categories: Category[],
  tags: Tag[],
  manufacturers: Manufacturer[],
  tagNameToIdMap: Map<string, string>,
  addTask: any, // kept for backward compatibility if needed, but should be replaced
  updateTask: any,
  removeTask: any,
  photosRef: React.MutableRefObject<Photo[]>,
  showError: (error: unknown, context?: string) => void
) => {
  const queryClient = useQueryClient();
  const invalidatePhotos = useInvalidatePhotos();
  const { showSuccess, handleError } = useFeedback();
  const { runTask } = useTaskExecutor(); // Use task executor
  
  const [aiDebugInfo, setAiDebugInfo] = useState<{ step: string; message: string; error?: string } | null>(null);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const isAnalyzingRef = useRef(false);
  const currentControllers = useRef<Map<string, { controller: AbortController, timeoutId: NodeJS.Timeout }>>(new Map());
  const activeTaskIds = useRef<Set<string>>(new Set());
  
  const { cancelTask } = useTasks();

  const abortAnalysis = useCallback((taskId?: string) => {
    if (!taskId) {
      if (activeTaskIds.current.size > 0) {
        const idsToCancel = Array.from(activeTaskIds.current);
        activeTaskIds.current.clear();
        idsToCancel.forEach(id => {
          try { cancelTask(id); } catch (e) { console.error('Failed to cancel task', e); }
        });
        return;
      }
    }
    currentControllers.current.forEach(({ controller, timeoutId }) => {
      clearTimeout(timeoutId);
      controller.abort();
    });
    currentControllers.current.clear();
    setBatchProgress({ current: 0, total: 0 });
    invalidatePhotos();
    
    if (taskId) {
      activeTaskIds.current.delete(taskId);
      updateTask(taskId, { status: 'cancelled', message: '已取消 AI 识别任务' });
      removeTask(taskId);
    }
    setAiDebugInfo({ step: '已取消', message: '用户中断了 AI 识别任务' });
    setTimeout(() => setAiDebugInfo(null), 3000);
  }, [cancelTask, invalidatePhotos, updateTask, removeTask]);

  const analyzeSingle = useCallback(async (photo: Photo) => {
    const imageData = photo.uri || photo.image_url;
    if (!imageData) return;
    setAiDebugInfo(null);
    
    const taskId = addTask({
      name: `AI 单图识别 ${photo.id ? '(编辑中)' : ''}`,
      status: 'running',
      progress: 0,
      onCancel: () => abortAnalysis(taskId)
    });
    activeTaskIds.current.add(taskId);
    
    setAiDebugInfo({ step: '准备中', message: '正在初始化...' });
    updateTask(taskId, { progress: 10, message: '分析图片中...' });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      updateTask(taskId, { status: 'error', message: '识别超时，请重试' });
    }, 60000);
    currentControllers.current.set(taskId, { controller, timeoutId });
    const signal = controller.signal;
    
    try {
      if (!geminiApiKey) throw new Error('API Key 为空');
      const originalName = photosRef.current.find(p => p.id === photo.id)?.name || photo.name;
      
      const resRaw = await analyzeProductPhoto(imageData, categories, tags, manufacturers, geminiApiKey, aiProvider, customModel, photo.category_id, originalName, signal);
      const result = cleanObject(resRaw);
      
      if (result.name) {
        if (isMeasurementOnly(result.name)) result.name = '';
        if (!result.modelNumber && /^[A-Z0-9\-]+$/.test(result.name) && result.name.length > 2) {
          result.modelNumber = result.name;
        }
      }
      
      if (result.dimensions) result.dimensions = normalizeDimensions(result.dimensions);
      const aiName = cleanAiName(result.name);
      
      if (result.description) {
        try {
          const translations = await translateDescription(result.description, geminiApiKey, customModel, signal);
          result.description_translations = { zh: result.description, en: translations.en, ms: translations.ms };
        } catch (e) {}
      }
      
      const existingPhoto = photosRef.current.find(p => p.id === photo.id) || photo;
      updateTask(taskId, { progress: 80, message: '正在保存结果...' });
      const resolvedTags = await resolveTagIdsBatch([...safeArray<string>(result.tag_ids), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap);
      
      let updatedPhoto = { 
        ...existingPhoto, 
        category_id: result.category_id || existingPhoto.category_id,
        tag_ids: Array.from(new Set([...safeArray(existingPhoto.tag_ids), ...resolvedTags])).slice(0, 3),
        name: shouldUpdateName(existingPhoto.name) ? (aiName || existingPhoto.name) : existingPhoto.name,
        description: (result.description && (!existingPhoto.description || !existingPhoto.description.trim())) ? result.description : existingPhoto.description,
        description_translations: result.description_translations || existingPhoto.description_translations,
        model_number: (result.modelNumber && (!existingPhoto.model_number || !existingPhoto.model_number.trim())) ? result.modelNumber : existingPhoto.model_number,
        dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : existingPhoto.dimensions,
        updated_at: formatDate(new Date()),
        is_analyzing: false 
      };

      if (user) {
        updatedPhoto.id = await savePhotoToCloud(user.id, updatedPhoto);
      }
      
      queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
        if (!old || !old.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            photos: page.photos.map((p: Photo) => (p.id === photo.id || p.id === updatedPhoto.id) ? updatedPhoto : p),
          })),
        };
      });
      queryClient.setQueriesData({ queryKey: ['photos', 'group'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((p: Photo) => (p.id === photo.id || p.id === updatedPhoto.id) ? updatedPhoto : p);
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
      
      updateTask(taskId, { status: 'completed', progress: 100, message: '识别成功' });
      return result;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.name === 'DuplicatePhotoError') {
         updateTask(taskId, { status: 'completed', progress: 100, message: '已跳过 (重复照片)' });
         showSuccess('已存在相同照片'); 
         return null;
      }
      if (error.name === 'AbortError') {
        removeTask(taskId);
        setAiDebugInfo({ step: '已取消', message: '识别任务已由用户中断' });
        return;
      }
      handleError(error, 'AI 单图分析');
      updateTask(taskId, { status: 'error', message: `失败: ${error.message.slice(0, 80)}` });
      invalidatePhotos();
      throw error;
    } finally {
      activeTaskIds.current.delete(taskId);
      const task = currentControllers.current.get(taskId);
      if (task) { clearTimeout(task.timeoutId); currentControllers.current.delete(taskId); }
    }
  }, [
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, 
    tagNameToIdMap, addTask, updateTask, removeTask, photosRef, abortAnalysis, 
    queryClient, invalidatePhotos, showSuccess, handleError
  ]);

  const analyzeBatch = useCallback(async (photos: Photo[], existingTaskId?: string, forceAll = false) => {
    setAiDebugInfo(null);
    if (!geminiApiKey) return;
    
    const unProcessed = forceAll ? photos : photos.filter(p => {
       const hasAllTranslations = p.description_translations?.zh && p.description_translations?.en && p.description_translations?.ms;
       return !p.category_id || safeArray(p.tag_ids).length < 2 || shouldUpdateName(p.name) || !hasAllTranslations;
    });
       
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    
    if (unProcessed.length === 0) {
      isAnalyzingRef.current = false;
      if (existingTaskId) updateTask(existingTaskId, { status: 'completed', progress: 100, message: '所有照片已识别完成' });
      else showSuccess(forceAll ? "均在处理中" : "均已是最新");
      return;
    }
    
    setBatchProgress({ current: 0, total: unProcessed.length });
    const taskId = existingTaskId || addTask({
      name: `批量识别 (${unProcessed.length} 张)`,
      status: 'running',
      progress: 0,
      onCancel: () => abortAnalysis(taskId)
    });
    activeTaskIds.current.add(taskId);

    let completedCount = 0;
    let duplicateCount = 0;
    
    const processPhoto = async (photo: Photo) => {
      const controller = new AbortController();
      currentControllers.current.set(taskId, { controller, timeoutId: setTimeout(() => controller.abort(), 60000) });
      
      try {
        const resRaw = await analyzeProductPhoto(photo.uri || photo.image_url!, categories, tags, manufacturers, geminiApiKey, aiProvider, customModel, photo.category_id, photo.name, controller.signal);
        const result = cleanObject(resRaw);
        
        const aiName = cleanAiName(result.name);
        if (result.description) {
          try {
            const tr = await translateDescription(result.description, geminiApiKey, customModel, controller.signal);
            result.description_translations = { zh: result.description, en: tr.en, ms: tr.ms };
          } catch(e){}
        }

        const tagIds = await resolveTagIdsBatch([...safeArray<string>(result.tag_ids), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap);

        const updated = { 
          ...photo, 
          category_id: (photo.category_id && photo.category_id !== 'uncategorized') ? photo.category_id : result.category_id, 
          tag_ids: Array.from(new Set([...safeArray(photo.tag_ids), ...tagIds])).slice(0, 3),
          name: shouldUpdateName(photo.name) ? (aiName || photo.name) : photo.name,
          description: result.description || photo.description,
          description_translations: result.description_translations || photo.description_translations,
          updated_at: formatDate(new Date()),
          is_analyzing: false 
        };

        if (user) updated.id = await savePhotoToCloud(user.id, updated);

        queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
          if (!old) return old;
          return { ...old, pages: old.pages.map((page: any) => ({ ...page, photos: page.photos.map((p: Photo) => p.id === photo.id ? updated : p) })) };
        });
        queryClient.setQueriesData({ queryKey: ['photos', 'group'] }, (old: any) => Array.isArray(old) ? old.map(p => p.id === photo.id ? updated : p) : old);
        return false;
      } catch (err: any) {
        if (err.name === 'DuplicatePhotoError') return true;
        if (err.name !== 'AbortError') throw err;
      }
    };

    try {
      for (let i = 0; i < unProcessed.length; i += AI_CONFIG.CONCURRENCY) {
        if (currentControllers.current.get(taskId)?.controller.signal.aborted) break;
        const batch = unProcessed.slice(i, i + AI_CONFIG.CONCURRENCY);
        
        const batchResults = await Promise.allSettled(batch.map(processPhoto));
        batchResults.forEach(result => {
           if (result.status === 'fulfilled' && result.value) duplicateCount++;
           else if (result.status === 'fulfilled') completedCount++;
           else if (result.status === 'rejected' && result.reason?.name !== 'AbortError') throw result.reason;
        });

        const cur = Math.min(i + AI_CONFIG.CONCURRENCY, unProcessed.length);
        setBatchProgress({ current: cur, total: unProcessed.length });
        updateTask(taskId, { progress: (cur / unProcessed.length) * 100, message: `已处理 ${cur}/${unProcessed.length}...` });
      }
      updateTask(taskId, { status: 'completed', progress: 100, message: `成功 ${completedCount} 张${duplicateCount>0?` (跳过重复 ${duplicateCount})`:''}` });
    } catch (err) {
      showError(err, '批量 AI 识别');
      updateTask(taskId, { status: 'error', message: '错误' });
    } finally {
      activeTaskIds.current.delete(taskId);
      isAnalyzingRef.current = false;
      setBatchProgress({ current: 0, total: 0 });
    }
  }, [
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, 
    tagNameToIdMap, addTask, updateTask, removeTask, abortAnalysis, queryClient, 
    showError, showSuccess
  ]);

  const analyzeGroup = useCallback(async (photos: Photo[], forceAll = false) => {
    if (photos.length === 0 || !geminiApiKey) return;
    const taskId = addTask({
      name: `群组识别 (${photos.length} 张)`,
      status: 'running',
      progress: 0,
      onCancel: () => abortAnalysis(taskId)
    });
    activeTaskIds.current.add(taskId);
    updateTask(taskId, { progress: 10, message: '分析首图...' });

    try {
      const controller = new AbortController();
      currentControllers.current.set(taskId, { controller, timeoutId: setTimeout(() => controller.abort(), 60000) });
      const first = photos.find(p => p.is_group_cover) || photos[0];
      
      const resRaw = await analyzeProductPhoto(first.uri || first.image_url!, categories, tags, manufacturers, geminiApiKey, aiProvider, customModel, first.category_id, first.name, controller.signal);
      const result = cleanObject(resRaw);
      
      const tagIds = await resolveTagIdsBatch([...safeArray<string>(result.tag_ids), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap);
      updateTask(taskId, { progress: 80, message: '应用到全组...' });

      const updatedPhotos = photos.map(p => ({
        ...p,
        category_id: result.category_id || p.category_id,
        tag_ids: Array.from(new Set([...safeArray(p.tag_ids), ...tagIds])).slice(0, 3)
      }));

      if (user) {
        for (const up of updatedPhotos) {
          try { await savePhotoToCloud(user.id, up); } catch (e) {}
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['photos'] });
      updateTask(taskId, { status: 'completed', progress: 100, message: '成功' });
    } catch (err) {
       updateTask(taskId, { status: 'error', message: '组分析失败' });
    } finally {
       activeTaskIds.current.delete(taskId);
    }
  }, [
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, 
    tagNameToIdMap, addTask, updateTask, abortAnalysis, queryClient
  ]);

  return { analyzeSingle, analyzeBatch, analyzeGroup, aiDebugInfo, setAiDebugInfo, batchProgress, abortAnalysis };
};
