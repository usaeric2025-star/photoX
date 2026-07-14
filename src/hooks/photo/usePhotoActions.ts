import { useCallback } from 'react';
import { useOptimisticPhotoMutation } from '#lib/query/optimistic.js';
import { showToast } from '#lib/ui/toast.js';
import { useTranslation } from '../core/index.js';
import { api } from '#lib/api.js';
import { ErrorFactory } from '#lib/error/ErrorFactory.js';
import { useInvalidatePhotos } from './useInvalidatePhotos.js';
import { Photo } from '#src/types/index.js';
import { useAuth, uploadAsGroup } from '#lib/store/index.js';
import { hapticFeedback } from '#lib/ui/haptics.js';
import { createTask } from '#lib/task-queue/index.js';
import { executeBatchUpload } from '#lib/task-queue/adapters/upload.js';
import { generateId } from '#lib/id.js';
import { useSignal } from '@preact/signals-react';
import { useUI, UIStoreState } from '#lib/store/index.js';
import { useSelectionActions, batchEditingIdsSignal } from '#src/hooks/selection/useSelection.js';
import { useNormalizedLocation } from '#src/hooks/core/index.js';
import { runBatchAnalysis } from '#src/features/ai/orchestration.js';

export function usePhotoMutations() {
  const { t } = useTranslation();
  const { invalidateAll, invalidateList } = useInvalidatePhotos();

  const editMutation = useOptimisticPhotoMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      return ErrorFactory.unwrap(
        api.photos[':id'].$put({ param: { id }, json: { updates } }),
        t('updateFailed')
      );
    },
    onMutateOptimistic: ({ id, updates }) => ({
      ids: id,
      updater: (photo: Photo) => ({ ...photo, ...updates } as Photo)
    }),
    errorContext: 'editPhoto',
    onSuccess: () => {
      showToast.success(t('updateSuccess'));
      invalidateAll();
    }
  });

  const batchEditMutation = useOptimisticPhotoMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Record<string, unknown> }) => {
      return ErrorFactory.unwrap(
        api.photos['batch-update'].$post({ json: { ids, updates } }),
        t('updateFailed')
      );
    },
    onMutateOptimistic: ({ ids, updates }) => ({
      ids,
      updater: (photo: Photo) => ({ ...photo, ...updates } as Photo)
    }),
    errorContext: 'batchEdit',
    onSuccess: () => {
      showToast.success(t('updateSuccess'));
      invalidateAll();
    }
  });

  const deleteMutation = useOptimisticPhotoMutation({
    mutationFn: async (idOrIds: string | string[]) => {
      const ids = Array.isArray(idOrIds) ? idOrIds : [idOrIds];
      return ErrorFactory.unwrap(
        api.photos['batch-delete'].$post({ json: { ids } }),
        t('deleteFailed')
      );
    },
    onMutateOptimistic: (idOrIds) => ({
      ids: idOrIds,
      updater: () => null as any // Return null to remove from list
    }),
    errorContext: 'deletePhoto',
    onSuccess: () => {
      showToast.success(t('deleteSuccess'));
      invalidateList();
    }
  });

  const togglePinMutation = useOptimisticPhotoMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      return ErrorFactory.unwrap(
        api.photos[':id'].$put({ param: { id }, json: { updates: { isPinned } } }),
        t('updateFailed')
      );
    },
    onMutateOptimistic: ({ id, isPinned }) => ({
      ids: id,
      updater: (photo: Photo) => ({ ...photo, isPinned } as Photo)
    }),
    errorContext: 'togglePin',
    onSuccess: () => {
      showToast.success(t('updateSuccess'));
      invalidateAll();
    }
  });

  const togglePin = useCallback(async (args: { id: string; isPinned: boolean }) => {
    return togglePinMutation.mutateAsync(args);
  }, [togglePinMutation]);

  return {
    editMutation,
    batchEditMutation,
    deleteMutation,
    togglePinMutation,
    togglePin,
    // Aliases for compatibility
    editPhotoAsync: editMutation.mutateAsync,
    batchEditAsync: batchEditMutation.mutateAsync,
    deletePhotoAsync: deleteMutation.mutateAsync,
    isBatchEditing: batchEditMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}

export function usePhotoUpload() {
  const user = useAuth(s => s.user);
  const { t } = useTranslation();

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    try {
      hapticFeedback.medium();
      const userId = user?.id;
      
      const isGroup = uploadAsGroup.value && fileArray.length > 1;
      const groupId = isGroup ? generateId() : undefined;

      createTask({
        label: t('uploadTaskLabel', fileArray.length),
        type: 'upload',
        userId,
        meta: {
          photoCount: fileArray.length,
          groupId: groupId,
        },
        execute: executeBatchUpload(fileArray, userId, { groupId }),
        onError: (err) => {
          ErrorFactory.handle(err, { context: 'usePhotoUpload.uploadFiles' });
        }
      });
    } catch (error) {
      ErrorFactory.handle(error, { context: 'usePhotoUpload.execute' });
    }
  }, [user?.id, t]);

  return { uploadFiles };
}

export function useBatchEdit() {
  const batchEditingIds = batchEditingIdsSignal.value;
  const { patch: patchSelection } = useSelectionActions();
  const formState = useUI((s: UIStoreState) => s.formState);
  const resetForm = useUI((s: UIStoreState) => s.resetForm);
  const updateForm = useUI((s: UIStoreState) => s.updateForm);
  
  const { batchEditAsync, deletePhotoAsync, isBatchEditing, isDeleting } = usePhotoMutations();

  const isPending = isBatchEditing || isDeleting;
  const [location, setLocation] = useNormalizedLocation();

  const handleSave = async (selectedIds: string[]) => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    
    const updates = { ...formState } as Record<string, unknown>;
    const cleanUpdates: Record<string, unknown> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) {
        if (Array.isArray(value) && value.length === 0) return;
        cleanUpdates[key] = value;
      }
    });

    await batchEditAsync({ ids, updates: cleanUpdates });
    patchSelection({ batchEditingIds: null });
    resetForm();
    
    if (location.startsWith('/admin/batch-edit')) {
      setLocation('/admin');
    }
  };

  const handleDelete = async (selectedIds: string[]) => {
    const ids = batchEditingIds || selectedIds;
    if (!ids || ids.length === 0) return;
    
    await deletePhotoAsync(ids);
    patchSelection({ batchEditingIds: null, selectedIds: [] });
    resetForm();
    
    if (location.startsWith('/admin/batch-edit')) {
      setLocation('/admin');
    }
  };

  const handleClose = () => {
    patchSelection({ batchEditingIds: null });
    resetForm();
    if (location.startsWith('/admin/batch-edit')) {
      setLocation('/admin');
    }
  };

  return {
    batchEditIds: batchEditingIds || [],
    formState,
    handleUpdateForm: updateForm,
    handleSave,
    handleDelete,
    handleClose,
    isSyncing: isPending,
  };
}

export function useAIBatchAnalysis() {
  const user = useAuth(s => s.user);
  const { invalidateAll } = useInvalidatePhotos();
  const { t } = useTranslation();

  const handleBatchAiAnalyze = useCallback(async (targetPhotos: Photo[]) => {
    if (!targetPhotos || targetPhotos.length === 0) {
      ErrorFactory.handle(t('selectPhotoFirst'), { context: t('batchAi') });
      return;
    }
    
    showToast.info(t('aiAnalyzing'));

    const taskTitle = t('aiBatchTask', targetPhotos.length);
    createTask<{ successCount: number; groupSuccess: boolean }>({
        label: taskTitle,
        type: 'ai-analyze',
        userId: user?.id,
        meta: { photoCount: targetPhotos.length },
        execute: async (signal, onProgress) => {
            const { successCount, groupSuccess } = await runBatchAnalysis({
                targetPhotos,
                onProgress
            });
            invalidateAll();
            return { successCount, groupSuccess };
        },
        onComplete: (result) => {
            showToast.success(t('aiAnalyzeSuccess', result.successCount));
        }
    });
  }, [invalidateAll, t, user?.id]);

  return { handleBatchAiAnalyze };
}
