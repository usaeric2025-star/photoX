import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Photo, Category, Tag, Manufacturer, User, Task } from '@/types';
import { useInvalidatePhotos, useTasks, useFeedback, useTaskExecutor } from '@/hooks';
import { AI_CONFIG } from '@/constants/config';
import { QUERY_KEYS } from '@/hooks/queries/keys';
import { analyzeProductPhoto, translateDescription, normalizeDimensions } from '@/services/geminiService';
import { resolveTagIdsBatch } from '@/utils/tagUtils';
import { safeArray } from '@/lib/utils';
import { cleanObject } from '@/services/utils';
import { formatDate } from '@/utils/dateFormat';
import { savePhotoToCloud } from '@/services/photoService';
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
  photosRef: React.MutableRefObject<Photo[]>
) => {
  const queryClient = useQueryClient();
  const invalidatePhotos = useInvalidatePhotos();
  const { showSuccess, handleError } = useFeedback();
  const { runTask } = useTaskExecutor();
  
  const [aiDebugInfo, setAiDebugInfo] = useState<{ step: string; message: string; error?: string } | null>(null);
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
    invalidatePhotos();
    
    if (taskId) {
      activeTaskIds.current.delete(taskId);
      cancelTask(taskId);
    }
    setAiDebugInfo({ step: '已取消', message: '用户中断了 AI 识别任务' });
    setTimeout(() => setAiDebugInfo(null), 3000);
  }, [cancelTask, invalidatePhotos]);

  const analyzeSingle = useCallback(async (photo: Photo) => {
    const imageData = photo.uri || photo.image_url;
    if (!imageData) {
      handleError(new Error('未找到有效的照片源物理数据，请重新上传或选择照片！'), 'AI 单图识别');
      return;
    }
    setAiDebugInfo(null);
    
    return await runTask(`AI 单图识别 ${photo.id ? '(编辑中)' : ''}`, async ({ updateProgress }) => {
      setAiDebugInfo({ step: '准备中', message: '正在初始化...' });
      updateProgress(10, '分析图片中...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 60000);
      currentControllers.current.set('single', { controller, timeoutId });
      const signal = controller.signal;
      
      try {
        if (!geminiApiKey) throw new Error('API Key 为空');
        const originalName = photosRef.current.find(p => p.id === photo.id)?.name || photo.name;
        
        const resRaw = await analyzeProductPhoto(imageData, categories, tags, manufacturers, geminiApiKey, aiProvider, customModel, photo.category_id, originalName, signal);
        const result = cleanObject(resRaw);
        // AI 返回结果: result
        
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
            await translateDescription(result.description, geminiApiKey, customModel, signal);
          } catch (e) {}
        }
        
        const existingPhoto = photosRef.current.find(p => p.id === photo.id) || photo;
        updateProgress(80, '正在保存结果...');
        const resolvedTags = await resolveTagIdsBatch([...safeArray<string>(result.tag_ids), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap);
        
        let updatedPhoto = { 
          ...existingPhoto, 
          category_id: result.category_id || existingPhoto.category_id,
          tag_ids: Array.from(new Set([...safeArray(existingPhoto.tag_ids), ...resolvedTags])).slice(0, 3),
          name: shouldUpdateName(existingPhoto.name) ? (aiName || existingPhoto.name) : existingPhoto.name,
          description: (result.description && (!existingPhoto.description || !existingPhoto.description.trim())) ? result.description : existingPhoto.description,
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
        
        return result;
      } catch (error: any) {
        if (error.name === 'DuplicatePhotoError') {
           throw new Error('DUPLICATE'); 
        }
        if (error.name === 'AbortError') {
          setAiDebugInfo({ step: '已取消', message: '识别任务已由用户中断' });
          throw new Error('识别任务已取消');
        }
        invalidatePhotos();
        throw error;
      } finally {
        const task = currentControllers.current.get('single');
        if (task) { clearTimeout(task.timeoutId); currentControllers.current.delete('single'); }
      }
    }, {
      onSuccess: (result) => {
        showSuccess('识别成功');
      },
      onError: (err) => {
        if (err.message === 'DUPLICATE') {
          showSuccess('已跳过 (重复照片)');
        } else {
          handleError(err, 'AI 单图分析');
        }
      },
      showSuccessToast: false,
      showErrorToast: false // We handle it in onError
    });
  }, [
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, 
    tagNameToIdMap, photosRef, abortAnalysis, 
    queryClient, invalidatePhotos, showSuccess, handleError, runTask
  ]);

  const analyzeBatch = useCallback(async (photos: Photo[], forceAll = false) => {
    setAiDebugInfo(null);
    
    if (!geminiApiKey) {
      handleError(new Error('未在系统设置中配置 Gemini API Key，请先于系统设置中配置'), 'AI 批量识别');
      return;
    }
    
    const unProcessed = forceAll ? photos : photos.filter(p => {
       const hasAllTranslations = p.description_translations?.zh && p.description_translations?.en && p.description_translations?.ms;
       return !p.category_id || safeArray(p.tag_ids).length < 2 || shouldUpdateName(p.name) || !hasAllTranslations;
    });
       
    if (isAnalyzingRef.current) {
      handleError(new Error('AI 批量智能识别正在后台运行中，请等候当前批次结束后再操作'), 'AI 批量识别');
      return;
    }
    
    if (unProcessed.length === 0) {
      showSuccess(forceAll ? "当前选择的照片无可用作 AI 识别的信息" : "所选照片的分类、标签和翻译均已完善，无需重复识别");
      return;
    }

    isAnalyzingRef.current = true;
    
    await runTask(`批量识别 (${unProcessed.length} 张)`, async ({ updateProgress }) => {
      let completedCount = 0;
      let duplicateCount = 0;
      
      const processPhoto = async (photo: Photo) => {
        const controller = new AbortController();
        currentControllers.current.set(photo.id, { controller, timeoutId: setTimeout(() => controller.abort(), 60000) });
        
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
          return { success: true };
        } catch (err: any) {
          if (err.name === 'DuplicatePhotoError') return { success: true, duplicate: true };
          console.error(`Error processing photo ${photo.id}:`, err);
          return { success: false, error: err };
        } finally {
          currentControllers.current.delete(photo.id);
        }
      };

      try {
        let lastProgressAt = Date.now();
        const STALL_TIMEOUT = 90000; // 90 seconds stall timeout

        for (let i = 0; i < unProcessed.length; i += AI_CONFIG.CONCURRENCY) {
          if (currentControllers.current.get('batch')?.controller.signal.aborted) break;
          
          // Stalled detection check
          if (Date.now() - lastProgressAt > STALL_TIMEOUT) {
            throw new Error('任务长时间无进度，已自动中止');
          }

          const batch = unProcessed.slice(i, i + AI_CONFIG.CONCURRENCY);
          const batchResults = await Promise.all(batch.map(processPhoto));
          
          lastProgressAt = Date.now(); // Reset stall timer

          batchResults.forEach(result => {
             if (result.success && result.duplicate) duplicateCount++;
             else if (result.success) completedCount++;
             else {
               throw result.error;
             }
          });

          const cur = Math.min(i + AI_CONFIG.CONCURRENCY, unProcessed.length);
          updateProgress((cur / unProcessed.length) * 100, `已处理 ${cur}/${unProcessed.length}...`);
        }
        
        return `成功 ${completedCount} 张${duplicateCount>0?` (跳过重复 ${duplicateCount})`:''}`;
      } catch (err) {
        throw err;
      } finally {
        isAnalyzingRef.current = false;
      }
    }, { showSuccessToast: true });
  }, [
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, 
    tagNameToIdMap, abortAnalysis, queryClient, 
    showSuccess, runTask
  ]);

  const analyzeGroup = useCallback(async (photos: Photo[], forceAll = false) => {
    if (photos.length === 0) {
      handleError(new Error('当前合组中无可用照片'), '群组识别');
      return;
    }
    
    if (!geminiApiKey) {
      handleError(new Error('未在系统设置中配置 Gemini API Key，请先于系统设置中配置'), 'AI 群组识别');
      return;
    }
    
    await runTask(`群组识别 (${photos.length} 张)`, async ({ updateProgress }) => {
      updateProgress(10, '分析首图...');

      try {
        const controller = new AbortController();
        currentControllers.current.set('group', { controller, timeoutId: setTimeout(() => controller.abort(), 60000) });
        const first = photos.find(p => p.is_group_cover) || photos[0];
        
        const resRaw = await analyzeProductPhoto(first.uri || first.image_url!, categories, tags, manufacturers, geminiApiKey, aiProvider, customModel, first.category_id, first.name, controller.signal);
        const result = cleanObject(resRaw);
        
        const tagIds = await resolveTagIdsBatch([...safeArray<string>(result.tag_ids), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap);
        updateProgress(80, '应用到全组...');

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
      } finally {
         currentControllers.current.delete('group');
      }
    }, { showSuccessToast: true });
  }, [
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers, 
    tagNameToIdMap, abortAnalysis, queryClient, runTask
  ]);

  return { analyzeSingle, analyzeBatch, analyzeGroup, aiDebugInfo, setAiDebugInfo, abortAnalysis };
};
