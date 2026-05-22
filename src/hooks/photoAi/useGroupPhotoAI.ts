import { useQueryClient } from '@tanstack/react-query';
import { Photo, Category, Tag, Manufacturer, User, Task } from '../../types';
import { analyzeProductPhoto, translateDescription, normalizeDimensions } from '../../services/geminiService';
import { resolveTagIdsBatch } from '../../utils/tagUtils';
import { safeArray } from '../../lib/utils';
import { cleanObject } from '../../services/utils';
import { formatDate } from '../../utils/dateFormat';
import { savePhotoToCloud } from '../../services/photoMutationService';
import { QUERY_KEYS } from '../queries/keys';
import { shouldUpdateName, cleanAiName, isMeasurementOnly } from './photoAiUtils';
import { useFeedback } from '../uiFeedback';

interface GroupAiProps {
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
  showError: (error: unknown, context?: string) => void;
  invalidatePhotos: () => void;
  setAiDebugInfo: (info: { step: string; message: string; error?: string } | null) => void;
  currentAnalysisControllers: React.MutableRefObject<Map<string, { controller: AbortController, timeoutId: NodeJS.Timeout }>>;
  abortAnalysis: (taskId?: string) => void;
  activeAiTaskIds?: React.MutableRefObject<Set<string>>;
}

export const useGroupPhotoAI = (props: GroupAiProps) => {
  const queryClient = useQueryClient();
  const { showSuccess } = useFeedback();
  const {
    user, geminiApiKey, aiProvider, customModel, categories, tags, manufacturers,
    tagNameToIdMap, addTask, updateTask, removeTask, showError, invalidatePhotos, setAiDebugInfo,
    currentAnalysisControllers, abortAnalysis, activeAiTaskIds
  } = props;

  const handleGroupAiIdentify = async (groupPhotos: Photo[], forceAll = false) => {
    const sGroupPhotos = safeArray(groupPhotos);
    if (sGroupPhotos.length === 0) return;
    setAiDebugInfo(null);
    const effectiveKey = geminiApiKey;
    if (!effectiveKey) throw new Error('请先在管理设置中设定 AI 密钥');

    const taskId = addTask({
      name: `群组 AI 识别 (${sGroupPhotos.length} 张)`,
      status: 'running',
      progress: 0,
      onCancel: () => abortAnalysis(taskId)
    });
    if (activeAiTaskIds) {
      activeAiTaskIds.current.add(taskId);
    }

    setAiDebugInfo({ step: '群组识别', message: '正在分析封面/首张照片...' });
    updateTask(taskId, { progress: 10, message: '分析产品特征中...' });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
          controller.abort();
          updateTask(taskId, { status: 'error', message: '识别超时，请重试' });
      }, 60000);
      currentAnalysisControllers.current.set(taskId, { controller, timeoutId });
      const signal = controller.signal;

      const firstPhoto = sGroupPhotos.find(p => p.is_group_cover) || sGroupPhotos[0];
      const resRaw = await analyzeProductPhoto(firstPhoto.uri || firstPhoto.image_url!, categories, tags, manufacturers, effectiveKey, aiProvider, customModel, firstPhoto.category_id, firstPhoto.name, signal);
      
      if (signal?.aborted) return;
      const result = cleanObject(resRaw);

      if (result.name && isMeasurementOnly(result.name)) result.name = '';
      if (result.dimensions) result.dimensions = normalizeDimensions(result.dimensions);
      const aiName = cleanAiName(result.name);
      
      if (result.description) {
        try {
          const translations = await translateDescription(result.description, effectiveKey, customModel, signal);
          result.description_translations = { zh: result.description, en: translations.en, ms: translations.ms };
        } catch (e) {}
      }

      const finalTagIds = await resolveTagIdsBatch([...safeArray<string>(result.tag_ids), ...safeArray<string>(result.newTags)], tags, tagNameToIdMap);
      
      setAiDebugInfo({ step: '保存中', message: '同步识别结果到所有照片...' });
      updateTask(taskId, { progress: 80, message: '正在同步及保存结果...' });

      const updatedPhotosList: Photo[] = sGroupPhotos.map(p => {
        const hasAllTranslations = p.description_translations?.zh && p.description_translations?.en && p.description_translations?.ms;
        const hasTags = safeArray(p.tag_ids).length >= 2;
        const isGeneric = shouldUpdateName(p.name);
        const isComplete = p.category_id && hasTags && !isGeneric && hasAllTranslations;
        if (!forceAll && isComplete) {
          return p;
        }
        return {
          ...p,
          category_id: result.category_id || p.category_id,
          tag_ids: Array.from(new Set([...safeArray(p.tag_ids), ...finalTagIds])).slice(0, 3),
          name: shouldUpdateName(p.name) ? (aiName || p.name) : p.name,
          description: (result.description && (!p.description || !p.description.trim())) ? result.description : p.description,
          description_translations: result.description_translations || p.description_translations,
          model_number: (result.modelNumber && (!p.model_number || !p.model_number.trim())) ? result.modelNumber : p.model_number,
          dimensions: (safeArray(result.dimensions).length > 0) ? result.dimensions : safeArray(p.dimensions),
          updatedAt: formatDate(new Date()),
          isAnalyzing: false
        };
      });
      
      if (user) {
        let hasDuplicate = false;
        const finalValidPhotos: Photo[] = [];
        
        for (const up of updatedPhotosList) {
          try {
            await savePhotoToCloud(user.id, up);
            finalValidPhotos.push(up);
          } catch (e: any) {
            if (e.name === 'DuplicatePhotoError') {
              hasDuplicate = true;
            } else {
              console.error("Single save failed in group", e);
              showError(e, "群组部分照片保存失败");
            }
          }
        }
        
        if (hasDuplicate) {
          showSuccess('已存在相同照片，多图识别完成');
        } else {
          showSuccess('多图识别完成');
        }
        
        queryClient.setQueriesData({ queryKey: ['photos', 'infinite'] }, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              photos: page.photos.map((p: any) => {
                const up = finalValidPhotos.find(fp => fp.id === p.id);
                return up ? up : p;
              }),
            })),
          };
        });
        queryClient.setQueriesData({ queryKey: ['photos', 'group'] }, (old: any) => {
          if (!Array.isArray(old)) return old;
          return old.map((p: any) => {
            const up = finalValidPhotos.find(fp => fp.id === p.id);
            return up ? up : p;
          });
        });
      }

      updateTask(taskId, { status: 'completed', progress: 100, message: '识别成功' });
      setAiDebugInfo(null);
      return result;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        const errorMsg = error.message || String(err);
        setAiDebugInfo({ step: '错误', message: '群组识别失败', error: errorMsg });
        updateTask(taskId, { status: 'error', message: `失败: ${errorMsg.slice(0, 80)}` });
        invalidatePhotos();
        throw err;
      }
    } finally {
      if (activeAiTaskIds) {
        activeAiTaskIds.current.delete(taskId);
      }
      const task = currentAnalysisControllers.current.get(taskId);
      if (task) { clearTimeout(task.timeoutId); currentAnalysisControllers.current.delete(taskId); }
    }
  };

  return { handleGroupAiIdentify };
};
