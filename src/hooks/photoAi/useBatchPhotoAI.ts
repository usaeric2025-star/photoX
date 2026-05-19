import { useQueryClient } from '@tanstack/react-query';
import { Photo, Category, Tag, Manufacturer, User, Task } from '../../types';
import { analyzeProductPhoto, translateDescription, normalizeDimensions } from '../../services/geminiService';
import { resolveTagIdsBatch } from '../../utils/tagUtils';
import { safeArray } from '../../lib/utils';
import { cleanObject } from '../../services/utils';
import { formatDate } from '../../utils/dateFormat';
import { savePhotoToCloud } from '../../services/photoMutationService';
import { QUERY_KEYS } from '../queries/keys';
import { AI_CONFIG } from '../../constants/config';
import { shouldUpdateName, cleanAiName } from './photoAiUtils';
import { useFeedback } from '../uiFeedback';

interface BatchAiProps {
  user: User | null;
  geminiApiKey: string | undefined;
  aiProvider: string;
  customModel: string;
  categories: Category[];
  tags: Tag[];
  manufacturers: Manufacturer[];
  tagNameToIdMap: Map<string, string>;
  addTask: (task: Omit<Task, 'id'>) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  setAiDebugInfo: (info: { step: string; message: string; error?: string } | null) => void;
  aiDebugInfo: { step: string; message: string; error?: string } | null;
  setBatchProgress: (progress: { current: 0, total: 0 } | any) => void;
  isAnalyzingRef: React.MutableRefObject<boolean>;
  invalidatePhotos: () => void;
  currentAnalysisControllers: React.MutableRefObject<Map<string, { controller: AbortController, timeoutId: NodeJS.Timeout }>>;
  abortAnalysis: (taskId?: string) => void;
}

export const useBatchPhotoAI = (props: BatchAiProps) => {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useFeedback();
  const {
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers,
    tagNameToIdMap, addTask, updateTask, removeTask, setAiDebugInfo, aiDebugInfo, setBatchProgress,
    isAnalyzingRef, invalidatePhotos, currentAnalysisControllers, abortAnalysis
  } = props;

  const handleBatchAiIdentify = async (photosToProcess: Photo[], existingTaskId?: string) => {
    setAiDebugInfo(null);
    const effectiveKey = geminiApiKey;
    const sPhotosToProcess = safeArray(photosToProcess);
    const unProcessed = sPhotosToProcess.filter(p => {
       const rawTagIds = safeArray(p.tagIds);
       const hasAllTranslations = p.description_translations?.zh && p.description_translations?.en && p.description_translations?.ms;
       return (!p.categoryId || rawTagIds.length < 2 || !p.name || !hasAllTranslations) && !p.isAnalyzing;
    });
    
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    
    if (unProcessed.length === 0) {
      isAnalyzingRef.current = false;
      if (existingTaskId) {
        updateTask(existingTaskId, { status: 'completed', progress: 100, message: '所有照片已识别完成' });
      } else {
        showSuccess("所有照片均已是最新，无需重新识别");
      }
      return;
    }
    
    setAiDebugInfo({ step: '准备中', message: '批量分析初始化...' });
    setBatchProgress({ current: 0, total: unProcessed.length });
    const taskId = addTask({
      name: `批量 AI 识别 (${unProcessed.length} 张)`,
      status: 'running',
      progress: 0,
      onCancel: () => abortAnalysis(taskId)
    });

    const CONCURRENCY = AI_CONFIG.CONCURRENCY;
    let completedCount = 0;
    let duplicateCount = 0;
    
    const processPhoto = async (photo: Photo): Promise<boolean> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            updateTask(taskId, { status: 'error', message: '识别超时，请重试' });
        }, 60000);
        currentAnalysisControllers.current.set(taskId, { controller, timeoutId });
        const signal = controller.signal;
                
        try {
            const resRaw = await analyzeProductPhoto(photo.uri!, categories, tags, manufacturers, effectiveKey!, aiProvider, customModel, photo.categoryId || null, photo.name, signal);
            const result = cleanObject(resRaw);
            
            if (result.name) {
              const measurementOnlyPattern = /^(\d+(\.\d+)?\s*(cm|inch|mm|["'”]))+$/i;
              if (measurementOnlyPattern.test(result.name)) result.name = '';
              if (!result.modelNumber && /^[A-Z0-9\-]+$/.test(result.name) && result.name.length > 2) {
                result.modelNumber = result.name;
              }
            }
            if (result.dimensions) result.dimensions = normalizeDimensions(result.dimensions);
            const aiName = cleanAiName(result.name);
            
            if (result.description) {
              try {
                const translations = await translateDescription(result.description, effectiveKey!, customModel, signal);
                result.description_translations = { zh: result.description, en: translations.en, ms: translations.ms };
              } catch (e) {}
            }

            const finalCatId = result.categoryId || null;
            const finalTagIds = await resolveTagIdsBatch([...safeArray<string>(result.tagIds), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap);
            const mergedTagIds = Array.from(new Set([...safeArray(photo.tagIds), ...finalTagIds])).slice(0, 3);

            let updatedPhoto = { 
                ...photo, 
                categoryId: photo.categoryId && photo.categoryId !== 'uncategorized' ? photo.categoryId : finalCatId, 
                tagIds: mergedTagIds,
                name: shouldUpdateName(photo.name) ? (aiName || photo.name) : photo.name,
                description: (result.description && (!photo.description || !photo.description.trim())) ? result.description : photo.description,
                description_translations: result.description_translations || photo.description_translations,
                model_number: (result.modelNumber && (!photo.model_number || !photo.model_number.trim())) ? result.modelNumber : photo.model_number,
                dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : safeArray(photo.dimensions),
                updatedAt: formatDate(new Date()),
                isAnalyzing: false 
            };

            if (user) {
                const finalId = await savePhotoToCloud(user.id, updatedPhoto);
                updatedPhoto.id = finalId;
            }

            // Optimistically update the UI smoothly
            queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
              if (!old) return old;
              return {
                ...old,
                pages: old.pages.map((page: any) => ({
                  ...page,
                  photos: page.photos.map((p: Photo) => p.id === photo.id ? updatedPhoto : p),
                })),
              };
            });
            queryClient.setQueriesData({ queryKey: ['photos', 'group'] }, (old: any) => {
              if (!Array.isArray(old)) return old;
              return old.map((p: Photo) => p.id === photo.id ? updatedPhoto : p);
            });
            
            return false;
        } catch (err: unknown) {
            const error = err as Error;
            
            if (error.name === 'DuplicatePhotoError') {
               console.log(`[useBatchPhotoAI] Skipped duplicate photo`);
               return true; // Return true indicating skip
            }

            setAiDebugInfo({ step: '图片识别', message: '识别发生错误', error: error.message || String(err) });
            invalidatePhotos();
            if (error.message && (error.message.includes('401') || error.message.includes('403'))) {
                throw new Error(`FATAL_AI_ERROR: ${error.message}`);
            }
            if (error.name !== 'AbortError') throw error;
        }
    };

    try {
        for (let i = 0; i < unProcessed.length; i += CONCURRENCY) {
            if (currentAnalysisControllers.current.get(taskId)?.controller.signal.aborted) break;
            const batch = unProcessed.slice(i, i + CONCURRENCY);
            setAiDebugInfo(aiDebugInfo?.error ? { ...aiDebugInfo, error: undefined } : aiDebugInfo);

            const batchResults = await Promise.allSettled(batch.map(p => processPhoto(p)));
            
            const batchFailures: string[] = [];
            batchResults.forEach((result, idx) => {
              const photo = batch[idx];
              const isAborted = currentAnalysisControllers.current.get(taskId)?.controller.signal.aborted;
              if (result.status === 'fulfilled' && !isAborted) {
                if (result.value) {
                    duplicateCount++;
                } else {
                    completedCount++;
                }
              } else if (result.status === 'rejected' && (!result.reason || result.reason.name !== 'AbortError')) {
                batchFailures.push(photo.name || photo.id.slice(0, 8));
                throw result.reason;
              }
            });

            const currentProgress = Math.min(i + CONCURRENCY, unProcessed.length);
            setBatchProgress({ current: currentProgress, total: unProcessed.length });
            updateTask(taskId, { 
              progress: (currentProgress / unProcessed.length) * 100, 
              message: batchFailures.length > 0 ? `已处理 ${currentProgress}/${unProcessed.length} (失败: ${batchFailures.join(', ')})` : `已处理 ${currentProgress}/${unProcessed.length}...`
            });
        }
        if (completedCount > 0 || unProcessed.length > 0) {
            const isAllSuccess = completedCount + duplicateCount === unProcessed.length;
            let message = isAllSuccess ? `全数完成！成功 ${completedCount} 张` : `完成，但有部分失败 (${completedCount} 成功)`;
            if (duplicateCount > 0) {
                message += `（已跳过 ${duplicateCount} 张，已存在相同照片）`;
            }
            updateTask(taskId, { status: isAllSuccess ? 'completed' : 'warning', progress: 100, message });
            if (isAllSuccess) { showSuccess(message); setAiDebugInfo(null); } 
            else { showError(new Error(message), '批量 AI 识别'); }
        }
    } catch (err) {
        showError(err, '批量 AI 识别失败');
        updateTask(taskId, { status: 'error', message: `错误: ${err instanceof Error ? err.message : String(err)}` });
    } finally {
        isAnalyzingRef.current = false;
        const task = currentAnalysisControllers.current.get(taskId);
        if (task) { clearTimeout(task.timeoutId); currentAnalysisControllers.current.delete(taskId); }
        setBatchProgress({ current: 0, total: 0 });
    }
  };

  return { handleBatchAiIdentify };
};
