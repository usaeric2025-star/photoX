import { useQueryClient } from '@tanstack/react-query';
import { Photo, Category, Tag, Manufacturer, User, Task } from '../../types';
import { analyzeProductPhoto, translateDescription, normalizeDimensions } from '../../services/geminiService';
import { resolveTagIdsBatch } from '../../utils/tagUtils';
import { safeArray } from '../../lib/utils';
import { cleanObject } from '../../services/utils';
import { formatDate } from '../../utils/dateFormat';
import { savePhotoToCloud } from '../../services/photoMutationService';
import { QUERY_KEYS } from '../queries/keys';
import { shouldUpdateName, cleanAiName, formatAiError } from './photoAiUtils';
import { useFeedback } from '../uiFeedback';

interface SingleAiProps {
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
  photosRef: React.MutableRefObject<Photo[]>;
  showError: (error: unknown, context?: string) => void;
  invalidatePhotos: () => void;
  setAiDebugInfo: (info: { step: string; message: string; error?: string } | null) => void;
  currentAnalysisControllers: React.MutableRefObject<Map<string, { controller: AbortController, timeoutId: NodeJS.Timeout }>>;
  abortAnalysis: (taskId?: string) => void;
  activeAiTaskIds?: React.MutableRefObject<Set<string>>;
}

export const useSinglePhotoAI = (props: SingleAiProps) => {
  const queryClient = useQueryClient();
  const { showSuccess, handleError } = useFeedback();
  const {
    user, geminiApiKey, aiProvider, customModel, categories, tags,
    manufacturers, tagNameToIdMap, addTask, updateTask, removeTask,
    photosRef, showError, invalidatePhotos, setAiDebugInfo, currentAnalysisControllers, abortAnalysis,
    activeAiTaskIds
  } = props;

  const handleSingleAiAnalyze = async (imageData: any, catId?: string, editPhotoId?: string | null) => {
    let effectiveImgData: string | null = null;
    let effectiveEditId = editPhotoId;
    let effectiveCatId = catId;

    if (typeof imageData === 'string') {
      effectiveImgData = imageData;
    } else if (imageData && typeof imageData === 'object') {
      effectiveImgData = imageData.uri || imageData.image_url || null;
      if (!effectiveEditId) effectiveEditId = imageData.id;
      if (!effectiveCatId) effectiveCatId = imageData.categoryId || undefined;
    }

    if (!effectiveImgData) return;
    setAiDebugInfo(null);
    
    const taskId = addTask({
      name: `AI 单图识别 ${effectiveEditId ? '(编辑中)' : ''}`,
      status: 'running',
      progress: 0,
      onCancel: () => abortAnalysis(taskId)
    });
    
    if (activeAiTaskIds) {
      activeAiTaskIds.current.add(taskId);
    }
    
    setAiDebugInfo({ step: '准备中', message: '正在初始化...' });
    updateTask(taskId, { progress: 10, message: '分析图片中...' });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
        updateTask(taskId, { status: 'error', message: '识别超时，请重试' });
    }, 60000);
    currentAnalysisControllers.current.set(taskId, { controller, timeoutId });
    const signal = controller.signal;
    
    try {
      const apiKey = geminiApiKey;
      if (!apiKey) throw new Error('API Key 为空');
      
      let originalName;
      if (effectiveEditId) {
          const photo = photosRef.current.find(p => p.id === effectiveEditId);
          originalName = photo?.name;
      }
      
      const resRaw = await analyzeProductPhoto(effectiveImgData, categories, tags, manufacturers, apiKey, aiProvider, customModel, effectiveCatId, originalName, signal);
      const result = cleanObject(resRaw);
      
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
      
      if (effectiveEditId) {
        const photo = photosRef.current.find(p => p.id === effectiveEditId);
        if (photo) {
          updateTask(taskId, { progress: 80, message: '正在保存结果...' });
          const resolvedTags = await resolveTagIdsBatch([...safeArray<string>(result.tag_ids), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap);
          let updatedPhoto = { 
            ...photo, 
            category_id: result.category_id || photo.category_id,
            tag_ids: Array.from(new Set([...safeArray(photo.tag_ids), ...resolvedTags])).slice(0, 3),
            name: shouldUpdateName(photo.name) ? (aiName || photo.name) : photo.name,
            description: (result.description && (!photo.description || !photo.description.trim())) ? result.description : photo.description,
            description_translations: result.description_translations || photo.description_translations,
            model_number: (result.modelNumber && (!photo.model_number || !photo.model_number.trim())) ? result.modelNumber : photo.model_number,
            dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : photo.dimensions,
            updated_at: formatDate(new Date()),
            is_analyzing: false 
          };
          if (user) {
            const finalId = await savePhotoToCloud(user.id, updatedPhoto);
            updatedPhoto.id = finalId;
          }
          
          queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page: any) => ({
                ...page,
                photos: page.photos.map((p: any) => p.id === effectiveEditId ? { ...p, ...updatedPhoto } : p),
              })),
            };
          });
          queryClient.setQueriesData({ queryKey: ['photos', 'group'] }, (old: any) => {
            if (!Array.isArray(old)) return old;
            return old.map((p: any) => p.id === effectiveEditId ? { ...p, ...updatedPhoto } : p);
          });
          
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
        }
      }
      
      updateTask(taskId, { status: 'completed', progress: 100, message: '识别成功' });
      setAiDebugInfo(null);
      return result;
      } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(typeof err === 'object' && err !== null && 'message' in err ? String((err as any).message) : String(err));

      // Handle specific failure scenarios for user feedback and logging
      let userMessage = 'AI 分析出现异常，请重试';
      let errorContext = 'AI 单图分析';

      if (error.name === 'DuplicatePhotoError') {
         updateTask(taskId, { status: 'completed', progress: 100, message: '已跳过 (重复照片)' });
         setAiDebugInfo(null);
         showSuccess('已存在相同照片'); 
         return null as any;
      }

      if (error.name === 'AbortError') {
        removeTask(taskId);
        setAiDebugInfo({ step: '已取消', message: '识别任务已由用户中断' });
        return;
      }

      // Determine feedback based on where failure occurred
      const isPreprocessing = error.message.includes('preprocessing') || 
                              error.message.includes('image') || 
                              error.message.includes('conversion') || 
                              error.message.includes('resize');
                              
      const isParsingError = error.message.includes('invalid') || 
                             error.message.includes('content') || 
                             error.message.includes('格式错误') || 
                             error.message.includes('找不到') || 
                             error.message.includes('未回传') || 
                             error.message.includes('JSON');

      if (isPreprocessing) {
        userMessage = '图片处理失败，请重试或换一张图';
        errorContext = 'AI图片预处理';
      } else if (isParsingError) {
        userMessage = 'AI 返回异常，请重试';
        errorContext = 'AI数据解析';
      } else {
        userMessage = `AI 识别失败：${error.message || '未知错误'}`;
        errorContext = 'AI分析请求';
      }

      // 1. Log and notify via the unified feedback/error system
      const customFeedbackError = new Error(userMessage);
      handleError(customFeedbackError, errorContext);

      // 2. UI Status update
      updateTask(taskId, { status: 'error', message: `失败: ${userMessage.slice(0, 80)}` });
      if (effectiveEditId) invalidatePhotos();
      
      throw error;
    } finally {
      if (activeAiTaskIds) {
        activeAiTaskIds.current.delete(taskId);
      }
      const task = currentAnalysisControllers.current.get(taskId);
      if (task) {
          clearTimeout(task.timeoutId);
          currentAnalysisControllers.current.delete(taskId);
      }
    }
  };

  return { handleSingleAiAnalyze };
};
