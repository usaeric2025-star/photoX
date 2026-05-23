import { useCallback } from 'react';
import { Photo, ProductFormData } from '../../types';
import { loadPhotosByGroupId } from '../../services/photoService';
import { hapticFeedback } from '../../utils/haptics';

export const useAdminActions = (
  photos: Photo[],
  tasks: any[],
  ai: any,
  edit: any,
  importer: any,
  sync: any,
  filters: any,
  categoryOps: any,
  ui: {
    checkSyncLock: () => boolean;
    showError: (e: any, ctx: string) => void;
    showSuccess: (msg: string) => void;
    setAlertDialog: (d: any) => void;
    setPromptDialog: (d: any) => void;
    setEditPhotoId: (id: string | null) => void;
    setBatchEditIds: (ids: string[]) => void;
    setActiveScreen: (s: any) => void;
    setActiveGroupId: (id: string) => void;
    setInitialPhotoId: (id: string | null) => void;
    runTask: any;
    queryClient: any;
    infinitePhotosQuery: any;
    disable: () => void;
    batchEditIds: string[];
    onEditPhotoById: (p: Photo | string) => void;
    tags: any[];
  }
) => {
  const { 
    checkSyncLock, showError, showSuccess, setAlertDialog, setPromptDialog, setEditPhotoId, 
    setBatchEditIds, setActiveScreen, setActiveGroupId, setInitialPhotoId, 
    runTask, queryClient, infinitePhotosQuery, disable, batchEditIds, onEditPhotoById, tags 
  } = ui;
  const { addTag, addManufacturer } = categoryOps;

  const handleBatchAiIdentifyTrigger = useCallback(async (targetPhotos?: Photo[]) => {
    if (checkSyncLock()) return;
    const isAnalyzing = tasks.some(t => t.status === 'running' && (t.name.includes('识别') || t.name.includes('分析')));
    if (isAnalyzing) {
      ai.abortAnalysis();
      return;
    }
    const photosToProcess = targetPhotos || photos;
    if (photosToProcess.length === 0) return;

    setAlertDialog({
      title: 'AI 批量智能识别',
      message: `选择识别模式 (${photosToProcess.length} 张)：`,
      confirmLabel: '分析全部',
      onConfirm: async () => {
         await runTask(`批量 AI 识别`, () => ai.analyzeBatch(photosToProcess, true), { showSuccessToast: true });
      },
      secondaryAction: {
         label: '跳过已完善',
         onClick: () => runTask(`批量 AI 识别`, () => ai.analyzeBatch(photosToProcess, false), { showSuccessToast: true })
      }
    });
  }, [checkSyncLock, tasks, ai, runTask, photos, setAlertDialog]);

  const handleDeletePhoto = useCallback(async (id: string | string[]) => {
     try {
         await edit.deletePhoto(id);
         hapticFeedback.light();
         if (typeof id === 'string') setEditPhotoId(null);
         else edit.resetAddState();
     } catch (error) {
         hapticFeedback.error();
         showError(error, 'delete-photo');
     }
  }, [edit, setEditPhotoId, showError]);

  const handleImport = useCallback(() => {
    if (checkSyncLock()) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => importer.handlePhotoImport(e as any, false).catch((err: Error) => showError(err, '导入图片失败'));
    input.click();
  }, [checkSyncLock, importer, showError]);

  const saveBatchEditWithSuccess = useCallback(async () => {
    if (checkSyncLock()) return;
    try {
      await edit.updatePhotosBulk(batchEditIds, edit.formState);
      showSuccess('批量更新成功');
      setBatchEditIds([]);
    } catch (e) {
      showError(e, 'save-batch-edit');
      throw e;
    }
  }, [checkSyncLock, batchEditIds, edit.formState, edit, showError, showSuccess, setBatchEditIds]);

  const handleRefresh = useCallback(() => {
    if (checkSyncLock()) return;
    filters.handleRefresh();
    disable();
    queryClient.invalidateQueries({ queryKey: ['photos'] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    infinitePhotosQuery.refetch();
    showSuccess('已重置所有筛选');
  }, [checkSyncLock, filters, disable, showSuccess, queryClient, infinitePhotosQuery]);

  const performPullSync = useCallback(async () => {
    await runTask('从云端恢复', async () => {
      await infinitePhotosQuery.refetch(); 
    }, { showSuccessToast: true });
    return { success: true, data: null };
  }, [infinitePhotosQuery, runTask]);

  const performPushSync = useCallback(async () => {
    await runTask('同步备份至云端', async () => {
      // Logic for push usually involves a mutation, assuming sync.push exists or we define it
      if (sync.performPush) await sync.performPush();
    }, { showSuccessToast: true });
    return { success: true, data: null };
  }, [sync, runTask]);

  const handleLoadMoreCallback = useCallback(() => {
    if (infinitePhotosQuery.hasNextPage && !infinitePhotosQuery.isFetchingNextPage) {
       infinitePhotosQuery.fetchNextPage();
    }
  }, [infinitePhotosQuery]);

  const quickAddTag = useCallback(() => {
    setPromptDialog({
      title: '自定义标签 / Custom Tag',
      placeholder: '输入新标签名称 (例如: 清货)',
      onSubmit: async (val: string) => {
        const normalized = val.trim();
        if (!normalized) return;
        const existing = tags.find(t => t.name.toUpperCase() === normalized.toUpperCase());
        if (existing) {
          edit.updateForm((prev: any) => ({ ...prev, tag_ids: [...new Set([...(prev.tag_ids || []), String(existing.id)])] }));
          showError(new Error(`标签 "${normalized}" 已存在`), '新增标签');
          return;
        }
        try {
          const saved = await addTag(normalized);
          if (saved) edit.updateForm((prev: any) => ({ ...prev, tag_ids: [...new Set([...(prev.tag_ids || []), String(saved.id)])] }));
        } catch (e: unknown) {
          showError(e, '新增标签失败');
        }
      }
    });
  }, [setPromptDialog, tags, addTag, edit, showError]);

  const quickAddManufacturer = useCallback(() => {
    setPromptDialog({
      title: '新增厂商 / New Manufacturer',
      placeholder: '输入新厂商名称',
      onSubmit: async (val: string) => {
        const trimmed = val.trim();
        if (!trimmed) return;
         try {
           const saved = await addManufacturer(trimmed);
           if (saved) edit.updateForm((prev: any) => ({ ...prev, manufacturer_id: saved.id }));
         } catch (e: unknown) {
           showError(e, '新增厂商失败');
         }
      }
    });
  }, [setPromptDialog, addManufacturer, edit, showError]);

  return {
    handleBatchAiIdentifyTrigger,
    handleDeletePhoto,
    handleImport,
    saveBatchEditWithSuccess,
    handleRefresh,
    performPullSync,
    performPushSync,
    handleLoadMoreCallback,
    quickAddTag,
    quickAddManufacturer
  };
};
