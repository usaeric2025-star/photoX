import { toast } from 'sonner';
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
  handleError: (error: unknown, context?: string) => void;
  setAiDebugInfo: (info: { step: string; message: string; error?: string } | null) => void;
  currentAnalysisControllers: React.MutableRefObject<Map<string, { controller: AbortController, timeoutId: NodeJS.Timeout }>>;
  abortAnalysis: (taskId?: string) => void;
}

export const useSinglePhotoAI = (props: SingleAiProps) => {
  const queryClient = useQueryClient();
  const {
    user, geminiApiKey, aiProvider, customModel, categories, tags,
    manufacturers, tagNameToIdMap, addTask, updateTask, removeTask,
    photosRef, handleError, setAiDebugInfo, currentAnalysisControllers, abortAnalysis
  } = props;

  const handleSingleAiAnalyze = async (imageData: string | null, catId?: string, editPhotoId?: string | null) => {
    if (!imageData) return;
    setAiDebugInfo(null);
    
    const taskId = addTask({
      name: `AI 单图识别 ${editPhotoId ? '(编辑中)' : ''}`,
      status: 'running',
      progress: 0,
      onCancel: () => abortAnalysis(taskId)
    });
    
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
      if (editPhotoId) {
          const photo = photosRef.current.find(p => p.id === editPhotoId);
          originalName = photo?.name;
      }
      
      const resRaw = await analyzeProductPhoto(imageData, categories, tags, manufacturers, apiKey, aiProvider, customModel, catId, originalName, signal);
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
      
      if (editPhotoId) {
        const photo = photosRef.current.find(p => p.id === editPhotoId);
        if (photo) {
          updateTask(taskId, { progress: 80, message: '正在保存结果...' });
          const resolvedTags = await resolveTagIdsBatch([...safeArray<string>(result.tagIds), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap);
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
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tags });
        }
      }
      
      updateTask(taskId, { status: 'completed', progress: 100, message: '识别成功' });
      setAiDebugInfo(null);
      return result;
      } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'DuplicatePhotoError') {
         updateTask(taskId, { status: 'completed', progress: 100, message: '已跳过 (重复照片)' });
         setAiDebugInfo(null);
         toast.info('已存在相同照片'); 
         return null as any;
      }
      if (error.name === 'AbortError') {
        removeTask(taskId);
        setAiDebugInfo({ step: '已取消', message: '识别任务已由用户中断' });
      } else {
        const displayError = formatAiError(error.message || String(err));
        updateTask(taskId, { status: 'error', message: `失败: ${displayError.slice(0, 80)}${displayError.length > 80 ? '...' : ''}` });
        if (editPhotoId) queryClient.invalidateQueries({ queryKey: QUERY_KEYS.photos });
        handleError(err, 'AI 单图识别失败');
        throw err;
      }
    } finally {
      const task = currentAnalysisControllers.current.get(taskId);
      if (task) {
          clearTimeout(task.timeoutId);
          currentAnalysisControllers.current.delete(taskId);
      }
    }
  };

  return { handleSingleAiAnalyze };
};
